import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function safeName(name: string) {
  return name.replace(/[^\w.\-()+\s]/g, "_").replace(/\s+/g, "_");
}

export async function POST(req: Request) {
  const supabase = await supabaseServerComponent();
  const { data } = await supabase.auth.getUser();
  if (!data?.user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { email: data.user.email.toLowerCase() },
    select: { id: true },
  });
  if (!me) return NextResponse.json({ ok: false }, { status: 404 });

  const { channelId, fileName, contentType } = (await req.json()) as {
    channelId: string;
    fileName: string;
    contentType: string;
  };

  // Must be participant of channel
  const channel = await prisma.chatChannel.findFirst({
    where: { id: channelId, OR: [{ studentId: me.id }, { tutorId: me.id }] },
    select: { id: true },
  });
  if (!channel) return NextResponse.json({ ok: false }, { status: 403 });

  // Allowlist: images + pdf
  const allowed = contentType?.startsWith("image/") || contentType === "application/pdf";
  if (!allowed) {
    return NextResponse.json({ ok: false, message: "Only images and PDFs allowed." }, { status: 400 });
  }

  const bucket = "chat-attachments";
  const objectPath = `${channelId}/${me.id}/${Date.now()}_${safeName(fileName)}`;

  const admin = supabaseAdmin();
  const { data: signed, error } = await admin.storage.from(bucket).createSignedUploadUrl(objectPath);

  if (error || !signed) {
    return NextResponse.json({ ok: false, message: error?.message ?? "Failed to sign upload" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    bucket,
    objectPath,
    token: signed.token,
    signedUrl: signed.signedUrl,
  });
}
