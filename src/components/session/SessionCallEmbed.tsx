"use client";

import "@livekit/components-styles";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  StartAudio,
  useParticipants,
  useRoomContext,
  useTracks,
} from "@livekit/components-react";
import { ConnectionQuality, Track } from "livekit-client";
import {
  AlertCircle,
  Camera,
  CameraOff,
  Check,
  ChevronDown,
  CircleDot,
  Clock,
  Loader2,
  LogOut,
  Mic,
  MicOff,
  Monitor,
  RefreshCw,
  Shield,
  Signal,
  Sparkles,
  Square,
  Users,
  Video,
  WifiOff,
  Wind,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = { sessionId: string; onLeave?: () => void };
type TokenRes = { token: string; roomName: string; error?: string };
type MediaDevice = { deviceId: string; label: string };
type ConnectionStatus = "idle" | "joining" | "connected" | "reconnecting" | "disconnected";

// ─── Constants ────────────────────────────────────────────────────────────────

const STYLE_ID = "session-call-keyframes-v3";
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 1200;
const COUNTDOWN_SECS = 3;

// ─── Style Injection ──────────────────────────────────────────────────────────

function injectStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes sc-pulse  { 0%,100%{transform:scale(1);opacity:.55} 50%{transform:scale(1.18);opacity:.15} }
    @keyframes sc-pulse2 { 0%,100%{transform:scale(1);opacity:.35} 50%{transform:scale(1.32);opacity:.08} }
    @keyframes sc-fadein { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
    @keyframes sc-spin   { to{transform:rotate(360deg)} }
    @keyframes sc-badge-in { from{opacity:0;transform:translateX(-50%) translateY(-8px) scale(.92)} to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)} }
    @keyframes sc-dot-blink { 0%,100%{opacity:1} 50%{opacity:.3} }
    @keyframes sc-shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-4px)} 40%,80%{transform:translateX(4px)} }
    @keyframes sc-dropdown-in { from{opacity:0;transform:translateY(-6px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
    @keyframes sc-count-pop { 0%{transform:scale(1.4);opacity:0} 30%{transform:scale(1);opacity:1} 85%{transform:scale(1);opacity:1} 100%{transform:scale(.85);opacity:0} }
    .sc-feature-item { animation: sc-fadein .4s ease both; }
    .sc-feature-item:nth-child(1){animation-delay:.08s}
    .sc-feature-item:nth-child(2){animation-delay:.16s}
    .sc-feature-item:nth-child(3){animation-delay:.24s}
    .sc-feature-item:nth-child(4){animation-delay:.32s}
    .sc-leave-btn:hover { background: rgba(239,68,68,.15) !important; border-color: rgba(239,68,68,.4) !important; color: rgb(239,68,68) !important; }
    .sc-join-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(var(--primary),.45) !important; }
    .sc-dropdown-item:hover { background: rgba(var(--primary),.1) !important; }
    .sc-toggle:hover { opacity: .88; }
    .sc-rec-btn:hover { background: rgba(239,68,68,.18) !important; border-color: rgba(239,68,68,.5) !important; }
    .lk-disconnect-button { display: none !important; }
    html:not(.dark) .lk-control-bar { gap: 6px !important; background: transparent !important; }
    html:not(.dark) .lk-button { background: rgba(0,0,0,0.04) !important; border: 1px solid rgba(0,0,0,0.12) !important; color: rgba(0,0,0,0.72) !important; border-radius: 10px !important; font-size: 13px !important; font-weight: 500 !important; padding: 8px 12px !important; }
    html:not(.dark) .lk-button:hover { background: rgba(0,0,0,0.08) !important; }
    html:not(.dark) .lk-button[aria-pressed="true"], html:not(.dark) .lk-button[data-lk-enabled="true"] { background: rgba(0,0,0,0.10) !important; }
    html:not(.dark) .lk-button svg, html:not(.dark) .lk-button span { color: rgba(0,0,0,0.72) !important; stroke: rgba(0,0,0,0.72) !important; }
    html.dark .lk-control-bar { gap: 6px !important; background: transparent !important; }
    html.dark .lk-button { background: rgba(255,255,255,0.06) !important; border: 1px solid rgba(255,255,255,0.12) !important; color: rgba(255,255,255,0.82) !important; border-radius: 10px !important; font-size: 13px !important; font-weight: 500 !important; padding: 8px 12px !important; }
    html.dark .lk-button:hover { background: rgba(255,255,255,0.12) !important; }
    html.dark .lk-button[aria-pressed="true"], html.dark .lk-button[data-lk-enabled="true"] { background: rgba(255,255,255,0.14) !important; }
    html.dark .lk-button svg, html.dark .lk-button span { color: rgba(255,255,255,0.82) !important; stroke: rgba(255,255,255,0.82) !important; }
    html.dark .lk-device-menu, html.dark .lk-device-menu * { background: #1c1c1e !important; color: rgba(255,255,255,0.82) !important; border-color: rgba(255,255,255,0.10) !important; }
    html:not(.dark) .lk-device-menu, html:not(.dark) .lk-device-menu * { background: #ffffff !important; color: rgba(0,0,0,0.78) !important; border-color: rgba(0,0,0,0.10) !important; }
  `;
  document.head.appendChild(el);
}

// ─── useDarkMode ──────────────────────────────────────────────────────────────

function useDarkMode() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

// ─── useLiveKitToken ──────────────────────────────────────────────────────────

function useLiveKitToken(sessionId: string) {
  const [token, setToken] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const retryCount = useRef(0);

  const fetchToken = useCallback(async (attempt = 0): Promise<void> => {
    try {
      setStatus("joining");
      setError(null);
      const res = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = (await res.json()) as TokenRes;
      if (!res.ok) throw new Error(data.error || "Failed to create token");
      setToken(data.token);
      setRoomName(data.roomName);
      setStatus("connected");
      retryCount.current = 0;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to join call";
      if (attempt < MAX_RETRIES) {
        setTimeout(() => fetchToken(attempt + 1), RETRY_BASE_MS * Math.pow(2, attempt));
      } else {
        setError(message);
        setStatus("idle");
        retryCount.current = 0;
      }
    }
  }, [sessionId]);

  const join = useCallback(() => { retryCount.current = 0; fetchToken(0); }, [fetchToken]);
  const reset = useCallback(() => {
    setToken(null); setRoomName(null); setStatus("idle"); setError(null);
  }, []);

  return { token, roomName, status, error, join, reset };
}

// ─── usePreJoinMedia ──────────────────────────────────────────────────────────

function usePreJoinMedia() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [camEnabled, setCamEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [noiseCancellation, setNoiseCancellation] = useState(true);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [cameras, setCameras] = useState<MediaDevice[]>([]);
  const [mics, setMics] = useState<MediaDevice[]>([]);
  const [selectedCam, setSelectedCam] = useState("");
  const [selectedMic, setSelectedMic] = useState("");
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const enumerateDevices = useCallback(async (camId: string, micId: string) => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter((d) => d.kind === "videoinput").map((d) => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 6)}` }));
      const mics = devices.filter((d) => d.kind === "audioinput").map((d) => ({ deviceId: d.deviceId, label: d.label || `Mic ${d.deviceId.slice(0, 6)}` }));
      setCameras(cams);
      setMics(mics);
      if (cams[0] && !camId) setSelectedCam(cams[0].deviceId);
      if (mics[0] && !micId) setSelectedMic(mics[0].deviceId);
    } catch { /* silent */ }
  }, []);

  const startPreview = useCallback(async (cam: boolean, mic: boolean, camId: string, micId: string) => {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      const constraints: MediaStreamConstraints = {
        video: cam ? (camId ? { deviceId: { exact: camId } } : true) : false,
        audio: mic
          ? (micId
            ? { deviceId: { exact: micId }, noiseSuppression: true, echoCancellation: true }
            : { noiseSuppression: true, echoCancellation: true })
          : false,
      };
      if (!constraints.video && !constraints.audio) { streamRef.current = null; setStream(null); return; }
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = s;
      setStream(s);
      setPermissionError(null);
      await enumerateDevices(camId, micId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Media access denied";
      setPermissionError(msg.includes("Permission") || msg.includes("NotAllowed")
        ? "Camera/mic access was denied. Please allow permissions and try again."
        : msg);
      streamRef.current = null;
      setStream(null);
    }
  }, [enumerateDevices]);

  const stopPreview = useCallback(() => {
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; setStream(null); }
  }, []);

  useEffect(() => { startPreview(true, true, "", ""); }, []); // eslint-disable-line
  useEffect(() => { startPreview(camEnabled, micEnabled, selectedCam, selectedMic); }, [camEnabled, micEnabled, selectedCam, selectedMic]); // eslint-disable-line

  return {
    stream, camEnabled, setCamEnabled, micEnabled, setMicEnabled,
    noiseCancellation, setNoiseCancellation,
    privacyMode, setPrivacyMode,
    cameras, mics, selectedCam, setSelectedCam, selectedMic, setSelectedMic,
    permissionError, stopPreview,
  };
}

