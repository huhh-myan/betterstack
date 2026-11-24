# @repo/redis-stream

The job queue between the pusher and the workers, on a Redis **stream** with one **consumer group per region**.

```
pusher ──XADD──▶ bstack:website ──XREADGROUP──▶ group "1" (region 1): worker w1, w2 …
                                └─XREADGROUP──▶ group "2" (region 2): worker w1 …
```

Every group sees every job (so every region checks every website); inside a group each job goes to one consumer (so a region's workers share the load).

## API

```ts
import { STREAM, ensureGroup, xAdd, xAddBulk, xReadGroup, xAck, xAutoClaim, close } from "@repo/redis-stream/index";
```

| Function | What it does |
|---|---|
| `getClient()` | Connects on first use (5 s timeout), reconnects with backoff after that |
| `ensureGroup(group)` | `XGROUP CREATE … $ MKSTREAM`, ignoring `BUSYGROUP` (already exists) |
| `xAdd(job)` / `xAddBulk(jobs)` | Add jobs; the bulk version sends them all in one `MULTI` round trip. Both trim the stream to about `REDIS_STREAM_MAXLEN` |
| `xReadGroup(group, consumer, { id, count, blockMs })` | `id: ">"` new jobs, `id: "0"` this consumer's unacked jobs; `blockMs` waits for work |
| `xAck(group, id)` | Marks a job done for that group |
| `xAutoClaim(group, consumer, minIdleMs)` | Takes over jobs other consumers left unacked for too long |
| `close()` | Closes the connection so the process can exit |

| Variable | Default |
|---|---|
| `REDIS_URL` | `redis://localhost:6379` |
| `REDIS_STREAM` | `bstack:website` |
| `REDIS_STREAM_MAXLEN` | `10000` |

## Bugs found in the original code

Line numbers refer to `main` (`packages/redis/index.ts`).

| # | Where | Bug | Effect |
|---|---|---|---|
| 1 | `:5` | `createClient()` with no URL | Always localhost:6379; can't point at another Redis |
| 2 | `:25` | Top-level `await redisConnector()` | Importing the package connects. If Redis is down, **the import hangs forever** (node-redis keeps retrying), so the API/worker/pusher never start and print nothing useful |
| 3 | `:53` | `xRead` with id `">"` | `>` only means something in `XREADGROUP`; `XREAD` rejects it |
| 4 | `:39-43` | `xAddBulk` awaits each `XADD` in turn | One round trip per job |
| 5 | (missing) | No consumer-group creation | Groups had to be created by hand |
| 6 | (missing) | Stream never trimmed | Grows forever (every website, every 3 minutes) |
| 7 | `:32` | `xAdd` result commented out | Callers can't log or check the entry id |

## What I changed

All of the above: env-configured URL and stream name, lazy connect with a timeout and a clear error, removed `xRead`, pipelined `xAddBulk`, `ensureGroup`, `MAXLEN ~` trimming on every add, `xReadGroup` with `BLOCK` and pending reads, `xAutoClaim`, `close()`, and typed results (`StreamMessage`).

## Things to know

- **Trimming ignores consumer groups.** `MAXLEN` deletes the oldest entries even if a slow region hasn't read them yet. Keep `REDIS_STREAM_MAXLEN` well above one cycle (number of websites × a few cycles).
- **`~` (approximate) trimming** lets Redis trim whole internal nodes, which is much cheaper than exact trimming.
- **Pending entries** (delivered, not acked) are what make at-least-once delivery work. `XPENDING bstack:website <group>` shows them.
- **Blocking reads hold the connection.** While a worker waits in `BLOCK`, other commands on the *same* client wait too. The worker reads, processes, then reads again, so that's fine; a program that needs to do other Redis work while blocked should use a second client.

## What you should add next

1. **Dead-letter stream** for jobs delivered too many times (`XPENDING` shows the delivery count).
2. **Health/metrics helpers**: `XLEN`, `XINFO GROUPS` (lag per group) for a status page.
3. Per-job idempotency ids (Redis 8.6 `XADD … IDMP`) so a retried push can't add the same job twice.

## Your notes from the code, answered

| Your comment (`main`) | Answer |
|---|---|
| "try using Promise.settled or Promise.allSettled" (`:38`) | For adding jobs, one `MULTI` is simpler than `allSettled` over many `xAdd` calls: one round trip, and one error if Redis is down. |
| "replace the stream name bstack:website with global variable" (`:72`) | Done: `STREAM`, from `REDIS_STREAM` or `bstack:website`. The tests use a different stream so they never touch real jobs. |
| The shape of the `XREADGROUP` reply (`:58-68`) | Your notes were right: `[{ name, messages: [{ id, message }] }]`, or `null` after a `BLOCK` timeout. `xReadGroup` now returns just the messages (or `[]`). |
