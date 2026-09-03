import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getEventById, requireProfile } from "@/lib/data";
import type { ProfileLite } from "@/lib/friends";
import { ShuffleBoard } from "@/components/board/shuffle-board";

export const metadata: Metadata = { title: "Shuffle board" };

export default async function BoardPage({
  params,
}: PageProps<"/events/[id]/board">) {
  const { id } = await params;
  const { user, profile } = await requireProfile();
  const supabase = await createClient();

  // All keyed by the route param — one round, not the event first then the rest.
  const [event, { data: me }, { data: assignments }, { data: state }] =
    await Promise.all([
      getEventById(id),
      supabase
        .from("event_members")
        .select("role, can_shuffle")
        .eq("event_id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("team_assignments")
        .select("user_id, team_index, slot")
        .eq("event_id", id),
      supabase
        .from("shuffle_state")
        .select("version, active_editor_id, editor_expires_at")
        .eq("event_id", id)
        .maybeSingle(),
    ]);
  if (!event) notFound();

  const rows = assignments ?? [];
  const ids = rows.map((r) => r.user_id);
  const profiles: Record<string, ProfileLite> = {};
  if (ids.length) {
    const { data: ps } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", ids);
    for (const p of ps ?? []) profiles[p.id] = p;
  }

  const canShuffle = me?.role === "admin" || me?.can_shuffle === true;

  return (
    <div className="space-y-4">
      <Link
        href={`/events/${event.id}`}
        className="inline-flex items-center gap-1 font-mono text-mini uppercase tracking-widest text-ink-soft hover:underline"
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
    </div>
  );
}
