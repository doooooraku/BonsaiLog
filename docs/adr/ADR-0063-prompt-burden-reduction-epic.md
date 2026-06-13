# ADR-0063: Sess108 Prompt Burden Reduction — 9 改善案 Epic (Sess108)

- Status: Accepted
- Date: 2026-06-14
- Deciders: @doooooraku
- Related: Epic Issue #1284 / 子 Issue #1285-#1293 / Notion ページ「実機に画面 UI 反映」 (https://app.notion.com/p/UI-35b0ee330ea080b9891bcc553b515e57) / ADR-0064 (案 8 認知飽和ガード 個別 ADR)

---

## Context

**問題**: user が Notion ページに Claude Code への指示を 215 件 / 13 ヶ月分 / 153KB 貯めて手動コピペ運用していた。 Sess108 (2026-06-14) で 6 専門家並列 Workflow (= 7 agents / 592K tokens) で全プロンプトを構造化分析し、 user の「考え方」 8 軸を抽出。

**思考 8 軸の事実 (215 prompts 統計)**:

| #   | 軸                                | 件数     | 意味                                              |
| --- | --------------------------------- | -------- | ------------------------------------------------- |
| ①   | UI 修正 + 画像 SS                 | 93 (43%) | 言葉 + 画像 2 セットが基本契約                    |
| ②   | "誰にでもわかるように"            | 50       | 説明品質 = 最重要 KPI #1                          |
| ③   | mockup/ClaudeDesign 寄せ          | 35       | 写経駆動 (R-29/ADR-0059) を尊重                   |
| ④   | 先回り/自走/API・MCP・CLI         | 11       | "人間にしかできないことだけ" 原則                 |
| ⑤   | プロセス批判 (なんで質問してきた) | 6        | 信頼破壊シグナル、 R-82 hook 発火タイミング不一致 |
| ⑥   | 進捗監査 (残タスク/現在地)        | 31       | テンプレ化済、 Skill 1 コマンド化要               |
| ⑦   | "なぜなら" 根拠付け               | 8        | 推測ベース嫌、 一次情報優先                       |
| ⑧   | テスター意見翻訳依頼              | 4        | W-00 自動化要求                                   |

**既存インフラのカバー率**: 17 Skill / 16 Hook / R-1〜R-82 / Engram / MEMORY / Notion MCP / Figma MCP は揃っていたが、 毎セッション「同じテンプレを paste」 する自動注入の穴が複数発覚。

---

## Decision

**9 改善案を 3 Stage で段階リリース** (パッケージ C = 全採用、 user 決定):

### Stage A (= 即効、 5 PR)

