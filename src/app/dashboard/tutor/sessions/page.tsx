import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/getSessionUser";
import TutorSessionsClient from "./TutorSessionsClient";

export default async function TutorSessionsPage() {
  const dbUser = await getSessionUser(); // ✅ cached
  if (!dbUser) redirect("/auth/login");
  if (dbUser.isDeactivated) redirect("/auth/deactivated");

  const isTutor =
    dbUser.isTutorApproved ||
    dbUser.role === "TUTOR" ||
    dbUser.roleAssignments.some((r) => r.role === "TUTOR");

  if (!isTutor) redirect("/dashboard/student");
  if (dbUser.verificationStatus !== "AUTO_VERIFIED") redirect("/dashboard/student");

  return <TutorSessionsClient />;
}