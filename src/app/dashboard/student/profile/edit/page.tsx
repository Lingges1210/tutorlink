"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Cropper, { Area } from "react-easy-crop";
import { getCroppedImage } from "@/lib/cropImage";

type FormState = {
  name: string;
  programme: string;
};

export default function EditStudentProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<FormState>({ name: "", programme: "" });
  const [loading, setLoading] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // avatar
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null); // can be db url OR blob preview
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(
    null
  ); // only blob URL (so we can revoke)
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // cropper
  const [cropOpen, setCropOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

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

        if (data?.avatarUrl) setAvatarPreview(data.avatarUrl);
      } finally {
        if (alive) setPrefillLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // cleanup blob preview URL to avoid memory leak
  useEffect(() => {
    return () => {
      if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
    };
  }, [selectedPreviewUrl]);

  async function uploadAvatar() {
    if (!avatarFile) return;
    setError(null);
    setAvatarUploading(true);

    try {
      const fd = new FormData();
      fd.append("file", avatarFile);

      const res = await fetch("/api/student/profile/avatar", {
        method: "POST",
        body: fd,
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Upload failed");

      setAvatarPreview(json.avatarUrl);
      setAvatarFile(null);

      // important so header/server components can update too
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Upload failed");
    } finally {
      setAvatarUploading(false);
    }
  }

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

  function onPickFile(file: File) {
    // reset crop state each time
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);

    // revoke previous blob url
    if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);

    const previewUrl = URL.createObjectURL(file);
    setSelectedPreviewUrl(previewUrl);
    setAvatarPreview(previewUrl);
    setCropOpen(true);
  }

  async function onUseCroppedPhoto() {
    if (!avatarPreview || !croppedAreaPixels) return;

    const blob = await getCroppedImage(avatarPreview, croppedAreaPixels, 512);

    const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });

    setAvatarFile(file);
    setCropOpen(false);

    // reset file input so user can select same file again if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <>
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
          {/* Avatar */}
          <div
            className="
              rounded-2xl border p-4
              border-[rgb(var(--border))]
              bg-[rgb(var(--card2))]
            "
          >
            <div className="mb-3 text-sm font-semibold text-[rgb(var(--fg))]">
              Profile picture
            </div>

            <div className="flex items-center gap-4">
              <div className="h-14 w-14 overflow-hidden rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))]">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-[rgb(var(--muted))]">
                    —
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={prefillLoading || loading || avatarUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    onPickFile(file);
                  }}
                  className="text-xs text-[rgb(var(--muted))]"
                />

                <button
                  type="button"
                  onClick={uploadAvatar}
                  disabled={
                    !avatarFile ||
                    avatarUploading ||
                    prefillLoading ||
                    loading
                  }
                  className="
                    rounded-md px-3 py-2 text-xs font-semibold text-white
                    bg-[rgb(var(--primary))]
                    transition-all duration-200
                    hover:-translate-y-0.5
                    hover:shadow-[0_8px_24px_rgb(var(--shadow)/0.35)]
                    disabled:opacity-70 disabled:hover:translate-y-0
                  "
                >
                  {avatarUploading ? "Uploading..." : "Upload"}
                </button>

                <div className="text-[0.7rem] text-[rgb(var(--muted2))]">
                  PNG/JPG/WEBP • crop to square • saved as 512×512
                </div>
              </div>
            </div>
          </div>

          {/* Your existing fields */}
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

          <div
            className="
              rounded-2xl border p-4 text-xs
              border-[rgb(var(--border))]
              bg-[rgb(var(--card2))]
              text-[rgb(var(--muted))]
            "
          >
            🔒 Locked fields: email, matric number, matric card, verification
            status.
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

      {/* Crop Modal */}
      {cropOpen && avatarPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-[90vw] max-w-md rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-[0_20px_60px_rgb(var(--shadow)/0.35)]">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                Crop photo
              </div>
              <button
                type="button"
                onClick={() => setCropOpen(false)}
                className="text-xs text-[rgb(var(--muted))]"
              >
                Close
              </button>
            </div>

            <div className="relative h-64 w-full overflow-hidden rounded-xl border border-[rgb(var(--border))] bg-black">
              <Cropper
                image={avatarPreview}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
              />
            </div>

            <div className="mt-4 flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs text-[rgb(var(--muted))]">Zoom</span>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCropOpen(false);
                  // if user cancels after selecting new file, clear avatarFile too
                  setAvatarFile(null);
                }}
                className="
                  rounded-md px-3 py-2 text-xs font-semibold
                  border border-[rgb(var(--border))]
                  bg-[rgb(var(--card2))]
                  text-[rgb(var(--fg))]
                "
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={onUseCroppedPhoto}
                disabled={!croppedAreaPixels}
                className="
                  rounded-md px-3 py-2 text-xs font-semibold text-white
                  bg-[rgb(var(--primary))]
                  disabled:opacity-70
                "
              >
                Use photo
              </button>
            </div>

            <div className="mt-2 text-[0.7rem] text-[rgb(var(--muted2))]">
              Saved as square 512×512 for best quality everywhere.
            </div>
          </div>
        </div>
      )}
    </>
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
