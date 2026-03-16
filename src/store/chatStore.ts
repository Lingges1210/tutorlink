// src/store/chatStore.ts
//
// Global Zustand store for chat state.
// - Conversations are fetched in the background as soon as the user is known.
// - Messages for the most-recent conversation are pre-fetched too.
// - MessagingClient reads from this store on mount so the page is instant.
// - The store is the single source of truth; MessagingClient writes back into
//   it via the same actions (mergeMessages, setConversations, etc.)

import { create } from "zustand";

export type Attachment = {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  url: string | null;
  createdAt: string;
};

export type Msg = {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
  isDeleted?: boolean;
  deletedAt?: string | null;
  attachments?: Attachment[];
};

export type Conv = {
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

type MessageCache = {
  // channelId → sorted message array
  [channelId: string]: Msg[];
};

type CursorCache = {
  // channelId → nextCursor (null means no more pages)
  [channelId: string]: string | null;
};

type ChatState = {
  // ── data ──────────────────────────────────────────────────────────────────
  conversations: Conv[];
  messageCache: MessageCache;
  cursorCache: CursorCache;

  // ── loading flags ─────────────────────────────────────────────────────────
  convLoaded: boolean;         // true once first conversations fetch completes
  prefetchedChannelId: string | null; // which channel's messages are pre-cached

  // ── actions ───────────────────────────────────────────────────────────────
  setConversations: (convs: Conv[]) => void;
  mergeMessages: (channelId: string, msgs: Msg[]) => void;
  setCursor: (channelId: string, cursor: string | null) => void;
  markRead: (channelId: string) => void;
  clearChannelMessages: (channelId: string) => void;

  // ── background fetch ──────────────────────────────────────────────────────
  prefetch: () => Promise<void>;
};

function sortedMsgs(arr: Msg[]) {
  return [...arr].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

function sortedConvs(arr: Conv[]) {
  return [...arr].sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
  );
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messageCache: {},
  cursorCache: {},
  convLoaded: false,
  prefetchedChannelId: null,

  setConversations: (convs) =>
    set({ conversations: sortedConvs(convs), convLoaded: true }),

  mergeMessages: (channelId, incoming) =>
    set((state) => {
      const existing = state.messageCache[channelId] ?? [];
      const map = new Map(existing.map((m) => [m.id, m]));
      for (const m of incoming) map.set(m.id, { ...(map.get(m.id) ?? {}), ...m });
      return {
        messageCache: {
          ...state.messageCache,
          [channelId]: sortedMsgs(Array.from(map.values())),
        },
      };
    }),

  setCursor: (channelId, cursor) =>
    set((state) => ({
      cursorCache: { ...state.cursorCache, [channelId]: cursor },
    })),

  markRead: (channelId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === channelId ? { ...c, unread: 0 } : c
      ),
    })),

  clearChannelMessages: (channelId) =>
    set((state) => {
      const next = { ...state.messageCache };
      delete next[channelId];
      return { messageCache: next };
    }),

  prefetch: async () => {
    // 1. Fetch conversations
    const convRes = await fetch("/api/chat/channels", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => null);

    if (!convRes?.ok) return;

    const convs: Conv[] = sortedConvs(convRes.items ?? []);
    set({ conversations: convs, convLoaded: true });

    // 2. Pre-fetch messages for the most recent conversation only
    const topConv = convs[0];
    if (!topConv) return;

    // Skip if we already have messages cached for this channel
    const already = get().messageCache[topConv.id];
    if (already && already.length > 0) return;

    const msgRes = await fetch(
      `/api/chat/messages?channelId=${topConv.id}&take=30`,
      { cache: "no-store" }
    )
      .then((r) => r.json())
      .catch(() => null);

    if (!msgRes?.ok) return;

    const msgs: Msg[] = (msgRes.items as Msg[]).slice().reverse();
    set((state) => ({
      messageCache: {
        ...state.messageCache,
        [topConv.id]: sortedMsgs(msgs),
      },
      cursorCache: {
        ...state.cursorCache,
        [topConv.id]: msgRes.nextCursor ?? null,
      },
      prefetchedChannelId: topConv.id,
    }));
  },
}));