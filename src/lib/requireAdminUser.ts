// src/lib/requireAdminUser.ts
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export async function requireAdminUser() {
  const supabase = await supabaseServerComponent();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    throw new Error("Unauthorized");
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: {
      id: true,
      email: true,
      role: true,
      roleAssignments: {
        select: { role: true },
      },
    },
  });

  if (!dbUser) {
    throw new Error("Unauthorized");
  }

  const isAdmin =
    dbUser.role === "ADMIN" ||
    dbUser.roleAssignments.some((r) => r.role === "ADMIN");

  if (!isAdmin) {
    throw new Error("Forbidden");
  }

  return dbUser;
}