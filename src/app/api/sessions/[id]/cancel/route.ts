import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = await supabaseServerComponent();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true, verificationStatus: true, isDeactivated: true },
  });

  if (!dbUser || dbUser.isDeactivated) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (dbUser.verificationStatus !== "AUTO_VERIFIED") return NextResponse.json({ message: "Not verified" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  const session = await prisma.session.findUnique({
    where: { id: params.id },
    select: { studentId: true, status: true },
  });

  if (!session || session.studentId !== dbUser.id) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (session.status === "CANCELLED" || session.status === "COMPLETED") {
    return NextResponse.json({ message: "Already closed" }, { status: 409 });
  }

  await prisma.session.update({
    where: { id: params.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: reason || null,
    },
  });

  return NextResponse.json({ success: true });
}
