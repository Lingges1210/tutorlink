import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code  = url.searchParams.get("code");
  const token = url.searchParams.get("token");
  const type  = url.searchParams.get("type");

  const cookieStore = await cookies();
  const cookiesToWrite: { name: string; value: string; options: object }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookiesToWrite.push({ name, value, options });
          });
        },
      },
    }
  );

  // ── Flow 1: PKCE code exchange (OAuth / magic link newer flow)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(new URL("/auth/login?error=verify_failed", url.origin));
    }

    const response = NextResponse.redirect(new URL("/dashboard/student", url.origin));
    cookiesToWrite.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
    });
    return response;
  }

  // ── Flow 2: token-based verification (email signup confirmation)
  if (token && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type as "signup" | "email" | "recovery" | "invite" | "email_change",
    });

    if (error) {
      console.error("OTP verify error:", error.message);
      return NextResponse.redirect(new URL("/auth/login?error=verify_failed", url.origin));
    }

    const response = NextResponse.redirect(new URL("/dashboard/student", url.origin));
    cookiesToWrite.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
    });
    return response;
  }

  // ── No valid params
  return NextResponse.redirect(new URL("/auth/login?error=missing_code", url.origin));
}