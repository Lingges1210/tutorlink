import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const runtime = "nodejs";

const TZ = "Asia/Kuala_Lumpur";

// ---------- formatting ----------
function fmtDate(d?: Date | null) {
  if (!d) return "—";
  return d.toLocaleString("en-MY", { timeZone: TZ });
}

function clampText(s: string, max = 280) {
  const t = (s ?? "").trim();
  if (!t) return "";
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

function asciiSafe(s: string) {
  return (s ?? "")
    .replace(/→/g, "->")
    .replace(/—/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x00-\x7F]/g, ""); // strip any other unicode
}

// ---------- text wrapping (pdf-lib has no auto wrap helper) ----------
function wrapText(
  text: string,
  font: any,
  fontSize: number,
  maxWidth: number
): string[] {
  const words = (text ?? "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";

  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    const width = font.widthOfTextAtSize(next, fontSize);
    if (width <= maxWidth) {
      cur = next;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

// ---------- chart ----------
function drawTrendChart(opts: {
  page: any;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  points: Array<{ label: string; value: number }>;
  font: any;
  fontBold: any;
}) {
  const { page, x, y, w, h, title, points, font, fontBold } = opts;

  // card bg
  page.drawRectangle({
    x,
    y: y - h,
    width: w,
    height: h,
    borderColor: rgb(0.82, 0.84, 0.87),
    borderWidth: 1,
    color: rgb(0.98, 0.98, 0.99),
  });

  page.drawText(title, {
    x: x + 12,
    y: y - 20,
    size: 11,
    font: fontBold,
    color: rgb(0.06, 0.09, 0.16),
  });

  if (!points.length) {
    page.drawText("No trend data yet.", {
      x: x + 12,
      y: y - 40,
      size: 10,
      font,
      color: rgb(0.28, 0.32, 0.40),
    });
    return;
  }

  const padL = 36;
  const padR = 14;
  const padT = 34;
  const padB = 22;

  const cx = x + padL;
  const cyTop = y - padT;
  const cw = w - padL - padR;
  const ch = h - padT - padB;

  // values range
  const vals = points.map((p) => p.value);
  const minV = Math.min(...vals, -1);
  const maxV = Math.max(...vals, 1);

  const range = maxV - minV || 1;

  const toX = (i: number) => cx + (cw * i) / Math.max(1, points.length - 1);
  const toY = (v: number) => (y - padT) - (ch * (v - minV)) / range;

  // axes
  page.drawLine({
    start: { x: cx, y: y - padT - ch },
    end: { x: cx + cw, y: y - padT - ch },
    thickness: 1,
    color: rgb(0.85, 0.87, 0.90),
  });
  page.drawLine({
    start: { x: cx, y: y - padT - ch },
    end: { x: cx, y: y - padT },
    thickness: 1,
    color: rgb(0.85, 0.87, 0.90),
  });

  // y labels (min / mid / max)
  const yMarks = [
    { v: minV, label: `${minV}` },
    { v: Math.round(((minV + maxV) / 2) * 10) / 10, label: `${Math.round(((minV + maxV) / 2) * 10) / 10}` },
    { v: maxV, label: `${maxV}` },
  ];

  for (const m of yMarks) {
    const yy = toY(m.v);
    page.drawLine({
      start: { x: cx, y: yy },
      end: { x: cx + cw, y: yy },
      thickness: 0.5,
      color: rgb(0.90, 0.92, 0.94),
    });
    page.drawText(m.label, {
      x: x + 8,
      y: yy - 4,
      size: 8,
      font,
      color: rgb(0.40, 0.45, 0.55),
    });
  }

  // line
  for (let i = 0; i < points.length - 1; i++) {
    page.drawLine({
      start: { x: toX(i), y: toY(points[i].value) },
      end: { x: toX(i + 1), y: toY(points[i + 1].value) },
      thickness: 2,
      color: rgb(0.12, 0.39, 0.93),
    });
  }

  // dots
  for (let i = 0; i < points.length; i++) {
    page.drawCircle({
      x: toX(i),
      y: toY(points[i].value),
      size: 3,
      color: rgb(0.12, 0.39, 0.93),
    });
  }
}

// ---------- PDF builder ----------
async function buildPdf(opts: {
  studentName: string;
  studentEmail: string;
  generatedAt: Date;
  subjectFilterLabel: string;
  subjectProgress: Array<{
    code: string;
    title: string;
    totalSessions: number;
    totalMinutes: number;
    avgConfGain: number;
    lastSessionAt: Date | null;
  }>;
  history: Array<{
    scheduledAt: Date;
    durationMin: number;
    subjectCode: string;
    completion: null | {
      summary: string;
      confidenceBefore: number;
      confidenceAfter: number;
      nextSteps: string | null;
      topics: string[];
    };
  }>;
  trend: Array<{ label: string; value: number }>;
}) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 595.28; // A4
  const PAGE_H = 841.89;
  const M = 50;

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - M;

  const newPage = () => {
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - M;
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < M) newPage();
  };

  const drawHRule = () => {
    ensureSpace(16);
    page.drawLine({
      start: { x: M, y },
      end: { x: PAGE_W - M, y },
      thickness: 1,
      color: rgb(0.85, 0.87, 0.90),
    });
    y -= 14;
  };

  const drawText = (txt: string, size = 10, bold = false, color = rgb(0.06, 0.09, 0.16)) => {
    ensureSpace(size + 10);
    page.drawText(txt, {
      x: M,
      y: y - size,
      size,
      font: bold ? fontBold : font,
      color,
    });
    y -= size + 8;
  };

  const drawWrapped = (label: string, value: string, maxWidth: number) => {
    const size = 10;
    ensureSpace(40);

    page.drawText(label, {
      x: M,
      y: y - size,
      size,
      font: fontBold,
      color: rgb(0.20, 0.25, 0.33),
    });

    const lines = wrapText(value, font, size, maxWidth);
    let yy = y - size - 2;

    for (const ln of lines) {
      ensureSpace(size + 8);
      page.drawText(ln, {
        x: M + 70,
        y: yy,
        size,
        font,
        color: rgb(0.28, 0.32, 0.40),
      });
      yy -= size + 4;
      y -= size + 4;
    }

    y -= 6;
  };

  // ---------- Header ----------
  drawText("TutorLink Progress Report", 20, true, rgb(0.06, 0.09, 0.16));
  drawText(`Generated: ${fmtDate(opts.generatedAt)}`, 10, false, rgb(0.28, 0.32, 0.40));
  drawHRule();

  // ---------- Meta ----------
  drawWrapped("Student:", `${opts.studentName} (${opts.studentEmail})`, PAGE_W - 2 * M - 70);
  drawWrapped("Filter:", opts.subjectFilterLabel, PAGE_W - 2 * M - 70);
  drawHRule();

  // ---------- Trend chart ----------
  ensureSpace(220);
  drawTrendChart({
    page,
    x: M,
    y: y,
    w: PAGE_W - 2 * M,
    h: 180,
    title: "Confidence Gain Trend (recent)",
    points: opts.trend,
    font,
    fontBold,
  });
  y -= 200;
  drawHRule();

  // ---------- Progress by Subject ----------
  drawText("Progress by Subject", 13, true, rgb(0.06, 0.09, 0.16));

  if (!opts.subjectProgress.length) {
    drawText("No progress data yet.", 11, false, rgb(0.28, 0.32, 0.40));
  } else {
    // simple table
    const colX = [M, M + 240, M + 320, M + 400, M + 470];
    const headerY = y;

    ensureSpace(26);
    page.drawRectangle({
      x: M,
      y: headerY - 18,
      width: PAGE_W - 2 * M,
      height: 20,
      color: rgb(0.95, 0.96, 0.97),
      borderColor: rgb(0.85, 0.87, 0.90),
      borderWidth: 1,
    });

    page.drawText("Subject", { x: colX[0] + 8, y: headerY - 14, size: 10, font: fontBold, color: rgb(0.20, 0.25, 0.33) });
    page.drawText("Sess", { x: colX[1] + 8, y: headerY - 14, size: 10, font: fontBold, color: rgb(0.20, 0.25, 0.33) });
    page.drawText("Min", { x: colX[2] + 8, y: headerY - 14, size: 10, font: fontBold, color: rgb(0.20, 0.25, 0.33) });
    page.drawText("Avg", { x: colX[3] + 8, y: headerY - 14, size: 10, font: fontBold, color: rgb(0.20, 0.25, 0.33) });
    page.drawText("Last", { x: colX[4] + 8, y: headerY - 14, size: 10, font: fontBold, color: rgb(0.20, 0.25, 0.33) });

    y -= 28;

    for (let i = 0; i < opts.subjectProgress.length; i++) {
      const s = opts.subjectProgress[i];
      ensureSpace(22);

      if (i % 2 === 0) {
        page.drawRectangle({
          x: M,
          y: y - 16,
          width: PAGE_W - 2 * M,
          height: 18,
          color: rgb(0.99, 0.99, 1),
        });
      }

      const subjectText = clampText(`${s.code} — ${s.title}`, 60);
      page.drawText(subjectText, { x: colX[0] + 8, y: y - 12, size: 10, font, color: rgb(0.06, 0.09, 0.16) });
      page.drawText(String(s.totalSessions), { x: colX[1] + 8, y: y - 12, size: 10, font, color: rgb(0.06, 0.09, 0.16) });
      page.drawText(String(s.totalMinutes), { x: colX[2] + 8, y: y - 12, size: 10, font, color: rgb(0.06, 0.09, 0.16) });
      page.drawText(s.avgConfGain.toFixed(2), { x: colX[3] + 8, y: y - 12, size: 10, font, color: rgb(0.06, 0.09, 0.16) });
      page.drawText(clampText(fmtDate(s.lastSessionAt), 22), { x: colX[4] + 8, y: y - 12, size: 10, font, color: rgb(0.06, 0.09, 0.16) });

      y -= 20;
    }
  }

  y -= 10;
  drawHRule();

  // ---------- History ----------
  drawText("Session History (Latest 20)", 13, true, rgb(0.06, 0.09, 0.16));

  if (!opts.history.length) {
    drawText("No completed sessions yet.", 11, false, rgb(0.28, 0.32, 0.40));
  } else {
    const maxWidth = PAGE_W - 2 * M;

    for (const h of opts.history) {
      ensureSpace(120);

      const gain =
        h.completion
          ? (h.completion.confidenceAfter ?? 0) - (h.completion.confidenceBefore ?? 0)
          : 0;

      page.drawText(`${h.subjectCode} · ${fmtDate(h.scheduledAt)} · ${h.durationMin} min`, {
        x: M,
        y: y - 12,
        size: 11,
        font: fontBold,
        color: rgb(0.06, 0.09, 0.16),
      });
      y -= 18;

      page.drawText(
  `Confidence: ${h.completion?.confidenceBefore ?? "-"} -> ${h.completion?.confidenceAfter ?? "-"} (gain ${gain})`,
  {
    x: M,
    y: y - 10,
    size: 10,
    font,
    color: rgb(0.28, 0.32, 0.40),
  }
);
      y -= 16;

      const topics = h.completion?.topics?.join(", ") ?? "";
      if (topics) {
        const lines = wrapText(`Topics: ${clampText(topics, 240)}`, font, 10, maxWidth);
        for (const ln of lines) {
          ensureSpace(16);
          page.drawText(ln, { x: M, y: y - 10, size: 10, font, color: rgb(0.28, 0.32, 0.40) });
          y -= 14;
        }
      }

      const summary = clampText(h.completion?.summary ?? "", 520);
      const summaryLines = wrapText(`Summary: ${summary || "—"}`, font, 10, maxWidth);
      for (const ln of summaryLines) {
        ensureSpace(16);
        page.drawText(ln, { x: M, y: y - 10, size: 10, font, color: rgb(0.06, 0.09, 0.16) });
        y -= 14;
      }

      const ns = clampText(h.completion?.nextSteps ?? "", 360);
      if (ns) {
        const nsLines = wrapText(`Next steps: ${ns}`, font, 10, maxWidth);
        for (const ln of nsLines) {
          ensureSpace(16);
          page.drawText(ln, { x: M, y: y - 10, size: 10, font, color: rgb(0.28, 0.32, 0.40) });
          y -= 14;
        }
      }

      y -= 6;
      drawHRule();
    }
  }

  // ---------- Page numbers ----------
  const pages = pdfDoc.getPages();
  const total = pages.length;

  for (let i = 0; i < total; i++) {
    const p = pages[i];
    const label = `Page ${i + 1} of ${total}`;
    p.drawText(label, {
      x: PAGE_W - M - font.widthOfTextAtSize(label, 9),
      y: M - 18,
      size: 9,
      font,
      color: rgb(0.55, 0.60, 0.67),
    });

    p.drawText("Generated by TutorLink", {
      x: M,
      y: M - 18,
      size: 9,
      font,
      color: rgb(0.55, 0.60, 0.67),
    });
  }

  return pdfDoc.save(); // Uint8Array
}

export async function GET(req: Request) {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true, isDeactivated: true, verificationStatus: true, name: true, email: true },
  });

  if (!me || me.isDeactivated) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  if (me.verificationStatus !== "AUTO_VERIFIED") {
    return NextResponse.json({ ok: false, message: "Locked until verification." }, { status: 403 });
  }

  const url = new URL(req.url);
  const subjectId = url.searchParams.get("subjectId")?.trim() || null;

  const subjectProgressRows = await prisma.studentSubjectProgress.findMany({
    where: { studentId: me.id, ...(subjectId ? { subjectId } : {}) },
    orderBy: [{ totalSessions: "desc" }, { lastSessionAt: "desc" }],
    select: {
      totalSessions: true,
      totalMinutes: true,
      avgConfGain: true,
      lastSessionAt: true,
      subject: { select: { code: true, title: true } },
    },
  });

  const historyRows = await prisma.session.findMany({
    where: { studentId: me.id, status: "COMPLETED", ...(subjectId ? { subjectId } : {}) },
    orderBy: { scheduledAt: "desc" },
    take: 20,
    select: {
      scheduledAt: true,
      durationMin: true,
      subject: { select: { code: true } },
      completion: {
        select: {
          summary: true,
          confidenceBefore: true,
          confidenceAfter: true,
          nextSteps: true,
          topics: { select: { topic: { select: { name: true } } } },
        },
      },
    },
  });

  // trend (latest 12)
  const recentForTrend = await prisma.session.findMany({
    where: {
      studentId: me.id,
      status: "COMPLETED",
      completion: { isNot: null },
      ...(subjectId ? { subjectId } : {}),
    },
    orderBy: { scheduledAt: "desc" },
    take: 12,
    select: {
      scheduledAt: true,
      subject: { select: { code: true } },
      completion: { select: { confidenceBefore: true, confidenceAfter: true } },
    },
  });

  const trend = recentForTrend
    .map((s) => {
      const gain = (s.completion!.confidenceAfter ?? 0) - (s.completion!.confidenceBefore ?? 0);
      const label = `${new Date(s.scheduledAt).toLocaleDateString("en-MY", { timeZone: TZ })}`;
      return { label, value: gain };
    })
    .reverse();

  const pdfBytes = await buildPdf({
    studentName: me.name ?? "Student",
    studentEmail: me.email,
    generatedAt: new Date(),
    subjectFilterLabel: subjectId ? "Selected subject only" : "All subjects",
    subjectProgress: subjectProgressRows.map((s) => ({
      code: s.subject.code,
      title: s.subject.title,
      totalSessions: s.totalSessions,
      totalMinutes: s.totalMinutes,
      avgConfGain: s.avgConfGain,
      lastSessionAt: s.lastSessionAt,
    })),
    history: historyRows.map((h) => ({
      scheduledAt: h.scheduledAt,
      durationMin: h.durationMin,
      subjectCode: h.subject.code,
      completion: h.completion
        ? {
            summary: h.completion.summary,
            confidenceBefore: h.completion.confidenceBefore,
            confidenceAfter: h.completion.confidenceAfter,
            nextSteps: h.completion.nextSteps,
            topics: h.completion.topics.map((x) => x.topic.name),
          }
        : null,
    })),
    trend,
  });

  const filename = subjectId
    ? "TutorLink Progress Report Filtered.pdf"
    : "TutorLink Progress Report.pdf";

  // pdfBytes is Uint8Array
const bytes = Uint8Array.from(pdfBytes); //  copy -> guaranteed ArrayBuffer

return new NextResponse(bytes as unknown as BodyInit, {
  status: 200,
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  },
});
}