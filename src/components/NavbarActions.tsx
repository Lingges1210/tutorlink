import Link from "next/link";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { prisma } from "@/lib/prisma";
import UserMenuClient from "@/components/UserMenuClient";

export default async function NavbarActions() {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Logged out
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

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { role: true, name: true, email: true },
  });

  const dashboardHref =
    dbUser?.role === "TUTOR" ? "/dashboard/tutor" : "/dashboard/student";

  return (
    <UserMenuClient
      name={dbUser?.name ?? null}
      email={dbUser?.email ?? user.email}
      dashboardHref={dashboardHref}
    />
  );
}
