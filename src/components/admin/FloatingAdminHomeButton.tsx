"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";

type Props = {
  isAdmin: boolean;
};

export default function FloatingAdminHomeButton({ isAdmin }: Props) {
  const pathname = usePathname();

  if (!isAdmin) return null;
  if (pathname.startsWith("/admin")) return null;

  return (
    <Link
      href="/admin"
      aria-label="Go to Admin Page"
      title="Go to Admin Page"
      className="
  fixed bottom-5 right-5 z-[9999]
  group flex items-center gap-2.5
  rounded-full px-4 py-3

  bg-gradient-to-r from-[rgb(var(--primary))] to-[rgb(var(--primary2,var(--primary)))]
  text-white

  border border-white/10
  shadow-[0_10px_30px_rgba(79,70,229,0.35)]

  transition-all duration-200
  hover:scale-105
  hover:shadow-[0_14px_36px_rgba(79,70,229,0.5)]
  active:scale-[0.98]
"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
        <Home className="h-4 w-4 text-white" />
      </span>

      <span className="flex flex-col leading-none">
        <span className="text-[10px] uppercase tracking-wider text-white/70">
          Quick Access
        </span>
        <span className="text-sm font-semibold text-white">
          Admin Panel
        </span>
      </span>

    </Link>
  );
}