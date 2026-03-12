"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const REASONS = [
  { value: "TAKING_A_BREAK", label: "Taking a break" },
  { value: "PRIVACY_CONCERNS", label: "Privacy concerns" },
  { value: "NOT_FINDING_TUTORS", label: "Not finding tutors" },
  { value: "APP_ISSUES", label: "App issues / bugs" },
  { value: "OTHER", label: "Other" },
];

function IconCoffee() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/>
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}

function IconBug() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="6" width="8" height="14" rx="4"/><path d="M19 7l-3 2"/><path d="M5 7l3 2"/><path d="M19 12h-2"/><path d="M7 12H5"/><path d="M19 17l-3-2"/><path d="M5 17l3-2"/><path d="M10 6V4"/><path d="M14 6V4"/>
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

function IconWarn() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}

function IconInfo() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6l3 3 5-5"/>
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
    </svg>
  );
}

const REASON_ICONS: Record<string, React.ReactNode> = {
  TAKING_A_BREAK: <IconCoffee />,
  PRIVACY_CONCERNS: <IconShield />,
  NOT_FINDING_TUTORS: <IconSearch />,
  APP_ISSUES: <IconBug />,
  OTHER: <IconEdit />,
};

export default function StudentDeactivatePage() {
  const router = useRouter();

  const [confirmText, setConfirmText] = useState("");
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  const confirmMatch = confirmText.trim().toUpperCase() === "DEACTIVATE";
  const canDeactivate = checked && confirmMatch && !loading;
  const progress = [checked, confirmMatch].filter(Boolean).length;

  function onReasonSelect(value: string) {
    const next = value === selectedReason ? null : value;
    setSelectedReason(next);
    setReason(next ?? "");
    if (value !== "OTHER") setOtherReason("");
  }

  async function onDeactivate() {
    if (!canDeactivate) return;
    if (reason === "OTHER" && !otherReason.trim()) {
      alert("Please tell us briefly in the text box.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/account/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reason || null,
          otherReason: reason === "OTHER" ? otherReason.trim() : null,
        }),
      });

      if (!res.ok) throw new Error("Failed to deactivate");
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/auth/login");
      router.refresh();
    } catch {
      setLoading(false);
      alert("Deactivate failed. Please try again.");
    }
  }

  return (
    <div
      className="rounded-3xl border overflow-hidden"
      style={{
        borderColor: "rgb(var(--border))",
        background: "rgb(var(--card) / 0.7)",
        boxShadow: "0 24px 80px rgb(var(--shadow) / 0.12)",
      }}
    >
      {/* Header */}
      <div
        className="px-6 py-5 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgb(220 38 38 / 0.1), rgb(239 68 68 / 0.04))",
          borderBottom: "1px solid rgb(var(--border))",
        }}
      >
        <div
          className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl pointer-events-none"
          style={{ background: "rgb(239 68 68 / 0.12)" }}
        />

        <div className="relative flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgb(220 38 38 / 0.13)", color: "rgb(220 38 38)" }}
          >
            <IconWarn />
          </div>
          <div>
            <h1 className="text-lg font-semibold" style={{ color: "rgb(var(--fg))" }}>
              Deactivate Account
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "rgb(var(--muted))" }}>
              This action requires your confirmation
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Info callout */}
        <div
          className="rounded-2xl px-4 py-3 flex gap-3 items-start text-sm"
          style={{
            background: "rgb(var(--card) / 0.5)",
            border: "1px solid rgb(var(--border))",
            color: "rgb(var(--muted))",
          }}
        >
          <span className="mt-0.5 flex-shrink-0" style={{ color: "rgb(var(--muted))" }}>
            <IconInfo />
          </span>
          <p>
            Your account will be{" "}
            <strong style={{ color: "rgb(var(--fg))" }}>disabled</strong> and
            you'll be logged out. Access is only restored by an admin.
          </p>
        </div>

        {/* Reason picker */}
        <div>
          <p className="text-sm font-medium mb-3" style={{ color: "rgb(var(--fg))" }}>
            Why are you leaving?{" "}
            <span className="font-normal text-xs" style={{ color: "rgb(var(--muted))" }}>
              (optional)
            </span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {REASONS.map((r) => {
              const active = selectedReason === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => !loading && onReasonSelect(r.value)}
                  disabled={loading}
                  className="rounded-2xl px-3 py-2.5 text-left text-sm transition-all duration-150 flex items-center gap-2.5"
                  style={{
                    border: active
                      ? "1.5px solid rgb(220 38 38 / 0.6)"
                      : "1.5px solid rgb(var(--border))",
                    background: active ? "rgb(220 38 38 / 0.07)" : "rgb(var(--bg))",
                    color: active ? "rgb(220 38 38)" : "rgb(var(--fg))",
                    transform: active ? "scale(0.975)" : "scale(1)",
                    opacity: loading ? 0.5 : 1,
                  }}
                >
                  <span
                    className="flex-shrink-0"
                    style={{ color: active ? "rgb(220 38 38)" : "rgb(var(--muted))" }}
                  >
                    {REASON_ICONS[r.value]}
                  </span>
                  <span className="leading-tight">{r.label}</span>
                </button>
              );
            })}
          </div>

          {selectedReason === "OTHER" && (
            <textarea
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
              disabled={loading}
              placeholder="Tell us a little more…"
              rows={2}
              className="mt-3 w-full rounded-2xl border px-3 py-2.5 text-sm resize-none outline-none transition-all"
              style={{
                borderColor: "rgb(var(--border))",
                background: "rgb(var(--bg))",
                color: "rgb(var(--fg))",
              }}
              onFocus={(e) => (e.target.style.boxShadow = "0 0 0 2px rgb(220 38 38 / 0.2)")}
              onBlur={(e) => (e.target.style.boxShadow = "none")}
            />
          )}
        </div>

        {/* Divider */}
        <div className="h-px" style={{ background: "rgb(var(--border))" }} />

        {/* Confirmation steps */}
        <div className="space-y-4">
          {/* Progress */}
          <div className="flex items-center gap-3">
            <p className="text-xs font-medium flex-shrink-0" style={{ color: "rgb(var(--muted))" }}>
              Confirmation
            </p>
            <div
              className="flex-1 h-1.5 rounded-full overflow-hidden"
              style={{ background: "rgb(var(--border))" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(progress / 2) * 100}%`,
                  background: progress === 2 ? "rgb(220 38 38)" : "rgb(251 146 60)",
                }}
              />
            </div>
            <p
              className="text-xs font-semibold flex-shrink-0 tabular-nums"
              style={{ color: progress === 2 ? "rgb(220 38 38)" : "rgb(var(--muted))" }}
            >
              {progress}/2
            </p>
          </div>

          {/* Checkbox row */}
          <label
            className="flex items-start gap-3 rounded-2xl px-4 py-3 cursor-pointer transition-all duration-150"
            style={{
              border: checked
                ? "1.5px solid rgb(220 38 38 / 0.4)"
                : "1.5px solid rgb(var(--border))",
              background: checked ? "rgb(220 38 38 / 0.05)" : "rgb(var(--bg))",
              opacity: loading ? 0.6 : 1,
            }}
          >
            <div className="relative mt-0.5 flex-shrink-0">
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                disabled={loading}
              />
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center transition-all duration-150"
                style={{
                  background: checked ? "rgb(220 38 38)" : "transparent",
                  border: checked
                    ? "2px solid rgb(220 38 38)"
                    : "2px solid rgb(var(--border))",
                  color: "white",
                }}
              >
                {checked && <IconCheck />}
              </div>
            </div>
            <span className="text-sm" style={{ color: "rgb(var(--muted))" }}>
              I understand that deactivating my account will{" "}
              <strong style={{ color: "rgb(var(--fg))" }}>disable all access</strong>{" "}
              until an admin restores it.
            </span>
          </label>

          {/* Confirm text input */}
          <div>
            <p className="text-sm mb-2" style={{ color: "rgb(var(--muted))" }}>
              Type{" "}
              <span
                className="font-mono font-bold text-xs px-1.5 py-0.5 rounded-md"
                style={{
                  background: "rgb(220 38 38 / 0.1)",
                  color: "rgb(220 38 38)",
                  border: "1px solid rgb(220 38 38 / 0.25)",
                }}
              >
                DEACTIVATE
              </span>{" "}
              to confirm
            </p>
            <div className="relative">
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DEACTIVATE"
                disabled={loading}
                className="w-full rounded-2xl border px-4 py-2.5 text-sm font-mono outline-none transition-all"
                style={{
                  borderColor: confirmMatch
                    ? "rgb(220 38 38 / 0.6)"
                    : "rgb(var(--border))",
                  background: confirmMatch
                    ? "rgb(220 38 38 / 0.05)"
                    : "rgb(var(--bg))",
                  color: "rgb(var(--fg))",
                  boxShadow: confirmMatch
                    ? "0 0 0 2px rgb(220 38 38 / 0.15)"
                    : "none",
                  opacity: loading ? 0.6 : 1,
                }}
              />
              {confirmMatch && (
                <div
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: "rgb(220 38 38)", color: "white" }}
                >
                  <IconCheck />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={loading}
            className="flex-1 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all duration-150"
            style={{
              border: "1.5px solid rgb(var(--border))",
              color: "rgb(var(--fg))",
              background: "transparent",
              opacity: loading ? 0.5 : 1,
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background =
                "rgb(var(--card))")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "transparent")
            }
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onDeactivate}
            disabled={!canDeactivate}
            className="flex-1 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2"
            style={{
              background: canDeactivate
                ? "rgb(220 38 38)"
                : "rgb(220 38 38 / 0.35)",
              cursor: canDeactivate ? "pointer" : "not-allowed",
              boxShadow: canDeactivate
                ? "0 4px 16px rgb(220 38 38 / 0.35)"
                : "none",
            }}
            onMouseEnter={(e) => {
              if (canDeactivate)
                (e.currentTarget as HTMLElement).style.background =
                  "rgb(185 28 28)";
            }}
            onMouseLeave={(e) => {
              if (canDeactivate)
                (e.currentTarget as HTMLElement).style.background =
                  "rgb(220 38 38)";
            }}
          >
            {loading ? (
              <>
                <IconSpinner />
                Deactivating…
              </>
            ) : (
              "Deactivate Account"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}