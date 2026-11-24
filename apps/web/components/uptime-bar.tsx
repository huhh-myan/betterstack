"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatTime } from "@/lib/format";
import type { Bucket, BucketState } from "@/lib/stats";
import { cn } from "@/lib/utils";

const STATE: Record<BucketState, { className: string; label: string }> = {
  up: { className: "bg-up", label: "Operational" },
  degraded: { className: "bg-unknown", label: "Degraded" },
  down: { className: "bg-down", label: "Down" },
  empty: { className: "bg-muted", label: "No data" },
};

/** 24h strip of buckets. `compact` drops tooltips and shrinks it for table rows. */
export function UptimeBar({
  buckets,
  compact = false,
  className,
}: {
  buckets: Bucket[];
  compact?: boolean;
  className?: string;
}) {
  const down = buckets.filter((b) => b.state === "down").length;
  const degraded = buckets.filter((b) => b.state === "degraded").length;
  const summary = `Last 24 hours: ${down} periods down, ${degraded} degraded, of ${buckets.length}.`;

  if (compact) {
    return (
      <div className={cn("flex h-6 items-stretch gap-[2px]", className)} role="img" aria-label={summary}>
        {buckets.map((b) => (
          <span key={b.start} className={cn("w-[3px] rounded-[1px]", STATE[b.state].className)} />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex h-10 items-stretch gap-[2px]" aria-label={summary} role="group">
        {buckets.map((b) => (
          <Tooltip key={b.start}>
            <TooltipTrigger
              render={
                <span
                  tabIndex={0}
                  className={cn(
                    "flex-1 rounded-[3px] transition-opacity outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring",
                    STATE[b.state].className,
                  )}
                  aria-label={`${formatTime(b.start)}–${formatTime(b.end)}: ${STATE[b.state].label}`}
                />
              }
            />
            <TooltipContent className="flex-col items-start gap-0.5">
              <span className="font-medium">
                {formatTime(b.start)} – {formatTime(b.end)}
              </span>
              <span>{STATE[b.state].label}</span>
              {b.state !== "empty" ? (
                <span className="opacity-70 tabular-nums">
                  {b.up} up · {b.down} down{b.unknown ? ` · ${b.unknown} unknown` : ""}
                </span>
              ) : null}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>24 h ago</span>
        <span>Now</span>
      </div>
    </div>
  );
}
