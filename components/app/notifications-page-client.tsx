"use client";

import Link from "next/link";
import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format";
import {
  useNotifications,
  notificationHref,
} from "@/components/app/notifications-store";

export function NotificationsPageClient() {
  const { items, unread, markAllRead, markRead } = useNotifications();
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [pending, start] = useTransition();

  function respondInvite(inviteId: string, accept: boolean) {
    start(async () => {
      const { error } = await supabase.rpc("respond_event_invite", {
        _invite: inviteId,
        _accept: accept,
      });
      if (error) toast.error(error.message);
      else {
        toast.success(accept ? "You're in" : "Invite declined");
        router.refresh();
      }
    });
  }

  if (items.length === 0) {
    return (
      <EmptyState icon={<Bell />} title="No notifications yet" description="Invites, roster changes and reminders will show up here." />
    );
  }

  return (
    <div className="space-y-3">
      {unread > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <Check /> Mark all read
          </Button>
        </div>
      )}
      <ul className="divide-y divide-dashed divide-rule border-2 border-ink">
        {items.map((n) => {
          const inviteId =
            n.type === "event_invite"
              ? ((n.data as Record<string, unknown>)?.invite_id as string | undefined)
              : undefined;
          return (
            <li
              key={n.id}
              className={cn("flex gap-3 p-4", !n.read_at && "bg-primary/[0.05]")}
            >
              <span
                className={cn(
                  "mt-1.5 size-2 shrink-0",
                  n.read_at ? "bg-transparent" : "bg-primary",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="font-mono font-bold">{n.title}</p>
                {n.body && <p className="text-sm text-muted">{n.body}</p>}
                <p className="mt-1 text-xs text-muted">{formatRelative(n.created_at)}</p>

                {inviteId ? (
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={() => respondInvite(inviteId, true)}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => respondInvite(inviteId, false)}
                    >
                      Decline
                    </Button>
                  </div>
                ) : (
                  <Link
                    href={notificationHref(n)}
                    onClick={() => markRead(n.id)}
                    className="mt-1 inline-block font-mono text-note font-bold text-riso underline underline-offset-4"
                  >
                    Open
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
