import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/requireAdminUser";

export const runtime = "nodejs";

function parseDateStart(value: string | null, fallback: Date) {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDateEnd(value: string | null, fallback: Date) {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  d.setHours(23, 59, 59, 999);
  return d;
}

function csvEscape(value: unknown) {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

type ReportSummary = {
  newUsers: number;
  verifiedUsers: number;
  rejectedVerifications: number;
  approvedTutorApps: number;
  rejectedTutorApps: number;
  pendingTutorApps: number;
  completedSessions: number;
  acceptedSessions: number;
  cancelledSessions: number;
  totalSosRequests: number;
  resolvedSosRequests: number;
  lockedUsers: number;
  avgTutorRating: number;
};

type TopSubject = {
  name: string;
  value: number;
};

async function buildReportData(from: Date, to: Date) {
  const newUsers = await prisma.user.count({
    where: {
      createdAt: { gte: from, lte: to },
    },
  });

  const verifiedUsers = await prisma.user.count({
    where: {
      verificationStatus: "AUTO_VERIFIED",
      createdAt: { gte: from, lte: to },
    },
  });

  const rejectedVerifications = await prisma.user.count({
    where: {
      verificationStatus: "REJECTED",
      createdAt: { gte: from, lte: to },
    },
  });

  const approvedTutorApps = await prisma.tutorApplication.count({
    where: {
      status: "APPROVED",
      reviewedAt: { gte: from, lte: to },
    },
  });

  const rejectedTutorApps = await prisma.tutorApplication.count({
    where: {
      status: "REJECTED",
      reviewedAt: { gte: from, lte: to },
    },
  });

  const pendingTutorApps = await prisma.tutorApplication.count({
    where: {
      status: "PENDING",
      createdAt: { gte: from, lte: to },
    },
  });

  const completedSessions = await prisma.session.count({
    where: {
      status: "COMPLETED",
      completedAt: { gte: from, lte: to },
    },
  });

  const acceptedSessions = await prisma.session.count({
    where: {
      status: "ACCEPTED",
      updatedAt: { gte: from, lte: to },
    },
  });

  const cancelledSessions = await prisma.session.count({
    where: {
      status: "CANCELLED",
      cancelledAt: { gte: from, lte: to },
    },
  });

  const totalSosRequests = await prisma.sOSRequest.count({
    where: {
      createdAt: { gte: from, lte: to },
    },
  });

  const resolvedSosRequests = await prisma.sOSRequest.count({
    where: {
      status: "RESOLVED",
      resolvedAt: { gte: from, lte: to },
    },
  });

  const lockedUsers = await prisma.user.count({
    where: {
      accountLockStatus: "LOCKED",
      lockedAt: { gte: from, lte: to },
    },
  });

  const avgTutorRatingAgg = await prisma.user.aggregate({
    _avg: {
      avgRating: true,
    },
    where: {
      isTutorApproved: true,
      ratingCount: { gt: 0 },
    },
  });

  const topSubjectsRaw = await prisma.session.groupBy({
    by: ["subjectId"],
    where: {
      status: "COMPLETED",
      completedAt: { gte: from, lte: to },
    },
    _count: {
      _all: true,
    },
    orderBy: {
      _count: {
        subjectId: "desc",
      },
    },
    take: 5,
  });

  let topSubjects: TopSubject[] = [];

  if (topSubjectsRaw.length > 0) {
    const subjects = await prisma.subject.findMany({
      where: {
        id: { in: topSubjectsRaw.map((s) => s.subjectId) },
      },
      select: {
        id: true,
        code: true,
        title: true,
      },
    });

    const subjectMap = new Map(
      subjects.map((s) => [
        s.id,
        (s.title || s.code || "Unknown Subject").replace(/^[:\-\s]+/, "").trim() ||
          "Unknown Subject",
      ])
    );

    topSubjects = topSubjectsRaw.map((row) => ({
      name: subjectMap.get(row.subjectId) || "Unknown Subject",
      value: row._count._all,
    }));
  }

  const summary: ReportSummary = {
    newUsers,
    verifiedUsers,
    rejectedVerifications,
    approvedTutorApps,
    rejectedTutorApps,
    pendingTutorApps,
    completedSessions,
    acceptedSessions,
    cancelledSessions,
    totalSosRequests,
    resolvedSosRequests,
    lockedUsers,
    avgTutorRating: Number((avgTutorRatingAgg._avg.avgRating ?? 0).toFixed(2)),
  };

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    summary,
    topSubjects,
  };
}

async function buildPdf(report: {
  from: string;
  to: string;
  summary: ReportSummary;
  topSubjects: TopSubject[];
}) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const margin = 50;
  let y = height - margin;

  const drawLine = () => {
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: rgb(0.85, 0.87, 0.9),
    });
    y -= 16;
  };

  const drawText = (
    text: string,
    opts?: {
      size?: number;
      bold?: boolean;
      color?: ReturnType<typeof rgb>;
      x?: number;
    }
  ) => {
    const size = opts?.size ?? 10;
    const x = opts?.x ?? margin;

    page.drawText(text, {
      x,
      y,
      size,
      font: opts?.bold ? fontBold : font,
      color: opts?.color ?? rgb(0.06, 0.09, 0.16),
    });

    y -= size + 8;
  };

  const drawMetric = (label: string, value: string | number) => {
    page.drawText(label, {
      x: margin,
      y,
      size: 10,
      font: fontBold,
      color: rgb(0.2, 0.25, 0.33),
    });

    page.drawText(String(value), {
      x: 280,
      y,
      size: 10,
      font,
      color: rgb(0.06, 0.09, 0.16),
    });

    y -= 18;
  };

  drawText("TutorLink", { size: 20, bold: true });
  drawText("Activity Summary Report", { size: 16, bold: true });
  drawText(
    `Period: ${new Date(report.from).toLocaleString()} -> ${new Date(report.to).toLocaleString()}`,
    { size: 10, color: rgb(0.28, 0.32, 0.4) }
  );
  drawText(`Generated: ${new Date().toLocaleString()}`, {
    size: 10,
    color: rgb(0.28, 0.32, 0.4),
  });

  drawLine();

  drawText("User & Tutor Summary", { size: 12, bold: true });
  drawMetric("New Users", report.summary.newUsers);
  drawMetric("Verified Users", report.summary.verifiedUsers);
  drawMetric("Rejected Verifications", report.summary.rejectedVerifications);
  drawMetric("Approved Tutor Applications", report.summary.approvedTutorApps);
  drawMetric("Rejected Tutor Applications", report.summary.rejectedTutorApps);
  drawMetric("Pending Tutor Applications", report.summary.pendingTutorApps);
  drawMetric("Locked Users", report.summary.lockedUsers);

  drawLine();

  drawText("Session & SOS Summary", { size: 12, bold: true });
  drawMetric("Completed Sessions", report.summary.completedSessions);
  drawMetric("Accepted Sessions", report.summary.acceptedSessions);
  drawMetric("Cancelled Sessions", report.summary.cancelledSessions);
  drawMetric("Total SOS Requests", report.summary.totalSosRequests);
  drawMetric("Resolved SOS Requests", report.summary.resolvedSosRequests);
  drawMetric("Average Tutor Rating", report.summary.avgTutorRating);

  drawLine();

  drawText("Top Subjects", { size: 12, bold: true });

  if (report.topSubjects.length === 0) {
    drawText("No subject activity in this period.", {
      size: 10,
      color: rgb(0.4, 0.45, 0.55),
    });
  } else {
    report.topSubjects.forEach((item, index) => {
      drawMetric(`${index + 1}. ${item.name}`, item.value);
    });
  }

  page.drawText("Generated by TutorLink", {
    x: margin,
    y: 24,
    size: 9,
    font,
    color: rgb(0.55, 0.6, 0.67),
  });

  page.drawText("Page 1 of 1", {
    x: width - margin - 50,
    y: 24,
    size: 9,
    font,
    color: rgb(0.55, 0.6, 0.67),
  });

  return pdfDoc.save(); // Uint8Array
}

