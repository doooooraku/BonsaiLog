# 1 画面 UI 整合ループ — 標準手順書

> **目的優先、 手順は guideline です**。 個別画面の特性で柔軟に判断してください、 ガチガチに踏襲する必要はありません。
> 目的: mockup (`docs/mockups/v1.0/wireframes/`) と実機 SS を比較し、 1 画面ずつ整合性レベル 2 以上に強化する。
> Sess5 PR-1 (onboarding-language) と PR-2 (onboarding-notification) で確立、 1 画面あたり約 20-30 分。

---

## 関連 docs / Rules

- 親 ADR: `docs/adr/ADR-0021-ui-diff-pipeline.md` (pipeline の Initial 版 + Sess5 Notes Amended)
- 補助 docs: `docs/how-to/ui-diff/multipage-capture-pattern.md` (multi-page 撮影専用)
- prompt 雛形: `docs/handoff/templates/screen-integration-prompt.md`
- 学び集約: `docs/reference/tasks/lessons/auto-improve-loop.md`
- 行動 lesson: `.claude/recurrence-prevention.md` (R-1 / R-13 / R-17 / R-25 / R-29)
- PR template: `.github/pull_request_template.md` §7.5 / §7.6 / W-10.5

---

## 8 step ループ

### Step 1: 議論モード起動 + R-13 予告

| 項目      | 内容                                                                                                                 |
| --------- | -------------------------------------------------------------------------------------------------------------------- |
| Input     | user 「[画面 id] を進めて」 or 「○○画面の比較レポート」                                                              |
| 処理      | (1) R-13 予告 「N 件質問、 M ラウンド」、 (2) R-20 既存 ADR / specs を Read、 (3) R-16 Design 下書き / ADR 正 を明示 |
| Output    | 予告メッセージ + 関連 ADR / Issue リンク                                                                             |
| 完了条件  | user が議論の規模を予測できる状態                                                                                    |
| user 確認 | 不要 (議論開始の宣言のみ)                                                                                            |

### Step 2: 比較レポート (mockup vs 実機)

| 項目             | 内容                                                                                                                                                                                                                                                                                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Input            | 画面 id (例: `bonsai-tab`)                                                                                                                                                                                                                                                                                                                                     |
| 処理 (並列 Read) | (1) mockup PNG: `docs/mockups/v1.0/screenshots/<id>.png` (multi-page なら `-01.png`, `-02.png` ...)、 (2) 実機 SS: skip-list の `reevalArtifact \|\| artifact` から最新 SS、 (3) 実機実装: `app/<screen>/index.tsx` 等 (R-18)、 (4) SCREEN_PAIRS / mockup config: `scripts/ui-diff/config.ts` + `mockup-screenshots-config.ts`、 (5) 関連 ADR / lessons (R-20) |
| Output           | R-25 構造系 4 項目評価 (タブ/セクション/UI 種別/スクロール範囲) + 詳細視覚差分一覧 (7-10 項目)                                                                                                                                                                                                                                                                 |
| 完了条件         | 全差分を user 確認可能な表形式に整理                                                                                                                                                                                                                                                                                                                           |
| user 確認        | 不要 (Step 3 で承認求める)                                                                                                                                                                                                                                                                                                                                     |

### Step 3: 修正候補提示 + ペルソナ評価 + 質問

| 項目      | 内容                                                                                                                                                                                                                      |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Input     | Step 2 の差分一覧                                                                                                                                                                                                         |
| 処理      | (1) 「許容差分」 (環境差 / Expo bug / OS 差) と「修正候補」 を区別、 (2) 修正候補ごとに 4 ペルソナ評価 (高橋/Marcus/プロ/ライト、 R-10)、 (3) 「私の推薦」 + 反対意見明示 (R-11)、 (4) 質問は判断材料 + 推薦セット (R-11) |
| Output    | 修正候補ランキング表 + ペルソナマトリクス + 質問 (3-5 件以内)                                                                                                                                                             |
| 完了条件  | user が短い回答で意思決定可能な状態                                                                                                                                                                                       |
| user 確認 | **必須** (Q-N1 a / Q-N2 b 等の明示承認)                                                                                                                                                                                   |

