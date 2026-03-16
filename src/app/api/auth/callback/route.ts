import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/auth/login?error=missing_code", url.origin));
  }

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
          // ✅ Collect cookies to write onto the response
          cookiesToSet.forEach(({ name, value, options }) => {
            cookiesToWrite.push({ name, value, options });
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/auth/login?error=verify_failed", url.origin));
  }

  // ✅ Write session cookies onto the redirect response
  const response = NextResponse.redirect(new URL("/dashboard/student", url.origin));
  cookiesToWrite.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
  });

  return response;
}