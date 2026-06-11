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
  schemaV10,
  schemaV11,
  schemaV12,
  schemaV13,
  schemaV16,
  schemaV17,
  schemaV18,
} from './schema';
import { SPECIES_SEED, SPECIES_SEED_IDS } from './seedSpecies';

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
  // Sess15 PR-GG + PR-OO hotfix: ADR-0026 で 5 種化、 旧 50 種 seed の残骸を起動時 cleanup。
  // PR-GG で db.runAsync + bind 配列を使っていたが、 expo-sqlite の prepareAsync が
  // 'Cannot use shared object that was already released' エラーを出すため、
  // 固定値の SPECIES_SEED_IDS を SQL string literal で直接展開 + execAsync (bind 不要) に変更。
  // SPECIES_SEED_IDS は code 固定の ULID 風 ID 配列で SQL injection リスクなし。
  const idsLiteral = SPECIES_SEED_IDS.map((id) => `'${id}'`).join(',');
  await db.execAsync(`DELETE FROM species WHERE id NOT IN (${idsLiteral});`);

  // cleanup 後の件数で早期リターン判定 (5 種全て揃っていれば skip)
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

  // ---------------------------------------------------------------------------
  // Migration v10 (Issue #455 Phase 1): bonsai テーブルに acquired_from カラム追加。
  //
  // - 入手元メモ (free-form text、null 可) を保存
  // - mockup `bonsai-detail-basic-02.png` の「入手元メモ」 入力欄整合
  // - estimated_age / memo / purchase_date と同パターン: hasColumn ガード
  // ---------------------------------------------------------------------------
  if (version < 10) {
    if (!(await hasColumn(db, 'bonsai', 'acquired_from'))) {
      await db.execAsync(schemaV10);
    }
    version = 10;
  }

  // ---------------------------------------------------------------------------
  // Migration v11 (Sess9 PR-1、 ADR-0008 §Notes Amended 2026-05-18): event_tags 廃止。
  //
  // - dead code (UI から attach 呼ばれる箇所 0 件、 event_tags は永遠に空)
  // - bonsai_tags (v9) に一本化、 探す画面の tag filter は searchEventsByBonsaiTags() に置換
  // - DROP TABLE IF EXISTS で冪等 (二重実行安全)
  // - v0 → v11 直行の fresh install では event_tags が schemaV4 に存在しないので noop
  // ---------------------------------------------------------------------------
  if (version < 11) {
    await db.execAsync(schemaV11);
    version = 11;
  }

  // ---------------------------------------------------------------------------
  // Migration v12 (Sess13 PR-D): bonsai に estimated_age_unknown カラム追加。
  //
  // - 樹齢「不明」 を明示保存 (0/1)
  // - 既存 row は default 0 (= 未入力扱い)、 estimated_age と独立
  // - hasColumn ガードで二重実行回避
  // ---------------------------------------------------------------------------
  if (version < 12) {
    if (!(await hasColumn(db, 'bonsai', 'estimated_age_unknown'))) {
      await db.execAsync(schemaV12);
    }
    version = 12;
  }

  // ---------------------------------------------------------------------------
  // Migration v13 (Sess13 PR-G): bonsai_styles_custom テーブル新規 (カスタム樹形)。
  //
  // - β 別手帳方式 (Q-13 確定): master enum 10 種と分離管理
  // - CREATE TABLE IF NOT EXISTS で冪等 (二重実行安全)
  // ---------------------------------------------------------------------------
  if (version < 13) {
    await db.execAsync(schemaV13);
    version = 13;
  }

  // ---------------------------------------------------------------------------
  // Migration v14 (Sess13 PR-H): bonsai_species_custom テーブル + bonsai.custom_species_id。
  //
  // - β 別手帳方式 (Q-13 確定): master species と分離管理
  // - bonsai.custom_species_id は hasColumn ガード、 table は CREATE IF NOT EXISTS で冪等
  // ---------------------------------------------------------------------------
  if (version < 14) {
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS bonsai_species_custom (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL
      );`,
    );
    if (!(await hasColumn(db, 'bonsai', 'custom_species_id'))) {
      await db.execAsync(
        'ALTER TABLE bonsai ADD COLUMN custom_species_id TEXT REFERENCES bonsai_species_custom(id) ON DELETE SET NULL;',
      );
    }
    version = 14;
  }

  // ---------------------------------------------------------------------------
  // Migration v15 (Sess14 PR-P): v14 修復 idempotent re-run。
  //
  // 背景: Sess13 PR-H 当時、 一部の DB で v14 migration が部分失敗 (user_version だけ
  // 14 にバンプされ、 bonsai_species_custom テーブル / bonsai.custom_species_id カラム
  // が作成されない不整合状態) が発生。 原因は ALTER TABLE ADD COLUMN with FOREIGN KEY
  // REFERENCES が withTransactionAsync 内で foreign_keys=ON と相性悪く失敗した推測。
  //
  // 修正: v14 と同じ DDL を REFERENCES 句なしで再実行 (idempotent、 hasColumn / IF NOT
  // EXISTS で safe)。 FK 制約は失われるが、 アプリ層で custom_species_id の整合性を
  // 担保 (もともと外部 user に DB を直接いじられる前提なし)。
  // ---------------------------------------------------------------------------
  if (version < 15) {
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS bonsai_species_custom (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL
      );`,
    );
    if (!(await hasColumn(db, 'bonsai', 'custom_species_id'))) {
      // REFERENCES 句なし版: FK 制約を外して ALTER TABLE 確実成功させる
      await db.execAsync('ALTER TABLE bonsai ADD COLUMN custom_species_id TEXT;');
    }
    version = 15;
  }

  // ---------------------------------------------------------------------------
  // Migration v16 (Sess78 PR-2、 ADR-0056 定期予定機能 foundation): recurrence_rules
  // 新規テーブル + events.recurrence_rule_id 列追加。
  //
  // - recurrence_rules: RFC 5545 RRULE を保持、 アプリで 8 週分先まで planned events を 事前展開
  // - events.recurrence_rule_id: 定期予定由来 events の FK (nullable)
  // - **Sess14 罠回避**: ALTER TABLE は REFERENCES 句なし版 (v15 修復 pattern と同型)
  // - FK 整合性は recurrenceRuleRepository 層 (Sess78 PR-3) で 担保
  // - hasColumn ガード + CREATE TABLE IF NOT EXISTS で 冪等 (二度目以降の起動 safe)
  // ---------------------------------------------------------------------------
  if (version < 16) {
    // Sess81 hotfix: schemaV16 内の `CREATE INDEX idx_events_recurrence ON events(recurrence_rule_id)`
    // が ALTER TABLE ADD COLUMN より先に実行され "no such column: recurrence_rule_id" で
    // migration 全体が rollback されていた (= 実機 + CI 全 PR で user_version=15 のまま)。
    // Sess78 PR-2 #995 で混入。 Sess79〜Sess81 で 7 PR 跨いで放置 → 実機検証中に発覚。
    //
    // 修正: ALTER TABLE で 列追加 → schemaV16 (= CREATE TABLE + 全 INDEX) の順に分離実行。
    // CREATE INDEX IF NOT EXISTS は冪等なので、 列追加後の実行で 安全に作成可能。
    if (!(await hasColumn(db, 'events', 'recurrence_rule_id'))) {
      // REFERENCES 句なし版 (Sess14 罠回避、 v15 PR-P pattern 踏襲)
      await db.execAsync('ALTER TABLE events ADD COLUMN recurrence_rule_id TEXT;');
    }
    await db.execAsync(schemaV16);
    version = 16;
  }

  // ---------------------------------------------------------------------------
  // Migration v17 (Sess93 PR-1、 ADR-0056 Sess93 Amendment): recurrence_rules.memo
  // カラム追加。 定期予定にユーザー任意 memo を保存、 rule 展開時 events.note へ cascade。
  //
  // - 単純な TEXT NULL 列追加 (= Sess14 罠なし、 REFERENCES 句なし)
  // - hasColumn ガードで 二重実行回避
  // - 既存 row は memo NULL (= 後方互換)
  // ---------------------------------------------------------------------------
  if (version < 17) {
    if (!(await hasColumn(db, 'recurrence_rules', 'memo'))) {
      await db.execAsync(schemaV17);
    }
    version = 17;
  }

  // ---------------------------------------------------------------------------
  // Migration v18 (Sess99 #1122 案 G2): recurrence_rules.group_id カラム追加。
  // 同時作成 rule 群を「定期予定グループ」として表示/編集する印 (見た目グループ化)。
  //
  // - 単純な TEXT NULL 列追加 (= Sess14 罠なし、 REFERENCES 句なし)
  // - hasColumn ガードで 二重実行回避
  // - 既存 row は group_id NULL (= UI 側で rule.id を key とする 1 本グループ fallback)
  // ---------------------------------------------------------------------------
  if (version < 18) {
    if (!(await hasColumn(db, 'recurrence_rules', 'group_id'))) {
      await db.execAsync(schemaV18);
    }
    version = 18;
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
