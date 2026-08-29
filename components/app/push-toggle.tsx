"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  currentPushState,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push";

export function PushToggle() {
  const [state, setState] = useState<
    "loading" | "unsupported" | "denied" | "subscribed" | "unsubscribed"
  >("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    currentPushState().then(setState);
  }, []);

  async function toggle(next: boolean) {
    setBusy(true);
    try {
      if (next) {
        await subscribeToPush();
        setState("subscribed");
        toast.success("Push notifications on for this device");
      } else {
        await unsubscribeFromPush();
        setState("unsubscribed");
        toast.success("Push notifications off");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update push settings");
      setState(await currentPushState());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-[calc(var(--radius)-2px)] border border-border p-4">
      <div>
        <p className="font-medium">Push notifications</p>
        <p className="text-sm text-muted">
          {state === "unsupported"
            ? "This browser doesn't support push. On iOS, add the app to your Home Screen first (iOS 16.4+)."
            : state === "denied"
              ? "Blocked in your browser settings. Re-enable notifications for this site, then try again."
              : "Get invites, roster changes and reminders even when the app is closed. Enable per device."}
        </p>
      </div>
      <Switch
        checked={state === "subscribed"}
        disabled={busy || state === "loading" || state === "unsupported" || state === "denied"}
        onCheckedChange={toggle}
      />
    </div>
  );
}