export async function GET(req: NextRequest) {
  try {
    await requireAdminUser();

    const { searchParams } = new URL(req.url);
    const format = (searchParams.get("format") || "json").toLowerCase();

    const today = new Date();
    const defaultFrom = new Date();
    defaultFrom.setDate(today.getDate() - 6);
    defaultFrom.setHours(0, 0, 0, 0);

    const from = parseDateStart(searchParams.get("from"), defaultFrom);
    const to = parseDateEnd(searchParams.get("to"), today);

    const report = await buildReportData(from, to);

    if (format === "csv") {
      const rows: string[] = [];

      rows.push("Activity Summary Report");
      rows.push(`From,${csvEscape(report.from)}`);
      rows.push(`To,${csvEscape(report.to)}`);
      rows.push("");

      rows.push("Metric,Value");
      rows.push(`New Users,${csvEscape(report.summary.newUsers)}`);
      rows.push(`Verified Users,${csvEscape(report.summary.verifiedUsers)}`);
      rows.push(`Rejected Verifications,${csvEscape(report.summary.rejectedVerifications)}`);
      rows.push(`Approved Tutor Applications,${csvEscape(report.summary.approvedTutorApps)}`);
      rows.push(`Rejected Tutor Applications,${csvEscape(report.summary.rejectedTutorApps)}`);
      rows.push(`Pending Tutor Applications,${csvEscape(report.summary.pendingTutorApps)}`);
      rows.push(`Completed Sessions,${csvEscape(report.summary.completedSessions)}`);
      rows.push(`Accepted Sessions,${csvEscape(report.summary.acceptedSessions)}`);
      rows.push(`Cancelled Sessions,${csvEscape(report.summary.cancelledSessions)}`);
      rows.push(`Total SOS Requests,${csvEscape(report.summary.totalSosRequests)}`);
      rows.push(`Resolved SOS Requests,${csvEscape(report.summary.resolvedSosRequests)}`);
      rows.push(`Locked Users,${csvEscape(report.summary.lockedUsers)}`);
      rows.push(`Average Tutor Rating,${csvEscape(report.summary.avgTutorRating)}`);
      rows.push("");

      rows.push("Top Subjects,Completed Sessions");
      for (const item of report.topSubjects) {
        rows.push(`${csvEscape(item.name)},${csvEscape(item.value)}`);
      }

      return new Response(rows.join("\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="activity-summary-${from
            .toISOString()
            .slice(0, 10)}-to-${to.toISOString().slice(0, 10)}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (format === "pdf") {
  const pdfBytes = await buildPdf(report);

  const pdfArrayBuffer = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength
  ) as ArrayBuffer;

  return new Response(pdfArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="activity-summary-${from
        .toISOString()
        .slice(0, 10)}-to-${to.toISOString().slice(0, 10)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error("Activity summary report error:", error);

    const message = error?.message || "Server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;

    return NextResponse.json({ success: false, message }, { status });
  }
}