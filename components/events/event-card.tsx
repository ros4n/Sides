import Link from "next/link";
import { MapPin } from "lucide-react";
import { formatEventDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { VisStamp } from "@/components/events/vis-stamp";

export type EventCardData = {
  id: string;
  title: string;
  venue: string | null;
  starts_at: string;
  visibility: string;
  status: string;
  team_count: number;
  players_per_team: number;
  role?: string | null;
  member_count?: number | null;
};

export function EventCard({ event }: { event: EventCardData }) {
  const cancelled = event.status === "cancelled";

  return (
    <Link href={`/events/${event.id}`} className="group block">
      <article
        className={cn(
          "clip stapled p-3 pt-4 transition-transform group-hover:-translate-y-0.5",
          cancelled && "struck",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="zine-head text-xl leading-tight">{event.title}</h3>
          <VisStamp visibility={event.visibility} size="sm" />
        </div>

        <p className="mt-1 font-sans text-note font-bold text-ink">
          {formatEventDate(event.starts_at)}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-mini text-ink-soft">
          {event.venue && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" /> {event.venue}
            </span>
          )}
          <span>
            {event.team_count} × {event.players_per_team}
          </span>
          {event.role && (
            <span className="border border-ink px-1 font-display text-micro font-bold uppercase tracking-wide">
              {event.role}
            </span>
          )}
        </div>

        {(cancelled || event.status === "live") && (
          <span
            className={cn(
              "mt-2 inline-block border-2 px-1 font-display text-micro font-extrabold uppercase tracking-widest",
              cancelled ? "border-alarm bg-alarm text-ink" : "border-ink bg-riso text-riso-ink",
            )}
          >
            {cancelled ? "Called off" : "Live now"}
          </span>
        )}
      </article>
    </Link>
  );
}
