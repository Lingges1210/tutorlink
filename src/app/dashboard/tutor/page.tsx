// src/app/dashboard/tutor/page.tsx
"use client";

import { FormEvent, useState } from "react";

export default function TutorDashboardPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [programme, setProgramme] = useState("");
  const [subjects, setSubjects] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [availability, setAvailability] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);

    try {
      const res = await fetch("/api/tutor/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          programme,
          subjects,
          cgpa,
          availability,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus(data.message || "Failed to submit application");
      } else {
        setStatus("Application submitted successfully. Status: PENDING.");
        // Clear form
        setSubjects("");
        setCgpa("");
        setAvailability("");
      }
    } catch (err: any) {
      setStatus(err.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Tutor Dashboard</h1>
        <p className="mt-1 text-sm text-slate-300">
          As a peer tutor, you’ll manage incoming requests, confirm sessions,
          and support students. For now, start by submitting your tutor
          application.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="text-sm font-semibold text-white">
            Tutor Application Status
          </h2>
          <p className="mt-1 text-xs text-slate-300">
            Once your application is approved by an admin, you will appear in
            student search results as a tutor.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="text-sm font-semibold text-white">
            Incoming Session Requests
          </h2>
          <p className="mt-1 text-xs text-slate-300">
            This section will list new session requests from students once
            matching and booking are implemented.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="text-sm font-semibold text-white">
            Gamification & Impact
          </h2>
          <p className="mt-1 text-xs text-slate-300">
            In the full version, you’ll see points, badges, and how many
            students you have helped.
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
        <h2 className="text-sm font-semibold text-white mb-3">
          Apply as Tutor
        </h2>
        <p className="text-xs text-slate-300 mb-4">
          This form is for development/demo. Later, details will be pre-filled
          from your authenticated profile.
        </p>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Email (USM)
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

          <div className="md:col-span-1">
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

          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Programme
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500"
              placeholder="BSc Computer Science"
              value={programme}
              onChange={(e) => setProgramme(e.target.value)}
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-slate-300 mb-1">
              CGPA (optional)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="4"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500"
              value={cgpa}
              onChange={(e) => setCgpa(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Subjects / Courses you can teach
            </label>
            <textarea
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500"
              rows={3}
              placeholder="Example: WIA2003 Data Structures, WIA2001 Algorithms, TAM100 Intro to Programming"
              value={subjects}
              onChange={(e) => setSubjects(e.target.value)}
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Availability
            </label>
            <textarea
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500"
              rows={2}
              placeholder="E.g., Weeknights 8–10 PM, weekends after 2 PM"
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-between gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
            >
              {loading ? "Submitting..." : "Submit Application"}
            </button>

            {status && (
              <p className="text-xs text-amber-300">{status}</p>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
