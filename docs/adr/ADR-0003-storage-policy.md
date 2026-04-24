# ADR-0003: データ保存方針（AsyncStorage vs SecureStore の使い分け）

- Status: Proposed
- Date: YYYY-MM-DD
- Deciders: @your-handle
- Related: constraints

---

## Context（背景：いま何に困っている？）

- 現状：アプリのデータ保存先が統一されていない。
- 困りごと：非機密設定と機密情報（トークン、課金状態）を同じストレージに入れるのはセキュリティ上不適切。
- 制約/前提：
  - `docs/reference/constraints.md` の「データ保存の原則」

---

## Decision（決めたこと：結論）

- 決定：**非機密設定は AsyncStorage、機密情報は SecureStore** に分離して保存する。
- 適用範囲：v1.x（Settings / 購読状態 / トークン）

---

## Decision Drivers（判断の軸：何を大事にした？）

- セキュリティ（機密データは暗号化ストレージへ）
- パフォーマンス（非機密データに暗号化のオーバーヘッドは不要）
- 運用の明確化（保存先の混乱を防ぐ）

---

## Alternatives considered（他の案と却下理由）

### Option A: すべて SecureStore に保存

- 概要：設定も課金状態も SecureStore に統一
- 良い点：機密性は高い
- 悪い点：非機密まで暗号化する必要はなく、API 制約（容量上限）の影響が増える
- 却下理由：過剰な保護になる

### Option B: すべて AsyncStorage に保存

- 概要：一律で AsyncStorage に保存
- 良い点：実装が単純
- 悪い点：機密情報の安全性が下がる
- 却下理由：課金・購読情報は機密扱いが必要

---

## Consequences（結果：嬉しいこと/辛いこと/副作用）

### Positive（嬉しい）

- 保存方針が明確化し、コードレビューで判断がぶれない
- 機密情報は SecureStore（Keychain / Keystore）で保護できる

### Negative（辛い/副作用）

- 保存先が 2 系統になり、新規データ追加時に判断が必要

### Follow-ups（後でやる宿題）

- [ ] constraints.md にストレージ分類表を追記

---

## Acceptance / Tests（合否：テストに寄せる）

- 正（自動テスト）：なし（docs 変更）
- 手動チェック：
  - 手順：constraints の記述がコードと一致しているか確認
  - 期待結果：設定は AsyncStorage、課金系は SecureStore と明記

---

## Rollout / Rollback（出し方/戻し方）

- リリース手順への影響：なし
- ロールバック方針：docs / ADR の revert
- 検知方法：レビューでズレを検知

---

## Links（関連リンク：正へ寄せる）

- constraints: `docs/reference/constraints.md`
- External docs:
  - https://react-native-async-storage.github.io/async-storage/docs/usage/
  - https://docs.expo.dev/versions/latest/sdk/securestore/

---

## Notes（メモ：任意）

| データ種別   | 保存先       | 理由                     |
| ------------ | ------------ | ------------------------ |
| ユーザー設定 | AsyncStorage | 非機密、高頻度アクセス   |
| テーマ、言語 | AsyncStorage | 非機密                   |
| 購読 ID      | SecureStore  | 課金情報は機密扱い       |
| API トークン | SecureStore  | 認証情報は暗号化必須     |
| アプリデータ | SQLite       | 構造化データは DB に集約 |
