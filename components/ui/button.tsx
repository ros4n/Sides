import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] transition-[transform,background,color,box-shadow] duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-riso focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:pointer-events-none disabled:opacity-45 active:translate-y-px [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // inked rubber stamp
        primary:
          "stamp px-4 text-body hover:-rotate-1 hover:shadow-[3px_3px_0_rgba(28,24,19,0.3)]",
        // second-sheet block
        secondary:
          "border-2 border-ink bg-paper-2 font-sans font-bold text-ink hover:bg-paper",
        // fill-in-the-blank hairline
        outline:
          "border border-ink bg-transparent font-sans text-ink hover:bg-paper-2",
        ghost:
          "font-sans text-ink underline-offset-4 hover:bg-paper-2",
        danger:
          "border-2 border-alarm bg-transparent font-sans font-bold uppercase tracking-wide text-ink hover:bg-alarm/15",
        link: "font-sans text-riso underline underline-offset-4 hover:opacity-80",
      },
      size: {
        sm: "h-8 px-3 text-note",
        md: "h-10 px-4 text-note",
        lg: "h-12 px-6 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
