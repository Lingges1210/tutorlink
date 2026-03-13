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

/* ==========================================================================
   DESIGN TOKENS
   ========================================================================== */
const T = {
  // Brand
  brand:         "#5b21b6",   // violet-800 — deep, premium
  brandMid:      "#7c3aed",   // violet-600 — CTA hover
  brandLight:    "#ede9fe",   // violet-100 — accent surfaces
  brandText:     "#4c1d95",   // violet-900 — brand text on light bg

  // Neutrals (force-light palette)
  pageBg:        "#f4f4f6",   // warm off-white
  cardBg:        "#ffffff",
  cardBg2:       "#fafafa",   // inner surfaces / info blocks
  textPrimary:   "#0f0f10",   // near-black
  textSecondary: "#52525b",   // zinc-600
  textMuted:     "#a1a1aa",   // zinc-400
  border:        "#e4e4e7",   // zinc-200
  borderStrong:  "#d4d4d8",   // zinc-300

  // Semantic
  successBg:     "#f0fdf4",
  successText:   "#15803d",
  successBorder: "#bbf7d0",
  dangerBg:      "#fff1f2",
  dangerText:    "#be123c",
  dangerBorder:  "#fecdd3",
  infoBg:        "#f0f9ff",
  infoText:      "#0369a1",
  infoBorder:    "#bae6fd",
  warningBg:     "#fffbeb",
  warningText:   "#b45309",
  warningBorder: "#fde68a",
};

/* ==========================================================================
   HELPERS
   ========================================================================== */

function badge(
  label: string,
  style: "success" | "danger" | "info" | "warning" | "brand" = "brand"
) {
  const map = {
    success: `background:${T.successBg};color:${T.successText};border:1px solid ${T.successBorder};`,
    danger:  `background:${T.dangerBg};color:${T.dangerText};border:1px solid ${T.dangerBorder};`,
    info:    `background:${T.infoBg};color:${T.infoText};border:1px solid ${T.infoBorder};`,
    warning: `background:${T.warningBg};color:${T.warningText};border:1px solid ${T.warningBorder};`,
    brand:   `background:${T.brandLight};color:${T.brandText};border:1px solid #c4b5fd;`,
  };
  return `<span style="display:inline-block;${map[style]}font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;padding:3px 10px;border-radius:100px;">${esc(label)}</span>`;
}

function divider() {
  return `<div style="height:1px;background:${T.border};margin:20px 0;"></div>`;
}

function metaRow(icon: string, label: string, value: string) {
  return `
    <tr>
      <td style="padding:7px 0;vertical-align:top;">
        <span style="font-size:15px;line-height:1;">${icon}</span>
      </td>
      <td style="padding:7px 0 7px 10px;vertical-align:top;">
        <span style="font-size:12px;font-weight:600;color:${T.textMuted};text-transform:uppercase;letter-spacing:0.07em;display:block;margin-bottom:1px;">${esc(label)}</span>
        <span style="font-size:14px;color:${T.textPrimary};font-weight:500;">${esc(value)}</span>
      </td>
    </tr>`;
}

/* ==========================================================================
   MASTER LAYOUT
   ========================================================================== */

