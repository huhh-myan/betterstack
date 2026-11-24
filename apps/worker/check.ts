// How one website check works, kept free of Redis and the database so it can be
// unit-tested on its own.

import axios from "axios";

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

/** Requests the URL once and classifies the outcome. Never throws. */
export async function checkWebsite(url: string): Promise<CheckResult> {
  const startedAt = new Date();
  const t0 = performance.now();
  try {
    const res = await axios.get(url, {
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
    const reason = describeNetworkError(err);
    return { ...classify({ httpStatus: null, error: reason }), responseTimeMs, httpStatus: null, startedAt };
  }
}
