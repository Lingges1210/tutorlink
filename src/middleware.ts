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

  const { data: { user } } = await supabase.auth.getUser();

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

  // Redirect unauthenticated users
  if (!user && (needsProtectedArea || allowedWhenLocked)) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check lock status for authenticated users on page routes only
  if (user && !allowedWhenLocked && !isApiRoute && !isAuthPage) {
    const cachedStatus = request.cookies.get("__lock_status")?.value;

    // Only trust "OK" cache — always recheck DB if LOCKED or missing
    if (cachedStatus === "OK") {
      // Not locked, carry on
    } else {
      const lockCheckUrl = new URL("/api/auth/lock-status", request.url);
      const lockRes = await fetch(lockCheckUrl, {
        headers: { cookie: request.headers.get("cookie") ?? "" },
      });
      const { locked } = await lockRes.json().catch(() => ({ locked: false }));

      if (locked) {
        const dest = NextResponse.redirect(new URL("/account-locked", request.url));
        dest.cookies.set("__lock_status", "LOCKED", { httpOnly: true, path: "/", maxAge: 60 });
        return dest;
      }

      // DB says not locked — clear any stale LOCKED cookie and cache OK
      response.cookies.set("__lock_status", "", { httpOnly: true, path: "/", maxAge: 0 });
      response.cookies.set("__lock_status", "OK", { httpOnly: true, path: "/", maxAge: 30 });
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};