// src/lib/email.ts
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { buildIcs } from "@/lib/ics";

const resend = new Resend(process.env.RESEND_API_KEY!);

function esc(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmtLocal(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function brandEmailLayout(opts: {
  subject: string;
  preheader?: string;
  title: string;
  greetingName?: string | null;
  bodyHtml: string; // already-safe html
  cta?: { label: string; href: string };
  footerNote?: string;
}) {
  const {
    subject,
    preheader,
    title,
    greetingName,
    bodyHtml,
    cta,
    footerNote,
  } = opts;

  const appName = "TutorLink";
  const brand = "#7c3aed"; // violet-600-ish

  /* =========================
     ✅ Premium LIGHT palette (force light)
     ========================= */
  const bg = "#f6f7fb"; // soft app-like background
  const card = "#ffffff"; // main card
  const card2 = "#f8fafc"; // subtle inner surface
  const text = "#111827"; // slate-900
  const muted = "#6b7280"; // gray-500
  const border = "rgba(17,24,39,0.10)";
  const border2 = "rgba(17,24,39,0.08)";

  const safePreheader = esc(preheader ?? subject);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <!-- ✅ Force light mode (helps prevent auto-dark-mode inversion) -->
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />

    <title>${esc(subject)}</title>
    <style>
      /* Keep CSS minimal (many clients strip styles). Inline styles are primary. */
      a { color: ${brand}; }
    </style>
  </head>

  <body style="margin:0; padding:0; background-color:${bg}; font-family: ui-sans-serif, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
    <!-- preheader (hidden) -->
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
      ${safePreheader}
    </div>

    <!-- Outer background (repeat bg in multiple places to defeat auto-dark-mode + Outlook quirks) -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="${bg}"
      style="background-color:${bg}; width:100%; padding:30px 16px;">
      <tr>
        <td align="center" bgcolor="${bg}" style="background-color:${bg};">

          <!-- Container -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px; width:100%;">
           <!-- Header -->
<tr>
  <td align="center" style="padding:0 0 18px 0;">
    <img
      src="${process.env.NEXT_PUBLIC_APP_URL}/logo.png"
      alt="TutorLink"
      style="display:block; height:52px; width:auto;"
    />
  </td>
</tr>

            <!-- Main card -->
            <tr>
              <td bgcolor="${card}"
                style="
                  background-color:${card};
                  border:1px solid ${border};
                  border-radius:18px;
                  padding:24px;
                  box-shadow: 0 14px 36px rgba(17,24,39,0.10);
                ">

                <div style="color:${muted}; font-size:12px; margin-bottom:8px;">
                  ${esc(greetingName ? `Hi ${greetingName}` : "Hi there")}
                </div>

                <div style="color:${text}; font-size:20px; font-weight:900; margin:0 0 12px 0; line-height:1.25;">
                  ${esc(title)}
                </div>

                <div style="color:${text}; font-size:14px; line-height:1.7;">
                  ${bodyHtml}
                </div>

                ${
                  cta
                    ? `
                  <div style="margin-top:18px;">
                    <a href="${esc(cta.href)}"
                       style="
                         display:inline-block;
                         background-color:${brand};
                         color:#ffffff;
                         text-decoration:none;
                         font-weight:900;
                         font-size:13px;
                         padding:11px 16px;
                         border-radius:12px;
                         box-shadow: 0 10px 22px rgba(124,58,237,0.22);
                       ">
                      ${esc(cta.label)}
                    </a>
                  </div>
                `
                    : ""
                }

                <div style="margin-top:20px; border-top:1px solid ${border2}; padding-top:14px; color:${muted}; font-size:12px; line-height:1.55;">
                  ${esc(
                    footerNote ??
                      "If you didn’t request this, you can safely ignore this email."
                  )}
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:14px 4px 0 4px;">
                <div style="color:${muted}; font-size:12px; text-align:center; line-height:1.5;">
                  © ${new Date().getFullYear()} ${appName}. All rights reserved.
                </div>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function sessionCardHtml(opts: {
  subjectCode: string;
  subjectTitle: string;
  startISO: string;
  endISO?: string;
  extraLines?: string[];
}) {
  const title = `${opts.subjectCode} — ${opts.subjectTitle}`;
  const extra = (opts.extraLines ?? []).filter(Boolean);

  // ✅ Pretty time line: "Fri, Mar 6 • 5:00 PM – 5:30 PM"
  const start = new Date(opts.startISO);
  const end = opts.endISO ? new Date(opts.endISO) : null;

  const dateStr = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const startTime = start.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  const endTime = end
    ? end.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const whenLine = `${dateStr} • ${startTime}${endTime ? ` – ${endTime}` : ""}`;

  return `
    <div style="
      margin-top:14px;
      background-color:#f8fafc;
      border:1px solid rgba(17,24,39,0.10);
      border-radius:14px;
      padding:14px;
    ">
      <div style="color:#111827; font-weight:900; font-size:15px; margin-bottom:8px;">
        ${esc(title)}
      </div>

      <div style="color:#6b7280; font-size:13px; line-height:1.6;">
        ${esc(whenLine)}
      </div>

      ${
        extra.length
          ? `<div style="margin-top:10px; border-top:1px solid rgba(17,24,39,0.08); padding-top:10px; color:#6b7280; font-size:12px; line-height:1.6;">
              ${extra
                .map((x) => `<div>${esc(x)}</div>`)
                .join("")}
            </div>`
          : ""
      }
    </div>
  `;
}

/* =========================
   Emails
   ========================= */

export async function sendApprovalEmail(email: string, name?: string) {
  const subject = "Your TutorLink account has been verified";

  const html = brandEmailLayout({
    subject,
    preheader: "You now have full access to TutorLink.",
    title: "Account verified",
    greetingName: name ?? "there",
    bodyHtml: `
      <p style="margin:0 0 10px 0;">Your TutorLink account has been <b>successfully verified</b>.</p>
      <p style="margin:0;">You now have full access to all features.</p>
    `,
    cta: {
      label: "Open TutorLink",
      href: process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
        : "https://tutorlink.example",
    },
    footerNote: "Welcome aboard — we’re glad to have you.",
  });

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject,
    html,
  });
}

export async function sendRejectionEmail(email: string, reason?: string) {
  const subject = "TutorLink verification update";

  const reasonBlock = reason
    ? `<p style="margin:10px 0 0 0;"><b>Reason:</b> ${esc(reason)}</p>`
    : "";

  const html = brandEmailLayout({
    subject,
    preheader:
      "Your verification was not approved. You can re-upload and try again.",
    title: "Verification not approved",
    greetingName: "there",
    bodyHtml: `
      <p style="margin:0 0 10px 0;">Your TutorLink verification was <b>not approved</b>.</p>
      ${reasonBlock}
      <p style="margin:10px 0 0 0;">You may re-upload your matric card or contact support.</p>
    `,
    cta: {
      label: "Go to Verification",
      href: process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/verify`
        : "https://tutorlink.example",
    },
    footerNote: "If you believe this is a mistake, reply to this email for help.",
  });

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject,
    html,
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
  const {
    sessionId,
    toEmail,
    toName,
    subjectCode,
    subjectTitle,
    scheduledAtISO,
  } = opts;

  const subject = `Reminder: ${subjectCode} session in 1 hour`;

  const html = brandEmailLayout({
    subject,
    preheader: "Your session starts in 1 hour.",
    title: "Session reminder",
    greetingName: toName ?? "there",
    bodyHtml: `
      <p style="margin:0 0 10px 0;">This is a friendly reminder that your session starts in <b>1 hour</b>.</p>
      ${sessionCardHtml({
        subjectCode,
        subjectTitle,
        startISO: scheduledAtISO,
      })}
      <p style="margin:12px 0 0 0;">Be ready a few minutes early so you can start on time.</p>
    `,
  });

  const resp = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: toEmail,
    subject,
    html,
    scheduledAt: scheduledAtISO,
  });

  const emailId = resp.data?.id ?? null;
  if (emailId) {
    await prisma.session.update({
      where: { id: sessionId },
      data: { studentReminderEmailId: emailId },
    });
  }

  return emailId;
}

export function computeOneHourBeforeISO(sessionISO: string) {
  const start = new Date(sessionISO).getTime();
  const oneHourBefore = new Date(start - 60 * 60 * 1000);
  const minFuture = new Date(Date.now() + 60 * 1000);
  const finalTime = oneHourBefore > minFuture ? oneHourBefore : minFuture;
  return finalTime.toISOString();
}

export async function cancelScheduledEmail(resendEmailId: string) {
  try {
    await resend.emails.cancel(resendEmailId);
  } catch {
    // ignore
  }
}

export async function sendSessionInviteEmail(opts: {
  mode: "ACCEPTED" | "RESCHEDULED" | "CANCELLED";
  toEmail: string;
  toName?: string | null;

  subjectCode: string;
  subjectTitle: string;

  startISO: string;
  endISO: string;

  uid: string;
  sequence: number;

  organizerName: string;
  organizerEmail: string;

  cancelReason?: string | null;
}) {
  const start = new Date(opts.startISO);
  const end = new Date(opts.endISO);

  const method = opts.mode === "CANCELLED" ? "CANCEL" : "REQUEST";

  const title = `TutorLink Session: ${opts.subjectCode}`;
  const descriptionLines = [
    `Course: ${opts.subjectCode} — ${opts.subjectTitle}`,
    `Start: ${start.toLocaleString()}`,
    `End: ${end.toLocaleString()}`,
    opts.mode === "CANCELLED" && opts.cancelReason
      ? `Reason: ${opts.cancelReason}`
      : null,
  ].filter(Boolean);

  const ics = buildIcs({
    method,
    uid: opts.uid,
    sequence: opts.sequence,
    start,
    end,
    title,
    description: descriptionLines.join("\n"),
    organizerName: opts.organizerName,
    organizerEmail: opts.organizerEmail,
    attendeeName: opts.toName ?? "User",
    attendeeEmail: opts.toEmail,
  });

  const subject =
    opts.mode === "CANCELLED"
      ? `Cancelled: ${opts.subjectCode} session`
      : opts.mode === "RESCHEDULED"
      ? `Updated: ${opts.subjectCode} session time`
      : `Confirmed: ${opts.subjectCode} session invite`;

  const base64Ics = Buffer.from(ics, "utf-8").toString("base64");

  const bodyIntro =
    opts.mode === "CANCELLED"
      ? `<p style="margin:0;">This email confirms your session has been <b>cancelled</b>.</p>`
      : `<p style="margin:0;">Please add the attached <b>calendar invite</b> to get automatic reminders.</p>`;

  const extra =
    opts.mode === "CANCELLED" && opts.cancelReason
      ? [`Reason: ${opts.cancelReason}`]
      : [];

  const html = brandEmailLayout({
    subject,
    preheader: "Calendar invite attached.",
    title:
      opts.mode === "CANCELLED"
        ? "Session cancelled"
        : opts.mode === "RESCHEDULED"
        ? "Session updated"
        : "Session confirmed",
    greetingName: opts.toName ?? "there",
    bodyHtml: `
      ${bodyIntro}
      ${sessionCardHtml({
        subjectCode: opts.subjectCode,
        subjectTitle: opts.subjectTitle,
        startISO: opts.startISO,
        endISO: opts.endISO,
        extraLines: extra,
      })}
      <p style="margin:12px 0 0 0;">If the session changes again, you'll receive an updated invite.</p>
    `,
  });

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: opts.toEmail,
    subject,
    html,
    attachments: [
      {
        filename: method === "CANCEL" ? "session-cancel.ics" : "session.ics",
        content: base64Ics,
        contentType: `text/calendar; charset=utf-8; method=${method}`,
      },
    ],
  });
}

export async function sendPasswordResetEmail(opts: {
  toEmail: string;
  toName?: string | null;
  resetLink: string;
}) {
  const subject = "Reset your TutorLink password";

  const html = brandEmailLayout({
    subject,
    preheader: "Use this link to reset your password.",
    title: "Reset Password",
    greetingName: opts.toName ?? "there",
    bodyHtml: `
      <p style="margin:0 0 10px 0;">
        We received a request to reset your TutorLink password.
      </p>
      <p style="margin:0;">
        Click the button below to set a new password.
      </p>
    `,
    cta: { label: "Reset Password", href: opts.resetLink },
    footerNote: "If you didn’t request this, you can safely ignore this email.",
  });

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: opts.toEmail,
    subject,
    html,
  });
}