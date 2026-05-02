---
name: progress
description: 3-axis project audit — planning (issues) / integration (PRs) / quality (CI).
user-invocable: true
argument-hint: '[--detail] 詳細モード (オプション)'
---

# /progress — 進捗 3 軸監査

ユーザーが「進捗どう？」「いまどんな状態？」「リリースまでの残作業は？」と聞いたらこの手順に従う。

## 3 軸監査

### 1. 計画の進捗

```bash
gh issue list --state all --limit 50 --json number,title,state,labels
```

レポート:

- Open / Closed の数と比率
- 未着手 Issue のリスト（優先度順）
- マイルストーンの進捗率（あれば）

### 2. 統合の進捗

```bash
gh pr list --state all --limit 30 --json number,title,state,mergedAt
```

レポート:

- マージ済み / Open / Draft の数
- 長期間 Open の PR があれば警告（1週間以上）

### 3. 品質の進捗

```bash
gh run list --limit 5 --json status,conclusion,name,headBranch
```

レポート:

- 直近 5 ワークフローの結果
- 失敗しているチェック名
- 連続失敗があれば警告

## 出力形式

```markdown
## 進捗レポート (YYYY-MM-DD)

### 計画

- Issue: Open N件 / Closed M件 (進捗率 X%)
- 次に着手すべき: #XX (タイトル)

### 統合

- PR: マージ済み M件 / Open N件
- 懸念: なし / [Open PR の長期滞留]

### 品質

- 直近 CI: 5/5 green
- 懸念: なし / [失敗しているチェック]

### 推奨アクション

1. ***
2. ***
```

## 制約

- このスキルは **読み取り専用**。Issue 作成や PR マージはしない
- データに基づいて報告（推測しない）
- 懸念がない場合は素直に「懸念なし」と書く
