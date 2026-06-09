/**
 * Sess78 PR-3: recurrenceRuleRepository 静的解析 test (ADR-0056 D7)。
 *
 * 実 DB CRUD test は Node 22+ 必須 (node:sqlite mock)、 PR-5 完遂後の 実機 R-25 評価で 担保。
 * 本 test は eventRepository.test.ts pattern 踏襲で、 file 構造 + 関数 export + ADR 整合を
 * 静的に検証。
 */
import * as repo from '@/src/db/recurrenceRuleRepository';

describe('recurrenceRuleRepository (Sess78 PR-3、 ADR-0056 D7)', () => {
  describe('Pro 境界 定数 (ADR-0049 ⑦ + ADR-0056 D7)', () => {
    test('FREE_RECURRENCE_RULE_LIMIT は 3 (タグ ②・カスタム樹種 ⑥ pattern 踏襲)', () => {
      expect(repo.FREE_RECURRENCE_RULE_LIMIT).toBe(3);
    });

    test('RECURRENCE_PREEXPAND_WEEKS は 8 (ADR-0056 D3)', () => {
      expect(repo.RECURRENCE_PREEXPAND_WEEKS).toBe(8);
    });

    test('RECURRENCE_MAX_EVENTS_PER_RULE は 1000 (ADR-0056 R3 性能ガード)', () => {
      expect(repo.RECURRENCE_MAX_EVENTS_PER_RULE).toBe(1000);
    });
  });

  describe('必要な関数を export', () => {
    test('createRecurrenceRule', () => {
      expect(typeof repo.createRecurrenceRule).toBe('function');
    });

    test('countActiveRecurrenceRules', () => {
      expect(typeof repo.countActiveRecurrenceRules).toBe('function');
    });

    test('canCreateRecurrenceRule (Pro 境界判定)', () => {
      expect(typeof repo.canCreateRecurrenceRule).toBe('function');
    });

    test('expandFutureEventsForAllActiveRules (起動時バッチ)', () => {
      expect(typeof repo.expandFutureEventsForAllActiveRules).toBe('function');
    });

    test('softDeleteRecurrenceRule (rule + future events cascade)', () => {
      expect(typeof repo.softDeleteRecurrenceRule).toBe('function');
    });

    test('skipOneOccurrence (ADR-0056 D6 「この 1 件だけ」)', () => {
      expect(typeof repo.skipOneOccurrence).toBe('function');
    });
  });

  describe('canCreateRecurrenceRule の Pro 判定ロジック', () => {
    test('Pro user は常に true (count 問わず)', async () => {
      // mock getDb は本 test で 不要 (= isPro=true で早期 return)
      await expect(repo.canCreateRecurrenceRule(true)).resolves.toBe(true);
    });
  });
});

describe('recurrenceRuleRepository ソースコード静的解析 (eventRepository.test.ts pattern 踏襲)', () => {
  test('ULID を使用 (主キー生成、 ADR-0008 整合)', () => {
    const src = require('fs').readFileSync(
      require('path').resolve(__dirname, '../../src/db/recurrenceRuleRepository.ts'),
      'utf8',
    );
    expect(src).toContain("import { ulid } from 'ulid'");
  });

  test('nowUtc / getTzOffsetMin / getTzIana を使用 (ADR-0008 §TZ 3 層防御整合)', () => {
    const src = require('fs').readFileSync(
      require('path').resolve(__dirname, '../../src/db/recurrenceRuleRepository.ts'),
      'utf8',
    );
    expect(src).toContain('nowUtc');
    expect(src).toContain('getTzOffsetMin');
    expect(src).toContain('getTzIana');
  });

  test('expandRRule (純関数) を使用 (ADR-0056 D3 + R-66)', () => {
    const src = require('fs').readFileSync(
      require('path').resolve(__dirname, '../../src/db/recurrenceRuleRepository.ts'),
      'utf8',
    );
    expect(src).toContain('expandRRule');
  });

  test('toLocalDateKey を使用 (R-66 厳守、 .toISOString().slice(0,10) 直書きなし)', () => {
    const src = require('fs').readFileSync(
      require('path').resolve(__dirname, '../../src/db/recurrenceRuleRepository.ts'),
      'utf8',
    );
    expect(src).toContain('toLocalDateKey');
    // R-66 違反パターンが含まれていない (例外 = `.toISOString()` を そのまま使う場面が ある、 例: dateKey + 'T00:00:00.000Z')
    expect(src).not.toMatch(/\.toISOString\(\)\.slice\(0,\s*10\)/);
  });

  test('値プレースホルダ (?) を使用 (SQL injection 防止)', () => {
    const src = require('fs').readFileSync(
      require('path').resolve(__dirname, '../../src/db/recurrenceRuleRepository.ts'),
      'utf8',
    );
    expect(src).toContain('VALUES (?');
    // 直接文字列展開していないか確認
    // Sess81 hotfix: 旧 regex `/INSERT\s+INTO\s+recurrence_rules.*\$\{/s` は dotall (s flag) +
    // `.*` greedy で 後続別ステートメントの template literal (= `${dateKey}T00:00...`) と
    // 誤マッチ。 SQL ステートメント単位 (= `;` で 区切る) に scope 限定。
    expect(src).not.toMatch(/INSERT\s+INTO\s+recurrence_rules[^;]*\$\{/s);
  });

  test('deleted_at IS NULL で active rule のみ filter', () => {
    const src = require('fs').readFileSync(
      require('path').resolve(__dirname, '../../src/db/recurrenceRuleRepository.ts'),
      'utf8',
    );
    expect(src).toMatch(/deleted_at\s+IS\s+NULL/);
  });

  test('softDeleteRecurrenceRule は status="planned" + occurred_at_utc >= now で future events のみ削除 (過去 logged 不変)', () => {
    const src = require('fs').readFileSync(
      require('path').resolve(__dirname, '../../src/db/recurrenceRuleRepository.ts'),
      'utf8',
    );
    expect(src).toMatch(/status\s*=\s*'planned'/);
    expect(src).toMatch(/occurred_at_utc\s*>=/);
  });
});
