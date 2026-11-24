import {
  ActivityIcon,
  ArrowRightIcon,
  BellRingIcon,
  DatabaseIcon,
  GaugeIcon,
  GlobeIcon,
  LayersIcon,
  SendIcon,
  ServerIcon,
  ShieldCheckIcon,
  TimerIcon,
} from "lucide-react";
import Link from "next/link";
import { LogoMark, PRODUCT_NAME } from "@/components/logo";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: GlobeIcon,
    title: "Checks from every region",
    body: "Workers in each region request your site independently, so a regional outage doesn't hide behind a healthy one.",
  },
  {
    icon: TimerIcon,
    title: "Response times, not just up/down",
    body: "Every check records how long the site took to answer, so slowdowns show up before they become outages.",
  },
  {
    icon: ActivityIcon,
    title: "24-hour uptime history",
    body: "A bar per half hour shows exactly when a site was down or degraded, and what each region saw.",
  },
  {
    icon: LayersIcon,
    title: "Queue-backed checks",
    body: "Jobs go through a Redis stream with a consumer group per region, so adding workers scales the checks.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Private by default",
    body: "Each account only sees its own websites. The API is behind signed JWTs.",
  },
  {
    icon: BellRingIcon,
    title: "Alerts (coming soon)",
    body: "Get notified the moment a check fails in more than one region.",
  },
];

const STEPS = [
  { icon: GlobeIcon, title: "You add a URL", body: "Saved as a Website in Postgres." },
  { icon: SendIcon, title: "The pusher queues it", body: "Every website goes onto the bstack:website Redis stream." },
  { icon: ServerIcon, title: "Region workers check it", body: "Each region's consumer group requests the URL and times it." },
  { icon: DatabaseIcon, title: "Ticks are stored", body: "Up/down and response time, per region, land in WebsiteTicks." },
];

type Cell = "u" | "d" | "w";
const PREVIEW: { name: string; status: "Up" | "Down"; ms: string; uptime: string; bars: Cell[] }[] = [
  { name: "example.com", status: "Up", ms: "142 ms", uptime: "100%", bars: Array(40).fill("u") },
  {
    name: "api.my-startup.dev",
    status: "Up",
    ms: "318 ms",
    uptime: "99.31%",
    bars: [...Array(22).fill("u"), "w", "d", "d", "w", ...Array(14).fill("u")],
  },
  {
    name: "staging.my-startup.dev",
    status: "Down",
    ms: "–",
    uptime: "92.50%",
    bars: [...Array(31).fill("u"), "w", ...Array(8).fill("d")],
  },
];

function ProductPreview() {
  return (
    <div className="relative mx-auto mt-16 max-w-4xl">
      <div className="absolute -inset-x-10 -top-10 -bottom-4 -z-10 rounded-[2rem] bg-gradient-to-b from-up/15 via-chart-1/5 to-transparent blur-2xl" />
      <div className="overflow-hidden rounded-xl border bg-card shadow-2xl shadow-black/20">
        <div className="flex items-center gap-1.5 border-b bg-muted/40 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-muted-foreground/30" />
          <span className="size-2.5 rounded-full bg-muted-foreground/30" />
          <span className="size-2.5 rounded-full bg-muted-foreground/30" />
          <span className="ml-3 font-mono text-xs text-muted-foreground">/dashboard</span>
          <span className="ml-auto rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
            Illustration
          </span>
        </div>
        <div className="divide-y">
          {PREVIEW.map((m) => (
            <div key={m.name} className="flex items-center gap-4 px-4 py-3 text-sm sm:px-5">
              <span className="relative inline-flex size-2.5">
                <span
                  className={cn(
                    "absolute inset-0 rounded-full opacity-60 animate-ping-soft",
                    m.status === "Up" ? "bg-up" : "bg-down",
                  )}
                />
                <span
                  className={cn("relative size-2.5 rounded-full", m.status === "Up" ? "bg-up" : "bg-down")}
                />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{m.name}</div>
                <div className="text-xs text-muted-foreground">
                  {m.status} · {m.ms}
                </div>
              </div>
              <div className="hidden h-6 items-stretch gap-[2px] sm:flex" aria-hidden>
                {m.bars.map((b, i) => (
                  <span
                    key={i}
                    className={cn(
                      "w-[3px] rounded-[1px]",
                      b === "u" ? "bg-up" : b === "d" ? "bg-down" : "bg-unknown",
                    )}
                  />
                ))}
              </div>
              <div className="w-16 text-right font-mono text-xs tabular-nums text-muted-foreground">
                {m.uptime}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden px-4 pt-20 pb-24 sm:pt-28">
          <div className="bg-grid absolute inset-0 -z-10 opacity-60" aria-hidden />
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <span className="relative inline-flex size-2">
                <span className="absolute inset-0 rounded-full bg-up opacity-60 animate-ping-soft" />
                <span className="relative size-2 rounded-full bg-up" />
              </span>
              Multi-region checks, every 3 minutes
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
              Know your site is down before your users do.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
              {PRODUCT_NAME} checks your websites from multiple regions, records every response time,
              and shows you exactly when and where things broke.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/signup" className={buttonVariants({ size: "lg", className: "h-10 px-5" })}>
                Start monitoring <ArrowRightIcon />
              </Link>
              <Link
                href="/signin"
                className={buttonVariants({ size: "lg", variant: "outline", className: "h-10 px-5" })}
              >
                Sign in
              </Link>
            </div>
          </div>
          <ProductPreview />
        </section>

        <section id="features" className="border-t px-4 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-muted-foreground">Features</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                Everything you need to trust your uptime.
              </h2>
            </div>
            <div className="mt-12 grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="bg-background p-6">
                  <f.icon className="size-5 text-muted-foreground" aria-hidden />
                  <h3 className="mt-4 font-medium">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-t bg-muted/30 px-4 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-muted-foreground">How it works</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">From URL to uptime graph.</h2>
            </div>
            <ol className="mt-12 grid gap-4 md:grid-cols-4">
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative rounded-xl border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <span className="flex size-9 items-center justify-center rounded-lg border bg-muted/50">
                      <s.icon className="size-4" aria-hidden />
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                  </div>
                  <h3 className="mt-4 font-medium">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t px-4 py-24">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <GaugeIcon className="size-8 text-muted-foreground" aria-hidden />
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">Start watching your first site.</h2>
            <p className="mt-3 text-muted-foreground">It takes one URL. Results start arriving within minutes.</p>
            <Link href="/signup" className={buttonVariants({ size: "lg", className: "mt-8 h-10 px-5" })}>
              Create an account <ArrowRightIcon />
            </Link>
          </div>
        </section>
      </main>
      <footer className="border-t px-4 py-8">
        <div className="mx-auto flex max-w-6xl items-center gap-2 text-sm text-muted-foreground">
          <LogoMark className="size-5" />
          <span>{PRODUCT_NAME}</span>
          <span className="ml-auto">Uptime monitoring</span>
        </div>
      </footer>
    </div>
  );
}
