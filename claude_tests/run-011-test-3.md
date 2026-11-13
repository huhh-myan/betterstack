# Run 011: Test 3

- **Test:** 3 (JWT auth middleware + every protected endpoint)
- **Time:** 2026-11-13 18:00:11 IST (2026-11-13 12:30:12 UTC)
- **Server:** http://localhost:3000, started manually from `apps/api` (after the user's fixes: `express.d.ts` `String` → `string`, middleware status, website owner)
- **Captured values:**
  - `a_id` = `7b2bf001-e954-400e-a8ba-6e2ad5ae90e6`
  - `b_id` = `cbf57bf2-5792-4da3-8c7b-93baeb001f51`
  - `site_a` = `81f6ef6b-2185-4ea4-a18d-07a088a3f74b`
- **Result:**
  - Rejections now return **400** (were 200).
  - **Create takes the owner from the token** (step 14 fixed).
  - **Read still has no ownership check** (step 16).
  - Stack traces still leak.
  - `POST /region/create` still hangs.
- **Written to the DB:**
  - users `claude_test_11_a`, `claude_test_11_b`
  - website `https://example.com/a11` (owner A)
  - website `https://example.com/b-as-a11` (**owner B**)

## Summary

| Step | Request | Auth | Status | Outcome | vs run 010 |
|---|---|---|---|---|---|
| 1–4 | sign up / sign in A, B | none | 200 | both tokens issued | same |
| 5 | `GET /user/{a_id}` | token_a | 200 ✅ | `{"user_id":"<a_id>"}` | same |
| 6 | `GET /user/{a_id}` | absent | **400** ✅ | `ERR_JWS_INVALID` + stack | 200 → 400 |
| 7 | `GET /user/{a_id}` | `not-a-jwt` | **400** ✅ | `ERR_JWS_INVALID` + stack | 200 → 400 |
| 8 | `GET /user/{a_id}` | tampered | **400** ✅ | `ERR_JWS_SIGNATURE_VERIFICATION_FAILED` + stack | 200 → 400 |
| 9 | `GET /user/{a_id}` | alg none | **400** ✅ | `ERR_JOSE_NOT_SUPPORTED` + stack | 200 → 400 |
| 10 | `GET /user/{a_id}` | `Bearer …` | **400** ✅ | `ERR_JWS_INVALID` ("Protected Header is invalid") | 200 → 400 |
| 11 | `GET /user/{b_id}` | token_a | 200 ⚠️ | returns A's id (`:id` ignored) | same |
| 12 | `POST /user/website/create` | token_a | 200 ✅ | site_a, owner A | same |
| 13 | `POST /user/website/create` | absent | **400** ✅ | blocked + stack | 200 → 400 |
| 14 | create, body `user_id` = A | token_b | 200 ✅ | **owner = B** (from the token, body ignored) | **fixed** (was owner A) |
| 15 | `GET /user/website/{site_a}` | token_a | 200 ✅ | A's website | same |
| 16 | `GET /user/website/{site_a}` | token_b | 200 ❌❌ | **B still reads A's website** | same |
| 17 | `GET /user/website/{site_a}` | absent | **400** ✅ | blocked + stack | 200 → 400 |
| 18 | `GET /region/list` | token_a | 200 ✅ | `[]` | same |
| 19 | `GET /region/list` | absent | **400** ✅ | blocked + stack | 200 → 400 |
| 20 | `POST /region/create` | token_a | **no response** ❌ | timed out after 10 s | same |

## Details

### Setup (steps 1–4)
```
POST /signup {"username":"claude_test_11_a","password":"pass123"}
→ 200 {"user_id":{"createdAt":"2026-11-13T12:31:05.888Z","id":"7b2bf001-e954-400e-a8ba-6e2ad5ae90e6","password":"pass123","username":"claude_test_11_a"}}
POST /signin {"username":"claude_test_11_a","password":"pass123"}
→ 200 {"user_id":"7b2bf001-e954-400e-a8ba-6e2ad5ae90e6","token":"eyJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3OTQ1NzMwNjYsImV4cCI6MTc5NDU4MDI2Niwic3ViIjoiN2IyYmYwMDEtZTk1NC00MDBlLWE4YmEtNmUyYWQ1YWU5MGU2In0.2f0AORSeH7tbsbsFm2-yuX_Dwcn_YMUVwQxjBY3ZQHQ"}
POST /signup {"username":"claude_test_11_b","password":"pass123"}
→ 200 {"user_id":{"createdAt":"2026-11-13T12:31:06.135Z","id":"cbf57bf2-5792-4da3-8c7b-93baeb001f51","password":"pass123","username":"claude_test_11_b"}}
POST /signin {"username":"claude_test_11_b","password":"pass123"}
→ 200 {"user_id":"cbf57bf2-5792-4da3-8c7b-93baeb001f51","token":"eyJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3OTQ1NzMwNjYsImV4cCI6MTc5NDU4MDI2Niwic3ViIjoiY2JmNTdiZjItNTc5Mi00ZGEzLThjN2ItOTNiYWViMDAxZjUxIn0.oHceVXTlsrIMG6GQ11FiQUK2HYv4l5KuQ_SQ-1CGlKM"}
```
- Forged tokens were built as in run 010: the tampered one has `sub` = b_id with A's signature; the alg-none one has `{"alg":"none"}` and an empty signature.

