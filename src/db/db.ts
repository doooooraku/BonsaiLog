/**
 * SQLite database initialization, migration runner, and species seed.
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
 *
 * SCHEMA_VERSION 履歴:
 * - v1: template items/attachments (Issue #14 で削除、本番ユーザー 0 のため影響なし)
 * - v2: bonsai + species + species_names (本 PR で導入、F-01 foundation)
 */
import * as SQLite from 'expo-sqlite';

import { nowUtc } from '@/src/core/datetime';

import {
  SCHEMA_VERSION,
  schemaV2,
  schemaV3,
  schemaV4,
  schemaV5,
  schemaV6,
  schemaV7,
  schemaV8,
  schemaV9,
} from './schema';
import { SPECIES_SEED } from './seedSpecies';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Check whether a column exists on a table.
 * Useful for idempotent ALTER TABLE migrations (SQLite has no IF NOT EXISTS).
 *
 * Usage:
 *   if (!(await hasColumn(db, 'bonsai', 'new_column'))) {
 *     await db.execAsync('ALTER TABLE bonsai ADD COLUMN new_column TEXT;');
 *   }
 */
async function hasColumn(db: SQLite.SQLiteDatabase, table: string, column: string) {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table});`);
  return cols.some((c) => c.name === column);
}

/**
 * 50 種樹種マスタを初回起動時に seed する。
 * INSERT OR IGNORE で冪等性を担保 (再実行で既存データを上書きしない)。
 */
async function seedSpeciesIfNeeded(db: SQLite.SQLiteDatabase) {
  // 既に seed 済みなら早期リターン (パフォーマンス最適化)
  const countRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM species;',
  );
  if ((countRow?.count ?? 0) >= SPECIES_SEED.length) {
    return;
  }

  const now = nowUtc() as string;
  for (const seed of SPECIES_SEED) {
    await db.runAsync(
      `INSERT OR IGNORE INTO species
         (id, scientific_name, family, climate_zone_min, climate_zone_max, default_tasks, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        seed.id,
        seed.scientificName,
        seed.family,
        seed.climateZoneMin,
        seed.climateZoneMax,
        null, // default_tasks (v1.0 では空、ADR-0011 推奨機能撤廃のため使用しない)
        now,
        now,
      ],
    );

    // 通称 (ja + en) を species_names に投入
    for (const locale of ['ja', 'en'] as const) {
      await db.runAsync(
        `INSERT OR IGNORE INTO species_names (species_id, locale, common_name)
         VALUES (?, ?, ?);`,
        [seed.id, locale, seed.names[locale]],
      );
    }
  }
}

async function migrate(db: SQLite.SQLiteDatabase) {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  let version = row?.user_version ?? 0;

  // ---------------------------------------------------------------------------
  // Migration v2 (F-01 foundation: bonsai + species + species_names)
  //
  // 注意: v1 (template items/attachments) は廃止 (Issue #14、本番ユーザー 0)。
  // 既存ユーザーは存在しないため、v0 → v2 直行で問題なし。
  // ---------------------------------------------------------------------------
  if (version < 2) {
    await db.execAsync(schemaV2);
    version = 2;
  }

  // 樹種マスタ seed (INSERT OR IGNORE で冪等)
  await seedSpeciesIfNeeded(db);

  // ---------------------------------------------------------------------------
  // Migration v3 (F-08 foundation: photos テーブル新規作成)
  //
  // bonsai_id FK + ON DELETE CASCADE、relative_path で保存 (Repolog PR #281 lesson)。
  // events テーブルは F-02 (#17) で導入予定、event_id は現状 nullable TEXT (FK なし)。
  // ---------------------------------------------------------------------------
  if (version < 3) {
    await db.execAsync(schemaV3);
    version = 3;
  }

  // ---------------------------------------------------------------------------
  // Migration v4 (F-02 foundation: events + tags + event_tags + events_fts)
  //
  // STI 16 種別、status (planned/logged/cancelled)、30 日ゴミ箱 (deleted_at)、
  // FTS5 trigram (note + payload_text)、tags M:N。
  // CHECK 制約と partial index で性能 + 整合性を担保。
  // ---------------------------------------------------------------------------
  if (version < 4) {
    await db.execAsync(schemaV4);
    version = 4;
  }

  // ---------------------------------------------------------------------------
  // Migration v5 (Issue #31、ADR-0008 §4.3.4 整合):
  //
  // events_fts を `tokenize='trigram remove_diacritics 1' detail=column` で
  // 再構築する。virtual table は ALTER 不可なので DROP → CREATE → INSERT で
  // 既存 events を再インデックス (events 本体は変更なし、deleted_at IS NULL
  // のみ対象)。
  // ---------------------------------------------------------------------------
  if (version < 5) {
    await db.execAsync(schemaV5);
    version = 5;
  }

  // ---------------------------------------------------------------------------
  // Migration v6 (T2-3、Tier 2): bonsai テーブルに estimated_age カラム追加。
  //
  // ALTER TABLE は SQLite で IF NOT EXISTS が使えないため hasColumn ガード必須
  // (Repolog PR #213 lesson、本ファイル冒頭コメント参照)。二重実行 (= 二度目以降の起動)
  // で "duplicate column name" を防ぐ。
  // ---------------------------------------------------------------------------
  if (version < 6) {
    if (!(await hasColumn(db, 'bonsai', 'estimated_age'))) {
      await db.execAsync(schemaV6);
    }
    version = 6;
  }

  // ---------------------------------------------------------------------------
  // Migration v7 (T2-7、Tier 2): bonsai テーブルに memo カラム追加。
  //
  // estimated_age と同パターン: hasColumn ガードで二重実行回避。
  // ---------------------------------------------------------------------------
  if (version < 7) {
    if (!(await hasColumn(db, 'bonsai', 'memo'))) {
      await db.execAsync(schemaV7);
    }
    version = 7;
  }

  // ---------------------------------------------------------------------------
  // Migration v8 (T2-4、Tier 2): bonsai テーブルに purchase_date カラム追加。
  //
  // estimated_age / memo と同パターン: hasColumn ガードで二重実行回避。
  // ---------------------------------------------------------------------------
  if (version < 8) {
    if (!(await hasColumn(db, 'bonsai', 'purchase_date'))) {
      await db.execAsync(schemaV8);
    }
    version = 8;
  }

  // ---------------------------------------------------------------------------
  // Migration v9 (T2-6、Tier 2): bonsai_tags M:N テーブル新規作成。
  //
  // CREATE TABLE IF NOT EXISTS で冪等、二度目以降の起動でも安全。
  // ---------------------------------------------------------------------------
  if (version < 9) {
    await db.execAsync(schemaV9);
    version = 9;
  }

  // Always set version UNCONDITIONALLY (not inside an if-block).
  // This is the most important line in this file — see Repolog PR #213.
  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
}

export async function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('bonsailog.db');
      await db.withTransactionAsync(async () => {
        await migrate(db);
      });
      return db;
    })();
  }
  return dbPromise;
}
