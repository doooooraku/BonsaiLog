/**
 * SQLite database initialization and migration runner.
 *
 * Critical lessons from Repolog (PR #213):
 *   1. PRAGMA user_version MUST be set unconditionally (not inside an if-block).
 *      Otherwise on a fresh install where (version === SCHEMA_VERSION) is true,
 *      it never gets set, and on the second app launch, all migrations re-run.
 *      ALTER TABLE ADD COLUMN then crashes with "duplicate column name".
 *
 *   2. ALTER TABLE migrations MUST be wrapped with hasColumn() guards.
 *      SQLite has no "IF NOT EXISTS" for ADD COLUMN, so the second run errors.
 *
 *   3. Test the "second launch" scenario whenever you add a migration.
 *      `__tests__/db.test.ts` enforces these rules statically.
 */
import * as SQLite from 'expo-sqlite';

import { SCHEMA_VERSION, schemaV1 } from './schema';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Check whether a column exists on a table.
 * Useful for idempotent ALTER TABLE migrations (SQLite has no IF NOT EXISTS).
 *
 * Usage:
 *   if (!(await hasColumn(db, 'items', 'new_column'))) {
 *     await db.execAsync('ALTER TABLE items ADD COLUMN new_column TEXT;');
 *   }
 */
async function hasColumn(db: SQLite.SQLiteDatabase, table: string, column: string) {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table});`);
  return cols.some((c) => c.name === column);
}

async function migrate(db: SQLite.SQLiteDatabase) {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  let version = row?.user_version ?? 0;

  // ---------------------------------------------------------------------------
  // Migration v1 (initial schema)
  // ---------------------------------------------------------------------------
  if (version < 1) {
    await db.execAsync(schemaV1);
    version = 1;
  }

  // ---------------------------------------------------------------------------
  // Migration v2 example: simple CREATE TABLE (idempotent via IF NOT EXISTS)
  // ---------------------------------------------------------------------------
  // if (version < 2) {
  //   await db.execAsync(schemaV2);  // Should use CREATE TABLE IF NOT EXISTS
  //   version = 2;
  // }

  // ---------------------------------------------------------------------------
  // Migration v3 example: ALTER TABLE ADD COLUMN (non-idempotent — needs guard)
  //
  // ⚠ DO NOT do this:
  //   await db.execAsync('ALTER TABLE items ADD COLUMN new_column TEXT;');
  // → Crashes on second run with "duplicate column name"
  //
  // ✅ DO this instead (guarded):
  // if (version < 3) {
  //   if (!(await hasColumn(db, 'items', 'new_column'))) {
  //     await db.execAsync('ALTER TABLE items ADD COLUMN new_column TEXT;');
  //   }
  //   version = 3;
  // }
  // ---------------------------------------------------------------------------

  // Always set version UNCONDITIONALLY (not inside an if-block).
  // This is the most important line in this file — see Repolog PR #213.
  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);

  // Suppress unused warning — remove when first ALTER migration is added
  void hasColumn;
}

// TODO: Replace 'myapp.db' with your app's database name
export async function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('myapp.db');
      await db.withTransactionAsync(async () => {
        await migrate(db);
      });
      return db;
    })();
  }
  return dbPromise;
}
