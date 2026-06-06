#!/usr/bin/env node
/**
 * Sess71 PR-1 / ADR-0046 Amendment: 編集 file が Native 影響か JS-only か判定し、
 * dist/.native-dirty flag file を操作する共通核 (Claude Code hook + pnpm script から共有)。
 *
 * 設計の核 (本 plan ok-1-playful-fern.md 整合):
 * - 入力 (--from=hook): Claude Code PostToolUse hook 経由、 stdin JSON で file path 受信
 * - 入力 (--from=cli): 起動 script (reload-app.sh / dev-start.sh) 経由、 git diff で変更検出
 * - 判定: NATIVE_PATTERNS / JS_PATTERNS 配列で file path match
 * - 出力: 影響あれば `dist/.native-dirty` flag file 作成、 影響なければ touch しない
 *   (flag 削除は build 完了後の起動 script 責務、 本 script は flag 作成のみ)
 *
 * 設計原理 (R-61 起票候補):
 * - 「人間判定 → 機械判定 + 安全網」 を BonsaiLog 共通設計原理化
 * - Claude Code が file 編集する時点で判定が確定する (人間が「念のため」 と悩む必要なし)
 *
 * Usage:
 *   # Claude Code PostToolUse hook 経由
 *   echo '{"tool_input":{"file_path":"package.json"}}' | node scripts/check-native-impact.mjs --from=hook
 *
 *   # 起動 script 経由 (git diff base = HEAD~1 or unstaged)
 *   node scripts/check-native-impact.mjs --from=cli [--base=HEAD~1]
 *
 *   # dry-run (実際の flag 操作はせず判定結果のみ表示)
 *   node scripts/check-native-impact.mjs --from=hook --dry-run
 *
 * Exit code:
 *   0: 判定完了 (flag 状態は出力 message に反映)
 *   1: 入力エラー / 異常
 *
 * 関連: ADR-0046 Amendment Sess71 / R-61 起票 / docs/how-to/development/dev-workflow.md
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { execSync } from 'node:child_process';

// =============================================================================
// 判定ルール (NATIVE_PATTERNS / JS_PATTERNS)
// =============================================================================

/**
 * Native 影響あり = build 必要 (flag 立てる) — minimatch 風 glob を簡易正規表現で表現。
 * 拡張時は本配列に追加するだけ (R-61 整合: 個別判断ではなく rule 集中管理)。
 */
const NATIVE_PATTERNS = [
  /^package\.json$/, // deps 変更時 (scripts 変更のみは別途 git diff で判定するのが理想だが安全側で flag)
  /^pnpm-lock\.yaml$/, // 同上
  /^app\.json$/,
  /^app\.config\.(js|ts|mjs|cjs)$/,
  /^android\//, // android/** 全配下
  /^ios\//,
  /^patches\//,
  /^plugins\//, // Expo plugin
  /^eas\.json$/,
  /^metro\.config\.(js|ts|cjs|mjs)$/,
  /^babel\.config\.(js|ts|cjs|mjs)$/,
  /^expo-env\.d\.ts$/,
];

/**
 * JS-only = build 不要 (flag 立てない) — 明示的に JS-only と判定したいパターン。
 * NATIVE_PATTERNS に該当しない file は default で JS-only 扱いだが、 grey zone を
 * 明示的に通すための補助 (将来追加 native pattern による誤判定の防壁)。
 */
const JS_ONLY_PATTERNS = [
  /^(constants|src|app|components)\/.*\.(tsx?|jsx?)$/,
  /^(constants|src|app|components)\/.*\.(json|css|svg)$/, // 静的 asset
  /^assets\//,
  /^docs\//,
  /\.md$/,
  /^eslint-rules\//,
  /^__tests__\//,
  /^\.claude\//,
  /^scripts\//, // build 系は別途、 本 script 自身も含む
  /^\.github\//,
  /^\.gitignore$/,
  /^\.prettierrc/,
  /^\.lintstagedrc/,
  /^README/,
];

// =============================================================================
// 判定関数
// =============================================================================

/**
 * file path を Native 影響 / JS-only / unknown のいずれかに分類。
 * @param {string} filePath - リポジトリ root からの相対パス (例: "package.json")
 * @returns {'native'|'js-only'|'unknown'}
 */
export function classify(filePath) {
  // 1) NATIVE_PATTERNS 優先 (誤って JS_ONLY と一致する case で安全側に振る)
  for (const pat of NATIVE_PATTERNS) {
    if (pat.test(filePath)) return 'native';
  }
  // 2) JS_ONLY_PATTERNS 明示一致
  for (const pat of JS_ONLY_PATTERNS) {
    if (pat.test(filePath)) return 'js-only';
  }
  // 3) どちらにも一致しない → unknown (安全側で native 扱い、 log に出して NATIVE_PATTERNS 拡張候補)
  return 'unknown';
}

/**
 * 複数 file から全体判定。 1 つでも native があれば native。
 * @param {string[]} filePaths
 * @returns {{verdict: 'native'|'js-only', nativeFiles: string[], unknownFiles: string[]}}
 */
