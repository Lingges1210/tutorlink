// src/lib/notify.ts
import { prisma } from "@/lib/prisma";

export type ViewerHint = "STUDENT" | "TUTOR";

export type NotifyInput = {
  userId: string | null | undefined;
  type: string;
  title: string;
  body: string;
  viewer: ViewerHint; // REQUIRED
  data?: Record<string, any>;
};

function sessionsBase(viewer: ViewerHint) {
  return viewer === "TUTOR"
    ? "/dashboard/tutor/sessions"
    : "/dashboard/student/sessions";
}

function sessionHref(viewer: ViewerHint, sessionId: string) {
  return `${sessionsBase(viewer)}?focus=${encodeURIComponent(sessionId)}`;
}

async function create({ userId, type, title, body, viewer, data }: NotifyInput) {
  // Skip if recipient missing (e.g. tutor not assigned yet)
  if (!userId) return null;

  // ✅ always ensure viewer is stored (so bell can route correctly)
  const payload: Record<string, any> = { ...(data ?? {}), viewer };

  // ✅ if sessionId exists, also store direct href (no guessing in UI)
  const sessionId =
    typeof payload.sessionId === "string" ? payload.sessionId.trim() : "";

  if (sessionId) {
    payload.href = sessionHref(viewer, sessionId);
    payload.focusSessionId = sessionId; // optional convenience for UI
  } else {
    // still useful for bell "Open dashboard" / fallback navigation
    payload.href = sessionsBase(viewer);
  }

  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      status: "DELIVERED",
      sentAt: new Date(),
      data: payload,
    },
  });
}

export const notify = {
  /** Generic notification */
  user: create,

  /** Booking confirmation (student sees STUDENT, tutor sees TUTOR) */
  bookingConfirmed: async (
    studentId: string | null | undefined,
    tutorId: string | null | undefined,
    sessionId: string,
    whenISO: string
  ) => {
    const when = new Date(whenISO).toLocaleString();

    await Promise.all([
      create({
        userId: studentId,
        viewer: "STUDENT",
        type: "BOOKING_CONFIRMED",
        title: "Booking Confirmed",
        body: `Your session is confirmed for ${when}.`,
        data: { sessionId },
      }),
      create({
        userId: tutorId,
        viewer: "TUTOR",
        type: "BOOKING_CONFIRMED",
        title: "Session Confirmed",
        body: `You confirmed a session for ${when}.`,
        data: { sessionId },
      }),
    ]);
  },

  /** Tutor proposes new time (student should act) */
  proposalSentToStudent: async (
    studentId: string | null | undefined,
    tutorId: string | null | undefined,
    sessionId: string,
    proposedAtISO: string
  ) => {
    const when = new Date(proposedAtISO).toLocaleString();

    await create({
      userId: studentId,
      viewer: "STUDENT",
      type: "TIME_PROPOSAL",
      title: "New Time Proposed",
      body: `A new time has been proposed: ${when}. Please review and respond.`,
      data: { sessionId, tutorId, proposedAt: proposedAtISO },
    });
  },

  /** Student accepted proposal (tutor should know) */
  proposalAcceptedToTutor: async (
    tutorId: string | null | undefined,
    studentId: string | null | undefined,
    sessionId: string,
    newTimeISO: string
  ) => {
    const when = new Date(newTimeISO).toLocaleString();

    await create({
      userId: tutorId,
      viewer: "TUTOR",
      type: "TIME_PROPOSAL_ACCEPTED",
      title: "Proposal Accepted",
      body: `The student accepted the new time: ${when}.`,
      data: { sessionId, studentId, newTime: newTimeISO },
    });
  },

  /** Student rejected proposal (tutor should know) */
  proposalRejectedToTutor: async (
    tutorId: string | null | undefined,
    studentId: string | null | undefined,
    sessionId: string
  ) => {
    await create({
      userId: tutorId,
      viewer: "TUTOR",
      type: "TIME_PROPOSAL_REJECTED",
      title: "Proposal Rejected",
      body: "The student rejected your proposed time. You may propose another time.",
      data: { sessionId, studentId },
    });
  },

  /** Session cancelled */
  sessionCancelled: async (
    otherPartyId: string | null | undefined,
    sessionId: string,
    viewer: ViewerHint,
    reason?: string | null
  ) => {
    await create({
      userId: otherPartyId,
      viewer,
      type: "SESSION_CANCELLED",
      title: "Session Cancelled",
      body: reason?.trim()
        ? `Reason: ${reason.trim()}`
        : "A session has been cancelled.",
      data: { sessionId },
    });
  },

  /** Session rescheduled (tutor remains assigned) */
  sessionRescheduled: async (
    otherPartyId: string | null | undefined,
    sessionId: string,
    viewer: ViewerHint,
    newTimeISO: string
  ) => {
    const when = new Date(newTimeISO).toLocaleString();

    await create({
      userId: otherPartyId,
      viewer,
      type: "SESSION_RESCHEDULED",
      title: "Session Rescheduled",
      body: `The session has been rescheduled to ${when}.`,
      data: { sessionId, newTime: newTimeISO },
    });
  },

  /** Session rescheduled and tutor unassigned (always for TUTOR) */
  sessionRescheduledUnassigned: async (
    tutorId: string | null | undefined,
    sessionId: string,
    newTimeISO: string
  ) => {
    const when = new Date(newTimeISO).toLocaleString();

    await create({
      userId: tutorId,
      viewer: "TUTOR",
      type: "SESSION_RESCHEDULED_UNASSIGNED",
      title: "Session Rescheduled",
      body: `The session was rescheduled to ${when} and you are no longer assigned due to a time conflict.`,
      data: { sessionId, newTime: newTimeISO },
    });
  },

  /** Session completed (student sees STUDENT, tutor sees TUTOR) */
  sessionCompleted: async (
    studentId: string | null | undefined,
    tutorId: string | null | undefined,
    sessionId: string
  ) => {
    await Promise.all([
      create({
        userId: studentId,
        viewer: "STUDENT",
        type: "SESSION_COMPLETED",
        title: "Session Completed",
        body: "Your tutoring session has been marked as completed.",
        data: { sessionId },
      }),
      create({
        userId: tutorId,
        viewer: "TUTOR",
        type: "SESSION_COMPLETED",
        title: "Session Completed",
        body: "The tutoring session has been successfully completed.",
        data: { sessionId },
      }),
    ]);
  },
};
