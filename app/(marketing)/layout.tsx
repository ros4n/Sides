import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/data";

export default async function MarketingLayout({ children }: LayoutProps<"/">) {
  const user = await getUser();
  const issueDate = format(new Date(), "MMMM yyyy").toUpperCase();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper">
        <div className="mx-auto flex w-full max-w-4xl items-stretch">
          <Link
            href="/"
            className="flex items-center gap-2 bg-riso px-3 py-2 text-riso-ink"
          >
            <img src="/icons/icon.svg" alt="" className="size-7 border border-ink bg-paper p-0.5" />
            <span className="font-display text-lg font-extrabold uppercase tracking-tight">
              Sides
            </span>
          </Link>
          <span className="hidden flex-1 items-center border-x-2 border-ink px-3 font-sans text-mini uppercase tracking-[0.2em] text-ink-soft sm:flex">
            Issue №1 · {issueDate}
          </span>
          <div className="flex flex-1 items-center justify-end gap-2 px-2 sm:flex-none">
            {user ? (
              <Button asChild size="sm">
                <Link href="/dashboard">Open</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/sign-up">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t-2 border-ink">
        <div className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-6 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-md font-sans text-mini text-ink-soft">
            Printed for pickup crews. Your games stay private by default —
            nobody outside the list can see one, find one, or know it happened.
          </p>
          <div className="shrink-0">
            <p className="font-display text-micro font-bold uppercase tracking-[0.18em] text-ink-soft">
              Meet the developers
            </p>
            <a
              href="https://github.com/ros4n"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-2 border-2 border-ink bg-paper-2 px-2.5 py-1 font-sans text-note font-bold text-ink transition-colors hover:bg-riso hover:text-riso-ink"
            >
              <svg
                viewBox="0 0 16 16"
                aria-hidden="true"
                className="size-4 fill-current"
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
              </svg>
              @ros4n
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
