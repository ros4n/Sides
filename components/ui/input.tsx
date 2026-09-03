import * as React from "react";
import { cn } from "@/lib/utils";

/** A fill-in-the-blank line: no box, just a ruled underline on paper. */
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "block h-10 w-full rounded-none border-0 border-b-2 border-ink bg-transparent px-1 font-sans text-body text-ink placeholder:text-ink-soft focus-visible:border-riso focus-visible:outline-none focus-visible:ring-0 disabled:opacity-45",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
