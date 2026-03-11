"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import StarBackground from "@/components/StarBackground";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatus({ type: "error", msg: data.message || "Failed to send reset link" });
        return;
      }
      setStatus({ type: "success", msg: "A reset link has been sent to your email." });
      setEmail("");
    } catch (err: any) {
      setStatus({ type: "error", msg: err?.message ?? "Unexpected error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgb(var(--primary) / 0.35); }
          70%  { box-shadow: 0 0 0 6px rgb(var(--primary) / 0); }
          100% { box-shadow: 0 0 0 0 rgb(var(--primary) / 0); }
        }

        .forgot-card {
          animation: fadeSlideUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .status-msg {
          animation: slideDown 0.25s ease both;
        }

        .email-input {
          width: 100%;
          border-radius: 12px;
          border: 1.5px solid rgb(var(--border));
          padding: 10px 14px;
          font-size: 0.875rem;
          outline: none;
          background: rgb(var(--card2));
          color: rgb(var(--fg));
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .email-input::placeholder {
          color: rgb(var(--muted2));
          opacity: 0.7;
        }
        .email-input:focus {
          border-color: rgb(var(--primary));
          box-shadow: 0 0 0 3px rgb(var(--primary) / 0.12);
          animation: pulse-ring 0.5s ease-out;
        }

        .submit-btn {
          position: relative;
          width: 100%;
          border-radius: 12px;
          padding: 11px;
          font-size: 0.875rem;
          font-weight: 600;
          color: white;
          border: none;
          cursor: pointer;
          overflow: hidden;
          background: linear-gradient(135deg, rgb(var(--primary)), rgb(var(--primary2)));
          box-shadow: 0 4px 20px rgb(var(--primary) / 0.3);
          transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
          letter-spacing: 0.02em;
        }
        .submit-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%);
          background-size: 200% auto;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .submit-btn:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgb(var(--primary) / 0.38);
        }
        .submit-btn:not(:disabled):hover::before {
          opacity: 1;
          animation: shimmer 0.9s linear;
        }
        .submit-btn:not(:disabled):active {
          transform: translateY(0);
        }
        .submit-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .spinner {
          display: inline-block;
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          vertical-align: middle;
          margin-right: 6px;
        }

        .back-link {
          color: rgb(var(--primary));
          text-decoration: none;
          font-weight: 500;
          position: relative;
        }
        .back-link::after {
          content: '';
          position: absolute;
          bottom: -1px; left: 0;
          width: 0; height: 1px;
          background: rgb(var(--primary));
          transition: width 0.2s ease;
        }
        .back-link:hover::after { width: 100%; }
      `}</style>

      <div className="relative min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
        <StarBackground />

        <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
          <div
            className="forgot-card w-full max-w-md rounded-3xl border p-7"
            style={{
              borderColor: "rgb(var(--border))",
              background: "rgb(var(--card) / 0.75)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "0 24px 64px rgb(var(--shadow) / 0.18), 0 1px 0 rgb(var(--border))",
            }}
          >
            {/* Icon */}
            <div
              className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl text-xl"
              style={{
                background: "linear-gradient(135deg, rgb(var(--primary) / 0.15), rgb(var(--primary2) / 0.1))",
                border: "1px solid rgb(var(--primary) / 0.2)",
              }}
            >
              🔑
            </div>

            {/* Heading */}
            <h1 className="text-xl font-semibold" style={{ color: "rgb(var(--fg))" }}>
              Reset your password
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "rgb(var(--muted))" }}>
              Enter your registered USM email. We'll send you a password reset link.
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "rgb(var(--muted))" }}
                >
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourid@student.usm.my"
                  className="email-input"
                />
              </div>

              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? (
                  <>
                    <span className="spinner" />
                    Sending link...
                  </>
                ) : (
                  "Send reset link →"
                )}
              </button>
            </form>

            {/* Status */}
            {status && (
              <div
                className={`status-msg mt-4 flex items-start gap-2 rounded-xl px-3.5 py-3 text-xs ${
                  status.type === "success"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-rose-500/10 text-rose-400"
                }`}
                style={{
                  border: `1.5px solid ${
                    status.type === "success"
                      ? "rgb(16 185 129 / 0.3)"
                      : "rgb(251 113 133 / 0.3)"
                  }`,
                }}
              >
                <span className="mt-0.5 flex-shrink-0">
                  {status.type === "success" ? "✓" : "✕"}
                </span>
                <span>{status.msg}</span>
              </div>
            )}

            {/* Footer */}
            <p className="mt-5 text-xs" style={{ color: "rgb(var(--muted2))" }}>
              Remembered your password?{" "}
              <Link href="/auth/login" className="back-link">
                Back to login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}