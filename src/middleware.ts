import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

type AccessRes = {
  success: boolean;
  user?: {
    id: string;
    roles: string[];
    accountLockStatus: string;
    isDeactivated: boolean;
    verificationStatus: string;
  };
};

async function getAccessState(request: NextRequest, accessToken: string) {
  const url = new URL("/api/me/access", request.url);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) return null;
  const data = (await res.json()) as AccessRes;
  return data.user ?? null;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  let response = NextResponse.next({
    request,
  });

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

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const needsDashboard = pathname.startsWith("/dashboard");
  const needsTutor = pathname.startsWith("/dashboard/tutor");
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

  if (!session && (needsProtectedArea || allowedWhenLocked)) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!session) return response;

  const access = await getAccessState(request, session.access_token);

  if (!access && (needsProtectedArea || allowedWhenLocked)) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (access?.isDeactivated) {
    return NextResponse.redirect(new URL("/auth/login?error=deactivated", request.url));
  }

  if (access?.accountLockStatus === "LOCKED" && !allowedWhenLocked) {
    return NextResponse.redirect(new URL("/account-locked", request.url));
  }

  if (needsTutor && !access?.roles.includes("TUTOR")) {
    return NextResponse.redirect(new URL("/dashboard/student", request.url));
  }

  if (needsAdmin && !access?.roles.includes("ADMIN")) {
    return NextResponse.redirect(new URL("/dashboard/student", request.url));
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