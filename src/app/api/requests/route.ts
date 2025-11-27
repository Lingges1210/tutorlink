import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST → create a new tutor request
export async function POST(req: Request) {
  try {
    const { studentId, tutorId, subject, description } = await req.json();

    const newRequest = await prisma.tutorRequest.create({
      data: {
        studentId,
        tutorId,
        subject,
        description,
      },
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    console.error("Error creating request:", error);
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }
}

// GET → fetch all tutor requests
export async function GET() {
  try {
    const requests = await prisma.tutorRequest.findMany({
      include: {
        student: true,
        tutor: true,
      },
    });
    return NextResponse.json(requests, { status: 200 });
  } catch (error) {
    console.error("Error fetching requests:", error);
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}
