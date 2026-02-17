import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendApprovalEmail(email: string, name?: string) {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: "Your TutorLink account has been verified",
    html: `
      <p>Hi ${name ?? "there"},</p>
      <p>Your TutorLink account has been <strong>successfully verified</strong>.</p>
      <p>You now have full access to all features.</p>
      <br />
      <p>Welcome aboard,<br/>TutorLink Team</p>
    `,
  });
}

export async function sendRejectionEmail(email: string, reason?: string) {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: "⚠️ TutorLink verification update",
    html: `
      <p>Hello,</p>
      <p>Your TutorLink verification was <strong>not approved</strong>.</p>
      ${
        reason
          ? `<p><strong>Reason:</strong> ${reason}</p>`
          : ""
      }
      <p>You may re-upload your matric card or contact support.</p>
      <br />
      <p>TutorLink Admin</p>
    `,
  });
}

export async function scheduleSessionReminderEmail(opts: {
  sessionId: string;
  toEmail: string;
  toName?: string | null;
  subjectCode: string;
  subjectTitle: string;
  scheduledAtISO: string; // when the email should be sent
}) {
  const { sessionId, toEmail, toName, subjectCode, subjectTitle, scheduledAtISO } =
    opts;

  // 1) Create/schedule email in Resend
  const resp = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: toEmail,
    subject: `⏰ Reminder: ${subjectCode} session in 1 hour`,
    html: `
      <p>Hi ${toName ?? "there"},</p>
      <p>This is a friendly reminder that your session is starting in <strong>1 hour</strong>.</p>
      <p><strong>${subjectCode} — ${subjectTitle}</strong></p>
      <br />
      <p>See you soon,<br/>TutorLink Team</p>
    `,
    // ✅ this is the key (scheduled email)
    scheduledAt: scheduledAtISO,
  });

  // 2) Save resend emailId so we can cancel/reschedule later
  const emailId = resp.data?.id ?? null;
  if (emailId) {
    await prisma.session.update({
      where: { id: sessionId },
      data: { studentReminderEmailId: emailId }, // we’ll add this field
    });
  }

  return emailId;
}

export function computeOneHourBeforeISO(sessionISO: string) {
  const start = new Date(sessionISO).getTime();
  const oneHourBefore = new Date(start - 60 * 60 * 1000);

  // if already passed, schedule 1 minute from now (still sends)
  const minFuture = new Date(Date.now() + 60 * 1000);
  const finalTime = oneHourBefore > minFuture ? oneHourBefore : minFuture;

  return finalTime.toISOString();
}

export async function cancelScheduledEmail(resendEmailId: string) {
  try {
    await resend.emails.cancel(resendEmailId);
  } catch {
    // ignore: already sent/cancelled/not found
  }
}
