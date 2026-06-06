'use strict';

/**
 * Sess70 PR-D / ADR-0052 Amendment: StyleSheet.create() 内の hex literal 直書きを禁止し、
 * inline c.* (useColors hook 経由) を強制する custom rule。
 *
 * Sess69 PR-A で確立した `local/no-color-token-in-stylesheet` の盲点を埋める姉妹 rule。
 * 既存 rule は token 名 base のため raw hex literal (`'#FFFFFF'` / `'#F5EEDD'` 等) を見逃した。
 * Sess69 で 4 file (BonsaiTimelineTab:246 / EventRowCompact:143 / EventRowDetailed:309 /
 * SearchResultRows:226) が hex 直書きで cascade 漏れしていた事実が判明 → 本 rule で構造禁止。
 *
 * 検出パターン (`StyleSheet.create()` 内、 COLOR_PROPS の value が hex literal):
 *   StyleSheet.create({ key: { color: '#FFFFFF' } })              // ❌
 *   StyleSheet.create({ key: { backgroundColor: '#F5EEDD' } })    // ❌
 *   StyleSheet.create({ key: { borderColor: '#1F3A2E' } })        // ❌
 *
 * 違反しない例:
 *   <View style={{ backgroundColor: c.surface }} />               // ✅ inline c.*
 *   StyleSheet.create({ key: { backgroundColor: 'transparent' } }) // ✅ transparent literal
 *   StyleSheet.create({ key: { backgroundColor: 'rgba(0,0,0,0.06)' } }) // ✅ 半透明 overlay
 *
 * 例外 marker 規約 (Sess70 PR-D Amendment、 5 件以下上限):
 *   // eslint-disable-next-line local/no-color-hex-literal-in-stylesheet
 *   //   reason: 写真 overlay 上の固定白文字 (両 theme で背景 = 写真)
 *   color: '#FFFFFF',
 *
 *   marker は `reason: <一文>` 必須、 5 件以下上限 (`scripts/check-eslint-disable-count.mjs` で CI 監視)。
 *   例外用途: 写真 overlay text 固定 / PDF/SVG export 紙白固定 / Pro 金 badge 上 ON_BRAND 文字。
 *
 * 関連: ADR-0052 Amendment (Sess70 PR-D) / R-59 (新) hex literal 禁止
 */

const COLOR_PROPS = new Set([
  'color',
  'backgroundColor',
  'borderColor',
  'borderBottomColor',
  'borderTopColor',
  'borderLeftColor',
  'borderRightColor',
  'borderStartColor',
  'borderEndColor',
  'shadowColor',
  'tintColor',
  'overlayColor',
  'placeholderTextColor',
  'selectionColor',
  'underlineColorAndroid',
]);

/** hex literal 検出 (#RGB / #RRGGBB / #RRGGBBAA 形式)。 大文字小文字無視。 */
const HEX_LITERAL_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/** Walk up the AST to determine whether node is inside a `StyleSheet.create(...)` call. */
function isInsideStyleSheetCreate(node) {
  let current = node.parent;
  while (current) {
    if (
      current.type === 'CallExpression' &&
      current.callee &&
      current.callee.type === 'MemberExpression' &&
      current.callee.object &&
      current.callee.object.type === 'Identifier' &&
      current.callee.object.name === 'StyleSheet' &&
      current.callee.property &&
      current.callee.property.type === 'Identifier' &&
      current.callee.property.name === 'create'
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid raw hex color literals (e.g. "#FFFFFF", "#F5EEDD") inside StyleSheet.create(). Use inline c.* via useColors() for dark mode cascade.',
      recommended: true,
    },
    messages: {
      forbidden:
        "Raw hex color literal '{{value}}' must NOT appear in StyleSheet.create() ('{{prop}}' prop). " +
        'Move to inline style via useColors() — e.g. `style={[styles.x, {{ "{ " }}{{prop}}: c.surface{{ " }" }}]}`. ' +
        'Exception (5 件以下上限): add `// eslint-disable-next-line local/no-color-hex-literal-in-stylesheet // reason: <一文>` marker for fixed-background overlay text (e.g., 写真 overlay / PDF export / Pro badge gold bg). Reason: hex literals do not follow dark mode (ADR-0052 Amendment Sess70 PR-D).',
    },
    schema: [],
  },
  create(context) {
    return {
      Property(node) {
        // 1) Key must be a color-related style prop name.
        const keyName =
          node.key.type === 'Identifier'
            ? node.key.name
            : node.key.type === 'Literal'
              ? node.key.value
              : null;
        if (!keyName || !COLOR_PROPS.has(keyName)) return;

        // 2) Value must be a hex literal string.
        if (node.value.type !== 'Literal') return;
        if (typeof node.value.value !== 'string') return;
        if (!HEX_LITERAL_RE.test(node.value.value)) return;

        // 3) Only flag occurrences inside StyleSheet.create(...).
        if (!isInsideStyleSheetCreate(node)) return;

        context.report({
          node: node.value,
          messageId: 'forbidden',
          data: { value: node.value.value, prop: keyName },
        });
      },
    };
  },
};
