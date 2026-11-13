# Run 012: Test 3

- **Test:** 3 (JWT auth middleware + every protected endpoint)
- **Time:** 2026-11-13 18:14:22 IST (2026-11-13 12:44:22 UTC)
- **Server:** http://localhost:3000, started manually from `apps/api`
- **Captured values:**
  - `a_id` = `4f377f25-63a2-4ebb-be5b-cc838aaa82c0`
  - `b_id` = `045b94f3-889d-48fc-950f-2c3b8701eee1`
  - `site_a` = `825ec70b-3c92-4cc2-8cbb-86d878a8db24`
- **Result:**
  - **The read IDOR is closed:** B now gets `{"website":null}` for A's site.
  - **`GET /user/:id` no longer exists** (404 with a valid token).
  - **`POST /region/create` now responds,** but fails with a NOT NULL error on `id`, and the SQL error details are sent to the client.
- **Written to the DB:**
  - users `claude_test_12_a`, `claude_test_12_b`
  - website `https://example.com/a12` (owner A)
  - website `https://example.com/b-as-a12` (owner B)
  - no region

## Summary

| Step | Request | Auth | Status | Outcome | vs run 011 |
|---|---|---|---|---|---|
| 1–4 | sign up / sign in A, B | none | 200 | both tokens issued | same |
| 5 | `GET /user/{a_id}` | token_a | **404** | HTML "Cannot GET /user/…": the route is gone | 200 → 404 |
| 6 | `GET /user/{a_id}` | absent | 400 ✅ | `ERR_JWS_INVALID` + stack | same |
| 7 | `GET /user/{a_id}` | `not-a-jwt` | 400 ✅ | `ERR_JWS_INVALID` + stack | same |
| 8 | `GET /user/{a_id}` | tampered | 400 ✅ | `ERR_JWS_SIGNATURE_VERIFICATION_FAILED` + stack | same |
| 9 | `GET /user/{a_id}` | alg none | 400 ✅ | `ERR_JOSE_NOT_SUPPORTED` + stack | same |
| 10 | `GET /user/{a_id}` | `Bearer …` | 400 ✅ | `ERR_JWS_INVALID` | same |
| 11 | `GET /user/{b_id}` | token_a | **404** | HTML "Cannot GET /user/…" | 200 → 404 |
| 12 | `POST /user/website/create` | token_a | 200 ✅ | site_a, owner A | same |
| 13 | `POST /user/website/create` | absent | 400 ✅ | blocked + stack | same |
| 14 | create, body `user_id` = A | token_b | 200 ✅ | owner = B (from the token) | same |
| 15 | `GET /user/website/{site_a}` | token_a | 200 ✅ | A's website | same |
| 16 | `GET /user/website/{site_a}` | token_b | 200 ✅ | `{"website":null}`: **B no longer sees A's site** | **fixed** (was A's data). Ideally 404 |
| 17 | `GET /user/website/{site_a}` | absent | 400 ✅ | blocked + stack | same |
| 18 | `GET /region/list` | token_a | 200 ✅ | `[]` | same |
| 19 | `GET /region/list` | absent | 400 ✅ | blocked + stack | same |
| 20 | `POST /region/create` | token_a | **400** ❌ | `SqlQueryError` 23502 (NOT NULL) on `Region.id`; `name` holds the whole body object | hang → responds |

## Details

### Setup (steps 1–4)
```
POST /signup {"username":"claude_test_12_a","password":"pass123"}
→ 200 {"user_id":{"createdAt":"2026-11-13T12:44:40.954Z","id":"4f377f25-63a2-4ebb-be5b-cc838aaa82c0","password":"pass123","username":"claude_test_12_a"}}
POST /signin (same body)
→ 200 {"user_id":"4f377f25-63a2-4ebb-be5b-cc838aaa82c0","token":"eyJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3OTQ1NzM4ODEsImV4cCI6MTc5NDU4MTA4MSwic3ViIjoiNGYzNzdmMjUtNjNhMi00ZWJiLWJlNWItY2M4MzhhYWE4MmMwIn0.76TQ08ZDKcdx1H3tAlduztleC3DRHI4HOJ3cKux3WM0"}
POST /signup {"username":"claude_test_12_b","password":"pass123"}
→ 200 {"user_id":{"createdAt":"2026-11-13T12:44:41.232Z","id":"045b94f3-889d-48fc-950f-2c3b8701eee1","password":"pass123","username":"claude_test_12_b"}}
POST /signin (same body)
→ 200 {"user_id":"045b94f3-889d-48fc-950f-2c3b8701eee1","token":"eyJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3OTQ1NzM4ODEsImV4cCI6MTc5NDU4MTA4MSwic3ViIjoiMDQ1Yjk0ZjMtODg5ZC00OGZjLTk1MGYtMmMzYjg3MDFlZWUxIn0.J4U65bD2mVxfX3NMDVKnb1kP_zeK6ifYISWsSl9UzdU"}
```

