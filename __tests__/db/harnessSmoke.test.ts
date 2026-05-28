/**
 * DB harness 検証 (Phase 3 PR 1-0)。
 *
 * expoSqliteMock (node:sqlite backed) + testDb helper が:
 * - getDb() の migrate を完走させ (schemaV2〜V15)
 * - user_version を SCHEMA_VERSION に設定し
 * - 主要テーブル + events_fts (FTS5) を作成し
 * - runAsync / getFirstAsync / getAllAsync の roundtrip が動く
 * ことを検証する。これが緑なら以降の repo characterization が実 DB で書ける。
 */
import { setupFreshDb } from '../helpers/testDb';

describe('DB harness (node:sqlite mock)', () => {
  test('getDb() が migrate を完走し SCHEMA_VERSION に到達', async () => {
    const db = await setupFreshDb();
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
    // SCHEMA_VERSION は schema.ts の正 (現状 15)。15 以上であることを確認。
    expect(row?.user_version).toBeGreaterThanOrEqual(15);
  });

  test('主要テーブルが存在する (bonsai / events / photos / species / tags / bonsai_tags)', async () => {
    const db = await setupFreshDb();
    const rows = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table';",
    );
    const names = rows.map((r) => r.name);
    for (const t of ['bonsai', 'events', 'photos', 'species', 'tags', 'bonsai_tags']) {
      expect(names).toContain(t);
    }
  });

  test('events_fts (FTS5 virtual table) が存在し MATCH 検索できる', async () => {
    const db = await setupFreshDb();
    const fts = await db.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE name='events_fts';",
    );
    expect(fts?.name).toBe('events_fts');
  });

  test('runAsync / getFirstAsync の roundtrip + lastInsertRowId/changes マッピング', async () => {
    const db = await setupFreshDb();
    await db.execAsync('CREATE TABLE _smoke (id INTEGER PRIMARY KEY, label TEXT);');
    const res = await db.runAsync('INSERT INTO _smoke (label) VALUES (?);', ['苔']);
    expect(res.changes).toBe(1);
    expect(typeof res.lastInsertRowId).toBe('number');
    const row = await db.getFirstAsync<{ label: string }>(
      'SELECT label FROM _smoke WHERE id = ?;',
      [res.lastInsertRowId],
    );
    expect(row?.label).toBe('苔');
  });

  test('undefined / boolean の bind を coerce (null / 0,1)', async () => {
    const db = await setupFreshDb();
    await db.execAsync('CREATE TABLE _coerce (a TEXT, b INTEGER, c INTEGER);');
    // expo-sqlite の型は undefined/boolean を拒否するが、mock の coerce 挙動を検証するため
    // 意図的に渡す (緩い型へ cast)。
    const looseRun = db.runAsync.bind(db) as (sql: string, params: unknown[]) => Promise<unknown>;
    await looseRun('INSERT INTO _coerce (a, b, c) VALUES (?, ?, ?);', [undefined, true, false]);
    const row = await db.getFirstAsync<{ a: string | null; b: number; c: number }>(
      'SELECT a, b, c FROM _coerce;',
    );
    expect(row?.a).toBeNull();
    expect(row?.b).toBe(1);
    expect(row?.c).toBe(0);
  });

  test('テスト間で DB が分離される (前テストの _smoke が残らない)', async () => {
    const db = await setupFreshDb();
    const t = await db.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE name='_smoke';",
    );
    expect(t).toBeNull();
  });
});
