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
      detectSessionInUrl: true,
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

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const footer = document.querySelector("footer");
    if (footer) footer.style.display = "none";
    return () => {
      document.body.style.overflow = "";
      const footer = document.querySelector("footer");
      if (footer) footer.style.display = "";
    };
  }, []);

  useEffect(() => {
    let alive = true;
    async function init() {
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
    return () => { alive = false; };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (newPassword.length < 6) { setStatus("Password must be at least 6 characters."); return; }
    if (newPassword !== confirm) { setStatus("Passwords do not match."); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
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
      await supabase.auth.signOut();
      setTimeout(() => router.push("/auth/login"), 1200);
    } catch (err: any) {
      setStatus(err?.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  const isSuccess = status?.toLowerCase().includes("successfully");

  const cardClass = "w-full max-w-md rounded-3xl border p-6";
  const cardStyle = {
    borderColor: "rgb(var(--border))",
    background: "rgb(var(--card) / 0.75)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    boxShadow: "0 24px 64px rgb(var(--shadow) / 0.18), 0 1px 0 rgb(var(--border))",
  };
  const wrapperClass = "flex items-center justify-center px-4 bg-[rgb(var(--bg))] text-[rgb(var(--fg))]";
  const wrapperStyle = { height: "calc(100vh - 56px)" };

  // Invalid/expired link
  if (ready && !hasRecoverySession) {
    return (
      <div className={wrapperClass} style={wrapperStyle}>
        <div className={cardClass} style={cardStyle}>
          <h1 className="text-xl font-semibold text-[rgb(var(--fg))]">Reset link not valid</h1>
          <p className="mt-2 text-sm text-[rgb(var(--muted))]">
            This reset link is invalid or expired. Please request a new one.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Link
              href="/auth/forgot-password"
              className="inline-flex items-center justify-center rounded-xl py-2.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5"
              style={{ background: "rgb(var(--primary))" }}
            >
              Request new reset link
            </Link>
            <Link href="/auth/login" className="text-center text-xs hover:underline" style={{ color: "rgb(var(--muted2))" }}>
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClass} style={wrapperStyle}>
      <div className={cardClass} style={cardStyle}>

        {/* Icon + Heading inline */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
            style={{
              background: "linear-gradient(135deg, rgb(var(--primary) / 0.15), rgb(var(--primary2) / 0.1))",
              border: "1px solid rgb(var(--primary) / 0.2)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-tight" style={{ color: "rgb(var(--fg))" }}>
              Set a new password
            </h1>
            <p className="mt-0.5 text-sm" style={{ color: "rgb(var(--muted))" }}>
              Choose a strong password to secure your TutorLink account.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* New password */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: "rgb(var(--muted))" }}>
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onKeyUp={(e) => setCapsLockOn(e.getModifierState("CapsLock"))}
                className="w-full rounded-xl border px-3.5 py-2.5 pr-16 text-sm outline-none transition-all"
                style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card2))", color: "rgb(var(--fg))" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgb(var(--primary))"; e.currentTarget.style.boxShadow = "0 0 0 3px rgb(var(--primary) / 0.12)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgb(var(--border))"; e.currentTarget.style.boxShadow = "none"; }}
                required minLength={6} placeholder="Min. 6 characters"
              />
              <button type="button" onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-1 text-xs font-semibold transition-colors"
                style={{ color: "rgb(var(--muted2))" }}>
                {showNew ? "Hide" : "Show"}
              </button>
            </div>
            {capsLockOn && <p className="mt-1.5 flex items-center gap-1 text-[0.7rem] text-amber-400">⇪ Caps Lock is ON</p>}
            {newPassword && (
              <div className="mt-2">
                <div className="flex gap-1.5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "rgb(var(--border))" }}>
                      {strength.level >= i && (
                        <div className={`h-full w-full rounded-full ${strength.label === "Strong" ? "bg-emerald-500" : strength.label === "Medium" ? "bg-amber-400" : "bg-red-400"}`} />
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-[0.7rem]" style={{ color: "rgb(var(--muted2))" }}>
                  Strength:{" "}
                  <span className={`font-semibold ${strength.label === "Strong" ? "text-emerald-500" : strength.label === "Medium" ? "text-amber-400" : "text-red-400"}`}>
                    {strength.label}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: "rgb(var(--muted))" }}>
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-xl border px-3.5 py-2.5 pr-16 text-sm outline-none transition-all"
                style={{
                  borderColor: confirm.length > 0 ? (match ? "rgb(16 185 129 / 0.6)" : "rgb(251 113 133 / 0.6)") : "rgb(var(--border))",
                  background: "rgb(var(--card2))",
                  color: "rgb(var(--fg))",
                }}
                onFocus={(e) => { if (!confirm.length) { e.currentTarget.style.borderColor = "rgb(var(--primary))"; e.currentTarget.style.boxShadow = "0 0 0 3px rgb(var(--primary) / 0.12)"; } }}
                onBlur={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                required minLength={6} placeholder="Re-enter password"
              />
              <button type="button" onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-1 text-xs font-semibold transition-colors"
                style={{ color: "rgb(var(--muted2))" }}>
                {showConfirm ? "Hide" : "Show"}
              </button>
            </div>
            {confirm.length > 0 && (
              <p className={`mt-1.5 flex items-center gap-1 text-[0.7rem] font-medium ${match ? "text-emerald-500" : "text-rose-400"}`}>
                {match ? "✓ Passwords match" : "✕ Passwords do not match"}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="relative w-full overflow-hidden rounded-xl py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, rgb(var(--primary)), rgb(var(--primary2)))",
              boxShadow: "0 4px 20px rgb(var(--primary) / 0.3)",
            }}
          >
            {loading ? "Updating..." : "Update Password →"}
          </button>
        </form>

        {/* Status */}
        {status && (
          <div
            className={`mt-3 flex items-start gap-2 rounded-xl px-3.5 py-3 text-xs ${isSuccess ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}
            style={{ border: `1.5px solid ${isSuccess ? "rgb(16 185 129 / 0.3)" : "rgb(251 113 133 / 0.3)"}` }}
          >
            <span className="mt-0.5 flex-shrink-0">{isSuccess ? "✓" : "✕"}</span>
            <span>{status}</span>
          </div>
        )}

        <p className="mt-4 text-xs" style={{ color: "rgb(var(--muted2))" }}>
          <Link href="/auth/login" className="font-medium hover:underline" style={{ color: "rgb(var(--primary))" }}>
            ← Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}