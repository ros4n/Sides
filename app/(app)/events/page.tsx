import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatEventDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Fixtures" };

type Row = {
  id: string;
  title: string;
  venue: string | null;
  starts_at: string;
  status: string;
  team_count: number;
  players_per_team: number;
  role: string | null;
};

export default async function EventsPage() {
  const { user } = await requireProfile();
  const supabase = await createClient();

  // Independent queries — fire together instead of one after the other.
  const [{ data: events }, { data: myMemberships }] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id, title, venue, starts_at, visibility, status, team_count, players_per_team, creator_id",
      )
      .order("starts_at", { ascending: true }),
    supabase.from("event_members").select("event_id, role").eq("user_id", user.id),
  ]);
  const roleByEvent = new Map((myMemberships ?? []).map((m) => [m.event_id, m.role]));

  const now = Date.now();
  const all: Row[] = (events ?? []).map((e) => ({
    ...e,
    role: roleByEvent.get(e.id) ?? (e.creator_id === user.id ? "admin" : null),
  }));
  const upcoming = all.filter(
    (e) => new Date(e.starts_at).getTime() >= now - 3 * 3600_000 && e.status !== "cancelled",
  );
  const past = all
    .filter(
      (e) => new Date(e.starts_at).getTime() < now - 3 * 3600_000 || e.status === "cancelled",
    )
    .reverse();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-3">
        <h1 className="zine-head text-4xl sm:text-5xl">Fixtures</h1>
        <Button asChild size="sm">
          <Link href="/events/new">
            <CalendarPlus /> New game
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Coming up · {upcoming.length}</TabsTrigger>
          <TabsTrigger value="past">Played · {past.length}</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
          <FixtureTable rows={upcoming} empty="Nothing on the fixture list yet." />
        </TabsContent>
        <TabsContent value="past">
          <FixtureTable rows={past} empty="No games played yet." />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FixtureTable({ rows, empty }: { rows: Row[]; empty: string }) {
  if (rows.length === 0) return <EmptyState title={empty} />;
  return (
    <div className="overflow-x-auto border-2 border-ink">
      <table className="w-full border-collapse font-mono text-note">
        <thead>
          <tr className="bg-ink text-paper">
            {["Date", "Game", "Venue", "Format", "You"].map((h) => (
              <th
                key={h}
                className="border-r border-paper/25 px-2 py-1 text-left font-display text-micro font-bold uppercase tracking-[0.12em] last:border-r-0"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.id}
              className={cn(
                "border-t border-dashed border-rule",
                i % 2 ? "bg-paper-2/40" : "",
                r.status === "cancelled" && "struck",
              )}
            >
              <td className="whitespace-nowrap px-2 py-1.5 align-top font-bold">
                <Link href={`/events/${r.id}`} className="hover:underline">
                  {formatEventDate(r.starts_at)}
                </Link>
              </td>
              <td className="px-2 py-1.5 align-top">
                <Link href={`/events/${r.id}`} className="hover:underline">
                  {r.title}
                </Link>
                {r.status === "live" && (
                  <span className="ml-1 border border-ink bg-riso px-1 font-display text-micro font-extrabold uppercase text-riso-ink">
                    Live
                  </span>
                )}
              </td>
              <td className="px-2 py-1.5 align-top text-ink-soft">{r.venue ?? "—"}</td>
              <td className="whitespace-nowrap px-2 py-1.5 align-top text-ink-soft">
                {r.team_count} × {r.players_per_team}
              </td>
              <td className="px-2 py-1.5 align-top">
                {r.role ? (
                  <span className="border border-ink px-1 font-display text-micro font-bold uppercase">
                    {r.role}
                  </span>
                ) : (
                  <span className="text-ink-soft">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
