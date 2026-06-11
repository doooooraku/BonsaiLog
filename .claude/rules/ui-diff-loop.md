---
paths:
  - "scripts/ui-diff/**"
  - "docs/how-to/ui-diff/**"
---

# UI Diff 自動改善ループ運用ルール (Phase 0.1〜)

ユーザーが「ループ開始」「auto-improve loop start」と伝えたら、以下のルールで自動改善ループを実行する。詳細は `docs/how-to/ui-diff/auto-improve-loop.md` 参照。

## スコープ厳守

- ✅ UI 整合性のみ (style / layout / mockup integration)
- ❌ 機能追加 / DB schema 変更 / API 変更 / ADR 変更
- 機能変更が必要な場合は人間に上申 (`needs-human-review` ラベル)

## 承認モード (半自走)

- 各 PR 前に 1 文の計画提示 + 10 秒待機
- ユーザー応答なし = 暗黙承認
- ユーザーが「stop」「待って」で即停止

## 暴走対策 (3 重防御)

1. Kill switch: `/tmp/claude-stop.flag` 存在チェック (`scripts/ui-diff/kill-switch.mjs`)
2. Skip list: 同 flow 同箇所 2 回失敗で永久 skip (`scripts/ui-diff/skip-list.json`)
3. RMSE 悪化検知: latest > prev × 1.1 で `git revert HEAD` (`scripts/ui-diff/auto-revert.mjs`)

## PR テンプレ

- title: `fix(ui-diff-auto): <flow-id> <修正概要>`
- body: 整合度 before/after + diff PNG link + 修正根拠
- 全 PR で `pnpm verify` 緑 + GitHub CI 緑必須

## 終了条件

- 全 41 画面 (4 HTML 内全画面) 整合度レベル 2 (80%) 達成
- ユーザー停止指示
- Kill switch 検知

## 進捗共有

- `scripts/ui-diff/out/SUMMARY-loop.md` 毎サイクル更新
- 5 サイクルごとに Engram session_summary 保存
