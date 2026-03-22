import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/getSessionUser";
import StudentDashboardClient from "./StudentDashboardClient";

export default async function StudentDashboardPage() {
  const dbUser = await getSessionUser(); // cached — reuses layout's fetch, no extra DB call

  if (!dbUser) redirect("/auth/login");

  const isTutor =
    dbUser.isTutorApproved ||
    dbUser.role === "TUTOR" ||
    dbUser.roleAssignments.some((r) => r.role === "TUTOR");

  return <StudentDashboardClient user={dbUser} isTutor={isTutor} />;
}