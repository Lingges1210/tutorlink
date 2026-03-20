"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type Stage = "verifying" | "success" | "error";

export default function CallbackPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("verifying");

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    let redirectTimer: ReturnType<typeof setTimeout>;
    let resolved = false;

    function handleSuccess() {
      if (resolved) return;
      resolved = true;
      setStage("success");
      redirectTimer = setTimeout(() => {
        router.replace("/auth/login?verified=true");
      }, 2500);
    }

    function handleError() {
      if (resolved) return;
      resolved = true;
      setStage("error");
    }

    // Listen for auth state change FIRST before anything else
    // This catches the hash token being processed by Supabase JS
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        handleSuccess();
      } else if (event === "PASSWORD_RECOVERY") {
        resolved = true;
        router.replace("/auth/reset-password");
      }
    });

    // Also handle ?code= param (PKCE flow)
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) handleError();
        else handleSuccess();
      });
    }

    // Poll for session — checks at 500ms, 1.5s, 3s, 5s
    // Handles cases where SIGNED_IN event fires before listener is attached
    const delays = [500, 1500, 3000, 5000];
    const timers = delays.map((ms) =>
      setTimeout(async () => {
        if (resolved) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (session) handleSuccess();
        else if (ms === 5000) handleError(); // give up after 5s
      }, ms)
    );

    return () => {
      subscription.unsubscribe();
      clearTimeout(redirectTimer);
      timers.forEach(clearTimeout);
    };
  }, [router]);

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes drawCircle {
          from { stroke-dashoffset: 283; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes drawCheck {
          from { stroke-dashoffset: 60; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes drawX {
          from { stroke-dashoffset: 40; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%       { opacity: 0.15; transform: scale(1.4); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes progressBar {
          from { width: 0%; }
          to   { width: 100%; }
        }

        .card-enter { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .icon-wrap {
          position: relative;
          display: flex; align-items: center; justify-content: center;
          width: 88px; height: 88px; border-radius: 50%;
          margin: 0 auto 24px;
        }
        .icon-pulse {
          position: absolute; inset: -12px; border-radius: 50%;
          animation: pulse 2.2s ease-in-out infinite;
        }
        .circle-svg { animation: scaleIn 0.45s cubic-bezier(0.22,1,0.36,1) both; }
        .circle-ring {
          stroke-dasharray: 283; stroke-dashoffset: 283;
          animation: drawCircle 0.7s 0.2s cubic-bezier(0.22,1,0.36,1) forwards;
        }
        .check-path {
          stroke-dasharray: 60; stroke-dashoffset: 60;
          animation: drawCheck 0.4s 0.75s cubic-bezier(0.22,1,0.36,1) forwards;
        }
        .x-path {
          stroke-dasharray: 40; stroke-dashoffset: 40;
          animation: drawX 0.35s 0.6s ease forwards;
        }
        .spinner-ring {
          width: 88px; height: 88px;
          border: 3px solid rgb(var(--primary) / 0.15);
          border-top-color: rgb(var(--primary));
          border-radius: 50%;
          animation: spin 0.9s linear infinite;
        }
        .progress-track {
          height: 3px; border-radius: 999px; overflow: hidden;
          background: rgb(var(--border)); margin-top: 28px;
        }
        .progress-fill {
          height: 100%; border-radius: 999px;
          background: linear-gradient(90deg, rgb(var(--primary)), rgb(var(--primary2)));
          animation: progressBar 2.5s linear forwards;
        }
        .btn-primary {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 11px 22px; border-radius: 12px;
          font-size: 14px; font-weight: 600; color: #fff;
          background: linear-gradient(135deg, rgb(var(--primary)), rgb(var(--primary2)));
          box-shadow: 0 4px 16px rgb(var(--primary) / 0.3);
          cursor: pointer; border: none;
          transition: transform 0.15s, box-shadow 0.15s; text-decoration: none;
        }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgb(var(--primary) / 0.38); }
        .btn-ghost {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 11px 22px; border-radius: 12px;
          font-size: 14px; font-weight: 600; cursor: pointer;
          border: 1.5px solid rgb(var(--border)); background: transparent;
          color: rgb(var(--fg)); transition: border-color 0.15s, background 0.15s;
          text-decoration: none;
        }
        .btn-ghost:hover { background: rgb(var(--card2)); }
      `}</style>

      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "rgb(var(--bg))", padding: "24px 16px",
      }}>
        <div className="card-enter" style={{
          width: "100%", maxWidth: "400px",
          background: "rgb(var(--card) / 0.8)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgb(var(--border))", borderRadius: "24px",
          padding: "40px 32px 36px",
          boxShadow: "0 24px 64px rgb(var(--shadow) / 0.16)", textAlign: "center",
        }}>

          {/* Verifying */}
          {stage === "verifying" && (
            <>
              <div className="icon-wrap">
                <div className="spinner-ring" />
              </div>
              <h1 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: 700, color: "rgb(var(--fg))" }}>
                Verifying your email…
              </h1>
              <p style={{ margin: 0, fontSize: "14px", color: "rgb(var(--muted))", lineHeight: 1.6 }}>
                Just a moment while we confirm your account.
              </p>
            </>
          )}

          {/* Success */}
          {stage === "success" && (
            <>
              <div className="icon-wrap">
                <div className="icon-pulse" style={{ background: "rgb(16 185 129 / 0.12)" }} />
                <svg className="circle-svg" width="88" height="88" viewBox="0 0 96 96" fill="none">
                  <circle className="circle-ring" cx="48" cy="48" r="45"
                    stroke="rgb(16 185 129)" strokeWidth="3" strokeLinecap="round" />
                  <path className="check-path" d="M30 48l12 12 24-24"
                    stroke="rgb(16 185 129)" strokeWidth="3.5"
                    strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </div>
              <h1 style={{ margin: "0 0 8px", fontSize: "22px", fontWeight: 800, color: "rgb(var(--fg))", letterSpacing: "-0.02em" }}>
                Email verified!
              </h1>
              <p style={{ margin: "0 0 6px", fontSize: "14px", color: "rgb(var(--muted))", lineHeight: 1.6 }}>
                Your account is now active. Taking you to login…
              </p>
              <div className="progress-track">
                <div className="progress-fill" />
              </div>
              <p style={{ margin: "16px 0 0", fontSize: "12px", color: "rgb(var(--muted2))" }}>
                Not redirecting?{" "}
                <a href="/auth/login?verified=true" style={{ color: "rgb(var(--primary))", fontWeight: 600, textDecoration: "none" }}>
                  Click here
                </a>
              </p>
            </>
          )}

          {/* Error */}
          {stage === "error" && (
            <>
              <div className="icon-wrap">
                <div className="icon-pulse" style={{ background: "rgb(239 68 68 / 0.12)" }} />
                <svg className="circle-svg" width="88" height="88" viewBox="0 0 96 96" fill="none">
                  <circle className="circle-ring" cx="48" cy="48" r="45"
                    stroke="rgb(239 68 68)" strokeWidth="3" strokeLinecap="round" />
                  <path className="x-path" d="M34 34l28 28M62 34L34 62"
                    stroke="rgb(239 68 68)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                </svg>
              </div>
              <h1 style={{ margin: "0 0 8px", fontSize: "22px", fontWeight: 800, color: "rgb(var(--fg))", letterSpacing: "-0.02em" }}>
                Verification failed
              </h1>
              <p style={{ margin: "0 0 24px", fontSize: "14px", color: "rgb(var(--muted))", lineHeight: 1.6 }}>
                This link may have expired or already been used. Please request a new verification email.
              </p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                <a href="/auth/login" className="btn-ghost">Back to login</a>
                <a href="/auth/register" className="btn-primary">Register again →</a>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}