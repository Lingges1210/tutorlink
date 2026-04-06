import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import fs from "fs";
import path from "path";

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  navyDeep: rgb(0.04, 0.07, 0.13),
  navyMid: rgb(0.07, 0.12, 0.22),
  navyLight: rgb(0.12, 0.20, 0.36),
  navyGlow: rgb(0.35, 0.42, 0.58),

  amber: rgb(0.96, 0.65, 0.14),
  amberDeep: rgb(0.77, 0.48, 0.17),
  amberPale: rgb(1.00, 0.92, 0.72),
  amberGlow: rgb(0.96, 0.75, 0.35),

  cream: rgb(0.98, 0.96, 0.93),
  creamWarm: rgb(0.96, 0.93, 0.88),
  creamDeep: rgb(0.86, 0.82, 0.75),

  inkDark: rgb(0.08, 0.07, 0.05),
  inkMid: rgb(0.28, 0.25, 0.20),
  inkLight: rgb(0.48, 0.44, 0.38),

  white: rgb(1, 1, 1),
  teal: rgb(0.18, 0.76, 0.72),
};

// ── Types ─────────────────────────────────────────────────────────────────────
type Page = ReturnType<PDFDocument["addPage"]>;
type Color = ReturnType<typeof rgb>;
type Font = Awaited<ReturnType<PDFDocument["embedFont"]>>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function hRule(page: Page, x: number, y: number, w: number, color: Color, thickness = 0.8, opacity = 1) {
  page.drawLine({ start: { x, y }, end: { x: x + w, y }, thickness, color, opacity });
}

function vRule(page: Page, x: number, y: number, h: number, color: Color, thickness = 0.8, opacity = 1) {
  page.drawLine({ start: { x, y }, end: { x, y: y + h }, thickness, color, opacity });
}

/** Art deco corner ornament using only lines and dots */
function artDecoCorner(
  page: Page, cx: number, cy: number, sx: number, sy: number,
  color: Color, opacity = 1
) {
  const L = 30, l = 18, gap = 5;
  page.drawLine({ start: { x: cx, y: cy }, end: { x: cx + sx * L, y: cy }, thickness: 1.5, color, opacity });
  page.drawLine({ start: { x: cx, y: cy }, end: { x: cx, y: cy + sy * L }, thickness: 1.5, color, opacity });
  page.drawLine({ start: { x: cx + sx * gap, y: cy + sy * gap }, end: { x: cx + sx * l, y: cy + sy * gap }, thickness: 0.7, color, opacity: opacity * 0.65 });
  page.drawLine({ start: { x: cx + sx * gap, y: cy + sy * gap }, end: { x: cx + sx * gap, y: cy + sy * l }, thickness: 0.7, color, opacity: opacity * 0.65 });
  page.drawEllipse({ x: cx, y: cy, xScale: 3, yScale: 3, color, opacity });
  page.drawEllipse({ x: cx + sx * (L / 2), y: cy, xScale: 1.5, yScale: 1.5, color, opacity: opacity * 0.7 });
  page.drawEllipse({ x: cx, y: cy + sy * (L / 2), xScale: 1.5, yScale: 1.5, color, opacity: opacity * 0.7 });
}

/** Line - dot - line divider */
function dotDivider(page: Page, x: number, y: number, w: number, color: Color, opacity = 1) {
  const half = w / 2 - 8;
  hRule(page, x, y, half, color, 0.8, opacity);
  page.drawEllipse({ x: x + w / 2, y, xScale: 4, yScale: 4, color, opacity });
  page.drawEllipse({ x: x + w / 2, y, xScale: 2, yScale: 2, color: C.navyDeep, opacity });
  hRule(page, x + w / 2 + 8, y, half, color, 0.8, opacity);
}

