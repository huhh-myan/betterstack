import 'dotenv/config';
import postgres from '@prisma/orm-postgres/runtime';
import { contractFromJson } from '@prisma/orm-postgres/static';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };
import { warn } from 'node:console';
import { createSqlTextSources, SqlMigrationRunnerFailure } from '@prisma/orm-postgres/family/control';
import { before } from 'node:test';
import type { SqlMiddleware } from '@prisma/orm-postgres/family-runtime';

export const contract = contractFromJson<Contract>(contractJson);


//db without querry logging middleware
// export db = postgres({
//   contract,
//   url: process.env['DATABASE_URL']
// });

export const db = postgres({
  contract,
  url: process.env['DATABASE_URL']!,
  middleware: [queryLogger()]
});

// Query Logging middleware
// but can use db.plan?
const statementsSql = Symbol("query-logger.sql");
function queryLogger(): SqlMiddleware { 
    return {
      name: "query-logger",
      familyId: "sql",

      async beforeEncode(plan,ctx){
        // ctx.state(statementsSql)["sql"] = plan.sql;
        console.log(plan.sql);
      } 
    } 
}