# P-03: Codex 実装指示テンプレート

- **渡す先**: Codex（Issue 本文の `## Context for Codex` セクションとして記載）
- **タイミング**: Claude Code が `/plan` で Issue を作成した後
- **目的**: Codex が迷わず正しい実装ができるだけの情報を渡す
- **制約**: Issue 本文は **2000 文字以内**。詳細は「読むべきファイル」に委ねる

---

## テンプレート

```markdown
## Issue: #{番号} {タイトル}

### 受け入れ条件（AC）

- [ ] {AC-1: 具体的な条件。「〜できること」「〜が表示されること」の形式}
- [ ] {AC-2}
- [ ] {AC-3}
- [ ] `pnpm verify` が全パス（lint + type-check + test + i18n:check + config:check）
- [ ] 新規翻訳キーがある場合、全対応言語に追加済み

### 読むべきファイル（絶対パス）

#### 必須（実装前に必ず読むこと）

| ファイル                                                           | なぜ読むか                              |
| ------------------------------------------------------------------ | --------------------------------------- |
| `{PROJECT_ROOT}/docs/reference/constraints.md`                     | プロジェクトの不変条件                  |
| `{PROJECT_ROOT}/docs/reference/basic_spec.md` セクション {X}       | この機能の仕様                          |
| `{PROJECT_ROOT}/docs/how-to/workflow/git_workflow.md`              | ブランチ命名・コミット規則・PR 作成手順 |
| `{PROJECT_ROOT}/docs/how-to/workflow/whole_workflow.md` W-06〜W-10 | 実装→PR の進め方                        |
| `{PROJECT_ROOT}/docs/how-to/development/coding_rules.md`           | フォルダ構造・命名・TS ルール           |
| `{PROJECT_ROOT}/docs/reference/tasks/lessons.md`                   | 過去の失敗パターン                      |

#### 関連ファイル（この機能に関連する既存コード）

| ファイル                                | なぜ読むか           |
| --------------------------------------- | -------------------- |
| `{PROJECT_ROOT}/src/{関連ファイル}`     | 既存パターンの踏襲   |
| `{PROJECT_ROOT}/docs/adr/ADR-{番号}.md` | この設計になった理由 |

### 変更予定ファイル

| ファイル                             | 変更内容                |
| ------------------------------------ | ----------------------- |
| `{PROJECT_ROOT}/src/types/models.ts` | {型の追加/変更}         |
| `{PROJECT_ROOT}/src/db/schema.ts`    | {テーブル/カラムの追加} |

### 絶対にやってはいけないこと

- API キーをコードに直書きしない（.env 経由必須）
- DB のファイルパスを絶対パスで保存しない（相対パス必須）
- async 呼び出しをタイムアウトなしで放置しない
- 既存のテストを削除・無効化しない
- `git push --force` しない
- `--no-verify` でフックをスキップしない
- {この機能固有の禁止事項}

### 実装の推奨順序

1. {最下層}（例: `src/types/models.ts` に型を追加）
2. {次の層}（例: `src/db/schema.ts` にマイグレーション追加）
3. {リポジトリ/サービス層}
4. {テスト}（例: `__tests__/xxx.test.ts` を作成）
5. UI 層（`app/` 配下）は **Codex の担当外**。ロジックのみ実装する

### GitHub Flow（git_workflow.md 準拠）

1. ブランチを切る: `git checkout -b {type}/{Issue番号}-{短い英語}`
2. 実装 + テスト
3. `pnpm verify` で 5 ゲート通過を確認
4. コミット: Conventional Commits 形式（`{type}({scope}): {subject}`）
5. push: `git push -u origin {ブランチ名}`
6. PR 作成: `.github/pull_request_template.md` に沿う
```

## 使い方の注意

- `{PROJECT_ROOT}` は AGENTS.md §2.4 で定義された絶対パスに置換する
- Issue 本文が 2000 文字を超える場合、AC と「読むべきファイル」だけ残し、
  詳細な背景は Issue コメントまたはリンクで別途提供する
- 1 Issue = 1 目的（whole_workflow.md W-02 準拠）。大きければサブ Issue に分割
