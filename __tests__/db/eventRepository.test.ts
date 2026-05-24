/**
 * eventRepository 静的解析 + 純関数テスト (P2-03 PR-C)。
 * 実 DB 接続テストは PR-D の Maestro E2E でカバー。
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  TRASH_RETENTION_DAYS,
  SEARCH_TRIGRAM_MIN_CHARS,
  escapeLikePattern,
} from '../../src/db/eventRepository';

describe('TRASH_RETENTION_DAYS', () => {
  test('30 日と確定 (ADR-0008、Issue #17 AC4)', () => {
    expect(TRASH_RETENTION_DAYS).toBe(30);
  });
});

// Sess19-3 (user 真意「F-05 不要」): EVENT_OVERLOAD_THRESHOLD + countSameDayPlannedOrLoggedEvents
// テスト削除済 (F-05 機能自体を撤廃)。

describe('eventRepository file structure', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../../src/db/eventRepository.ts'),
    'utf-8',
  );

  test('必要な関数を export', () => {
    const requiredExports = [
      'createEvent',
      'getEventById',
      'getActiveEventsByBonsai',
      'getTrashedEvents',
      'getEventsByStatus',
      'getEventsByType',
      'updateEvent',
      'markEventLogged',
      'markEventCancelled',
      'softDeleteEvent',
      'restoreEvent',
      'deleteEventHard',
      'purgeOldTrash',
      'searchEvents',
    ];
    for (const name of requiredExports) {
      expect(source).toMatch(new RegExp(`export\\s+(async\\s+)?function\\s+${name}`));
    }
  });

  test('ULID を使用 (主キー生成)', () => {
    expect(source).toMatch(/import\s+\{\s*ulid\s*\}\s+from\s+['"]ulid['"]/);
    expect(source).toMatch(/ulid\(\)/);
  });

  test('nowUtc / getTzOffsetMin / getTzIana を使用 (TZ 3 層防御)', () => {
    expect(source).toMatch(/getTzIana/);
    expect(source).toMatch(/getTzOffsetMin/);
    expect(source).toMatch(/nowUtc/);
  });

  test('Valibot バリデーションを呼出 (createEvent / updateEvent で型安全)', () => {
    expect(source).toMatch(/validateEventPayload/);
    expect(source).toMatch(/serializeEventPayload/);
  });

  test('FTS5 同期コードを含む (events_fts への INSERT/DELETE)', () => {
    expect(source).toMatch(/INSERT\s+INTO\s+events_fts/);
    expect(source).toMatch(/DELETE\s+FROM\s+events_fts\s+WHERE\s+event_id\s*=\s*\?/);
  });

  test('30 日ゴミ箱 (purgeOldTrash) で deleted_at <= cutoff を使用', () => {
    expect(source).toMatch(/deleted_at\s+IS\s+NOT\s+NULL\s+AND\s+deleted_at\s*<=/);
    expect(source).toMatch(/TRASH_RETENTION_DAYS\s*\*\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
  });

  test('値プレースホルダ (?) を使用 (SQL injection 防止)', () => {
    const queries = source.match(/(SELECT|INSERT|UPDATE|DELETE)[^;`]+(\?|VALUES)/gi);
    expect(queries).not.toBeNull();
    expect(queries!.length).toBeGreaterThan(8);
  });

  test('softDeleteEvent は FTS5 から削除する (再表示時のノイズ防止)', () => {
    // 関数定義の中で DELETE FROM events_fts を呼んでいる
    const fnMatch = source.match(/softDeleteEvent[\s\S]+?^}/m);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch![0]).toMatch(/DELETE\s+FROM\s+events_fts/);
  });

  test('restoreEvent は FTS5 に再 INSERT する', () => {
    const fnMatch = source.match(/restoreEvent[\s\S]+?^}/m);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch![0]).toMatch(/INSERT\s+INTO\s+events_fts/);
  });
});

// 改善③ ハイブリッド検索 (1〜2 字 LIKE / 3 字〜 trigram)
describe('SEARCH_TRIGRAM_MIN_CHARS', () => {
  test('trigram 最小文字数は 3 (3 文字未満は LIKE フォールバック)', () => {
    expect(SEARCH_TRIGRAM_MIN_CHARS).toBe(3);
  });
});

describe('escapeLikePattern', () => {
  test('メタ文字 % _ \\ を \\ でエスケープ', () => {
    expect(escapeLikePattern('100%')).toBe('100\\%');
    expect(escapeLikePattern('a_b')).toBe('a\\_b');
    expect(escapeLikePattern('a\\b')).toBe('a\\\\b');
  });

  test('メタ文字を含まない日本語はそのまま', () => {
    expect(escapeLikePattern('苔')).toBe('苔');
    expect(escapeLikePattern('苔の')).toBe('苔の');
  });

  test('複数メタ文字を全てエスケープ', () => {
    expect(escapeLikePattern('50%_off\\x')).toBe('50\\%\\_off\\\\x');
  });
});

describe('searchEventsWithSnippet ハイブリッド分岐 (静的解析)', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../../src/db/eventRepository.ts'),
    'utf-8',
  );

  test('searchEventsByNoteLike を export', () => {
    expect(source).toMatch(/export\s+async\s+function\s+searchEventsByNoteLike/);
  });

  test('searchEventsWithSnippet は 3 文字未満で LIKE フォールバックに委譲', () => {
    expect(source).toMatch(/length\s*<\s*SEARCH_TRIGRAM_MIN_CHARS/);
    expect(source).toMatch(/return\s+searchEventsByNoteLike\(trimmed,\s*bonsaiId\)/);
  });

  test('LIKE フォールバックは ESCAPE + deleted_at IS NULL + occurred_at_utc DESC', () => {
    expect(source).toMatch(/e\.note\s+LIKE\s+\?\s+ESCAPE\s+'\\\\'/);
    expect(source).toMatch(/e\.deleted_at\s+IS\s+NULL/);
    expect(source).toMatch(/ORDER\s+BY\s+e\.occurred_at_utc\s+DESC/);
  });
});

// Sess19-3 (user 真意「F-05 不要」): countSameDayPlannedOrLoggedEvents テスト削除済。
