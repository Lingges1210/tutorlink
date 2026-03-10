"use client";

import { FormEvent, useState, useRef, useEffect } from "react";
import Link from "next/link";

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { label: "Weak", level: 1, color: "bg-rose-400", textColor: "text-rose-400" };
  if (score <= 3) return { label: "Medium", level: 2, color: "bg-amber-400", textColor: "text-amber-400" };
  return { label: "Strong", level: 3, color: "bg-emerald-500", textColor: "text-emerald-500" };
}

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [programme, setProgramme] = useState("");
  const [matricNo, setMatricNo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [matricCardFile, setMatricCardFile] = useState<File | null>(null);
  const [captcha, setCaptcha] = useState("");
  const [status, setStatus] = useState<{ type: "error" | "success"; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1); // multi-step feel
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const strength = getPasswordStrength(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus(null);

    if (password !== confirmPassword) {
      setStatus({ type: "error", msg: "Passwords do not match." });
      return;
    }
    if (!matricCardFile) {
      setStatus({ type: "error", msg: "Please upload your matric card." });
      return;
    }
    if (captcha.trim().toLowerCase() !== "usm") {
      setStatus({ type: "error", msg: 'Captcha incorrect. Please type "USM".' });
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("fullName", fullName);
      formData.append("programme", programme);
      formData.append("matricNo", matricNo);
      formData.append("password", password);
      formData.append("captcha", captcha);
      if (matricCardFile) formData.append("matricCard", matricCardFile);

      const res = await fetch("/api/auth/register", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatus({ type: "error", msg: data.message || "Registration failed" });
      } else {
        setStatus({ type: "success", msg: "Account created! You can now log in." });
        setPassword("");
        setConfirmPassword("");
        setCaptcha("");
      }
    } catch (err: any) {
      setStatus({ type: "error", msg: err.message ?? "Unexpected error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulseRing {
          0%   { transform: scale(1);   opacity: 0.6; }
          50%  { transform: scale(1.08); opacity: 0.2; }
          100% { transform: scale(1);   opacity: 0.6; }
        }
        @keyframes bounceIn {
          0%   { transform: scale(0.8); opacity: 0; }
          60%  { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes barFill {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .register-card {
          animation: fadeSlideUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .field-row {
          animation: fadeSlideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .field-row:nth-child(1)  { animation-delay: 0.08s; }
        .field-row:nth-child(2)  { animation-delay: 0.13s; }
        .field-row:nth-child(3)  { animation-delay: 0.18s; }
        .field-row:nth-child(4)  { animation-delay: 0.23s; }
        .field-row:nth-child(5)  { animation-delay: 0.28s; }
        .field-row:nth-child(6)  { animation-delay: 0.33s; }
        .field-row:nth-child(7)  { animation-delay: 0.38s; }
        .field-row:nth-child(8)  { animation-delay: 0.43s; }
        .field-row:nth-child(9)  { animation-delay: 0.48s; }

        .status-msg { animation: slideDown 0.25s ease both; }
        .bounce-in  { animation: bounceIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both; }

        .strength-bar span {
          animation: barFill 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .fancy-input {
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .fancy-input:focus {
          border-color: rgb(var(--primary));
          box-shadow: 0 0 0 3px rgb(var(--primary) / 0.15);
        }

        .submit-btn {
          position: relative;
          overflow: hidden;
          transition: transform 0.18s, box-shadow 0.18s, opacity 0.18s;
        }
        .submit-btn::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%);
          background-size: 200% 100%;
          animation: shimmer 2.4s linear infinite;
          pointer-events: none;
        }
        .submit-btn:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgb(var(--shadow) / 0.35);
        }
        .submit-btn:not(:disabled):active {
          transform: translateY(0);
        }

        .upload-zone {
          transition: border-color 0.2s, background 0.2s, transform 0.15s;
          cursor: pointer;
        }
        .upload-zone:hover { transform: scale(1.008); }
        .upload-zone.has-file {
          border-color: rgb(var(--primary));
          background: rgb(var(--primary) / 0.06);
        }

        .eye-btn { transition: color 0.15s, transform 0.15s; }
        .eye-btn:hover { transform: scale(1.15); }

        .spinner {
          display: inline-block;
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          vertical-align: middle;
          margin-right: 6px;
        }

        .divider-line {
          flex: 1; height: 1px;
          background: linear-gradient(to right, transparent, rgb(var(--border)), transparent);
        }
      `}</style>

      <div className="mx-auto mt-10 mb-12 max-w-md px-4">
        <div
          className="register-card rounded-3xl border p-7"
          style={{
            borderColor: "rgb(var(--border))",
            background: "rgb(var(--card) / 0.75)",
            backdropFilter: "blur(18px)",
            boxShadow: "0 24px 64px rgb(var(--shadow) / 0.18), 0 1px 0 rgb(var(--border))",
          }}
        >
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-xl font-semibold leading-tight" style={{ color: "rgb(var(--fg))" }}>
              Create your TutorLink account
            </h1>
            <p className="mt-1 text-xs" style={{ color: "rgb(var(--muted))" }}>
              Use your USM email address to sign up.
            </p>
          </div>

          {/* Divider */}
          <div className="mb-5 flex items-center gap-3">
            <span className="divider-line" />
            <span className="text-[0.65rem] font-medium tracking-widest uppercase" style={{ color: "rgb(var(--muted2))" }}>
              Account Details
            </span>
            <span className="divider-line" />
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>

            {/* Email */}
            <div className="field-row">
              <FloatingLabelInput
                id="email"
                label="Email"
                type="email"
                placeholder="yourid@student.usm.my"
                value={email}
                onChange={setEmail}
                icon={
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                    <path d="M2.5 6.5l7.5 5 7.5-5M2.5 5.5h15v10h-15z" strokeLinejoin="round" strokeLinecap="round"/>
                  </svg>
                }
              />
            </div>

            {/* Full name */}
            <div className="field-row">
              <FloatingLabelInput
                id="fullName"
                label="Full Name (as per NRIC)"
                placeholder="Lingges Muniandy"
                value={fullName}
                onChange={setFullName}
                icon={
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                    <circle cx="10" cy="7" r="3.5" strokeLinecap="round"/>
                    <path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" strokeLinecap="round"/>
                  </svg>
                }
              />
            </div>

            {/* 2-col row: Programme + Matric */}
            <div className="field-row grid grid-cols-2 gap-3">
              <FloatingLabelInput
                id="programme"
                label="Programme"
                placeholder="BSc Computer Sci."
                value={programme}
                onChange={setProgramme}
              />
              <FloatingLabelInput
                id="matricNo"
                label="Matric No."
                placeholder="172345"
                value={matricNo}
                onChange={setMatricNo}
              />
            </div>

            {/* Upload matric card */}
            <div className="field-row">
              <p className="mb-1.5 text-xs font-medium" style={{ color: "rgb(var(--muted))" }}>
                Upload Matric Card
              </p>
              <div
                className={`upload-zone rounded-xl border-2 border-dashed px-4 py-4 text-center ${matricCardFile ? "has-file" : ""}`}
                style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card2))" }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => setMatricCardFile(e.target.files?.[0] || null)}
                />
                {matricCardFile ? (
                  <div className="bounce-in flex items-center justify-center gap-2">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" style={{ color: "rgb(var(--primary))" }}>
                      <path d="M4 10.5l4.5 4.5 7.5-8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-xs font-medium" style={{ color: "rgb(var(--primary))" }}>
                      {matricCardFile.name}
                    </span>
                  </div>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="mx-auto mb-1.5 h-7 w-7" style={{ color: "rgb(var(--muted2))" }}>
                      <path d="M12 16V8m0 0l-3 3m3-3l3 3" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M4 16.8A4 4 0 015.6 9a6 6 0 0111.8 0A4 4 0 0119 16.8" strokeLinecap="round"/>
                    </svg>
                    <p className="text-xs font-medium" style={{ color: "rgb(var(--muted))" }}>Click to upload</p>
                    <p className="text-[0.65rem] mt-0.5" style={{ color: "rgb(var(--muted2))" }}>JPG, PNG or PDF · Name & matric no. must be visible</p>
                  </>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="field-row flex items-center gap-3 !mt-5">
              <span className="divider-line" />
              <span className="text-[0.65rem] font-medium tracking-widest uppercase" style={{ color: "rgb(var(--muted2))" }}>
                Security
              </span>
              <span className="divider-line" />
            </div>

            {/* Password */}
            <div className="field-row">
              <p className="mb-1.5 text-xs font-medium" style={{ color: "rgb(var(--muted))" }}>Password</p>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="fancy-input w-full rounded-xl border px-3.5 py-2.5 pr-12 text-sm outline-none"
                  style={{
                    borderColor: "rgb(var(--border))",
                    background: "rgb(var(--card2))",
                    color: "rgb(var(--fg))",
                  }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={(e) => setCapsLockOn(e.getModifierState("CapsLock"))}
                  required
                  minLength={6}
                  placeholder="Min. 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="eye-btn absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "rgb(var(--muted2))" }}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                      <path d="M3 3l14 14M8.5 8.6A3 3 0 0013.4 13M6 6.4A8.8 8.8 0 002 10s2.667 5 8 5a8.3 8.3 0 003.6-.83M8 5.1A8.7 8.7 0 0110 5c5.333 0 8 5 8 5a9.6 9.6 0 01-1.76 2.23" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                      <ellipse cx="10" cy="10" rx="8" ry="5" strokeLinecap="round"/>
                      <circle cx="10" cy="10" r="2.5"/>
                    </svg>
                  )}
                </button>
              </div>

              {capsLockOn && (
                <p className="status-msg mt-1 flex items-center gap-1 text-[0.7rem] text-amber-400">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                    <path d="M8 1L2 8h3v6h6V8h3z"/>
                  </svg>
                  Caps Lock is ON
                </p>
              )}

              {password && (
                <div className="mt-2.5 strength-bar">
                  <div className="flex gap-1.5">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="relative h-1.5 flex-1 overflow-hidden rounded-full"
                        style={{ background: "rgb(var(--border))" }}
                      >
                        {strength.level >= i && (
                          <span
                            className={`absolute inset-y-0 left-0 rounded-full ${strength.color}`}
                            style={{ animationDelay: `${(i - 1) * 0.08}s` }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <p className={`mt-1 text-[0.7rem] font-medium ${strength.textColor}`}>
                    {strength.label} password
                  </p>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="field-row">
              <p className="mb-1.5 text-xs font-medium" style={{ color: "rgb(var(--muted))" }}>Confirm Password</p>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="fancy-input w-full rounded-xl border px-3.5 py-2.5 pr-12 text-sm outline-none"
                  style={{
                    borderColor: confirmPassword.length > 0
                      ? passwordsMatch ? "rgb(16 185 129 / 0.6)" : "rgb(251 113 133 / 0.6)"
                      : "rgb(var(--border))",
                    background: "rgb(var(--card2))",
                    color: "rgb(var(--fg))",
                  }}
                  required
                  minLength={6}
                  placeholder="Re-enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="eye-btn absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "rgb(var(--muted2))" }}
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? (
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                      <path d="M3 3l14 14M8.5 8.6A3 3 0 0013.4 13M6 6.4A8.8 8.8 0 002 10s2.667 5 8 5a8.3 8.3 0 003.6-.83M8 5.1A8.7 8.7 0 0110 5c5.333 0 8 5 8 5a9.6 9.6 0 01-1.76 2.23" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                      <ellipse cx="10" cy="10" rx="8" ry="5" strokeLinecap="round"/>
                      <circle cx="10" cy="10" r="2.5"/>
                    </svg>
                  )}
                </button>
              </div>

              {confirmPassword.length > 0 && (
                <p className={`status-msg mt-1 flex items-center gap-1 text-[0.7rem] font-medium ${passwordsMatch ? "text-emerald-500" : "text-rose-400"}`}>
                  {passwordsMatch ? (
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
                      <path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
                      <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round"/>
                    </svg>
                  )}
                  {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                </p>
              )}
            </div>

            {/* Captcha */}
            <div className="field-row">
              <FloatingLabelInput
                id="captcha"
                label='Type "USM" to verify'
                placeholder="USM"
                value={captcha}
                onChange={setCaptcha}
                icon={
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                    <rect x="2.5" y="5.5" width="15" height="10" rx="2" strokeLinecap="round"/>
                    <path d="M6 9.5h2m2 0h4M6 12.5h3" strokeLinecap="round"/>
                  </svg>
                }
              />
            </div>

            {/* Submit */}
            <div className="field-row !mt-6">
              <button
                type="submit"
                disabled={loading}
                className="submit-btn w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: "rgb(var(--primary))" }}
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    Creating account…
                  </>
                ) : (
                  "Create Account →"
                )}
              </button>
            </div>
          </form>

          {/* Status message */}
          {status && (
            <div
              className={`status-msg mt-4 flex items-start gap-2 rounded-xl px-3.5 py-3 text-xs ${
                status.type === "success"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-rose-500/10 text-rose-400"
              }`}
            >
              {status.type === "success" ? (
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0">
                  <path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0">
                  <circle cx="8" cy="8" r="6"/>
                  <path d="M8 5v3.5M8 11v.5" strokeLinecap="round"/>
                </svg>
              )}
              {status.msg}
            </div>
          )}

          {/* Footer */}
          <p className="mt-5 text-center text-xs" style={{ color: "rgb(var(--muted2))" }}>
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="font-medium hover:underline"
              style={{ color: "rgb(var(--primary))" }}
            >
              Log in here
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

/* ─── Floating-label input ─────────────────────────────────────────────────── */
function FloatingLabelInput({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  icon,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  icon?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;

  return (
    <div className="relative">
      {/* Floating label */}
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-3.5 select-none text-xs transition-all duration-200"
        style={{
          top: active ? "-0.45rem" : "50%",
          transform: active ? "none" : "translateY(-50%)",
          fontSize: active ? "0.65rem" : "0.8rem",
          background: active ? "rgb(var(--card2))" : "transparent",
          paddingInline: active ? "0.25rem" : "0",
          color: focused ? "rgb(var(--primary))" : "rgb(var(--muted))",
          zIndex: 1,
        }}
      >
        {label}
      </label>

      {icon && (
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: focused ? "rgb(var(--primary))" : "rgb(var(--muted2))", transition: "color 0.2s" }}
        >
          {/* shift label right when icon present */}
        </span>
      )}

      <input
        id={id}
        type={type}
        placeholder={focused ? placeholder : ""}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none"
        style={{
          borderColor: focused ? "rgb(var(--primary))" : "rgb(var(--border))",
          boxShadow: focused ? "0 0 0 3px rgb(var(--primary) / 0.13)" : "none",
          background: "rgb(var(--card2))",
          color: "rgb(var(--fg))",
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}
        required
      />
    </div>
  );
}