import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { notify } from "@/lib/notify";

/** ---------- availability types ---------- */
type DayKey = "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";
type TimeSlot = { start: string; end: string };
type DayAvailability = { day: DayKey; off: boolean; slots: TimeSlot[] };

const DAY_KEYS: DayKey[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DEBUG_SMART_BOOKING = process.env.NODE_ENV !== "production";

function toMinutes(hhmm: string) {
  if (!hhmm) return 0;
  if (hhmm === "24:00") return 24 * 60;
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return h * 60 + m;
}

function dayKeyFromDate(d: Date): DayKey {
  return DAY_KEYS[d.getDay()];
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && aEnd > bStart;
}

function parseAvailability(raw: unknown): DayAvailability[] | null {
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
      .filter((x: any) => DAY_KEYS.includes(x.day));

    return cleaned.length ? cleaned : null;
  } catch {
    return null;
  }
}

/**
 * Availability stored in TutorApplication.availability.
 * Use latest application record for the tutor.
 */
async function getTutorAvailabilityFromDB(
  tutorId: string
): Promise<DayAvailability[] | null> {
  const row = await prisma.tutorApplication.findFirst({
    where: { userId: tutorId },
    orderBy: { createdAt: "desc" },
    select: { availability: true },
  });

  return parseAvailability(row?.availability ?? null);
}

/** Must fully fit inside one slot */
function tutorDeclaredAvailable(
  avail: DayAvailability[],
  start: Date,
  end: Date
): boolean {
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (!sameDay) return false;

  const dk = dayKeyFromDate(start);
  const day = avail.find((d) => d.day === dk);
  if (!day || day.off) return false;
  if (!Array.isArray(day.slots) || day.slots.length === 0) return false;

  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = end.getHours() * 60 + end.getMinutes();

  return day.slots.some((s) => {
    const a = toMinutes(s.start);
    const b = toMinutes(s.end);
    return startMin >= a && endMin <= b;
  });
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function scoreRating(avgRating: number, ratingCount: number) {
  // Neutral default for new tutors
  if (ratingCount <= 0) return 0.6;

  const normalized = clamp(avgRating / 5);
  const confidence = Math.min(ratingCount / 5, 1);
  return clamp(normalized * (0.75 + 0.25 * confidence));
}

function scorePresence(isOnline: boolean) {
  return isOnline ? 1 : 0.45;
}

function scoreStudentHistory(opts: {
  sessions: Array<{
    studentId: string;
    subjectId: string;
    status: string;
    sessionRating?: { rating: number; studentId: string } | null;
  }>;
  studentId: string;
  subjectId: string;
}) {
  const { sessions, studentId, subjectId } = opts;

  const sameStudentCompleted = sessions.filter(
    (s) => s.studentId === studentId && s.status === "COMPLETED"
  );

  if (sameStudentCompleted.length === 0) return 0.4;

  const sameStudentSameSubject = sameStudentCompleted.filter(
    (s) => s.subjectId === subjectId
  );

  let score = sameStudentSameSubject.length > 0 ? 0.8 : 0.65;

  const ratings = sameStudentCompleted
    .map((s) => s.sessionRating)
    .filter(
      (
        r
      ): r is NonNullable<(typeof sameStudentCompleted)[number]["sessionRating"]> =>
        !!r && r.studentId === studentId
    );

  if (ratings.length > 0) {
    const avg =
      ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

    if (avg >= 4.5) score = Math.max(score, 1);
    else if (avg >= 4) score = Math.max(score, 0.9);
    else if (avg >= 3) score = Math.max(score, 0.7);
    else score = Math.min(score, 0.25);
  }

  return clamp(score);
}

function fairnessBoost(opts: {
  completedCount: number;
  upcomingCount: number;
  recentAssignedCount: number;
}) {
  const { completedCount, upcomingCount, recentAssignedCount } = opts;

  let boost = 0;

  // New / low-history tutor boost
  if (completedCount === 0) boost += 10;
  else if (completedCount <= 3) boost += 7;
  else if (completedCount <= 10) boost += 4;

  // Underused recently gets a chance
  if (recentAssignedCount === 0) boost += 3;
  else if (recentAssignedCount >= 4) boost -= 3;

  // Avoid overloading
  if (upcomingCount >= 5) boost -= 8;
  else if (upcomingCount >= 3) boost -= 4;

  return boost;
}

function weightedPickTop<T extends { finalScore: number }>(
  items: T[],
  takeTop = 3
): T | null {
  if (items.length === 0) return null;

  const top = items
    .slice()
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, takeTop);

  const totalWeight = top.reduce(
    (sum, item) => sum + Math.max(item.finalScore, 1),
    0
  );

  let r = Math.random() * totalWeight;

  for (const item of top) {
    r -= Math.max(item.finalScore, 1);
    if (r <= 0) return item;
  }

  return top[0] ?? null;
}

