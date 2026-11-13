# Run 006: Test 2

- **Test:** 2 (signin with bad credentials)
- **Time:** 2026-11-12 04:43:09 IST (2026-11-11 23:13:09 UTC)
- **Server:** http://localhost:3000, started manually from `apps/api` (after the user's `/signin` fix)
- **Result:** **3 of 3 bad-credential steps were rejected** (409, the temporary signin error code), and none returned user data. One user (`claude_test_6`) was written to the DB in step 1.

## Summary

| Step | Request | Status | Outcome |
|---|---|---|---|
| 1 | `POST /signup` (`claude_test_6`) | 200 | user created, id `98e7a33d-fd5a-4739-915e-f9cc87d7127d` |
| 2 | `POST /signin`, wrong password | **409** ✅ | `{"message":"error!","error":{}}` |
| 3 | `POST /signin`, unknown username | **409** ✅ | `{"message":"error!","error":{}}` |
| 4 | `POST /signin`, no password field | **409** ✅ | `{"message":"error!","error":{}}` |

## Details

### Step 1: POST /signup
```
curl -s -i -X POST http://localhost:3000/signup -H "Content-Type: application/json" -d '{"username":"claude_test_6","password":"pass123"}'
```
- **Status:** 200 OK, `Content-Type: application/json`
- **Body:** `{"user_id":{"createdAt":"2026-11-11T23:13:17.918Z","id":"98e7a33d-fd5a-4739-915e-f9cc87d7127d","password":"pass123","username":"claude_test_6"}}`

### Step 2: POST /signin (wrong password)
```
curl -s -i -X POST http://localhost:3000/signin -H "Content-Type: application/json" -d '{"username":"claude_test_6","password":"wrong-pass"}'
```
- **Status:** 409 Conflict, `Content-Type: application/json`
- **Body:** `{"message":"error!","error":{}}`

### Step 3: POST /signin (unknown username)
```
curl -s -i -X POST http://localhost:3000/signin -H "Content-Type: application/json" -d '{"username":"no_such_user_6","password":"pass123"}'
```
- **Status:** 409 Conflict
- **Body:** `{"message":"error!","error":{}}`

### Step 4: POST /signin (no password field)
```
curl -s -i -X POST http://localhost:3000/signin -H "Content-Type: application/json" -d '{"username":"claude_test_6"}'
```
- **Status:** 409 Conflict
- **Body:** `{"message":"error!","error":{}}`

## Notes
- **Compared with run 005:**
  - step 2: 200 (`user_id: null`) → 409
  - step 3: 200 (`user_id: null`) → 409
  - step 4: **200 with the full user → 409**. The auth bypass is closed for a missing password.
- **`"error":{}`:** the thrown `Error`'s message ("Invalid Creds! …", "enter password pls") never reaches the client. `JSON.stringify` of an `Error` gives `{}`, because `message` and `stack` are non-enumerable. Steps 2 and 3 return identical bodies, which is good for not revealing which usernames exist.
- **Still open:** signup still returns the plaintext password (`RETURNING` includes it).
- **Not covered by test 2:** signin with **no username** (only a password). That's the same `undefined`-filter bug class, on the other field.
