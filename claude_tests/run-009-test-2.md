# Run 009: Test 2

- **Test:** 2 (signin with bad credentials)
- **Time:** 2026-11-12 05:07:40 IST (2026-11-11 23:37:40 UTC)
- **Server:** http://localhost:3000, started manually from `apps/api` (after the user added a `username` guard to `/signin`)
- **Result:** **4 of 4 bad-credential steps were rejected** (409), none returned user data, and **step 5 is now rejected by design** (before any query). One user (`claude_test_9`) was written to the DB in step 1.

## Summary

| Step | Request | Status | Outcome |
|---|---|---|---|
| 1 | `POST /signup` (`claude_test_9`) | 200 | user created, id `546f4660-40e0-4213-a0ed-4de308d00d7e` |
| 2 | `POST /signin`, wrong password | **409** ✅ | "Invalid Creds! versuche es noch einmal" |
| 3 | `POST /signin`, unknown username | **409** ✅ | "Invalid Creds! versuche es noch einmal" |
| 4 | `POST /signin`, no password field | **409** ✅ | "enter username/password pls" |
| 5 | `POST /signin`, no username field | **409** ✅ | "enter username/password pls" |

## Details

### Step 1: POST /signup
```
curl -s -i -X POST http://localhost:3000/signup -H "Content-Type: application/json" -d '{"username":"claude_test_9","password":"pass123"}'
```
- **Status:** 200 OK, `Content-Type: application/json`
- **Body:** `{"user_id":{"createdAt":"2026-11-11T23:37:40.469Z","id":"546f4660-40e0-4213-a0ed-4de308d00d7e","password":"pass123","username":"claude_test_9"}}`

### Step 2: POST /signin (wrong password)
```
curl -s -i -X POST http://localhost:3000/signin -H "Content-Type: application/json" -d '{"username":"claude_test_9","password":"wrong-pass"}'
```
- **Status:** 409 Conflict, `Content-Type: application/json`
- **Body:** `{"message":"error!","meme":"Invalid Creds! versuche es noch einmal"}`

### Step 3: POST /signin (unknown username)
```
curl -s -i -X POST http://localhost:3000/signin -H "Content-Type: application/json" -d '{"username":"no_such_user_9","password":"pass123"}'
```
- **Status:** 409 Conflict
- **Body:** `{"message":"error!","meme":"Invalid Creds! versuche es noch einmal"}`

### Step 4: POST /signin (no password field)
```
curl -s -i -X POST http://localhost:3000/signin -H "Content-Type: application/json" -d '{"username":"claude_test_9"}'
```
- **Status:** 409 Conflict
- **Body:** `{"message":"error!","meme":"enter username/password pls"}`

### Step 5: POST /signin (no username field)
```
curl -s -i -X POST http://localhost:3000/signin -H "Content-Type: application/json" -d '{"password":"pass123"}'
```
- **Status:** 409 Conflict
- **Body:** `{"message":"error!","meme":"enter username/password pls"}`

## Notes
- **Compared with run 008:**
  - step 4: "enter password pls" → "enter username/password pls" (new combined message)
  - **step 5: "Invalid Creds!" (rejected by luck after `SELECT … LIMIT 1`) → "enter username/password pls" (rejected by the guard, before any query)**
  - steps 1–3: unchanged
- **Background for step 5:** the user confirmed in psql that the first row of `"User"` is the old `test1` user with no password, which is why run 008's no-`WHERE` query happened to fail the comparison.
- Expected in the server terminal: **3 SQL statements** (step 1 INSERT, steps 2 and 3 SELECT … WHERE username). Steps 4 and 5 shouldn't query at all.
- Still open: signup returns the plaintext password. Passwords are stored and compared unhashed.
