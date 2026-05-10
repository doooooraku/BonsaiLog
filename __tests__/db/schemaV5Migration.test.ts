/**
 * F-09 Migration v5 テスト (Issue #31、ADR-0008 §4.3.4 整合)。
 *
 * events_fts を `tokenize='trigram remove_diacritics 1' detail=column` で
 * 再構築する migration v5 が正しい SQL を含んでいることを静的に検証。
 * 実 SQLite の動作確認は Repository 層の単体テストで担保。
 */
import { schemaV5, SCHEMA_VERSION } from '@/src/db/schema';

describe('Migration v5 (events_fts に detail=column / remove_diacritics 1 を反映)', () => {
  test('SCHEMA_VERSION は 5 以上 (v6 以降への引き上げ後も schemaV5 は適用済前提)', () => {
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(5);
  });

  test('schemaV5 に DROP TABLE IF EXISTS events_fts が含まれる', () => {
    expect(schemaV5).toMatch(/DROP\s+TABLE\s+IF\s+EXISTS\s+events_fts/);
  });

  test('schemaV5 に CREATE VIRTUAL TABLE events_fts USING fts5 が含まれる', () => {
    expect(schemaV5).toMatch(/CREATE\s+VIRTUAL\s+TABLE\s+events_fts\s+USING\s+fts5/);
  });

  test('schemaV5 の tokenize に "trigram remove_diacritics 1" が含まれる', () => {
    expect(schemaV5).toMatch(/tokenize\s*=\s*"trigram\s+remove_diacritics\s+1"/);
  });

  test('schemaV5 に detail = "column" が含まれる', () => {
    expect(schemaV5).toMatch(/detail\s*=\s*"column"/);
  });

  test('schemaV5 に events 再インデックス INSERT が含まれる', () => {
    expect(schemaV5).toMatch(
      /INSERT\s+INTO\s+events_fts\s*\(\s*event_id,\s*bonsai_id,\s*note,\s*payload_text\s*\)/,
    );
    expect(schemaV5).toMatch(
      /SELECT\s+id,\s*bonsai_id,\s*COALESCE\(note,\s*''\),\s*COALESCE\(payload_json,\s*''\)/,
    );
    expect(schemaV5).toMatch(/FROM\s+events/);
  });

  test('schemaV5 は deleted_at IS NULL のみ再インデックスする (ゴミ箱を除外)', () => {
    expect(schemaV5).toMatch(/WHERE\s+deleted_at\s+IS\s+NULL/);
  });
});
