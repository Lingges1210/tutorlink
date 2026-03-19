"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthSplitLayout from "@/components/AuthSplitLayout";
import { LoginAnimationHandle } from "@/components/LoginAnimation";

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

      let data:
        | {
            success?: boolean;
            message?: string;
            user?: { role?: string };
          }
        | null = null;

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

      const redirectTo =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("redirect")
          : null;

      const fallbackPath =
        data?.user?.role === "ADMIN" ? "/admin" : "/dashboard/student";

      const targetPath =
        redirectTo && redirectTo.startsWith("/") ? redirectTo : fallbackPath;

      setStatus("Login successful. Redirecting...");
      animation?.success();

      router.push(targetPath);
      return;
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : "Unexpected error");
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
      <style>{`
        /* ── Keyframes ── */
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          15%      { transform: translateX(-7px); }
          30%      { transform: translateX(7px); }
          45%      { transform: translateX(-4px); }
          60%      { transform: translateX(4px); }
          75%      { transform: translateX(-2px); }
          90%      { transform: translateX(2px); }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }

        @keyframes dot-bounce {
          0%,80%,100% { transform: translateY(0);    opacity: 0.45; }
          40%          { transform: translateY(-5px); opacity: 1; }
        }

        @keyframes orb-drift {
          0%   { transform: translate(0,0)      scale(1); }
          33%  { transform: translate(10px,-14px) scale(1.05); }
          66%  { transform: translate(-7px, 7px) scale(0.97); }
          100% { transform: translate(0,0)      scale(1); }
        }

        @keyframes orb-drift-2 {
          0%   { transform: translate(0,0)       scale(1); }
          33%  { transform: translate(-12px, 9px) scale(1.04); }
          66%  { transform: translate(8px,-6px)   scale(0.97); }
          100% { transform: translate(0,0)       scale(1); }
        }

        @keyframes border-pulse {
          0%,100% { box-shadow: 0 0 0 3px rgb(var(--primary) / 0.12); }
          50%      { box-shadow: 0 0 0 4px rgb(var(--primary) / 0.22); }
        }

        @keyframes status-pop {
          0%   { transform: scale(0.88) translateY(4px); opacity: 0; }
          60%  { transform: scale(1.03) translateY(0); }
          100% { transform: scale(1)    translateY(0); opacity: 1; }
        }

        @keyframes stagger-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes label-in {
          from { opacity: 0; letter-spacing: 0.12em; }
          to   { opacity: 1; letter-spacing: 0.06em; }
        }

        /* ── Shake wrapper ── */
        .form-shake {
          animation: shake 0.55s cubic-bezier(.36,.07,.19,.97) both;
        }

        /* ── Ambient orbs ── */
        .login-orb-wrap {
          pointer-events: none;
          position: absolute;
          inset: 0;
          overflow: hidden;
          border-radius: inherit;
          z-index: 0;
        }

        .login-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(52px);
          opacity: 0;
          transition: opacity 0.7s ease;
        }

        .login-orb.orb-a {
          width: 240px; height: 240px;
          background: radial-gradient(circle, rgb(var(--primary) / 0.26) 0%, transparent 70%);
          top: -70px; right: -50px;
          animation: orb-drift 10s ease-in-out infinite;
        }

        .login-orb.orb-b {
          width: 170px; height: 170px;
          background: radial-gradient(circle, rgb(var(--primary) / 0.14) 0%, transparent 70%);
          bottom: -40px; left: -30px;
          animation: orb-drift-2 13s ease-in-out infinite;
        }

        .form-card:focus-within .login-orb { opacity: 1; }
        .form-card:hover        .login-orb { opacity: 0.7; }

        /* ── Card ── */
        .form-card {
          position: relative;
          border-radius: 20px;
          background: rgb(var(--card2) / 0.72);
          backdrop-filter: blur(20px) saturate(1.5);
          -webkit-backdrop-filter: blur(20px) saturate(1.5);
          border: 1.5px solid rgb(var(--border) / 0.65);
          padding: 28px 28px 24px;
          box-shadow:
            0 2px 4px rgb(0 0 0 / 0.05),
            0 8px 24px rgb(0 0 0 / 0.07),
            inset 0 1px 0 rgb(255 255 255 / 0.07);
          transition: border-color 0.3s ease, box-shadow 0.35s ease;
        }

        .form-card:focus-within {
          border-color: rgb(var(--primary) / 0.38);
          box-shadow:
            0 2px 4px rgb(0 0 0 / 0.05),
            0 20px 50px rgb(var(--primary) / 0.1),
            inset 0 1px 0 rgb(255 255 255 / 0.09);
        }

        /* ── Form section with stagger ── */
        .form-section {
          display: flex;
          flex-direction: column;
          gap: 18px;
          position: relative;
          z-index: 1;
        }

        .form-section > * {
          animation: stagger-in 0.42s ease both;
        }
        .form-section > *:nth-child(1) { animation-delay: 0.04s; }
        .form-section > *:nth-child(2) { animation-delay: 0.10s; }
        .form-section > *:nth-child(3) { animation-delay: 0.16s; }
        .form-section > *:nth-child(4) { animation-delay: 0.22s; }
        .form-section > *:nth-child(5) { animation-delay: 0.28s; }
        .form-section > *:nth-child(6) { animation-delay: 0.34s; }
        .form-section > *:nth-child(7) { animation-delay: 0.40s; }

        /* ── Input wrapper ── */
        .input-wrapper { display: flex; flex-direction: column; }

        .input-label {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 7px;
          font-size: 0.69rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: rgb(var(--muted));
          transition: color 0.22s ease;
          animation: label-in 0.35s ease both;
        }

        .label-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: rgb(var(--primary) / 0.38);
          transition: background 0.22s, transform 0.22s, box-shadow 0.22s;
          flex-shrink: 0;
        }

        .input-wrapper.focused .input-label { color: rgb(var(--primary)); }
        .input-wrapper.focused .label-dot {
          background: rgb(var(--primary));
          transform: scale(1.6);
          box-shadow: 0 0 0 3px rgb(var(--primary) / 0.16);
        }

        /* ── Input field ── */
        .input-field {
          width: 100%;
          border-radius: 11px;
          border: 1.5px solid rgb(var(--border));
          padding: 11px 14px;
          font-size: 0.875rem;
          outline: none;
          background: rgb(var(--card2));
          color: rgb(var(--fg));
          transition: border-color 0.22s, box-shadow 0.22s, background 0.22s;
          -webkit-appearance: none;
        }

        .input-field:focus {
          border-color: rgb(var(--primary));
          box-shadow: 0 0 0 3.5px rgb(var(--primary) / 0.14);
          animation: border-pulse 2.5s ease-in-out infinite;
        }

        .input-field::placeholder {
          color: rgb(var(--muted2));
          opacity: 0.55;
          font-style: italic;
        }

        .input-has-value .input-field:not(:focus) {
          border-color: rgb(var(--primary) / 0.28);
        }

        /* ── Password toggle ── */
        .password-toggle {
          position: absolute;
          right: 10px; top: 50%;
          transform: translateY(-50%);
          background: none;
          border: 1px solid transparent;
          cursor: pointer;
          padding: 3px 7px;
          border-radius: 6px;
          font-size: 0.67rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: rgb(var(--muted2));
          transition: color 0.15s, background 0.15s, border-color 0.15s;
        }

        .password-toggle:hover {
          color: rgb(var(--primary));
          background: rgb(var(--primary) / 0.08);
          border-color: rgb(var(--primary) / 0.2);
        }

        /* ── Caps lock ── */
        .caps-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-top: 6px;
          font-size: 0.67rem;
          font-weight: 600;
          color: rgb(245 158 11);
          background: rgb(245 158 11 / 0.09);
          border: 1px solid rgb(245 158 11 / 0.28);
          border-radius: 6px;
          padding: 3px 8px;
          animation: stagger-in 0.2s ease;
          width: fit-content;
        }

        /* ── Forgot row ── */
        .forgot-row {
          display: flex;
          justify-content: flex-end;
          margin-top: -4px;
        }

        .forgot-link {
          font-size: 0.74rem;
          color: rgb(var(--primary));
          text-decoration: none;
          font-weight: 500;
          position: relative;
          transition: opacity 0.15s;
        }

        .forgot-link::after {
          content: '';
          position: absolute;
          bottom: -1px; left: 0;
          width: 0; height: 1.5px;
          background: rgb(var(--primary));
          border-radius: 2px;
          transition: width 0.22s ease;
        }

        .forgot-link:hover::after { width: 100%; }
        .forgot-link:hover { opacity: 0.82; }

        /* ── Submit button ── */
        .submit-btn {
          position: relative;
          width: 100%;
          border-radius: 12px;
          padding: 12px;
          font-size: 0.875rem;
          font-weight: 700;
          color: white;
          border: none;
          cursor: pointer;
          overflow: hidden;
          letter-spacing: 0.025em;
          background: linear-gradient(
            135deg,
            rgb(var(--primary)) 0%,
            rgb(var(--primary) / 0.80) 100%
          );
          box-shadow:
            0 1px 2px rgb(0 0 0 / 0.10),
            0 4px 14px rgb(var(--primary) / 0.30),
            inset 0 1px 0 rgb(255 255 255 / 0.15);
          transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
        }

        /* Shimmer sweep */
        .submit-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            110deg,
            transparent 30%,
            rgba(255,255,255,0.22) 50%,
            transparent 70%
          );
          background-size: 200% auto;
          opacity: 0;
          transition: opacity 0.2s;
        }

        /* Top gloss */
        .submit-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(180deg, rgba(255,255,255,0.09) 0%, transparent 55%);
          pointer-events: none;
        }

        .submit-btn:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow:
            0 1px 2px rgb(0 0 0 / 0.10),
            0 14px 36px rgb(var(--primary) / 0.42),
            inset 0 1px 0 rgb(255 255 255 / 0.2);
        }

        .submit-btn:not(:disabled):hover::before {
          opacity: 1;
          animation: shimmer 0.85s linear;
        }

        .submit-btn:not(:disabled):active {
          transform: translateY(0) scale(0.985);
          box-shadow:
            0 1px 2px rgb(0 0 0 / 0.08),
            0 3px 10px rgb(var(--primary) / 0.22);
        }

        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .btn-inner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          position: relative;
          z-index: 1;
        }

        .btn-arrow {
          display: inline-block;
          transition: transform 0.2s ease;
        }

        .submit-btn:not(:disabled):hover .btn-arrow {
          transform: translateX(4px);
        }

        /* ── Spinner ── */
        .spinner {
          width: 15px; height: 15px;
          border: 2px solid rgba(255,255,255,0.28);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.65s linear infinite;
          flex-shrink: 0;
        }

        /* ── Loading dots ── */
        .loading-dots {
          display: inline-flex;
          gap: 3px;
          align-items: center;
        }

        .loading-dots span {
          width: 4px; height: 4px;
          border-radius: 50%;
          background: currentColor;
          animation: dot-bounce 1.1s ease infinite;
        }
        .loading-dots span:nth-child(2) { animation-delay: 0.15s; }
        .loading-dots span:nth-child(3) { animation-delay: 0.30s; }

        /* ── Status box ── */
        .status-box {
          animation: status-pop 0.38s cubic-bezier(0.34,1.56,0.64,1) forwards;
          border-radius: 11px;
          border: 1.5px solid;
          padding: 10px 14px;
          font-size: 0.75rem;
          font-weight: 500;
          display: flex;
          align-items: flex-start;
          gap: 9px;
          line-height: 1.5;
        }

        .status-box.success {
          border-color: rgb(16 185 129 / 0.35);
          background: rgb(16 185 129 / 0.08);
          color: rgb(16 185 129);
        }

        .status-box.error {
          border-color: rgb(239 68 68 / 0.35);
          background: rgb(239 68 68 / 0.08);
          color: rgb(215 55 55);
        }

        .status-icon {
          width: 18px; height: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-size: 0.72rem;
          font-weight: 800;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .status-box.success .status-icon { background: rgb(16 185 129 / 0.14); }
        .status-box.error   .status-icon { background: rgb(239 68 68 / 0.12); }

        /* ── Divider ── */
        .form-divider {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .form-divider-line {
          flex: 1; height: 1px;
          background: rgb(var(--border) / 0.55);
          border-radius: 1px;
        }

        .form-divider-text {
          font-size: 0.64rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgb(var(--muted2));
          flex-shrink: 0;
        }

        /* ── Register link ── */
        .register-link {
          color: rgb(var(--primary));
          text-decoration: none;
          font-weight: 600;
          position: relative;
          transition: opacity 0.15s;
        }

        .register-link::after {
          content: '';
          position: absolute;
          bottom: -1px; left: 0;
          width: 0; height: 1.5px;
          background: rgb(var(--primary));
          border-radius: 2px;
          transition: width 0.22s ease;
        }

        .register-link:hover::after { width: 100%; }
        .register-link:hover { opacity: 0.84; }
      `}</style>

      <AuthSplitLayout
        title="Sign in to TutorLink"
        subtitle="Use your registered USM email & password to continue."
      >
        {(animation) => (
          <form onSubmit={(e) => handleSubmit(e, animation)} noValidate>
            <div className={shake ? "form-shake" : ""}>

              <div className="form-card">
                {/* Ambient orbs */}
                <div className="login-orb-wrap" aria-hidden="true">
                  <div className="login-orb orb-a" />
                  <div className="login-orb orb-b" />
                </div>

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
                        style={{ paddingRight: "58px" }}
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
                        className="password-toggle"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>

                    {capsLockOn && (
                      <span className="caps-badge">⇪ Caps Lock is ON</span>
                    )}
                  </div>

                  {/* Forgot */}
                  <div className="forgot-row">
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
                        <>
                          Continue
                          <span className="btn-arrow">→</span>
                        </>
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

                  {/* Divider + Register */}
                  <div className="form-divider" aria-hidden="true">
                    <span className="form-divider-line" />
                    <span className="form-divider-text">or</span>
                    <span className="form-divider-line" />
                  </div>

                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "rgb(var(--muted2))",
                      textAlign: "center",
                      margin: 0,
                    }}
                  >
                    Don&apos;t have an account?{" "}
                    <Link href="/auth/register" className="register-link">
                      Register here
                    </Link>
                  </p>

                </div>
              </div>
            </div>
          </form>
        )}
      </AuthSplitLayout>
    </>
  );
}