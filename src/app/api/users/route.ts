import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // ✅ shared Prisma instance

// POST → create new user
export async function POST(req: Request) {
  try {
    const { name, email, role } = await req.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    const newUser = await prisma.user.create({
      data: { name, email, role: role || "student" },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("❌ Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}

// GET → fetch all users
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { id: "asc" },
    });

    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
