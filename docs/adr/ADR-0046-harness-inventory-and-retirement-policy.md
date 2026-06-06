# ADR-0046: ハーネス棚卸し + 廃止（retire）ポリシー — 「削る側」の仕組み新設

- Status: Accepted
- Date: 2026-05-29
- Deciders: @doooooraku
- Related: Issue #878 / 承認済み計画 `~/.claude/plans/takt-assess-sunny-bird.md` / Sess の `/discuss`（ハーネスエンジニアリング3記事検討）/ `.claude/recurrence-prevention.md`（運用ルール §3「R 番号は変更しない」/ §6「2 回再発で昇華」）/ `docs/adr/README.md` §5（ステータス定義 Deprecated/Superseded）/ `scripts/docs-lint.mjs`（ADR 連番チェック L69-84）/ 廃止書式の既存実例 [ADR-0013](./ADR-0013-f04-watering-visualization.md) [ADR-0019](./ADR-0019-home-screen-role.md) / 一次情報 [Martin Fowler / Birgitta Böckeler "Harness engineering for coding agent users"](https://martinfowler.com/articles/harness-engineering.html)（Agent = Model + Harness、guides=feedforward / sensors=feedback の steering loop）

---

## Context（背景：いま何に困っている？）

- **現状**: BonsaiLog の AI ハーネス（＝AI エージェントを外側から方向づけ・点検する仕組み。hook 10・check 21・CI 8・R ルール 80・ADR 45・Engram）は既に高水準。だが **「足す仕組み」だけが構造化** されている:
  - `~/.claude/CLAUDE.md` §9「3 回再発で昇華」
  - `.claude/recurrence-prevention.md` 運用ルール §6「2 回再発で hook 化検討、3 回目で必須」
  - → ルール・ADR・hook は **増える一方**で、「目的に照らして削る/廃止する仕組み」が **皆無**。
- **困りごと（一次情報の裏付けあり）**:
  - ハーネスエンジニアリング記事（Findy）の核心: 「**判断基準は“削るため”にある／足せても削れず肥大化し、やがて変更できなくなる**」「ルール増えすぎ、Skill に切り出しても読まれない/効かない」。
  - Martin Fowler / Böckeler: ハーネスは feedforward（事前予防）と feedback（事後検証）の steering loop。**人間の仕事はハーネスを反復改善して操縦すること**。改善には「削る」も含む。
  - BonsaiLog の実体: R ルール 80・ADR 45・`specialized.md` 526 行・SessionStart 注入の肥大。「指示の半分が無視される」リスクに接近。
- **制約/前提（調査済みの事実、`docs/reference/constraints.md` および実コード）**:
  - **番号は物理削除不可**: `scripts/docs-lint.mjs` の連番チェック（L69-84）は欠番を `warnings` に積む。`R-NN` は約 3,065 参照/173 ファイル、`ADR-NNNN` は約 1,655 参照/151 ファイル。物理削除すると参照破壊＋永続 warning（ADR-0022/0023 が実例）。
  - ADR ステータス（Proposed/Accepted/Rejected/**Deprecated**/**Superseded**）は `docs/adr/README.md` §5 で定義済みだが、**廃止運用の手順が未明文化**。`docs-lint` Check 3（取り消し線）は `docs/adr/` を除外（ADR は履歴を残してよい）。
  - 既存運用ルール §3「R 番号は変更しない（削除時は `~~R-N: 削除~~` と注記）」。

---

## Decision（決めたこと：結論）

- **決定**: ハーネス（ADR / R ルール）の **「廃止＝アーカイブ方式（番号保持）」を正式運用化** し、**「足す前ゲート」**（事前予防）と **定期棚卸し**（`/retro` 相乗り）を新設する。物理削除は禁止。
- **適用範囲**: ハーネス資産（`docs/adr/`、`.claude/recurrence-prevention*`）の廃止プロセス全般。アプリ機能（src/）には影響しない。本 ADR の v1 はプロセス確立まで（既存 ADR/R ルールの実廃止は行わず、ドライラン記入例のみ）。

### D-1. 廃止＝アーカイブ方式（番号は消さない）