1. **案 1** Windows/WSL path 自動正規化 hook (PR #1302) — PreToolUse(Read) + UserPromptSubmit hook
2. **案 2** 説明品質 2 段ゲート + UI 用語辞書 SoT (PR #1304) — UserPromptSubmit + Stop hook + .claude/glossary/ui-terms.md
3. **案 3** AskUserQuestion 抑制 + 共通 transcript-scanner lib (PR #1305) — PreToolUse(AskUserQuestion) + lib/
4. **案 4** /ui-fix 統合 Skill (PR #1300) — UI 修正の一気通貫 (path 正規化 + screen-id 同定 + mockup 取込 + ASCII 図差分 + 写経 5 段階 + /device-verify 連結)
5. **案 6** /now-here-next Skill (PR #1299) — 引数ゼロで「目的→現在地→残→次手」 ASCII

### Stage B (= 0.5 日、 2 PR)

6. **案 5** /tester-voice Skill (PR #1308) — テスター意見 翻訳 + R-55 横断調査 + 改善提案 3-in-1
7. **案 9** 実機検証 Step 6 自動化 + stop-verify-gate 層 B (PR #1310) — SS 不在 + commit/push 検出時 block

### Stage C (= 1 日、 2 PR)

8. **案 7** Notion 双方向同期 (PR #1309) — /notion-intake + /notion-report + SessionStart hook + session-end 連結
9. **案 8** 認知飽和ガード + 効果計測 6 軸基盤 (PR #1312) — r-rule-inventory / memory-stale-detector / measure-prompt-metrics / log-prompt-metrics hook / 月次 self-audit cron / ADR-0064 個別 ADR

---

## Decision Drivers

- **user 最重要 KPI #1 = 説明品質**: 「誰にでもわかるように」 50 件出現 → 案 2 で説明テンプレ自動注入 + Stop hook self-judge
- **最頻パターン (43%) = UI 修正 + 画像**: 案 1 (path 正規化) + 案 4 (/ui-fix Skill) で 1 段階に集約
- **信頼破壊シグナル消滅**: 案 3 (AskUserQuestion 抑制) で再質問怒り構造解消
- **自走範囲拡大**: 案 7 (Notion 双方向) で「先回り」 軸 ④ を最大実現
- **構造的健全性**: 案 8 (認知飽和ガード) で「追加するなら削る」 仕組み導入

---

## Alternatives

### 案 X (採用せず): Stage A のみで「効果が見えたら追加」

- メリット: 投資コスト最小 (1 日)
- デメリット: user 軸 ④ (先回り/自走) を満たさない / Notion 手動コピペ継続
- 却下理由: user 明示判断「効果が見えるなら全施策盛り込みたい」 + 6 軸計測で客観評価可能なので Stage C まで通すほうが ROI 高

### 案 Y (採用せず): 全 9 案 を 1 PR にまとめる

- メリット: 議論 + 設計 + 実装 + merge を 1 サイクルで完結
- デメリット: PR レビュー困難 / revert 単位が大きすぎる / CI 並列性失う
- 却下理由: BonsaiLog の「1 PR = 1 案 = 1 Issue」 原則 (W-flow / R-57) に反する

---

## Consequences

### Positive

- user プロンプト平均長 663 字 → < 400 字 (Stage A 目標、 計測中)
- 「誰にでもわかる」 出現率 23% → < 10% (= 説明品質テンプレ自動注入で短縮効果)
- Frustrated prompt 6 件/13ヶ月 → 0 (案 3 構造解決)
- 17 Skill → 22 Skill (5 新規: /ui-fix / /now-here-next / /tester-voice / /notion-intake / /notion-report)
- 16 hook → 21 hook (5 新規: normalize-windows-paths / inject-normalized-paths / check-explain-quality-hint / stop-explain-self-judge / check-ask-after-approval / log-prompt-metrics / session-start-notion-review)
- 月次 self-audit cron で R 件数 + MEMORY stale + 6 軸計測の客観評価ループ確立

### Negative

- Skill 5 件 + hook 7 件追加で認知負荷増 (= ADR-0064 認知飽和ガードで構造的緩和)
- Notion 双方向同期は ENV flag (`BONSAI_NOTION_SYNC=off`) で off 可能だが、 default on で MCP 認証切れ時のサイレント失敗リスク
- 案 2 Stop hook self-judge は regex 簡易判定で false positive リスク (= block しない設計で緩和)

### Follow-ups

- [ ] Stage A 配信 1 週間後に 6 軸計測 → 改善が見えれば Stage B 着手承認
- [ ] Stage B 配信 2 週間後に 6 軸再計測 → Stage C 着手承認
- [ ] 月次 self-audit cron 初回起動確認 (2026-07-01)
- [ ] /tester-voice / /notion-intake / /notion-report の実機運用フィードバック (テスター意見 1 件で運用 dry-run)

---

## Acceptance / Tests

- [x] 9 PR が main merge 済 (PR #1299/#1300/#1302/#1304/#1305/#1308/#1309/#1310/#1312)
- [x] 5 hook + 5 Skill + 3 計測 script + 1 GitHub Actions + 2 ADR が稼働
- [x] `pnpm r:inventory` / `pnpm metrics:report` / `pnpm memory:stale` script alias 配線
- [x] `scripts/docs-lint.mjs` Check 10 (認知飽和ガード R-rule) 追加
- [ ] 6 軸計測 bootstrap 値記録 (Stage A 配信時点の baseline)
- [ ] 月次 self-audit cron が 2026-07-01 に起動 (= 初回確認)

---

## Rollout / Rollback

- 各 PR は revert 1 つで戻せる粒度 (= 1 hook / 1 Skill / 1 script 単位)
- settings.json への hook 登録は各 PR の最後で個別追加 → revert で 1 hook 単位で外せる
- Notion 同期は ENV flag `BONSAI_NOTION_SYNC=off` で全 off 可能
- 案 8 月次 cron は `.github/workflows/monthly-self-audit.yml` 削除で即停止
- Stage A 配信後に 6 軸計測で改善が見えない場合 = Stage B 着手前に AskUserQuestion で「修正 vs 中止」 判断 (user 条件)

---

## Links

- Epic Issue: #1284
- 子 Issue: #1285-#1293
- Plan file: `~/.claude/plans/or-worktree-purrfect-hamster.md`
- Engram memory: `sess108-thinking-pattern-analysis.md`
- 元データ: Notion ページ「実機に画面 UI 反映」 (https://app.notion.com/p/UI-35b0ee330ea080b9891bcc553b515e57)
- Workflow run (分析): wf_32a3b3ce-7a8 (7 agents / 592K tokens / 11 分)
- Workflow run (Stage A 実装): wf_293755ff-cbf (5 agents / 410K tokens / 15 分)
- Workflow run (Stage B+C 実装): wf_df3b49d4-44f (4 agents / 446K tokens / 17 分)
- 関連 ADR: ADR-0064 (案 8 認知飽和ガード 個別 ADR) / ADR-0059 (写経駆動 ADR-0059、 案 4 連携) / ADR-0046 (足す前ゲート) / ADR-0051 D-6 (skill trigger hint hook、 案 2 と同 pattern)
- 関連恒常指示: feedback-explain-plainly-with-diagrams / feedback-proposals-with-rationale / feedback-use-ask-user-question / feedback-plan-approval-implies-execution / feedback-refactor-while-coding / feedback-verify-after-scripted-edits / feedback-verify-by-screencap-each-step
