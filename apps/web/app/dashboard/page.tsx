"use client";

import { ActivityIcon, ArrowDownIcon, ArrowUpIcon, RefreshCwIcon, SearchIcon, TimerIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AddMonitorDialog } from "@/components/add-monitor-dialog";
import { useRequiredSession } from "@/components/session-context";
import { StatCard } from "@/components/stat-card";
import { StatusBadge, StatusDot } from "@/components/status";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UptimeBar } from "@/components/uptime-bar";
import { useQuery } from "@/hooks/use-query";
import { listMonitors } from "@/lib/data";
import { formatMs, formatPct, hostname, timeAgo } from "@/lib/format";
import { currentStatus, summarize, uptimeBuckets } from "@/lib/stats";

export default function DashboardPage() {
  const session = useRequiredSession();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { data, error, loading, reload } = useQuery(
    `monitors:${session.userId}`,
    () => listMonitors(session),
    60_000,
  );

  const rows = useMemo(() => {
    const now = Date.now();
    return (data?.monitors ?? []).map((m) => ({
      monitor: m,
      status: currentStatus(m.ticks),
      summary: summarize(m.ticks),
      buckets: uptimeBuckets(m.ticks, 40, now),
    }));
  }, [data]);

  const filtered = rows.filter((r) => r.monitor.url.toLowerCase().includes(search.trim().toLowerCase()));
  const up = rows.filter((r) => r.status === "Up").length;
  const down = rows.filter((r) => r.status === "Down").length;
  const latencies = rows.map((r) => r.summary.avgMs).filter((v): v is number => v != null);
  const avg = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Monitors</h1>
          <p className="text-sm text-muted-foreground">Every website you&apos;re watching, over the last 24 hours.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Refresh" onClick={reload} disabled={loading}>
            <RefreshCwIcon className={loading ? "animate-spin" : undefined} />
          </Button>
          <AddMonitorDialog session={session} onAdded={reload} />
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load your monitors</AlertTitle>
          <AlertDescription>
            {error.message}{" "}
            <button className="underline underline-offset-4" onClick={reload}>
              Try again
            </button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Monitors" value={data ? rows.length : "–"} icon={<ActivityIcon className="size-4" />} />
        <StatCard label="Up" value={data ? up : "–"} icon={<ArrowUpIcon className="size-4 text-up" />} />
        <StatCard label="Down" value={data ? down : "–"} icon={<ArrowDownIcon className="size-4 text-down" />} />
        <StatCard
          label="Avg response"
          value={formatMs(avg)}
          hint="Successful checks, 24 h"
          icon={<TimerIcon className="size-4" />}
        />
      </div>

      {!data && loading ? (
        <Card className="gap-0 p-0">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 border-b p-4 last:border-0">
              <Skeleton className="size-2.5 rounded-full" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="ml-auto h-6 w-40" />
            </div>
          ))}
        </Card>
      ) : data && rows.length === 0 ? (
        <Card>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ActivityIcon />
              </EmptyMedia>
              <EmptyTitle>No monitors yet</EmptyTitle>
              <EmptyDescription>
                Add a URL and we&apos;ll start checking it from every region.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <AddMonitorDialog session={session} onAdded={reload} />
            </EmptyContent>
          </Empty>
        </Card>
      ) : data ? (
        <Card className="gap-0 p-0">
          <div className="flex items-center gap-2 border-b p-3">
            <div className="relative w-full max-w-xs">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter by URL"
                aria-label="Filter monitors by URL"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <span className="ml-auto text-xs text-muted-foreground">
              {filtered.length} of {rows.length}
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Monitor</TableHead>
                <TableHead className="hidden md:table-cell">Last 24 hours</TableHead>
                <TableHead className="text-right">Uptime</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Avg response</TableHead>
                <TableHead className="hidden pr-4 text-right lg:table-cell">Last check</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(({ monitor, status, summary, buckets }) => (
                <TableRow
                  key={monitor.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/dashboard/monitors/${monitor.id}`)}
                >
                  <TableCell className="py-3 pl-4">
                    <div className="flex items-center gap-3">
                      <StatusDot status={status} />
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/monitors/${monitor.id}`}
                          className="block truncate font-medium hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {hostname(monitor.url)}
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <StatusBadge status={status} className="border-0 p-0 font-normal" />
                          <span className="hidden max-w-56 truncate font-mono sm:inline">{monitor.url}</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <UptimeBar buckets={buckets} compact />
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatPct(summary.uptime)}</TableCell>
                  <TableCell className="hidden text-right font-mono tabular-nums sm:table-cell">
                    {formatMs(summary.avgMs)}
                  </TableCell>
                  <TableCell className="hidden pr-4 text-right text-muted-foreground lg:table-cell">
                    {summary.last ? timeAgo(summary.last.createdAt) : "Waiting…"}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No monitors match “{search}”.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </Card>
      ) : null}
    </div>
  );
}
