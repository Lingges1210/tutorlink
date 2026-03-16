// src/lib/getSessionUser.ts
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export const getSessionUser = cache(async () => {
  const supabase = await supabaseServerComponent();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      verificationStatus: true,
      isDeactivated: true,
      isTutorApproved: true,
      roleAssignments: { select: { role: true } },
    },
  });

  return dbUser;
});