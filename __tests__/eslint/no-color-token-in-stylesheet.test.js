/**
 * Sess66 PR3 / ADR-0052: no-color-token-in-stylesheet ESLint rule の unit test。
 *
 * RuleTester (ESLint 公式) で valid / invalid pattern を網羅検証。
 * jest test runner 経由で実行 (`pnpm test`)。
 */

const { RuleTester } = require('eslint');
const rule = require('../../eslint-rules/no-color-token-in-stylesheet');

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-color-token-in-stylesheet', rule, {
  valid: [
    // ✅ Inline c.* 経由は OK
    {
      code: `
        const styles = StyleSheet.create({
          card: { padding: 16, borderRadius: 12 },
        });
      `,
    },
    // ✅ Theme-invariant token (ON_BRAND) は OK
    {
      code: `
        const styles = StyleSheet.create({
          badge: { color: ON_BRAND, backgroundColor: DANGER },
        });
      `,
    },
    // ✅ ACCENT_GOLD (Pro バッジ) は OK
    {
      code: `
        const styles = StyleSheet.create({
          proBadge: { backgroundColor: ACCENT_GOLD },
        });
      `,
    },
    // ✅ BRAND_GREEN (brand intent、 dark でも同色) は OK
    {
      code: `
        const styles = StyleSheet.create({
          cta: { backgroundColor: BRAND_GREEN },
        });
      `,
    },
    // ✅ inline style (StyleSheet.create() 外) は OK
    {
      code: `
        const Component = () => (
          <View style={{ backgroundColor: BG_PRIMARY, color: TEXT_PRIMARY }} />
        );
      `,
    },
    // ✅ 色プロパティ以外は OK
    {
      code: `
        const styles = StyleSheet.create({
          x: { width: BG_PRIMARY },
        });
      `,
    },
    // ✅ string literal は OK
    {
      code: `
        const styles = StyleSheet.create({
          x: { color: '#FFFFFF' },
        });
      `,
    },
  ],
  invalid: [
    // ❌ BG_PRIMARY in backgroundColor
    {
      code: `
        const styles = StyleSheet.create({
          card: { backgroundColor: BG_PRIMARY },
        });
      `,
      errors: [{ messageId: 'forbidden', data: { name: 'BG_PRIMARY', prop: 'backgroundColor' } }],
    },
    // ❌ TEXT_PRIMARY in color
    {
      code: `
        const styles = StyleSheet.create({
          title: { color: TEXT_PRIMARY },
        });
      `,
      errors: [{ messageId: 'forbidden', data: { name: 'TEXT_PRIMARY', prop: 'color' } }],
    },
    // ❌ BORDER_DEFAULT in borderColor
    {
      code: `
        const styles = StyleSheet.create({
          input: { borderColor: BORDER_DEFAULT },
        });
      `,
      errors: [{ messageId: 'forbidden', data: { name: 'BORDER_DEFAULT', prop: 'borderColor' } }],
    },
    // ❌ Spread 後の forbidden token も検出
    {
      code: `
        const styles = StyleSheet.create({
          label: { ...formRequired, color: BG_PRIMARY },
        });
      `,
      errors: [{ messageId: 'forbidden', data: { name: 'BG_PRIMARY', prop: 'color' } }],
    },
    // ❌ borderBottomColor 等の方向別 border 色も検出
    {
      code: `
        const styles = StyleSheet.create({
          toolbar: { borderBottomColor: BORDER_DEFAULT },
        });
      `,
      errors: [
        { messageId: 'forbidden', data: { name: 'BORDER_DEFAULT', prop: 'borderBottomColor' } },
      ],
    },
    // ❌ 複数違反を 1 オブジェクト内で検出
    {
      code: `
        const styles = StyleSheet.create({
          card: {
            backgroundColor: BG_SURFACE,
            borderColor: BORDER_DEFAULT,
            padding: 16,
          },
        });
      `,
      errors: [
        { messageId: 'forbidden', data: { name: 'BG_SURFACE', prop: 'backgroundColor' } },
        { messageId: 'forbidden', data: { name: 'BORDER_DEFAULT', prop: 'borderColor' } },
      ],
    },
    // ❌ TEXT_SECONDARY / TEXT_MUTED も検出
    {
      code: `
        const styles = StyleSheet.create({
          help: { color: TEXT_SECONDARY },
          muted: { color: TEXT_MUTED },
        });
      `,
      errors: [
        { messageId: 'forbidden', data: { name: 'TEXT_SECONDARY', prop: 'color' } },
        { messageId: 'forbidden', data: { name: 'TEXT_MUTED', prop: 'color' } },
      ],
    },
  ],
});

// RuleTester が pass すれば throw しない。 jest 経由で実行するため明示的 test を 1 つ書く。
describe('no-color-token-in-stylesheet ESLint rule', () => {
  test('valid + invalid pattern を RuleTester で検証完了', () => {
    expect(true).toBe(true); // RuleTester が throw しなければ pass
  });
});