| 対象     | 廃止の表現                                                                                                                                                                                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ADR      | ファイル・番号を残し、`Status:` を `Deprecated`（後継なし）または `Superseded by [ADR-NNNN](./...) (日付, 理由)`（後継あり）に変更。本文冒頭に「> **YYYY-MM-DD 追記 (Deprecated/Superseded)**: ...」ブロックを追加（[ADR-0019](./ADR-0019-home-screen-role.md) が実例）。 |
| R ルール | 番号は残し、既存運用ルール §3 の `~~R-N: 削除~~` 注記方式を踏襲。1 行で「廃止理由 / 廃止日 / 代替（あれば R-M or 構造的防止）」を併記。                                                                                                                                   |

### D-2. retire 手順（ADR・R ルール共通、4 ステップ）

1. **影響 grep**: `grep -rn "ADR-NNNN\|R-NN" .` で被参照を洗い出し、件数を PR 本文に記載（参照が残るファイルを把握）。
2. **user 承認**: 「本当に廃止してよいか」を判断材料（被参照件数・代替の有無）付きで user に確認（R-11）。
3. **Status / 注記変更**（番号は保持。物理削除しない）。
4. **後継リンク**: Superseded の場合は後継 ADR 番号を必ず明記（`docs-lint` Check 6 が整合を warning で補助 / Issue #878 PR-2）。

### D-3. 足す前ゲート（feedforward、新規追加時の 3 自問）

新規 R ルール / ADR / hook / check を**足す前に**、必ず次を自問し、答えを Issue または PR に 1 行記載する:

1. **(a) 構造で防げないか?** — 型 / lint / CI / hook / DB CHECK で「違反が書けない形」にできないか（記事「構造で守れるなら指示は要らない」）。
2. **(b) 既存と重複しないか?** — 似た意図の R/ADR を grep で確認（R-9）。重複なら新設せず既存を更新。
3. **(c) 代わりに 1 つ廃止できないか?** — 足すなら、目的を終えた既存ルールを 1 つ retire できないか検討（純増を抑える）。

### D-4. 定期棚卸しの cadence（`/retro` 相乗り）

- マイルストーン / リリース時の `/retro`（プロジェクトローカル skill）に「ハーネス棚卸し」ステップを追加（Issue #878 PR-3）。
- 内容: 被参照の少ない ADR・重複しそうな R ルールを **grep で列挙し、user に廃止可否を仰ぐ**（完全自動判定はしない＝削除可否は人間が決める）。
- **グローバル skill `/memory-review`（Engram 対象・全プロジェクト共用）には足さない**（プロジェクト固有汚染の回避）。

---

## Decision Drivers（判断の軸）

- **Driver 1 — 変更容易性 (changeability)**: 記事の最終ゴール「ハーネスの変更容易性を高く保つ」。削れない設計は変更不能に至る。
- **Driver 2 — 可逆性・参照安全**: 約 4,700 箇所の `R-NN`/`ADR-NNNN` 参照を壊さない。番号保持アーカイブが唯一安全。
- **Driver 3 — 最小実装（過剰設計の回避）**: 「削る仕組み」を足すこと自体が肥大化するメタリスク。新ツール・新 hook・NLP 自動検出は入れず、既存資産（`docs-lint.mjs`・`/retro`・ADR ステータス）の最小拡張に留める。
- **Driver 4 — 既存方針との一貫性**: 「2 回再発で昇華」に倣い、棚卸しの自動化（`harness-inventory.mjs` 等）は**手作業が 2 回以上再発してから**昇華する（先回りで作らない）。

---

## Alternatives considered（他の案と却下理由）

### Option A: 何もしない（現状維持）

- 概要: 「足す仕組み」のみ継続。
- 良い点: コストゼロ。
- 悪い点: ルール・ADR が単調増加。記事の警告どおり肥大化 → 変更不能。
- 却下理由: 構造的肥大が確定的。本 ADR の動機そのもの。

### Option B: 物理削除（不要な ADR/R を本当に消す）

- 概要: 役目を終えた ADR/R ルールをファイルごと削除。
- 良い点: 直感的に「減る」。
- 悪い点: 約 4,700 参照を破壊。`docs-lint` 連番チェックで永続 warning。後続セッションが「存在しないルール」を参照。
- 却下理由: 参照破壊が致命的。ADR-0022/0023 の永続 warning が実例。

### Option C: 重複検出を NLP / 類似度で自動化

