"use client";

import { FormEvent, useMemo, useState, useEffect } from "react";

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { label: "Weak", level: 1, color: "bg-rose-400", text: "text-rose-400" };
  if (score <= 3) return { label: "Fair", level: 2, color: "bg-amber-400", text: "text-amber-400" };
  return { label: "Strong", level: 3, color: "bg-emerald-500", text: "text-emerald-500" };
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  onKeyUp?: (e: React.KeyboardEvent) => void;
  autoComplete: string;
  animDelay?: string;
  children?: React.ReactNode;
}

function PasswordField({ label, value, onChange, show, onToggle, onKeyUp, autoComplete, animDelay = "0ms", children }: FieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div
      className="field-row"
      style={{ animationDelay: animDelay }}
    >
      <label className="field-label">{label}</label>
      <div className={`field-wrap ${focused ? "focused" : ""}`}>
        <span className="field-icon">
          <LockIcon />
        </span>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyUp={onKeyUp}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="field-input"
          required
          minLength={6}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          onClick={onToggle}
          className="eye-btn"
          tabIndex={-1}
        >
          <EyeIcon open={show} />
        </button>
      </div>
      {children}
    </div>
  );
}

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [capsLockOn, setCapsLockOn] = useState(false);
  const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);
  const match = confirm.length > 0 && newPassword === confirm;

  const requirements = [
    { label: "At least 6 characters", met: newPassword.length >= 6 },
    { label: "Uppercase letter", met: /[A-Z]/.test(newPassword) },
    { label: "Number", met: /[0-9]/.test(newPassword) },
    { label: "Special character", met: /[^A-Za-z0-9]/.test(newPassword) },
  ];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus(null);

    if (!currentPassword.trim()) return setStatus({ msg: "Current password is required.", ok: false });
    if (newPassword.length < 6) return setStatus({ msg: "New password must be at least 6 characters.", ok: false });
    if (newPassword !== confirm) return setStatus({ msg: "Passwords do not match.", ok: false });
    if (currentPassword === newPassword) return setStatus({ msg: "New password must differ from current password.", ok: false });

    setLoading(true);
    try {
      const res = await fetch("/api/student/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setStatus({ msg: data?.error || "Failed to change password.", ok: false });
        return;
      }

      setStatus({ msg: "Password updated successfully!", ok: true });
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err: any) {
      setStatus({ msg: err?.message ?? "Unexpected error.", ok: false });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(0.95); box-shadow: 0 0 0 0 rgb(var(--primary) / 0.4); }
          70%  { transform: scale(1);    box-shadow: 0 0 0 8px rgb(var(--primary) / 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgb(var(--primary) / 0); }
        }

        .cp-wrapper {
          display: flex;
          min-height: 100%;
          width: 100%;
          align-items: center;
          justify-content: center;
          padding: 2.5rem 1rem;
        }

        .cp-card {
          width: 100%;
          max-width: 440px;
          border-radius: 24px;
          border: 1px solid rgb(var(--border));
          background: rgb(var(--card) / 0.75);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: 0 24px 64px rgb(var(--shadow) / 0.18), 0 1px 0 rgb(255 255 255 / 0.06) inset;
          overflow: hidden;
          opacity: 0;
          animation: slideUp 0.5s cubic-bezier(.22,.68,0,1.2) forwards;
        }

        .cp-header {
          padding: 1.75rem 1.75rem 0;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .cp-icon-wrap {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: rgb(var(--primary) / 0.12);
          border: 1px solid rgb(var(--primary) / 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgb(var(--primary));
          margin-bottom: 0.25rem;
          animation: pulse-ring 2.5s ease-in-out infinite;
        }

        .cp-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: rgb(var(--fg));
          letter-spacing: -0.02em;
          line-height: 1.2;
        }

        .cp-subtitle {
          font-size: 0.8125rem;
          color: rgb(var(--muted));
          line-height: 1.5;
        }

        .cp-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgb(var(--border)), transparent);
          margin: 1.25rem 1.75rem 0;
        }

        .cp-form {
          padding: 1.25rem 1.75rem 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
        }

        .field-row {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          opacity: 0;
          animation: slideUp 0.45s cubic-bezier(.22,.68,0,1.2) forwards;
        }

        .field-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: rgb(var(--muted));
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }

        .field-wrap {
          position: relative;
          display: flex;
          align-items: center;
          border-radius: 10px;
          border: 1.5px solid rgb(var(--border));
          background: rgb(var(--card2));
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .field-wrap.focused {
          border-color: rgb(var(--primary));
          box-shadow: 0 0 0 3px rgb(var(--primary) / 0.12);
        }

        .field-icon {
          display: flex;
          align-items: center;
          padding: 0 0 0 0.75rem;
          color: rgb(var(--muted2));
          flex-shrink: 0;
          transition: color 0.2s;
        }

        .field-wrap.focused .field-icon {
          color: rgb(var(--primary));
        }

        .field-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          padding: 0.55rem 0.5rem 0.55rem 0.5rem;
          font-size: 0.875rem;
          color: rgb(var(--fg));
          font-family: inherit;
        }

        .field-input::placeholder { color: rgb(var(--muted2)); }

        .eye-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 0.75rem;
          background: none;
          border: none;
          cursor: pointer;
          color: rgb(var(--muted2));
          transition: color 0.15s;
          flex-shrink: 0;
        }

        .eye-btn:hover { color: rgb(var(--fg)); }

        .caps-warn {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.7rem;
          color: #f59e0b;
          margin-top: 0.15rem;
        }

        /* Strength meter */
        .strength-wrap {
          margin-top: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .strength-bars {
          display: flex;
          gap: 4px;
        }

        .strength-bar {
          height: 4px;
          flex: 1;
          border-radius: 99px;
          background: rgb(var(--border));
          transition: background 0.35s cubic-bezier(.22,.68,0,1.2), transform 0.2s;
          transform-origin: left;
        }

        .strength-bar.active { transform: scaleY(1.5); }

        .strength-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .strength-label {
          font-size: 0.7rem;
          color: rgb(var(--muted2));
        }

        /* Requirements checklist */
        .req-list {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.3rem 0.5rem;
          margin-top: 0.35rem;
        }

        .req-item {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.68rem;
          color: rgb(var(--muted2));
          transition: color 0.2s;
        }

        .req-item.met { color: #10b981; }

        .req-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 1.5px solid rgb(var(--border));
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: border-color 0.2s, background 0.2s;
        }

        .req-item.met .req-dot {
          border-color: #10b981;
          background: #10b981;
          color: white;
        }

        /* Match indicator */
        .match-msg {
          font-size: 0.7rem;
          margin-top: 0.2rem;
          display: flex;
          align-items: center;
          gap: 0.3rem;
          transition: color 0.2s;
        }

        /* Submit button */
        .submit-btn {
          position: relative;
          overflow: hidden;
          width: 100%;
          border: none;
          border-radius: 10px;
          padding: 0.65rem 1rem;
          font-size: 0.875rem;
          font-weight: 600;
          font-family: inherit;
          color: white;
          background: rgb(var(--primary));
          cursor: pointer;
          letter-spacing: 0.01em;
          transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
          margin-top: 0.25rem;
        }

        .submit-btn::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%);
          background-size: 200% 100%;
          animation: shimmer 2.5s linear infinite;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgb(var(--primary) / 0.38);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(0px);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Spinner */
        .spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          vertical-align: middle;
          margin-right: 6px;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* Status bar */
        .status-bar {
          margin: 0 1.75rem 1.75rem;
          padding: 0.65rem 0.875rem;
          border-radius: 10px;
          font-size: 0.78rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          animation: fadeIn 0.3s ease forwards;
        }

        .status-bar.ok {
          background: rgb(16 185 129 / 0.1);
          border: 1px solid rgb(16 185 129 / 0.25);
          color: #10b981;
        }

        .status-bar.err {
          background: rgb(244 63 94 / 0.08);
          border: 1px solid rgb(244 63 94 / 0.2);
          color: #f43f5e;
        }
      `}</style>

      <div className="cp-wrapper">
        <div className="cp-card">
          {/* Header */}
          <div className="cp-header">
            <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
              <div className="cp-icon-wrap">
                <ShieldIcon />
              </div>
              <div>
                <h1 className="cp-title">Change Password</h1>
                <p className="cp-subtitle">Keep your account secure with a strong password.</p>
              </div>
            </div>
          </div>

          <div className="cp-divider" />

          {/* Form */}
          <form onSubmit={handleSubmit} className="cp-form">
            {/* Current password */}
            <PasswordField
              label="Current Password"
              value={currentPassword}
              onChange={setCurrentPassword}
              show={showCurrent}
              onToggle={() => setShowCurrent((v) => !v)}
              onKeyUp={(e) => setCapsLockOn(e.getModifierState("CapsLock"))}
              autoComplete="current-password"
              animDelay="80ms"
            >
              {capsLockOn && (
                <p className="caps-warn">
                  ⚠ Caps Lock is on
                </p>
              )}
            </PasswordField>

            {/* New password */}
            <PasswordField
              label="New Password"
              value={newPassword}
              onChange={setNewPassword}
              show={showNew}
              onToggle={() => setShowNew((v) => !v)}
              onKeyUp={(e) => setCapsLockOn(e.getModifierState("CapsLock"))}
              autoComplete="new-password"
              animDelay="140ms"
            >
              {newPassword && (
                <div className="strength-wrap">
                  <div className="strength-bars">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`strength-bar ${strength.level >= i ? "active " + strength.color : ""}`}
                      />
                    ))}
                  </div>
                  <div className="strength-meta">
                    <span className="strength-label">Password strength</span>
                    <span className={`strength-label font-semibold ${strength.text}`}>{strength.label}</span>
                  </div>

                  <div className="req-list">
                    {requirements.map((r) => (
                      <div key={r.label} className={`req-item ${r.met ? "met" : ""}`}>
                        <div className="req-dot">
                          {r.met && <CheckIcon />}
                        </div>
                        {r.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </PasswordField>

            {/* Confirm password */}
            <PasswordField
              label="Confirm New Password"
              value={confirm}
              onChange={setConfirm}
              show={showConfirm}
              onToggle={() => setShowConfirm((v) => !v)}
              autoComplete="new-password"
              animDelay="200ms"
            >
              {confirm.length > 0 && (
                <p className={`match-msg ${match ? "text-emerald-500" : "text-rose-400"}`}>
                  {match ? <><CheckIcon /> Passwords match</> : "✗ Passwords do not match"}
                </p>
              )}
            </PasswordField>

            <button
              type="submit"
              disabled={loading}
              className="submit-btn"
              style={{ animationDelay: "260ms" }}
            >
              {loading ? (
                <><span className="spinner" />Updating…</>
              ) : (
                "Update Password"
              )}
            </button>
          </form>

          {/* Status message */}
          {status && (
            <div className={`status-bar ${status.ok ? "ok" : "err"}`}>
              {status.ok ? "✓" : "!"} {status.msg}
            </div>
          )}
        </div>
      </div>
    </>
  );
}