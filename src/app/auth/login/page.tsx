"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthSplitLayout from "@/components/AuthSplitLayout";
import { LoginAnimationHandle } from "@/components/LoginAnimation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    e: FormEvent,
    animation: LoginAnimationHandle | null
  ) {
    e.preventDefault();
    if (loading) return;

    setStatus(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {}

      if (!res.ok || !data?.success) {
        setStatus(data?.message || "Login failed");
        animation?.fail();
        return;
      }

      const user = data.user;
      const role = String(user?.role || "").toUpperCase();

      let targetPath = "/dashboard/student";
      if (role === "ADMIN") targetPath = "/admin";
      // later: if (role === "TUTOR") targetPath = "/dashboard/tutor";

      setStatus("Login successful. Redirecting...");
      animation?.success();

      setTimeout(() => {
        router.push(targetPath);
      }, 800);
    } catch (err: any) {
      setStatus(err?.message ?? "Unexpected error");
      animation?.fail();
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout
      title="Sign in to TutorLink"
      subtitle="Use your registered USM email & password to continue."
    >
      {(animation) => (
        <form
          onSubmit={(e) => handleSubmit(e, animation)}
          className="space-y-4"
        >
          {/* Email */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[rgb(var(--muted))]">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
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
              onFocus={() => animation?.setChecking(true)}
              onBlur={() => animation?.setChecking(false)}
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
                autoComplete="current-password"
                className="
                  w-full rounded-md border px-3 py-2 pr-10 text-sm outline-none
                  border-[rgb(var(--border))]
                  bg-[rgb(var(--card2))]
                  text-[rgb(var(--fg))]
                  focus:border-[rgb(var(--primary))]
                "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => animation?.setHandsUp(true)}
                onBlur={() => animation?.setHandsUp(false)}
                onKeyDown={(e) =>
                  setCapsLockOn(e.getModifierState("CapsLock"))
                }
                onKeyUp={(e) =>
                  setCapsLockOn(e.getModifierState("CapsLock"))
                }
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
            disabled={loading || !email || !password}
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

          {/* Status */}
          {status && (
            <p
              className={`text-xs ${
                status.toLowerCase().includes("successful")
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {status}
            </p>
          )}

          <p className="pt-2 text-xs text-[rgb(var(--muted2))]">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/register"
              className="text-[rgb(var(--primary))] hover:underline"
            >
              Register here
            </Link>
          </p>
        </form>
      )}
    </AuthSplitLayout>
  );
}
