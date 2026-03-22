import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();

    // Collect cookies Supabase wants to set
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
            // Save them to write onto the response later
            cookiesToSet.forEach(({ name, value, options }) => {
              cookiesToWrite.push({ name, value, options });
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error || !data.session) {
      const msg = (error?.message || "").toLowerCase();
      if (msg.includes("email not confirmed")) {
        return NextResponse.json(
          {
            success: false,
            code: "EMAIL_NOT_CONFIRMED",
            message: "Please verify your email first. Check your inbox or spam.",
          },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!data.user?.email_confirmed_at) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { success: false, message: "Please verify your email first." },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: data.user.email!.toLowerCase() },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        isTutorApproved: true,
        verificationStatus: true,
        isDeactivated: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Account exists but profile is missing. Please contact support.",
        },
        { status: 409 }
      );
    }

    if (user.isDeactivated) {
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          success: false,
          code: "ACCOUNT_DEACTIVATED",
          message: "Your account has been deactivated. Please contact support.",
        },
        { status: 403 }
      );
    }

    // Build final response and attach all Supabase cookies onto it
    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isTutorApproved: user.isTutorApproved,
        verificationStatus: user.verificationStatus,
      },
    });

    // This is the key fix — write cookies onto the HTTP response
    cookiesToWrite.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
    });

    return response;

  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { success: false, message: "Server error during login" },
      { status: 500 }
    );
  }
}