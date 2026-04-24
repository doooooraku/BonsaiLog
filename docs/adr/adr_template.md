---


<!--
ADR Template
- 1ADR = 1意思決定
- 短く書く（目安：A4 1〜2枚）
- “変わりやすい詳細” は本文に固定せず、正（package.json / CI / 公式 / Figma）へリンクする
-->

# ADR-0000: <短いタイトル（例：収益モデルはサブスク+広告にする）>

- Status: Proposed | Accepted | Rejected | Deprecated | Superseded
- Date: YYYY-MM-DD
- Deciders: <意思決定した人/役割（例：@doooooraku）>
- Related: Issue #<id> / PR #<id> / constraints / reference / tests

---

## Context（背景：いま何に困っている？）

<!--
“なぜこの決定が必要だったか” を書く。
- いまの問題（バグ/ユーザー価値/運用上の詰まり）
- 制約（constraints から関係するものを引用 or リンク）
- 前提（変えないもの）
-->

- 現状：
- 困りごと：
- 制約/前提（リンク推奨）：
  - `docs/reference/constraints.md` の関連箇所：<リンク or 章番号>

---

## Decision（決めたこと：結論）

<!--
ここは1〜3行でズバッと書く。細部はリンクへ。
-->

- 決定：
- 適用範囲（v1.x / 特定画面 / Freeのみ など）：

---

## Decision Drivers（判断の軸：何を大事にした？）

<!--
判断基準。例：
- ユーザー体験（邪魔すぎない/分かりやすい）
- 実装コスト/保守コスト
- 収益/事業要件
- セキュリティ/法務
- ストア審査リスク
-->

- Driver 1:
- Driver 2:
- Driver 3:

---

## Alternatives considered（他の案と却下理由）

<!--
“なぜ捨てたか” が未来の自分を救う。
表でも箇条書きでもOK。短く。
-->

### Option A: <案A>

- 概要：
- 良い点：
- 悪い点：
- 却下理由：

### Option B: <案B>

- 概要：
- 良い点：
- 悪い点：
- 却下理由：

---

## Consequences（結果：嬉しいこと/辛いこと/副作用）

<!--
Accepted後に現実として起きることを書く。
-->

### Positive（嬉しい）

-

### Negative（辛い/副作用）

-

### Follow-ups（後でやる宿題）

- [ ] <例：docs/reference/constraints.md の更新>
- [ ] <例：テスト追加（Jest/Maestro）>
- [ ] <例：README/運用手順の更新>

---

## Acceptance / Tests（合否：テストに寄せる）

<!--
“動けばOK” を明文化する。詳細はテストに置く。
- どのテストが正か（Jest / Maestro / 手動チェック）
- 追加/変更するテスト観点
-->

- 正（自動テスト）：
  - Jest：<テストファイル or コマンド or CIジョブ名>
  - Maestro：<フロー名 or 実行方法>
- 手動チェック（必要なら最小限）：
  - 手順：
  - 期待結果：

---

## Rollout / Rollback（出し方/戻し方）

<!--
事故った時に戻せるようにする（特に課金/広告/データ）。
-->

- リリース手順への影響：
- ロールバック方針：
- 検知方法（何を見て気づく？）：

---

## Links（関連リンク：正へ寄せる）

<!--
“変わりやすい情報” はここにリンクするのが安全。
-->

- constraints: `docs/reference/constraints.md`（関連章：）
- reference: <docs/reference/...>
- PR: #
- Issue: #
- Figma: <URL>
- package.json: <該当script/依存へのリンク>
- CI: <workflowへのリンク>
- External docs (SDK公式など): <URL>

---

## Notes（メモ：任意）

<!--
補足。長くなりそうなら別ドキュメントにしてリンク。
-->