function brandEmailLayout(opts: {
  subject: string;
  preheader?: string;
  badgeLabel?: string;
  badgeStyle?: "success" | "danger" | "info" | "warning" | "brand";
  title: string;
  greetingName?: string | null;
  bodyHtml: string;
  cta?: { label: string; href: string; style?: "primary" | "ghost" };
  footerNote?: string;
}) {
  const {
    subject,
    preheader,
    badgeLabel,
    badgeStyle = "brand",
    title,
    greetingName,
    bodyHtml,
    cta,
    footerNote,
  } = opts;

  const appName  = "TutorLink";
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? "https://tutorlink.example";
  const safePreheader = esc(preheader ?? subject);
  const year     = new Date().getFullYear();

  const ctaHtml = cta
    ? `
      <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:24px;">
        <tr>
          <td style="
            background:${T.brand};
            border-radius:10px;
            box-shadow:0 4px 14px rgba(91,33,182,0.28),0 1px 3px rgba(0,0,0,0.08);
          ">
            <a href="${esc(cta.href)}"
               style="
                 display:inline-block;
                 padding:12px 24px;
                 color:#ffffff;
                 text-decoration:none;
                 font-size:14px;
                 font-weight:700;
                 letter-spacing:0.01em;
                 border-radius:10px;
               ">
              ${esc(cta.label)} &rarr;
            </a>
          </td>
        </tr>
      </table>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${esc(subject)}</title>
  <style>
    a { color: ${T.brand}; }
    @media (max-width:600px) {
      .card { padding: 24px 18px !important; }
      .outer { padding: 20px 12px !important; }
    }
  </style>
</head>

<body style="margin:0;padding:0;background-color:${T.pageBg};font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;">

  <!-- Preheader -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;">
    ${safePreheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <!-- Page wrapper -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="${T.pageBg}"
         style="background-color:${T.pageBg};">
    <tr>
      <td class="outer" align="center" style="padding:40px 16px 48px;">

        <!-- ── Container ────────────────────────── -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
               style="max-width:600px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding:0 0 24px;">
              <a href="${esc(appUrl)}" style="text-decoration:none;">
                <img
                  src="${esc(appUrl)}/logo.png"
                  alt="${esc(appName)}"
                  style="display:block;height:44px;width:auto;"
                />
              </a>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td class="card" bgcolor="${T.cardBg}"
                style="
                  background-color:${T.cardBg};
                  border:1px solid ${T.border};
                  border-radius:16px;
                  padding:36px 36px 32px;
                  box-shadow:0 1px 3px rgba(0,0,0,0.06),0 8px 24px rgba(0,0,0,0.05);
                ">

              <!-- Badge -->
              ${badgeLabel ? `<div style="margin-bottom:14px;">${badge(badgeLabel, badgeStyle)}</div>` : ""}

              <!-- Title -->
              <h1 style="margin:0 0 8px;color:${T.textPrimary};font-size:22px;font-weight:800;line-height:1.25;letter-spacing:-0.02em;">
                ${esc(title)}
              </h1>

              <!-- Greeting -->
              <p style="margin:0 0 20px;color:${T.textSecondary};font-size:14px;line-height:1.6;">
                Hi ${esc(greetingName ?? "there")},
              </p>

              <!-- Body -->
              <div style="color:${T.textSecondary};font-size:14px;line-height:1.75;">
                ${bodyHtml}
              </div>

              <!-- CTA -->
              ${ctaHtml}

              ${divider()}

              <!-- Footer note -->
              <p style="margin:0;color:${T.textMuted};font-size:12px;line-height:1.6;">
                ${esc(footerNote ?? "If you didn't request this, you can safely ignore this email.")}
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 0 0;">
              <p style="margin:0 0 8px;color:${T.textMuted};font-size:12px;">
                &copy; ${year} ${esc(appName)}. All rights reserved.
              </p>
              <p style="margin:0;font-size:12px;">
                <a href="${esc(appUrl)}" style="color:${T.textMuted};text-decoration:none;">${esc(appUrl.replace(/^https?:\/\//, ""))}</a>
              </p>
            </td>
          </tr>

        </table>
        <!-- ── /Container ─────────────────────── -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}

/* ==========================================================================
   SESSION CARD
   ========================================================================== */

function sessionCardHtml(opts: {
  subjectCode: string;
  subjectTitle: string;
  startISO: string;
  endISO?: string;
  extraLines?: string[];
  highlight?: boolean; // draws a left-border accent
}) {
  const { subjectCode, subjectTitle, startISO, endISO, extraLines = [], highlight } = opts;

  const start = new Date(startISO);
  const end   = endISO ? new Date(endISO) : null;

  const dateStr  = start.toLocaleDateString(undefined, { weekday:"long", month:"long", day:"numeric" });
  const startTime = start.toLocaleTimeString(undefined, { hour:"numeric", minute:"2-digit" });
  const endTime   = end ? end.toLocaleTimeString(undefined, { hour:"numeric", minute:"2-digit" }) : null;

  const accentBar = highlight
    ? `border-left:3px solid ${T.brand};border-radius:0 12px 12px 0;`
    : `border-radius:12px;`;

  return `
  <div style="
    margin-top:20px;
    background:${T.cardBg2};
    border:1px solid ${T.border};
    ${accentBar}
    overflow:hidden;
  ">
    <!-- Header strip -->
    <div style="
      background:${T.brandLight};
      padding:12px 16px;
      border-bottom:1px solid #c4b5fd;
    ">
      <span style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${T.brandText};">
        ${esc(subjectCode)}
      </span>
    </div>

    <!-- Body -->
    <div style="padding:14px 16px;">
      <p style="margin:0 0 10px;font-size:15px;font-weight:700;color:${T.textPrimary};line-height:1.3;">
        ${esc(subjectTitle.replace(/^[\s:–—-]+/, "").trim())}
      </p>

      <!-- Date / time rows -->
      <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
        <tr>
          <td style="width:16px;vertical-align:middle;padding-top:1px;">
            <!-- Calendar icon -->
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;">
              <rect x="1" y="3" width="14" height="12" rx="2" stroke="${T.textMuted}" stroke-width="1.4" fill="none"/>
              <path d="M1 7h14" stroke="${T.textMuted}" stroke-width="1.4"/>
              <path d="M5 1v3M11 1v3" stroke="${T.textMuted}" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
          </td>
          <td style="padding-left:8px;vertical-align:middle;">
            <span style="font-size:13px;color:${T.textSecondary};">${esc(dateStr)}</span>
          </td>
        </tr>
        <tr><td colspan="2" style="height:6px;"></td></tr>
        <tr>
          <td style="width:16px;vertical-align:middle;padding-top:1px;">
            <!-- Clock icon -->
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;">
              <circle cx="8" cy="8" r="6.5" stroke="${T.textMuted}" stroke-width="1.4" fill="none"/>
              <path d="M8 5v3.5l2 1.5" stroke="${T.textMuted}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </td>
          <td style="padding-left:8px;vertical-align:middle;">
            <span style="font-size:13px;color:${T.textSecondary};">
              ${esc(startTime)}${endTime ? ` &ndash; ${esc(endTime)}` : ""}
            </span>
          </td>
        </tr>
      </table>

      ${extraLines.filter(Boolean).length ? `
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid ${T.border};">
          ${extraLines.filter(Boolean).map(l =>
            `<p style="margin:0 0 4px;font-size:12px;color:${T.textSecondary};">${esc(l)}</p>`
          ).join("")}
        </div>` : ""}
    </div>
  </div>`;
}

/* ==========================================================================
   EMAILS
   ========================================================================== */

export async function sendApprovalEmail(email: string, name?: string) {
  const subject = "Your TutorLink account is verified";

  const html = brandEmailLayout({
    subject,
    preheader: "Welcome aboard — you now have full access to TutorLink.",
    badgeLabel: "Account Verified",
    badgeStyle: "success",
    title: "You're all set!",
    greetingName: name,
    bodyHtml: `
      <p style="margin:0 0 12px;">
        Great news — your TutorLink account has been <strong style="color:${T.textPrimary};">successfully verified</strong>.
        You now have full access to all features.
      </p>
      <p style="margin:0;">
        Head to your dashboard to browse available tutors, book sessions, or manage your schedule.
      </p>
    `,
    cta: {
      label: "Go to Dashboard",
      href: process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
        : "https://tutorlink.example/dashboard",
    },
    footerNote: "Welcome to TutorLink — we're glad to have you on board.",
  });

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject,
    html,
  });
}

export async function sendRejectionEmail(email: string, reason?: string) {
  const subject = "TutorLink verification — action required";

  const reasonBlock = reason
    ? `
      <div style="margin:16px 0;background:${T.dangerBg};border:1px solid ${T.dangerBorder};border-radius:10px;padding:14px 16px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:${T.dangerText};">Reason</p>
        <p style="margin:0;font-size:14px;color:${T.textPrimary};">${esc(reason)}</p>
      </div>`
    : "";

  const html = brandEmailLayout({
    subject,
    preheader: "Your verification was not approved. You can re-upload and try again.",
    badgeLabel: "Verification Unsuccessful",
    badgeStyle: "danger",
    title: "Verification not approved",
    greetingName: null,
    bodyHtml: `
      <p style="margin:0 0 4px;">
        Unfortunately, your TutorLink verification could not be approved at this time.
      </p>
      ${reasonBlock}
      <p style="margin:0;">
        You may re-upload your matric card or reach out to our support team for help.
      </p>
    `,
    cta: {
      label: "Re-upload Verification",
      href: process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/verify`
        : "https://tutorlink.example/verify",
    },
    footerNote: "If you believe this is a mistake, simply reply to this email and we'll look into it.",
  });

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject,
    html,
  });
}

