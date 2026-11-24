# 05: Databases

## 1. Relational modelling

**Problem it solves:** storing data so it stays consistent when many things change it, and can be queried in ways you didn't plan.

- **Table** = one kind of thing (`Website`); **row** = one instance; **column** = an attribute.
- **Primary key**: unique + not null; identifies a row (`Website.id`). It doesn't generate itself (your P46): `@default(autoincrement())` or `@onCreate(uuid())` does.
- **Foreign key**: a column pointing at another table's key (`WebsiteTicks.website_id → Website.id`). The DB rejects ticks for websites that don't exist (error `23503`).
- **Relationships**: one-to-many (User → Website), one-to-one (User → Admin), many-to-many (needs a join table).
- **Relation fields in Prisma** (`ticks WebsiteTicks[]`) aren't columns; the FK column on the other side is (your P40).
- **Normalisation**: don't store the same fact twice (username lives in `User`, not copied into every request). Denormalise deliberately for read speed, and know you've done it.

## 2. SQL you must be able to write on a whiteboard

```sql
-- latest check per website for one user
SELECT w.url, t.status, t.response_time_ms, t."createdAt"
FROM "Website" w
JOIN LATERAL (
  SELECT * FROM "WebsiteTicks" t
  WHERE t.website_id = w.id
  ORDER BY t."createdAt" DESC
  LIMIT 1
) t ON true
WHERE w.user_id = $1;

-- uptime % per website over 24 h
SELECT website_id,
       100.0 * COUNT(*) FILTER (WHERE status = 'Up')
             / NULLIF(COUNT(*) FILTER (WHERE status IN ('Up','Down')), 0) AS uptime_pct
FROM "WebsiteTicks"
WHERE "createdAt" > now() - interval '24 hours'
GROUP BY website_id;
```

Know: `SELECT/WHERE/ORDER BY/LIMIT`, `JOIN` (inner, left), `GROUP BY` + aggregates (`COUNT`, `AVG`, `MAX`), `HAVING` (filter after grouping), subqueries, `DISTINCT`, window functions basics (`ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)`) for "top N per group".

## 3. Indexes

**Problem it solves:** without an index, finding rows means reading the whole table (a *sequential scan*). Your ticks table grows by websites × regions every 3 minutes.

- A **B-tree index** keeps values sorted, so lookups, ranges and `ORDER BY` are fast (logarithmic).
- **Composite index** `(website_id, createdAt)` (yours) serves `WHERE website_id = ? AND createdAt > ? ORDER BY createdAt`. **Column order matters**: it helps queries on `website_id` alone, but not on `createdAt` alone (the *leftmost prefix* rule).
- **Costs**: each index slows writes and uses space. Index what you query, not everything.
- **Unique index** enforces uniqueness (`Region.name`), which is also how you prevent races (two inserts at once: the DB, not your `if`, guarantees it).
- **See it**: `EXPLAIN ANALYZE SELECT ...` shows whether a query uses an index.

## 4. Transactions and ACID

**Problem it solves:** several writes that must all happen or none (approve request = create region + mark approved).

| | Meaning |
|---|---|
| **Atomicity** | all or nothing |
| **Consistency** | constraints hold before and after |
| **Isolation** | concurrent transactions don't see each other's half-done work (to a degree) |
| **Durability** | committed = survives a crash |

**Isolation levels** (weakest → strongest): read uncommitted, **read committed** (Postgres default), repeatable read, serializable. Know the anomalies:
- **dirty read:** you see uncommitted data;
- **non-repeatable read:** the same row reads differently twice in one transaction;
- **phantom:** new rows appear in a re-run query;
- **lost update:** two read-modify-writes overwrite each other.

**Lost update fix:** `SELECT ... FOR UPDATE` (row lock), an atomic `UPDATE ... SET x = x + 1`, or optimistic locking (a version column).

## 5. Common performance problems

