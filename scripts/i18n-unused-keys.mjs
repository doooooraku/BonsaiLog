/**
 * i18n 未使用キー検出 (#1180、R-55 構造昇華 — warn 段階)。
 *
 * 背景: 死にキー (例: detailTabTimeline 'タイムライン') は「キーと値だけ見て実 UI を誤読する」
 * 事故源 (Sess102 で実害 1 件) + 19 言語分の翻訳資産の無駄。
 *
 * 仕組み:
 * 1. en.ts (TranslationKey の SoT) から全キーを抽出
 * 2. src/ app/ (locales と i18n 基盤を除く) のソースで「キー名そのもの」の出現を検査
 * 3. 動的組み立て (t(`eventType_${...}`) 等) は DYNAMIC_PREFIXES で除外
 *
 * 使い方:
 *   node scripts/i18n-unused-keys.mjs          # 一覧表示 (常に exit 0 = warn 運用)
 *   node scripts/i18n-unused-keys.mjs --strict # 未使用 > 0 で exit 1 (将来の verify 昇格用)
 *
 * 注意: 「未使用」は即削除ではない — 意図的残置 (例: detailTimelineToday は ADR-0020 で
 * 「棚卸しで判断」と明記) があるため、削除は一覧を user 確認してから (Issue #1180)。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const EN_PATH = path.join(ROOT, 'src/core/i18n/locales/en.ts');

/** 動的キー組み立ての prefix (t(`<prefix>${...}`) 形 — 2026-06-12 全 grep で採取)。 */
const DYNAMIC_PREFIXES = [
  'bonsaiStyle_',
  'eventStatus_',
  'eventType_',
  'recurringPreset',
  'workLogFertKind_',
  'workLogNotePlaceholder_', // getWorkLogNotePlaceholderKey (WorkLogTypeFormFields.tsx) が組み立て
  'workLogLeafAidSymptom_',
  'workLogMossAction_',
  'workLogPestPurpose_',
  'workLogPruneAmount_',
  'workLogPrunePart_',
  'workLogRepotRootAmount_',
  'workLogTrimRange_',
  'workLogUnwirePart_',
  'workLogWaterAmount_',
  'workLogWirePart_',
];

/** 走査対象から除外する path 片 (locales = 定義側 / i18n 基盤 = キー一覧を機械参照)。 */
const EXCLUDE_PATH_PARTS = ['src/core/i18n/locales', 'node_modules', '.claude/worktrees'];

function extractKeys(src) {
  // baseEn = { ... } 内の `  key:` 行 (prettier 後も 2 space 固定)
  return Array.from(src.matchAll(/^ {2}([A-Za-z][A-Za-z0-9_]*):/gm)).map((m) => m[1]);
}

function collectSourceFiles(dir, acc) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    // 除外は ROOT からの相対 path で判定 — 絶対 path だと worktree 実行時
    // (cwd 自体が .claude/worktrees 配下) に全ファイルが誤除外される (#1180 初回実行で実証)
    const rel = path.relative(ROOT, p);
    if (EXCLUDE_PATH_PARTS.some((part) => rel.includes(part))) continue;
    const st = statSync(p);
    if (st.isDirectory()) collectSourceFiles(p, acc);
    else if (/\.(ts|tsx)$/.test(name)) acc.push(p);
  }
  return acc;
}

const keys = extractKeys(readFileSync(EN_PATH, 'utf8'));
const files = [
  ...collectSourceFiles(path.join(ROOT, 'src'), []),
  ...collectSourceFiles(path.join(ROOT, 'app'), []),
];
const corpus = files.map((f) => readFileSync(f, 'utf8')).join('\n');

const unused = keys.filter((key) => {
  if (DYNAMIC_PREFIXES.some((pre) => key.startsWith(pre))) return false;
  return !corpus.includes(key);
});

if (unused.length === 0) {
  console.log(`[i18n-unused] OK — 未使用キー 0 件 (全 ${keys.length} キー走査)`);
  process.exit(0);
}

console.log(`[i18n-unused] 未使用キー ${unused.length} 件 / 全 ${keys.length} キー:`);
for (const k of unused) console.log(`  - ${k}`);
console.log(
  '[i18n-unused] 注意: 即削除しないこと — 意図的残置の可能性あり、一覧を確認してから削除 (Issue #1180)',
);
process.exit(process.argv.includes('--strict') ? 1 : 0);
