import { CircleAlertIcon, CircleCheckIcon, CircleDashedIcon, CircleHelpIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TickStatus } from "@/lib/types";

export type DisplayStatus = TickStatus | "Pending";

const META: Record<DisplayStatus, { label: string; dot: string; text: string; icon: typeof CircleCheckIcon }> = {
  Up: { label: "Up", dot: "bg-up", text: "text-up", icon: CircleCheckIcon },
  Down: { label: "Down", dot: "bg-down", text: "text-down", icon: CircleAlertIcon },
  Unknown: { label: "Unknown", dot: "bg-unknown", text: "text-unknown", icon: CircleHelpIcon },
  Pending: {
    label: "Pending",
    dot: "bg-muted-foreground/50",
    text: "text-muted-foreground",
    icon: CircleDashedIcon,
  },
};

/** Colored dot. Always pair it with a text label somewhere nearby. */
export function StatusDot({ status, className }: { status: DisplayStatus; className?: string }) {
  const meta = META[status];
  return (
    <span className={cn("relative inline-flex size-2.5 shrink-0", className)} aria-hidden>
      {status === "Up" || status === "Down" ? (
        <span className={cn("absolute inset-0 rounded-full opacity-60 animate-ping-soft", meta.dot)} />
      ) : null}
      <span className={cn("relative inline-flex size-2.5 rounded-full", meta.dot)} />
    </span>
  );
}

/** Icon + label, so status never relies on color alone. */
export function StatusBadge({ status, className }: { status: DisplayStatus; className?: string }) {
  const meta = META[status];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        className,
      )}
    >
      <Icon className={cn("size-3.5", meta.text)} aria-hidden />
      {meta.label}
    </span>
  );
}
