# TODO

- [ ] **Cascade-delete website ticks.** `WebsiteTicks.website_id` references `Website.id` with no
  `onDelete` rule, so deleting a website that has ticks fails on the foreign key. Add
  `onDelete: Cascade` to the `website` relation on `WebsiteTicks` in
  `packages/db-prisma/src/prisma/contract.prisma`, re-emit the contract, and migrate. Until then,
  `DELETE /user/website/:id` must delete the website's ticks first.
  - **Race in the two-step delete.** The route deletes the ticks, then the website. If the worker
    inserts a tick between those two statements, the website delete hits the foreign key and
    fails. Wrapping both in a transaction doesn't fix it: the worker's insert still lands between
    them. Cascade fixes it, because Postgres removes the website and its ticks in one statement.
    Once cascade is in, drop the tick delete from the route.
- [ ] **`DELETE /user/website/:id` makes three DB calls.** It looks the website up to check
  ownership, deletes its ticks, then deletes the website. With cascade in place this collapses to
  one call: delete the website filtered by `id` and `user_id`, and use the returned row (or `null`)
  to tell "deleted" from "not found / not yours". No separate ownership lookup or tick delete needed.

## Status codes and error responses (apps/api/index.ts)

- [ ] **Auth failures return 400.** `jsonMiddleware` answers a missing or bad token with 400. It
  should be 401. The web frontend spots a logged-out user by the exact message
  `"Authorization Error!"` (`apps/web/lib/api.ts`), so update that check in the same change.
- [ ] **Every signup failure is 409.** `/signup` answers 409 for any error. Return 409 only for a
  taken username, 400 for bad input and 500 for everything else. The frontend turns any 409
  into "That username is already taken."
- [ ] **Signin failures are 409.** Wrong credentials should be 401, missing fields 400.
- [ ] **Signup leaks the password.** `/signup` returns the whole user row, password included,
  as `user_id`. Return only `{ id, username }`.
- [ ] **`DELETE /user/website/:id` mislabels results.** Any thrown error is 404, so a database
  failure looks like "not found". When nothing matched, `.delete()` returns null and the route
  still answers 200 "Successfully deleted". It should be 404 when nothing matched and 500 when
  the delete throws.
- [ ] **`POST /region/create` never responds without a name.** It runs a bare `return;`, so the
  request hangs. It should answer 400.
- [ ] **Catch-all 400s.** Most routes answer 400 for any thrown error, including database
  failures. Server faults should be 500.

## Type errors

- [ ] **`packages/db-prisma/src/prisma/db.ts:7` TS1484.** `SqlMigrationRunnerFailure` is a type
  imported as a value, which `verbatimModuleSyntax` rejects. It's unused, along with
  `createSqlTextSources`, `warn` and `before` on nearby lines: remove them, or use `import type`.

## Checker pipeline

- [ ] **Consumer groups are created by hand.** Each region's worker reads `bstack:website` as a
  consumer group named after the region id, and the group has to exist before the pusher queues
  anything (`XGROUP CREATE bstack:website <region-id> $ MKSTREAM`; `$` skips messages added
  before the group existed). Options:
  - Create the group when a region is created (`POST /region/create` calls `xGroupCreate` after the insert).
  - Or have each worker create its own group on startup, ignoring the `BUSYGROUP` error if it
    already exists. This is the usual pattern: the worker is the one that needs the group, and it
    also covers regions created before this change.
  - Until then: document the `XGROUP CREATE` step in RUN.md as a manual step before starting.
