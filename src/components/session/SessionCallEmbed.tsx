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
  useRoomContext,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { AlertCircle, Loader2, Video, VideoOff, Mic, Monitor, Users } from "lucide-react";

type Props = {
  sessionId: string;
};

type TokenRes = {
  token: string;
  roomName: string;
  error?: string;
};

function VideoGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );
  return (
    <GridLayout tracks={tracks} style={{ height: "100%" }}>
      <ParticipantTile />
    </GridLayout>
  );
}

function JoinNotifications({ onParticipantJoined }: { onParticipantJoined: (name: string) => void }) {
  const room = useRoomContext();
  useEffect(() => {
    if (!room) return;
    const handleParticipantConnected = (participant: { name?: string; identity: string }) => {
      const label = participant.name?.trim() || participant.identity || "A participant";
      onParticipantJoined(label);
    };
    room.on("participantConnected", handleParticipantConnected);
    return () => { room.off("participantConnected", handleParticipantConnected); };
  }, [room, onParticipantJoined]);
  return null;
}

const STYLE_ID = "session-call-keyframes";
function injectStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes sc-pulse {
      0%, 100% { transform: scale(1); opacity: .55; }
      50%       { transform: scale(1.18); opacity: .15; }
    }
    @keyframes sc-pulse2 {
      0%, 100% { transform: scale(1); opacity: .35; }
      50%       { transform: scale(1.32); opacity: .08; }
    }
    @keyframes sc-fadein {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes sc-spin {
      to { transform: rotate(360deg); }
    }
    @keyframes sc-badge-in {
      from { opacity: 0; transform: translateX(-50%) translateY(-8px) scale(.92); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
    }
    @keyframes sc-dot-blink {
      0%, 100% { opacity: 1; }
      50%       { opacity: .3; }
    }
    .sc-feature-item { animation: sc-fadein .4s ease both; }
    .sc-feature-item:nth-child(1) { animation-delay: .08s; }
    .sc-feature-item:nth-child(2) { animation-delay: .16s; }
    .sc-feature-item:nth-child(3) { animation-delay: .24s; }
  `;
  document.head.appendChild(el);
}

const gradientBorder: React.CSSProperties = {
  borderRadius: 24,
  border: "1px solid rgba(168,85,247,0.4)",
  background: "transparent",
  overflow: "hidden",
  animation: "sc-fadein .35s ease both",
};

const innerCard: React.CSSProperties = {
  borderRadius: 0,
  background: "transparent",
  overflow: "hidden",
};

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

function MacHeader({ center, isDark }: { center?: React.ReactNode; isDark?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
        borderBottom: isDark
          ? "1px solid rgba(255,255,255,0.08)"
          : "1px solid rgba(0,0,0,0.07)",
        background: "transparent",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ff5f57", display: "block", boxShadow: "0 0 0 0.5px rgba(0,0,0,0.15)" }} />
        <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#febc2e", display: "block", boxShadow: "0 0 0 0.5px rgba(0,0,0,0.15)" }} />
        <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#28c840", display: "block", boxShadow: "0 0 0 0.5px rgba(0,0,0,0.15)" }} />
      </div>

      <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
        {center}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "rgb(34,197,94)", animation: "sc-dot-blink 1.5s ease-in-out infinite" }} />
        <span style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)", fontWeight: 500 }}>
          connected
        </span>
      </div>
    </div>
  );
}

export default function SessionCallEmbed({ sessionId }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [, setRoomName] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinNotice, setJoinNotice] = useState<string | null>(null);

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const noticeTimeoutRef = useRef<number | null>(null);
  const isDark = useDarkMode();

  useEffect(() => { injectStyles(); }, []);

  const canRenderRoom = useMemo(() => Boolean(started && token && livekitUrl), [started, token, livekitUrl]);

  const showJoinNotice = useCallback((name: string) => {
    const message = `${name} joined`;
    setJoinNotice(message);
    if (noticeTimeoutRef.current) window.clearTimeout(noticeTimeoutRef.current);
    noticeTimeoutRef.current = window.setTimeout(() => {
      setJoinNotice((cur) => (cur === message ? null : cur));
      noticeTimeoutRef.current = null;
    }, 3500);
  }, []);

  useEffect(() => {
    return () => { if (noticeTimeoutRef.current) window.clearTimeout(noticeTimeoutRef.current); };
  }, []);

  const fetchJoinToken = useCallback(async () => {
    try {
      setJoining(true);
      setError(null);
      const res = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = (await res.json()) as TokenRes;
      if (!res.ok) throw new Error(data.error || "Failed to create LiveKit token");
      setToken(data.token);
      setRoomName(data.roomName);
      setStarted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to join call");
    } finally {
      setJoining(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!livekitUrl) setError("Missing NEXT_PUBLIC_LIVEKIT_URL");
  }, [livekitUrl]);

  const innerCard: React.CSSProperties = {
    borderRadius: 23,
    background: "transparent",
    overflow: "hidden",
  };

  /* ─── Pre-join screen ─── */
  if (!started) {
    return (
      <div style={gradientBorder}>
        <div style={innerCard}>

          <MacHeader
            isDark={isDark}
            center={
              <span style={{ fontSize: 12, fontWeight: 500, color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)", letterSpacing: ".01em" }}>
                Live Session
              </span>
            }
          />

          <div style={{ height: 3, background: "linear-gradient(90deg, rgb(var(--primary)) 0%, rgba(var(--primary),.35) 60%, transparent 100%)" }} />

          <div style={{ padding: "28px 28px 24px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgb(var(--primary))", opacity: 0.18, animation: "sc-pulse 2.4s ease-in-out infinite", transform: "scale(1.55)" }} />
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgb(var(--primary))", opacity: 0.1, animation: "sc-pulse2 2.4s ease-in-out infinite .6s", transform: "scale(2.1)" }} />
                <div style={{ position: "relative", zIndex: 1, width: 48, height: 48, borderRadius: "50%", background: "rgba(var(--primary), .12)", border: "1.5px solid rgba(var(--primary), .3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Video style={{ width: 20, height: 20, color: "rgb(var(--primary))" }} />
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: isDark ? "#f4f4f5" : "#18181b", letterSpacing: "-.01em" }}>
                    Live Tutoring Call
                  </h3>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", background: "rgba(34,197,94,.13)", color: "rgb(34,197,94)", border: "1px solid rgba(34,197,94,.25)" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "rgb(34,197,94)", animation: "sc-dot-blink 1.5s ease-in-out infinite" }} />
                    Live
                  </span>
                </div>
                <p style={{ margin: "5px 0 0", fontSize: 13.5, color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.5)", lineHeight: 1.5 }}>
                  Join your private session room for HD video, audio, and screen sharing.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
              {[
                { icon: Video,   label: "HD Video" },
                { icon: Mic,     label: "Clear Audio" },
                { icon: Monitor, label: "Screen Share" },
                { icon: Users,   label: "Private Room" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="sc-feature-item" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 99, fontSize: 12, fontWeight: 500, color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.5)", background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)" }}>
                  <Icon style={{ width: 12, height: 12 }} />
                  {label}
                </div>
              ))}
            </div>

            {error && (
              <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, borderRadius: 12, border: "1px solid rgba(239,68,68,.25)", background: "rgba(239,68,68,.08)", padding: "10px 14px", fontSize: 13, color: "rgb(239,100,100)", animation: "sc-fadein .25s ease both" }}>
                <AlertCircle style={{ width: 15, height: 15, flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <button
                type="button"
                onClick={fetchJoinToken}
                disabled={joining || !livekitUrl}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 12, border: "none", background: joining ? "rgba(var(--primary),.7)" : "rgb(var(--primary))", color: "#fff", fontSize: 14, fontWeight: 650, cursor: joining || !livekitUrl ? "not-allowed" : "pointer", opacity: joining || !livekitUrl ? 0.65 : 1, transition: "opacity .15s, transform .15s, box-shadow .15s", boxShadow: joining ? "none" : "0 4px 14px rgba(var(--primary), .35)", letterSpacing: "-.01em" }}
                onMouseEnter={(e) => { if (!joining && livekitUrl) { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 20px rgba(var(--primary), .45)"; } }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 14px rgba(var(--primary), .35)"; }}
              >
                {joining ? (
                  <><Loader2 style={{ width: 15, height: 15, animation: "sc-spin .75s linear infinite" }} />Joining…</>
                ) : (
                  <><Video style={{ width: 15, height: 15 }} />Join Call</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── No token fallback ─── */
  if (!livekitUrl || !token) {
    return (
      <div style={gradientBorder}>
        <div style={innerCard}>
          <MacHeader isDark={isDark} />
          <div style={{ padding: "16px 20px", fontSize: 13, color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", gap: 8 }}>
            <VideoOff style={{ width: 15, height: 15 }} />
            <span>Call unavailable.</span>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Active call room ─── */
  return (
    <div style={gradientBorder}>
      <div style={innerCard}>

        <MacHeader
          isDark={isDark}
          center={
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(var(--primary), .12)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(var(--primary), .2)" }}>
                <Video style={{ width: 11, height: 11, color: "rgb(var(--primary))" }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", letterSpacing: "-.01em" }}>
                Session Call
              </span>
            </div>
          }
        />

        <div style={{ height: "70vh", minHeight: 560 }}>
          <LiveKitRoom
            serverUrl={livekitUrl}
            token={token}
            connect={canRenderRoom}
            video
            audio
            data-lk-theme="default"
            style={{ height: "100%" }}
          >
            <div style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%" }}>
              <JoinNotifications onParticipantJoined={showJoinNotice} />

              {joinNotice && (
                <div style={{ pointerEvents: "none", position: "absolute", top: 14, left: "50%", zIndex: 20, display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 99, fontSize: 13, fontWeight: 600, background: "rgba(34,197,94,.13)", border: "1px solid rgba(34,197,94,.28)", color: "rgb(34,197,94)", backdropFilter: "blur(10px)", boxShadow: "0 4px 20px rgba(0,0,0,.15)", animation: "sc-badge-in .25s cubic-bezier(.34,1.56,.64,1) both" }}>
                  <Users style={{ width: 13, height: 13 }} />
                  {joinNotice}
                </div>
              )}

              <div style={{ flex: 1, minHeight: 0, padding: 10 }}>
                <VideoGrid />
              </div>

              <RoomAudioRenderer />
              <StartAudio label="Click to allow audio playback" />

              <div style={{ borderTop: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.07)", padding: "8px 10px", background: "transparent", backdropFilter: "blur(8px)" }}>
                <ControlBar />
              </div>
            </div>
          </LiveKitRoom>
        </div>
      </div>
    </div>
  );
}