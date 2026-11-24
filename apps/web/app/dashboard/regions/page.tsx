"use client";

import { GlobeIcon, Loader2Icon, PlusIcon } from "lucide-react";
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
import { createRegion, listRegions } from "@/lib/data";

const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default function RegionsPage() {
  const session = useRequiredSession();
  const { data, error, loading, reload } = useQuery("regions", () => listRegions(session));
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = name.trim();
    setFormError(null);
    // The API never answers when the name is empty, so check it here.
    if (!value) return setFormError("Enter a region name.");
    if (!NAME_PATTERN.test(value)) return setFormError("Use lowercase letters, numbers and dashes, e.g. eu-west-1.");
    if (data?.some((r) => r.name === value)) return setFormError("A region with that name already exists.");
    setPending(true);
    try {
      const message = await createRegion(session, value);
      toast.success(message);
      setName("");
      reload();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  const regions = [...(data ?? [])].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Regions</h1>
        <p className="text-sm text-muted-foreground">
          Places checks run from. Each region has its own worker consumer group on the Redis stream.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Card className="gap-0 py-0 lg:col-span-2">
          {error ? (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertTitle>Couldn&apos;t load regions</AlertTitle>
                <AlertDescription>
                  {error.message}{" "}
                  <button className="underline underline-offset-4" onClick={reload}>
                    Try again
                  </button>
                </AlertDescription>
              </Alert>
            </div>
          ) : !data && loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : regions.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <GlobeIcon />
                </EmptyMedia>
                <EmptyTitle>No regions yet</EmptyTitle>
                <EmptyDescription>Create one, then start a worker with that region&apos;s id.</EmptyDescription>
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
                {regions.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-2">
                        <GlobeIcon className="size-4 text-muted-foreground" aria-hidden />
                        <span className="font-mono">{r.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="pr-4 text-right font-mono tabular-nums text-muted-foreground">
                      {r.id}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>New region</CardTitle>
            <CardDescription>Adds a region to the database. Workers pick it up by id.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <Field data-invalid={!!formError || undefined}>
                <FieldLabel htmlFor="region-name">Name</FieldLabel>
                <Input
                  id="region-name"
                  className="font-mono"
                  placeholder="eu-west-1"
                  autoComplete="off"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={!!formError || undefined}
                />
                {formError ? (
                  <FieldError>{formError}</FieldError>
                ) : (
                  <FieldDescription>Lowercase letters, numbers and dashes.</FieldDescription>
                )}
              </Field>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
                Create region
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
