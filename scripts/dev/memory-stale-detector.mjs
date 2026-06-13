#!/usr/bin/env node
/**
 * memory-stale-detector.mjs — MEMORY.md エントリの腐敗検出 CLI (Sess108 案 8 / #1292)
 *
 * 由来: Notion 215 prompts 分析 + Sess108 認知飽和ガード議論。
 *       Auto memory (MEMORY.md エントリ群) が 60+ 件まで増えて、
 *       「最近 90 日参照ゼロ」 の死蔵エントリが認知飽和を生む構造リスクを検出する。
 *
 * 役割:
 *   1. ~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/ を walk
 *   2. .claude/metrics/doc-reads.jsonl (= log-doc-reads.mjs の出力) を逆引き
 *   3. 90 日参照ゼロ → 統合候補としてリストアップ
 *   4. --create-issue で gh issue create 自動起票 (= 月次 cron)
 *
 * 出力例:
 *   stale 候補: 12 件 (90 日参照 0 件)
 *   - parallel-agent-isolation.md (last seen: never)
 *   - skill-creator-skill.md (last seen: 92 days ago)
 *
 * 安全網: 例外は catch、 silent exit 0。
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { homedir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');

const args = process.argv.slice(2);
const createIssue = args.includes('--create-issue');
const jsonMode = args.includes('--json');
const sinceArg = args.find((a) => a.startsWith('--days='));
const STALE_DAYS = sinceArg ? parseInt(sinceArg.slice(7), 10) : 90;

const MEMORY_DIR = resolve(
  homedir(),
  '.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory',
);
const DOC_READS_JSONL = join(projectRoot, '.claude/metrics/doc-reads.jsonl');

function listMemoryEntries() {
  if (!existsSync(MEMORY_DIR)) return [];
  return readdirSync(MEMORY_DIR)
    .filter((f) => f.endsWith('.md') && !f.endsWith('.bak') && !f.includes('.bak-'))
    .map((f) => ({
      name: f,
      path: join(MEMORY_DIR, f),
      mtime: statSync(join(MEMORY_DIR, f)).mtimeMs,
    }));
}

function loadDocReadsIndex() {
  // memory/<name>.md の最終参照 timestamp を集計
  const lastSeen = new Map();
  if (!existsSync(DOC_READS_JSONL)) return lastSeen;
  try {
    const content = readFileSync(DOC_READS_JSONL, 'utf8');
    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        const fp = obj.file_path ?? '';
        // memory/ パスが含まれる Read を抽出
        if (fp.includes('/memory/')) {
          const base = basename(fp);
          const ts = Date.parse(obj.ts);
          if (!Number.isNaN(ts)) {
            const prev = lastSeen.get(base);
            if (!prev || ts > prev) lastSeen.set(base, ts);
          }
        }
      } catch {
        /* skip 不正 line */
      }
    }
  } catch {
    /* read 失敗は無視 */
  }
  return lastSeen;
}

function main() {
  const entries = listMemoryEntries();
  if (entries.length === 0) {
    if (jsonMode) {
      process.stdout.write(JSON.stringify({ total: 0, stale: [], staleDays: STALE_DAYS }, null, 2));
      process.stdout.write('\n');
    } else {
      console.log('memory ディレクトリが空 or 存在しません: ' + MEMORY_DIR);
    }
    process.exit(0);
  }

  const lastSeen = loadDocReadsIndex();
  const now = Date.now();
  const staleMs = STALE_DAYS * 24 * 60 * 60 * 1000;

  const stale = [];
  for (const e of entries) {
    // index ファイル (MEMORY.md) は除外
    if (e.name === 'MEMORY.md') continue;
    const last = lastSeen.get(e.name);
    const lastTs = last ?? e.mtime; // 参照ログがなければ mtime を fallback
    const ageDays = Math.floor((now - lastTs) / (24 * 60 * 60 * 1000));
    if (now - lastTs >= staleMs) {
      stale.push({
        name: e.name,
        lastSeen: last ? new Date(last).toISOString() : null,
        mtime: new Date(e.mtime).toISOString(),
        ageDays,
        recommended: 'review',
      });
    }
  }

  // age 降順 sort
  stale.sort((a, b) => b.ageDays - a.ageDays);

  if (jsonMode) {
    process.stdout.write(
      JSON.stringify(
        {
          total: entries.length,
          staleCount: stale.length,
          staleDays: STALE_DAYS,
          stale,
        },
        null,
        2,
      ),
    );
    process.stdout.write('\n');
    process.exit(0);
  }

  console.log(`# Memory stale entries (threshold: ${STALE_DAYS} days)`);
  console.log('');
  console.log(`memory エントリ合計: ${entries.length} 件`);
  console.log(`stale 候補: ${stale.length} 件`);
  console.log('');
  if (stale.length === 0) {
    console.log('✅ stale 候補なし');
    process.exit(0);
  }
  console.log('## 統合候補リスト (age 降順)');
  for (const s of stale.slice(0, 30)) {
    const seen = s.lastSeen ? `last seen ${s.lastSeen.slice(0, 10)}` : 'last seen: never';
    console.log(`  - ${s.name} (age=${s.ageDays}d, ${seen})`);
  }
  if (stale.length > 30) {
    console.log(`  ... (${stale.length - 30} more)`);
  }
  console.log('');
  console.log('推奨アクション:');
  console.log('  - review: 90 日参照 0 件 → 統合 or 削除 or topic_key 集約');
  console.log('  - keep: 「行動ルール」「再発防止」系は残す');

  if (createIssue) {
    console.log('');
    console.log('## --create-issue: gh issue create を試行...');
    try {
      const body = [
        '## Memory stale detector report',
        '',
        `Threshold: ${STALE_DAYS} days`,
        `Total entries: ${entries.length}`,
        `Stale candidates: ${stale.length}`,
        '',
        '### 統合候補',
        ...stale.slice(0, 30).map((s) => `- ${s.name} (age=${s.ageDays}d)`),
        '',
        '推奨: `/memory-review` Skill で week 統合を実行 (= Sess108 案 8)。',
      ].join('\n');
      const cmd = `gh issue create --title "chore(memory): stale 候補 ${stale.length} 件 (自動検出)" --body ${JSON.stringify(body)} --label self-audit,memory`;
      const result = execSync(cmd, { encoding: 'utf8', cwd: projectRoot });
      console.log(result);
    } catch (err) {
      console.error('gh issue create 失敗:', err?.message ?? err);
    }
  }
  process.exit(0);
}

try {
  main();
} catch (err) {
  console.error('[memory:stale] error:', err?.message ?? err);
  process.exit(0);
}
