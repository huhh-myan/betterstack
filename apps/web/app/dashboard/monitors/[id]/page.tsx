"use client";

import {
  ArrowLeftIcon,
  CopyIcon,
  ExternalLinkIcon,
  GaugeIcon,
  MoreHorizontalIcon,
  PercentIcon,
  RefreshCwIcon,
  TimerIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ResponseChart } from "@/components/response-chart";
import { useRequiredSession } from "@/components/session-context";
import { StatCard } from "@/components/stat-card";
import { type DisplayStatus, StatusBadge, StatusDot } from "@/components/status";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UptimeBar } from "@/components/uptime-bar";
import { useQuery } from "@/hooks/use-query";
import { MOCK_MODE, getMonitor, removeMonitor } from "@/lib/data";
import { formatDateTime, formatMs, formatPct, hostname, timeAgo } from "@/lib/format";
import { currentStatus, regionsInTicks, responseSeries, summarize, uptimeBuckets } from "@/lib/stats";

const LEGEND = [
  { label: "Operational", className: "bg-up" },
  { label: "Degraded", className: "bg-unknown" },
  { label: "Down", className: "bg-down" },
  { label: "No data", className: "bg-muted" },
];

export default function MonitorPage() {
  const { id } = useParams<{ id: string }>();
  const session = useRequiredSession();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { data, error, loading, reload } = useQuery(`monitor:${id}`, () => getMonitor(session, id), 60_000);

  const view = useMemo(() => {
    const monitor = data?.monitor;
    if (!monitor) return null;
    const now = Date.now();
    const regions = regionsInTicks(monitor.ticks, data.regions);
    const perRegion = regions.map((r) => {
      const ticks = monitor.ticks.filter((t) => t.region_id === r.id);
      return { region: r, status: currentStatus(ticks), summary: summarize(ticks) };
    });
    const recent = [...monitor.ticks].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 15);
    return {
      monitor,
      regions,
      perRegion,
      recent,
      status: currentStatus(monitor.ticks) as DisplayStatus,
      summary: summarize(monitor.ticks),
      buckets: uptimeBuckets(monitor.ticks, 48, now),
      series: responseSeries(monitor.ticks, regions, 96, now),
    };
  }, [data]);

  if (!data && loading) {
    return (
      <div className="space-y-6" aria-busy>
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-72" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-32" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn&apos;t load this monitor</AlertTitle>
        <AlertDescription>
          {error.message}{" "}
          <button className="underline underline-offset-4" onClick={reload}>
            Try again
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!view) {
    return (
      <Card>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Monitor not found</EmptyTitle>
            <EmptyDescription>It doesn&apos;t exist, or it belongs to another account.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
              Back to monitors
            </Link>
          </EmptyContent>
        </Empty>
      </Card>
    );
  }

  const { monitor, summary, status } = view;

  async function onRemove() {
    await removeMonitor(session, monitor.id);
    toast.success(MOCK_MODE ? "Monitor deleted" : "Removed from dashboard", { description: monitor.url });
    router.push("/dashboard");
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" /> Monitors
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-3">
            <StatusDot status={status} className="size-3" />
            <h1 className="truncate text-2xl font-semibold tracking-tight">{hostname(monitor.url)}</h1>
            <StatusBadge status={status} />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <a
              href={monitor.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono hover:text-foreground"
            >
              {monitor.url} <ExternalLinkIcon className="size-3.5" />
            </a>
            <span aria-hidden>·</span>
            <span>Added {timeAgo(monitor.timeAdded)}</span>
            {summary.last ? (
              <>
                <span aria-hidden>·</span>
                <span>Checked {timeAgo(summary.last.createdAt)}</span>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Refresh" onClick={reload} disabled={loading}>
            <RefreshCwIcon className={loading ? "animate-spin" : undefined} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="More actions" />}>
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                onClick={() => {
                  void navigator.clipboard.writeText(monitor.id).then(
                    () => toast.success("Website id copied"),
                    () => toast.error("Couldn't copy to the clipboard"),
                  );
                }}
              >
                <CopyIcon /> Copy website id
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.open(monitor.url, "_blank", "noopener,noreferrer")}>
                <ExternalLinkIcon /> Open website
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
                <Trash2Icon /> {MOCK_MODE ? "Delete monitor" : "Remove from dashboard"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Current status"
          value={<StatusBadge status={status} className="border-0 p-0 text-2xl font-semibold [&_svg]:size-5" />}
          hint={
            view.perRegion.length
              ? `${view.perRegion.filter((r) => r.status === "Up").length} of ${view.perRegion.length} regions up`
              : "Waiting for the first check"
          }
        />
        <StatCard
          label="Uptime"
          value={formatPct(summary.uptime)}
          hint="Last 24 hours"
          icon={<PercentIcon className="size-4" />}
        />
        <StatCard
          label="Avg response"
          value={formatMs(summary.avgMs)}
          hint="Successful checks"
          icon={<TimerIcon className="size-4" />}
        />
        <StatCard
          label="p95 response"
          value={formatMs(summary.p95Ms)}
          hint="95% of checks were faster"
          icon={<GaugeIcon className="size-4" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Uptime</CardTitle>
          <CardDescription>All regions, in 30-minute periods.</CardDescription>
          <CardAction className="hidden gap-3 text-xs text-muted-foreground sm:flex">
            {LEGEND.map((l) => (
              <span key={l.label} className="flex items-center gap-1.5">
                <span className={`size-2.5 rounded-[3px] ${l.className}`} />
                {l.label}
              </span>
            ))}
          </CardAction>
        </CardHeader>
        <CardContent>
          {summary.checks ? (
            <UptimeBar buckets={view.buckets} />
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No checks yet. The first results arrive within a few minutes of adding a monitor.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Response time</CardTitle>
          <CardDescription>Average of successful checks per 15 minutes, by region.</CardDescription>
        </CardHeader>
        <CardContent>
          {summary.avgMs != null ? (
            <ResponseChart data={view.series} regions={view.regions} />
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No successful checks to chart yet.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Regions</CardTitle>
            <CardDescription>What each region saw over 24 hours.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Region</TableHead>
                  <TableHead className="text-right">Uptime</TableHead>
                  <TableHead className="pr-4 text-right">Avg</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {view.perRegion.map(({ region, status: rs, summary: s }) => (
                  <TableRow key={region.id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-2">
                        <StatusDot status={rs} />
                        <span className="font-mono text-xs">{region.name}</span>
                        <span className="sr-only">{rs}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatPct(s.uptime)}</TableCell>
                    <TableCell className="pr-4 text-right font-mono tabular-nums">{formatMs(s.avgMs)}</TableCell>
                  </TableRow>
                ))}
                {view.perRegion.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                      No checks yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent checks</CardTitle>
            <CardDescription>
              {view.recent.length ? `The latest ${view.recent.length} results, all regions.` : "Nothing yet."}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Time</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-4 text-right">Response</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {view.recent.map((t) => (
                  <TableRow key={`${t.region_id}-${t.id}`}>
                    <TableCell className="pl-4 text-muted-foreground">{formatDateTime(t.createdAt)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {view.regions.find((r) => r.id === t.region_id)?.name ?? t.region_id}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={t.status} />
                    </TableCell>
                    <TableCell className="pr-4 text-right font-mono tabular-nums">
                      {t.status === "Up" ? (
                        formatMs(t.response_time_ms)
                      ) : (
                        <span className="font-sans text-xs text-muted-foreground">Failed</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {view.recent.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                      No checks yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{MOCK_MODE ? "Delete this monitor?" : "Remove from dashboard?"}</DialogTitle>
            <DialogDescription>
              {MOCK_MODE ? (
                <>
                  <span className="font-mono">{monitor.url}</span> and its history will be deleted from the demo data.
                </>
              ) : (
                <>
                  The API has no delete endpoint yet, so this only hides{" "}
                  <span className="font-mono">{monitor.url}</span> in this browser. It stays in the database and keeps
                  being checked. You can add it back by its id.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button variant="destructive" onClick={onRemove}>
              {MOCK_MODE ? "Delete" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
