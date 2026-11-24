# 02: What you did right

**Why this file exists:** an interview is partly about naming your strengths with evidence. "I'm a fast learner" is noise; "I keep a numbered log of every problem, and here's how it caught an auth bypass" is evidence. Everything below is backed by your own log.

## Habits (the rarest and most valuable part)

| What you did | Evidence | Why it matters at work |
|---|---|---|
| **Kept a numbered problem log** with misconceptions and failure signatures | ~100 entries, P1–P99 | Debugging is pattern-matching; you're building your own pattern library. Senior engineers do this informally. |
| **Checked the real artifact instead of trusting memory**, including the tutor's | P9, P35, P38 corrections ("check the real `.d.ts`", `tsc --showConfig`, `--help`, `\d`) | Most bugs come from a wrong assumption. Verifying against source is the core debugging skill. |
| **Wrote every line yourself** and asked "why", not just "how" | Goal line of your log | You can explain and defend your code, which is what interviews test. |
| **Pinned versions after learning "latest moves"** | P21, P28, P36 | Reproducible builds; fewer "works on my machine" surprises. |
| **Tested your own API and found a real security bug** | P54 (signin without a password logged in as a user) | Testing your own code adversarially is a professional habit. |
| **Marked what's important and revised it** (⭐ P59, P86) | Goal section | Spaced, prioritised revision beats rereading. |

## Technical decisions you got right

| Decision | Evidence | The concept behind it |
|---|---|---|
| **Monorepo with a shared DB package** (`packages/db-prisma`) | P23 | One schema, one client, imported by api, pusher and worker: no drift between services. |
| **Redis Streams + consumer groups, one group per region** | P74–P76 | Fan-out across groups (every region gets every job), load-sharing within a group. Exactly the right primitive. |
| **Understood ack vs read** | P71 ("what stops another worker getting it is the read; the ack means finished") | This distinction is what delivery guarantees are built on (06). |
| **Understood the pending list and the group bookmark** | P73, P75, P82 | Many working engineers can't explain this. |
| **`verify`, not `decode`, for JWTs** | P60 correction | Decoding is base64; only verifying the signature makes the payload trustworthy. |
| **Declaration merging for `req.user_id`** | P59 | Extending a library's types without forking it. |
| **Asked "what counts as Down?"** | P90 | Thinking about semantics, not just code. |
| **`Promise.allSettled` over `Promise.all`** | P87 | One failed check shouldn't hide the others. |
| **Noticed `createdAt` was insert time, not check time** | `main` worker comment | Precise thinking about what data means. |
| **Wanted the owner from the token, not the body** | `main` API comment ("user_id will come from the middle ware not req.body") | That's the fix for IDOR, a top-10 web vulnerability (04). |
| **Diagnosed "returns the whole user object"** | `main` API comment | You saw the password leak; you just hadn't fixed it yet. |
| **Named-volume Postgres with a pinned major version** | P27–P29 | Data survives container rebuilds; no surprise major upgrades. |

## Things you understood that many juniors don't

Use these in interviews; they show depth.

- **`await` doesn't block the thread** (P86). You can explain *why* a `for` + `await` runs serially and `.map` + `Promise.allSettled` runs concurrently: "which function is paused?"
- **Module vs package** (P59): a module is one file; a package is a folder with `package.json` made of many modules.
- **Stream ids are server time + a per-millisecond sequence** (P72), not a running count.
- **`@id` doesn't generate anything** (P46): a primary key says *what* is unique, not *who fills it*.
- **`localhost` means "this machine/container"** (P30): it changes meaning inside Docker.

## Recall check

<details><summary>Why one consumer group per region, and not one group for all workers?</summary>

One group would split jobs between *all* workers, so each website would be checked by only one region per cycle. One group per region means each region gets every job (fan-out), while workers in the same region share it (load-balancing).
</details>

<details><summary>What's the difference between decoding and verifying a JWT?</summary>

Decoding is base64url and needs no secret, so anyone can read (and forge) the payload. Verifying recomputes the signature with the secret and checks `exp`; only then is the payload trustworthy.
</details>

<details><summary>Why is "I check the real .d.ts / --help before trusting memory" an interview-worthy habit?</summary>

Because most bugs and wrong answers come from assumptions. It shows you debug from evidence, which is what teams want from a junior who'll otherwise ask a senior every time.
</details>
