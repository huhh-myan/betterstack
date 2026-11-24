"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/logo";
import { SessionProvider } from "@/components/session-context";
import { SimulatedNotice } from "@/components/simulated-notice";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { UserMenu } from "@/components/user-menu";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Monitors", match: (p: string) => p === "/dashboard" || p.startsWith("/dashboard/monitors") },
  { href: "/dashboard/regions", label: "Regions", match: (p: string) => p.startsWith("/dashboard/regions") },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Auth lives in localStorage, so the guard runs in the browser.
  useEffect(() => {
    if (session === null) router.replace(`/signin?next=${encodeURIComponent(pathname)}`);
  }, [session, pathname, router]);

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
          <Logo href="/dashboard" className="mr-4" />
          <nav className="flex items-center gap-1 text-sm">
            {NAV.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:text-foreground",
                    active && "bg-muted text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            {session ? <UserMenu session={session} /> : <Skeleton className="size-7 rounded-full" />}
          </div>
        </div>
      </header>
      <SimulatedNotice />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {session ? (
          <SessionProvider value={session}>{children}</SessionProvider>
        ) : (
          <div className="space-y-4" aria-busy>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}
      </main>
    </div>
  );
}
