"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { toast } from "sonner";
import { Megaphone, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ProfileLite } from "@/lib/friends";
import { displayName } from "@/lib/friends";
import { formatRelative } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type BoardMessage = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
};

const MAX = 500;

export function BoardChat({
  eventId,
  meId,
  adminIds,
  canPost,
  initialMessages,
  initialProfiles,
}: {
  eventId: string;
  meId: string;
  adminIds: string[];
  /** false for a non-member who can only view the event. */
  canPost: boolean;
  initialMessages: BoardMessage[];
  initialProfiles: Record<string, ProfileLite>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const admins = useMemo(() => new Set(adminIds), [adminIds]);

  const [messages, setMessages] = useState<BoardMessage[]>(initialMessages);
  const [profiles, setProfiles] =
    useState<Record<string, ProfileLite>>(initialProfiles);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const atBottom = useRef(true);

  const ensureProfiles = useCallback(
    async (ids: string[]) => {
      const missing = [...new Set(ids)].filter((id) => !profiles[id]);
      if (!missing.length) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", missing);
      if (data?.length) {
        setProfiles((p) => {
          const next = { ...p };
          for (const row of data) next[row.id] = row;
          return next;
        });
      }
    },
    [profiles, supabase],
  );

  // Keep the log pinned to the newest message unless the reader scrolled up.
  useEffect(() => {
    const el = listRef.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "event_messages",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const row = payload.new as BoardMessage;
          setMessages((prev) =>
            prev.some((m) => m.id === row.id) ? prev : [...prev, row],
          );
          void ensureProfiles([row.user_id]);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, eventId, ensureProfiles]);

  function onScroll() {
    const el = listRef.current;
    if (!el) return;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    if (body.length > MAX) {
      toast.error(`Keep it under ${MAX} characters.`);
      return;
    }
    setSending(true);
    setText("");
    atBottom.current = true;
    try {
      const { data, error } = await supabase
        .from("event_messages")
        .insert({ event_id: eventId, user_id: meId, body })
        .select("id, user_id, body, created_at")
        .single();
      if (error) throw error;
      if (data) {
        setMessages((prev) =>
          prev.some((m) => m.id === data.id) ? prev : [...prev, data],
        );
      }
    } catch (err) {
      setText(body); // give it back so nothing is lost
      toast.error(
        err instanceof Error ? err.message : "Message didn't send",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="stapled relative border-2 border-ink bg-paper-2">
      <header className="flex items-center gap-2 border-b-2 border-ink bg-ink px-3 py-1.5">
        <Megaphone className="size-3.5 text-paper" />
        <span className="font-display text-mini font-extrabold uppercase tracking-[0.16em] text-paper">
          Touchline
        </span>
        <span className="ml-auto font-sans text-micro text-paper/70">
          {messages.length ? `${messages.length} message${messages.length === 1 ? "" : "s"}` : "quiet"}
        </span>
      </header>

      <div
        ref={listRef}
        onScroll={onScroll}
        className="max-h-72 min-h-24 space-y-2.5 overflow-y-auto px-3 py-2.5"
      >
        {messages.length === 0 ? (
          <p className="py-6 text-center font-sans text-mini uppercase tracking-widest text-ink-soft">
            Say something while the teams sort out
          </p>
        ) : (
          messages.map((m) => {
            const p = profiles[m.user_id];
            const name = p ? displayName(p) : "Someone";
            const isMe = m.user_id === meId;
            const isAdmin = admins.has(m.user_id);
            return (
              <div key={m.id} className="flex items-start gap-2">
                <Avatar
                  name={name}
                  src={p?.avatar_url}
                  size={24}
                  plain
                  className="mt-0.5 border border-ink"
                />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-1.5">
                    <span
                      className={cn(
                        "font-sans text-note font-bold",
                        isAdmin ? "text-riso" : "text-ink",
                      )}
                    >
                      {isMe ? "You" : name}
                    </span>
                    {isAdmin && (
                      <span className="border border-riso px-1 font-display text-micro font-bold uppercase leading-none tracking-[0.1em] text-riso">
                        admin
                      </span>
                    )}
                    <span className="font-sans text-micro text-ink-soft">
                      {formatRelative(m.created_at)}
                    </span>
                  </p>
                  <p className="whitespace-pre-wrap break-words font-sans text-note text-ink">
                    {m.body}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {canPost ? (
        <form
          onSubmit={send}
          className="flex items-center gap-2 border-t-2 border-ink px-3 py-2"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX}
            placeholder="Message the crew…"
            className="h-9 flex-1 border-0 border-b-2 border-ink bg-transparent px-1 font-sans text-note text-ink placeholder:text-ink-soft focus-visible:border-riso focus-visible:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            aria-label="Send"
            className="inline-flex h-9 items-center gap-1.5 border-2 border-ink bg-paper px-3 font-display text-mini font-bold uppercase tracking-wide text-ink hover:bg-riso hover:text-riso-ink disabled:opacity-45"
          >
            <Send className="size-3.5" /> Send
          </button>
        </form>
      ) : (
        <p className="border-t-2 border-ink px-3 py-2 font-sans text-mini text-ink-soft">
          Only people on this game can post here.
        </p>
      )}
    </section>
  );
}
