#!/usr/bin/env node
/**
 * R-16 自動化: SessionStart に Design / ADR 優先順位を毎回注入
 *
 * SessionStart hook (matcher: startup | resume)
 * - Design / モックアップ参照時の判断基準を hookSpecificOutput.additionalContext で注入
 */

const reminder = [
  '【R-16 + R-19 自動リマインダー（セッション毎）】',
  '',
  '## Design / モックアップ参照時のルール',
  '- Design / Wireframe / モックアップ ファイル (例: Claude Design HTML / JSX) は **下書き**',
  '- ビジネス仕様 / Pro 方針 / 機能採否は **議論済 ADR (docs/adr/) が正**',
  '- Design と ADR が矛盾したら ADR を採用、ユーザーに確認を取ること',
  '- 認識をはき違えない (前セッション F-10 で「全機能 Free」と Design を信じて推奨してしまい撤回した事例あり)',
  '',
  '## Engram 保存のルール (R-19)',
  '- mem_save の content は 1KB (1024 文字) 以内',
  '- 長文の決定事項は ADR ファイル / Issue 本文に書く',
  '- Engram は索引のみ (例: 「ADR-0016 起票完了、Pro 限定維持」程度)',
  '- 30 秒以上応答ない場合はハング扱い、ユーザーに即時報告 (R-15)',
  '',
  '## R-13 議論モード準備',
  '- /discuss 起動時は質問数とラウンド数を冒頭で予告',
  '- 念のため再検証時は既存 ADR を必ず先に Read (R-20)',
  '- 「全部推薦で OK」即時実行禁止、4 段階強制 (R-17)',
].join('\n');

const output = {
  hookSpecificOutput: {
    hookEventName: 'SessionStart',
    additionalContext: reminder,
  },
};
process.stdout.write(JSON.stringify(output));
process.exit(0);
