// src/lib/getSessionUser.ts
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { error } from "console";

export const getSessionUser = cache(async () => {
  const supabase = await supabaseServerComponent();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  console.log("getSessionUser - supabase user:", user?.email ?? "NULL", "error:", error?.message ?? "none");

  if (!user?.email) return null;

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      verificationStatus: true,
      isDeactivated: true,
      isTutorApproved: true,
      roleAssignments: { select: { role: true } },
    },
  });

  console.log("getSessionUser - dbUser:", dbUser?.email ?? "NULL");
  
  return dbUser;
});