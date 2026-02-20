// src/app/dashboard/student/apply-tutor/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type AppStatus = "PENDING" | "APPROVED" | "REJECTED";

export default function ApplyTutorPage() {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectInput, setSubjectInput] = useState("");
  const [subjectSuggestions, setSubjectSuggestions] = useState<string[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const [cgpa, setCgpa] = useState("");

  //  transcript (REQUIRED)
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [transcriptPath, setTranscriptPath] = useState<string | null>(null);
  const [uploadingTranscript, setUploadingTranscript] = useState(false);

  const [existingStatus, setExistingStatus] = useState<AppStatus | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // dropdown animation mount/unmount
  const [dropdownMounted, setDropdownMounted] = useState(false);
  const [dropdownShow, setDropdownShow] = useState(false);

  const cgpaNumber = useMemo(() => {
    const n = Number(cgpa);
    return cgpa.trim() && Number.isFinite(n) ? n : null;
  }, [cgpa]);

  const query = subjectInput.trim();
  const dropdownOpen = suggestOpen && query.length > 0;

  // animate open/close
  useEffect(() => {
    if (dropdownOpen) {
      setDropdownMounted(true);
      requestAnimationFrame(() => setDropdownShow(true));
      return;
    }

    setDropdownShow(false);
    const t = setTimeout(() => setDropdownMounted(false), 150);
    return () => clearTimeout(t);
  }, [dropdownOpen]);

  function normalizeSubject(s: string) {
    return s.replace(/\s+/g, " ").trim();
  }

  function subjectKey(raw: string) {
    const s = normalizeSubject(raw);
    const head = s.split(/[:\-]/)[0] ?? s;
    return head.replace(/\s+/g, "").toLowerCase();
  }

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-subject-wrap]")) setSuggestOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  function formatSubjectStrict(raw: string) {
    const s = raw.trim();
    if (!s) return "";

    // allow ":" or "-" as separator
    const parts = s.split(/[:\-]/);

    const code = (parts[0] ?? "").trim().toUpperCase();
    const titleRaw = (parts[1] ?? "").trim();

    //  MUST have BOTH code + title
    if (!code || !titleRaw) return "";

    const title = titleRaw
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    return `${code} : ${title}`;
  }

  const [subjectError, setSubjectError] = useState<string | null>(null);

  function addSubject(raw: string) {
    const formatted = formatSubjectStrict(raw);

    if (!formatted) {
      setSubjectError(
        "Please enter subject in this format: CPT112 : Discrete Structures"
      );
      return;
    }

    setSubjects((prev) => {
      const exists = prev.some((x) => x.toLowerCase() === formatted.toLowerCase());
      return exists ? prev : [...prev, formatted];
    });

    setSubjectInput("");
    setSuggestOpen(false);
    setSubjectError(null);
  }

  function removeSubject(s: string) {
    setSubjects((prev) => prev.filter((x) => x !== s));
  }

  const filteredSuggestions = useMemo(() => {
    const q = subjectInput.trim().toLowerCase();
    if (!q) return [];

    return subjectSuggestions
      .filter((s) => s.toLowerCase().includes(q))
      .filter((s) => !subjects.some((x) => x.toLowerCase() === s.toLowerCase()))
      .slice(0, 8);
  }, [subjectInput, subjectSuggestions, subjects]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/tutor/subject-suggestions", {
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success && Array.isArray(data.suggestions)) {
          setSubjectSuggestions(data.suggestions);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

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
        const rawSubjects = String(app.subjects ?? "");

        const normalized = rawSubjects.replace(/•/g, "\n");

        const parsedSubjects = normalized
          .split(/,|\r?\n|;/g)
          .map((s) => s.trim())
          .filter(Boolean);

        setSubjects(parsedSubjects);

        setCgpa(typeof app.cgpa === "number" ? String(app.cgpa) : "");
        setTranscriptPath(app.transcriptPath ?? null);
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
    setTranscriptPath(null);
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
      //  REQUIRED checks (availability removed)
      if (subjects.length === 0) throw new Error("Subjects is required.");
      if (cgpaNumber === null) throw new Error("CGPA is required.");

      //  transcript required
      const uploadedPath = await uploadTranscript();

      const res = await fetch("/api/tutor/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjects,
          cgpa: cgpaNumber,
          transcriptPath: uploadedPath,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to submit");
      }

      setExistingStatus("PENDING");
      setRejectionReason(null);
      setSubjects([]);
      setCgpa("");
      setTranscriptFile(null);
      setTranscriptPath(null);

      setStatusMsg("Application submitted. Awaiting admin approval.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setStatusMsg(msg);
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
        <Link
          href="/dashboard/student"
          className="text-xs text-[rgb(var(--primary))] hover:underline"
        >
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
           You’re approved as a Tutor.
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
          {/* SUBJECTS */}
          <div>
            <label className="mb-1 block text-xs text-[rgb(var(--muted))]">
              Subjects (required)
            </label>

            {subjects.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {subjects.map((s) => (
                  <span
                    key={s}
                    className="
                      group inline-flex items-center gap-2
                      rounded-full px-4 py-1.5
                      text-xs font-medium
                      transition-all duration-200
                      bg-gradient-to-r
                      from-[rgb(var(--primary)/0.18)]
                      to-[rgb(var(--primary)/0.10)]
                      text-[rgb(var(--fg))]
                      border border-[rgb(var(--primary)/0.25)]
                      hover:scale-[1.03]
                      hover:shadow-md
                    "
                  >
                    <span className="tracking-tight">{s}</span>

                    <button
                      type="button"
                      onClick={() => removeSubject(s)}
                      className="
                        flex items-center justify-center
                        w-4 h-4 rounded-full
                        bg-[rgb(var(--primary)/0.15)]
                        text-[rgb(var(--primary))]
                        transition
                        group-hover:bg-[rgb(var(--primary))]
                        group-hover:text-white
                      "
                      title="Remove"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative w-full" data-subject-wrap>
              <input
                value={subjectInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setSubjectInput(v);
                  setSuggestOpen(v.trim().length > 0);
                }}
                onFocus={() => setSuggestOpen(subjectInput.trim().length > 0)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSubject(subjectInput);
                  }
                  if (e.key === "Escape") setSuggestOpen(false);
                }}
                placeholder="Type subject (e.g. CPT112 : Discrete Structures)"
                className={[
                  "w-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2",
                  "text-sm text-[rgb(var(--fg))] outline-none focus:border-[rgb(var(--primary))]",
                  dropdownMounted
                    ? "rounded-t-md rounded-b-none border-b-0"
                    : "rounded-md",
                ].join(" ")}
              />

              {dropdownMounted && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: "100%",
                    zIndex: 50,
                    overflow: "hidden",
                    borderBottomLeftRadius: 6,
                    borderBottomRightRadius: 6,
                    border: "1px solid rgb(var(--border))",
                    borderTop: "0px",
                    background: "rgb(var(--card))",
                    boxShadow: "0 20px 50px rgb(var(--shadow) / 0.12)",
                    transformOrigin: "top",
                    transition: "opacity 150ms ease-out, transform 150ms ease-out",
                    opacity: dropdownShow ? 1 : 0,
                    transform: dropdownShow ? "translateY(0px)" : "translateY(-4px)",
                    pointerEvents: dropdownShow ? "auto" : "none",
                  }}
                >
                  <div
                    style={{
                      maxHeight: 132,
                      overflowY: "auto",
                      overscrollBehavior: "contain",
                    }}
                  >
                    {filteredSuggestions.length > 0 ? (
                      filteredSuggestions.map((raw) => {
                        const formatted = formatSubjectStrict(raw) || raw;
                        const [codeRaw, titleRaw] = formatted.split(":");
                        const code = (codeRaw ?? "").trim().toUpperCase();
                        const title = (titleRaw ?? "").trim();

                        return (
                          <button
                            key={raw}
                            type="button"
                            onClick={() => addSubject(formatted)}
                            style={{
                              width: "100%",
                              height: 44,
                              padding: "0 12px",
                              textAlign: "left",
                              display: "flex",
                              alignItems: "center",
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.background =
                                "rgb(var(--card2))";
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.background =
                                "transparent";
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                minWidth: 0,
                                width: "100%",
                              }}
                            >
                              <span
                                style={{
                                  minWidth: 84,
                                  textAlign: "center",
                                  borderRadius: 6,
                                  border: "1px solid rgb(var(--primary) / 0.25)",
                                  background: "rgb(var(--primary) / 0.12)",
                                  padding: "6px 12px",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  letterSpacing: "0.06em",
                                  color: "rgb(var(--primary))",
                                  flexShrink: 0,
                                }}
                              >
                                {code}
                              </span>

                              <span
                                style={{
                                  fontSize: 14,
                                  fontWeight: 600,
                                  color: "rgb(var(--fg))",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  minWidth: 0,
                                }}
                              >
                                {title || formatted}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div
                        style={{
                          height: 44,
                          padding: "0 12px",
                          display: "flex",
                          alignItems: "center",
                          fontSize: 14,
                          color: "rgb(var(--muted))",
                        }}
                      >
                        No results found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-1 text-[11px] text-[rgb(var(--muted2))]">
              Tip: Use <b>CPT112 : Discrete Structures</b> then press <b>Enter</b>.
            </div>

            {subjectError && (
              <div className="mt-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-600">
                {subjectError}
              </div>
            )}
          </div>

          {/* CGPA */}
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

          {/* TRANSCRIPT */}
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
                  ? `Uploaded: ${transcriptPath}`
                  : transcriptFile
                  ? `Selected: ${transcriptFile.name}`
                  : "PDF/PNG/JPG • Max 8MB"}
              </div>

              {uploadingTranscript && (
                <div className="shrink-0 text-amber-500/90">Uploading…</div>
              )}
            </div>
          </div>

          {/* SUBMIT */}
          <button
            type="button"
            disabled={
              loading ||
              uploadingTranscript ||
              subjects.length === 0 ||
              cgpaNumber === null ||
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