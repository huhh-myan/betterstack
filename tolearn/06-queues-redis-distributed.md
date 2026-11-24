# 06: Queues, Redis, distributed-systems basics

## 1. Why a queue at all

**Problem it solves:** the work (checking websites) is slow, bursty and fails in many ways. Doing it inside the thing that *decides* the work couples their speeds and failures.

A queue gives you:
- **Decoupling:** the producer (pusher) doesn't know or wait for the consumers (workers).
- **Buffering:** spikes wait in the queue instead of crashing consumers.
- **Scaling:** add consumers to go faster.
- **Durability + tracking:** work survives restarts; you can see what's pending.

## 2. Delivery guarantees (the most-asked queue question)

| Guarantee | How | Risk |
|---|---|---|
| **At-most-once** | ack/delete **before** processing | crash = work **lost** (your old worker) |
| **At-least-once** | ack **after** processing | crash = work **repeated** (your fixed worker) |
| **Exactly-once** | at-least-once **+ idempotent processing** (or transactions spanning queue and DB) | "exactly-once delivery" doesn't really exist over a network; "exactly-once *effect*" does |

**Idempotency** = doing it twice has the same effect as once. Your tick insert isn't idempotent (a retry adds a duplicate row). Fixes: a unique key on `(website_id, region_id, stream_entry_id)` with "insert, ignore on conflict", or upsert.

## 3. Redis Streams + consumer groups (what you used)

You already know most of this (P61–P89). The model in one place:

```
XADD bstack:website * url ... id ...      → appends an entry, id = <ms>-<seq> (server-made)

group "1" ─ last-delivered-id (bookmark, shared by its consumers)
          └ PEL (pending entries list): delivered-but-unacked, per consumer
```

| Command | Meaning |
|---|---|
| `XGROUP CREATE key group $ MKSTREAM` | new group starting at "now" (`$`), creating the stream if needed |
| `XREADGROUP GROUP g c COUNT n BLOCK ms STREAMS key >` | give consumer `c` new entries (moves the bookmark, adds to PEL) |
| same with id `0` | re-read **my** pending entries (crash recovery) |
| `XACK key g id` | done: remove from PEL |
| `XPENDING key g` | what's pending, for whom, how many deliveries |
| `XAUTOCLAIM key g c min-idle 0-0` | take over entries idle too long (dead consumer) |
| `XADD ... MAXLEN ~ N` | trim (ignores groups: slow groups can lose entries) |

**Fan-out vs competing consumers:** different groups = every group gets every entry (regions). Same group = consumers compete for entries (workers in a region).

## 4. The wider landscape (know names and when)

| Tool | Model | Pick it when |
|---|---|---|
| **Redis Streams** | log + consumer groups, in memory (+ persistence) | already have Redis; moderate volume |
| **BullMQ** (on Redis) | job queue library: retries, delays, cron, priorities, UI | Node apps that want features without building them |
| **RabbitMQ** | broker with routing (exchanges, queues), acks | complex routing, per-message acks |
| **Kafka** | partitioned, replicated log; consumers track offsets | very high throughput, replay, event streaming |
| **SQS / Cloud Pub/Sub** | managed queues | on that cloud; no ops |

**Kafka vs Redis Streams in one line:** same idea (append-only log + consumer groups); Kafka is built for disk-backed, partitioned, replicated scale.

## 5. Retries, backoff, dead letters

- **Retry with exponential backoff + jitter:** wait 1 s, 2 s, 4 s… plus randomness, so retries don't stampede a recovering service.
- **Max attempts → dead-letter queue (DLQ):** park jobs that keep failing, alert, inspect by hand. (`XPENDING` shows delivery counts; your worker retries forever today.)
- **Poison message:** a job that can never succeed (malformed). Detect and ack/park it; your worker acks malformed jobs and jobs for deleted websites.

## 6. Redis beyond queues

| Use | How |
|---|---|
| **Cache** | `GET`/`SET key value EX 60`; cache-aside: read cache → miss → read DB → set cache |
| **Rate limiting** | `INCR key` + `EXPIRE` per window (fixed window), or a sorted set / token bucket |
| **Sessions** | session id → user data with TTL |
| **Locks** | `SET lock val NX PX 10000` (only if absent, with expiry) |
| **Leaderboards** | sorted sets (`ZADD`, `ZRANGE`) |
| **Pub/Sub** | fire-and-forget broadcast (no persistence, unlike streams) |

**Cache invalidation** ("one of the two hard things"): when the DB changes, delete or update the cache key, or accept staleness with a short TTL.

## 7. Distributed-systems vocabulary (for system design rounds)

- **Horizontal vs vertical scaling:** more machines vs a bigger machine.
- **Stateless services** scale horizontally easily (your API with JWT); state lives in DB/Redis.
- **CAP theorem:** under a network partition, choose consistency or availability. **Eventual consistency** = replicas converge later.
- **Replication** (copies for reads/failover) vs **sharding/partitioning** (splitting data across machines).
- **Load balancer** spreads requests; **health checks** (your `/health`) remove dead instances.
- **Backpressure:** slowing producers when consumers can't keep up (a growing queue is the signal).
- **Observability:** logs (what happened), metrics (how much/how fast), traces (where time went).

## Recall questions

<details><summary>Your fixed worker is at-least-once. Show a sequence that causes a duplicate tick.</summary>

The worker checks the site, inserts the tick, then crashes before `XACK`. On restart it re-reads its pending entry (id `0`), checks again and inserts a second tick. Fix: idempotent insert keyed by the stream entry id.
</details>

<details><summary>What's the difference between the group's bookmark and the PEL?</summary>

The bookmark (`last-delivered-id`) says what's been handed out to the group (shared). The PEL lists entries handed out but not yet acked, per consumer. Read moves the bookmark; ack removes from the PEL.
</details>

<details><summary>Why add jitter to exponential backoff?</summary>

Without it, many clients that failed together retry at the same moments, hammering the recovering service in waves (thundering herd). Randomness spreads them out.
</details>

<details><summary>How would you rate-limit signin to 5 attempts per minute per username in Redis?</summary>

`INCR ratelimit:signin:<username>`; if the result is 1, `EXPIRE` it 60 s; if it exceeds 5, answer 429 with `Retry-After`. (Fixed window; a sliding window or token bucket is smoother.)
</details>

<details><summary>Kafka or Redis Streams for 100k checks/second with a 7-day replay requirement?</summary>

Kafka: disk-backed partitioned logs with long retention and replay are its core design; Redis keeps the stream in memory, so 7 days at that volume is expensive.
</details>

## Likely interview questions

1. Why use a message queue? Give an example from your project.
2. At-least-once vs exactly-once: how do you get "exactly-once effect"?
3. What happens if a consumer crashes mid-job?
4. How would you design retries for a flaky downstream service?
5. What would you cache in this app, and how would you invalidate it?
6. Explain CAP in simple words.

## Resources

- Redis Streams tutorial: https://redis.io/docs/latest/develop/data-types/streams/
- BullMQ docs (what a full job queue adds): https://docs.bullmq.io/
- *Designing Data-Intensive Applications*, chapters 5, 8, 9, 11
- ByteByteGo / System Design Primer (GitHub `donnemartin/system-design-primer`)
