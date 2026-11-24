import { FlaskConicalIcon } from "lucide-react";
import { MOCK_MODE } from "@/lib/data";

/** Shown only in demo mode. Against the real API, every number on the dashboard is real. */
export function SimulatedNotice() {
  if (!MOCK_MODE) return null;
  return (
    <div className="border-b bg-muted/40">
      <div className="mx-auto flex max-w-6xl items-start gap-2 px-4 py-2 text-xs text-muted-foreground sm:items-center">
        <FlaskConicalIcon className="mt-0.5 size-3.5 shrink-0 sm:mt-0" aria-hidden />
        <p>
          <span className="font-medium text-foreground">Demo mode.</span> Everything is mock data stored in
          this browser (NEXT_PUBLIC_MOCK=1). No backend is used.
        </p>
      </div>
    </div>
  );
}
