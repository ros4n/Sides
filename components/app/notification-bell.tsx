"use client";

import Link from "next/link";
import { Megaphone } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/format";
import {
  useNotifications,
  notificationHref,
} from "@/components/app/notifications-store";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { items, unread, markAllRead, markRead } = useNotifications();
  const recent = items.slice(0, 8);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative inline-flex size-9 items-center justify-center border-2 border-ink bg-paper hover:bg-paper-2"
          aria-label={`Stop press${unread ? `, ${unread} unread` : ""}`}
        >
          <Megaphone className="size-4" />
          {unread > 0 && (
            <span className="alarm-dot absolute -right-2 -top-2 flex min-w-[18px] items-center justify-center border border-ink bg-alarm px-1 font-display text-micro font-extrabold leading-none text-ink">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b-2 border-ink bg-ink px-3 py-1.5">
          <span className="font-display text-mini font-extrabold uppercase tracking-[0.16em] text-paper">
            Stop Press
          </span>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="font-mono text-mini text-paper underline underline-offset-2"
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {recent.length === 0 ? (
            <p className="px-3 py-8 text-center font-mono text-note text-ink-soft">
              Nothing filed yet.
            </p>
          ) : (
            recent.map((n) => (
              <Link
                key={n.id}
                href={notificationHref(n)}
                onClick={() => markRead(n.id)}
                className={cn(
                  "block border-b border-dashed border-rule px-3 py-2.5 last:border-0 hover:bg-paper",
                  !n.read_at && "bg-riso/10",
                )}
              >
                <div className="flex items-start gap-2">
                  {!n.read_at && (
                    <span className="mt-1.5 size-2 shrink-0 bg-alarm" />
                  )}
                  <div className={cn(n.read_at && "pl-4")}>
                    <p className="font-mono text-note font-bold text-ink">
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="font-mono text-note text-ink-soft">{n.body}</p>
                    )}
                    <p className="mt-0.5 font-mono text-micro uppercase tracking-wide text-ink-soft">
                      {formatRelative(n.created_at)}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
        <Link
          href="/notifications"
          className="block border-t-2 border-ink bg-paper-2 px-3 py-2 text-center font-display text-mini font-bold uppercase tracking-[0.12em] text-ink hover:bg-riso hover:text-riso-ink"
        >
          The whole column
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
