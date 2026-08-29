// Delivers a Web Push for a notification row.
//
// Invoked by the `notifications_dispatch_push` trigger with
//   { "notification_id": "<uuid>" }
// or manually with
//   { "user_id": "<uuid>", "title": "...", "body": "...", "url": "/..." }
//
// Env (Supabase injects the first two automatically):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

const PATH_BY_TYPE = (eventId: string | null, type: string) => {
  if (type === "friend_request" || type === "friend_accepted") return "/friends";
  if (type === "shuffle_committed" && eventId) return `/events/${eventId}/board`;
  if (eventId) return `/events/${eventId}`;
  return "/notifications";
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return new Response(JSON.stringify({ skipped: "no VAPID keys configured" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  let userId: string | null = (payload.user_id as string) ?? null;
  let title = (payload.title as string) ?? "Sides";
  let body = (payload.body as string) ?? "";
  let url = (payload.url as string) ?? "/notifications";
  let tag: string | undefined;

  if (payload.notification_id) {
    const { data: n, error } = await admin
      .from("notifications")
      .select("user_id, type, title, body, event_id")
      .eq("id", payload.notification_id)
      .single();
    if (error || !n) return new Response("notification not found", { status: 404 });
    userId = n.user_id;
    title = n.title;
    body = n.body ?? "";
    url = PATH_BY_TYPE(n.event_id, n.type);
    tag = `${n.type}:${n.event_id ?? ""}`;
  }

  if (!userId) return new Response("missing user_id", { status: 400 });

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const notifPayload = JSON.stringify({ title, body, url, tag, data: { url } });
  let sent = 0;
  const dead: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          notifPayload,
        );
        sent++;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) dead.push(s.id);
      }
    }),
  );

  if (dead.length) {
    await admin.from("push_subscriptions").delete().in("id", dead);
  }

  return new Response(JSON.stringify({ sent, pruned: dead.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
