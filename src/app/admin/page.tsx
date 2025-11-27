// src/app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";

type TutorApplication = {
  id: string;
  subjects: string;
  cgpa: number | null;
  availability: string | null;
  status: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    programme: string | null;
  };
};

export default function AdminPage() {
  const [applications, setApplications] = useState<TutorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  async function fetchApplications() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/tutor-applications?status=PENDING");
      const data = await res.json();
      if (res.ok && data.success) {
        setApplications(data.applications);
      } else {
        setActionMessage(data.message || "Failed to load applications");
      }
    } catch (err: any) {
      setActionMessage(err.message ?? "Error loading applications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchApplications();
  }, []);

  async function handleAction(id: string, action: "APPROVE" | "REJECT") {
    setActionMessage(null);
    try {
      const res = await fetch("/api/admin/tutor-applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: id, action }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setActionMessage(data.message || "Failed to update application");
        return;
      }

      setActionMessage(data.message);
      // Refresh list
      fetchApplications();
    } catch (err: any) {
      setActionMessage(err.message ?? "Error updating application");
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Admin Panel</h1>
        <p className="mt-1 text-sm text-slate-300">
          Review tutor applications, manage user roles, and monitor activity.
        </p>
      </header>

      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">
            Pending Tutor Applications
          </h2>
          <button
            onClick={fetchApplications}
            className="text-xs rounded-md border border-slate-700 px-2 py-1 text-slate-200 hover:border-violet-500"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-xs text-slate-400">Loading applications...</p>
        ) : applications.length === 0 ? (
          <p className="text-xs text-slate-400">
            No pending applications at the moment.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-300">
                  <th className="py-2 pr-3">Tutor</th>
                  <th className="py-2 pr-3">Programme</th>
                  <th className="py-2 pr-3">Subjects</th>
                  <th className="py-2 pr-3">CGPA</th>
                  <th className="py-2 pr-3">Availability</th>
                  <th className="py-2 pr-3">Applied At</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr
                    key={app.id}
                    className="border-b border-slate-800/60 last:border-0"
                  >
                    <td className="py-2 pr-3 align-top">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-100">
                          {app.user.name || "(No name)"}
                        </span>
                        <span className="text-[0.7rem] text-slate-400">
                          {app.user.email}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 pr-3 align-top text-slate-200">
                      {app.user.programme || "-"}
                    </td>
                    <td className="py-2 pr-3 align-top text-slate-200 max-w-xs">
                      <div className="line-clamp-3">{app.subjects}</div>
                    </td>
                    <td className="py-2 pr-3 align-top text-slate-200">
                      {app.cgpa !== null ? app.cgpa.toFixed(2) : "-"}
                    </td>
                    <td className="py-2 pr-3 align-top text-slate-200 max-w-xs">
                      <div className="line-clamp-2">
                        {app.availability || "-"}
                      </div>
                    </td>
                    <td className="py-2 pr-3 align-top text-slate-300">
                      {new Date(app.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3 align-top">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleAction(app.id, "APPROVE")}
                          className="rounded-md bg-emerald-600 px-2 py-1 text-[0.7rem] font-medium text-white hover:bg-emerald-500"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(app.id, "REJECT")}
                          className="rounded-md bg-rose-600 px-2 py-1 text-[0.7rem] font-medium text-white hover:bg-rose-500"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {actionMessage && (
          <p className="mt-3 text-xs text-amber-300">{actionMessage}</p>
        )}
      </section>
    </div>
  );
}
