import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, //  server only
  { auth: { persistSession: false } }
);

export async function POST(req: Request) {
  try {
    //  ensure user is logged in (your existing server component helper)
    const supabase = await supabaseServerComponent();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "No file uploaded" },
        { status: 400 }
      );
    }

    //  validate file
    const maxMB = 8;
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: "Transcript must be a PDF or image (PNG/JPG)." },
        { status: 400 }
      );
    }
    if (file.size > maxMB * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: `Transcript file too large. Max ${maxMB}MB.` },
        { status: 400 }
      );
    }

    //  build storage path (scoped by userId so later you can do "read own" easily)
    const ext =
      file.name.split(".").pop()?.toLowerCase() ||
      (file.type === "application/pdf" ? "pdf" : "jpg");

    const safeName = `transcript_${Date.now()}.${ext}`;
    const storagePath = `transcripts/${user.id}/${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const { error: uploadErr } = await adminSupabase.storage
      .from("tutor-documents")
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadErr) {
      return NextResponse.json(
        { success: false, message: uploadErr.message || "Upload failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      transcriptPath: storagePath,
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
