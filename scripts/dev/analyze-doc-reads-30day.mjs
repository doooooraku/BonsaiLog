#!/usr/bin/env node
/**
 * analyze-doc-reads-30day.mjs — 過去 N 日 0-reads doc を retire 候補リスト化 (Sess90 PR3 Phase 3)。
 *
 * PR1 #1039 (= baseline-reads.csv) + PR2 #1042 (= doc-reads.jsonl) を join、
 * 過去 N 日で 1 回も読まれていない doc を Markdown table で列挙。
 * 議論モード R1-R3 結論に基づき、 **機械は自動分類しない**。 user が SKILL.md
 * Step 10 §2 の 7 分類 参考ガイドで 1 件ずつ判定 → ADR-0046 D-2 4 step を 実行。
 *
 * 入力:
 *   - ${REPO}/.claude/metrics/baseline-reads.csv (= PR1 出力、 必須)
 *   - ${REPO}/.claude/metrics/doc-reads.jsonl (= PR2 hook 出力、 空でも crash しない)
 *
 * 出力:
 *   - stdout に Markdown table (= category / total_reads / last_read_at / file_path)
 *   - `--with-grep` で 各候補の 被参照件数 grep (= ADR-0046 D-2 Step 1 自動化)
 *
 * 起動:
 *   pnpm metrics:doc-30day-zero                       # default N=30
 *   pnpm metrics:doc-30day-zero --days=7              # 過去 7 日 cutoff
 *   pnpm metrics:doc-30day-zero --days=30 --with-grep # 被参照件数 grep 添え
 *
 * 議題: Sess90+ 議論モード結論 (= 案 A+B+C ハイブリッド 3 Phase、 PR シリーズ完遂)。
 * Plan: /home/doooo/.claude/plans/keen-dancing-quokka.md
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

import { classify } from './lib/doc-scope.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');

const CSV_PATH = `${projectRoot}/.claude/metrics/baseline-reads.csv`;
const JSONL_PATH = `${projectRoot}/.claude/metrics/doc-reads.jsonl`;

// CLI args
const args = process.argv.slice(2);
const daysArg = args.find((a) => a.startsWith('--days='));
const days = daysArg ? parseInt(daysArg.slice(7), 10) : 30;
const withGrep = args.includes('--with-grep');

if (Number.isNaN(days) || days <= 0) {
  console.error(`\x1b[31m✗ --days=N must be positive integer, got: ${daysArg}\x1b[0m`);
  process.exit(1);
}

// cutoff (= now - N days)
const cutoffMs = Date.now() - days * 24 * 3600 * 1000;
const cutoff = new Date(cutoffMs).toISOString();

// CSV 必須
if (!existsSync(CSV_PATH)) {
  console.error(`\x1b[31m✗ baseline-reads.csv が見つかりません: ${CSV_PATH}\x1b[0m`);
  console.error('');
  console.error('  まず PR1 の集計 script を実行してください:');
  console.error('    pnpm metrics:doc-baseline');
  process.exit(1);
}

// 簡易 CSV parser (= double-quote escape 対応)
function parseCsvLine(line) {
  const parts = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (c === ',' && !inQuote) {
      parts.push(current);
      current = '';
    } else {
      current += c;
    }
  }
  parts.push(current);
  return parts;
}

// CSV 読み込み
const csvFiles = new Map(); // file_path -> { count, lastRead, category }
const csv = readFileSync(CSV_PATH, 'utf8');
const csvLines = csv.split('\n').slice(1).filter(Boolean); // skip header
for (const line of csvLines) {
  const parts = parseCsvLine(line);
  if (parts.length < 6) continue;
  const [file_path, total_reads, , , last_read_at, category] = parts;
  csvFiles.set(file_path, {
    count: parseInt(total_reads, 10) || 0,
    lastRead: last_read_at || null,
    category: category || classify(file_path),
  });
}

// JSONL 読み込み (= PR2 hook 出力、 空でも OK)
const jsonlLatest = new Map(); // file_path -> 最新 ts
if (existsSync(JSONL_PATH)) {
  const jsonl = readFileSync(JSONL_PATH, 'utf8');
  for (const line of jsonl.split('\n').filter(Boolean)) {
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }
    const fp = obj?.file_path;
    const ts = obj?.ts;
    if (typeof fp !== 'string' || typeof ts !== 'string') continue;
    const prev = jsonlLatest.get(fp);
    if (!prev || ts > prev) {
      jsonlLatest.set(fp, ts);
    }
  }
}

// 候補抽出 (= 過去 N 日で 0 reads)
const candidates = [];
for (const [fp, info] of csvFiles) {
  // CSV last_read_at と JSONL 最新 ts のうち 新しい方を 最終 read として採用
  const csvLast = info.lastRead;
  const jsonlLast = jsonlLatest.get(fp) ?? null;
  const finalLast = [csvLast, jsonlLast].filter(Boolean).sort().pop() ?? null;

  // 過去 N 日内に 1 回でも読まれた → skip
  if (finalLast && finalLast >= cutoff) continue;

  candidates.push({
    file_path: fp,
    total_reads: info.count,
    last_read_at: finalLast ?? '(never)',
    category: info.category,
  });
}

// category 別 group + count 昇順
candidates.sort((a, b) => {
  if (a.category !== b.category) return a.category.localeCompare(b.category);
  return a.total_reads - b.total_reads;
});

// 出力
const generated = new Date().toISOString();
console.log(`# Retire candidates (= 過去 ${days} 日 0 reads)`);
console.log(`# Generated: ${generated}`);
console.log(`# Data: baseline-reads.csv (= PR1) + doc-reads.jsonl (= PR2 hook)`);
console.log(`# Cutoff: ${cutoff}`);
console.log('');
console.log(`Found ${candidates.length} candidates`);
console.log('');

if (candidates.length === 0) {
  console.log('🎉 過去 ' + days + ' 日内に 全 doc が 1 回以上 Read されました。 retire 候補なし。');
  console.log('');
  console.log('## Next: 30 日後に 再実行 推奨');
  process.exit(0);
}

console.log('| Category | Total Reads | Last Read | File |');
console.log('|----------|-------------|-----------|------|');
for (const c of candidates) {
  // file_path に | が含まれることは想定外だが defensive escape
  const safePath = c.file_path.replace(/\|/g, '\\|');
  console.log(`| ${c.category} | ${c.total_reads} | ${c.last_read_at} | ${safePath} |`);
}

if (withGrep) {
  console.log('');
  console.log('## 被参照件数 grep (= ADR-0046 D-2 Step 1)');
  console.log('');
  console.log('| File | Refs |');
  console.log('|------|------|');
  for (const c of candidates) {
    const baseName = c.file_path
      .split('/')
      .pop()
      .replace(/\.(md|mdx)$/, '');
    let refs = '?';
    try {
      const result = execSync(
        `grep -rln "${baseName}" "${projectRoot}/docs" "${projectRoot}/.claude" 2>/dev/null | grep -v "${c.file_path}" | wc -l`,
        { encoding: 'utf8' },
      ).trim();
      refs = result;
    } catch {
      refs = '(grep error)';
    }
    const safePath = c.file_path.replace(/\|/g, '\\|');
    console.log(`| ${safePath} | ${refs} |`);
  }
}

console.log('');
console.log('## Next: SKILL.md Step 10 §2 (= 7 分類 参考ガイド) で user 判定');
console.log('');
console.log('   A 役目終 / B 眠ってる / C 内在化 / D 索引漏れ');
console.log('   E 読ませたい / F 歴史的価値 / G 検索バイアス');
console.log('');
console.log('   A 確定のみ ADR-0046 D-2 (= 4 step) を 実行:');
console.log('     1. 影響 grep (= --with-grep で 自動化済)');
console.log('     2. user 承認');
console.log('     3. Status 変更 (= Deprecated / Superseded by [後継]、 番号保持)');
console.log('     4. 後継リンク');
