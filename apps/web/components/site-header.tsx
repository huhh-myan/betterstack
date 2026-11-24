"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";

export function SiteHeader() {
  const session = useSession();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Logo />
        <nav className="ml-6 hidden gap-5 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">
            Features
          </a>
          <a href="#how-it-works" className="hover:text-foreground">
            How it works
          </a>
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          {session ? (
            <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/signin" className={buttonVariants({ variant: "ghost", size: "lg" })}>
                Sign in
              </Link>
              <Link href="/signup" className={buttonVariants({ size: "lg" })}>
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
