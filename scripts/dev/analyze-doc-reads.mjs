#!/usr/bin/env node
/**
 * analyze-doc-reads.mjs — ClaudeCode 過去 transcript から doc Read 履歴を遡及集計 (Sess89+ PR1 Phase 1)。
 *
 * 目的: docs/ + .claude/ + CLAUDE.md 系 + AGENTS.md + ~/.claude/CLAUDE.md +
 *      ~/.claude/rules/ + auto memory dir の Read 頻度 baseline を取得し、
 *      30 日 0-reads file を retire 候補として棚卸する (= 不要 doc 廃止 sprint への入力)。
 *
 * 入力: ~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/*.jsonl + subagent 配下
 * 出力: ${REPO}/.claude/metrics/baseline-reads.csv  (= scope 内 Read 集計 + inventory 全件)
 *       stdout: Top 30 / Bottom 30 サマリ
 *
 * 起動: pnpm metrics:doc-baseline
 *
 * 議題: Sess89+ 議論モード結論 (= 案 A+B ハイブリッド 3 Phase、 PR 2 本順次)。
 * Plan: /home/doooo/.claude/plans/keen-dancing-quokka.md
 */
import { createReadStream, existsSync, mkdirSync } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

import { isInScope, classify, isDocFile, SCOPE_ROOTS } from './lib/doc-scope.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');

const HOME = homedir();
const PROJECT_HASH = '-home-doooo-04-app-factory-apps-BonsaiLog';
const TRANSCRIPT_DIR = `${HOME}/.claude/projects/${PROJECT_HASH}`;
const OUTPUT_DIR = `${projectRoot}/.claude/metrics`;
const OUTPUT_CSV = `${OUTPUT_DIR}/baseline-reads.csv`;

// 集計 state
const stats = new Map(); // file_path -> { count, sessions: Set<session_id>, firstReadAt, lastReadAt, category }
let totalLines = 0;
let skippedLines = 0;
let processedFiles = 0;

function record(filePath, sessionId, ts) {
  let s = stats.get(filePath);
  if (!s) {
    s = {
      count: 0,
      sessions: new Set(),
      firstReadAt: null,
      lastReadAt: null,
      category: classify(filePath),
    };
    stats.set(filePath, s);
  }
  s.count += 1;
  if (sessionId) s.sessions.add(sessionId);
  if (ts) {
    if (!s.firstReadAt || ts < s.firstReadAt) s.firstReadAt = ts;
    if (!s.lastReadAt || ts > s.lastReadAt) s.lastReadAt = ts;
  }
}

async function processJsonl(filePath, sessionId) {
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    totalLines += 1;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      skippedLines += 1;
      continue;
    }
    if (obj?.type !== 'assistant') continue;
    const content = obj?.message?.content;
    if (!Array.isArray(content)) continue;
    const ts = typeof obj?.timestamp === 'string' ? obj.timestamp : null;
    for (const c of content) {
      if (c?.type === 'tool_use' && c?.name === 'Read') {
        const fp = c?.input?.file_path;
        if (typeof fp === 'string' && isInScope(fp)) {
          record(fp, sessionId, ts);
        }
      }
    }
  }
  processedFiles += 1;
}

async function listTranscripts() {
  const entries = await readdir(TRANSCRIPT_DIR, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    if (e.isFile() && e.name.endsWith('.jsonl')) {
      const fp = join(TRANSCRIPT_DIR, e.name);
      const sessionId = basename(e.name, '.jsonl');
      files.push({ filePath: fp, sessionId });
    }
    // subagent 配下 (<id>/subagents/agent-*.jsonl)
    if (e.isDirectory()) {
      const subDir = join(TRANSCRIPT_DIR, e.name, 'subagents');
      if (existsSync(subDir)) {
        let subEntries;
        try {
          subEntries = await readdir(subDir, { withFileTypes: true });
        } catch {
          continue;
        }
        for (const se of subEntries) {
          if (se.isFile() && se.name.endsWith('.jsonl')) {
            files.push({
              filePath: join(subDir, se.name),
              sessionId: e.name, // parent session id
            });
          }
        }
      }
    }
  }
  return files;
}

