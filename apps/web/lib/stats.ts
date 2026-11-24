import { TICK_WINDOW_MS } from "./mock";
import type { Region, TickStatus, WebsiteTick } from "./types";

export interface Summary {
  checks: number;
  /** 0..1, or null when there are no Up/Down checks. Unknown checks are excluded. */
  uptime: number | null;
  avgMs: number | null;
  p95Ms: number | null;
  last: WebsiteTick | null;
}

function percentile(sorted: number[], p: number) {
  if (!sorted.length) return null;
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]!;
}

export function summarize(ticks: WebsiteTick[]): Summary {
  let up = 0;
  let down = 0;
  const times: number[] = [];
  let last: WebsiteTick | null = null;
  for (const t of ticks) {
    if (t.status === "Up") {
      up++;
      times.push(t.response_time_ms);
    } else if (t.status === "Down") down++;
    if (!last || t.createdAt > last.createdAt) last = t;
  }
  times.sort((a, b) => a - b);
  return {
    checks: ticks.length,
    uptime: up + down ? up / (up + down) : null,
    avgMs: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null,
    p95Ms: percentile(times, 0.95),
    last,
  };
}

/** Current state: the latest check from each region, worst one wins. */
export function currentStatus(ticks: WebsiteTick[]): TickStatus | "Pending" {
  if (!ticks.length) return "Pending";
  const latest = new Map<number, WebsiteTick>();
  for (const t of ticks) {
    const prev = latest.get(t.region_id);
    if (!prev || t.createdAt > prev.createdAt) latest.set(t.region_id, t);
  }
  const statuses = [...latest.values()].map((t) => t.status);
  if (statuses.includes("Down")) return "Down";
  if (statuses.includes("Unknown")) return "Unknown";
  return "Up";
}

export type BucketState = "up" | "degraded" | "down" | "empty";

export interface Bucket {
  start: number;
  end: number;
  up: number;
  down: number;
  unknown: number;
  state: BucketState;
}

export function uptimeBuckets(ticks: WebsiteTick[], count = 48, now = Date.now()): Bucket[] {
  const size = TICK_WINDOW_MS / count;
  const start = now - TICK_WINDOW_MS;
  const buckets: Bucket[] = Array.from({ length: count }, (_, i) => ({
    start: start + i * size,
    end: start + (i + 1) * size,
    up: 0,
    down: 0,
    unknown: 0,
    state: "empty",
  }));
  for (const t of ticks) {
    const i = Math.floor((new Date(t.createdAt).getTime() - start) / size);
    const b = buckets[i];
    if (!b) continue;
    if (t.status === "Up") b.up++;
    else if (t.status === "Down") b.down++;
    else b.unknown++;
  }
  for (const b of buckets) {
    const total = b.up + b.down + b.unknown;
    if (!total) b.state = "empty";
    else if (b.down / total >= 0.5) b.state = "down";
    else if (b.down || b.unknown) b.state = "degraded";
    else b.state = "up";
  }
  return buckets;
}

/** Average response time of successful checks, per region, in time buckets. */
export function responseSeries(ticks: WebsiteTick[], regions: Region[], count = 96, now = Date.now()) {
  const size = TICK_WINDOW_MS / count;
  const start = now - TICK_WINDOW_MS;
  const sums = Array.from({ length: count }, () => new Map<number, { sum: number; n: number }>());
  for (const t of ticks) {
    if (t.status !== "Up") continue;
    const i = Math.floor((new Date(t.createdAt).getTime() - start) / size);
    const m = sums[i];
    if (!m) continue;
    const cur = m.get(t.region_id) ?? { sum: 0, n: 0 };
    cur.sum += t.response_time_ms;
    cur.n++;
    m.set(t.region_id, cur);
  }
  return sums.map((m, i) => {
    const row: Record<string, number | null> = { t: start + (i + 0.5) * size };
    for (const r of regions) {
      const v = m.get(r.id);
      row[`r${r.id}`] = v ? Math.round(v.sum / v.n) : null;
    }
    return row;
  });
}

export function regionsInTicks(ticks: WebsiteTick[], known: Region[]): Region[] {
  const ids = [...new Set(ticks.map((t) => t.region_id))].sort((a, b) => a - b);
  return ids.map((id) => known.find((r) => r.id === id) ?? { id, name: `Region ${id}` });
}