### Step 4: 修正実行 (R-17 段階 4)

| 項目      | 内容                                                                                                                                                                                                                          |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Input     | Step 3 の承認内容                                                                                                                                                                                                             |
| 処理      | (1) 関連画面 / 機能の影響範囲を自動判定 (settings 画面の言語切替や他 tut step 等)、 (2) Edit でコード修正、 (3) ホットリロード反映確認 (`bash scripts/dev/reload-app.sh`)、 (4) `pnpm type-check && pnpm i18n:check` で緑確認 |
| Output    | git diff (modified files)、 型 EXIT=0 + i18n EXIT=0                                                                                                                                                                           |
| 完了条件  | type-check と i18n:check が EXIT=0                                                                                                                                                                                            |
| user 確認 | 不要 (Step 6 で再確認)                                                                                                                                                                                                        |

### Step 5: Maestro 再撮影

| 項目      | 内容                                                                                                                                                                                                             |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Input     | 画面 id + 出力 dir                                                                                                                                                                                               |
| 処理      | Single page: `bash scripts/ui-diff/capture-with-logs.sh <flow-id> <out-dir>` (新形式: `<out-dir>/app/<id>.png`)。 Multi-page: `docs/how-to/ui-diff/multipage-capture-pattern.md` 参照 (swipe + ImageMagick 連結) |
| Output    | 新 SS PNG (`scripts/ui-diff/out/<ts>/<flow-id>/app/<id>.png`)                                                                                                                                                    |
| 完了条件  | Maestro PASS + PNG 存在                                                                                                                                                                                          |
| user 確認 | 不要                                                                                                                                                                                                             |

### Step 6: R-25 再評価 + skip-list 更新

| 項目      | 内容                                                                                                                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Input     | 新 SS PNG                                                                                                                                                                                                           |
| 処理      | (1) 新 SS を **Claude が Read で目視確認** (機械判定のみで「達成」 判定禁止、 R-25)、 (2) 構造系 4 項目チェック、 (3) skip-list の `reevalArtifact` / `reevalPassedAt` / `reevalRationale` / `reevalIteration` 更新 |
| Output    | skip-list.json の該当 entry 更新                                                                                                                                                                                    |
| 完了条件  | R-25 全 4 項目 ✅ (or user 受容判定)                                                                                                                                                                                |
| user 確認 | 不要                                                                                                                                                                                                                |

### Step 7: pairing-report 再生成 + verification

| 項目      | 内容                                                                                                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Input     | skip-list 最新状態                                                                                                                                                                                     |
| 処理      | (1) `node scripts/ui-diff/generate-pairing-report.mjs` で再生成、 (2) **base64 chunk grep で SS 反映を Claude が自分で検証** (R-1 拡張、 「✅ 完了」 だけで終わらせない)、 (3) SS 反映確認 log を Read |
| Output    | pairing-report.html 更新 + 整合済 row 全件 OK ログ + 新 SS hit count >= 1                                                                                                                              |
| 完了条件  | 「整合済 row 全件 SS 反映 OK」 + 新 SS grep hit ≥ 1                                                                                                                                                    |
| user 確認 | 不要 (Claude self-verification)                                                                                                                                                                        |

### Step 8: user 確認 + commit / PR / merge

| 項目      | 内容                                                                                                                                                                                                                                                                                                             |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Input     | pairing-report URL + 期待表示要約                                                                                                                                                                                                                                                                                |
| 処理      | (1) user に pairing-report URL + F5 指示、 (2) user 「OK」 受領 → branch + commit (Conventional commits)、 (3) push + PR (R-29 §7.5 / R-25 §7.6 / W-10.5 review 全 fill)、 (4) CI 緑確認 (`gh pr checks --watch`)、 (5) `gh pr merge --squash --delete-branch`、 (6) main 同期、 (7) Engram session_summary 保存 |
| Output    | PR merge 完了、 main 同期、 Engram 保存済                                                                                                                                                                                                                                                                        |
| 完了条件  | merge 成功 + Engram 保存 + Task close                                                                                                                                                                                                                                                                            |
| user 確認 | **必須** (pairing-report 目視 + 修正納得 OK)                                                                                                                                                                                                                                                                     |

