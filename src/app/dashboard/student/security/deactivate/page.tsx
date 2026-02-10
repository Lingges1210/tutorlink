export default function StudentDeactivatePage() {
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
        Next: we’ll add a confirm flow and decide soft delete vs disable.
      </p>
    </div>
  );
}
