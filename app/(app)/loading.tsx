/**
 * Instant loading state for every `(app)` route. Rendered from the server shell
 * the moment a navigation starts, while the page's own data streams in.
 */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-8" aria-busy="true" aria-label="Loading">
      <div className="h-4 w-40 bg-paper-2" />

      <section>
        <div className="h-[13vw] max-h-16 w-56 -rotate-1 bg-riso/40 sm:w-72" />
        <div className="mt-3 border-t-2 border-ink pt-4">
          <div className="mx-auto max-w-2xl border-2 border-ink/40 p-4 pt-6">
            <div className="h-8 w-2/3 bg-paper-2" />
            <div className="mt-3 h-3 w-full border-y border-dashed border-rule py-2" />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="h-28 border-2 border-ink/30 bg-paper-2/50" />
              <div className="h-28 border-2 border-ink/30 bg-paper-2/50" />
            </div>
            <div className="mt-4 flex gap-2">
              <div className="h-8 w-32 bg-ink/20" />
              <div className="h-8 w-28 border-2 border-ink/30" />
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="h-6 w-28 bg-paper-2" />
        <div className="mt-3 grid gap-3 border-t-2 border-ink pt-4 sm:grid-cols-2">
          <div className="h-24 border-2 border-ink/30 bg-paper-2/40" />
          <div className="h-24 border-2 border-ink/30 bg-paper-2/40" />
        </div>
      </section>
    </div>
  );
}
