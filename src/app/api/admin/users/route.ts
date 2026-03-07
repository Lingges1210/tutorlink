import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/requireAdminUser";

export async function GET(req: NextRequest) {
  try {
    await requireAdminUser();

    const { searchParams } = new URL(req.url);

    const search = (searchParams.get("search") || "").trim();
    const role = (searchParams.get("role") || "").trim();
    const verificationStatus = (searchParams.get("verificationStatus") || "").trim();
    const accountLockStatus = (searchParams.get("accountLockStatus") || "").trim();

    const users = await prisma.user.findMany({
      where: {
        AND: [
          search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                  { matricNo: { contains: search, mode: "insensitive" } },
                ],
              }
            : {},
          role ? { role: role as any } : {},
          verificationStatus ? { verificationStatus } : {},
          accountLockStatus ? { accountLockStatus: accountLockStatus as any } : {},
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        email: true,
        matricNo: true,
        role: true,
        verificationStatus: true,
        accountLockStatus: true,
        isDeactivated: true,
        createdAt: true,
        lockedAt: true,
        lockReason: true,
      },
    });

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error: any) {
    const message = error?.message || "Failed to load users";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status }
    );
  }
}