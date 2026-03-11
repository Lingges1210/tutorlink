"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthSplitLayout from "@/components/AuthSplitLayout";
import { LoginAnimationHandle } from "@/components/LoginAnimation";
import StarBackground from "@/components/StarBackground";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(null), 10_000);
    return () => clearTimeout(timer);
  }, [status]);

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
        const msg = data?.message || "Login failed";
        setStatus(msg);
        setShake(true);
        setTimeout(() => setShake(false), 600);
        animation?.fail();
        return;
      }

      let targetPath = "/dashboard/student";

      try {
        const rolesRes = await fetch("/api/me/roles", { cache: "no-store" });
        const rolesData = await rolesRes.json().catch(() => null);
        const roles: string[] = rolesData?.roles ?? [];

        if (roles.includes("ADMIN")) {
          targetPath = "/admin";
        } else {
          targetPath = "/dashboard/student";
        }
      } catch {}

      setStatus("Login successful. Redirecting...");
      animation?.success();

      setTimeout(() => {
        window.location.href = targetPath;
      }, 800);
    } catch (err: any) {
      setStatus(err?.message ?? "Unexpected error");
      setShake(true);
      setTimeout(() => setShake(false), 600);
      animation?.fail();
    } finally {
      setLoading(false);
    }
  }

  const isSuccess = status?.toLowerCase().includes("successful");

  return (
    <>
      <StarBackground />

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-6px); }
          30% { transform: translateX(6px); }
          45% { transform: translateX(-4px); }
          60% { transform: translateX(4px); }
          75% { transform: translateX(-2px); }
          90% { transform: translateX(2px); }
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgb(var(--primary) / 0.35); }
          70%  { box-shadow: 0 0 0 6px rgb(var(--primary) / 0); }
          100% { box-shadow: 0 0 0 0 rgb(var(--primary) / 0); }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        @keyframes dot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40%            { transform: translateY(-4px); opacity: 1; }
        }

        .form-shake {
          animation: shake 0.55s cubic-bezier(.36,.07,.19,.97) both;
        }

        .status-enter {
          animation: slideDown 0.3s ease forwards;
        }

        .input-field {
          width: 100%;
          border-radius: 10px;
          border: 1.5px solid rgb(var(--border));
          padding: 10px 14px;
          font-size: 0.875rem;
          outline: none;
          background: rgb(var(--card2));
          color: rgb(var(--fg));
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .input-field:focus {
          border-color: rgb(var(--primary));
          box-shadow: 0 0 0 3px rgb(var(--primary) / 0.12);
          animation: pulse-ring 0.5s ease-out;
        }

        .input-field::placeholder {
          color: rgb(var(--muted2));
          opacity: 0.7;
        }

        .input-label {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 6px;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: rgb(var(--muted));
          transition: color 0.2s;
        }

        .input-label .label-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: rgb(var(--primary) / 0.5);
          transition: background 0.2s, transform 0.2s;
          flex-shrink: 0;
        }

        .input-wrapper.focused .input-label {
          color: rgb(var(--primary));
        }

        .input-wrapper.focused .label-dot {
          background: rgb(var(--primary));
          transform: scale(1.4);
        }

        .submit-btn {
          position: relative;
          width: 100%;
          border-radius: 10px;
          padding: 11px;
          font-size: 0.875rem;
          font-weight: 600;
          color: white;
          border: none;
          cursor: pointer;
          overflow: hidden;
          background: rgb(var(--primary));
          transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
          letter-spacing: 0.02em;
        }

        .submit-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            105deg,
            transparent 40%,
            rgba(255,255,255,0.18) 50%,
            transparent 60%
          );
          background-size: 200% auto;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .submit-btn:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgb(var(--primary) / 0.38);
        }

        .submit-btn:not(:disabled):hover::before {
          opacity: 1;
          animation: shimmer 0.9s linear;
        }

        .submit-btn:not(:disabled):active {
          transform: translateY(0px);
          box-shadow: 0 4px 12px rgb(var(--primary) / 0.25);
        }

        .submit-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .btn-inner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          position: relative;
          z-index: 1;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        .loading-dots {
          display: inline-flex;
          gap: 3px;
          align-items: center;
        }

        .loading-dots span {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: currentColor;
          animation: dot-bounce 1.2s ease infinite;
        }
        .loading-dots span:nth-child(2) { animation-delay: 0.15s; }
        .loading-dots span:nth-child(3) { animation-delay: 0.3s; }

        .status-box {
          animation: slideDown 0.3s ease forwards;
          border-radius: 10px;
          border: 1.5px solid;
          padding: 10px 12px;
          font-size: 0.75rem;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          line-height: 1.4;
        }

        .status-box.success {
          border-color: rgb(16 185 129 / 0.35);
          background: rgb(16 185 129 / 0.08);
          color: rgb(16 185 129);
        }

        .status-box.error {
          border-color: rgb(239 68 68 / 0.35);
          background: rgb(239 68 68 / 0.08);
          color: rgb(239 68 68);
        }

        .status-icon {
          font-size: 0.85rem;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .caps-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 5px;
          font-size: 0.68rem;
          font-weight: 500;
          color: rgb(245 158 11);
          background: rgb(245 158 11 / 0.1);
          border: 1px solid rgb(245 158 11 / 0.25);
          border-radius: 5px;
          padding: 2px 7px;
          animation: fadeIn 0.2s ease;
        }

        .forgot-link {
          font-size: 0.75rem;
          color: rgb(var(--primary));
          text-decoration: none;
          position: relative;
          transition: opacity 0.15s;
        }

        .forgot-link::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          width: 0;
          height: 1px;
          background: rgb(var(--primary));
          transition: width 0.2s ease;
        }

        .forgot-link:hover::after { width: 100%; }
        .forgot-link:hover { opacity: 0.85; }

        .register-link {
          color: rgb(var(--primary));
          text-decoration: none;
          font-weight: 500;
          position: relative;
        }

        .register-link::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          width: 0;
          height: 1px;
          background: rgb(var(--primary));
          transition: width 0.2s ease;
        }

        .register-link:hover::after { width: 100%; }

        .divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 2px 0;
        }

        .divider-line {
          flex: 1;
          height: 1px;
          background: rgb(var(--border));
        }

        .password-toggle {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          padding: 3px 5px;
          border-radius: 5px;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: rgb(var(--muted2));
          transition: color 0.15s, background 0.15s;
        }

        .password-toggle:hover {
          color: rgb(var(--fg));
          background: rgb(var(--border) / 0.5);
        }

        .form-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
          animation: fadeIn 0.4s ease;
        }

        .input-has-value .input-field {
          border-color: rgb(var(--primary) / 0.4);
        }
      `}</style>

      <AuthSplitLayout
        title="Sign in to TutorLink"
        subtitle="Use your registered USM email & password to continue."
      >
        {(animation) => (
          <form onSubmit={(e) => handleSubmit(e, animation)}>
          <div className={shake ? "form-shake" : ""}>
            <div className="form-section">
              {/* Email */}
              <div
                className={[
                  "input-wrapper",
                  emailFocused ? "focused" : "",
                  email ? "input-has-value" : "",
                ].join(" ")}
              >
                <label className="input-label">
                  <span className="label-dot" />
                  Email address
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  className="input-field"
                  placeholder="yourid@student.usm.my"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => {
                    setEmailFocused(true);
                    animation?.setChecking(true);
                  }}
                  onBlur={() => {
                    setEmailFocused(false);
                    animation?.setChecking(false);
                  }}
                  required
                />
              </div>

              {/* Password */}
              <div
                className={[
                  "input-wrapper",
                  passwordFocused ? "focused" : "",
                  password ? "input-has-value" : "",
                ].join(" ")}
              >
                <label className="input-label">
                  <span className="label-dot" />
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="input-field"
                    style={{ paddingRight: "52px" }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => {
                      setPasswordFocused(true);
                      animation?.setHandsUp(true);
                    }}
                    onBlur={() => {
                      setPasswordFocused(false);
                      animation?.setHandsUp(false);
                    }}
                    onKeyDown={(e) => setCapsLockOn(e.getModifierState("CapsLock"))}
                    onKeyUp={(e) => setCapsLockOn(e.getModifierState("CapsLock"))}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                {capsLockOn && (
                  <span className="caps-badge">
                    ⇪ Caps Lock is ON
                  </span>
                )}
              </div>

              {/* Forgot password */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "-4px" }}>
                <Link href="/auth/forgot-password" className="forgot-link">
                  Forgot password?
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="submit-btn"
                disabled={loading || !email || !password}
              >
                <span className="btn-inner">
                  {loading && <span className="spinner" />}
                  {loading ? (
                    <>
                      Signing in
                      <span className="loading-dots">
                        <span /><span /><span />
                      </span>
                    </>
                  ) : (
                    "Continue →"
                  )}
                </span>
              </button>

              {/* Status */}
              {status && (
                <div
                  className={["status-box", isSuccess ? "success" : "error"].join(" ")}
                  role="alert"
                  aria-live="polite"
                >
                  <span className="status-icon">{isSuccess ? "✓" : "✕"}</span>
                  <span>{status}</span>
                </div>
              )}

              {/* Register */}
              <p style={{ fontSize: "0.75rem", color: "rgb(var(--muted2))", paddingTop: "4px", textAlign: "center" }}>
                Don&apos;t have an account?{" "}
                <Link href="/auth/register" className="register-link">
                  Register here
                </Link>
              </p>
            </div>
          </div>
          </form>
        )}
      </AuthSplitLayout>
    </>
  );
}