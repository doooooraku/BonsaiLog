---
name: review-pr
description: W-10.5 PR review — verify AC compliance, ADR alignment, impact scope, regression risk before merge.
user-invocable: true
argument-hint: '[#PR番号]'
---

# /review-pr — PR レビュー（W-10.5）

Codex が作成した Pull Request を **マージ前に Claude Code がレビュー**するための Skill。

## このスキルが呼ばれる条件

- 「PR #123 をレビューして」
- 「Codex の実装を確認して」
- 「マージ前チェックして」
- CI がグリーンになった直後

## やってはいけないこと

- **レビューなしでマージしない**
- **AC を目視確認だけで済ませない**（必ずコード差分を読む）
- **「動いた」だけで OK にしない**（ADR 準拠 / 影響範囲を確認）

---

## レビューワークフロー（1 つの目的: 安全にマージ可能か判定）

### Step 1: PR と Issue を読む

```bash
gh pr view <PR番号> --json title,body,files,additions,deletions,commits
gh pr view <PR番号> --json linkedIssues
```

- PR タイトル / 説明を読む
- 関連 Issue の **AC** を確認
- Issue 本文の `## Context for Codex` セクションと実装内容を照合

### Step 2: 差分を読む

```bash
gh pr diff <PR番号>
```

**全ファイルを読む**。量が多ければサブエージェントに並列で読ませる。

読みながらメモ:

- 変更されたファイル数
- 追加 / 削除行数
- 新規ファイル
- 削除ファイル

### Step 3: AC チェック（最重要）

Issue の AC を 1 項目ずつ確認:

| AC              | 実装されている？ | 証拠                                   |
| --------------- | ---------------- | -------------------------------------- |
| - [ ] AC 項目 1 | ✅ / ❌          | `src/features/X.tsx:42` で該当ロジック |
| - [ ] AC 項目 2 | ✅ / ❌          | `__tests__/X.test.ts:15` で検証        |

**AC が全部 ✅ でないなら差し戻し**。

### Step 4: constraints / ADR 準拠チェック

- `docs/reference/constraints.md` に違反していないか
- 関連 ADR の決定事項に準拠しているか
- 例:
  - API キー直書き禁止 → `grep -r "ca-app-pub-" src/` で確認
  - i18n キー追加時は全 19 言語 → `pnpm i18n:check`
  - 写真パスは相対 → `filePathUtils.ts` 経由か確認

### Step 5: 影響範囲の再検証

W-05 で予想した影響範囲と、実際の変更が一致しているか:

| レイヤー | 予想               | 実際               | 乖離        |
| -------- | ------------------ | ------------------ | ----------- |
| UI       | 変更あり           | 変更あり           | なし ✅     |
| データ層 | 変更なし           | **変更あり**       | ⚠ 乖離あり |
| i18n     | 変更あり（3 キー） | 変更あり（5 キー） | ⚠ 乖離あり |

**乖離があれば Issue / ADR の再更新が必要**。

### Step 6: デグレリスクチェック

以下を確認:

- `pnpm verify` が緑か（CI ログで確認）
- 既存テストが壊れていないか
- テストカバレッジが下がっていないか
- 変更されたコード周辺の既存機能への影響

### Step 7: コード品質チェック

- 既存の設計パターンに従っているか
- 不要な抽象化を追加していないか
- 既存 util を再利用しているか（車輪の再発明なし）
- エラーハンドリングが boundaries（外部 API / ユーザー入力）のみに集中しているか

### Step 8: ドキュメント更新チェック

AC と一緒に docs が更新されているか:

- [ ] `docs/reference/lessons.md` に学びがあれば追記
- [ ] 新機能なら `functional_spec.md` 更新
- [ ] 外部 SDK 追加なら `constraints.md` 更新
- [ ] 意思決定あれば新 ADR

### Step 9: 判定（Output Contract、ADR-0047）

レビュー結果を **判定可能な決まった形式** で出す。

#### 9-1. 指摘表（Findings）を作る

各指摘を 1 行に構造化する:

| ID       | 深刻度                    | 種別                                | 場所      | 内容 |
| -------- | ------------------------- | ----------------------------------- | --------- | ---- |
| FIND-001 | critical/high/medium/low  | bug/constraints/quality/structure-UI| file:line | 1 行 |

- **深刻度**: `critical`(致命) / `high`(マージ前に必須) / `medium`(直すべき) / `low`(好み)
- **種別**: `bug`(コードの正しさ) / `constraints`(規約違反、grep 検証可) / `quality`(品質・好み) / `structure-UI`(UI/構造)

