# UI Diff 自動改善ループ — 次セッション用クイックスタート

> **このファイルのロール**: 次セッション開始時に Claude Code に「これ読んで」と渡す簡潔ガイド。詳細は `auto-improve-loop.md` を参照。

最終更新: 2026-05-11 (Phase 0.1 完成、本セッション末で次セッション用に整備)

---

## 0. このセッションでやること (1 行)

実機の画面とお手本 (mockup) を機械的に並べて見比べ、ズレを直す PR を Claude が自動量産します。
ユーザーの操作は **実機 USB 接続 + 初回「Continue」1 タップ** のみ。あとは寝ても OK。

---

## 1. Claude が起動前にやること

順番に並列で:

```
1. mem_context で前回のセッションサマリを読む
2. cat scripts/ui-diff/out/SUMMARY-loop.md で進捗確認
   (前回時点 15 flow 中 0 達成 / 残 15)
3. Read docs/how-to/ui-diff/auto-improve-loop.md で運用ルール再確認
4. Read docs/reference/integration-criteria.md で整合度レベル判定基準確認
```

---

## 2. ユーザー側操作 (1 回だけ)

```
1. 実機 BonsaiLog dev build を USB 接続
2. pnpm dev で Metro 起動 (background)
3. adb reverse tcp:8081 tcp:8081
4. もし dev menu「Continue」が出たら 1 タップで消す
   (以降 Maestro flow が自動 dismiss してくれる、PR #391)
5. 設定タブ → 「[DEV] テストデータを投入」
   (盆栽 3 件 + 写真 2 + tags 3 + 記録 15 件、PR #385)
```

---

## 3. ループ起動コマンド

ユーザー: **「ループ開始」**

Claude は以下を自動実行:

```
preflight (5 項目) → 1 flow 試走 → side-by-side PNG を Read で評価
  → 整合度レベル 1/2/3 判定 (integration-criteria.md 参照)
  → 未達なら改善 PR (10 秒承認 → 実装 → verify → push → CI → merge)
  → SUMMARY-loop.md 更新 (pnpm exec tsx scripts/ui-diff/summary.ts)
  → 次 flow へ
```

---

## 4. 守るべきルール (絶対厳守)

### スコープ (Q1=(a))

- ✅ UI 整合性のみ (style / layout / 色 / margin / mockup 整合)
- ❌ 機能追加 / DB schema 変更 / API 変更 / ADR 変更 → 人間に上申

### 承認モード (Q2=(a) 半自走)

- 各 PR 前に 1 文の計画提示
- 10 秒待機 → ユーザー応答なし = 暗黙承認 → 実行
- ユーザーが「stop」「待って」で即停止

### 暴走対策 3 重防御

1. **kill switch**: 各サイクル前に `node scripts/ui-diff/kill-switch.mjs` チェック (exit 1 = STOP)
2. **skip list**: 同 flow 同箇所 2 回失敗で `scripts/ui-diff/skip-list.json` 永久追加
3. **RMSE 悪化検知**: `node scripts/ui-diff/auto-revert.mjs <flow>` (exit 1 = REGRESSION → `git revert HEAD`)

### 終了条件 (Q4=(a))

- 全対象 flow が整合度レベル 2 (80%) 達成
- ユーザー停止指示
- `/tmp/claude-stop.flag` 検知

---

## 5. 対象 flow

### まず既存 15 flow から開始 (Phase 1)

```
bonsai-tab / onboarding-welcome / bonsai-detail / plan-tab / wiring-list /
watering-heatmap / settings-tab / paywall / look-back-tab / look-back-search /
home-bulk-sched-work / home-bulk-sched-date /
bonsai-create-sheet / bonsai-detail-edit-sheet / look-back-watering-history
```

### 全達成後 Phase 0.3-0.6 で残 26 flow 追加

4 HTML 全 41 画面網羅:

- 02-Home.html (残り 8 画面)
- 01-Onboarding.html (6 画面)
- 04-Export.html (6 画面)
- 05-Monetization.html (6 画面)

flow yaml は Claude が半自動生成 (Q4=(b) 探り探り)。

---

## 6. 進捗確認方法 (ユーザー側)

寝てる間 / 別作業中:

```bash
# 進捗ボード
cat scripts/ui-diff/out/SUMMARY-loop.md

# Engram session_summary は 5 サイクルごと自動保存
# GitHub の PR 一覧で [ui-diff-auto] プレフィックス PR を時系列で見れる
```

緊急停止:

- ユーザーが「stop」「待って」と Claude に伝える (即停止)
- または `touch /tmp/claude-stop.flag` (次サイクル前に停止)

