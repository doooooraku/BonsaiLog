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

### Step 9: 判定

3 つのいずれかを選ぶ:

#### ✅ Approve — 問題なしマージ可

- 全 AC が ✅
- constraints / ADR 準拠
- 影響範囲に乖離なし
- `pnpm verify` 緑
- ドキュメント更新済み

→ PR に approve コメント + マージ可能を通知

#### ⚠ Request Changes — 差し戻し

以下のいずれかに該当:

- AC に ❌ がある
- constraints 違反
- 影響範囲が大きすぎる（W-05 の予想を超える）
- テスト不足
- ドキュメント未更新

→ 具体的な修正指示を PR コメントで示す

#### 🤔 Discuss — 議論が必要

以下のいずれかに該当:

- ADR 化すべき決定が含まれている
- 影響範囲が広くユーザー確認が必要
- 代替案があり得る

→ `/discuss` に切り替えてユーザーと再議論

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

### 判定

**[✅ Approve / ⚠ Request Changes / 🤔 Discuss]**

理由: [1〜2 文]

### マージ前の最終チェック

- [ ] CI 緑
- [ ] レビュー Approve
- [ ] 人間承認（または `auto-merge` ラベル）

### 次のアクション

- Approve の場合: `gh pr merge <番号> --squash --delete-branch`
- Request Changes の場合: 修正指示を PR コメント経由で Codex に通知
- Discuss の場合: `/discuss` で方針再議論
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
