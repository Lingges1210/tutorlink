// src/app/find-tutor/page.tsx
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import FindTutorClient from "./FindTutorClient";

export default async function FindTutorPage() {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // public view allowed
  if (!user?.email) {
    return <FindTutorClient authed={false} verified={false} />;
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: {
      verificationStatus: true,
      isDeactivated: true,
    },
  });

  // edge case: auth exists but not in db
  if (!dbUser || dbUser.isDeactivated) {
    return <FindTutorClient authed={false} verified={false} />;
  }

  const verified = dbUser.verificationStatus === "AUTO_VERIFIED";
  return <FindTutorClient authed={true} verified={verified} />;
}
