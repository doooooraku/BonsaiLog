/**
 * i18n-unused-keys.mjs 静的解析 test (#1180、__tests__/scripts の既存パターン踏襲)。
 *
 * E2E 実行は実装時に手動確認済 (#1180 開発ログ):
 *   初版は worktree 実行で除外条件が全ファイル一致 → 931/1001 誤検知 → 相対 path 判定に修正後
 *   188 件 (動的 prefix 16 種除外、false positive 0 を workLogNotePlaceholder_ 等で実証)。
 *
 * 本 test は構造契約の静的検証:
 * 1. 相対 path で除外判定している (絶対 path 判定への退行 = worktree 全除外バグの再発防止)
 * 2. 動的 prefix 許容リストに実在の組み立て prefix が含まれる
 * 3. default は warn (exit 0)、--strict でのみ exit 1
 */
const fs = require('node:fs');
const path = require('node:path');

const SRC = fs.readFileSync(path.join(__dirname, '../../scripts/i18n-unused-keys.mjs'), 'utf8');

describe('i18n-unused-keys.mjs 構造契約 (#1180)', () => {
  test('除外判定は ROOT 相対 path (worktree 実行での全除外バグ再発防止)', () => {
    expect(SRC).toContain('path.relative(ROOT, p)');
    expect(SRC).toMatch(/rel\.includes\(part\)/);
  });

  test('動的 prefix 許容リストに実在の組み立て prefix を含む', () => {
    for (const prefix of [
      'eventType_',
      'bonsaiStyle_',
      'workLogNotePlaceholder_', // getWorkLogNotePlaceholderKey 由来 (初版で漏れ → 14 キー誤検知)
      'recurringPreset',
    ]) {
      expect(SRC).toContain(`'${prefix}'`);
    }
  });

  test('default = warn 運用 (exit 0)、--strict でのみ exit 1', () => {
    expect(SRC).toContain("process.argv.includes('--strict') ? 1 : 0");
  });

  test('「即削除しない」運用注意が出力に含まれる (意図的残置の保護)', () => {
    expect(SRC).toContain('即削除しない');
  });
});
