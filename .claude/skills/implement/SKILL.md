---
name: implement
description: W-06〜W-10 execution — read the Issue Context section, implement, test, verify, push, and create PR.
user-invocable: true
argument-hint: '[#Issue番号]'
---

# /implement — 実装（W-06〜W-10）

Claude Code が `/plan` で準備した Issue を受け取り、**実装完了から PR 作成まで**を担当する Skill。

## このスキルが呼ばれる条件

- 「`/implement #123`」
- 「Issue #123 を実装して」
- Claude Code から引き継がれた時

## 前提

- Issue 本文に `## Context` セクションが存在する（旧 Issue では `## Context for Codex` 表記）
- AC（受け入れ条件）がチェックボックス形式で書かれている
- 優先度ラベルが付いている
- ブランチが既に切られている（W-04 で Claude Code が実施）

---

## ワークフロー

### W-06: 実装

#### 6-1. Issue を読む

```bash
gh issue view <番号> --json title,body,labels
```

**必ず読むセクション**:

- Context → 実装方針
- Acceptance Criteria → 受入条件
- Files to read first → 関連ファイル
- Related ADRs → 過去決定

#### 6-2. 関連ファイルを読む

Issue の `Files to read first` に従って関連コードを読む。サブエージェントに並列で読ませても良い。

#### 6-3. 実装

**原則**:

- 既存の vertical slice パターンに従う（`src/features/<name>/`）
- 小さい commit で刻む（ファイル単位、論理単位）
- 不要な抽象化を作らない
- 既存 util を再利用する（`src/db/filePathUtils.ts` 等）

**禁止**:

- API キー直書き
- `npm install`（`pnpm` を使う）
- git hooks をスキップ（`--no-verify` 禁止）
- スコープ外の変更

### W-07: テスト作成

AC を Jest テストに落とす:

```typescript
// __tests__/<feature>.test.ts
describe('Feature X', () => {
  test('AC 1: ...', () => {
    expect(result).toBe(expected);
  });
  test('AC 2: ...', () => {
    expect(result).toBe(expected);
  });
});
```

E2E が必要なら Maestro flow を追加:

```yaml
# maestro/flows/<feature>.yml
```

### W-08: ローカル検証

```bash
pnpm verify
```

内部ゲートの**構成・順序は `package.json` の `verify` script が正** (CI と同一 chain、個別ゲートをここに列挙しない = 固定値多重コピー drift 防止)。

**`pnpm verify` が exit code 0 になるまで実装を続ける** (R-22: 末尾 tail/pipe で exit code を潰さない)。

**E2E / 実機確認の要否判定**: `docs/how-to/workflow/whole_workflow.md` §1.5 検証 tiering 表 (T1〜T8) が正。変更種別 (git diff のファイルパス) で判定し、省略する層は PR 本文 §6 に理由を記載する。

**Stop hook ゲート (#1149)**: src/app/plugins/app.config.ts を編集したセッションは、その内容で `pnpm verify` が緑になるまで**ターン終了が block される** (`.claude/hooks/stop-verify-gate.mjs`)。verify 成功で指紋が自動記録され解除。詳細は `docs/how-to/development/dev-workflow.md` §12。

### W-08a: CI 失敗時のリカバリ

`pnpm verify` が失敗したら:

1. **エラーを読む**（推測しない）
2. **根本原因を特定**（表面的な修正をしない）
3. **修正して再実行**
4. **2 回失敗したら `/fix-ci` Skill に切り替え**（より慎重なモード）
5. **それでも失敗したら Claude Code にエスカレーション**（Issue にコメント）

### W-09: コミット + push

**Conventional Commits** 形式:

- `feat: add photo caption field`
- `fix: prevent blank PDF on iOS 26`
- `refactor: extract photo service`
- `test: add unit tests for reportUtils`
- `docs: update constraints.md`

```bash
git add <files>
git commit -m "<type>: <message>"
git push -u origin <branch>
```

**小さい commit を複数作る**（1 commit で全部入れない）。

### W-10: PR 作成

```bash
gh pr create \
  --title "<type>: <short description>" \
  --body "$(cat <<'EOF'
## Summary
- 1〜2 bullets about what changed

## Issue
Closes #<番号>

## What
- 実装内容の箇条書き

## Why
- Issue で決まった方針（ADR 参照）

## How to test
- `pnpm verify`（全ゲート緑）
- 手動確認: ...

## AC Checklist
- [x] AC 1: ...
- [x] AC 2: ...

## Risk / Rollback
- リスク: ...
- ロールバック: revert this PR

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

PR 作成後、Claude Code に引き渡す:

- PR URL を Issue にコメント
- Claude Code の `/review-pr` に渡すことを明示

---

## 出力フォーマット

```markdown
## 実装完了: #<Issue番号>

### W-06 実装

変更ファイル:

- `src/features/X/Y.tsx` — ...
- `src/db/schema.ts` — ...
- `src/core/i18n/locales/*.ts` — new key (全 19 言語)

### W-07 テスト

- Unit: `__tests__/<feature>.test.ts` (+N tests)
- E2E: `maestro/flows/<feature>.yml` (+1 flow)

### W-08 検証
```

pnpm verify
✅ lint
✅ type-check
✅ format
✅ test (NN pass)
✅ i18n
✅ config

```

### W-09 Commits
- `abc1234 feat: ...`
- `def5678 test: ...`
- `ghi9012 docs: ...`

### W-10 PR
URL: https://github.com/.../pull/N
タイトル: feat: ...

### Claude Code への引き継ぎ
このまま `/review-pr #N` を実行してください。
```

---

## 関連 Skill

- `/fix-ci` — CI 失敗時のリカバリ
- `/i18n-add` — i18n キー追加
- Claude Code の `/plan` — 引き継ぎ元
- Claude Code の `/review-pr` — 引き継ぎ先
