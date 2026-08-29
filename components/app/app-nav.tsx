"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Front page" },
  { href: "/events", label: "Fixtures" },
  { href: "/friends", label: "Crew" },
  { href: "/settings", label: "Small print" },
];

function useActive(href: string) {
  const pathname = usePathname();
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop: a contents strip butted along the masthead. */
export function ContentsStrip() {
  return (
    <nav className="flex items-stretch divide-x-2 divide-ink border-2 border-ink">
      {links.map((l) => (
        <StripLink key={l.href} {...l} />
      ))}
    </nav>
  );
}

function StripLink({ href, label }: { href: string; label: string }) {
  const active = useActive(href);
  return (
    <Link
      href={href}
      className={cn(
        "px-3 py-1.5 font-display text-mini font-bold uppercase tracking-[0.1em] transition-colors",
        active ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper-2 hover:text-ink",
      )}
    >
      {label}
    </Link>
  );
}

/** Mobile: contents strip pinned to the bottom edge of the page. */
export function BottomStrip() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t-2 border-ink bg-paper pb-[env(safe-area-inset-bottom)] sm:hidden">
      {links.map((l) => (
        <BottomLink key={l.href} {...l} />
      ))}
    </nav>
  );
}

function BottomLink({ href, label }: { href: string; label: string }) {
  const active = useActive(href);
  return (
    <Link
      href={href}
      className={cn(
        "border-r-2 border-ink py-2 text-center font-display text-micro font-bold uppercase leading-tight tracking-[0.06em] last:border-r-0",
        active ? "bg-ink text-paper" : "text-ink-soft",
      )}
    >
      {label}
    </Link>
  );
}
