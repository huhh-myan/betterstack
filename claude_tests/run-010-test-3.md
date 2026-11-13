# Run 010: Test 3

- **Test:** 3 (JWT auth middleware + every protected endpoint). First run.
- **Time:** 2026-11-13 17:50:06 IST (2026-11-13 12:20:06 UTC)
- **Server:** http://localhost:3000, started manually from `apps/api`
- **Captured values:**
  - `a_id` = `201bab14-6210-463c-a6bf-fa4136497bd6`
  - `b_id` = `69290981-8d05-4206-b8df-c871c05d8f10`
  - `site_a` = `654782cd-6c9f-4847-9124-efd8b0b59b0c`
- **Result:**
  - Valid tokens work, and every bad token was **blocked**.
  - **But every rejection returns status 200**, with a jose stack trace in the body.
  - **Users can create and read other users' websites (steps 14, 16).**
  - `POST /region/create` hangs.
- **Written to the DB:**
  - users `claude_test_10_a`, `claude_test_10_b`
  - websites `https://example.com/a10` and `https://example.com/b-as-a10`, **both owned by A**

## Summary

| Step | Request | Auth | Status | Outcome |
|---|---|---|---|---|
| 1 | `POST /signup` (A) | none | 200 | A created |
| 2 | `POST /signin` (A) | none | 200 | token_a issued |
| 3 | `POST /signup` (B) | none | 200 | B created |
| 4 | `POST /signin` (B) | none | 200 | token_b issued |
| 5 | `GET /user/{a_id}` | token_a | 200 ✅ | `{"user_id":"<a_id>"}` |
| 6 | `GET /user/{a_id}` | absent | **200** ❌ | blocked, but `Authorization Error!` `ERR_JWS_INVALID` + stack trace |
| 7 | `GET /user/{a_id}` | `not-a-jwt` | **200** ❌ | blocked: `ERR_JWS_INVALID` + stack |
| 8 | `GET /user/{a_id}` | tampered (`sub` = b_id) | **200** ❌ | blocked: **`ERR_JWS_SIGNATURE_VERIFICATION_FAILED`** + stack |
| 9 | `GET /user/{a_id}` | alg none | **200** ❌ | blocked: `ERR_JOSE_NOT_SUPPORTED` ("alg none is not supported") + stack |
| 10 | `GET /user/{a_id}` | `Bearer <token_a>` | **200** ❌ | blocked: `ERR_JWS_INVALID` ("JWS Protected Header is invalid"). Expected under the raw-token design |
| 11 | `GET /user/{b_id}` | token_a | 200 ⚠️ | returns **A's** id. The route ignores `:id` |
| 12 | `POST /user/website/create` | token_a | 200 ✅ | site_a created, owner A |
| 13 | `POST /user/website/create` | absent | **200** ❌ | blocked (nothing created), but status 200 + stack |
| 14 | `POST /user/website/create` (body `user_id` = A) | **token_b** | 200 ❌❌ | **B created a website owned by A** (owner taken from the body) |
| 15 | `GET /user/website/{site_a}` | token_a | 200 ✅ | A's website |
| 16 | `GET /user/website/{site_a}` | **token_b** | 200 ❌❌ | **B can read A's website** |
| 17 | `GET /user/website/{site_a}` | absent | **200** ❌ | blocked, but status 200 + stack |
| 18 | `GET /region/list` | token_a | 200 ✅ | `[]` (no regions yet) |
| 19 | `GET /region/list` | absent | **200** ❌ | blocked, but status 200 + stack |
| 20 | `POST /region/create` | token_a | **no response** ❌ | timed out after 10 s (empty handler) |

## Details

