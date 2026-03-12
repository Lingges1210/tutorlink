import Link from "next/link";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { prisma } from "@/lib/prisma";
import UserMenuClient from "@/components/UserMenuClient";
import NotificationsBellClient from "@/components/NotificationsBellClient";
import ChatInboxIconClient from "@/components/ChatInboxIconClient";
import TutorSOSNotificationListener from "@/components/TutorSOSNotificationListener";

export default async function NavbarActions() {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Logged out ──────────────────────────────────────────────────────────────
  if (!user?.email) {
    return (
      <div className="flex items-center gap-2 pl-1">
        {/* Divider */}
        <span className="hidden h-5 w-px bg-[rgb(var(--border))] md:block" />

        <Link
          href="/auth/login"
          className="
            rounded-xl border px-3 py-[7px] text-sm font-medium
            border-[rgb(var(--border))]
            text-[rgb(var(--fg))]
            bg-[rgb(var(--card))]/60
            hover:bg-[rgb(var(--card))]
            hover:border-[rgb(var(--primary))]/50
            transition-all duration-150
          "
        >
          Login
        </Link>

        <Link
          href="/auth/register"
          className="
            group relative overflow-hidden rounded-xl px-4 py-[7px]
            text-sm font-semibold text-white
            bg-[rgb(var(--primary))]
            shadow-[0_4px_12px_rgba(0,0,0,0.15)]
            hover:shadow-[0_6px_18px_rgba(0,0,0,0.22)]
            hover:scale-[1.03]
            active:scale-[0.97]
            transition-all duration-150
          "
        >
          {/* Subtle shimmer sweep on hover */}
          <span
            className="
              pointer-events-none absolute inset-0 -translate-x-full
              bg-gradient-to-r from-transparent via-white/20 to-transparent
              transition-transform duration-500
              group-hover:translate-x-full
            "
          />
          <span className="relative">Join Free</span>
        </Link>
      </div>
    );
  }

  // ── Logged in ───────────────────────────────────────────────────────────────
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: {
      id: true,
      role: true,
      name: true,
      email: true,
      avatarUrl: true,
      isTutorApproved: true,
      roleAssignments: { select: { role: true } },
    },
  });

  const isTutor =
    !!dbUser &&
    (
      dbUser.role === "TUTOR" ||
      dbUser.isTutorApproved ||
      (dbUser.roleAssignments ?? []).some((r) => r.role === "TUTOR")
    );

  const dashboardHref =
    dbUser?.role === "TUTOR" ? "/dashboard/tutor" : "/dashboard/student";

  const initialUnread = dbUser?.id
    ? await prisma.notification.count({
        where: { userId: dbUser.id, readAt: null },
      })
    : 0;

  const initialChatUnread = dbUser?.id
    ? Number(
        (
          await prisma.$queryRaw<Array<{ total: bigint }>>`
            SELECT COALESCE(COUNT(m."id"), 0) AS total
            FROM "ChatRead" r
            JOIN "ChatMessage" m
              ON m."channelId" = r."channelId"
             AND m."createdAt" > r."lastReadAt"
             AND m."senderId" <> r."userId"
            WHERE r."userId" = ${dbUser.id};
          `
        )?.[0]?.total ?? 0
      )
    : 0;

  return (
    <div className="flex items-center gap-1.5 pl-1">
      {/* Divider */}
      <span className="hidden h-5 w-px bg-[rgb(var(--border))] md:block" />

      {dbUser?.id && isTutor && (
        <TutorSOSNotificationListener userId={dbUser.id} />
      )}

      {/* Icon cluster — wrapped in a subtle pill so they group visually */}
      <div className="flex items-center gap-0.5 rounded-xl bg-[rgb(var(--card))]/60 px-1 py-1 ring-1 ring-[rgb(var(--border))]/60">
        <ChatInboxIconClient initialUnread={initialChatUnread} />

        <NotificationsBellClient
          initialUnread={initialUnread}
          dashboardHref={dashboardHref}
        />
      </div>

      <UserMenuClient
        name={dbUser?.name ?? null}
        email={dbUser?.email ?? user.email}
        avatarUrl={dbUser?.avatarUrl ?? null}
        dashboardHref={dashboardHref}
      />
    </div>
  );
}