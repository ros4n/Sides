"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn, initials, stringToHue } from "@/lib/utils";

/**
 * A Polaroid thumbnail — thin paper frame, hairline, a faint press rotation.
 * `plain` drops the frame/rotation (for dense inline use).
 */
export function Avatar({
  name,
  src,
  size = 36,
  className,
  plain = false,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
  plain?: boolean;
}) {
  const hue = stringToHue(name || "?");
  const tilt = ((stringToHue(name || "x") % 7) - 3) * 0.6;

  const inner = (
    <AvatarPrimitive.Root
      className="relative flex shrink-0 select-none overflow-hidden rounded-[2px]"
      style={{ width: size, height: size }}
    >
      {src ? (
        <AvatarPrimitive.Image
          src={src}
          alt={name}
          className="aspect-square h-full w-full object-cover"
          style={{ filter: "grayscale(0.35) contrast(1.08)" }}
        />
      ) : null}
      <AvatarPrimitive.Fallback
        className="flex h-full w-full items-center justify-center font-display font-extrabold uppercase text-white"
        style={{
          backgroundColor: `hsl(${hue} 48% 40%)`,
          fontSize: size * 0.42,
          letterSpacing: "0.02em",
        }}
        delayMs={src ? 250 : 0}
      >
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );

  if (plain) return <div className={cn("shrink-0", className)}>{inner}</div>;

  return (
    <div
      className={cn(
        "shrink-0 border border-rule bg-paper p-[3px] pb-[5px] shadow-[1px_2px_0_rgba(28,24,19,0.18)]",
        className,
      )}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      {inner}
    </div>
  );
}
