// /api/public/satisfaction/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const surveys = await prisma.surveyResponse.findMany({
    select: { rating: true, wouldRecommend: true },
  });

  const total = surveys.length;
  const avgRating = total > 0
    ? Math.round((surveys.reduce((s, r) => s + r.rating, 0) / total) * 10) / 10
    : 0;
  const wouldRecommend = Math.round(
    (surveys.filter((s) => s.wouldRecommend).length / Math.max(total, 1)) * 100
  );

  return NextResponse.json({ success: true, avgRating, totalRatings: total, wouldRecommend });
}