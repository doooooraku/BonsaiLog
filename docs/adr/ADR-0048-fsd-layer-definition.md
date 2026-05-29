# ADR-0048: FSD 層定義と境界 import allow-matrix (Phase 6)

- Status: Proposed （PR 6-0 を user レビュー後に Accepted 化。マージ＝承認）
- Date: 2026-05-29
- Deciders: @doooooraku
- Related: `docs/refactor/master-plan.md` (Phase 6 / 当初は「ADR-0046 FSD層定義」と記載 → 0046/0047 使用済のため本 **ADR-0048** に採番変更) / `docs/architecture.md` §1-2 (層と依存の向き) / ADR-0008 (datetime 3層防御＝db→core を強制) / ADR-0007 (F-11 ZIP/写真データ経路、F2 の最高リスク根拠) / 1次情報: [Feature-Sliced Design](https://feature-sliced.design/) (層と一方向依存) / [eslint-plugin-boundaries](https://github.com/javierbrea/eslint-plugin-boundaries) v6 (`boundaries/dependencies` rule)

---

## Context（背景：いま何に困っている？）

- `docs/architecture.md` は「FSD 風の層構造・依存は上から下へ一方向」を **目指す姿**として宣言し、Phase 1 調査で **既知の境界違反 7 件**（`core→stores`×3 / `db→services`×2 / `db→features`×1 / `stores→services`×1）を検出していた。
- しかし **層間 import を機械検査する仕組みが無かった**：`eslint-plugin-boundaries` は Phase 3 で「Phase 6 へ繰延」とされ、package.json にも eslint.config.js にも未導入だった。「目指す姿」が文章止まりで、新規違反の混入を検出できない。
- さらに **層の allow-matrix（どの層がどの層を import してよいか）が ADR で明文化されていない**。`stores→services` のように「違反」とされていたが実は正規化すべきエッジ、`db→core`（datetime）のように **ADR-0008 が強制する正当エッジ**などがあり、機械検査を入れるには許可規則の正が必要。

## Decision（決めたこと：結論）

1. **`src/` の層を以下に確定**（`docs/architecture.md` §1 を正式化）: `app` / `src/features` / `src/components` / `src/core` / `src/db` / `src/services` / `src/stores` / `src/types` / `src/dev`。
2. **境界 import の allow-matrix を以下に確定**（`eslint-plugin-boundaries` の `boundaries/dependencies` で機械検査。`default: disallow`）:

   | from（依存元）    | allow（import 可の層）                                                                           |
   | ----------------- | ------------------------------------------------------------------------------------------------ |
   | `app`             | すべて                                                                                           |
   | `dev`（開発専用） | すべて                                                                                           |
   | `features`        | features / components / core / db / services / stores / types                                    |
   | `components`      | components / core / types / **db（※共有 schema 型 `EventType` のみ。下記 Notes）**               |
   | `core`            | core / types （**stores 禁止**）                                                                 |
   | `db`              | db / **core**（ADR-0008 の `nowUtc` 等 datetime を強制）/ types （**services / features 禁止**） |
   | `services`        | services / **core**（`getAppExtra`/`IAP_DEBUG` の config 参照）/ types                           |
   | `stores`          | stores / **services**（proStore→proService を合法化）/ db / core / types                         |
   | `types`           | types のみ                                                                                       |

3. **この matrix で残る違反 = 是正対象 6 件**（PR 6-1〜6-4 で解消）:
   - `core→stores` ×3（`useColors` / `potUnitConvert` / `lang-defaults`、F1）
   - `db→services` ×2（`photoRepository` / `bonsaiRepository`、F2）
   - `db→features` ×1（`eventRepository`→`payloadValidator`、F3）
4. **`stores→services`（F4）は「違反」でなく正規化エッジと再定義**。`src/services/` を「外部 SDK の薄いラッパ層」（architecture.md §1 の定義）とし、`stores` がそれに依存するのは正当。コード修正は不要。
5. ~~**`useColors` の移設先は `src/features/theme/`**（F1a、PR 6-3）~~ → **下記 Amendment (2026-05-29) で変更**。実装時に「3 つの共通部品 (components 層) が useColors を使う」ことが判明し、features へ移すと `components→features` 違反が新たに発生するため、**core 据え置き + 例外受容**に方針変更。
6. 導入時の severity は **warn**（既知 6 違反を可視化）、全違反解消後に **PR 6-5 で error 化 + CI gate** とする。

## Decision Drivers（判断の軸）

- Driver 1: **1次情報整合** — FSD の「一方向依存」と eslint-plugin-boundaries の許可規則モデルに合わせる。
- Driver 2: **正当エッジを誤検出しない** — ADR-0008 強制の `db→core` や config 参照の `services→core` は allow に含め、false positive を出さない。
- Driver 3: **段階導入（Strangler）** — warn で可視化 → 1 違反種ずつ解消 → error で封じ込め。各 PR で違反数の推移を証拠化。

### 4 ペルソナ評価（リファクタ＝振る舞い不変）

| 観点               | 高橋 62（シニア） | Marcus 35（米国 IT） | 業務プロ（100 鉢） | ライト（1-2 本） |
| ------------------ | ----------------- | -------------------- | ------------------ | ---------------- |
| 画面の見た目・操作 | ◎ 無変化          | ◎ 無変化             | ◎ 無変化           | ◎ 無変化         |

本 ADR は内部の層定義 + 静的検査の導入で、ユーザー可視の変化ゼロ。全ペルソナ ◎。

## Alternatives considered（他の案と却下理由）

### Option A: `useColors` を新設 `src/shared/` 層へ

- 概要: FSD の「shared」層を新設し useColors を置く。
- 却下理由: FSD の「shared」は慣例的に **最下層**（誰からも import される土台）。だが useColors は `settingsStore` を **import する側**＝stores より上位でなければならず、最下層に置くと自身が境界違反になる。層の意味が捻れるため不採用。`src/features/theme/` が素直。

### Option B: `core→stores` を allow に含め F1 を「正規化」

- 概要: useColors を動かさず、core が stores を import してよいと定義。
- 却下理由: architecture.md の根幹「下層（core）は上層（stores）を知らない」を崩す。core は i18n/theme/datetime の **基盤**で、特定 state への依存を持たせると再利用性・テスト容易性が落ちる。F1 は「正規化」でなく「是正」が正しい。

### Option C: boundary plugin を入れず docs の運用ルールだけで縛る

- 却下理由: Phase 1 で 7 違反が既に存在した事実が「文章だけでは守られない」ことの証明。機械検査（CI gate）でなければ再発する（CLAUDE.md §9 記憶の昇華＝構造的解決）。

## Consequences（結果）

### Positive

- 層違反が CI で機械検出可能になり、新規混入を構造防止（最終 error 化後）。
- allow-matrix が ADR で明文化され、「なぜこの import が NG/OK か」を判断できる。
- `stores→services` の正規化で F4 のコード変更が不要になり、リスクが減る。

### Negative / 副作用

- 導入直後は warn が 6 件出る（PR 6-1〜6-4 で 0 にする計画）。
- `components→db`（EventIcons の `type EventType`）を暫定許可（下記 Notes、将来 types/ 移設候補）。

### Follow-ups

- [ ] PR 6-1〜6-4 で 6 違反を解消（推移を各 PR 本文に記録）。
- [ ] PR 6-5 で warn→error 昇格 + CI gate、`architecture.md` L57/L58/L134 の「ADR-0046 予定」→「ADR-0048 確定」へ更新、`master-plan.md` の F4 記載の ADR 番号修正。
- [ ] （将来）共有 schema 型（`EventType` 等）の `src/types/` 移設を検討し `components→db` 例外を撤去。

## Acceptance / Tests（合否）

- 正（静的）: `pnpm lint` の `boundaries/dependencies` が **PR 6-0 時点で warn 6 件**（core→stores×3 / db→services×2 / db→features×1）、PR 6-4 後に **0 件**、PR 6-5 で **error 0**。`import/no-cycle` 0 維持。
- 正（自動）: `pnpm test` 全緑（node22）、`pnpm tsc --noEmit` 緑。
- 振る舞い: ユーザー可視変化ゼロ（F2 のみ実機で写真追加/盆栽削除のファイル整合を確認）。

## Rollout / Rollback

- 出し方: PR 6-0（本 ADR + plugin warn 導入）→ 6-1〜6-4（違反解消）→ 6-5（error 化）。
- 戻し方: 各 PR 独立 squash で `git revert`。plugin は devDep のため最悪 `pnpm remove eslint-plugin-boundaries` + config 削除で完全撤去。

## Links

- master-plan: `docs/refactor/master-plan.md`（Phase 6）
- 計画書: `docs/refactor/phase-6-plan.md`
- architecture: `docs/architecture.md` §1-2
- plugin: eslint-plugin-boundaries v6（`boundaries/dependencies`）

## Notes（メモ）

- **`components→db` の暫定許可**: 唯一の該当は `src/components/icons/EventIcons.tsx` の `import type { EventType } from '@/src/db/schema'`（型のみ）。`EventType` は schema と同居する共有列挙で、移設は多数ファイルに波及するため Phase 6 のスコープ外。allow-matrix で暫定許可し、将来 `src/types/` へ移設時に例外撤去する。
- **当初 master-plan の「ADR-0046」表記**: 起票時に 0046（ハーネス棚卸し）/ 0047（レビュー契約）が既に使用済だったため、FSD 層定義は本 ADR-0048 に採番した。古い参照は PR 6-5 で一掃する。

---

## Amendment (2026-05-29): F1a useColors は移設せず「core 据え置き + 例外受容」

### 背景（実装時に判明した想定外）

Decision 5 は当初「`useColors` を `src/features/theme/` へ移設」としていたが、PR 6-3 実装時の consumer 実測で **`useColors` を `src/components/` の 3 部品（`ConfirmDialog` / `RowActionMenu` / `FormScreenHeader`）が使用**していることが判明した。

`useColors` は `themeMode`（= `settingsStore` の state）を読むため **`stores` を import できる層**にしか置けない。一方、それを使う `components` 層が import できるのは `core` / `types` / `db` のみ。

| 条件                      | 該当層                   |
| ------------------------- | ------------------------ |
| `components` が import 可 | core / types / db        |
| `stores` を import 可     | app / features / stores  |
| **両方を満たす層**        | **存在しない（空集合）** |

→ useColors を `features` へ移すと `components→features`（新規違反）が 3 件発生。**どこへ移しても別の違反が出る**ため、移設では解決できない。

### 変更後の決定

- **`useColors` は `src/core/theme/useColors.ts` に据え置く**。
- `useColors` → `settingsStore` の **`core→stores` エッジ 1 本のみを受容**（accepted exception）。当該 import 行に `// eslint-disable-next-line boundaries/dependencies` + 理由コメントを付し、本 Amendment で明文化する。
- **他の `core→stores` は引き続き禁止**（本件は theme hook 1 箇所のみの限定例外）。
- 根拠: `useColors` は app / components / features 全層が使う**横断 UI hook**で、テーマ設定の state を読むのは本質的に正当。完全な純粋化（下記）は振る舞いリスク・工数に見合わない。CLAUDE.md §3「受容は ADR で明文化」/ ADR-0045 と同じ pragmatic 方針。

### 却下した代替（再掲）

- **C 案（core に ThemeMode Context を新設し app 入口で stores から注入）**: 例外ゼロの純粋解だが、テーマ配線の作り替え＝実機検証必須の中リスク。本 Phase の「振る舞い不変・低リスク」優先で見送り（将来 v1.x で再検討余地）。
- **A 案（3 部品を props 受け取りに改修）**: 最も FSD 純粋だが部品 API 変更 + 約 16 呼出側修正 + 見た目崩れリスクで非採用。

### 影響

- 違反推移: F1a は「解消」でなく「受容（waive）」。`boundaries/dependencies` warn は本 PR で 3→2、PR 6-4（F2）後に **2→0 相当**（残る useColors は eslint-disable 済のため警告に出ない）。PR 6-5 の error 化後も当該行は disable で通過。
- Decision 5（移設）は本 Amendment が supersede。`docs/refactor/phase-6-plan.md` の F1a 行も同期更新。
