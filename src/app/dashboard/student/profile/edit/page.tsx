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
  const [saved, setSaved] = useState(false);

  // avatar
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(null);
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
        setForm({ name: data?.name ?? "", programme: data?.programme ?? "" });
        if (data?.avatarUrl) setAvatarPreview(data.avatarUrl);
      } finally {
        if (alive) setPrefillLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

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
      const res = await fetch("/api/student/profile/avatar", { method: "POST", body: fd });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Upload failed");
      setAvatarPreview(json.avatarUrl);
      setAvatarFile(null);
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
    setSaved(false);
    if (nameTooShort) { setError("Name must be at least 2 characters."); return; }
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
          json?.error ?? "Failed to update profile";
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
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header card */}
        <div
          className="
            relative overflow-hidden rounded-3xl border p-6
            border-[rgb(var(--border))]
            bg-[rgb(var(--card)/0.7)]
            shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]
          "
        >
          {/* decorative blob */}
          <div
            aria-hidden
            className="
              pointer-events-none absolute -top-16 -right-16 h-56 w-56
              rounded-full opacity-[0.10]
              bg-[rgb(var(--primary))]
              blur-3xl
            "
          />

          <div className="relative">
            <div className="flex items-center gap-3">
              <div
                className="
                  flex h-9 w-9 items-center justify-center rounded-xl
                  bg-[rgb(var(--primary)/0.12)]
                  text-[rgb(var(--primary))]
                "
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-[rgb(var(--fg))]">
                  Edit Profile
                </h1>
                <p className="text-[0.75rem] text-[rgb(var(--muted))]">
                  Update your name, programme, and profile picture
                </p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {/* Avatar section */}
          <SectionCard label="Profile picture">
            <div className="flex flex-wrap items-center gap-5">
              {/* Avatar preview with gradient ring */}
              <div
                className="
                  relative h-20 w-20 shrink-0 rounded-full p-[3px]
                  bg-gradient-to-br from-[rgb(var(--primary))] via-[rgb(var(--primary)/0.6)] to-[rgb(var(--primary)/0.2)]
                  shadow-[0_0_0_2px_rgb(var(--card)),0_0_0_5px_rgb(var(--primary)/0.25)]
                "
              >
                <div className="h-full w-full overflow-hidden rounded-full bg-[rgb(var(--card2))]">
                  {avatarPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[rgb(var(--muted))]">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                  )}
                </div>

                {avatarFile && (
                  <span
                    className="
                      absolute -bottom-0.5 -right-0.5
                      h-5 w-5 rounded-full border-2
                      border-[rgb(var(--card))]
                      bg-amber-400
                      flex items-center justify-center
                    "
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </span>
                )}
              </div>

              {/* Controls */}
              <div className="flex-1 space-y-3">
                <div
                  className="
                    flex items-center gap-2 rounded-xl border
                    border-[rgb(var(--border))]
                    bg-[rgb(var(--card))]
                    px-3 py-2
                  "
                >
                  <svg className="shrink-0 text-[rgb(var(--muted))]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
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
                    className="flex-1 text-[0.72rem] text-[rgb(var(--muted))] file:mr-2 file:rounded-md file:border-0 file:bg-[rgb(var(--primary)/0.12)] file:px-2 file:py-0.5 file:text-[0.72rem] file:font-semibold file:text-[rgb(var(--primary))] file:cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={uploadAvatar}
                    disabled={!avatarFile || avatarUploading || prefillLoading || loading}
                    className="
                      inline-flex items-center gap-1.5
                      rounded-xl px-4 py-2 text-[0.72rem] font-semibold text-white
                      bg-[rgb(var(--primary))]
                      shadow-[0_4px_12px_rgb(var(--primary)/0.3)]
                      transition-all duration-200
                      hover:-translate-y-0.5
                      hover:shadow-[0_8px_20px_rgb(var(--primary)/0.40)]
                      disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none
                    "
                  >
                    {avatarUploading ? (
                      <>
                        <span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-white/30 border-t-white" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        Upload photo
                      </>
                    )}
                  </button>

                  {avatarFile && (
                    <span className="text-[0.68rem] font-medium text-amber-600 dark:text-amber-400">
                      Ready to upload
                    </span>
                  )}
                </div>

                <p className="text-[0.68rem] text-[rgb(var(--muted2))]">
                  PNG · JPG · WEBP &nbsp;•&nbsp; Cropped to square &nbsp;•&nbsp; Saved at 512×512 px
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Name */}
          <SectionCard label="Full name" hint="Min. 2 characters">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[rgb(var(--muted))]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                disabled={prefillLoading || loading}
                className="
                  w-full rounded-xl border pl-10 pr-4 py-3 text-sm outline-none
                  border-[rgb(var(--border))]
                  bg-[rgb(var(--card))]
                  text-[rgb(var(--fg))]
                  placeholder:text-[rgb(var(--muted2))]
                  transition-shadow duration-150
                  focus:shadow-[0_0_0_3px_rgb(var(--primary)/0.20)]
                  focus:border-[rgb(var(--primary)/0.5)]
                  disabled:opacity-60
                "
                placeholder="e.g. Lingges Muniandy"
              />
            </div>
            {nameTooShort && (
              <p className="mt-1.5 text-[0.72rem] text-red-500">
                Name must be at least 2 characters.
              </p>
            )}
          </SectionCard>

          {/* Programme */}
          <SectionCard label="Programme">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[rgb(var(--muted))]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
              </div>
              <input
                value={form.programme}
                onChange={(e) => setForm((p) => ({ ...p, programme: e.target.value }))}
                disabled={prefillLoading || loading}
                className="
                  w-full rounded-xl border pl-10 pr-4 py-3 text-sm outline-none
                  border-[rgb(var(--border))]
                  bg-[rgb(var(--card))]
                  text-[rgb(var(--fg))]
                  placeholder:text-[rgb(var(--muted2))]
                  transition-shadow duration-150
                  focus:shadow-[0_0_0_3px_rgb(var(--primary)/0.20)]
                  focus:border-[rgb(var(--primary)/0.5)]
                  disabled:opacity-60
                "
                placeholder="e.g. Computer Science"
              />
            </div>
          </SectionCard>

          {/* Locked notice */}
          <div
            className="
              flex items-start gap-3 rounded-2xl border p-4 text-[0.72rem]
              border-[rgb(var(--border))]
              bg-[rgb(var(--card2))]
              text-[rgb(var(--muted))]
            "
          >
            <svg
              className="mt-px shrink-0 text-[rgb(var(--muted2))]"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>
              <span className="font-semibold text-[rgb(var(--fg))]">Locked fields: </span>
              email, matric number, matric card, and verification status cannot be changed here.
            </span>
          </div>

          {/* Error */}
          {error && (
            <div
              className="
                flex items-start gap-3 rounded-2xl border p-4 text-[0.8rem]
                border-red-500/25 bg-red-500/8
                text-red-600 dark:text-red-400
              "
            >
              <svg className="mt-px shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={loading || prefillLoading || !!nameTooShort}
              className="
                inline-flex items-center gap-2
                rounded-xl px-5 py-2.5 text-sm font-semibold text-white
                bg-[rgb(var(--primary))]
                shadow-[0_4px_16px_rgb(var(--primary)/0.35)]
                transition-all duration-200
                hover:-translate-y-0.5
                hover:shadow-[0_8px_24px_rgb(var(--primary)/0.45)]
                active:translate-y-0
                disabled:opacity-60 disabled:hover:translate-y-0 disabled:shadow-none
              "
            >
              {loading ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving...
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  Save changes
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => router.push("/dashboard/student/profile")}
              className="
                inline-flex items-center gap-2
                rounded-xl px-5 py-2.5 text-sm font-semibold
                border border-[rgb(var(--border))]
                bg-[rgb(var(--card2))]
                text-[rgb(var(--fg))]
                transition-all duration-200
                hover:bg-[rgb(var(--card))]
                hover:-translate-y-0.5
              "
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Crop Modal */}
      {cropOpen && avatarPreview && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
          <div
            className="
              w-[92vw] max-w-md rounded-3xl border
              border-[rgb(var(--border))]
              bg-[rgb(var(--card))]
              shadow-[0_32px_80px_rgb(0_0_0/0.35)]
              overflow-hidden
            "
          >
            {/* Modal header */}
            <div
              className="
                flex items-center justify-between gap-3 border-b px-5 py-4
                border-[rgb(var(--border))]
              "
            >
              <div className="flex items-center gap-2">
                <div
                  className="
                    h-7 w-7 flex items-center justify-center rounded-lg
                    bg-[rgb(var(--primary)/0.12)]
                    text-[rgb(var(--primary))]
                  "
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V15" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-[rgb(var(--fg))]">
                  Crop photo
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCropOpen(false)}
                className="
                  flex h-7 w-7 items-center justify-center rounded-lg
                  text-[rgb(var(--muted))]
                  hover:bg-[rgb(var(--card2))]
                  transition-colors
                "
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Cropper */}
            <div className="relative h-[280px] w-full bg-black">
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

            {/* Zoom control */}
            <div className="px-5 pt-4 pb-1">
              <div className="flex items-center gap-3">
                <svg className="shrink-0 text-[rgb(var(--muted))]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
                </svg>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="
                    h-1.5 flex-1 cursor-pointer appearance-none rounded-full
                    bg-[rgb(var(--border))]
                    accent-[rgb(var(--primary))]
                  "
                />
                <svg className="shrink-0 text-[rgb(var(--muted))]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <p className="mt-2 text-center text-[0.65rem] text-[rgb(var(--muted2))]">
                Drag to reposition · Scroll or slide to zoom
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t px-5 py-4 border-[rgb(var(--border))]">
              <p className="text-[0.65rem] text-[rgb(var(--muted2))]">
                Saved as 512×512 px JPEG
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setCropOpen(false); setAvatarFile(null); }}
                  className="
                    rounded-xl px-4 py-2 text-xs font-semibold
                    border border-[rgb(var(--border))]
                    bg-[rgb(var(--card2))]
                    text-[rgb(var(--fg))]
                    transition-colors hover:bg-[rgb(var(--card))]
                  "
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onUseCroppedPhoto}
                  disabled={!croppedAreaPixels}
                  className="
                    inline-flex items-center gap-1.5
                    rounded-xl px-4 py-2 text-xs font-semibold text-white
                    bg-[rgb(var(--primary))]
                    shadow-[0_4px_12px_rgb(var(--primary)/0.35)]
                    transition-all duration-200
                    hover:-translate-y-0.5
                    disabled:opacity-50 disabled:hover:translate-y-0
                  "
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Use photo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SectionCard({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="
        rounded-2xl border p-4
        border-[rgb(var(--border))]
        bg-[rgb(var(--card2))]
      "
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-[rgb(var(--fg))]">
          {label}
        </span>
        {hint && (
          <span className="text-[0.68rem] text-[rgb(var(--muted2))]">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}