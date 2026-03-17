"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import Image from "next/image";
import { useChatStore } from "@/store/chatStore";
import type { Conv, Msg } from "@/store/chatStore";

type RoleFilter = "ALL" | "STUDENT" | "TUTOR";

type UploadPayload = {
  bucket: string;
  objectPath: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
};

type Attachment = {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  url: string | null;
  createdAt: string;
};

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}

function sortMsgs(list: Msg[]) {
  return [...list].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export default function MessagingClient() {
  const [meId, setMeId] = useState<string | null>(null);

  // ── Zustand store ─────────────────────────────────────────────────────────
  const storeConversations = useChatStore((s) => s.conversations);
  const storeSetConversations = useChatStore((s) => s.setConversations);
  const storeSetMessages = useChatStore((s) => s.setMessages);
  const storeMergeMessages = useChatStore((s) => s.mergeMessages);
  const storeAppendMessage = useChatStore((s) => s.appendMessage);
  const storePatchMessage = useChatStore((s) => s.patchMessage);
  const storeReplaceMessage = useChatStore((s) => s.replaceMessage);
  const storeRemoveMessage = useChatStore((s) => s.removeMessage);
  const storeMessageCache = useChatStore((s) => s.messageCache);
  const storeCursorCache = useChatStore((s) => s.cursorCache);
  const storeSetCursor = useChatStore((s) => s.setCursor);
  const storeMarkRead = useChatStore((s) => s.markRead);
  const convLoaded = useChatStore((s) => s.convLoaded);
  const prefetch = useChatStore((s) => s.prefetch);

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const conversations = storeConversations;

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  );

  const messages = storeMessageCache[activeId ?? ""] ?? [];
  const nextCursor = storeCursorCache[activeId ?? ""] ?? null;

  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const showSkeleton = loadingMsgs && messages.length === 0;

  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const msgScrollRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const doScroll = () => {
      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior, block: "end" });
      } else if (msgScrollRef.current) {
        msgScrollRef.current.scrollTop = msgScrollRef.current.scrollHeight;
      }
    };
    requestAnimationFrame(() => {
      doScroll();
      requestAnimationFrame(doScroll);
    });
  }, []);

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
  const otherTypingExpiry = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [chatMeta, setChatMeta] = useState<{
    isChatClosed: boolean;
    chatCloseAt: string | null;
  }>({
    isChatClosed: false,
    chatCloseAt: null,
  });

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
  }>({
    open: false,
    urls: [],
    idx: 0,
  });

  const chatRoomRef = useRef<ReturnType<typeof supabaseBrowser.channel> | null>(null);
  const lastMarkedReadRef = useRef<Record<string, number>>({});

  const allImageUrls = useMemo(() => {
    const urls: string[] = [];
    for (const m of messages) {
      for (const a of (m.attachments ?? []) as Attachment[]) {
        if (a?.url && (a.contentType ?? "").startsWith("image/")) urls.push(a.url);
      }
    }
    return Array.from(new Set(urls));
  }, [messages]);

  const patchConversationPreview = useCallback(
    (channelId: string, payload: { text: string; createdAt: string; senderId: string }) => {
      storeSetConversations(
        useChatStore
          .getState()
          .conversations
          .map((c) =>
            c.id === channelId
              ? {
                  ...c,
                  lastMessage: payload.text?.trim() || "📎 Attachment",
                  lastAt: payload.createdAt,
                  unread:
                    payload.senderId === meId || c.id === activeIdRef.current ? 0 : c.unread + 1,
                }
              : c
          )
          .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())
      );
    },
    [meId, storeSetConversations]
  );

    const markChatRead = useCallback(async (channelId: string) => {
    const now = Date.now();
    const last = lastMarkedReadRef.current[channelId] ?? 0;
    if (now - last < 1500) return;

    lastMarkedReadRef.current[channelId] = now;

    await fetch("/api/chat/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId }),
    }).catch(() => {});

    storeMarkRead(channelId);
    window.dispatchEvent(new Event("chat:unread-refresh"));
  }, [storeMarkRead]);

    const refreshActiveMessages = useCallback(
    async (channelId: string, scroll: boolean = false) => {
      const j = await fetch(`/api/chat/messages?channelId=${channelId}&take=30`, {
        cache: "no-store",
      })
        .then((r) => r.json())
        .catch(() => null);

      if (!j?.ok) return;

      const msgs = sortMsgs((j.items as Msg[]).slice().reverse());
      storeSetMessages(channelId, msgs);
      storeSetCursor(channelId, j.nextCursor ?? null);

      if (j.read) setReadInfo(j.read);
      if (typeof j.isChatClosed === "boolean") {
        setChatMeta({
          isChatClosed: !!j.isChatClosed,
          chatCloseAt: j.chatCloseAt ?? null,
        });
      }

      if (scroll) {
        scrollToBottom("smooth");
      }
    },
    [scrollToBottom, storeSetCursor, storeSetMessages]
  );

  function prettyNameFromUrl(u: string) {
    try {
      return decodeURIComponent(new URL(u).pathname.split("/").pop() || "image");
    } catch {
      return decodeURIComponent((u.split("/").pop() || "image").split("?")[0]);
    }
  }

  function openImageInChat(url: string) {
    const urls = allImageUrls.length ? allImageUrls : [url];
    setImgViewer({ open: true, urls, idx: Math.max(0, urls.indexOf(url)) });
  }

  function closeImageViewer() {
    setImgViewer((p) => ({ ...p, open: false }));
  }

  function nextImage() {
    setImgViewer((p) =>
      !p.urls.length ? p : { ...p, idx: (p.idx + 1) % p.urls.length }
    );
  }

  function prevImage() {
    setImgViewer((p) =>
      !p.urls.length ? p : { ...p, idx: (p.idx - 1 + p.urls.length) % p.urls.length }
    );
  }

  function formatLastSeen(iso: string | null) {
    if (!iso) return "Offline";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  useEffect(() => {
    if (!imgViewer.open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeImageViewer();
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
    };
    window.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [imgViewer.open]);

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [imgViewer.idx]);

  useEffect(() => {
    if (!active?.otherUserId) {
      setUserPresence(null);
      return;
    }

    

    const otherUserId = active.otherUserId;
    let stop = false;

    async function loadPresence() {
      const j = await fetch(`/api/presence/${otherUserId}`, { cache: "no-store" })
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
    if (!activeId || !meId || !chatRoomRef.current) return;
    await chatRoomRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { channelId: activeId, userId: meId, isTyping },
    });
  }

    useEffect(() => {
    function onIncoming(ev: Event) {
      const custom = ev as CustomEvent<{ channelId: string; message: Msg }>;
      const data = custom.detail;
      if (!data) return;
      if (!activeIdRef.current) return;
      if (data.channelId !== activeIdRef.current) return;

      void refreshActiveMessages(data.channelId, true);

      if (data.message.senderId !== meId) {
        void markChatRead(data.channelId);
      }
    }

    window.addEventListener("chat:message-incoming", onIncoming as EventListener);
    return () => {
      window.removeEventListener("chat:message-incoming", onIncoming as EventListener);
    };
  }, [meId, markChatRead, refreshActiveMessages]);

  function validateFile(file: File) {
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      return "Only images or PDFs allowed";
    }
    if (file.size > 10 * 1024 * 1024) return "File too large (max 10MB)";
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
      bucket: sign.bucket,
      objectPath: sign.objectPath,
      fileName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    };
  }

  async function deleteMessage(messageId: string) {
    const r = await fetch(`/api/chat/messages/${messageId}`, { method: "DELETE" });
    const j = await r.json().catch(() => null);

    if (j?.ok && activeId) {
      storePatchMessage(activeId, messageId, {
        isDeleted: true,
        deletedAt: j.message?.deletedAt ?? null,
        text: "",
      });
    }
  }

  const refreshConversations = useCallback(
    async (openChannelId?: string | null) => {
      const r = await fetch("/api/chat/channels", { cache: "no-store" });
      const j = await r.json().catch(() => null);
      if (!j?.ok) return;

      const sorted: Conv[] = [...j.items]
        .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())
        .map((c) => (openChannelId && c.id === openChannelId ? { ...c, unread: 0 } : c));

      storeSetConversations(sorted);
    },
    [storeSetConversations]
  );

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const r = await fetch("/api/me", { cache: "no-store" });
      const j = await r.json().catch(() => null);
      if (j?.ok) setMeId(j.id);
    })();

    if (!convLoaded) void prefetch();
  }, [convLoaded, prefetch]);

  // ── Auto-select first conversation ────────────────────────────────────────
  useEffect(() => {
    if (activeId) return;
    if (qsChannelId && conversations.some((c) => c.id === qsChannelId)) {
      setActiveId(qsChannelId);
      return;
    }
    if (conversations[0]?.id) setActiveId(conversations[0].id);
  }, [conversations, qsChannelId, activeId]);

  // ── Guard removed conversation ────────────────────────────────────────────
  useEffect(() => {
    if (!activeId) return;
    if (conversations.some((c) => c.id === activeId)) return;

    setActiveId(conversations[0]?.id ?? null);
    setReadInfo(null);
    setChatMeta({ isChatClosed: true, chatCloseAt: null });
    setSendErr("This chat is no longer available.");
  }, [conversations, activeId]);

  // ── Load messages for active channel ──────────────────────────────────────
  useEffect(() => {
    if (!activeId || !meId) return;

    const channelId = activeId;
    let cancelled = false;

    setReadInfo(null);

    const cached = useChatStore.getState().messageCache[channelId];
    const hasCached = !!cached?.length;

    async function loadMessages() {
      if (!hasCached) setLoadingMsgs(true);

      const j = await fetch(`/api/chat/messages?channelId=${channelId}&take=30`, {
        cache: "no-store",
      })
        .then((r) => r.json())
        .catch(() => null);

      if (cancelled) {
        setLoadingMsgs(false);
        return;
      }

      if (j?.ok) {
  const msgs = sortMsgs((j.items as Msg[]).slice().reverse());

  const existingNow = useChatStore.getState().messageCache[channelId] ?? [];
  if (existingNow.length > 0) {
    storeMergeMessages(channelId, msgs);
  } else {
    storeSetMessages(channelId, msgs);
  }

  storeSetCursor(channelId, j.nextCursor ?? null);

        if (j.read) setReadInfo(j.read);
        if (typeof j.isChatClosed === "boolean") {
          setChatMeta({
            isChatClosed: !!j.isChatClosed,
            chatCloseAt: j.chatCloseAt ?? null,
          });
        }
      }

      setLoadingMsgs(false);

      if (!cancelled) {
        scrollToBottom("auto");
        await markChatRead(channelId);
      }
    }

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [activeId, meId, scrollToBottom, storeSetMessages, storeSetCursor, storeMergeMessages]);

  // ── Auto-scroll when new messages arrive ─────────────────────────────────
  const prevMsgCount = useRef(0);
  useEffect(() => {
    if (messages.length > prevMsgCount.current) {
      const el = msgScrollRef.current;
      const nearBottom = el
        ? el.scrollHeight - el.scrollTop - el.clientHeight < 200
        : true;

      if (nearBottom) scrollToBottom("smooth");
    }
    prevMsgCount.current = messages.length;
  }, [messages.length, scrollToBottom]);

    // ── Realtime: chat-room channel ───────────────────────────────────────────
  useEffect(() => {
    if (!activeId || !meId) return;

    const channelId = activeId;
    const meIdSnap = meId;
    const supabase = supabaseBrowser;
    let mounted = true;
    let localChannel: ReturnType<typeof supabase.channel> | null = null;

    function handleIncoming(msg: Msg) {
      storeAppendMessage(channelId, msg);

      patchConversationPreview(channelId, {
        text: msg.text ?? "",
        createdAt: msg.createdAt,
        senderId: msg.senderId,
      });

      if (channelId === activeIdRef.current && msg.senderId !== meIdSnap) {
        void markChatRead(channelId);
      } else if (msg.senderId !== meIdSnap) {
        window.dispatchEvent(new Event("chat:unread-refresh"));
      }
    }

    async function start() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;
      if (!session?.access_token) return;

      await supabase.realtime.setAuth(session.access_token);
      if (!mounted) return;

      const channel = supabase
        .channel(`chat-room-${channelId}`, {
          config: { broadcast: { self: false } },
        })

        .on("broadcast", { event: "new-message" }, ({ payload }) => {
          const data = payload as { channelId: string; message: Msg };
          if (data.channelId !== channelId) return;
          if (data.message.senderId !== meIdSnap) return;
          handleIncoming(data.message);
        })

        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "ChatMessage",
          },
          (payload) => {
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
            if (row.senderId === meIdSnap) return;

            void refreshActiveMessages(channelId, true);
            void markChatRead(channelId);
          }
        )

        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "ChatMessage",
          },
          (payload) => {
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

            storePatchMessage(channelId, row.id, {
              senderId: row.senderId,
              text: row.text ?? "",
              createdAt: row.createdAt,
              isDeleted: row.isDeleted,
              deletedAt: row.deletedAt ?? null,
            });
          }
        )

        .on("broadcast", { event: "typing" }, ({ payload }) => {
          const data = payload as {
            channelId: string;
            userId: string;
            isTyping: boolean;
          };

          if (data.channelId !== channelId || data.userId === meIdSnap) return;

          if (data.isTyping) {
            setOtherTyping(true);
            if (otherTypingExpiry.current) clearTimeout(otherTypingExpiry.current);
            otherTypingExpiry.current = setTimeout(() => setOtherTyping(false), 2500);
          } else {
            setOtherTyping(false);
            if (otherTypingExpiry.current) clearTimeout(otherTypingExpiry.current);
          }
        });

      localChannel = channel;
      chatRoomRef.current = channel;

      channel.subscribe((status) => {
        console.log(`[MessagingClient] chat-room-${channelId}`, status);
      });
    }

    void start();

    return () => {
      mounted = false;
      chatRoomRef.current = null;
      if (localChannel) supabase.removeChannel(localChannel);
    };
  }, [activeId, meId, patchConversationPreview, storeAppendMessage, storePatchMessage]);

  // ── Periodic conversation refresh ─────────────────────────────────────────
  useEffect(() => {
    if (!activeId) return;
    const channelId = activeId;
    let stop = false;

    const t = setInterval(() => {
      if (!stop && document.visibilityState === "visible") {
        refreshConversations(channelId);
      }
    }, 30000);

    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [activeId, refreshConversations]);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      const nav = performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined;

      if (e.persisted || nav?.type === "back_forward") {
        window.location.reload();
      }
    };

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
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
      const older = sortMsgs((j.items as Msg[]).slice().reverse());
      storeMergeMessages(activeId, older);
      storeSetCursor(activeId, j.nextCursor ?? null);

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

    const optimisticId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticCreatedAt = new Date().toISOString();

    const optimisticMsg: Msg = {
      id: optimisticId,
      senderId: meId ?? "",
      text: t,
      createdAt: optimisticCreatedAt,
      attachments: [],
    };

    storeAppendMessage(activeId, optimisticMsg);
    scrollToBottom("smooth");

    try {
      const uploaded = await Promise.all(
        pickedFiles.map((f) => uploadAttachment(activeId, f))
      );

      const r = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: activeId, text: t, attachments: uploaded }),
      });

      const j = await r.json().catch(() => null);

      if (!r.ok) {
        storeRemoveMessage(activeId, optimisticId);
        setSendErr(j?.message ?? "Failed to send");

        if (r.status === 403 && (j?.message?.toLowerCase?.() ?? "").includes("closed")) {
          setChatMeta((p) => ({ ...p, isChatClosed: true }));
        }

        setText(t);
        return;
      }

      if (j?.ok && j.message) {
  const createdMsg = j.message as Msg;

  // Replace optimistic immediately first
  storeReplaceMessage(activeId, optimisticId, createdMsg);

  // Re-fetch newest message so attachments come back fully hydrated with signed URLs
  const latestRes = await fetch(`/api/chat/messages?channelId=${activeId}&take=1`, {
    cache: "no-store",
  }).then((r) => r.json()).catch(() => null);

  let finalMsg = createdMsg;

  if (latestRes?.ok && Array.isArray(latestRes.items) && latestRes.items.length > 0) {
    const latest = latestRes.items[0] as Msg;
    if (latest.id === createdMsg.id) {
      finalMsg = latest;
      storeReplaceMessage(activeId, createdMsg.id, finalMsg);
    }
  }

  if (chatRoomRef.current) {
    await chatRoomRef.current.send({
      type: "broadcast",
      event: "new-message",
      payload: { channelId: activeId, message: finalMsg },
    });
  }

  patchConversationPreview(activeId, {
    text: finalMsg.text?.trim() || "📎 Attachment",
    createdAt: finalMsg.createdAt,
    senderId: finalMsg.senderId,
  });

  scrollToBottom("smooth");
}

      setPickedFiles([]);
      await markChatRead(activeId);
    } catch (e: unknown) {
      storeRemoveMessage(activeId, optimisticId);
      setSendErr(e instanceof Error ? e.message : "Failed to send");
      setText(t);
    } finally {
      setUploading(false);
    }
  }

  const [ctx, setCtx] = useState<{
    open: boolean;
    x: number;
    y: number;
    messageId: string | null;
  }>({
    open: false,
    x: 0,
    y: 0,
    messageId: null,
  });

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

  const otherReadAtMs = readInfo ? new Date(readInfo.otherLastReadAt).getTime() : 0;

  const lastMyMsgId = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].senderId === meId && !messages[i].id.startsWith("temp-")) {
        return messages[i].id;
      }
    }
    return null;
  })();

  const inputDisabled = !active || chatMeta.isChatClosed || uploading;

  function timeLeft(iso: string) {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return "Closed";
    const mins = Math.ceil(ms / 60000);
    if (mins < 60) return `${mins}m left`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem ? `${hrs}h ${rem}m` : `${hrs}h left`;
  }

  function closeUrgency(iso: string | null) {
    if (!iso) return "none";
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return "closed";
    if (ms <= 2 * 60 * 1000) return "danger";
    if (ms <= 10 * 60 * 1000) return "warn";
    return "ok";
  }

  const IconOpen = ({ className = "" }: { className?: string }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M14 5h5v5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 14L19 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 14v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const IconDownload = ({ className = "" }: { className?: string }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M7 10l5 5 5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5 21h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  const IconPdf = ({ className = "" }: { className?: string }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M14 2v5h5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );

  const IconSearch = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="shrink-0 opacity-50">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path
        d="M16.5 16.5l4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );

  const IconSend = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M22 2L11 13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 2L15 22 11 13 2 9l20-7z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const IconAttach = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 0 1-2.83-2.83l8.49-8.48"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <>
      <style>{`
        .msg-panel{animation:fadeUp 0.22s ease both;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        .conv-item{transition:box-shadow 0.15s,border-color 0.15s,background 0.15s;}
        .conv-item:hover{box-shadow:0 4px 18px rgba(0,0,0,0.09);}
        .bubble-enter{animation:bubbleIn 0.18s cubic-bezier(.34,1.56,.64,1) both;}
        @keyframes bubbleIn{from{opacity:0;transform:scale(0.88);}to{opacity:1;transform:scale(1);}}
        .typing-dot{animation:typingPulse 1.2s infinite ease-in-out;}
        .typing-dot:nth-child(2){animation-delay:0.2s;}
        .typing-dot:nth-child(3){animation-delay:0.4s;}
        @keyframes typingPulse{0%,80%,100%{transform:scale(0.7);opacity:0.4;}40%{transform:scale(1);opacity:1;}}
        .send-btn{transition:box-shadow 0.15s,transform 0.1s,opacity 0.15s;}
        .send-btn:not(:disabled):hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(124,58,237,0.45);}
        .send-btn:not(:disabled):active{transform:translateY(0);}
        .pill-filter{transition:all 0.15s;}
        .online-pulse{animation:pulse 2s infinite;}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.5;}}
        .img-thumb{transition:transform 0.15s,border-color 0.15s;}
        .img-thumb:hover{transform:scale(1.05);}
        .load-older-btn{transition:background 0.15s,box-shadow 0.15s;}
        .load-older-btn:hover{box-shadow:0 2px 12px rgba(0,0,0,0.1);}
        .attach-chip{animation:chipIn 0.18s ease both;}
        @keyframes chipIn{from{opacity:0;transform:scale(0.85);}to{opacity:1;transform:scale(1);}}
        .ctx-menu{animation:ctxIn 0.12s ease both;}
        @keyframes ctxIn{from{opacity:0;transform:scale(0.92) translateY(-4px);}to{opacity:1;transform:scale(1) translateY(0);}}
        .viewer-fade{animation:viewerIn 0.2s ease both;}
        @keyframes viewerIn{from{opacity:0;}to{opacity:1;}}
        .viewer-img{animation:viewerImgIn 0.22s cubic-bezier(.34,1.36,.64,1) both;}
        @keyframes viewerImgIn{from{opacity:0;transform:scale(0.93);}to{opacity:1;transform:scale(1);}}
        .sidebar-scroll::-webkit-scrollbar{width:3px;}
        .sidebar-scroll::-webkit-scrollbar-track{background:transparent;}
        .sidebar-scroll::-webkit-scrollbar-thumb{background:rgba(128,128,128,0.25);border-radius:2px;}
        .msg-scroll::-webkit-scrollbar{width:4px;}
        .msg-scroll::-webkit-scrollbar-track{background:transparent;}
        .msg-scroll::-webkit-scrollbar-thumb{background:rgba(128,128,128,0.2);border-radius:2px;}
        .skeleton{animation:shimmer 1.4s infinite;background:linear-gradient(90deg,rgb(var(--card2)) 25%,rgb(var(--card)) 50%,rgb(var(--card2)) 75%);background-size:200% 100%;}
        @keyframes shimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}
      `}</style>

      <div className="pt-4 pb-4">
        <div className="mx-auto max-w-6xl space-y-5 px-4 sm:px-6 lg:px-8">
          <header className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-[1.6rem] font-bold tracking-tight text-[rgb(var(--fg))]">
                Messages
              </h1>
              <p className="mt-0.5 text-sm text-[rgb(var(--muted))]">
                Real-time chat between students &amp; tutors
              </p>
            </div>
            {conversations.length > 0 && (
              <div className="flex items-center gap-1.5 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 online-pulse" />
                <span className="text-[0.7rem] font-medium text-[rgb(var(--muted))]">
                  {conversations.length} conversation
                  {conversations.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </header>

          <section className="grid h-[calc(100vh-250px)] min-h-[520px] overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-[0_20px_60px_rgba(0,0,0,0.10)] lg:grid-cols-[300px_1fr]">
            <div className="flex min-h-0 flex-col border-b border-[rgb(var(--border))] bg-[rgb(var(--card2))]/60 lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between gap-2 border-b border-[rgb(var(--border))] px-4 py-3.5">
                <span className="text-[0.8rem] font-semibold text-[rgb(var(--fg))]">
                  Conversations
                </span>
                <span className="rounded-full bg-[rgb(var(--primary))/0.12] px-2.5 py-0.5 text-[0.62rem] font-semibold text-[rgb(var(--primary))]">
                  {filteredConversations.length}
                </span>
              </div>

              <div className="px-3 pt-3 pb-2">
                <div className="flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 focus-within:border-[rgb(var(--primary))/0.6] focus-within:ring-1 focus-within:ring-[rgb(var(--primary))/0.2] transition">
                  <IconSearch />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-[0.75rem] text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted2))] focus:outline-none"
                    placeholder="Search…"
                  />
                  {q && (
                    <button
                      type="button"
                      onClick={() => setQ("")}
                      className="opacity-40 hover:opacity-80 text-[rgb(var(--fg))] transition text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-1.5 px-3 pb-3">
                {(["ALL", "STUDENT", "TUTOR"] as RoleFilter[]).map((key) => {
                  const labels = { ALL: "All", STUDENT: "Student", TUTOR: "Tutor" };
                  const isActive = roleFilter === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setRoleFilter(key)}
                      className={`pill-filter flex-1 rounded-lg py-1.5 text-[0.68rem] font-semibold transition ${
                        isActive
                          ? "bg-[rgb(var(--primary))] text-white shadow-[0_2px_10px_rgba(124,58,237,0.30)]"
                          : "bg-[rgb(var(--card))] border border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))]"
                      }`}
                    >
                      {labels[key]}
                    </button>
                  );
                })}
              </div>

              <div className="sidebar-scroll flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
                {!convLoaded &&
                  [1, 2, 3].map((i) => (
                    <div key={i} className="rounded-xl border border-[rgb(var(--border))] px-3 py-3">
                      <div className="skeleton h-3 w-3/4 rounded mb-2" />
                      <div className="skeleton h-2 w-1/2 rounded" />
                    </div>
                  ))}

                {filteredConversations.map((conv) => {
                  const isActive = conv.id === activeId;
                  const isStudent = conv.viewerIsStudent;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => setActiveId(conv.id)}
                      className={`conv-item relative cursor-pointer rounded-xl border px-3 py-3 ${
                        isActive
                          ? "border-[rgb(var(--primary))/0.5] bg-[rgb(var(--primary))/0.07] shadow-[0_2px_14px_rgba(124,58,237,0.12)]"
                          : "border-[rgb(var(--border))] bg-[rgb(var(--card))] hover:border-[rgb(var(--primary))/0.25]"
                      }`}
                    >
                      <div
                        className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full ${
                          isStudent ? "bg-violet-500" : "bg-fuchsia-500"
                        }`}
                      />
                      <div className="flex items-start justify-between gap-2 pl-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[0.75rem] font-semibold text-[rgb(var(--fg))]">
                            {conv.subjectName}
                          </p>
                          <p className="mt-0.5 truncate text-[0.68rem] text-[rgb(var(--muted))]">
                            {conv.name}
                          </p>
                          <p className="mt-1 line-clamp-1 text-[0.66rem] text-[rgb(var(--muted2))]">
                            {conv.lastMessage || "No messages yet"}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wide ${
                              isStudent
                                ? "bg-violet-500/10 text-violet-600 dark:text-violet-300"
                                : "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300"
                            }`}
                          >
                            {isStudent ? "S" : "T"}
                          </span>
                          <span className="text-[0.6rem] text-[rgb(var(--muted2))]">
                            {timeAgo(conv.lastAt)}
                          </span>
                          {conv.unread > 0 && (
                            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[rgb(var(--primary))] px-1 text-[0.58rem] font-bold text-white">
                              {conv.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {convLoaded && filteredConversations.length === 0 && (
                  <div className="mt-4 rounded-xl border border-dashed border-[rgb(var(--border))] p-4 text-center">
                    <p className="text-[0.72rem] text-[rgb(var(--muted))]">
                      No conversations found
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex min-h-0 flex-col">
              <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--border))] bg-[rgb(var(--card))]/80 px-5 py-3.5 backdrop-blur-sm">
                {active ? (
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ${
                        active.viewerIsStudent
                          ? "bg-gradient-to-br from-violet-500 to-purple-600"
                          : "bg-gradient-to-br from-fuchsia-500 to-pink-600"
                      }`}
                    >
                      {active.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[0.85rem] font-semibold text-[rgb(var(--fg))]">
                        {active.subjectName}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[0.68rem] text-[rgb(var(--muted))]">
                          {active.name}
                        </span>
                        {active.otherUserId && userPresence && (
                          <>
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                userPresence.isOnline ? "bg-emerald-500 online-pulse" : "bg-gray-400"
                              }`}
                            />
                            <span
                              className={`text-[0.65rem] font-medium ${
                                userPresence.isOnline
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-[rgb(var(--muted2))]"
                              }`}
                            >
                              {userPresence.isOnline
                                ? "Online"
                                : formatLastSeen(userPresence.lastSeenAt)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {chatMeta.chatCloseAt && !chatMeta.isChatClosed && (
                      <span
                        className={`ml-2 rounded-full border px-2.5 py-0.5 text-[0.62rem] font-semibold ${
                          closeUrgency(chatMeta.chatCloseAt) === "danger"
                            ? "border-red-400/40 bg-red-500/10 text-red-600 dark:text-red-400"
                            : closeUrgency(chatMeta.chatCloseAt) === "warn"
                            ? "border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            : "border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        }`}
                      >
                        {closeUrgency(chatMeta.chatCloseAt) === "danger" ? "⚠ " : ""}
                        {timeLeft(chatMeta.chatCloseAt)}
                      </span>
                    )}
                    {chatMeta.isChatClosed && (
                      <span className="ml-2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2.5 py-0.5 text-[0.62rem] text-[rgb(var(--muted2))]">
                        Closed
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[rgb(var(--muted))]">Select a conversation</p>
                )}

                {active && (
                  <a
                    href={`/sessions/${active.sessionId}`}
                    className="shrink-0 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-1.5 text-[0.68rem] font-medium text-[rgb(var(--fg))] transition hover:border-[rgb(var(--primary))/0.4] hover:bg-[rgb(var(--primary))/0.06]"
                  >
                    Session →
                  </a>
                )}
              </div>

              {active && chatMeta.isChatClosed && (
                <div className="mx-4 mt-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-[0.72rem] text-[rgb(var(--muted))]">
                  💬 Chat closed
                  {chatMeta.chatCloseAt && (
                    <>
                      {" "}
                      ·{" "}
                      {new Date(chatMeta.chatCloseAt).toLocaleString([], {
                        month: "short",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </>
                  )}
                </div>
              )}

              <div
                ref={msgScrollRef}
                className="msg-scroll msg-panel flex-1 overflow-y-auto px-4 py-4 space-y-1"
              >
                {nextCursor && (
                  <div className="flex justify-center mb-3">
                    <button
                      onClick={loadOlder}
                      disabled={loadingMsgs}
                      className="load-older-btn rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-1.5 text-[0.68rem] font-medium text-[rgb(var(--muted))] disabled:opacity-50 transition"
                    >
                      {loadingMsgs ? "Loading…" : "↑ Load older"}
                    </button>
                  </div>
                )}

                {showSkeleton &&
                  [1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"} mb-2`}
                    >
                      <div
                        className={`skeleton rounded-2xl ${
                          i % 2 === 0 ? "rounded-br-sm" : "rounded-bl-sm"
                        }`}
                        style={{ width: `${120 + i * 30}px`, height: "36px" }}
                      />
                    </div>
                  ))}

                {messages.map((msg, i) => {
                  const isMe = msg.senderId === meId;
                  const isTemp = msg.id.startsWith("temp-");
                  const isLastMine = isMe && msg.id === lastMyMsgId;
                  const isSeen =
                    isLastMine && new Date(msg.createdAt).getTime() <= otherReadAtMs;
                  const showTime =
                    i === 0 ||
                    new Date(msg.createdAt).getTime() -
                      new Date(messages[i - 1].createdAt).getTime() >
                      5 * 60 * 1000;

                  return (
                    <React.Fragment key={msg.id}>
                      {showTime && (
                        <div className="flex justify-center py-2">
                          <span className="rounded-full bg-[rgb(var(--card2))] border border-[rgb(var(--border))] px-3 py-0.5 text-[0.6rem] text-[rgb(var(--muted2))]">
                            {new Date(msg.createdAt).toLocaleString([], {
                              month: "short",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      )}

                      <div
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                        onContextMenu={(e) => {
                          if (!isMe || msg.isDeleted || isTemp) return;
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
                          className={`bubble-enter group relative max-w-[68%] ${
                            isMe ? "items-end" : "items-start"
                          } flex flex-col`}
                        >
                          <div
                            className={`rounded-2xl px-3.5 py-2.5 text-[0.8rem] leading-relaxed shadow-sm ${
                              isMe
                                ? `rounded-br-sm bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_4px_14px_rgba(124,58,237,0.3)] ${
                                    isTemp ? "opacity-60" : ""
                                  }`
                                : "rounded-bl-sm border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))]"
                            }`}
                          >
                            {msg.isDeleted ? (
                              <p className="italic text-[0.75rem] opacity-70">Message deleted</p>
                            ) : (
                              <>
                                {msg.text && (
                                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                                )}

                                {(msg.attachments as Attachment[] | undefined)?.map((a) => {
                                  const isImg = a.contentType?.startsWith("image/");
                                  const isPdf = a.contentType === "application/pdf";
                                  const kb = Math.max(1, Math.round((a.sizeBytes ?? 0) / 1024));
                                  const sizeLabel =
                                    kb >= 1024
                                      ? `${(kb / 1024).toFixed(1)} MB`
                                      : `${kb} KB`;

                                  const cardBase = isMe
                                    ? "border-white/20 bg-white/10"
                                    : "border-[rgb(var(--border))] bg-[rgb(var(--card2))]";
                                  const btnBase = isMe
                                    ? "border-white/20 bg-white/15 text-white hover:bg-white/25"
                                    : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card2))]";
                                  const dlBtn = isMe
                                    ? "border-white/30 bg-white text-gray-900 hover:bg-white/90"
                                    : "border-transparent bg-[rgb(var(--primary))] text-white hover:opacity-90";

                                  if (isImg && a.url)
                                    return (
                                      <div
                                        key={a.id}
                                        className="mt-2 overflow-hidden rounded-xl border border-white/10 shadow-lg"
                                      >
                                        <button
                                          type="button"
                                          onClick={() => openImageInChat(a.url!)}
                                          className="block w-full"
                                        >
                                          <Image
                                            src={a.url}
                                            alt={a.fileName}
                                            width={300}
                                            height={220}
                                            unoptimized
                                            className="block h-auto w-full max-w-[300px] hover:opacity-95 transition"
                                          />
                                        </button>
                                        <div
                                          className={`flex items-center justify-between gap-2 border-t px-2.5 py-1.5 ${
                                            isMe
                                              ? "border-white/10"
                                              : "border-[rgb(var(--border))]"
                                          }`}
                                        >
                                          <span
                                            className={`truncate text-[0.62rem] ${
                                              isMe
                                                ? "text-white/60"
                                                : "text-[rgb(var(--muted2))]"
                                            }`}
                                          >
                                            {a.fileName}
                                          </span>
                                          <div className="flex items-center gap-1">
                                            <button
                                              type="button"
                                              onClick={() => openImageInChat(a.url!)}
                                              className={`rounded-full border p-1.5 transition ${btnBase}`}
                                            >
                                              <IconOpen />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                forceDownload(a.url!, a.fileName)
                                              }
                                              className={`rounded-full border p-1.5 transition ${dlBtn}`}
                                            >
                                              <IconDownload />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );

                                  if (isPdf)
                                    return (
                                      <div
                                        key={a.id}
                                        className={`mt-2 overflow-hidden rounded-xl border ${cardBase}`}
                                      >
                                        <div className="flex items-center gap-3 px-3 py-2.5">
                                          <div
                                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                                              isMe
                                                ? "border-white/20 bg-white/10 text-white"
                                                : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))]"
                                            }`}
                                          >
                                            <IconPdf />
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <p
                                              className={`truncate text-[0.72rem] font-semibold ${
                                                isMe
                                                  ? "text-white"
                                                  : "text-[rgb(var(--fg))]"
                                              }`}
                                            >
                                              {a.fileName}
                                            </p>
                                            <p
                                              className={`text-[0.6rem] ${
                                                isMe
                                                  ? "text-white/55"
                                                  : "text-[rgb(var(--muted2))]"
                                              }`}
                                            >
                                              PDF · {sizeLabel}
                                            </p>
                                          </div>
                                          <div className="flex shrink-0 items-center gap-1">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                a.url && window.open(a.url, "_blank")
                                              }
                                              disabled={!a.url}
                                              className={`rounded-full border p-1.5 transition ${btnBase} disabled:opacity-40`}
                                            >
                                              <IconOpen />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                a.url && forceDownload(a.url, a.fileName)
                                              }
                                              disabled={!a.url}
                                              className={`rounded-full border p-1.5 transition ${dlBtn} disabled:opacity-40`}
                                            >
                                              <IconDownload />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );

                                  return null;
                                })}
                              </>
                            )}
                          </div>

                          <div
                            className={`mt-1 flex items-center gap-1.5 px-0.5 text-[0.6rem] ${
                              isMe
                                ? "justify-end text-[rgb(var(--muted2))]"
                                : "text-[rgb(var(--muted2))]"
                            }`}
                          >
                            <span>
                              {isTemp
                                ? "Sending…"
                                : new Date(msg.createdAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                            </span>
                            {isLastMine && !isTemp && (
                              <span
                                className={`text-[0.58rem] font-medium ${
                                  isSeen
                                    ? "text-[rgb(var(--primary))]"
                                    : "text-[rgb(var(--muted2))]"
                                }`}
                              >
                                {isSeen ? "Seen" : "Sent"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}

                {active && otherTyping && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-sm border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3">
                      <div className="flex items-center gap-1">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="typing-dot h-1.5 w-1.5 rounded-full bg-[rgb(var(--muted))]"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {messages.length === 0 && active && !loadingMsgs && (
                  <div className="flex flex-col items-center justify-center gap-2 pt-12 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-xl">
                      👋
                    </div>
                    <p className="text-[0.75rem] text-[rgb(var(--muted))]">
                      No messages yet — say hi!
                    </p>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {active && sendErr && (
                <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/8 px-3 py-2 text-[0.72rem] text-red-600 dark:text-red-400">
                  <span>⚠</span>
                  <span>{sendErr}</span>
                  <button
                    type="button"
                    onClick={() => setSendErr(null)}
                    className="ml-auto opacity-60 hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
              )}

              {pickedFiles.length > 0 && (
                <div className="mx-4 mb-1 flex flex-wrap gap-1.5">
                  {pickedFiles.map((f, idx) => (
                    <div
                      key={`${f.name}-${idx}`}
                      className="attach-chip flex items-center gap-1.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2.5 py-1 text-[0.68rem] text-[rgb(var(--fg))]"
                    >
                      <span className="opacity-50">📎</span>
                      <span className="max-w-[180px] truncate">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => removePickedFile(idx)}
                        disabled={uploading}
                        className="opacity-40 hover:opacity-100 transition"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-[rgb(var(--border))] bg-[rgb(var(--card))]/80 px-4 py-3 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={inputDisabled}
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach file"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--muted))] transition hover:border-[rgb(var(--primary))/0.4] hover:text-[rgb(var(--primary))] disabled:opacity-40"
                  >
                    <IconAttach />
                  </button>

                  <div className="relative flex-1">
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
                        typingStopTimer.current = setTimeout(() => void pingTyping(false), 1200);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void send();
                        }
                      }}
                      className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-2.5 text-[0.8rem] text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted2))] focus:border-[rgb(var(--primary))/0.5] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))/0.15] transition"
                      placeholder={
                        !active
                          ? "Select a conversation…"
                          : chatMeta.isChatClosed
                          ? "Chat is closed"
                          : uploading
                          ? "Sending…"
                          : "Type a message…"
                      }
                      disabled={inputDisabled}
                    />
                  </div>

                  <button
                    onClick={send}
                    disabled={inputDisabled || (!text.trim() && pickedFiles.length === 0)}
                    className="send-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_4px_14px_rgba(124,58,237,0.35)] disabled:opacity-40 disabled:shadow-none"
                  >
                    <IconSend />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {ctx.open && ctx.messageId && (
        <div
          style={{ left: ctx.x, top: ctx.y }}
          className="ctx-menu fixed z-50 min-w-[140px] overflow-hidden rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-3 py-2.5 text-left text-[0.75rem] text-red-600 dark:text-red-400 hover:bg-red-500/8 transition"
            onClick={() => {
              deleteMessage(ctx.messageId!);
              setCtx((p) => ({ ...p, open: false, messageId: null }));
            }}
          >
            Delete
          </button>
        </div>
      )}

      {imgViewer.open && (
        <div
          className="viewer-fade fixed inset-0 z-[60] bg-black/92 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeImageViewer();
          }}
        >
          <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-5 py-4">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
              {imgViewer.idx + 1} / {imgViewer.urls.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const url = imgViewer.urls[imgViewer.idx];
                  if (url) forceDownload(url, prettyNameFromUrl(url));
                }}
                className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white transition hover:bg-white/20"
              >
                ↓ Download
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeImageViewer();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25 text-sm"
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
                className="absolute left-4 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white text-xl transition hover:bg-white/25"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                className="absolute right-4 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white text-xl transition hover:bg-white/25"
              >
                ›
              </button>
            </>
          )}

          <div className="absolute inset-0 z-10 flex items-center justify-center p-8 pb-28">
            <Image
              src={imgViewer.urls[imgViewer.idx] ?? ""}
              alt="Preview"
              width={1600}
              height={1200}
              unoptimized
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
                setZoom((z) => Math.min(Math.max(1, z + (e.deltaY > 0 ? -0.2 : 0.2)), 4));
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
              className="viewer-img max-h-[80vh] max-w-[90vw] select-none rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
              style={{
                transform: `scale(${zoom}) translate(${offset.x / zoom}px,${offset.y / zoom}px)`,
                cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "zoom-in",
                transition: dragging ? "none" : "transform 0.1s ease",
                width: "auto",
                height: "auto",
              }}
            />
          </div>

          {imgViewer.urls.length > 1 && (
            <div
              className="absolute inset-x-0 bottom-0 z-30 px-4 py-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-black/60 px-3 py-2.5 backdrop-blur-md">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {imgViewer.urls.map((u, i) => (
                    <button
                      key={`${u}-${i}`}
                      type="button"
                      onClick={() => setImgViewer((p) => ({ ...p, idx: i }))}
                      className={`img-thumb relative shrink-0 overflow-hidden rounded-lg border ${
                        i === imgViewer.idx
                          ? "border-white ring-2 ring-white/40"
                          : "border-white/20 opacity-60 hover:opacity-90"
                      }`}
                    >
                      <Image
                        src={u}
                        alt={`thumb-${i}`}
                        width={64}
                        height={48}
                        unoptimized
                        draggable={false}
                        className="h-12 w-16 object-cover"
                      />
                    </button>
                  ))}
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] text-white/50">
                  <span className="truncate">
                    {prettyNameFromUrl(imgViewer.urls[imgViewer.idx] ?? "")}
                  </span>
                  <span>← → · Esc</span>
                </div>
              </div>
            </div>
          )}
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
    </>
  );
}