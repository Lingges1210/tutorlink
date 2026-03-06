"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Conv = {
  id: string;
  sessionId: string;
  name: string;
  subjectName: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
  viewerIsStudent: boolean;
  tutorId?: string | null;
  otherUserId?: string | null;
  otherRoleLabel?: "Student" | "Tutor" | null;
};

type Attachment = {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  url: string | null;
  createdAt: string;
};

type Msg = {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
  isDeleted?: boolean;
  deletedAt?: string | null;
  attachments?: Attachment[];
};

type RoleFilter = "ALL" | "STUDENT" | "TUTOR";

type UploadPayload = {
  bucket: string;
  objectPath: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
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

export default function MessagingClient() {
  const [meId, setMeId] = useState<string | null>(null);

  const [conversations, setConversations] = useState<Conv[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  );

  const [messages, setMessages] = useState<Msg[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const sp = useSearchParams();
  const qsChannelId = sp.get("channelId");

  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");

  const filteredConversations = useMemo(() => {
    const needle = q.trim().toLowerCase();

    return conversations.filter((c) => {
      if (roleFilter === "STUDENT" && !c.viewerIsStudent) return false;
      if (roleFilter === "TUTOR" && c.viewerIsStudent) return false;

      if (!needle) return true;

      const hay = [c.subjectName ?? "", c.name ?? "", c.lastMessage ?? ""]
        .join(" ")
        .toLowerCase();

      return hay.includes(needle);
    });
  }, [conversations, q, roleFilter]);

  const [readInfo, setReadInfo] = useState<{
    meLastReadAt: string;
    otherLastReadAt: string;
  } | null>(null);

  const [otherTyping, setOtherTyping] = useState(false);
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentAt = useRef(0);

  const [chatMeta, setChatMeta] = useState<{
    isChatClosed: boolean;
    chatCloseAt: string | null;
  }>({ isChatClosed: false, chatCloseAt: null });

  const [userPresence, setUserPresence] = useState<{
  isOnline: boolean;
  lastSeenAt: string | null;
} | null>(null);

  const [sendErr, setSendErr] = useState<string | null>(null);

  const [pickedFiles, setPickedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const [imgViewer, setImgViewer] = useState<{
    open: boolean;
    urls: string[];
    idx: number;
  }>({ open: false, urls: [], idx: 0 });

  const [imgViewerMounted, setImgViewerMounted] = useState(false);

  const allImageUrls = useMemo(() => {
    const urls: string[] = [];
    for (const m of messages) {
      for (const a of m.attachments ?? []) {
        if (a?.url && (a.contentType ?? "").startsWith("image/")) urls.push(a.url);
      }
    }
    return Array.from(new Set(urls));
  }, [messages]);

  function prettyNameFromUrl(u: string) {
    try {
      const p = new URL(u).pathname.split("/").pop() || "image";
      return decodeURIComponent(p);
    } catch {
      const parts = u.split("/").pop() || "image";
      return decodeURIComponent(parts.split("?")[0]);
    }
  }

  function openImageInChat(url: string) {
    const urls = allImageUrls.length ? allImageUrls : [url];
    const idx = Math.max(0, urls.indexOf(url));
    setImgViewer({ open: true, urls, idx: idx >= 0 ? idx : 0 });
  }

  function closeImageViewer() {
    setImgViewer((p) => ({ ...p, open: false }));
    setImgViewerMounted(false);
  }

  function formatLastSeen(iso: string | null) {
  if (!iso) return "Offline";

  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 1) return "Last seen just now";
  if (mins < 60) return `Last seen ${mins} min ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Last seen ${hrs} hr ago`;

  const days = Math.floor(hrs / 24);
  return `Last seen ${days} day${days > 1 ? "s" : ""} ago`;
}

  function nextImage() {
    setImgViewer((p) => {
      if (!p.urls.length) return p;
      return { ...p, idx: (p.idx + 1) % p.urls.length };
    });
  }

  function prevImage() {
    setImgViewer((p) => {
      if (!p.urls.length) return p;
      return { ...p, idx: (p.idx - 1 + p.urls.length) % p.urls.length };
    });
  }

  useEffect(() => {
    if (!imgViewer.open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeImageViewer();
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
    };

    window.addEventListener("keydown", onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const t = window.setTimeout(() => setImgViewerMounted(true), 10);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [imgViewer.open]);

  useEffect(() => {
  if (!active?.otherUserId) {
    setUserPresence(null);
    return;
  }

  const otherUserId = active.otherUserId;
  let stop = false;

  async function loadPresence() {
    const j = await fetch(`/api/presence/${otherUserId}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .catch(() => null);

    if (stop || !j?.ok) return;

    setUserPresence({
      isOnline: !!j.presence?.isOnline,
      lastSeenAt: j.presence?.lastSeenAt ?? null,
    });
  }

  loadPresence();
  const t = setInterval(loadPresence, 30000);

  return () => {
    stop = true;
    clearInterval(t);
  };
}, [active?.otherUserId]);

  async function pingTyping(isTyping: boolean) {
    if (!activeId || !meId) return;

    await fetch("/api/chat/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelId: activeId,
        isTyping,
      }),
    }).catch(() => {});
  }

  function validateFile(file: File) {
    const okType = file.type.startsWith("image/") || file.type === "application/pdf";
    if (!okType) return "Only images or PDFs allowed";

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) return "File too large (max 10MB)";

    return null;
  }

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    for (const f of files) {
      const err = validateFile(f);
      if (err) {
        alert(err);
        e.target.value = "";
        return;
      }
    }

    setPickedFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  }

  function removePickedFile(idx: number) {
    setPickedFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function forceDownload(url: string, filename: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Download failed");

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || "download";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(blobUrl);
  }

  async function uploadAttachment(channelId: string, file: File): Promise<UploadPayload> {
    const sign = await fetch("/api/chat/attachments/sign-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelId,
        fileName: file.name,
        contentType: file.type,
      }),
    }).then((r) => r.json());

    if (!sign?.ok) throw new Error(sign?.message ?? "Sign upload failed");

    const put = await fetch(sign.signedUrl as string, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
        "x-upsert": "false",
      },
      body: file,
    });

    if (!put.ok) throw new Error("Upload failed");

    return {
      bucket: sign.bucket as string,
      objectPath: sign.objectPath as string,
      fileName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    };
  }

  async function deleteMessage(messageId: string) {
    const r = await fetch(`/api/chat/messages/${messageId}`, {
      method: "DELETE",
    });
    const j = await r.json().catch(() => null);

    if (j?.ok) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                isDeleted: true,
                text: "",
                deletedAt: j.message?.deletedAt ?? null,
              }
            : m
        )
      );
    }
  }

  function mergeMessages(incoming: Msg[]) {
    setMessages((prev) => {
      const map = new Map(prev.map((m) => [m.id, m]));
      for (const m of incoming) {
        map.set(m.id, { ...(map.get(m.id) ?? {}), ...m });
      }

      const arr = Array.from(map.values());
      arr.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      return arr;
    });
  }

  async function markChatRead(channelId: string) {
    await fetch("/api/chat/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId }),
    }).catch(() => {});

    setConversations((prev) =>
      prev.map((c) => (c.id === channelId ? { ...c, unread: 0 } : c))
    );

    window.dispatchEvent(new Event("chat:unread-refresh"));
  }

  async function refreshConversations(openChannelId?: string | null) {
    const r = await fetch("/api/chat/channels", { cache: "no-store" });
    const j = await r.json().catch(() => null);

    if (!j?.ok) return;

    const sorted = [...j.items]
      .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())
      .map((c) =>
        openChannelId && c.id === openChannelId ? { ...c, unread: 0 } : c
      );

    setConversations(sorted);
  }

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/me", { cache: "no-store" });
      const j = await r.json().catch(() => null);
      if (j?.ok) setMeId(j.id);
    })();
  }, []);

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [imgViewer.idx]);

  useEffect(() => {
    (async () => {
      await refreshConversations();
    })();
  }, []);

  useEffect(() => {
    if (activeId) return;

    if (qsChannelId && conversations.some((c) => c.id === qsChannelId)) {
      setActiveId(qsChannelId);
      return;
    }

    if (conversations[0]?.id) setActiveId(conversations[0].id);
  }, [conversations, qsChannelId, activeId]);

  useEffect(() => {
    if (!activeId) return;

    const stillExists = conversations.some((c) => c.id === activeId);
    if (stillExists) return;

    const next = conversations[0]?.id ?? null;
    setActiveId(next);

    setMessages([]);
    setNextCursor(null);
    setReadInfo(null);
    setChatMeta({ isChatClosed: true, chatCloseAt: null });
    setSendErr("This chat is no longer available (session cancelled/closed).");
  }, [conversations, activeId]);

  function timeLeft(iso: string) {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return "Closed";
    const mins = Math.ceil(ms / 60000);
    if (mins < 60) return `${mins} min left`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem ? `${hrs} hr ${rem} min left` : `${hrs} hr left`;
  }

  function closeUrgency(iso: string | null) {
    if (!iso) return "none";
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return "closed";
    if (ms <= 2 * 60 * 1000) return "danger";
    if (ms <= 10 * 60 * 1000) return "warn";
    return "ok";
  }

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      const nav = performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined;
      const isBackForward = nav?.type === "back_forward";

      if (e.persisted || isBackForward) {
        window.location.reload();
      }
    };

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  // Initial load for currently opened chat
  useEffect(() => {
    if (!activeId || !meId) return;

    const channelId = activeId;
    let cancelled = false;

    async function loadInitialMessages() {
      setLoadingMsgs(true);

      const j = await fetch(`/api/chat/messages?channelId=${channelId}&take=30`, {
        cache: "no-store",
      })
        .then((r) => r.json())
        .catch(() => null);

      if (cancelled || !j?.ok) {
        setLoadingMsgs(false);
        return;
      }

      const items = (j.items as Msg[]).slice().reverse();
      setMessages(items);
      setNextCursor(j.nextCursor ?? null);

      if (j.read) setReadInfo(j.read);

      if (typeof j.isChatClosed === "boolean") {
        setChatMeta({
          isChatClosed: !!j.isChatClosed,
          chatCloseAt: j.chatCloseAt ?? null,
        });
      }

      setLoadingMsgs(false);

      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
      }, 30);

      await markChatRead(channelId);
      await refreshConversations(channelId);
    }

    loadInitialMessages();

    return () => {
      cancelled = true;
    };
  }, [activeId, meId]);

  // Realtime messages
  useEffect(() => {
  if (!activeId || !meId) return;

  const channelId = activeId;
  const supabase = supabaseBrowser;

  const channel = supabase
    .channel(`chat-messages-${channelId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "ChatMessage",
      },
      async (payload: { new: Record<string, unknown> }) => {
        console.log("realtime message payload", payload);

        const row = payload.new as {
          id: string;
          channelId: string;
          senderId: string;
          text: string;
          createdAt: string;
          isDeleted?: boolean;
          deletedAt?: string | null;
        };

        if (row.channelId !== channelId) return;

        let alreadyExists = false;

        setMessages((prev) => {
          alreadyExists = prev.some((m) => m.id === row.id);
          return prev;
        });

        if (alreadyExists) return;

        const j = await fetch(`/api/chat/messages?channelId=${channelId}&take=30`, {
          cache: "no-store",
        })
          .then((r) => r.json())
          .catch(() => null);

        if (!j?.ok) return;

        const items = (j.items as Msg[]).slice().reverse();
        mergeMessages(items);
        setNextCursor(j.nextCursor ?? null);

        if (j.read) setReadInfo(j.read);

        if (typeof j.isChatClosed === "boolean") {
          setChatMeta({
            isChatClosed: !!j.isChatClosed,
            chatCloseAt: j.chatCloseAt ?? null,
          });
        }

        if (row.senderId !== meId) {
          await markChatRead(channelId);
        }

        await refreshConversations(channelId);

        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 30);
      }
    )
    .subscribe((status: string) => {
      console.log("chat realtime status", channelId, status);
    });

  return () => {
    supabase.removeChannel(channel);
  };
}, [activeId, meId]);


useEffect(() => {
  if (!activeId || !meId) return;

  const channelId = activeId;
  let stop = false;

  async function pollMessages() {
    if (stop) return;

    const j = await fetch(`/api/chat/messages?channelId=${channelId}&take=30`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .catch(() => null);

    if (stop || !j?.ok) return;

    const items = (j.items as Msg[]).slice().reverse();
    mergeMessages(items);
    setNextCursor(j.nextCursor ?? null);

    if (j.read) setReadInfo(j.read);

    if (typeof j.isChatClosed === "boolean") {
      setChatMeta({
        isChatClosed: !!j.isChatClosed,
        chatCloseAt: j.chatCloseAt ?? null,
      });
    }
  }

  pollMessages();
  const t = setInterval(pollMessages, 1500);

  return () => {
    stop = true;
    clearInterval(t);
  };
}, [activeId, meId]);


  // Polling for left list + typing only
  useEffect(() => {
    if (!activeId || !meId) return;

    const channelId = activeId;
    let stop = false;

    async function pollConversations() {
      if (stop) return;
      await refreshConversations(channelId).catch(() => {});
    }

    async function pollTyping() {
      if (stop) return;

      const j = await fetch(`/api/chat/typing?channelId=${channelId}`, {
        cache: "no-store",
      })
        .then((r) => r.json())
        .catch(() => null);

      if (stop || !j?.ok) return;
      setOtherTyping(!!j.otherTyping);
    }

    pollConversations();
    pollTyping();

    const convT = setInterval(pollConversations, 4500);
    const typT = setInterval(pollTyping, 1200);

    const onVis = () => {
      if (document.visibilityState === "visible") {
        pollConversations();
        pollTyping();
      }
    };

    document.addEventListener("visibilitychange", onVis);

    return () => {
      stop = true;
      clearInterval(convT);
      clearInterval(typT);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [activeId, meId]);

  const [ctx, setCtx] = useState<{
    open: boolean;
    x: number;
    y: number;
    messageId: string | null;
  }>({ open: false, x: 0, y: 0, messageId: null });

  useEffect(() => {
    const close = () => setCtx((p) => ({ ...p, open: false, messageId: null }));
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);

    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, []);

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
      setMessages((prev) => {
        const map = new Map(prev.map((m) => [m.id, m]));
        for (const m of older) {
          map.set(m.id, { ...(map.get(m.id) ?? {}), ...m });
        }
        const arr = Array.from(map.values());
        arr.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        return arr;
      });

      setNextCursor(j.nextCursor ?? null);
      if (j.read) setReadInfo(j.read);

      if (typeof j.isChatClosed === "boolean") {
        setChatMeta({
          isChatClosed: !!j.isChatClosed,
          chatCloseAt: j.chatCloseAt ?? null,
        });
      }
    }

    setLoadingMsgs(false);
  }

  async function refetchLatest(channelId: string) {
    const r = await fetch(`/api/chat/messages?channelId=${channelId}&take=30`, {
      cache: "no-store",
    });
    const j = await r.json().catch(() => null);

    if (!j?.ok) return;

    const items = (j.items as Msg[]).slice().reverse();
    mergeMessages(items);
    setNextCursor(j.nextCursor ?? null);

    if (j.read) setReadInfo(j.read);

    if (typeof j.isChatClosed === "boolean") {
      setChatMeta({
        isChatClosed: !!j.isChatClosed,
        chatCloseAt: j.chatCloseAt ?? null,
      });
    }

    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 30);
  }

  async function send() {
    if (!activeId) return;

    if (chatMeta.isChatClosed) {
      setSendErr("Chat is closed.");
      return;
    }

    const t = text.trim();
    if (!t && pickedFiles.length === 0) return;

    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    void pingTyping(false);

    setText("");
    setSendErr(null);
    setUploading(true);

    try {
      const uploaded: UploadPayload[] = [];
      for (const f of pickedFiles) {
        uploaded.push(await uploadAttachment(activeId, f));
      }

      const r = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: activeId,
          text: t,
          attachments: uploaded,
        }),
      });

      const j = await r.json().catch(() => null);

      if (!r.ok) {
        setSendErr(j?.message ?? "Failed to send");

        if (r.status === 403 && (j?.message?.toLowerCase?.() ?? "").includes("closed")) {
          setChatMeta((p) => ({ ...p, isChatClosed: true }));
        }

        setText(t);
        return;
      }

      if (j?.ok) {
        if (j.message) {
          const created = j.message as Msg;
          mergeMessages([created]);

          setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 30);
        }

        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeId
              ? {
                  ...c,
                  unread: 0,
                  lastMessage: t || (pickedFiles.length ? "📎 Attachment" : ""),
                  lastAt: new Date().toISOString(),
                }
              : c
          )
        );

        setPickedFiles([]);

        await markChatRead(activeId);
        await refreshConversations(activeId);
        await refetchLatest(activeId);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to send";
      setSendErr(message);
      setText(t);
    } finally {
      setUploading(false);
    }
  }

  const otherReadAtMs = readInfo ? new Date(readInfo.otherLastReadAt).getTime() : 0;

  const lastMyMsgId = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].senderId === meId) return messages[i].id;
    }
    return null;
  })();

  const filterBtn = (key: RoleFilter, label: string) => {
    const activeBtn = roleFilter === key;
    return (
      <button
        type="button"
        onClick={() => setRoleFilter(key)}
        className={`rounded-full px-3 py-1 text-[0.7rem] font-semibold transition ${
          activeBtn
            ? "border border-[rgb(var(--primary))] bg-[rgb(var(--primary))/0.10] text-[rgb(var(--primary))]"
            : "border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--muted))] hover:bg-[rgb(var(--card))]"
        }`}
      >
        {label}
      </button>
    );
  };

  const inputDisabled = !active || chatMeta.isChatClosed || uploading;

  return (
    <div className="pt-12 pb-10">
      <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">Messages</h1>
          <p className="max-w-2xl text-sm text-[rgb(var(--muted))]">
            Real-time messaging between students and tutors for session coordination,
            file sharing, and follow-up questions.
          </p>
        </header>

        <section className="grid h-[calc(100vh-260px)] gap-4 overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.12)] lg:grid-cols-3">
          <div className="flex min-h-0 flex-col gap-3 overflow-hidden border-b border-[rgb(var(--border))] pb-3 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">
                Recent Conversations
              </h2>
              <span className="rounded-full bg-[rgb(var(--primary))/0.12] px-2 py-1 text-[0.65rem] font-medium text-[rgb(var(--primary))]">
                {filteredConversations.length} active
              </span>
            </div>

            <div className="flex items-center gap-2">
              {filterBtn("ALL", "All")}
              {filterBtn("STUDENT", "Student")}
              {filterBtn("TUTOR", "Tutor")}
            </div>

            <div className="rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2 py-1">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full bg-transparent px-1 py-1 text-xs text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted2))] focus:outline-none"
                placeholder="Search subject, name, message..."
              />
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto pr-1 text-xs">
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
                    className={`cursor-pointer rounded-xl px-3 py-2 transition hover:shadow-[0_10px_24px_rgba(0,0,0,0.08)] border-l-4 ${roleBorder} ${
                      isActive
                        ? "border border-[rgb(var(--primary))] bg-[rgb(var(--primary))/0.06]"
                        : "border border-[rgb(var(--border))] bg-[rgb(var(--card2))]"
                    }`}
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
                        <span className="rounded-full bg-[rgb(var(--primary))] px-2 py-0.5 text-[0.6rem] font-semibold text-white">
                          {conv.unread} new
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredConversations.length === 0 && (
                <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-3 text-[rgb(var(--muted))]">
                  No chats match your filter/search.
                </div>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden lg:col-span-2">
            <div className="flex items-center justify-between gap-2 border-b border-[rgb(var(--border))] pb-3">
              <div>
                <p className="text-sm font-semibold text-[rgb(var(--fg))]">
                  {active ? `Chat — ${active.subjectName}` : "Select a conversation"}
                </p>

                {active && (
  <div className="mt-1 flex items-center gap-2">
    <p className="text-[0.7rem] text-[rgb(var(--muted))]">
      with {active.name}
    </p>

    {active.otherUserId && (
      <>
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${
            userPresence?.isOnline ? "bg-emerald-500" : "bg-gray-400"
          }`}
          title={userPresence?.isOnline ? "online" : "offline"}
        />
        <span
          className={`text-[0.68rem] font-medium ${
            userPresence?.isOnline
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-[rgb(var(--muted2))]"
          }`}
        >
          {userPresence?.isOnline
            ? "Online"
            : formatLastSeen(userPresence?.lastSeenAt ?? null)}
        </span>
      </>
    )}
  </div>
)}

                {active && chatMeta.chatCloseAt && !chatMeta.isChatClosed && (
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${
                        closeUrgency(chatMeta.chatCloseAt) === "danger"
                          ? "border-red-500/40 bg-red-500/10 text-red-600"
                          : closeUrgency(chatMeta.chatCloseAt) === "warn"
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-700"
                          : "border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--muted))]"
                      }`}
                    >
                      {closeUrgency(chatMeta.chatCloseAt) === "danger"
                        ? `Closing soon • ${timeLeft(chatMeta.chatCloseAt)}`
                        : `Open • ${timeLeft(chatMeta.chatCloseAt)}`}
                    </span>

                    <span className="text-[0.7rem] text-[rgb(var(--muted2))]">
                      Chat stays open for 8 hours after completion
                    </span>
                  </div>
                )}

                {active && chatMeta.isChatClosed && (
                  <p className="text-[0.7rem] text-[rgb(var(--muted2))]">
                    Chat closed (8-hour window ended)
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

            {active && chatMeta.isChatClosed && (
              <div className="mt-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-[0.75rem] text-[rgb(var(--muted))]">
                Chat is closed.
                {chatMeta.chatCloseAt ? (
                  <>
                    {" "}
                    (Closed after{" "}
                    {new Date(chatMeta.chatCloseAt).toLocaleString([], {
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    )
                  </>
                ) : null}
              </div>
            )}

            <div className="mt-3 flex-1 overflow-y-auto rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-3 text-xs">
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
                  isLastMine && new Date(msg.createdAt).getTime() <= otherReadAtMs;

                return (
                  <div
                    key={msg.id}
                    className={`mb-3 flex ${isMe ? "justify-end" : "justify-start"}`}
                    onContextMenu={(e) => {
                      if (!isMe || msg.isDeleted) return;
                      e.preventDefault();
                      setCtx({
                        open: true,
                        x: e.clientX,
                        y: e.clientY,
                        messageId: msg.id,
                      });
                    }}
                  >
                    <div
                      className={`group relative max-w-[70%] rounded-2xl px-3 py-2 ${
                        isMe
                          ? "bg-[rgb(var(--primary))] text-white"
                          : "border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))]"
                      }`}
                    >
                      {msg.isDeleted ? (
                        <p className="italic opacity-80">This message was deleted</p>
                      ) : (
                        <>
                          {msg.text ? <p>{msg.text}</p> : null}

                          {msg.attachments?.map((a) => {
                            const isImg = a.contentType?.startsWith("image/");
                            const isPdf = a.contentType === "application/pdf";

                            const kb = Math.max(1, Math.round((a.sizeBytes ?? 0) / 1024));
                            const sizeLabel =
                              kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;

                            const cardShell = isMe
                              ? "bg-white/10 border-white/15"
                              : "bg-black/5 border-black/10 dark:bg-white/5 dark:border-white/10";

                            const subText = isMe ? "text-white/70" : "text-[rgb(var(--muted2))]";
                            const titleText = isMe ? "text-white" : "text-[rgb(var(--fg))]";

                            const iconBtn = isMe
                              ? "bg-white/15 text-white hover:bg-white/20 border-white/15"
                              : "bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card2))] border-[rgb(var(--border))]";

                            const rowDivider = isMe ? "border-white/10" : "border-[rgb(var(--border))]";

                            const IconOpen = () => (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-90">
                                <path d="M14 5h5v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M10 14L19 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M19 14v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            );

                            const IconDownload = () => (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-90">
                                <path d="M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M5 21h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                              </svg>
                            );

                            const IconPdf = () => (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-95">
                                <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                <path d="M14 2v5h5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                              </svg>
                            );

                            if (isImg) {
                              return (
                                <div key={a.id} className="mt-2">
                                  {a.url ? (
                                    <div className={`relative overflow-hidden rounded-xl border ${cardShell} shadow-[0_10px_22px_rgba(0,0,0,0.10)]`}>
                                      <button
                                        type="button"
                                        onClick={() => openImageInChat(a.url!)}
                                        className="block w-full"
                                        title="Open image"
                                      >
                                        <img
                                          src={a.url}
                                          alt={a.fileName}
                                          className="block h-auto w-full max-w-[360px]"
                                        />
                                      </button>

                                      <div className={`flex items-center justify-between gap-2 border-t px-2.5 py-2 ${rowDivider}`}>
                                        <span className={`truncate text-[0.68rem] ${subText}`} title={a.fileName}>
                                          {a.fileName}
                                        </span>

                                        <div className="flex shrink-0 items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => openImageInChat(a.url!)}
                                            className={`inline-flex items-center justify-center rounded-full border px-2.5 py-1 transition ${iconBtn}`}
                                            title="Open"
                                          >
                                            <IconOpen />
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => forceDownload(a.url!, a.fileName)}
                                            className={`inline-flex items-center justify-center rounded-full border px-2.5 py-1 transition ${
                                              isMe
                                                ? "border-white/30 bg-white text-black hover:bg-white/90"
                                                : "border-transparent bg-[rgb(var(--primary))] text-white hover:opacity-95"
                                            }`}
                                            title="Download"
                                          >
                                            <IconDownload />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-[0.7rem] opacity-70">Image unavailable</div>
                                  )}
                                </div>
                              );
                            }

                            if (isPdf) {
                              return (
                                <div key={a.id} className="mt-2">
                                  <div className={`overflow-hidden rounded-xl border ${cardShell} shadow-[0_10px_22px_rgba(0,0,0,0.10)]`}>
                                    <div className="flex items-center gap-3 px-3 py-3">
                                      <div
                                        className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                                          isMe
                                            ? "border-white/15 bg-white/10 text-white"
                                            : "border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--fg))]"
                                        }`}
                                        aria-hidden
                                      >
                                        <IconPdf />
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <div className={`truncate text-[0.78rem] font-semibold ${titleText}`}>
                                          {a.fileName}
                                        </div>
                                        <div className={`text-[0.65rem] ${subText}`}>
                                          Document • {sizeLabel}
                                        </div>
                                      </div>

                                      <div className="flex shrink-0 items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => a.url && window.open(a.url, "_blank")}
                                          disabled={!a.url}
                                          className={`inline-flex items-center justify-center rounded-full border px-2.5 py-1 transition disabled:opacity-50 ${iconBtn}`}
                                          title="Open"
                                        >
                                          <IconOpen />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => a.url && forceDownload(a.url, a.fileName)}
                                          disabled={!a.url}
                                          className={`inline-flex items-center justify-center rounded-full border px-2.5 py-1 transition disabled:opacity-50 ${
                                            isMe
                                              ? "border-white/30 bg-white text-black hover:bg-white/90"
                                              : "border-transparent bg-[rgb(var(--primary))] text-white hover:opacity-95"
                                          }`}
                                          title="Download"
                                        >
                                          <IconDownload />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            return null;
                          })}
                        </>
                      )}

                      <div
                        className={`mt-1 flex items-center justify-between gap-2 text-[0.6rem] ${
                          isMe ? "text-white/80" : "text-[rgb(var(--muted2))]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>

                          {isLastMine && <span>{isSeen ? "Seen" : "Sent"}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {active && otherTyping && (
                <div className="mb-3 flex justify-start">
                  <div className="max-w-[70%] rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-[rgb(var(--fg))]">
                    <p className="text-[0.75rem] italic text-[rgb(var(--muted))]">Typing…</p>
                  </div>
                </div>
              )}

              {messages.length === 0 && active && !loadingMsgs && (
                <div className="text-[0.75rem] text-[rgb(var(--muted))]">
                  No messages yet. Say hi 👋
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {ctx.open && ctx.messageId && (
              <div
                style={{ left: ctx.x, top: ctx.y }}
                className="fixed z-50 min-w-[140px] rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-1 shadow-[0_18px_40px_rgba(0,0,0,0.18)]"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="w-full rounded-lg px-3 py-2 text-left text-xs text-[rgb(var(--fg))] hover:bg-[rgb(var(--card2))]"
                  onClick={() => {
                    deleteMessage(ctx.messageId!);
                    setCtx((p) => ({ ...p, open: false, messageId: null }));
                  }}
                >
                  Delete message
                </button>
              </div>
            )}

            {active && sendErr && (
              <div className="mt-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-[0.75rem] text-[rgb(var(--muted))]">
                {sendErr}
              </div>
            )}

            {active && pickedFiles.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {pickedFiles.map((f, idx) => (
                  <div
                    key={`${f.name}-${idx}`}
                    className="flex items-center gap-2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-1 text-[0.7rem] text-[rgb(var(--fg))]"
                  >
                    <span className="max-w-[240px] truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => removePickedFile(idx)}
                      className="opacity-70 hover:opacity-100"
                      disabled={uploading}
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="hidden"
              onChange={onPickFiles}
            />

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                disabled={!active || chatMeta.isChatClosed || uploading}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2 py-2 text-[0.7rem] text-[rgb(var(--fg))] hover:ring-1 hover:ring-[rgb(var(--primary))/0.35] disabled:opacity-60"
              >
                {uploading ? "Uploading..." : "+ Attach file"}
              </button>

              <input
                value={text}
                onChange={(e) => {
                  setText(e.target.value);

                  const now = Date.now();
                  if (now - lastTypingSentAt.current > 800) {
                    lastTypingSentAt.current = now;
                    void pingTyping(true);
                  }

                  if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
                  typingStopTimer.current = setTimeout(() => {
                    void pingTyping(false);
                  }, 1200);
                }}
                onKeyDown={(e) => e.key === "Enter" && send()}
                className="flex-1 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-xs text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted2))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))/0.55]"
                placeholder={
                  !active
                    ? "Select a conversation..."
                    : chatMeta.isChatClosed
                    ? "Chat is closed"
                    : uploading
                    ? "Sending..."
                    : "Type a message..."
                }
                disabled={inputDisabled}
              />

              <button
                onClick={send}
                disabled={inputDisabled}
                className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-[0.7rem] font-semibold text-white shadow-[0_10px_25px_rgba(124,58,237,0.35)] disabled:opacity-60"
              >
                Send
              </button>
            </div>
          </div>
        </section>

        {imgViewer.open && (
          <div
            className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-[3px]"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeImageViewer();
            }}
          >
            <div className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-4 py-3 pointer-events-auto">
              <div className="text-xs text-white/80">
                {imgViewer.urls.length > 0
                  ? `${imgViewer.idx + 1} / ${imgViewer.urls.length}`
                  : ""}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const url = imgViewer.urls[imgViewer.idx];
                    if (!url) return;
                    forceDownload(url, prettyNameFromUrl(url));
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs text-white transition hover:bg-white/20"
                >
                  Download
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeImageViewer();
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                >
                  ✕
                </button>
              </div>
            </div>

            {imgViewer.urls.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                  className="absolute left-3 top-1/2 z-30 h-10 w-10 -translate-y-1/2 rounded-full bg-white/10 text-lg text-white transition hover:bg-white/20 pointer-events-auto"
                >
                  ‹
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                  className="absolute right-3 top-1/2 z-30 h-10 w-10 -translate-y-1/2 rounded-full bg-white/10 text-lg text-white transition hover:bg-white/20 pointer-events-auto"
                >
                  ›
                </button>
              </>
            )}

            <div className="absolute inset-0 z-10 flex items-center justify-center p-6 pb-24 pointer-events-none">
              <img
                src={imgViewer.urls[imgViewer.idx] ?? ""}
                alt="Preview"
                draggable={false}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (zoom > 1) {
                    setZoom(1);
                    setOffset({ x: 0, y: 0 });
                  } else {
                    setZoom(2);
                  }
                }}
                onWheel={(e) => {
                  e.preventDefault();
                  const delta = e.deltaY > 0 ? -0.2 : 0.2;
                  setZoom((z) => Math.min(Math.max(1, z + delta), 4));
                }}
                onMouseDown={(e) => {
                  if (zoom <= 1) return;
                  setDragging(true);
                  dragStart.current = {
                    x: e.clientX - offset.x,
                    y: e.clientY - offset.y,
                  };
                }}
                onMouseMove={(e) => {
                  if (!dragging) return;
                  setOffset({
                    x: e.clientX - dragStart.current.x,
                    y: e.clientY - dragStart.current.y,
                  });
                }}
                onMouseUp={() => setDragging(false)}
                onMouseLeave={() => setDragging(false)}
                className="pointer-events-auto max-h-[82vh] max-w-[92vw] select-none rounded-xl shadow-2xl transition-transform duration-100 ease-out"
                style={{
                  transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
                  cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "zoom-in",
                }}
              />
            </div>

            {imgViewer.urls.length > 1 && (
              <div
                className="absolute bottom-4 left-0 right-0 z-30 px-4 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mx-auto max-w-4xl rounded-xl border border-white/10 bg-black/60 px-3 py-2 backdrop-blur">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {imgViewer.urls.map((u, i) => {
                      const activeThumb = i === imgViewer.idx;
                      return (
                        <button
                          key={`${u}-${i}`}
                          type="button"
                          onClick={() => setImgViewer((p) => ({ ...p, idx: i }))}
                          className={`relative shrink-0 overflow-hidden rounded-lg border transition ${
                            activeThumb
                              ? "border-white ring-2 ring-white/30"
                              : "border-white/20 hover:border-white/40"
                          }`}
                        >
                          <img
                            src={u}
                            alt={`thumb-${i}`}
                            className="h-14 w-20 object-cover"
                            draggable={false}
                          />
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[11px] text-white/70">
                    <span className="truncate">
                      {prettyNameFromUrl(imgViewer.urls[imgViewer.idx] ?? "")}
                    </span>
                    <span className="text-white/50">← / → • Esc</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}