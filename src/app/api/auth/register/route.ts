// src/app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, programme } = body as {
      email?: string;
      password?: string;
      name?: string;
      programme?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 }
      );
    }

    // Optional: enforce USM-only emails
    // if (!email.endsWith("@student.usm.my") && !email.endsWith("@usm.my")) {
    //   return NextResponse.json(
    //     { success: false, message: "Only USM emails are allowed" },
    //     { status: 400 }
    //   );
    // }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.passwordHash) {
      return NextResponse.json(
        { success: false, message: "User with this email already exists" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // If user already existed from tutor application, update it
    let user;
    if (existing) {
      user = await prisma.user.update({
        where: { email },
        data: {
          name,
          programme,
          passwordHash,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email,
          name,
          programme,
          passwordHash,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Registration successful",
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isTutorApproved: user.isTutorApproved,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { success: false, message: "Server error during registration" },
      { status: 500 }
    );
  }
}
