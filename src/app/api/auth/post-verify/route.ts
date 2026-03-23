import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { sendApprovalEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    // Get access token from Authorization header sent by the callback page
    const authHeader = req.headers.get("Authorization");
    const accessToken = authHeader?.replace("Bearer ", "").trim();

    if (!accessToken) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    // Verify token with Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user?.email) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email.toLowerCase() },
      select: { verificationStatus: true, name: true, approvalEmailSent: true },
    });

    if (!dbUser) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    // Only send for AUTO_VERIFIED and only once
    if (
      dbUser.verificationStatus === "AUTO_VERIFIED" &&
      !dbUser.approvalEmailSent
    ) {
      await sendApprovalEmail(user.email, dbUser.name ?? undefined);

      await prisma.user.update({
        where: { email: user.email.toLowerCase() },
        data: { approvalEmailSent: true },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("post-verify error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}