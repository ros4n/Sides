"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Shield,
  Trash2,
  UserPlus,
  X,
  Search,
  MoreVertical,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import type { ProfileLite } from "@/lib/friends";
import { displayName } from "@/lib/friends";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditEventDialog } from "@/components/events/edit-event-dialog";
import {
  deleteEventAction,
  setEventStatusAction,
} from "@/app/(app)/events/actions";

type MemberRow = {
  user_id: string;
  role: string;
  can_shuffle: boolean;
  can_invite: boolean;
  profile: ProfileLite | null;
};
type InviteRow = { id: string; role: string; profile: ProfileLite | null };

export function EventDetailClient({
  event,
  meId,
  myRole,
  isCreator,
  canInvite,
  members,
  invites,
  friendsNotIn,
}: {
  event: Tables<"events">;
  meId: string;
  myRole: string | null;
  isCreator: boolean;
  canInvite: boolean;
  members: MemberRow[];
  invites: InviteRow[];
  friendsNotIn: ProfileLite[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const isAdmin = myRole === "admin";
  const [pending, start] = useTransition();

  useEffect(() => {
    const ch = supabase
      .channel(`event-detail:${event.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_members", filter: `event_id=eq.${event.id}` },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_invites", filter: `event_id=eq.${event.id}` },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, event.id, router]);

  function act(p: PromiseLike<{ error: unknown }>, ok: string) {
    start(async () => {
      const res = await p;
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
    <div className="space-y-6">
      {isAdmin && (
        <div className="flex flex-wrap items-center gap-2 border-2 border-ink bg-paper-2 p-3">
          <span className="mr-1 font-display text-mini font-bold uppercase tracking-widest text-ink-soft">Admin</span>
          <EditEventDialog event={event} />
          <select
            value={event.status}
            onChange={(e) =>
              start(async () => {
                try {
                  await setEventStatusAction(
                    event.id,
                    e.target.value as "scheduled" | "live" | "done" | "cancelled",
                  );
                  toast.success("Status updated");
                  router.refresh();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed");
                }
              })
            }
            className="h-8 px-2 text-sm"
          >
            <option value="scheduled">Scheduled</option>
            <option value="live">Live</option>
            <option value="done">Finished</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {isCreator && (
            <Button
              variant="ghost"
              size="sm"
              className="text-alarm"
              disabled={pending}
              onClick={() => {
                if (confirm("Delete this game for everyone? This cannot be undone."))
                  start(() => deleteEventAction(event.id));
              }}
            >
              <Trash2 /> Delete
            </Button>
          )}
        </div>
      )}

      {/* Roster */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">
            Roster · {members.filter((m) => m.role !== "watcher").length} players
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.map((m) => {
            const name = m.profile ? displayName(m.profile) : "Unknown";
            const isEventCreator = m.user_id === event.creator_id;
            return (
              <div
                key={m.user_id}
                className="flex flex-wrap items-center gap-3 border-2 border-ink bg-paper p-2.5"
              >
                <Avatar name={name} src={m.profile?.avatar_url} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono font-bold">
                    {name}
                    {m.user_id === meId && (
                      <span className="text-muted"> (you)</span>
                    )}
                  </p>
                  <p className="truncate text-sm text-muted">
                    @{m.profile?.username ?? "—"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={m.role === "admin" ? "ink" : m.role === "watcher" ? "outline" : "riso"}>
                    {m.role}
                  </Badge>
                  {m.can_shuffle && m.role !== "admin" && (
                    <Badge variant="outline">can shuffle</Badge>
                  )}
                  {m.can_invite && m.role !== "admin" && (
                    <Badge variant="outline">can invite</Badge>
                  )}
                </div>

                {isAdmin && !isEventCreator && (
                  <MemberMenu
                    member={m}
                    disabled={pending}
                    onRole={(role) =>
                      act(
                        supabase.rpc("update_event_member", {
                          _event: event.id,
                          _user: m.user_id,
                          _role: role,
                        }),
                        "Role updated",
                      )
                    }
                    onToggle={(field, value) =>
                      act(
                        supabase.rpc("update_event_member", {
                          _event: event.id,
                          _user: m.user_id,
                          ...(field === "can_shuffle"
                            ? { _can_shuffle: value }
                            : { _can_invite: value }),
                        }),
                        "Permissions updated",
                      )
                    }
                    onRemove={() =>
                      act(
                        supabase.rpc("remove_event_member", {
                          _event: event.id,
                          _user: m.user_id,
                        }),
                        "Removed from game",
                      )
                    }
                  />
                )}
              </div>
            );
          })}

          {myRole && !isCreator && (
            <Button
              variant="ghost"
              size="sm"
              className="text-alarm"
              disabled={pending}
              onClick={() =>
                act(
                  supabase.rpc("remove_event_member", {
                    _event: event.id,
                    _user: meId,
                  }),
                  "You left the game",
                )
              }
            >
              Leave game
            </Button>
          )}
        </CardContent>
      </Card>

      {canInvite && (
        <InvitePanel
          eventId={event.id}
          meId={meId}
          invites={invites}
          friendsNotIn={friendsNotIn}
          disabled={pending}
          onAct={act}
        />
      )}
    </div>
  );
}

function MemberMenu({
  member,
  disabled,
  onRole,
  onToggle,
  onRemove,
}: {
  member: MemberRow;
  disabled: boolean;
  onRole: (role: string) => void;
  onToggle: (field: "can_shuffle" | "can_invite", value: boolean) => void;
  onRemove: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" disabled={disabled}>
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Role</DropdownMenuLabel>
        {["player", "watcher", "admin"].map((r) => (
          <DropdownMenuItem
            key={r}
            onSelect={() => onRole(r)}
            className={member.role === r ? "font-semibold text-primary" : ""}
          >
            {r === "admin" && <Shield />} {r}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-2 py-1.5 text-sm">
          <span>Can shuffle</span>
          <Switch
            checked={member.role === "admin" || member.can_shuffle}
            disabled={member.role === "admin"}
            onCheckedChange={(v) => onToggle("can_shuffle", v)}
          />
        </div>
        <div className="flex items-center justify-between px-2 py-1.5 text-sm">
          <span>Can invite</span>
          <Switch
            checked={member.role === "admin" || member.can_invite}
            disabled={member.role === "admin"}
            onCheckedChange={(v) => onToggle("can_invite", v)}
          />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-alarm" onSelect={onRemove}>
          <Trash2 /> Remove from game
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function InvitePanel({
  eventId,
  meId,
  invites,
  friendsNotIn,
  disabled,
  onAct,
}: {
  eventId: string;
  meId: string;
  invites: InviteRow[];
  friendsNotIn: ProfileLite[];
  disabled: boolean;
  onAct: (p: PromiseLike<{ error: unknown }>, ok: string) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ProfileLite[]>([]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return setResults([]);
    let cancelled = false;
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .ilike("username", `%${term}%`)
        .neq("id", meId)
        .limit(8);
      if (!cancelled) setResults(data ?? []);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, supabase, meId]);

  function invite(userId: string, role: "player" | "watcher") {
    onAct(
      supabase.rpc("invite_to_event", {
        _event: eventId,
        _invitee: userId,
        _role: role,
      }),
      "Invite sent",
    );
  }

  const pickList = q.trim().length >= 2 ? results : friendsNotIn;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Invite people</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by username, or pick a friend below"
            className="pl-9"
          />
        </div>

        <div className="space-y-2">
          {pickList.length === 0 ? (
            <p className="text-sm text-muted">
              {q.trim().length >= 2 ? "No matches." : "No friends left to add."}
            </p>
          ) : (
            pickList.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 border-2 border-ink bg-paper p-2"
              >
                <Avatar name={displayName(p)} src={p.avatar_url} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-note font-bold">{displayName(p)}</p>
                  <p className="truncate text-xs text-muted">@{p.username}</p>
                </div>
                <Button size="sm" variant="outline" disabled={disabled} onClick={() => invite(p.id, "player")}>
                  <UserPlus /> Player
                </Button>
                <Button size="sm" variant="ghost" disabled={disabled} onClick={() => invite(p.id, "watcher")}>
                  Watcher
                </Button>
              </div>
            ))
          )}
        </div>

        {invites.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted">Pending invites</p>
            {invites.map((i) => (
              <div
                key={i.id}
                className="flex items-center gap-3 border-2 border-dashed border-ink p-2"
              >
                <Avatar
                  name={i.profile ? displayName(i.profile) : "?"}
                  src={i.profile?.avatar_url}
                  size={30}
                />
                <span className="flex-1 truncate text-sm">
                  @{i.profile?.username ?? "—"} · {i.role}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={disabled}
                  onClick={() =>
                    onAct(
                      supabase.rpc("revoke_event_invite", { _invite: i.id }),
                      "Invite revoked",
                    )
                  }
                >
                  <X /> Revoke
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
