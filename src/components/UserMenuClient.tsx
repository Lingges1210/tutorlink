"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LogoutButton from "./LogoutButton";
import {
  User,
  Settings,
  LayoutDashboard,
  CalendarClock,
  ChevronDown,
  Trophy,
  TrendingUp,
  Gift,
  Search,
  Shield,
  ShieldOff,
} from "lucide-react";

type Props = {
  name?: string | null;
  email: string;
  dashboardHref: string; // e.g. /dashboard/student or /dashboard/tutor
  avatarUrl: string | null;

  // OPTIONAL badge (you can use it for bookings count if you want)
  notifCount?: number;
};

function getInitials(name: string | null | undefined, email: string) {
  const base = (name?.trim() || "").split(/\s+/).filter(Boolean);
  if (base.length >= 2) return (base[0][0] + base[1][0]).toUpperCase();
  if (base.length === 1) return base[0][0].toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

function MenuItem({
  href,
  onClick,
  icon,
  label,
  right,
}: {
  href: string;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  right?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="group flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm
                 text-[rgb(var(--fg))]
                 hover:bg-[rgb(var(--card2))]
                 transition"
    >
      <span className="flex items-center gap-3">
        <span className="text-[rgb(var(--muted))] group-hover:text-[rgb(var(--fg))] transition">
          {icon}
        </span>
        <span className="font-medium">{label}</span>
      </span>

      {right ? <span className="shrink-0">{right}</span> : null}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted2))]">
      {children}
    </div>
  );
}

export default function UserMenuClient({
  name,
  email,
  dashboardHref,
  avatarUrl,
  notifCount = 0,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const initials = useMemo(() => getInitials(name, email), [name, email]);

  // Close on outside click + Escape
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      {/* Avatar Button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-[rgb(var(--card)/0.9)]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {/* Avatar image if exists, else initials */}
        <span
          className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full
                     border border-[rgb(var(--border))]
                     bg-[rgb(var(--card)/0.65)]"
          aria-hidden="true"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="Avatar"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm font-semibold text-[rgb(var(--fg))]">
              {initials}
            </span>
          )}
        </span>

        <span className="hidden text-left md:block">
          <span className="block text-xs font-semibold leading-4 text-[rgb(var(--fg))]">
            {name ?? "Account"}
          </span>
          <span className="block text-[11px] leading-4 text-[rgb(var(--muted2))]">
            {email}
          </span>
        </span>

        <ChevronDown
          size={16}
          className={`text-[rgb(var(--muted2))] transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border
                     border-[rgb(var(--border))]
                     bg-[rgb(var(--bg))]
                     shadow-[0_20px_60px_rgb(var(--shadow)/0.18)]"
          role="menu"
        >
          {/* Signed in row */}
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))]">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-[rgb(var(--fg))]">
                  {initials}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="text-[11px] text-[rgb(var(--muted2))]">
                Signed in as
              </div>
              <div className="truncate text-xs font-semibold text-[rgb(var(--fg))]">
                {email}
              </div>
            </div>
          </div>

          <div className="border-t border-[rgb(var(--border))]" />

          {/* Menu items */}
          <div className="p-2">
            <SectionLabel>Quick</SectionLabel>

            <MenuItem
              href={dashboardHref}
              onClick={() => setOpen(false)}
              icon={<LayoutDashboard size={16} />}
              label="Dashboard"
            />

            <MenuItem
              href={`${dashboardHref}/profile`}
              onClick={() => setOpen(false)}
              icon={<User size={16} />}
              label="Profile"
            />

            <MenuItem
              href={`${dashboardHref}/progress`}
              onClick={() => setOpen(false)}
              icon={<TrendingUp size={16} />}
              label="Progress"
            />

            <MenuItem
              href={`${dashboardHref}/achievements`}
              onClick={() => setOpen(false)}
              icon={<Trophy size={16} />}
              label="Achievements"
            />

            <MenuItem
              href={`${dashboardHref}/rewards`}
              onClick={() => setOpen(false)}
              icon={<Gift size={16} />}
              label="Rewards Shop"
            />

            <div className="my-2 border-t border-[rgb(var(--border))]" />

            <SectionLabel>Bookings</SectionLabel>

            <MenuItem
              href={`${dashboardHref}/sessions`}
              onClick={() => setOpen(false)}
              icon={<CalendarClock size={16} />}
              label="My Bookings"
              right={
                notifCount > 0 ? (
                  <span
                    className="rounded-full px-2 py-[2px] text-[10px] font-semibold
                               bg-[rgb(var(--primary))/0.12] text-[rgb(var(--primary))]"
                  >
                    {notifCount}
                  </span>
                ) : null
              }
            />

            <MenuItem
              href={`${dashboardHref}/report`}
              onClick={() => setOpen(false)}
              icon={<ShieldOff size={16} />}
              label="My Reports"
            />

            <div className="my-2 border-t border-[rgb(var(--border))]" />

            <SectionLabel>Settings</SectionLabel>

            <MenuItem
              href={`${dashboardHref}/security/change-password`}
              onClick={() => setOpen(false)}
              icon={<Settings size={16} />}
              label="Change Password"
            />

            <MenuItem
              href={`${dashboardHref}/security/deactivate`}
              onClick={() => setOpen(false)}
              icon={<Shield size={16} />}
              label="Deactivate Account"
            />
          </div>

          <div className="border-t border-[rgb(var(--border))]" />

          {/* Bottom: logout */}
          <div className="p-3">
            <LogoutButton
              onLogout={async () => {
                setOpen(false);
                await fetch("/api/auth/logout", { method: "POST" });
                router.push("/auth/login");
                router.refresh();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}