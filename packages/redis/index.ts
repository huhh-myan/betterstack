// @repo/redis-stream: the job queue between the pusher and the workers.
//
//   pusher  --XADD-->  stream "bstack:website"  --XREADGROUP-->  worker (one consumer group per region)
//
// Every region has its own consumer group, so every region checks every website
// once. Inside a group, jobs are split between that region's workers.

import { createClient } from "redis";

/** The one stream every website job goes through. */
export const STREAM = process.env.REDIS_STREAM ?? "bstack:website";

/**
 * Keep roughly this many jobs in the stream. Must be well above one push cycle
 * (number of websites), because trimming ignores consumer groups: a job trimmed
 * before a slow region read it is lost for that region.
 */
const MAX_STREAM_LENGTH = Number(process.env.REDIS_STREAM_MAXLEN ?? 10_000);

export interface WebsiteJob {
  url: string;
  id: string;
}

export interface StreamMessage {
  /** Stream entry id, e.g. "1692629925771-0". Needed to ack the job. */
  id: string;
  message: WebsiteJob;
}

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

function makeClient() {
  const client = createClient({
    url: REDIS_URL,
    socket: {
      connectTimeout: 5_000,
      // Reconnect with backoff after the first successful connection.
      reconnectStrategy: (retries) => Math.min(retries * 200, 5_000),
    },
  });
  client.on("error", (err) => console.error("[redis]", err.message));
  return client;
}

type Client = ReturnType<typeof makeClient>;
let clientPromise: Promise<Client> | null = null;

/**
 * Connects on first use instead of at import time, and gives up after a few
 * seconds when Redis is down, so a missing Redis is an error, not a hang.
 */
export function getClient(): Promise<Client> {
  if (!clientPromise) {
    const client = makeClient();
    clientPromise = client
      .connect()
      .then(() => client)
      .catch((err) => {
        clientPromise = null;
        throw new Error(`Can't connect to Redis at ${REDIS_URL}: ${err.message}`);
      });
  }
  return clientPromise;
}

/** Closes the connection so the process can exit. */
export async function close() {
  if (!clientPromise) return;
  const client = await clientPromise.catch(() => null);
  clientPromise = null;
  if (client?.isOpen) await client.close();
}

/** Creates a consumer group if it doesn't exist yet (and the stream with it). */
export async function ensureGroup(group: string) {
  const client = await getClient();
  try {
    // "$" = the group starts with new jobs only, not the stream's history.
    await client.xGroupCreate(STREAM, group, "$", { MKSTREAM: true });
  } catch (err) {
    if (!(err instanceof Error) || !err.message.includes("BUSYGROUP")) throw err;
    // BUSYGROUP: the group already exists, which is fine.
  }
}

/** Adds one job. */
export async function xAdd(job: WebsiteJob) {
  const client = await getClient();
  return client.xAdd(STREAM, "*", { url: job.url, id: job.id }, trim());
}

/**
 * Adds many jobs in one round trip (a MULTI block), instead of awaiting each
 * XADD in turn. Returns the number of jobs added.
 */
export async function xAddBulk(jobs: WebsiteJob[]) {
  if (!jobs.length) return 0;
  const client = await getClient();
  const multi = client.multi();
  for (const job of jobs) multi.xAdd(STREAM, "*", { url: job.url, id: job.id }, trim());
  await multi.exec();
  return jobs.length;
}

function trim() {
  return { TRIM: { strategy: "MAXLEN" as const, strategyModifier: "~" as const, threshold: MAX_STREAM_LENGTH } };
}

function toMessages(entries: { id: string; message: Record<string, string> }[]): StreamMessage[] {
  return entries.map((e) => ({ id: e.id, message: { url: e.message.url ?? "", id: e.message.id ?? "" } }));
}

/**
 * Reads jobs for this consumer.
 * - id ">" : jobs nobody in the group has received yet (the normal case).
 * - id "0" : jobs already delivered to this consumer but never acked
 *            (what it was working on when it crashed).
 * `blockMs` waits for new jobs instead of returning immediately, so an idle
 * worker doesn't spin in a busy loop.
 */
export async function xReadGroup(
  group: string,
  consumer: string,
  { id = ">", count = 5, blockMs }: { id?: ">" | "0"; count?: number; blockMs?: number } = {},
): Promise<StreamMessage[]> {
  const client = await getClient();
  const reply = await client.xReadGroup(
    group,
    consumer,
    { key: STREAM, id },
    { COUNT: count, ...(blockMs !== undefined ? { BLOCK: blockMs } : {}) },
  );
  // null when BLOCK timed out with nothing new: normal, not an error.
  if (!reply || !Array.isArray(reply) || !reply[0]) return [];
  return toMessages((reply[0] as { messages: { id: string; message: Record<string, string> }[] }).messages);
}

/** Marks a job as done for this group. Call only after its result is stored. */
export async function xAck(group: string, streamId: string) {
  const client = await getClient();
  return client.xAck(STREAM, group, streamId);
}

/**
 * Takes over jobs that another consumer in the group received but didn't ack
 * within `minIdleMs` (it probably crashed). Returns the claimed jobs.
 */
export async function xAutoClaim(group: string, consumer: string, minIdleMs: number, count = 20) {
  const client = await getClient();
  const reply = await client.xAutoClaim(STREAM, group, consumer, minIdleMs, "0-0", { COUNT: count });
  const messages = reply.messages.filter((m): m is NonNullable<typeof m> => m !== null);
  return toMessages(messages as { id: string; message: Record<string, string> }[]);
}
