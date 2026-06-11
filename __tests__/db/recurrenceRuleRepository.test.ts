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
    test('FREE_RECURRENCE_GROUP_LIMIT は 3 (Sess101 #1159: 予定グループ単位、 盆栽数は問わない)', () => {
      expect(repo.FREE_RECURRENCE_GROUP_LIMIT).toBe(3);
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

    test('countActiveRecurrenceGroups (Sess101 #1159: グループ単位カウント)', () => {
      expect(typeof repo.countActiveRecurrenceGroups).toBe('function');
    });

    test('canCreateRecurrenceGroup (Pro 境界判定)', () => {
      expect(typeof repo.canCreateRecurrenceGroup).toBe('function');
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

  describe('canCreateRecurrenceGroup の Pro 判定ロジック', () => {
    test('Pro user は常に true (count 問わず)', async () => {
      // mock getDb は本 test で 不要 (= isPro=true で早期 return)
      await expect(repo.canCreateRecurrenceGroup(true)).resolves.toBe(true);
    });
  });

  describe('グループ単位カウント SQL (Sess101 #1159、 ADR-0049 ⑦ Sess101 Amendment)', () => {
    test('COUNT(DISTINCT COALESCE(group_id, id)) で旧データ (group_id NULL) も 1 本グループとして数える', () => {
      const src = require('fs').readFileSync(
        require('path').resolve(__dirname, '../../src/db/recurrenceRuleRepository.ts'),
        'utf8',
      );
      expect(src).toContain('COUNT(DISTINCT COALESCE(group_id, id))');
      // 旧 rule 単位カウントへの逆行防止
      expect(src).not.toContain('FREE_RECURRENCE_RULE_LIMIT');
      expect(src).not.toContain('countActiveRecurrenceRules');
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

  // ============================================================
  // Sess82 PR-B: getNextOccurrence (= 静的解析、 実 DB は characterization test 担当)
  // ============================================================
  describe('Sess82 PR-B: getNextOccurrence (= 次回予定日 取得)', () => {
    const repoSrc: string = require('fs').readFileSync(
      require('path').resolve(__dirname, '../../src/db/recurrenceRuleRepository.ts'),
      'utf8',
    );

    test('1. getNextOccurrence 関数 export 確認', () => {
      expect(repoSrc).toMatch(/export\s+async\s+function\s+getNextOccurrence/);
    });

    test('2. 引数 signature = (ruleId, nowUtcIso): Promise<string | null>', () => {
      expect(repoSrc).toMatch(
        /getNextOccurrence\(\s*ruleId:\s*string,\s*nowUtcIso:\s*string,?\s*\):\s*Promise<string\s*\|\s*null>/,
      );
    });

    test('3. SELECT MIN(occurred_at_utc) AS next_at で 最も近い未来取得', () => {
      expect(repoSrc).toMatch(/SELECT\s+MIN\(occurred_at_utc\)\s+AS\s+next_at/);
    });

    test("4. WHERE recurrence_rule_id = ? AND status = 'planned' AND occurred_at_utc >= ? AND deleted_at IS NULL", () => {
      expect(repoSrc).toMatch(/WHERE\s+recurrence_rule_id\s*=\s*\?/);
      expect(repoSrc).toMatch(/AND\s+status\s*=\s*'planned'/);
      expect(repoSrc).toMatch(/AND\s+occurred_at_utc\s*>=\s*\?/);
      expect(repoSrc).toMatch(/AND\s+deleted_at\s+IS\s+NULL/);
    });

    test('5. row.next_at が null/undefined なら null fallback (= null 安全)', () => {
      expect(repoSrc).toMatch(/row\?\.next_at\s*\?\?\s*null/);
    });

    test('6. プレースホルダ ? を使用 (= SQL injection 防止)', () => {
      // SELECT は INSERT/UPDATE と違い regex で SQL injection 検出が 難しいが、
      // ステートメント単位で ${ を 含まない 確認
      expect(repoSrc).not.toMatch(/SELECT\s+MIN\(occurred_at_utc\)[^;]*\$\{/s);
    });
  });

  // ============================================================
  // Sess93 PR-1: memo cascade (= 静的解析、 実 DB は CRUD test 担当)
  // ============================================================
  describe('Sess93 PR-1: recurrence_rules.memo 列 + cascade to events.note', () => {
    const repoSrc: string = require('fs').readFileSync(
      require('path').resolve(__dirname, '../../src/db/recurrenceRuleRepository.ts'),
      'utf8',
    );

    test('1. CreateRecurrenceRuleInput に memo フィールドが含まれる (optional)', () => {
      expect(repoSrc).toMatch(/memo\?:\s*string\s*\|\s*null/);
    });

    test('2. RecurrenceRuleRow に memo フィールドが含まれる', () => {
      // RecurrenceRuleRow 型定義内で memo: string | null
      expect(repoSrc).toMatch(/memo:\s*string\s*\|\s*null/);
    });

    test('3. INSERT INTO recurrence_rules に memo 列が含まれる', () => {
      expect(repoSrc).toMatch(/INSERT\s+INTO\s+recurrence_rules[^;]*memo[^;]*\)\s*VALUES/s);
    });

    test('4. INSERT INTO events に note 列が含まれる (= rule.memo cascade)', () => {
      expect(repoSrc).toMatch(/INSERT\s+INTO\s+events[^;]*recurrence_rule_id,\s*note/s);
    });

    test('5. SELECT recurrence_rules で memo 列が取得される', () => {
      expect(repoSrc).toMatch(/SELECT[^;]*\bmemo\b[^;]*FROM\s+recurrence_rules/s);
    });

    test('6. 空文字列の memo は null 正規化 (= UI 空欄を NULL 統一)', () => {
      expect(repoSrc).toMatch(
        /input\.memo\s*&&\s*input\.memo\.length\s*>\s*0\s*\?\s*input\.memo\s*:\s*null/,
      );
    });
  });
});
