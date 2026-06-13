#!/usr/bin/env node
/**
 * check-pr-issue-link — R-82 PR と親 Issue の紐付け enforcement
 *
 * 経緯:
 * PR template §1 で「Issue: #」 を REQUIRED にしているが、 機械チェックがなかったため
 * 親 Issue 未紐付け PR が混入することがあった。 R-82 (Phase enforcement) の一環として
 * PR body に Closes/Refs #<N> の言及があるか、 もしくは docs-only/chore で
 * "no-issue" label が付与されているかを CI で構造的に強制する。
 *
 * 入力: 環境変数 GITHUB_EVENT_PATH (= GitHub Actions が pull_request イベントで提供)
 *   - pull_request.body: PR 本文
 *   - pull_request.labels[].name: PR に付与された label 名
 *
 * 合格条件 (いずれか 1 つ):
 *   1. labels に "no-issue" が含まれる
 *   2. PR body に /(Closes|Fixes|Resolves) #\d+/i (各種活用形含む) が match
 *   3. PR body に /Refs? #\d+/i が match
 *
 * 不合格時: exit 1 + 説明メッセージを stderr に出力
 *
 * GITHUB_EVENT_PATH 不在時 (= ローカル dry-run) は silent exit 0
 *
 * Related: R-82 / .github/pull_request_template.md §1 / .github/workflows/pr-issue-link-check.yml
 */
import { readFileSync, existsSync } from 'node:fs';

const eventPath = process.env.GITHUB_EVENT_PATH;

if (!eventPath || !existsSync(eventPath)) {
  // ローカル dry-run: silent exit 0
  process.exit(0);
}

let event;
try {
  event = JSON.parse(readFileSync(eventPath, 'utf8'));
} catch (err) {
  console.error(`[check-pr-issue-link] GITHUB_EVENT_PATH の JSON parse に失敗: ${err.message}`);
  process.exit(1);
}

const pr = event.pull_request;
if (!pr) {
  // pull_request イベントでない場合は skip
  console.log('[check-pr-issue-link] pull_request payload が存在しないため skip');
  process.exit(0);
}

const prBody = pr.body || '';
const labels = Array.isArray(pr.labels) ? pr.labels.map((l) => l.name) : [];

// (b) no-issue label による bypass
if (labels.includes('no-issue')) {
  console.log(
    '[check-pr-issue-link] "no-issue" label が付与されているため pass (docs-only / chore 想定)',
  );
  process.exit(0);
}

// (c) PR body の Closes/Fixes/Resolves/Refs パターン照合
const CLOSE_PATTERN = /(?:Closes|Closed|Close|Fixes|Fixed|Fix|Resolves|Resolved|Resolve)\s+#\d+/i;
const REFS_PATTERN = /Refs?\s+#\d+/i;

if (CLOSE_PATTERN.test(prBody) || REFS_PATTERN.test(prBody)) {
  console.log(
    '[check-pr-issue-link] PR body に Issue 紐付け (Closes/Fixes/Resolves/Refs #N) を検出 — pass',
  );
  process.exit(0);
}

// (d) fail
console.error(
  "[check-pr-issue-link] PR body に親 Issue 紐付けが見つかりません。 'Closes #<N>' / 'Refs #<N>' のいずれかを PR body に含めるか、 docs-only/chore の場合は 'no-issue' label を付けてください (= R-82 / PR template §1)",
);
process.exit(1);
