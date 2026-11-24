"use client";

import {
  CheckIcon,
  CircleCheckIcon,
  CircleXIcon,
  ClockIcon,
  GlobeIcon,
  Loader2Icon,
  PlusIcon,
  SendIcon,
  ShieldCheckIcon,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRequiredSession } from "@/components/session-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@/hooks/use-query";
import { createRegion, decideRegionRequest, listRegionRequests, listRegions, requestRegion } from "@/lib/data";
import { timeAgo } from "@/lib/format";
import type { RegionRequest, RegionRequestStatus, Session } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function checkName(value: string, existing: string[]): string | null {
  if (!value) return "Enter a region name.";
  if (value.length < 2 || value.length > 40) return "Use 2 to 40 characters.";
  if (!NAME_PATTERN.test(value)) return "Use lowercase letters, numbers and dashes, e.g. eu-west-1.";
  if (existing.includes(value)) return "A region with that name already exists.";
  return null;
}

const STATUS_META: Record<RegionRequestStatus, { icon: typeof ClockIcon; className: string }> = {
  Pending: { icon: ClockIcon, className: "text-muted-foreground" },
  Approved: { icon: CircleCheckIcon, className: "text-up" },
  Rejected: { icon: CircleXIcon, className: "text-down" },
};

function RequestStatus({ status }: { status: RegionRequestStatus }) {
  const { icon: Icon, className } = STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium">
      <Icon className={cn("size-3.5", className)} aria-hidden />
      {status}
    </span>
  );
}