| Problem | Symptom | Fix |
|---|---|---|
| **N+1 queries** | 1 query for the list + 1 per item | Batch: `WHERE id IN (...)` or a join. Your old frontend did 1 request per website; `/user/websites` now fetches all ticks in one query. |
| Missing index | slow `WHERE`/`ORDER BY` on big tables | `EXPLAIN ANALYZE`, add an index |
| `SELECT *` over the network | slow, leaks fields | select needed columns |
| Too many connections | `too many clients already` (your P41) | connection **pool**, one client per process |
| Unbounded growth | table/disk keeps growing | retention, partitioning, rollups |

## 6. Migrations

**Problem it solves:** every database (yours, a teammate's, test, production) must reach the same schema through the same reviewed steps.

- **Contract/schema** = the desired state; **migration** = the steps between versions.
- Commit migrations; never edit an applied one; review the SQL.
- **Zero-downtime habits:** add columns as nullable first, backfill, then make them required; never rename in one step on a live system (add new, copy, switch, drop old).
- Your Prisma 8 lesson: keep the `db` ref at the applied contract, or plans fork.

## 7. ORMs vs SQL

- **ORM** (Prisma): types, less boilerplate, safe parameterisation. Hides what SQL runs (that's why your query logger, P55, was useful).
- **Raw SQL**: full power (window functions, `LATERAL`), you own the types.
- Good engineers use the ORM for CRUD and drop to SQL when needed, **and can read the SQL either way**.

## 8. SQL vs NoSQL (one-minute answer)

| | Relational (Postgres) | Document (MongoDB) | Key-value (Redis) | Time-series (TimescaleDB, ClickHouse) |
|---|---|---|---|---|
| Strength | relations, constraints, transactions, ad-hoc queries | flexible nested documents | microsecond reads, TTLs, queues | huge append-only, time-ranged data |
| In bstack | users, websites, regions | – | the job stream | what ticks would move to at scale |

## Recall questions

<details><summary>Your index is (website_id, createdAt). Does it help `WHERE createdAt > now() - interval '1 hour'` across all websites?</summary>

Not efficiently. A composite B-tree is sorted by `website_id` first, so a condition on only the second column can't use the ordering (leftmost prefix rule). You'd need an index on `createdAt` (or one leading with it).
</details>

<details><summary>Two admins approve the same region request at the same moment. What could go wrong, and what prevents it?</summary>

Both read status Pending and both create the region. The unique constraint on `Region.name` makes the second insert fail (that's why DB constraints matter, not just `if` checks). A stricter approach: lock the request row (`FOR UPDATE`) inside the transaction, or `UPDATE ... WHERE status = 'Pending'` and check the affected row count.
</details>

<details><summary>What is N+1 and where did your project have it?</summary>

Fetching a list (1 query) then each item's details separately (N queries). The original frontend fetched each website one by one; the new `/user/websites` gets all ticks for all websites in one `IN (...)` query.
</details>

<details><summary>Why is "make the column required" a two-step migration on a live system?</summary>

Existing rows have no value, so adding `NOT NULL` fails (or needs a default). Add it as nullable, backfill, then add `NOT NULL`, ideally deploying code that writes the column between the steps.
</details>

<details><summary>What does `EXPLAIN ANALYZE` tell you?</summary>

The plan Postgres chose (sequential scan vs index scan, join types) and the actual time and rows per step, so you can see why a query is slow.
</details>

## Likely interview questions

1. What's an index, how does it work, what are its costs?
2. Explain ACID. What isolation level does Postgres use by default?
3. Inner vs left join? Write a query for "users with no websites".
4. What is normalisation? When would you denormalise?
5. How would you store and query billions of ticks?
6. SQL vs NoSQL: when would you pick each?
7. How do you avoid N+1 queries?

## Resources

- Use The Index, Luke (indexes, free): https://use-the-index-luke.com/
- PostgreSQL docs, tutorial and "Indexes": https://www.postgresql.org/docs/current/
- SQLBolt (interactive SQL practice): https://sqlbolt.com/
- *Designing Data-Intensive Applications* (Kleppmann), chapters 2, 3, 7. The best book for this area.
