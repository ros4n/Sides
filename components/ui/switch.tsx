"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** A ticked / empty checkbox stamped in ink. */
export const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "group inline-flex size-6 shrink-0 items-center justify-center rounded-[2px] border-2 border-ink bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-riso disabled:opacity-45 data-[state=checked]:bg-riso",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none">
      <Check className="size-4 stroke-[3] text-riso-ink opacity-0 transition-opacity group-data-[state=checked]:opacity-100" />
    </SwitchPrimitive.Thumb>
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";
