"use client";

import { FormEvent, useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function VerifyPage() {
  const router = useRouter();
  const [matricCardFile, setMatricCardFile] = useState<File | null>(null);
  const [status, setStatus] = useState<{ type: "error" | "success"; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!matricCardFile) {
      setStatus({ type: "error", msg: "Please upload your matric card." });
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    setStatus(null);

    try {
      const formData = new FormData();
      formData.append("matricCard", matricCardFile);

      const res = await fetch("/api/auth/reverify", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatus({ type: "error", msg: data.message || "Upload failed." });
        submittingRef.current = false;
        setLoading(false);
      } else {
        setStatus({ type: "success", msg: "Matric card submitted! Our team will review it shortly." });
        setLoading(false);
        submittingRef.current = false;
      }
    } catch (err: any) {
      setStatus({ type: "error", msg: err.message ?? "Unexpected error." });
      submittingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes bounceIn {
          0%   { transform: scale(0.8); opacity: 0; }
          60%  { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); }
        }

        .verify-card { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .status-msg  { animation: slideDown 0.25s ease both; }
        .bounce-in   { animation: bounceIn 0.35s cubic-bezier(0.22,1,0.36,1) both; }

        .upload-zone {
          transition: border-color 0.2s, background 0.2s, transform 0.15s;
          cursor: pointer;
        }
        .upload-zone:hover { transform: scale(1.008); }
        .upload-zone.has-file {
          border-color: rgb(var(--primary)) !important;
          background: rgb(var(--primary) / 0.06) !important;
        }

        .submit-btn {
          position: relative; overflow: hidden;
          transition: transform 0.18s, box-shadow 0.18s, opacity 0.18s;
        }
        .submit-btn::before {
          content: "";
          position: absolute; inset: 0;
          background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%);
          background-size: 200% 100%;
          animation: shimmer 2.4s linear infinite;
          pointer-events: none;
        }
        .submit-btn:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgb(var(--primary) / 0.35);
        }
        .submit-btn:not(:disabled):active { transform: translateY(0); }

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

        .divider-line {
          flex: 1; height: 1px;
          background: linear-gradient(to right, transparent, rgb(var(--border)), transparent);
        }

        .step-item {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid rgb(var(--border));
        }
        .step-item:last-child { border-bottom: none; }
        .step-num {
          flex-shrink: 0;
          width: 24px; height: 24px;
          border-radius: 50%;
          background: rgb(var(--primary) / 0.12);
          color: rgb(var(--primary));
          font-size: 11px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
        }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "rgb(var(--bg))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 16px",
      }}>
        <div className="verify-card" style={{
          width: "100%",
          maxWidth: "440px",
          background: "rgb(var(--card) / 0.8)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgb(var(--border))",
          borderRadius: "24px",
          padding: "36px 32px 32px",
          boxShadow: "0 24px 64px rgb(var(--shadow) / 0.16)",
        }}>

          {/* Header */}
          <div style={{ marginBottom: "24px" }}>
            {/* Icon */}
            <div style={{
              width: "48px", height: "48px", borderRadius: "14px",
              background: "rgb(var(--primary) / 0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: "16px",
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                style={{ width: "24px", height: "24px", color: "rgb(var(--primary))" }}>
                <rect x="3" y="4" width="18" height="14" rx="2" strokeLinecap="round"/>
                <path d="M7 8h5M7 12h8M7 16h4" strokeLinecap="round"/>
              </svg>
            </div>

            <h1 style={{ margin: "0 0 6px", fontSize: "20px", fontWeight: 800, color: "rgb(var(--fg))", letterSpacing: "-0.02em" }}>
              Re-upload Matric Card
            </h1>
            <p style={{ margin: 0, fontSize: "13px", color: "rgb(var(--muted))", lineHeight: 1.6 }}>
              Your previous submission wasn't approved. Please upload a clearer photo of your matric card.
            </p>
          </div>

          {/* Tips */}
          <div style={{
            background: "rgb(var(--card2))",
            border: "1px solid rgb(var(--border))",
            borderRadius: "12px",
            padding: "14px 16px",
            marginBottom: "22px",
          }}>
            <p style={{ margin: "0 0 10px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "rgb(var(--muted2))" }}>
              Photo requirements
            </p>
            {[
              "Your full name must be clearly visible",
              "Your matric number must be legible",
              "USM logo or text must appear on the card",
              "No blur, glare, or cropped edges",
            ].map((tip, i) => (
              <div key={i} className="step-item">
                <span className="step-num">{i + 1}</span>
                <span style={{ fontSize: "13px", color: "rgb(var(--muted))", lineHeight: 1.5 }}>{tip}</span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
            <span className="divider-line" />
            <span style={{ fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgb(var(--muted2))", whiteSpace: "nowrap" }}>
              Upload
            </span>
            <span className="divider-line" />
          </div>

          <form onSubmit={handleSubmit}>
            {/* Upload zone */}
            <div
              className={`upload-zone${matricCardFile ? " has-file" : ""}`}
              style={{
                borderRadius: "14px",
                border: "2px dashed rgb(var(--border))",
                background: "rgb(var(--card2))",
                padding: "28px 20px",
                textAlign: "center",
                marginBottom: "18px",
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                style={{ display: "none" }}
                onChange={(e) => setMatricCardFile(e.target.files?.[0] || null)}
              />
              {matricCardFile ? (
                <div className="bounce-in" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"
                    style={{ width: "20px", height: "20px", color: "rgb(var(--primary))", flexShrink: 0 }}>
                    <path d="M4 10.5l4.5 4.5 7.5-8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "rgb(var(--primary))" }}>
                    {matricCardFile.name}
                  </span>
                </div>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"
                    style={{ width: "32px", height: "32px", color: "rgb(var(--muted2))", margin: "0 auto 8px", display: "block" }}>
                    <path d="M12 16V8m0 0l-3 3m3-3l3 3" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M4 16.8A4 4 0 015.6 9a6 6 0 0111.8 0A4 4 0 0119 16.8" strokeLinecap="round"/>
                  </svg>
                  <p style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: 600, color: "rgb(var(--muted))" }}>
                    Click to upload
                  </p>
                  <p style={{ margin: 0, fontSize: "11px", color: "rgb(var(--muted2))" }}>
                    JPG, PNG or PDF
                  </p>
                </>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !matricCardFile}
              className="submit-btn"
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "12px",
                border: "none",
                fontSize: "14px",
                fontWeight: 700,
                color: "#fff",
                background: "linear-gradient(135deg, rgb(var(--primary)), rgb(var(--primary2)))",
                boxShadow: "0 4px 20px rgb(var(--primary) / 0.3)",
                cursor: loading || !matricCardFile ? "not-allowed" : "pointer",
                opacity: loading || !matricCardFile ? 0.6 : 1,
              }}
            >
              {loading ? (
                <><span className="spinner" />Submitting…</>
              ) : (
                "Submit for Review →"
              )}
            </button>
          </form>

          {/* Status */}
          {status && (
            <div
              className="status-msg"
              style={{
                marginTop: "14px",
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                borderRadius: "12px",
                padding: "12px 14px",
                fontSize: "13px",
                background: status.type === "success" ? "rgb(16 185 129 / 0.08)" : "rgb(239 68 68 / 0.08)",
                border: `1.5px solid ${status.type === "success" ? "rgb(16 185 129 / 0.25)" : "rgb(239 68 68 / 0.25)"}`,
                color: status.type === "success" ? "rgb(16 185 129)" : "rgb(239 68 68)",
              }}
            >
              {status.type === "success" ? (
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ width: "14px", height: "14px", flexShrink: 0, marginTop: "1px" }}>
                  <path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ width: "14px", height: "14px", flexShrink: 0, marginTop: "1px" }}>
                  <circle cx="8" cy="8" r="6"/>
                  <path d="M8 5v3.5M8 11v.5" strokeLinecap="round"/>
                </svg>
              )}
              {status.msg}
            </div>
          )}

          {/* Footer */}
          <p style={{ margin: "18px 0 0", textAlign: "center", fontSize: "12px", color: "rgb(var(--muted2))" }}>
            Need help?{" "}
            <a href="mailto:support@tutor-link.my"
              style={{ color: "rgb(var(--primary))", fontWeight: 600, textDecoration: "none" }}>
              Contact support
            </a>
          </p>
        </div>
      </div>
    </>
  );
}