- [ ] **The blocking stream read ties up the shared Redis connection.**
  - **What happens:** `packages/redis/index.ts` makes one client at module level (`redisClient`)
    and every function in the package uses it: `xAdd`, `xReadGroup`, `xAck`. That client is one
    TCP connection. Redis answers commands on a connection strictly in the order they were sent.
    `xReadGroup` uses `BLOCK: 0`, which means "don't reply until a message arrives, however long
    that takes". While it waits, every other command sent on the same connection sits in the
    queue behind it and gets no reply either.
  - **Why it's fine today:** the worker does one thing at a time. It reads, and only after the
    read returns does it ack and write ticks (ticks go to Postgres, not Redis). Nothing else
    uses Redis in the worker process while the read is waiting.
  - **When it breaks:**
    1. *Reading the next batch while the current one is still being checked.* A natural speed-up:
       start the next `xReadGroup` without waiting for the previous batch's checks to finish.
       When those checks finish, their `xAck` calls queue behind the blocked read. If the stream
       is quiet (the pusher only adds every 3 minutes), the acks wait up to 3 minutes, or forever
       if nothing new is pushed. Unacked messages stay in the pending list and are redelivered
       to another worker, so sites get checked twice.
    2. *The worker also writes to Redis.* For example, putting check results on a second stream
       or queue for a separate DB writer (the plan in the pusher commit message), sending a
       heartbeat, or caching the last status. Those writes hang until the next website arrives.
    3. *One process both pushes and reads.* If the pusher and worker are ever merged, or the API
       imports the package to create consumer groups and also reads, `xAdd` would queue behind
       the read that is waiting for that very `xAdd`: a deadlock.
    4. *Shutdown.* `quit()` is also queued behind the blocked read, so Ctrl+C or a deploy restart
       hangs until a message happens to arrive.
  - **Fix:** give the blocking read its own connection. node-redis supports this directly:
    `redisClient.duplicate()` returns a new client with the same settings; `connect()` it and use
    it only for `xReadGroup`. Everything else (`xAdd`, `xAck`, group creation) stays on the normal
    client. node-redis v5+ also has `createClientPool()` for running commands on separate
    connections. (v4's `commandOptions({ isolated: true })` is gone in v5/v6.)
  - **Mitigation without a second connection:** use a finite block, e.g. `BLOCK: 5000`, and loop.
    Other commands then wait at most 5 seconds instead of forever. It reduces the problem but
    doesn't solve it.
  - **Progress on `feature/web-frontend`:** `packages/redis/index.ts` now makes `redisClientWorker`
    with `redisClient.duplicate()` and uses it for `xRead`, `xReadGroup` and `xAck`. Left to do:
    - [x] **`connect()` the duplicate.** Done: `createDuplicateRedisClient()` in
      `packages/redis/index.ts` duplicates and connects it; the worker passes it to
      `xReadGroup` and `xAck`.
    - [ ] **The worker opens a new connection every loop and closes it mid-batch.**
      `createDuplicateRedisClient()` is called inside `while(1)`, so every batch opens a fresh
      TCP connection (and, without the close, leaks one per loop). `duplicateRedisClient.close()`
      sits inside the `for` loop over the batch's messages, so it runs after the *first* ack;
      the second `xAck` in the same batch then fails with `ClientClosedError` and the worker
      crashes on any batch of 2+ messages (`COUNT` is 5). Create the duplicate once, before the
      loop, and close it only on shutdown.
      - Shutdown: handle `SIGINT`/`SIGTERM`; `destroy()` the blocking client (`close()` waits for
        pending commands, and a `BLOCK 0` read may never finish), `close()` the main client.
    - [ ] **Attach an `error` listener to the duplicate.** `duplicate()` copies the options, not
      the event listeners. Without `.on('error', …)`, a Redis error on that connection is an
      unhandled `error` event and crashes the process.
    - [x] **Move `xAck` back to `redisClient`.** Done. The duplicate is the connection that blocks.
      Putting `xAck` on it brings back the queue-behind-the-blocked-read problem the duplicate
      was meant to fix. Only the blocking read belongs on the duplicate.
    - [ ] **Every importer opens both connections.** The clients are created at module load, so
      the pusher (which only does `xAdd`) and anything else that imports the package also opens
      the reader connection. Create the reader lazily on first `xReadGroup`, or split the
      package into a producer part and a consumer part.
- [ ] **Run several workers per region (later).** Spawn more workers with Bun's `Worker`
  (worker threads) or as separate processes, each with its own consumer name (`WORKER_ID`) in
  the same group so Redis splits the batch between them.
  - Relation to the blocking read: each worker thread loads `packages/redis` separately, so each
    gets its own clients and connections. Threads don't block each other's Redis commands.
    Inside one worker, though, the blocking read and other Redis commands still share a
    connection unless the read has its own (the duplicate). More workers don't replace that fix.
  - Each worker needs a distinct `WORKER_ID`; two workers with the same consumer name share one
    pending list and can't tell whose messages are whose.

## Rule: Redis needs a separate connection for blocking reads and pub/sub

- [ ] Apply this everywhere Redis is used: **a connection that runs a blocking command
  (`XREAD`/`XREADGROUP` with `BLOCK`, `BLPOP`, `BRPOP`, `BLMOVE`, `BZPOPMIN`…) or that
  subscribes (`SUBSCRIBE`/`PSUBSCRIBE`) gets its own client**, made with `client.duplicate()` and
  connected once. Normal commands stay on the main client. Reason: a blocked connection answers
  nothing else until the blocking command returns, and a subscribed connection is in subscriber
  mode and refuses normal commands altogether. Check this when adding a results stream, a
  pub/sub channel for live dashboard updates, or more workers.

## Graceful shutdown

- [ ] **No process handles `SIGINT`/`SIGTERM`** (see P103 in the learning log). On Ctrl+C or a
  deploy, the worker dies mid-batch (messages read but not acked get redelivered, sites checked
  twice), and connections are dropped without closing.
  - `apps/worker`: on `SIGINT`/`SIGTERM`, stop the read loop, let the current batch finish and
    ack, `destroy()` the blocking Redis client, `close()` the main Redis client and the DB, then
    `process.exit(0)`.
  - `apps/pusher`: `clearInterval` the timer, let a push in progress finish, close Redis and the DB.
  - `apps/api`: `server.close()` (keep the value `app.listen` returns), let in-flight requests
    finish, close the DB.
  - Keep it under ~10 seconds: `docker stop` sends `SIGKILL` after that, which can't be handled.
  - Test `SIGTERM` handling on Linux or in Docker; on Windows it doesn't fire for Task Manager
    or `taskkill`.
