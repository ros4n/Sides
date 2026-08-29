import { cn } from "@/lib/utils";

const LABEL: Record<string, string> = {
  invite_only: "Crew only",
  friends: "Friends",
  public: "Open",
};

/** The visibility control, as an inked rubber stamp overprinted on the page. */
export function VisStamp({
  visibility,
  size = "md",
  className,
}: {
  visibility: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block -rotate-2 border-2 border-ink font-display font-extrabold uppercase leading-none tracking-[0.16em] text-ink",
        "shadow-[1px_1px_0_rgba(28,24,19,0.25)]",
        size === "sm" ? "px-1 py-0.5 text-micro" : "px-1.5 py-1 text-mini",
        className,
      )}
    >
      {LABEL[visibility] ?? "Crew only"}
    </span>
  );
}
