import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

async function getRoles(request: NextRequest, accessToken: string) {
  const url = new URL("/api/me/roles", request.url);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { roles: string[] };
  return data.roles ?? null;
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

  // 🚫 Must be logged in for dashboard + admin
  if (!session && (needsDashboard || needsAdmin)) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ✅ Not protected area
  if (!session) return response;

  // 🔒 Tutor sub-dashboard
if (needsTutor) {
  const roles = await getRoles(request, session.access_token);
  if (!roles?.includes("TUTOR")) {
    return NextResponse.redirect(new URL("/dashboard/student", request.url));
  }
}

// 🔒 Admin area
if (needsAdmin) {
  const roles = await getRoles(request, session.access_token);
  if (!roles?.includes("ADMIN")) {
    return NextResponse.redirect(new URL("/dashboard/student", request.url));
  }
}

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/messaging", "/messaging/:path*"],
};