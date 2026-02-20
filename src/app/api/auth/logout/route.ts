import { NextResponse } from "next/server";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export async function POST() {
  const supabase = await supabaseServerComponent();
  await supabase.auth.signOut();

  const res = NextResponse.json({ ok: true });

  //  TEMP flag to allow auth pages after logout
  res.cookies.set("just_logged_out", "1", {
    path: "/",
    maxAge: 5, // seconds (very short)
  });

  return res;
}
