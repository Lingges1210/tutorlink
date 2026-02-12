"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type AppStatus = "PENDING" | "APPROVED" | "REJECTED";

type DayKey = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

const DAY_LABEL: Record<DayKey, string> = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
  SUN: "Sunday",
};

type TimeSlot = { start: string; end: string };
type DayAvailability = { day: DayKey; off: boolean; slots: TimeSlot[] };
type AvailabilityState = DayAvailability[];

function makeDefaultAvailability(): AvailabilityState {
  return (Object.keys(DAY_LABEL) as DayKey[]).map((day) => ({
    day,
    off: false,
    slots: [{ start: "20:00", end: "22:00" }], // default example
  }));
}

function isValidSlot(slot: TimeSlot) {
  // requires both and start < end
  if (!slot.start || !slot.end) return false;
  return slot.start < slot.end;
}

function validateAvailability(av: AvailabilityState): { ok: boolean; message?: string } {
  // Must have at least one valid slot across the week (unless all off)
  const anyDayOpen = av.some((d) => !d.off);
  if (!anyDayOpen) return { ok: false, message: "Please keep at least one day available (not Off)." };

  const anyValid = av.some((d) => !d.off && d.slots.some(isValidSlot));
  if (!anyValid) return { ok: false, message: "Please add at least one valid time slot (start < end)." };

  // (Optional) you can add overlap checks per day here
  return { ok: true };
}

function availabilityToPrettyText(av: AvailabilityState) {
  return av
    .map((d) => {
      if (d.off) return `${DAY_LABEL[d.day]}: Off`;
      const slots = d.slots
        .filter((s) => s.start && s.end)
        .map((s) => `${s.start}–${s.end}`)
        .join(", ");
      return `${DAY_LABEL[d.day]}: ${slots || "—"}`;
    })
    .join(" • ");
}

function tryParseAvailability(value: string): AvailabilityState | null {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    // very light shape check
    const ok = parsed.every(
      (d: any) =>
        d &&
        typeof d.day === "string" &&
        typeof d.off === "boolean" &&
        Array.isArray(d.slots)
    );
    return ok ? (parsed as AvailabilityState) : null;
  } catch {
    return null;
  }
}

