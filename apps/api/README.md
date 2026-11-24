# api

The Express 5 HTTP API: accounts, websites (monitors), their check results (ticks), regions and region requests. Runs on Bun.

- [Run it](#run-it)
- [Endpoints](#endpoints)
- [Bugs found in the original code](#bugs-found-in-the-original-code)
- [Shortcomings and design notes](#shortcomings-and-design-notes)
- [What I changed](#what-i-changed)
- [Features added](#features-added)
- [What you should add next](#what-you-should-add-next)
- [Your notes from the code, answered](#your-notes-from-the-code-answered)

## Run it

```bash
cp .env.example .env      # then fill in DATABASE_URL and JWT_SECRET
bun run dev               # bun --hot index.ts, restarts on save
```

| Variable | Required | What it does |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `JWT_SECRET` | yes | Signs login tokens. 32+ random characters; the API refuses to start otherwise. |
| `ADMIN_USERNAMES` | no | Comma-separated usernames that become admins (on startup and on signup) |
| `PORT` | no | Default `3000` |
| `TOKEN_TTL` | no | Token lifetime, default `2h` |
| `LOG_SQL` | no | `1` prints every SQL statement |

Type-check: `bun run check-types`. Tests: see `apps/tests`.

### Layout

```
index.ts               starts the server (seeds admins, then listen)
src/app.ts             the Express app, without listen(); tests import this
src/config.ts          every env var, validated once at startup
src/errors.ts          HttpError, parse() for Zod, the 404 + error handlers
src/auth.ts            tokens, requireAuth, requireAdmin, password hashing
src/schemas.ts         Zod schemas for every request body/param/query
src/routes/*.ts        one Express Router per resource
```

## Endpoints

Send the token as `Authorization: Bearer <token>`. (The raw token without `Bearer` still works for now so old curl commands don't break.)

| Method & path | Auth | Success | Errors |
|---|---|---|---|
| `GET /health` | – | 200 `{status, db, dbLatencyMs}` | 503 if the DB is down |
| `POST /signup` `{username, password}` | – | **201** `{user:{id,username}}` | 400 invalid, **409** taken |
| `POST /signin` `{username, password}` | – | 200 `{token, user:{id,username,isAdmin}, user_id}` | 400, **401** wrong username *or* password (same message) |
| `GET /user` | user | 200 `{id, username, isAdmin}` | 401 |
| `GET /user/websites?hours=24` | user | 200 `{websites:[{...website, ticks:[...]}]}` | 401 |
| `POST /user/website/create` `{url}` | user | **201** `{website}`; `example.com` becomes `https://example.com` | 400 invalid URL |
| `GET /user/website/:id` | user | 200 `{website}` | **404** missing or not yours |
| `GET /user/website/:id/ticks?hours=24` | user | 200 `{ticks}` oldest first (1–168 hours) | 404 |
| `DELETE /user/website/:id` | user | **204** (website + its ticks) | 404 |
| `GET /region/list` | user | 200 `[{id,name}]` | |
| `POST /region/create` `{name}` | **admin** | **201** `{region, message}` | 400, **403**, 409 exists |
| `POST /region/request` `{name, reason?}` | user | **201** `{request}` | 400, 409 exists / already requested |
| `GET /region/requests` | user | 200 `{requests, isAdmin}`: admins see all, users their own | |
| `POST /region/requests/:id/approve` | **admin** | 200 `{region, request}` (creates the region) | 403, 404, 409 already decided |
| `POST /region/requests/:id/reject` | **admin** | 200 `{request}` | 403, 404, 409 |
| anything else | – | | **404** `{message}` |

Every error body is `{ message, details? }`. `details` lists each validation problem.

## Bugs found in the original code

Line numbers refer to `main`.

| # | Where (`main`) | Bug | Effect |
|---|---|---|---|
| 1 | `index.ts:29-36` | `const id = await User.create(...)` returns the whole row, sent as `user_id: id` | **Signup returned the password** to the client |
| 2 | `index.ts:31`, `:58` | Passwords stored and compared as plain text | A database leak exposes every password |
| 3 | `index.ts:67`, `middleware.ts:15` | JWT secret hard-coded twice, and it's the example key from the jose README | Anyone who has read that README can forge a token for any user |
| 4 | `index.ts:14` | Unused `JWT_SECRET = "secret_key"` | Dead code that looks like config |
| 5 | `index.ts:143` | `res.json(400).json(...)` instead of `res.status(400).json(...)` | Sends `400` as a JSON body, then throws "headers already sent" |
| 6 | `index.ts:170-172` | `if(!regionName){ return; }` | A request without `name` **hangs** until the client times out |
| 7 | `index.ts:169`, `:175` | Region id = `Math.random()*100000...` | Collides with the autoincrement sequence sooner or later (duplicate key) |
| 8 | `index.ts:100` | `app.use(jsonMiddleware)` for everything after it | Unknown routes answer **"Authorization Error!"** instead of 404 |
| 9 | `index.ts:40`, `:119`, `:187`, `middleware.ts:28` | `error: e` in responses | Leaks stack traces with absolute file paths, and SQL/table details |
| 10 | `index.ts:107-108` | URL saved as typed | `example.com` (no scheme) is stored and the worker fails on it forever |
| 11 | `index.ts:38`, `:82` | 409 for every signup and signin error | Clients can't tell "taken" from "DB down"; "wrong password" isn't a conflict |
| 12 | `index.ts:166` | Anyone signed in can create regions | Regions are shared by everyone; any user could add junk |
| 13 | `middleware.ts:11` | `authorization \|\| " "` | Verifies a single space as a token (works, but by accident) |
| 14 | `redis.ts` | An experiment that pushes fake websites to the real stream | Running it by mistake puts junk jobs in front of the workers |

## Shortcomings and design notes

- **Token in localStorage (frontend):** simple but readable by any script on the page. An httpOnly cookie is safer; see "What you should add next".
- **No rate limiting:** signin can be brute-forced.
- **No refresh tokens:** after 2 hours the user signs in again.
- **`/user/websites` returns 24 h of ticks** for every website in one response. That's fine for tens of websites; for hundreds, return a summary (latest status, uptime %) and fetch ticks per website.
- **`DELETE` is a hard delete** of the website and its history. Many products soft-delete (a `deletedAt` column) so history can be restored.
- **Admins come from an env var.** Fine for one deployment; a real product would manage roles in the UI.

## What I changed

- **Split the one file into modules** (`app.ts`, `config.ts`, `errors.ts`, `auth.ts`, `schemas.ts`, `routes/`). `app.ts` has no `listen()`, so tests can start it on a random port.
- **One error handler** (`src/errors.ts`). Routes `throw notFound()` / `conflict(...)`; Express 5 forwards errors from async handlers automatically, so there's no `try/catch` in every route. Unknown errors are logged on the server and answered with a generic 500.
- **Zod at the boundary** (`src/schemas.ts`). Every body, param and query is parsed before use; failures become 400 with a list of problems.
- **Status codes** that mean something: 201, 204, 400, 401, 403, 404, 409, 503 (see the [table](#endpoints) and the global README).
- **Passwords hashed** with `Bun.password` (argon2id). Old plain-text rows still sign in, and are re-hashed at that moment (`verifyPassword` + `needsRehash`).
- **JWT secret from `.env`**, validated at startup, loaded in one place; tokens verified with an explicit `algorithms: ["HS256"]`.
- **`Bearer` scheme** for the `Authorization` header (raw tokens still accepted for now).
- **Ownership checks return 404**, not 403, for other users' websites, so the API doesn't confirm that an id exists.
- **`Request.user_id` type** moved from `express.d.ts` (only loaded through tsconfig `types`) into `src/auth.ts` with `declare global`, so anything importing the auth code gets the type.
- Removed `redis.ts` and the old `middleware.ts`; moved `typescript`/`@repo/typescript-config` to devDependencies and dropped the unused `redis` dependency.

## Features added

- `GET /user/websites`, `GET /user/website/:id/ticks`, `DELETE /user/website/:id`: the frontend no longer simulates anything.
- **Admins** (`Admin` table, seeded from `ADMIN_USERNAMES`) and `requireAdmin`.
- **Region requests**: users ask, admins approve (creating the region in a transaction) or reject.
- `GET /health` with a DB check and a 2 s timeout.
- `bun run dev` with hot reload; `.env.example`.

## What you should add next

1. **Rate limiting** on `/signin` and `/signup` (e.g. 5 attempts per minute per IP and per username).
2. **httpOnly cookie sessions** instead of returning the token for localStorage, plus CSRF protection.
3. **Pagination** for `/region/requests` and a summary endpoint for websites (latest status + uptime %, computed in SQL).
4. **Remove the raw-token fallback** in `src/auth.ts` once every client sends `Bearer`.
5. **Structured logging** (request id, user id, duration) instead of `console.log`.
6. **OpenAPI docs** generated from the Zod schemas.
7. **Change password / delete account** endpoints.
8. **Alerts**: when a website goes Down in two or more regions, notify the owner (email/webhook).

## Your notes from the code, answered

| Your comment (`main`) | Answer |
|---|---|
| "add zod to all" (`index.ts:9`) | Done: `src/schemas.ts`, applied through `parse()` in every route. |
| "It's unused. At 10 bytes it's far too short. It's hardcoded." (`index.ts:11-13`) | Right on all three. Now `JWT_SECRET` from `.env`, checked for length at startup. |
| "dont return password id is the whole user object" (`index.ts:33`) | Correct diagnosis. Signup now `select`s only `id, username`. |
| "jwt key assigning or cookies session" (`index.ts:50`) | JWT kept (stateless, fits an API). Cookies are the safer *storage* in the browser; see "What you should add next" #2. |
| "hashing of password" (`index.ts:59`) | Done with `Bun.password` (argon2id: slow on purpose, salted, the salt is stored in the hash). |
| "should i convert this to a function of its own which taken id input and returns token" (`index.ts:64`) | Yes: `signToken(userId)` in `src/auth.ts`. One place to change the algorithm or expiry. |
| "then redirect to home page or dashboard page" (`index.ts:80`) | An API doesn't redirect; it returns data and the frontend navigates (the web app does `router.replace("/dashboard")`). |
| "user_id will come from the middle ware not req.body" (`index.ts:105`) | Correct, and important: never trust a user id from the body. `requireAuth` sets `req.user_id` from the verified token. |
| "or take in url from input name, what if it should have multiple search options" (`index.ts:126`) | That's a list endpoint with query filters (`GET /user/websites?search=…`). Kept out for now; easy to add with a Zod query schema. |
| "this works even if user_id is blank just middleware saves this code / raw sql better than this" (`index.ts:131-132`) | `first({ user_id: undefined, id })` drops the undefined key and matches *any* user's website. That's why ownership must always come from a verified token. The ORM was fine; the input wasn't. |
| "add status code to positive response also" (`index.ts:138`) | Done: 201 for creates, 204 for delete, 200 otherwise. |
| "transfer to .env generate a new key this key is the jose github repo" (`middleware.ts:13`) | Done. |
| "redirect to login page" (`middleware.ts:31`) | Same as above: the API answers 401 and the frontend sends you to `/signin`. |
