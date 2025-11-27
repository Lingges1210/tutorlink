// src/app/find-tutor/page.tsx
"use client";

import { useState } from "react";

type DummyTutor = {
  id: number;
  name: string;
  programme: string;
  subjects: string[];
  year: string;
  rating: number;
  sessions: number;
};

const dummyTutors: DummyTutor[] = [
  {
    id: 1,
    name: "Aiman Faris",
    programme: "BSc Computer Science",
    subjects: ["WIA2003 Data Structures", "WIA2001 Algorithms"],
    year: "Year 3",
    rating: 4.8,
    sessions: 24,
  },
  {
    id: 2,
    name: "Nurul Iman",
    programme: "BSc Mathematics",
    subjects: ["Calculus I", "Linear Algebra"],
    year: "Year 2",
    rating: 4.6,
    sessions: 18,
  },
  {
    id: 3,
    name: "Harith Kumar",
    programme: "BSc Computer Science",
    subjects: ["Database Systems", "Operating Systems"],
    year: "Final Year",
    rating: 4.9,
    sessions: 31,
  },
];

export default function FindTutorPage() {
  const [query, setQuery] = useState("");

  const filtered = dummyTutors.filter((tutor) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      tutor.name.toLowerCase().includes(q) ||
      tutor.programme.toLowerCase().includes(q) ||
      tutor.subjects.some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-50">Find a Tutor</h1>
        <p className="mt-2 text-sm text-slate-300 max-w-2xl">
          Search by subject, course code, or tutor name. In the full version,
          this page will show real tutors approved by the admin, filtered based
          on your programme and availability.
        </p>
      </header>

      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <label className="block text-[0.7rem] font-medium text-slate-300 mb-1">
              Search by subject or course code
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500"
              placeholder="e.g. WIA2003, Data Structures, Calculus"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-slate-300">
          {filtered.length} tutor(s) available (mock data for now)
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {filtered.map((tutor) => (
            <div
              key={tutor.id}
              className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/80 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-50">
                    {tutor.name}
                  </div>
                  <div className="text-[0.7rem] text-slate-400">
                    {tutor.programme} · {tutor.year}
                  </div>
                </div>
                <div className="rounded-md bg-slate-950 px-2 py-1 text-[0.65rem] text-slate-300 border border-slate-700">
                  ⭐ {tutor.rating.toFixed(1)} · {tutor.sessions} sessions
                </div>
              </div>

              <div className="mt-3 space-y-1 text-[0.7rem] text-slate-300">
                <div className="font-medium text-slate-200">
                  Subjects / Courses:
                </div>
                <ul className="list-disc pl-4 space-y-0.5">
                  {tutor.subjects.map((subj) => (
                    <li key={subj}>{subj}</li>
                  ))}
                </ul>
              </div>

              <button
                className="mt-4 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-slate-50 hover:bg-violet-500"
                type="button"
              >
                Request Session (Coming Soon)
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
