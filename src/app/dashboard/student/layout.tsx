import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import StudentSidebarNav, { SidebarItem } from "@/components/StudentSidebarNav";

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
      isTutorApproved: true,
      roleAssignments: { select: { role: true } },
    },
  });

  if (!dbUser) redirect("/auth/login");
  if (dbUser.isDeactivated) redirect("/auth/deactivated");

  const verified = dbUser.verificationStatus === "AUTO_VERIFIED";

  const isTutor =
    dbUser.isTutorApproved ||
    dbUser.role === "TUTOR" ||
    dbUser.roleAssignments.some((r) => r.role === "TUTOR");

  const sidebarItems: SidebarItem[] = [
    {
      type: "link",
      href: "/dashboard/student",
      label: "Dashboard",
      icon: "dashboard",
    },
    {
      type: "link",
      href: "/dashboard/student/profile",
      label: "Profile",
      icon: "profile",
    },

    //  NEW: Progress link (inside student dashboard)
    ...(verified
      ? ([
          {
            type: "link",
            href: "/dashboard/student/progress",
            label: "Progress",
            icon: "progress", // make sure your StudentSidebarNav supports this icon name
          },
        ] as SidebarItem[])
      : ([
          {
            type: "disabled",
            label: "Progress (locked)",
            icon: "progress",
          },
        ] as SidebarItem[])),

    { type: "divider" },

    ...(verified
      ? ([
          {
            type: "link",
            href: "/find-tutor",
            label: "Find Tutor",
            icon: "search",
          },
          {
            type: "link",
            href: "/dashboard/student/sessions",
            label: "My Bookings",
            icon: "calendar",
          },
          !isTutor
            ? {
                type: "link",
                href: "/dashboard/student/apply-tutor",
                label: "Apply as Tutor",
                icon: "graduation",
              }
            : {
                type: "link",
                href: "/dashboard/tutor",
                label: "Tutor Dashboard",
                icon: "graduation",
              },
        ] as SidebarItem[])
      : ([
          { type: "disabled", label: "Find Tutor (locked)", icon: "search" },
          { type: "disabled", label: "My Bookings (locked)", icon: "calendar" },
          {
            type: "disabled",
            label: "Apply as Tutor (locked)",
            icon: "graduation",
          },
        ] as SidebarItem[])),

    { type: "divider" },
    {
      type: "link",
      href: "/dashboard/student/security/change-password",
      label: "Change Password",
      icon: "lock",
    },
    {
      type: "link",
      href: "/dashboard/student/security/deactivate",
      label: "Deactivate Account",
      icon: "shieldoff",
    },
  ];

  const mobileItems: SidebarItem[] = [
    {
      type: "link",
      href: "/dashboard/student",
      label: "Dashboard",
      icon: "dashboard",
    },
    {
      type: "link",
      href: "/dashboard/student/profile",
      label: "Profile",
      icon: "profile",
    },

    //  NEW: Progress also in mobile
    ...(verified
      ? ([
          {
            type: "link",
            href: "/dashboard/student/progress",
            label: "Progress",
            icon: "progress",
          },
        ] as SidebarItem[])
      : ([
          {
            type: "disabled",
            label: "Progress (locked)",
            icon: "progress",
          },
        ] as SidebarItem[])),

    {
      type: "link",
      href: "/dashboard/student/security/change-password",
      label: "Password",
      icon: "lock",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
      <div
        className="
          overflow-hidden rounded-3xl border
          border-[rgb(var(--border))]
          bg-[rgb(var(--card) / 0.7)]
          shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]
        "
      >
        <div className="flex">
          {/* Sidebar (md+) */}
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

              {/* Client nav renders icons + active state */}
              <StudentSidebarNav items={sidebarItems} />
            </div>
          </aside>

          {/* Right content */}
          <main className="min-w-0 flex-1 p-5 md:p-6">
            {/* Mobile top menu (< md only) */}
            <StudentSidebarNav items={mobileItems} variant="mobile" />

            {children}
          </main>
        </div>
      </div>
    </div>
  );
}