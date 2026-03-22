import { getSessionUser } from "@/lib/getSessionUser";
import FindTutorClient from "./FindTutorClient";

export default async function FindTutorPage() {
  const dbUser = await getSessionUser(); // returns null if not logged in

  if (!dbUser || dbUser.isDeactivated) {
    return <FindTutorClient authed={false} verified={false} />;
  }

  const verified = dbUser.verificationStatus === "AUTO_VERIFIED";
  return <FindTutorClient authed={true} verified={verified} />;
}