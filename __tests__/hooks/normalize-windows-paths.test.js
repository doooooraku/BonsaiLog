/**
 * Sess108 案 1 (ADR-0063 Stage A): normalize-windows-paths.mjs hook の unit test
 *
 * spawnSync で hook を実プロセスとして起動して stdin -> stdout を検証。
 * 4 ケース: (a) Windows Downloads → 変換、 (b) WSL UNC → 変換、
 *        (c) D:\ → 変換なし、 (d) tool_name=Write → exit 0 (副作用なし)
 *
 * NOTE: spec は .test.mjs を提示していたが Jest default testMatch は .mjs を拾わないため
 *       .test.js + spawnSync で hook を別 process 起動する形に変更。
 */
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const HOOK = path.join(__dirname, '../../.claude/hooks/normalize-windows-paths.mjs');

function runHook(input) {
  const result = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(input),
    encoding: 'utf8',
    timeout: 5000,
  });
  return result;
}

describe('normalize-windows-paths.mjs (Sess108 案 1, ADR-0063 Stage A)', () => {
  test('(a) Windows Downloads path → /mnt/c/... に変換', () => {
    const r = runHook({
      tool_name: 'Read',
      tool_input: { file_path: 'C:\\Users\\doooo\\Downloads\\foo.png' },
    });
    expect(r.status).toBe(0);
    expect(r.stdout.trim().length).toBeGreaterThan(0);
    const out = JSON.parse(r.stdout);
    expect(out.hookSpecificOutput.hookEventName).toBe('PreToolUse');
    expect(out.hookSpecificOutput.toolInput.file_path).toBe('/mnt/c/Users/doooo/Downloads/foo.png');
  });

  test('(b) WSL UNC path → Linux path に変換', () => {
    const r = runHook({
      tool_name: 'Read',
      tool_input: {
        file_path: '\\\\wsl.localhost\\Ubuntu\\home\\doooo\\BonsaiLog\\dist\\foo.png',
      },
    });
    expect(r.status).toBe(0);
    expect(r.stdout.trim().length).toBeGreaterThan(0);
    const out = JSON.parse(r.stdout);
    expect(out.hookSpecificOutput.toolInput.file_path).toBe('/home/doooo/BonsaiLog/dist/foo.png');
  });

  test('(c) D:\\ などホワイトリスト外は変換なし (silent passthrough)', () => {
    const r = runHook({
      tool_name: 'Read',
      tool_input: { file_path: 'D:\\Users\\someone\\foo.png' },
    });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('');
  });

  test('(d) tool_name=Write は変換しない (Read 専用)', () => {
    const r = runHook({
      tool_name: 'Write',
      tool_input: { file_path: 'C:\\Users\\doooo\\Downloads\\foo.png', content: '' },
    });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('');
  });

  test('(e) Linux path はそのまま通過 (副作用ゼロ)', () => {
    const r = runHook({
      tool_name: 'Read',
      tool_input: { file_path: '/home/doooo/foo.txt' },
    });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('');
  });

  test('(f) 不正 JSON でも exit 0 (Claude を絶対に壊さない)', () => {
    const result = spawnSync(process.execPath, [HOOK], {
      input: 'not-json',
      encoding: 'utf8',
      timeout: 5000,
    });
    expect(result.status).toBe(0);
  });
});
