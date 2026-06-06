/**
 * Sess70 PR-D / ADR-0052 Amendment: no-color-hex-literal-in-stylesheet ESLint rule の unit test。
 *
 * RuleTester (ESLint 公式) で valid / invalid pattern を網羅検証。
 * jest test runner 経由で実行 (`pnpm test`)。
 */

const { RuleTester } = require('eslint');
const rule = require('../../eslint-rules/no-color-hex-literal-in-stylesheet');

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-color-hex-literal-in-stylesheet', rule, {
  valid: [
    // ✅ Inline c.* 経由は OK
    {
      code: `
        const styles = StyleSheet.create({
          card: { padding: 16, borderRadius: 12 },
        });
      `,
    },
    // ✅ 'transparent' literal は OK (theme-invariant)
    {
      code: `
        const styles = StyleSheet.create({
          x: { backgroundColor: 'transparent' },
        });
      `,
    },
    // ✅ 'rgba()' 半透明 overlay は OK (theme-invariant)
    {
      code: `
        const styles = StyleSheet.create({
          backdrop: { backgroundColor: 'rgba(0,0,0,0.5)' },
        });
      `,
    },
    // ✅ token (Identifier) は本 rule の対象外 (no-color-token-in-stylesheet が別 rule で検出)
    {
      code: `
        const styles = StyleSheet.create({
          x: { backgroundColor: ACCENT_GOLD, color: ON_BRAND },
        });
      `,
    },
    // ✅ 色プロパティ以外の hex literal は OK (本 rule は color props のみ対象)
    {
      code: `
        const styles = StyleSheet.create({
          x: { width: '#FFFFFF' },
        });
      `,
    },
    // ✅ inline style (StyleSheet.create() 外) は OK
    {
      code: `
        const Component = () => (
          <View style={{ backgroundColor: '#FFFFFF', color: '#000000' }} />
        );
      `,
    },
  ],
  invalid: [
    // ❌ hex 6 桁 '#FFFFFF' in color
    {
      code: `
        const styles = StyleSheet.create({
          x: { color: '#FFFFFF' },
        });
      `,
      errors: [{ messageId: 'forbidden', data: { value: '#FFFFFF', prop: 'color' } }],
    },
    // ❌ hex 6 桁 '#F5EEDD' (washi 系) in backgroundColor
    {
      code: `
        const styles = StyleSheet.create({
          row: { backgroundColor: '#F5EEDD' },
        });
      `,
      errors: [{ messageId: 'forbidden', data: { value: '#F5EEDD', prop: 'backgroundColor' } }],
    },
    // ❌ hex 6 桁 lowercase
    {
      code: `
        const styles = StyleSheet.create({
          x: { color: '#1f3a2e' },
        });
      `,
      errors: [{ messageId: 'forbidden', data: { value: '#1f3a2e', prop: 'color' } }],
    },
    // ❌ hex 3 桁 '#000' in shadowColor
    {
      code: `
        const styles = StyleSheet.create({
          x: { shadowColor: '#000' },
        });
      `,
      errors: [{ messageId: 'forbidden', data: { value: '#000', prop: 'shadowColor' } }],
    },
    // ❌ hex 8 桁 (with alpha)
    {
      code: `
        const styles = StyleSheet.create({
          x: { backgroundColor: '#FFFFFFAA' },
        });
      `,
      errors: [{ messageId: 'forbidden', data: { value: '#FFFFFFAA', prop: 'backgroundColor' } }],
    },
    // ❌ borderColor / borderBottomColor 等の方向別も検出
    {
      code: `
        const styles = StyleSheet.create({
          input: { borderColor: '#D9D1BF', borderBottomColor: '#8A8274' },
        });
      `,
      errors: [
        { messageId: 'forbidden', data: { value: '#D9D1BF', prop: 'borderColor' } },
        { messageId: 'forbidden', data: { value: '#8A8274', prop: 'borderBottomColor' } },
      ],
    },
    // ❌ 複数違反を 1 オブジェクト内で検出
    {
      code: `
        const styles = StyleSheet.create({
          card: {
            backgroundColor: '#FFFFFF',
            borderColor: '#D9D1BF',
            color: '#1A1A1A',
            padding: 16,
          },
        });
      `,
      errors: [
        { messageId: 'forbidden', data: { value: '#FFFFFF', prop: 'backgroundColor' } },
        { messageId: 'forbidden', data: { value: '#D9D1BF', prop: 'borderColor' } },
        { messageId: 'forbidden', data: { value: '#1A1A1A', prop: 'color' } },
      ],
    },
  ],
});

// RuleTester が pass すれば throw しない。 jest 経由で実行するため明示的 test を 1 つ書く。
describe('no-color-hex-literal-in-stylesheet ESLint rule (Sess70 PR-D)', () => {
  test('valid + invalid pattern を RuleTester で検証完了', () => {
    expect(true).toBe(true); // RuleTester が throw しなければ pass
  });
});
