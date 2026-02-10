// src/app/api/tutor/apply/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, email, name, programme, subjects, cgpa, availability } = body;

    if (!email && !userId) {
      return NextResponse.json(
        { success: false, message: "userId or email is required" },
        { status: 400 }
      );
    }

    // TEMP: if no userId is provided, we create/fetch a user by email.
    // Later this will use real auth session.
    let user;

    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return NextResponse.json(
          { success: false, message: "User not found" },
          { status: 404 }
        );
      }
    } else {
      // Find or create by email
      user = await prisma.user.upsert({
        where: { email },
        update: {
          name,
          programme,
        },
        create: {
          email,
          name,
          programme,
          // passwordHash is required by the Prisma User schema; provide a placeholder
          // for accounts created via email-only flow (adjust to generate a real hash if needed).
          passwordHash: "",
        },
      });
    }

    const application = await prisma.tutorApplication.create({
      data: {
        userId: user.id,
        subjects,
        cgpa: cgpa ? parseFloat(cgpa) : null,
        availability,
        status: "PENDING",
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Tutor application submitted",
        applicationId: application.id,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Tutor apply error:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
