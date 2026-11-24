# 10: Testing, Git, Docker, CI, deployment

## 1. Testing

**Problem it solves:** proving the code works now, and keeping it working when you (or someone else) change it later. Your manual curl tests found a real auth bypass (P54). Automated tests do that on every change, in seconds.

### The pyramid

| Level | Tests | Speed | In bstack |
|---|---|---|---|
| **Unit** | one function, no I/O | ms | `worker.test.ts` → `classify()` |
| **Integration** | real pieces together (HTTP + DB) | 10–100 ms | `user/website/region.test.ts`: real Express app + `bstack_test` Postgres |
| **End-to-end** | the whole system through the UI | seconds | the Playwright run (sign up → add monitor → see checks) |

Many unit tests, fewer integration tests, a few E2E tests.

### Habits

- **Arrange–Act–Assert** in every test.
- **Test behaviour, not implementation:** assert status codes and responses, not which internal function was called.
- **Isolate state:** a separate test DB (`bstack_test`), unique usernames per test.
- **Test the unhappy paths:** most of your bugs were in them (missing fields, wrong token, someone else's id).
- **Make code testable:** split `app` from `listen()`; pure functions like `classify()`; inject dependencies.
- **Mocks vs real dependencies:** mock what's slow or external (third-party APIs); prefer real DBs in integration tests (Docker makes that easy).
- **TDD** (test first): worth trying on a bug fix. Write a failing test that reproduces the bug, then fix it.

<details><summary>Recall: why does `apps/tests` use a separate database?</summary>

Tests create users, websites and regions. Running them against the real DB pollutes your data, and existing data can make tests pass or fail unpredictably. A separate DB keeps both clean and the results repeatable.
</details>

## 2. Git and GitHub (you will use this on day one of any job)

| Concept | Know |
|---|---|
| **Commit** | a snapshot + message; small, focused, message says *why* |
| **Branch** | a movable pointer to a commit; work on branches, not `main` |
| **Merge vs rebase** | merge keeps history as it happened (a merge commit); rebase replays your commits on top (linear history). **Never rebase shared branches.** |
| **Pull request** | review + discussion + CI before merging (you learned this) |
| **Conflicts** | two branches changed the same lines; edit, `git add`, continue |
| **Undo** | `git restore <file>` (discard changes), `git revert <sha>` (new commit undoing one, safe on shared branches), `git reset` (move the branch; rewrites history) |
| **Stash** | `git stash` to park uncommitted work |
| **`.gitignore`** | never commit `.env`, `node_modules`, build output (your P1, P2) |
| **Cherry-pick** | copy one commit onto another branch |

**Your plan for `tolearn/` → main:** create a branch from `main`, bring in just that folder (`git checkout feature/ai-changed -- tolearn`), commit, push, open a PR into `main`. That's a common real-world task: "ship only this part".

**Commit message style:** `api: hash passwords with argon2id` (area: what, in the imperative), then a body explaining why.

## 3. Docker

**Problem it solves:** "works on my machine". A container packages an app with its runtime and dependencies; everyone runs the same thing.

- **Image** = a read-only template (`postgres:18`); **container** = a running instance of it; **volume** = data that outlives containers (your P27–P29).
- **Dockerfile** builds your own image:

  ```dockerfile
  FROM oven/bun:1.3
  WORKDIR /app
  COPY . .
  RUN bun install --frozen-lockfile
  CMD ["bun", "apps/api/index.ts"]
  ```

- **Docker Compose** runs several containers together (Postgres + Redis + API + worker) from one `compose.yaml`. That's the next step from your hand-run `docker run` commands (P27 noted this).
- **Networking:** containers in a Compose network reach each other by service name (`postgres:5432`), not `localhost` (your P30).
- **Layer caching:** copy `package.json` + lockfile and install **before** copying source, so dependency installs are cached.

## 4. CI/CD

- **CI** = run checks automatically on every push/PR: install, type-check, test, build. GitHub Actions can start Postgres and Redis as **service containers** for your integration tests.
- **CD** = deploy automatically when `main` passes.
- Branch protection: PRs must pass CI before merging.

## 5. Configuration and environments (the 12-factor ideas)

- **Config in environment variables**, not code (your `JWT_SECRET` fix). `.env` locally, the platform's secret store in production.
- **Same build, different config** for dev, staging and prod.
- **Logs to stdout**; the platform collects them.
- **Stateless processes**; state lives in Postgres and Redis (so you can run several API instances).
- **Fail fast** on missing config.

## 6. Deploying bstack (do this; a live link is worth more than a paragraph)

| Piece | Free/cheap option |
|---|---|
| Postgres | Neon, Supabase |
| Redis | Upstash, Redis Cloud |
| API, pusher, worker (long-running) | Railway, Render, Fly.io |
| Next.js web | Vercel (set `API_URL` to the deployed API) |

Steps:
1. Create the DB and Redis.
2. Run migrations against them.
3. Deploy the API with its env vars.
4. Deploy the pusher and one worker.
5. Deploy web with `API_URL`.
6. Add the live link to your README and resume.

**Watch out:**
- Cloud Postgres usually needs `?sslmode=require`.
- Free tiers sleep (the pusher must keep running).
- Never commit secrets.

## Likely interview questions

1. What's the difference between unit and integration tests? How do you test code that uses a database?
2. Merge vs rebase? How do you resolve a conflict?
3. What's a Docker image vs a container? Why use Compose?
4. What does your CI pipeline do?
5. How do you manage secrets?

## Resources

- Pro Git (free book), chapters 2, 3: https://git-scm.com/book/en/v2
- Docker "Get started": https://docs.docker.com/get-started/
- GitHub Actions service containers: https://docs.github.com/en/actions/use-cases-and-examples/using-containerized-services/about-service-containers
- The Twelve-Factor App: https://12factor.net/
- Bun test runner: https://bun.com/docs/cli/test
