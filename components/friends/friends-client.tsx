"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, UserPlus, UserMinus, Search, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/misc";
import { displayName, type FriendEntry, type ProfileLite } from "@/lib/friends";

export function FriendsClient({
  meId,
  initialFriends,
  initialIncoming,
  initialOutgoing,
}: {
  meId: string;
  initialFriends: FriendEntry[];
  initialIncoming: FriendEntry[];
  initialOutgoing: FriendEntry[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [pending, start] = useTransition();

  useEffect(() => {
    const ch = supabase
      .channel("friendships:me")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships" },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, router]);

  function run(fn: () => PromiseLike<{ error: unknown }>, ok: string) {
    start(async () => {
      const res = await fn();
      if (res && res.error) {
        toast.error(
          String((res.error as { message?: string })?.message ?? res.error),
        );
      } else {
        toast.success(ok);
        router.refresh();
      }
    });
  }

  return (
    <Tabs defaultValue="friends" className="space-y-4">
      <TabsList>
        <TabsTrigger value="friends">Friends ({initialFriends.length})</TabsTrigger>
        <TabsTrigger value="requests">
          Requests ({initialIncoming.length})
        </TabsTrigger>
        <TabsTrigger value="find">Find people</TabsTrigger>
      </TabsList>

      <TabsContent value="friends" className="space-y-2">
        {initialFriends.length === 0 ? (
          <EmptyState
            title="No friends yet"
            description="Find people by username and send a request."
          />
        ) : (
          initialFriends.map((f) => (
            <Row key={f.friendshipId} profile={f.other}>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(
                    () =>
                      supabase
                        .from("friendships")
                        .delete()
                        .eq("id", f.friendshipId),
                    "Friend removed",
                  )
                }
              >
                <UserMinus /> Remove
              </Button>
            </Row>
          ))
        )}
      </TabsContent>

      <TabsContent value="requests" className="space-y-4">
        <section className="space-y-2">
          <h3 className="font-display text-mini font-bold uppercase tracking-widest text-ink-soft">Incoming</h3>
          {initialIncoming.length === 0 ? (
            <p className="text-sm text-muted">No incoming requests.</p>
          ) : (
            initialIncoming.map((f) => (
              <Row key={f.friendshipId} profile={f.other}>
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () =>
                        supabase.rpc("respond_friend_request", {
                          _friendship: f.friendshipId,
                          _accept: true,
                        }),
                      "You're now friends",
                    )
                  }
                >
                  <Check /> Accept
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () =>
                        supabase.rpc("respond_friend_request", {
                          _friendship: f.friendshipId,
                          _accept: false,
                        }),
                      "Request declined",
                    )
                  }
                >
                  <X /> Decline
                </Button>
              </Row>
            ))
          )}
        </section>
        <section className="space-y-2">
          <h3 className="font-display text-mini font-bold uppercase tracking-widest text-ink-soft">Sent</h3>
          {initialOutgoing.length === 0 ? (
            <p className="text-sm text-muted">No pending sent requests.</p>
          ) : (
            initialOutgoing.map((f) => (
              <Row key={f.friendshipId} profile={f.other}>
                <span className="inline-flex items-center gap-1 text-xs text-muted">
                  <Clock className="size-3.5" /> Pending
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () =>
                        supabase
                          .from("friendships")
                          .delete()
                          .eq("id", f.friendshipId),
                      "Request cancelled",
                    )
                  }
                >
                  Cancel
                </Button>
              </Row>
            ))
          )}
        </section>
      </TabsContent>

      <TabsContent value="find">
        <FindPeople meId={meId} disabled={pending} onChanged={() => router.refresh()} />
      </TabsContent>
    </Tabs>
  );
}

function Row({
  profile,
  children,
}: {
  profile: ProfileLite;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-2 border-ink bg-paper p-2.5">
      <Avatar name={displayName(profile)} src={profile.avatar_url} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono font-bold">{displayName(profile)}</p>
        <p className="truncate text-sm text-muted">@{profile.username}</p>
      </div>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}

function FindPeople({
  meId,
  disabled,
  onChanged,
}: {
  meId: string;
  disabled: boolean;
  onChanged: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ProfileLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<Set<string>>(new Set());

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .ilike("username", `%${term}%`)
        .neq("id", meId)
        .limit(10);
      if (!cancelled) {
        setResults(data ?? []);
        setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, supabase, meId]);

  async function add(id: string) {
    const { error } = await supabase.rpc("send_friend_request", { _to: id });
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent((s) => new Set(s).add(id));
    toast.success("Request sent");
    onChanged();
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by username"
          className="pl-9"
        />
      </div>
      {loading && <p className="text-sm text-muted">Searching…</p>}
      {!loading && q.trim().length >= 2 && results.length === 0 && (
        <p className="text-sm text-muted">No matches.</p>
      )}
      {results.map((p) => (
        <Row key={p.id} profile={p}>
          <Button
            size="sm"
            disabled={disabled || sent.has(p.id)}
            onClick={() => add(p.id)}
          >
            <UserPlus /> {sent.has(p.id) ? "Sent" : "Add"}
          </Button>
        </Row>
      ))}
    </div>
  );
}