---

## 7. 既知の罠 (本セッションで対応済、参考)

| 罠                                                | 対処                                                                                   |
| ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Continue dialog が force-stop で毎回復活          | Maestro flow の conditional dismiss step (主要 4 flow 対応済、残 11 は Phase 1 で順次) |
| BonsaiCard loading で FAB 非 render               | フィルタタブ「すべて」visible 待ち + testID tap                                        |
| snake_case row mapping (DB)                       | `src/db/rowMapper.ts` で吸収済                                                         |
| 編集ボタン scroll 必要 (bonsai-detail-edit-sheet) | `scrollUntilVisible` 追加未済 (Phase 1 で対応)                                         |
| AdMob banner                                      | mockup には無い、実機 Free モードに表示、永久 skip 候補                                |
| Status bar 差                                     | mockup 9:41 固定、実機リアルタイム、永久 skip 候補                                     |

---

## 8. 期待される成果

- **1 サイクル ~10 min** (preflight → 試走 → 評価 → 改善 PR → CI → merge)
- **8 時間で 30-50 PR** (整合度 60% → 90% 想定)
- **全 15 flow 達成** で Phase 1 完了 → Phase 0.3-0.6 で 26 flow 追加へ移行

---

## 9. 関連ドキュメント

- `docs/how-to/ui-diff/auto-improve-loop.md` (運用 doc、最重要、起動前 Read 推奨)
- `docs/reference/integration-criteria.md` (整合度レベル 0/1/2/3 定義、既存)
- `.claude/CLAUDE.md` 末尾「UI Diff 自動改善ループ運用ルール」section
- ADR-0021 (UI 差分検出パイプライン)

---

## 10. 利用可能なコマンド

| コマンド                                       | 役割                              |
| ---------------------------------------------- | --------------------------------- |
| `pnpm exec node scripts/ui-diff/preflight.mjs` | 環境チェック (5 項目)             |
| `pnpm exec tsx scripts/ui-diff/run.ts <flow>`  | 1 サイクル実行                    |
| `pnpm exec tsx scripts/ui-diff/summary.ts`     | SUMMARY-loop.md 更新              |
| `node scripts/ui-diff/kill-switch.mjs`         | 停止チェック (exit 1=STOP)        |
| `node scripts/ui-diff/auto-revert.mjs <flow>`  | RMSE 悪化検知 (exit 1=REGRESSION) |
| `touch /tmp/claude-stop.flag`                  | 緊急停止フラグ作成                |
| `rm /tmp/claude-stop.flag`                     | 緊急停止解除                      |

---

## 11. ユーザー向けの「ループ開始」プロンプト

Claude にコピペで渡す:

```
あなたは BonsaiLog のシニアモバイル UI エンジニア兼 QA 自動化エンジニアです。
ui-diff 自動改善ループ Phase 1 運用を開始します。

前提:
- 実機 USB 接続済 (確認: adb devices)
- Metro server 起動済 (pnpm dev、adb reverse tcp:8081 tcp:8081 済)
- テストデータ投入済 (設定タブの [DEV] ボタン)
- Continue dialog dismiss 済 (実機で 1 タップ、以降は flow が自動)

最初に実行:
1. mem_context で前回のセッションサマリを読む
2. cat scripts/ui-diff/out/SUMMARY-loop.md で進捗確認
3. docs/how-to/ui-diff/auto-improve-loop-quickstart.md を Read

ループルール: docs/how-to/ui-diff/auto-improve-loop.md と
.claude/CLAUDE.md 末尾「UI Diff 自動改善ループ運用ルール」を厳守。

スコープ: UI 整合性のみ、機能変更禁止。
承認: 半自走 (10 秒承認、ユーザー stop / kill switch で即停止)。
終了: 全 15 flow 整合度レベル 2 (80%) 達成 OR ユーザー stop。

「ループ開始」と私が言ったら、preflight → 試走 → 評価 → 改善 PR の
サイクルを連続実行してください。

止めたい時は「stop」または touch /tmp/claude-stop.flag で。
```

---

## 12. 関連 PR (本セッションで構築)

- #377〜#384: Tier 2 / photo / 横断水やり 8 PR
- #385: dev seed テストデータ
- #386: dynamic→static import fix
- #387: photo snake_case fix
- #388: bonsai/event snake_case fix (rowMapper helper)
- #389: 主要 3 flow + config 追加
- #390: flow loading 待ち + FAB testID
- #391: 4 flow Continue dismiss
- **#392: 自動改善ループ土台 (Phase 0.1+0.2)**

合計 16 PR + Issue #361 close。
