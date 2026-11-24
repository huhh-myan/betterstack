export function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function formatMs(ms: number | null | undefined) {
  if (ms == null) return "–";
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms} ms`;
}

export function formatPct(v: number | null | undefined, digits = 2) {
  if (v == null) return "–";
  const pct = v * 100;
  // Don't round 99.996% up to a misleading 100.00%.
  const factor = 10 ** digits;
  return `${(Math.floor(pct * factor) / factor).toFixed(digits)}%`;
}

export function timeAgo(date: string | number | Date, now = Date.now()) {
  const s = Math.round((now - new Date(date).getTime()) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} d ago`;
}

export function formatTime(date: string | number | Date) {
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(date: string | number | Date) {
  return new Date(date).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Adds https:// when the scheme is missing; the worker needs a full URL. */
export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".") && url.hostname !== "localhost") return null;
    // URL adds a trailing "/" to bare hosts; drop it so "example.com" stays tidy.
    const bare = url.pathname === "/" && !url.search && !url.hash && !trimmed.endsWith("/");
    return bare ? url.href.slice(0, -1) : url.href;
  } catch {
    return null;
  }
}