async function walkDir(root, out) {
  if (!existsSync(root)) return;
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const fp = join(root, e.name);
    if (e.isDirectory()) {
      // self-recursion 防止 (= .claude/metrics/ や .claude/worktrees/ は skip)
      if (fp.endsWith('/.claude/metrics') || fp.includes('/.claude/worktrees')) continue;
      // node_modules も skip (= scope rule で除外されるが walk コスト削減)
      if (e.name === 'node_modules' || e.name === '.git') continue;
      await walkDir(fp, out);
    } else if (e.isFile()) {
      if (isInScope(fp) && isDocFile(fp)) out.push(fp);
    }
  }
}

async function listScopeInventory() {
  const out = new Set();
  for (const f of SCOPE_ROOTS.SINGLE_FILES) {
    if (existsSync(f) && isInScope(f) && isDocFile(f)) out.add(f);
  }
  for (const root of SCOPE_ROOTS.DIR_ROOTS) {
    const collected = [];
    await walkDir(root, collected);
    for (const f of collected) out.add(f);
  }
  return out;
}

function escapeCsv(s) {
  if (s == null) return '';
  const str = String(s);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function pad(s, n) {
  const str = String(s);
  return str.length >= n ? str : str + ' '.repeat(n - str.length);
}

async function main() {
  console.log(`Reading transcripts from: ${TRANSCRIPT_DIR}`);
  if (!existsSync(TRANSCRIPT_DIR)) {
    console.error(`\x1b[31m✗ Transcript dir not found: ${TRANSCRIPT_DIR}\x1b[0m`);
    process.exit(1);
  }

  const files = await listTranscripts();
  console.log(`Found ${files.length} transcript file(s) (incl. subagents).`);

  for (const { filePath, sessionId } of files) {
    await processJsonl(filePath, sessionId);
  }

  console.log(
    `Processed ${processedFiles} file(s), ${totalLines} line(s), skipped ${skippedLines} broken line(s).`,
  );

  // inventory (= Bottom 30 用)
  console.log('Collecting scope inventory (.md / .mdx)...');
  const inventory = await listScopeInventory();
  console.log(`Inventory: ${inventory.size} file(s) in scope.`);

  // inventory にあって stats にない = 0-reads
  for (const fp of inventory) {
    if (!stats.has(fp)) {
      stats.set(fp, {
        count: 0,
        sessions: new Set(),
        firstReadAt: null,
        lastReadAt: null,
        category: classify(fp),
      });
    }
  }

  // CSV 出力
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const rows = ['file_path,total_reads,sessions_count,first_read_at,last_read_at,category'];
  const sorted = [...stats.entries()].sort((a, b) => {
    if (b[1].count !== a[1].count) return b[1].count - a[1].count;
    return a[0].localeCompare(b[0]);
  });
  for (const [fp, s] of sorted) {
    rows.push(
      [
        escapeCsv(fp),
        s.count,
        s.sessions.size,
        escapeCsv(s.firstReadAt ?? ''),
        escapeCsv(s.lastReadAt ?? ''),
        escapeCsv(s.category),
      ].join(','),
    );
  }
  await writeFile(OUTPUT_CSV, rows.join('\n') + '\n', 'utf8');
  console.log(`\x1b[32mCSV written: ${OUTPUT_CSV}\x1b[0m`);

  // stdout サマリ
  const read = sorted.filter(([, s]) => s.count > 0);
  const zero = sorted.filter(([, s]) => s.count === 0);

  console.log('');
  console.log('=== Top 30 (most read) ===');
  console.log(
    `${pad('RANK', 5)}${pad('COUNT', 8)}${pad('SESSIONS', 10)}${pad('CATEGORY', 24)}FILE`,
  );
  read.slice(0, 30).forEach(([fp, s], i) => {
    console.log(
      `${pad(String(i + 1), 5)}${pad(s.count, 8)}${pad(s.sessions.size, 10)}${pad(s.category, 24)}${fp}`,
    );
  });

  console.log('');
  console.log('=== Bottom 30 (0 reads in inventory) ===');
  console.log(`${pad('CATEGORY', 24)}FILE`);
  zero.slice(0, 30).forEach(([fp, s]) => {
    console.log(`${pad(s.category, 24)}${fp}`);
  });

  console.log('');
  console.log(
    `Stats: inventory=${inventory.size} files / read=${read.length} files / zero_reads=${zero.length} / skipped_lines=${skippedLines}`,
  );
}

main().catch((e) => {
  console.error(`\x1b[31m✗ analyze-doc-reads failed: ${e.message}\x1b[0m`);
  console.error(e.stack);
  process.exit(1);
});
