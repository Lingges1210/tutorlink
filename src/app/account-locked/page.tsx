import Link from "next/link";

export default function AccountLockedPage() {
  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] px-4 text-[rgb(var(--fg))]">
      <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center">
        <div className="w-full rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-8 text-center shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/15 text-rose-600">
            <span className="text-xl font-bold">!</span>
          </div>

          <h1 className="text-2xl font-semibold">Account Locked</h1>
          <p className="mt-3 text-sm leading-6 text-[rgb(var(--muted))]">
            Your TutorLink account has been locked by an administrator. Please contact admin
            if you think this is a mistake.
          </p>

          <div className="mt-6">
            <Link
              href="/auth/login"
              className="inline-flex rounded-md bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}