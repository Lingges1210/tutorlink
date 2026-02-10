import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import StudentDashboardClient from "./StudentDashboardClient";

export default async function StudentDashboardPage() {
  const supabase = await supabaseServerComponent();


  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/auth/login");
  }

  // ✅ Read verificationStatus from Prisma using email
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: {
      email: true,
      name: true,
      role: true,
      verificationStatus: true,
    },
  });

  if (!dbUser) {
    // user exists in Supabase but not in Prisma (edge case)
    redirect("/auth/login");
  }

  return <StudentDashboardClient user={dbUser} />;
}
