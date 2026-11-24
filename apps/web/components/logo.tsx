import Link from "next/link";
import { cn } from "@/lib/utils";

/** Product name shown in the UI. Matches the `bstack:` Redis stream prefix. */
export const PRODUCT_NAME = "bstack";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn("size-6", className)}>
      <rect width="24" height="24" rx="6" className="fill-foreground" />
      <path
        d="M4 12.5h3.5l2-5 3.5 10 2.5-6.5 1.5 1.5H20"
        className="stroke-background"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <LogoMark />
      <span>{PRODUCT_NAME}</span>
    </Link>
  );
}