// ─── useMicLevel ──────────────────────────────────────────────────────────────

function useMicLevel(stream: MediaStream | null, enabled: boolean) {
  const [level, setLevel] = useState(0);
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!stream || !enabled) { setLevel(0); return; }
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      ctxRef.current = ctx;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        setLevel(Math.min(1, data.reduce((a, b) => a + b, 0) / data.length / 60));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch { /* silent */ }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ctxRef.current?.close();
    };
  }, [stream, enabled]);

  return level;
}

// ─── useCallTimer ─────────────────────────────────────────────────────────────

function useCallTimer(active: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    if (!active) { setElapsed(0); startRef.current = null; return; }
    startRef.current = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current!) / 1000)), 1000);
    return () => clearInterval(id);
  }, [active]);
  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return h > 0 ? `${h}:${m}:${sec}` : `${m}:${sec}`;
  };
  return fmt(elapsed);
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtTime(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

// ─── PDF generator ────────────────────────────────────────────────────────────

async function downloadPDF(
  content: string,
  filename: string,
  title: string,
  sessionId: string,
  type: "transcript" | "summary"
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;
  const now = new Date().toLocaleString();

  // ── Purple header bar ──
  doc.setFillColor(109, 40, 217); // purple-700
  doc.rect(0, 0, pageW, 28, "F");

  // ── TutorLink wordmark ──
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("TutorLink", margin, 12);

  // ── Subtitle in header ──
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(type === "transcript" ? "Session Transcript" : "Session Summary", margin, 19);

  // ── Date top-right in header ──
  doc.setFontSize(8);
  doc.text(now, pageW - margin, 12, { align: "right" });
  doc.text(`Session ID: ${sessionId.slice(0, 8)}…`, pageW - margin, 19, { align: "right" });

  // ── Thin accent line below header ──
  doc.setFillColor(167, 139, 250); // purple-400
  doc.rect(0, 28, pageW, 1.5, "F");

  let y = 40;

  // ── Document title ──
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, y);
  y += 10;

  // ── Divider ──
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  if (type === "summary") {
    // ── Summary: parse ## sections and render with styled headers ──
    const lines = content.split("\n");

    for (const line of lines) {
      if (y > pageH - 25) {
        doc.addPage();
        drawPageHeader(doc, pageW, pageH, margin, sessionId, now);
        y = 25;
      }

      if (line.startsWith("## ")) {
        // Section heading
        y += 4;
        doc.setFillColor(245, 243, 255); // purple-50
        doc.setDrawColor(167, 139, 250);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, y - 5, contentW, 9, 2, 2, "FD");
        doc.setTextColor(109, 40, 217);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(line.replace("## ", ""), margin + 3, y + 1);
        y += 10;
      } else if (line.startsWith("- ") || line.startsWith("• ")) {
        // Bullet point
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const bulletText = line.replace(/^[-•]\s/, "");
        const wrapped = doc.splitTextToSize(`• ${bulletText}`, contentW - 6);
        for (const wl of wrapped) {
          if (y > pageH - 25) {
            doc.addPage();
            drawPageHeader(doc, pageW, pageH, margin, sessionId, now);
            y = 25;
          }
          doc.text(wl, margin + 4, y);
          y += 5.5;
        }
      } else if (line.trim() === "") {
        y += 3;
      } else {
        // Normal paragraph text
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const wrapped = doc.splitTextToSize(line, contentW);
        for (const wl of wrapped) {
          if (y > pageH - 25) {
            doc.addPage();
            drawPageHeader(doc, pageW, pageH, margin, sessionId, now);
            y = 25;
          }
          doc.text(wl, margin, y);
          y += 5.5;
        }
      }
    }
  } else {
    // ── Transcript: timestamp + text rows ──
    const entries = content.split("\n").filter(Boolean);

    for (const entry of entries) {
      if (y > pageH - 25) {
        doc.addPage();
        drawPageHeader(doc, pageW, pageH, margin, sessionId, now);
        y = 25;
      }

      const match = entry.match(/^\[(\d{2}:\d{2})\]\s(.+)$/);
      if (match) {
        const [, ts, text] = match;

        // Timestamp badge
        doc.setFillColor(237, 233, 254); // purple-100
        doc.setDrawColor(196, 181, 253); // purple-300
        doc.setLineWidth(0.2);
        doc.roundedRect(margin, y - 4, 16, 6, 1.5, 1.5, "FD");
        doc.setTextColor(109, 40, 217);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(ts, margin + 8, y, { align: "center" });

        // Transcript text
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const wrapped = doc.splitTextToSize(text, contentW - 22);
        doc.text(wrapped[0], margin + 20, y);
        y += 6;

        for (let i = 1; i < wrapped.length; i++) {
          if (y > pageH - 25) {
            doc.addPage();
            drawPageHeader(doc, pageW, pageH, margin, sessionId, now);
            y = 25;
          }
          doc.text(wrapped[i], margin + 20, y);
          y += 5.5;
        }
        y += 1.5;
      } else {
        // Fallback plain text
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const wrapped = doc.splitTextToSize(entry, contentW);
        for (const wl of wrapped) {
          if (y > pageH - 25) {
            doc.addPage();
            drawPageHeader(doc, pageW, pageH, margin, sessionId, now);
            y = 25;
          }
          doc.text(wl, margin, y);
          y += 5.5;
        }
        y += 1.5;
      }
    }
  }

  // ── Footer on every page ──
  const totalPages = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(248, 247, 255);
    doc.rect(0, pageH - 12, pageW, 12, "F");
    doc.setDrawColor(220, 215, 250);
    doc.setLineWidth(0.3);
    doc.line(0, pageH - 12, pageW, pageH - 12);
    doc.setTextColor(150, 130, 200);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Generated by TutorLink · tutorlink.app", margin, pageH - 5);
    doc.text(`Page ${i} of ${totalPages}`, pageW - margin, pageH - 5, { align: "right" });
  }

  doc.save(filename);
}

