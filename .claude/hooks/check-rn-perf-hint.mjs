#!/usr/bin/env node
/**
 * ADR-0051 D-6: react-native-best-practices skill 文脈検知 hook
 *
 * UserPromptSubmit hook
 * - ユーザープロンプトに RN 性能・Hermes Intl 系のキーワードが含まれたら、
 *   `react-native-best-practices` skill + BONSAI-OVERRIDE.md の参照リマインダーを注入。
 *
 * 設計理由:
 * - 該当 skill (Callstack 上流) は description マッチング auto-trigger だが、
 *   BonsaiLog 実会話 (Hermes Intl 19 言語 / Paywall FlashList / formatInTimeZone) と
 *   description キーワードが噛み合わず発火率が極小 (Engram 言及 17 件、90 日 git log 1 件)。
 * - Hook で能動検知 → 注入することで発火率を構造的に底上げする。
 */
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const prompt = input?.user_prompt || input?.prompt || '';

const triggers = [
  /Hermes/i,
  /FlashList/,
  /Reanimated/,
  /\bFPS\b/i,
  /\bTTI\b/i,
  /bundle.{0,5}size/i,
  /memory.{0,5}leak/i,
  /jank/i,
  /frame.{0,5}drop/i,
  /再レンダリング/,
  /JS thread/i,
  /bridge.{0,10}overhead/i,
  /Intl.{0,15}crash/i,
  /formatInTimeZone/,
  /RangeError/,
];

if (!triggers.some((re) => re.test(prompt))) process.exit(0);

const reminder = [
  '【RN 性能/Intl 文脈検知 — react-native-best-practices skill ヒント (ADR-0051 D-6)】',
  '',
  '該当キーワードを検知しました。以下を Read することで「すでに整理済の最新ベストプラクティス」を活用できます:',
  '',
  '- `.claude/skills/react-native-best-practices/SKILL.md` (upstream Callstack の RN 性能最適化ガイド本体)',
  '- `.claude/skills/react-native-best-practices/BONSAI-OVERRIDE.md` (BonsaiLog 固有: Hermes Intl 19 言語 / Paywall FlashList 候補 / expo-sqlite 写真 base64 / Reanimated 4)',
  '',
  '判断順序:',
  '1. BONSAI-OVERRIDE.md §1 (頻出文脈) を先に Read',
  '2. SKILL.md の該当 Guideline (js-* / native-* / bundle-*) を Read',
  '3. R-25 (構造系評価) + R-55 (関連項目網羅調査) を適用',
].join('\n');

const output = {
  hookSpecificOutput: {
    hookEventName: 'UserPromptSubmit',
    additionalContext: reminder,
  },
};
process.stdout.write(JSON.stringify(output));
process.exit(0);
