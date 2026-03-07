import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { requireAdminUser } from "@/lib/requireAdminUser";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();

    const { id } = await context.params;

    const app = await prisma.tutorApplication.findUnique({
      where: { id },
      select: { transcriptPath: true },
    });

    if (!app?.transcriptPath) {
      return NextResponse.json(
        { success: false, message: "Transcript not found" },
        { status: 404 }
      );
    }

    const { data, error } = await adminSupabase.storage
      .from("tutor-documents")
      .createSignedUrl(app.transcriptPath, 60);

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { success: false, message: error?.message || "Failed to create signed URL" },
        { status: 500 }
      );
    }

    return NextResponse.redirect(data.signedUrl);
  } catch (error: any) {
    const message = error?.message || "Server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;

    return NextResponse.json(
      { success: false, message },
      { status }
    );
  }
}