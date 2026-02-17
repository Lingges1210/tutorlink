// src/app/messaging/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type Conv = {
  id: string;
  sessionId: string;
  name: string; // other person's name
  subjectName: string; // NEW
  lastMessage: string;
  lastAt: string;
  unread: number;
  viewerIsStudent: boolean;
};

type Msg = {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
};

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

type RoleFilter = "ALL" | "STUDENT" | "TUTOR";

export default function MessagingPage() {
  const [meId, setMeId] = useState<string | null>(null);

  const [conversations, setConversations] = useState<Conv[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // ✅ NEW: role filter (All / Student / Tutor)
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  );

  // ✅ NEW: filtered conversations (doesn't change data/logic, only view)
  const filteredConversations = useMemo(() => {
    if (roleFilter === "ALL") return conversations;
    if (roleFilter === "STUDENT")
      return conversations.filter((c) => c.viewerIsStudent);
    return conversations.filter((c) => !c.viewerIsStudent); // TUTOR
  }, [conversations, roleFilter]);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const sp = useSearchParams();
  const qsChannelId = sp.get("channelId");

  // ✅ read receipt timestamps from API
  const [readInfo, setReadInfo] = useState<{
    meLastReadAt: string;
    otherLastReadAt: string;
  } | null>(null);

  // ✅ typing indicator state
  const [otherTyping, setOtherTyping] = useState(false);
  const typingStopTimer = useRef<any>(null);
  const lastTypingSentAt = useRef(0);

  function pingTyping(isTyping: boolean) {
    if (!activeId) return;
    fetch("/api/chat/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: activeId, isTyping }),
    }).catch(() => {});
  }

  // helper: refresh left list (unread + preview)
  async function refreshConversations() {
    const r = await fetch("/api/chat/channels", { cache: "no-store" });
    const j = await r.json().catch(() => null);
    if (j?.ok) setConversations(j.items);
  }

  // 0) Load current user (Prisma user id) for message alignment
  useEffect(() => {
    (async () => {
      const r = await fetch("/api/me", { cache: "no-store" });
      const j = await r.json().catch(() => null);
      if (j?.ok) setMeId(j.id);
    })();
  }, []);

  // 1) Load conversations (left list)
  useEffect(() => {
    (async () => {
      await refreshConversations();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If conversations loaded and no active selected, set first
  useEffect(() => {
    if (activeId) return;

    if (qsChannelId && conversations.some((c) => c.id === qsChannelId)) {
      setActiveId(qsChannelId);
      return;
    }

    if (conversations[0]?.id) setActiveId(conversations[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, qsChannelId, activeId]);

  // ✅ POLLING (Quick Fix): refresh messages + left list without realtime
  function isNearBottom() {
    const el = bottomRef.current?.parentElement; // scroll container
    if (!el) return true;
    return el.scrollHeight - (el.scrollTop + el.clientHeight) < 20;
  }

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      const nav = performance.getEntriesByType("navigation")[0] as any;
      const isBackForward = nav?.type === "back_forward";

      if (e.persisted || isBackForward) {
        window.location.reload();
      }
    };

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  useEffect(() => {
    if (!activeId) return;

    const tick = async () => {
      const atBottom = isNearBottom();

      const r = await fetch(`/api/chat/messages?channelId=${activeId}&take=30`, {
        cache: "no-store",
      });
      const j = await r.json().catch(() => null);

      if (j?.ok) {
        const latest = (j.items as Msg[]).slice().reverse();
        setNextCursor(j.nextCursor ?? null);

        if (j.read) setReadInfo(j.read);

        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          const onlyNew = latest.filter((m) => !seen.has(m.id));
          return onlyNew.length ? [...prev, ...onlyNew] : prev;
        });

        // (kept your atBottom calc, but you removed autoscroll here — good)
        void atBottom;
      }

      fetch(`/api/chat/typing?channelId=${activeId}`, { cache: "no-store" })
        .then((rr) => rr.json())
        .then((tj) => {
          if (tj?.ok) setOtherTyping(!!tj.otherTyping);
        })
        .catch(() => {});

      await refreshConversations();
    };

    tick();
    const t = setInterval(tick, 1500);

    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  // 2) Load messages when a conversation selected (initial load + mark read)
  useEffect(() => {
    if (!activeId) return;

    (async () => {
      setLoadingMsgs(true);
      setMessages([]);
      setNextCursor(null);

      const r = await fetch(`/api/chat/messages?channelId=${activeId}&take=30`, {
        cache: "no-store",
      });
      const j = await r.json().catch(() => null);

      if (j?.ok) {
        const items = (j.items as Msg[]).slice().reverse();
        setMessages(items);
        setNextCursor(j.nextCursor ?? null);

        if (j.read) setReadInfo(j.read);

        await fetch("/api/chat/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelId: activeId }),
        }).catch(() => {});

        await refreshConversations();
        setTimeout(
          () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
          50
        );
      }

      setLoadingMsgs(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  async function loadOlder() {
    if (!activeId || !nextCursor) return;
    setLoadingMsgs(true);

    const r = await fetch(
      `/api/chat/messages?channelId=${activeId}&take=30&cursor=${nextCursor}`,
      { cache: "no-store" }
    );
    const j = await r.json().catch(() => null);

    if (j?.ok) {
      const older = (j.items as Msg[]).slice().reverse();
      setMessages((prev) => [...older, ...prev]);
      setNextCursor(j.nextCursor ?? null);
      if (j.read) setReadInfo(j.read);
    }

    setLoadingMsgs(false);
  }

  async function send() {
    if (!activeId) return;
    const t = text.trim();
    if (!t) return;

    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    pingTyping(false);

    setText("");

    const r = await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: activeId, text: t }),
    });
    const j = await r.json().catch(() => null);

    if (j?.ok) {
      setMessages((prev) => [...prev, j.message]);

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? { ...c, lastMessage: t, lastAt: new Date().toISOString() }
            : c
        )
      );

      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        30
      );
    }
  }

  const otherReadAtMs = readInfo
    ? new Date(readInfo.otherLastReadAt).getTime()
    : 0;

  const lastMyMsgId = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].senderId === meId) return messages[i].id;
    }
    return null;
  })();

  return (
    // ✅ Centered like dashboard + nicer spacing
    <div className="pt-6 pb-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">
            Messages
          </h1>
          <p className="text-sm text-[rgb(var(--muted))] max-w-2xl">
            Real-time messaging between students and tutors for session
            coordination, file sharing, and follow-up questions.
          </p>
        </header>

        {/* ✅ Taller main card like dashboard panels */}
        <section className="grid gap-4 lg:grid-cols-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.12)] min-h-[calc(100vh-260px)]">
          {/* Left: conversation list */}
          <div className="flex flex-col gap-3 border-b border-[rgb(var(--border))] pb-3 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4 min-h-0">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">
                Recent Conversations
              </h2>
              <span className="rounded-full bg-[rgb(var(--primary))/0.12] px-2 py-1 text-[0.65rem] font-medium text-[rgb(var(--primary))]">
                {conversations.length} active
              </span>
            </div>

            {/* ✅ NEW: Filter pills (All / Students / Tutors) */}
            <div className="flex items-center gap-2">
              {(["ALL", "STUDENT", "TUTOR"] as const).map((k) => {
                const isOn = roleFilter === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setRoleFilter(k)}
                    className={`rounded-full px-3 py-1 text-[0.65rem] font-semibold border transition
                      ${
                        isOn
                          ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))/0.10] text-[rgb(var(--primary))]"
                          : "border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))]"
                      }`}
                  >
                    {k === "ALL" ? "All" : k === "STUDENT" ? "Student" : "Tutor"}
                  </button>
                );
              })}
            </div>

            <div className="rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2 py-1">
              <input
                className="w-full bg-transparent px-1 py-1 text-xs text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted2))] focus:outline-none"
                placeholder="Search tutor or subject..."
              />
            </div>

            {/* ✅ Scroll inside (keeps card tall/clean) */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2 text-xs">
              {filteredConversations.map((conv) => {
                const isActive = conv.id === activeId;

                const roleLabel = conv.viewerIsStudent ? "Student" : "Tutor";
                const rolePill = conv.viewerIsStudent
                  ? "bg-violet-500/10 text-violet-600 dark:text-violet-300"
                  : "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300";

                const roleBorder = conv.viewerIsStudent
                  ? "border-l-violet-500/60"
                  : "border-l-fuchsia-500/60";

                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveId(conv.id)}
                    className={`cursor-pointer rounded-xl px-3 py-2 transition
                      hover:shadow-[0_10px_24px_rgba(0,0,0,0.08)]
                      border-l-4 ${roleBorder}
                      ${
                        isActive
                          ? "border border-[rgb(var(--primary))] bg-[rgb(var(--primary))/0.06]"
                          : "border border-[rgb(var(--border))] bg-[rgb(var(--card2))]"
                      }
                    `}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[0.75rem] font-semibold text-[rgb(var(--fg))]">
                        {conv.subjectName}
                      </p>

                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold ${rolePill}`}
                      >
                        {roleLabel}
                      </span>
                    </div>

                    <p className="mt-1 line-clamp-1 text-[0.7rem] text-[rgb(var(--muted))]">
                      {conv.lastMessage}
                    </p>

                    <div className="mt-1 flex items-center justify-between gap-2 text-[0.65rem]">
                      <span className="text-[rgb(var(--muted2))]">
                        {timeAgo(conv.lastAt)}
                      </span>

                      {conv.unread > 0 && (
                        <span className="rounded-full bg-[rgb(var(--primary))] text-[0.6rem] font-semibold text-white px-2 py-0.5">
                          {conv.unread} new
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredConversations.length === 0 && (
                <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-3 text-[rgb(var(--muted))]">
                  No chats in this filter.
                </div>
              )}
            </div>
          </div>

          {/* Right: chat window */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
            <div className="flex items-center justify-between gap-2 border-b border-[rgb(var(--border))] pb-3">
              <div>
                <p className="text-sm font-semibold text-[rgb(var(--fg))]">
                  {active
                    ? `Chat — ${active.subjectName}`
                    : "Select a conversation"}
                </p>

                {active && (
                  <p className="text-[0.7rem] text-[rgb(var(--muted))]">
                    with {active.name}
                  </p>
                )}
              </div>

              {active && (
                <a
                  href={`/sessions/${active.sessionId}`}
                  className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-1 text-[0.7rem] text-[rgb(var(--fg))] hover:ring-1 hover:ring-[rgb(var(--primary))/0.35]"
                >
                  View session details
                </a>
              )}
            </div>

            {/* ✅ This is now the big/tall scroll area */}
            <div className="mt-3 flex-1 min-h-0 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-3 text-xs overflow-y-auto">
              {nextCursor && (
                <button
                  onClick={loadOlder}
                  disabled={loadingMsgs}
                  className="mx-auto mb-3 block rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 text-[0.7rem] text-[rgb(var(--fg))] hover:ring-1 hover:ring-[rgb(var(--primary))/0.35] disabled:opacity-60"
                >
                  {loadingMsgs ? "Loading..." : "Load older messages"}
                </button>
              )}

              {messages.map((msg) => {
                const isMe = msg.senderId === meId;

                const isLastMine = isMe && msg.id === lastMyMsgId;
                const isSeen =
                  isLastMine &&
                  new Date(msg.createdAt).getTime() <= otherReadAtMs;

                return (
                  <div
                    key={msg.id}
                    className={`mb-3 flex ${
                      isMe ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-3 py-2 ${
                        isMe
                          ? "bg-[rgb(var(--primary))] text-white"
                          : "bg-[rgb(var(--card))] text-[rgb(var(--fg))] border border-[rgb(var(--border))]"
                      }`}
                    >
                      <p>{msg.text}</p>

                      <p
                        className={`mt-1 flex items-center justify-between gap-2 text-[0.6rem] ${
                          isMe ? "text-white/80" : "text-[rgb(var(--muted2))]"
                        }`}
                      >
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>

                        {isLastMine && <span>{isSeen ? "Seen" : "Sent"}</span>}
                      </p>
                    </div>
                  </div>
                );
              })}

              {active && otherTyping && (
                <div className="mb-3 flex justify-start">
                  <div className="max-w-[70%] rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-[rgb(var(--fg))]">
                    <p className="text-[0.75rem] text-[rgb(var(--muted))] italic">
                      Typing…
                    </p>
                  </div>
                </div>
              )}

              {messages.length === 0 && active && !loadingMsgs && (
                <div className="text-[rgb(var(--muted))] text-[0.75rem]">
                  No messages yet. Say hi 👋
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button className="rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2 py-2 text-[0.7rem] text-[rgb(var(--fg))] hover:ring-1 hover:ring-[rgb(var(--primary))/0.35]">
                + Attach file
              </button>

              <input
                value={text}
                onChange={(e) => {
                  setText(e.target.value);

                  const now = Date.now();
                  if (now - lastTypingSentAt.current > 800) {
                    lastTypingSentAt.current = now;
                    pingTyping(true);
                  }

                  if (typingStopTimer.current)
                    clearTimeout(typingStopTimer.current);
                  typingStopTimer.current = setTimeout(() => {
                    pingTyping(false);
                  }, 1200);
                }}
                onKeyDown={(e) => e.key === "Enter" && send()}
                className="flex-1 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-xs text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted2))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))/0.55]"
                placeholder={
                  active ? "Type a message..." : "Select a conversation..."
                }
                disabled={!active}
              />

              <button
                onClick={send}
                disabled={!active}
                className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-[0.7rem] font-semibold text-white shadow-[0_10px_25px_rgba(124,58,237,0.35)] disabled:opacity-60"
              >
                Send
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
