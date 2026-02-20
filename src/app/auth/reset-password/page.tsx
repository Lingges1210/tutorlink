"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { label: "Weak", level: 1 };
  if (score <= 3) return { label: "Medium", level: 2 };
  return { label: "Strong", level: 3 };
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // IMPORTANT: parses the recovery link tokens
    },
  }
);

export default function ResetPasswordPage() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [capsLockOn, setCapsLockOn] = useState(false);

  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);
  const match = confirm.length > 0 && newPassword === confirm;

  //  Step 3: invalid/expired link handling
  useEffect(() => {
    let alive = true;

    async function init() {
      // detectSessionInUrl will parse the tokens in the URL hash
      const { data, error } = await supabase.auth.getSession();

      if (!alive) return;

      if (error) {
        setHasRecoverySession(false);
      } else {
        setHasRecoverySession(Boolean(data.session));
      }

      setReady(true);
    }

    init();
    return () => {
      alive = false;
    };
  }, []);

  // If link is invalid/expired, user won't have a session
  if (ready && !hasRecoverySession) {
    return (
      <div className="mx-auto mt-10 max-w-md px-4">
        <div
          className="
            rounded-3xl border p-6
            border-[rgb(var(--border))]
            bg-[rgb(var(--card)/0.7)]
            shadow-[0_20px_60px_rgb(var(--shadow)/0.15)]
          "
        >
          <h1 className="text-xl font-semibold text-[rgb(var(--fg))]">
            Reset link not valid
          </h1>

          <p className="mt-2 text-sm text-[rgb(var(--muted))]">
            This reset link is invalid or expired. Please request a new one.
          </p>

          <div className="mt-5 flex flex-col gap-2">
            <Link
              href="/auth/forgot-password"
              className="
                inline-flex items-center justify-center rounded-md py-2 text-sm font-medium text-white
                bg-[rgb(var(--primary))]
                hover:opacity-90
              "
            >
              Request new reset link
            </Link>

            <Link
              href="/auth/login"
              className="text-center text-xs text-[rgb(var(--muted2))] hover:underline"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus(null);

    if (newPassword.length < 6) {
      setStatus("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setStatus("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      //  Step 2: update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("expired") || msg.includes("invalid")) {
          setStatus("Reset link expired or invalid. Please request a new link.");
        } else {
          setStatus(error.message);
        }
        return;
      }

      setStatus("Password updated successfully. Redirecting to login...");

      // optional: sign out the recovery session after reset
      await supabase.auth.signOut();

      setTimeout(() => router.push("/auth/login"), 1200);
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
          bg-[rgb(var(--card)/0.7)]
          shadow-[0_20px_60px_rgb(var(--shadow)/0.15)]
        "
      >
        <h1 className="text-xl font-semibold text-[rgb(var(--fg))]">
          Set a new password
        </h1>

        <p className="mt-2 text-sm text-[rgb(var(--muted))]">
          Choose a strong password to secure your TutorLink account.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* New password */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[rgb(var(--muted))]">
              New Password
            </label>

            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onKeyUp={(e) => setCapsLockOn(e.getModifierState("CapsLock"))}
                className="
                  w-full rounded-md border px-3 py-2 pr-10 text-sm outline-none
                  border-[rgb(var(--border))]
                  bg-[rgb(var(--card2))]
                  text-[rgb(var(--fg))]
                  focus:border-[rgb(var(--primary))]
                "
                required
                minLength={6}
              />

              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="
                  absolute right-2 top-1/2 -translate-y-1/2
                  text-xs text-[rgb(var(--muted2))]
                  hover:text-[rgb(var(--fg))]
                "
              >
                {showNew ? "Hide" : "Show"}
              </button>
            </div>

            {capsLockOn && (
              <p className="mt-1 text-[0.7rem] text-amber-400">
                Caps Lock is ON
              </p>
            )}

            {newPassword && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded ${
                        strength.level >= i
                          ? strength.label === "Strong"
                            ? "bg-emerald-500"
                            : strength.label === "Medium"
                            ? "bg-amber-400"
                            : "bg-red-400"
                          : "bg-[rgb(var(--border))]"
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-1 text-[0.7rem] text-[rgb(var(--muted2))]">
                  Strength: <span className="font-medium">{strength.label}</span>
                </p>
              </div>
            )}
          </div>

          {/* Confirm */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[rgb(var(--muted))]">
              Confirm Password
            </label>

            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="
                  w-full rounded-md border px-3 py-2 pr-10 text-sm outline-none
                  border-[rgb(var(--border))]
                  bg-[rgb(var(--card2))]
                  text-[rgb(var(--fg))]
                  focus:border-[rgb(var(--primary))]
                "
                required
                minLength={6}
              />

              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="
                  absolute right-2 top-1/2 -translate-y-1/2
                  text-xs text-[rgb(var(--muted2))]
                  hover:text-[rgb(var(--fg))]
                "
              >
                {showConfirm ? "Hide" : "Show"}
              </button>
            </div>

            {confirm.length > 0 && (
              <p
                className={`mt-1 text-[0.7rem] ${
                  match ? "text-emerald-500" : "text-rose-400"
                }`}
              >
                {match ? "Passwords match" : "Passwords do not match"}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="
              w-full rounded-md py-2 text-sm font-medium text-white
              bg-[rgb(var(--primary))]
              transition-all duration-200
              hover:-translate-y-0.5
              hover:shadow-[0_8px_24px_rgb(var(--shadow)/0.35)]
              disabled:opacity-60
            "
          >
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>

        {status && <p className="mt-4 text-xs text-rose-400">{status}</p>}

        <p className="mt-4 text-xs text-[rgb(var(--muted2))]">
          <Link
            href="/auth/login"
            className="text-[rgb(var(--primary))] hover:underline"
          >
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
