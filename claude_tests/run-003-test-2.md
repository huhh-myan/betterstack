# Run 003: Test 2

- **Test:** 2 (signin with bad credentials)
- **Time:** 2026-11-12 03:30:30 IST (2026-11-11 22:00:30 UTC)
- **Server:** http://localhost:3000, started manually from `apps/api`
- **Result:** **0 of 3 bad-credential steps were rejected.** All returned **200**, and step 4 **logged in without a password**. One user (`claude_test_3`) was written to the DB in step 1.

## Summary

| Step | Request | Status | Outcome |
|---|---|---|---|
| 1 | `POST /signup` (`claude_test_3`) | 200 | user created, id `e18c7958-8754-4479-907f-e04b283c28bd` |
| 2 | `POST /signin`, wrong password | **200** ❌ | `{"user_id":null,"login_key":"JWT or Session Cookies"}`: not rejected |
| 3 | `POST /signin`, unknown username | **200** ❌ | `{"user_id":null,"login_key":"JWT or Session Cookies"}`: not rejected |
| 4 | `POST /signin`, no password field | **200** ❌❌ | **returns the full user (incl. password)**: signed in with no password |

## Details

### Step 1: POST /signup
```
curl -s -i -X POST http://localhost:3000/signup -H "Content-Type: application/json" -d '{"username":"claude_test_3","password":"pass123"}'
```
- **Status:** 200 OK, `Content-Type: application/json`
- **Body:**
  ```json
  {"user_id":{"createdAt":"2026-11-11T22:00:36.096Z","id":"e18c7958-8754-4479-907f-e04b283c28bd","password":"pass123","username":"claude_test_3"}}
  ```

### Step 2: POST /signin (wrong password)
```
curl -s -i -X POST http://localhost:3000/signin -H "Content-Type: application/json" -d '{"username":"claude_test_3","password":"wrong-pass"}'
```
- **Status:** 200 OK, `Content-Type: application/json`
- **Body:** `{"user_id":null,"login_key":"JWT or Session Cookies"}`

### Step 3: POST /signin (unknown username)
```
curl -s -i -X POST http://localhost:3000/signin -H "Content-Type: application/json" -d '{"username":"no_such_user_3","password":"pass123"}'
```
- **Status:** 200 OK, `Content-Type: application/json`
- **Body:** `{"user_id":null,"login_key":"JWT or Session Cookies"}`

### Step 4: POST /signin (no password field)
```
curl -s -i -X POST http://localhost:3000/signin -H "Content-Type: application/json" -d '{"username":"claude_test_3"}'
```
- **Status:** 200 OK, `Content-Type: application/json`
- **Body:**
  ```json
  {"user_id":{"createdAt":"2026-11-11T22:00:36.096Z","id":"e18c7958-8754-4479-907f-e04b283c28bd","password":"pass123","username":"claude_test_3"},"login_key":"JWT or Session Cookies"}
  ```

## Notes
- **This is the first run of test 2**, so there's nothing to compare against.
- **Under the temporary convention (409 for signin errors), none of the steps reached the error path at all.** No exception was thrown, so the `catch` (409) never ran. These 200s are real bugs, not convention noise.
- **Steps 2 and 3:** `.first()` returns `null` when no row matches. It doesn't throw.
- **Step 4 is a security bug:** anyone who knows a username can sign in as that user (and gets their password back in the response). Analysis is in the learning log under P54.
- Steps 2 and 3 return identical bodies. Good for not revealing which usernames exist, but only by accident.
