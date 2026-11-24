# 03: What you missed: 9 patterns behind the 46 bugs

**Why patterns, not a bug list:** the package READMEs list every bug with file:line. Memorising 46 bugs is useless; recognising the **9 mistakes that produced them** stops you making the next 46. For each: the pattern, your instance, the rule, and a recall question.

## 1. Trusting input from outside

**Your instances:**
- signin with a missing field matched the first user (P54);
- any string was saved as a URL, so `example.com` failed forever in the worker;
- `/region/create` with no `name` hung.

**Why it happens:** the happy path is tested with good input. Attackers and real users send bad input.

**Rule:** everything from outside (body, query, params, headers, env, the stream) is untrusted. **Parse it at the boundary into a known shape** (Zod) before any logic or query sees it. Reject with 400 and say what's wrong.

<details><summary>Recall: why is `{ username: undefined }` in an ORM filter dangerous?</summary>

Many ORMs drop `undefined` keys, so the filter becomes empty and matches any row. Validation must guarantee required fields exist before the query.
</details>

## 2. Errors swallowed or leaked

**Your instances:**
- the pusher's `catch` returned an object nobody read, so errors vanished (P70);
- `error: e` in responses leaked stack traces and SQL;
- `allSettled` results were never inspected;
- `res.json(400).json()` crashed.

**Rule:** errors have **two audiences**. The **client** gets a status code and a safe message. The **server log** gets the full error. Never neither, never the internals to the client. Centralise it in one error handler (Express 5 forwards async errors to it).

<details><summary>Recall: what's wrong with `catch (e) { return { e } }` in a script's main function?</summary>

Nothing logs or rethrows it, so the failure is silent and the process looks like it succeeded. Log it (and exit non-zero for scripts) or rethrow.
</details>

## 3. Acting before the work is done (ordering under failure)

**Your instance:** the worker **acked jobs before checking them**. A crash lost them.

**Rule:** ask "**what if the process dies right here?**" at every line between receiving work and finishing it. Acknowledge, commit or respond only **after** the side effect is durable. Ack-after gives **at-least-once** delivery, so make the work safe to repeat (idempotent, see 06).

<details><summary>Recall: at-most-once vs at-least-once, which did your old worker have, and which do you want?</summary>

Old: at-most-once (ack first: crash loses the job). Want: at-least-once (ack after: a crash repeats the job), because a duplicate check is harmless and a lost check hides an outage.
</details>

## 4. Mixing two failure sources in one try/catch

**Your instance:** the HTTP request and the DB insert were in the same `try`, so a failed **insert** recorded the site as **Down**.

**Rule:** one `try` per thing that can fail *for a different reason*, each with its own handling. "The site failed" and "my database failed" mean completely different things.

## 5. No timeouts, no limits

**Your instances:**
- `axios.get` without a timeout, so one hanging site blocked the batch forever;
- the Redis connection retried forever at import time;
- the stream was never trimmed.

**Rule:** every call to something you don't control (network, DB, disk, another service) needs a **timeout**. Every growing thing (queue, table, log) needs a **limit or retention policy**. Unbounded = eventually broken.

<details><summary>Recall: name three unbounded things in the original project.</summary>

HTTP requests without a timeout; the Redis stream (never trimmed); the ticks table (never cleaned or rolled up). Also: Redis connect retries at import.
</details>

## 6. Secrets and sensitive data handled as normal data

**Your instances:**
- plain-text passwords;
- signup returned the password;
- the JWT secret was hard-coded (and public);
- the token is in localStorage.

**Rule:**
- passwords are **hashed** (argon2id/bcrypt), never stored, returned or logged;
- secrets come from the **environment**, never git;
- every response **selects only the fields it needs**.

## 7. Authorization gaps (who may do what)

**Your instances:**
- any user could create regions;
- the owner was partly trusted from the body (you noticed);
- you planned 403 for others' websites.

**Rule:** **authentication** = who you are (401 if unknown). **Authorization** = what you may do (403), checked on **every** request, using the id from the verified token. For objects that aren't yours, prefer **404** so you don't confirm they exist.

## 8. Process lifecycle ignored (start, run, stop)

**Your instances:**
- the pusher ran once;
- the Redis connection was never closed, so the process never exited;
- the worker crashed on an empty read;
- hard-coded `REGION_ID`/`WORKER_ID`;
- no consumer-group creation on start.

**Rule:** a long-running service needs three things:
- **startup:** validate config and fail fast with a clear message; create what it needs, such as groups;
- **steady state:** loop, wait without busy-spinning (`BLOCK`), recover from transient errors;
- **shutdown:** finish or hand back in-flight work, close connections.

Config comes from env vars.

## 9. HTTP semantics as an afterthought

**Your instances:**
- 409 for every error;
- 200 with an error message;
- unknown routes answered "Authorization Error!";
- no 201/204.

**Rule:** status codes are an API's contract. Clients branch on them, monitoring counts them. Learn the 10 in 04 and use them from the first route.

## Smaller misses worth knowing

| Miss | Rule |
|---|---|
| `for…in` on an array (P68) | `for…in` iterates **keys** (strings); use `for…of` for values |
| Floating promises (P68) | Every async call is awaited, returned, or explicitly handled |
| A top-level call in an imported module ran on every import (P70) | Modules should declare things; side effects go in an explicit `main()` |
| Re-ran `docker run -n` instead of `--name` (P29) | Keep the working command in a file (compose.yaml or README), not in memory |
| Monorepo tsconfig base never restructured (P39 still in To do) | Finish config work or delete the TODO; half-done config is a trap |

## Self-test: spot the pattern

For each snippet, name the pattern number(s).

<details><summary>`app.post('/x', async (req, res) => { const u = await db.User.first({ email: req.body.email }); res.json(u) })`</summary>

1 (unvalidated input: `email` undefined matches anyone), 6 (returns the whole row, maybe including the password hash), 9 (200 with null when not found, should be 404).
</details>

<details><summary>`while (true) { const jobs = await queue.read(); for (const j of jobs) { await queue.ack(j); await process(j) } }`</summary>

3 (ack before work), 8 (no blocking wait or error handling: busy loop, one throw kills it), and serial processing (P86) if throughput matters.
</details>

<details><summary>`const res = await fetch(url); await db.insert({ up: res.ok })` inside one `try`, with `catch { await db.insert({ up: false }) }`</summary>

4 (DB failure recorded as site Down) and 5 (no timeout on fetch).
</details>
