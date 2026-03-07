import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

/** ---------------- types ---------------- */
type DayKey = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
type TimeSlot = { start: string; end: string };
type DayAvailability = { day: DayKey; off: boolean; slots: TimeSlot[] };

type TutorCandidate = {
  id: string;
  name: string | null;
  programme: string | null;
  avatarUrl: string | null;
  avgRating: number;
  ratingCount: number;
  presence: { isOnline: boolean; lastSeenAt: Date } | null;
  tutorPresence: { isOnline: boolean; lastSeenAt: Date } | null;
  tutorApplications: { availability: string | null }[];
  tutorSessions: {
    id: string;
    studentId: string;
    subjectId: string;
    status: "PENDING" | "ACCEPTED" | "COMPLETED" | "CANCELLED";
    scheduledAt: Date;
    endsAt: Date | null;
    durationMin: number;
    completedAt: Date | null;
    sessionRating: {
      rating: number;
      studentId: string;
      confirmed: boolean | null;
    } | null;
  }[];
};

/** ---------------- helpers ---------------- */
function toMinutes(hhmm: string) {
  if (!hhmm || hhmm === "24:00") return 24 * 60;
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return h * 60 + m;
}

function getDayKey(d: Date): DayKey {
  const map: DayKey[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return map[d.getDay()];
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function roundScore(value: number) {
  return Math.round(value);
}

function isWithinAvailability(
  availabilityJson: string | null | undefined,
  start: Date,
  end: Date
) {
  if (!availabilityJson) return false;

  let parsed: DayAvailability[] | null = null;
  try {
    parsed = JSON.parse(availabilityJson);
  } catch {
    return false;
  }

  if (!Array.isArray(parsed)) return false;

  const startDay = getDayKey(start);
  const endDay = getDayKey(end);
  if (startDay !== endDay) return false;

  const day = parsed.find((x) => x?.day === startDay);
  if (!day || day.off || !Array.isArray(day.slots) || day.slots.length === 0) {
    return false;
  }

  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = end.getHours() * 60 + end.getMinutes();

  return day.slots.some((slot) => {
    const a = toMinutes(slot.start);
    const b = toMinutes(slot.end);
    return startMin >= a && endMin <= b;
  });
}

function hasSessionClash(
  sessions: TutorCandidate["tutorSessions"],
  start: Date,
  end: Date
) {
  return sessions.some((s) => {
    if (s.status !== "PENDING" && s.status !== "ACCEPTED") return false;
    const existingStart = new Date(s.scheduledAt);
    const existingEnd =
      s.endsAt ??
      new Date(existingStart.getTime() + (s.durationMin || 60) * 60_000);

    return existingStart < end && existingEnd > start;
  });
}

function scoreRating(avgRating: number, ratingCount: number) {
  if (ratingCount <= 0) return 0.6;

  const normalized = clamp(avgRating / 5);
  const confidence = Math.min(ratingCount / 5, 1);
  const blended = normalized * (0.7 + 0.3 * confidence);
  return clamp(blended);
}

function scoreOnlinePresence(candidate: TutorCandidate) {
  const isOnline =
    candidate.presence?.isOnline === true ||
    candidate.tutorPresence?.isOnline === true;
  return isOnline ? 1 : 0.35;
}

function scoreHistory(
  candidate: TutorCandidate,
  studentId: string,
  subjectId: string
) {
  const sameStudentSessions = candidate.tutorSessions.filter(
    (s) => s.studentId === studentId
  );
  const completedSameStudent = sameStudentSessions.filter(
    (s) => s.status === "COMPLETED"
  );
  const sameStudentSameSubject = completedSameStudent.filter(
    (s) => s.subjectId === subjectId
  );

  const ratingsFromStudent = completedSameStudent
    .map((s) => s.sessionRating)
    .filter(
      (
        r
      ): r is NonNullable<(typeof completedSameStudent)[number]["sessionRating"]> =>
        !!r && r.studentId === studentId
    );

  let score = 0.3;

  if (completedSameStudent.length > 0) score = 0.65;
  if (sameStudentSameSubject.length > 0) score = 0.8;

  if (ratingsFromStudent.length > 0) {
    const avg =
      ratingsFromStudent.reduce((sum, r) => sum + r.rating, 0) /
      ratingsFromStudent.length;

    if (avg >= 4.5) score = Math.max(score, 1);
    else if (avg >= 4) score = Math.max(score, 0.9);
    else if (avg >= 3) score = Math.max(score, 0.7);
    else score = Math.min(score, 0.25);
  }

  return clamp(score);
}

function scoreAvailability(
  candidate: TutorCandidate,
  start?: Date,
  end?: Date
) {
  if (!start || !end) return 0.6;

  const availabilityJson = candidate.tutorApplications?.[0]?.availability ?? null;
  const within = isWithinAvailability(availabilityJson, start, end);
  if (!within) return 0;

  const clash = hasSessionClash(candidate.tutorSessions, start, end);
  if (clash) return 0;

  const isOnline =
    candidate.presence?.isOnline === true ||
    candidate.tutorPresence?.isOnline === true;

  return isOnline ? 1 : 0.8;
}

function buildReasons(params: {
  candidate: TutorCandidate;
  totalScore: number;
  availabilityScore: number;
  historyScore: number;
  ratingScore: number;
}) {
  const { candidate, totalScore, availabilityScore, historyScore, ratingScore } =
    params;

  const reasons: string[] = [];
  reasons.push("Teaches this subject");

  const isOnline =
    candidate.presence?.isOnline === true ||
    candidate.tutorPresence?.isOnline === true;

  if (isOnline) reasons.push("Online now");

  if (availabilityScore >= 0.8) reasons.push("Fits your requested time");
  else if (availabilityScore > 0 && availabilityScore < 0.8) {
    reasons.push("Potentially available");
  }

  if (candidate.ratingCount > 0) {
    if (candidate.avgRating >= 4.5) reasons.push("Highly rated by students");
    else if (ratingScore >= 0.7) reasons.push("Good student ratings");
  } else {
    reasons.push("Newly available tutor");
  }

  if (historyScore >= 0.8) reasons.push("Has helped you before");
  else if (historyScore >= 0.6) reasons.push("Has prior tutoring history with you");

  if (totalScore >= 85) reasons.push("Strong overall match");

  return reasons.slice(0, 4);
}

/** ---------------- route ---------------- */
export async function GET(req: Request) {
  try {
    const supabase = await supabaseServerComponent();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ items: [] });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email.toLowerCase() },
      select: {
        id: true,
        verificationStatus: true,
        isDeactivated: true,
      },
    });

    if (
      !dbUser ||
      dbUser.isDeactivated ||
      dbUser.verificationStatus !== "AUTO_VERIFIED"
    ) {
      return NextResponse.json({ items: [] });
    }

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");
    const scheduledAtRaw = searchParams.get("scheduledAt");
    const durationMinRaw = searchParams.get("durationMin");

    if (!subjectId) {
      return NextResponse.json({ items: [] }, { status: 400 });
    }

    let requestedStart: Date | undefined;
    let requestedEnd: Date | undefined;

    if (scheduledAtRaw) {
      const parsedStart = new Date(scheduledAtRaw);
      if (!Number.isNaN(parsedStart.getTime())) {
        requestedStart = parsedStart;
        const durationMin = Math.max(15, Number(durationMinRaw || "60"));
        requestedEnd = new Date(parsedStart.getTime() + durationMin * 60_000);
      }
    }

    const links = await prisma.tutorSubject.findMany({
      where: {
        subjectId,
        tutor: {
          isTutorApproved: true,
          isDeactivated: false,
        },
      },
      select: {
        tutor: {
          select: {
            id: true,
            name: true,
            programme: true,
            avatarUrl: true,
            avgRating: true,
            ratingCount: true,
            presence: {
              select: {
                isOnline: true,
                lastSeenAt: true,
              },
            },
            tutorPresence: {
              select: {
                isOnline: true,
                lastSeenAt: true,
              },
            },
            tutorApplications: {
              select: {
                availability: true,
              },
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
            },
            tutorSessions: {
              where: {
                status: {
                  in: ["PENDING", "ACCEPTED", "COMPLETED"],
                },
              },
              select: {
                id: true,
                studentId: true,
                subjectId: true,
                status: true,
                scheduledAt: true,
                endsAt: true,
                durationMin: true,
                completedAt: true,
                sessionRating: {
                  select: {
                    rating: true,
                    studentId: true,
                    confirmed: true,
                  },
                },
              },
              orderBy: {
                scheduledAt: "desc",
              },
              take: 50,
            },
          },
        },
      },
      take: 50,
    });

    const uniqueTutors = Array.from(
      new Map(links.map((x) => [x.tutor.id, x.tutor])).values()
    ) as TutorCandidate[];

    const items = uniqueTutors
      .map((candidate) => {
        const subjectScore = 1;
        const availabilityScore = scoreAvailability(
          candidate,
          requestedStart,
          requestedEnd
        );

        if (requestedStart && requestedEnd && availabilityScore === 0) {
          return null;
        }

        const ratingScore = scoreRating(candidate.avgRating, candidate.ratingCount);
        const presenceScore = scoreOnlinePresence(candidate);
        const historyScore = scoreHistory(candidate, dbUser.id, subjectId);

        const totalScore =
          subjectScore * 35 +
          availabilityScore * 25 +
          ratingScore * 20 +
          presenceScore * 10 +
          historyScore * 10;

        return {
          id: candidate.id,
          name: candidate.name,
          programme: candidate.programme,
          avatarUrl: candidate.avatarUrl,
          avgRating: candidate.avgRating,
          ratingCount: candidate.ratingCount,
          isOnline:
            candidate.presence?.isOnline === true ||
            candidate.tutorPresence?.isOnline === true,
          matchScore: roundScore(totalScore),
          reasons: buildReasons({
            candidate,
            totalScore,
            availabilityScore,
            historyScore,
            ratingScore,
          }),
        };
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((a, b) => {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
        return b.ratingCount - a.ratingCount;
      })
      .slice(0, 20);

    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET /api/tutors/match failed:", error);
    return NextResponse.json(
      { items: [], error: "Failed to load tutor matches" },
      { status: 500 }
    );
  }
}