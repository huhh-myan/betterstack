// Shapes mirror packages/db-prisma/src/prisma/contract.prisma.

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
  createdAt: string;
  region_id: number;
  website_id: string;
}

/** A website plus the checks recorded for it. */
export interface Monitor extends Website {
  ticks: WebsiteTick[];
  /** True when `ticks` are generated in the browser rather than read from the API. */
  simulatedTicks: boolean;
}

export interface Session {
  token: string;
  userId: string;
  username: string;
}