// ── Continuation header for extra pages ──
function drawPageHeader(
  doc: import("jspdf").jsPDF,
  pageW: number,
  _pageH: number,
  margin: number,
  sessionId: string,
  now: string
) {
  doc.setFillColor(109, 40, 217);
  doc.rect(0, 0, pageW, 14, "F");
  doc.setFillColor(167, 139, 250);
  doc.rect(0, 14, pageW, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("TutorLink", margin, 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Session ${sessionId.slice(0, 8)}… · ${now}`, pageW - margin, 9, { align: "right" });
}

// ─── useAutoRecording ─────────────────────────────────────────────────────────

function useAutoRecording(sessionId: string) {
  const room = useRoomContext();
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startRecording = useCallback(() => {
    try {
      const audioTracks: MediaStreamTrack[] = [];
      const videoTracks: MediaStreamTrack[] = [];

      const allParticipants = [room.localParticipant, ...Array.from(room.remoteParticipants.values())];
      for (const participant of allParticipants) {
        for (const publication of participant.trackPublications.values()) {
          if (!publication.track || !publication.track.mediaStreamTrack) continue;
          if (publication.kind === "audio") audioTracks.push(publication.track.mediaStreamTrack);
          if (publication.kind === "video") videoTracks.push(publication.track.mediaStreamTrack);
        }
      }

      if (audioTracks.length === 0 && videoTracks.length === 0) return;

      const audioCtx = new AudioContext();
      const destination = audioCtx.createMediaStreamDestination();
      for (const track of audioTracks) {
        const src = audioCtx.createMediaStreamSource(new MediaStream([track]));
        src.connect(destination);
      }

      const combinedTracks: MediaStreamTrack[] = [...destination.stream.getAudioTracks()];
      if (videoTracks[0]) combinedTracks.push(videoTracks[0]);

      const combinedStream = new MediaStream(combinedTracks);

      const mimeType = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "audio/webm",
      ].find((t) => MediaRecorder.isTypeSupported(t)) ?? "video/webm";

      chunksRef.current = [];
      const recorder = new MediaRecorder(combinedStream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        audioCtx.close();
        if (chunksRef.current.length === 0) return;

        const blob = new Blob(chunksRef.current, { type: mimeType });
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");

        // 1. Download recording .webm
        const recUrl = URL.createObjectURL(blob);
        const recA = document.createElement("a");
        recA.href = recUrl;
        recA.download = `session-${timestamp}.webm`;
        document.body.appendChild(recA);
        recA.click();
        document.body.removeChild(recA);
        setTimeout(() => URL.revokeObjectURL(recUrl), 5000);

        setRecording(false);
        setElapsed(0);
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

        // 2. Transcribe via Groq Whisper
        try {
          const fd = new FormData();
          fd.append("sessionId", sessionId);
          fd.append("audio", blob, "recording.webm");
          const res = await fetch("/api/transcribe", { method: "POST", body: fd });

          if (res.ok) {
            const data = await res.json();
            const transcript = data.transcript;

            if (transcript) {
              const segments = transcript.segments ?? [];
              const transcriptText = segments.length > 0
                ? segments.map((seg: { start: number; end: number; text: string }) =>
                    `[${fmtTime(seg.start)}] ${seg.text.trim()}`
                  ).join("\n")
                : transcript.text;

              // 3. Download transcript PDF
              await downloadPDF(
                transcriptText,
                `transcript-${timestamp}.pdf`,
                "Session Transcript",
                sessionId,
                "transcript"
              );

              // 4. AI summary via Groq
              try {
                const summaryRes = await fetch("/api/summarize", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ transcript: transcriptText, sessionId }),
                });

                if (summaryRes.ok) {
                  const summaryData = await summaryRes.json();
                  // 5. Download summary PDF
                  await downloadPDF(
                    summaryData.summary,
                    `summary-${timestamp}.pdf`,
                    "Session Summary",
                    sessionId,
                    "summary"
                  );
                }
              } catch (err) {
                console.error("[useAutoRecording] summary failed:", err);
              }
            }
          }
        } catch (err) {
          console.error("[useAutoRecording] transcription failed:", err);
        }
      };

      recorder.start(500);
      recorderRef.current = recorder;
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch { /* silent */ }
  }, [room, sessionId]);

  useEffect(() => () => stopRecording(), [stopRecording]);

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return { recording, recordingTime: fmt(elapsed), startRecording, stopRecording };
}

// ─── RecordingControls ────────────────────────────────────────────────────────

function RecordingControls({ isDark, sessionId }: { isDark: boolean; sessionId: string }) {
  const { recording, recordingTime, startRecording, stopRecording } = useAutoRecording(sessionId);
  return (
    <button
      aria-label={recording ? "Stop recording" : "Record session"}
      className="sc-rec-btn"
      onClick={recording ? stopRecording : startRecording}
      style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 12px", borderRadius:10, border: recording ? "1px solid rgba(239,68,68,.5)" : (isDark ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(0,0,0,0.15)"), background: recording ? "rgba(239,68,68,.12)" : (isDark ? "transparent" : "rgba(0,0,0,0.03)"), color: recording ? "rgb(239,68,68)" : (isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)"), fontSize:12, fontWeight:600, cursor:"pointer", transition:"all .15s", whiteSpace:"nowrap" }}
    >
      {recording
        ? <><Square style={{ width:12, height:12, fill:"currentColor" }} />{recordingTime}</>
        : <><CircleDot style={{ width:13, height:13 }} />Record</>
      }
    </button>
  );
}

// ─── useCountdown ─────────────────────────────────────────────────────────────

function useCountdown(onDone: () => void) {
  const [count, setCount] = useState<number | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const start = useCallback(() => setCount(COUNTDOWN_SECS), []);
  const cancel = useCallback(() => setCount(null), []);
  useEffect(() => {
    if (count === null) return;
    if (count === 0) { setCount(null); onDoneRef.current(); return; }
    const id = setTimeout(() => setCount((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(id);
  }, [count]);
  return { count, start, cancel };
}

// ─── MacHeader ────────────────────────────────────────────────────────────────

function MacHeader({ center, right, isDark }: { center?: React.ReactNode; right?: React.ReactNode; isDark?: boolean }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderBottom: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.07)", position:"relative" }}>
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        {(["#ff5f57","#febc2e","#28c840"] as const).map((bg, i) => (
          <span key={i} style={{ width:11, height:11, borderRadius:"50%", background:bg, display:"block", boxShadow:"0 0 0 0.5px rgba(0,0,0,0.15)" }} />
        ))}
      </div>
      <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)" }}>{center}</div>
      <div>{right}</div>
    </div>
  );
}

// ─── StyledDropdown ───────────────────────────────────────────────────────────

function StyledDropdown({ label, icon: Icon, value, options, onChange, isDark }: {
  label: string; icon: React.ElementType; value: string;
  options: MediaDevice[]; onChange: (v: string) => void; isDark: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.deviceId === value);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open]);

  if (!options.length) return null;

  const border = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const bg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
  const textColor = isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)";

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => setOpen((o) => !o)}
        style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"8px 10px", borderRadius:10, border:`1px solid ${border}`, background: open ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)") : bg, color:textColor, fontSize:12, fontWeight:500, cursor:"pointer", transition:"all .15s", textAlign:"left" }}>
        <Icon style={{ width:13, height:13, flexShrink:0, color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)" }} />
        <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{selected?.label ?? label}</span>
        <ChevronDown style={{ width:12, height:12, flexShrink:0, opacity:.4, transition:"transform .2s", transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      {open && (
        <div role="listbox" aria-label={label}
          style={{ position:"absolute", top:"calc(100% + 5px)", left:0, right:0, zIndex:100, borderRadius:11, border:`1px solid ${border}`, background: isDark ? "#1c1c1e" : "#fff", boxShadow: isDark ? "0 8px 32px rgba(0,0,0,.55)" : "0 8px 32px rgba(0,0,0,.12)", overflow:"hidden", animation:"sc-dropdown-in .18s cubic-bezier(.34,1.3,.64,1) both" }}>
          {options.map((opt) => {
            const isActive = opt.deviceId === value;
            return (
              <button key={opt.deviceId} role="option" aria-selected={isActive} type="button" className="sc-dropdown-item"
                onClick={() => { onChange(opt.deviceId); setOpen(false); }}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"9px 12px", border:"none", background: isActive ? (isDark ? "rgba(var(--primary),.15)" : "rgba(var(--primary),.08)") : "transparent", color: isActive ? "rgb(var(--primary))" : textColor, fontSize:12, fontWeight: isActive ? 600 : 400, cursor:"pointer", textAlign:"left", transition:"background .1s" }}>
                <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{opt.label}</span>
                {isActive && <Check style={{ width:12, height:12, flexShrink:0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ToggleRow ────────────────────────────────────────────────────────────────

function ToggleRow({ icon: Icon, label, description, enabled, onChange, isDark, accentColor, accentAlpha }: {
  icon: React.ElementType; label: string; description: string;
  enabled: boolean; onChange: (v: boolean) => void; isDark: boolean;
  accentColor?: string; accentAlpha?: string;
}) {
  const accent = accentColor ?? "rgb(var(--primary))";
  const accentA = accentAlpha ?? "rgba(var(--primary),.15)";
  return (
    <button type="button" role="switch" aria-checked={enabled} aria-label={label} className="sc-toggle"
      onClick={() => onChange(!enabled)}
      style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:11, border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.07)", background: enabled ? (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)") : "transparent", cursor:"pointer", textAlign:"left", transition:"all .15s" }}>
      <div style={{ width:30, height:30, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", background: enabled ? accentA : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"), flexShrink:0, transition:"background .2s" }}>
        <Icon style={{ width:14, height:14, color: enabled ? accent : (isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)") }} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:600, color: isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.75)" }}>{label}</div>
        <div style={{ fontSize:11, color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)", marginTop:1 }}>{description}</div>
      </div>
      <div style={{ width:36, height:20, borderRadius:99, background: enabled ? accent : (isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"), position:"relative", flexShrink:0, transition:"background .2s" }}>
        <div style={{ position:"absolute", top:2, left: enabled ? 18 : 2, width:16, height:16, borderRadius:"50%", background:"#fff", boxShadow:"0 1px 4px rgba(0,0,0,.25)", transition:"left .2s cubic-bezier(.34,1.3,.64,1)" }} />
      </div>
    </button>
  );
}

// ─── MicLevelMeter ────────────────────────────────────────────────────────────

function MicLevelMeter({ level, isDark }: { level: number; isDark: boolean }) {
  const bars = 12;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:5 }} aria-label={`Mic level: ${level > 0.05 ? "detected" : "silence"}`} aria-live="polite">
      <Mic style={{ width:11, height:11, color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)", flexShrink:0 }} />
      <div style={{ display:"flex", alignItems:"flex-end", gap:2, height:14 }}>
        {Array.from({ length: bars }).map((_, i) => {
          const active = level > i / bars;
          const color = i < bars * 0.6 ? "rgb(34,197,94)" : i < bars * 0.85 ? "rgb(234,179,8)" : "rgb(239,68,68)";
          return <div key={i} style={{ width:3, height:`${40 + (i / bars) * 60}%`, borderRadius:2, background: active ? color : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"), transition:"background .08s" }} />;
        })}
      </div>
      <span style={{ fontSize:11, color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.35)", marginLeft:1 }}>
        {level > 0.05 ? "Detected" : "Silence"}
      </span>
    </div>
  );
}

// ─── CountdownOverlay ─────────────────────────────────────────────────────────

function CountdownOverlay({ count, onCancel, isDark }: { count: number; onCancel: () => void; isDark: boolean }) {
  const circumference = 2 * Math.PI * 22;
  const progress = ((COUNTDOWN_SECS - count) / COUNTDOWN_SECS) * circumference;
  return (
    <div style={{ position:"absolute", inset:0, zIndex:40, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background: isDark ? "rgba(0,0,0,0.78)" : "rgba(255,255,255,0.85)", backdropFilter:"blur(10px)", borderRadius:23, animation:"sc-fadein .2s ease both", gap:16 }}>
      <div style={{ position:"relative", width:84, height:84, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <svg width="84" height="84" style={{ position:"absolute", inset:0, transform:"rotate(-90deg)" }}>
          <circle cx="42" cy="42" r="22" fill="none" stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"} strokeWidth="3" />
          <circle cx="42" cy="42" r="22" fill="none" stroke="rgb(var(--primary))" strokeWidth="3" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference - progress} style={{ transition:"stroke-dashoffset .9s linear" }} />
        </svg>
        <span key={count} style={{ fontSize:34, fontWeight:700, color: isDark ? "#f4f4f5" : "#18181b", letterSpacing:"-.02em", animation:"sc-count-pop .95s ease both" }}>{count}</span>
      </div>
      <p style={{ margin:0, fontSize:13, fontWeight:500, color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>Joining in {count}…</p>
      <button type="button" onClick={onCancel} style={{ padding:"7px 20px", borderRadius:99, border: isDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(0,0,0,0.12)", background:"transparent", color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)", fontSize:12, fontWeight:600, cursor:"pointer" }}>Cancel</button>
    </div>
  );
}

// ─── PreviewVideo ─────────────────────────────────────────────────────────────

function PreviewVideo({ stream, camEnabled, privacyMode, isDark }: { stream: MediaStream | null; camEnabled: boolean; privacyMode: boolean; isDark: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (videoRef.current && stream) videoRef.current.srcObject = stream; }, [stream]);

  return (
    <div style={{ position:"relative", width:"100%", aspectRatio:"16/9", borderRadius:12, overflow:"hidden", background: isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.08)", border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)" }}>
      {stream && camEnabled ? (
        <>
          <video ref={videoRef} autoPlay muted playsInline style={{ width:"100%", height:"100%", objectFit:"cover", transform:"scaleX(-1)" }} />
          {privacyMode && (
            <div style={{ position:"absolute", inset:0, backdropFilter:"blur(20px) brightness(0.6)", background:"rgba(0,0,0,0.35)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div style={{ padding:"5px 12px", borderRadius:99, background:"rgba(0,0,0,0.5)", fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.8)" }}>
                Privacy mode on
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:8 }}>
          <CameraOff style={{ width:28, height:28, color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)" }} />
          <span style={{ fontSize:12, color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)" }}>Camera off</span>
        </div>
      )}
    </div>
  );
}

// ─── In-call sub-components ───────────────────────────────────────────────────

function VideoGrid() {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: false }, { source: Track.Source.ScreenShare, withPlaceholder: false }],
    { onlySubscribed: false }
  );
  return <GridLayout tracks={tracks} style={{ height:"100%" }}><ParticipantTile /></GridLayout>;
}

function ParticipantBadge({ isDark }: { isDark: boolean }) {
  const participants = useParticipants();
  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 9px", borderRadius:99, fontSize:11, fontWeight:600, background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)" }}>
      <Users style={{ width:11, height:11 }} />{participants.length + 1}
    </div>
  );
}

function ConnectionBadge({ isDark }: { isDark: boolean }) {
  const room = useRoomContext();
  const [quality, setQuality] = useState<ConnectionQuality>(ConnectionQuality.Unknown);
  useEffect(() => {
    if (!room) return;
    const update = () => setQuality(room.localParticipant.connectionQuality);
    room.localParticipant.on("connectionQualityChanged", update);
    update();
    return () => { room.localParticipant.off("connectionQualityChanged", update); };
  }, [room]);
  const map: Record<ConnectionQuality, { color: string; label: string; show: boolean }> = {
    [ConnectionQuality.Excellent]: { color:"rgb(34,197,94)",   label:"Excellent", show:true },
    [ConnectionQuality.Good]:      { color:"rgb(234,179,8)",   label:"Good",      show:true },
    [ConnectionQuality.Poor]:      { color:"rgb(239,68,68)",   label:"Poor",      show:true },
    [ConnectionQuality.Lost]:      { color:"rgb(156,163,175)", label:"Lost",      show:true },
    [ConnectionQuality.Unknown]:   { color:"rgb(156,163,175)", label:"",          show:false },
  };
  const info = map[quality];
  if (!info.show) return null;
  return (
    <div title={`Connection: ${info.label}`} style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 8px", borderRadius:99, fontSize:11, fontWeight:500, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", border: isDark ? "1px solid rgba(255,255,255,0.09)" : "1px solid rgba(0,0,0,0.07)", color:info.color }}>
      <Signal style={{ width:11, height:11 }} />{info.label}
    </div>
  );
}

function ReconnectionBanner({ isDark }: { isDark: boolean }) {
  const room = useRoomContext();
  const [reconnecting, setReconnecting] = useState(false);
  useEffect(() => {
    if (!room) return;
    const onR = () => setReconnecting(true);
    const offR = () => setReconnecting(false);
    room.on("reconnecting", onR);
    room.on("reconnected", offR);
    return () => { room.off("reconnecting", onR); room.off("reconnected", offR); };
  }, [room]);
  if (!reconnecting) return null;
  return (
    <div role="alert" aria-live="assertive" style={{ pointerEvents:"none", position:"absolute", top:14, left:"50%", zIndex:30, display:"inline-flex", alignItems:"center", gap:7, padding:"8px 16px", borderRadius:99, fontSize:13, fontWeight:600, background:"rgba(234,179,8,.15)", border:"1px solid rgba(234,179,8,.3)", color:"rgb(234,179,8)", backdropFilter:"blur(10px)", animation:"sc-badge-in .25s cubic-bezier(.34,1.56,.64,1) both" }}>
      <RefreshCw style={{ width:13, height:13, animation:"sc-spin .9s linear infinite" }} />Reconnecting…
    </div>
  );
}

function JoinNotification({ onJoined }: { onJoined: (name: string) => void }) {
  const room = useRoomContext();
  useEffect(() => {
    if (!room) return;
    const h = (p: { name?: string; identity: string }) => onJoined(p.name?.trim() || p.identity || "A participant");
    room.on("participantConnected", h);
    return () => { room.off("participantConnected", h); };
  }, [room, onJoined]);
  return null;
}

// ─── LeaveDialog ─────────────────────────────────────────────────────────────

function LeaveDialog({ open, onConfirm, onCancel, isDark }: { open: boolean; onConfirm: () => void; onCancel: () => void; isDark: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" style={{ position:"absolute", inset:0, zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.55)", backdropFilter:"blur(6px)", borderRadius:23, animation:"sc-fadein .18s ease both" }}>
      <div style={{ padding:"26px 24px 22px", borderRadius:18, background: isDark ? "#1c1c1e" : "#fff", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)", maxWidth:290, width:"90%", boxShadow:"0 20px 60px rgba(0,0,0,.35)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:"rgba(239,68,68,.12)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <LogOut style={{ width:15, height:15, color:"rgb(239,68,68)" }} />
          </div>
          <h4 style={{ margin:0, fontSize:15, fontWeight:700, color: isDark ? "#f4f4f5" : "#18181b" }}>Leave call?</h4>
        </div>
        <p style={{ margin:"0 0 18px", fontSize:13, color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.5)", lineHeight:1.5 }}>
          You will be disconnected. You can rejoin at any time.
        </p>
        <div style={{ display:"flex", gap:8 }}>
          <button autoFocus onClick={onCancel} style={{ flex:1, padding:"9px 0", borderRadius:10, border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.1)", background:"transparent", color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)", fontSize:13, fontWeight:600, cursor:"pointer" }}>Stay</button>
          <button onClick={onConfirm} style={{ flex:1, padding:"9px 0", borderRadius:10, border:"1px solid rgba(239,68,68,.3)", background:"rgba(239,68,68,.1)", color:"rgb(239,68,68)", fontSize:13, fontWeight:600, cursor:"pointer" }}>Leave</button>
        </div>
      </div>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const gradientBorder: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid rgba(168,85,247,0.4)",
  background: "transparent",
  overflow: "hidden",
  animation: "sc-fadein .35s ease both",
};

const innerCard: React.CSSProperties = {
  borderRadius: 23,
  background: "transparent",
  overflow: "hidden",
};

// ─── SessionCallEmbed ─────────────────────────────────────────────────────────

export default function SessionCallEmbed({ sessionId, onLeave }: Props) {
  const isDark = useDarkMode();
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const { token, status, error, join, reset } = useLiveKitToken(sessionId);

  const started = status === "connected" && !!token;
  const joining  = status === "joining";

  const [joinNotice, setJoinNotice] = useState<string | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callTimer = useCallTimer(started);
  const canRenderRoom = useMemo(() => Boolean(started && token && livekitUrl), [started, token, livekitUrl]);

  const media = usePreJoinMedia();
  const micLevel = useMicLevel(media.stream, media.micEnabled);

  useEffect(() => { injectStyles(); }, []);

  useEffect(() => {
    if (!started) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [started]);

  const showJoinNotice = useCallback((name: string) => {
    const msg = `${name} joined`;
    setJoinNotice(msg);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setJoinNotice(null), 3500);
  }, []);

  useEffect(() => () => { if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current); }, []);

  const handleLeave = useCallback(() => {
    setShowLeaveDialog(false);
    reset();
    onLeave?.();
  }, [reset, onLeave]);

  const { count, start: startCountdown, cancel: cancelCountdown } = useCountdown(
    useCallback(() => { media.stopPreview(); join(); }, [join, media])
  );

  if (!livekitUrl) {
    return (
      <div style={gradientBorder}>
        <div style={innerCard}>
          <MacHeader isDark={isDark} />
          <div style={{ padding:"16px 20px", fontSize:13, color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.5)", display:"flex", alignItems:"center", gap:8 }}>
            <WifiOff style={{ width:15, height:15 }} />
            <span>Call unavailable — missing server configuration.</span>
          </div>
        </div>
      </div>
    );
  }

  if (started && token && livekitUrl) {
    return (
      <div style={gradientBorder}>
        <div style={{ ...innerCard, position:"relative" }}>
          <MacHeader
            isDark={isDark}
            center={
              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                <div style={{ width:22, height:22, borderRadius:"50%", background:"rgba(var(--primary),.12)", display:"flex", alignItems:"center", justifyContent:"center", border:"1px solid rgba(var(--primary),.2)" }}>
                  <Video style={{ width:11, height:11, color:"rgb(var(--primary))" }} />
                </div>
                <span style={{ fontSize:12, fontWeight:600, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>Session Call</span>
              </div>
            }
            right={
              <div style={{ display:"flex", alignItems:"center", gap:5, padding:"3px 9px", borderRadius:99, fontSize:11, fontWeight:500, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", border: isDark ? "1px solid rgba(255,255,255,0.09)" : "1px solid rgba(0,0,0,0.07)", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>
                <Clock style={{ width:11, height:11 }} />
                <span aria-label={`Call duration: ${callTimer}`}>{callTimer}</span>
              </div>
            }
          />

          <div style={{ height:"70vh", minHeight:560 }}>
            <LiveKitRoom serverUrl={livekitUrl} token={token} connect={canRenderRoom} video audio data-lk-theme="default" style={{ height:"100%" }}>
              <div style={{ position:"relative", display:"flex", flexDirection:"column", height:"100%" }}>
                <JoinNotification onJoined={showJoinNotice} />
                <ReconnectionBanner isDark={isDark} />
                <LeaveDialog open={showLeaveDialog} onConfirm={handleLeave} onCancel={() => setShowLeaveDialog(false)} isDark={isDark} />

                {joinNotice && (
                  <div role="status" aria-live="polite" style={{ pointerEvents:"none", position:"absolute", top:14, left:"50%", zIndex:20, display:"inline-flex", alignItems:"center", gap:7, padding:"8px 16px", borderRadius:99, fontSize:13, fontWeight:600, background:"rgba(34,197,94,.13)", border:"1px solid rgba(34,197,94,.28)", color:"rgb(34,197,94)", backdropFilter:"blur(10px)", boxShadow:"0 4px 20px rgba(0,0,0,.15)", animation:"sc-badge-in .25s cubic-bezier(.34,1.56,.64,1) both" }}>
                    <Users style={{ width:13, height:13 }} />{joinNotice}
                  </div>
                )}

                <div style={{ position:"absolute", top:10, right:12, zIndex:15, display:"flex", alignItems:"center", gap:5 }}>
                  <ParticipantBadge isDark={isDark} />
                  <ConnectionBadge isDark={isDark} />
                </div>

                <div style={{ flex:1, minHeight:0, padding:10 }}><VideoGrid /></div>
                <RoomAudioRenderer />
                <StartAudio label="Click to allow audio playback" />

                <div style={{ borderTop: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.07)", padding:"8px 10px", background: isDark ? "rgba(20,20,22,0.95)" : "rgba(255,255,255,0.97)", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                  <div style={{ flex:"1 1 auto", minWidth:0 }}>
                    <ControlBar controls={{ leave: false }} />
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                    <RecordingControls isDark={isDark} sessionId={sessionId} />
                    <button
                      aria-label="Leave call"
                      className="sc-leave-btn"
                      onClick={() => setShowLeaveDialog(true)}
                      style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 12px", borderRadius:10, border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.12)", background: isDark ? "transparent" : "rgba(0,0,0,0.03)", color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.6)", fontSize:12, fontWeight:600, cursor:"pointer", transition:"all .15s", whiteSpace:"nowrap" }}
                    >
                      <LogOut style={{ width:13, height:13 }} />Leave
                    </button>
                  </div>
                </div>
              </div>
            </LiveKitRoom>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={gradientBorder}>
      <div style={{ ...innerCard, position:"relative" }}>
        {count !== null && <CountdownOverlay count={count} onCancel={cancelCountdown} isDark={isDark} />}

        <MacHeader
          isDark={isDark}
          center={<span style={{ fontSize:12, fontWeight:500, color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)", letterSpacing:".01em" }}>Live Session</span>}
          right={
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:"rgb(34,197,94)", animation:"sc-dot-blink 1.5s ease-in-out infinite" }} />
              <span style={{ fontSize:11, color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)", fontWeight:500 }}>ready</span>
            </div>
          }
        />

        <div style={{ height:3, background:"linear-gradient(90deg, rgb(var(--primary)) 0%, rgba(var(--primary),.35) 60%, transparent 100%)" }} />

        <div style={{ padding:"22px 22px 20px", display:"flex", gap:22, flexWrap:"wrap" }}>
          <div style={{ flex:"1 1 220px", minWidth:0, display:"flex", flexDirection:"column", gap:12 }}>
            <PreviewVideo stream={media.stream} camEnabled={media.camEnabled} privacyMode={media.privacyMode} isDark={isDark} />

            <div style={{ display:"flex", gap:7 }}>
              {([
                { enabled: media.camEnabled, setEnabled: media.setCamEnabled, onIcon: Camera, offIcon: CameraOff, onLabel:"Camera", offLabel:"Camera off", ariaLabel: media.camEnabled ? "Turn off camera" : "Turn on camera" },
                { enabled: media.micEnabled, setEnabled: media.setMicEnabled, onIcon: Mic, offIcon: MicOff, onLabel:"Mic", offLabel:"Mic off", ariaLabel: media.micEnabled ? "Mute mic" : "Unmute mic" },
              ]).map(({ enabled, setEnabled, onIcon: On, offIcon: Off, onLabel, offLabel, ariaLabel }, i) => (
                <button key={i} aria-label={ariaLabel} aria-pressed={enabled} onClick={() => setEnabled(!enabled)}
                  style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"7px 0", borderRadius:10, border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.09)", background: enabled ? (isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.04)") : "rgba(239,68,68,.1)", color: enabled ? (isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.6)") : "rgb(239,68,68)", fontSize:12, fontWeight:600, cursor:"pointer", transition:"all .15s" }}>
                  {enabled ? <On style={{ width:13, height:13 }} /> : <Off style={{ width:13, height:13 }} />}
                  {enabled ? onLabel : offLabel}
                </button>
              ))}
            </div>

            {media.micEnabled && <MicLevelMeter level={micLevel} isDark={isDark} />}

            {(media.cameras.length > 0 || media.mics.length > 0) && (
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {media.cameras.length > 0 && <StyledDropdown label="Camera" icon={Camera} value={media.selectedCam} options={media.cameras} onChange={media.setSelectedCam} isDark={isDark} />}
                {media.mics.length > 0 && <StyledDropdown label="Microphone" icon={Mic} value={media.selectedMic} options={media.mics} onChange={media.setSelectedMic} isDark={isDark} />}
              </div>
            )}

            {media.permissionError && (
              <div role="alert" style={{ display:"flex", alignItems:"flex-start", gap:8, borderRadius:10, border:"1px solid rgba(239,68,68,.25)", background:"rgba(239,68,68,.08)", padding:"9px 12px", fontSize:12, color:"rgb(239,100,100)", animation:"sc-shake .35s ease" }}>
                <AlertCircle style={{ width:13, height:13, flexShrink:0, marginTop:1 }} /><span>{media.permissionError}</span>
              </div>
            )}
          </div>

          <div style={{ flex:"1 1 200px", minWidth:0, display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:13 }}>
              <div style={{ position:"relative", flexShrink:0 }}>
                <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:"rgb(var(--primary))", opacity:.18, animation:"sc-pulse 2.4s ease-in-out infinite", transform:"scale(1.55)" }} />
                <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:"rgb(var(--primary))", opacity:.1, animation:"sc-pulse2 2.4s ease-in-out infinite .6s", transform:"scale(2.1)" }} />
                <div style={{ position:"relative", zIndex:1, width:44, height:44, borderRadius:"50%", background:"rgba(var(--primary),.12)", border:"1.5px solid rgba(var(--primary),.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Video style={{ width:18, height:18, color:"rgb(var(--primary))" }} />
                </div>
              </div>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap" }}>
                  <h3 style={{ margin:0, fontSize:15, fontWeight:700, color: isDark ? "#f4f4f5" : "#18181b", letterSpacing:"-.01em" }}>Live Tutoring Call</h3>
                  <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"2px 8px", borderRadius:99, fontSize:11, fontWeight:600, letterSpacing:".04em", textTransform:"uppercase", background:"rgba(34,197,94,.13)", color:"rgb(34,197,94)", border:"1px solid rgba(34,197,94,.25)" }}>
                    <span style={{ width:6, height:6, borderRadius:"50%", background:"rgb(34,197,94)", animation:"sc-dot-blink 1.5s ease-in-out infinite" }} />
                    Live
                  </span>
                </div>
                <p style={{ margin:"5px 0 0", fontSize:13, color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.5)", lineHeight:1.5 }}>
                  Private session room with HD video, audio & screen sharing.
                </p>
              </div>
            </div>

            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {([
                { icon: Video,   label: "HD Video" },
                { icon: Mic,     label: "Clear Audio" },
                { icon: Monitor, label: "Screen Share" },
                { icon: Shield,  label: "Private Room" },
              ] as const).map(({ icon: Icon, label }) => (
                <div key={label} className="sc-feature-item" style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"5px 11px", borderRadius:99, fontSize:12, fontWeight:500, color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.5)", background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)" }}>
                  <Icon style={{ width:12, height:12 }} />{label}
                </div>
              ))}
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <ToggleRow icon={Wind} label="Noise Cancellation" description="Reduce background noise"
                enabled={media.noiseCancellation} onChange={media.setNoiseCancellation} isDark={isDark}
                accentColor="rgb(59,130,246)" accentAlpha="rgba(59,130,246,.15)" />
              <ToggleRow icon={Sparkles} label="Privacy Mode" description="Hide your video with a blur overlay"
                enabled={media.privacyMode} onChange={media.setPrivacyMode} isDark={isDark}
                accentColor="rgb(168,85,247)" accentAlpha="rgba(168,85,247,.15)" />
            </div>

            {error && (
              <div role="alert" aria-live="assertive" style={{ display:"flex", alignItems:"center", gap:8, borderRadius:12, border:"1px solid rgba(239,68,68,.25)", background:"rgba(239,68,68,.08)", padding:"10px 14px", fontSize:13, color:"rgb(239,100,100)", animation:"sc-shake .35s ease" }}>
                <AlertCircle style={{ width:15, height:15, flexShrink:0 }} /><span>{error}</span>
              </div>
            )}

            <div style={{ marginTop:"auto" }}>
              <button autoFocus type="button" aria-label="Join the live call" aria-busy={joining} className="sc-join-btn"
                onClick={startCountdown} disabled={joining || count !== null}
                style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"10px 22px", borderRadius:12, border:"none", background: joining ? "rgba(var(--primary),.7)" : "rgb(var(--primary))", color:"#fff", fontSize:14, fontWeight:650, cursor: joining || count !== null ? "not-allowed" : "pointer", opacity: joining || count !== null ? 0.65 : 1, transition:"opacity .15s, transform .15s, box-shadow .15s", boxShadow: joining ? "none" : "0 4px 14px rgba(var(--primary),.35)", letterSpacing:"-.01em" }}>
                {joining
                  ? <><Loader2 style={{ width:15, height:15, animation:"sc-spin .75s linear infinite" }} aria-hidden="true" />Joining…</>
                  : <><Video style={{ width:15, height:15 }} aria-hidden="true" />Join Call</>
                }
              </button>
              {joining && (
                <p style={{ marginTop:8, fontSize:12, color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)" }} aria-live="polite">
                  Connecting to session room…
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}