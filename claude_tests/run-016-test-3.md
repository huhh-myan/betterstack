# Run 016: Test 3

- **Test:** 3 (JWT auth middleware + every protected endpoint). The first full run with steps 5–11 targeting **`GET /user`**.
- **Time:** 2026-11-13 18:38:12 IST (2026-11-13 13:08:12 UTC)
- **Server:** http://localhost:3000, started manually from `apps/api`
- **Captured values:**
  - `a_id` = `b8241bf4-030c-4f86-a8d9-777895d60471`
  - `b_id` = `334159b2-5c4b-4729-9181-6dc43ab4019d`
  - `site_a` = `3345032d-67be-4f9d-af5b-5d3a33f3c9f4`
- **Result:** **every step behaves correctly under the temporary conventions.** No data leaks between users, every bad token is blocked, and regions can be created. Remaining items are polish (status codes, the stack-trace leak), not broken behaviour.
- **Written to the DB:**
  - users `claude_test_16_a`, `claude_test_16_b`
  - websites `https://example.com/a16` (owner A) and `https://example.com/b-as-a16` (owner B)
  - region `claude-region-16`

## Summary

| Step | Request | Auth | Status | Outcome | vs run 013 (last full run) |
|---|---|---|---|---|---|
| 1–4 | sign up / sign in A, B | none | 200 | both tokens issued | same |
| 5 | `GET /user` | token_a | 200 ✅ | `user_id` = a_id | was 404 on `/user/{id}` (route changed) |
| 6 | `GET /user` | absent | 400 ✅ | `ERR_JWS_INVALID` | same |
| 7 | `GET /user` | `not-a-jwt` | 400 ✅ | `ERR_JWS_INVALID` | same |
| 8 | `GET /user` | tampered | 400 ✅ | `ERR_JWS_SIGNATURE_VERIFICATION_FAILED` | same |
| 9 | `GET /user` | alg none | 400 ✅ | `ERR_JOSE_NOT_SUPPORTED` | same |
| 10 | `GET /user` | `Bearer …` | 400 ✅ | `ERR_JWS_INVALID` | same |
| 11 | `GET /user` | **token_b** | 200 ✅ | `user_id` = **b_id** | new definition |
| 12 | create website | token_a | 200 ✅ | owner A | same |
| 13 | create website | absent | 400 ✅ | blocked | same |
| 14 | create, body `user_id` = A | token_b | 200 ✅ | owner B (from the token) | same |
| 15 | `GET` site_a | token_a | 200 ✅ | A's website | same |
| 16 | `GET` site_a | token_b | 200 ✅ | `{"website":null}` | same |
| 17 | `GET` site_a | absent | 400 ✅ | blocked | same |
| 18 | `GET /region/list` | token_a | 200 ✅ | `[{"id":3905,"name":"claude-region-15"}]` | `[]` → 1 region (from run 015) |
| 19 | `GET /region/list` | absent | 400 ✅ | blocked | same |
| 20 | `POST /region/create` | token_a | **200** ✅ | `claude-region-16 created!` | **400 → 200** |

## Details

### Setup (steps 1–4)
```
POST /signup {"username":"claude_test_16_a","password":"pass123"}
→ 200 {"user_id":{"createdAt":"2026-11-13T13:08:12.388Z","id":"b8241bf4-030c-4f86-a8d9-777895d60471","password":"pass123","username":"claude_test_16_a"}}
POST /signin (same body)
→ 200 {"user_id":"b8241bf4-030c-4f86-a8d9-777895d60471","token":"eyJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3OTQ1NzUyOTIsImV4cCI6MTc5NDU4MjQ5Miwic3ViIjoiYjgyNDFiZjQtMDMwYy00Zjg2LWE4ZDktNzc3ODk1ZDYwNDcxIn0.sXce79QKnJwBwi6-7ljtUWQKvHR-lb8xC_WBVsgQVlo"}
POST /signup {"username":"claude_test_16_b","password":"pass123"}
→ 200 {"user_id":{"createdAt":"2026-11-13T13:08:12.788Z","id":"334159b2-5c4b-4729-9181-6dc43ab4019d","password":"pass123","username":"claude_test_16_b"}}
POST /signin (same body)
→ 200 {"user_id":"334159b2-5c4b-4729-9181-6dc43ab4019d","token":"eyJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3OTQ1NzUyOTMsImV4cCI6MTc5NDU4MjQ5Mywic3ViIjoiMzM0MTU5YjItNWM0Yi00NzI5LTkxODEtNmRjNDNhYjQwMTlkIn0.pd7V7C9mtI3Y7Et-LuvUkUnH6XZ3D2O3ZVmB0SO50rc"}
```

