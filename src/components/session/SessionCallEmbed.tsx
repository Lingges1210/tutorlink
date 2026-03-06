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
import { AlertCircle, Loader2, Video, VideoOff } from "lucide-react";

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

function JoinNotifications({
  onParticipantJoined,
}: {
  onParticipantJoined: (name: string) => void;
}) {
  const room = useRoomContext();

  useEffect(() => {
    if (!room) return;

    const handleParticipantConnected = (participant: {
      name?: string;
      identity: string;
    }) => {
      const label =
        participant.name?.trim() || participant.identity || "A participant";
      onParticipantJoined(label);
    };

    room.on("participantConnected", handleParticipantConnected);

    return () => {
      room.off("participantConnected", handleParticipantConnected);
    };
  }, [room, onParticipantJoined]);

  return null;
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

  const canRenderRoom = useMemo(() => {
    return Boolean(started && token && livekitUrl);
  }, [started, token, livekitUrl]);

  const showJoinNotice = useCallback((name: string) => {
    const message = `${name} joined the room`;
    setJoinNotice(message);

    if (noticeTimeoutRef.current) {
      window.clearTimeout(noticeTimeoutRef.current);
    }

    noticeTimeoutRef.current = window.setTimeout(() => {
      setJoinNotice((current) => (current === message ? null : current));
      noticeTimeoutRef.current = null;
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) {
        window.clearTimeout(noticeTimeoutRef.current);
      }
    };
  }, []);

  const fetchJoinToken = useCallback(async () => {
    try {
      setJoining(true);
      setError(null);

      const res = await fetch("/api/livekit/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = (await res.json()) as TokenRes;

      if (!res.ok) {
        throw new Error(data.error || "Failed to create LiveKit token");
      }

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
    if (!livekitUrl) {
      setError("Missing NEXT_PUBLIC_LIVEKIT_URL");
    }
  }, [livekitUrl]);

  if (!started) {
    return (
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[rgb(var(--primary))/0.10] p-3">
            <Video className="h-5 w-5 text-[rgb(var(--primary))]" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-[rgb(var(--fg))]">
              Live tutoring call
            </h3>
            <p className="mt-1 text-sm text-[rgb(var(--muted))]">
              Join the private session room for video, audio, and optional
              screen sharing.
            </p>

            {error ? (
              <div className="mt-3 flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            ) : null}

            <div className="mt-4">
              <button
                type="button"
                onClick={fetchJoinToken}
                disabled={joining || !livekitUrl}
                className="inline-flex items-center gap-2 rounded-2xl border border-[rgb(var(--primary))] bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {joining ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <Video className="h-4 w-4" />
                    Join Call
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!livekitUrl || !token) {
    return (
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 text-sm text-[rgb(var(--muted))]">
        <div className="flex items-center gap-2">
          <VideoOff className="h-4 w-4" />
          <span>Call unavailable.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))]">
      <div className="border-b border-[rgb(var(--border))] px-4 py-3">
        <h3 className="text-sm font-semibold text-[rgb(var(--fg))]">
          Session Call
        </h3>
      </div>

      <div className="h-[70vh] min-h-[560px]">
        <LiveKitRoom
          serverUrl={livekitUrl}
          token={token}
          connect={canRenderRoom}
          video
          audio
          data-lk-theme="default"
          className="h-full"
        >
          <div className="relative flex h-full flex-col">
            <JoinNotifications onParticipantJoined={showJoinNotice} />

            {joinNotice ? (
              <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 shadow-lg">
                {joinNotice}
              </div>
            ) : null}

            <div className="min-h-0 flex-1 p-3">
              <VideoGrid />
            </div>

            <RoomAudioRenderer />
            <StartAudio label="Click to allow audio playback" />

            <div className="border-t border-[rgb(var(--border))] p-2">
              <ControlBar />
            </div>
          </div>
        </LiveKitRoom>
      </div>
    </div>
  );
}