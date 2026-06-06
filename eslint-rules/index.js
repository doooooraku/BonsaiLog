'use strict';

/**
 * BonsaiLog local ESLint plugin (Sess66 PR3 起点)。
 *
 * eslint.config.js で `plugins: { local: require('./eslint-rules') }` で読み込み、
 * `rules: { 'local/<rule-name>': 'error' }` で有効化する。
 *
 * 提供 rule:
 *   - no-color-token-in-stylesheet (ADR-0052、 dark cascade 構造化)
 */

module.exports = {
  rules: {
    'no-color-token-in-stylesheet': require('./no-color-token-in-stylesheet'),
  },
};
