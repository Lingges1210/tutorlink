import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/getSessionUser";
import StudentDashboardClient from "./StudentDashboardClient";

export default async function StudentDashboardPage() {
  const dbUser = await getSessionUser();
  if (!dbUser) redirect("/auth/login");

  const isTutor =
    dbUser.isTutorApproved ||
    dbUser.role === "TUTOR" ||
    dbUser.roleAssignments.some((r) => r.role === "TUTOR");

  return (
    <StudentDashboardClient
      user={{
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        verificationStatus: dbUser.verificationStatus,
        avatarUrl: dbUser.avatarUrl ?? null,
        avatarBorder: dbUser.avatarBorder ?? null,
      }}
      isTutor={isTutor}
      streakCount={dbUser.streakCount ?? 0}
      streakBrokenAt={dbUser.streakBrokenAt ?? null}
    />
  );
}