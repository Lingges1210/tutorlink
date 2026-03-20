// src/lib/pusher.ts
import PusherServer from "pusher";

declare global {
  // eslint-disable-next-line no-var
  var _pusherServer: PusherServer | undefined;
}

function createPusherServer() {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!appId || !key || !secret || !cluster) {
    throw new Error(
      "Missing Pusher env vars: PUSHER_APP_ID, NEXT_PUBLIC_PUSHER_KEY, PUSHER_SECRET, NEXT_PUBLIC_PUSHER_CLUSTER"
    );
  }

  return new PusherServer({ appId, key, secret, cluster, useTLS: true });
}

export const pusherServer: PusherServer =
  globalThis._pusherServer ?? (globalThis._pusherServer = createPusherServer());