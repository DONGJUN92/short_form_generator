import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display font-semibold tracking-tight text-fg", className)}>
      <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-fg">
        <Play className="size-3.5 translate-x-px fill-current" />
      </span>
      {compact ? null : "Klipo"}
    </span>
  );
}