- 概要: R ルール本文の類似度で重複候補を自動抽出。
- 良い点: 列挙が自動化される。
- 悪い点: 実装・保守コスト大、誤検出。実廃止 R ルールが現状 0 件で投資対効果が薄い。
- 却下理由: v1 では過剰（Driver 3/4）。手作業が再発したら昇華（別施策）。

### Option D: TAKT 全面採用（YAML ハーネステンプレート OSS）

- 概要: nrs 氏の TAKT を導入し、ハーネスをワークフロー化。
- 良い点: FF/FB・判定分離・並列レビュー・worktree 隔離が一式。
- 却下理由: 0.x（破壊的変更）・実質単独メンテ・Expo/EAS/WSL2/単独開発に重い・SDK 依存増。今回 **Assess（見送り）**。再検討トリガー: (a) 1.0 到達 or (b) 複数 provider 並列実行が必要になった時。多視点並列レビューが要るなら、まず Claude Code 純正 `Workflow` ツールで内製可。

---

## Consequences（結果：嬉しいこと / 辛いこと / 副作用）

### Positive（嬉しい）

- ハーネスに初めて「削る側」の道ができ、変更容易性が保てる。
- 足す前ゲートで純増を抑制（足すたびに「構造で防げないか / 重複 / 1 つ廃止」を問う）。
- 既存資産の最小拡張のみで、新規依存・新規 hook ゼロ。

### Negative（辛い / 副作用）

- 棚卸しが「また足すだけ」に終わると形骸化するリスク（→ 足す前ゲート (c) と `/retro` 列挙で緩和）。
- retire 手順が 1 ステップ増える（影響 grep + 承認）。ただし可逆・低頻度。

### Follow-ups（後でやる宿題、Issue #878）

- [ ] PR-2: `scripts/docs-lint.mjs` に Check 6（Superseded ADR の後継リンク整合、warning のみ）。
- [ ] PR-3: `.claude/skills/retro/SKILL.md` に「ハーネス棚卸し」ステップ。
- [ ] 別 Issue（①完了後）: ② ハーネス有効性の軽量計測 / ③ レビューの Output Contract 化。

---

## Acceptance / Tests（合否）

- 正（自動）:
  - `pnpm docs:lint; echo "EXIT=$?"` が **EXIT=0**（ADR-0046 追加で新たな連番歯抜けを作らない。Check 6 は warning のみ）。
  - `pnpm verify`（lint + type + test + i18n + config + docs:lint）全緑を維持。
- 手動チェック:
  - 本 ADR が `adr_template.md` の節構成を満たす。
  - 本 ADR は退役の**ドライラン記入例のみ**で、既存 ADR/R ルールの Status を変更していない（`git diff` で確認）。
  - `git diff --stat` に **src/ の変更が 0 件**。

---

## Rollout / Rollback（出し方 / 戻し方）

- リリース手順への影響: なし（doc + scripts + skill のみ、アプリ挙動・ストアに無影響）。
- ロールバック: 全変更が `git revert` で戻せる。番号物理削除をしないため参照破壊が起きない。
- 検知方法: `pnpm verify` の docs:lint ステップ（CI）。

---

## Links（関連リンク）

- Issue: #878
- 計画: `~/.claude/plans/takt-assess-sunny-bird.md`
- constraints: `docs/reference/constraints.md`
- 運用元: `.claude/recurrence-prevention.md`（§3 番号不変 / §6 昇華）
- ADR ステータス定義: `docs/adr/README.md` §5
- lint: `scripts/docs-lint.mjs`
- 一次情報: https://martinfowler.com/articles/harness-engineering.html

---

## Notes（記入例：ドライラン）

### 例 1 — ADR を Superseded にする場合（番号は残す）

```diff
- - Status: Accepted
+ - Status: Superseded by [ADR-0099](./ADR-0099-xxx.md) (2026-06-01, 〇〇方針へ統合)
```

冒頭に追記:

```markdown
> **2026-06-01 追記 (Superseded)**: 本 ADR は ADR-0099 に統合。理由は ADR-0099 Context 参照。
```

### 例 2 — R ルールを廃止する場合（番号は残す）

```markdown
### ~~R-NN: 旧ルール名 (削除)~~

- **廃止**: 2026-06-01 / 理由: 構造で代替（〇〇 hook / lint で恒久防止）/ 代替: R-MM
```

### 足す前ゲートの記載例（新規 R/ADR 追加 PR に 1 行）