export function computeOneHourBeforeISO(sessionISO: string) {
  const start      = new Date(sessionISO).getTime();
  const oneHourBefore = new Date(start - 60 * 60 * 1000);
  const minFuture  = new Date(Date.now() + 60 * 1000);
  const finalTime  = oneHourBefore > minFuture ? oneHourBefore : minFuture;
  return finalTime.toISOString();
}

export async function scheduleSessionReminderEmail(opts: {
  sessionId: string;
  toEmail: string;
  toName?: string | null;
  subjectCode: string;
  subjectTitle: string;
  scheduledAtISO: string;
}) {
  const { sessionId, toEmail, toName, subjectCode, subjectTitle, scheduledAtISO } = opts;
  const subject = `Reminder: Your ${subjectCode} session starts in 1 hour`;

  const html = brandEmailLayout({
    subject,
    preheader: "Your tutoring session is coming up. Get ready!",
    badgeLabel: "Session Reminder",
    badgeStyle: "warning",
    title: "Your session is coming up",
    greetingName: toName,
    bodyHtml: `
      <p style="margin:0 0 4px;">
        Just a heads-up — your session starts in <strong style="color:${T.textPrimary};">1 hour</strong>.
        Make sure you're in a quiet spot and ready to go.
      </p>
      ${sessionCardHtml({ subjectCode, subjectTitle, startISO: scheduledAtISO, highlight: true })}
      <p style="margin:16px 0 0;font-size:13px;color:${T.textMuted};">
        We recommend joining a few minutes early to test your connection.
      </p>
    `,
    footerNote: "You're receiving this because you have a session booked on TutorLink.",
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
  const start  = new Date(opts.startISO);
  const end    = new Date(opts.endISO);
  const method = opts.mode === "CANCELLED" ? "CANCEL" : "REQUEST";

  const modeConfig = {
    ACCEPTED:    { badgeStyle: "success" as const, badgeLabel: "Session Confirmed",   title: "Session confirmed",  preheader: "Your session is confirmed. A calendar invite is attached." },
    RESCHEDULED: { badgeStyle: "warning" as const, badgeLabel: "Session Updated",     title: "Session rescheduled", preheader: "Your session time has changed. Please update your calendar." },
    CANCELLED:   { badgeStyle: "danger"  as const, badgeLabel: "Session Cancelled",   title: "Session cancelled",  preheader: "Your session has been cancelled." },
  }[opts.mode];

  const subject =
    opts.mode === "CANCELLED"   ? `Cancelled: ${opts.subjectCode} session` :
    opts.mode === "RESCHEDULED" ? `Updated: ${opts.subjectCode} session` :
                                   `Confirmed: ${opts.subjectCode} session`;

  const cancelReasonBlock = opts.mode === "CANCELLED" && opts.cancelReason
    ? `
      <div style="margin-top:16px;background:${T.dangerBg};border:1px solid ${T.dangerBorder};border-radius:10px;padding:14px 16px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:${T.dangerText};">Cancellation reason</p>
        <p style="margin:0;font-size:14px;color:${T.textPrimary};">${esc(opts.cancelReason)}</p>
      </div>`
    : "";

  const bodyIntro =
    opts.mode === "CANCELLED"
      ? `<p style="margin:0;">Your session has been <strong style="color:${T.textPrimary};">cancelled</strong>. We're sorry for any inconvenience.</p>`
      : opts.mode === "RESCHEDULED"
      ? `<p style="margin:0;">Your session has been <strong style="color:${T.textPrimary};">rescheduled</strong>. A calendar invite is attached — please update your calendar.</p>`
      : `<p style="margin:0;">Your session is <strong style="color:${T.textPrimary};">confirmed</strong>! A calendar invite is attached for easy scheduling.</p>`;

  const extra = opts.mode === "CANCELLED" && opts.cancelReason
    ? [`Reason: ${opts.cancelReason}`]
    : [];

  const html = brandEmailLayout({
    subject,
    preheader: modeConfig.preheader,
    badgeLabel: modeConfig.badgeLabel,
    badgeStyle: modeConfig.badgeStyle,
    title: modeConfig.title,
    greetingName: opts.toName,
    bodyHtml: `
      ${bodyIntro}
      ${sessionCardHtml({
        subjectCode: opts.subjectCode,
        subjectTitle: opts.subjectTitle,
        startISO: opts.startISO,
        endISO: opts.endISO,
        extraLines: extra,
        highlight: opts.mode !== "CANCELLED",
      })}
      ${cancelReasonBlock}
      ${opts.mode !== "CANCELLED"
        ? `<p style="margin:16px 0 0;font-size:13px;color:${T.textMuted};">If the session changes again, you'll receive an updated invite automatically.</p>`
        : ""}
    `,
    footerNote: "You're receiving this because you have a session booked on TutorLink.",
  });

  const descriptionLines = [
    `Course: ${opts.subjectCode} — ${opts.subjectTitle}`,
    `Start: ${start.toLocaleString()}`,
    `End: ${end.toLocaleString()}`,
    opts.mode === "CANCELLED" && opts.cancelReason ? `Reason: ${opts.cancelReason}` : null,
  ].filter(Boolean);

  const ics = buildIcs({
    method,
    uid: opts.uid,
    sequence: opts.sequence,
    start,
    end,
    title: `TutorLink Session: ${opts.subjectCode}`,
    description: descriptionLines.join("\n"),
    organizerName: opts.organizerName,
    organizerEmail: opts.organizerEmail,
    attendeeName: opts.toName ?? "User",
    attendeeEmail: opts.toEmail,
  });

  const base64Ics = Buffer.from(ics, "utf-8").toString("base64");

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
    preheader: "We received a password reset request for your account.",
    badgeLabel: "Password Reset",
    badgeStyle: "info",
    title: "Reset your password",
    greetingName: opts.toName,
    bodyHtml: `
      <p style="margin:0 0 12px;">
        We received a request to reset the password for your TutorLink account.
        Click the button below to choose a new password.
      </p>
      <p style="margin:0;font-size:13px;color:${T.textMuted};">
        This link expires in <strong style="color:${T.textSecondary};">24 hours</strong>.
      </p>
    `,
    cta: { label: "Reset Password", href: opts.resetLink },
    footerNote: "If you didn't request a password reset, you can safely ignore this email — your account is secure.",
  });

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: opts.toEmail,
    subject,
    html,
  });
}