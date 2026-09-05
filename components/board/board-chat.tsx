"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { toast } from "sonner";
import { Megaphone, Send, X } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { ProfileLite } from "@/lib/friends";
import { displayName, firstName } from "@/lib/friends";
import { formatRelative } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type Typing = { name: string; at: number };
// How long a "typing" broadcast is trusted before it's pruned — covers a
// closed tab / lost network that never sent the stop_typing broadcast.
const TYPING_TTL = 4000;
// Pause after the last keystroke before we tell everyone else typing stopped.
const TYPING_STOP_DELAY = 2000;
// Floor between repeated "typing" broadcasts while someone keeps typing.
const TYPING_RESEND_INTERVAL = 1500;

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
  meName,
  adminIds,
  canPost,
  initialMessages,
  initialProfiles,
}: {
  eventId: string;
  meId: string;
  meName: string;
  adminIds: string[];
  /** false for a non-member who can only view the event. */
  canPost: boolean;
  initialMessages: BoardMessage[];
  initialProfiles: Record<string, ProfileLite>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const admins = useMemo(() => new Set(adminIds), [adminIds]);
  const canModerate = admins.has(meId); // event admin — may delete any message

  const [messages, setMessages] = useState<BoardMessage[]>(initialMessages);
  const [profiles, setProfiles] =
    useState<Record<string, ProfileLite>>(initialProfiles);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState<Record<string, Typing>>({});

  const listRef = useRef<HTMLDivElement | null>(null);
  const atBottom = useRef(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastTypingSentAt = useRef(0);
  const stopTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          // They just sent a message, so they're no longer "typing".
          setTyping((t) => {
            if (!t[row.user_id]) return t;
            const next = { ...t };
            delete next[row.user_id];
            return next;
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "event_messages" },
        (payload) => {
          const goneId = (payload.old as { id?: string }).id;
          if (goneId) setMessages((prev) => prev.filter((m) => m.id !== goneId));
        },
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.by === meId) return;
        setTyping((t) => ({ ...t, [payload.by]: { name: payload.name, at: Date.now() } }));
      })
      .on("broadcast", { event: "stop_typing" }, ({ payload }) => {
        setTyping((t) => {
          if (!t[payload.by]) return t;
          const next = { ...t };
          delete next[payload.by];
          return next;
        });
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      if (stopTypingTimer.current) clearTimeout(stopTypingTimer.current);
      channel.send({ type: "broadcast", event: "stop_typing", payload: { by: meId } });
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [supabase, eventId, meId, ensureProfiles]);

  // Prune a typing indicator whose stop_typing broadcast never arrived
  // (closed tab, dropped connection).
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      setTyping((prev) => {
        let changed = false;
        const next: Record<string, Typing> = {};
        for (const [id, v] of Object.entries(prev)) {
          if (now - v.at < TYPING_TTL) next[id] = v;
          else changed = true;
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const typingList = useMemo(() => Object.values(typing), [typing]);
  const typingLabel = useMemo(() => {
    if (typingList.length === 0) return null;
    if (typingList.length === 1) return `${firstName(typingList[0].name)} is typing`;
    if (typingList.length === 2)
      return `${firstName(typingList[0].name)} & ${firstName(typingList[1].name)} are typing`;
    return `${firstName(typingList[0].name)} +${typingList.length - 1} are typing`;
  }, [typingList]);

  function notifyTyping() {
    const channel = channelRef.current;
    if (!channel) return;
    const now = Date.now();
    if (now - lastTypingSentAt.current > TYPING_RESEND_INTERVAL) {
      lastTypingSentAt.current = now;
      channel.send({ type: "broadcast", event: "typing", payload: { by: meId, name: meName } });
    }
    if (stopTypingTimer.current) clearTimeout(stopTypingTimer.current);
    stopTypingTimer.current = setTimeout(() => {
      channelRef.current?.send({ type: "broadcast", event: "stop_typing", payload: { by: meId } });
    }, TYPING_STOP_DELAY);
  }

  function notifyStoppedTyping() {
    if (stopTypingTimer.current) {
      clearTimeout(stopTypingTimer.current);
      stopTypingTimer.current = null;
    }
    channelRef.current?.send({ type: "broadcast", event: "stop_typing", payload: { by: meId } });
  }

  function onChangeText(e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setText(value);
    if (value.trim()) notifyTyping();
    else notifyStoppedTyping();
  }

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
    notifyStoppedTyping();
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

  async function deleteMessage(id: string) {
    const prev = messages;
    setMessages((list) => list.filter((m) => m.id !== id)); // optimistic
    // RLS silently drops rows the caller isn't allowed to delete — no error,
    // just zero rows affected. .select() is the only way to see that, so
    // chain it and treat "nothing came back" as a failure, not a no-op.
    const { data, error } = await supabase
      .from("event_messages")
      .delete()
      .eq("id", id)
      .select("id");
    if (error) {
      setMessages(prev); // put it back
      toast.error(error.message);
    } else if (!data?.length) {
      setMessages(prev);
      toast.error("Couldn't delete that message — missing permission.");
    }
  }

  async function clearChat() {
    if (!messages.length) return;
    if (!confirm("Delete every message in this chat? This can't be undone.")) return;
    const prev = messages;
    setMessages([]); // optimistic
    const { data, error } = await supabase
      .from("event_messages")
      .delete()
      .eq("event_id", eventId)
      .select("id");
    if (error) {
      setMessages(prev);
      toast.error(error.message);
      return;
    }
    const deletedIds = new Set((data ?? []).map((r) => r.id));
    const survivors = prev.filter((m) => !deletedIds.has(m.id));
    if (survivors.length) {
      // Some rows weren't ours to delete (e.g. the admin-delete-any RLS
      // policy is missing in this environment) — don't claim success.
      setMessages(survivors);
      toast.error(
        deletedIds.size === 0
          ? "Nothing was deleted — you may be missing admin permissions for this event."
          : `Cleared ${deletedIds.size} of ${prev.length} messages — the rest couldn't be deleted.`,
      );
    } else {
      toast.success("Chat cleared");
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
        {canModerate && messages.length > 0 && (
          <button
            type="button"
            onClick={() => void clearChat()}
            className="font-display text-micro font-bold uppercase tracking-[0.12em] text-paper/70 underline underline-offset-2 hover:text-alarm"
          >
            Clear
          </button>
        )}
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
            const canDelete = canModerate || isMe;
            return (
              <div key={m.id} className="group flex items-start gap-2">
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
                {canDelete && (
                  <button
                    type="button"
                    aria-label="Delete message"
                    onClick={() => void deleteMessage(m.id)}
                    className="mt-0.5 shrink-0 rounded-[2px] p-0.5 text-ink-soft opacity-0 hover:bg-alarm hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {typingLabel && (
        <p className="flex items-center gap-1.5 border-t border-rule px-3 py-1 font-sans text-micro italic text-ink-soft">
          {typingLabel}
          <span className="flex items-end gap-0.5" aria-hidden="true">
            <span
              className="typing-dot size-1 rounded-full bg-ink-soft"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="typing-dot size-1 rounded-full bg-ink-soft"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="typing-dot size-1 rounded-full bg-ink-soft"
              style={{ animationDelay: "300ms" }}
            />
          </span>
          <span className="sr-only">…</span>
        </p>
      )}

      {canPost ? (
        <form
          onSubmit={send}
          className="flex items-center gap-2 border-t-2 border-ink px-3 py-2"
        >
          <input
            value={text}
            onChange={onChangeText}
            onBlur={notifyStoppedTyping}
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
