# P-02: 設計議論テンプレート

- **渡す先**: Claude Code（`/discuss` モードで実行）
- **タイミング**: リスクが高い機能の実装前
- **目的**: アーキテクチャを決めて ADR に記録する

---

## 使い方

/discuss

### 議題

本アプリの機能のアーキテクチャを決めたい。

### 背景

- product_strategy.md の「{該当セクション}」に定義されたコア価値に直結する機能
- basic_spec.md の「{該当セクション}」に仕様記載あり
- 類似の課題: {あれば既存の ADR 番号や Issue 番号}

### 検討してほしい観点

1. **技術選定**: どのライブラリ/API を使うか？（最低 2 案比較）
2. **コスト（必須）**:
   - ライブラリのライセンス料は発生しないか？
   - 外部 API の従量課金はあるか？ あるなら月額上限の見積もり
   - **「無料枠の範囲内だから OK」は不可**。無料枠が変更/廃止された場合のリスクも評価すること
   - コスト(金)はかからないか
3. **依存の方向**: 既存レイヤー構造（coding_rules.md）にどう組み込むか？
4. **テスタビリティ**: ユニットテストが書ける設計か？
5. **エッジケース**: {この機能固有のリスク}

### 参照すべきドキュメント

- `/docs/explanation/product_strategy.md`
- `/docs/reference/basic_spec.md`
- `/docs/reference/functional_spec.md`
- `/docs/reports/product-strategy-research-v1.md`
- `/docs/reports/product-strategy-research-v2.md`
- `/docs/reports/basic-spec-research.md`
- `/docs/reports/functional-spec-research.md`

### 期待するアウトプット

- 6 人チーム議論（コスト観点含む）
- 最低 2 アプローチの比較表（コスト列を含む）
- 推薦案 + ADR ドラフト
- Codex に渡す Context の草案
