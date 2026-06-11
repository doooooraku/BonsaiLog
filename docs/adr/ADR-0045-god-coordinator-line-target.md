# ADR-0045: god 分割 coordinator の成功基準を「行数単独」から「責務分離 + ≤約450 行目安」へ再定義 (Phase 4)

- Status: Accepted
- Date: 2026-05-29
- Deciders: @doooooraku
- Related: `docs/archive/refactor-2026-05/master-plan.md` (Phase 4 god 分割、可読性 KPI「1 ファイル ≤400 行」) / `docs/archive/refactor-2026-05/phase-4-bonsai-detail.md` (A1 計画書、成功判定基準) / ADR-0020 (詳細画面 3 タブ構造) / ADR-0036 (破壊的操作 = 削除/アーカイブ) / ADR-0042 (FAB SoT = root) / PR Phase 4 A1-9〜A1-12.5 (本ブランチ `refactor/phase-4-bonsai-detail`) / 1 次情報: [ESLint max-lines](https://eslint.org/docs/latest/rules/max-lines) (default 300・推奨 100〜500) + [Sandi Metz Rules](https://thoughtbot.com/blog/sandi-metz-rules-for-developers) (「迷った時の目安、根拠あれば破ってよい」) + [React: Thinking in React](https://react.dev/learn/thinking-in-react) + [React: Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks) (行数でなく責務/関心分離) + [Martin Fowler: Strangler Fig](https://martinfowler.com/bliki/StranglerFigApplication.html) (成功指標 = テスト可能性・段階的価値、LOC 非対象)

---

## Context（背景：いま何に困っている？）

- 現状：`master-plan.md` は god component 分割の可読性 KPI に **「1 ファイル ≤400 行を原則」** を掲げ、測定手段に「`wc -l` CI チェック」と記載。
- 困りごと：
  - **(1) 目標が文章止まり**：≤400 行を強制する仕組み（ESLint `max-lines` / CI の `wc -l`）は **未実装**。守られているか検証されていない。
  - **(2) 実責務を全部抜いても 400 に届かない**：`app/(tabs)/bonsai/[id]/index.tsx` を Phase 4 A1-9〜A1-12 で全ての実責務（写真セクション / 予定追加 / タブバー / 削除・アーカイブ）を hook・サブコンポーネントへ抽出し、A1-12.5 で死 StyleSheet 20 件も削除した結果 **423 行**。残るのは routing + 11 hook 呼び出し配線 + render 骨格（Hero/タブ/3 タブ描画/FAB×2/DateTimePicker/ConfirmDialog×2）+ focusEventId effect + 4 style という **「どの部品にも属さない正当な coordinator の骨組み」**。これ以上の行数削減は StyleSheet の外部ファイル移動など **複雑さを減らさない LOC 操作**になる。
  - **(3) 1 次情報と齟齬**：ESLint `max-lines` は推奨 100〜500（default 300）で 400 はレンジ内だが緩め。Sandi Metz は「目安、根拠あれば破ってよい」と明言。React 公式は**行数でなく責務/関心の分離**を強調。Fowler の Strangler Fig も成功指標は**テスト可能性・段階的価値提供**で LOC は対象外。**行数単独は脆い指標**。
- 制約/前提：振る舞い完全不変（リファクタ）。`docs/reference/constraints.md` の god 分割方針、ADR-0020/0036/0042 の不変条件。

---

## Decision（決めたこと：結論）

- 決定：god 分割の成功基準を **「行数単独 ≤400」→ 「① 実責務が hook / サブコンポーネントに分離され、coordinator に残るのは routing + hook 配線 + render 骨格のみ ② tsc/lint/test 緑 ③ 行数は ≤約450 行を目安とし、超過時は本 ADR を参照し理由を明記」** に再定義する。
- `app/(tabs)/bonsai/[id]/index.tsx` の **423 行を正当な coordinator として受容**（元 1,573 行 → -73%、実責務ゼロ残置）。
- 適用範囲：Phase 4 の全 god 分割（A1〜C2、`master-plan.md` Phase 4a/4b/4c）。

---

## Decision Drivers（判断の軸：何を大事にした？）

- Driver 1: **1 次情報整合** — React 公式・Fowler が示す本質（責務/関心分離・テスト可能性）に合わせる。行数は副産物。
- Driver 2: **LOC 操作の回避** — StyleSheet を別ファイルへ移すだけの「数字合わせ」は複雑さを減らさずファイル数だけ増やすため採らない。
- Driver 3: **将来の混乱防止** — coordinator が 400 を超えても「なぜ正当か」を本 ADR で判断できる基準を残す。

### 4 ペルソナ評価（リファクタ = 振る舞い不変）

| 観点               | 高橋 62 (シニア) | Marcus 35 (米国 IT) | 業務プロ (100 鉢) | ライト (1-2 本) |
| ------------------ | ---------------- | ------------------- | ----------------- | --------------- |
| 画面の見た目・操作 | ◎ 無変化         | ◎ 無変化            | ◎ 無変化          | ◎ 無変化        |

本 ADR はコード内部の基準変更でユーザー可視の変化ゼロ。全ペルソナ ◎（デグレなしが成功条件）。

---

## Alternatives considered（他の案と却下理由）

### Option A: ≤400 を維持し StyleSheet を別ファイル（`bonsaiDetailStyles.ts`）へ移動

- 概要：残 StyleSheet を外部ファイル化し index.tsx の行数を 400 未満にする。
- 良い点：「400」という数字を満たせる。
- 悪い点：複雑さは 1 ミリも減らず行を別部屋に移すだけ（LOC 稼ぎ）。ファイル数増で全体像把握コスト増。
- 却下理由：1 次情報（React/Fowler）が示す本質に反し、目標の round number を作るためだけの人工的操作。

### Option B: ≤400 を維持し coordinator の render 骨格をさらに細分化

- 概要：render shell を `<BonsaiDetailScreenBody>` 等にさらに割って 400 未満にする。
- 良い点：行数は満たせる。
- 悪い点：over-fragmentation。routing + 配線という coordinator 本来の責務を人工的に割ると、1 画面の理解にファイルを渡り歩く必要が生じ可読性が逆に低下。
- 却下理由：「責務で割る」原則に反する数字合わせ分割。

---

## Consequences（結果：嬉しいこと/辛いこと/副作用）

### Positive（嬉しい）

- 責務分離が本質的に達成（写真/予定/タブ/削除/アーカイブが独立 hook・component 化）。
- 基準が honest（行数の round number を演出しない）。
- 今後の god（A2/A3/4b/4c）でも「coordinator が 400 超でも正当」と判断できる軸が明確。

### Negative（辛い/副作用）

- 「≤400」という分かりやすい round number は出ない（423 行）。
- 基準が定性的（責務分離）で純機械判定しにくい → 下記 Follow-up の lint 補完を検討。

### Follow-ups（後でやる宿題）

- [x] `docs/archive/refactor-2026-05/master-plan.md` 可読性 KPI を本基準へ更新（本 PR）
- [x] `docs/archive/refactor-2026-05/phase-4-bonsai-detail.md` 成功判定基準を本基準へ更新（本 PR）
- [ ] (任意) ESLint `max-lines`（warn・上限 450）の実導入を別 issue で検討。導入時は他ファイルも警告が出るため段階導入。
- [ ] Phase 4 完了後（master-plan 弱点 1）に coordinator 行数を再計測（3 か月 TODO）。

---

## Acceptance / Tests（合否：テストに寄せる）

- 正（自動テスト）：
  - Jest：全 77 suites / 1104 tests 緑維持（`pnpm test`、node22）。`__tests__/features/bonsai/` の純関数 + フック特性化。
  - 静的：`pnpm tsc --noEmit` / `pnpm lint` / `pnpm verify:dead`（knip）緑。
- 手動チェック（実機 SX3LHMA362304722, Dev Build）：
  - 手順：詳細画面で 3 タブ切替 + 写真 追加/削除/Undo + 予定追加（picker→日付→timeline 反映）+ イベント削除（長押し/kebab→確認→削除→Toast）+ アーカイブ確認ダイアログ。
  - 期待結果：振る舞い差ゼロ（A1-9〜A1-12.5 各 PR で実機 SS 確認済）。

---

## Rollout / Rollback（出し方/戻し方）

- リリース手順への影響：なし（ドキュメント基準の変更 + 内部リファクタのみ、ユーザー可視変化ゼロ）。
- ロールバック方針：各抽出 PR は独立 squash commit のため `git revert <sha>` で単独巻き戻し可。
- 検知方法：実機での振る舞い差・`pnpm verify` の赤。

---

## Links（関連リンク：正へ寄せる）

- master-plan: `docs/archive/refactor-2026-05/master-plan.md`（Phase 4 / 可読性 KPI）
- 計画書: `docs/archive/refactor-2026-05/phase-4-bonsai-detail.md`
- PR: `refactor/phase-4-bonsai-detail`（A1-9〜A1-12.5）
- 関連 ADR: ADR-0020 / ADR-0036 / ADR-0042
- External docs: ESLint max-lines / Sandi Metz Rules / React Thinking in React・Custom Hooks / Fowler Strangler Fig（上記 Related 参照）

---

## Notes（メモ：任意）

「≤400 行」は ESLint(300) / Sandi Metz(100) の通説から借りた数字で恣意的ではないが、本 repo では強制されておらず、かつ実責務抽出後の coordinator は構造上 400 をやや超える。行数は「責務分離の副産物」であり「目標そのもの」ではない、という 1 次情報の立場を採用する。

---

## Amendment (2026-05-29): Phase 4 完遂時の各 coordinator 行数 justify

Phase 4 god 分割を完遂。本 ADR の基準で各 coordinator の最終行数を以下のとおり受容する（いずれも実責務は hook/サブ部品に分離済、 ≤約450 目安、 超過は本 ADR で justify）。

| ID          | ファイル                         | 最終行数 | 判定                                                                                               |
| ----------- | -------------------------------- | -------- | -------------------------------------------------------------------------------------------------- |
| A1          | `bonsai/[id]/index.tsx`          | 423      | ✅ coordinator（既出）                                                                             |
| A2          | `bonsai/BonsaiBasicForm.tsx`     | **589**  | ✅ **分割せず justify**（下記）                                                                    |
| A3          | `app/settings/index.tsx`         | 407      | ✅ coordinator                                                                                     |
| B1          | `calendar/CalendarTabScreen.tsx` | 189      | ✅ coordinator                                                                                     |
| B2          | `look-back/search.tsx`           | 314      | ✅ coordinator                                                                                     |
| C1          | `event/EventRow.tsx`             | 53       | ✅ thin dispatcher                                                                                 |
| F5          | `backup/backupService.ts`        | 705      | ✅ shell（純粋核 applyImportPlan 抽出後、 残りは zip/picker/share/photo-copy の imperative shell） |
| B3/B4/B5/C2 | 各 form/export/wiring 画面       | <450     | ✅ 既に責務分離済（master-plan 旧 micro 目標は本 ADR が上書き）                                    |

### A2 `BonsaiBasicForm`（589 行）を分割しない判断

- **残責務 = 単一の coordinating responsibility**：15+ の form フィールド state + 単一の editingBonsai prefill effect + picker-consume effect + submit handler + 未保存ガード。これらは「1 つの form を成立させる」一体の関心であり、3 hook（fields/pot/tags）へ割っても合成 wrapper が同じ複雑さを抱え再凝集する（master-plan §7 視点1 弱点1）。
- **分割の利得が小さくリスクが高い**：抽出可能な純減は ~90–110 行に対し、新 hook 3 つ + 合成 glue + prefill の async/ref/JSON 依存の分散コスト。かつ form 全体の characterization テストが無く回帰検知が弱い（リスク高・利得小）。
- **公開 API は wrapper で凍結済**（4 シンボル、 消費者 3 つ無改修）。内部 state 構造の変更は D1（破壊的変更リスト）扱いだが、 本判断で「実施しない」を確定。
- **代替で張った安全網**：最も壊れやすい pot_info JSON parse（型不一致 / 壊れた JSON のフォールバック）と日付境界変換を純関数 `bonsaiFormUtils.ts`（toIsoUtc / isoToYmd / parsePotInfo）へ切り出し characterization（10 tests）。orchestrator 構造は不変のまま、 fragile path のみ凍結。
- **再評価**：3 か月後 coordinator 行数再計測 TODO（上記 Follow-up）に A2 も含める。将来 prefill ロジックを別 form で再利用する具体的制約が出た時点で再分割を ADR 化。
