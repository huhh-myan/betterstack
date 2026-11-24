#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/22f1476844b734b42756a6f09fc5b5b891f3319af7120aa47581a0abf1ea1485/contract';
import startContract from '../../snapshots/22f1476844b734b42756a6f09fc5b5b891f3319af7120aa47581a0abf1ea1485/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/782a7a9cc0418411a245b4815b1e05170bd84649dc88b52f5231c071bc566b47/contract';
import endContract from '../../snapshots/782a7a9cc0418411a245b4815b1e05170bd84649dc88b52f5231c071bc566b47/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Admin',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('user_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['user_id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'RegionRequest',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('decidedAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('decided_by', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('Pending'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('user_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'RegionRequest_status_check_f63a2b99',
            sql`"status" IN ('Pending', 'Approved', 'Rejected')`,
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'WebsiteTicks',
        column: col('error', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'WebsiteTicks',
        column: col('http_status', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'Region',
        constraint: 'Region_name_key',
        columns: ['name'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'RegionRequest',
        index: 'RegionRequest_user_id_idx_6c952402',
        columns: ['user_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WebsiteTicks',
        index: 'WebsiteTicks_website_id_createdAt_idx_e1cfdff5',
        columns: ['website_id', 'createdAt'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Admin',
        foreignKey: {
          name: 'Admin_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'RegionRequest',
        foreignKey: {
          name: 'RegionRequest_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
