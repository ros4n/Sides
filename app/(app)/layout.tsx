import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { requireProfile } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { ContentsStrip, BottomStrip } from "@/components/app/app-nav";
import { NotificationBell } from "@/components/app/notification-bell";
import { UserMenu } from "@/components/app/user-menu";
import { NotificationsProvider } from "@/components/app/notifications-store";

/**
 * This layout renders its shell synchronously — no top-level `await` on runtime
 * data — so `loading.tsx` paints instantly on navigation. The only piece that
 * needs the DB (the masthead avatar/menu) resolves inside its own <Suspense>,
 * and the notifications list is fetched client-side by NotificationsProvider.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  const issueDate = format(new Date(), "EEE d MMM yyyy").toUpperCase();

  return (
    <NotificationsProvider>
      <div className="flex min-h-dvh flex-col">
        {/* ---- Masthead ---- */}
        <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper">
          <div className="mx-auto flex w-full max-w-5xl items-stretch">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 bg-riso px-3 py-2 text-riso-ink"
            >
              <img src="/icons/icon.svg" alt="" className="size-7 border border-ink bg-paper p-0.5" />
              <span className="font-display text-lg uppercase leading-none tracking-tight">
                Sides
              </span>
            </Link>

            <div className="hidden flex-1 items-center justify-center border-x-2 border-ink px-3 sm:flex">
              <ContentsStrip />
            </div>

            <div className="flex flex-1 items-center justify-end gap-1.5 px-2 sm:flex-none">
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href="/events/new">
                  <Plus /> Start a game
                </Link>
              </Button>
              <NotificationBell />
              <Suspense fallback={<MastheadUserFallback />}>
                <MastheadUser />
              </Suspense>
            </div>
          </div>
          {/* stamped issue date */}
          <div className="mx-auto flex w-full max-w-5xl justify-end border-t border-dashed border-rule px-2 py-0.5">
            <span className="-rotate-1 border border-ink px-1.5 font-display text-micro font-bold uppercase tracking-[0.2em] text-ink-soft">
              {issueDate}
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-5 pb-28 sm:px-5 sm:pb-8">
          {children}
        </main>

        {/* ---- Floating stamp + bottom strip (mobile) ---- */}
        <Button asChild className="fixed bottom-16 right-4 z-40 sm:hidden">
          <Link href="/events/new" aria-label="Start a game">
            <Plus /> Start a game
          </Link>
        </Button>
        <BottomStrip />
      </div>
    </NotificationsProvider>
  );
}

/**
 * The one bit of the masthead that needs the DB. Also carries the onboarding
 * gate (`requireProfile` redirects to /onboarding) for the whole (app) segment,
 * including routes whose page body doesn't call it (e.g. /notifications).
 */
async function MastheadUser() {
  const { profile } = await requireProfile();
  const name = profile.display_name || profile.username || "Player";
  return (
    <UserMenu
      name={name}
      username={profile.username ?? ""}
      avatarUrl={profile.avatar_url}
    />
  );
}

function MastheadUserFallback() {
  return (
    <div
      className="size-[34px] shrink-0 animate-pulse border-2 border-ink bg-paper-2"
      aria-hidden
    />
  );
}
