import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Users, Shuffle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatEventDate } from "@/lib/format";
import type { ProfileLite } from "@/lib/friends";
import { EventDetailClient } from "@/components/events/event-detail-client";
import { JoinInviteBanner } from "@/components/events/join-invite-banner";
import { VisStamp } from "@/components/events/vis-stamp";

export async function generateMetadata({
  params,
}: PageProps<"/events/[id]">): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("title")
    .eq("id", id)
    .maybeSingle();
  return { title: data?.title ?? "Event" };
}

export default async function EventPage({ params }: PageProps<"/events/[id]">) {
  const { id } = await params;
  const { user } = await requireProfile();
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!event) notFound();

  const [{ data: memberRows }, { data: inviteRows }, { data: myInvite }] =
    await Promise.all([
      supabase
        .from("event_members")
        .select("user_id, role, can_shuffle, can_invite, joined_at")
        .eq("event_id", id)
        .order("joined_at", { ascending: true }),
      supabase
        .from("event_invites")
        .select("id, role, invitee_id, status")
        .eq("event_id", id)
        .eq("status", "pending"),
      supabase
        .from("event_invites")
        .select("id, role")
        .eq("event_id", id)
        .eq("invitee_id", user.id)
        .eq("status", "pending")
        .maybeSingle(),
    ]);

  const members = memberRows ?? [];
  const invites = inviteRows ?? [];
  const me = members.find((m) => m.user_id === user.id);
  const isMember = Boolean(me);

  // Profiles for members + invitees.
  const ids = Array.from(
    new Set([
      ...members.map((m) => m.user_id),
      ...invites.map((i) => i.invitee_id),
    ]),
  );
  const profiles = new Map<string, ProfileLite>();
  if (ids.length) {
    const { data: ps } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", ids);
    for (const p of ps ?? []) profiles.set(p.id, p);
  }

  const canInvite = Boolean(me?.role === "admin" || me?.can_invite);
  let friendsNotIn: ProfileLite[] = [];
  if (canInvite) {
    const { data: fr } = await supabase
      .from("friendships")
      .select("user_low, user_high")
      .eq("status", "accepted");
    const friendIds = (fr ?? [])
      .map((r) => (r.user_low === user.id ? r.user_high : r.user_low))
      .filter((fid) => !members.some((m) => m.user_id === fid))
      .filter((fid) => !invites.some((i) => i.invitee_id === fid));
    if (friendIds.length) {
      const { data: fps } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", friendIds);
      friendsNotIn = fps ?? [];
    }
  }


  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/events"
          className="font-mono text-mini uppercase tracking-widest text-ink-soft hover:underline"
        >
          ‹ Back to fixtures
        </Link>
        <div className="mt-2 border-y-2 border-ink py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="zine-head text-4xl sm:text-5xl">{event.title}</h1>
                {event.status === "cancelled" && <Badge variant="alarm">Called off</Badge>}
                {event.status === "live" && <Badge variant="riso">Live now</Badge>}
                {event.status === "done" && <Badge>Full time</Badge>}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-note text-ink-soft">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4" />
                  {formatEventDate(event.starts_at)} · {event.duration_min} min
                </span>
                {event.venue && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-4" />
                    {event.venue}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-4" />
                  {event.team_count} × {event.players_per_team}
                </span>
                <VisStamp visibility={event.visibility} size="sm" />
              </div>
            </div>

            {(isMember || myInvite) && (
              <Button asChild>
                <Link href={`/events/${event.id}/board`}>
                  <Shuffle /> Team sheet
                </Link>
              </Button>
            )}
          </div>
        </div>
        {event.description && (
          <p className="mt-4 whitespace-pre-wrap font-mono text-note leading-relaxed text-ink">
            {event.description}
          </p>
        )}
      </div>

      {!isMember && myInvite && (
        <JoinInviteBanner inviteId={myInvite.id} role={myInvite.role} />
      )}

      <EventDetailClient
        event={event}
        meId={user.id}
        myRole={me?.role ?? null}
        isCreator={event.creator_id === user.id}
        canInvite={canInvite}
        members={members.map((m) => ({
          ...m,
          profile: profiles.get(m.user_id) ?? null,
        }))}
        invites={invites.map((i) => ({
          id: i.id,
          role: i.role,
          profile: profiles.get(i.invitee_id) ?? null,
        }))}
        friendsNotIn={friendsNotIn}
      />
    </div>
  );
}
