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
 * Theme-invariant tokens (allowed everywhere、 Sess70 PR-D で大幅縮小):
 *   - ON_BRAND (#FFFFFF, brand 上の白文字、 light 専用) / ACCENT_GOLD (Pro バッジ専用)
 *   - DANGER / SUCCESS / OVERLIMIT (status 色は意図的に固定)
 *   - HEATMAP_COLORS (F-04 専用 4 色、 ADR-0013 固定)
 *
 * Sess70 PR-D で FORBIDDEN に昇格 (brand-static 撤回、 ADR-0015/0052 Sess69 PR-A Amendment 整合):
 *   - BRAND_GREEN / BRAND_GREEN_HOVER / BRAND_GREEN_BG (dark で深緑 #1F3A2E 沈み)
 *   - BADGE_SOFT_BG / BADGE_SOFT_TEXT (dark で薄緑 #E8F0EA 浮き)
 *   - BUTTON_SECONDARY_BG / BUTTON_SECONDARY_TEXT (同上)
 *   - DISABLED_BG (dark で #9E9E9E 灰色が意図不明)
 *   - ACCENT_BARK (dark で深茶 #5A4637 沈み → dark warm #A1886F)
 *   → 全 16 種を inline c.tint / c.tintSubtle / c.badgeBg / c.buttonSecondaryBg / c.disabledBg /
 *     c.accentBark 経由必須化、 useColors hook 戻り値 7 prop (PR-A) 利用
 *
 * Color-related style props (検査対象):
 *   color / backgroundColor / borderColor (4 方向含む) / shadowColor / tintColor /
 *   overlayColor / placeholderTextColor / selectionColor / underlineColorAndroid
 *
 * 関連: ADR-0052 (Sess70 PR-D で Allowed 縮小) / docs/reference/design_system.md §2 / R-58 拡張 (Sess70)
 */

const FORBIDDEN_TOKENS = new Set([
  // Sess66 PR3 (8 種): theme-dependent base color
  'BG_PRIMARY',
  'BG_SURFACE',
  'TEXT_PRIMARY',
  'TEXT_SECONDARY',
  'TEXT_MUTED',
  'TEXT_DEFAULT',
  'BORDER_DEFAULT',
  'BORDER_STRONG',
  // Sess70 PR-D 追加 (8 種): brand-static 撤回 (ADR-0015/0052 Sess69 PR-A Amendment 整合)
  'BRAND_GREEN',
  'BRAND_GREEN_HOVER',
  'BRAND_GREEN_BG',
  'BADGE_SOFT_BG',
  'BADGE_SOFT_TEXT',
  'BUTTON_SECONDARY_BG',
  'BUTTON_SECONDARY_TEXT',
  'DISABLED_BG',
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
