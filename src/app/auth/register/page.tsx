// src/app/auth/register/page.tsx
"use client";

import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [programme, setProgramme] = useState("");
  const [matricNo, setMatricNo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [matricCardFile, setMatricCardFile] = useState<File | null>(null);
  const [captcha, setCaptcha] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      if (matricCardFile) {
        formData.append("matricCard", matricCardFile);
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        body: formData, // no Content-Type header here
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
    <div className="max-w-md mx-auto mt-6 rounded-xl border border-slate-800 bg-slate-900/70 p-6">
      <h1 className="text-xl font-semibold text-white">
        Create a TutorLink account
      </h1>
      <p className="mt-2 text-sm text-slate-300">
        Use your USM email. Your account starts as a student and can later be
        upgraded to tutor or admin roles.
      </p>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        {/* Email */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            USM Email
          </label>
          <input
            type="email"
            placeholder="yourid@student.usm.my"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {/* Full name as per NRIC */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Full Name (as per NRIC)
          </label>
          <input
            type="text"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        {/* Programme */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Programme
          </label>
          <input
            type="text"
            placeholder="BSc Computer Science"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500"
            value={programme}
            onChange={(e) => setProgramme(e.target.value)}
            required
          />
        </div>

        {/* Matric number */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Matric Number
          </label>
          <input
            type="text"
            placeholder="e.g. 172345"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500"
            value={matricNo}
            onChange={(e) => setMatricNo(e.target.value)}
            required
          />
        </div>

        {/* Upload matric card */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Upload Matric Card (image or PDF)
          </label>
          <input
            type="file"
            accept="image/*,.pdf"
            className="w-full text-xs text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-violet-600 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-violet-500"
            onChange={(e) =>
              setMatricCardFile(e.target.files?.[0] ? e.target.files[0] : null)
            }
          />
          <p className="mt-1 text-[0.7rem] text-slate-500">
            You can blur sensitive details if needed, but name and matric number
            should be visible.
          </p>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Password
          </label>
          <input
            type="password"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        {/* Confirm password */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Confirm Password
          </label>
          <input
            type="password"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        {/* Simple captcha */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Captcha
          </label>
          <p className="text-[0.7rem] text-slate-400 mb-1">
            To confirm you are human, please type{" "}
            <span className="font-semibold text-violet-300">USM</span> below.
          </p>
          <input
            type="text"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500"
            value={captcha}
            onChange={(e) => setCaptcha(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-violet-600 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Register"}
        </button>
      </form>

      {status && <p className="mt-4 text-xs text-amber-300">{status}</p>}

      <p className="mt-4 text-xs text-slate-400">
        Already have an account?{" "}
        <a href="/auth/login" className="text-violet-300 hover:text-violet-200">
          Log in here
        </a>
      </p>
    </div>
  );
}
