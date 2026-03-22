import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/getSessionUser";
import MyBookingsClient from "./myBookingsClient";

export default async function StudentSessionsPage() {
  const dbUser = await getSessionUser(); // cached
  if (!dbUser) redirect("/auth/login");
  if (dbUser.isDeactivated) redirect("/auth/deactivated");
  if (dbUser.verificationStatus !== "AUTO_VERIFIED") redirect("/dashboard/student");

  return <MyBookingsClient />;
}