'use strict';

/**
 * BonsaiLog local ESLint plugin (Sess66 PR3 起点、 Sess70 PR-D 拡張)。
 *
 * eslint.config.js で `plugins: { local: require('./eslint-rules') }` で読み込み、
 * `rules: { 'local/<rule-name>': 'error' }` で有効化する。
 *
 * 提供 rule:
 *   - no-color-token-in-stylesheet (ADR-0052、 dark cascade 構造化)
 *     - Sess66 PR3 起点 (8 種 FORBIDDEN)、 Sess70 PR-D で brand-static 撤回 (+8 種 = 16 種)
 *   - no-color-hex-literal-in-stylesheet (ADR-0052 Amendment Sess70 PR-D、 hex literal 禁止)
 *     - StyleSheet 内の `'#RGB'` / `'#RRGGBB'` / `'#RRGGBBAA'` literal を error 禁止
 *     - 例外: `'transparent'` / `'rgba()'` 半透明 / 写真 overlay reason marker (5 件以下上限)
 */

module.exports = {
  rules: {
    'no-color-token-in-stylesheet': require('./no-color-token-in-stylesheet'),
    'no-color-hex-literal-in-stylesheet': require('./no-color-hex-literal-in-stylesheet'),
  },
};