### Steps 5 and 11 (valid token_a)
```
GET /user/4f377f25-…  → 404 (text/html) <pre>Cannot GET /user/4f377f25-63a2-4ebb-be5b-cc838aaa82c0</pre>
GET /user/045b94f3-…  → 404 (text/html) <pre>Cannot GET /user/045b94f3-889d-48fc-950f-2c3b8701eee1</pre>
```

### Steps 6–10, 13, 17, 19 (rejections)
All returned **400** with `{"message":"Authorization Error!","error":{"code":…,"name":…,"stack":"… D:\\cohort\\…\\jose@6.2.17 … middleware.ts:19:58 … (trimmed)"}}`:
- 6, 7, 13, 17, 19: `ERR_JWS_INVALID` "Invalid Compact JWS"
- 8: `ERR_JWS_SIGNATURE_VERIFICATION_FAILED`
- 9: `ERR_JOSE_NOT_SUPPORTED`
- 10: `ERR_JWS_INVALID` "JWS Protected Header is invalid"

### Steps 12, 14, 15, 16
```
POST /user/website/create  token_a  {"url":"https://example.com/a12","user_id":"<a_id>"}
→ 200 {"website":{"id":"825ec70b-3c92-4cc2-8cbb-86d878a8db24","timeAdded":"2026-11-13T12:44:43.221Z","url":"https://example.com/a12","user_id":"4f377f25-63a2-4ebb-be5b-cc838aaa82c0"}}
POST /user/website/create  token_b  {"url":"https://example.com/b-as-a12","user_id":"<a_id>"}
→ 200 {"website":{"id":"6ef64aa2-cae6-4ab8-9d57-5f19c5775b11","timeAdded":"2026-11-13T12:44:43.531Z","url":"https://example.com/b-as-a12","user_id":"045b94f3-889d-48fc-950f-2c3b8701eee1"}}
GET /user/website/825ec70b-…  token_a
→ 200 {"website":{"id":"825ec70b-3c92-4cc2-8cbb-86d878a8db24","timeAdded":"2026-11-13T12:44:43.221Z","url":"https://example.com/a12","user_id":"4f377f25-63a2-4ebb-be5b-cc838aaa82c0"}}
GET /user/website/825ec70b-…  token_b
→ 200 {"website":null}
```

### Steps 18, 20
```
GET /region/list  token_a  → 200 []
POST /region/create  token_a  {"name":"claude-region-12"}
→ 400 {"message":"error creating region","error":{"kind":"sql_query","sqlState":"23502","table":"Region","column":"id","detail":"Failing row contains (null, {\"name\":\"claude-region-12\"}).","name":"SqlQueryError"}}
```

## Notes
- **Fixed since run 011:**
  - **Step 16:** the ownership check works. B gets `null` instead of A's website. The cleaner response is **404** ("not found *for you*"; same as truly-not-found, so it doesn't reveal that the id exists).
  - **Step 20:** the handler now responds, no longer hangs.
- **New in this run:**
  - **Steps 5/11:** `GET /user/:id` returns Express's default **404 HTML page**, so the route was removed or renamed. Test 3 still calls it, so steps 5 and 11 need a new target. Note that **without** a token the same path gives 400 "Authorization Error!" (step 6), because the global `app.use(jsonMiddleware)` runs before Express decides the route doesn't exist.
  - **Step 20:** Postgres **23502 = not_null_violation** on `Region.id`. The contract's `Region.id Int @id` has **no generator** (flagged in P46), so nothing supplies an id. Also, the failing row shows **`name` = `{"name":"claude-region-12"}`**: the whole request body object went into the `name` column instead of the string.
  - **Step 20 leaks DB internals:** `sqlState`, `table`, `column` and `detail` (with row contents) are sent to the client (P49).
- **Still open:**
  1. The jose `stack` in every auth rejection.
  2. 400 → final 401.
  3. Step 16 → 404.
