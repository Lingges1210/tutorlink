import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return NextResponse.json({ locked: false });

    // Look up by email, not by user.id (which is Supabase UUID, not DB id)
    const profile = await prisma.user.findUnique({
      where: { email: user.email.toLowerCase() },
      select: { accountLockStatus: true, isDeactivated: true },
    });

    return NextResponse.json({
      locked:
        profile?.accountLockStatus === "LOCKED" ||
        profile?.isDeactivated === true,
    });
  } catch {
    return NextResponse.json({ locked: false });
  }
}