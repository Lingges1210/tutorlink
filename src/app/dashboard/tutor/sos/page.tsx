"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, RefreshCcw, XCircle } from "lucide-react";

type Subject = { id: string; code: string; title: string };
type Student = { id: string; name: string | null; email: string; avatarUrl: string | null };

type SOS = {
  id: string;
  description: string;
  mode: string;
  status: string;
  createdAt: string;
  subject: Subject;
  student: Student;
};

const CHAT_ROUTE_BASE = "/messaging";

export default function TutorSOSPage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<SOS[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/tutor/sos/incoming", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load");
      setRequests(json.requests || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function respond(id: string, decision: "ACCEPT" | "DECLINE") {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/tutor/sos/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");

      // If accepted: redirect to chat
      if (json.status === "ACCEPTED" && json.channelId) {
        window.location.href = `${CHAT_ROUTE_BASE}?channelId=${encodeURIComponent(
          json.channelId
        )}`;
        return;
      }

      await load();
    } catch (e: any) {
      setError(e?.message || "Failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Incoming SOS Requests</h1>
          <p className="text-sm text-muted-foreground">
            Accept to instantly create a session + chat with the student.
          </p>
        </div>

        <button
          onClick={load}
          className="h-10 rounded-xl border px-3 inline-flex items-center gap-2"
          disabled={loading}
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="border-b px-4 py-3 text-sm font-medium">Requests</div>

        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No SOS requests right now.</div>
        ) : (
          <div className="divide-y">
            {requests.map((r) => (
              <div key={r.id} className="p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">
                      {r.subject.code} — {r.subject.title}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {r.description}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Student: {r.student.name ?? r.student.email} • Mode: {r.mode} •{" "}
                      {new Date(r.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => respond(r.id, "ACCEPT")}
                      disabled={busyId === r.id}
                      className="h-9 rounded-xl bg-black px-3 text-white inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4" />
                      {busyId === r.id ? "Accepting..." : "Accept"}
                    </button>

                    <button
                      onClick={() => respond(r.id, "DECLINE")}
                      disabled={busyId === r.id}
                      className="h-9 rounded-xl border px-3 inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Decline
                    </button>

                    <Link
                      href={`/dashboard/student/sos/${r.id}`}
                      className="h-9 rounded-xl border px-3 inline-flex items-center"
                    >
                      View
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}