// src/app/api/sessions/[id]/proposal/accept/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { notify } from "@/lib/notify";

/** ---------- Malaysia timezone helpers ---------- */
const MY_TZ_OFFSET_MIN = 8 * 60;

function getMalaysiaParts(d: Date) {
  const shifted = new Date(d.getTime() + MY_TZ_OFFSET_MIN * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    date: shifted.getUTCDate(),
    day: shifted.getUTCDay(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
  };
}

/** ---------- availability parsing helpers ---------- */
type DayKey = "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";
type TimeSlot = { start: string; end: string };
type DayAvailability = { day: DayKey; off: boolean; slots: TimeSlot[] };

function toMinutes(hhmm: string) {
  if (!hhmm) return 0;
  if (hhmm === "24:00") return 24 * 60;
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return h * 60 + m;
}

// Fixed: uses Malaysia time (UTC+8), not raw UTC
function dayKeyFromDate(d: Date): DayKey {
  const k: DayKey[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return k[getMalaysiaParts(d).day];
}

function sameMalaysiaYMD(a: Date, b: Date) {
  const pa = getMalaysiaParts(a);
  const pb = getMalaysiaParts(b);
  return (
    pa.year === pb.year &&
    pa.month === pb.month &&
    pa.date === pb.date
  );
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

function isValidDayKey(value: unknown): value is DayKey {
  return (
    value === "SUN" ||
    value === "MON" ||
    value === "TUE" ||
    value === "WED" ||
    value === "THU" ||
    value === "FRI" ||
    value === "SAT"
  );
}

function isTimeSlot(value: unknown): value is TimeSlot {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.start === "string" && typeof obj.end === "string";
}

function parseAvailability(raw: string): DayAvailability[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;

    const cleaned: DayAvailability[] = parsed
      .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
      .map((item) => ({
        day: item.day,
        off: Boolean(item.off),
        slots: Array.isArray(item.slots) ? item.slots.filter(isTimeSlot) : [],
      }))
      .filter((item): item is DayAvailability => isValidDayKey(item.day));

    return cleaned.length > 0 ? cleaned : null;
  } catch {
    return null;
  }
}

async function getTutorAvailability(
  tutorId: string
): Promise<DayAvailability[] | null> {
  const app = await prisma.tutorApplication.findFirst({
    where: { userId: tutorId, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    select: { availability: true },
  });

  const raw = app?.availability;
  if (typeof raw !== "string" || !raw.trim()) return null;

  return parseAvailability(raw);
}

// Fixed: computes startMin/endMin using Malaysia hours, not UTC hours
async function tutorDeclaredAvailable(
  tutorId: string,
  start: Date,
  end: Date
): Promise<true | false | null> {
  // Must be same calendar day in Malaysia time
  if (!sameMalaysiaYMD(start, end)) return false;

  const avail = await getTutorAvailability(tutorId);
  if (!avail) return null;

  const dayKey = dayKeyFromDate(start);
  const day = avail.find((d) => d.day === dayKey);
  if (!day) return false;

  // Use Malaysia hours/minutes, not UTC
  const sp = getMalaysiaParts(start);
  const ep = getMalaysiaParts(end);
  const startMin = sp.hours * 60 + sp.minutes;
  const endMin = ep.hours * 60 + ep.minutes;

  return withinSlots(day, startMin, endMin);
}

/** ---------- route ---------- */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  void request;

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
      proposedAt: true,
      proposedEndAt: true,
      proposalStatus: true,
    },
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

  const proposalStatus = session.proposalStatus;
  const proposedAt = session.proposedAt;
  const proposedEndAt = session.proposedEndAt;

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

  // 1) Student overlap check (exclude this session)
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

  // 2) Tutor checks
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

    // Only hard-reject if explicitly false (not null).
    // null means availability data is missing — allow it through.
    if (declared === false) {
      return NextResponse.json(
        { message: "Tutor is not available at this proposed time." },
        { status: 409 }
      );
    }
  }

  // Apply proposal as the new schedule
  const updated = await prisma.session.update({
    where: { id: session.id },
    data: {
      scheduledAt: newScheduledAt,
      endsAt: newEndsAt,
      rescheduledAt: new Date(),
      status: "PENDING",
      proposalStatus: "ACCEPTED",
      proposedAt: null,
      proposedEndAt: null,
      proposedNote: null,
      proposedByUserId: null,
    },
    select: {
      id: true,
      tutorId: true,
      studentId: true,
      scheduledAt: true,
    },
  });

  // Notify tutor
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
    // ignore notification failure
  }

  return NextResponse.json({ success: true });
}