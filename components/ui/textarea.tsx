import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "ruled block min-h-[84px] w-full rounded-none border-2 border-ink bg-transparent px-2 py-1 font-sans text-body leading-6 text-ink placeholder:text-ink-soft focus-visible:border-riso focus-visible:outline-none disabled:opacity-45",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
