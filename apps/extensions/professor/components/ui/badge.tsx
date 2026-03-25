import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", {
  variants: {
    variant: {
      default: "bg-[#efe2d5] text-[#7d5b30]",
      success: "bg-[#dff3e7] text-[#1d7a45]",
      warning: "bg-[#fdf0d6] text-[#9a5c10]"
    }
  },
  defaultVariants: {
    variant: "default"
  }
});

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps): React.JSX.Element {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
