import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-md bg-elevated px-3 text-sm text-fg shadow-[0_0_0_1px_rgba(255,255,255,0.08)] placeholder:text-subtle outline-none transition-[box-shadow] duration-150 focus-visible:shadow-[0_0_0_2px_rgba(94,234,212,0.45)] disabled:opacity-40",
        className,
      )}
      suppressHydrationWarning
      {...props}
    />
  );
}
