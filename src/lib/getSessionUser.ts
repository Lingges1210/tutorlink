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
      avatarUrl: true,
      verificationStatus: true,
      isDeactivated: true,
      isTutorApproved: true,
      createdAt: true,
      avgRating: true,
      ratingCount: true,
      programme: true,
      matricNo: true,
      profileTitle: true,
      badgeFrame: true,
      profileBanner: true,
      streakCount: true,
      streakLastSeen: true,
      streakBrokenAt: true,
      usernameColor: true,        // ← add
      roleAssignments: { select: { role: true } },
    },
  });

  return dbUser;
});