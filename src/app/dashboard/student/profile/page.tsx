import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export default async function StudentProfilePage() {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/auth/login");

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: {
      email: true,
      name: true,
      programme: true,
      matricNo: true,
      verificationStatus: true,
      role: true,
      createdAt: true,
      avatarUrl: true,
    },
  });

  if (!dbUser) redirect("/auth/login");

  const initials =
    (dbUser.name ?? dbUser.email)
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "U";

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
        <div className="flex items-center gap-4">
          <div className="relative h-14 w-14 overflow-hidden rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))]">
            {dbUser.avatarUrl ? (
              <Image
                src={dbUser.avatarUrl}
                alt="Profile picture"
                fill
                className="object-cover"
                sizes="56px"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-bold text-[rgb(var(--fg))]">
                {initials}
              </div>
            )}
          </div>

          <div>
            <h1 className="text-xl font-semibold text-[rgb(var(--fg))]">My Profile</h1>
            <p className="mt-1 text-sm text-[rgb(var(--muted))]">
              View your details. Matric info is locked for verification.
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/student/profile/edit"
          className="
            inline-flex items-center justify-center
            rounded-md px-3 py-2 text-xs font-semibold text-white
            bg-[rgb(var(--primary))]
            transition-all duration-200
            hover:-translate-y-0.5
            hover:shadow-[0_8px_24px_rgb(var(--shadow)/0.35)]
          "
        >
          Edit
        </Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Field label="Name" value={dbUser.name ?? "—"} />
        <Field label="Email" value={dbUser.email} />
        <Field label="Programme" value={dbUser.programme ?? "—"} />
        <Field label="Matric No (locked)" value={dbUser.matricNo ?? "—"} />
        <Field label="Verification" value={dbUser.verificationStatus} />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="
        rounded-2xl border p-4
        border-[rgb(var(--border))]
        bg-[rgb(var(--card2))]
      "
    >
      <div className="text-[0.7rem] font-medium text-[rgb(var(--muted2))]">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-[rgb(var(--fg))] break-words">
        {value}
      </div>
    </div>
  );
}