export function classifyMany(filePaths) {
  const nativeFiles = [];
  const unknownFiles = [];
  for (const fp of filePaths) {
    const c = classify(fp);
    if (c === 'native') nativeFiles.push(fp);
    else if (c === 'unknown') unknownFiles.push(fp);
  }
  // unknown は安全側で native 扱い (R-61 整合: 機械判定 + 安全網)
  const verdict = nativeFiles.length + unknownFiles.length > 0 ? 'native' : 'js-only';
  return { verdict, nativeFiles, unknownFiles };
}

// =============================================================================
// 入力 reader (hook / cli)
// =============================================================================

function readStdinSync() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

/**
 * Claude Code PostToolUse hook 経由 (stdin JSON) で file path を取得。
 * @returns {string[]}
 */
function readFromHook() {
  const raw = readStdinSync();
  if (!raw.trim()) return [];
  try {
    const json = JSON.parse(raw);
    // Claude Code hook の JSON schema は tool_input.file_path or tool_input.file_paths
    const ti = json.tool_input ?? json.toolInput ?? {};
    if (typeof ti.file_path === 'string') return [ti.file_path];
    if (Array.isArray(ti.file_paths)) return ti.file_paths.filter((p) => typeof p === 'string');
    return [];
  } catch (err) {
    process.stderr.write(`[check-native-impact] stdin JSON parse error: ${err.message}\n`);
    return [];
  }
}

/**
 * git diff 経由 (CLI from script) で file path リストを取得。
 * @param {string} base - git diff base (default: HEAD)
 * @returns {string[]}
 */
function readFromCli(base = 'HEAD') {
  try {
    // unstaged + staged + recent commit を網羅 (起動時 check の用途)
    const stdout = execSync(`git diff --name-only ${base} -- . 2>/dev/null || true`, {
      encoding: 'utf8',
    });
    return stdout
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  } catch (err) {
    process.stderr.write(`[check-native-impact] git diff error: ${err.message}\n`);
    return [];
  }
}

// =============================================================================
// flag file 操作
// =============================================================================

const FLAG_PATH = resolve(process.cwd(), 'dist/.native-dirty');

/**
 * flag file を作成 (内容: 検出された native file 一覧 + timestamp)。
 */
function createFlag(verdict, nativeFiles, unknownFiles, source) {
  const dir = dirname(FLAG_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const content =
    `# BonsaiLog native-dirty flag (Sess71 PR-1 ADR-0046 Amendment)\n` +
    `# 自動生成、 build 完了時に reload-app.sh / dev-start.sh が削除する。\n` +
    `# Manual 編集禁止 (rm で削除する場合は build 必要性を user 自身で判断)。\n` +
    `created_at: ${new Date().toISOString()}\n` +
    `source: ${source}\n` +
    `verdict: ${verdict}\n` +
    `native_files:\n${nativeFiles.map((f) => `  - ${f}`).join('\n') || '  (none)'}\n` +
    `unknown_files:\n${unknownFiles.map((f) => `  - ${f}`).join('\n') || '  (none)'}\n`;
  writeFileSync(FLAG_PATH, content, 'utf8');
}

// =============================================================================
// main
// =============================================================================

function parseArgs(argv) {
  const args = { from: 'hook', dryRun: false, base: 'HEAD' };
  for (const a of argv) {
    if (a.startsWith('--from=')) args.from = a.slice('--from='.length);
    else if (a === '--dry-run') args.dryRun = true;
    else if (a.startsWith('--base=')) args.base = a.slice('--base='.length);
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  let filePaths;
  if (args.from === 'hook') {
    filePaths = readFromHook();
  } else if (args.from === 'cli') {
    filePaths = readFromCli(args.base);
  } else {
    process.stderr.write(`[check-native-impact] Unknown --from value: ${args.from}\n`);
    process.exit(1);
  }

  if (filePaths.length === 0) {
    // 何もしない (hook 経由で非 file edit event の場合等)
    process.stdout.write(
      `[check-native-impact] No file paths provided from ${args.from}, skipping.\n`,
    );
    process.exit(0);
  }

  const { verdict, nativeFiles, unknownFiles } = classifyMany(filePaths);

  if (verdict === 'native') {
    const summary =
      `[check-native-impact] Native impact detected (source=${args.from}).\n` +
      `  native files: ${nativeFiles.join(', ') || '(none)'}\n` +
      `  unknown files (safe-side native): ${unknownFiles.join(', ') || '(none)'}\n` +
      `  → Next reload (scripts/dev/reload-app.sh or scripts/dev-start.sh) will trigger auto build.\n`;
    process.stdout.write(summary);
    if (!args.dryRun) {
      createFlag(verdict, nativeFiles, unknownFiles, args.from);
    } else {
      process.stdout.write(`[check-native-impact] --dry-run, flag not created.\n`);
    }
  } else {
    process.stdout.write(
      `[check-native-impact] JS-only changes (source=${args.from}, files=${filePaths.length}). Metro reload sufficient.\n`,
    );
    // flag は作成しない (削除は起動 script 側で build 完了時に行う、 本 script は touch しない)
  }

  process.exit(0);
}

// ESM では import.meta.url で entry 判定
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) main();