/** Admin: create a region directly. User: ask an admin for one. */
function RegionForm({
  session,
  existing,
  onDone,
}: {
  session: Session;
  existing: string[];
  onDone: () => void;
}) {
  const admin = session.isAdmin;
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = name.trim();
    const problem = checkName(value, existing);
    setError(problem);
    if (problem) return;
    setPending(true);
    try {
      if (admin) {
        const region = await createRegion(session, value);
        toast.success(`Region ${region.name} created`, { description: `Start a worker with REGION_ID=${region.id}.` });
      } else {
        await requestRegion(session, value, reason.trim() || undefined);
        toast.success("Request sent", { description: "An admin will review it." });
      }
      setName("");
      setReason("");
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {admin ? <ShieldCheckIcon className="size-4" aria-hidden /> : null}
          {admin ? "New region" : "Request a region"}
        </CardTitle>
        <CardDescription>
          {admin
            ? "Adds a region to the database. Then start a worker with its id."
            : "Regions are shared by everyone, so an admin adds them. Tell them where you need checks from."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field data-invalid={!!error || undefined}>
            <FieldLabel htmlFor="region-name">Name</FieldLabel>
            <Input
              id="region-name"
              className="font-mono"
              placeholder="eu-west-1"
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!error || undefined}
            />
            {error ? <FieldError>{error}</FieldError> : <FieldDescription>Lowercase letters, numbers and dashes.</FieldDescription>}
          </Field>
          {!admin ? (
            <Field>
              <FieldLabel htmlFor="region-reason">Why (optional)</FieldLabel>
              <Input
                id="region-reason"
                placeholder="Most of our users are in Frankfurt"
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? <Loader2Icon className="animate-spin" /> : admin ? <PlusIcon /> : <SendIcon />}
            {admin ? "Create region" : "Send request"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function RequestsCard({
  session,
  requests,
  loading,
  onChanged,
}: {
  session: Session;
  requests: RegionRequest[] | undefined;
  loading: boolean;
  onChanged: () => void;
}) {
  const admin = session.isAdmin;
  const [busy, setBusy] = useState<number | null>(null);

  async function decide(r: RegionRequest, decision: "approve" | "reject") {
    setBusy(r.id);
    try {
      await decideRegionRequest(session, r.id, decision);
      toast.success(decision === "approve" ? `Approved: ${r.name} created` : `Rejected ${r.name}`);
      onChanged();
    } catch (err) {
      toast.error("Couldn't update the request", { description: (err as Error).message });
    } finally {
      setBusy(null);
    }
  }

  // Pending first, then newest.
  const sorted = [...(requests ?? [])].sort(
    (a, b) => Number(b.status === "Pending") - Number(a.status === "Pending") || b.createdAt.localeCompare(a.createdAt),
  );
  const pendingCount = sorted.filter((r) => r.status === "Pending").length;

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="pb-4">
        <CardTitle>{admin ? "Region requests" : "Your requests"}</CardTitle>
        <CardDescription>
          {admin
            ? pendingCount
              ? `${pendingCount} waiting for a decision. Approving creates the region.`
              : "Nothing waiting for a decision."
            : "Regions you asked for, and what an admin decided."}
        </CardDescription>
      </CardHeader>
      {!requests && loading ? (
        <div className="space-y-3 p-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : sorted.length === 0 ? (
        <p className="border-t px-4 py-8 text-center text-sm text-muted-foreground">No requests yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Region</TableHead>
              {admin ? <TableHead className="hidden sm:table-cell">Requested by</TableHead> : null}
              <TableHead className="hidden md:table-cell">Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-4 text-right">{admin ? "Decision" : "When"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="pl-4 font-mono">{r.name}</TableCell>
                {admin ? <TableCell className="hidden sm:table-cell">{r.username ?? "–"}</TableCell> : null}
                <TableCell className="hidden max-w-64 truncate text-muted-foreground md:table-cell" title={r.reason ?? undefined}>
                  {r.reason ?? "–"}
                </TableCell>
                <TableCell>
                  <RequestStatus status={r.status} />
                </TableCell>
                <TableCell className="pr-4 text-right">
                  {admin && r.status === "Pending" ? (
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" disabled={busy === r.id} onClick={() => decide(r, "approve")}>
                        {busy === r.id ? <Loader2Icon className="animate-spin" /> : <CheckIcon />} Approve
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => decide(r, "reject")}>
                        <XIcon /> Reject
                      </Button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">{timeAgo(r.decidedAt ?? r.createdAt)}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

export default function RegionsPage() {
  const session = useRequiredSession();
  const regions = useQuery("regions", () => listRegions(session));
  const requests = useQuery(`region-requests:${session.userId}`, () => listRegionRequests(session));

  const list = [...(regions.data ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const reloadAll = () => {
    regions.reload();
    requests.reload();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          Regions
          {session.isAdmin ? (
            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">
              <ShieldCheckIcon className="size-3.5" aria-hidden /> Admin
            </span>
          ) : null}
        </h1>
        <p className="text-sm text-muted-foreground">
          Places checks run from. Each region has its own worker consumer group on the Redis stream.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Card className="gap-0 py-0 lg:col-span-2">
          {regions.error ? (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertTitle>Couldn&apos;t load regions</AlertTitle>
                <AlertDescription>
                  {regions.error.message}{" "}
                  <button className="underline underline-offset-4" onClick={regions.reload}>
                    Try again
                  </button>
                </AlertDescription>
              </Alert>
            </div>
          ) : !regions.data && regions.loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <GlobeIcon />
                </EmptyMedia>
                <EmptyTitle>No regions yet</EmptyTitle>
                <EmptyDescription>
                  {session.isAdmin ? "Create one, then start a worker with its id." : "Ask an admin to add one."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Name</TableHead>
                  <TableHead className="pr-4 text-right">Region id</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-2">
                        <GlobeIcon className="size-4 text-muted-foreground" aria-hidden />
                        <span className="font-mono">{r.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="pr-4 text-right font-mono tabular-nums text-muted-foreground">{r.id}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <RegionForm session={session} existing={list.map((r) => r.name)} onDone={reloadAll} />
      </div>

      <RequestsCard session={session} requests={requests.data} loading={requests.loading} onChanged={reloadAll} />
    </div>
  );
}
