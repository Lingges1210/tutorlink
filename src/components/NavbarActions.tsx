import Link from "next/link";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { prisma } from "@/lib/prisma";
import LogoutClient from "@/components/LogoutClient";

export default async function NavbarActions() {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ❌ Not logged in
  if (!user?.email) {
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

  // ✅ Logged in → get role
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { role: true },
  });

  const dashboardHref =
    dbUser?.role === "TUTOR"
      ? "/dashboard/tutor"
      : "/dashboard/student";

  return (
    <>
      <Link
        href={dashboardHref}
        className="rounded-xl px-3 py-2 text-sm font-medium
                   hover:bg-[rgb(var(--card)/0.9)]"
      >
        Dashboard
      </Link>

      <LogoutClient />
    </>
  );
}
