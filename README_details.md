# betteruptime: project details

The state of the project as of **2026-11-23**, the **minimal backend checkpoint**: what is built, how it works, what is known to be wrong, and what is left.

Related files:
- **Learning log** (current version, outside this repo folder): `d:\cohort\betteruptime\learning\bun-init-log.md`. It holds the reasoning and sources behind every decision (problem numbers `Pn`). The `learning/` folder inside this repo is an older copy from 2026-11-13.
- **Manual API tests:** `claude_tests/tests.md` + `run-NNN-test-N.md` (latest: run 016).

---

## 1. What it is

An uptime monitor, similar to Better Stack / Better Uptime:
- A user signs up and registers websites.
- A **pusher** periodically puts every website on a Redis stream as a job.
- **Workers** in different **regions** take those jobs and request each website.
- Each check is stored as a **tick**: up/down, response time, which region checked it, and when.

## 2. Status at this checkpoint

| Part | State |
|---|---|
| **API** (users, JWT auth, websites, regions) | Working. Last recorded full pass: test 3, run 016 (2026-11-13) |
| **Pusher** (`apps/pusher`) | Working, but runs **once** per start (the interval is commented out) |
| **Redis stream + consumer groups** | Working. Groups `1` and `2` were created by hand |
| **Worker** (`apps/worker`) | Reads one batch of 5, checks the sites, writes ticks. Tested by hand. Has known bugs (section 11.1) |
| **Database** | Contract emitted. A migration for the autoincrement ids exists. Confirm it's applied with `prisma db verify` |
| **Automated tests** (`apps/tests`) | Files exist but are empty |
| **Frontend** (`apps/web`) | Next.js template, not started |
| **Git** | Everything after the "test 3 passed" commit is **uncommitted**, including the pusher, worker and Redis package |

## 3. Stack

| Piece | Choice | Notes |
|---|---|---|
| Runtime / package manager | **Bun** 1.3.14 | Runs `.ts` directly (transpiles; does **not** type-check) |
| Monorepo | **Turborepo** with Bun workspaces | `apps/*` and `packages/*` |
| HTTP server | **Express 5** | Async errors are forwarded to the error handler automatically |
| Database | **Postgres 18** in Docker | container `rocky_road`, database `bstack` |
| ORM | **Prisma 8 RC** | runtime `8.0.0-rc.23`, CLI `rc.33`; uses a *contract* instead of the classic `schema.prisma` + migrate flow |
| Queue | **Redis Streams** in Docker | container `wizardly_rubin`, stream `bstack:website` |
| Redis client | **node-redis** (`redis` 6.3.1) | Chosen over Bun's built-in client |
| Website checks | **axios** | Throws on non-2xx by default; no timeout by default |
| Auth | **jose** (JWT, HS256) | replaced `jsonwebtoken` |
| Language | TypeScript 7 | shared configs in `packages/typescript-config` |

## 4. How a check flows

```
Postgres "Website"
      │  pusher reads every row
      ▼
apps/pusher ── XADD (url, id) ──▶ Redis stream: bstack:website
                                        │
                     ┌──────────────────┴──────────────────┐
                 group "1"                             group "2"
              (region 1 workers)                    (region 2 workers)
                     │ XREADGROUP >
                     ▼
                apps/worker ── axios.get(url) ──▶ the website
                     │
                     ├── WebsiteTicks.create (Up / Down, response time)
                     └── XACK
```

Design decisions:
- **One stream, one consumer group per region.** Every group receives every entry, so every region checks every website. Inside a group, each entry goes to one worker, so workers share the load.
- **The pusher knows nothing about regions.** Adding a region means creating a group and starting a worker.
- **Per-region streams are deferred** until users can choose regions per website (P76).
- **Delivery is at-least-once:** after a crash, a job can run twice, but isn't silently lost (once the ack order is fixed, see 11.1).

## 5. Layout (the parts that matter)

