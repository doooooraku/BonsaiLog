#!/usr/bin/env node
/**
 * docs:lint - docs/ 配下の整合性チェック
 *
 * チェック項目:
 *   1. Codex 言及残存検出 (R-22 移行漏れ防止)
 *   2. ADR 番号歯抜け検出 (ADR-0001〜0016 連番)
 *   3. 取り消し線パターン検出 (R-2 違反: ~~F-XX~~ / 削除お知らせ / 履歴のため残置)
 *   4. lessons.md 単体ファイルが新規 lesson を含んでいないか (索引のみ維持)
 *   5. ルール doc の行数上限 (recurrence-prevention.md ≤ 250 / lessons ≤ 200)
 *   6. Superseded ADR の後継リンク整合 (ADR-0046 廃止ポリシー、warning のみ)
 *
 * 終了コード: 0 = OK, 1 = エラー検出 (warning は exit 0)
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const errors = [];
const warnings = [];

function walk(dir, callback) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;
      walk(full, callback);
    } else if (entry.endsWith('.md')) {
      callback(full);
    }
  }
}

// Check 1: Codex 言及残存
function checkCodexReferences() {
  const allowedPatterns = [
    /Codex.*不採用/,
    /Codex.*単独運用/,
    /Codex.*使用しない/,
    /Codex.*履歴互換/,
    /Codex 担当 PR で実施/,
    /2026-05-01.*Codex/,
    /Codex.*deprecate/,
    /deprecate.*Codex/,
    /~~.*Codex.*~~/,
  ];
  walk(join(ROOT, 'docs'), (file) => {
    if (file.includes('ADR-0012-agent-tools')) return; // 別作業の Worker B 範囲
    const content = readFileSync(file, 'utf8');
    if (!/Codex/.test(content)) return;
    const lines = content.split('\n');
    const violations = lines
      .map((l, i) => ({ line: i + 1, text: l }))
      .filter(({ text }) => /Codex/.test(text) && !allowedPatterns.some((re) => re.test(text)));
    if (violations.length > 0) {
      errors.push(
        `[R-22 Codex 移行漏れ] ${relative(ROOT, file)}:\n` +
          violations
            .slice(0, 5)
            .map(({ line, text }) => `  L${line}: ${text.trim().slice(0, 100)}`)
            .join('\n') +
          (violations.length > 5 ? `\n  ... (${violations.length - 5} more)` : ''),
      );
    }
  });
}

// Check 2: ADR 番号歯抜け
function checkAdrSequence() {
  const adrDir = join(ROOT, 'docs/adr');
  if (!existsSync(adrDir)) return;
  const adrs = readdirSync(adrDir)
    .filter((f) => /^ADR-\d{4}-/.test(f))
    .map((f) => parseInt(f.match(/^ADR-(\d{4})-/)[1], 10))
    .sort((a, b) => a - b);
  if (adrs.length === 0) return;
  for (let i = adrs[0]; i <= adrs[adrs.length - 1]; i++) {
    if (!adrs.includes(i)) {
      warnings.push(
        `[ADR 歯抜け] ADR-${String(i).padStart(4, '0')} が見つかりません (連番 ${adrs[0]}〜${adrs[adrs.length - 1]})`,
      );
    }
  }
}

// Check 3: 取り消し線パターン (R-2 違反)
function checkStrikethrough() {
  const patterns = [
    { re: /~~F-\d+~~/g, name: 'F-XX 取り消し線' },
    { re: /削除お知らせ/g, name: '削除お知らせブロック' },
    { re: /履歴のため残置/g, name: '履歴のため残置' },
    { re: /旧 F-\d+ 仕様/g, name: '旧 F-XX 仕様' },
  ];
  walk(join(ROOT, 'docs'), (file) => {
    if (file.includes('docs/adr/')) return; // ADR は履歴を残してよい
    if (file.includes('recurrence-prevention.md')) return; // ルール定義箇所
    const content = readFileSync(file, 'utf8');
    for (const { re, name } of patterns) {
      const matches = content.match(re);
      if (matches?.length) {
        errors.push(
          `[R-2 取り消し線] ${relative(ROOT, file)}: ${name} ${matches.length} 件 → 履歴は ADR に集約、仕様書は現在の仕様のみ`,
        );
      }
    }
  });
}

// Check 4: lessons.md が索引のみか
function checkLessonsIndex() {
  const lessonsFile = join(ROOT, 'docs/reference/tasks/lessons.md');
  if (!existsSync(lessonsFile)) return;
  const content = readFileSync(lessonsFile, 'utf8');
  // 索引のみ: 「### カテゴリ:」見出しが 0 個 (lesson 本体なし)
  const lessonHeadings = content.match(/^### [^索引]/gm);
  if (lessonHeadings && lessonHeadings.length > 5) {
    warnings.push(
      `[lessons.md 肥大化] docs/reference/tasks/lessons.md に lesson 本体が ${lessonHeadings.length} 件あります → lessons/<domain>.md に分割してください`,
    );
  }
}

// Check 5: lessons/<area>.md と recurrence-prevention.md の行数上限 (Issue retro 2026-05-03 P5)。
// 肥大化すると重要な部分が読まれなくなるため、構造的に防ぐ。
function checkRuleDocsLineLimit() {
  const limits = [
    { path: 'docs/reference/tasks/lessons/billing.md', max: 200 },
    { path: 'docs/reference/tasks/lessons/build.md', max: 200 },
    { path: 'docs/reference/tasks/lessons/db.md', max: 200 },
    { path: 'docs/reference/tasks/lessons/design.md', max: 200 },
    { path: 'docs/reference/tasks/lessons/docs.md', max: 200 },
    { path: 'docs/reference/tasks/lessons/runtime.md', max: 200 },
    { path: 'docs/reference/tasks/lessons/store.md', max: 200 },
    { path: 'docs/reference/tasks/lessons/wsl2-mobile.md', max: 200 },
    { path: 'docs/reference/tasks/lessons/auto-improve-loop.md', max: 200 },
    // Issue #443 受けて追加 (2026-05-11): 索引専用ファイルは 50 行制限で「読まれる索引」 を維持
    { path: 'docs/reference/tasks/lessons.md', max: 50 },
    { path: '.claude/recurrence-prevention.md', max: 250 },
  ];
  for (const { path, max } of limits) {
    const file = join(ROOT, path);
    if (!existsSync(file)) continue;
    const lines = readFileSync(file, 'utf8').split('\n').length;
    if (lines > max) {
      errors.push(
        `[行数上限] ${path}: ${lines} 行 (上限 ${max} 行)\n` +
          `  → 同テーマで 3 件以上溜まったら hook / ESLint / CI へ昇華 (CLAUDE.md §9 / 記憶の昇華ルール)。\n` +
          `  → recurrence-prevention.md 250 行超は新ファイル分割を検討。`,
      );
    }
  }
}

// Check 6: Superseded ADR が後継リンク (ADR-NNNN) を持つか (ADR-0046 廃止ポリシー)
// 廃止は物理削除せずアーカイブ (番号保持 + Status 変更) する運用のため、Superseded は後継明示が必須。
// 掃除をブロッカーにしないため warning のみ (error にしない)。Deprecated は後継なしが正常なので対象外。
function checkSupersededLinks() {
  const adrDir = join(ROOT, 'docs/adr');
  if (!existsSync(adrDir)) return;
  for (const f of readdirSync(adrDir)) {
    if (!/^ADR-\d{4}-.*\.md$/.test(f)) continue;
    const content = readFileSync(join(adrDir, f), 'utf8');
    const statusMatch = content.match(/^\s*-?\s*Status:\s*(.+)$/m);
    if (!statusMatch) continue;
    const status = statusMatch[1];
    if (/superseded/i.test(status) && !/ADR-\d{4}/.test(status)) {
      warnings.push(
        `[ADR-0046 Superseded 後継リンク欠落] ${f}: Status が Superseded ですが後継 ADR-NNNN リンクがありません → 「Superseded by [ADR-NNNN](./...)」形式で後継を明記してください`,
      );
    }
  }
}

// 実行
checkCodexReferences();
checkAdrSequence();
checkStrikethrough();
checkLessonsIndex();
checkRuleDocsLineLimit();
checkSupersededLinks();

// 結果出力
if (errors.length > 0) {
  console.error('\n❌ ERRORS:\n');
  errors.forEach((e) => console.error(e + '\n'));
}
if (warnings.length > 0) {
  console.warn('\n⚠️  WARNINGS:\n');
  warnings.forEach((w) => console.warn(w + '\n'));
}
if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ docs:lint passed (Codex 言及 / ADR 連番 / 取り消し線 / lessons 索引、全て OK)');
}

process.exit(errors.length > 0 ? 1 : 0);
