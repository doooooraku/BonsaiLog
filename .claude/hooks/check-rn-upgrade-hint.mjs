#!/usr/bin/env node
/**
 * ADR-0051 D-6: upgrading-react-native skill 文脈検知 hook
 *
 * UserPromptSubmit hook
 * - ユーザープロンプトに Expo SDK / RN version upgrade 系のキーワードが含まれたら、
 *   `upgrading-react-native` skill + BONSAI-OVERRIDE.md の参照リマインダーを注入。
 *
 * 設計理由:
 * - 該当 skill (Callstack 上流) は description マッチング auto-trigger だが、
 *   過去 3 ヶ月 SDK 56 議論ゼロで発火機会なし (Engram 言及 84 件、90 日 git log 0 件)。
 * - 将来の SDK 56/57 リリース時に user が忘れていても skill が自動参照されるよう、
 *   Hook で能動検知する。
 *
 * 注意: BonsaiLog ローカルコマンド名 (例: `pnpm prebuild`) との誤マッチを避けるため、
 *       `prebuild` 単独はトリガに含めず、 `rn-diff-purge` / `RN 0.8x` / `SDK upgrade` 等の
 *       upgrade 意図が明確な語のみマッチさせる。
 */
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const prompt = input?.user_prompt || input?.prompt || '';

const triggers = [
  /Expo SDK [56789]\d?/i,
  /\bSDK [56789]\d?\b/i,
  /SDK.{0,5}upgrade/i,
  /SDK.{0,5}upgrad/i,
  /rn-diff-purge/i,
  /RN 0\.8[4-9]/,
  /RN 0\.9/,
  /react.native.{0,5}upgrade/i,
  /breaking change/i,
  /CocoaPods.{0,10}update/i,
  /Gradle.{0,10}update/i,
  /native.{0,10}migration/i,
  /Hermes.{0,5}V[12]/i,
  /New Arch(itecture)?/i,
  /Fabric (renderer|enable)/i,
  /TurboModule/i,
];

if (!triggers.some((re) => re.test(prompt))) process.exit(0);

const reminder = [
  '【RN/Expo SDK upgrade 文脈検知 — upgrading-react-native skill ヒント (ADR-0051 D-6)】',
  '',
  '該当キーワードを検知しました。以下を Read することで Expo / RN upgrade の標準手順と BonsaiLog 固有の地雷を把握できます:',
  '',
  '- `.claude/skills/upgrading-react-native/SKILL.md` (upstream Callstack の upgrade 標準手順、 rn-diff-purge / CocoaPods / Gradle)',
  '- `.claude/skills/upgrading-react-native/BONSAI-OVERRIDE.md` (BonsaiLog 固有: SDK 55 現状スタック / Sess62 NoClassDefFoundError 教訓 / cloud-first 検証)',
  '',
  '判断順序:',
  '1. BONSAI-OVERRIDE.md §1-2 (現状スタック + チェックポイント) を先に Read',
  '2. SKILL.md の Typical Upgrade Sequence を Read',
  '3. R-9 既存スクリプト先読み + R-25 spec-code drift 防止を適用',
  '4. SDK upgrade は ADR で SoT 化 (BonsaiLog 全 expo-* dep は同 minor 一致厳守、 Sess62 教訓)',
].join('\n');

const output = {
  hookSpecificOutput: {
    hookEventName: 'UserPromptSubmit',
    additionalContext: reminder,
  },
};
process.stdout.write(JSON.stringify(output));
process.exit(0);
