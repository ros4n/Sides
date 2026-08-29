"use client";

import { createClient } from "@/lib/supabase/client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function getRegistration() {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export async function subscribeToPush() {
  if (!pushSupported()) throw new Error("Push is not supported on this device.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission denied.");

  const reg = await getRegistration();
  await navigator.serviceWorker.ready;

  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapid) throw new Error("Missing VAPID public key.");

  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid),
    }));

  const json = sub.toJSON();
  const supabase = createClient();
  const { error } = await supabase.rpc("save_push_subscription", {
    _endpoint: sub.endpoint,
    _p256dh: json.keys?.p256dh ?? "",
    _auth: json.keys?.auth ?? "",
    _user_agent: navigator.userAgent,
  });
  if (error) throw error;
  return sub;
}

export async function unsubscribeFromPush() {
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  const supabase = createClient();
  await supabase.rpc("delete_push_subscription", { _endpoint: endpoint });
}

export async function currentPushState(): Promise<
  "unsupported" | "denied" | "subscribed" | "unsubscribed"
> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "subscribed" : "unsubscribed";
}
