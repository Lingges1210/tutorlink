"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import LogoutButton from "@/components/LogoutButton";

export default function LogoutClient() {
  const router = useRouter();

  return (
    <LogoutButton
      onLogout={async () => {
        await supabaseBrowser.auth.signOut();
        router.push("/auth/login");
        router.refresh();
      }}
    />
  );
}
