"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatus(data.message || "Failed to send reset link");
        return;
      }

      setStatus(
        "If an account exists with this email, a reset link has been sent."
      );
      setEmail("");
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
          Reset your password
        </h1>

        <p className="mt-2 text-sm text-[rgb(var(--muted))]">
          Enter your registered USM email. We’ll send you a password reset link.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[rgb(var(--muted))]">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="yourid@student.usm.my"
              className="
                w-full rounded-md border px-3 py-2 text-sm outline-none
                border-[rgb(var(--border))]
                bg-[rgb(var(--card2))]
                text-[rgb(var(--fg))]
                focus:border-[rgb(var(--primary))]
              "
            />
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
            {loading ? "Sending link..." : "Send reset link"}
          </button>
        </form>

        {status && (
          <p className="mt-4 text-xs text-amber-400">{status}</p>
        )}

        <p className="mt-4 text-xs text-[rgb(var(--muted2))]">
          Remembered your password?{" "}
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
