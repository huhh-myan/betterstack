# 04: Backend: HTTP, REST, auth, validation, errors

## 1. HTTP in one picture

**Problem it solves:** two programs that know nothing about each other need a shared format for "do this" and "here's what happened".

```
POST /user/website/create HTTP/1.1        ← method + path
Host: localhost:3000                       ← headers
Authorization: Bearer eyJ...
Content-Type: application/json

{"url":"example.com"}                      ← body

HTTP/1.1 201 Created                       ← status
Content-Type: application/json

{"website":{"id":"...","url":"https://example.com"}}
```

### Methods and their promises

| Method | Use | Safe (no change)? | Idempotent (same result if repeated)? |
|---|---|---|---|
| GET | read | yes | yes |
| POST | create / actions | no | **no** (two POSTs = two websites) |
| PUT | replace at a known URL | no | yes |
| PATCH | partial update | no | not guaranteed |
| DELETE | remove | no | yes (deleting twice leaves it deleted) |

**Why idempotency matters:** clients and proxies retry on timeouts. Retrying an idempotent request is safe; retrying a POST can duplicate. Fix for POST: an `Idempotency-Key` header the server remembers.

### Status codes (learn these 10 cold)

| Code | Meaning | Your API uses it for |
|---|---|---|
| 200 | OK + data | reads, signin |
| 201 | Created | signup, create website/region/request |
| 204 | OK, no body | delete |
| 400 | Your input is wrong | Zod failures, bad JSON |
| 401 | Not authenticated (who are you?) | missing/invalid token, wrong password |
| 403 | Authenticated but not allowed | non-admin creating a region |
| 404 | Not found (or not yours) | unknown route, other users' websites |
| 409 | Conflicts with current state | username taken, duplicate region |
| 500 | Server bug | unexpected errors (details only in logs) |
| 503 | Temporarily unavailable | `/health` when the DB is down |

