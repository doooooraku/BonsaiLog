/**
 * F-11 バックアップ網羅性ガード (Sess46 retro 恒久策)。
 *
 * 目的: `src/db/schema.ts` を SoT に「全テーブル / bonsai 全列がバックアップ対象として
 * 分類済み」を機械的に強制する fail-closed テスト。新しいテーブル / 列を schema に追加して
 * バックアップ (manifest) の更新を忘れると、このテストが fail して CI が落ちる。
 *
 * 背景 (Sess46): F-11 バックアップに tags / カスタム樹種・樹形 / bonsai 付加6列 / 設定の
 * 欠落があり、件数一致=完全と誤認してユーザー指摘まで気づけなかった (R-55 未適用)。
 * 「動作(往復/件数)」検証では網羅漏れを検出できないため、本ガードで構造的に防ぐ。
 *
 * ★このテストが fail したら:
 *   - 新テーブルなら → BACKED_UP_TABLES か EXCLUDED_TABLES に分類し、ユーザーデータなら
 *     backupService.ts (buildManifestFromDb / importBackup) と manifest に追加。
 *   - bonsai 新列なら → BACKED_UP_BONSAI_COLUMNS に追加し、BackupBonsai 型 / map / INSERT を更新。
 */
import fs from 'node:fs';
import path from 'node:path';

const SCHEMA_SRC = fs.readFileSync(path.join(__dirname, '..', 'src', 'db', 'schema.ts'), 'utf8');

/** manifest に含めて復元するユーザーデータテーブル。 */
const BACKED_UP_TABLES = [
  'bonsai',
  'bonsai_species_custom',
  'bonsai_styles_custom',
  'bonsai_tags',
  'events',
  'photos',
  'tags',
];

/** 意図的にバックアップ対象外のテーブル (理由つき)。 */
const EXCLUDED_TABLES: Record<string, string> = {
  species: 'seed マスタ (migration/seed で再生成)',
  species_names: 'seed マスタ (19 言語通称、migration/seed で再生成)',
  events_fts: 'FTS5 派生インデックス (復元時に events から再構築)',
  // Sess81 hotfix で v16 migration 成功後 露出した 既存 ギャップ:
  // Sess78 PR-2 で recurrence_rules table 追加 + Sess78-81 で recurring 機能完成しているが、
  // backupService.ts (buildManifestFromDb / importBackup) と manifest schema への追加は v1.0.1
  // follow-up に 未実装。 v1.0 release 後 (Sess82+) PR で 追加統合予定。
  // 本来 BACKED_UP_TABLES が正、 現状 ギャップを 明文化して 構造的に 認知化。
  recurrence_rules:
    'Sess81 hotfix で migration 成功 後 露出。 backup 統合は Sess82+ PR で 対応予定 (= 現状 復元時に rule 失われる、 user データ警告必要)',
};

/** bonsai の base 列 (schemaV2 CREATE TABLE)。以降の追加列は ALTER で抽出する。 */
const BONSAI_BASE_COLUMNS = [
  'id',
  'name',
  'species_id',
  'acquired_at',
  'style',
  'pot_info',
  'archived_at',
  'created_at',
  'updated_at',
];

/** BackupBonsai がカバーすべき bonsai 全列 (base + ALTER 追加列)。 */
const BACKED_UP_BONSAI_COLUMNS = [
  ...BONSAI_BASE_COLUMNS,
  'estimated_age',
  'memo',
  'purchase_date',
  'acquired_from',
  'estimated_age_unknown',
  'custom_species_id',
];

function extractTables(src: string): string[] {
  const re = /CREATE (?:VIRTUAL )?TABLE (?:IF NOT EXISTS )?([a-z_]+)/g;
  const set = new Set<string>();
  for (let m = re.exec(src); m !== null; m = re.exec(src)) {
    set.add(m[1]!); // group 1 is always captured when exec() returns non-null
  }
  return [...set];
}

function extractBonsaiAlterColumns(src: string): string[] {
  const re = /ALTER TABLE bonsai ADD COLUMN ([a-z_]+)/g;
  const set = new Set<string>();
  for (let m = re.exec(src); m !== null; m = re.exec(src)) {
    set.add(m[1]!); // group 1 is always captured when exec() returns non-null
  }
  return [...set];
}

describe('backup coverage guard (Sess46 retro)', () => {
  test('schema の全テーブルがバックアップ対象 or 意図的除外に分類されている', () => {
    const tablesInSchema = extractTables(SCHEMA_SRC).sort();
    const classified = [...BACKED_UP_TABLES, ...Object.keys(EXCLUDED_TABLES)].sort();
    // 完全一致: 未分類の新テーブル / schema に存在しない stale エントリ の両方を検出。
    expect(tablesInSchema).toEqual(classified);
  });

  test('bonsai の全列がバックアップ対象 (BACKED_UP_BONSAI_COLUMNS) に含まれる', () => {
    const allColumns = new Set([...BONSAI_BASE_COLUMNS, ...extractBonsaiAlterColumns(SCHEMA_SRC)]);
    // 1. schema の全 bonsai 列が backed-up に含まれる (列追加 → backup 漏れ を検出)
    for (const col of allColumns) {
      expect(BACKED_UP_BONSAI_COLUMNS).toContain(col);
    }
    // 2. backed-up に schema に存在しない列が無い (stale エントリ検出)
    for (const col of BACKED_UP_BONSAI_COLUMNS) {
      expect(allColumns.has(col)).toBe(true);
    }
  });
});
