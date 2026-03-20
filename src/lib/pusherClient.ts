// src/lib/pusherClient.ts
import PusherJS from "pusher-js";

declare global {
  // eslint-disable-next-line no-var
  var _pusherClient: PusherJS | undefined;
}

function createPusherClient() {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!key || !cluster) {
    throw new Error(
      "Missing Pusher env vars: NEXT_PUBLIC_PUSHER_KEY, NEXT_PUBLIC_PUSHER_CLUSTER"
    );
  }

  return new PusherJS(key, {
    cluster,
    authEndpoint: "/api/chat/pusher-auth",
    // Sends cookies so the auth route can call supabase.auth.getUser()
    authTransport: "ajax",
    auth: {
      headers: { "Content-Type": "application/json" },
    },
  });
}

// Reuse across hot-reloads in dev
export function getPusherClient(): PusherJS {
  if (typeof window === "undefined") {
    throw new Error("getPusherClient() called on the server");
  }
  if (!globalThis._pusherClient) {
    globalThis._pusherClient = createPusherClient();
  }
  return globalThis._pusherClient;
}