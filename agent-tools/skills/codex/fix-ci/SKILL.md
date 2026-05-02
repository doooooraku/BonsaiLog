---
name: fix-ci
description: W-08a CI failure recovery — careful mode after /implement retry fails.
user-invocable: true
argument-hint: '[失敗したゲート名 (任意)]'
---

# /fix-ci — CI 失敗リカバリ（Codex 担当, W-08a）

`pnpm verify` が **2 回失敗した後** に呼ばれる慎重モード。1 回目の失敗は `/implement` が自動リトライで対応するが、それでも直らなければこの Skill に切り替える。

## このスキルが呼ばれる条件

- `pnpm verify` が 2 回連続失敗
- CI ワークフロー（GitHub Actions）が失敗
- Claude Code から「CI 失敗を直して」と指示された

## 重要な原則

**対症療法は絶対に禁止**。原因を特定してから直す。

---

## ワークフロー

### Step 1: 失敗内容の正確な記録

```bash
# ローカル
pnpm verify 2>&1 | tee /tmp/verify-failure.log

# CI（GitHub Actions）
gh run list --limit 5
gh run view <run-id> --log-failed
```

エラーメッセージを全文コピーし、関連する箇所を特定:

- 失敗したゲート: lint / type-check / format / test / i18n / config
- 失敗したファイル名と行番号
- エラーメッセージの主要部分

### Step 2: 仮説の列挙（最低 3 つ）

失敗パターンごとのチェックリスト:

#### lint 失敗

- [ ] 未使用 import
- [ ] any 型の濫用
- [ ] React フックのルール違反
- [ ] 独自 ESLint ルール（no-restricted-syntax 等）違反

#### type-check 失敗

- [ ] 型定義の欠落（new feature 追加時）
- [ ] tsconfig.json の strict 違反
- [ ] 古い型参照（依存更新後）

#### format 失敗

- [ ] Prettier の自動整形漏れ → `pnpm format:fix`

#### test 失敗

- [ ] スナップショット不一致 → 意図的なら `-u`
- [ ] モック未定義 → `jest.mock()` 追加
- [ ] 非同期テストの await 漏れ
- [ ] タイムゾーン依存テスト

#### i18n 失敗

- [ ] 1 言語だけに追加した（19 言語必須）
- [ ] 型定義と実装の不整合

#### config 失敗

- [ ] `.env` の必須キー不足
- [ ] `app.config.ts` の構文エラー

### Step 3: 仮説の検証

1 番可能性の高いものから順に:

- 関連コードを読む
- `git diff HEAD~1` で直近の変更を確認
- 必要ならサブエージェントに詳細を調べさせる

### Step 4: 根本原因の特定と修正

- 修正内容を 1 行で書く
- **なぜ動くか**を説明できること
- 修正後に `pnpm verify` 再実行

### Step 5: リグレッションテスト

同じバグが再発しないよう、**テストを追加**:

- 失敗原因を再現するテスト
- `__tests__/<feature>.test.ts` に追加
- 意図したケースをカバー

### Step 6: 成功確認 + commit

```bash
pnpm verify  # 全 6 ゲート緑
git add <files>
git commit -m "fix: <description> (ci recovery)"
git push
```

### Step 7: それでも失敗する場合のエスカレーション

**3 回目の `fix-ci` 失敗**:

- Issue にコメント: 「CI recovery 失敗。根本原因が特定できないため Claude Code にエスカレーション」
- PR を Draft に戻す
- Claude Code の `/discuss` or `/plan` で再議論

---

## 出力フォーマット

```markdown
## CI Recovery Report: #<Issue番号>

### 失敗したゲート

- [x] lint / type-check / format / test / i18n / config

### エラーメッセージ
```

(主要な抜粋、3〜5 行)

```

### 仮説 3 つ
1. (可能性高) ...
2. (中) ...
3. (低) ...

### 検証結果
- 仮説 1 を検証 → ✅ 原因確定

### 根本原因
(1 文で)

### 修正内容
- `src/...` の N 行目を修正
- リグレッションテストを `__tests__/...` に追加

### 修正後の検証
```

pnpm verify
✅ 全 6 ゲート緑

```

### Commit
- `abc1234 fix: (ci recovery) ...`
```

---

## 関連 Skill

- `/implement` — 通常の実装フロー
- Claude Code の `/discuss` — 根本原因が不明ならエスカレーション先
