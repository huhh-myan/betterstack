// Shapes mirror packages/db-prisma/src/prisma/contract.prisma and the API responses.

export type TickStatus = "Up" | "Down" | "Unknown";

export interface Region {
  id: number;
  name: string;
}

export interface Website {
  id: string;
  url: string;
  timeAdded: string;
  user_id: string;
}

export interface WebsiteTick {
  id: number;
  response_time_ms: number;
  status: TickStatus;
  /** HTTP status code, or null when no response came back. */
  http_status: number | null;
  /** Why the check wasn't Up ("HTTP 503", "timed out after 10000 ms"...). */
  error: string | null;
  createdAt: string;
  region_id: number;
  website_id: string;
}

/** A website plus its checks from the last 24 hours. */
export interface Monitor extends Website {
  ticks: WebsiteTick[];
}

export type RegionRequestStatus = "Pending" | "Approved" | "Rejected";

export interface RegionRequest {
  id: number;
  name: string;
  reason: string | null;
  status: RegionRequestStatus;
  user_id: string;
  /** Requester's username (filled in for admins' review list). */
  username: string | null;
  createdAt: string;
  decidedAt: string | null;
}

export interface Session {
  token: string;
  userId: string;
  username: string;
  isAdmin: boolean;
}