---

## チェックリスト (画面完了前に確認)

- ☐ R-13 予告した (質問数 + ラウンド数)
- ☐ R-20 既存 ADR を Read した
- ☐ R-16 Design 下書き / ADR 正 を明示した
- ☐ R-25 構造系 4 項目 全 ✅ (or user 受容判定)
- ☐ R-29 写経駆動開発 5 段階完了
- ☐ R-1 「pairing-report 生成後の検証」 Claude 自身で実施 (base64 chunk grep)
- ☐ user 確認回数 3 回以内 (Step 3 質問 / Step 8 目視 のみ)
- ☐ PR description に R-29 §7.5 / R-25 §7.6 / W-10.5 review 全 fill

---

## 異常時の対処

| 症状                                | 対処                                                                                           |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| Maestro flow fail                   | `capture-with-logs.sh` の summary.md + logcat.log で原因切り分け、 必要なら flow 修正          |
| ホットリロード反映しない            | Native コード変更なら rebuild 必要 (`pnpm build:android:dev:local`)、 JS のみなら Metro 再起動 |
| pairing-report で新 SS 反映されない | skip-list の `reevalArtifact` path 確認、 capture-app.sh 新形式 = `<artifact>/app/<id>.png`    |
| R-25 構造的差分発覚                 | 修正候補に追加、 user 判定 (修正 or 受容)                                                      |
| CI fail                             | `gh pr checks` で失敗 job 確認、 ローカル `pnpm verify` 再実行で再現確認                       |

---

## 例 (Sess5 PR-1 / PR-2 スナップショット)

### PR-1 (onboarding-language)

- 修正 4 件: Subtitle `\n` 改行 / Back button ‹ / 端末言語 top sortedOptions / radio ◯/● marker
- multi-page 連結 1 枚 (720x3600 px、 4-page 撮影 + ImageMagick crop 連結)
- 影響範囲: app/onboarding/language.tsx + app/settings/language.tsx (UI 統一) + i18n 19 言語 back キー
- 所要時間: 約 60-90 分 (multi-page 撮影で試行錯誤 4 回、 仕組み化後は 20-30 分目標)

### PR-2 (onboarding-notification)

- 修正 5 件: Back button + Bell outline SVG + Title 「だけ」 削除 + Body 端的化 + 「あとで」 underline
- single page 撮影 (`capture-with-logs.sh` で完結)
- 影響範囲: app/onboarding/tut/[step].tsx + i18n ja のみ
- 所要時間: 約 25-30 分

---

## 関連 R-rules 適用早見表

| Rule | 適用 step | 内容                                                          |
| ---- | --------- | ------------------------------------------------------------- |
| R-1  | Step 7    | pairing-report 生成後の Claude self-verification              |
| R-13 | Step 1    | 質問数 + ラウンド数 予告                                      |
| R-16 | Step 1    | Design 下書き / ADR 正 明示                                   |
| R-17 | Step 4    | 4 段階 (議論 → 計画 → 承認 → 実行) 強制                       |
| R-18 | Step 2, 4 | Edit 前の Read 必須                                           |
| R-20 | Step 1, 2 | 「念のため」 議論時 既存 ADR Read                             |
| R-25 | Step 2, 6 | 構造系 4 項目 Claude Read 主導判定                            |
| R-29 | Step 2-6  | 写経駆動開発 5 段階 (mockup jsx + PNG + RN + 撮影 + 並列比較) |
| R-32 | Step 8    | commit 前 git diff --cached 目視                              |
