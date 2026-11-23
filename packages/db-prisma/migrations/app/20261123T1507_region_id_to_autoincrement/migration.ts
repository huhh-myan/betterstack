#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/22f1476844b734b42756a6f09fc5b5b891f3319af7120aa47581a0abf1ea1485/contract';
import endContract from '../../snapshots/22f1476844b734b42756a6f09fc5b5b891f3319af7120aa47581a0abf1ea1485/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/7dbcca3cd7bb0fcb66cf35582cd753b68b9e00212084fdfde358e47504210921/contract';
import startContract from '../../snapshots/7dbcca3cd7bb0fcb66cf35582cd753b68b9e00212084fdfde358e47504210921/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.setDefault({
        schema: 'public',
        table: 'Region',
        column: col('id', 'int4', {
          default: fn(sql`autoincrement()`),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
      this.setDefault({
        schema: 'public',
        table: 'WebsiteTicks',
        column: col('id', 'int4', {
          default: fn(sql`autoincrement()`),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
