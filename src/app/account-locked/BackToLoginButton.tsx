"use client";

export default function BackToLoginButton() {
  async function handleBackToLogin() {
    await fetch("/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    window.location.href = "/auth/login";
  }

  return (
    <button
      type="button"
      onClick={handleBackToLogin}
      className="inline-flex rounded-2xl bg-[rgb(var(--primary))] px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
    >
      Back to Login
    </button>
  );
}