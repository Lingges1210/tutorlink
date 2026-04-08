"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SessionCallEmbed from "@/components/session/SessionCallEmbed";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";

type TranscriptSegment = { start: number; end: number; text: string };

type Transcript = {
  id: string;
  sessionId: string;
  text: string;
  segments: TranscriptSegment[] | null;
  language: string | null;
  duration: number | null;
  createdAt: string;
};

function fmt(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${Math.floor(s % 60)
    .toString()
    .padStart(2, "0")}`;
}

function TranscriptPanel({ sessionId, active }: { sessionId: string; active: boolean }) {
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    setPolling(true);

    async function load() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/transcript`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.transcript) {
          setTranscript(data.transcript);
          setPolling(false);
          clearInterval(interval);
        }
      } catch { /* silent */ }
    }

    load();
    const interval = setInterval(load, 4000);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      setPolling(false);
    }, 10 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [sessionId, active]);

  if (!active) return null;

  if (!transcript) {
    return (
      <div className="mt-6 rounded-xl border border-border bg-card/60 p-5 backdrop-blur-sm flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        {polling
          ? "Transcribing your session recording… this usually takes a minute."
          : "No transcript found for this session."}
      </div>
    );
  }

  const segments = (transcript.segments as TranscriptSegment[]) ?? [];

  return (
    <details open className="mt-6 rounded-xl border border-border bg-card/60 p-4 backdrop-blur-sm">
      <summary className="cursor-pointer select-none font-semibold text-sm text-foreground flex items-center gap-2">
        <FileText className="h-4 w-4 shrink-0" />
        <span>Session Transcript</span>
        {transcript.duration != null && (
          <span className="text-muted-foreground font-normal text-xs">
            {fmt(transcript.duration)}
          </span>
        )}
        {transcript.language && (
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            {transcript.language}
          </span>
        )}
      </summary>

      <div className="mt-4 max-h-96 overflow-y-auto space-y-2 text-sm pr-1">
        {segments.length > 0 ? (
          segments.map((seg, i) => (
            <div key={i} className="flex gap-3">
              <span className="tabular-nums shrink-0 text-muted-foreground text-xs pt-0.5 w-10">
                {fmt(seg.start)}
              </span>
              <p className="text-foreground/90 leading-relaxed">{seg.text.trim()}</p>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground leading-relaxed">{transcript.text}</p>
        )}
      </div>
    </details>
  );
}

type Props = {
  params: Promise<{ id: string }>;
};

export default function CallPage({ params }: Props) {
  const router = useRouter();
  const { id: sessionId } = use(params);
  const [callEnded, setCallEnded] = useState(false);

  return (
    <div className="relative min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--fg))] transition-colors duration-300">
      <div className="relative z-10 mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-sm hover:bg-[rgb(var(--card)/0.8)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-center gap-3">
            {!callEnded && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
            )}
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              {callEnded ? "Session Ended" : "Live Session Call"}
            </h1>
            {!callEnded && (
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                Live
              </span>
            )}
          </div>
        </div>

        {!callEnded && (
          <SessionCallEmbed
            sessionId={sessionId}
            onLeave={() => setCallEnded(true)}
          />
        )}

        <TranscriptPanel sessionId={sessionId} active={callEnded} />

        <p className="mt-4 text-center text-xs text-muted-foreground/50">
          {callEnded
            ? "Transcript will appear above once processing is complete."
            : "End the call to view your session transcript."}
        </p>
      </div>
    </div>
  );
}