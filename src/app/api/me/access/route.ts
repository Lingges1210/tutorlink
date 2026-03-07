import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { createClient } from "@supabase/supabase-js";

function getBearerToken(req: Request) {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

export async function GET(req: Request) {
  try {
    const bearer = getBearerToken(req);

    let email: string | null = null;

    if (bearer) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data, error } = await supabase.auth.getUser(bearer);

      if (error || !data?.user?.email) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
      }

      email = data.user.email.toLowerCase();
    } else {
      const supabase = await supabaseServerComponent();
      const { data, error } = await supabase.auth.getUser();

      if (error || !data?.user?.email) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
      }

      email = data.user.email.toLowerCase();
    }

    const dbUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        role: true,
        isTutorApproved: true,
        roleAssignments: { select: { role: true } },
        accountLockStatus: true,
        isDeactivated: true,
        verificationStatus: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const roles = new Set<string>(["STUDENT"]);
    if (dbUser.role) roles.add(dbUser.role);
    if (dbUser.isTutorApproved) roles.add("TUTOR");
    for (const r of dbUser.roleAssignments ?? []) roles.add(r.role);

    return NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        roles: Array.from(roles),
        accountLockStatus: dbUser.accountLockStatus,
        isDeactivated: dbUser.isDeactivated,
        verificationStatus: dbUser.verificationStatus,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Server error" },
      { status: 500 }
    );
  }
}