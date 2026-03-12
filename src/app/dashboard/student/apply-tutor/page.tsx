"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, GraduationCap, FileText, Sparkles, ChevronRight, X, Upload, CheckCircle2, Clock, XCircle } from "lucide-react";

type AppStatus = "PENDING" | "APPROVED" | "REJECTED";

/* ─── tiny step indicator ─────────────────────────────────── */
const STEPS = [
  { icon: BookOpen,      label: "Subjects"    },
  { icon: GraduationCap, label: "Academic"    },
  { icon: FileText,      label: "Transcript"  },
];

function StepBar({ active }: { active: number }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const done    = i < active;
        const current = i === active;
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div
              className={[
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-300",
                done    ? "bg-[rgb(var(--primary)/0.15)] text-[rgb(var(--primary))]" : "",
                current ? "bg-[rgb(var(--primary))] text-white shadow-md shadow-[rgb(var(--primary)/0.35)]" : "",
                !done && !current ? "text-[rgb(var(--muted))]" : "",
              ].join(" ")}
            >
              <Icon size={11} />
              <span>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={[
                "flex-1 h-px mx-1 transition-all duration-500",
                done ? "bg-[rgb(var(--primary)/0.4)]" : "bg-[rgb(var(--border))]"
              ].join(" ")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── floating label input ───────────────────────────────── */
function FloatInput({
  label, value, onChange, placeholder, type = "text", step,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; step?: string;
}) {
  const [focused, setFocused] = useState(false);
  const filled = value.length > 0;

  return (
    <div className="relative">
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={focused ? placeholder : ""}
        className={[
          "peer w-full rounded-xl border bg-[rgb(var(--card2))] px-4 pt-6 pb-2",
          "text-sm text-[rgb(var(--fg))] outline-none transition-all duration-200",
          focused
            ? "border-[rgb(var(--primary))] ring-2 ring-[rgb(var(--primary)/0.12)]"
            : "border-[rgb(var(--border))] hover:border-[rgb(var(--primary)/0.4)]",
        ].join(" ")}
      />
      <label
        className={[
          "pointer-events-none absolute left-4 font-medium transition-all duration-200",
          (focused || filled)
            ? "top-2 text-[10px] text-[rgb(var(--primary))]"
            : "top-4 text-xs text-[rgb(var(--muted))]",
        ].join(" ")}
      >
        {label}
      </label>
    </div>
  );
}

/* ─── main page ──────────────────────────────────────────── */
export default function ApplyTutorPage() {
  const [subjects,           setSubjects]           = useState<string[]>([]);
  const [subjectInput,       setSubjectInput]       = useState("");
  const [subjectSuggestions, setSubjectSuggestions] = useState<string[]>([]);
  const [suggestOpen,        setSuggestOpen]        = useState(false);
  const [subjectError,       setSubjectError]       = useState<string | null>(null);

  const [cgpa,               setCgpa]               = useState("");

  const [transcriptFile,     setTranscriptFile]     = useState<File | null>(null);
  const [transcriptPath,     setTranscriptPath]     = useState<string | null>(null);
  const [uploadingTranscript,setUploadingTranscript]= useState(false);
  const [dragOver,           setDragOver]           = useState(false);

  const [existingStatus,     setExistingStatus]     = useState<AppStatus | null>(null);
  const [rejectionReason,    setRejectionReason]    = useState<string | null>(null);

  const [statusMsg,          setStatusMsg]          = useState<string | null>(null);
  const [loading,            setLoading]            = useState(false);
  const [initialLoading,     setInitialLoading]     = useState(true);

  const [dropdownMounted,    setDropdownMounted]    = useState(false);
  const [dropdownShow,       setDropdownShow]       = useState(false);

  // which step is visually "active" based on fill state
  const activeStep = subjects.length > 0 ? (cgpa ? (transcriptPath || transcriptFile ? 3 : 2) : 1) : 0;

  const cgpaNumber = useMemo(() => {
    const n = Number(cgpa);
    return cgpa.trim() && Number.isFinite(n) ? n : null;
  }, [cgpa]);

  const query = subjectInput.trim();
  const dropdownOpen = suggestOpen && query.length > 0;

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
    const parts = s.split(/[:\-]/);
    const code = (parts[0] ?? "").trim().toUpperCase();
    const titleRaw = (parts[1] ?? "").trim();
    if (!code || !titleRaw) return "";
    const title = titleRaw.toLowerCase().split(/\s+/).filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    return `${code} : ${title}`;
  }

  function addSubject(raw: string) {
    const formatted = formatSubjectStrict(raw);
    if (!formatted) {
      setSubjectError("Use format: CPT112 : Discrete Structures");
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
        const res = await fetch("/api/tutor/subject-suggestions", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success && Array.isArray(data.suggestions))
          setSubjectSuggestions(data.suggestions);
      } catch { /* ignore */ }
    })();
  }, []);

  async function loadExisting() {
    setInitialLoading(true);
    try {
      const res  = await fetch("/api/tutor/application", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success || !data?.application) {
        setExistingStatus(null); setRejectionReason(null); return;
      }
      const app = data.application;
      const raw = String(app.status ?? "").toUpperCase();
      const normalized: AppStatus | null =
        raw === "PENDING" || raw === "APPROVED" || raw === "REJECTED" ? raw as AppStatus : null;
      setExistingStatus(normalized);
      setRejectionReason(app.rejectionReason ?? null);
      if (normalized === "REJECTED") {
        const parsedSubjects = String(app.subjects ?? "")
          .replace(/•/g, "\n").split(/,|\r?\n|;/g).map((s) => s.trim()).filter(Boolean);
        setSubjects(parsedSubjects);
        setCgpa(typeof app.cgpa === "number" ? String(app.cgpa) : "");
        setTranscriptPath(app.transcriptPath ?? null);
      }
    } catch { /* ignore */ }
    finally { setInitialLoading(false); }
  }

  useEffect(() => { loadExisting(); }, []);

  function onPickTranscript(file: File | null) {
    setTranscriptFile(file);
    setTranscriptPath(null);
    if (file) setStatusMsg(null);
  }

  async function uploadTranscript(): Promise<string> {
    if (!transcriptFile && transcriptPath) return transcriptPath;
    if (!transcriptFile) throw new Error("Please upload your academic transcript.");
    setUploadingTranscript(true);
    try {
      const form = new FormData();
      form.append("file", transcriptFile);
      const res  = await fetch("/api/tutor/upload-transcript", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || "Upload failed");
      setTranscriptPath(data.transcriptPath);
      return data.transcriptPath as string;
    } finally { setUploadingTranscript(false); }
  }

  async function submit() {
    setLoading(true); setStatusMsg(null);
    try {
      if (subjects.length === 0) throw new Error("Subjects is required.");
      if (cgpaNumber === null)   throw new Error("CGPA is required.");
      const uploadedPath = await uploadTranscript();
      const res  = await fetch("/api/tutor/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjects, cgpa: cgpaNumber, transcriptPath: uploadedPath }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to submit");
      setExistingStatus("PENDING");
      setRejectionReason(null);
      setSubjects([]); setCgpa(""); setTranscriptFile(null); setTranscriptPath(null);
      setStatusMsg("Application submitted. Awaiting admin approval.");
    } catch (e: unknown) {
      setStatusMsg(e instanceof Error ? e.message : "Something went wrong");
    } finally { setLoading(false); }
  }

  /* ── loading ── */
  if (initialLoading) return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-[rgb(var(--primary)/0.12)] animate-pulse" />
        <div className="h-5 w-40 rounded-lg bg-[rgb(var(--border))] animate-pulse" />
      </div>
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.6)] p-8 flex flex-col gap-4">
        {[90, 70, 80].map((w, i) => (
          <div key={i} className="h-10 rounded-xl bg-[rgb(var(--border))] animate-pulse" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );

  /* ── PENDING ── */
  if (existingStatus === "PENDING") return (
    <div className="max-w-xl space-y-5">
      <PageHeader />
      <StatusCard
        icon={<Clock size={20} className="text-amber-500" />}
        color="amber"
        title="Application Under Review"
        body="Your tutor application has been submitted and is awaiting admin review. We'll notify you once a decision has been made."
      />
      
    </div>
  );

  /* ── APPROVED ── */
  if (existingStatus === "APPROVED") return (
    <div className="max-w-xl space-y-5">
      <PageHeader />
      <StatusCard
        icon={<CheckCircle2 size={20} className="text-emerald-500" />}
        color="emerald"
        title="You're approved as a Tutor!"
        body="Congratulations! Your application has been approved. You can now access your Tutor Dashboard to start helping students."
      />
      <Link
        href="/dashboard/tutor"
        className="inline-flex items-center gap-2 rounded-xl bg-[rgb(var(--primary))] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[rgb(var(--primary)/0.3)] hover:opacity-90 transition-opacity"
      >
        Go to Tutor Dashboard <ChevronRight size={14} />
      </Link>
    </div>
  );

  /* ── FORM (null | REJECTED) ── */
  return (
    <div className="max-w-xl space-y-6">
      <PageHeader />

      {existingStatus === "REJECTED" && (
        <div className="rounded-2xl border border-rose-500/25 bg-rose-500/8 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--fg))]">
            <XCircle size={15} className="text-rose-500 shrink-0" />
            Previous application was rejected
          </div>
          <p className="text-xs text-[rgb(var(--muted))] leading-relaxed">
            You may edit your details below and resubmit.
          </p>
          {rejectionReason?.trim() && (
            <div className="mt-1 rounded-xl border border-rose-500/20 bg-rose-500/8 px-3 py-2 text-xs text-[rgb(var(--fg))] leading-relaxed">
              <span className="font-semibold text-rose-500">Reason: </span>
              {rejectionReason}
            </div>
          )}
        </div>
      )}

      {/* card */}
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.6)] backdrop-blur-sm overflow-hidden">

        {/* gradient header strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[rgb(var(--primary)/0.7)] via-[rgb(var(--primary))] to-[rgb(var(--primary)/0.5)]" />

        <div className="p-5 space-y-6">
          <StepBar active={activeStep} />

          {/* ── SUBJECTS ── */}
          <Section
            step={1}
            icon={<BookOpen size={13} />}
            title="Subjects"
            hint="Add all subjects you'd like to tutor"
            done={subjects.length > 0}
          >
            {subjects.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {subjects.map((s) => {
                  const [code, title] = s.split(" : ");
                  return (
                    <span
                      key={s}
                      className="group inline-flex items-center gap-2 rounded-full border border-[rgb(var(--primary)/0.22)] bg-gradient-to-r from-[rgb(var(--primary)/0.15)] to-[rgb(var(--primary)/0.07)] px-3 py-1 text-[11px] font-medium text-[rgb(var(--fg))] transition-all hover:scale-[1.02] hover:shadow-md hover:shadow-[rgb(var(--primary)/0.12)]"
                    >
                      <span className="font-bold text-[rgb(var(--primary))]">{code}</span>
                      {title && <span className="opacity-70">{title}</span>}
                      <button
                        type="button"
                        onClick={() => removeSubject(s)}
                        className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))] transition group-hover:bg-rose-500 group-hover:text-white"
                      >
                        <X size={9} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            <div className="relative" data-subject-wrap>
              <input
                value={subjectInput}
                onChange={(e) => { setSubjectInput(e.target.value); setSuggestOpen(e.target.value.trim().length > 0); }}
                onFocus={() => setSuggestOpen(subjectInput.trim().length > 0)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addSubject(subjectInput); }
                  if (e.key === "Escape") setSuggestOpen(false);
                }}
                placeholder="e.g. CPT112 : Discrete Structures"
                className={[
                  "w-full border bg-[rgb(var(--card2))] px-4 py-3 text-sm text-[rgb(var(--fg))] outline-none transition-all duration-200 placeholder:text-[rgb(var(--muted))]",
                  dropdownMounted ? "rounded-t-xl rounded-b-none border-b-0" : "rounded-xl",
                  "border-[rgb(var(--border))] focus:border-[rgb(var(--primary))] focus:ring-2 focus:ring-[rgb(var(--primary)/0.1)]",
                ].join(" ")}
              />

              {dropdownMounted && (
                <div style={{
                  position: "absolute", left: 0, right: 0, top: "100%", zIndex: 50,
                  borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
                  border: "1px solid rgb(var(--border))", borderTop: "0",
                  background: "rgb(var(--card))",
                  boxShadow: "0 24px 48px rgb(var(--shadow) / 0.14)",
                  transformOrigin: "top",
                  transition: "opacity 150ms ease-out, transform 150ms ease-out",
                  opacity: dropdownShow ? 1 : 0,
                  transform: dropdownShow ? "translateY(0)" : "translateY(-6px)",
                  pointerEvents: dropdownShow ? "auto" : "none",
                }}>
                  <div style={{ maxHeight: 176, overflowY: "auto", overscrollBehavior: "contain" }}>
                    {filteredSuggestions.length > 0 ? filteredSuggestions.map((raw) => {
                      const formatted = formatSubjectStrict(raw) || raw;
                      const [codeRaw, titleRaw] = formatted.split(" : ");
                      return (
                        <button
                          key={raw} type="button"
                          onClick={() => addSubject(formatted)}
                          style={{ width: "100%", padding: "10px 14px", textAlign: "left", display: "flex", alignItems: "center", gap: 12, border: "none", background: "transparent", cursor: "pointer" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgb(var(--card2))"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >
                          <span style={{
                            minWidth: 80, textAlign: "center", borderRadius: 8,
                            border: "1px solid rgb(var(--primary) / 0.25)", background: "rgb(var(--primary) / 0.1)",
                            padding: "4px 10px", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                            color: "rgb(var(--primary))", flexShrink: 0,
                          }}>
                            {(codeRaw ?? "").trim()}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 500, color: "rgb(var(--fg))", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {(titleRaw ?? "").trim() || formatted}
                          </span>
                        </button>
                      );
                    }) : (
                      <div style={{ padding: "12px 16px", fontSize: 13, color: "rgb(var(--muted))" }}>
                        No matches — press Enter to add manually
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <p className="mt-2 text-[11px] text-[rgb(var(--muted))]">
              Format: <b>CPT112 : Discrete Structures</b> then press Enter
            </p>

            {subjectError && (
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/8 px-3 py-2 text-xs text-rose-500">
                <XCircle size={12} className="shrink-0" /> {subjectError}
              </div>
            )}
          </Section>

          <Divider />

          {/* ── CGPA ── */}
          <Section
            step={2}
            icon={<GraduationCap size={13} />}
            title="Academic Standing"
            hint="Your current cumulative GPA"
            done={cgpaNumber !== null}
          >
            <FloatInput
              label="CGPA"
              value={cgpa}
              onChange={setCgpa}
              placeholder="e.g. 3.80"
              type="number"
              step="0.01"
            />
            {cgpaNumber !== null && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-[rgb(var(--border))] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[rgb(var(--primary)/0.7)] to-[rgb(var(--primary))] transition-all duration-700"
                    style={{ width: `${Math.min((cgpaNumber / 4) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-[rgb(var(--primary))]">
                  {cgpaNumber.toFixed(2)} / 4.00
                </span>
              </div>
            )}
          </Section>

          <Divider />

          {/* ── TRANSCRIPT ── */}
          <Section
            step={3}
            icon={<FileText size={13} />}
            title="Academic Transcript"
            hint="PDF, PNG, or JPG — max 8 MB"
            done={!!(transcriptPath || transcriptFile)}
          >
            <label
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault(); setDragOver(false);
                const file = e.dataTransfer.files?.[0] ?? null;
                if (file) onPickTranscript(file);
              }}
              className={[
                "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 cursor-pointer transition-all duration-200",
                dragOver
                  ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.08)] scale-[1.01]"
                  : transcriptFile || transcriptPath
                  ? "border-[rgb(var(--primary)/0.4)] bg-[rgb(var(--primary)/0.05)]"
                  : "border-[rgb(var(--border))] hover:border-[rgb(var(--primary)/0.5)] hover:bg-[rgb(var(--primary)/0.03)]",
              ].join(" ")}
            >
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg,image/jpg"
                className="sr-only"
                onChange={(e) => onPickTranscript(e.target.files?.[0] ?? null)}
              />

              {transcriptFile || transcriptPath ? (
                <>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgb(var(--primary)/0.15)]">
                    <FileText size={18} className="text-[rgb(var(--primary))]" />
                  </div>
                  <p className="text-xs font-semibold text-[rgb(var(--fg))] text-center max-w-[220px] truncate">
                    {transcriptFile ? transcriptFile.name : transcriptPath}
                  </p>
                  <span className="text-[10px] text-[rgb(var(--primary))] font-medium">
                    Click to replace
                  </span>
                </>
              ) : (
                <>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgb(var(--border))]">
                    <Upload size={16} className="text-[rgb(var(--muted))]" />
                  </div>
                  <p className="text-xs font-semibold text-[rgb(var(--fg))]">
                    Drop your transcript here
                  </p>
                  <p className="text-[10px] text-[rgb(var(--muted))]">
                    or click to browse · PDF / PNG / JPG
                  </p>
                </>
              )}

              {uploadingTranscript && (
                <span className="text-[10px] text-amber-500 animate-pulse font-semibold">
                  Uploading…
                </span>
              )}
            </label>
          </Section>

          <Divider />

          {/* ── SUBMIT ── */}
          <div className="space-y-3 pt-1">
            <button
              type="button"
              disabled={
                loading || uploadingTranscript ||
                subjects.length === 0 || cgpaNumber === null ||
                (!transcriptPath && !transcriptFile)
              }
              onClick={submit}
              className="relative w-full overflow-hidden rounded-xl bg-[rgb(var(--primary))] py-3 text-sm font-bold text-white shadow-md shadow-[rgb(var(--primary)/0.3)] transition-all duration-200 hover:opacity-90 hover:shadow-lg hover:shadow-[rgb(var(--primary)/0.4)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Submit Application
                  </>
                )}
              </span>
            </button>

            {statusMsg && (
              <div className={[
                "flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-xs leading-relaxed",
                statusMsg.toLowerCase().includes("submitted")
                  ? "border-emerald-500/25 bg-emerald-500/8 text-[rgb(var(--fg))]"
                  : "border-rose-500/25 bg-rose-500/8 text-[rgb(var(--fg))]",
              ].join(" ")}>
                {statusMsg.toLowerCase().includes("submitted")
                  ? <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                  : <XCircle size={13} className="text-rose-500 mt-0.5 shrink-0" />}
                {statusMsg}
              </div>
            )}

            <Link
              href="/dashboard/student"
              className="flex items-center justify-center gap-1.5 text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition-colors"
            >
              <ArrowLeft size={11} /> Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── shared sub-components ───────────────────────────────── */

function PageHeader() {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--primary)/0.12)]">
        <GraduationCap size={18} className="text-[rgb(var(--primary))]" />
      </div>
      <div>
        <h1 className="text-lg font-bold tracking-tight text-[rgb(var(--fg))]">
          Apply as Tutor
        </h1>
        <p className="mt-0.5 text-xs text-[rgb(var(--muted))]">
          Complete all three steps · Admin reviews within 1–2 days
        </p>
      </div>
    </div>
  );
}

function StatusCard({ icon, color, title, body }: {
  icon: React.ReactNode; color: "amber" | "emerald" | "rose";
  title: string; body: string;
}) {
  const palette = {
    amber:   { border: "border-amber-500/25",   bg: "bg-amber-500/8"   },
    emerald: { border: "border-emerald-500/25", bg: "bg-emerald-500/8" },
    rose:    { border: "border-rose-500/25",    bg: "bg-rose-500/8"    },
  }[color];
  return (
    <div className={`rounded-2xl border ${palette.border} ${palette.bg} p-4 space-y-1.5`}>
      <div className="flex items-center gap-2.5">
        {icon}
        <span className="text-sm font-bold text-[rgb(var(--fg))]">{title}</span>
      </div>
      <p className="text-xs text-[rgb(var(--muted))] leading-relaxed pl-7">{body}</p>
    </div>
  );
}

function Section({ step, icon, title, hint, done, children }: {
  step: number; icon: React.ReactNode; title: string; hint: string;
  done: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <div className={[
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold transition-all duration-300",
          done
            ? "bg-[rgb(var(--primary))] text-white shadow-sm shadow-[rgb(var(--primary)/0.4)]"
            : "bg-[rgb(var(--border))] text-[rgb(var(--muted))]",
        ].join(" ")}>
          {done ? "✓" : step}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[rgb(var(--muted))]">{icon}</span>
          <span className="text-xs font-bold text-[rgb(var(--fg))]">{title}</span>
          <span className="text-[10px] text-[rgb(var(--muted))] hidden sm:inline">· {hint}</span>
        </div>
      </div>
      <div className="pl-8">
        {children}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-[rgb(var(--border)/0.6)]" />;
}