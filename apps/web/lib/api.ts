// Thin client for the Express API in apps/api. Requests go to /api/* on this
// app and next.config.js forwards them to the API server (which has no CORS).

import type { Region, RegionRequest, Website, WebsiteTick } from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
  /** The token is missing, invalid or expired: the user must sign in again. */
  get unauthorized() {
    return this.status === 401;
  }
}

const UNREACHABLE = "Can't reach the API. Is apps/api running?";

async function request<T>(
  path: string,
  { method = "GET", body, token }: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(UNREACHABLE, 0);
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // The Next.js proxy answers with an HTML error page when the API is down.
    if (data === null) throw new ApiError(UNREACHABLE, res.status);
    throw new ApiError(data.message ?? `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

export interface ApiUser {
  id: string;
  username: string;
  isAdmin: boolean;
}

export const api = {
  signup: (username: string, password: string) =>
    request<{ user: { id: string; username: string } }>("/signup", { method: "POST", body: { username, password } }),

  signin: (username: string, password: string) =>
    request<{ token: string; user: ApiUser }>("/signin", { method: "POST", body: { username, password } }),

  me: (token: string) => request<ApiUser>("/user", { token }),

  listWebsites: (token: string) =>
    request<{ websites: (Website & { ticks: WebsiteTick[] })[] }>("/user/websites", { token }),

  createWebsite: (token: string, url: string) =>
    request<{ website: Website }>("/user/website/create", { method: "POST", token, body: { url } }),

  getWebsite: (token: string, id: string) =>
    request<{ website: Website }>(`/user/website/${encodeURIComponent(id)}`, { token }),

  getTicks: (token: string, id: string, hours = 24) =>
    request<{ ticks: WebsiteTick[] }>(`/user/website/${encodeURIComponent(id)}/ticks?hours=${hours}`, { token }),

  deleteWebsite: (token: string, id: string) =>
    request<void>(`/user/website/${encodeURIComponent(id)}`, { method: "DELETE", token }),

  listRegions: (token: string) => request<Region[]>("/region/list", { token }),

  createRegion: (token: string, name: string) =>
    request<{ region: Region; message: string }>("/region/create", { method: "POST", token, body: { name } }),

  requestRegion: (token: string, name: string, reason?: string) =>
    request<{ request: RegionRequest }>("/region/request", { method: "POST", token, body: { name, reason } }),

  listRegionRequests: (token: string) =>
    request<{ requests: RegionRequest[]; isAdmin: boolean }>("/region/requests", { token }),

  decideRegionRequest: (token: string, id: number, decision: "approve" | "reject") =>
    request<{ request: RegionRequest }>(`/region/requests/${id}/${decision}`, { method: "POST", token }),
};
