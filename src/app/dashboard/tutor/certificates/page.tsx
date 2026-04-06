"use client";
import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Award, Download, RefreshCw } from "lucide-react";

export default function TutorCertificates() {
  const { data: certs, isLoading, mutate } = useSWR("/api/certificates", fetcher);
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      await fetch("/api/certificates/generate", { method: "POST" });
      await mutate();
    } finally {
      setGenerating(false);
    }
  }

  const cert = certs?.[0];

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))]">
            <Award className="h-5 w-5 text-[rgb(var(--primary))]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[rgb(var(--fg))]">My Certificate</h1>
            <p className="text-xs text-[rgb(var(--muted))]">Your tutoring achievement, generated on demand</p>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-2 text-xs font-semibold text-[rgb(var(--primary))] hover:bg-[rgb(var(--primary)/0.1)] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} />
          {generating ? "Generating..." : cert ? "Regenerate" : "Generate Certificate"}
        </button>
      </div>

      {/* Certificate card */}
      {isLoading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-[rgb(var(--card2))]" />
      ) : !cert ? (
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.5)] p-10 text-center">
          <Award className="mx-auto h-10 w-10 text-[rgb(var(--muted))] mb-3" />
          <p className="text-sm font-semibold text-[rgb(var(--fg))]">No certificate yet</p>
          <p className="text-xs text-[rgb(var(--muted))] mt-1">
            Press &quot;Generate Certificate&quot; to create yours with your current stats.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.6)] p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[rgb(var(--fg))]">
                Certificate of Tutoring Achievement
              </p>
              <p className="text-xs text-[rgb(var(--muted))]">
                Last generated:{" "}
                {new Date(cert.issuedAt).toLocaleDateString("en-SG", {
                  year: "numeric", month: "short", day: "numeric",
                })}
              </p>
              {cert.metadata && (
                <div className="mt-3 flex flex-wrap gap-3">
                  {[
                    { label: "Sessions", value: cert.metadata.sessionsCompleted },
                    { label: "Hours", value: cert.metadata.hoursCompleted },
                    {
                      label: "Rating",
                      value: cert.metadata.ratingCount > 0
                        ? `${Number(cert.metadata.rating).toFixed(1)} / 5.0`
                        : "—",
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-center"
                    >
                      <p className="text-sm font-bold text-[rgb(var(--primary))]">{stat.value}</p>
                      <p className="text-[10px] text-[rgb(var(--muted))]">{stat.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cert.pdfUrl && (
              <a
                href={cert.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-2 text-xs font-semibold text-[rgb(var(--primary))] hover:bg-[rgb(var(--primary)/0.1)] transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Download PDF
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}