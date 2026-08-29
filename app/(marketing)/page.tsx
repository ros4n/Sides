import Link from "next/link";
import { Shuffle, Lock, Users, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const contents = [
  {
    n: "01",
    icon: Shuffle,
    title: "Teams built live",
    body: "Drag names between two ruled columns. Everyone allowed to watch sees it move, and you can see who's holding which slip.",
  },
  {
    n: "02",
    icon: Lock,
    title: "Private by default",
    body: "Every game is crew-only. People off the list can't see it, search it, or know it happened. That's the database, not a checkbox.",
  },
  {
    n: "03",
    icon: Users,
    title: "Your crew, on file",
    body: "Add the people you play with once. Organisers pull players into a specific game straight from that list.",
  },
  {
    n: "04",
    icon: Megaphone,
    title: "Nobody misses kickoff",
    body: "Invites, roster changes and 'starting soon' land as in-app notices and background push — for the right people, only them.",
  },
];

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-4xl px-4">
      {/* ---- Cover ---- */}
      <section className="border-b-2 border-ink py-12 sm:py-16">
        <p className="zine-hand text-2xl text-ink">— for the crowd that never sorts sides in time</p>
        <h1 className="zine-head mt-2 text-[15vw] leading-[0.86] sm:text-8xl">
          <span className="inline-block -rotate-1 bg-riso px-2 text-riso-ink">Run your</span>
          <br />
          crowd&apos;s games
          <br />
          <span className="text-ink-soft">without the</span>
          <br />
          group-chat
        </h1>
        <p className="mt-5 max-w-md font-mono text-note leading-relaxed text-ink">
          Pick a slot, invite the right people, and build balanced sides together
          on a board that updates for everyone watching. Then show up.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/sign-up">Start a game</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/sign-in">I&apos;m already in</Link>
          </Button>
        </div>
      </section>

      {/* ---- Proof: a team sheet in motion ---- */}
      <section className="border-b-2 border-ink py-10">
        <h2 className="zine-head text-3xl">This is the whole thing</h2>
        <div className="mt-4 border-2 border-ink bg-alarm/15 px-3 py-1.5">
          <span className="font-display text-mini font-extrabold uppercase tracking-[0.14em]">
            Stop press —
          </span>{" "}
          <span className="font-mono text-note font-bold">
            Casey is shuffling the teams
          </span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            [1, ["Alex", "Priya", "Marco", "Sam", "Deb"]],
            [2, ["Bailey", "Jules", "Ren", "Kofi", "Nia"]],
          ].map(([no, players]) => (
            <div key={no as number} className="border-2 border-ink bg-paper-2">
              <p className="flex items-baseline gap-1.5 bg-riso px-2 py-1 text-riso-ink">
                <span className="zine-hand text-xl leading-none">{no as number}</span>
                <span className="font-display text-mini font-extrabold uppercase tracking-[0.16em]">
                  Team
                </span>
              </p>
              <ul className="ruled px-2 py-1.5 font-mono text-note">
                {(players as string[]).map((p) => (
                  <li key={p} className="my-1 border-2 border-ink bg-paper px-2 py-0.5">
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Contents ---- */}
      <section className="py-10">
        <h2 className="zine-head text-3xl">What&apos;s in this issue</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {contents.map((c, i) => (
            <article
              key={c.n}
              className="clip stapled p-3 pt-4"
              style={{ ["--skew" as string]: `${(i % 2 ? 1 : -1) * (0.4 + (i % 3) * 0.25)}deg` }}
            >
              <p className="tab -ml-3 -mt-4 mb-2 inline-flex items-center gap-1.5 px-2 py-0.5 text-micro tracking-[0.14em] text-paper">
                <c.icon className="size-3.5" /> {c.n}
              </p>
              <h3 className="zine-head text-xl">{c.title}</h3>
              <p className="mt-1 font-mono text-note leading-relaxed text-ink-soft">
                {c.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t-2 border-ink py-10">
        <p className="zine-hand text-xl text-ink">install it like an app · works offline</p>
        <Button asChild size="lg" className="mt-3">
          <Link href="/sign-up">Get the crew on it</Link>
        </Button>
      </section>
    </div>
  );
}