### Steps 5–11
```
GET /user/<a_id>  Authorization: <token_a>          → 200 {"user_id":"7b2bf001-e954-400e-a8ba-6e2ad5ae90e6"}
GET /user/<a_id>  (none)                             → 400 {"message":"Authorization Error!","error":{"code":"ERR_JWS_INVALID","name":"JWSInvalid","stack":"JWSInvalid: Invalid Compact JWS\n at … jose@6.2.17 … middleware.ts:19:58 … (trimmed)"}}
GET /user/<a_id>  Authorization: not-a-jwt          → 400 same shape, ERR_JWS_INVALID "Invalid Compact JWS"
GET /user/<a_id>  Authorization: <tampered>         → 400 {"message":"Authorization Error!","error":{"code":"ERR_JWS_SIGNATURE_VERIFICATION_FAILED","name":"JWSSignatureVerificationFailed","stack":"JWSSignatureVerificationFailed: signature verification failed\n    at verifySignature (D:\\…\\jose@6.2.17\\…\\jws_verify.js:70:11)\n    at processTicksAndRejections (native:7:39)"}}
GET /user/<a_id>  Authorization: <alg none>         → 400 same shape, ERR_JOSE_NOT_SUPPORTED "alg none is not supported either by JOSE or your javascript runtime"
GET /user/<a_id>  Authorization: Bearer <token_a>   → 400 same shape, ERR_JWS_INVALID "JWS Protected Header is invalid"
GET /user/<b_id>  Authorization: <token_a>          → 200 {"user_id":"7b2bf001-e954-400e-a8ba-6e2ad5ae90e6"}
```

### Steps 12–17
```
POST /user/website/create  Authorization: <token_a>  {"url":"https://example.com/a11","user_id":"<a_id>"}
→ 200 {"website":{"id":"81f6ef6b-2185-4ea4-a18d-07a088a3f74b","timeAdded":"2026-11-13T12:31:25.673Z","url":"https://example.com/a11","user_id":"7b2bf001-e954-400e-a8ba-6e2ad5ae90e6"}}
POST /user/website/create  (none)  {"url":"https://example.com/x11","user_id":"<a_id>"}
→ 400 {"message":"Authorization Error!","error":{"code":"ERR_JWS_INVALID",… stack trimmed}}
POST /user/website/create  Authorization: <token_b>  {"url":"https://example.com/b-as-a11","user_id":"<a_id>"}
→ 200 {"website":{"id":"ad9e0d27-3c20-432e-88d6-3f045123841b","timeAdded":"2026-11-13T12:31:25.963Z","url":"https://example.com/b-as-a11","user_id":"cbf57bf2-5792-4da3-8c7b-93baeb001f51"}}
GET /user/website/<site_a>  Authorization: <token_a>
→ 200 {"website":{"id":"81f6ef6b-2185-4ea4-a18d-07a088a3f74b","timeAdded":"2026-11-13T12:31:25.673Z","url":"https://example.com/a11","user_id":"7b2bf001-e954-400e-a8ba-6e2ad5ae90e6"}}
GET /user/website/<site_a>  Authorization: <token_b>
→ 200 {"website":{"id":"81f6ef6b-2185-4ea4-a18d-07a088a3f74b","timeAdded":"2026-11-13T12:31:25.673Z","url":"https://example.com/a11","user_id":"7b2bf001-e954-400e-a8ba-6e2ad5ae90e6"}}
GET /user/website/<site_a>  (none)
→ 400 {"message":"Authorization Error!","error":{"code":"ERR_JWS_INVALID",… stack trimmed}}
```

### Steps 18–20
```
GET /region/list  Authorization: <token_a>   → 200 []
GET /region/list  (none)                     → 400 {"message":"Authorization Error!","error":{"code":"ERR_JWS_INVALID",… stack trimmed}}
POST /region/create  Authorization: <token_a>  {"name":"claude-region-11"}  → no response (curl exit 28, timed out after 10 s)
```

## Notes
- **Fixed since run 010:**
  - every rejection now has an error status (**400**). The temporary convention says 400 for non-signin endpoints; the right final code is **401**.
  - **step 14:** the owner now comes from the token, and the body's `user_id` is ignored.
- **Still open:**
  1. **Step 16:** no ownership check on read (IDOR).
  2. The `error` field still sends jose's `stack` (absolute file paths).
  3. Step 20 hangs.
  4. Step 11: `:id` ignored.
- Claude's server check (an unknown path) now returns 400 instead of 200, the same middleware side effect: unknown paths get "Authorization Error!" rather than 404.
