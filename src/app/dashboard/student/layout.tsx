import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="
        block rounded-xl px-3 py-2 text-sm font-medium
        text-[rgb(var(--fg))]
        hover:bg-[rgb(var(--card2))]
        transition
      "
    >
      {label}
    </Link>
  );
}

function NavDisabled({ label }: { label: string }) {
  return (
    <div
      className="
        block cursor-not-allowed rounded-xl px-3 py-2 text-sm font-medium
        text-[rgb(var(--muted2))] opacity-70
      "
      title="Unlocks after verification"
    >
      {label}
    </div>
  );
}

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/auth/login");

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: {
      name: true,
      email: true,
      role: true,
      verificationStatus: true,
    },
  });

  if (!dbUser) redirect("/auth/login");

  // If you want to strictly keep this for STUDENT role only:
  if (dbUser.role !== "STUDENT") redirect("/dashboard/tutor");

  const verified = dbUser.verificationStatus === "AUTO_VERIFIED";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-6 md:grid-cols-[260px,1fr]">
        {/* Sidebar */}
        <aside
          className="
            h-fit rounded-3xl border p-5
            border-[rgb(var(--border))]
            bg-[rgb(var(--card) / 0.7)]
            shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]
          "
        >
          <div className="mb-4">
            <div className="text-sm font-semibold text-[rgb(var(--fg))]">
              {dbUser.name ?? "Student"}
            </div>
            <div className="text-xs text-[rgb(var(--muted2))]">
              {dbUser.email}
            </div>

            <div className="mt-2 text-[0.7rem] text-[rgb(var(--muted))]">
              Status:{" "}
              <span className={verified ? "text-emerald-500" : "text-amber-500"}>
                {verified ? "Verified" : "Pending"}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <NavItem href="/dashboard/student" label="🏠 Dashboard" />
            <NavItem href="/dashboard/student/profile" label="👤 Profile" />

            <div className="my-3 border-t border-[rgb(var(--border))]" />

            {verified ? (
              <>
                <NavItem
                  href="/dashboard/student/find-tutor"
                  label="🔍 Find Tutor (later)"
                />
                <NavItem
                  href="/dashboard/student/sessions"
                  label="📅 My Bookings (later)"
                />
                <NavItem
                  href="/dashboard/student/tutor/apply"
                  label="🧑‍🏫 Apply Tutor (later)"
                />
              </>
            ) : (
              <>
                <NavDisabled label="🔍 Find Tutor (locked)" />
                <NavDisabled label="📅 My Bookings (locked)" />
                <NavDisabled label="🧑‍🏫 Apply Tutor (locked)" />
              </>
            )}

            <div className="my-3 border-t border-[rgb(var(--border))]" />

            <NavItem
              href="/dashboard/student/security/change-password"
              label="🔐 Change Password"
            />
            <NavItem
              href="/dashboard/student/security/deactivate"
              label="🛑 Deactivate Account"
            />
          </div>
        </aside>

        {/* Main */}
        <main>{children}</main>
      </div>
    </div>
  );
}
