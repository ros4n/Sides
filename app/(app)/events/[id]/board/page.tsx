import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getEventById, requireProfile } from "@/lib/data";
import type { ProfileLite } from "@/lib/friends";
import { ShuffleBoard } from "@/components/board/shuffle-board";
import { BoardChat, type BoardMessage } from "@/components/board/board-chat";

export const metadata: Metadata = { title: "Shuffle board" };

export default async function BoardPage({
  params,
}: PageProps<"/events/[id]/board">) {
  const { id } = await params;
  const { user, profile } = await requireProfile();
  const supabase = await createClient();

  // All keyed by the route param — one round, not the event first then the rest.
  const [
    event,
    { data: members },
    { data: assignments },
    { data: state },
    { data: messageRows },
  ] = await Promise.all([
    getEventById(id),
    supabase.from("event_members").select("user_id, role, can_shuffle").eq("event_id", id),
    supabase
      .from("team_assignments")
      .select("user_id, team_index, slot")
      .eq("event_id", id),
    supabase
      .from("shuffle_state")
      .select("version, active_editor_id, editor_expires_at")
      .eq("event_id", id)
      .maybeSingle(),
    supabase
      .from("event_messages")
      .select("id, user_id, body, created_at")
      .eq("event_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (!event) notFound();

  const me = (members ?? []).find((m) => m.user_id === user.id) ?? null;
  const adminIds = (members ?? [])
    .filter((m) => m.role === "admin")
    .map((m) => m.user_id);
  const messages: BoardMessage[] = (messageRows ?? []).slice().reverse();

  const rows = assignments ?? [];
  const ids = new Set<string>([
    ...rows.map((r) => r.user_id),
    ...messages.map((m) => m.user_id),
  ]);
  const profiles: Record<string, ProfileLite> = {};
  if (ids.size) {
    const { data: ps } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", [...ids]);
    for (const p of ps ?? []) profiles[p.id] = p;
  }

  const canShuffle =
    me?.role === "admin" ||
    me?.can_shuffle === true ||
    (event.everyone_can_shuffle && !!me && me.role !== "watcher");

  return (
    <div className="space-y-4">
      <Link
        href={`/events/${event.id}`}
        className="inline-flex items-center gap-1 font-sans text-mini uppercase tracking-widest text-ink-soft hover:underline"
      >
        <ChevronLeft className="size-4" /> {event.title}
      </Link>

      <ShuffleBoard
        eventId={event.id}
        teamCount={event.team_count}
        playersPerTeam={event.players_per_team}
        canShuffle={canShuffle}
        meId={user.id}
        meName={profile.display_name || profile.username || "You"}
        meAvatarUrl={profile.avatar_url}
        initialAssignments={rows}
        initialProfiles={profiles}
        initialVersion={state?.version ?? 0}
        initialEditorId={state?.active_editor_id ?? null}
        initialEditorExpiresAt={state?.editor_expires_at ?? null}
      />

      <BoardChat
        eventId={event.id}
        meId={user.id}
        meName={profile.display_name || profile.username || "You"}
        adminIds={adminIds}
        canPost={Boolean(me)}
        initialMessages={messages}
        initialProfiles={profiles}
      />
    </div>
  );
}