/** Shimmer rect — fills with color, adds white sheen on top edge */
function shimmerRect(page: Page, x: number, y: number, w: number, h: number, color: Color, shimmerOp = 0.12) {
  page.drawRectangle({ x, y, width: w, height: h, color });
  page.drawRectangle({ x, y: y + h - 4, width: w, height: 4, color: C.white, opacity: shimmerOp });
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function generateCertificatePdf(data: {
  tutorName: string;
  sessionsCompleted: number;
  hoursCompleted: number;
  rating: number;
  ratingCount: number;
  date: string;
  certId: string;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const W = 842, H = 595;
  const page = doc.addPage([W, H]);

  const bold: Font = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular: Font = await doc.embedFont(StandardFonts.Helvetica);
  const oblique: Font = await doc.embedFont(StandardFonts.HelveticaOblique);

  // ══════════════════════════════════════════════════════════════════════════
  // 1. FULL BACKGROUND — deep navy
  // ══════════════════════════════════════════════════════════════════════════
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.navyDeep });

  // Atmospheric glows
  page.drawEllipse({ x: 0, y: H, xScale: 320, yScale: 280, color: C.navyLight, opacity: 0.35 });
  page.drawEllipse({ x: 0, y: H, xScale: 180, yScale: 160, color: C.navyGlow, opacity: 0.15 });
  page.drawEllipse({ x: W, y: 0, xScale: 260, yScale: 220, color: C.navyLight, opacity: 0.18 });

  // ══════════════════════════════════════════════════════════════════════════
  // 2. DIAGONAL SLASH — dark left / cream right
  // ══════════════════════════════════════════════════════════════════════════
  const slashXBot = 295;   // x of diagonal at y=0
  const slashXTop = 348;   // x of diagonal at y=H (slant over full height)

  // Cream right panel
  page.drawRectangle({ x: slashXBot, y: 0, width: W - slashXBot, height: H, color: C.cream });

  // Dark triangle overlay on left portion of cream panel to cut the diagonal
  const steps = slashXTop - slashXBot;
  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    const stripH = H * (1 - progress);
    page.drawRectangle({ x: slashXBot + i, y: H - stripH, width: 1, height: stripH, color: C.navyDeep });
  }

  // Amber slash line + thin echo
  page.drawLine({ start: { x: slashXBot, y: 0 }, end: { x: slashXTop, y: H }, thickness: 3, color: C.amber });
  page.drawLine({ start: { x: slashXBot + 6, y: 0 }, end: { x: slashXTop + 6, y: H }, thickness: 0.8, color: C.amberGlow, opacity: 0.45 });

  // ══════════════════════════════════════════════════════════════════════════
  // 3. OUTER BORDER — art deco double border + corner ornaments
  // ══════════════════════════════════════════════════════════════════════════
  const bm = 18;
  page.drawRectangle({ x: bm, y: bm, width: W - bm * 2, height: H - bm * 2, borderColor: C.amber, borderWidth: 1.2 });
  page.drawRectangle({ x: bm + 5, y: bm + 5, width: W - (bm + 5) * 2, height: H - (bm + 5) * 2, borderColor: C.amberGlow, borderWidth: 0.5, opacity: 0.5 });

  // Corners
  artDecoCorner(page, bm + 4, bm + 4, 1, 1, C.amber, 0.9);
  artDecoCorner(page, W - bm - 4, bm + 4, -1, 1, C.amber, 0.9);
  artDecoCorner(page, bm + 4, H - bm - 4, 1, -1, C.amber, 0.9);
  artDecoCorner(page, W - bm - 4, H - bm - 4, -1, -1, C.amberDeep, 0.75);

  // ══════════════════════════════════════════════════════════════════════════
  // 4. LEFT DARK PANEL CONTENT
  // ══════════════════════════════════════════════════════════════════════════
  const lx = bm + 14;
  const lw = slashXBot - lx - 18;

  // ── Logo ──────────────────────────────────────────────────────────────────
  // Logo anchored from the top: starts at H - bm - 28 (just inside border)
  const logoTopY = H - bm - 28;    // top edge of logo
  const logoRuleY = logoTopY - 68; // rule drawn below logo block

  try {
    const logoBytes = fs.readFileSync(path.join(process.cwd(), "public", "logo.png"));
    const logo = await doc.embedPng(logoBytes);
    // Scale logo to fit width but cap height at 42px so it stays compact
    const lW = Math.min(116, lw);
    const lH = Math.min(42, Math.round((lW / 512) * 256));
    const lWfinal = Math.round(lH * (512 / 256));
    // Draw logo: top-left aligned, top edge at logoTopY
    page.drawImage(logo, { x: lx, y: logoTopY - lH, width: lWfinal, height: lH });
    // Tagline directly below logo with 6px gap
    page.drawText("Peer Tutoring Platform", {
      x: lx, y: logoTopY - lH - 14, size: 7, font: oblique, color: C.navyGlow,
    });
    // Rule 8px below tagline
    const ruleY = logoTopY - lH - 24;
    hRule(page, lx, ruleY, lw, C.amber, 1.2);
    hRule(page, lx, ruleY - 4, lw, C.amberGlow, 0.4, 0.45);
  } catch {
    // Fallback text wordmark
    page.drawText("TutorLink", { x: lx, y: logoTopY - 20, size: 18, font: bold, color: C.amber });
    page.drawText("Peer Tutoring Platform", { x: lx, y: logoTopY - 36, size: 7, font: oblique, color: C.navyGlow });
    hRule(page, lx, logoTopY - 46, lw, C.amber, 1.2);
    hRule(page, lx, logoTopY - 50, lw, C.amberGlow, 0.4, 0.45);
  }

  // ── Certificate heading ────────────────────────────────────────────────────
  const midY = H / 2 + 38;

  page.drawText("CERTIFICATE", { x: lx, y: midY + 10, size: 22, font: bold, color: C.white });
  const certW = bold.widthOfTextAtSize("CERTIFICATE", 22);
  page.drawRectangle({ x: lx, y: midY + 6, width: certW, height: 2.5, color: C.amber });

  page.drawText("OF ACHIEVEMENT", { x: lx, y: midY - 10, size: 11, font: bold, color: C.amberGlow });
  page.drawText("in Peer Tutoring Excellence", { x: lx, y: midY - 26, size: 8, font: oblique, color: C.navyGlow });

  dotDivider(page, lx, midY - 42, lw, C.amber, 0.55);

  page.drawText("This certifies that", { x: lx, y: midY - 60, size: 8, font: oblique, color: C.navyGlow });

  // ── Tutor name ─────────────────────────────────────────────────────────────
  const nameY = midY - 94;
  const nameSz = data.tutorName.length > 20 ? 20 : data.tutorName.length > 14 ? 24 : 28;
  const words = data.tutorName.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (bold.widthOfTextAtSize(test, nameSz) > lw) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);

  lines.forEach((nl, i) => {
    page.drawText(nl, { x: lx, y: nameY - i * (nameSz + 4), size: nameSz, font: bold, color: C.cream });
  });

  const nameBottom = nameY - (lines.length - 1) * (nameSz + 4) - 6;
  page.drawRectangle({ x: lx, y: nameBottom, width: lw * 0.80, height: 2, color: C.amber });

  // ── USM Institution badge ──────────────────────────────────────────────────
  const detailY = bm + 82;
  page.drawRectangle({ x: lx, y: detailY + 4, width: lw, height: 50, color: C.navyMid });
  page.drawRectangle({ x: lx, y: detailY + 50, width: lw, height: 3, color: C.amber });
  page.drawText("UNIVERSITI SAINS MALAYSIA", { x: lx + 8, y: detailY + 36, size: 7, font: bold, color: C.amberGlow });
  page.drawText("Peer Tutoring Initiative", { x: lx + 8, y: detailY + 22, size: 7.5, font: oblique, color: C.navyGlow });
  page.drawText("School of Computer Sciences", { x: lx + 8, y: detailY + 9, size: 6.5, font: regular, color: C.navyGlow, opacity: 0.75 });

  // Date + Cert ID row
  page.drawText("DATE OF ISSUE", { x: lx, y: detailY - 14, size: 6, font: bold, color: C.amber, opacity: 0.85 });
  page.drawText(data.date, { x: lx, y: detailY - 28, size: 9.5, font: bold, color: C.cream });
  page.drawText("CERT ID", { x: lx + lw / 2, y: detailY - 14, size: 6, font: bold, color: C.amber, opacity: 0.85 });
  page.drawText(data.certId, { x: lx + lw / 2, y: detailY - 28, size: 8, font: bold, color: C.cream });

  // Bottom site label
  hRule(page, lx, bm + 40, lw, C.amber, 0.8, 0.45);
  page.drawText("tutorlink.app", { x: lx, y: bm + 24, size: 8.5, font: bold, color: C.amberGlow });

  // ── Decorative concentric ring ornament ────────────────────────────────────
  const ornY = (nameBottom + detailY + 56) / 2;
  const ornX = lx + lw / 2;
  for (let i = 3; i >= 0; i--) {
    const sc = 8 + i * 7;
    page.drawEllipse({ x: ornX, y: ornY, xScale: sc, yScale: sc, borderColor: C.amber, borderWidth: i === 0 ? 1.2 : 0.5, opacity: 0.10 + i * 0.06 });
  }
  page.drawEllipse({ x: ornX, y: ornY, xScale: 5.5, yScale: 5.5, color: C.amber, opacity: 0.28 });
  page.drawEllipse({ x: ornX, y: ornY, xScale: 2.5, yScale: 2.5, color: C.amberGlow, opacity: 0.55 });
  hRule(page, ornX - 38, ornY, 76, C.amber, 0.5, 0.12);
  vRule(page, ornX, ornY - 38, 76, C.amber, 0.5, 0.12);

  // ══════════════════════════════════════════════════════════════════════════
  // 5. RIGHT CREAM PANEL CONTENT
  // ══════════════════════════════════════════════════════════════════════════
  const rx = slashXTop + 22;
  const rw = W - bm - 14 - rx;
  const rTop = H - bm - 22;

  // ── VERIFIED TUTOR badge ───────────────────────────────────────────────────
  const badgeW = 148, badgeH = 26;
  const badgeX = W - bm - 14 - badgeW;
  const badgeTopY = rTop - badgeH;
  shimmerRect(page, badgeX, badgeTopY, badgeW, badgeH, C.amber, 0.15);
  page.drawRectangle({ x: badgeX + 2, y: badgeTopY + 2, width: badgeW - 4, height: badgeH - 4, borderColor: C.amberDeep, borderWidth: 0.6 });
  page.drawEllipse({ x: badgeX + 14, y: badgeTopY + badgeH / 2, xScale: 5, yScale: 5, color: C.navyDeep });
  page.drawEllipse({ x: badgeX + 14, y: badgeTopY + badgeH / 2, xScale: 2.5, yScale: 2.5, color: C.amber });
  page.drawText("VERIFIED TUTOR", { x: badgeX + 26, y: badgeTopY + 9, size: 9, font: bold, color: C.navyDeep });

  // ── Section heading ────────────────────────────────────────────────────────
  const headY = rTop - 62;
  page.drawText("TUTORING", { x: rx, y: headY + 16, size: 11, font: bold, color: C.amberDeep });
  page.drawText("ACHIEVEMENT RECORD", { x: rx, y: headY, size: 15, font: bold, color: C.inkDark });
  hRule(page, rx, headY - 8, rw, C.creamDeep, 1);
  hRule(page, rx, headY - 12, rw * 0.28, C.amber, 2.5);

  // ── Description ────────────────────────────────────────────────────────────
  page.drawText("Has consistently demonstrated outstanding commitment,", { x: rx, y: headY - 30, size: 8.5, font: regular, color: C.inkMid });
  page.drawText("quality teaching, and positive peer impact on the platform.", { x: rx, y: headY - 43, size: 8.5, font: regular, color: C.inkMid });

  // ── Stats grid (3 cards) ───────────────────────────────────────────────────
  const statsY = headY - 145;
  const statsW = Math.floor(rw / 3) - 8;

  const statsData = [
    { label: "SESSIONS", value: String(data.sessionsCompleted), sub: "completed", dark: true },
    { label: "HOURS", value: String(data.hoursCompleted), sub: "tutoring hours", dark: false },
    {
      label: "RATING",
      value: data.ratingCount > 0 ? `${data.rating.toFixed(1)}` : "N/A",
      sub: data.ratingCount > 0 ? "out of 5.0" : "no reviews yet",
      dark: true,
    },
  ];

  statsData.forEach((s, i) => {
    const sx = rx + i * (statsW + 12);
    const boxH = 86;

    if (s.dark) {
      page.drawRectangle({ x: sx, y: statsY, width: statsW, height: boxH, color: C.navyDeep });
      page.drawRectangle({ x: sx, y: statsY + boxH - 4, width: statsW, height: 4, color: C.amber });
      page.drawText(s.label, { x: sx + 10, y: statsY + boxH - 18, size: 6.5, font: bold, color: C.amberGlow });
      page.drawText(s.value, { x: sx + 10, y: statsY + boxH - 50, size: 27, font: bold, color: C.cream });
      page.drawText(s.sub, { x: sx + 10, y: statsY + 10, size: 7, font: regular, color: C.navyGlow });
    } else {
      page.drawRectangle({ x: sx, y: statsY, width: statsW, height: boxH, color: C.creamWarm, borderColor: C.creamDeep, borderWidth: 0.8 });
      page.drawRectangle({ x: sx, y: statsY, width: 3, height: boxH, color: C.amber });
      page.drawText(s.label, { x: sx + 12, y: statsY + boxH - 18, size: 6.5, font: bold, color: C.amberDeep });
      page.drawText(s.value, { x: sx + 12, y: statsY + boxH - 50, size: 27, font: bold, color: C.inkDark });
      page.drawText(s.sub, { x: sx + 12, y: statsY + 10, size: 7, font: regular, color: C.inkLight });
    }
  });

  // Star dots below rating card
  if (data.ratingCount > 0) {
    const ratingX = rx + 2 * (statsW + 12);
    const filled = Math.round(data.rating);
    for (let k = 0; k < 5; k++) {
      const dotX = ratingX + 10 + k * 14;
      const dotY = statsY - 13;
      if (k < filled) {
        page.drawEllipse({ x: dotX, y: dotY, xScale: 5.5, yScale: 5.5, color: C.amber, opacity: 0.9 });
        page.drawEllipse({ x: dotX, y: dotY, xScale: 2.5, yScale: 2.5, color: C.amberDeep, opacity: 0.9 });
      } else {
        page.drawEllipse({ x: dotX, y: dotY, xScale: 5.5, yScale: 5.5, color: C.creamDeep, opacity: 0.8 });
      }
    }
    const revText = `${data.ratingCount} review${data.ratingCount === 1 ? "" : "s"}`;
    page.drawText(revText, { x: ratingX + 82, y: statsY - 18, size: 7, font: regular, color: C.inkLight });
  }

  // ── Tier banner (striped navy + amber borders) ─────────────────────────────
  const tierY = statsY - 50;
  const tierH = 38;

  // Stripe pattern
  const stripeCount = Math.ceil(rw / 8);
  for (let s = 0; s < stripeCount; s++) {
    page.drawRectangle({
      x: rx + s * 8, y: tierY, width: 8, height: tierH,
      color: s % 2 === 0 ? C.navyDeep : C.navyMid,
    });
  }
  hRule(page, rx, tierY + tierH, rw, C.amber, 1.5);
  hRule(page, rx, tierY, rw, C.amber, 1.5);

  const tier =
    data.sessionsCompleted >= 50 ? "PLATINUM TUTOR" :
      data.sessionsCompleted >= 25 ? "GOLD TUTOR" :
        data.sessionsCompleted >= 10 ? "SILVER TUTOR" :
          "BRONZE TUTOR";
  const tierColor =
    tier === "PLATINUM TUTOR" ? C.teal :
      tier === "GOLD TUTOR" ? C.amber :
        tier === "SILVER TUTOR" ? C.amberGlow :
          C.amberDeep;

  const tierTextW = bold.widthOfTextAtSize(tier, 15);
  const tierTextX = rx + (rw - tierTextW) / 2;
  page.drawRectangle({ x: tierTextX - 12, y: tierY + 7, width: tierTextW + 24, height: 22, color: C.navyDeep });
  page.drawText(tier, { x: tierTextX, y: tierY + 13, size: 15, font: bold, color: tierColor });

  // ── Achievement pillars (3 cards) ─────────────────────────────────────────
  const pillarY = tierY - 74;
  const pillars = [
    { num: "01", title: "Commitment", desc: "Reliable and present" },
    { num: "02", title: "Excellence", desc: "High teaching quality" },
    { num: "03", title: "Impact", desc: "Students positively rated" },
  ];
  const pillarW = Math.floor(rw / 3) - 6;

  pillars.forEach((p, i) => {
    const px = rx + i * (pillarW + 9);
    const pH = 54;
    page.drawRectangle({ x: px, y: pillarY, width: pillarW, height: pH, color: C.creamWarm, borderColor: C.creamDeep, borderWidth: 0.7 });
    page.drawRectangle({ x: px, y: pillarY + pH - 5, width: pillarW, height: 5, color: C.navyDeep });

    // Number in top stripe
    page.drawText(p.num, { x: px + pillarW - 22, y: pillarY + pH - 17, size: 9, font: bold, color: C.white, opacity: 0.55 });

    // Title
    page.drawText(p.title, { x: px + 10, y: pillarY + 34, size: 9, font: bold, color: C.inkDark });
    const tw = bold.widthOfTextAtSize(p.title, 9);
    page.drawRectangle({ x: px + 10, y: pillarY + 30, width: tw, height: 1.5, color: C.amber });
    page.drawText(p.desc, { x: px + 10, y: pillarY + 16, size: 7.5, font: regular, color: C.inkLight });
  });

  // ── Bottom info bar (replaces signatures) ────────────────────────────────
  const infoBarY = bm + 8;
  const infoBarH = 30;
  // Dark navy bar full width of right panel
  page.drawRectangle({ x: rx - 6, y: infoBarY, width: rw + 6, height: infoBarH, color: C.navyDeep });
  page.drawRectangle({ x: rx - 6, y: infoBarY + infoBarH - 3, width: rw + 6, height: 3, color: C.amber });

  // Left: platform name
  page.drawText("TutorLink Peer Tutoring Platform", { x: rx + 4, y: infoBarY + 11, size: 8, font: bold, color: C.amberGlow });

  // Center dot separator
  page.drawEllipse({ x: rx + rw / 2, y: infoBarY + infoBarH / 2, xScale: 2, yScale: 2, color: C.amber, opacity: 0.6 });

  // Right: USM
  const usmText = "Universiti Sains Malaysia";
  const usmW = regular.widthOfTextAtSize(usmText, 8);
  page.drawText(usmText, { x: rx + rw - usmW, y: infoBarY + 11, size: 8, font: regular, color: C.navyGlow });

  // ══════════════════════════════════════════════════════════════════════════
  // 6. FINISHING TOUCHES
  // ══════════════════════════════════════════════════════════════════════════

  // Faint "TL" monogram watermark on cream panel
  page.drawText("TL", {
    x: rx + rw / 2 - 34, y: H / 2 - 42,
    size: 140, font: bold, color: C.creamDeep, opacity: 0.16,
  });

  // Sparkle dots on dark panel
  const sparks: [number, number, number, number][] = [
    [lx + lw - 10, H - bm - 28, 3, 0.38],
    [lx + lw - 26, H - bm - 16, 2, 0.28],
    [lx + lw - 6, H - bm - 50, 1.5, 0.22],
    [lx + 4, bm + 58, 2.5, 0.28],
    [lx + 16, bm + 46, 1.5, 0.20],
  ];
  for (const [sx, sy, sr, sop] of sparks) {
    page.drawEllipse({ x: sx, y: sy, xScale: sr + 2.5, yScale: sr + 2.5, color: C.amber, opacity: sop * 0.28 });
    page.drawEllipse({ x: sx, y: sy, xScale: sr, yScale: sr, color: C.amber, opacity: sop });
  }

  return doc.save();
}