export async function POST(req: Request) {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true, isDeactivated: true, verificationStatus: true },
  });

  if (!dbUser || dbUser.isDeactivated) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  if (dbUser.verificationStatus !== "AUTO_VERIFIED") {
    return NextResponse.json(
      { success: false, message: "Not verified" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const subjectId = typeof body.subjectId === "string" ? body.subjectId : null;
  const scheduledAtRaw =
    typeof body.scheduledAt === "string" ? body.scheduledAt : null;
  const durationMinRaw = body.durationMin;

  const durationMin =
    typeof durationMinRaw === "number" && Number.isFinite(durationMinRaw)
      ? Math.min(Math.max(Math.floor(durationMinRaw), 15), 180)
      : 60;

  if (!subjectId || !scheduledAtRaw) {
    return NextResponse.json(
      { success: false, message: "Missing subjectId / scheduledAt" },
      { status: 400 }
    );
  }

  const scheduledAt = new Date(scheduledAtRaw);
  if (Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json(
      { success: false, message: "Invalid scheduledAt" },
      { status: 400 }
    );
  }

  if (scheduledAt.getTime() < Date.now() + 5 * 60_000) {
    return NextResponse.json(
      { success: false, message: "Choose a time at least 5 minutes from now." },
      { status: 400 }
    );
  }

  const endsAt = new Date(scheduledAt.getTime() + durationMin * 60_000);

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { id: true },
  });

  if (!subject) {
    return NextResponse.json(
      { success: false, message: "Subject not found" },
      { status: 404 }
    );
  }

  const studentClash = await prisma.session.findFirst({
    where: {
      studentId: dbUser.id,
      status: { in: ["PENDING", "ACCEPTED"] },
      scheduledAt: { lt: endsAt },
      endsAt: { gt: scheduledAt },
    },
    select: { id: true },
  });

  if (studentClash) {
    return NextResponse.json(
  {
    success: false,
    message: "You already have another booking that overlaps this time.",
    debug: "STUDENT_CLASH",
  },
  { status: 409 }
);
  }

  const links = await prisma.tutorSubject.findMany({
    where: { subjectId },
    select: { tutorId: true },
  });

  const tutorIds = links.map((x) => x.tutorId);
  if (tutorIds.length === 0) {
    return NextResponse.json(
  {
    success: false,
    message: "No tutors for this subject yet.",
    debug: "NO_TUTORS_FOR_SUBJECT",
  },
  { status: 409 }
);
  }

  const tutors = await prisma.user.findMany({
  where: {
    id: { in: tutorIds },
    isTutorApproved: true,
    isDeactivated: false,
  },
  select: { id: true },
});

  const eligibleTutorIds = tutors.map((t) => t.id);

    const tutorDebugRows = await prisma.user.findMany({
    where: {
      id: { in: tutorIds },
    },
    select: {
      id: true,
      email: true,
      role: true,
      isTutorApproved: true,
      isDeactivated: true,
      verificationStatus: true,
      name: true,
    },
  });

    if (eligibleTutorIds.length === 0) {
    return NextResponse.json(
      {
        success: false,
        message: "No eligible tutors available.",
        debug: "NO_ELIGIBLE_TUTORS",
        meta: {
          subjectTutorIds: tutorIds,
          tutorDebugRows,
        },
      },
      { status: 409 }
    );
  }

  const tutorActive = await prisma.session.findMany({
    where: {
      tutorId: { in: eligibleTutorIds },
      status: { in: ["PENDING", "ACCEPTED"] },
      scheduledAt: { lt: endsAt },
      endsAt: { gt: scheduledAt },
    },
    select: {
      id: true,
      tutorId: true,
      scheduledAt: true,
      endsAt: true,
      durationMin: true,
    },
  });

  const clashByTutor = new Map<string, boolean>();
  for (const s of tutorActive) {
    if (!s.tutorId) continue;
    clashByTutor.set(s.tutorId, true);
  }

  const availableTutors: string[] = [];
  for (const tutorId of eligibleTutorIds) {
    if (clashByTutor.get(tutorId)) continue;

    const avail = await getTutorAvailabilityFromDB(tutorId);
    if (!avail) continue;
    if (!tutorDeclaredAvailable(avail, scheduledAt, endsAt)) continue;

    availableTutors.push(tutorId);
  }

    if (DEBUG_SMART_BOOKING) {
    console.log("[smart-booking] availability filter", {
      subjectId,
      eligibleTutorIds,
      availableTutors,
      scheduledAt,
      endsAt,
    });
  }

  if (availableTutors.length === 0) {
    return NextResponse.json(
  {
    success: false,
    message: "That slot is no longer available. Pick another time.",
    debug: "NO_AVAILABLE_TUTORS_AFTER_AVAILABILITY_FILTER",
    meta: {
      eligibleTutorIds,
      availableTutors,
    },
  },
  { status: 409 }
);
  }

  // Smart + fair auto-assignment
  const tutorProfiles = await prisma.user.findMany({
    where: {
      id: { in: availableTutors },
    },
    select: {
      id: true,
      avgRating: true,
      ratingCount: true,
      presence: {
        select: {
          isOnline: true,
        },
      },
      tutorPresence: {
        select: {
          isOnline: true,
        },
      },
      tutorSessions: {
        where: {
          status: { in: ["PENDING", "ACCEPTED", "COMPLETED"] },
        },
        select: {
          id: true,
          studentId: true,
          subjectId: true,
          status: true,
          createdAt: true,
          sessionRating: {
            select: {
              rating: true,
              studentId: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      },
    },
  });

  const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60_000);

  const scoredTutors = tutorProfiles
    .map((tutor) => {
      const isOnline =
        tutor.presence?.isOnline === true ||
        tutor.tutorPresence?.isOnline === true;

      const completedCount = tutor.tutorSessions.filter(
        (s) => s.status === "COMPLETED"
      ).length;

      const upcomingCount = tutor.tutorSessions.filter(
        (s) => s.status === "PENDING" || s.status === "ACCEPTED"
      ).length;

      const recentAssignedCount = tutor.tutorSessions.filter(
        (s) => new Date(s.createdAt) >= recentCutoff
      ).length;

      const subjectScore = 1;
      const availabilityScore = isOnline ? 1 : 0.85;
      const ratingScore = scoreRating(tutor.avgRating, tutor.ratingCount);
      const presenceScore = scorePresence(isOnline);
      const historyScore = scoreStudentHistory({
        sessions: tutor.tutorSessions,
        studentId: dbUser.id,
        subjectId,
      });

      const matchScore =
        subjectScore * 35 +
        availabilityScore * 30 +
        ratingScore * 15 +
        presenceScore * 10 +
        historyScore * 10;

      const boost = fairnessBoost({
        completedCount,
        upcomingCount,
        recentAssignedCount,
      });

      const finalScore = matchScore + boost;

      return {
        tutorId: tutor.id,
        matchScore,
        fairnessBoost: boost,
        finalScore,
        avgRating: tutor.avgRating,
        ratingCount: tutor.ratingCount,
        isOnline,
        completedCount,
        upcomingCount,
        recentAssignedCount,
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore);

      if (DEBUG_SMART_BOOKING) {
    console.log("[smart-booking] scored tutors", scoredTutors);
  }

  const pickedTutor = weightedPickTop(scoredTutors, 3);

  if (!pickedTutor) {
    return NextResponse.json(
  {
    success: false,
    message: "No tutor could be assigned for that slot.",
    debug: "NO_PICKED_TUTOR",
    meta: {
      scoredTutors,
    },
  },
  { status: 409 }
);
  }

  const chosenTutorId = pickedTutor.tutorId;

  if (DEBUG_SMART_BOOKING) {
    console.log("[smart-booking] picked tutor", {
      subjectId,
      studentId: dbUser.id,
      scheduledAt,
      chosenTutorId,
      topCandidates: scoredTutors.slice(0, 5),
    });
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const clash = await tx.session.findFirst({
        where: {
          tutorId: chosenTutorId,
          status: { in: ["PENDING", "ACCEPTED"] },
          scheduledAt: { lt: endsAt },
          endsAt: { gt: scheduledAt },
        },
        select: { id: true },
      });

      if (clash) {
        throw new Error("RACE_CLASH");
      }

      return tx.session.create({
        data: {
          studentId: dbUser.id,
          tutorId: chosenTutorId,
          subjectId,
          scheduledAt,
          endsAt,
          durationMin,
          status: "PENDING",
        },
        select: {
          id: true,
          scheduledAt: true,
          endsAt: true,
          durationMin: true,
          status: true,
          tutorId: true,
          studentId: true,
          tutor: {
            select: {
              id: true,
              name: true,
              programme: true,
              avatarUrl: true,
              email: true,
            },
          },
          subject: { select: { code: true, title: true } },
        },
      });
    });

    try {
      await notify.user({
        userId: created.tutorId!,
        type: "SESSION_BOOKED",
        title: "New booking request",
        body: `${created.subject?.code ?? "Subject"}${
          created.subject?.title ? ` — ${created.subject.title}` : ""
        }\n${new Date(created.scheduledAt).toLocaleString()}`,
        viewer: "TUTOR",
        data: {
          sessionId: created.id,
          studentId: created.studentId,
          tutorId: created.tutorId,
          scheduledAt: created.scheduledAt,
          endsAt: created.endsAt,
          durationMin: created.durationMin,
          subjectCode: created.subject?.code ?? null,
          subjectTitle: created.subject?.title ?? null,
        },
      });
    } catch (err) {
      console.error("notify.user booking failed:", err);
    }

    return NextResponse.json({
      success: true,
      item: {
        ...created,
        assigned: true,
      },
    });
  } catch (e: any) {
    if (String(e?.message) === "RACE_CLASH") {
      return NextResponse.json(
  {
    success: false,
    message: "That slot was just taken. Please choose another time.",
    debug: "RACE_CLASH",
  },
  { status: 409 }
);
    }

    return NextResponse.json(
      { success: false, message: "Booking failed", debug: "BOOKING_FAILED" },
      { status: 500 }
    );
  }
}