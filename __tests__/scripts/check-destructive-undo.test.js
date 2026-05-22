/**
 * check-destructive-undo.mjs 静的解析 test (Sess26 PR-η-3、 ADR-0036 R-44 自動検出)。
 */
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const SRC = readFileSync(resolve(__dirname, '../../scripts/check-destructive-undo.mjs'), 'utf8');

describe('check-destructive-undo.mjs (Sess26 PR-η-3、 R-44 自動検出)', () => {
  test('1. 破壊的関数 5 件を検出対象に登録', () => {
    const match = SRC.match(/const\s+DESTRUCTIVE_FNS\s*=\s*\[[^\]]+\]/);
    expect(match).not.toBeNull();
    if (match) {
      const list = match[0];
      [
        'bulkSoftDeleteEvents',
        'softDeleteEvent',
        'purgeOldTrash',
        'deleteEventHard',
        'restoreEvents',
      ].forEach((fn) => {
        expect(list).toContain(`'${fn}'`);
      });
    }
  });

  test('2. UNDO_CALL pattern = useToastStore.getState().show( (Sess27 PR-7: showUndoToast 撤回後)', () => {
    expect(SRC).toMatch(/const\s+UNDO_CALL\s*=\s*['"]useToastStore\.getState\(\)\.show\(['"]/);
  });

  test('3. scan 対象 dir = app / src/features / src/components', () => {
    const match = SRC.match(/const\s+SCAN_DIRS\s*=\s*\[[^\]]+\]/);
    expect(match).not.toBeNull();
    if (match) {
      ['app', 'src/features', 'src/components'].forEach((d) => {
        expect(match[0]).toContain(`'${d}'`);
      });
    }
  });

  test('4. 除外 path: src/dev / src/db / src/services / src/features/notification / test', () => {
    // EXCLUDE_PATH_PATTERNS に主要除外 path が含まれる
    expect(SRC).toMatch(/\/src\\\/dev\\\//);
    expect(SRC).toMatch(/\/src\\\/db\\\//);
    expect(SRC).toMatch(/\/src\\\/services\\\//);
    expect(SRC).toMatch(/\/src\\\/features\\\/notification\\\//);
    expect(SRC).toMatch(/\/__tests__\\\//);
    expect(SRC).toMatch(/\\\.test\\\.\(ts\|tsx\|js\|jsx\)\$/);
  });

  test('5. comment / import / type 定義行は除外 (false positive 防止)', () => {
    expect(SRC).toMatch(/\/\^\\s\*\\\/\\\//); // // comment
    expect(SRC).toMatch(/\/\^\\s\*\\\*/); // * jsdoc
    expect(SRC).toMatch(/\/\^\\s\*import\\b/); // import
  });

  test('6. exit code 1 で違反検出 (CI ブロック)', () => {
    expect(SRC).toMatch(
      /process\.exit\(Object\.keys\(violationsByFile\)\.length\s*>\s*0\s*\?\s*1\s*:\s*0\)/,
    );
  });

  test('7. --json option で CI 連携可能', () => {
    expect(SRC).toMatch(/--json/);
    expect(SRC).toMatch(/JSON\.stringify/);
  });

  test('8. 違反検出時に Next steps ガイド (Toast.show 呼出 or 除外 path 追加)', () => {
    // Sess27 PR-7 で showUndoToast 撤回 → 同 file 内 Toast.show callsite を検出
    expect(SRC).toMatch(/Toast\.show/);
    expect(SRC).toMatch(/EXCLUDE_PATH_PATTERNS/);
  });
});
