# betteruptime: project details

The state of the project as of **2026-11-20**: what is built, how it works, what is known to be wrong, and what is left.

Related files (outside this repo folder):
- Learning log, with the reasoning and sources behind every decision (problem numbers `Pn`): `d:\cohort\betteruptime\learning\bun-init-log.md`
- Manual API test definitions and run results: `d:\cohort\betteruptime\claude_tests\` (`tests.md` + `run-NNN-test-N.md`; the latest is run 016)

---

## 1. What it is

An uptime monitor, similar to Better Stack / Better Uptime:
- A user signs up and registers websites.
- Checker processes in different **regions** periodically request each website.
- Each check is stored as a **tick**: up/down, response time, which region checked it, and when.

Right now the **API** (users, auth, websites, regions) exists. The checking side (workers, streams, ticks being written) does not exist yet.

## 2. Stack

| Piece | Choice | Notes |
|---|---|---|
| Runtime / package manager | **Bun** | Runs `.ts` directly (transpiles; does **not** type-check) |
| Monorepo | **Turborepo** with Bun workspaces | `apps/*` and `packages/*` |
| HTTP server | **Express 5** | Async errors are forwarded to the error handler automatically |
| Database | **Postgres 18** in Docker | container `rocky_road`, database `bstack` |
| ORM | **Prisma 8 RC** | runtime `8.0.0-rc.23`, CLI `rc.33`; uses a *contract* instead of the classic `schema.prisma` + migrate flow |
| Auth | **jose** (JWT, HS256) | replaced `jsonwebtoken` |
| Language | TypeScript | shared configs in `packages/typescript-config` |

## 3. Layout (the parts that matter)

```
apps/
  api/
    index.ts        all routes + app.listen (no routers yet)
    middleware.ts   jsonMiddleware: JWT verification, sets req.user_id
    express.d.ts    declaration merging: adds user_id?: string to Express's Request
  web/              Next.js app from the template (untouched)
packages/
  db-prisma/
    src/prisma/contract.prisma   the data model
    src/prisma/db.ts             the db client + a query-logging middleware
    migrations/                  Prisma 8 state: refs/db.json + snapshots (no SQL migration files)
  typescript-config/, eslint-config/, ui/   template packages
```

## 4. Data model (`contract.prisma`)

| Model | Fields | Notes |
|---|---|---|
| `User` | `id` (uuid, `@onCreate`), `username` (unique), `password`, `createdAt`, `websites[]` | password is stored in **plain text** |
| `Website` | `id` (uuid), `url`, `timeAdded`, `user_id` → User, `ticks[]` | one owner per website |
| `Region` | `id` (Int), `name`, `ticks[]` | name is not unique yet |
| `WebsiteTicks` | `id` (autoincrement), `response_time_ms`, `status`, `createdAt`, `region_id` → Region, `website_id` → Website | the time-series table; nothing writes to it yet |
| enum `status` | `Up`, `Down`, `Unknown` | |

How they connect: a **tick** belongs to one website **and** one region, so "is the site up?" can be answered per region (P46).

Prisma 8 facts this project depends on:
- `@onCreate(...)` values are generated **by the Prisma client** at insert time. `@default(...)` values are generated **by the database**. A row inserted from `psql` only gets the `@default` ones.
- Schema changes: emit the contract, then `db update` (try `--dry-run` first) for quick development changes, or `migration plan` → `db migrate` for real migrations (P47).
- An `undefined` value in a filter is **dropped from the WHERE clause**, so `first({ username: undefined })` returns the first row of the table. This caused an auth bypass (P54).
- `.first()` returns `null` when nothing matches; it doesn't throw.

## 5. API (current behaviour)

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

## 6. Database query logging

`db.ts` registers a Prisma 8 middleware (`queryLogger`) whose `beforeEncode` hook prints each query's SQL (`console.log(plan.sql)`) before it runs. This is how the "no WHERE clause" signin bypass was found (P54, P55).

## 7. Testing so far

- **Manual tests**, run with curl from `claude_tests/tests.md`:
  - **Test 1:** happy path (signup → signin → create website → get website).
  - **Test 2:** bad sign-ins (wrong password, unknown user, missing password, missing username).
  - **Test 3:** the JWT middleware and every protected route:
    - absent, garbage, tampered and alg-none tokens; the `Bearer` form
    - one user creating or reading another user's website (IDOR)
    - regions
- **Run 016 (2026-11-13):** every step passes under the temporary conventions.
- **Automated tests** (`bun test` + supertest, separating `app` from `listen`, a separate test DB) are planned for after workers/streams exist (P51).

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
| `user_id?: String` type error | use lowercase `string` (P59) |

## 8. What remains

### 8.1 Known bugs (behaviour is wrong today)
1. **`POST /region/create` with no `name` hangs:** the guard does a bare `return` without sending a response, so the client waits until it times out.
2. **`GET /user/website/:id` error path:** `res.json(400).json(...)` instead of `res.status(400).json(...)`. It would send `400` as the body and then throw on the second `.json`.
3. **Unknown routes return the auth error instead of 404:** the global `jsonMiddleware` runs before Express's 404 handler.
4. **`Region.id` in the contract** is now `Int @default(now())`. A timestamp isn't an integer, so check whether this emits and applies. Meanwhile the handler still sends its own random id.
5. **Random region ids** (`Math.random()`) can collide. Planned: autoincrement or UUID, plus a unique region `name`.

### 8.2 Security
- Passwords are stored and returned in **plain text**: hash them (e.g. `Bun.password`), and never return the password field (P54).
- The **JWT secret is hard-coded** in two files (and is a public example key). Move it to `.env`, generate a new one, and load it in one place. Also remove the unused `JWT_SECRET` constant (P57).
- Error responses leak internals:
  - jose errors include their **stack trace with absolute file paths**
  - DB errors include table/column details
  - send a generic message and log the details on the server instead
- `/region/create` is open to every logged-in user. Regions are system-wide, so it should be admin-only.
- Signup's 409 for *every* error, and signin's messages, should be reviewed for **account enumeration**.

### 8.3 Correctness / API polish
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
- Clean up unused imports in `db.ts`.

### 8.4 Features not started
- **Website checker workers** that run per region, request each website, and write `WebsiteTicks`.
- **Streams / queue** to hand websites to the workers.
- Endpoints to read a website's ticks / status history.
- Automated tests (P51).
- The `web` frontend.

### 8.5 Tooling / config to-dos
- Bun **catalogs** for shared dependency versions (P11).
- Move `typescript` and `@repo/typescript-config` in `apps/api` to devDependencies (P10, P12).
- Restructure the tsconfigs so `base.json` holds Bun defaults and browser configs override it (P39).
- Add a type-check step (`tsc --noEmit`), since Bun doesn't type-check (P15).

## 9. Topics still to study (from the learning log)

Each item has sources in the learning log's Open questions:
- **Declaration merging** in depth (P59; marked important)
- The Prisma 8 ORM architecture and DB middlewares (P55)
- How Express's types work (P19)
- A detailed JWT security review
- Bits / bytes / hex / base64url and `TextEncoder`
- A later project using **asymmetric** JWT (RS256/ES256)
