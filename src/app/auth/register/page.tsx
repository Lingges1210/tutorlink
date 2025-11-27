// src/app/auth/register/page.tsx
"use client";

import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [programme, setProgramme] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, programme }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatus(data.message || "Registration failed");
      } else {
        setStatus("Registration successful. You can now log in.");
        setPassword("");
      }
    } catch (err: any) {
      setStatus(err.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-6 rounded-xl border border-slate-800 bg-slate-900/70 p-6">
      <h1 className="text-xl font-semibold text-white">Create a TutorLink account</h1>
      <p className="mt-2 text-sm text-slate-300">
        Use your USM email. Later, your account can be upgraded to a tutor or admin role.
      </p>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Email
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

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Full Name
          </label>
          <input
            type="text"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Programme (optional)
          </label>
          <input
            type="text"
            placeholder="BSc Computer Science"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500"
            value={programme}
            onChange={(e) => setProgramme(e.target.value)}
          />
        </div>

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
