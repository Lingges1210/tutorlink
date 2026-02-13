import { redirect } from "next/navigation";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { prisma } from "@/lib/prisma";
import MyBookingsClient from "./myBookingsClient";

export default async function StudentSessionsPage() {
  const supabase = await supabaseServerComponent();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect("/auth/login");

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { verificationStatus: true, isDeactivated: true },
  });

  if (!dbUser) redirect("/auth/login");
  if (dbUser.isDeactivated) redirect("/auth/deactivated");
  if (dbUser.verificationStatus !== "AUTO_VERIFIED") redirect("/dashboard/student");

  return <MyBookingsClient />;
}
