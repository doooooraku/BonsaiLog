# ADR-0047: レビュー Output Contract 化 — 判定可能な決まった形式 + 機械ゲートの適用境界

- Status: Accepted
- Date: 2026-05-29
- Deciders: @doooooraku
- Related: Issue #888 / 承認済み計画 `~/.claude/plans/takt-assess-sunny-bird.md` / ハーネスエンジニアリング3記事の `/discuss` 検討（施策③）/ 先行施策 [ADR-0046](./ADR-0046-harness-inventory-and-retirement-policy.md)（ハーネス退役ポリシー、足す前ゲート）/ `.claude/skills/review-pr/SKILL.md`（W-10.5 レビュー、本 ADR で改修）/ `.github/pull_request_template.md` §14（判定欄、本 ADR で整合）/ `.claude/recurrence-prevention.md` R-25（機械判定のみで達成判定禁止・Claude Read 構造系5項目）/ R-10（ペルソナ評価）/ 一次情報 [Martin Fowler / Birgitta Böckeler "Harness engineering for coding agent users"](https://martinfowler.com/articles/harness-engineering.html)（sensors = feedback、事後の検証）

---

## Context（背景：いま何に困っている？）

- **現状**: コードレビュー（`/review-pr`、W-10.5）の出力は **散文 + 3 値判定（Approve / Request Changes / Discuss）** で、指摘が文章のまま。深刻度・場所(file:line)・ID が統一されていない。
- **困りごと**:
  - 合否（マージしてよいか）が一意に決まらず、読み手・回によってブレる。
  - 「直さないとダメな指摘（バグ等）」と「あったらいい程度（好み）」が混ざる。
  - 指摘に ID が無く、次回レビューで「#1 は直った / #2 は残っている」と**追跡できない**。
  - まれに、それっぽいが的外れな指摘（幻覚）が散文に紛れる。
- **制約/前提**:
  - 一次情報（Fowler/Böckeler）：ハーネスは sensors（事後の検証 = feedback）を含む。検証は「判定可能な形で受ける」ほど自己修正が回る。
  - **R-25（最重要の制約）**: 「機械判定のみで“達成”判定するな。UI/構造はラベルではなく Claude Read による構造系5項目（タブ/セクション/UI種別/スクロール範囲/EventRow表示モード+sub-layout）で評価せよ」。→ 機械ゲートが構造系の達成判定を肩代わりすると R-25 と正面衝突する。
  - **追加課金ゼロ**（user 制約）：クラウド有料レビュー（`/code-review ultra`）は使わない。`/review-pr`（プロジェクト所有 skill）の改修のみ。

---

## Decision（決めたこと：結論）

`/review-pr` のレビュー出力を **Output Contract（判定可能な決まった形式）** に固める。

### D-1. 判定は 2 値ゲート

- `判定: APPROVE | REQUEST_CHANGES` の **2 値**。従来の `Discuss` は**判定値から外し**、「要議論メモ」欄に降格（議論導線は残すが、合否の選択肢にはしない）。

### D-2. 指摘表（Findings）— 構造化必須

各指摘を表で記録する:

| 列     | 値                                                                                             |
| ------ | ---------------------------------------------------------------------------------------------- |
| ID     | `FIND-001` 連番                                                                                |
| 深刻度 | `critical` / `high` / `medium` / `low`                                                         |
| 種別   | `bug`（正しさ）/ `constraints`（規約違反）/ `quality`（品質・好み）/ `structure-UI`（UI/構造） |
| 場所   | `file:line`                                                                                    |
| 内容   | 1 行                                                                                           |

### D-3. 機械ゲートの適用境界（R-25 との両立、本 ADR の核心）

機械ゲート（**`critical`/`high` の指摘が 1 件以上 → 自動的に `REQUEST_CHANGES`**）は、**種別が `bug` または `constraints` の指摘にのみ**適用する:

- `bug`：コードの正しさ（ロジック誤り / null 安全 / 例外処理 / データ破壊）。
- `constraints`：`grep` 等で機械検証できる規約違反（APIキー直書き / i18n 19言語欠落 / 相対パス違反 / 取り消し線 / 禁止語 など）。

**種別 `structure-UI` の指摘は機械ゲートの対象外**とし、**R-25 の Claude Read 主導・構造系5項目評価を従来どおり維持**する（指摘表には `structure-UI` として記録するが、その達成可否はゲートで自動判定せず、Claude が実機SS/mockupを Read して評価する）。

> **原則**: 機械ゲートは「**これ以下はマージさせない下限**」であって「**マージを承認する根拠**」ではない。`APPROVE` は「下限を割っていない」状態を示すに過ぎず、**最終マージ可否は人間**（`auto-merge` ラベル運用は ADR 現状維持）。

---

## Decision Drivers（判断の軸）

- **Driver 1 — 出力の再現性**: 毎回同じ形 → 合否がブレない、品質が下振れしない。
- **Driver 2 — 追跡可能性**: ID 付与で指摘の new/持続/解消を追える。
- **Driver 3 — R-25 との非衝突**: 機械化してよい領域（正しさ・grep可能規約）と、人が読む領域（UI/構造）を**明確に分ける**。
- **Driver 4 — 最小・無料**: 既存 `/review-pr` skill の改修のみ。新ツール・新規依存・外部課金ゼロ。

