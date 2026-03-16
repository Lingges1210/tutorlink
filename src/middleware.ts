import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // ✅ Use getUser() instead of getSession() for secure server-side check
  const { data: { user } } = await supabase.auth.getUser();

  const needsDashboard = pathname.startsWith("/dashboard");
  const needsAdmin = pathname.startsWith("/admin");
  const needsMessaging = pathname === "/messaging" || pathname.startsWith("/messaging/");
  const needsStudy = pathname === "/study" || pathname.startsWith("/study/");
  const needsSOS = pathname === "/sos" || pathname.startsWith("/sos/");
  const needsFindTutor = pathname === "/find-tutor" || pathname.startsWith("/find-tutor/");

  const needsProtectedArea =
    needsDashboard ||
    needsAdmin ||
    needsMessaging ||
    needsStudy ||
    needsSOS ||
    needsFindTutor;

  const allowedWhenLocked =
    pathname === "/account-locked" ||
    pathname === "/account-locked/appeal" ||
    pathname.startsWith("/api/account-lock-appeal");

  // ✅ Check user instead of session
  if (!user && (needsProtectedArea || allowedWhenLocked)) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/messaging",
    "/messaging/:path*",
    "/study",
    "/study/:path*",
    "/sos",
    "/sos/:path*",
    "/find-tutor",
    "/find-tutor/:path*",
    "/account-locked",
    "/account-locked/appeal",
    "/api/account-lock-appeal",
  ],
};