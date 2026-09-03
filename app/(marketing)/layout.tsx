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
        <div className="mx-auto max-w-4xl px-4 py-6 font-sans text-mini text-ink-soft">
          Printed for pickup crews. Your games stay private by default —
          nobody outside the list can see one, find one, or know it happened.
        </div>
      </footer>
    </div>
  );
}
