# Phase 4 (god component 分割) 完了レポート

> 作成日: 2026-05-29
> 種別: 完了レポート (Before/After + DoD 検証)
> 基準: ADR-0045 (責務分離 + ≤約450 行目安、 超過は ADR で justify)
> 関連: `master-plan.md` (Phase 4a/4b/4c) / `phase-4-bonsai-detail.md` (A1)

## Context

god component (1 ファイルに routing + 全実責務 + render を詰め込んだ巨大ファイル) が機能追加コストを押し上げる構造的負債。Strangler Fig で「振る舞い不変・実責務を hook/サブ部品へ分離・coordinator は routing+配線+render 骨格のみ」に解体。本レポートは Phase 4 の最終状態と DoD 達成を記録する。

## Before / After (全 11 対象)

| ID     | ファイル                         | Before | After | 削減 | PR   | 判定                                   |
| ------ | -------------------------------- | ------ | ----- | ---- | ---- | -------------------------------------- |
| A1     | `bonsai/[id]/index.tsx`          | 1573   | 423   | -73% | #877 | ✅ coordinator                         |
| A2前半 | `bonsai/BonsaiBasicForm.tsx`     | 1397   | 637   | -54% | #879 | ✅ Fields/写真分離                     |
| A2残   | (同上)                           | 637    | 589   | -    | #885 | ✅ 分割せず justify + utils 安全網     |
| A3     | `app/settings/index.tsx`         | 859    | 407   | -53% | #883 | ✅ coordinator                         |
| B1     | `calendar/CalendarTabScreen.tsx` | 974    | 189   | -81% | #882 | ✅ coordinator                         |
| B2     | `look-back/search.tsx`           | 708    | 317   | -55% | #884 | ✅ coordinator                         |
| C1     | `event/EventRow.tsx`             | 609    | 53    | -91% | #881 | ✅ thin dispatcher                     |
| F5/C3  | `backup/backupService.ts`        | 886    | 705   | -20% | #880 | ✅ shell (純粋核 applyImportPlan 抽出) |
| B3     | `event/BulkLogConfirmScreen.tsx` | 441    | 441   | -    | -    | ✅ 完了扱い (下記)                     |
| B4     | `event/WorkLogConfirmScreen.tsx` | 390    | 390   | -    | -    | ✅ 完了扱い                            |
| B5     | `export/ExportOptionsSheet.tsx`  | 413    | 413   | -    | -    | ✅ 完了扱い                            |
| C2     | `plan/wiring.tsx`                | 352    | 352   | -    | -    | ✅ 完了扱い                            |

## B3/B4/B5/C2 を「完了扱い」とした根拠 (コード変更なし)

ADR-0045 で成功基準を「行数単独 ≤400」→「責務分離 + ≤約450 目安」に再定義したため、master-plan の旧 micro 目標 (≤200/250) は上書きされた。以下 4 件はいずれも <450 行で実責務を既存 atom / pure helper に委譲済の coordinator/presentational であり、残るは submit handler 1 個 + state 配線 + render 骨格のみ。よって **追加分割は数字合わせの over-fragmentation** となり実施しない。

- **B3 BulkLogConfirmScreen (441)**: 14 種別 form を `WorkLogTypeFormFields` に委譲、 date/note/photo は `LabeledDateRow`/`PhotoField` atom、 未保存ガード `useUnsavedChangesGuard`。非委譲は `handleSave` (bulk convert/create + photo + toast) の単一 submit 責務のみ。
- **B4 WorkLogConfirmScreen (390)**: B3 と同形 (`persistAndNavigate` + `handleSubmit` のみ inline、 form 委譲)。
- **B5 ExportOptionsSheet (413)**: `LabeledSegmented`/`LabeledDateRow` atom + `exportFlow.runExport` 委譲。period/scope/tag は共有 atom の条件 render。
- **C2 wiring (352)**: `wiringRows` useMemo が pure `wiringDuration.ts` helper に委譲、 単一 render map。

## DoD 検証 (master-plan Phase 4 成功判定基準)

- [x] 全 god が責務分離済 (coordinator = routing+配線+render骨格)、 ≤約450 目安 or ADR justify
      → 全 11 件達成。A2 (589) / F5 shell (705) は ADR-0045 Amendment で justify。
- [x] A2: characterization テスト緑 + ADR-0045 で 637/589 行 justify 明記
- [x] B3/B4/B5/C2: 完了扱いを証拠付きで本レポートに明記
- [x] 既存 + 新規テスト全緑 (79 suites / 1119 tests、 node22)
- [x] 全画面で `pnpm verify` 全 green (lint 0 error / tsc / format / i18n / hardcode / screen-testid / maestro-flow-lint / form-screen-scroll 等)
- [x] Phase 4 完了レポート (本ファイル) main 在

## 安全網 (新規 characterization)

- **F5 applyImportPlan** (10 tests): import DB-apply 核を node:sqlite で凍結 (FK 安全順 / FTS active-only / 冪等 / 写真コピー失敗で全 rollback)。ADR-0007 最高リスク経路。
- **A2 bonsaiFormUtils** (10 tests): pot_info JSON parse (型不一致 / 壊れた JSON フォールバック) + 日付境界。

## 抽出パターン (実証済)

新規ファイル作成 → 呼出置換 → 旧 inline 削除 → tsc/lint/test 緑 → 1 commit=1 懸念。循環依存は型/純関数を専用モジュールへ集約して回避 (backupTypes / eventRowTypes / calendarTabTypes)。共有 style は WET 複製。dev 専用コードは `src/dev/` に集約し hardcode lint 除外。

## 残課題 (Phase 4 スコープ外)

- Phase 5 (共通化): Phase 4 抽出物の 3+ 箇所再利用を grep で実測後 atom/molecule 化 (WET 厳守、 2 週 cooling-off)。
- Phase 6 (FSD 境界整理) / Phase 7 (死コード一掃 + Tamagui 撤去)。
- 3 か月後: coordinator 行数再計測 (ADR-0045 Follow-up、 A2 含む)。
- #878 (ハーネス棚卸し / ADR-0046): 別軸、 chore/878 に着手済。
