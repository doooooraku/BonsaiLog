'use strict';

/**
 * Sess66 PR3 / ADR-0052: dark theme cascade — theme-dependent color token を StyleSheet.create()
 * 内で使うことを禁止し、 inline c.* (useColors hook 経由) を強制する custom rule。
 *
 * 検出パターン:
 *   StyleSheet.create({ key: { color: TEXT_PRIMARY } })                 // ❌
 *   StyleSheet.create({ key: { backgroundColor: BG_PRIMARY } })         // ❌
 *   StyleSheet.create({ key: { borderColor: BORDER_DEFAULT } })         // ❌
 *   StyleSheet.create({ key: { ...formRequired, color: BG_PRIMARY } })  // ❌ (spread 後の prop も検査)
 *
 * 違反しない例:
 *   StyleSheet.create({ key: { color: ON_BRAND } })                     // ✅ theme-invariant token は OK
 *   <View style={{ backgroundColor: c.background }} />                  // ✅ inline は OK
 *
 * Theme-dependent tokens (forbidden inside StyleSheet.create()):
 *   - BG_PRIMARY / BG_SURFACE — light=washi/surface dark=navy/dark-surface
 *   - TEXT_PRIMARY / TEXT_SECONDARY / TEXT_MUTED / TEXT_DEFAULT — light=sumi dark=cream
 *   - BORDER_DEFAULT / BORDER_STRONG — light=cream dark=navy
 *
 * Theme-invariant tokens (allowed everywhere):
 *   - ON_BRAND (#FFFFFF, brand 上の白文字) / ACCENT_GOLD (Pro バッジ) / ACCENT_BARK
 *   - DANGER / SUCCESS / OVERLIMIT (status 色は意図的に固定)
 *   - DISABLED_BG / HEATMAP_COLORS
 *   - BADGE_SOFT_BG / BADGE_SOFT_TEXT / BUTTON_SECONDARY_BG / BUTTON_SECONDARY_TEXT (brand-static)
 *   - BRAND_GREEN / BRAND_GREEN_HOVER / BRAND_GREEN_BG (CTA primary、 dark でも同色 brand intent)
 *
 * Color-related style props (検査対象):
 *   color / backgroundColor / borderColor (4 方向含む) / shadowColor / tintColor /
 *   overlayColor / placeholderTextColor / selectionColor / underlineColorAndroid
 *
 * 関連: ADR-0052 / docs/reference/design_system.md §2 / R-58 dark cascade verify
 */

const FORBIDDEN_TOKENS = new Set([
  'BG_PRIMARY',
  'BG_SURFACE',
  'TEXT_PRIMARY',
  'TEXT_SECONDARY',
  'TEXT_MUTED',
  'TEXT_DEFAULT',
  'BORDER_DEFAULT',
  'BORDER_STRONG',
]);

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
        'Forbid theme-dependent color tokens (BG_PRIMARY, TEXT_PRIMARY, BORDER_DEFAULT, etc.) inside StyleSheet.create(). Use inline c.* via useColors() for dark mode cascade.',
      recommended: true,
    },
    messages: {
      forbidden:
        "Theme-dependent color token '{{name}}' must NOT appear in StyleSheet.create() ('{{prop}}' prop). " +
        'Move to inline style via useColors() — e.g. `style={[styles.x, {{ "{ " }}{{prop}}: c.background{{ " }" }}]}`. ' +
        'Reason: static tokens do not follow dark mode (ADR-0052).',
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

        // 2) Value must be a forbidden token identifier.
        if (node.value.type !== 'Identifier') return;
        if (!FORBIDDEN_TOKENS.has(node.value.name)) return;

        // 3) Only flag occurrences inside StyleSheet.create(...).
        if (!isInsideStyleSheetCreate(node)) return;

        context.report({
          node: node.value,
          messageId: 'forbidden',
          data: { name: node.value.name, prop: keyName },
        });
      },
    };
  },
};
