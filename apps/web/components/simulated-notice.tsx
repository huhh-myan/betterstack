import { FlaskConicalIcon } from "lucide-react";
import { MOCK_MODE } from "@/lib/data";

export function SimulatedNotice() {
  return (
    <div className="border-b bg-muted/40">
      <div className="mx-auto flex max-w-6xl items-start gap-2 px-4 py-2 text-xs text-muted-foreground sm:items-center">
        <FlaskConicalIcon className="mt-0.5 size-3.5 shrink-0 sm:mt-0" aria-hidden />
        {MOCK_MODE ? (
          <p>
            <span className="font-medium text-foreground">Demo mode.</span> Everything is mock data
            stored in this browser (NEXT_PUBLIC_MOCK=1). No backend is used.
          </p>
        ) : (
          <p>
            <span className="font-medium text-foreground">Check results are simulated.</span> The API
            doesn&apos;t expose website ticks yet, so uptime and response times are generated in the
            browser. Accounts, websites and regions are real.
          </p>
        )}
      </div>
    </div>
  );
}
