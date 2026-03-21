"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import AuthSplitLayout from "@/components/AuthSplitLayout";

const passwordRules = [
  { label: "At least 6 characters",        test: (p: string) => p.length >= 6 },
  { label: "One uppercase letter (A–Z)",   test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number (0–9)",             test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character (!@#…)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 6)        score++;
  if (password.length >= 10)       score++;
  if (/[A-Z]/.test(password))      score++;
  if (/[0-9]/.test(password))      score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { label: "Weak",   level: 1 };
  if (score <= 3) return { label: "Medium", level: 2 };
  return              { label: "Strong", level: 3 };
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);

export default function ResetPasswordPage() {
  const router = useRouter();

  const [ready, setReady]                       = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [newPassword, setNewPassword]           = useState("");
  const [confirm, setConfirm]                   = useState("");
  const [showNew, setShowNew]                   = useState(false);
  const [showConfirm, setShowConfirm]           = useState(false);
  const [capsLockOn, setCapsLockOn]             = useState(false);
  const [newFocused, setNewFocused]             = useState(false);
  const [confirmFocused, setConfirmFocused]     = useState(false);
  const [status, setStatus]                     = useState<string | null>(null);
  const [loading, setLoading]                   = useState(false);
  const [shake, setShake]                       = useState(false);

  const strength       = useMemo(() => getPasswordStrength(newPassword), [newPassword]);
  const match          = confirm.length > 0 && newPassword === confirm;
  const allRulesPassed = newPassword.length > 0 && passwordRules.every((r) => r.test(newPassword));

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
      setHasRecoverySession(!error && Boolean(data.session));
      setReady(true);
    }
    init();
    return () => { alive = false; };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus(null);
    const failedRule = passwordRules.find((r) => !r.test(newPassword));
    if (failedRule) {
      setStatus(`Password must include: ${failedRule.label.toLowerCase()}.`);
      triggerShake(); return;
    }
    if (newPassword !== confirm) {
      setStatus("Passwords do not match.");
      triggerShake(); return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        const msg = error.message.toLowerCase();
        setStatus(
          msg.includes("expired") || msg.includes("invalid")
            ? "Reset link expired or invalid. Please request a new link."
            : error.message
        );
        triggerShake(); return;
      }
      setStatus("Password updated successfully. Redirecting to login...");
      await supabase.auth.signOut();
      setTimeout(() => router.push("/auth/login"), 1200);
    } catch (err: any) {
      setStatus(err?.message ?? "Unexpected error");
      triggerShake();
    } finally {
      setLoading(false);
    }
  }

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  }

  const isSuccess = status?.toLowerCase().includes("successfully");

  /* ── Invalid / expired session screen ── */
  if (ready && !hasRecoverySession) {
    return (
      <AuthSplitLayout
        title="Link not valid"
        subtitle="This reset link is invalid or has expired."
      >
        {() => (
          <div className="form-card">
            <div className="login-orb-wrap" aria-hidden="true">
              <div className="login-orb orb-a" />
              <div className="login-orb orb-b" />
            </div>
            <div className="form-section">
              <div
                className="status-box error"
                role="alert"
              >
                <span className="status-icon">✕</span>
                <span>This reset link is invalid or expired. Please request a new one.</span>
              </div>
              <Link href="/auth/forgot-password" className="submit-btn" style={{ textDecoration: "none", display: "block", textAlign: "center" }}>
                <span className="btn-inner">
                  Request new reset link <span className="btn-arrow">→</span>
                </span>
              </Link>
              <div className="form-divider" aria-hidden="true">
                <span className="form-divider-line" />
                <span className="form-divider-text">or</span>
                <span className="form-divider-line" />
              </div>
              <p style={{ fontSize: "0.75rem", color: "rgb(var(--muted2))", textAlign: "center", margin: 0 }}>
                <Link href="/auth/login" className="back-link">Back to login</Link>
              </p>
            </div>
          </div>
        )}
      </AuthSplitLayout>
    );
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
        @keyframes strength-fill {
          from { width: 0; }
          to   { width: 100%; }
        }
        @keyframes check-pop {
          0%   { transform: scale(0) rotate(-15deg); opacity: 0; }
          60%  { transform: scale(1.2) rotate(4deg); opacity: 1; }
          100% { transform: scale(1)  rotate(0deg);  opacity: 1; }
        }

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

        .login-orb-wrap { pointer-events:none; position:absolute; inset:0; overflow:hidden; border-radius:inherit; z-index:0; }
        .login-orb      { position:absolute; border-radius:50%; filter:blur(52px); opacity:0; transition:opacity .7s ease; }
        .login-orb.orb-a{ width:240px;height:240px;background:radial-gradient(circle,rgb(var(--primary)/.26) 0%,transparent 70%);top:-70px;right:-50px;animation:orb-drift 10s ease-in-out infinite; }
        .login-orb.orb-b{ width:170px;height:170px;background:radial-gradient(circle,rgb(var(--primary)/.14) 0%,transparent 70%);bottom:-40px;left:-30px;animation:orb-drift-2 13s ease-in-out infinite; }
        .form-card:focus-within .login-orb,
        .form-card:hover        .login-orb { opacity: 1; }

        .form-section     { display:flex; flex-direction:column; gap:18px; position:relative; z-index:1; }
        .form-section > * { animation: stagger-in .42s ease both; }
        .form-section > *:nth-child(1) { animation-delay:.04s }
        .form-section > *:nth-child(2) { animation-delay:.10s }
        .form-section > *:nth-child(3) { animation-delay:.16s }
        .form-section > *:nth-child(4) { animation-delay:.22s }
        .form-section > *:nth-child(5) { animation-delay:.28s }
        .form-section > *:nth-child(6) { animation-delay:.34s }

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
          padding:11px 58px 11px 14px; font-size:.875rem; outline:none;
          background:rgb(var(--card2)); color:rgb(var(--fg));
          transition:border-color .22s, box-shadow .22s, background .22s; -webkit-appearance:none;
        }
        .input-field:focus { border-color:rgb(var(--primary)); box-shadow:0 0 0 3.5px rgb(var(--primary)/.14); animation:border-pulse 2.5s ease-in-out infinite; }
        .input-field::placeholder { color:rgb(var(--muted2)); opacity:.55; font-style:italic; }
        .input-field.match    { border-color: rgb(16 185 129 / .55); }
        .input-field.mismatch { border-color: rgb(239 68 68 / .55); }

        .password-toggle {
          position:absolute; right:10px; top:50%; transform:translateY(-50%);
          background:none; border:1px solid transparent; cursor:pointer;
          padding:3px 7px; border-radius:6px;
          font-size:.67rem; font-weight:700; letter-spacing:.05em; text-transform:uppercase;
          color:rgb(var(--muted2)); transition:color .15s, background .15s, border-color .15s;
        }
        .password-toggle:hover { color:rgb(var(--primary)); background:rgb(var(--primary)/.08); border-color:rgb(var(--primary)/.2); }

        .caps-badge { display:inline-flex; align-items:center; gap:5px; margin-top:6px; font-size:.67rem; font-weight:600; color:rgb(245 158 11); background:rgb(245 158 11/.09); border:1px solid rgb(245 158 11/.28); border-radius:6px; padding:3px 8px; animation:stagger-in .2s ease; width:fit-content; }

        /* strength bar */
        .strength-bars { display:flex; gap:6px; margin-top:8px; }
        .strength-bar  { height:4px; flex:1; border-radius:99px; background:rgb(var(--border)); overflow:hidden; }
        .strength-fill { height:100%; border-radius:99px; animation:strength-fill .35s ease both; }
        .strength-weak   { background: rgb(239 68 68); }
        .strength-medium { background: rgb(245 158 11); }
        .strength-strong { background: rgb(16 185 129); }
        .strength-label  { margin-top:5px; font-size:.68rem; color:rgb(var(--muted2)); }
        .strength-label span { font-weight:700; }
        .strength-label .weak   { color: rgb(239 68 68); }
        .strength-label .medium { color: rgb(245 158 11); }
        .strength-label .strong { color: rgb(16 185 129); }

        /* password rules list */
        @keyframes rule-in {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .rules-list { display:flex; flex-direction:column; gap:5px; margin-top:10px; padding:10px 12px; border-radius:10px; background:rgb(var(--primary)/.05); border:1px solid rgb(var(--border)/.5); }
        .rule-row   { display:flex; align-items:center; gap:7px; font-size:.68rem; font-weight:500; animation:rule-in .25s ease both; }
        .rule-row:nth-child(1){ animation-delay:.02s }
        .rule-row:nth-child(2){ animation-delay:.06s }
        .rule-row:nth-child(3){ animation-delay:.10s }
        .rule-row:nth-child(4){ animation-delay:.14s }
        .rule-icon  { width:14px; height:14px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:.6rem; font-weight:800; flex-shrink:0; transition:background .2s, color .2s; }
        .rule-icon.pass { background:rgb(16 185 129/.15); color:rgb(16 185 129); animation:check-pop .3s cubic-bezier(.34,1.56,.64,1) both; }
        .rule-icon.fail { background:rgb(var(--border)/.6); color:rgb(var(--muted2)); }
        .rule-text.pass { color:rgb(16 185 129); }
        .rule-text.fail { color:rgb(var(--muted2)); }

        .match-hint { margin-top:5px; font-size:.68rem; font-weight:600; display:flex; align-items:center; gap:4px; }
        .match-hint.ok  { color: rgb(16 185 129); }
        .match-hint.bad { color: rgb(239 68 68); }
        .match-hint .check-icon { animation: check-pop .35s cubic-bezier(.34,1.56,.64,1) both; }

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
        .spinner { width:15px;height:15px;border:2px solid rgba(255,255,255,.28);border-top-color:white;border-radius:50%;animation:spin .65s linear infinite;flex-shrink:0; }
        .loading-dots { display:inline-flex;gap:3px;align-items:center; }
        .loading-dots span { width:4px;height:4px;border-radius:50%;background:currentColor;animation:dot-bounce 1.1s ease infinite; }
        .loading-dots span:nth-child(2) { animation-delay:.15s; }
        .loading-dots span:nth-child(3) { animation-delay:.30s; }

        .status-box { animation:status-pop .38s cubic-bezier(.34,1.56,.64,1) forwards; border-radius:11px; border:1.5px solid; padding:10px 14px; font-size:.75rem; font-weight:500; display:flex; align-items:flex-start; gap:9px; line-height:1.5; }
        .status-box.success { border-color:rgb(16 185 129/.35); background:rgb(16 185 129/.08); color:rgb(16 185 129); }
        .status-box.error   { border-color:rgb(239 68 68/.35);  background:rgb(239 68 68/.08);  color:rgb(215 55 55); }
        .status-icon { width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;font-size:.72rem;font-weight:800;flex-shrink:0;margin-top:1px; }
        .status-box.success .status-icon { background:rgb(16 185 129/.14); animation:check-pop .4s cubic-bezier(.34,1.56,.64,1) both; }
        .status-box.error   .status-icon { background:rgb(239 68 68/.12); }

        .form-divider      { display:flex; align-items:center; gap:10px; }
        .form-divider-line { flex:1; height:1px; background:rgb(var(--border)/.55); border-radius:1px; }
        .form-divider-text { font-size:.64rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:rgb(var(--muted2)); flex-shrink:0; }

        .back-link { color:rgb(var(--primary)); text-decoration:none; font-weight:600; position:relative; transition:opacity .15s; }
        .back-link::after { content:''; position:absolute; bottom:-1px; left:0; width:0; height:1.5px; background:rgb(var(--primary)); border-radius:2px; transition:width .22s ease; }
        .back-link:hover::after { width:100%; }
        .back-link:hover { opacity:.84; }

        .form-shake { animation: shake .55s cubic-bezier(.36,.07,.19,.97) both; }
      `}</style>

      <AuthSplitLayout
        title="Set a new password"
        subtitle="Choose a strong password to secure your TutorLink account."
      >
        {() => (
          <form onSubmit={handleSubmit} noValidate>
            <div className={shake ? "form-shake" : ""}>
              <div className="form-card">

                <div className="login-orb-wrap" aria-hidden="true">
                  <div className="login-orb orb-a" />
                  <div className="login-orb orb-b" />
                </div>

                <div className="form-section">

                  {/* ── New password ── */}
                  <div className={["input-wrapper", newFocused ? "focused" : "", newPassword ? "input-has-value" : ""].join(" ")}>
                    <label className="input-label" htmlFor="rp-new">
                      <span className="label-dot" />
                      New password
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        id="rp-new"
                        type={showNew ? "text" : "password"}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        className="input-field"
                        placeholder="Min. 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        onFocus={() => setNewFocused(true)}
                        onBlur={() => setNewFocused(false)}
                        onKeyUp={(e) => setCapsLockOn(e.getModifierState("CapsLock"))}
                        onKeyDown={(e) => setCapsLockOn(e.getModifierState("CapsLock"))}
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowNew((v) => !v)}
                        aria-label="Toggle password visibility"
                      >
                        {showNew ? "Hide" : "Show"}
                      </button>
                    </div>

                    {capsLockOn && (
                      <span className="caps-badge">⇪ Caps Lock is ON</span>
                    )}

                    {/* Strength bar */}
                    {newPassword && (
                      <>
                        <div className="strength-bars">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="strength-bar">
                              {strength.level >= i && (
                                <div
                                  className={`strength-fill ${
                                    strength.label === "Strong" ? "strength-strong"
                                    : strength.label === "Medium" ? "strength-medium"
                                    : "strength-weak"
                                  }`}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="strength-label">
                          Strength:{" "}
                          <span className={strength.label.toLowerCase()}>{strength.label}</span>
                        </p>

                        {/* Password rules */}
                        <div className="rules-list" role="list" aria-label="Password requirements">
                          {passwordRules.map((rule) => {
                            const passed = rule.test(newPassword);
                            return (
                              <div key={rule.label} className="rule-row" role="listitem">
                                <span className={`rule-icon ${passed ? "pass" : "fail"}`}>
                                  {passed ? "✓" : "·"}
                                </span>
                                <span className={`rule-text ${passed ? "pass" : "fail"}`}>
                                  {rule.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* ── Confirm password ── */}
                  <div className={["input-wrapper", confirmFocused ? "focused" : "", confirm ? "input-has-value" : ""].join(" ")}>
                    <label className="input-label" htmlFor="rp-confirm">
                      <span className="label-dot" />
                      Confirm password
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        id="rp-confirm"
                        type={showConfirm ? "text" : "password"}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        className={[
                          "input-field",
                          confirm.length > 0 ? (match ? "match" : "mismatch") : "",
                        ].join(" ")}
                        placeholder="Re-enter password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        onFocus={() => setConfirmFocused(true)}
                        onBlur={() => setConfirmFocused(false)}
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowConfirm((v) => !v)}
                        aria-label="Toggle confirm password visibility"
                      >
                        {showConfirm ? "Hide" : "Show"}
                      </button>
                    </div>

                    {confirm.length > 0 && (
                      <p className={`match-hint ${match ? "ok" : "bad"}`}>
                        {match
                          ? <><span className="check-icon">✓</span> Passwords match</>
                          : <><span>✕</span> Passwords do not match</>
                        }
                      </p>
                    )}
                  </div>

                  {/* ── Submit ── */}
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={loading || !allRulesPassed || !confirm}
                  >
                    <span className="btn-inner">
                      {loading && <span className="spinner" />}
                      {loading ? (
                        <>
                          Updating
                          <span className="loading-dots">
                            <span /><span /><span />
                          </span>
                        </>
                      ) : (
                        <>
                          Update password
                          <span className="btn-arrow">→</span>
                        </>
                      )}
                    </span>
                  </button>

                  {/* ── Status ── */}
                  {status && (
                    <div
                      className={`status-box ${isSuccess ? "success" : "error"}`}
                      role="alert"
                      aria-live="polite"
                    >
                      <span className="status-icon">{isSuccess ? "✓" : "✕"}</span>
                      <span>{status}</span>
                    </div>
                  )}

                  {/* ── Divider ── */}
                  <div className="form-divider" aria-hidden="true">
                    <span className="form-divider-line" />
                    <span className="form-divider-text">or</span>
                    <span className="form-divider-line" />
                  </div>

                  {/* ── Footer ── */}
                  <p style={{ fontSize: "0.75rem", color: "rgb(var(--muted2))", textAlign: "center", margin: 0 }}>
                    <Link href="/auth/login" className="back-link">← Back to login</Link>
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