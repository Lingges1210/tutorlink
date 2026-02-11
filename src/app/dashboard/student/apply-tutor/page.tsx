"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type AppStatus = "PENDING" | "APPROVED" | "REJECTED";

export default function ApplyTutorPage() {
  const [subjects, setSubjects] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [availability, setAvailability] = useState("");

  // ✅ transcript (REQUIRED)
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [transcriptPath, setTranscriptPath] = useState<string | null>(null);
  const [uploadingTranscript, setUploadingTranscript] = useState(false);

  const [existingStatus, setExistingStatus] = useState<AppStatus | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const cgpaNumber = useMemo(() => {
    const n = Number(cgpa);
    return cgpa.trim() && Number.isFinite(n) ? n : null;
  }, [cgpa]);

  async function loadExisting() {
    setInitialLoading(true);

    try {
      const res = await fetch("/api/tutor/application", { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setExistingStatus(null);
        setRejectionReason(null);
        return;
      }

      const app = data?.application ?? null;

      if (!app) {
        setExistingStatus(null);
        setRejectionReason(null);
        return;
      }

      const rawStatus = String(app.status ?? "").toUpperCase();
      const normalizedStatus: AppStatus | null =
        rawStatus === "PENDING" || rawStatus === "APPROVED" || rawStatus === "REJECTED"
          ? (rawStatus as AppStatus)
          : null;

      setExistingStatus(normalizedStatus);
      setRejectionReason(app.rejectionReason ?? null);

      // Prefill fields ONLY for rejected (so they can edit & resubmit)
      if (normalizedStatus === "REJECTED") {
        setSubjects(app.subjects ?? "");
        setCgpa(typeof app.cgpa === "number" ? String(app.cgpa) : "");
        setAvailability(app.availability ?? "");
        setTranscriptPath(app.transcriptPath ?? null); // if stored
      }
    } catch {
      // ignore
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    loadExisting();
  }, []);

  function onPickTranscript(file: File | null) {
    setTranscriptFile(file);
    setTranscriptPath(null); // reset old path if they pick a new file
    if (file) setStatusMsg(null);
  }

  async function uploadTranscript(): Promise<string> {
  if (!transcriptFile && transcriptPath) return transcriptPath;

  if (!transcriptFile) {
    throw new Error("Please upload your academic transcript (required).");
  }

  setUploadingTranscript(true);
  try {
    const form = new FormData();
    form.append("file", transcriptFile);

    const res = await fetch("/api/tutor/upload-transcript", {
      method: "POST",
      body: form,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.success) {
      throw new Error(data?.message || "Failed to upload transcript");
    }

    setTranscriptPath(data.transcriptPath);
    return data.transcriptPath as string;
  } finally {
    setUploadingTranscript(false);
  }
}


  async function submit() {
    setLoading(true);
    setStatusMsg(null);

    try {
      // ✅ REQUIRED checks
      if (!subjects.trim()) throw new Error("Subjects is required.");
      if (cgpaNumber === null) throw new Error("CGPA is required.");
      if (!availability.trim()) throw new Error("Availability is required.");

      // ✅ transcript required
      const uploadedPath = await uploadTranscript();

      const res = await fetch("/api/tutor/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjects,
          cgpa: cgpaNumber,
          availability: availability.trim(),
          transcriptPath: uploadedPath,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to submit");
      }

      setExistingStatus("PENDING");
      setRejectionReason(null);
      setSubjects("");
      setCgpa("");
      setAvailability("");
      setTranscriptFile(null);
      setTranscriptPath(null);

      setStatusMsg("✅ Application submitted. Awaiting admin approval.");
    } catch (e: any) {
      setStatusMsg(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (initialLoading) {
    return (
      <div className="max-w-xl space-y-3">
        <h1 className="text-xl font-semibold text-[rgb(var(--fg))]">Apply as Tutor</h1>
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-4 text-sm text-[rgb(var(--muted))]">
          Loading your application status…
        </div>
      </div>
    );
  }

  if (existingStatus === "PENDING") {
    return (
      <div className="max-w-xl space-y-4">
        <h1 className="text-xl font-semibold text-[rgb(var(--fg))]">Apply as Tutor</h1>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-[rgb(var(--fg))]">
          ⏳ Your application is <b>Pending</b>. Please wait for admin review.
        </div>
        <Link href="/dashboard/student" className="text-xs text-[rgb(var(--primary))] hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (existingStatus === "APPROVED") {
    return (
      <div className="max-w-xl space-y-4">
        <h1 className="text-xl font-semibold text-[rgb(var(--fg))]">Apply as Tutor</h1>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-[rgb(var(--fg))]">
          ✅ You’re approved as a Tutor.
        </div>
        <Link
          href="/dashboard/tutor"
          className="inline-flex items-center justify-center rounded-md bg-[rgb(var(--primary))] px-3 py-2 text-xs font-semibold text-white"
        >
          Go to Tutor Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[rgb(var(--fg))]">Apply as Tutor</h1>
        <p className="mt-1 text-xs text-[rgb(var(--muted))]">
          Fill in all required details. Admin will review your request.
        </p>
      </div>

      {existingStatus === "REJECTED" && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-[rgb(var(--fg))]">
          ❌ Your previous application was <b>rejected</b>.
          <div className="mt-1 text-xs text-[rgb(var(--muted))]">
            You may edit your details below and resubmit.
          </div>

          <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-[rgb(var(--fg))]">
            <span className="font-semibold">Reason:</span>{" "}
            {rejectionReason?.trim()
              ? rejectionReason
              : "No reason provided. Please improve your details and resubmit."}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card) / 0.7)] p-5">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-[rgb(var(--muted))]">
              Subjects (required)
            </label>
            <input
              value={subjects}
              onChange={(e) => setSubjects(e.target.value)}
              placeholder="e.g. Discrete Math, Programming II"
              className="w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none focus:border-[rgb(var(--primary))]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-[rgb(var(--muted))]">
              CGPA (required)
            </label>
            <input
              type="number"
              step="0.01"
              value={cgpa}
              onChange={(e) => setCgpa(e.target.value)}
              placeholder="3.80"
              className="w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none focus:border-[rgb(var(--primary))]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-[rgb(var(--muted))]">
              Academic Transcript (required)
            </label>
            <input
              type="file"
              accept=".pdf,image/png,image/jpeg,image/jpg"
              onChange={(e) => onPickTranscript(e.target.files?.[0] ?? null)}
              className="w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-xs text-[rgb(var(--fg))] outline-none"
            />

            <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[rgb(var(--muted))]">
              <div className="truncate">
                {transcriptPath
                  ? `✅ Uploaded: ${transcriptPath}`
                  : transcriptFile
                  ? `Selected: ${transcriptFile.name}`
                  : "PDF/PNG/JPG • Max 8MB"}
              </div>

              {uploadingTranscript && (
                <div className="shrink-0 text-amber-500/90">Uploading…</div>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-[rgb(var(--muted))]">
              Availability (required)
            </label>
            <textarea
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              placeholder="Mon/Wed 8–10pm, Sat 2–5pm..."
              className="min-h-[90px] w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none focus:border-[rgb(var(--primary))]"
            />
          </div>

          <button
            type="button"
            disabled={
              loading ||
              uploadingTranscript ||
              !subjects.trim() ||
              cgpaNumber === null ||
              !availability.trim() ||
              (!transcriptPath && !transcriptFile)
            }
            onClick={submit}
            className="w-full rounded-md bg-[rgb(var(--primary))] py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Submitting..." : "Submit Application"}
          </button>

          {statusMsg && (
            <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-xs text-[rgb(var(--fg))]">
              {statusMsg}
            </div>
          )}

          <Link
            href="/dashboard/student"
            className="block text-center text-xs text-[rgb(var(--primary))] hover:underline"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
