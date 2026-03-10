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
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          response.cookies.set({ name, value: "", ...options });
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

  if (!session && needsProtectedArea) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!session) return response;

  const access = await getAccessState(request, session.access_token);

  if (!access && needsProtectedArea) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (access?.isDeactivated) {
    return NextResponse.redirect(new URL("/auth/login?error=deactivated", request.url));
  }

  if (access?.accountLockStatus === "LOCKED") {
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
  ],
};