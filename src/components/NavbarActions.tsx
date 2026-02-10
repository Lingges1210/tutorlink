"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import LogoutButton from "@/components/LogoutButton";
import { useRouter } from "next/navigation";

export default function NavbarActions() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session);
    });

    const { data: sub } = supabaseBrowser.auth.onAuthStateChange(
      (_event, session) => {
        setIsLoggedIn(!!session);
      }
    );

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  if (isLoggedIn === null) return null;

  if (!isLoggedIn) {
    return (
      <>
        <Link
          href="/auth/login"
          className="rounded-xl border px-3 py-2 text-sm
                     border-[rgb(var(--border))]
                     bg-[rgb(var(--card)/0.65)]
                     hover:bg-[rgb(var(--card)/0.9)]"
        >
          Log in
        </Link>

        <Link
          href="/auth/register"
          className="rounded-xl px-3 py-2 text-sm font-semibold text-white
                     bg-[rgb(var(--primary))]
                     hover:opacity-90"
        >
          Join
        </Link>
      </>
    );
  }

  return (
    <LogoutButton
      onLogout={async () => {
        await supabaseBrowser.auth.signOut();
        window.location.href = "/auth/login";
      }}
    />
  );
}
