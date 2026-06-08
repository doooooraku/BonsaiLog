/**
 * Sess78 PR-2: Migration v16 テスト (ADR-0056 定期予定機能 foundation)。
 *
 * recurrence_rules テーブル新規 + events.recurrence_rule_id 列追加 が正しい SQL を
 * 含んでいることを静的に検証。 実 SQLite の動作確認は Repository 層の単体テスト (Sess78 PR-3)
 * + 実機 SH-M25 SEED load (Sess78 PR-2 main merge 前) で担保。
 *
 * Sess14 ALTER TABLE 罠回避の証跡: schemaV16 単体には ALTER TABLE 文を含めず、 db.ts の v16
 * migration runner で REFERENCES 句なし版を hasColumn ガード付きで実行する pattern を採用。
 */
import { schemaV16, recurrenceRules, SCHEMA_VERSION } from '@/src/db/schema';

describe('Migration v16 (recurrence_rules + events.recurrence_rule_id、 Sess78 PR-2 ADR-0056)', () => {
  test('SCHEMA_VERSION は 16 以上 (v17 以降への引き上げ後も schemaV16 は適用済前提)', () => {
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(16);
  });

  test('schemaV16 に CREATE TABLE IF NOT EXISTS recurrence_rules が含まれる', () => {
    expect(schemaV16).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+recurrence_rules/);
  });

  test('schemaV16 に id TEXT PRIMARY KEY NOT NULL が含まれる (ULID 想定)', () => {
    expect(schemaV16).toMatch(/id\s+TEXT\s+PRIMARY\s+KEY\s+NOT\s+NULL/);
  });

  test('schemaV16 に bonsai_id REFERENCES bonsai(id) ON DELETE CASCADE が含まれる', () => {
    expect(schemaV16).toMatch(/bonsai_id\s+TEXT\s+NOT\s+NULL/);
    expect(schemaV16).toMatch(
      /FOREIGN\s+KEY\s*\(\s*bonsai_id\s*\)\s+REFERENCES\s+bonsai\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/,
    );
  });

  test('schemaV16 に event_type / rrule / start_at_utc / end_at_utc / exdates / tz_iana の必須列が含まれる', () => {
    expect(schemaV16).toMatch(/event_type\s+TEXT\s+NOT\s+NULL/);
    expect(schemaV16).toMatch(/rrule\s+TEXT\s+NOT\s+NULL/);
    expect(schemaV16).toMatch(/start_at_utc\s+TEXT\s+NOT\s+NULL/);
    expect(schemaV16).toMatch(/end_at_utc\s+TEXT/);
    expect(schemaV16).toMatch(/exdates\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'\[\]'/);
    expect(schemaV16).toMatch(/tz_iana\s+TEXT\s+NOT\s+NULL/);
  });

  test('schemaV16 に deleted_at 列 (30 日ゴミ箱) + created_at/updated_at が含まれる', () => {
    expect(schemaV16).toMatch(/deleted_at\s+TEXT/);
    expect(schemaV16).toMatch(/created_at\s+TEXT\s+NOT\s+NULL/);
    expect(schemaV16).toMatch(/updated_at\s+TEXT\s+NOT\s+NULL/);
  });

  test('schemaV16 に idx_recurrence_rules_active partial index が含まれる (deleted_at IS NULL)', () => {
    expect(schemaV16).toMatch(
      /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_recurrence_rules_active[\s\S]*WHERE\s+deleted_at\s+IS\s+NULL/,
    );
  });

  test('schemaV16 に idx_events_recurrence partial index が含まれる (events 拡張側)', () => {
    expect(schemaV16).toMatch(
      /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_events_recurrence[\s\S]*WHERE\s+deleted_at\s+IS\s+NULL/,
    );
  });

  test('schemaV16 単体には ALTER TABLE events 文を含まない (Sess14 罠回避: db.ts runner で REFERENCES 句なし版を hasColumn ガード付きで実行)', () => {
    expect(schemaV16).not.toMatch(/ALTER\s+TABLE\s+events/);
  });

  test('schemaV16 の recurrence_rules CREATE TABLE 内 REFERENCES は bonsai(id) のみ (events への FK は持たない、 events 側列追加で対応)', () => {
    // CREATE TABLE 内の FOREIGN KEY は bonsai 1 個のみ (events への参照は events 側の列で逆方向)
    const fkMatches = schemaV16.match(/FOREIGN\s+KEY/gi) ?? [];
    expect(fkMatches.length).toBe(1);
  });

  describe('Drizzle ORM table 定義 (recurrenceRules)', () => {
    test('recurrenceRules は sqliteTable で定義されている', () => {
      expect(recurrenceRules).toBeDefined();
    });

    test('全 11 列が含まれる (id / bonsaiId / eventType / rrule / startAtUtc / endAtUtc / exdates / tzIana / deletedAt / createdAt / updatedAt)', () => {
      // Drizzle table は実行時に Symbol 経由で 列定義を保持、 直接 keys() は使えないので
      // $inferSelect 型を 静的に試験する代わりに、 column 名の存在を runtime で確認
      const columnNames = Object.keys(recurrenceRules);
      expect(columnNames).toEqual(
        expect.arrayContaining([
          'id',
          'bonsaiId',
          'eventType',
          'rrule',
          'startAtUtc',
          'endAtUtc',
          'exdates',
          'tzIana',
          'deletedAt',
          'createdAt',
          'updatedAt',
        ]),
      );
    });
  });
});