```
apps/
  api/
    index.ts        all routes + app.listen (no routers yet)
    middleware.ts   jsonMiddleware: JWT verification, sets req.user_id
    express.d.ts    declaration merging: adds user_id?: string to Express's Request
    redis.ts        early experiment, unused (nothing imports it)
  pusher/index.ts   reads all websites, adds them to the stream
  worker/index.ts   reads a batch, checks sites, writes ticks, acks
  tests/            empty test files, for later
  web/              Next.js app from the template
packages/
  db-prisma/
    src/prisma/contract.prisma   the data model
    src/prisma/db.ts             the db client + a query-logging middleware
    migrations/app/              baseline + region_id_to_autoincrement
  redis/            @repo/redis-stream: client + xAdd, xAddBulk, xRead, xReadGroup, xAck
  typescript-config/, eslint-config/, ui/   template packages
```

## 6. Data model (`contract.prisma`)

| Model | Fields | Notes |
|---|---|---|
| `User` | `id` (uuid, `@onCreate`), `username` (unique), `password`, `createdAt`, `websites[]` | password is stored in **plain text** |
| `Website` | `id` (uuid), `url`, `timeAdded`, `user_id` → User, `ticks[]` | one owner per website |
| `Region` | `id` (autoincrement), `name`, `ticks[]` | name is not unique yet |
| `WebsiteTicks` | `id` (autoincrement), `response_time_ms`, `status`, `createdAt`, `region_id` → Region, `website_id` → Website | written by the worker. `createdAt` is insert time, not check time |
| enum `status` | `Up`, `Down`, `Unknown` | the worker only writes `Up` and `Down` so far |

Prisma 8 facts this project depends on:
- `@onCreate(...)` values are generated **by the Prisma client** at insert time. `@default(...)` values are generated **by the database**. A row inserted from `psql` only gets the `@default` ones.
- There are three copies of the schema: `contract.prisma`, the emitted `contract.json` / `contract.d.ts`, and the real database. Editing the first changes neither of the others (P84).
- Schema changes: emit the contract, then `db update` (try `--dry-run` first) for quick development changes, or `migration plan` → `db migrate` for real migrations (P47).
- `db migrate` doesn't advance the `db` ref (`migrations/app/refs/db.json`), which currently still points at the old contract. Refresh it, or the next `migration plan` starts from the wrong place.
- An `undefined` value in a filter is **dropped from the WHERE clause**, so `first({ username: undefined })` returns the first row of the table. This caused an auth bypass (P54).
- `.first()` returns `null` when nothing matches; it doesn't throw.

## 7. API (current behaviour)

The server listens on port **3000**. Request bodies are parsed by `express.json()` and `express.urlencoded()`.

**Auth:** `POST /signin` returns a JWT (HS256, `sub` = user id, expires in 2h). Protected routes need the **raw token** as the whole `Authorization` header value (no `Bearer ` prefix, by choice for now). `jsonMiddleware` verifies it and puts the id on `req.user_id`.

| Method | Route | Auth | Does | Current responses |
|---|---|---|---|---|
| POST | `/signup` | none | creates a user | 200 with the **whole user object, password included**; any error → 409 |
| POST | `/signin` | none | checks username + password, signs a JWT | 200 `{user_id, token}`; any error → 409 with a message |
| GET | `/user` | token | returns the caller's id from the token | 200 `{user_id}` |
| POST | `/user/website/create` | token | creates a website owned by the **token's** user (the body's `user_id` is ignored) | 200 `{website}`; error → 400 |
| GET | `/user/website/:id` | token | returns the website if the caller owns it | 200 `{website}`, or 200 `{website: null}` if not found / not yours |
| GET | `/region/list` | token | lists all regions | 200 `[...]` |
| POST | `/region/create` | token | creates a region from `{"name": ...}` | 200 `{message}`; error → 400 |

`app.use(jsonMiddleware)` sits **after** `/signup`, `/signin` and `/user`, so every route registered below it needs a token.

**Temporary status-code convention (decided 2026-11-12):** every `/signin` error is 409, other errors are generally 400, and successes use Express's default 200. Proper codes are on the to-do list.

## 8. Running it locally

