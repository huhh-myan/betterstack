# pusher

Every few minutes, reads every website from Postgres and adds one job per website to the Redis stream `bstack:website`. Each region's workers then check every website once.

## Run it

Needs `DATABASE_URL` in `apps/pusher/.env`.

| Variable | Default | What it does |
|---|---|---|
| `PUSH_INTERVAL_MS` | `180000` (3 min) | Time between cycles |
| `RUN_ONCE` | – | `1` = push one cycle and exit (for testing) |
| `REDIS_URL` | `redis://localhost:6379` | |
| `REDIS_STREAM_MAXLEN` | `10000` | Approximate stream length kept (see the redis-stream README) |

```bash
bun index.ts
```

Run **one** pusher. Two would queue every website twice per cycle.

## Bugs found in the original code

Line numbers refer to `main` (`apps/pusher/index.ts`).

| # | Where | Bug | Effect |
|---|---|---|---|
| 1 | `:27-29` | `setInterval` commented out | Runs once and stops; nothing is checked again |
| 2 | `:21` | `catch` returns `{e, message}` from `main()`, and nobody reads it | Errors (DB down, Redis down) **vanish silently** |
| 3 | `:14` + `packages/redis/index.ts:40` | `xAddBulk` awaits one `XADD` after another | One round trip per website; slow with many websites |
| 4 | (missing) | The Redis connection is never closed | The process never exits on its own (you noted "then Ctrl+C") |

## What I changed

- Runs every `PUSH_INTERVAL_MS`; `RUN_ONCE=1` for one cycle.
- **Never overlaps cycles**: if a cycle is still running when the next tick fires, it skips that tick.
- Logs how many jobs were queued and how long it took; logs errors and keeps running.
- Uses the pipelined `xAddBulk` (one round trip for all websites) with stream trimming.
- Closes Redis and exits on Ctrl+C / SIGTERM.

## Shortcomings

- **The interval drifts** and isn't aligned to wall-clock minutes. Fine here.
- **Single point of failure:** if the pusher stops, no checks happen and nobody notices. Run it under a supervisor (systemd, Docker restart policy, pm2) and alert if the stream stops growing.
- **Every website, every cycle.** Later, per-website intervals (e.g. 30 s for important sites) would need a "next check at" column and a query for due websites.

## What you should add next

1. Per-website check intervals (`checkEverySeconds` on `Website`), pushing only due websites.
2. A heartbeat or metric ("last cycle at") so you notice when the pusher stops.
3. Leader election (e.g. a Redis lock with `SET NX PX`) so two pushers can run for redundancy without double-queueing.

## Your notes from the code, answered

| Your comment (`main`) | Answer |
|---|---|
| "this is being added one by one not together / not a bulk upload or promise.all its for loop for one entry upload using xAdd" (`:12-13`) | Correct. Now `xAddBulk` queues every `XADD` in one `MULTI` and sends them in one round trip. `Promise.all` over separate `xAdd` calls would also work (node-redis pipelines commands sent in the same tick), but a `MULTI` makes the batch explicit. |
