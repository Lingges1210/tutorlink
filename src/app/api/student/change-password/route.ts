import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export async function POST(req: Request) {
  const supabase = await supabaseServerComponent();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const currentPassword = body?.currentPassword;
  const newPassword = body?.newPassword;

  if (typeof currentPassword !== "string" || currentPassword.trim().length === 0) {
    return NextResponse.json({ error: "Current password is required." }, { status: 400 });
  }

  if (typeof newPassword !== "string" || newPassword.length < 6) {
    return NextResponse.json({ error: "New password must be at least 6 characters." }, { status: 400 });
  }

  if (currentPassword === newPassword) {
    return NextResponse.json({ error: "New password must be different from current password." }, { status: 400 });
  }

  //  auth-only client (does NOT touch cookies/session)
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    return NextResponse.json({ error: "Supabase env missing." }, { status: 500 });
  }

  const authOnly = createClient(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  //  verify current password
  const { error: signInErr } = await authOnly.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInErr) {
    const msg = (signInErr.message || "").toLowerCase();
    if (msg.includes("invalid login credentials") || msg.includes("invalid")) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }
    return NextResponse.json({ error: signInErr.message }, { status: 400 });
  }

  //  update password using the CURRENT logged-in session (cookie-based)
  const { error: updateErr } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
