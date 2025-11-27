// src/app/auth/login/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatus(data.message || "Login failed");
        return;
      }

      // Login successful
      const user = data.user;
      console.log("Logged in user:", user);

      // Decide where to go based on role
      let targetPath = "/dashboard/student";

      if (user?.role === "ADMIN") {
        targetPath = "/admin";
      }
      // later you can add:
      // else if (user?.role === "TUTOR") targetPath = "/dashboard/tutor";

      setStatus("Login successful. Redirecting...");
      router.push(targetPath);
    } catch (err: any) {
      setStatus(err?.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 rounded-xl border border-slate-800 bg-slate-900/70 p-6">
      <h1 className="text-xl font-semibold text-white">
        Sign in to TutorLink
      </h1>
      <p className="mt-2 text-sm text-slate-300">
        Use your registered USM email & password to continue.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Email
          </label>
          <input
            type="email"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500"
            placeholder="yourid@student.usm.my"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
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
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-violet-600 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Continue"}
        </button>
      </form>

      {status && (
        <p className="mt-4 text-xs text-amber-300">{status}</p>
      )}

      <p className="mt-4 text-xs text-slate-400">
        Don&apos;t have an account?{" "}
        <a href="/auth/register" className="text-violet-300 hover:text-violet-200">
          Register here
        </a>
      </p>
    </div>
  );
}