#### 9-2. 機械ゲートで 2 値判定（APPROVE / REQUEST_CHANGES）

- **種別が `bug` または `constraints` の指摘に `critical`/`high` が 1 件でもあれば → `REQUEST_CHANGES`**。
- 上記が無く `medium`/`low` のみ → `APPROVE` 可。
- **種別 `structure-UI` は機械ゲートの対象外（R-25）**。Claude が実機 SS / mockup を **Read** して構造系 5 項目（タブ / セクション / UI 種別 / スクロール範囲 / EventRow 表示モード+sub-layout）を評価し、その結果を別記する（PR テンプレ §7.6）。

> ゲートは「マージ阻止の**下限**」であって「承認の根拠」ではない。`APPROVE` でも **最終マージは人間**（`auto-merge` ラベル運用は維持）。

#### 9-3. 要議論メモ（旧 Discuss、判定値ではない）

ADR 化すべき決定 / 影響大でユーザー確認が要る / 代替案がある場合は、**判定とは別に**「要議論メモ」に列挙し、必要なら `/discuss` へ。

---

## 出力フォーマット

```markdown
## PR #<番号> レビュー: [PR タイトル]

### 概要

- Issue: #N
- 変更: +XXX / -YYY lines across Z files
- CI: ✅ 緑 / ❌ 失敗
- ブランチ: feat/N-...

### AC 充足確認

| AC         | 実装 | 証拠                   |
| ---------- | ---- | ---------------------- |
| - [ ] AC 1 | ✅   | `src/...` で実装       |
| - [ ] AC 2 | ✅   | `__tests__/...` で検証 |
| - [ ] AC 3 | ❌   | 未実装                 |

充足率: N / M

### constraints / ADR 準拠

- ADR-XXXX 準拠: ✅ / ❌
- constraints.md 準拠: ✅ / ❌
- API キー直書き: なし ✅
- i18n キー整合: `pnpm i18n:check` 緑 ✅
- ファイルパス相対化: ✅

### 影響範囲

| レイヤー | 予想 | 実際 | 乖離 |
| -------- | ---- | ---- | ---- |
| UI       | ...  | ...  | ...  |

### デグレリスク

- 既存テスト: 全 28 件 pass ✅
- 新規テスト: N 件追加
- 懸念: なし / [具体的懸念]

### コード品質

- 設計パターン: 既存の vertical slice に準拠 ✅
- 既存 util 再利用: ✅
- エラーハンドリング: 適切 ✅

### ドキュメント更新

- lessons.md: [更新 / 未更新 / 不要]
- ADR: [新規 / 更新 / 不要]
- functional_spec: [更新 / 不要]

### 判定（Output Contract、ADR-0047）

判定: **[APPROVE / REQUEST_CHANGES]**

#### 指摘表（Findings）

| ID       | 深刻度 | 種別 | 場所         | 内容 |
| -------- | ------ | ---- | ------------ | ---- |
| FIND-001 | high   | bug  | `src/...:42` | ...  |

#### ゲート判定

- bug/constraints の critical/high: [N 件 → REQUEST_CHANGES / 0 件]
- structure-UI: [R-25 構造系 5 項目評価の結果 / 該当なし]

#### 要議論メモ（任意、判定値ではない）

- ...

### マージ前の最終チェック

- [ ] CI 緑
- [ ] レビュー Approve
- [ ] 人間承認（または `auto-merge` ラベル）

### 次のアクション

- APPROVE の場合: 人間承認 or `auto-merge` ラベルで `gh pr merge <番号> --squash --delete-branch`（R-57）
- REQUEST_CHANGES の場合: 指摘表（FIND-xxx）に沿って修正指示を PR コメントで提示
- 要議論メモがある場合: `/discuss` で方針相談
```

---

## 承認ゲートのポリシー

個人開発のデフォルト:

- **`auto-merge` ラベル付き PR** は Claude Code が approve したら自動マージ可能
- それ以外は **人間に通知して 30 秒待つ** → 応答なしなら停止

チーム開発（将来）:

- 常に人間レビュアー 1 人以上の approve が必須

---

## 関連 Skill

- `/plan` — この PR の元になった W-01〜W-05
- `/implement` (Codex) — この PR を作った W-06〜W-10
- `/discuss` — 議論が必要になったら戻る
- `/retro` — リリース後の振り返り
