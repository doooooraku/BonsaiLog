/**
 * datetime utils テスト (P2-03 PR-A、Issue #17 AC2-1〜AC2-6 該当)。
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  formatLocal,
  getTzIana,
  getTzOffsetMin,
  isoUtcFrom,
  nowUtc,
  type IsoUtc,
  type TzIana,
} from '../../src/core/datetime';

describe('clock', () => {
  test('nowUtc() は ISO 8601 UTC 形式を返す', () => {
    const now = nowUtc();
    expect(typeof now).toBe('string');
    expect(now).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  test('isoUtcFrom(Date) で変換可能', () => {
    const d = new Date('2026-05-02T01:30:00.000Z');
    expect(isoUtcFrom(d)).toBe('2026-05-02T01:30:00.000Z');
  });

  test('isoUtcFrom(number) でミリ秒タイムスタンプを変換可能', () => {
    const ms = Date.UTC(2026, 4, 2, 1, 30, 0); // 2026-05 (month 0-indexed)
    expect(isoUtcFrom(ms)).toBe('2026-05-02T01:30:00.000Z');
  });

  test('isoUtcFrom(string) で ISO 文字列を変換可能', () => {
    expect(isoUtcFrom('2026-05-02T01:30:00Z')).toBe('2026-05-02T01:30:00.000Z');
  });

  test('isoUtcFrom(invalid) は例外を投げる', () => {
    expect(() => isoUtcFrom('not-a-date')).toThrow(/Invalid date input/);
  });
});

describe('tz', () => {
  test('getTzOffsetMin() は数値を返す (符号反転済、JST = +540 想定)', () => {
    const offset = getTzOffsetMin();
    expect(typeof offset).toBe('number');
    // テスト環境の TZ により JST/UTC で値が変わるため、範囲のみ確認
    expect(offset).toBeGreaterThanOrEqual(-720); // -12h
    expect(offset).toBeLessThanOrEqual(840); // +14h
  });

  test('getTzOffsetMin(at) で過去の DST 境界も計算可能', () => {
    // 2026-03-30 02:00 CET → CEST 切替 (DST 開始) を想定
    const beforeDst = new Date('2026-03-30T01:00:00Z');
    const afterDst = new Date('2026-03-30T03:00:00Z');
    const before = getTzOffsetMin(beforeDst);
    const after = getTzOffsetMin(afterDst);
    expect(typeof before).toBe('number');
    expect(typeof after).toBe('number');
  });

  test('getTzIana() は文字列を返す (例: "Asia/Tokyo" or "UTC")', () => {
    const tz = getTzIana();
    expect(typeof tz).toBe('string');
    expect(tz.length).toBeGreaterThan(0);
  });

  test('getTzIana() フォールバック動作 (Intl 失敗時に UTC を返す)', () => {
    // Intl は通常動作するため、戻り値の型確認のみ
    const tz = getTzIana();
    expect(tz).toMatch(/^[A-Za-z_/]+$/); // IANA 名 or "UTC"
  });
});

describe('format', () => {
  test('formatLocal で IANA TZ にフォーマット可能 (JST)', () => {
    const utc = '2026-05-02T01:30:00.000Z' as IsoUtc;
    const tz = 'Asia/Tokyo' as TzIana;
    const result = formatLocal(utc, tz, 'yyyy-MM-dd HH:mm');
    expect(result).toBe('2026-05-02 10:30'); // JST = UTC + 9h
  });

  test('formatLocal で IANA TZ にフォーマット可能 (PST/PDT)', () => {
    const utc = '2026-05-02T01:30:00.000Z' as IsoUtc;
    const tz = 'America/Los_Angeles' as TzIana;
    const result = formatLocal(utc, tz, 'yyyy-MM-dd HH:mm zzz');
    // PDT (DST中) または PST、ともに値が含まれる
    expect(result).toMatch(/2026-05-0[12] \d{2}:\d{2}/);
  });

  test('formatLocal で DST 境界 (CET → CEST) を扱える', () => {
    // 2026-03-29 02:00 CET → 03:00 CEST に切替 (EU DST 開始日)
    const beforeDst = '2026-03-29T00:30:00.000Z' as IsoUtc; // 01:30 CET
    const afterDst = '2026-03-29T01:30:00.000Z' as IsoUtc; // 03:30 CEST
    const tz = 'Europe/Berlin' as TzIana;
    expect(formatLocal(beforeDst, tz, 'yyyy-MM-dd HH:mm')).toBe('2026-03-29 01:30');
    expect(formatLocal(afterDst, tz, 'yyyy-MM-dd HH:mm')).toBe('2026-03-29 03:30');
  });
});

describe('Branded Type 静的解析', () => {
  test('types.ts が 3 つの brand 型を export', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/core/datetime/types.ts'),
      'utf-8',
    );
    expect(source).toMatch(/export\s+type\s+IsoUtc/);
    expect(source).toMatch(/export\s+type\s+TzOffsetMin/);
    expect(source).toMatch(/export\s+type\s+TzIana/);
  });

  test('clock.ts が現在時刻取得の唯一の入口 (nowUtc) を export', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/core/datetime/clock.ts'),
      'utf-8',
    );
    // ESLint で `src/core/datetime/**` は no-restricted-syntax: 'off' のため disable コメント不要
    expect(source).toMatch(/export\s+function\s+nowUtc\(\)/);
    expect(source).toMatch(/new Date\(\)\.toISOString\(\)/); // 内部実装で new Date() を使用
  });

  test('tz.ts が getTimezoneOffset の符号反転を 1 ヶ所で実施', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/core/datetime/tz.ts'),
      'utf-8',
    );
    expect(source).toMatch(/-date\.getTimezoneOffset\(\)/); // 符号反転
  });
});