### Setup (steps 1–4)
```
curl -s -i -X POST http://localhost:3000/signup -H "Content-Type: application/json" -d '{"username":"claude_test_10_a","password":"pass123"}'
→ 200 {"user_id":{"createdAt":"2026-11-13T12:20:18.562Z","id":"201bab14-6210-463c-a6bf-fa4136497bd6","password":"pass123","username":"claude_test_10_a"}}

curl -s -i -X POST http://localhost:3000/signin -H "Content-Type: application/json" -d '{"username":"claude_test_10_a","password":"pass123"}'
→ 200 {"user_id":"201bab14-6210-463c-a6bf-fa4136497bd6","token":"eyJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3OTQ1NzI0MTgsImV4cCI6MTc5NDU3OTYxOCwic3ViIjoiMjAxYmFiMTQtNjIxMC00NjNjLWE2YmYtZmE0MTM2NDk3YmQ2In0.v68sFGncIQGSf4u5B7-eO-WYU719htL48jt-g36UbEA"}

curl -s -i -X POST http://localhost:3000/signup -H "Content-Type: application/json" -d '{"username":"claude_test_10_b","password":"pass123"}'
→ 200 {"user_id":{"createdAt":"2026-11-13T12:20:18.935Z","id":"69290981-8d05-4206-b8df-c871c05d8f10","password":"pass123","username":"claude_test_10_b"}}

curl -s -i -X POST http://localhost:3000/signin -H "Content-Type: application/json" -d '{"username":"claude_test_10_b","password":"pass123"}'
→ 200 {"user_id":"69290981-8d05-4206-b8df-c871c05d8f10","token":"eyJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3OTQ1NzI0MTksImV4cCI6MTc5NDU3OTYxOSwic3ViIjoiNjkyOTA5ODEtOGQwNS00MjA2LWI4ZGYtYzg3MWMwNWQ4ZjEwIn0.4VxUuUe7lgEK9S0CUD2Ba6jzCfQ_t7hGnUiCYkug68M"}
```
- Decoded token_a payload: `{"iat":1794572418,"exp":1794579618,"sub":"201bab14-…"}`. Only `sub`, `iat`, `exp`, as designed (P58).

### Forged tokens (built by Claude in bash)
- **tampered** = token_a's header + a payload of `{"iat":1794572418,"exp":1794579618,"sub":"69290981-…"}` (B's id) + **token_a's signature**:
  `eyJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3OTQ1NzI0MTgsImV4cCI6MTc5NDU3OTYxOCwic3ViIjoiNjkyOTA5ODEtOGQwNS00MjA2LWI4ZGYtYzg3MWMwNWQ4ZjEwIn0.v68sFGncIQGSf4u5B7-eO-WYU719htL48jt-g36UbEA`
- **alg none** = `{"alg":"none"}` . `{"sub":"201bab14-…","exp":1794576029}` . *(empty signature)*:
  `eyJhbGciOiJub25lIn0.eyJzdWIiOiIyMDFiYWIxNC02MjEwLTQ2M2MtYTZiZi1mYTQxMzY0OTdiZDYiLCJleHAiOjE3OTQ1NzYwMjl9.`

### Steps 5–11: `GET /user/:id`
```
curl -s -i http://localhost:3000/user/<a_id> -H "Authorization: <token_a>"     # step 5
→ 200 {"user_id":"201bab14-6210-463c-a6bf-fa4136497bd6"}
```
Steps 6–10: every one returned **200** and a body of this shape (the stack is trimmed here; the full trace, with absolute file paths, was sent to the client):
```
{"message":"Authorization Error!","error":{"code":"<CODE>","name":"<Name>","stack":"<Name>: <message>\n    at … (D:\\cohort\\betteruptime\\betteruptime\\node_modules\\.bun\\jose@6.2.17\\…)\n    at jsonMiddleware (D:\\cohort\\betteruptime\\betteruptime\\apps\\api\\middleware.ts:19:58) …"}}
```
| Step | Authorization sent | code / name / message |
|---|---|---|
| 6 | *(none; the middleware falls back to `" "`)* | `ERR_JWS_INVALID` / `JWSInvalid` / "Invalid Compact JWS" |
| 7 | `not-a-jwt` | `ERR_JWS_INVALID` / `JWSInvalid` / "Invalid Compact JWS" |
| 8 | tampered | `ERR_JWS_SIGNATURE_VERIFICATION_FAILED` / `JWSSignatureVerificationFailed` / "signature verification failed" |
| 9 | alg none | `ERR_JOSE_NOT_SUPPORTED` / `JOSENotSupported` / "alg none is not supported either by JOSE or your javascript runtime" |
| 10 | `Bearer <token_a>` | `ERR_JWS_INVALID` / `JWSInvalid` / "JWS Protected Header is invalid" |
```
curl -s -i http://localhost:3000/user/<b_id> -H "Authorization: <token_a>"     # step 11
→ 200 {"user_id":"201bab14-6210-463c-a6bf-fa4136497bd6"}
```

