---

# ADR-0064: 認知飽和ガード + 効果計測 6 軸基盤

- Status: Accepted
- Date: 2026-06-14
- Deciders: @doooooraku
- Related: Issue #1292 / Epic #1284 / ADR-0063 (Stage A+B+C 全体)

---

## Context（背景：いま何に困っている？）

- 現状：
  - R-1 〜 R-82 (再発防止ルール) が **82 件まで増殖**、 Skill 17 件、 hook 16 件、 MEMORY.md エントリ 50+ 件、 ADR 63 件。 Notion 215 prompts 分析 (Sess108) で「一度に読み切れない」 認知飽和の構造リスクが顕在化。
  - Stage A (PR #1273-#1278 で merge 済) で path normalize / 説明品質 / AskUserQuestion 抑制 / /ui-fix / /now-here-next を投入したが、 **効果計測が無い**。 user の「効果が見えるなら全施策で良い」 という条件を満たせない。
  - R 追加 PR が出るたびに「退役案 1 件」 を考えていないため、 削るほうの仕組みが欠落している。
- 困りごと：
  - Claude が再発防止ルールを「読んで」 も毎セッション全件 honor できない (= 認知容量超過)
  - MEMORY.md に死蔵エントリが溜まり、 mem_search の精度が落ちる
  - 改善施策の効果が定量化されないので、 Stage B/C を続けるべきか判断できない
- 制約/前提（リンク推奨）：
  - `docs/reference/constraints.md` の関連箇所：Constraints §9 (記憶の昇華ルール) §11 (パッケージマネージャ pnpm 必須)
  - 親 ADR-0063 (Sess108 Stage A+B+C 全体) の一部として Stage C を担当

---

## Decision（決めたこと：結論）

- 決定：
  1. **R 件数棚卸 CLI** (`pnpm r:inventory`) を導入し、 R 件数 + 退役推奨候補を機械検出する
  2. **MEMORY stale 検出 CLI** (`pnpm memory:stale`) で 90 日参照ゼロエントリを統合候補化
  3. **6 軸 prompt 計測** を UserPromptSubmit hook + `pnpm metrics:report` で silent 収集 + 可視化
  4. **月次 self-audit** を GitHub Actions cron (月初 09:00 JST) で fan-out 実行、 結果を 1 Issue に集約
  5. **docs-lint** に「新規 R 追加 PR は退役案 1 件をセット化」 の warn を追加 (将来 error 昇格)
- 適用範囲：BonsaiLog Claude Code ハーネス全体 (`.claude/` + `scripts/dev/` + `.github/workflows/`)。 app 機能には影響しない。

---

## Decision Drivers（判断の軸：何を大事にした？）

- Driver 1: **user 体感ゼロ影響** — UserPromptSubmit hook の計測は silent exit 0、 stdout に何も出さない (= UX 影響ゼロ最優先)
- Driver 2: **削るほうの仕組みを構造化** — 追加だけ仕組みがあって削るが属人化していた問題を、 退役推奨 + stale 検出で構造解決
- Driver 3: **効果計測の客観化** — 6 軸 (= プロンプト長 / 説明品質指示 / Frustrated / UI 修正長 / Notion コピペ / Skill 起動) で Stage A 改善を定量化し、 Stage B/C 投資判断の根拠を提供

---

## Alternatives considered（他の案と却下理由）

### Option A: 全 R を hook で機械強制する (追加のみ路線)

- 概要：R を増やすたびに対応 hook を追加し続ける (Sess107 までの路線)
- 良い点：違反が機械的に不可能になる
- 悪い点：hook の数が R 件数に比例して増え、 結局 hook 自体が認知飽和する
- 却下理由：R-18 / R-21 退役で実証された通り、 hook 昇華は「削るほう」 を組み込まないと飽和する。 「追加のみ」 路線は破綻

### Option B: 計測なしで Stage A を確定する

- 概要：Stage A 5 PR を merge して打ち止め (= 効果計測なし)
- 良い点：実装コストが低い
- 悪い点：user の「効果が見えるなら全施策で良い」 条件を満たせない。 Stage B/C 投資判断の根拠がない
- 却下理由：Sess108 議論で user が明示的に「効果計測必須」 と条件提示

### Option C: 自前計測 dashboard を build する

- 概要：Web dashboard で 6 軸をリアルタイム可視化
- 良い点：見栄えが良い
- 悪い点：実装コスト過大 + 運用コスト高 + 月次 cron で十分な粒度
- 却下理由：YAGNI、 jsonl + CLI report + 月次 Issue で十分

---

## Consequences（結果：嬉しいこと/辛いこと/副作用）

### Positive（嬉しい）

- 認知飽和の構造防御 — R が 30 件超過時点で警告 + 退役推奨候補が自動列挙される
- MEMORY 死蔵検出 — 90 日参照ゼロエントリが月次で自動検出 + Issue 起票される
- 効果計測の客観化 — 6 軸の達成度 % で Stage A 効果を 1 数値で評価できる
- 月次 self-audit — 月初に 1 Issue で全棚卸結果を確認できる (= 「読まれる棚卸」)

### Negative（辛い/副作用）

- UserPromptSubmit hook が 1 つ増える (= プロンプト送信時の処理が μs オーダーで増える、 体感影響ゼロ)
- `.claude/metrics/` に jsonl が継続的に蓄積される (= 月数 MB オーダー、 月次 cron で `--bootstrap` rotate 可能)
- 月次 cron Issue で notification が増える (label:self-audit で filter 可能)

### Follow-ups（後でやる宿題）

- [ ] Stage A merge 後 1 ヶ月で 6 軸の初回 report を確認、 改善効果を /retro Skill で評価
- [ ] 退役推奨候補が出たら新規 R 追加 PR とセットで PR 化 (= 削るほうルール)
- [ ] memory-stale-detector を Haiku 類似度判定で拡張 (Issue #1292 AC2 の Haiku 部分は将来課題)

---

## Acceptance / Tests（合否：テストに寄せる）

- 正（自動テスト）：
  - manual: `pnpm r:inventory` で R 件数 + 退役推奨候補が表示される (AC1)
  - manual: `pnpm memory:stale` で 90 日参照ゼロエントリが表示される (AC2 簡易版、 Haiku 類似度は将来課題)
  - manual: GitHub Actions の `monthly-self-audit.yml` を workflow_dispatch で trigger、 Issue が起票される (AC3)
  - manual: `pnpm metrics:report` で 6 軸現状値 + 目標値 + 達成度を表示 (AC6)
  - CI: `pnpm verify` 緑 (AC7)
- 手動チェック（必要なら最小限）：
  - 手順：本 PR merge 後、 7 日間の prompt 計測蓄積 → `pnpm metrics:report --since 2026-06-14` で報告
  - 期待結果：6 軸各々で actual 値が出力され、 一部目標を満たす (= Stage A 効果の最低限の可視化)

---

## CRUD Coverage（CRUD 系機能を扱う ADR で必須、 R-65 整合）

本 ADR は CRUD 系機能 (data 操作) を扱わないため、 本 section はスキップ可。 計測 jsonl は append-only のため、 厳密には C (Create) のみ。

| Operation  | 状態   | 動線 / 制約                                                  |
| ---------- | ------ | ------------------------------------------------------------ |
| C (Create) | 対応   | UserPromptSubmit hook が .claude/metrics/\*.jsonl に append  |
| R (Read)   | 対応   | `pnpm metrics:report` で集計表示、 月次 cron で Issue 集約   |
| U (Update) | 未対応 | 計測 jsonl は append-only。 過去エントリ書き換えは仕様外     |
| D (Delete) | 未対応 | 計測 jsonl の rotate は将来課題 (--bootstrap で初期化のみ可) |

---

## Rollout / Rollback（出し方/戻し方）

- リリース手順への影響：なし (= app 機能 + リリースパイプライン非影響)
- ロールバック方針：
  - hook 撤去 = `.claude/settings.json` から `log-prompt-metrics.mjs` の 1 entry 削除で即無効化
  - CLI 撤去 = `package.json` から `r:inventory` / `memory:stale` / `metrics:report` script 削除
  - cron 撤去 = `.github/workflows/monthly-self-audit.yml` 削除
- 検知方法（何を見て気づく？）：
  - hook 異常 = silent exit 0 のため Claude 動作には影響しない (= 計測値が記録されないだけ)
  - cron 異常 = GitHub Actions の job 履歴で確認、 失敗時は notification

---

## Links（関連リンク：正へ寄せる）

- constraints: `docs/reference/constraints.md`（関連章：§9 記憶昇華 / §11 pnpm 必須）
- reference: `.claude/recurrence-prevention.md` (R 索引)
- PR: # (本 PR)
- Issue: #1292 / Epic #1284
- 計測 spec: `.claude/metrics/` (= log-prompt-metrics.mjs の出力先)
- package.json: `r:inventory` / `memory:stale` / `metrics:report` / `metrics:bootstrap` script
- CI: `.github/workflows/monthly-self-audit.yml`
- External docs: Anthropic Claude Code hook spec (= UserPromptSubmit additionalContext)

---

## Notes（メモ：任意）

- Sess108 議論 (= or-worktree-purrfect-hamster.md) の Stage C を担当。 Stage A (path normalize / 説明品質 / AskUserQuestion 抑制 / /ui-fix / /now-here-next) は PR #1273-#1278 で merge 済。 Stage B (案 6 / 案 7) と並列で Stage C を投入することで、 認知飽和を防ぎながら効果計測の客観基盤を確立する。
- 6 軸目標値は Notion 215 prompts 分析の median / max を参考に暫定設定。 Stage A merge 後 1 ヶ月の実測値で再調整する余地あり。
