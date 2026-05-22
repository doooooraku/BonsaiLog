/**
 * Toast 静的解析 test (Sess27 PR-2: action slot 撤回後)。
 * ADR-0036 D5/D6 Sess27 撤回、 R-44 緩和反映。 既存 callsite (action 未指定) 後方互換確認。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(resolve(__dirname, '../../src/components/Toast.tsx'), 'utf8');

describe('Toast (Sess27 PR-2: action slot 撤回)', () => {
  test('1. ToastShowOptions type 定義 (durationMs のみ optional)', () => {
    expect(SRC).toMatch(/export\s+type\s+ToastShowOptions\s*=\s*\{/);
    expect(SRC).toMatch(/durationMs\?:\s*number/);
  });

  test('2. show signature 後方互換 (number | ToastShowOptions 両受け)', () => {
    expect(SRC).toMatch(
      /show:\s*\(message:\s*string,\s*opts\?:\s*number\s*\|\s*ToastShowOptions\)/,
    );
    expect(SRC).toMatch(/typeof\s+opts\s*===\s*['"]number['"]/);
  });

  test('3. default durationMs 3000ms 維持 (Material 3 Snackbar 整合)', () => {
    expect(SRC).toMatch(/duration\s*=\s*normalized\.durationMs\s*\?\?\s*3000/);
  });

  test('4. action slot は削除 (Sess27 R-44 緩和)、 showUndoToast は deprecated stub のみ残置', () => {
    expect(SRC).not.toMatch(/ToastAction/);
    expect(SRC).not.toMatch(/Pressable/);
    expect(SRC).not.toMatch(/e2e_toast_action/);
    // showUndoToast は deprecated stub として残置 (PR-3/4 の段階的移行のため、 PR-7 で完全削除予定)
    expect(SRC).toMatch(/@deprecated/);
    expect(SRC).toMatch(/export\s+function\s+showUndoToast/);
  });

  test('5. pointerEvents 常時 none (action 撤回で背後貫通 bug も解消)', () => {
    expect(SRC).toMatch(/pointerEvents="none"/);
    expect(SRC).not.toMatch(/box-none/);
  });

  test('6. Toast component は message のみ render (text + container)', () => {
    expect(SRC).toMatch(/{message}/);
    expect(SRC).toMatch(/testID="e2e_toast"/);
  });
});
