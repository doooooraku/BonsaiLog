/**
 * Toast 拡張 (action button slot + showUndoToast helper) 静的解析 test
 * (ADR-0036 D5 / R-44 整合、 Sess25 PR-ζ-2-④)。
 *
 * 既存 callsite (action 未指定) の後方互換も検証。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(resolve(__dirname, '../../src/components/Toast.tsx'), 'utf8');

describe('Toast 拡張 (ADR-0036 D5 / R-44)', () => {
  test('1. ToastAction type 定義 (label + onPress)', () => {
    expect(SRC).toMatch(/export\s+type\s+ToastAction\s*=\s*\{/);
    expect(SRC).toMatch(/label:\s*string/);
    expect(SRC).toMatch(/onPress:\s*\(\)\s*=>\s*void\s*\|\s*Promise<void>/);
  });

  test('2. ToastShowOptions type 定義 (durationMs + action 共に optional)', () => {
    expect(SRC).toMatch(/export\s+type\s+ToastShowOptions\s*=\s*\{/);
    expect(SRC).toMatch(/durationMs\?:\s*number/);
    expect(SRC).toMatch(/action\?:\s*ToastAction/);
  });

  test('3. show signature 後方互換 (number | ToastShowOptions 両受け)', () => {
    expect(SRC).toMatch(
      /show:\s*\(message:\s*string,\s*opts\?:\s*number\s*\|\s*ToastShowOptions\)/,
    );
    // number 受領時は durationMs として扱う normalize
    expect(SRC).toMatch(/typeof\s+opts\s*===\s*['"]number['"]/);
  });

  test('4. default durationMs 3000ms 維持 (旧 callsite 後方互換)', () => {
    expect(SRC).toMatch(/duration\s*=\s*normalized\.durationMs\s*\?\?\s*3000/);
  });

  test('5. showUndoToast helper は 4 秒固定 (Material 3 Snackbar、 ADR-0036 D5)', () => {
    expect(SRC).toMatch(/export\s+function\s+showUndoToast/);
    expect(SRC).toMatch(/durationMs:\s*4000/);
    expect(SRC).toMatch(
      /showUndoToast\([\s\S]*?message:\s*string,\s*actionLabel:\s*string,\s*undoFn/,
    );
  });

  test('6. Toast render で action ボタン slot (Pressable + onPress + dismiss)', () => {
    expect(SRC).toMatch(/action\s*\?\s*\(\s*<Pressable/);
    expect(SRC).toMatch(/onPress=\{handleActionPress\}/);
    expect(SRC).toMatch(/testID="e2e_toast_action"/);
    // tap 後 hide() で dismiss
    expect(SRC).toMatch(/await\s+action\.onPress\(\)/);
    expect(SRC).toMatch(/hide\(\)/);
  });

  test('7. pointerEvents 動的 (action あり=box-none、 なし=none で 旧挙動維持)', () => {
    expect(SRC).toMatch(/pointerEvents=\{action\s*\?\s*['"]box-none['"]\s*:\s*['"]none['"]\}/);
  });
});
