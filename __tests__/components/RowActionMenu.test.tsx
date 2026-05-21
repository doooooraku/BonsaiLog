/**
 * RowActionMenu 静的解析 test (ADR-0036 D7、 Sess25 PR-ζ-2-⑤)。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(resolve(__dirname, '../../src/components/RowActionMenu.tsx'), 'utf8');

describe('RowActionMenu (ADR-0036 D7)', () => {
  test('1. RowActionMenuItem type 定義 (key + label + destructive? + onPress)', () => {
    expect(SRC).toMatch(/export\s+type\s+RowActionMenuItem\s*=\s*\{/);
    expect(SRC).toMatch(/key:\s*string/);
    expect(SRC).toMatch(/label:\s*string/);
    expect(SRC).toMatch(/destructive\?:\s*boolean/);
    expect(SRC).toMatch(/onPress:\s*\(\)\s*=>\s*void\s*\|\s*Promise<void>/);
  });

  test('2. react-native Modal + transparent + animationType="slide" で bottom sheet 風 (ADR-0036 D7)', () => {
    expect(SRC).toMatch(/import\s*\{[^}]*\bModal\b[^}]*\}\s*from\s*['"]react-native['"]/);
    expect(SRC).toMatch(/transparent[\s\n]/);
    expect(SRC).toMatch(/animationType="slide"/);
  });

  test('3. onRequestClose で Android Back キャンセル → onDismiss', () => {
    expect(SRC).toMatch(/onRequestClose=\{onDismiss\}/);
  });

  test('4. backdrop tap で onDismiss + 内側 sheet stopPropagation で gesture 独立', () => {
    expect(SRC).toMatch(/style=\{styles\.backdrop\}\s*\n\s*onPress=\{onDismiss\}/);
    expect(SRC).toMatch(/onPress=\{\(e\)\s*=>\s*e\.stopPropagation\(\)\}/);
    expect(SRC).toMatch(/justifyContent:\s*['"]flex-end['"]/);
  });

  test('5. accessibilityViewIsModal + accessibilityRole="menu" (a11y)', () => {
    expect(SRC).toMatch(/accessibilityViewIsModal/);
    expect(SRC).toMatch(/accessibilityRole="menu"/);
    expect(SRC).toMatch(/accessibilityRole="menuitem"/);
  });

  test('6. destructive=true で DANGER 赤文字適用', () => {
    expect(SRC).toMatch(/itemTextDestructive.*color:\s*DANGER/s);
    expect(SRC).toMatch(/item\.destructive\s*&&\s*styles\.itemTextDestructive/);
  });

  test('7. item tap で onDismiss → onPress 順 (自動 dismiss)', () => {
    const handler = SRC.match(/const handleItemPress[\s\S]*?\};/);
    expect(handler).not.toBeNull();
    if (handler) {
      const block = handler[0];
      const dismissIdx = block.indexOf('onDismiss()');
      const pressIdx = block.indexOf('await item.onPress()');
      expect(dismissIdx).toBeGreaterThan(-1);
      expect(pressIdx).toBeGreaterThan(dismissIdx);
    }
  });
});
