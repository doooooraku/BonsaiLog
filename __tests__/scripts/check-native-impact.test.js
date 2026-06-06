/**
 * Sess71 PR-1 / ADR-0046 Amendment: scripts/check-native-impact.mjs の unit test。
 *
 * Approach: 静的解析 (NATIVE_PATTERNS / JS_ONLY_PATTERNS 配列定義検証) + 実行 e2e (child_process.spawnSync で hook 経由 stdin JSON 送って stdout 検証)。
 *
 * jest CommonJS context で .mjs を直接 import すると --experimental-vm-modules が必要。
 * 既存 BonsaiLog test pattern (check-discuss-jargon.test.js) と整合し、 file source + spawn で検証する。
 *
 * 関連: docs/how-to/development/dev-workflow.md / R-61 起票
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCRIPT_PATH = path.join(__dirname, '../../scripts/check-native-impact.mjs');
const SRC = fs.readFileSync(SCRIPT_PATH, 'utf-8');

/**
 * hook 経由相当の stdin JSON を渡して script を実行、 verdict を抽出。
 * @param {string|string[]} filePathOrPaths
 * @returns {{stdout: string, stderr: string, status: number}}
 */
function runWithHookStdin(filePathOrPaths) {
  const filePaths = Array.isArray(filePathOrPaths) ? filePathOrPaths : [filePathOrPaths];
  const stdinJson = JSON.stringify({
    tool_input: { file_paths: filePaths },
  });
  const result = spawnSync('node', [SCRIPT_PATH, '--from=hook', '--dry-run'], {
    input: stdinJson,
    encoding: 'utf-8',
  });
  return result;
}

describe('check-native-impact.mjs 静的解析 (Sess71 PR-1)', () => {
  test('1. NATIVE_PATTERNS 配列定義あり (主要 native file pattern を網羅)', () => {
    expect(SRC).toMatch(/const NATIVE_PATTERNS = \[/);
    // 代表 5 つ確認
    expect(SRC).toMatch(/\/\^package\\\.json\$\//);
    expect(SRC).toMatch(/\/\^app\\\.json\$\//);
    expect(SRC).toMatch(/\/\^android\\\//);
    expect(SRC).toMatch(/\/\^ios\\\//);
    expect(SRC).toMatch(/\/\^eas\\\.json\$\//);
  });

  test('2. JS_ONLY_PATTERNS 配列定義あり (主要 JS file pattern を網羅)', () => {
    expect(SRC).toMatch(/const JS_ONLY_PATTERNS = \[/);
    // 代表 4 つ確認
    expect(SRC).toMatch(/constants\|src\|app\|components/);
    expect(SRC).toMatch(/\/\^docs\\\//);
    expect(SRC).toMatch(/\/\^__tests__\\\//);
    expect(SRC).toMatch(/\/\^\\\.claude\\\//);
  });

  test('3. classify 関数 export あり (hook/cli 共通核)', () => {
    expect(SRC).toMatch(/export function classify\(/);
  });

  test('4. classifyMany 関数 export あり (複数 file 全体判定)', () => {
    expect(SRC).toMatch(/export function classifyMany\(/);
  });

  test('5. flag file 操作の constant 定義あり (dist/.native-dirty)', () => {
    expect(SRC).toMatch(/dist\/\.native-dirty/);
  });

  test('6. unknown は安全側で native 扱い (R-61 整合)', () => {
    // verdict 判定で nativeFiles + unknownFiles 両方で native とする実装
    expect(SRC).toMatch(/nativeFiles\.length \+ unknownFiles\.length/);
  });

  test('7. --from=hook / --from=cli / --dry-run 引数サポート', () => {
    expect(SRC).toMatch(/--from=hook/);
    expect(SRC).toMatch(/--from=cli/);
    expect(SRC).toMatch(/--dry-run/);
  });
});

describe('check-native-impact.mjs hook 経由 e2e 実行 (Sess71 PR-1)', () => {
  test('1. package.json (single native) → Native impact detected', () => {
    const result = runWithHookStdin('package.json');
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Native impact detected/);
    expect(result.stdout).toMatch(/package\.json/);
  });

  test('2. constants/theme.ts (single JS-only) → JS-only changes', () => {
    const result = runWithHookStdin('constants/theme.ts');
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/JS-only changes/);
  });

  test('3. 複数 JS-only → js-only verdict', () => {
    const result = runWithHookStdin([
      'constants/theme.ts',
      'src/features/bonsai/BonsaiCard.tsx',
      'docs/reference/design_system.md',
    ]);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/JS-only changes/);
  });

  test('4. 1 つでも native → native verdict (混在)', () => {
    const result = runWithHookStdin([
      'constants/theme.ts',
      'package.json', // ← native
      'docs/adr/ADR-0046.md',
    ]);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Native impact detected/);
  });

  test('5. android/* → native verdict', () => {
    const result = runWithHookStdin('android/app/build.gradle');
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Native impact detected/);
  });

  test('6. ios/* → native verdict', () => {
    const result = runWithHookStdin('ios/Podfile');
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Native impact detected/);
  });

  test('7. unknown file → 安全側で native verdict (unknown_files 含む)', () => {
    const result = runWithHookStdin('some-random-file.bin');
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Native impact detected/);
    expect(result.stdout).toMatch(/unknown files \(safe-side native\)/);
  });

  test('8. 空 JSON → 何もしない', () => {
    const result = spawnSync('node', [SCRIPT_PATH, '--from=hook', '--dry-run'], {
      input: '{}',
      encoding: 'utf-8',
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/No file paths provided/);
  });

  test('9. 不正 JSON → エラー出力 + skip (exit 0)', () => {
    const result = spawnSync('node', [SCRIPT_PATH, '--from=hook', '--dry-run'], {
      input: 'not-a-json',
      encoding: 'utf-8',
    });
    expect(result.status).toBe(0);
    expect(result.stderr).toMatch(/JSON parse error/);
  });

  test('10. --dry-run で flag file を作成しない', () => {
    // 既存 flag が無いことを確認 (test 環境では普通無い)
    const flagPath = path.join(__dirname, '../../dist/.native-dirty');
    const existedBefore = fs.existsSync(flagPath);

    runWithHookStdin('package.json'); // --dry-run なので flag 作成しない

    const existedAfter = fs.existsSync(flagPath);
    expect(existedAfter).toBe(existedBefore); // 状態変化なし
  });
});
