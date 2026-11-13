# Run 004: Test 2

- **Test:** 2 (signin with bad credentials)
- **Time:** 2026-11-12 04:20:52 IST (2026-11-11 22:50:52 UTC)
- **Server:** http://localhost:3000, started manually from `apps/api` (restarted with the `queryLogger` middleware in `db.ts`)
- **Result:** the same as run 003. **0 of 3 bad-credential steps were rejected**, and step 4 still signs in without a password. One user (`claude_test_4`) was written to the DB in step 1.

## Summary

| Step | Request | Status | Outcome |
|---|---|---|---|
| 1 | `POST /signup` (`claude_test_4`) | 200 | user created, id `ada0f162-ef61-4304-89a6-82321efd4e9b` |
| 2 | `POST /signin`, wrong password | **200** ❌ | `{"user_id":null,"login_key":"JWT or Session Cookies"}` |
| 3 | `POST /signin`, unknown username | **200** ❌ | `{"user_id":null,"login_key":"JWT or Session Cookies"}` |
| 4 | `POST /signin`, no password field | **200** ❌❌ | returns the full user, incl. `"password":"pass123"` |

## Details

### Step 1: POST /signup
```
curl -s -i -X POST http://localhost:3000/signup -H "Content-Type: application/json" -d '{"username":"claude_test_4","password":"pass123"}'
```
- **Status:** 200 OK, `Content-Type: application/json`
- **Body:** `{"user_id":{"createdAt":"2026-11-11T22:50:59.940Z","id":"ada0f162-ef61-4304-89a6-82321efd4e9b","password":"pass123","username":"claude_test_4"}}`

### Step 2: POST /signin (wrong password)
```
curl -s -i -X POST http://localhost:3000/signin -H "Content-Type: application/json" -d '{"username":"claude_test_4","password":"wrong-pass"}'
```
- **Status:** 200 OK
- **Body:** `{"user_id":null,"login_key":"JWT or Session Cookies"}`

### Step 3: POST /signin (unknown username)
```
curl -s -i -X POST http://localhost:3000/signin -H "Content-Type: application/json" -d '{"username":"no_such_user_4","password":"pass123"}'
```
- **Status:** 200 OK
- **Body:** `{"user_id":null,"login_key":"JWT or Session Cookies"}`

### Step 4: POST /signin (no password field)
```
curl -s -i -X POST http://localhost:3000/signin -H "Content-Type: application/json" -d '{"username":"claude_test_4"}'
```
- **Status:** 200 OK
- **Body:** `{"user_id":{"createdAt":"2026-11-11T22:50:59.940Z","id":"ada0f162-ef61-4304-89a6-82321efd4e9b","password":"pass123","username":"claude_test_4"},"login_key":"JWT or Session Cookies"}`

## Notes
- **Compared with run 003:** no change in any step. This was expected, since only the logger changed, not the handlers.
- **The purpose of this run** was to watch the server terminal for SQL from `queryLogger`. Claude can't see that terminal, so the user records what appeared (it goes into the learning log, P55).
- The step 4 security bug (P54) is still open.
