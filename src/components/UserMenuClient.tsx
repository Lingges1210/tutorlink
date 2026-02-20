"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LogoutButton from "./LogoutButton";
import { User, Settings } from "lucide-react";

type Props = {
  name?: string | null;
  email: string;
  dashboardHref: string; // e.g. /dashboard/student or /dashboard/tutor
  avatarUrl: string | null;
};

function getInitials(name: string | null | undefined, email: string) {
  const base = (name?.trim() || "").split(/\s+/).filter(Boolean);
  if (base.length >= 2) return (base[0][0] + base[1][0]).toUpperCase();
  if (base.length === 1) return base[0][0].toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

export default function UserMenuClient({
  name,
  email,
  dashboardHref,
  avatarUrl,
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

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setOpen(false);
    router.push("/auth/login");
    router.refresh();
  }

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
        {/*  Avatar image if exists, else initials */}
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

        <span className="text-[rgb(var(--muted2))]">▾</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border
                     border-[rgb(var(--border))]
                     bg-[rgb(var(--bg))]
                     shadow-[0_20px_60px_rgb(var(--shadow)/0.18)]"
          role="menu"
        >
          {/*  Signed in row with avatar */}
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 overflow-hidden rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))]">
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
            <Link
              href={`${dashboardHref}/profile`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm
                         hover:bg-[rgb(var(--card2))] transition"
            >
              <User size={16} className="text-[rgb(var(--muted))]" />
              <span>Profile</span>
            </Link>

            <Link
              href={`${dashboardHref}/security/change-password`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm
                         hover:bg-[rgb(var(--card2))] transition"
            >
              <Settings size={16} className="text-[rgb(var(--muted))]" />
              <span>Settings</span>
            </Link>
          </div>

          <div className="border-t border-[rgb(var(--border))]" />

          {/* Bottom: logout animation */}
          <div className="p-3">
            <div className="w-full">
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
        </div>
      )}
    </div>
  );
}
