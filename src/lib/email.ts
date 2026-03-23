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
   MALAYSIA TIMEZONE HELPERS
   Asia/Kuala_Lumpur = UTC+8, no DST
   ========================================================================== */

const MY_TZ = "Asia/Kuala_Lumpur";

/**
 * Format a date string/ISO into a human-readable date in Malaysia time.
 * e.g. "Monday, 21 July 2025"
 */
function formatMYTDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-MY", {
    timeZone: MY_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Format a date string/ISO into a time string in Malaysia time.
 * e.g. "10:30 AM"
 */
function formatMYTTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-MY", {
    timeZone: MY_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format a full date+time in Malaysia time.
 * e.g. "Mon, 21 Jul 2025, 10:30 AM MYT"
 */
function formatMYTFull(d: Date): string {
  return (
    d.toLocaleString("en-MY", {
      timeZone: MY_TZ,
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }) + " MYT"
  );
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

          <!-- Logo (base64 inline — no external request, always visible) -->
<tr>
  <td align="center" style="padding:0 0 24px;">
    <a href="${esc(appUrl)}" style="text-decoration:none;">
      <img
        src="data:image/png;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAACAKADAAQAAAABAAABAAAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgBAAIAAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMAAQEBAQEBAgEBAgMCAgIDBAMDAwMEBgQEBAQEBgcGBgYGBgYHBwcHBwcHBwgICAgICAkJCQkJCwsLCwsLCwsLC//bAEMBAgICAwMDBQMDBQsIBggLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLC//dAAQAIP/aAAwDAQACEQMRAD8A/wA/+iiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiirNnZXmo3KWVhE880h2pHGpZmJ7ADJJoArUVNcW89pM9tdI0ckZKsrDDKR1BB5BqGgAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//Q/wA/+iiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAoor6X+Bv7IP7Qn7Q90i/DTw5cT2ZOGvpx5FonuZXwD9FyfaujDYWtiKipYeDlJ9Em3+BrSo1KslClFt9lqfNFdz4A+GfxB+KmvR+GPhzo13rV/KQBDaRNI3PrgYUe5IFf0Ifs/f8EXfh9oPk63+0HrcmuXQwx0/TiYLUHrh5D+8f8A4DtFfs98Ofhn8M/hJoSeG/hnodlodkgx5dpEse7Hdm+8x92JNfpGTeF+Pr2qY+SpR7by/wAl97fkfYZbwXiazUsVLkj23l/kv60P56f2df8AgiV8TfFssOtftCazF4bssqxsbIi4vHXrgv8A6uM/99V+9P7PX7GH7Nf7NFvEfhh4at479B82pXQFxesfXzXGV+i4Fe+w3QBwCKvpdDua/T8q4Qy3LbOhSvP+aWsv+B8kj9DyvIcBgbOjTvL+Z6v/AIHySPmv9oP9hD9lf9piOS8+IvhiCHVZM/8AEz07Frd59WdBh/8AgYNfhB+0P/wQ7+Mng5bjX/2fdWh8W2KZcWNxi2v1X0XP7uQ/Qqfav6gY7z5eta1ldYPWss34Qy3MLyrUrT/mjo/n0fzTNMy4cy/HJurTtL+aOj/4PzR/nk+O/hz49+F+vyeF/iJo95ouoREhre8haF+O4DAZHuMiuLr/AEMvih8IfhL8btFbw58WfD9jr9oylQt5CHZM/wBx/vofQqRivxH/AGh/+CEvgvXmuPEH7NHiN9InbLLperZmt/8AdSdRvX23BvrX5bm/hvjaF54KSqx7bS/yfyfyPz/M+AsXRvPCS9pHttL/ACf9aH8wtFfUXx8/Yy/aT/Zpu3T4s+F7qys1bat/EPPs39xMmVGfRsH2r5dr89xGGq0JulXg4yXRqz/E+IrUKlGbp1YuMl0aswooorEyCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP//R/wA/+iiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKK6zwd4E8ZfEHVk0PwTplxql2/SO3QufxwMAe5wK/S74M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"
        alt="${esc(appName)}"
        width="160"
        style="display:block;height:auto;width:160px;max-width:160px;"
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
   Fixed: all date/time formatting now uses Asia/Kuala_Lumpur (MYT, UTC+8)
   Previously used toLocaleDateString()/toLocaleTimeString() without a timezone,
   which rendered in server UTC — showing times 8 hours behind MYT.
   ========================================================================== */

function sessionCardHtml(opts: {
  subjectCode: string;
  subjectTitle: string;
  startISO: string;
  endISO?: string;
  extraLines?: string[];
  highlight?: boolean;
}) {
  const { subjectCode, subjectTitle, startISO, endISO, extraLines = [], highlight } = opts;

  // Use MYT for all displayed date/time strings
  const dateStr   = formatMYTDate(startISO);
  const startTime = formatMYTTime(startISO);
  const endTime   = endISO ? formatMYTTime(endISO) : null;

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
              ${esc(startTime)}${endTime ? ` &ndash; ${esc(endTime)}` : ""} <span style="color:${T.textMuted};font-size:11px;">MYT</span>
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
  const start         = new Date(sessionISO).getTime();
  const oneHourBefore = new Date(start - 60 * 60 * 1000);
  const minFuture     = new Date(Date.now() + 60 * 1000);
  const finalTime     = oneHourBefore > minFuture ? oneHourBefore : minFuture;
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

  // Show MYT time in the reminder subject line preview
  const startTimeMYT = formatMYTTime(scheduledAtISO);

  const html = brandEmailLayout({
    subject,
    preheader: `Your ${subjectCode} session starts at ${startTimeMYT} MYT. Get ready!`,
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
    ACCEPTED:    { badgeStyle: "success" as const, badgeLabel: "Session Confirmed",  title: "Session confirmed",   preheader: "Your session is confirmed. A calendar invite is attached." },
    RESCHEDULED: { badgeStyle: "warning" as const, badgeLabel: "Session Updated",    title: "Session rescheduled", preheader: "Your session time has changed. Please update your calendar." },
    CANCELLED:   { badgeStyle: "danger"  as const, badgeLabel: "Session Cancelled",  title: "Session cancelled",   preheader: "Your session has been cancelled." },
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

  // Use MYT-formatted strings for ICS description (human-readable)
  const descriptionLines = [
    `Course: ${opts.subjectCode} — ${opts.subjectTitle}`,
    `Start: ${formatMYTFull(start)}`,
    `End:   ${formatMYTFull(end)}`,
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

export async function sendTutorApprovedEmail(email: string, name?: string | null) {
  const subject = "Your TutorLink tutor application has been approved!";

  const html = brandEmailLayout({
    subject,
    preheader: "Congratulations — you're now a verified tutor on TutorLink.",
    badgeLabel: "Tutor Approved",
    badgeStyle: "success",
    title: "You're now a TutorLink Tutor!",
    greetingName: name,
    bodyHtml: `
      <p style="margin:0 0 12px;">
        Congratulations! Your tutor application has been
        <strong style="color:${T.textPrimary};">approved</strong>.
        You can now access your Tutor Dashboard to set your availability and start accepting sessions.
      </p>
      <p style="margin:0;">
        Students can now find and book you based on the subjects you listed.
      </p>
    `,
    cta: {
      label: "Go to Tutor Dashboard",
      href: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tutor`,
    },
    footerNote: "Welcome to the TutorLink tutor team — thanks for contributing to the community.",
  });

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject,
    html,
  });
}

export async function sendTutorRejectedEmail(
  email: string,
  name?: string | null,
  reason?: string | null
) {
  const subject = "Update on your TutorLink tutor application";

  const reasonBlock = reason
    ? `
      <div style="margin:16px 0;background:${T.dangerBg};border:1px solid ${T.dangerBorder};border-radius:10px;padding:14px 16px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:${T.dangerText};">Reason</p>
        <p style="margin:0;font-size:14px;color:${T.textPrimary};">${esc(reason)}</p>
      </div>`
    : "";

  const html = brandEmailLayout({
    subject,
    preheader: "Your tutor application was not approved. You may reapply after making changes.",
    badgeLabel: "Application Unsuccessful",
    badgeStyle: "danger",
    title: "Tutor application not approved",
    greetingName: name,
    bodyHtml: `
      <p style="margin:0 0 4px;">
        Unfortunately, your tutor application could not be approved at this time.
      </p>
      ${reasonBlock}
      <p style="margin:0;">
        You're welcome to review the feedback above, update your details, and reapply.
        Your previous information has been pre-filled for you.
      </p>
    `,
    cta: {
      label: "Reapply Now",
      href: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/student/apply-tutor`,
    },
    footerNote: "If you believe this is a mistake, reply to this email and we'll look into it.",
  });

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject,
    html,
  });
}

export async function sendVerificationEmail(opts: {
  toEmail: string;
  toName?: string | null;
  verificationLink: string;
}) {
  const subject = "Verify your TutorLink email";

  const html = brandEmailLayout({
    subject,
    preheader: "Please verify your email address to activate your TutorLink account.",
    badgeLabel: "Email Verification",
    badgeStyle: "brand",
    title: "Verify your email",
    greetingName: opts.toName,
    bodyHtml: `
      <p style="margin:0 0 12px;">
        Thanks for registering on <strong style="color:${T.textPrimary};">TutorLink</strong>.
        Please verify your email address to activate your account.
      </p>
      <p style="margin:0;font-size:13px;color:${T.textMuted};">
        This link expires in <strong style="color:${T.textSecondary};">24 hours</strong>.
      </p>
    `,
    cta: { label: "Verify Email", href: opts.verificationLink },
    footerNote: "If you didn't create an account on TutorLink, you can safely ignore this email.",
  });

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: opts.toEmail,
    subject,
    html,
  });
}