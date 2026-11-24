"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatDateTime, formatMs, formatTime } from "@/lib/format";
import type { Region } from "@/lib/types";

// Region colors follow fixed categorical slots 1-3 (checked as a set for
// color-vision deficiency in both themes). More than 3 regions would need a
// different encoding, so the chart only plots the first three.
const SLOTS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];

export function ResponseChart({
  data,
  regions,
}: {
  data: Record<string, number | null>[];
  regions: Region[];
}) {
  const shown = regions.slice(0, SLOTS.length);
  const config: ChartConfig = Object.fromEntries(
    shown.map((r, i) => [`r${r.id}`, { label: r.name, color: SLOTS[i] }]),
  );

  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full">
      <LineChart data={data} margin={{ left: 0, right: 12, top: 12 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="t"
          type="number"
          scale="time"
          domain={["dataMin", "dataMax"]}
          tickFormatter={(v) => formatTime(v)}
          tickLine={false}
          axisLine={false}
          minTickGap={48}
          tickMargin={8}
        />
        <YAxis
          width={52}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}s` : `${v}ms`)}
          tickCount={4}
        />
        <ChartTooltip
          cursor={{ strokeDasharray: "3 3" }}
          content={
            <ChartTooltipContent
              indicator="line"
              labelFormatter={(_, payload) => {
                const t = payload?.[0]?.payload?.t;
                return typeof t === "number" ? formatDateTime(t) : "";
              }}
              formatter={(value, name) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span
                      className="h-2.5 w-1 rounded-[2px]"
                      style={{ background: `var(--color-${String(name)})` }}
                    />
                    {config[String(name)]?.label}
                  </span>
                  <span className="font-mono font-medium tabular-nums text-foreground">
                    {formatMs(Number(value))}
                  </span>
                </div>
              )}
            />
          }
        />
        {shown.length > 1 ? <ChartLegend content={<ChartLegendContent />} /> : null}
        {shown.map((r) => (
          <Line
            key={r.id}
            dataKey={`r${r.id}`}
            type="monotone"
            stroke={`var(--color-r${r.id})`}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
            connectNulls={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