---

## Alternatives considered（他の案と却下理由）

### Option A: 現状維持（散文 + 3 値）

- 良い点: コストゼロ。
- 却下理由: 合否ブレ・追跡不能・幻覚混入が残る。施策③の動機そのもの。

### Option B: 全指摘を機械ゲートで自動判定（UI/構造も含む）

- 良い点: 完全自動で楽。
- 却下理由: **R-25 と正面衝突**（UI/構造の達成を機械が誤判定した Issue #439-#441 の再来）。D-3 の境界で回避。

### Option C: クラウド有料レビュー（`/code-review ultra`）導入

- 良い点: 多視点・高精度。
- 却下理由: **追加課金が発生**（user 制約で不採用）。多視点が要るなら Claude Code 純正 `Workflow`/サブエージェントで無料内製可（Future Work ③-b）。

---

## Consequences（結果）

### Positive（嬉しい）

- レビュー出力が毎回同形 → 合否が一意、品質が安定（普段使いで体感）。
- 指摘の深刻度・種別・ID が揃い、追跡と機械ゲートが両立。
- 既存 skill 改修のみ・無料・完全可逆。

### Negative（辛い / 副作用）

- `Discuss` が判定値から外れる → 議論が必要なケースの導線が弱まる（→ **「要議論メモ」欄**を残して緩和）。
- 深刻度の付け方に主観が残る（→ 種別定義を ADR/skill に明記して揺れを抑える）。

### Follow-ups / Future Work（後でやる宿題）

- [ ] **③-b 判定分離（v1スコープ外）**: 「書く担当」と「判定担当」を分離し、判定を**読み取り専用サブエージェント（Edit/Write 権限なし）に委譲**して自己採点バイアスを排除。多視点並列レビュー（bug/security/可読性）も `Workflow`/Agent ツールで**無料(トークンのみ)**実装可。**効果を計測（施策②）してから着手**（ADR-0046 の「足す前ゲート」精神）。実装時は R-21（並列はworktree隔離）必須。
- [ ] PR テンプレ §14 を本 ADR の契約形式に整合（Issue #888 PR-A 同梱）。

---

## Acceptance / Tests（合否）

- 正（自動）:
  - `pnpm docs:lint; echo "EXIT=$?"` = **EXIT=0**（ADR-0047 追加で連番 0046→0047 連続、新たな歯抜けを作らない）。
  - `pnpm verify` 全緑を維持。
- 手動チェック:
  - `/review-pr <過去の任意PR>` をドライランし、出力が **2値判定 + 指摘表（ID/深刻度/種別/file:line）+ ゲート規則** の形になる。
  - `structure-UI` 種別の指摘が機械ゲートで自動 REQUEST_CHANGES されず、R-25 の Claude Read 評価に回ることを確認。
  - `git diff --stat` に **src/ の変更 0 件**。

---

## Rollout / Rollback（出し方 / 戻し方）

- リリース手順への影響: なし（skill + ADR + PRテンプレのみ、アプリ挙動・ストアに無影響）。
- ロールバック: `git revert` で全て戻せる。
- 検知方法: `pnpm verify` の docs:lint（CI）。

---

## Links（関連リンク）

- Issue: #888
- 計画: `~/.claude/plans/takt-assess-sunny-bird.md`
- skill: `.claude/skills/review-pr/SKILL.md`
- PRテンプレ: `.github/pull_request_template.md` §14
- 先行 ADR: `docs/adr/ADR-0046-harness-inventory-and-retirement-policy.md`
- 制約: `.claude/recurrence-prevention.md`（R-25 / R-10 / R-21）
- 一次情報: https://martinfowler.com/articles/harness-engineering.html

---

## Notes（出力契約の記入例）

```markdown
## PR #123 レビュー: <タイトル>

判定: REQUEST_CHANGES

### 指摘表（Findings）

| ID       | 深刻度 | 種別         | 場所                          | 内容                                                     |
| -------- | ------ | ------------ | ----------------------------- | -------------------------------------------------------- |
| FIND-001 | high   | bug          | src/db/eventRepository.ts:142 | 戻り値の null 未チェックで落ちる                         |
| FIND-002 | medium | quality      | src/features/x/X.tsx:88       | 既存 util を再利用できる                                 |
| FIND-003 | high   | structure-UI | （実機SS）                    | タブ構成が mockup と不一致（R-25 で要 Claude Read 評価） |

### ゲート判定

- bug/constraints の critical/high: FIND-001（high/bug）が 1 件 → **REQUEST_CHANGES**
- structure-UI（FIND-003）: 機械ゲート対象外 → R-25 の構造系5項目評価へ回す

### 要議論メモ（旧 Discuss、判定値ではない）

- FIND-002 の util 再利用は設計方針の相談が要るかも → 必要なら /discuss

### マージ方法

- [ ] auto-merge ラベル / [x] 人間承認待ち
```
