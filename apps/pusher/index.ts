// Pusher: every PUSH_INTERVAL_MS, puts every website on the Redis stream as a
// job. Each region's workers then check it once. See README.md.

import { db } from "@repo/db-prisma/db";
import { close, xAddBulk } from "@repo/redis-stream/index";

const INTERVAL_MS = Number(process.env.PUSH_INTERVAL_MS ?? 3 * 60 * 1000);
// RUN_ONCE=1 pushes one cycle and exits (handy for testing by hand).
const RUN_ONCE = process.env.RUN_ONCE === "1";

let running = false;

async function pushOnce() {
  // If a cycle is still running (slow DB/Redis), skip this tick instead of
  // stacking cycles on top of each other.
  if (running) {
    console.warn("[pusher] previous cycle still running, skipping");
    return;
  }
  running = true;
  const started = Date.now();
  try {
    const websites = await db.orm.public.Website.select("id", "url").all();
    const added = await xAddBulk(websites);
    console.log(`[pusher] queued ${added} website(s) in ${Date.now() - started} ms`);
  } catch (err) {
    // Log and keep going: the next cycle may succeed.
    console.error("[pusher] cycle failed:", err instanceof Error ? err.message : err);
  } finally {
    running = false;
  }
}

async function shutdown(code = 0) {
  clearInterval(timer);
  await close();
  process.exit(code);
}

await pushOnce();
const timer = RUN_ONCE ? undefined : setInterval(pushOnce, INTERVAL_MS);
if (RUN_ONCE) await shutdown();
else console.log(`[pusher] pushing every ${INTERVAL_MS / 1000} s. Ctrl+C to stop.`);

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
