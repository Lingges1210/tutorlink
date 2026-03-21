"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import AuthSplitLayout from "@/components/AuthSplitLayout";

export default function ForgotPasswordPage() {
  const [email, setEmail]               = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [status, setStatus]             = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [loading, setLoading]           = useState(false);
  const [shake, setShake]               = useState(false);
  const [sent, setSent]                 = useState(false);

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 10_000);
    return () => clearTimeout(t);
  }, [status]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setStatus(null);
    setLoading(true);
    try {
      const res  = await fetch("/api/auth/forgot-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatus({ type: "error", msg: data.message || "Failed to send reset link" });
        setShake(true);
        setTimeout(() => setShake(false), 600);
        return;
      }
      setStatus({
        type: "success",
        msg: `Reset link sent to ${email}. Check your inbox.`,
      });
      setSent(true);
      setEmail("");
    } catch (err: any) {
      setStatus({ type: "error", msg: err?.message ?? "Unexpected error" });
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          15%      { transform: translateX(-7px); }
          30%      { transform: translateX(7px); }
          45%      { transform: translateX(-4px); }
          60%      { transform: translateX(4px); }
          75%      { transform: translateX(-2px); }
          90%      { transform: translateX(2px); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes dot-bounce {
          0%,80%,100% { transform: translateY(0);    opacity: 0.45; }
          40%          { transform: translateY(-5px); opacity: 1;    }
        }
        @keyframes orb-drift {
          0%   { transform: translate(0,0)       scale(1);    }
          33%  { transform: translate(10px,-14px) scale(1.05);}
          66%  { transform: translate(-7px,7px)   scale(.97); }
          100% { transform: translate(0,0)       scale(1);    }
        }
        @keyframes orb-drift-2 {
          0%   { transform: translate(0,0)        scale(1);    }
          33%  { transform: translate(-12px,9px)  scale(1.04); }
          66%  { transform: translate(8px,-6px)   scale(.97);  }
          100% { transform: translate(0,0)        scale(1);    }
        }
        @keyframes border-pulse {
          0%,100% { box-shadow: 0 0 0 3px rgb(var(--primary) / .12); }
          50%      { box-shadow: 0 0 0 4px rgb(var(--primary) / .22); }
        }
        @keyframes status-pop {
          0%   { transform: scale(.88) translateY(4px); opacity: 0; }
          60%  { transform: scale(1.03) translateY(0); }
          100% { transform: scale(1)    translateY(0); opacity: 1; }
        }
        @keyframes stagger-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes label-in {
          from { opacity: 0; letter-spacing: .12em; }
          to   { opacity: 1; letter-spacing: .06em; }
        }
        @keyframes check-pop {
          0%   { transform: scale(0) rotate(-15deg); opacity: 0; }
          60%  { transform: scale(1.2) rotate(4deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg);   opacity: 1; }
        }
        @keyframes success-glow {
          0%,100% { box-shadow: 0 2px 4px rgb(0 0 0/.05), 0 8px 24px rgb(0 0 0/.07), inset 0 1px 0 rgb(255 255 255/.07); }
          50%      { box-shadow: 0 2px 4px rgb(0 0 0/.05), 0 20px 50px rgb(16 185 129/.15), inset 0 1px 0 rgb(255 255 255/.09); }
        }

        /* ── form-card: identical to login ── */
        .form-card {
          position: relative; border-radius: 20px;
          background: rgb(var(--card2) / .72);
          backdrop-filter: blur(20px) saturate(1.5);
          -webkit-backdrop-filter: blur(20px) saturate(1.5);
          border: 1.5px solid rgb(var(--border) / .65);
          padding: 28px 28px 24px;
          box-shadow: 0 2px 4px rgb(0 0 0/.05), 0 8px 24px rgb(0 0 0/.07), inset 0 1px 0 rgb(255 255 255/.07);
          transition: border-color .3s ease, box-shadow .35s ease;
        }
        .form-card:focus-within {
          border-color: rgb(var(--primary) / .38);
          box-shadow: 0 2px 4px rgb(0 0 0/.05), 0 20px 50px rgb(var(--primary) / .1), inset 0 1px 0 rgb(255 255 255/.09);
        }
        .form-card.sent {
          animation: success-glow 2.5s ease-in-out infinite;
          border-color: rgb(16 185 129 / .35) !important;
        }

        /* orbs */
        .login-orb-wrap { pointer-events:none; position:absolute; inset:0; overflow:hidden; border-radius:inherit; z-index:0; }
        .login-orb      { position:absolute; border-radius:50%; filter:blur(52px); opacity:0; transition:opacity .7s ease; }
        .login-orb.orb-a{ width:240px;height:240px;background:radial-gradient(circle,rgb(var(--primary)/.26) 0%,transparent 70%);top:-70px;right:-50px;animation:orb-drift 10s ease-in-out infinite; }
        .login-orb.orb-b{ width:170px;height:170px;background:radial-gradient(circle,rgb(var(--primary)/.14) 0%,transparent 70%);bottom:-40px;left:-30px;animation:orb-drift-2 13s ease-in-out infinite; }
        .form-card:focus-within .login-orb,
        .form-card:hover        .login-orb { opacity: 1; }
        .form-card.sent .login-orb.orb-a { background: radial-gradient(circle, rgb(16 185 129 / .22) 0%, transparent 70%); opacity: 1; }
        .form-card.sent .login-orb.orb-b { background: radial-gradient(circle, rgb(16 185 129 / .12) 0%, transparent 70%); opacity: 1; }

        /* form-section */
        .form-section     { display:flex; flex-direction:column; gap:18px; position:relative; z-index:1; }
        .form-section > * { animation: stagger-in .42s ease both; }
        .form-section > *:nth-child(1) { animation-delay: .04s }
        .form-section > *:nth-child(2) { animation-delay: .10s }
        .form-section > *:nth-child(3) { animation-delay: .16s }
        .form-section > *:nth-child(4) { animation-delay: .22s }
        .form-section > *:nth-child(5) { animation-delay: .28s }

        /* input */
        .input-wrapper { display:flex; flex-direction:column; }
        .input-label   {
          display:flex; align-items:center; gap:6px; margin-bottom:7px;
          font-size:.69rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase;
          color:rgb(var(--muted)); transition:color .22s ease; animation:label-in .35s ease both;
        }
        .label-dot {
          width:5px; height:5px; border-radius:50%;
          background:rgb(var(--primary)/.38);
          transition:background .22s, transform .22s, box-shadow .22s; flex-shrink:0;
        }
        .input-wrapper.focused .input-label { color: rgb(var(--primary)); }
        .input-wrapper.focused .label-dot   { background:rgb(var(--primary)); transform:scale(1.6); box-shadow:0 0 0 3px rgb(var(--primary)/.16); }

        .input-field {
          width:100%; border-radius:11px; border:1.5px solid rgb(var(--border));
          padding:11px 14px 11px 40px; font-size:.875rem; outline:none;
          background:rgb(var(--card2)); color:rgb(var(--fg));
          transition:border-color .22s, box-shadow .22s, background .22s; -webkit-appearance:none;
        }
        .input-field:focus { border-color:rgb(var(--primary)); box-shadow:0 0 0 3.5px rgb(var(--primary)/.14); animation:border-pulse 2.5s ease-in-out infinite; }
        .input-field::placeholder { color:rgb(var(--muted2)); opacity:.55; font-style:italic; }
        .input-has-value .input-field:not(:focus) { border-color: rgb(var(--primary)/.28); }
        .input-icon { position:absolute;left:13px;top:50%;transform:translateY(-50%);color:rgb(var(--muted2));pointer-events:none;display:flex; transition:color .22s; }
        .input-wrapper.focused .input-icon { color: rgb(var(--primary)); }

        /* submit button — identical to login .submit-btn */
        .submit-btn {
          position:relative; width:100%; border-radius:12px; padding:12px;
          font-size:.875rem; font-weight:700; color:white; border:none; cursor:pointer;
          overflow:hidden; letter-spacing:.025em;
          background:linear-gradient(135deg,rgb(var(--primary)) 0%,rgb(var(--primary)/.80) 100%);
          box-shadow:0 1px 2px rgb(0 0 0/.10),0 4px 14px rgb(var(--primary)/.30),inset 0 1px 0 rgb(255 255 255/.15);
          transition:transform .18s ease,box-shadow .18s ease,opacity .18s ease;
        }
        .submit-btn::before { content:'';position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.22) 50%,transparent 70%);background-size:200% auto;opacity:0;transition:opacity .2s; }
        .submit-btn::after  { content:'';position:absolute;inset:0;border-radius:inherit;background:linear-gradient(180deg,rgba(255,255,255,.09) 0%,transparent 55%);pointer-events:none; }
        .submit-btn:not(:disabled):hover { transform:translateY(-2px); box-shadow:0 1px 2px rgb(0 0 0/.10),0 14px 36px rgb(var(--primary)/.42),inset 0 1px 0 rgb(255 255 255/.2); }
        .submit-btn:not(:disabled):hover::before { opacity:1; animation:shimmer .85s linear; }
        .submit-btn:not(:disabled):active { transform:translateY(0) scale(.985); box-shadow:0 1px 2px rgb(0 0 0/.08),0 3px 10px rgb(var(--primary)/.22); }
        .submit-btn:disabled { opacity:.5; cursor:not-allowed; }
        .btn-inner { display:flex; align-items:center; justify-content:center; gap:8px; position:relative; z-index:1; }
        .btn-arrow { display:inline-block; transition:transform .2s ease; }
        .submit-btn:not(:disabled):hover .btn-arrow { transform:translateX(4px); }

        /* spinner + dots — identical to login */
        .spinner { width:15px;height:15px;border:2px solid rgba(255,255,255,.28);border-top-color:white;border-radius:50%;animation:spin .65s linear infinite;flex-shrink:0; }
        .loading-dots { display:inline-flex;gap:3px;align-items:center; }
        .loading-dots span { width:4px;height:4px;border-radius:50%;background:currentColor;animation:dot-bounce 1.1s ease infinite; }
        .loading-dots span:nth-child(2) { animation-delay:.15s; }
        .loading-dots span:nth-child(3) { animation-delay:.30s; }

        /* status box — identical to login */
        .status-box { animation:status-pop .38s cubic-bezier(.34,1.56,.64,1) forwards; border-radius:11px; border:1.5px solid; padding:10px 14px; font-size:.75rem; font-weight:500; display:flex; align-items:flex-start; gap:9px; line-height:1.5; }
        .status-box.success { border-color:rgb(16 185 129/.35); background:rgb(16 185 129/.08); color:rgb(16 185 129); }
        .status-box.error   { border-color:rgb(239 68 68/.35);  background:rgb(239 68 68/.08);  color:rgb(215 55 55); }
        .status-icon { width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;font-size:.72rem;font-weight:800;flex-shrink:0;margin-top:1px; }
        .status-box.success .status-icon { background:rgb(16 185 129/.14); animation:check-pop .4s cubic-bezier(.34,1.56,.64,1) both; }
        .status-box.error   .status-icon { background:rgb(239 68 68/.12); }

        /* divider + back link — identical to login */
        .form-divider      { display:flex; align-items:center; gap:10px; }
        .form-divider-line { flex:1; height:1px; background:rgb(var(--border)/.55); border-radius:1px; }
        .form-divider-text { font-size:.64rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:rgb(var(--muted2)); flex-shrink:0; }

        .back-link { color:rgb(var(--primary)); text-decoration:none; font-weight:600; position:relative; transition:opacity .15s; }
        .back-link::after { content:''; position:absolute; bottom:-1px; left:0; width:0; height:1.5px; background:rgb(var(--primary)); border-radius:2px; transition:width .22s ease; }
        .back-link:hover::after { width:100%; }
        .back-link:hover { opacity:.84; }

        .form-shake { animation: shake .55s cubic-bezier(.36,.07,.19,.97) both; }

        /* resend hint */
        .resend-hint { font-size:.72rem; color:rgb(var(--muted2)); text-align:center; margin:0; animation:stagger-in .35s ease both; }
        .resend-btn  { background:none; border:none; cursor:pointer; color:rgb(var(--primary)); font-weight:600; font-size:.72rem; padding:0; position:relative; }
        .resend-btn::after { content:''; position:absolute; bottom:-1px; left:0; width:0; height:1.5px; background:rgb(var(--primary)); border-radius:2px; transition:width .22s ease; }
        .resend-btn:hover::after { width:100%; }
      `}</style>

      <AuthSplitLayout
        title="Reset your password"
        subtitle="Enter your registered USM email and we'll send you a secure reset link."
      >
        {() => (
          <form onSubmit={handleSubmit} noValidate>
            <div className={shake ? "form-shake" : ""}>
              <div className={`form-card${sent ? " sent" : ""}`}>

                {/* Ambient orbs — identical to login */}
                <div className="login-orb-wrap" aria-hidden="true">
                  <div className="login-orb orb-a" />
                  <div className="login-orb orb-b" />
                </div>

                <div className="form-section">

                  {/* Email input */}
                  <div
                    className={[
                      "input-wrapper",
                      emailFocused ? "focused"         : "",
                      email        ? "input-has-value" : "",
                    ].join(" ")}
                  >
                    <label className="input-label" htmlFor="fp-email">
                      <span className="label-dot" />
                      Email address
                    </label>
                    <div style={{ position: "relative" }}>
                      <span className="input-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="1.75"
                          strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="4" width="20" height="16" rx="2"/>
                          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                        </svg>
                      </span>
                      <input
                        id="fp-email"
                        type="email"
                        required
                        autoComplete="email"
                        className="input-field"
                        placeholder="yourid@student.usm.my"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); if (sent) setSent(false); }}
                        onFocus={() => setEmailFocused(true)}
                        onBlur={() => setEmailFocused(false)}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={loading || !email}
                  >
                    <span className="btn-inner">
                      {loading && <span className="spinner" />}
                      {loading ? (
                        <>
                          Sending link
                          <span className="loading-dots">
                            <span /><span /><span />
                          </span>
                        </>
                      ) : (
                        <>
                          {sent ? "Resend reset link" : "Send reset link"}
                          <span className="btn-arrow">→</span>
                        </>
                      )}
                    </span>
                  </button>

                  {/* Status message */}
                  {status && (
                    <div
                      className={`status-box ${status.type}`}
                      role="alert"
                      aria-live="polite"
                    >
                      <span className="status-icon">
                        {status.type === "success" ? "✓" : "✕"}
                      </span>
                      <span>{status.msg}</span>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="form-divider" aria-hidden="true">
                    <span className="form-divider-line" />
                    <span className="form-divider-text">or</span>
                    <span className="form-divider-line" />
                  </div>

                  {/* Footer */}
                  <p style={{ fontSize: "0.75rem", color: "rgb(var(--muted2))", textAlign: "center", margin: 0 }}>
                    Remembered your password?{" "}
                    <Link href="/auth/login" className="back-link">
                      Back to login
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