Also know: **301/302** redirects, **304** not modified (caching), **422** (some APIs use it for validation errors), **429** too many requests (rate limiting), **502/504** bad gateway / gateway timeout (a proxy couldn't reach or wait for the upstream).

## 2. REST API design

**Problem it solves:** predictable URLs and behaviour, so clients don't need a manual for every endpoint.

- Resources are **nouns**, actions are **methods**: `POST /websites`, `GET /websites/:id`, `DELETE /websites/:id`. (Your API keeps the original `/user/website/create` paths for compatibility; `POST /websites` would be the conventional shape.)
- **Plural collections**, nested only for real ownership: `/websites/:id/ticks`.
- **Filtering, sorting, pagination via query**: `GET /websites?status=down&limit=20&cursor=...`.
- **Consistent error shape**: `{ message, details? }` everywhere.
- **Versioning** when breaking changes come: `/v1/...` or a header.
- Pagination: **offset** (`?page=3`, simple, slow and shifting on big tables) vs **cursor** (`?after=<last id>`, stable and fast).

## 3. Authentication

**Problem it solves:** HTTP is stateless; every request must prove who sent it.

### Passwords

- **Never store plain text.** Store a **slow, salted hash**: argon2id (what `Bun.password` uses) or bcrypt.
- **Salt** = random bytes per user, stored inside the hash, so the same password hashes differently and precomputed tables (rainbow tables) don't work.
- **Slow on purpose:** a fast hash (SHA-256) lets an attacker try billions of guesses per second after a leak.
- **Compare in constant time** to avoid timing leaks (the library does this).

### Sessions vs JWT

| | Server session (cookie with a session id) | JWT (signed token) |
|---|---|---|
| Where state lives | Server (DB/Redis) | In the token |
| Revoke immediately | Easy: delete the session | Hard: valid until `exp` (needs a denylist or short expiry + refresh token) |
| Scaling | Needs shared session store | Any server with the key can verify |
| Typical use | Web apps | APIs, mobile, service-to-service |

**JWT anatomy:** `base64url(header).base64url(payload).signature`. Anyone can **decode** it; only the key holder can **sign** it. HS256 = one shared secret; RS256/ES256 = private key signs, public key verifies (good when many services verify).

**Always:** verify with an explicit algorithm list (rejects `alg: none`), check `exp`, keep tokens short-lived.

### Where the browser keeps the token

| Storage | XSS can steal it? | CSRF risk? |
|---|---|---|
| `localStorage` (your choice) | **yes**, any script on the page can read it | no (you add the header manually) |
| `httpOnly` cookie | **no**, JS can't read it | yes, browsers send cookies automatically. Mitigate with `SameSite=Lax/Strict` + CSRF tokens |

## 4. Web security basics (OWASP Top 10 flavour)

| Attack | What it is | Defence |
|---|---|---|
| **IDOR / broken access control** | Changing an id in the URL shows someone else's data | Filter every query by the authenticated user; 404 for others' objects |
| **Injection (SQL)** | Input becomes code: `' OR 1=1 --` | Parameterised queries (ORMs do this); never build SQL by string concat |
| **XSS** | Attacker's script runs in your page | React escapes by default; avoid `dangerouslySetInnerHTML`; CSP header; httpOnly cookies |
| **CSRF** | Another site makes the user's browser send a request with their cookies | SameSite cookies, CSRF tokens; not relevant for header-based tokens |
| **Broken auth** | Weak passwords, no rate limit, guessable tokens | Hashing, rate limiting, strong secrets, MFA |
| **Sensitive data exposure** | Passwords/stack traces in responses | Select fields explicitly; generic error messages |
| **SSRF** | Your server fetches a URL the attacker chose (e.g. `http://169.254.169.254` cloud metadata) | **Relevant to your worker!** It fetches user-supplied URLs. Block private/internal IP ranges before requesting. |

**CORS** is *not* a security feature for your server. It's the browser relaxing its same-origin rule when the server says so. It doesn't stop curl or attackers' servers. Your web app avoids it by proxying `/api/*` through Next.js.

## 5. Validation and error handling

- **Validate at the boundary** (Zod): parse unknown input into typed data or reject with 400 + details.
- **Fail fast at startup** on bad config (`JWT_SECRET` missing → refuse to start).
- **One error handler**: routes throw typed errors (`HttpError(404, ...)`); the handler maps them to responses; unknown errors → log + generic 500.
- **Log with context**: method, path, user id, request id, duration. Never log secrets or passwords.

## 6. Express specifics you should know

- **Middleware** = `(req, res, next)` functions in order; each either responds or calls `next()`. Order matters (body parser before routes, 404 then error handler last).
- **Error middleware** has 4 params `(err, req, res, next)`.
- **Express 5** forwards rejected promises from async handlers to the error handler (Express 4 didn't; you needed wrappers).
- **Router** groups routes per resource; `app.use(router)` mounts them.
- **Separate `app` from `listen()`** so tests can start it on a random port.

## Recall questions

<details><summary>401 or 403 for a valid user trying to create a region without being admin? Why?</summary>

403. They're authenticated (we know who they are) but not authorised. 401 means "we don't know who you are".
</details>

<details><summary>Why is POST not idempotent, and how do payment APIs make it safe to retry?</summary>

Each POST creates a new resource, so a retry creates a duplicate. Clients send an `Idempotency-Key`; the server stores the first result for that key and returns it for retries.
</details>

<details><summary>Why argon2/bcrypt and not SHA-256 for passwords?</summary>

SHA-256 is designed to be fast, so leaked hashes can be brute-forced at billions per second. Password hashes are deliberately slow (and memory-hard for argon2) and salted.
</details>

<details><summary>Your token is in localStorage. What attack does that expose you to, and what's the alternative?</summary>

XSS: any injected script can read and exfiltrate it. Alternative: an httpOnly, Secure, SameSite cookie (JS can't read it), plus CSRF protection.
</details>

<details><summary>Your worker fetches user-supplied URLs. What attack is that, and how do you defend?</summary>

SSRF: a user adds `http://localhost:6379` or a cloud metadata IP, and your server requests internal resources. Resolve the hostname and block private, loopback and link-local ranges; allow only http/https; don't follow redirects into blocked ranges.
</details>

<details><summary>Can a JWT be revoked? What are the options?</summary>

Not by itself; it's valid until `exp`. Options: short expiry + refresh tokens (revoke the refresh token), a denylist of token ids checked on each request, or a per-user "token version" stored in the DB.
</details>

<details><summary>Why does your API return 404, not 403, for another user's website?</summary>

403 would confirm the id exists, which leaks information. 404 treats "doesn't exist" and "not yours" the same.
</details>

## Likely interview questions

1. Walk me through what happens when you type a URL in the browser. (DNS → TCP → TLS → HTTP request → server → response → render; see 11.)
2. Explain REST. What makes an API RESTful?
3. Sessions vs JWT: trade-offs?
4. How do you store passwords?
5. What is CORS and why does it exist?
6. How would you implement rate limiting on login? (Token bucket / fixed window in Redis keyed by IP and username; 429.)
7. What's the difference between authentication and authorization?
8. How do you handle errors in an Express app?

## Resources

- MDN HTTP overview, methods and status codes: https://developer.mozilla.org/en-US/docs/Web/HTTP
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- OWASP Cheat Sheets (Password Storage, Authentication, SSRF): https://cheatsheetseries.owasp.org/
- jwt.io introduction: https://jwt.io/introduction
