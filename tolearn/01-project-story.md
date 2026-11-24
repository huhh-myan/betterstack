# 01: Your project story

**The problem this solves:** "Tell me about a project" is the first technical question in almost every entry-level interview. A rambling answer wastes your best evidence. A crisp one steers the rest of the interview toward things you know.

## The 30-second pitch

> I built **bstack**, an uptime monitor like Better Uptime. Users add websites; a pusher service puts each one on a **Redis stream** every few minutes; **workers in different regions** read through **consumer groups**, check each site, and store the result (up/down, response time, HTTP code) in **Postgres**. A **Next.js** dashboard shows uptime and response-time charts per region. It's a **TypeScript monorepo** (Turborepo + Bun) with an **Express** API, **JWT auth**, **Prisma**, and a test suite.

Say it out loud until it takes under 35 seconds without notes.

## The 2-minute version (add these when they say "go on")

1. **Why queues:** checking thousands of sites can't happen inside an API request. The pusher decouples *scheduling* from *checking*, and the stream lets me add workers without changing the pusher.
2. **Why consumer groups per region:** every region must check every site (so a regional outage is visible), but inside a region, workers share the load. One group per region gives exactly that.
3. **Reliability:** a worker acks a job only **after** the result is stored, so a crash means a re-check, never a lost check (at-least-once). Crashed workers' jobs are reclaimed with `XAUTOCLAIM`.
4. **Data model:** `Website`, `Region`, `WebsiteTicks` (the time series, indexed by website and time), plus admins and region requests.
5. **Something hard you debugged:** pick one from the list below and tell it as a story.

## Debugging stories you own (from your log)

Use the shape **situation → what I saw → how I found the cause → fix → what I learned**.

| Story | Your log | One-line version |
|---|---|---|
| Auth bypass found by my own tests | P54 | Signin with no password field logged in as a user: `undefined` in the ORM filter meant "no filter", so it matched the first row. Learned: validate input *before* it reaches the query. |
| The pusher printed a query and then nothing | P70 | `DATABASE_URL` was undefined because I ran from a folder with no `.env`, and my `catch` swallowed the error. Learned: never swallow errors; env files load from the *working directory*. |
| `entries-read` was 40 with 11 entries | P79 | It's an all-time position including trimmed entries, not a count. Learned to read `XINFO` instead of guessing. |
| "Why does my for-loop with await run one at a time?" | P86 | `await` pauses only its own function. In `.map` each callback pauses separately, so they overlap. |
| The worker silently failed every job | P92 | A `console.log` inside the `.map` read a variable that wasn't assigned yet: `ReferenceError`, hidden by `allSettled`. |
| TS2742 "inferred type cannot be named" | P38 | `declaration: true` inherited from a base config in a package that never emits `.d.ts`. Learned to check the *effective* config (`tsc --showConfig`). |

## Be honest about AI help, and make it a strength

Interviewers increasingly ask "did you use AI?" Lying is easy to detect: they ask you to change something live. A good answer:

> I wrote the first working version myself and kept a learning log of every problem (about a hundred entries). Then I had an AI review it, which found real bugs: acking jobs before the work, plain-text passwords, no request timeout. I studied every fix until I could explain it, and I can walk you through any file.

**That only works if it's true.** Before interviewing, for every file on `feature/ai-changed`, be able to answer: *what does this do, why is it written this way, and what would break if I removed line X?* The READMEs in each package list every change. Better still: re-implement two or three fixes yourself on a branch from `main` (12-next-steps.md).

## Questions you will get, and what a good answer covers

<details><summary>Why Redis Streams and not a simple setInterval in the API?</summary>

The API should answer requests fast; checking sites takes seconds and fails in many ways. A queue separates producers from consumers, survives restarts (the stream is persisted in Redis), lets you add workers, and gives delivery tracking (pending entries, acks). Alternatives: BullMQ (a job library on Redis), RabbitMQ, Kafka, SQS. Streams were enough and taught me the primitives.
</details>

<details><summary>What happens if a worker crashes halfway?</summary>

The job was delivered but not acked, so it stays in the group's pending list. On restart the worker re-reads its own pending jobs (id `0`). If it never comes back, another worker claims jobs idle over 5 minutes with `XAUTOCLAIM`. Worst case: the site is checked twice (a duplicate tick); never lost.
</details>

<details><summary>How would you scale it to 1 million websites?</summary>

See 09-system-design. Short: more workers per region (the group splits jobs), batch the inserts, a time-series store or partitioned table with retention and rollups, schedule only *due* websites, and shard the stream if one Redis stream becomes the bottleneck.
</details>

<details><summary>How does auth work, and why JWT?</summary>

Signin checks the password against an argon2id hash and returns a JWT (HS256, 2 h expiry) whose `sub` is the user id. Each request sends `Authorization: Bearer <token>`; middleware verifies the signature and expiry, then sets `req.user_id`. JWT is stateless (no session lookup). Trade-off: you can't revoke a token before it expires without extra state. A cookie-based session would be safer against XSS than my localStorage choice.
</details>

<details><summary>How do you stop one user from reading another user's websites?</summary>

The owner always comes from the verified token, never from the request body, and every query filters by `user_id`. A website that exists but isn't yours returns 404, not 403, so the API doesn't confirm it exists. (This class of bug is called IDOR.)
</details>

<details><summary>What would you do differently?</summary>

Pick one or two honestly: validate input from day one (Zod), write tests earlier (my manual curl tests found the auth bypass, automated ones would have found it sooner), think about failure modes (timeouts, crashes) before the happy path, and not ack before doing the work.
</details>

<details><summary>What was the hardest part?</summary>

Pick a real one you can go deep on. Redis consumer groups (the bookmark vs the pending list, P73–P82) is a strong choice: it shows you dug into how the system actually works.
</details>

## Practice

- [ ] Record the 30-second pitch on your phone. Listen. Cut every "basically" and "like".
- [ ] Draw the architecture on paper from memory in under 2 minutes (boxes: web, api, Postgres, pusher, Redis stream, workers per region).
- [ ] Tell two debugging stories out loud using situation → symptom → cause → fix → lesson.
- [ ] Explain each file in `apps/worker/` and `apps/api/src/` to an imaginary interviewer.
