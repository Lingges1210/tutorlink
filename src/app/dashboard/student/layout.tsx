import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import {
  LayoutDashboard,
  User,
  Search,
  Calendar,
  GraduationCap,
  Lock,
  ShieldOff,
} from "lucide-react";

function NavItem({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
}) {
  return (
    <Link
      href={href}
      className="
        flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium
        text-[rgb(var(--fg))]
        hover:bg-[rgb(var(--card2))]
        transition
      "
    >
      <Icon size={16} className="text-[rgb(var(--muted))]" />
      <span>{label}</span>
    </Link>
  );
}

function NavDisabled({
  label,
  icon: Icon,
}: {
  label: string;
  icon: React.ElementType;
}) {
  return (
    <div
      className="
        flex items-center gap-3 cursor-not-allowed rounded-xl px-3 py-2
        text-sm font-medium text-[rgb(var(--muted2))] opacity-70
      "
      title="Unlocks after verification"
    >
      <Icon size={16} />
      <span>{label}</span>
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
      isDeactivated: true,
    },
  });

  if (!dbUser) redirect("/auth/login");
  if (dbUser.isDeactivated) redirect("/auth/deactivated");
  if (dbUser.role !== "STUDENT") redirect("/dashboard/tutor");

  const verified = dbUser.verificationStatus === "AUTO_VERIFIED";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
      {/* ✅ ONE BIG CARD SHELL */}
      <div
        className="
          overflow-hidden rounded-3xl border
          border-[rgb(var(--border))]
          bg-[rgb(var(--card) / 0.7)]
          shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]
        "
      >
        {/* ✅ Removed min-h to avoid giant empty space */}
        <div className="flex">
          {/* ✅ Sidebar now shows from md and above */}
          <aside
            className="
              hidden w-[280px] shrink-0 md:block
              border-r border-[rgb(var(--border))]
              bg-[rgb(var(--card2))]
            "
          >
            <div className="p-5">
              <div className="mb-4">
                <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                  {dbUser.name ?? "Student"}
                </div>
                <div className="text-xs text-[rgb(var(--muted2))]">
                  {dbUser.email}
                </div>

                <div className="mt-2 text-[0.7rem] text-[rgb(var(--muted))]">
                  Status:{" "}
                  <span
                    className={verified ? "text-emerald-500" : "text-amber-500"}
                  >
                    {verified ? "Verified" : "Pending"}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <NavItem
                  href="/dashboard/student"
                  label="Dashboard"
                  icon={LayoutDashboard}
                />

                <NavItem
                  href="/dashboard/student/profile"
                  label="Profile"
                  icon={User}
                />

                <div className="my-3 border-t border-[rgb(var(--border))]" />

                {verified ? (
                  <>
                    <NavItem
                      href="/dashboard/student/find-tutor"
                      label="Find Tutor (later)"
                      icon={Search}
                    />
                    <NavItem
                      href="/dashboard/student/sessions"
                      label="My Bookings (later)"
                      icon={Calendar}
                    />
                    <NavItem
                      href="/dashboard/student/tutor/apply"
                      label="Apply as Tutor (later)"
                      icon={GraduationCap}
                    />
                  </>
                ) : (
                  <>
                    <NavDisabled label="Find Tutor (locked)" icon={Search} />
                    <NavDisabled label="My Bookings (locked)" icon={Calendar} />
                    <NavDisabled
                      label="Apply as Tutor (locked)"
                      icon={GraduationCap}
                    />
                  </>
                )}

                <div className="my-3 border-t border-[rgb(var(--border))]" />

                <NavItem
                  href="/dashboard/student/security/change-password"
                  label="Change Password"
                  icon={Lock}
                />

                <NavItem
                  href="/dashboard/student/security/deactivate"
                  label="Deactivate Account"
                  icon={ShieldOff}
                />
              </div>
            </div>
          </aside>

          {/* ✅ Right content */}
          <main className="min-w-0 flex-1 p-5 md:p-6">
            {/* ✅ Mobile top menu now hides from md and above (so no duplicate) */}
            <div className="mb-5 flex flex-wrap gap-2 md:hidden">
              <NavItem
                href="/dashboard/student"
                label="Dashboard"
                icon={LayoutDashboard}
              />
              <NavItem
                href="/dashboard/student/profile"
                label="Profile"
                icon={User}
              />
              <NavItem
                href="/dashboard/student/security/change-password"
                label="Password"
                icon={Lock}
              />
            </div>

            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
