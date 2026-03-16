"use client";

import { useState } from "react";
import { Loader2, Send, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function AccountLockAppealPage() {
  const [description, setDescription] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submitAppeal(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMsg(null);
    setErr(null);

    try {
      const formData = new FormData();
      formData.append("category", "ACCOUNT_LOCK_APPEAL");
      formData.append("subject", "Account Lock Appeal");
      formData.append("description", description);

      if (evidenceFile) {
        formData.append("evidence", evidenceFile);
      }

      const res = await fetch("/api/account-lock-appeal", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to submit appeal");
      }

      setMsg("Appeal submitted successfully. Admin will review it soon.");
      setDescription("");
      setEvidenceFile(null);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-8">
        <h1 className="text-2xl font-semibold">Account Lock Appeal</h1>

        <p className="mt-2 text-sm text-[rgb(var(--muted))]">
          If you believe your account was locked by mistake, you may submit an
          appeal here. Admin will review your case.
        </p>

        <form onSubmit={submitAppeal} className="mt-6 space-y-4">

          <textarea
            required
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain your situation clearly..."
            className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-3 text-sm outline-none"
          />

          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
            onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
          />

          {msg && (
            <div className="flex gap-2 text-emerald-600 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              {msg}
            </div>
          )}

          {err && (
            <div className="flex gap-2 text-rose-600 text-sm">
              <AlertTriangle className="h-4 w-4" />
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[rgb(var(--primary))] px-5 py-3 text-sm font-semibold text-white"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Submit Appeal
          </button>
        </form>
      </div>
    </div>
  );
}