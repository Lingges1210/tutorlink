import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

const PRESET_COLORS = [
  "#7C3AED", // violet
  "#2563EB", // blue
  "#059669", // emerald
  "#D97706", // amber
  "#DC2626", // red
  "#DB2777", // pink
  "#0891B2", // cyan
  "#65A30D", // lime
];

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
  usernameColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color")
    .nullable()
    .optional(),
});

export async function GET() {
  const supabase = await supabaseServerComponent();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: {
      email: true,
      name: true,
      programme: true,
      matricNo: true,
      verificationStatus: true,
      role: true,
      usernameColor: true,   // ← add
    },
  });

  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json(dbUser);
}

export async function PATCH(req: Request) {
  const supabase = await supabaseServerComponent();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = UpdateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, programme, usernameColor } = parsed.data;

  // Only allow usernameColor update if user has redeemed CUSTOM_USERNAME_COLOR
  let colorUpdate: { usernameColor?: string | null } = {};
  if (usernameColor !== undefined) {
    const me = await prisma.user.findUnique({
      where: { email: user.email.toLowerCase() },
      select: { usernameColor: true },
    });
    // usernameColor field being set to "CUSTOM" means they've redeemed it
    if (me?.usernameColor !== null && me?.usernameColor !== undefined) {
      colorUpdate = { usernameColor };
    } else {
      return NextResponse.json(
        { error: "You haven't unlocked custom username color yet." },
        { status: 403 }
      );
    }
  }

  await prisma.user.update({
    where: { email: user.email.toLowerCase() },
    data: {
      name: name === "" ? null : name,
      programme: programme === "" ? null : programme,
      ...colorUpdate,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true });
}