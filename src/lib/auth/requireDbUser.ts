import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireUser";

export async function requireDbUser() {
  const authUser = await requireUser();

  if (!authUser?.email) throw new Error("UNAUTHENTICATED");

  const email = authUser.email.toLowerCase();

  const dbUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isTutorApproved: true,
      isDeactivated: true,
    },
  });

  if (!dbUser) throw new Error("UNAUTHENTICATED");
  if (dbUser.isDeactivated) throw new Error("DEACTIVATED");

  return dbUser; //  Prisma user with correct db id
}