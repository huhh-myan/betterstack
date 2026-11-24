// Worker: takes website jobs from the Redis stream for one region, checks each
// site, stores the result as a WebsiteTicks row, then acks the job.
// See README.md for the full lifecycle and why the order matters.

import { db } from "@repo/db-prisma/db";
import {
  close,
  ensureGroup,
  type StreamMessage,
  xAck,
  xAutoClaim,
  xReadGroup,
} from "@repo/redis-stream/index";
import { checkWebsite } from "./check";

const REGION_ID = Number(process.env.REGION_ID);
const WORKER_ID = process.env.WORKER_ID;
if (!Number.isInteger(REGION_ID) || REGION_ID <= 0) {
  throw new Error("REGION_ID must be set to the id of a row in the Region table (e.g. REGION_ID=1).");
}
if (!WORKER_ID) {
  // Must be stable across restarts: it's how the worker finds the jobs it was
  // holding when it stopped.
  throw new Error("WORKER_ID must be set (e.g. WORKER_ID=w1). Use a different one for each worker in a region.");
}

/** One consumer group per region: every region checks every website. */
const GROUP = String(REGION_ID);
const BATCH_SIZE = Number(process.env.BATCH_SIZE ?? 10);
const BLOCK_MS = 5_000;
/** A job unacked this long is assumed to belong to a dead worker. */
const CLAIM_IDLE_MS = 5 * 60 * 1000;
const CLAIM_EVERY_MS = 60 * 1000;

let stopping = false;

async function handle({ id: streamId, message }: StreamMessage) {
  if (!message.url || !message.id) {
    // A malformed job will never succeed; ack it so it doesn't come back forever.
    console.warn(`[worker] dropping malformed job ${streamId}`);
    await xAck(GROUP, streamId);
    return;
  }

  // 1. Check the site. checkWebsite never throws: failures are results.
  const result = await checkWebsite(message.url);

  // 2. Store the result. Separate from the check, so a DB error can't turn a
  //    healthy site into a false "Down".
  try {
    await db.orm.public.WebsiteTicks.create({
      response_time_ms: result.responseTimeMs,
      status: result.status,
      http_status: result.httpStatus,
      error: result.error,
      createdAt: result.startedAt,
      region_id: REGION_ID,
      website_id: message.id,
    });
  } catch (err) {
    // The website may have been deleted after the job was queued: then the
    // job can never succeed, so ack it. Otherwise leave it unacked so it is
    // retried (pending list / XAUTOCLAIM).
    const stillExists = await db.orm.public.Website.where({ id: message.id }).select("id").first().catch(() => null);
    if (!stillExists) {
      await xAck(GROUP, streamId);
      return;
    }
    throw err;
  }

  // 3. Ack only now. If the worker dies before this line, the job stays
  //    pending and is checked again: at-least-once delivery.
  await xAck(GROUP, streamId);
  console.log(
    `[worker ${WORKER_ID}] ${result.status.padEnd(7)} ${message.url} ${result.responseTimeMs} ms${result.error ? ` (${result.error})` : ""}`,
  );
}

async function processBatch(messages: StreamMessage[]) {
  if (!messages.length) return;
  // allSettled: one bad job must not stop the others in the batch.
  const results = await Promise.allSettled(messages.map(handle));
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const reason = r.reason instanceof Error ? r.reason.message : String(r.reason);
      console.error(`[worker ${WORKER_ID}] job ${messages[i]!.id} failed, will retry: ${reason}`);
    }
  });
}

async function main() {
  const region = await db.orm.public.Region.where({ id: REGION_ID }).first();
  if (!region) throw new Error(`Region ${REGION_ID} doesn't exist. Create it first (admin: POST /region/create).`);

  await ensureGroup(GROUP);
  console.log(`[worker ${WORKER_ID}] region ${REGION_ID} (${region.name}), group "${GROUP}"`);

  // Jobs this worker received before it stopped but never acked.
  for (;;) {
    const pending = await xReadGroup(GROUP, WORKER_ID!, { id: "0", count: 50 });
    if (!pending.length) break;
    console.log(`[worker ${WORKER_ID}] recovering ${pending.length} pending job(s)`);
    await processBatch(pending);
  }

  let lastClaim = 0;
  while (!stopping) {
    try {
      // Jobs stuck with a worker that died (unacked for CLAIM_IDLE_MS).
      if (Date.now() - lastClaim > CLAIM_EVERY_MS) {
        lastClaim = Date.now();
        const claimed = await xAutoClaim(GROUP, WORKER_ID!, CLAIM_IDLE_MS, BATCH_SIZE);
        if (claimed.length) console.log(`[worker ${WORKER_ID}] claimed ${claimed.length} stale job(s)`);
        await processBatch(claimed);
      }
      // Waits up to BLOCK_MS for new jobs; an empty result is normal.
      const messages = await xReadGroup(GROUP, WORKER_ID!, { id: ">", count: BATCH_SIZE, blockMs: BLOCK_MS });
      await processBatch(messages);
    } catch (err) {
      // e.g. Redis restarted: log, wait a bit, try again instead of crashing.
      console.error(`[worker ${WORKER_ID}] loop error:`, err instanceof Error ? err.message : err);
      await new Promise((r) => setTimeout(r, 2_000));
    }
  }
  await close();
  console.log(`[worker ${WORKER_ID}] stopped`);
  process.exit(0);
}

function stop() {
  if (stopping) process.exit(1); // second Ctrl+C: leave now
  stopping = true;
  console.log(`[worker ${WORKER_ID}] stopping after the current batch...`);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

main().catch(async (err) => {
  console.error(`[worker ${WORKER_ID}]`, err instanceof Error ? err.message : err);
  await close();
  process.exit(1);
});
