import * as React from "react";
import { cn } from "@/lib/cn";

export const Badge = React.forwardRef<
  HTMLDivElement,
  { variant?: "default" | "success" | "warning" | "destructive" | "outline" } & React.HTMLAttributes<HTMLDivElement>
>(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "border-transparent bg-primary text-primary-foreground",
    success: "border-transparent bg-emerald-500 text-white",
    warning: "border-transparent bg-amber-500 text-white",
    destructive: "border-transparent bg-destructive text-destructive-foreground",
    outline: "text-foreground border",
  };
  return <div ref={ref} className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs", variants[variant], className)} {...props} />;
});
Badge.displayName = "Badge";
