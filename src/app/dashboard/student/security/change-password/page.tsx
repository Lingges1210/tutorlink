"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";

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

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [capsLockOn, setCapsLockOn] = useState(false);

  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);
  const match = confirm.length > 0 && newPassword === confirm;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus(null);

    if (!currentPassword.trim()) {
      setStatus("Current password is required.");
      return;
    }

    if (newPassword.length < 6) {
      setStatus("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirm) {
      setStatus("Passwords do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setStatus("New password must be different from current password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/student/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setStatus(data?.error || "Failed to change password");
        return;
      }

      setStatus("✅ Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err: any) {
      setStatus(err?.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-2 max-w-md px-4">
      <div
        className="
          rounded-3xl border p-6
          border-[rgb(var(--border))]
          bg-[rgb(var(--card)/0.7)]
          shadow-[0_20px_60px_rgb(var(--shadow)/0.15)]
        "
      >
        <h1 className="text-xl font-semibold text-[rgb(var(--fg))]">
          Change Password
        </h1>

        <p className="mt-2 text-sm text-[rgb(var(--muted))]">
          Enter your current password, then set a new one.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Current password */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[rgb(var(--muted))]">
              Current Password
            </label>

            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                onKeyUp={(e) => setCapsLockOn(e.getModifierState("CapsLock"))}
                className="
                  w-full rounded-md border px-3 py-2 pr-10 text-sm outline-none
                  border-[rgb(var(--border))]
                  bg-[rgb(var(--card2))]
                  text-[rgb(var(--fg))]
                  focus:border-[rgb(var(--primary))]
                "
                required
                autoComplete="current-password"
              />

              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="
                  absolute right-2 top-1/2 -translate-y-1/2
                  text-xs text-[rgb(var(--muted2))]
                  hover:text-[rgb(var(--fg))]
                "
              >
                {showCurrent ? "Hide" : "Show"}
              </button>
            </div>

            {capsLockOn && (
              <p className="mt-1 text-[0.7rem] text-amber-400">
                Caps Lock is ON
              </p>
            )}
          </div>

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
                autoComplete="new-password"
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
              Confirm New Password
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
                autoComplete="new-password"
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
            href="/dashboard/student/profile"
            className="text-[rgb(var(--primary))] hover:underline"
          >
            Back to profile
          </Link>
        </p>
      </div>
    </div>
  );
}
