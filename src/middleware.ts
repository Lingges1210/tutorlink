// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isApiRoute = pathname.startsWith("/api/");
  const isAuthPage = pathname.startsWith("/auth/");

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Wrap in try/catch — if Supabase is unreachable, fail open
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Supabase fetch failed — allow request through rather than crash
    return response;
  }

  const needsDashboard  = pathname.startsWith("/dashboard");
  const needsAdmin      = pathname.startsWith("/admin");
  const needsMessaging  = pathname === "/messaging" || pathname.startsWith("/messaging/");
  const needsStudy      = pathname === "/study"     || pathname.startsWith("/study/");
  const needsSOS        = pathname === "/sos"       || pathname.startsWith("/sos/");
  const needsFindTutor  = pathname === "/find-tutor"|| pathname.startsWith("/find-tutor/");

  const needsProtectedArea =
    needsDashboard || needsAdmin || needsMessaging ||
    needsStudy || needsSOS || needsFindTutor;

  const allowedWhenLocked =
    pathname === "/account-locked" ||
    pathname === "/account-locked/appeal" ||
    pathname.startsWith("/api/account-lock-appeal");

  if (!user && (needsProtectedArea || allowedWhenLocked)) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && !allowedWhenLocked && !isApiRoute && !isAuthPage) {
    const cachedStatus = request.cookies.get("__lock_status")?.value;

    if (cachedStatus === "OK") {
      // Not locked, carry on
    } else {
      // Wrap lock check in try/catch too
      try {
        const lockCheckUrl = new URL("/api/auth/lock-status", request.url);
        const lockRes = await fetch(lockCheckUrl, {
          headers: { cookie: request.headers.get("cookie") ?? "" },
          signal: AbortSignal.timeout(3000), // 3s timeout — don't hang forever
        });
        const { locked } = await lockRes.json().catch(() => ({ locked: false }));

        if (locked) {
          const dest = NextResponse.redirect(new URL("/account-locked", request.url));
          dest.cookies.set("__lock_status", "LOCKED", { httpOnly: true, path: "/", maxAge: 60 });
          return dest;
        }

        response.cookies.set("__lock_status", "", { httpOnly: true, path: "/", maxAge: 0 });
        response.cookies.set("__lock_status", "OK", { httpOnly: true, path: "/", maxAge: 30 });
      } catch {
        // Lock check failed — fail open, don't block the user
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};