---
name: plan
description: W-01〜W-05 execution — turn a problem into a ready-to-implement Issue with AC, ADR, and Context for Codex.
user-invocable: true
argument-hint: '[#Issue番号 or 課題の説明]'
---

# /plan — 実装前準備（W-01〜W-05）

議論で方針が決まった後、または明確な課題があるときに、**Codex が実装に着手できる状態まで** Issue を準備する Skill。

## このスキルが呼ばれる条件

- 「実装に入る前の準備をしたい」
- 「Issue を起票して」
- 「仕様を固めて」
- 「AC を定義して」
- 「Codex に引き渡せる状態にして」

## やってはいけないこと

- **コードを書かない**（実装は W-06 で Codex が担当）
- **W-06 以降に先走らない**
- **AC なしで Issue をクローズ扱いにしない**

---

## ワークフロー（W-01〜W-05.5 を 1 つの目的として実行）

### W-01: 課題の発見と分類

以下の 4 カテゴリのどれかを選ぶ:

| カテゴリ      | 例                    | テンプレ            |
| ------------- | --------------------- | ------------------- |
| `feature`     | 新機能                | feature_request.yml |
| `bug`         | 既存機能の不具合      | bug_report.yml      |
| `improvement` | UX / 性能改善         | feature_request.yml |
| `refactor`    | コード品質 / 負債返済 | feature_request.yml |

**成果物**: カテゴリ + 1 文要約
**正しさチェック**: 「これは `feature` と `bug` のどちらか」を明確に答えられること

### W-02: Issue 作成

`.github/ISSUE_TEMPLATE/` の Issue Forms を使って `gh issue create`。

**必須項目**:

- タイトル（`[feat]` / `[fix]` / `[refactor]` のプレフィックス）
- 背景（なぜ必要か）
- 受け入れ条件 (Acceptance Criteria) — **W-05 で確定**
- 影響範囲（予想）
- 関連 ADR / constraints（あれば）

```bash
gh issue create \
  --title "[feat] ..." \
  --body "..." \
  --label "priority:P?,area:..."
```

### W-03: 優先度付け

以下の判定表を使う:

| 軸         | High                                     | Medium   | Low        |
| ---------- | ---------------------------------------- | -------- | ---------- |
| **Impact** | ユーザー体験への直接影響 / 課金/広告破綻 | UX 改善  | 内部品質   |
| **Effort** | 3 日以上                                 | 1 日     | 1 時間以内 |
| **Risk**   | データ損失 / クラッシュ / 課金           | 機能不全 | 表示崩れ   |

**P0〜P3 の決定表**:

| Impact | Risk          | → 優先度             |
| ------ | ------------- | -------------------- |
| High   | High          | **P0**（即修正）     |
| High   | Medium or Low | **P1**（当日）       |
| Medium | —             | **P2**（次 PR）      |
| Low    | —             | **P3**（Issue 保管） |

ラベルを付与: `gh issue edit <n> --add-label priority:P0`

### W-04: ブランチ準備

```bash
git fetch origin
git switch main
git pull --ff-only
git switch -c <type>/<issue-number>-<short-title>
```

命名規則:

- `feat/123-photo-caption`
- `fix/456-pdf-blank-page`
- `refactor/789-extract-photo-service`

**ブランチを push して CI を動かす準備**まで含める。

### W-05: 仕様の結論を固める

この Skill の **最重要ステップ**。Codex が迷わず実装できるレベルまで固める。

#### 5-1. 既存仕様との整合性チェック

- `docs/reference/constraints.md` に違反しないか？
- 既存 ADR と矛盾しないか？
- `docs/reference/glossary.md` の用語で書けているか？

#### 5-2. 必要ならドキュメント更新

| 更新トリガ                 | 更新先                              |
| -------------------------- | ----------------------------------- |
| 収益 / プラン差分          | `constraints.md`                    |
| 用語が増えた               | `glossary.md`                       |
| 「なぜそう決めたか」がある | 新 ADR を作成                       |
| 新機能の挙動               | `docs/reference/functional_spec.md` |

