"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Supabase JS client automatically picks up the hash tokens
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.replace("/dashboard/student");
      } else if (event === "PASSWORD_RECOVERY") {
        router.replace("/auth/reset-password");
      }
    });

    // Also handle immediately in case event already fired
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/dashboard/student");
    });
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-gray-500">Verifying your email…</p>
    </div>
  );
}