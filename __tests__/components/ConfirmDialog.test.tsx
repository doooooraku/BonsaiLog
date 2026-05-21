/**
 * ConfirmDialog 静的解析 test (ADR-0036 D1 / R-44 / R-45 整合)
 *
 * Sess23 PR-ζ-1-② で確立した 静的解析 test pattern を踏襲
 * (fs.readFileSync + regex matching、 expo-sqlite / RN 環境不要)。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(resolve(__dirname, '../../src/components/ConfirmDialog.tsx'), 'utf8');

describe('ConfirmDialog (ADR-0036 D1)', () => {
  test('1. react-native Modal を transparent + animationType="fade" で使用 (ADR-0036 D1)', () => {
    expect(SRC).toMatch(/import\s*\{[^}]*\bModal\b[^}]*\}\s*from\s*['"]react-native['"]/);
    expect(SRC).toMatch(/transparent[\s\n]/);
    expect(SRC).toMatch(/animationType="fade"/);
  });

  test('2. onRequestClose で Android Back キャンセル → onCancel (ADR-0036 D1)', () => {
    expect(SRC).toMatch(/onRequestClose=\{onCancel\}/);
  });

  test('3. backdrop tap で onCancel (Material 3 整合、 ADR-0036 D1)', () => {
    // 外側 Pressable に onPress={onCancel} 配線
    expect(SRC).toMatch(/style=\{styles\.backdrop\}\s*\n\s*onPress=\{onCancel\}/);
    // 内側 card は stopPropagation で gesture 独立
    expect(SRC).toMatch(/onPress=\{\(e\)\s*=>\s*e\.stopPropagation\(\)\}/);
  });

  test('4. accessibilityViewIsModal + accessibilityRole="alert" (WAI-ARIA Dialog Pattern + WCAG 2.1.1)', () => {
    expect(SRC).toMatch(/accessibilityViewIsModal/);
    expect(SRC).toMatch(/accessibilityRole="alert"/);
  });

  test('5. description は optional (ADR-0036 D4「desc 不要」 整合)', () => {
    // type で description?: string
    expect(SRC).toMatch(/description\?:\s*string/);
    // render では条件付き
    expect(SRC).toMatch(/description\s*\?\s*<ThemedText/);
  });

  test('6. destructive=true で DANGER 赤 button (削除等)', () => {
    expect(SRC).toMatch(/destructive\?:\s*boolean/);
    expect(SRC).toMatch(/buttonDestructive.*backgroundColor:\s*DANGER/s);
    expect(SRC).toMatch(/destructive\s*\?\s*styles\.buttonDestructive\s*:\s*styles\.buttonPrimary/);
  });

  test('7. Haptics.notificationAsync(Warning) を onConfirm 直前に発火 (ADR-0036 D6 / R-45)', () => {
    expect(SRC).toMatch(/import\s*\*\s*as\s*Haptics\s*from\s*['"]expo-haptics['"]/);
    expect(SRC).toMatch(/Haptics\.notificationAsync\(Haptics\.NotificationFeedbackType\.Warning\)/);
    // handleConfirm 内で Haptics → onConfirm 順
    const handleConfirmBlock = SRC.match(/const handleConfirm[\s\S]*?\};/);
    expect(handleConfirmBlock).not.toBeNull();
    if (handleConfirmBlock) {
      const block = handleConfirmBlock[0];
      const hapticsIdx = block.indexOf('Haptics.notificationAsync');
      const onConfirmIdx = block.indexOf('await onConfirm()');
      expect(hapticsIdx).toBeGreaterThan(-1);
      expect(onConfirmIdx).toBeGreaterThan(hapticsIdx);
    }
  });
});
