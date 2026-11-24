"use client";

import { Loader2Icon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createMonitor } from "@/lib/data";
import { normalizeUrl } from "@/lib/format";
import type { Session } from "@/lib/types";

export function AddMonitorDialog({
  session,
  onAdded,
  trigger,
}: {
  session: Session;
  onAdded?: () => void;
  trigger?: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const preview = normalizeUrl(value);

  function reset(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setValue("");
      setError(null);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!preview) {
      setError("Enter a valid http(s) URL, for example https://example.com");
      return;
    }
    setPending(true);
    try {
      const website = await createMonitor(session, preview);
      toast.success("Monitor created", { description: website.url });
      reset(false);
      onAdded?.();
      router.push(`/dashboard/monitors/${website.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button>
              <PlusIcon /> Add monitor
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Add a monitor</DialogTitle>
            <DialogDescription>
              We&apos;ll request this URL from every region and record whether it&apos;s up and how fast it
              answered.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field data-invalid={!!error || undefined}>
              <FieldLabel htmlFor="monitor-value">URL</FieldLabel>
              <Input
                id="monitor-value"
                autoFocus
                autoComplete="off"
                spellCheck={false}
                className="font-mono"
                placeholder="https://example.com"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                aria-invalid={!!error || undefined}
              />
              {error ? (
                <FieldError>{error}</FieldError>
              ) : (
                <FieldDescription>
                  {preview && preview !== value.trim() ? (
                    <>
                      Will check <span className="font-mono text-foreground">{preview}</span>
                    </>
                  ) : (
                    "https:// is added if you leave it out."
                  )}
                </FieldDescription>
              )}
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => reset(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              Create monitor
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
