// How one website check works, kept free of Redis and the database so it can be
// unit-tested on its own.

import axios from "axios";
import dns from "node:dns";

export type TickStatus = "Up" | "Down" | "Unknown";

export interface CheckResult {
  status: TickStatus;
  /** How long until the response (or the failure), in ms. */
  responseTimeMs: number;
  /** HTTP status code, or null when no response came back. */
  httpStatus: number | null;
  /** Why it isn't Up, e.g. "HTTP 503", "timed out after 10000 ms". */
  error: string | null;
  /** When the check started. Stored as the tick's createdAt. */
  startedAt: Date;
}

export const REQUEST_TIMEOUT_MS = Number(process.env.CHECK_TIMEOUT_MS ?? 10_000);

/**
 * The status rule, in one place:
 * - 2xx and 3xx: Up (axios follows redirects, so 3xx is rare here)
 * - 429 Too Many Requests: Unknown. The site answered, but refused to tell us.
 * - any other HTTP code (4xx, 5xx): Down
 * - no response at all (timeout, DNS failure, refused, TLS error): Down
 */
export function classify(input: { httpStatus: number | null; error?: string | null }): {
  status: TickStatus;
  error: string | null;
} {
  const { httpStatus } = input;
  if (httpStatus === null) return { status: "Down", error: input.error ?? "no response" };
  if (httpStatus >= 200 && httpStatus < 400) return { status: "Up", error: null };
  if (httpStatus === 429) return { status: "Unknown", error: "HTTP 429 (rate limited)" };
  return { status: "Down", error: `HTTP ${httpStatus}` };
}

/** Turns an axios/network error into a short, readable reason. */
export function describeNetworkError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") return `timed out after ${REQUEST_TIMEOUT_MS} ms`;
    if (err.code === "ENOTFOUND") return "DNS lookup failed";
    if (err.code === "ECONNREFUSED") return "connection refused";
    if (err.code) return err.code;
  }
  return err instanceof Error ? err.message : String(err);
}

/**
 * DNS lookup that prefers IPv4 and falls back to IPv6.
 *
 * Why: many sites (google.com, github.com…) publish IPv6 (AAAA) and IPv4 (A)
 * addresses. On a network without working IPv6, connecting to the IPv6 one
 * hangs until the timeout, and Bun doesn't fall back to IPv4 by itself
 * (browsers and curl do, using "Happy Eyeballs"). That made healthy sites
 * show "timed out" = false Down. Bun ignores axios's `family: 4` and
 * dns.setDefaultResultOrder("ipv4first"), but does use a custom `lookup`.
 * IPv6-only sites still work: they have no IPv4 address, so IPv6 is used.
 */
// Callback style on purpose: axios under Bun mishandles the promise-returning
// form (requests hang, and DNS errors escape as uncaught exceptions).
type LookupCallback = (err: NodeJS.ErrnoException | null, address: any, family?: number) => void;

function lookupPreferIPv4(onPick: (address: string) => void) {
  return (hostname: string, options: { all?: boolean } | undefined, callback: LookupCallback) => {
    dns.lookup(hostname, { all: true }, (err, addresses) => {
      if (err) return callback(err, undefined);
      const pick = addresses.find((a) => a.family === 4) ?? addresses[0];
      if (!pick) {
        return callback(Object.assign(new Error(`no address for ${hostname}`), { code: "ENOTFOUND" }), undefined);
      }
      onPick(pick.address);
      // Callers may ask for a list (options.all) or for a single address.
      if (options?.all) return callback(null, [pick]);
      callback(null, pick.address, pick.family);
    });
  };
}

/** Requests the URL once and classifies the outcome. Never throws. */
export async function checkWebsite(url: string): Promise<CheckResult> {
  const startedAt = new Date();
  const t0 = performance.now();
  // The address actually connected to, so a failure can say where it went wrong.
  let address: string | null = null;
  try {
    const res = await axios.get(url, {
      lookup: lookupPreferIPv4((a) => (address = a)) as any,
      timeout: REQUEST_TIMEOUT_MS,
      // Accept every status: a 503 is a result to record, not an exception.
      validateStatus: () => true,
      maxRedirects: 5,
      // Don't download huge bodies just to throw them away.
      maxContentLength: 5 * 1024 * 1024,
      headers: { "User-Agent": "bstack-uptime-checker/1.0" },
    });
    const responseTimeMs = Math.round(performance.now() - t0);
    return { ...classify({ httpStatus: res.status }), responseTimeMs, httpStatus: res.status, startedAt };
  } catch (err) {
    const responseTimeMs = Math.round(performance.now() - t0);
    // e.g. "timed out after 10000 ms (connecting to 142.250.1.2)"
    const reason = describeNetworkError(err) + (address ? ` (connecting to ${address})` : "");
    return { ...classify({ httpStatus: null, error: reason }), responseTimeMs, httpStatus: null, startedAt };
  }
}
