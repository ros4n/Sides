import Link from "next/link";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b-2 border-ink">
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-riso px-3 py-2 text-riso-ink"
        >
          <img src="/icons/icon.svg" alt="" className="size-7 border border-ink bg-paper p-0.5" />
          <span className="font-display text-lg font-extrabold uppercase tracking-tight">
            Sides
          </span>
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <p className="mb-3 font-display text-mini font-bold uppercase tracking-[0.24em] text-ink-soft">
            Members — inside cover
          </p>
          {children}
        </div>
      </main>
    </div>
  );
}