```
足す前ゲート: (a)構造で防げない=型/lintでは表現不可 (b)重複なし(grep "xxx"で確認) (c)R-12を同時retire可
```

---

## Notes Amended (2026-06-07、 Sess71): 「人間判定 vs 機械判定」 4 つ目自問追加

### 改訂背景

Sess70 で「JS-only 変更なのに build を選択した」 事象 (1 セッション 10-15 分時間ロス) が発生。 user 指摘「そもそも人間が判定する必要性ってどこにある? Claude Code が file の変更種類で分かるんだから」 を契機に、 ADR-0046 D-3「足す前ゲート (3 自問)」 に **「人間判定 vs 機械判定」 の 4 つ目自問** が欠落していたことが判明。

個別ルール (R-58/59/60 等) は「特定の場面で何をすべきか」 を決めるが、 「人間判定の存在自体を疑う」 視点が ADR レベルにも欠けていた。 例:

- build vs reload 判定 (Sess70 で発覚) → 人間判断に依存
- dependency 更新の安全度判断 → 人間判断に依存 (npm audit 機械化可能)
- 新画面の dark SS 必要性 → R-60 で機械化済

### 改訂内容: D-3 を 3 自問 → 4 自問 に拡張

新規 R / ADR / hook / check を **足す前に**、 以下 4 自問を行い、 答えを Issue/PR に 1 行記載する:

1. **構造で防げないか?** (型 / lint / CI / hook / DB CHECK で「違反が書けない形」 にできないか)
2. **既存と重複しないか?** (grep 確認、 R-9 整合)
3. **代わりに目的を終えた既存ルールを 1 つ廃止できないか?** (足す前ゲートの本旨、 アーカイブ方式)
4. **(新) 人間判定が必要か? 機械判定に置き換えられないか?**
   - 「念のため XX しよう」 「経験で判断」 のような mental model を仕組み化対象として認識
   - 機械判定 (file pattern / hash / git diff / npm audit / lint 等) で代替可能なら必ず機械化
   - 安全網: 機械判定の bug を恐れて手動 fallback を残す場合は明示的に reason を記載

### 適用例 (Sess71 PR-1〜PR-5)

| 場面                       | 旧 (人間判定)                                   | 新 (機械判定)                                                                |
| -------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------- |
| build vs reload            | 「念のため build しよう」 と Claude/user が悩む | PostToolUse hook + git diff 補完で自動判定 (scripts/check-native-impact.mjs) |
| 新画面の dark SS 必要性    | 「dark mode 影響あるか」 と人間が悩む           | R-60 で機械判定 (新画面なら強制)                                             |
| ESLint rule 違反の許可判断 | 「この hex literal は例外で OK?」 と人間が悩む  | reason marker 必須 + 5 件以下 monitor (R-59)                                 |
| dependency 更新の安全度    | 「メジャー更新だけど大丈夫か」 と人間が悩む     | npm audit + 自動 PR check (将来検討)                                         |

### R-61 起票 (本 Amendment と同時、 Sess71 PR-5)

「人間判定 → 機械判定 + 安全網」 を BonsaiLog 共通設計原理として明文化:

- R-58/59/60 が個別ルール (「特定場面で何をする」)
- R-61 がメタルール (「ルール作る時に何を意識する」)
- 詳細: `.claude/recurrence-prevention/specialized.md` R-61

### Implementation (Sess71 PR-1〜PR-5)

1. PR-1 (#960): `scripts/check-native-impact.mjs` 共通核 + 17 unit test
2. PR-2 (#961): `.claude/hooks/check-native-impact-hook.mjs` PostToolUse hook 連携
3. PR-3 (#962): `scripts/dev/reload-app.sh` + `dev-start.sh` 起動時 flag check + 自動 build
4. PR-4 (本 PR): `docs/how-to/development/dev-workflow.md` + ADR-0046 Amendment + MEMORY.md
5. PR-5: R-61 起票 (`.claude/recurrence-prevention.md` 索引 + `specialized.md` 詳細)

### 関連

- Sess71 plan: `/home/doooo/.claude/plans/ok-1-playful-fern.md`
- `docs/how-to/development/dev-workflow.md` (本 Amendment の実装解説)
- R-61 (Sess71 起票): 「人間判定 → 機械判定」 メタルール
