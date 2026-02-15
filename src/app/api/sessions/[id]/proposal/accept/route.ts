// src/app/api/sessions/[id]/proposal/accept/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { notify } from "@/lib/notify";

/** ---------- availability parsing helpers (same as your reschedule) ---------- */
type DayKey = "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";
type TimeSlot = { start: string; end: string };
type DayAvailability = { day: DayKey; off: boolean; slots: TimeSlot[] };

function toMinutes(hhmm: string) {
  if (!hhmm) return 0;
  if (hhmm === "24:00") return 24 * 60;
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return h * 60 + m;
}

function dayKeyFromDate(d: Date): DayKey {
  const k: DayKey[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return k[d.getDay()];
}

function withinSlots(day: DayAvailability, startMin: number, endMin: number) {
  if (day.off) return false;
  if (!Array.isArray(day.slots) || day.slots.length === 0) return false;
  return day.slots.some((s) => {
    const a = toMinutes(s.start);
    const b = toMinutes(s.end);
    return startMin >= a && endMin <= b;
  });
}

async function getTutorAvailability(
  tutorId: string
): Promise<DayAvailability[] | null> {
  // ✅ get latest APPROVED tutor application
  const app = await prisma.tutorApplication
    .findFirst({
      where: { userId: tutorId, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      select: { availability: true },
    })
    .catch(() => null);

  const raw = (app as any)?.availability ?? null;
  if (typeof raw !== "string" || !raw.trim()) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;

    const cleaned: DayAvailability[] = parsed
      .filter(Boolean)
      .map((x: any) => ({
        day: x.day,
        off: !!x.off,
        slots: Array.isArray(x.slots) ? x.slots : [],
      }))
      .filter((x: any) => typeof x.day === "string");

    return cleaned.length ? cleaned : null;
  } catch {
    return null;
  }
}


async function tutorDeclaredAvailable(
  tutorId: string,
  start: Date,
  end: Date
): Promise<true | false | null> {
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (!sameDay) return false;

  const avail = await getTutorAvailability(tutorId);
  if (!avail) return null;

  const dayKey = dayKeyFromDate(start);
  const day = avail.find((d) => d.day === dayKey);
  if (!day) return false;

  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = end.getHours() * 60 + end.getMinutes();

  return withinSlots(day, startMin, endMin);
}

/** ---------- route ---------- */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true, verificationStatus: true, isDeactivated: true },
  });

  if (!dbUser || dbUser.isDeactivated) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (dbUser.verificationStatus !== "AUTO_VERIFIED") {
    return NextResponse.json({ message: "Not verified" }, { status: 403 });
  }

  const session = await prisma.session.findUnique({
    where: { id },
    select: {
      id: true,
      studentId: true,
      tutorId: true,
      status: true,
      durationMin: true,

      // @ts-ignore
      proposedAt: true,
      // @ts-ignore
      proposedEndAt: true,
      // @ts-ignore
      proposalStatus: true,
    } as any,
  });

  if (!session || session.studentId !== dbUser.id) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (session.status === "CANCELLED" || session.status === "COMPLETED") {
    return NextResponse.json(
      { message: "Cannot accept proposal for a closed session." },
      { status: 409 }
    );
  }

  const proposalStatus = (session as any).proposalStatus as string | null;
  const proposedAt = (session as any).proposedAt as Date | null;
  const proposedEndAt = (session as any).proposedEndAt as Date | null;

  if (proposalStatus !== "PENDING" || !proposedAt) {
    return NextResponse.json(
      { message: "No pending proposal to accept." },
      { status: 409 }
    );
  }

  const durationMin = session.durationMin ?? 60;
  const newScheduledAt = new Date(proposedAt);
  const newEndsAt =
    proposedEndAt ?? new Date(newScheduledAt.getTime() + durationMin * 60_000);

  // ✅ 1) Student overlap check (exclude this session)
  const studentClash = await prisma.session.findFirst({
    where: {
      id: { not: session.id },
      studentId: dbUser.id,
      status: { in: ["PENDING", "ACCEPTED"] },
      scheduledAt: { lt: newEndsAt },
      endsAt: { gt: newScheduledAt },
    },
    select: { id: true },
  });

  if (studentClash) {
    return NextResponse.json(
      { message: "You have another booking that overlaps this proposed time." },
      { status: 409 }
    );
  }

  // ✅ 2) Tutor checks (only if tutor exists)
  if (session.tutorId) {
    const tutorClash = await prisma.session.findFirst({
      where: {
        id: { not: session.id },
        tutorId: session.tutorId,
        status: { in: ["PENDING", "ACCEPTED"] },
        scheduledAt: { lt: newEndsAt },
        endsAt: { gt: newScheduledAt },
      },
      select: { id: true },
    });

    if (tutorClash) {
      return NextResponse.json(
        { message: "Tutor has a conflict at this proposed time." },
        { status: 409 }
      );
    }

    const declared = await tutorDeclaredAvailable(
      session.tutorId,
      newScheduledAt,
      newEndsAt
    );

    if (declared === false) {
      return NextResponse.json(
        { message: "Tutor is not available at this proposed time." },
        { status: 409 }
      );
    }
  }

  // ✅ Apply proposal as the new schedule
  const updated = await prisma.session.update({
    where: { id: session.id },
    data: {
      scheduledAt: newScheduledAt,
      endsAt: newEndsAt,
      rescheduledAt: new Date(),
      status: "PENDING",

      // @ts-ignore
      proposalStatus: "ACCEPTED",
      // @ts-ignore
      proposedAt: null,
      // @ts-ignore
      proposedEndAt: null,
      // @ts-ignore
      proposedNote: null,
      // @ts-ignore
      proposedByUserId: null,
    } as any,
    select: {
      id: true,
      tutorId: true,
      studentId: true,
      scheduledAt: true,
    },
  });

  // ✅ Notify tutor: proposal accepted (only if tutor exists)
  try {
    if (updated.tutorId) {
      await notify.proposalAcceptedToTutor(
        updated.tutorId,
        updated.studentId,
        updated.id,
        updated.scheduledAt.toISOString()
      );
    }
  } catch {
    // ignore
  }

  return NextResponse.json({ success: true });
}
