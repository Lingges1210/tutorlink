// src/app/auth/login/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatus(data.message || "Login failed");
        return;
      }

      const user = data.user;

      let targetPath = "/dashboard/student";
      if (user?.role === "ADMIN") targetPath = "/admin";
      // later: else if (user?.role === "TUTOR") targetPath = "/dashboard/tutor";

      setStatus("Login successful. Redirecting...");
      router.push(targetPath);
    } catch (err: any) {
      setStatus(err?.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-md px-4">
      <div
        className="
          rounded-3xl border p-6
          border-[rgb(var(--border))]
          bg-[rgb(var(--card) / 0.7)]
          shadow-[0_20px_60px_rgb(var(--shadow)/0.15)]
        "
      >
        <h1 className="text-xl font-semibold text-[rgb(var(--fg))]">
          Sign in to TutorLink
        </h1>
        <p className="mt-2 text-sm text-[rgb(var(--muted))]">
          Use your registered USM email & password to continue.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Email */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[rgb(var(--muted))]">
              Email
            </label>
            <input
              type="email"
              className="
                w-full rounded-md border px-3 py-2 text-sm outline-none
                border-[rgb(var(--border))]
                bg-[rgb(var(--card2))]
                text-[rgb(var(--fg))]
                focus:border-[rgb(var(--primary))]
              "
              placeholder="yourid@student.usm.my"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[rgb(var(--muted))]">
              Password
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="
                  w-full rounded-md border px-3 py-2 pr-10 text-sm outline-none
                  border-[rgb(var(--border))]
                  bg-[rgb(var(--card2))]
                  text-[rgb(var(--fg))]
                  focus:border-[rgb(var(--primary))]
                "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={(e) => setCapsLockOn(e.getModifierState("CapsLock"))}
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="
                  absolute right-2 top-1/2 -translate-y-1/2
                  text-xs text-[rgb(var(--muted2))]
                  hover:text-[rgb(var(--fg))]
                "
                aria-label="Toggle password visibility"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {capsLockOn && (
              <p className="mt-1 text-[0.7rem] text-amber-400">
                Caps Lock is ON
              </p>
            )}
          </div>

          {/* Forgot password */}
          <div className="flex justify-end">
            <Link
              href="/auth/forgot-password"
              className="text-xs text-[rgb(var(--primary))] hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="
              flex items-center justify-center gap-2
              w-full rounded-md py-2 text-sm font-medium text-white
              bg-[rgb(var(--primary))]
              transition-all duration-200
              hover:-translate-y-0.5
              hover:shadow-[0_8px_24px_rgb(var(--shadow)/0.35)]
              disabled:opacity-60
            "
          >
            {loading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
            )}
            {loading ? "Signing in..." : "Continue"}
          </button>
        </form>

        {status && <p className="mt-4 text-xs text-red-500">{status}</p>}

        <p className="mt-4 text-xs text-[rgb(var(--muted2))]">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/register"
            className="text-[rgb(var(--primary))] hover:underline"
          >
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
