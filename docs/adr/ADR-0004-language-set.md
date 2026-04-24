# ADR-0004: ローカライズ範囲の決定（19 言語、RTL 除外）

- Status: Proposed
- Date: YYYY-MM-DD
- Deciders: @your-handle
- Related: constraints / reference

---

## Context（背景：いま何に困っている？）

- 現状：対応言語の範囲が明確に定義されていない。
- 困りごと：言語選択の判断が揺れ、仕様と実装が乖離しやすい。
- 制約/前提：
  - `docs/reference/constraints.md` の「対応言語の増減」トリガー

---

## Decision（決めたこと：結論）

- 決定：対応言語を **19 言語** とする。RTL（アラビア語、ヘブライ語）は対象外。
- 適用範囲：v1.x（アプリ全体の i18n・設定の言語選択）

対応言語: en, ja, fr, es, de, it, pt, ru, zh-Hans, zh-Hant, ko, th, id, vi, hi, tr, nl, pl, sv

---

## Decision Drivers（判断の軸：何を大事にした？）

- ユーザー到達性（App Store / Google Play での検索性）
- 翻訳品質の維持可能性（19 言語が管理上限）
- RTL 対応の工数（レイアウト反転が全画面に波及する）
- BCP47 準拠の言語コード運用

---

## Alternatives considered（他の案と却下理由）

### Option A: 5 言語（en, ja, zh-Hans, es, fr）

- 概要：主要 5 言語に絞る
- 良い点：翻訳管理が容易
- 悪い点：ASO で不利、ユーザーカバレッジが低い
- 却下理由：到達性で劣る

### Option B: 30+ 言語（RTL 含む）

- 概要：アラビア語、ヘブライ語を含む全言語対応
- 良い点：最大のカバレッジ
- 悪い点：RTL レイアウト対応の工数が膨大（全コンポーネントの反転テスト必要）
- 却下理由：v1.x では工数に見合わない

---

## Consequences（結果：嬉しいこと/辛いこと/副作用）

### Positive（嬉しい）

- 19 言語で主要市場をカバーできる
- RTL 非対応により UI 実装がシンプルに保たれる

### Negative（辛い/副作用）

- 翻訳未整備の言語は英語フォールバックになる可能性
- RTL ユーザーは英語フォールバックになる

### Follow-ups（後でやる宿題）

- [ ] 全 19 言語の翻訳品質を段階的に改善
- [ ] `pnpm i18n:check` で全ロケールのキー整合性を CI で検証

---

## Acceptance / Tests（合否：テストに寄せる）

- 正（自動テスト）：`pnpm i18n:check` が 19 ロケールで通ること
- 手動チェック：
  - 手順：設定画面で各言語を選択
  - 期待結果：選択でき、設定が保持される

---

## Rollout / Rollback（出し方/戻し方）

- リリース手順への影響：なし
- ロールバック方針：当該 PR を revert して言語追加を取り消す
- 検知方法：設定画面の言語リスト確認

---

## Links（関連リンク：正へ寄せる）

- constraints: `docs/reference/constraints.md`（言語セクション）
- reference: `docs/reference/basic_spec.md`
- `src/core/i18n/` — i18n 実装

---

## Notes（メモ：任意）

- 追加言語の翻訳品質は段階的に改善する方針。
- fastlane/metadata/ のロケール名は ASC 形式（`fr-FR`, `nl-NL` 等）に従う。`fastlane/metadata/README.md` の ASC locale codes 表を参照。
