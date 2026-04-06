"use client";
import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Award, Download, RefreshCw, Printer } from "lucide-react";
import CertificateDocument from "./CertificateDocument";

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

  function handlePrint() {
    window.print();
  }

  const cert = certs?.[0];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))]">
            <Award className="h-5 w-5 text-[rgb(var(--primary))]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[rgb(var(--fg))]">My Certificate</h1>
            <p className="text-xs text-[rgb(var(--muted))]">Your TutorLink achievement certificate</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {cert && (
            <>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-2 text-xs font-semibold text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] hover:bg-[rgb(var(--card2))] transition-colors print:hidden"
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </button>

              {cert.pdfUrl && (
                <a
                  href={cert.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-2 text-xs font-semibold text-[rgb(var(--primary))] hover:bg-[rgb(var(--primary)/0.1)] transition-colors print:hidden"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download PDF
                </a>
              )}
            </>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-2 text-xs font-semibold text-[rgb(var(--primary))] hover:bg-[rgb(var(--primary)/0.1)] transition-colors disabled:opacity-50 print:hidden"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Generating..." : cert ? "Regenerate" : "Generate Certificate"}
          </button>
        </div>
      </div>

      {/* Certificate */}
      {isLoading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-[rgb(var(--card2))]" />
      ) : !cert ? (
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.5)] p-14 text-center">
          <Award className="mx-auto h-12 w-12 text-[rgb(var(--muted))] mb-4 opacity-40" />
          <p className="text-sm font-semibold text-[rgb(var(--fg))]">No certificate yet</p>
          <p className="text-xs text-[rgb(var(--muted))] mt-1.5 max-w-xs mx-auto">
            Press &quot;Generate Certificate&quot; to create your personalised TutorLink achievement certificate.
          </p>
        </div>
      ) : (
        <CertificateDocument cert={cert} />
      )}
    </div>
  );
}