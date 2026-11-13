# Run 002: Test 1

- **Test:** 1 (signup → signin → create website → get website)
- **Time:** 2026-11-12 03:22:16 IST (2026-11-11 21:52:16 UTC)
- **Server:** http://localhost:3000, started manually from `apps/api` (restarted after `express.json()` / `express.urlencoded()` were added)
- **Result:** all 4 steps returned 200. A User (`claude_test_2`) and a Website should now be in the DB.

## Summary

| Step | Request | Status | Outcome |
|---|---|---|---|
| 1 | `POST /signup` | **200** | user created, id `6260c78e-a6e6-4f06-ad18-673fdc5f283c`. The response includes the **plaintext password** |
| 2 | `POST /signin` | **200** | returns the same user object (incl. password) + `"login_key":"JWT or Session Cookies"` |
| 3 | `POST /user/website/create` | **200** | website created, id `1e2b64e4-fee6-459c-8307-bf11a224fd20`, linked to the user |
| 4 | `GET /user/website/1e2b64e4-…` | **200** | returns the website created in step 3 |

## Details

### Step 1: POST /signup
```
curl -s -i -X POST http://localhost:3000/signup -H "Content-Type: application/json" -d '{"username":"claude_test_2","password":"pass123"}'
```
- **Status:** 200 OK, `Content-Type: application/json`
- **Body:**
  ```json
  {"user_id":{"createdAt":"2026-11-11T21:52:20.764Z","id":"6260c78e-a6e6-4f06-ad18-673fdc5f283c","password":"pass123","username":"claude_test_2"}}
  ```
- **Captured:** `user_id`: `6260c78e-a6e6-4f06-ad18-673fdc5f283c` (taken from `user_id.id`; see Notes)

### Step 2: POST /signin
```
curl -s -i -X POST http://localhost:3000/signin -H "Content-Type: application/json" -d '{"username":"claude_test_2","password":"pass123"}'
```
- **Status:** 200 OK, `Content-Type: application/json`
- **Body:**
  ```json
  {"user_id":{"createdAt":"2026-11-11T21:52:20.764Z","id":"6260c78e-a6e6-4f06-ad18-673fdc5f283c","password":"pass123","username":"claude_test_2"},"login_key":"JWT or Session Cookies"}
  ```

### Step 3: POST /user/website/create
```
curl -s -i -X POST http://localhost:3000/user/website/create -H "Content-Type: application/json" -d '{"url":"https://example.com","user_id":"6260c78e-a6e6-4f06-ad18-673fdc5f283c"}'
```
- **Status:** 200 OK, `Content-Type: application/json`
- **Body:**
  ```json
  {"website":{"id":"1e2b64e4-fee6-459c-8307-bf11a224fd20","timeAdded":"2026-11-11T21:52:30.198Z","url":"https://example.com","user_id":"6260c78e-a6e6-4f06-ad18-673fdc5f283c"}}
  ```
- **Captured:** `website_id`: `1e2b64e4-fee6-459c-8307-bf11a224fd20`

### Step 4: GET /user/website/:id
```
curl -s -i http://localhost:3000/user/website/1e2b64e4-fee6-459c-8307-bf11a224fd20
```
- **Status:** 200 OK, `Content-Type: application/json`
- **Body:**
  ```json
  {"website":{"id":"1e2b64e4-fee6-459c-8307-bf11a224fd20","timeAdded":"2026-11-11T21:52:30.198Z","url":"https://example.com","user_id":"6260c78e-a6e6-4f06-ad18-673fdc5f283c"}}
  ```

## Notes
- **Compared with run 001:**
  - step 1: 500 → 200
  - step 2: 500 → 200
  - step 3: 500 → 200
  - step 4: 200 (`null`, fake id) → 200 (real website)
  - Cause of the fix: the body parsers (P53).
- **Capture deviation:** the definition said to capture `user_id` from `user_id`, but `/signup` returns the **whole user object** under the key `user_id`. The id was taken from `user_id.id`, and `tests.md` was updated to say so.
- **The password comes back in plaintext** in both the signup and signin responses. It's also stored unhashed (the hashing is still a TODO in the code).
- Signup returns **200**. 201 Created is the usual code for "new resource" (P48).
- Not covered by this test: what signin does with a **wrong password** (`.first()` returns `null` instead of throwing, as in P52's step 4).
