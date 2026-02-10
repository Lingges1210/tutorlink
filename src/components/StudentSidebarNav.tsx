"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  User,
  Search,
  Calendar,
  GraduationCap,
  Lock,
  ShieldOff,
} from "lucide-react";

export type SidebarIconKey =
  | "dashboard"
  | "profile"
  | "search"
  | "calendar"
  | "graduation"
  | "lock"
  | "shieldoff";

export type SidebarItem =
  | {
      type: "link";
      href: string;
      label: string;
      icon: SidebarIconKey;
    }
  | {
      type: "disabled";
      label: string;
      icon: SidebarIconKey;
      title?: string;
    }
  | { type: "divider" };

const ICONS: Record<SidebarIconKey, React.ElementType> = {
  dashboard: LayoutDashboard,
  profile: User,
  search: Search,
  calendar: Calendar,
  graduation: GraduationCap,
  lock: Lock,
  shieldoff: ShieldOff,
};

export default function StudentSidebarNav({
  items,
  variant = "sidebar",
}: {
  items: SidebarItem[];
  variant?: "sidebar" | "mobile";
}) {
  const pathname = usePathname();

  return (
    <div
      className={
        variant === "mobile"
          ? "mb-5 flex flex-wrap gap-2 md:hidden"
          : "space-y-1"
      }
    >
      {items.map((it, idx) => {
        if (it.type === "divider") {
          return (
            <div
              key={`div-${idx}`}
              className="my-3 border-t border-[rgb(var(--border))]"
            />
          );
        }

        const Icon = ICONS[it.icon];

        // Disabled item
        if (it.type === "disabled") {
          return (
            <div
              key={`dis-${idx}`}
              className="
                flex items-center gap-3 rounded-xl px-3 py-2
                text-sm font-medium
                text-[rgb(var(--muted2))]
                opacity-70 cursor-not-allowed
              "
              title={it.title ?? "Unlocks after verification"}
            >
              <Icon size={16} />
              <span>{it.label}</span>
            </div>
          );
        }

        // ✅ Active logic
        const isDashboardRoot = it.href === "/dashboard/student";
        const active = isDashboardRoot
          ? pathname === it.href
          : pathname === it.href || pathname.startsWith(it.href + "/");

        return (
          <Link
            key={`lnk-${idx}`}
            href={it.href}
            className={[
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
              active
                ? `
                  bg-[rgb(var(--card))]
                  border border-[rgb(var(--border))]
                  text-[rgb(var(--primary))]
                  shadow-sm
                `
                : `
                  text-[rgb(var(--fg))]
                  hover:bg-[rgb(var(--card)/0.6)]
                `,
            ].join(" ")}
          >
            <Icon
              size={16}
              className={
                active
                  ? "text-[rgb(var(--primary))]"
                  : "text-[rgb(var(--muted))]"
              }
            />
            <span>{it.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
