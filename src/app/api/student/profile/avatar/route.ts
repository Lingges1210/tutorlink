import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function POST(req: Request) {
  // Auth via your existing server supabase helper
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Only PNG/JPG/WEBP allowed" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Max size is 2MB" }, { status: 400 });
  }

  // Supabase admin client (server-only)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabaseAdmin = createClient(url, serviceKey);

  const ext =
    file.type === "image/png" ? "png" :
    file.type === "image/webp" ? "webp" : "jpg";

  // store by user id to avoid collisions
  const path = `${user.id}/avatar.${ext}`;

  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadErr } = await supabaseAdmin.storage
    .from("avatars")
    .upload(path, bytes, {
      contentType: file.type,
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  // If bucket is PUBLIC, this is enough:
  const { data } = supabaseAdmin.storage.from("avatars").getPublicUrl(path);

  // Cache-bust so the new image shows instantly after replace
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;

  await prisma.user.update({
    where: { email: user.email.toLowerCase() },
    data: { avatarUrl },
  });

  return NextResponse.json({ avatarUrl });
}
