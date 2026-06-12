---
name: retro
description: Retrospective — KPT + timeline + bottleneck analysis + lessons + next-app handoff.
user-invocable: true
argument-hint: '[対象期間 or マイルストーン or 機能名]'
---

# /retro — 振り返り

マイルストーン完了時 / リリース後 / 大きな機能完成後に、**何が良くて・何が悪くて・次どうするか**をデータベースで分析する Skill。

## このスキルが呼ばれる条件

- 「振り返りをしたい」
- 「KPT 分析して」
- 「マイルストーンの振り返り」
- 「リリース後のレトロ」
- 「次のアプリへの申し送り」

## やってはいけないこと

- **推測ベースで書かない**（必ず git log / Issue / PR の実データ）
- **犯人探しにしない**（仕組みの改善にフォーカス）
- **成功事例のみ拾わない**（失敗と学びを同じ重みで書く）

---

## ワークフロー

### Step 1: 対象期間とスコープの特定

ユーザーに確認:

- 期間: 全期間 / マイルストーン単位 / リリース単位 / 機能単位
- スコープ: アプリ全体 / 特定機能 / 特定 Phase

### Step 2: データ収集

**git log**:

```bash
git log --oneline --format="%h %ai %s" --since="<date>"
```

**GitHub**:

```bash
gh issue list --state all --limit 100 --json number,title,state,createdAt,closedAt,labels
gh pr list --state all --limit 100 --json number,title,state,createdAt,mergedAt
```

**定量情報を集める**:

- 開発期間（日数）
- 総コミット数
- 総 Issue 数 / バグ数 / enhancement 数
- 総 PR 数 / マージ数
- 最も時間がかかった PR
- 最も手戻りが多かった Issue

**幅広収集メニュー (Sess103 retro 拡張 — 全部 1 コマンド級の軽量収集、取れるものは全部取る)**:

> 「詰まった点」を記憶だけで書かないため、以下も対象期間で収集する。重い採掘 (transcript 走査等) はやらない方針 (user 決定 2026-06-12: 厳密さより幅)。

```bash
# CI 実測 (fail 件数 + 所要時間 — 手戻りの定量化)
gh run list --limit 30 --json name,conclusion,createdAt,updatedAt,displayTitle \
  --jq '.[] | select(.createdAt >= "<ISO>") | "\(.conclusion)\t\(.name)\t\((((.updatedAt|fromdate)-(.createdAt|fromdate))/60|floor))min"'

# 手戻り commit (revert / hotfix)
git log --oneline --since="<date>" --grep="revert\|Revert\|hotfix" origin/main

# 領域別 diff 面積 (どこを一番触ったか)
git diff --dirstat=lines,1 <start-commit>..<end-commit>

# R ルール / lessons の増分 (学びの量)
git diff --stat <start>..<end> -- .claude/recurrence-prevention* docs/reference/tasks/lessons/

# verify / CI watch の実行痕跡 (ローカル検証回数)
ls /tmp/*verify*.log /tmp/*checks*.log 2>/dev/null

# Issue の増減 (期間内 created)
gh issue list --state all --limit 50 --search "created:>=<date>" --json number,title,state

# (リリース retro 時) release-logs の実測時間
ls dist/release-logs/
```

- Engram: `mem_search` で対象期間の decision / bugfix observation を引いて意思決定の流れを補完
- 収集できなかった源は「未収集 (理由)」と明示する (網羅を装わない、R-25 の親戚)

### Step 3: タイムライン作成

| #   | 日付/期間 | フェーズ | やったこと | 使ったツール | 結果 | 詰まった点 | 所要時間 |
| --- | --------- | -------- | ---------- | ------------ | ---- | ---------- | -------- |
| 1   |           |          |            |              |      |            |          |

**フェーズの分類**（必ずラベル）:

- 企画・要件定義
- 設計（UI/UX・アーキテクチャ）
- 環境構築
- 実装（コア機能 / サブ機能）
- 多言語対応
- テスト
- ビルド・デプロイ
- ストア申請（Google Play / App Store）
- バグ修正・改善
- ドキュメント整備

### Step 4: KPT 分析（フェーズごと）

| フェーズ         | Keep（続ける） | Problem（課題） | Try（次回試す） |
| ---------------- | -------------- | --------------- | --------------- |
| 企画・要件定義   |                |                 |                 |
| 設計             |                |                 |                 |
| 環境構築         |                |                 |                 |
| 実装（コア）     |                |                 |                 |
| 多言語対応       |                |                 |                 |
| テスト           |                |                 |                 |
| ビルド・デプロイ |                |                 |                 |
| ストア申請       |                |                 |                 |

