import type { Metadata } from "next";

export const metadata: Metadata = { title: "Press stopped" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <img src="/icons/icon.svg" alt="" className="size-16 border-2 border-ink" />
      <h1 className="zine-head text-4xl">Press stopped</h1>
      <p className="max-w-sm font-sans text-note text-ink-soft">
        No connection. Live team sheets and notices need one — reconnect and this
        page reloads itself.
      </p>
    </div>
  );
}
