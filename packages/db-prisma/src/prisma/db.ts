import 'dotenv/config';
import postgres from '@prisma/orm-postgres/runtime';
import { contractFromJson } from '@prisma/orm-postgres/static';
import type { SqlMiddleware } from '@prisma/orm-postgres/family-runtime';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

export const contract = contractFromJson<Contract>(contractJson);

const url = process.env['DATABASE_URL'];
if (!url) {
  // Fail at startup with a clear message instead of on the first query.
  throw new Error('DATABASE_URL is not set. Add it to the .env of the app you are running.');
}

/** Prints each SQL statement. Off by default; turn on with LOG_SQL=1. */
function queryLogger(): SqlMiddleware {
  return {
    name: 'query-logger',
    familyId: 'sql',
    async beforeEncode(plan) {
      console.log('[sql]', plan.sql);
    },
  };
}

function createDb() {
  return postgres({
    contract,
    url: url!,
    middleware: process.env['LOG_SQL'] === '1' ? [queryLogger()] : [],
  });
}

// One client per process. `bun --hot` re-runs modules on every save; without
// this, each reload would open a new connection pool and leak the old one.
const globalForDb = globalThis as unknown as { __bstackDb?: ReturnType<typeof createDb> };

export const db = globalForDb.__bstackDb ?? createDb();
globalForDb.__bstackDb = db;
