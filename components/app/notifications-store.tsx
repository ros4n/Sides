"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

export type Notification = Tables<"notifications">;

type Ctx = {
  items: Notification[];
  unread: number;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const NotificationsContext = createContext<Ctx | null>(null);

export function notificationHref(n: Notification): string {
  switch (n.type) {
    case "friend_request":
    case "friend_accepted":
      return "/friends";
    case "event_invite":
      return "/notifications";
    case "shuffle_committed":
      return n.event_id ? `/events/${n.event_id}/board` : "/dashboard";
    case "event_added":
    case "event_updated":
    case "event_cancelled":
    case "event_reminder":
      return n.event_id ? `/events/${n.event_id}` : "/dashboard";
    default:
      return "/notifications";
  }
}

export function NotificationsProvider({
  initialItems,
  initialUnread,
  children,
}: {
  /** Omit to have the provider fetch the list client-side on mount (keeps the
   *  server layout off the notifications query, so navigation isn't blocked). */
  initialItems?: Notification[];
  initialUnread?: number;
  children: React.ReactNode;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>(initialItems ?? []);
  const [unread, setUnread] = useState(initialUnread ?? 0);
  const [userId, setUserId] = useState<string | null>(null);
  const seen = useRef(new Set((initialItems ?? []).map((i) => i.id)));

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(40);
    if (data) {
      setItems(data);
      seen.current = new Set(data.map((d) => d.id));
      setUnread(data.filter((d) => !d.read_at).length);
    }
  }, [supabase]);

  // Resolve the signed-in user id client-side (the layout no longer passes it)
  // and, if the layout didn't hand us an initial list, pull it once on mount —
  // both kept off the server render so navigation isn't blocked.
  const needsHydration = useRef(initialItems === undefined);
  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getClaims().then(({ data }) => {
      if (!cancelled) setUserId(data?.claims?.sub ?? null);
    });
    if (needsHydration.current) {
      needsHydration.current = false;
      void refresh();
    }
    return () => {
      cancelled = true;
    };
  }, [supabase, refresh]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("notifications:me")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as Notification;
          if (seen.current.has(n.id)) return;
          seen.current.add(n.id);
          setItems((prev) => [n, ...prev].slice(0, 40));
          setUnread((u) => u + 1);
          toast(n.title, {
            description: n.body ?? undefined,
            action: {
              label: "View",
              onClick: () => router.push(notificationHref(n)),
            },
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, router]);

  const markAllRead = useCallback(async () => {
    setItems((prev) =>
      prev.map((i) => (i.read_at ? i : { ...i, read_at: new Date().toISOString() })),
    );
    setUnread(0);
    await supabase.rpc("mark_notifications_read", {});
  }, [supabase]);

  const markRead = useCallback(
    async (id: string) => {
      setItems((prev) =>
        prev.map((i) =>
          i.id === id && !i.read_at
            ? { ...i, read_at: new Date().toISOString() }
            : i,
        ),
      );
      setUnread((u) => Math.max(0, u - 1));
      await supabase.rpc("mark_notifications_read", { _ids: [id] });
    },
    [supabase],
  );

  const value = useMemo(
    () => ({ items, unread, markAllRead, markRead, refresh }),
    [items, unread, markAllRead, markRead, refresh],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx)
    throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
