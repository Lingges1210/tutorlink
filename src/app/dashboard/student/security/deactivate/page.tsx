"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const REASONS = [
  { value: "", label: "No reason (optional)" },
  { value: "TAKING_A_BREAK", label: "Taking a break" },
  { value: "PRIVACY_CONCERNS", label: "Privacy concerns" },
  { value: "NOT_FINDING_TUTORS", label: "Not finding tutors" },
  { value: "APP_ISSUES", label: "App issues / bugs" },
  { value: "OTHER", label: "Other" },
];

export default function StudentDeactivatePage() {
  const router = useRouter();

  const [confirmText, setConfirmText] = useState("");
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  const [reason, setReason] = useState("");
  const [otherReason, setOtherReason] = useState("");

  const canDeactivate =
    checked && confirmText.trim().toUpperCase() === "DEACTIVATE" && !loading;

  function onReasonChange(value: string) {
    setReason(value);
    if (value !== "OTHER") setOtherReason("");
  }

  async function onDeactivate() {
    if (!canDeactivate) return;

    // If they choose OTHER, ask them to type something (small UX improvement)
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

      // Log out (clears cookies)
      await fetch("/api/auth/logout", { method: "POST" });

      // Replace so Back won't go into a protected page
      router.replace("/auth/login");
      router.refresh();
    } catch {
      setLoading(false);
      alert("Deactivate failed. Please try again.");
    }
  }

  return (
    <div
      className="
        rounded-3xl border p-6
        border-[rgb(var(--border))]
        bg-[rgb(var(--card) / 0.7)]
        shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]
      "
    >
      <h1 className="text-xl font-semibold text-[rgb(var(--fg))]">
        Deactivate Account
      </h1>

      <p className="mt-2 text-sm text-[rgb(var(--muted))]">
        This will disable your account and log you out. You can’t sign in again
        unless an admin reactivates your account.
      </p>

      <div className="mt-5 space-y-4">
        {/* Optional reason */}
        <div>
          <label className="block text-sm font-medium text-[rgb(var(--fg))]">
            Reason (optional)
          </label>

          <select
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            disabled={loading}
            className="
              mt-2 w-full rounded-xl border px-3 py-2 text-sm
              border-[rgb(var(--border))]
              bg-[rgb(var(--bg))]
              text-[rgb(var(--fg))]
              outline-none focus:ring-2 focus:ring-[rgb(var(--primary))]
              disabled:opacity-60
            "
          >
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          {reason === "OTHER" && (
            <input
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
              disabled={loading}
              placeholder="Please tell us briefly"
              className="
                mt-2 w-full rounded-xl border px-3 py-2 text-sm
                border-[rgb(var(--border))]
                bg-[rgb(var(--bg))]
                text-[rgb(var(--fg))]
                outline-none focus:ring-2 focus:ring-[rgb(var(--primary))]
                disabled:opacity-60
              "
            />
          )}
        </div>

        {/* Confirm checkbox */}
        <label className="flex items-start gap-3 text-sm text-[rgb(var(--muted))]">
          <input
            type="checkbox"
            className="mt-1"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            disabled={loading}
          />
          <span>
            I understand that deactivating my account will disable access.
          </span>
        </label>

        {/* Confirm text */}
        <div>
          <div className="text-sm font-medium text-[rgb(var(--fg))]">
            Type <span className="font-semibold">DEACTIVATE</span> to confirm
          </div>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DEACTIVATE"
            disabled={loading}
            className="
              mt-2 w-full rounded-xl border px-3 py-2 text-sm
              border-[rgb(var(--border))]
              bg-[rgb(var(--bg))]
              text-[rgb(var(--fg))]
              outline-none focus:ring-2 focus:ring-[rgb(var(--primary))]
              disabled:opacity-60
            "
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="
              rounded-xl border px-4 py-2 text-sm font-medium
              border-[rgb(var(--border))]
              hover:bg-[rgb(var(--card2))]
              disabled:opacity-60
            "
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onDeactivate}
            disabled={!canDeactivate}
            className={[
              "rounded-xl px-4 py-2 text-sm font-semibold text-white",
              canDeactivate
                ? "bg-red-600 hover:bg-red-500"
                : "bg-red-600/40 cursor-not-allowed",
            ].join(" ")}
          >
            {loading ? "Deactivating..." : "Deactivate Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
