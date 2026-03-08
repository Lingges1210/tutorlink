import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/requireAdminUser";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ Ensure requester is admin
    await requireAdminUser();

    const { id } = await context.params;

    const report = await prisma.userReport.findUnique({
      where: { id },
      select: {
        id: true,
        evidenceUrl: true,
      },
    });

    if (!report) {
      return NextResponse.json(
        { ok: false, error: "Report not found" },
        { status: 404 }
      );
    }

    if (!report.evidenceUrl) {
      return NextResponse.json(
        { ok: false, error: "No evidence uploaded" },
        { status: 404 }
      );
    }

    const { data, error } = await adminSupabase.storage
      .from("report-evidence")
      .createSignedUrl(report.evidenceUrl, 60 * 10); // 10 minutes

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { ok: false, error: error?.message || "Failed to create signed URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      signedUrl: data.signedUrl,
    });
  } catch (error) {
    console.error("GET /api/admin/user-reports/[id]/evidence error:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to load evidence" },
      { status: 500 }
    );
  }
}