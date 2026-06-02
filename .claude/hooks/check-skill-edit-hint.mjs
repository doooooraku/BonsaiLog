#!/usr/bin/env node
/**
 * ADR-0051 D-6: skill-creator skill 文脈検知 hook
 *
 * UserPromptSubmit hook
 * - ユーザープロンプトに skill 編集・改善・新規作成系のキーワードが含まれたら、
 *   `skill-creator` skill + BONSAI-OVERRIDE.md の参照リマインダーを注入。
 *
 * 設計理由:
 * - 該当 skill (Anthropic 上流) は description マッチング auto-trigger だが、
 *   Sess61 で /release-android skill を新規作成した際にも発火していなかった (Engram 言及 63 件、 90 日 git log 0 件)。
 * - 「skill 改修」 「triggering 率」 「SKILL.md 編集」 等の意図表現を能動検知して活用率を底上げ。
 *
 * 注意: BonsaiLog 既存 skill 名 (release-android / discuss 等) の出現自体ではマッチさせない。
 *       skill **編集・改善・新規作成** の意図表現のみマッチさせる。
 */
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const prompt = input?.user_prompt || input?.prompt || '';

const triggers = [
  /skill.{0,5}作成/,
  /skill.{0,5}改修/,
  /skill.{0,5}追加/,
  /skill.{0,5}新規/,
  /skill.{0,5}編集/,
  /SKILL\.md/,
  /\.claude\/skills\//,
  /agent-tools\/skills\//,
  /自動発火/,
  /auto.trigger/i,
  /skill description/i,
  /triggering.{0,5}率/,
  /skill.{0,5}optimize/i,
  /skill.{0,5}edit/i,
  /skill.{0,5}create/i,
  /skill.{0,5}eval/i,
  /improve_description/,
];

if (!triggers.some((re) => re.test(prompt))) process.exit(0);

const reminder = [
  '【skill 編集・改善 文脈検知 — skill-creator skill ヒント (ADR-0051 D-6)】',
  '',
  '該当キーワードを検知しました。以下を Read することで BonsaiLog の skill 命名規約と評価手順を確認できます:',
  '',
  '- `.claude/skills/skill-creator/SKILL.md` (upstream Anthropic の skill 開発標準ループ)',
  '- `.claude/skills/skill-creator/BONSAI-OVERRIDE.md` (BonsaiLog 固有: 配置 / 命名規約 / quick_validate.py / 既存 12 skill 評価サンプル)',
  '',
  '判断順序:',
  '1. BONSAI-OVERRIDE.md §1 (ディレクトリ + 命名規約) と §4 (足す前ゲート 3 自問) を先に Read',
  '2. SKILL.md の skill 作成プロセスを Read',
  '3. 新規 skill 追加 PR では足す前ゲート (a)(b)(c) を PR 本文に 1 行記載 (ADR-0046 D-3)',
  '4. **追加課金ゼロ厳守** (ADR-0047): improve_description.py / run_eval.py は Anthropic API 課金あり、原則実行しない。 quick_validate.py で代替',
].join('\n');

const output = {
  hookSpecificOutput: {
    hookEventName: 'UserPromptSubmit',
    additionalContext: reminder,
  },
};
process.stdout.write(JSON.stringify(output));
process.exit(0);
