import * as React from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin", className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "halftone animate-pulse rounded-[2px] border border-rule bg-paper-2",
        className,
      )}
    />
  );
}

/** A blank ruled slot — "pin something here". */
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center border-2 border-dashed border-ink/40 bg-paper px-6 py-12 text-center">
      {icon ? <div className="mb-2 text-ink-soft [&_svg]:size-7">{icon}</div> : null}
      <p className="font-display text-base font-extrabold uppercase tracking-wide text-ink">
        {title}
      </p>
      {description ? (
        <p className="mt-1 max-w-sm font-mono text-note text-ink-soft">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p className="flex items-start gap-1.5 border-2 border-alarm bg-alarm/10 px-2 py-1 font-mono text-note text-ink">
      <X className="mt-0.5 size-3.5 shrink-0 stroke-[3] text-alarm" />
      <span>{children}</span>
    </p>
  );
}
