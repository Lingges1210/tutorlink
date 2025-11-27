"use client";
import { useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b">
      <nav className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-600" />
            <span className="font-semibold text-lg text-blue-700">TutorLink</span>
          </Link>

          {/* Desktop menu */}
          <ul className="hidden md:flex items-center gap-6 text-sm">
            <li><Link className="hover:text-blue-700" href="/">Home</Link></li>
            <li><Link className="hover:text-blue-700" href="/request">Request Help</Link></li>
            <li><Link className="hover:text-blue-700" href="/tutors">Become a Tutor</Link></li>
            <li><Link className="hover:text-blue-700" href="/dashboard">Dashboard</Link></li>
            <li>
              <Link
                className="rounded-md px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700"
                href="/login"
              >
                Login
              </Link>
            </li>
          </ul>

          {/* Mobile menu button */}
          <button
            aria-label="Toggle menu"
            onClick={() => setOpen(!open)}
            className="md:hidden inline-flex items-center justify-center rounded-md p-2 hover:bg-gray-100"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
              {open ? (
                <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth={2} />
              ) : (
                <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth={2} />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <ul className="md:hidden pb-4 space-y-2 text-sm">
            <li><Link className="block px-2 py-2 rounded hover:bg-gray-100" href="/">Home</Link></li>
            <li><Link className="block px-2 py-2 rounded hover:bg-gray-100" href="/request">Request Help</Link></li>
            <li><Link className="block px-2 py-2 rounded hover:bg-gray-100" href="/tutors">Become a Tutor</Link></li>
            <li><Link className="block px-2 py-2 rounded hover:bg-gray-100" href="/dashboard">Dashboard</Link></li>
            <li>
              <Link className="block px-2 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" href="/login">
                Login
              </Link>
            </li>
          </ul>
        )}
      </nav>
    </header>
  );
}
