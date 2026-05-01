#!/usr/bin/env node
/**
 * R-13 / R-20: 議論モード進入時の事前準備
 *
 * UserPromptSubmit hook
 * - ユーザープロンプトに「/discuss」「念のため」「再検証」「再議論」「もう一度」が含まれたら
 *   Claude にシステムリマインダーを注入:
 *   - R-13: 質問数とラウンド数を予告せよ
 *   - R-20: 既存 ADR / functional_spec を必ず先に Read せよ
 */
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const prompt = input?.user_prompt || input?.prompt || '';

const triggers = [/\/discuss/, /念のため/, /再検証/, /再議論/, /もう一度/, /練り直/];
const matched = triggers.some((re) => re.test(prompt));

if (!matched) process.exit(0);

const reminder = [
  '【R-13 + R-20 自動リマインダー】',
  '議論モードに入る前に必ず以下を実行:',
  '1. (R-13) この議論で何件質問するか + 想定ラウンド数を冒頭で予告する',
  '2. (R-20) 該当機能の既存 ADR (docs/adr/) と functional_spec の該当セクションを必ず Read してから議論を開始',
  '3. (R-16) Design / モックアップ参照時は「ADR が正、Design は下書き」を明示',
  '4. (R-7) 議論深さ 3 ラウンド以上、(R-8) フラット視点専門家を 1 名以上、(R-10) 4 ペルソナ評価必須',
  '5. (R-17) 「全部推薦で OK」即時実行禁止、TaskCreate → 計画 → 承認 → 実行 の 4 段階',
].join('\n');

// hookSpecificOutput.additionalContext で Claude に注入
const output = {
  hookSpecificOutput: {
    hookEventName: 'UserPromptSubmit',
    additionalContext: reminder,
  },
};
process.stdout.write(JSON.stringify(output));
process.exit(0);
