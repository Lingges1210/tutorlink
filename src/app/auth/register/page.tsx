// src/app/auth/register/page.tsx
"use client";

import { FormEvent, useState } from "react";
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

  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = getPasswordStrength(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus(null);

    if (password !== confirmPassword) {
      setStatus("Passwords do not match.");
      return;
    }

    if (!matricCardFile) {
      setStatus("Please upload your matric card.");
      return;
    }

    if (captcha.trim().toLowerCase() !== "usm") {
      setStatus('Captcha incorrect. Please type "USM".');
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
        setStatus(data.message || "Registration failed");
      } else {
        setStatus("Registration successful. You can now log in.");
        setPassword("");
        setConfirmPassword("");
        setCaptcha("");
      }
    } catch (err: any) {
      setStatus(err.message ?? "Unexpected error");
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
          Create a TutorLink account
        </h1>

        <p className="mt-2 text-sm text-[rgb(var(--muted))]">
          Use your USM email. Your account starts as a student.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <InputBlock
            label="USM Email"
            type="email"
            placeholder="yourid@student.usm.my"
            value={email}
            onChange={setEmail}
          />

          <InputBlock
            label="Full Name (as per NRIC)"
            placeholder="Lingges Muniandy"
            value={fullName}
            onChange={setFullName}
          />

          <InputBlock
            label="Programme"
            placeholder="BSc Computer Science"
            value={programme}
            onChange={setProgramme}
          />

          <InputBlock
            label="Matric Number"
            placeholder="e.g. 172345"
            value={matricNo}
            onChange={setMatricNo}
          />

          {/* Upload matric card */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[rgb(var(--muted))]">
              Upload Matric Card
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              className="
                w-full text-xs text-[rgb(var(--muted))]
                file:mr-3 file:rounded-md file:border-0
                file:bg-[rgb(var(--primary))]
                file:px-3 file:py-1.5
                file:text-xs file:font-medium file:text-white
                hover:file:opacity-90
              "
              onChange={(e) => setMatricCardFile(e.target.files?.[0] || null)}
            />
            <p className="mt-1 text-[0.7rem] text-[rgb(var(--muted2))]">
              Name and matric number must be visible.
            </p>
          </div>

          {/* Password + show/hide + caps lock + strength */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[rgb(var(--muted))]">
              Password
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="
                  w-full rounded-md border px-3 py-2 pr-10 text-sm outline-none
                  border-[rgb(var(--border))]
                  bg-[rgb(var(--card2))]
                  text-[rgb(var(--fg))]
                  focus:border-[rgb(var(--primary))]
                "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={(e) => setCapsLockOn(e.getModifierState("CapsLock"))}
                required
                minLength={6}
              />

              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="
                  absolute right-2 top-1/2 -translate-y-1/2
                  text-xs text-[rgb(var(--muted2))]
                  hover:text-[rgb(var(--fg))]
                "
                aria-label="Toggle password visibility"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {capsLockOn && (
              <p className="mt-1 text-[0.7rem] text-amber-400">
                Caps Lock is ON
              </p>
            )}

            {password && (
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
                  Password strength:{" "}
                  <span className="font-medium">{strength.label}</span>
                </p>
              </div>
            )}
          </div>

          {/* Confirm password + show/hide + live match */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[rgb(var(--muted))]">
              Confirm Password
            </label>

            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="
                  absolute right-2 top-1/2 -translate-y-1/2
                  text-xs text-[rgb(var(--muted2))]
                  hover:text-[rgb(var(--fg))]
                "
                aria-label="Toggle confirm password visibility"
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>

            {confirmPassword.length > 0 && (
              <p
                className={`mt-1 text-[0.7rem] ${
                  passwordsMatch ? "text-emerald-500" : "text-rose-400"
                }`}
              >
                {passwordsMatch ? "Passwords match" : "Passwords do not match"}
              </p>
            )}
          </div>

          {/* Captcha */}
          <InputBlock
            label="Captcha"
            helper='Please type "USM" below.'
            value={captcha}
            onChange={setCaptcha}
          />

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
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        {status && <p className="mt-4 text-xs text-amber-400">{status}</p>}

        <p className="mt-4 text-xs text-[rgb(var(--muted2))]">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="text-[rgb(var(--primary))] hover:underline"
          >
            Log in here
          </Link>
        </p>
      </div>
    </div>
  );
}

function InputBlock({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  helper,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  helper?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-[rgb(var(--muted))]">
        {label}
      </label>
      {helper && (
        <p className="mb-1 text-[0.7rem] text-[rgb(var(--muted2))]">
          {helper}
        </p>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="
          w-full rounded-md border px-3 py-2 text-sm outline-none
          border-[rgb(var(--border))]
          bg-[rgb(var(--card2))]
          text-[rgb(var(--fg))]
          focus:border-[rgb(var(--primary))]
        "
        required
      />
    </div>
  );
}
