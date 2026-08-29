import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** A rubber-stamped tag. */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[2px] border-2 px-1.5 py-0.5 font-display text-micro font-extrabold uppercase leading-none tracking-[0.08em]",
  {
    variants: {
      variant: {
        default: "border-ink bg-transparent text-ink",
        riso: "border-ink bg-riso text-riso-ink",
        primary: "border-ink bg-riso text-riso-ink",
        accent: "border-t6 bg-transparent text-t6",
        alarm: "border-alarm bg-alarm text-ink",
        warning: "border-alarm bg-alarm text-ink",
        danger: "border-alarm bg-alarm text-ink",
        ink: "border-ink bg-ink text-paper",
        outline: "border-ink-soft bg-transparent text-ink-soft",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
