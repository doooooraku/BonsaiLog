#!/usr/bin/env node
/**
 * gen-doc-routing.mjs — Code-to-Docs ルーティング表から path-scoped rules を生成
 *
 * 原本: docs/reference/doc-routing.md (唯一の SoT)
 * 生成物: .claude/rules/routing/<ID>.md (frontmatter `paths:` 付き — 該当 path の
 *         ファイルを Claude Code が Read した瞬間に本文がコンテキストへ注入される)
 *
 * 使い方:
 *   node scripts/gen-doc-routing.mjs          # 生成 (上書き + orphan 削除)
 *   node scripts/gen-doc-routing.mjs --check  # drift 検査のみ (差分で exit 1) = verify:doc-routing
 *
 * 設計原則 (Doc-Truth Audit P3 / P-14):
 *   - 防御 0: 原本は 1 つ、rules は生成物 (直接編集禁止)
 *   - 防御 3: --check を verify chain に連結し、生成物の直接編集 drift を毎 PR 検出
 *   - 表に書かれた doc path / glob 接頭 dir は実在検査 (改名追従漏れで exit 1)
 *   - 検算行を必ず出力 (網羅を謳う成果物には網羅の検算)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SOURCE, parseDocRouting, globPrefix } from './lib/parse-doc-routing.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = '.claude/rules/routing';
const CHECK = process.argv.includes('--check');

// ---- 1. 原本表の parse (lib/parse-doc-routing.mjs と共用) ----
const { rows, errors } = parseDocRouting(ROOT);

// ---- 2. 実在検査 (doc path + glob 接頭 dir) ----
// gitignored な生成物 dir (例: /android = prebuild 産物) はクリーン checkout (CI / worktree)
// に存在しないため、実在検査の対象外とする (glob 自体は rules に残す — 存在する環境でのみ発火)
const gitignored = new Set(
  readFileSync(join(ROOT, '.gitignore'), 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.replace(/^\//, '').replace(/\/$/, '')),
);
for (const row of rows) {
  if (row.globs.length === 0) errors.push(`[${row.id}] glob が backtick で 1 つも書かれていない`);
  if (row.docs.length === 0)
    errors.push(`[${row.id}] doc path が backtick で 1 つも書かれていない`);
  for (const doc of row.docs) {
    if (!existsSync(join(ROOT, doc))) errors.push(`[${row.id}] doc が実在しない: ${doc}`);
  }
  for (const glob of row.globs) {
    const prefix = globPrefix(glob);
    if (prefix && !existsSync(join(ROOT, prefix)) && !gitignored.has(prefix))
      errors.push(`[${row.id}] glob の接頭が実在しない: ${glob} (検査対象: ${prefix})`);
  }
}

// ---- 3. 生成内容の組み立て ----
function render(row) {
  const paths = row.globs.map((g) => `  - "${g}"`).join('\n');
  const docs = row.docs.map((d) => `- ${d}`).join('\n');
  return `---
paths:
${paths}
---

<!-- generated-by: scripts/gen-doc-routing.mjs / 原本: ${SOURCE} — 直接編集禁止 (pnpm gen:doc-routing で再生成) -->

# Routing: ${row.id} — このパスを変更する前に

以下の doc を読んでから変更すること (詳細・経緯は原本 ${SOURCE} の同 ID 行):

${docs}

**確認観点**: ${row.point}
`;
}
const expected = new Map(rows.map((r) => [`${r.id}.md`, render(r)]));

if (errors.length > 0) {
  console.error(`✗ gen-doc-routing: 原本検査エラー ${errors.length} 件`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

// ---- 4. --check (drift 検査) or 生成 ----
const outAbs = join(ROOT, OUT_DIR);
const current = existsSync(outAbs) ? readdirSync(outAbs).filter((f) => f.endsWith('.md')) : [];

if (CHECK) {
  const drift = [];
  for (const [file, content] of expected) {
    const p = join(outAbs, file);
    if (!existsSync(p)) drift.push(`欠落: ${OUT_DIR}/${file}`);
    else if (readFileSync(p, 'utf8') !== content) drift.push(`差分: ${OUT_DIR}/${file}`);
  }
  for (const f of current)
    if (!expected.has(f)) drift.push(`orphan (原本に行がない): ${OUT_DIR}/${f}`);
  if (drift.length > 0) {
    console.error(
      `✗ verify:doc-routing: 原本と生成物の drift ${drift.length} 件 → pnpm gen:doc-routing で再生成`,
    );
    for (const d of drift) console.error(`  - ${d}`);
    process.exit(1);
  }
  console.log(
    `✓ verify:doc-routing OK — 表 ${rows.length} 行 = rules ${expected.size} 件 一致 / doc 実在 ${rows.reduce((n, r) => n + r.docs.length, 0)} 件 / orphan 0`,
  );
} else {
  mkdirSync(outAbs, { recursive: true });
  for (const [file, content] of expected) writeFileSync(join(outAbs, file), content);
  let removed = 0;
  for (const f of current)
    if (!expected.has(f)) {
      rmSync(join(outAbs, f));
      removed++;
    }
  console.log(
    `✓ gen-doc-routing 完了 — 検算: 表 ${rows.length} 行 → rules ${expected.size} 件 生成 / orphan 削除 ${removed} / doc 実在検査 ${rows.reduce((n, r) => n + r.docs.length, 0)} 件 pass`,
  );
}