### Step 5: ボトルネック分析（TOP 3）

| 順位 | フェーズ | 推定所要時間 | 本来あるべき時間 | 差分 |
| ---- | -------- | ------------ | ---------------- | ---- |
| 1    |          |              |                  |      |
| 2    |          |              |                  |      |
| 3    |          |              |                  |      |

**TOP 1 に対してなぜなぜ分析 5 段階**:

```
問題: [フェーズ名]
├─ なぜ 1: なぜこのフェーズに時間がかかったのか？
│  └─ なぜ 2: なぜそうなったのか？
│     └─ なぜ 3: ...
│        └─ なぜ 4: ...
│           └─ なぜ 5: ...
└─ 根本原因: ...
└─ 対策: ...
```

### Step 6: 改善提案

3 カテゴリで整理:

| #   | 改善策 | カテゴリ             | 効果         | 難易度   | 優先度   |
| --- | ------ | -------------------- | ------------ | -------- | -------- |
| 1   |        | ツール/プロセス/知識 | 例: 2h→30min | 高/中/低 | 高/中/低 |

### Step 7: 次のアプリへの申し送り TOP 5

最も重要な教訓を 5 つ、優先度順にリストアップ:

```
1. [教訓] — 根拠: [過去の具体的なインシデント]
2. [教訓] — 根拠: ...
3. [教訓] — 根拠: ...
4. [教訓] — 根拠: ...
5. [教訓] — 根拠: ...
```

### Step 8: lessons への追記

`docs/reference/tasks/lessons/retro.md` (retro 集約 file、最新が上) に以下を追記:

```markdown
## [YYYY-MM-DD] [振り返り対象]

### Keep

- ...

### Problem

- ...

### Try (次回以降)

- ...

### 教訓

- [1 行で本質]
```

### Step 9: doc 同期チェック (doc-routing 照合、Doc-Truth Audit P4)

セッションで触ったコード領域と `docs/reference/doc-routing.md` (Code→Docs ルーティング原本) を突き合わせる:

1. 対象期間の変更ファイルを列挙: `git log --since="<期間開始>" --name-only --format= origin/main | sort -u`
2. 変更ファイルを doc-routing 表の glob と照合し、該当行の「変更時に読むべき doc」ごとに **更新済み / 更新不要 (理由) / 更新漏れ** を判定する
3. 更新漏れは同セッション内で追記 or Issue 起票 (放置しない)
4. **表に無い領域を触っていたら**: doc-routing.md への行追加を提案する (mapping 自体の drift 対策。ただし同表の運用メモ「行を増やしすぎない」に従い、罠実績のある領域を優先)
5. `pnpm metrics:doc-freshness` を実行し、flagged doc があれば freshness-ledger.md の再検証・更新をタスク化する

> 30 日周期の棚卸では「利用頻度 (`pnpm metrics:doc-30day-zero`)」と「正確性 (`pnpm metrics:doc-freshness`)」の **両方** を実行する (cadence の正本は `docs/audit/freshness-ledger.md` ヘッダ)。

---

## 出力フォーマット

```markdown
## 振り返り: [対象名]

### 数値サマリ

- 期間: YYYY-MM-DD 〜 YYYY-MM-DD (N 日間)
- コミット: N
- Issue: N 件（バグ M / enhancement K）
- PR: N 件（マージ M）
- 最も時間がかかったフェーズ: [名前]

### タイムライン

[テーブル]

### KPT 分析

[フェーズごとのテーブル]

### ボトルネック TOP 3

[テーブル + なぜなぜ分析]

### 改善提案（優先度順）

[テーブル]

### 次のアプリへの申し送り TOP 5

1. ...
2. ...
   ...

### doc 同期チェック (Step 9)

- 触った領域 × doc-routing: [更新漏れ 0 / 対応内容]
- 表に無い領域: [なし / 行追加の提案]
- metrics:doc-freshness: [flagged 0 / 対応タスク]

### 今すぐやること

- [ ] lessons/retro.md に教訓を追記
- [ ] ADR 化すべき決定があれば作成
- [ ] 改善策を Issue 化（P0/P1 のみ）
- [ ] doc 同期チェック (Step 9) の結果を記載（更新漏れ 0 を確認 or 対応済み）
```

---

## 関連 Skill

- `/discuss` — 分析結果をもとに次のアプローチを議論
- `/plan` — 改善策を Issue 化する
- `/progress` — 現状把握
