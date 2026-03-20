import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServer } from "@/lib/supabase";
import { getSessionUser } from "@/lib/getSessionUser";
import { extractTextFromImage, matchMatricAndName } from "@/lib/googleVision";

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: sessionUser.email },
      select: { id: true, email: true, name: true, matricNo: true, verificationStatus: true },
    });

    if (!dbUser) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 }
      );
    }

    if (dbUser.verificationStatus === "AUTO_VERIFIED") {
      return NextResponse.json(
        { success: false, message: "Your account is already verified." },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const matricCard = formData.get("matricCard") as File | null;

    if (!matricCard) {
      return NextResponse.json(
        { success: false, message: "Please upload your matric card." },
        { status: 400 }
      );
    }

    const bucket     = process.env.SUPABASE_STORAGE_BUCKET!;
    const timestamp  = Date.now();
    const fileExt    = matricCard.name.split(".").pop() || "bin";
    const safeId     = dbUser.id.replace(/[^a-zA-Z0-9_-]/g, "");
    const objectPath = `matric-cards/reverify-${safeId}-${timestamp}.${fileExt}`;
    const buffer     = Buffer.from(await matricCard.arrayBuffer());

    const { data: uploadData, error: uploadError } =
      await supabaseServer.storage.from(bucket).upload(objectPath, buffer, {
        contentType: matricCard.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError || !uploadData?.path) {
      return NextResponse.json(
        { success: false, message: "Failed to upload matric card." },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabaseServer.storage
      .from(bucket)
      .getPublicUrl(uploadData.path);

    const matricCardUrl = publicUrlData.publicUrl;

    let ocrText          = "";
    let ocrMatchedMatric = false;
    let ocrMatchedName   = false;
    let verificationStatus: "AUTO_VERIFIED" | "PENDING_REVIEW" = "PENDING_REVIEW";

    try {
      ocrText = await extractTextFromImage(buffer);
      const match = matchMatricAndName({
        ocrText,
        matricNo: dbUser.matricNo ?? "",
        fullName: dbUser.name ?? "",
      });
      ocrMatchedMatric = match.matricMatch;
      ocrMatchedName   = match.nameMatch;

      const hasUSM =
        ocrText.toLowerCase().includes("usm") ||
        ocrText.toLowerCase().includes("universiti sains malaysia");

      if (ocrMatchedMatric && ocrMatchedName && hasUSM) {
        verificationStatus = "AUTO_VERIFIED";
      }
    } catch (err) {
      console.warn("OCR failed → manual review:", err);
    }

    await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        matricCardUrl,
        verificationStatus,
        ocrText: ocrText.slice(0, 5000),
        ocrMatchedMatric,
        ocrMatchedName,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        verificationStatus === "AUTO_VERIFIED"
          ? "Matric card verified successfully!"
          : "Matric card submitted for review. You'll be notified once approved.",
      verificationStatus,
    });
  } catch (err) {
    console.error("Reverify error:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}