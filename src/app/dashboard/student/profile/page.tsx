import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/getSessionUser";

export default async function StudentProfilePage() {
  const dbUser = await getSessionUser();
  if (!dbUser) redirect("/auth/login");

  const initials =
    (dbUser.name ?? dbUser.email)
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "U";

  const isVerified =
    dbUser.verificationStatus === "VERIFIED" ||
    dbUser.verificationStatus === "AUTO_VERIFIED";

  const isRejected = dbUser.verificationStatus === "REJECTED";

  const verificationLabel = isVerified
    ? "Verified"
    : isRejected
    ? "Rejected"
    : "Pending review";

  const joinedDate = dbUser.createdAt
    ? new Date(dbUser.createdAt).toLocaleDateString("en-MY", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <>
      <style>{`
        @keyframes aurora {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes spacedrift {
          0%   { transform: translateX(0) translateY(0); }
          100% { transform: translateX(10px) translateY(-5px); }
        }
      `}</style>

      <div className="space-y-4">
        {/* Hero card */}
        <div
          className="
            relative overflow-hidden rounded-3xl border
            border-[rgb(var(--border))]
            bg-[rgb(var(--card)/0.7)]
            shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]
          "
        >
          {/* Profile Banner */}
          {dbUser.profileBanner && (
            <div className="relative h-24 w-full overflow-hidden">
              {dbUser.profileBanner === "AURORA" && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-900 via-violet-900 to-blue-900" />
                  <div
                    className="absolute inset-0 opacity-60"
                    style={{
                      background: "linear-gradient(120deg, #10b981, #7c3aed, #2563eb, #10b981)",
                      backgroundSize: "300% 300%",
                      animation: "aurora 6s ease infinite",
                    }}
                  />
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      background:
                        "radial-gradient(ellipse at 20% 50%, #34d399 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, #a78bfa 0%, transparent 50%)",
                    }}
                  />
                </>
              )}
              {dbUser.profileBanner === "SPACE" && (
                <>
                  <div className="absolute inset-0 bg-[#020617]" />
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        "radial-gradient(1px 1px at 10% 20%, white 0%, transparent 100%), radial-gradient(1px 1px at 30% 60%, white 0%, transparent 100%), radial-gradient(1.5px 1.5px at 50% 10%, white 0%, transparent 100%), radial-gradient(1px 1px at 70% 80%, white 0%, transparent 100%), radial-gradient(1px 1px at 90% 40%, white 0%, transparent 100%), radial-gradient(1px 1px at 15% 75%, rgba(255,255,255,0.7) 0%, transparent 100%), radial-gradient(1px 1px at 45% 45%, rgba(255,255,255,0.5) 0%, transparent 100%), radial-gradient(1px 1px at 65% 15%, rgba(255,255,255,0.8) 0%, transparent 100%), radial-gradient(1px 1px at 85% 65%, rgba(255,255,255,0.6) 0%, transparent 100%), radial-gradient(1.5px 1.5px at 25% 35%, white 0%, transparent 100%), radial-gradient(1px 1px at 55% 85%, rgba(255,255,255,0.4) 0%, transparent 100%), radial-gradient(1px 1px at 75% 55%, rgba(255,255,255,0.7) 0%, transparent 100%)",
                    }}
                  />
                  <div
                    className="absolute inset-0 opacity-40"
                    style={{
                      background:
                        "radial-gradient(ellipse at 30% 50%, #1e1b4b 0%, transparent 60%), radial-gradient(ellipse at 70% 30%, #0f172a 0%, transparent 60%)",
                      animation: "spacedrift 12s ease-in-out infinite alternate",
                    }}
                  />
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      background: "radial-gradient(ellipse at 50% 50%, #6366f1 0%, transparent 70%)",
                    }}
                  />
                </>
              )}
              {/* fade to card at bottom */}
              <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-b from-transparent to-[rgb(var(--card)/0.7)]" />
            </div>
          )}

          {/* decorative gradient blob top-right */}
          <div
            aria-hidden
            className="
              pointer-events-none absolute -top-16 -right-16 h-56 w-56
              rounded-full opacity-[0.12]
              bg-[rgb(var(--primary))]
              blur-3xl
            "
          />

          <div className="relative p-6">
            {/* top row */}
            <div className="flex items-start justify-between gap-4">
              {/* Avatar + name */}
              <div className="flex items-center gap-5">
                {/* Avatar ring */}
                <div
                  className="
                    relative h-[72px] w-[72px] shrink-0
                    rounded-full p-[3px]
                    bg-gradient-to-br from-[rgb(var(--primary))] via-[rgb(var(--primary)/0.7)] to-[rgb(var(--primary)/0.3)]
                    shadow-[0_0_0_2px_rgb(var(--card)),0_0_0_6px_rgb(var(--primary)/0.35),0_4px_20px_rgb(var(--primary)/0.3)]
                  "
                >
                  <div className="relative h-full w-full overflow-hidden rounded-full bg-[rgb(var(--card2))]">
                    {dbUser.avatarUrl ? (
                      <Image
                        src={dbUser.avatarUrl}
                        alt="Profile picture"
                        fill
                        className="object-cover"
                        sizes="72px"
                        priority
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg font-bold text-[rgb(var(--fg))]">
                        {initials}
                      </div>
                    )}
                  </div>

                  {/* Online dot */}
                  <span
                    className="
                      absolute bottom-0.5 right-0.5
                      h-3 w-3 rounded-full border-2
                      border-[rgb(var(--card))]
                      bg-emerald-400
                    "
                  />
                </div>

                <div>
                  <h1 className="text-xl font-semibold tracking-tight text-[rgb(var(--fg))]">
                    {dbUser.name ?? "Student"}
                  </h1>
                  <p className="mt-0.5 text-sm text-[rgb(var(--muted))]">
                    {dbUser.programme ?? "No programme set"}
                  </p>

                  {/* Verification badge */}
                  <span
                    className={`
                      mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.68rem] font-semibold
                      ${
                        isVerified
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : isRejected
                          ? "bg-red-500/15 text-red-600 dark:text-red-400"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      }
                    `}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isVerified ? "bg-emerald-500" : isRejected ? "bg-red-500" : "bg-amber-500"
                      }`}
                    />
                    {verificationLabel}
                  </span>

                  {/* Profile title */}
                  {dbUser.profileTitle && (
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-[rgb(var(--primary)/0.3)] bg-[rgb(var(--primary)/0.08)] px-2.5 py-0.5 text-[0.65rem] font-bold text-[rgb(var(--primary))]">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      {dbUser.profileTitle}
                    </span>
                  )}
                </div>
              </div>

              {/* Edit button */}
              <Link
                href="/dashboard/student/profile/edit"
                className="
                  inline-flex shrink-0 items-center gap-1.5
                  rounded-xl px-4 py-2 text-xs font-semibold text-white
                  bg-[rgb(var(--primary))]
                  shadow-[0_4px_16px_rgb(var(--primary)/0.35)]
                  transition-all duration-200
                  hover:-translate-y-0.5
                  hover:shadow-[0_8px_24px_rgb(var(--primary)/0.45)]
                  active:translate-y-0
                "
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit profile
              </Link>
            </div>

            {/* divider */}
            <div className="my-5 h-px bg-[rgb(var(--border))]" />

            {/* Stats strip */}
            <div className="flex flex-wrap gap-4 text-[0.72rem] text-[rgb(var(--muted))]">
              {joinedDate && (
                <div className="flex items-center gap-1.5">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  Joined {joinedDate}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                {dbUser.role}
              </div>
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Full name"
            value={dbUser.name ?? "—"}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            }
          />
          <Field
            label="Email"
            value={dbUser.email}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            }
          />
          <Field
            label="Programme"
            value={dbUser.programme ?? "—"}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            }
          />
          <Field
            label="Matric No"
            value={dbUser.matricNo ?? "—"}
            locked
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            }
          />
          <Field
            label="Verification status"
            value={verificationLabel}
            locked
            highlight={isVerified ? "success" : isRejected ? "error" : "warning"}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            }
          />
          {dbUser.profileTitle && (
            <Field
              label="Profile Title"
              value={dbUser.profileTitle}
              highlight="success"
              icon={
                <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              }
            />
          )}
        </div>

        {/* Locked notice */}
        <div
          className="
            flex items-start gap-3 rounded-2xl border p-4 text-xs
            border-[rgb(var(--border))]
            bg-[rgb(var(--card2))]
            text-[rgb(var(--muted))]
          "
        >
          <svg
            className="mt-0.5 shrink-0 text-[rgb(var(--muted2))]"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>
            Matric number, matric card, and verification status are locked and can
            only be changed by an administrator.
          </span>
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  icon,
  locked,
  highlight,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  locked?: boolean;
  highlight?: "success" | "warning" | "error";
}) {
  return (
    <div
      className="
        group relative overflow-hidden rounded-2xl border p-4
        border-[rgb(var(--border))]
        bg-[rgb(var(--card2))]
        transition-shadow duration-200
        hover:shadow-[0_4px_20px_rgb(var(--shadow)/0.08)]
      "
    >
      <div
        className={`
          absolute left-0 top-3 bottom-3 w-0.5 rounded-full
          transition-opacity duration-200
          ${highlight === "success"
            ? "bg-emerald-500 opacity-60 group-hover:opacity-100"
            : highlight === "warning"
            ? "bg-amber-500 opacity-60 group-hover:opacity-100"
            : highlight === "error"
            ? "bg-red-500 opacity-60 group-hover:opacity-100"
            : "bg-[rgb(var(--primary))] opacity-0 group-hover:opacity-40"
          }
        `}
      />

      <div className="flex items-start gap-3">
        {icon && (
          <div
            className="
              mt-0.5 shrink-0 h-7 w-7 flex items-center justify-center
              rounded-lg
              bg-[rgb(var(--primary)/0.1)]
              text-[rgb(var(--primary))]
              [&>svg]:h-3.5 [&>svg]:w-3.5
            "
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[0.68rem] font-medium uppercase tracking-wide text-[rgb(var(--muted2))]">
              {label}
            </span>
            {locked && (
              <svg
                className="text-[rgb(var(--muted2))]"
                width="9"
                height="9"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            )}
          </div>
          <div
            className={`
              mt-1 text-sm font-semibold break-words
              ${
                highlight === "success"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : highlight === "warning"
                  ? "text-amber-600 dark:text-amber-400"
                  : highlight === "error"
                  ? "text-red-600 dark:text-red-400"
                  : "text-[rgb(var(--fg))]"
              }
            `}
          >
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}