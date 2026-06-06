/**
 * LabeledDateRow 静的解析 test (Sess67 TZ off-by-one 再発防止)
 *
 * Sess36 PR-7 で WorkLogConfirmScreen 等の初期値設定の同型 bug を直したが、
 * LabeledDateRow component 内部 onChange (line 107) だけ見落とし → Sess67 でテスター発覚。
 * 本 test は LabeledDateRow が toLocalDateKey + getTzOffsetMin を使用していることを CI 強制し、
 * 旧 `date.toISOString().slice(0, 10)` pattern への退行を構造的に防ぐ。
 *
 * 加えて toLocalDateKey の JST 深夜境界挙動を再現確認する runtime test も同梱
 * (テスター報告シナリオの確定的 regression test)。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { toLocalDateKey } from '@/src/core/datetime/localDateKey';

const SRC = readFileSync(
  resolve(__dirname, '../../../src/components/form/LabeledDateRow.tsx'),
  'utf8',
);

describe('LabeledDateRow TZ safety (Sess67 fix)', () => {
  test('1. toLocalDateKey + getTzOffsetMin import 配線済 (core/datetime 経由、 FSD boundary 整合)', () => {
    expect(SRC).toMatch(
      /import\s*\{\s*toLocalDateKey\s*\}\s*from\s*['"]@\/src\/core\/datetime\/localDateKey['"]/,
    );
    expect(SRC).toMatch(
      /import\s*\{\s*getTzOffsetMin\s*\}\s*from\s*['"]@\/src\/core\/datetime\/tz['"]/,
    );
  });

  test('2. onChange は toLocalDateKey(date.toISOString(), getTzOffsetMin()) を使用', () => {
    expect(SRC).toMatch(
      /onChangeText\(\s*toLocalDateKey\(\s*date\.toISOString\(\)\s*,\s*getTzOffsetMin\(\)\s*\)\s*\)/,
    );
  });

  test('3. 旧 buggy pattern `date.toISOString().slice(0, 10)` が残存していない (退行防止)', () => {
    expect(SRC).not.toMatch(/date\.toISOString\(\)\.slice\(0,\s*10\)/);
  });
});

describe('LabeledDateRow JST 深夜境界 regression (Sess67 テスター報告シナリオ)', () => {
  const JST = 540;

  test('JST 00:30 (= UTC 15:30 前日) に「今日」 を選んでも当日の YYYY-MM-DD を返す', () => {
    // テスター報告: 深夜に作業記録すると 1 日前で保存される。
    // native DateTimePicker は「今日 (JST 2026-06-06 00:30)」 を Date オブジェクトで返す。
    // toISOString() で UTC 化すると UTC 2026-06-05 15:30 → 旧 slice(0,10) は "2026-06-05" (前日)。
    const isoUtc = '2026-06-05T15:30:00.000Z';
    expect(toLocalDateKey(isoUtc, JST)).toBe('2026-06-06');
    expect(isoUtc.slice(0, 10)).toBe('2026-06-05'); // 旧 bug 挙動の確定的記録
  });

  test('JST 08:59 (= UTC 23:59 前日) 深夜境界 end も当日扱い', () => {
    const isoUtc = '2026-06-05T23:59:00.000Z';
    expect(toLocalDateKey(isoUtc, JST)).toBe('2026-06-06');
    expect(isoUtc.slice(0, 10)).toBe('2026-06-05');
  });

  test('JST 09:00 (= UTC 00:00 当日) は元から正しく当日扱い (regression なし)', () => {
    const isoUtc = '2026-06-06T00:00:00.000Z';
    expect(toLocalDateKey(isoUtc, JST)).toBe('2026-06-06');
  });

  test('PST -480: 夕方 22:30 (= UTC 翌日 05:30) も local 日付を維持', () => {
    // PST 利用者: ローカル 2026-06-05 22:30 を選択 → UTC 2026-06-06 05:30。
    // 旧 slice(0,10) は "2026-06-06" (UTC 翌日) で 1 日 進む 同型 bug。
    const isoUtc = '2026-06-06T05:30:00.000Z';
    expect(toLocalDateKey(isoUtc, -480)).toBe('2026-06-05');
    expect(isoUtc.slice(0, 10)).toBe('2026-06-06');
  });
});
