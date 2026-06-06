/**
 * BottomCtaBar 静的解析 test (Sess72 PR-2 新設、 Sess73 PR-1 Amendment 追加)。
 *
 * 旧 FAB component の置換として、 inline 配置 + theme-aware bg + label 必須 + R-58 dark
 * cascade 整合の構造を静的に検証。 render-based test は他 component (Toast / ConfirmDialog 等)
 * と同じ静的解析 pattern を踏襲。
 *
 * Sess73 PR-1 Amendment (R-62 拡張 + ADR-0054 D2 改訂):
 * - height 72dp → 64dp (ADR-0054 D2 docs と旧実装 drift 解消)
 * - label lineHeight: 28 明示 (descender クリアランス、 g/p/q/y 見切れ防止)
 * - ThemedText numberOfLines={1} + adjustsFontSizeToFit minimumFontScale={0.85}
 *   (長文言語 ru / de / vi 等の overflow 防止)
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(
  resolve(__dirname, '../../../src/components/common/BottomCtaBar.tsx'),
  'utf8',
);

describe('BottomCtaBar (Sess72 PR-2 / Sess73 PR-1 Amendment、 ADR-0054 D2)', () => {
  test('1. BottomCtaBar function + BottomCtaBarProps type を export', () => {
    expect(SRC).toMatch(/export\s+function\s+BottomCtaBar\(/);
    expect(SRC).toMatch(/export\s+type\s+BottomCtaBarProps\s*=\s*\{/);
  });

  test('2. Props 必須 = label / onPress / testID、 optional = accessibilityLabel / icon / disabled', () => {
    expect(SRC).toMatch(/label:\s*string;/);
    expect(SRC).toMatch(/onPress:\s*\(\)\s*=>\s*void;/);
    expect(SRC).toMatch(/testID:\s*string;/);
    expect(SRC).toMatch(/accessibilityLabel\?:\s*string;/);
    expect(SRC).toMatch(/icon\?:\s*React\.ReactNode;/);
    expect(SRC).toMatch(/disabled\?:\s*boolean;/);
  });

  test('3. inline 配置 = position: absolute 不在 (R-62 Layout Contract 構造解決)', () => {
    expect(SRC).not.toMatch(/position:\s*['"]absolute['"]/);
    expect(SRC).not.toMatch(/right:\s*\d+/);
    expect(SRC).not.toMatch(/bottom:\s*tabBarHeight/);
  });

  test('4. theme-aware bg = useColors() + c.tint / c.onTint (R-58 dark cascade 整合)', () => {
    expect(SRC).toMatch(/useColors\(\)/);
    expect(SRC).toMatch(/c\.tint/);
    expect(SRC).toMatch(/c\.onTint/);
    expect(SRC).toMatch(/c\.disabledBg/);
  });

  test('5. raw color token (BRAND_GREEN / ON_BRAND) 直書きなし (R-58 構造禁止)', () => {
    expect(SRC).not.toMatch(/from\s+['"]@\/src\/core\/theme\/colors['"]/);
    expect(SRC).not.toMatch(/BRAND_GREEN[^_]/);
    expect(SRC).not.toMatch(/ON_BRAND[^_]/);
  });

  test('6. default icon = PlusIcon + label テキスト併記 (WCAG 2.4.6、 シニア発見性)', () => {
    expect(SRC).toMatch(/PlusIcon/);
    expect(SRC).toMatch(/icon\s*\?\?\s*</);
    expect(SRC).toMatch(/\{label\}/);
  });

  test('7. accessibilityLabel fallback = label (R-14 / WCAG 3.2.4 一貫識別)', () => {
    expect(SRC).toMatch(/accessibilityLabel\s*\?\?\s*label/);
  });

  test('8. disabled 状態 = opacity 0.5 + c.disabledBg (旧 FAB と挙動互換)', () => {
    expect(SRC).toMatch(/opacity:\s*disabled\s*\?\s*0\.5\s*:\s*1/);
    expect(SRC).toMatch(/disabled\s*\?\s*c\.disabledBg\s*:\s*c\.tint/);
  });

  test('9. height 64 + borderRadius 14 (Sess73 PR-1 Amendment、 ADR-0054 D2 docs 整合)', () => {
    // height 72 (旧 Sess72 値) は drift。 Sess73 PR-1 で 64dp に統一 (ADR-0054 D2 改訂)。
    expect(SRC).toMatch(/height:\s*64/);
    expect(SRC).not.toMatch(/height:\s*72/);
    expect(SRC).toMatch(/borderRadius:\s*14/);
  });

  test('10. paddingHorizontal 16 (画面端からの余白、 emptyCtaWrap 整合)', () => {
    expect(SRC).toMatch(/paddingHorizontal:\s*16/);
  });

  test('11. accessibilityRole + accessibilityState で a11y 完備', () => {
    expect(SRC).toMatch(/accessibilityRole="button"/);
    expect(SRC).toMatch(/accessibilityState=\{\{\s*disabled\s*\}\}/);
  });

  test('12. label lineHeight 28 明示 (Sess73 R-62 拡張: descender g/p/q/y クリアランス)', () => {
    // fontSize 20 × 1.4 = 28、 en「Register new bonsai」 / 「Log a care event」 等の g
    // 見切れ防止 (Latin descender 文字全 19 言語に効く)。
    expect(SRC).toMatch(/lineHeight:\s*28/);
  });

  test('13. label に numberOfLines={1} (Sess73 R-62 拡張: 長文言語 1 行維持)', () => {
    // ru「Запланировать задачи」 / de / vi で 2 行折返し → height 64 で overflow 防止。
    expect(SRC).toMatch(/numberOfLines=\{1\}/);
  });

  test('14. label に adjustsFontSizeToFit + minimumFontScale 0.85 (Sess73 R-62 拡張)', () => {
    // 1 行維持しつつ font 自動縮小 (20px → 最低 17px) で長文言語の overflow 構造解消。
    expect(SRC).toMatch(/adjustsFontSizeToFit/);
    expect(SRC).toMatch(/minimumFontScale=\{0\.85\}/);
  });
});
