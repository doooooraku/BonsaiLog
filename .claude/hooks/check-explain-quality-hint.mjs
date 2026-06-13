#!/usr/bin/env node
/**
 * check-explain-quality-hint.mjs — Sess108 案 2 説明品質ゲート (前段)
 *
 * 由来: Notion 215 prompts 分析 (Sess108) + feedback-explain-plainly-with-diagrams.md
 *       + feedback-proposals-with-rationale.md。 user 恒常指示「平易な言葉 + ASCII 図 +
 *       背景/メリデメ/所要時間」 をプロンプト submit 時に能動的にリマインダ注入。
 *
 * 役割: UserPromptSubmit hook — user prompt から「説明 / 進捗 / 残タスク / 提案」 系の
 *       トリガ keyword を検知し、 6 点セット (結論先出し / ASCII 図 / 複数案 / 平易訳 /
 *       所要時間 / 略語) を additionalContext で注入する。 block しない (silent exit 0)。
 *
 * 設計理由: 説明品質の自己判定は Stop hook (stop-explain-self-judge.mjs) で行うが、
 *           prompt submit 時に先回りでテンプレを注入することで「最初から品質を満たす」 確率を上げる。
 *           false positive 防止に「(参考リマインダー、 文脈に応じて取捨選択可)」 を末尾に付与。
 */
import { readFileSync } from 'node:fs';

try {
  const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
  const prompt = String(input?.user_prompt ?? input?.prompt ?? input?.user_message ?? '');

  const triggers = [
    /誰にでもわか/,
    /小中学生/,
    /時間.{0,3}トークン/,
    /残タスク/,
    /進捗/,
    /現在地/,
    /目的を策定/,
    /誰でもわか/,
    /湯水/,
  ];

  if (!triggers.some((re) => re.test(prompt))) process.exit(0);

  const reminder = [
    '【説明品質テンプレ — Notion 215 prompts 分析由来 (Sess108 案 2)】',
    '',
    '1. 構成は **結論 → 理由 → 詳細** の順',
    '2. UI/構造/配置を伝える時は **ASCII 図** を必ず付ける',
    '3. 提案は **複数案 + メリデメ + 推薦根拠** の 3 点セット',
    '4. 専門用語は **初出で「= 平易訳」 併記** (.claude/glossary/ui-terms.md 参照)',
    '5. 所要時間は **(X 〜 Y 分)** でレンジ表記',
    '6. 略語は **フルスペル + 和訳** 併記',
    '',
    '(参考リマインダー、 文脈に応じて取捨選択可)',
  ].join('\n');

  const output = {
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: reminder,
    },
  };
  process.stdout.write(JSON.stringify(output));
  process.exit(0);
} catch {
  process.exit(0);
}
