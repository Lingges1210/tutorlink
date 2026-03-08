"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  FileText,
  Loader2,
  Paperclip,
  Send,
  ShieldAlert,
} from "lucide-react";

const CATEGORY_OPTIONS = [
  { value: "ACCOUNT_LOCK_APPEAL", label: "Account Lock Appeal" },
  { value: "MISCONDUCT", label: "Misconduct" },
  { value: "NO_SHOW", label: "No-show" },
  { value: "INAPPROPRIATE_CHAT", label: "Inappropriate Chat" },
  { value: "SESSION_ISSUE", label: "Session Issue" },
  { value: "TECHNICAL_ISSUE", label: "Technical Issue" },
  { value: "GENERAL_COMPLAINT", label: "General Complaint" },
];

function getCategoryLabel(value: string) {
  return CATEGORY_OPTIONS.find((c) => c.value === value)?.label ?? value;
}

export default function ReportPage() {
  const searchParams = useSearchParams();
  const presetCategory = searchParams.get("category") || "GENERAL_COMPLAINT";

  const [category, setCategory] = useState(presetCategory);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [reportedUserId, setReportedUserId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [chatChannelId, setChatChannelId] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const categoryLabel = useMemo(() => getCategoryLabel(category), [category]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setMsg(null);

    try {
      const formData = new FormData();
      formData.append("category", category);
      formData.append("subject", subject);
      formData.append("description", description);

      if (reportedUserId) formData.append("reportedUserId", reportedUserId);
      if (sessionId) formData.append("sessionId", sessionId);
      if (chatChannelId) formData.append("chatChannelId", chatChannelId);
      if (evidenceFile) formData.append("evidence", evidenceFile);

      const res = await fetch("/api/reports", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to submit report");
      }

      setMsg("Your report has been submitted successfully.");
      setSubject("");
      setDescription("");
      setReportedUserId("");
      setSessionId("");
      setChatChannelId("");
      setEvidenceFile(null);
      setCategory(presetCategory || "GENERAL_COMPLAINT");
    } catch (error: any) {
      setErr(error?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-2 text-sm text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--fg))]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm">
          <div className="mb-6 flex items-start gap-3">
            <div className="rounded-2xl bg-red-500/10 p-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Submit a Report</h1>
              <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">
                Report issues, appeal an account lock, or raise complaints with optional
                evidence.
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-2xl border border-[rgb(var(--border))] bg-transparent px-4 py-3 outline-none"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief title of your issue"
                className="w-full rounded-2xl border border-[rgb(var(--border))] bg-transparent px-4 py-3 outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain what happened clearly and include important details."
                rows={7}
                className="w-full rounded-2xl border border-[rgb(var(--border))] bg-transparent px-4 py-3 outline-none"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium">Reported User ID</label>
                <input
                  value={reportedUserId}
                  onChange={(e) => setReportedUserId(e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-2xl border border-[rgb(var(--border))] bg-transparent px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Session ID</label>
                <input
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-2xl border border-[rgb(var(--border))] bg-transparent px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Chat Channel ID</label>
                <input
                  value={chatChannelId}
                  onChange={(e) => setChatChannelId(e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-2xl border border-[rgb(var(--border))] bg-transparent px-4 py-3 outline-none"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--bg-secondary))] p-4">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Paperclip className="h-4 w-4" />
                Evidence (optional)
              </label>

              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                className="block w-full rounded-2xl border border-[rgb(var(--border))] bg-transparent px-4 py-3 text-sm outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-[rgb(var(--card))] file:px-3 file:py-2"
              />

              <p className="mt-2 text-xs text-[rgb(var(--muted-foreground))]">
                Accepted: PNG, JPG, WEBP, PDF. Maximum 5MB.
              </p>

              {evidenceFile ? (
                <div className="mt-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <FileText className="h-4 w-4" />
                    {evidenceFile.name}
                  </div>
                  <div className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">
                    {(evidenceFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              ) : null}
            </div>

            {msg ? (
              <div className="rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-300">
                {msg}
              </div>
            ) : null}

            {err ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                {err}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-[rgb(var(--fg))] px-5 py-3 text-sm font-semibold text-[rgb(var(--bg))] disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {loading ? "Submitting..." : "Submit Report"}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm">
            <div className="mb-3 flex items-start gap-3">
              <div className="rounded-2xl bg-amber-500/10 p-3">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Current Selection</h2>
                <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">
                  Your selected report category.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-secondary))] px-4 py-3">
              <div className="text-sm font-medium">{categoryLabel}</div>
            </div>
          </div>

          <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Tips</h2>
            <ul className="mt-3 space-y-3 text-sm text-[rgb(var(--muted-foreground))]">
              <li>Be specific about what happened.</li>
              <li>Add session or chat IDs if the issue is linked to them.</li>
              <li>Upload screenshots or PDFs if you have proof.</li>
              <li>Use the subject field as a short summary.</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}