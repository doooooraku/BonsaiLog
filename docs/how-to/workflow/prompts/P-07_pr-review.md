# P-07: PR レビュー

- **渡す先**: Claude Code（`/review-pr` で実行）
- **タイミング**: Codex が PR を提出した後
- **目的**: マージ前に品質を担保

---

## 使い方

```
/review-pr #{PR番号}
```

## レビュー時の参照ドキュメント

| ドキュメント                                             | チェック観点                 |
| -------------------------------------------------------- | ---------------------------- |
| `{PROJECT_ROOT}/docs/reference/constraints.md`           | 不変条件に違反していないか   |
| `{PROJECT_ROOT}/docs/how-to/development/coding_rules.md` | コード規則に準拠しているか   |
| `{PROJECT_ROOT}/docs/how-to/workflow/git_workflow.md`    | コミット規則に準拠しているか |
| `{PROJECT_ROOT}/docs/reference/tasks/lessons.md`         | 過去の教訓に抵触していないか |

## 追加チェックリスト（汎用）

### コード品質

- [ ] constraints.md の禁止事項に違反していないか
- [ ] 既存テストが壊れていないか（`pnpm test` 全パス）
- [ ] 新機能にテストが追加されているか
- [ ] 既存の設計パターンに沿っているか（coding_rules.md）

### セキュリティ

- [ ] API キーがコードに直書きされていないか
- [ ] `.env` ファイルがコミットに含まれていないか
- [ ] ファイルパスが相対パスで保存されているか

### 品質

- [ ] `console.log` / `debugger` が残っていないか
- [ ] i18n キーの追加漏れがないか
- [ ] git_workflow.md のコミット規則に沿っているか（Conventional Commits）

### ドキュメント

- [ ] constraints.md に影響する変更なら更新されているか
- [ ] 新しい設計判断があれば ADR が追加されているか
- [ ] lessons.md に追記すべき教訓はないか

## 判定基準

- **✅ Approve**: AC 全達成 + 上記チェック全パス
- **⚠️ Request Changes**: AC 未達成 or 重大な品質問題
- **🤔 Discuss**: 設計判断に疑問がある（`/discuss` に切り替え）
