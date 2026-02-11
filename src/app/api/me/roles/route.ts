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
  // 1) Try bearer token (middleware -> fetch)
  const bearer = getBearerToken(req);

  let email: string | null = null;

  if (bearer) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase.auth.getUser(bearer);

    if (error || !data?.user?.email) {
      return NextResponse.json({ roles: [] }, { status: 401 });
    }

    email = data.user.email.toLowerCase();
  } else {
    // 2) Fallback to cookie session (normal browser request)
    const supabase = await supabaseServerComponent();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user?.email) {
      return NextResponse.json({ roles: [] }, { status: 401 });
    }
    email = data.user.email.toLowerCase();
  }

  const dbUser = await prisma.user.findUnique({
    where: { email },
    select: {
      role: true,
      isTutorApproved: true,
      roleAssignments: { select: { role: true } },
    },
  });

  const roles = new Set<string>(["STUDENT"]);
  if (dbUser?.role) roles.add(dbUser.role);
  if (dbUser?.isTutorApproved) roles.add("TUTOR");
  for (const r of dbUser?.roleAssignments ?? []) roles.add(r.role);

  return NextResponse.json({ roles: Array.from(roles) });
}
