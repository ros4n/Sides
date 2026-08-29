import type { Metadata } from "next";
import { requireProfile } from "@/lib/data";
import { NewEventForm } from "./_form";

export const metadata: Metadata = { title: "New game" };

export default async function NewEventPage() {
  await requireProfile();
  return (
    <div className="mx-auto max-w-2xl">
      <div className="clip stapled p-5 pt-6" style={{ ["--skew" as string]: "0.3deg" }}>
        <p className="tab -ml-5 -mt-6 mb-4 inline-block px-3 py-1 text-mini tracking-[0.16em]">
          Team sheet — fill this in
        </p>
        <h1 className="zine-head text-3xl sm:text-4xl">Start a game</h1>
        <p className="mt-1 font-mono text-note text-ink-soft">
          You&apos;re the admin. Add players and hand out shuffle rights once it&apos;s made.
        </p>
        <div className="mt-5">
          <NewEventForm />
        </div>
      </div>
    </div>
  );
}
