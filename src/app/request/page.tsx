"use client";

import { useState } from "react";

export default function RequestPage() {
  const [studentId, setStudentId] = useState<number | "">("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: typeof studentId === "string" ? Number(studentId) : studentId,
          subject,
          description,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setMsg(`✅ Request #${data.id} created`);
      setSubject("");
      setDescription("");
    } catch (err: any) {
      setMsg("❌ Failed to create request");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Request Help</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-1">
          <label className="text-sm">Student ID</label>
          <input
            type="number"
            className="border rounded px-3 py-2"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value === "" ? "" : Number(e.target.value))}
            required
          />
        </div>

        <div className="grid gap-1">
          <label className="text-sm">Subject</label>
          <input
            className="border rounded px-3 py-2"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g., Calculus"
            required
          />
        </div>

        <div className="grid gap-1">
          <label className="text-sm">Description (optional)</label>
          <textarea
            className="border rounded px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Briefly describe what you need help with"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-md px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Submitting..." : "Submit Request"}
        </button>
      </form>

      {msg && <p className="text-sm">{msg}</p>}
    </div>
  );
}
