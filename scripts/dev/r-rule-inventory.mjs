#!/usr/bin/env node
/**
 * r-rule-inventory.mjs — R-1 〜 R-NN 索引棚卸 CLI (Sess108 案 8 / #1292)
 *
 * 由来: Notion 215 prompts 分析 + Sess108 認知飽和ガード議論。
 *       R rule が 82 まで増えて「全部読まれない」 認知飽和の構造リスクが顕在化。
 *       30 件閾値を超えたら退役推奨候補を洗い出し、 新規追加時に「退役案 1 件」 をセット化する。
 *
 * 役割:
 *   1. .claude/recurrence-prevention.md を走査して R-NN 行と「~~退役~~」 マーカーを count
 *   2. 31 件以上で warn 出力
 *   3. 最終 grep ヒット数を repo 全 grep で集計、 0 件 R を退役推奨候補としてリストアップ
 *   4. --json で機械可読出力、 GitHub Actions の monthly self-audit から呼ばれる
 *
 * 出力例:
 *   現状 R 件数: 82 (active 80 / 退役済 2)
 *   退役推奨候補: R-39 (hit=0), R-45 (hit=0)
 *
 * 安全網: 例外は catch、 silent exit 0 (= 計測なので CI を壊さない)。
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const verbose = args.includes('--verbose');

const RULE_FILE = join(projectRoot, '.claude/recurrence-prevention.md');
const SPEC_FILE = join(projectRoot, '.claude/recurrence-prevention/specialized.md');
const WARN_THRESHOLD = 30;

function parseRRows(content) {
  // table row pattern: `| **R-NN** | title | ...`
  const rows = [];
  const re = /\|\s*\*\*R-(\d{1,3})\*\*\s*\|\s*([^|]+)\|/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const num = parseInt(m[1], 10);
    const title = m[2].trim();
    const retired = /~~|退役/.test(title);
    rows.push({ num, title: title.replace(/~~/g, '').slice(0, 80), retired });
  }
  return rows;
}

function parseHeadingRules(content) {
  // ### R-NN. title  (汎用 R-1 〜 R-12)
  const rows = [];
  const re = /^###\s+R-(\d{1,3})\.\s+(.+)$/gm;
  let m;
  while ((m = re.exec(content)) !== null) {
    const num = parseInt(m[1], 10);
    const title = m[2].trim();
    rows.push({ num, title: title.slice(0, 80), retired: false });
  }
  return rows;
}

function countRepoHits(num) {
  // R-NN reference を repo 全体で count (.git / node_modules / .claude/worktrees / .claude/logs を除外)
  try {
    const cmd =
      `grep -rE 'R-${num}\\b' ` +
      `--include='*.md' --include='*.mjs' --include='*.ts' --include='*.tsx' ` +
      `--exclude-dir=node_modules --exclude-dir=.git --exclude-dir=worktrees ` +
      `--exclude-dir=logs --exclude-dir=dist --exclude-dir=android --exclude-dir=ios ` +
      `"${projectRoot}" 2>/dev/null | wc -l`;
    const out = execSync(cmd, { encoding: 'utf8', shell: '/bin/bash' }).trim();
    return parseInt(out, 10) || 0;
  } catch {
    return 0;
  }
}

function main() {
  if (!existsSync(RULE_FILE)) {
    console.error(`[r:inventory] not found: ${RULE_FILE}`);
    process.exit(1);
  }

  const parentContent = readFileSync(RULE_FILE, 'utf8');
  const specContent = existsSync(SPEC_FILE) ? readFileSync(SPEC_FILE, 'utf8') : '';

  // 汎用 R-1〜R-12 (見出し形式) + R-13+ (table 形式)
  const headingRules = parseHeadingRules(parentContent);
  const tableRules = parseRRows(parentContent);

  const allRules = new Map();
  for (const r of headingRules) allRules.set(r.num, r);
  for (const r of tableRules) {
    if (!allRules.has(r.num)) allRules.set(r.num, r);
    else {
      const existing = allRules.get(r.num);
      // 退役 flag は table 行を優先 (退役マーカーが付いている方)
      existing.retired = existing.retired || r.retired;
    }
  }

  const sorted = [...allRules.values()].sort((a, b) => a.num - b.num);
  const active = sorted.filter((r) => !r.retired);
  const retired = sorted.filter((r) => r.retired);

  // 退役推奨候補 = active R で repo hit 数が 0 件 (= 索引以外で誰も参照していない)
  // ※ recurrence-prevention.md と specialized.md は除外したいが、 簡易実装は include で進める
  //   (= 索引 + spec の 2 件しかない場合 = 実質 0 件参照)
  const RETIREMENT_HIT_THRESHOLD = 3; // 索引 (parent) + spec + 1 件以下を候補化
  const retirementCandidates = [];
  for (const r of active) {
    const hits = countRepoHits(r.num);
    if (hits <= RETIREMENT_HIT_THRESHOLD) {
      retirementCandidates.push({ num: r.num, title: r.title, hits });
    }
  }

  const total = sorted.length;
  const overThreshold = active.length > WARN_THRESHOLD;

  if (jsonMode) {
    process.stdout.write(
      JSON.stringify(
        {
          total,
          active: active.length,
          retired: retired.length,
          warnThreshold: WARN_THRESHOLD,
          overThreshold,
          retirementCandidates,
          retiredList: retired.map((r) => ({ num: r.num, title: r.title })),
        },
        null,
        2,
      ),
    );
    process.stdout.write('\n');
    process.exit(0);
  }

  // 人間可読出力
  console.log(`# R-rule inventory (${new Date().toISOString().slice(0, 10)})`);
  console.log('');
  console.log(`現状 R 件数: ${total} (active ${active.length} / 退役済 ${retired.length})`);
  console.log(`警告閾値: ${WARN_THRESHOLD} 件`);
  if (overThreshold) {
    console.log('');
    console.log(`⚠️  active R が ${WARN_THRESHOLD} 件を超えています (= ${active.length} 件)。`);
    console.log(
      '  → 認知飽和ガード: 新規 R 追加時は「退役案 1 件」 をセット化することを検討してください。',
    );
  }
  console.log('');
  if (retired.length > 0) {
    console.log(`退役済 (${retired.length} 件):`);
    for (const r of retired) {
      console.log(`  - R-${r.num}: ${r.title}`);
    }
    console.log('');
  }
  if (retirementCandidates.length > 0) {
    console.log(`退役推奨候補 (repo hit ≤ ${RETIREMENT_HIT_THRESHOLD} 件、 索引以外で未参照):`);
    for (const c of retirementCandidates) {
      console.log(`  - R-${c.num} (hits=${c.hits}): ${c.title}`);
    }
  } else {
    console.log('退役推奨候補: なし (= 全 R が active に使われています)');
  }
  console.log('');
  if (verbose) {
    console.log('## 全 R 一覧');
    for (const r of sorted) {
      const mark = r.retired ? '[retired]' : '[active] ';
      console.log(`  ${mark} R-${r.num}: ${r.title}`);
    }
  }

  // 参照: specContent を読んでいるのを示しておく (= 将来 spec parity check 拡張時の hook)
  void specContent;

  // 計測スクリプトなので警告でも exit 0 (CI を壊さない)
  process.exit(0);
}

try {
  main();
} catch (err) {
  console.error('[r:inventory] error:', err?.message ?? err);
  process.exit(0);
}
