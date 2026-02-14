import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true, verificationStatus: true, isDeactivated: true },
  });

  if (!dbUser || dbUser.isDeactivated) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (dbUser.verificationStatus !== "AUTO_VERIFIED") {
    return NextResponse.json({ message: "Not verified" }, { status: 403 });
  }

  const session = await prisma.session.findUnique({
    where: { id },
    select: {
      id: true,
      studentId: true,
      status: true,
      // @ts-ignore
      proposalStatus: true,
    } as any,
  });

  if (!session || session.studentId !== dbUser.id) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (session.status === "CANCELLED" || session.status === "COMPLETED") {
    return NextResponse.json(
      { message: "Cannot reject proposal for a closed session." },
      { status: 409 }
    );
  }

  const proposalStatus = (session as any).proposalStatus as string | null;

  if (proposalStatus !== "PENDING") {
    return NextResponse.json(
      { message: "No pending proposal to reject." },
      { status: 409 }
    );
  }

  // keep proposedAt/proposedEndAt/proposedNote for audit if you want
  await prisma.session.update({
    where: { id: session.id },
    data: {
      // @ts-ignore
      proposalStatus: "REJECTED",
    } as any,
  });

  return NextResponse.json({ success: true });
}
