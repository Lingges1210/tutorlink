"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LogoutButton from "./LogoutButton";
import {
  User,
  LayoutDashboard,
  CalendarClock,
  ChevronDown,
  Trophy,
  TrendingUp,
  Gift,
  Shield,
  ShieldOff,
  Sparkles,
  Lock,
} from "lucide-react";

type Props = {
  name?: string | null;
  email: string;
  dashboardHref: string;
  avatarUrl: string | null;
  notifCount?: number;
};

function getInitials(name: string | null | undefined, email: string) {
  const base = (name?.trim() || "").split(/\s+/).filter(Boolean);
  if (base.length >= 2) return (base[0][0] + base[1][0]).toUpperCase();
  if (base.length === 1) return base[0][0].toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

function getAvatarGradient(char: string) {
  const gradients = [
    "from-violet-500 to-indigo-500",
    "from-pink-500 to-rose-500",
    "from-amber-400 to-orange-500",
    "from-emerald-400 to-teal-500",
    "from-sky-400 to-blue-500",
    "from-fuchsia-500 to-purple-600",
    "from-lime-400 to-green-500",
    "from-cyan-400 to-sky-500",
  ];
  const idx = (char.charCodeAt(0) || 0) % gradients.length;
  return gradients[idx];
}

function MenuItem({
  href,
  onClick,
  icon,
  label,
  right,
  accent,
}: {
  href: string;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  right?: React.ReactNode;
  accent?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="group relative flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs
                 text-[rgb(var(--fg))]
                 hover:bg-[rgb(var(--card2))]
                 active:scale-[0.98]
                 transition-all duration-150 ease-out"
    >
      {/* Hover accent strip */}
      <span
        className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-0
                   group-hover:h-4 rounded-full bg-[rgb(var(--primary))]
                   transition-all duration-200 ease-out"
      />

      <span className="flex items-center gap-3">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-md
                     bg-[rgb(var(--card2))]
                     group-hover:bg-[rgb(var(--primary))/0.12]
                     ${accent ?? "text-[rgb(var(--muted))]"}
                     group-hover:text-[rgb(var(--primary))]
                     transition-all duration-150`}
        >
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
    <div className="flex items-center gap-2 px-3 pt-3 pb-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--muted2))]">
        {children}
      </span>
      <span className="flex-1 h-px bg-[rgb(var(--border))]" />
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
  const avatarGradient = useMemo(
    () => getAvatarGradient(initials[0] ?? "A"),
    [initials]
  );

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

  const AvatarCircle = ({ size = "sm" }: { size?: "sm" | "lg" }) => {
    const dim = size === "lg" ? "h-9 w-9 text-xs" : "h-7 w-7 text-[10px]";
    return (
      <span
        className={`relative flex ${dim} items-center justify-center overflow-hidden rounded-full
                   ring-2 ring-[rgb(var(--border))] ring-offset-1 ring-offset-[rgb(var(--bg))]`}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt="Avatar"
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${avatarGradient} font-bold text-white`}
          >
            {initials}
          </span>
        )}
      </span>
    );
  };

  return (
    <div className="relative" ref={ref} style={{ isolation: "isolate" }}>
      {/* ── Trigger Button ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2.5 rounded-xl px-2.5 py-1.5
                   border border-transparent
                   hover:border-[rgb(var(--border))]
                   hover:bg-[rgb(var(--card2))]
                   active:scale-[0.97]
                   transition-all duration-150 ease-out
                   ${open ? "border-[rgb(var(--border))] bg-[rgb(var(--card2))]" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <AvatarCircle size="sm" />

        <span className="hidden text-left md:block">
          <span className="block text-xs font-semibold leading-4 text-[rgb(var(--fg))]">
            {name ?? "Account"}
          </span>
          <span className="block text-[11px] leading-4 text-[rgb(var(--muted2))]">
            {email}
          </span>
        </span>

        <ChevronDown
          size={13}
          className={`text-[rgb(var(--muted2))] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div
          className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl
                     border border-[rgb(var(--border))]
                     bg-[rgb(var(--bg))]
                     shadow-[0_24px_64px_-12px_rgb(0,0,0,0.22),0_0_0_1px_rgb(var(--border)/0.4)]
                     animate-in fade-in slide-in-from-top-2 duration-150
                     z-50"
          role="menu"
        >
          {/* ── Profile Header ── */}
          <div className="relative overflow-hidden px-3 py-3">
            <div
              className={`pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full
                         bg-gradient-to-br ${avatarGradient} opacity-10 blur-2xl`}
            />

            <div className="flex items-center gap-3">
              <AvatarCircle size="lg" />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="truncate text-xs font-bold text-[rgb(var(--fg))]">
                    {name ?? "Account"}
                  </p>
                  <Sparkles size={11} className="shrink-0 text-amber-400" />
                </div>
                <p className="truncate text-xs text-[rgb(var(--muted2))]">
                  {email}
                </p>
              </div>
            </div>

            <div className="mt-2.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_1px_rgb(52,211,153,0.6)]" />
              <span className="text-[11px] font-medium text-[rgb(var(--muted2))]">
                Active now
              </span>
            </div>
          </div>

          <div className="mx-2 border-t border-[rgb(var(--border))]" />

          {/* ── Menu Items ── */}
          <div className="px-2 py-1">
            <SectionLabel>Quick Access</SectionLabel>
            <MenuItem
              href={dashboardHref}
              onClick={() => setOpen(false)}
              icon={<LayoutDashboard size={13} />}
              label="Dashboard"
            />
            <MenuItem
              href={`${dashboardHref}/profile`}
              onClick={() => setOpen(false)}
              icon={<User size={13} />}
              label="Profile"
            />
            <MenuItem
              href={`${dashboardHref}/progress`}
              onClick={() => setOpen(false)}
              icon={<TrendingUp size={13} />}
              label="Progress"
            />
            <MenuItem
              href={`${dashboardHref}/achievements`}
              onClick={() => setOpen(false)}
              icon={<Trophy size={13} />}
              label="Achievements"
            />
            <MenuItem
              href={`${dashboardHref}/rewards`}
              onClick={() => setOpen(false)}
              icon={<Gift size={13} />}
              label="Rewards Shop"
            />

            <SectionLabel>Bookings</SectionLabel>
            <MenuItem
              href={`${dashboardHref}/sessions`}
              onClick={() => setOpen(false)}
              icon={<CalendarClock size={13} />}
              label="My Bookings"
              right={
                notifCount > 0 ? (
                  <span
                    className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5
                               text-[10px] font-bold
                               bg-[rgb(var(--primary))] text-white shadow-sm"
                  >
                    {notifCount}
                  </span>
                ) : null
              }
            />
            <MenuItem
              href={`${dashboardHref}/report`}
              onClick={() => setOpen(false)}
              icon={<Shield size={13} />}
              label="My Reports"
            />

            <SectionLabel>Settings</SectionLabel>
            <MenuItem
              href={`${dashboardHref}/security/change-password`}
              onClick={() => setOpen(false)}
              icon={<Lock size={13} />}
              label="Change Password"
            />
            <MenuItem
              href={`${dashboardHref}/security/deactivate`}
              onClick={() => setOpen(false)}
              icon={<ShieldOff size={13} />}
              label="Deactivate Account"
            />
          </div>

          <div className="mx-2 border-t border-[rgb(var(--border))]" />

          {/* ── Logout — full width ── */}
          <div className="px-2 py-2">
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