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

- [ ] **A new website waits up to 6 minutes for its first check.** The pusher's `setInterval`
  fires every 3 minutes counted from when the *pusher* started, not from when a website was
  created, and each run queues every website from the DB. Two delays stack up:
  1. **No push at pusher startup.** There's no `main()` call before `setInterval`, so the first
     push happens 3 minutes after the pusher starts. Fix: call `main()` once, then start the interval.
  2. **The API never queues a new website.** A website created via `POST /user/website/create`
     waits for the pusher's next run (0–3 minutes). Fix: `xAdd` the new website's `{ url, id }` to
     `bstack:website` right after the insert, so the first check happens within about a second; the
     pusher's interval takes over from there. Notes: the API then imports `packages/redis`, so it
     must not create the blocking reader client (see "Every importer opens both connections");
     and if the `xAdd` fails, the website is still created, so log the error rather than failing the
     request (the next pusher run will pick it up anyway).

## Check semantics

- [ ] **Any non-2xx response counts as Down, and the reason isn't stored.** `axios.get` throws on
  4xx/5xx, and the worker's `catch` records every throw as Down. Seen on 2026-11-24: the
  `https://example.com/a10`-style monitors are Down because the path returns 404, in the same
  ~50–130 ms as a real failure, and `not-so-worthu.in` is Down because DNS doesn't resolve. All
  three look identical in the data. Decide what Down means (5xx and network errors only? a
  per-monitor expected status?), and store the HTTP status code or error kind on the tick so the
  dashboard can say *why* it's down. `validateStatus` in the axios request config controls which
  statuses throw.

## Multi-region: central Redis + Postgres, regional workers (see P104)

- [ ] **Architecture:** one main server runs Postgres, Redis, the API, the web app and the pusher;
  each region gets a small VM running only `apps/worker` with its own `REGION_ID` (and a unique
  `WORKER_ID` per worker), connecting to the central Redis. One consumer group per region.
- [ ] **Read `REGION_ID` / `WORKER_ID` from env.** Both are hardcoded to `"1"` in
  `apps/worker/index.ts`, and the tick insert hardcodes `region_id: 1` separately from them.
- [ ] **Redis URL from env.** `packages/redis` calls `createClient()` with no options, so it
  only ever connects to `localhost:6379`. Regional workers need `REDIS_URL`.
- [ ] **Lock Redis down before it's reachable from another machine.** It has no password today
  (`requirepass` empty). Use a password or ACL user + TLS (`rediss://`), or keep it on a private
  network (WireGuard/Tailscale/VPC) and never publish port 6379.
- [ ] **Trim the stream.** `XADD` has no limit, so `bstack:website` grows forever (1,274 entries
  locally on 2026-11-24). Add `MAXLEN ~ <n>` (or `MINID`) to the `xAdd` in `packages/redis`, sized
  so every region's worker can fall behind a bit without losing messages.
- [ ] **Persist Redis.** Turn on AOF (`appendonly yes`) and mount a named volume at `/data`, so a
  restart or a recreated container doesn't lose the stream and the consumer groups.
- [ ] **Recover stuck messages.** Messages delivered to a worker that died before acking stay in
  its pending list. Run `XAUTOCLAIM` periodically so another worker in the group takes them over.
- [ ] **Remove or serve consumer group `2`.** Locally it has no consumers and a lag of 1,172
  messages. Either run a worker for region 2 or `XGROUP DESTROY` it.
- [ ] **Later: workers send results to a stream instead of writing to Postgres.** One writer next
  to the DB inserts ticks, so regional VMs need no DB credentials and the DB stays private.

## SSH and server access (see P105)

- [ ] **Keep private keys out of the repo.** On 2026-11-24 `ssh-keygen` saved `claude-ssh` and
  `claude-ssh.pub` in the repo root (moved to `~/.ssh` before anything was committed). Add
  `*.pem`, `id_*`, `*_ed25519`, `*-ssh` and similar patterns to `.gitignore` as a safety net.
- [ ] **Decide on a passphrase for `~/.ssh/claude-ssh`.** Without one, anyone who copies the file
  can log into the server. With one, load it into `ssh-agent` for the session.
- [ ] **Add a `~/.ssh/config` entry** (`Host bstack`, `HostName <ip>`, `User`, `IdentityFile
  ~/.ssh/claude-ssh`) so `ssh bstack` works without flags.
- [ ] **On the server: turn off password logins and root login.** In `/etc/ssh/sshd_config`:
  `PasswordAuthentication no`, `PermitRootLogin prohibit-password` (or create a normal user
  with sudo and set `PermitRootLogin no`). Keys only.
- [ ] **One key per person/machine.** If a friend ever needs access, add *their* public key to
  `authorized_keys`; never share `claude-ssh`. Remove a key by deleting its line.

## Live site (bstack.daszeichen.xyz, deployed 2026-11-24; see hosting.md on feature/web-frontend)

- [ ] **Hash passwords before friends sign up for real.** Passwords are stored in plain text on
  the live server and `/signup` returns them. `Bun.password.hash` / `Bun.password.verify`.
- [ ] **Move the JWT secret to env and rotate it.** It is hardcoded in `apps/api/index.ts` and
  `middleware.ts` and public on GitHub, so anyone can forge a token for any live user.
- [ ] **Stop sending error objects to clients.** The live API returns full stack traces with
  server paths (`/opt/bstack/...`, library versions), e.g. for a bad token. Send a fixed
  message, log the error on the server.
- [ ] **Bind the API to 127.0.0.1.** Express listens on all interfaces (`*:3000`); only ufw keeps
  it private. Pass a host to `app.listen` so it's private even if the firewall changes.
- [ ] **Database backups.** Live data exists only in the `bstack-pg` Docker volume. A nightly
  `pg_dump` (cron/systemd timer) copied off the server, and a tested restore.
- [ ] **Deploy from git, not from my working tree.** The first deploy copied uncommitted local
  files with `tar`. Commit + push, then `git pull` on the server (or a small deploy script), so
  the live code always matches a commit.
- [ ] **Redis password.** Live Redis has none (safe only because it listens on 127.0.0.1); needs
  `REDIS_URL` support in `packages/redis` first.
- [ ] **Guard against the Docker/ufw bypass (see P107).** Live Postgres and Redis are safe because
  they're published as `127.0.0.1:5432` / `127.0.0.1:6379`; a later `docker run -p 5432:5432` would
  silently open them to the internet despite ufw. Make loopback the default: add
  `{ "ip": "127.0.0.1" }` to `/etc/docker/daemon.json` on the server and restart Docker. After any
  container change, check with `ss -tlnp` on the server and a port test from another machine.