### Steps 12–17: websites
```
# step 12
curl -s -i -X POST http://localhost:3000/user/website/create -H "Authorization: <token_a>" -H "Content-Type: application/json" -d '{"url":"https://example.com/a10","user_id":"<a_id>"}'
→ 200 {"website":{"id":"654782cd-6c9f-4847-9124-efd8b0b59b0c","timeAdded":"2026-11-13T12:21:18.623Z","url":"https://example.com/a10","user_id":"201bab14-6210-463c-a6bf-fa4136497bd6"}}

# step 13 (no Authorization)
→ 200 {"message":"Authorization Error!","error":{"code":"ERR_JWS_INVALID","name":"JWSInvalid","stack":"JWSInvalid: Invalid Compact JWS … (trimmed)"}}

# step 14 (token_b, body user_id = A)
curl -s -i -X POST http://localhost:3000/user/website/create -H "Authorization: <token_b>" -H "Content-Type: application/json" -d '{"url":"https://example.com/b-as-a10","user_id":"<a_id>"}'
→ 200 {"website":{"id":"ab3efce0-0878-4219-9d26-4c9104c22a04","timeAdded":"2026-11-13T12:21:18.957Z","url":"https://example.com/b-as-a10","user_id":"201bab14-6210-463c-a6bf-fa4136497bd6"}}

# step 15 (token_a)
curl -s -i http://localhost:3000/user/website/<site_a> -H "Authorization: <token_a>"
→ 200 {"website":{"id":"654782cd-…","timeAdded":"2026-11-13T12:21:18.623Z","url":"https://example.com/a10","user_id":"201bab14-…"}}

# step 16 (token_b)
→ 200 {"website":{"id":"654782cd-…","timeAdded":"2026-11-13T12:21:18.623Z","url":"https://example.com/a10","user_id":"201bab14-…"}}

# step 17 (no Authorization)
→ 200 {"message":"Authorization Error!","error":{"code":"ERR_JWS_INVALID","name":"JWSInvalid","stack":"JWSInvalid: Invalid Compact JWS … (trimmed)"}}
```

### Steps 18–20: regions
```
curl -s -i http://localhost:3000/region/list -H "Authorization: <token_a>"     # step 18
→ 200 []
curl -s -i http://localhost:3000/region/list                                    # step 19
→ 200 {"message":"Authorization Error!","error":{"code":"ERR_JWS_INVALID",… stack trimmed}}
curl -s -i --max-time 10 -X POST http://localhost:3000/region/create -H "Authorization: <token_a>" -H "Content-Type: application/json" -d '{"name":"claude-region-10"}'   # step 20
→ no response (curl exit 28, timed out after 10 s)
```

## Notes
- **This is the first run of test 3**, so there's nothing to compare against.
- **What works:**
  - The middleware **does block** every bad token.
  - jose rejected the tampered signature, `alg: none`, garbage and a missing token.
  - Valid tokens reach the routes.
- **Bug 1: rejections return 200.** `middleware.ts` catch does `res.json(...)` with no status, so a client (or the future frontend) can't tell "blocked" from "OK" without reading the message.
- **Bug 2: stack traces leak.** Unlike the plain `Error` in P54 (which serialised to `{}`), **jose's errors serialise `code`, `name` and `stack`**. So `error` in the response exposes absolute file paths, the jose version and the middleware's line number.
- **Bug 3: website ownership comes from the request body (step 14).** Any logged-in user can create websites for any other user. The owner should be the token's `sub` (`req.user_id`). The code comment at index.ts:104 already says this.
- **Bug 4: no ownership check on read (step 16).** Any logged-in user can read any website by id.
- **Bug 5: `POST /region/create` hangs.** The handler never responds.
- **Odd: `GET /user/:id` ignores `:id` (step 11).** It always returns the caller's own id, so the parameter is meaningless.
- **Side effect noticed:** `app.use(jsonMiddleware)` runs for **every** request after it, including unknown paths. An unauthenticated request to a route that doesn't exist gets **200 "Authorization Error!"** instead of 404 (Claude's server check hit this).
- Test 1 was updated to send the token on its website steps (not run this time).