### Steps 5–11: `GET /user`
```
GET /user  Authorization: <token_a>  → 200 {"user_id":"b8241bf4-030c-4f86-a8d9-777895d60471"}
GET /user  Authorization: <token_b>  → 200 {"user_id":"334159b2-5c4b-4729-9181-6dc43ab4019d"}
```
Steps 6–10 → **400** `{"message":"Authorization Error!","error":{"code":…,"name":…,"stack":"… (trimmed; full absolute-path trace was sent)"}}`:
- 6, 7: `ERR_JWS_INVALID` "Invalid Compact JWS"
- 8: `ERR_JWS_SIGNATURE_VERIFICATION_FAILED`
- 9: `ERR_JOSE_NOT_SUPPORTED`
- 10: `ERR_JWS_INVALID` "JWS Protected Header is invalid"

### Steps 12–17: websites
```
POST /user/website/create  token_a  {"url":"https://example.com/a16","user_id":"<a_id>"}
→ 200 {"website":{"id":"3345032d-67be-4f9d-af5b-5d3a33f3c9f4","timeAdded":"2026-11-13T13:08:15.885Z","url":"https://example.com/a16","user_id":"b8241bf4-030c-4f86-a8d9-777895d60471"}}
POST /user/website/create  (none) → 400 Authorization Error! ERR_JWS_INVALID
POST /user/website/create  token_b  {"url":"https://example.com/b-as-a16","user_id":"<a_id>"}
→ 200 {"website":{"id":"ccdb6c54-90f9-4277-a033-657f3162674d","timeAdded":"2026-11-13T13:08:16.364Z","url":"https://example.com/b-as-a16","user_id":"334159b2-5c4b-4729-9181-6dc43ab4019d"}}
GET /user/website/3345032d-…  token_a
→ 200 {"website":{"id":"3345032d-67be-4f9d-af5b-5d3a33f3c9f4","timeAdded":"2026-11-13T13:08:15.885Z","url":"https://example.com/a16","user_id":"b8241bf4-030c-4f86-a8d9-777895d60471"}}
GET /user/website/3345032d-…  token_b → 200 {"website":null}
GET /user/website/3345032d-…  (none)  → 400 Authorization Error! ERR_JWS_INVALID
```

### Steps 18–20: regions
```
GET /region/list  token_a  → 200 [{"id":3905,"name":"claude-region-15"}]
GET /region/list  (none)   → 400 Authorization Error! ERR_JWS_INVALID
POST /region/create  token_a  {"name":"claude-region-16"}  → 200 {"message":"claude-region-16 created!"}
```

## Notes
- **Progress across test 3 (runs 010 → 016):**
  - status of rejections: 200 → 400
  - create IDOR fixed (run 011)
  - read IDOR fixed (run 012)
  - `/user/:id` → `/user` (run 016)
  - region create: hang → 23502 → 22P02 → 23502 (name) → 200 (runs 012–016)
- **Polish still open (none of it breaks behaviour):**
  1. Rejections should be **401** (400 is the temporary convention).
  2. Auth errors still send jose's `stack` with absolute file paths.
  3. Step 16 should be **404**, not 200 + `null`.
  4. Region create should return the created object + 201, and is open to any logged-in user.
  5. The random region id (collision risk).
  6. Signup still returns the plaintext password.
- Step 18 shows the region from run 015, so regions accumulate across runs (fine; noted for the DB check).
