/**
 * F-10 Phase D-1 — エクスポートファイル名生成 純関数テスト (Issue #33 / ADR-0016 AC9)。
 *
 * AC9 NM3 仕様:
 * - 形式: `bonsailog-{kind}-{YYYYMMDD-HHMM}.{csv|pdf}`
 * - ASCII のみ、forbidden chars 置換、連続 `_` 圧縮 + 端 `_` 除去
 */

import {
  buildExportFileName,
  formatLocalTimestamp,
  sanitizeExportSegment,
} from '@/src/features/export/exportFileName';

describe('formatLocalTimestamp (端末ローカル時刻 → YYYYMMDD-HHMM)', () => {
  test('通常日時', () => {
    const d = new Date(2026, 4, 3, 12, 34); // ローカル: 2026-05-03 12:34
    expect(formatLocalTimestamp(d)).toBe('20260503-1234');
  });

  test('ゼロパディング (1 桁の月/日/時/分)', () => {
    const d = new Date(2026, 0, 5, 9, 7); // 2026-01-05 09:07
    expect(formatLocalTimestamp(d)).toBe('20260105-0907');
  });

  test('深夜 0 時', () => {
    const d = new Date(2026, 4, 3, 0, 0);
    expect(formatLocalTimestamp(d)).toBe('20260503-0000');
  });

  test('23:59', () => {
    const d = new Date(2026, 4, 3, 23, 59);
    expect(formatLocalTimestamp(d)).toBe('20260503-2359');
  });

  test('閏年 2 月 29 日', () => {
    const d = new Date(2024, 1, 29, 12, 0);
    expect(formatLocalTimestamp(d)).toBe('20240229-1200');
  });
});

describe('sanitizeExportSegment (NM3 ASCII + forbidden + 圧縮)', () => {
  test('既に ASCII safe → そのまま', () => {
    expect(sanitizeExportSegment('bonsailog-events-csv-20260503-1234')).toBe(
      'bonsailog-events-csv-20260503-1234',
    );
  });

  test('日本語 (multibyte) → _ に置換', () => {
    // 全部 multibyte → 全 _ → 連続 _ 圧縮 → '_' → 端 _ 除去で空文字
    expect(sanitizeExportSegment('盆栽ログ')).toBe('');
    // 中央のみ multibyte → 端 ASCII で残る
    expect(sanitizeExportSegment('foo盆栽bar')).toBe('foo_bar');
  });

  test('forbidden chars (/ \\ : * ? " < > |) → _', () => {
    expect(sanitizeExportSegment('a/b\\c:d*e?f"g<h>i|j')).toBe('a_b_c_d_e_f_g_h_i_j');
  });

  test('制御文字 (改行 / TAB) → _', () => {
    expect(sanitizeExportSegment('foo\nbar\tbaz')).toBe('foo_bar_baz');
  });

  test('連続 _ を 1 つに圧縮', () => {
    expect(sanitizeExportSegment('foo___bar')).toBe('foo_bar');
    expect(sanitizeExportSegment('a/////b')).toBe('a_b');
  });

  test('端 _ 除去', () => {
    expect(sanitizeExportSegment('___foo___')).toBe('foo');
    expect(sanitizeExportSegment('___')).toBe('');
  });

  test('空文字列 → 空文字列', () => {
    expect(sanitizeExportSegment('')).toBe('');
  });

  test('入力型ガード (string 以外) → 空文字列', () => {
    expect(sanitizeExportSegment(undefined as unknown as string)).toBe('');
    expect(sanitizeExportSegment(null as unknown as string)).toBe('');
    expect(sanitizeExportSegment(123 as unknown as string)).toBe('');
  });

  test('絵文字 → _ に置換', () => {
    expect(sanitizeExportSegment('foo🌳bar')).toBe('foo_bar');
  });
});

describe('buildExportFileName (AC9 NM3 完全形)', () => {
  test('events-csv 通常ケース', () => {
    const date = new Date(2026, 4, 3, 12, 34);
    expect(buildExportFileName({ kind: 'events-csv', ext: 'csv', date })).toBe(
      'bonsailog-events-csv-20260503-1234.csv',
    );
  });

  test('bonsai-csv 通常ケース', () => {
    const date = new Date(2026, 4, 3, 12, 34);
    expect(buildExportFileName({ kind: 'bonsai-csv', ext: 'csv', date })).toBe(
      'bonsailog-bonsai-csv-20260503-1234.csv',
    );
  });

  test('species-csv 通常ケース', () => {
    const date = new Date(2026, 4, 3, 12, 34);
    expect(buildExportFileName({ kind: 'species-csv', ext: 'csv', date })).toBe(
      'bonsailog-species-csv-20260503-1234.csv',
    );
  });

  test('bonsai-pdf', () => {
    const date = new Date(2026, 4, 3, 12, 34);
    expect(buildExportFileName({ kind: 'bonsai-pdf', ext: 'pdf', date })).toBe(
      'bonsailog-bonsai-pdf-20260503-1234.pdf',
    );
  });

  test('list-pdf', () => {
    const date = new Date(2026, 4, 3, 12, 34);
    expect(buildExportFileName({ kind: 'list-pdf', ext: 'pdf', date })).toBe(
      'bonsailog-list-pdf-20260503-1234.pdf',
    );
  });

  test('深夜 0 時のゼロパディング', () => {
    const date = new Date(2026, 0, 1, 0, 0);
    expect(buildExportFileName({ kind: 'events-csv', ext: 'csv', date })).toBe(
      'bonsailog-events-csv-20260101-0000.csv',
    );
  });

  test('生成されたファイル名は ASCII のみ', () => {
    const date = new Date(2026, 4, 3, 12, 34);
    const name = buildExportFileName({ kind: 'events-csv', ext: 'csv', date });
    expect(/^[\x20-\x7E]+$/.test(name)).toBe(true);
  });

  test('生成されたファイル名に forbidden chars が含まれない', () => {
    const date = new Date(2026, 4, 3, 12, 34);
    const name = buildExportFileName({ kind: 'events-csv', ext: 'csv', date });
    expect(/[/\\:*?"<>|]/.test(name)).toBe(false);
  });

  test('生成されたファイル名は拡張子で終わる', () => {
    const date = new Date(2026, 4, 3, 12, 34);
    expect(buildExportFileName({ kind: 'events-csv', ext: 'csv', date }).endsWith('.csv')).toBe(
      true,
    );
    expect(buildExportFileName({ kind: 'bonsai-pdf', ext: 'pdf', date }).endsWith('.pdf')).toBe(
      true,
    );
  });
});
