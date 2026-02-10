"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type FormState = {
  name: string;
  programme: string;
};

export default function EditStudentProfilePage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({ name: "", programme: "" });
  const [loading, setLoading] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const nameTooShort = useMemo(() => {
    const v = form.name.trim();
    return v.length > 0 && v.length < 2;
  }, [form.name]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch("/api/student/profile", { method: "GET" });
        if (!res.ok) return;

        const data = await res.json();
        if (!alive) return;

        setForm({
          name: data?.name ?? "",
          programme: data?.programme ?? "",
        });
      } finally {
        if (alive) setPrefillLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (nameTooShort) {
      setError("Name must be at least 2 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        // try to show zod message nicely
        const msg =
          json?.details?.fieldErrors?.name?.[0] ??
          json?.details?.fieldErrors?.programme?.[0] ??
          json?.error ??
          "Failed to update profile";
        throw new Error(msg);
      }

      router.push("/dashboard/student/profile");
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[rgb(var(--fg))]">
            Edit Profile
          </h1>
          <p className="mt-1 text-sm text-[rgb(var(--muted))]">
            You can edit basic info only. Matric details are locked.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Field label="Full name" hint="Min 2 characters">
          <input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            disabled={prefillLoading || loading}
            className="
              w-full rounded-2xl border px-4 py-3 text-sm outline-none
              border-[rgb(var(--border))]
              bg-[rgb(var(--card2))]
              text-[rgb(var(--fg))]
              focus:ring-2 focus:ring-[rgb(var(--primary)/0.35)]
              disabled:opacity-70
            "
            placeholder="e.g. Lingges Muniandy"
          />
        </Field>

        <Field label="Programme">
          <input
            value={form.programme}
            onChange={(e) =>
              setForm((p) => ({ ...p, programme: e.target.value }))
            }
            disabled={prefillLoading || loading}
            className="
              w-full rounded-2xl border px-4 py-3 text-sm outline-none
              border-[rgb(var(--border))]
              bg-[rgb(var(--card2))]
              text-[rgb(var(--fg))]
              focus:ring-2 focus:ring-[rgb(var(--primary)/0.35)]
              disabled:opacity-70
            "
            placeholder="e.g. Computer Science"
          />
        </Field>

        {/* Locked info notice */}
        <div
          className="
            rounded-2xl border p-4 text-xs
            border-[rgb(var(--border))]
            bg-[rgb(var(--card2))]
            text-[rgb(var(--muted))]
          "
        >
          🔒 Locked fields: email, matric number, matric card, verification status.
        </div>

        {error && (
          <div
            className="
              rounded-2xl border p-4 text-sm
              border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300
            "
          >
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || prefillLoading}
            className="
              inline-flex items-center justify-center
              rounded-md px-3 py-2 text-xs font-semibold text-white
              bg-[rgb(var(--primary))]
              transition-all duration-200
              hover:-translate-y-0.5
              hover:shadow-[0_8px_24px_rgb(var(--shadow)/0.35)]
              disabled:opacity-70 disabled:hover:translate-y-0
            "
          >
            {loading ? "Saving..." : "Save changes"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard/student/profile")}
            className="
              rounded-md px-3 py-2 text-xs font-semibold
              border border-[rgb(var(--border))]
              bg-[rgb(var(--card2))]
              text-[rgb(var(--fg))]
            "
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-sm font-semibold text-[rgb(var(--fg))]">
          {label}
        </label>
        {hint && (
          <span className="text-[0.7rem] text-[rgb(var(--muted2))]">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}