#### 5-3. 受け入れ条件 (AC) の明文化

**これが最重要**。AC は Jest テストに落とせる粒度で書く。

悪い例:

```
- PDF がきれいに出力される
- ユーザーが満足する
```

良い例:

```
- [ ] 写真 10 枚の PDF で空白ページが 0 件（既存テスト pdfTemplate.test.ts）
- [ ] A4 / Letter 両方で成功
- [ ] attempt 1 タイムアウトが 10 秒以内
- [ ] 既存 28 件の Jest テストが全てパス
```

#### 5-4. 影響範囲の波及調査

以下のレイヤーをチェック:

- [ ] UI / コンポーネント層
- [ ] ナビゲーション / ルーティング層
- [ ] 状態管理層（Zustand）
- [ ] ビジネスロジック層
- [ ] データ層（SQLite）
- [ ] 多言語対応（i18n）
- [ ] テスト（unit / E2E）
- [ ] CI/CD / ビルド設定
- [ ] ストア申請 / メタデータ

該当するものに対して「どう変わるか」を 1 行で書く。

### W-05.5: Codex への引き継ぎ

Issue 本文に以下のセクションを **必ず追加** する:

```markdown
## Context for Codex

### Acceptance Criteria (must pass)

- [ ] ...
- [ ] ...

### Files to read first (for context)

- `src/...`
- `docs/reference/constraints.md`
- `docs/adr/ADR-xxxx-...md` (if relevant)

### Files likely to change

- `src/features/.../MyScreen.tsx` — add X
- `src/db/schema.ts` — new column Y
- `src/core/i18n/locales/*.ts` — new key Z

### Constraints

- Use pnpm (not npm)
- No hardcoded API keys
- Follow existing vertical slice pattern
- Add i18n keys to ALL 19 locales explicitly

### Test strategy

- Unit: `__tests__/<feature>.test.ts`
- E2E: `maestro/flows/<feature>.yml` (if user-facing)

### Suggested implementation order

1. ...
2. ...
3. ...

### Related ADRs

- ADR-xxxx: ...
```

---

## 出力フォーマット

```markdown
## 実装前準備完了: [Issue タイトル]

### W-01 分類

カテゴリ: feature / bug / improvement / refactor
1 文要約: ...

### W-02 Issue

URL: https://github.com/.../issues/N
タイトル: ...

### W-03 優先度

Impact: High/Medium/Low
Effort: High/Medium/Low
Risk: High/Medium/Low
→ **P?**

### W-04 ブランチ

`<type>/N-short-title`
初回 push: 完了 / 未

### W-05 仕様

更新した docs:

- constraints.md: [変更点]
- adr/ADR-xxxx: [新規作成]

### AC (Acceptance Criteria)

- [ ] ...
- [ ] ...
- [ ] ...

### 影響範囲マトリクス

| レイヤー | 影響 | 内容 |
| -------- | ---- | ---- |
| UI       | あり | ...  |
| データ層 | あり | ...  |
| i18n     | あり | ...  |

...

### W-05.5 Codex 引き継ぎ

Issue 本文に `## Context for Codex` セクションを追加済み

### 次のアクション

- [ ] Codex に `/implement #<Issue番号>` を指示する
- または: 追加で議論が必要なら `/discuss` に戻る
```

---

## 終わり方

- `## Context for Codex` セクションが Issue 本文に存在する
- AC がチェックボックス形式で書かれている
- 優先度ラベルが付いている
- ブランチが push されている

→ これが揃ったら Codex に `/implement #<Issue番号>` を渡す準備完了。

## 関連 Skill

- `/discuss` — 議論が必要なら先にこちらを実行
- `/implement` (Codex) — このあとの W-06〜W-10
- `/review-pr` — Codex の PR を受け取った後
