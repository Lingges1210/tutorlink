"use client";

import { useRouter } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

export default function LogoutClient() {
  const router = useRouter();

  return (
    <LogoutButton
      onLogout={async () => {
        // clears server cookies
        await fetch("/api/auth/logout", { method: "POST" });

        // go to login + refresh server components
        router.push("/auth/login");
        router.refresh();
      }}
    />
  );
}
