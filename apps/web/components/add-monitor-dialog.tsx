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
import { MOCK_MODE, createMonitor, trackExistingMonitor } from "@/lib/data";
import { normalizeUrl } from "@/lib/format";
import type { Session } from "@/lib/types";

type Mode = "url" | "id";

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
  const [mode, setMode] = useState<Mode>("url");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const preview = mode === "url" ? normalizeUrl(value) : null;

  function reset(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setValue("");
      setError(null);
      setMode("url");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "url" && !preview) {
      setError("Enter a valid http(s) URL, for example https://example.com");
      return;
    }
    if (mode === "id" && !value.trim()) {
      setError("Enter the website id.");
      return;
    }
    setPending(true);
    try {
      const website =
        mode === "url"
          ? await createMonitor(session, preview!)
          : await trackExistingMonitor(session, value.trim());
      toast.success(mode === "url" ? "Monitor created" : "Monitor added", { description: website.url });
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
            <DialogTitle>{mode === "url" ? "Add a monitor" : "Add an existing website"}</DialogTitle>
            <DialogDescription>
              {mode === "url"
                ? "We'll request this URL from every region and record whether it's up and how fast it answered."
                : "Already created a website through the API? Paste its id to show it on this dashboard."}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field data-invalid={!!error || undefined}>
              <FieldLabel htmlFor="monitor-value">{mode === "url" ? "URL" : "Website id"}</FieldLabel>
              <Input
                id="monitor-value"
                autoFocus
                autoComplete="off"
                spellCheck={false}
                className="font-mono"
                placeholder={mode === "url" ? "https://example.com" : "e.g. 3f0c6a1e-…"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                aria-invalid={!!error || undefined}
              />
              {error ? (
                <FieldError>{error}</FieldError>
              ) : mode === "url" ? (
                <FieldDescription>
                  {preview && preview !== value.trim() ? (
                    <>
                      Will check <span className="font-mono text-foreground">{preview}</span>
                    </>
                  ) : (
                    "https:// is added if you leave it out."
                  )}
                </FieldDescription>
              ) : null}
            </Field>
          </FieldGroup>

          {!MOCK_MODE ? (
            <button
              type="button"
              className="justify-self-start text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              onClick={() => {
                setMode(mode === "url" ? "id" : "url");
                setValue("");
                setError(null);
              }}
            >
              {mode === "url" ? "Already created one with the API? Add it by id" : "Create a new monitor instead"}
            </button>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => reset(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              {mode === "url" ? "Create monitor" : "Add website"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
