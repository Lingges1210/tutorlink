// src/app/dashboard/tutor/layout.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import StudentSidebarNav, { SidebarItem } from "@/components/StudentSidebarNav";

export default async function TutorLayout({
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

  // Extra safety: if not tutor, kick back
  if (!isTutor) redirect("/dashboard/student");

  const tutorItems: SidebarItem[] = [
    { type: "link", href: "/dashboard/tutor", label: "Tutor Home", icon: "dashboard" },
    { type: "link", href: "/dashboard/tutor/profile", label: "Tutor Profile", icon: "profile" },
    { type: "link", href: "/dashboard/tutor/availability", label: "Availability", icon: "calendar" },
    { type: "link", href: "/dashboard/tutor/requests", label: "Requests", icon: "calendar" },
    { type: "link", href: "/dashboard/tutor/sessions", label: "Sessions", icon: "calendar" },

    { type: "divider" },
    { type: "link", href: "/dashboard/student", label: "Student Dashboard", icon: "dashboard" },
  ];

  const mobileItems: SidebarItem[] = [
    { type: "link", href: "/dashboard/tutor", label: "Tutor Home", icon: "dashboard" },
    { type: "link", href: "/dashboard/tutor/requests", label: "Requests", icon: "calendar" },
    { type: "link", href: "/dashboard/tutor/profile", label: "Profile", icon: "profile" },
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
                  {dbUser.name ?? "Tutor"}
                </div>
                <div className="text-xs text-[rgb(var(--muted2))]">
                  {dbUser.email}
                </div>

                <div className="mt-2 text-[0.7rem] text-[rgb(var(--muted))]">
                  Status:{" "}
                  <span className={verified ? "text-emerald-500" : "text-amber-500"}>
                    {verified ? "Verified" : "Pending"}
                  </span>{" "}
                  • <span className="text-[rgb(var(--primary))]">Tutor</span>
                </div>
              </div>

              <StudentSidebarNav items={tutorItems} />
            </div>
          </aside>

          {/* Right content */}
          <main className="min-w-0 flex-1 p-5 md:p-6">
            <StudentSidebarNav items={mobileItems} variant="mobile" />
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
