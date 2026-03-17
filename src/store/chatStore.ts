// src/store/chatStore.ts
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

type MessageCache = { [channelId: string]: Msg[] };
type CursorCache  = { [channelId: string]: string | null };

type ChatState = {
  conversations: Conv[];
  messageCache: MessageCache;
  cursorCache: CursorCache;
  convLoaded: boolean;
  prefetchedChannelId: string | null;

  // Global dedup set — shared by MessagingClient, ChatUnreadListener, CDC handlers.
  // Any component that processes a message ID should add it here first.
  // mergeMessages checks this before adding to the cache.
  processedMsgIds: Set<string>;

  setConversations: (convs: Conv[]) => void;

  // Returns true if the message was new (not already processed).
  // Automatically adds to processedMsgIds.
  mergeMessages: (channelId: string, msgs: Msg[]) => boolean;

  // Mark IDs as processed without merging (e.g. for optimistic temp messages)
  markProcessed: (ids: string[]) => void;

  // Remove IDs from processed set (e.g. when rolling back a failed send)
  unmarkProcessed: (ids: string[]) => void;

  setCursor: (channelId: string, cursor: string | null) => void;
  markRead: (channelId: string) => void;
  clearChannelMessages: (channelId: string) => void;
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
  processedMsgIds: new Set<string>(),

  setConversations: (convs) =>
    set({ conversations: sortedConvs(convs), convLoaded: true }),

  mergeMessages: (channelId, incoming) => {
    const state = get();
    let hasNew = false;

    // Filter to only messages we haven't processed yet
    const newMsgs = incoming.filter((m) => {
      if (state.processedMsgIds.has(m.id)) return false;
      hasNew = true;
      return true;
    });

    if (!hasNew) return false;

    // Add all incoming IDs to processedMsgIds (including already-processed ones
    // passed in, to ensure the set stays complete)
    const updatedProcessed = new Set(state.processedMsgIds);
    for (const m of incoming) updatedProcessed.add(m.id);

    const existing = state.messageCache[channelId] ?? [];

    // Strip matching temp messages when real ones arrive
    const tempsToRemove = new Set<string>();
    for (const m of newMsgs) {
      if (!m.id.startsWith("temp-")) {
        for (const ex of existing) {
          if (
            ex.id.startsWith("temp-") &&
            ex.senderId === m.senderId &&
            ex.text === m.text
          ) {
            tempsToRemove.add(ex.id);
          }
        }
      }
    }

    const filtered = existing.filter((m) => !tempsToRemove.has(m.id));
    const map = new Map(filtered.map((m) => [m.id, m]));
    for (const m of newMsgs) map.set(m.id, { ...(map.get(m.id) ?? {}), ...m });

    set({
      processedMsgIds: updatedProcessed,
      messageCache: {
        ...state.messageCache,
        [channelId]: sortedMsgs(Array.from(map.values())),
      },
    });

    return true;
  },

  markProcessed: (ids) => {
    const updated = new Set(get().processedMsgIds);
    for (const id of ids) updated.add(id);
    set({ processedMsgIds: updated });
  },

  unmarkProcessed: (ids) => {
    const updated = new Set(get().processedMsgIds);
    for (const id of ids) updated.delete(id);
    set({ processedMsgIds: updated });
  },

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
    const convRes = await fetch("/api/chat/channels", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => null);

    if (!convRes?.ok) return;

    const convs: Conv[] = sortedConvs(convRes.items ?? []);
    set({ conversations: convs, convLoaded: true });

    const topConv = convs[0];
    if (!topConv) return;

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

    // Mark prefetched messages as processed
    const updatedProcessed = new Set(get().processedMsgIds);
    for (const m of msgs) updatedProcessed.add(m.id);

    set((state) => ({
      processedMsgIds: updatedProcessed,
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