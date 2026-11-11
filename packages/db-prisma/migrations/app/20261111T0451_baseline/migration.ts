#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/7dbcca3cd7bb0fcb66cf35582cd753b68b9e00212084fdfde358e47504210921/contract';
import endContract from '../../snapshots/7dbcca3cd7bb0fcb66cf35582cd753b68b9e00212084fdfde358e47504210921/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'Region',
        columns: [
          col('id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'User',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('password', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('username', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Website',
        columns: [
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('timeAdded', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('url', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('user_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'WebsiteTicks',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('region_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('response_time_ms', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('website_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'WebsiteTicks_status_check_92990d30',
            sql`"status" IN ('Up', 'Down', 'Unknown')`,
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'User',
        constraint: 'User_username_key',
        columns: ['username'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Website',
        index: 'Website_user_id_idx_6c952402',
        columns: ['user_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WebsiteTicks',
        index: 'WebsiteTicks_region_id_idx_22635963',
        columns: ['region_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WebsiteTicks',
        index: 'WebsiteTicks_website_id_idx_cb828943',
        columns: ['website_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Website',
        foreignKey: {
          name: 'Website_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'WebsiteTicks',
        foreignKey: {
          name: 'WebsiteTicks_region_id_fkey',
          columns: ['region_id'],
          references: { schema: 'public', table: 'Region', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'WebsiteTicks',
        foreignKey: {
          name: 'WebsiteTicks_website_id_fkey',
          columns: ['website_id'],
          references: { schema: 'public', table: 'Website', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