1. Start the Docker containers: `rocky_road` (Postgres) and `wizardly_rubin` (Redis).
2. Create each region's group once, in `redis-cli`: `XGROUP CREATE bstack:website <region-id> $ MKSTREAM`. Workers don't create it yet.
3. Make sure `"Region"` has a row with id `1`, because the worker hardcodes `region_id: 1`.
4. **Run each app from its own folder**, because `.env` is loaded from where the command runs:
   - `apps/api`: `bun index.ts`
   - `apps/pusher`: `bun index.ts`, then Ctrl+C (the open Redis connection keeps it alive)
   - `apps/worker`: `bun index.ts`, then Ctrl+C (handles one batch of 5)

Useful Redis checks: `XLEN bstack:website`, `XINFO GROUPS bstack:website`, `XPENDING bstack:website 1`, `XRANGE bstack:website - +` (read-only).

## 9. Database query logging

`db.ts` registers a Prisma 8 middleware (`queryLogger`) whose `beforeEncode` hook prints each query's SQL (`console.log(plan.sql)`) **before it runs**, so a printed query may still fail. It runs in every app that imports `db`. This is how the "no WHERE clause" signin bypass was found (P54, P55).

## 10. Testing so far

- **Manual API tests**, run with curl from `claude_tests/tests.md`:
  - **Test 1:** happy path (signup → signin → create website → get website).
  - **Test 2:** bad sign-ins (wrong password, unknown user, missing password, missing username).
  - **Test 3:** the JWT middleware and every protected route:
    - absent, garbage, tampered and alg-none tokens; the `Bearer` form
    - one user creating or reading another user's website (IDOR)
    - regions
- **Run 016 (2026-11-13):** every step passes under the temporary conventions. Not rerun since the `Region.id` contract change.
- **Pusher → stream → worker:** tested by hand with `redis-cli`. There's no recorded test definition or run file for it yet.
- **Type check (2026-11-23):** one error across api, pusher, worker and redis: `db.ts:7`, an unused import (`SqlMigrationRunnerFailure`).
- **Automated tests** (`bun test` + supertest, separating `app` from `listen`, a separate test DB) are planned (P51).

