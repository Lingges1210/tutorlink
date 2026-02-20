import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

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
    const { id } = await context.params; //  FIX (await params)

    //  ensure caller is logged in
    const supabase = await supabaseServerComponent();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    //  check admin role from your DB
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email.toLowerCase() },
      select: { role: true },
    });

    if (dbUser?.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const app = await prisma.tutorApplication.findUnique({
      where: { id }, //  use awaited id
      select: { transcriptPath: true },
    });

    if (!app?.transcriptPath) {
      return NextResponse.json(
        { success: false, message: "Transcript not found" },
        { status: 404 }
      );
    }

    //  signed URL (1 minute)
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
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
