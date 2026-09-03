import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, MapPin, Clock, Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { EventCard } from "@/components/events/event-card";
import { VisStamp } from "@/components/events/vis-stamp";
import { formatEventDate } from "@/lib/format";
import { displayName, type ProfileLite } from "@/lib/friends";

export const metadata: Metadata = { title: "Front page" };

export default async function DashboardPage() {
  const { user, profile } = await requireProfile();
  const supabase = await createClient();
  const cutoff = Date.now() - 3 * 60 * 60 * 1000;

  const [{ data: memberships }, { count: unread }] = await Promise.all([
    supabase
      .from("event_members")
      .select(
        "role, event:events(id, title, venue, starts_at, visibility, status, team_count, players_per_team)",
      )
      .eq("user_id", user.id),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null),
  ]);

  const upcoming = (memberships ?? [])
    .flatMap((m) => (m.event ? [{ ...m.event, role: m.role }] : []))
    .filter(
      (e) => e.status !== "cancelled" && new Date(e.starts_at).getTime() >= cutoff,
    )
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  const [next, ...rest] = upcoming;

  // Roster preview for the lead game.
  let lead: { pool: string[]; teams: string[][] } | null = null;
  if (next) {
    const { data: rows } = await supabase
      .from("team_assignments")
      .select("user_id, team_index, slot")
      .eq("event_id", next.id);
    const ids = (rows ?? []).map((r) => r.user_id);
    const profiles = new Map<string, ProfileLite>();
    if (ids.length) {
      const { data: ps } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", ids);
      for (const p of ps ?? []) profiles.set(p.id, p);
    }
    const teams: string[][] = Array.from({ length: next.team_count }, () => []);
    const pool: string[] = [];
    for (const r of (rows ?? []).sort((a, b) => (a.slot ?? 99) - (b.slot ?? 99))) {
      const nm = profiles.get(r.user_id)
        ? displayName(profiles.get(r.user_id)!)
        : "—";
      if (r.team_index === null || r.team_index >= next.team_count) pool.push(nm);
      else teams[r.team_index].push(nm);
    }
    lead = { pool, teams };
  }

  return (
    <div className="space-y-8">
      <p className="zine-hand text-2xl text-ink">
        Alright, {profile.display_name || profile.username}.
      </p>

      {/* ---- NEXT UP ---- */}
      <section>
        <h1 className="zine-head text-[13vw] leading-[0.86] sm:text-6xl">
          <span className="inline-block -rotate-1 bg-riso px-2 text-riso-ink">Next</span>{" "}
          up
        </h1>
        <div className="mt-3 border-t-2 border-ink pt-4">
          {!next ? (
            <EmptyState
              title="Nothing pinned"
              description="Start a game and pull your crew in, or wait to be added to one."
              action={
                <Button asChild>
                  <Link href="/events/new">
                    <CalendarPlus /> Start a game
                  </Link>
                </Button>
              }
            />
          ) : (
            <NextClip event={next} lead={lead} />
          )}
        </div>
      </section>

      {/* ---- ALSO ON + STOP PRESS ---- */}
      {(rest.length > 0 || (unread ?? 0) > 0) && (
        <section>
          <h2 className="zine-head text-2xl">Also on</h2>
          <div className="mt-3 grid gap-3 border-t-2 border-ink pt-4 sm:grid-cols-2">
            {rest.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
            <Link
              href="/notifications"
              className="clip stapled flex flex-col justify-between p-3 pt-4 transition-transform hover:-translate-y-0.5"
            >
              <div>
                <span className="tab -ml-3 -mt-4 mb-2 inline-flex items-center gap-1.5 px-2 py-0.5 text-micro tracking-[0.14em] text-paper">
                  <Megaphone className="size-3" /> Stop press
                </span>
                <p className="zine-head text-xl">
                  {(unread ?? 0) > 0 ? `${unread} new notice${unread === 1 ? "" : "s"}` : "All caught up"}
                </p>
                <p className="mt-1 font-sans text-note text-ink-soft">
                  Invites, roster changes and kickoff reminders.
                </p>
              </div>
              {(unread ?? 0) > 0 && (
                <span className="alarm-dot mt-3 inline-block size-3 self-start bg-alarm" />
              )}
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function NextClip({
  event,
  lead,
}: {
  event: {
    id: string;
    title: string;
    venue: string | null;
    starts_at: string;
    visibility: string;
    team_count: number;
    players_per_team: number;
    role: string | null;
  };
  lead: { pool: string[]; teams: string[][] } | null;
}) {
  return (
    <article
      className="clip stapled taped mx-auto max-w-2xl p-4 pt-6"
      style={{ ["--skew" as string]: "-0.5deg" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="zine-head text-3xl sm:text-4xl">{event.title}</h3>
        <VisStamp visibility={event.visibility} />
      </div>

      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 border-y border-dashed border-rule py-2 font-mono text-note">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3.5" /> {formatEventDate(event.starts_at)}
        </span>
        {event.venue && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5" /> {event.venue}
          </span>
        )}
        <span>
          {event.team_count} × {event.players_per_team}
        </span>
      </div>

      {lead && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {lead.teams.map((names, i) => (
            <div key={i} className="border-2 border-ink">
              <p className="flex items-baseline gap-1.5 bg-riso px-2 py-0.5 text-riso-ink">
                <span className="zine-hand text-xl leading-none">{i + 1}</span>
                <span className="font-display text-micro font-extrabold uppercase tracking-[0.14em]">
                  Team
                </span>
              </p>
              <ul className="ruled min-h-24 px-2 py-1 font-mono text-note">
                {names.length === 0 ? (
                  <li className="text-ink-soft">—</li>
                ) : (
                  names.map((n, k) => <li key={k}>{n}</li>)
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
      {lead && lead.pool.length > 0 && (
        <p className="mt-2 font-sans text-note text-ink-soft">
          <span className="font-display font-bold uppercase tracking-wide text-ink">
            Not picked:{" "}
          </span>
          {lead.pool.join(", ")}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <Button asChild size="sm">
          <Link href={`/events/${event.id}/board`}>Open team sheet</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/events/${event.id}`}>Match page</Link>
        </Button>
      </div>
    </article>
  );
}
