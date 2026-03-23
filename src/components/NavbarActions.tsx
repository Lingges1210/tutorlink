import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/getSessionUser";
import UserMenuClient from "@/components/UserMenuClient";
import HeaderRealtimeActions from "@/components/HeaderRealtimeActions";

export default async function NavbarActions() {
  const dbUser = await getSessionUser();

  if (!dbUser) {
    return (
      <div className="flex items-center gap-2 pl-1">
        <span className="hidden h-5 w-px bg-[rgb(var(--border))] md:block" />
        <Link href="/auth/login" className="rounded-xl border px-3 py-[7px] text-sm font-medium border-[rgb(var(--border))] text-[rgb(var(--fg))] bg-[rgb(var(--card))]/60 hover:bg-[rgb(var(--card))] hover:border-[rgb(var(--primary))]/50 transition-all duration-150">Login</Link>
        <Link href="/auth/register" className="group relative overflow-hidden rounded-xl px-4 py-[7px] text-sm font-semibold text-white bg-[rgb(var(--primary))] shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_18px_rgba(0,0,0,0.22)] hover:scale-[1.03] active:scale-[0.97] transition-all duration-150">
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
          <span className="relative">Join Free</span>
        </Link>
      </div>
    );
  }

  const [initialUnread, chatUnreadResult] = await Promise.all([
    prisma.notification.count({ where: { userId: dbUser.id, readAt: null } }),
    prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT COALESCE(COUNT(m."id"), 0) AS total
      FROM "ChatRead" r
      JOIN "ChatMessage" m
        ON m."channelId" = r."channelId"
       AND m."createdAt" > r."lastReadAt"
       AND m."senderId" <> r."userId"
      WHERE r."userId" = ${dbUser.id};
    `,
  ]);

  const initialChatUnread = Number(chatUnreadResult?.[0]?.total ?? 0);

  const isTutor =
    dbUser.role === "TUTOR" ||
    dbUser.isTutorApproved ||
    (dbUser.roleAssignments ?? []).some((r) => r.role === "TUTOR");

  const dashboardHref = dbUser.role === "TUTOR" ? "/dashboard/tutor" : "/dashboard/student";

  return (
    <div className="flex items-center gap-1.5 pl-1">
      <span className="hidden h-5 w-px bg-[rgb(var(--border))] md:block" />
      <HeaderRealtimeActions
        userId={dbUser.id}
        isTutor={isTutor}
        initialUnread={initialUnread}
        initialChatUnread={initialChatUnread}
        dashboardHref={dashboardHref}
      />
      <UserMenuClient
        name={dbUser.name ?? null}
        email={dbUser.email}
        avatarUrl={dbUser.avatarUrl ?? null}
        avatarBorder={dbUser.avatarBorder ?? null}
        dashboardHref={dashboardHref}
        profileTitle={dbUser.profileTitle}
      />
    </div>
  );
}