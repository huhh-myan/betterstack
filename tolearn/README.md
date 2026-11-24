# tolearn: your study guide from building bstack

Built from your two learning logs (`learning/bun-init-log.md`, P1–P92; `learning/frontend-log.md`, P93–P99), `README_details.md`, and the fixes on `feature/ai-changed`. The goal: **get hired at entry level or above within a month**, by understanding everything you built well enough to explain it, defend it, and extend it in an interview.

## How to use these files

1. **Read the "problem it solves" first, then the theory.** If you can't say what breaks without a thing, you don't know it yet.
2. **Answer every recall question out loud before opening the answer.** Getting it wrong and then reading the answer is how it sticks; reading the answer first feels productive and isn't.
3. **Mix topics within each session.** Don't do all of databases in one day; interleave (e.g. 3 DB questions, 3 queue questions, 3 JS questions). Interviews jump around too.
4. **Mark each recall question** ✅ (got it), 🟡 (shaky), ❌ (didn't know). Next day, redo only 🟡 and ❌.
5. **Use your project for every answer.** "For example, in my uptime monitor…" turns a textbook answer into evidence.

## The files

| # | File | What it gives you | Priority for interviews in 1 month |
|---|---|---|---|
| 01 | [Your project story](01-project-story.md) | The 30-second and 2-minute pitch, the architecture, how to be honest about AI help, the follow-ups you'll get | 🔴 Do first |
| 02 | [What you did right](02-what-you-did-right.md) | Strengths backed by your log, so you can claim them confidently | 🔴 |
| 03 | [What you missed](03-what-you-missed.md) | The bugs grouped into 9 underlying patterns, each with the general rule | 🔴 |
| 04 | [Backend: HTTP, REST, auth](04-backend-http-auth.md) | Status codes, REST design, sessions vs JWT, hashing, CORS/CSRF/XSS, validation, errors | 🔴 |
| 05 | [Databases](05-databases.md) | SQL, indexes, transactions, isolation, N+1, migrations, ORMs, pooling | 🔴 |
| 06 | [Queues, Redis, distributed basics](06-queues-redis-distributed.md) | Delivery guarantees, idempotency, consumer groups, retries, caching, rate limiting | 🟠 |
| 07 | [JavaScript, TypeScript, Node/Bun](07-js-ts-node.md) | Event loop, promises, closures, TS types, modules | 🔴 |
| 08 | [Frontend: React and Next.js](08-frontend-react-next.md) | Rendering, hooks, effects, server vs client components, auth in the browser | 🟠 |
| 09 | [System design: an uptime monitor](09-system-design-uptime-monitor.md) | The classic design question, worked with your own project | 🟠 |
| 10 | [Testing, Git, Docker, deploy](10-testing-git-docker-deploy.md) | Test pyramid, Git workflow, containers, CI, config, deploying | 🟠 |
| 11 | [DSA and CS fundamentals](11-dsa-cs-fundamentals.md) | What to drill for coding rounds, plus OS/DBMS/network basics | 🔴 (most entry-level rounds start here) |
| 12 | [Next steps](12-next-steps.md) | What to build next, resume bullets, deploying the demo, your open To-dos | 🟠 |

## A 4-week plan

Adjust to your interview dates. Roughly 4–6 hours a day.

| Week | Mornings (2–3 h) | Afternoons (2–3 h) | Output by Sunday |
|---|---|---|---|
| 1 | DSA: arrays, hashing, two pointers, sliding window (11) | 01, 02, 03 + read `feature/ai-changed` code until you can explain every file | Pitch recorded on your phone; resume updated (12) |
| 2 | DSA: stack, binary search, linked list, trees (11) | 04, 07 + rebuild one fix yourself on `main` (e.g. ack-after-write) | Deployed demo link (12) |
| 3 | DSA: graphs (BFS/DFS), heaps, intervals (11) | 05, 06, 09 | One mock system-design interview (09) |
| 4 | DSA: DP basics + timed mixed practice | 08, 10, all ❌/🟡 recall questions | 2–3 mock interviews; applications out daily |

**Apply in parallel from week 1.** Don't wait to feel ready; interviews are practice too.

## One rule for these files

They're yours. Correct anything that turns out wrong, add your own P-numbers when something new comes up, and note where an interviewer surprised you.
