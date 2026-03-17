"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
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

type ChatMessageRow = {
  id: string;
  channelId: string;
  senderId: string;
  text: string;
  createdAt: string;
  isDeleted?: boolean;
  deletedAt?: string | null;
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
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

function mapRowToMsg(row: ChatMessageRow): Msg {
  return {
    id: row.id,
    senderId: row.senderId,
    text: row.text ?? "",
    createdAt: row.createdAt,
    isDeleted: row.isDeleted,
    deletedAt: row.deletedAt ?? null,
    attachments: [],
  };
}

export default function MessagingClient() {
  const [meId, setMeId] = useState<string | null>(null);

  const storeConversations = useChatStore((s) => s.conversations);
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
  const storePatchConversation = useChatStore((s) => s.patchConversation);
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
  const router = useRouter();

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
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
    },
    []
  );

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

  const chatRoomRef = useRef<ReturnType<typeof supabaseBrowser.channel> | null>(
  null
);

  const lastMarkedReadRef = useRef<Record<string, number>>({});

  const allImageUrls = useMemo(() => {
    const urls: string[] = [];

    for (const m of messages) {
      for (const a of (m.attachments ?? []) as Attachment[]) {
        if (a?.url && (a.contentType ?? "").startsWith("image/")) {
          urls.push(a.url);
        }
      }
    }

    return Array.from(new Set(urls));
  }, [messages]);

  const patchConversationPreview = useCallback(
    (
      channelId: string,
      payload: { text: string; createdAt: string; senderId: string }
    ) => {
      const current = useChatStore.getState().conversations.find((c) => c.id === channelId);
      if (!current) return;

      storePatchConversation(channelId, {
        lastMessage: payload.text?.trim() || "📎 Attachment",
        lastAt: payload.createdAt,
        unread:
          payload.senderId === meId || channelId === activeIdRef.current
            ? 0
            : current.unread + 1,
      });
    },
    [meId, storePatchConversation]
  );

  const markChatRead = useCallback(
    async (channelId: string) => {
      const now = Date.now();
      const last = lastMarkedReadRef.current[channelId] ?? 0;

      if (now - last < 1200) return;
      lastMarkedReadRef.current[channelId] = now;

      await fetch("/api/chat/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      }).catch(() => {});

      storeMarkRead(channelId);
      window.dispatchEvent(new Event("chat:unread-refresh"));
    },
    [storeMarkRead]
  );

  const fetchLatestMessage = useCallback(async (channelId: string, expectedId?: string) => {
    const j = await fetch(`/api/chat/messages?channelId=${channelId}&take=1`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .catch(() => null);

    if (!j?.ok || !Array.isArray(j.items) || !j.items.length) return null;

    const latest = j.items[0] as Msg;
    if (!expectedId) return latest;
    if (latest.id === expectedId) return latest;

    const found = (j.items as Msg[]).find((m) => m.id === expectedId);
    return found ?? null;
  }, []);

  

  function prettyNameFromUrl(u: string) {
    try {
      return decodeURIComponent(new URL(u).pathname.split("/").pop() || "image");
    } catch {
      return decodeURIComponent((u.split("/").pop() || "image").split("?")[0]);
    }
  }

  function openImageInChat(url: string) {
    const urls = allImageUrls.length ? allImageUrls : [url];
    setImgViewer({
      open: true,
      urls,
      idx: Math.max(0, urls.indexOf(url)),
    });
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
      !p.urls.length
        ? p
        : { ...p, idx: (p.idx - 1 + p.urls.length) % p.urls.length }
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
    if (!active?.otherUserId || !meId) {
      setUserPresence(null);
      return;
    }

    const supabase = supabaseBrowser;
    const otherUserId = active.otherUserId;

    const presenceChannel = supabase.channel("user-presence", {
      config: {
        presence: {
          key: meId,
        },
      },
    });

    const syncPresence = () => {
      const state = presenceChannel.presenceState() as Record<
        string,
        Array<{ userId?: string; onlineAt?: string }>
      >;

      const entries = Object.values(state).flat();
      const other = entries.find((p) => p.userId === otherUserId);

      setUserPresence({
        isOnline: !!other,
        lastSeenAt: other?.onlineAt ?? null,
      });
    };

    presenceChannel
      .on("presence", { event: "sync" }, syncPresence)
      .on("presence", { event: "join" }, syncPresence)
      .on("presence", { event: "leave" }, syncPresence)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({
            userId: meId,
            onlineAt: new Date().toISOString(),
          });
          syncPresence();
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [active?.otherUserId, meId]);

  async function pingTyping(isTyping: boolean) {
    if (!activeId || !meId || !chatRoomRef.current) return;

    await chatRoomRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: {
        channelId: activeId,
        userId: meId,
        isTyping,
      },
    });
  }

  function validateFile(file: File) {
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      return "Only images or PDFs allowed";
    }

    if (file.size > 10 * 1024 * 1024) {
      return "File too large (max 10MB)";
    }

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

  async function uploadAttachment(
    channelId: string,
    file: File
  ): Promise<UploadPayload> {
    const sign = await fetch("/api/chat/attachments/sign-upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channelId,
        fileName: file.name,
        contentType: file.type,
      }),
    }).then((r) => r.json());

    if (!sign?.ok) {
      throw new Error(sign?.message ?? "Sign upload failed");
    }

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
    const r = await fetch(`/api/chat/messages/${messageId}`, {
      method: "DELETE",
    });

    const j = await r.json().catch(() => null);

    if (j?.ok && activeId) {
      storePatchMessage(activeId, messageId, {
        isDeleted: true,
        deletedAt: j.message?.deletedAt ?? null,
        text: "",
      });
    }
  }

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/me", { cache: "no-store" });
      const j = await r.json().catch(() => null);
      if (j?.ok) setMeId(j.id);
    })();

    if (!convLoaded) void prefetch();
  }, [convLoaded, prefetch]);

  useEffect(() => {
  if (qsChannelId && conversations.some((c) => c.id === qsChannelId)) {
    if (activeId !== qsChannelId) {
      setActiveId(qsChannelId);
    }
    return;
  }

  if (!activeId && conversations[0]?.id) {
    setActiveId(conversations[0].id);
    router.replace(`/messaging?channelId=${conversations[0].id}`, {
      scroll: false,
    });
  }
}, [conversations, qsChannelId, activeId, router]);

  useEffect(() => {
    if (!activeId) return;
    if (conversations.some((c) => c.id === activeId)) return;

    setActiveId(conversations[0]?.id ?? null);
    setReadInfo(null);
    setChatMeta({ isChatClosed: true, chatCloseAt: null });
    setSendErr("This chat is no longer available.");
  }, [conversations, activeId]);

  useEffect(() => {
    if (!activeId || !meId) return;

    const channelId = activeId;
    let cancelled = false;

    setReadInfo(null);

    const cached = useChatStore.getState().messageCache[channelId];
    const hasCached = !!cached?.length;

    async function loadMessages() {
  if (hasCached) {
    setLoadingMsgs(false);
    scrollToBottom("auto");
    await markChatRead(channelId);
    return;
  }

  setLoadingMsgs(true);

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
    storeSetMessages(channelId, msgs);
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

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [
    activeId,
    meId,
    scrollToBottom,
    storeSetMessages,
    storeSetCursor,
    storeMergeMessages,
    markChatRead,
  ]);

  const prevMsgCount = useRef(0);

  useEffect(() => {
  if (messages.length > prevMsgCount.current) {
    scrollToBottom("smooth");
  }

  prevMsgCount.current = messages.length;
}, [messages.length, scrollToBottom]);

  useEffect(() => {
    if (!activeId || !meId) return;

    const channelId = activeId;
    const meIdSnap = meId;
    const supabase = supabaseBrowser;

    let mounted = true;
    let localChannel: ReturnType<typeof supabase.channel> | null = null;

    function handleIncomingRow(row: ChatMessageRow) {
  const msg = mapRowToMsg(row);

  storeMergeMessages(channelId, [msg]);

  patchConversationPreview(channelId, {
    text: msg.text ?? "",
    createdAt: msg.createdAt,
    senderId: msg.senderId,
  });
}

    async function start() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted || !session?.access_token) return;

      await supabase.realtime.setAuth(session.access_token);
      if (!mounted) return;

      const channel = supabase
        .channel(`chat-room-${channelId}`, {
          config: { broadcast: { self: false } },
        })
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "ChatMessage",
            filter: `channelId=eq.${channelId}`,
          },
          (payload) => {
            const row = payload.new as ChatMessageRow;
            if (!row) return;
            if (row.senderId === meIdSnap) return;
            void handleIncomingRow(row);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "ChatMessage",
            filter: `channelId=eq.${channelId}`,
          },
          (payload) => {
            const row = payload.new as ChatMessageRow;
            if (!row) return;

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

            if (otherTypingExpiry.current) {
              clearTimeout(otherTypingExpiry.current);
            }

            otherTypingExpiry.current = setTimeout(() => {
              setOtherTyping(false);
            }, 2500);
          } else {
            setOtherTyping(false);
            if (otherTypingExpiry.current) {
              clearTimeout(otherTypingExpiry.current);
            }
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
  }, [
    activeId,
    meId,
    patchConversationPreview,
    storeMergeMessages,
    storePatchMessage,
    fetchLatestMessage,
    markChatRead,
  ]);

  useEffect(() => {
  function onIncoming(ev: Event) {
    const custom = ev as CustomEvent<{ channelId: string; message: Msg }>;
    const data = custom.detail;
    if (!data) return;
    if (!activeIdRef.current) return;
    if (data.channelId !== activeIdRef.current) return;

    storeMergeMessages(data.channelId, [data.message]);

   

    patchConversationPreview(data.channelId, {
      text: data.message.text ?? "",
      createdAt: data.message.createdAt,
      senderId: data.message.senderId,
    });

    if (data.message.senderId !== meId) {
      void markChatRead(data.channelId);
    }

    scrollToBottom("smooth");
  }

  window.addEventListener("chat:message-incoming", onIncoming as EventListener);

  return () => {
    window.removeEventListener(
      "chat:message-incoming",
      onIncoming as EventListener
    );
  };
}, [
  meId,
  markChatRead,
  patchConversationPreview,
  scrollToBottom,
  storeMergeMessages,
  fetchLatestMessage,
]);

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

    const optimisticId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

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
        body: JSON.stringify({
          channelId: activeId,
          text: t,
          attachments: uploaded,
        }),
      });

      const j = await r.json().catch(() => null);

      if (!r.ok) {
        storeRemoveMessage(activeId, optimisticId);
        setSendErr(j?.message ?? "Failed to send");

        if (
          r.status === 403 &&
          (j?.message?.toLowerCase?.() ?? "").includes("closed")
        ) {
          setChatMeta((p) => ({ ...p, isChatClosed: true }));
        }

        setText(t);
        return;
      }

      if (j?.ok && j.message) {
        const createdMsg = j.message as Msg;
        storeReplaceMessage(activeId, optimisticId, createdMsg);

        patchConversationPreview(activeId, {
          text: createdMsg.text?.trim() || "📎 Attachment",
          createdAt: createdMsg.createdAt,
          senderId: createdMsg.senderId,
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
    const close = () =>
      setCtx((p) => ({ ...p, open: false, messageId: null }));

    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);

    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, []);

  const otherReadAtMs = readInfo
    ? new Date(readInfo.otherLastReadAt).getTime()
    : 0;

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
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
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
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M12 3v12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M7 10l5 5 5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 21h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );

  const IconPdf = ({ className = "" }: { className?: string }) => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M14 2v5h5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );

  const IconSearch = () => (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0 opacity-50"
    >
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
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
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
                <div className="flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2">
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
                      className="text-xs opacity-40 transition hover:opacity-80 text-[rgb(var(--fg))]"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-1.5 px-3 pb-3">
                {(["ALL", "STUDENT", "TUTOR"] as RoleFilter[]).map((key) => {
                  const labels = {
                    ALL: "All",
                    STUDENT: "Student",
                    TUTOR: "Tutor",
                  };

                  const isActive = roleFilter === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setRoleFilter(key)}
                      className={`flex-1 rounded-lg py-1.5 text-[0.68rem] font-semibold transition ${
                        isActive
                          ? "bg-[rgb(var(--primary))] text-white shadow-[0_2px_10px_rgba(124,58,237,0.30)]"
                          : "border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))]"
                      }`}
                    >
                      {labels[key]}
                    </button>
                  );
                })}
              </div>

              <div className="flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
                {filteredConversations.map((conv) => {
                  const isActive = conv.id === activeId;
                  const isStudent = conv.viewerIsStudent;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setActiveId(conv.id);
                        router.replace(`/messaging?channelId=${conv.id}`, { scroll: false });
                      }}
                      className={`relative cursor-pointer rounded-xl border px-3 py-3 transition ${
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
              </div>
            </div>

            <div className="flex min-h-0 flex-col">
              <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--border))] bg-[rgb(var(--card))]/80 px-5 py-3.5">
                {active ? (
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
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

                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-[0.68rem] text-[rgb(var(--muted))]">
                          {active.name}
                        </span>

                        {active.otherUserId && userPresence && (
                          <>
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                userPresence.isOnline
                                  ? "bg-emerald-500"
                                  : "bg-gray-400"
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
                        {closeUrgency(chatMeta.chatCloseAt) === "danger"
                          ? "⚠ "
                          : ""}
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
                  <p className="text-sm text-[rgb(var(--muted))]">
                    Select a conversation
                  </p>
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
                className="flex-1 space-y-1 overflow-y-auto px-4 py-4"
              >
                {nextCursor && (
                  <div className="mb-3 flex justify-center">
                    <button
                      onClick={loadOlder}
                      disabled={loadingMsgs}
                      className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-1.5 text-[0.68rem] font-medium text-[rgb(var(--muted))] transition disabled:opacity-50"
                    >
                      {loadingMsgs ? "Loading…" : "↑ Load older"}
                    </button>
                  </div>
                )}

                {showSkeleton &&
                  [1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`mb-2 flex ${
                        i % 2 === 0 ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`rounded-2xl ${
                          i % 2 === 0 ? "rounded-br-sm" : "rounded-bl-sm"
                        } bg-[rgb(var(--card2))]`}
                        style={{ width: `${120 + i * 30}px`, height: "36px" }}
                      />
                    </div>
                  ))}

                {messages.map((msg, i) => {
                  const isMe = msg.senderId === meId;
                  const isTemp = msg.id.startsWith("temp-");
                  const isLastMine = isMe && msg.id === lastMyMsgId;
                  const isSeen =
                    isLastMine &&
                    new Date(msg.createdAt).getTime() <= otherReadAtMs;

                  const showTime =
                    i === 0 ||
                    new Date(msg.createdAt).getTime() -
                      new Date(messages[i - 1].createdAt).getTime() >
                      5 * 60 * 1000;

                  return (
                    <React.Fragment key={msg.id}>
                      {showTime && (
                        <div className="flex justify-center py-2">
                          <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-0.5 text-[0.6rem] text-[rgb(var(--muted2))]">
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
                        className={`flex ${
                          isMe ? "justify-end" : "justify-start"
                        }`}
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
                          className={`group relative flex max-w-[68%] flex-col ${
                            isMe ? "items-end" : "items-start"
                          }`}
                        >
                          <div
                            className={`rounded-2xl px-3.5 py-2.5 text-[0.8rem] leading-relaxed shadow-sm ${
                              isMe
                                ? `rounded-br-sm bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white ${
                                    isTemp ? "opacity-60" : ""
                                  }`
                                : "rounded-bl-sm border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))]"
                            }`}
                          >
                            {msg.isDeleted ? (
                              <p className="text-[0.75rem] italic opacity-70">
                                Message deleted
                              </p>
                            ) : (
                              <>
                                {msg.text && (
                                  <p className="whitespace-pre-wrap break-words">
                                    {msg.text}
                                  </p>
                                )}

                                {!!msg.attachments?.length && (
                                  <div className="mt-2 space-y-2">
                                    {msg.attachments.map((a) => {
                                      const isImage = (a.contentType ?? "").startsWith("image/");
                                      const isPdf = a.contentType === "application/pdf";

                                      if (isImage && a.url) {
                                        return (
                                          <div key={a.id} className="overflow-hidden rounded-xl border border-white/10 bg-black/10">
                                            <button
                                              type="button"
                                              onClick={() => openImageInChat(a.url!)}
                                              className="block"
                                            >
                                              <Image
                                                src={a.url}
                                                alt={a.fileName}
                                                width={1200}
                                                height={800}
                                                className="h-auto max-h-72 w-auto max-w-full object-contain"
                                              />
                                            </button>

                                            <div className="flex items-center justify-between gap-2 px-2.5 py-2 text-[0.68rem]">
                                              <span className="truncate">{a.fileName}</span>
                                              <div className="flex items-center gap-1">
                                                <button
                                                  type="button"
                                                  onClick={() => openImageInChat(a.url!)}
                                                  className="rounded-lg border border-white/10 px-2 py-1 hover:bg-white/10"
                                                  title="Open"
                                                >
                                                  <IconOpen />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => forceDownload(a.url!, a.fileName)}
                                                  className="rounded-lg border border-white/10 px-2 py-1 hover:bg-white/10"
                                                  title="Download"
                                                >
                                                  <IconDownload />
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      }

                                      return (
                                        <div
                                          key={a.id}
                                          className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${
                                            isMe
                                              ? "border-white/10 bg-white/10"
                                              : "border-[rgb(var(--border))] bg-[rgb(var(--card2))]"
                                          }`}
                                        >
                                          <div className="flex min-w-0 items-center gap-2">
                                            {isPdf ? <IconPdf /> : <span>📎</span>}
                                            <div className="min-w-0">
                                              <p className="truncate text-[0.72rem] font-medium">
                                                {a.fileName}
                                              </p>
                                              <p className="text-[0.62rem] opacity-70">
                                                {Math.max(1, Math.round(a.sizeBytes / 1024))} KB
                                              </p>
                                            </div>
                                          </div>

                                          {a.url && (
                                            <button
                                              type="button"
                                              onClick={() => forceDownload(a.url!, a.fileName)}
                                              className="rounded-lg border border-current/10 px-2 py-1 hover:bg-white/10"
                                            >
                                              <IconDownload />
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
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
                            className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--muted))]"
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
                <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-[0.72rem] text-red-600 dark:text-red-400">
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
                      className="flex items-center gap-1.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2.5 py-1 text-[0.68rem] text-[rgb(var(--fg))]"
                    >
                      <span className="opacity-50">📎</span>
                      <span className="max-w-[180px] truncate">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => removePickedFile(idx)}
                        disabled={uploading}
                        className="opacity-40 transition hover:opacity-100"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-[rgb(var(--border))] bg-[rgb(var(--card))]/80 px-4 py-3">
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

                        if (typingStopTimer.current) {
                          clearTimeout(typingStopTimer.current);
                        }

                        typingStopTimer.current = setTimeout(() => {
                          void pingTyping(false);
                        }, 1200);
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
                    disabled={
                      inputDisabled || (!text.trim() && pickedFiles.length === 0)
                    }
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_4px_14px_rgba(124,58,237,0.35)] disabled:opacity-40 disabled:shadow-none"
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
          className="fixed z-50 min-w-[140px] overflow-hidden rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-3 py-2.5 text-left text-[0.75rem] text-red-600 transition hover:bg-red-500/10 dark:text-red-400"
            onClick={() => {
              deleteMessage(ctx.messageId!);
              setCtx((p) => ({ ...p, open: false, messageId: null }));
            }}
          >
            Delete
          </button>
        </div>
      )}

      {imgViewer.open && !!imgViewer.urls.length && (
        <div
          className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-sm"
          onClick={closeImageViewer}
        >
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-sm text-white"
              onClick={(e) => {
                e.stopPropagation();
                closeImageViewer();
              }}
            >
              Close
            </button>

            {imgViewer.urls.length > 1 && (
              <>
                <button
                  type="button"
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                >
                  ←
                </button>

                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                >
                  →
                </button>
              </>
            )}

            <div
              className="relative max-h-full max-w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => {
                setDragging(true);
                dragStart.current = {
                  x: e.clientX - offset.x,
                  y: e.clientY - offset.y,
                };
              }}
              onMouseMove={(e) => {
                if (!dragging || zoom <= 1) return;
                setOffset({
                  x: e.clientX - dragStart.current.x,
                  y: e.clientY - dragStart.current.y,
                });
              }}
              onMouseUp={() => setDragging(false)}
              onMouseLeave={() => setDragging(false)}
              onWheel={(e) => {
                e.preventDefault();
                setZoom((z) => Math.max(1, Math.min(4, z + (e.deltaY < 0 ? 0.2 : -0.2))));
              }}
            >
              <img
                src={imgViewer.urls[imgViewer.idx]}
                alt={prettyNameFromUrl(imgViewer.urls[imgViewer.idx])}
                className="max-h-[82vh] max-w-[92vw] select-none object-contain"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "default",
                }}
                draggable={false}
              />

              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
                  className="rounded px-2 py-0.5 hover:bg-white/10"
                >
                  −
                </button>
                <span>{Math.round(zoom * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(4, z + 0.2))}
                  className="rounded px-2 py-0.5 hover:bg-white/10"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1);
                    setOffset({ x: 0, y: 0 });
                  }}
                  className="rounded px-2 py-0.5 hover:bg-white/10"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
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