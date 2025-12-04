import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105 hover:bg-[position:100%_0]",
        destructive: "bg-gradient-to-r from-destructive to-red-500 text-destructive-foreground shadow-lg shadow-destructive/25 hover:shadow-destructive/40 hover:scale-105",
        outline: "border-2 border-primary/50 bg-transparent text-primary hover:border-primary hover:bg-primary/10 hover:shadow-glow",
        secondary: "bg-secondary text-secondary-foreground hover:bg-primary/20 hover:text-primary",
        ghost: "text-foreground hover:bg-primary/10 hover:text-primary hover:shadow-[0_0_15px_hsl(38_92%_50%/0.2)]",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "bg-gradient-to-r from-yellow-400 via-primary to-accent bg-[length:200%_100%] text-primary-foreground font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 animate-shimmer",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
