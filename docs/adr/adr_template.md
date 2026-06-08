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

破壊的操作 / 一括操作系 ADR では、 「粒度 × 4 ペルソナ matrix」 必須化 (Sess25 ADR-0036 由来、 ADR-0035 D3「個別」 scope 限定で group 想定漏れ事例の恒久策):

| 粒度          | 高橋 62 (シニア) | Marcus 35 (米国 IT) | 業務プロ (100 鉢) | ライト (1-2 本) |
| ------------- | ---------------- | ------------------- | ----------------- | --------------- |
| 個別          |                  |                     |                   |                 |
| group (まとめ)|                  |                     |                   |                 |
| bulk (全選択) |                  |                     |                   |                 |

「個別だけ評価」 で group / bulk 想定漏れがないかを検証する。
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

## CRUD Coverage（CRUD 系機能を扱う ADR で必須、 R-65 整合）

<!--
ADR-0055 由来。 「機能の追加」 議論に偏らず、 既存機能の **完備性** (= U/D の対称性、 C/R の到達性) を 構造的に評価する。
CRUD 系機能 (data 操作 = C/R/U/D を user が行う機能) を扱う ADR で必須記載。
非 CRUD 系 ADR (UI 統一 / 文書整備 / build 設定 等) は本 section スキップ可、 ただし title に CRUD 動詞 (create/edit/update/delete) を含む場合は記載必須 (`pnpm docs:lint` で警告)。

各 cell に「対応する PR / Issue」 または「未対応の理由」 を記載。 「将来対応」 は ADR 内で言及 + Follow-ups に追加。
-->

| Operation  | 状態                     | 動線 / 制約 |
| ---------- | ------------------------ | ----------- |
| C (Create) | 対応 / 未対応 / 将来対応 |             |
| R (Read)   | 対応 / 未対応 / 将来対応 |             |
| U (Update) | 対応 / 未対応 / 将来対応 |             |
| D (Delete) | 対応 / 未対応 / 将来対応 |             |

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
