import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

const UpdateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(60, "Name too long")
    .optional()
    .or(z.literal("")),
  programme: z
    .string()
    .trim()
    .max(80, "Programme too long")
    .optional()
    .or(z.literal("")),
});

export async function GET() {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: {
      email: true,
      name: true,
      programme: true,
      matricNo: true,
      verificationStatus: true,
      role: true,
    },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(dbUser);
}

export async function PATCH(req: Request) {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = UpdateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, programme } = parsed.data;

  //  Whitelist update only (matricNo, matricCardUrl etc locked)
  await prisma.user.update({
    where: { email: user.email.toLowerCase() },
    data: {
      name: name === "" ? null : name,
      programme: programme === "" ? null : programme,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true });
}
