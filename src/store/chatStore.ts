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

type MessageCache = Record<string, Msg[]>;
type CursorCache = Record<string, string | null>;
type LoadingByChannel = Record<string, boolean>;

type ChatState = {
  conversations: Conv[];
  messageCache: MessageCache;
  cursorCache: CursorCache;
  loadingByChannel: LoadingByChannel;
  convLoaded: boolean;
  prefetchedChannelIds: string[];

  setConversations: (convs: Conv[]) => void;
  upsertConversation: (conv: Conv) => void;
  patchConversation: (channelId: string, patch: Partial<Conv>) => void;

  setChannelLoading: (channelId: string, loading: boolean) => void;

  setMessages: (channelId: string, msgs: Msg[]) => void;
  mergeMessages: (channelId: string, msgs: Msg[]) => void;
  appendMessage: (channelId: string, msg: Msg) => void;
  patchMessage: (channelId: string, messageId: string, patch: Partial<Msg>) => void;
  replaceMessage: (channelId: string, tempId: string, realMsg: Msg) => void;
  removeMessage: (channelId: string, messageId: string) => void;

  setCursor: (channelId: string, cursor: string | null) => void;
  markRead: (channelId: string) => void;

  prefetch: () => Promise<void>;
};

function sortMsgs(arr: Msg[]) {
  return [...arr].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

function sortConvs(arr: Conv[]) {
  return [...arr].sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
  );
}

function mergeMsgArrays(existing: Msg[], incoming: Msg[]) {
  const map = new Map<string, Msg>();

  for (const msg of existing) {
    map.set(msg.id, msg);
  }

  for (const msg of incoming) {
    const prev = map.get(msg.id);
    map.set(msg.id, { ...(prev ?? {}), ...msg });
  }

  return sortMsgs(Array.from(map.values()));
}

function removeMatchingTemps(existing: Msg[], incoming: Msg[]) {
  const realMsgs = incoming.filter((m) => !m.id.startsWith("temp-"));
  if (!realMsgs.length) return existing;

  return existing.filter((ex) => {
    if (!ex.id.startsWith("temp-")) return true;

    return !realMsgs.some((real) => {
      const sameSender = ex.senderId === real.senderId;
      const sameText = (ex.text ?? "") === (real.text ?? "");
      const closeInTime =
        Math.abs(
          new Date(ex.createdAt).getTime() - new Date(real.createdAt).getTime()
        ) < 15000;

      return sameSender && sameText && closeInTime;
    });
  });
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messageCache: {},
  cursorCache: {},
  loadingByChannel: {},
  convLoaded: false,
  prefetchedChannelIds: [],

  setConversations: (convs) =>
    set({
      conversations: sortConvs(convs),
      convLoaded: true,
    }),

  upsertConversation: (conv) =>
    set((state) => {
      const existing = state.conversations.find((c) => c.id === conv.id);
      if (!existing) {
        return {
          conversations: sortConvs([...state.conversations, conv]),
        };
      }

      return {
        conversations: sortConvs(
          state.conversations.map((c) => (c.id === conv.id ? { ...c, ...conv } : c))
        ),
      };
    }),

  patchConversation: (channelId, patch) =>
    set((state) => ({
      conversations: sortConvs(
        state.conversations.map((c) =>
          c.id === channelId ? { ...c, ...patch } : c
        )
      ),
    })),

  setChannelLoading: (channelId, loading) =>
    set((state) => ({
      loadingByChannel: {
        ...state.loadingByChannel,
        [channelId]: loading,
      },
    })),

  setMessages: (channelId, msgs) =>
    set((state) => ({
      messageCache: {
        ...state.messageCache,
        [channelId]: sortMsgs(msgs),
      },
    })),

  mergeMessages: (channelId, incoming) =>
    set((state) => {
      const existing = state.messageCache[channelId] ?? [];
      const withoutTemps = removeMatchingTemps(existing, incoming);

      return {
        messageCache: {
          ...state.messageCache,
          [channelId]: mergeMsgArrays(withoutTemps, incoming),
        },
      };
    }),

  appendMessage: (channelId, msg) =>
    set((state) => {
      const existing = state.messageCache[channelId] ?? [];
      if (existing.some((m) => m.id === msg.id)) return state;

      const withoutTemps = removeMatchingTemps(existing, [msg]);

      return {
        messageCache: {
          ...state.messageCache,
          [channelId]: sortMsgs([...withoutTemps, msg]),
        },
      };
    }),

  patchMessage: (channelId, messageId, patch) =>
  set((state) => ({
    messageCache: {
      ...state.messageCache,
      [channelId]: sortMsgs(
        (state.messageCache[channelId] ?? []).map((m) =>
          m.id === messageId ? { ...m, ...patch } : m
        )
      ),
    },
  })),

replaceMessage: (channelId, tempId, realMsg) =>
  set((state) => {
    const existing = state.messageCache[channelId] ?? [];

    const filtered = existing.filter(
      (m) => m.id !== tempId && m.id !== realMsg.id
    );

    return {
      messageCache: {
        ...state.messageCache,
        [channelId]: sortMsgs([...filtered, { ...realMsg }]),
      },
    };
  }),

  removeMessage: (channelId, messageId) =>
    set((state) => ({
      messageCache: {
        ...state.messageCache,
        [channelId]: (state.messageCache[channelId] ?? []).filter(
          (m) => m.id !== messageId
        ),
      },
    })),

  setCursor: (channelId, cursor) =>
    set((state) => ({
      cursorCache: {
        ...state.cursorCache,
        [channelId]: cursor,
      },
    })),

  markRead: (channelId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === channelId ? { ...c, unread: 0 } : c
      ),
    })),

  prefetch: async () => {
    const convRes = await fetch("/api/chat/channels", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => null);

    if (!convRes?.ok) return;

    const convs: Conv[] = sortConvs(convRes.items ?? []);
    set({
      conversations: convs,
      convLoaded: true,
    });

    const topConvs = convs.slice(0, 3);

    await Promise.all(
      topConvs.map(async (conv) => {
        const already = get().messageCache[conv.id];
        if (already && already.length > 0) return;

        const msgRes = await fetch(
          `/api/chat/messages?channelId=${conv.id}&take=30`,
          { cache: "no-store" }
        )
          .then((r) => r.json())
          .catch(() => null);

        if (!msgRes?.ok) return;

        const msgs: Msg[] = sortMsgs((msgRes.items as Msg[]).slice().reverse());

        set((state) => ({
          messageCache: {
            ...state.messageCache,
            [conv.id]: msgs,
          },
          cursorCache: {
            ...state.cursorCache,
            [conv.id]: msgRes.nextCursor ?? null,
          },
          prefetchedChannelIds: state.prefetchedChannelIds.includes(conv.id)
            ? state.prefetchedChannelIds
            : [...state.prefetchedChannelIds, conv.id],
        }));
      })
    );
  },
}));