### Bugs found and fixed through testing
| Problem | Fix |
|---|---|
| `req.body` undefined | added the body parsers (P53) |
| signin with no password logged in as anyone with that username | guard both fields; look up by username, compare the password in code (P54) |
| signin with no username returned the first user in the table | same guard (P54) |
| error responses showed `error: {}` | send `error.message` (Error properties aren't enumerable, so `JSON.stringify` skips them) |
| bad tokens got a 200 | middleware now returns an error status |
| creating a website for someone else via `user_id` in the body | owner now comes from the token |
| reading someone else's website by id | the query filters by `user_id` too |
| region create: id null → fractional id → `name` null | id generated + floored; handler reads `name` |
| `user_id?: String` type error | use lowercase `string` (P59, P67) |
| pusher printed the SQL, then nothing | no `.env` in `apps/pusher`, and the `catch` hid the error (P70) |
| every import pushed 4 fake jobs | removed the top-level `xAddBulk` call (P70) |
| acks did nothing | pass the real `message.id`, not `'0'` (P79) |
| `id` required on `WebsiteTicks.create` | re-emit the contract (P84) |

## 11. What remains

### 11.1 Worker bugs (fix these first)
1. **Jobs are acked before the work** (`worker/index.ts:51-55`). A crash during a check loses the job. The ack belongs after that job's DB write.
2. **`console.log(promisesAxiosArray)` is inside the callback** (`:90`). The variable isn't initialised yet, so every job throws a `ReferenceError` after its tick is written, and every `allSettled` result is `rejected`. Nothing reads the results, so it's silent. The log belongs after the `allSettled`.
3. **False `Down`** (`:65-87`). The DB write is inside the same `try` as the request, so a failed insert for a healthy site lands in the `catch` (P86).
4. **No request timeout** (`:66`). A hanging site means the batch never finishes (P86).
5. **`allSettled` results aren't inspected**, so failures disappear (P87).

### 11.2 Finishing the pipeline
- **Worker:** turn the `while` loop on, use `BLOCK`, treat an empty read as normal instead of throwing (`:45`), read `REGION_ID` / `WORKER_ID` from env, and use `REGION_ID` for `region_id`.
- **Worker startup:** create the group (handle `BUSYGROUP`), and recover its own pending jobs with ID `0` before reading `>`. `xReadGroup` hardcodes `>` today (P82).
- **Dead workers:** reclaim their jobs with `XAUTOCLAIM` (P71).
- **Pusher:** turn the interval on, log errors in the `catch`, and send in bulk (`xAddBulk` goes one at a time) (P66).
- **Stream growth:** nothing trims it. Choose a limit well above one cycle, because trimming ignores groups (P73).
- **Redis package:** `xRead` passes `>`, which is only valid in `XREADGROUP` (`packages/redis/index.ts:53`). Read the URL from `REDIS_URL`. If Redis is down at startup, the top-level `await` waits forever (P64).
- **Status rules:** decide on 401/403/429, use `Unknown`, and store the HTTP status code and error reason (P90).
- **Later:** keyword/page validity checks, a queue for DB writes, alerting confirmed by more than one region.

### 11.3 API bugs
1. **`POST /region/create` with no `name` hangs:** the guard does a bare `return` without sending a response.
2. **`GET /user/website/:id` error path:** `res.json(400).json(...)` instead of `res.status(400).json(...)`.
3. **Unknown routes return the auth error instead of 404:** the global `jsonMiddleware` runs before Express's 404 handler.
4. **`/region/create` still sends a random id** even though `Region.id` is now autoincrement. A random id can later collide with the sequence.

### 11.4 Security
- Passwords are stored and returned in **plain text**: hash them (e.g. `Bun.password`), and never return the password field (P54).
- The **JWT secret is hard-coded** in two files (and is a public example key). Move it to `.env`, generate a new one, and load it in one place. Also remove the unused `JWT_SECRET` constant (P57).
- Error responses leak internals:
  - jose errors include their **stack trace with absolute file paths**
  - DB errors include table/column details
  - send a generic message and log the details on the server instead
- `/region/create` is open to every logged-in user. Regions are system-wide, so it should be admin-only.
- Signup's 409 for *every* error, and signin's messages, should be reviewed for **account enumeration**.

### 11.5 API polish
- Status codes per error type, replacing the temporary ones (P48/P49):
  - 401 for auth failures
  - 404 for a website that's not found or not yours
  - 409 only for a duplicate username
  - 201 + the created object for creates
  - 500/503 when the DB is down
- **Health check** `GET /health` that runs `SELECT 1` and returns 503 if the DB is unreachable (P49).
- **Centralised error handling:** a custom error class + one Express error handler using `instanceof`, instead of a `try/catch` in every route (P54).
- **Zod validation** of request bodies at the API boundary (P50).
- Switch to the standard `Authorization: Bearer <token>` header (P58).
- Split routes into **Express Routers** per resource; separate `app` from `listen` (P43).
- Make the db client a hot-reload-safe **singleton** (P42).

### 11.6 Features not started
- Endpoints to read a website's ticks / status history.
- Alerts.
- Automated tests (P51).
- The `web` frontend.

### 11.7 Tooling / config
- Remove the unused imports in `db.ts` (which also clears the only type error) and the unused `apps/api/redis.ts`.
- Bun **catalogs** for shared dependency versions (P11).
- Move `typescript` and `@repo/typescript-config` in `apps/api` to devDependencies (P10, P12).
- Restructure the tsconfigs so `base.json` holds Bun defaults and browser configs override it (P39; not done yet).
- Add a type-check step (`tsc --noEmit`), since Bun doesn't type-check (P15).

## 12. Topics still to study (from the learning log)

Each item has sources in the learning log's Open questions:
- **Why a `for` loop with `await` stops and `.map` doesn't** (P86; marked important)
- **Declaration merging** in depth (P59; marked important)
- How to diagnose errors and read long error messages (P85)
- Writing types for promises (P88)
- The Redis Streams hands-on lab (P62)
- The Prisma 8 ORM architecture and DB middlewares (P55)
- How Express's types work (P19)
- A detailed JWT security review
- Bits / bytes / hex / base64url and `TextEncoder`
- A later project using **asymmetric** JWT (RS256/ES256)