function AvailabilityPicker({
  value,
  onChange,
}: {
  value: AvailabilityState;
  onChange: (next: AvailabilityState) => void;
}) {
  function setDayOff(day: DayKey, off: boolean) {
    const next = value.map((d) => {
      if (d.day !== day) return d;
      return {
        ...d,
        off,
        // if turning off, keep slots but they won't be used; or you can clear them:
        // slots: off ? [] : d.slots.length ? d.slots : [{ start: "", end: "" }],
      };
    });
    onChange(next);
  }

  function setSlot(day: DayKey, idx: number, patch: Partial<TimeSlot>) {
    const next = value.map((d) => {
      if (d.day !== day) return d;
      const slots = d.slots.map((s, i) => (i === idx ? { ...s, ...patch } : s));
      return { ...d, slots };
    });
    onChange(next);
  }

  function addSlot(day: DayKey) {
    const next = value.map((d) => {
      if (d.day !== day) return d;
      return { ...d, slots: [...d.slots, { start: "", end: "" }] };
    });
    onChange(next);
  }

  function removeSlot(day: DayKey, idx: number) {
    const next = value.map((d) => {
      if (d.day !== day) return d;
      const slots = d.slots.filter((_, i) => i !== idx);
      return { ...d, slots: slots.length ? slots : [{ start: "", end: "" }] };
    });
    onChange(next);
  }

  

  return (
    <div className="space-y-3">
      {(Object.keys(DAY_LABEL) as DayKey[]).map((day) => {
        const d = value.find((x) => x.day === day)!;

        return (
          <div
            key={day}
            className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                {DAY_LABEL[day]}
              </div>

              <label className="flex items-center gap-2 text-xs text-[rgb(var(--muted))]">
                <input
                  type="checkbox"
                  checked={d.off}
                  onChange={(e) => setDayOff(day, e.target.checked)}
                />
                Off day
              </label>
            </div>

            <div className="mt-3 space-y-2">
              {d.off ? (
                <div className="text-xs text-[rgb(var(--muted))]">Marked as Off.</div>
              ) : (
                d.slots.map((slot, idx) => {
                  const invalid = slot.start && slot.end ? slot.start >= slot.end : false;

                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div>
                          <div className="mb-1 text-[11px] text-[rgb(var(--muted))]">
                            Start
                          </div>
                          <input
                            type="time"
                            value={slot.start}
                            onChange={(e) => setSlot(day, idx, { start: e.target.value })}
                            className="w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2 py-2 text-xs text-[rgb(var(--fg))] outline-none focus:border-[rgb(var(--primary))]"
                          />
                        </div>
                        <div>
                          <div className="mb-1 text-[11px] text-[rgb(var(--muted))]">
                            End
                          </div>
                          <input
                            type="time"
                            value={slot.end}
                            onChange={(e) => setSlot(day, idx, { end: e.target.value })}
                            className="w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2 py-2 text-xs text-[rgb(var(--fg))] outline-none focus:border-[rgb(var(--primary))]"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeSlot(day, idx)}
                        className="rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2 py-2 text-xs text-[rgb(var(--fg))] hover:opacity-80"
                        title="Remove slot"
                      >
                        ✕
                      </button>

                      {invalid && (
                        <div className="text-[11px] text-rose-500/90">
                          End must be after start
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {!d.off && (
                <button
                  type="button"
                  onClick={() => addSlot(day)}
                  className="mt-1 inline-flex items-center justify-center rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-xs font-semibold text-[rgb(var(--fg))] hover:opacity-90"
                >
                  + Add time slot
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ApplyTutorPage() {
  const [subjects, setSubjects] = useState<string[]>([]);
const [subjectInput, setSubjectInput] = useState("");
const [subjectSuggestions, setSubjectSuggestions] = useState<string[]>([]);
const [suggestOpen, setSuggestOpen] = useState(false);
  const [cgpa, setCgpa] = useState("");
  const [availability, setAvailability] = useState<AvailabilityState>(makeDefaultAvailability());

function normalizeSubject(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

function subjectKey(raw: string) {
  // take part before ":" or "-" as the main code (CPT112)
  const s = normalizeSubject(raw);
  const head = s.split(/[:\-]/)[0] ?? s;
  return head.replace(/\s+/g, "").toLowerCase(); // "CPT112" => "cpt112"
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

  // ✅ MUST have BOTH code + title
  if (!code || !titleRaw) return "";

  // Basic title formatting (capitalize words)
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
    setSubjectError("Please enter subject in this format: CPT112 : Discrete Structures");
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
  if (!q) return []; // ✅ don’t show anything until typing

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
      if (res.ok && data?.success && Array.isArray(data.suggestions)) {
        setSubjectSuggestions(data.suggestions);
      }
    } catch {
      // ignore
    }
  })();
}, []);

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
        const rawSubjects = String(app.subjects ?? "");

// ✅ normalize bullets into newlines first (avoid unicode inside regex literal)
const normalized = rawSubjects.replace(/•/g, "\n");

const parsedSubjects = normalized
  .split(/,|\r?\n|;/g)
  .map((s) => s.trim())
  .filter(Boolean);

setSubjects(parsedSubjects);

        setCgpa(typeof app.cgpa === "number" ? String(app.cgpa) : "");
        const raw = String(app.availability ?? "");
        const parsed = raw ? tryParseAvailability(raw) : null;
        setAvailability(parsed ?? makeDefaultAvailability());

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
      if (subjects.length === 0) throw new Error("Subjects is required.");
      if (cgpaNumber === null) throw new Error("CGPA is required.");
      const v = validateAvailability(availability);
      if (!v.ok) throw new Error(v.message || "Availability is required.");


      // ✅ transcript required
      const uploadedPath = await uploadTranscript();

      const res = await fetch("/api/tutor/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjects,
          cgpa: cgpaNumber,
          availability: JSON.stringify(availability), 
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
      setAvailability(makeDefaultAvailability());
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

    {/* ✅ PUT YOUR FORM BACK INSIDE THIS CARD */}
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card) / 0.7)] p-5">
      <div className="space-y-4">
        {/* SUBJECTS */}
<div>
  <label className="mb-1 block text-xs text-[rgb(var(--muted))]">
    Subjects (required)
  </label>

  {/* tags */}
  {subjects.length > 0 && (
    <div className="mb-2 flex flex-wrap gap-2">
      {subjects.map((s) => (
        <span
          key={s}
          className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-1 text-xs text-[rgb(var(--fg))]"
        >
          {s}
          <button
            type="button"
            onClick={() => removeSubject(s)}
            className="text-[rgb(var(--muted2))] hover:text-[rgb(var(--fg))]"
            title="Remove"
          >
            ✕
          </button>
        </span>
      ))}
    </div>
  )}

  {/* ✅ input + dropdown MUST be together */}
  <div className="relative" data-subject-wrap>

    <input
  value={subjectInput}
  onChange={(e) => {
    const v = e.target.value;
    setSubjectInput(v);
    setSuggestOpen(v.trim().length > 0); // ✅ only open when typing
  }}
  onFocus={() => {
    setSuggestOpen(subjectInput.trim().length > 0); // ✅ only if already has text
  }}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSubject(subjectInput);
    }
    if (e.key === "Escape") setSuggestOpen(false);
  }}
  placeholder="Type subject (e.g. CPT112 : Discrete Structures)"
  className="w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none focus:border-[rgb(var(--primary))]"
/>

    {/* ✅ dropdown attached right under input */}
    {suggestOpen && filteredSuggestions.length > 0 && (
  <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-[0_20px_60px_rgb(var(--shadow)/0.12)]">
    {filteredSuggestions.map((s) => (
      <button
        key={s}
        type="button"
        onClick={() => addSubject(s)}
        className="w-full px-3 py-2 text-left text-sm text-[rgb(var(--fg))] hover:bg-[rgb(var(--card2))]"
      >
        {s}
      </button>
    ))}
  </div>
)}

  </div>

  {/* tip BELOW input+dropdown (so dropdown doesn't look detached) */}
  <div className="mt-1 text-[11px] text-[rgb(var(--muted2))]">
    Tip: Use <b>CPT112 : Discrete Structures</b> then press <b>Enter</b>.
  </div>

  {/* optional: show strict error if you added it */}
  {typeof subjectError !== "undefined" && subjectError && (
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

        {/* AVAILABILITY */}
        <div>
          <label className="mb-1 block text-xs text-[rgb(var(--muted))]">
            Availability (required)
          </label>

          <AvailabilityPicker value={availability} onChange={setAvailability} />

          <div className="mt-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-xs text-[rgb(var(--muted))]">
            <div className="font-semibold text-[rgb(var(--fg))]">Preview:</div>
            <div className="mt-1">{availabilityToPrettyText(availability)}</div>
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
            !validateAvailability(availability).ok ||
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
