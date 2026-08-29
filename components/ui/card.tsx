import * as React from "react";
import { cn } from "@/lib/utils";

/** A photocopied clipping. Pass `stapled` for a corner staple. */
export function Card({
  className,
  stapled,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { stapled?: boolean }) {
  return (
    <div
      className={cn("clip", stapled && "stapled", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "font-display text-xl font-extrabold uppercase leading-none tracking-tight text-ink",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("font-mono text-note text-ink-soft", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center p-4 pt-0", className)} {...props} />;
}
