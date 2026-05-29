# Phase 7 (死コード一掃 + 仕上げ) 完了レポート

> 作成日: 2026-05-30
> 種別: 完了レポート (Phase 7 + リファクタ全体 Phase 3-7 サマリー)
> SoT: `docs/refactor/master-plan.md` Phase 7 / `docs/refactor/phase-7-plan.md` (本セッション計画書)
> 関連: ADR-0015 Amendment (Tamagui 撤回) / phase-{4,6}-report.md

## Context

Phase 3-6 で「テスト網 → god 分割 → 共通化 cooling-off → 境界整理」を完遂。Phase 7 で **「インストール/記述済だが一度も使われていないコード (死コード) を捨てる」** ことで、アプリを軽く・分かりやすくし、リファクタ大行進を締めくくる。**ユーザー観察可能な挙動は不変**。すべて `git revert` で復元可。

### user 確定済の 2 判断 (2026-05-30)

- **Tamagui = 撤去** (実コード 0 使用、テーマは ADR-0042/useColors に作り替え済)。
- **ui-diff / store-screenshots = 残す** (npm script 稼働中・過去運用実績あり)。

## Before / After

| ID   | 撤去対象                                                                                                                                                                           | 詳細                                                                                             | PR          |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------- |
| K1   | `app/modal.tsx` + `_layout` 登録                                                                                                                                                   | Expo テンプレ「This is a modal」、遷移元 0                                                       | #897        |
| K4   | `@tanstack/react-query` + `src/core/queries/invalidators.ts`                                                                                                                       | 未使用ファイル + そこだけで参照されていた dep                                                    | #898        |
| K6-a | `components/ui/{collapsible,icon-symbol,icon-symbol.ios}.tsx` + `expo-symbols`                                                                                                     | Expo テンプレ scaffolding 連鎖 dead                                                              | #899        |
| K5   | **Tamagui 一式** (6 packages + `tamagui.config.ts` + `tamagui.d.ts` + babel plugin + jest 設定)                                                                                    | 実コード 0 使用、ADR-0015 Amendment で撤回明文化                                                 | #900        |
| K6-b | 死ファイル 3 (`external-link.tsx` / `reviewService.ts` / `structuredLog.ts`) + 死 deps 4 (`@expo/vector-icons` / `@shopify/flash-list` / `expo-web-browser` / `expo-store-review`) | knip ignore で隠れていた偽陰性。`expo-web-browser` のみ app.config.ts plugin 参照のため復元      | #901        |
| ⛔   | `scripts/ui-diff/*` / `scripts/store-screenshots/*` / `sharp`                                                                                                                      | **user 判断で残す** (npm script 稼働中)                                                          | (未変更)    |
| K7   | 未使用 export 33 件                                                                                                                                                                | 多くが characterization テスト参照のため bulk 削除不可。将来の selective cleanup として deferred | (deferred)  |
| —    | 仕上げ                                                                                                                                                                             | phase-7-report.md / lessons/refactor.md / master-plan 完了バナー / docs整合                      | #902 (本PR) |

## DoD 検証

- [x] `pnpm verify` 全 green (lint/tsc/format/test/i18n/hardcode/config/docs/template/native/theme/a11y/maestro/iteration/screen-testid/modal-autofocus/form-screen-scroll/icon-duplication/utc-date-slice/dead 全 20+ sub-checks)
- [x] `pnpm test` 全 green (80 suites / 1123 tests、node22)
- [x] grep で削除対象 (Tamagui/react-query/modal/components/ui/external-link/reviewService/structuredLog) 参照 0
- [x] knip 「Unused dependencies」0 達成 (was 3)、「Configuration hints」解消
- [x] ADR-0015 に Tamagui 撤回 Amendment を追記 (実態と整合)
- [x] ui-diff / store-screenshots / sharp は **未変更** (user 確定)

## リファクタ全体 (Phase 3-7) サマリー

| Phase   | 目的                                                      | 成果                                                                     | 主要 ADR/Report                 |
| ------- | --------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------- |
| Phase 3 | 安全網張り (テスト + typed-lint + knip + architecture.md) | DB 層カバレッジ 60%+、boundary plugin 繰延                               | `architecture.md`               |
| Phase 4 | god component 分割                                        | 11 god を coordinator + hook/部品に分離、行数指標再定義                  | ADR-0045 / `phase-4-report.md`  |
| Phase 5 | 共通化                                                    | 実測 = 抽出対象ゼロ → **cooling-off 延期** (2026-06-12 頃再評価)         | (deferred)                      |
| Phase 6 | FSD 境界整理                                              | 7 違反 → 0、`boundaries/dependencies` error 化 + CI gate                 | ADR-0048 / `phase-6-report.md`  |
| Phase 7 | 死コード一掃                                              | Tamagui + react-query + テンプレ残骸 + 連鎖 dead を撤去、knip クリーン化 | ADR-0015 Amendment / 本レポート |

## 学び (詳細は lessons/refactor.md)

- **knip `ignore` は両刃の剣**: false-positive を黙らせる一方で、本当に死蔵なファイルも見えなくなる。Phase 7 で `ignore` を整理し 3 dead ファイル + 4 dead deps を露呈できた。
- **大物撤去 PR は事前に `pnpm verify` 完全実行必須**: lint/tsc/test だけでは取りこぼす (今回 verify:config / verify:theme で発覚)。
- **app.config.ts の plugin 参照は knip 不可視**: Expo CLI 経由でのみ必要な dep は ignoreDependencies に残す or root の設定を knip project に含める検討。
- **K7 (未使用 export) の bulk 削除は危険**: characterization テスト参照を含むため、per-export 検証が必須。「knip flag = safe to delete」ではない。

## 残課題 (Phase 7 スコープ外)

- **K7 selective cleanup**: 未使用 export 33 件 (大半が repo 関数で test 参照あり)。将来 per-export verification で慎重に。
- **Phase 5 再評価**: cooling-off 期日 ≈ 2026-06-12。再 grep で 3+ 箇所 reuse を確認し格上げ判定。
- **`.expo/types/router.d.ts` 自動生成の unused-disable warning**: eslint ignore に追加検討 (無害だが警告ノイズ)。
- **`@react-native/eslint-config` などの peer 警告**: 既存、Phase 7 scope 外。
