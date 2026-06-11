# Code-to-Docs ルーティング表 (doc-routing)

> **目的**: コードを変更する時に「どの doc を読んでから触るべきか」を機械可読に定義する **唯一の原本** (Doc-Truth Audit P3)。
> **生成物**: この表から `scripts/gen-doc-routing.mjs` が `.claude/rules/routing/*.md` (path-scoped rules) を生成する。
> rules 側を直接編集しない (`pnpm gen:doc-routing` で再生成、drift は `verify:doc-routing` が exit 1)。
>
> **編集ルール**:
>
> 1. glob・doc path は backtick で囲む (生成 script が backtick token を抽出する)
> 2. doc path は repo root からの相対 path で実在すること (生成 script が実在検査で exit 1)
> 3. ID は rules のファイル名になる (英小文字 + ハイフン)
> 4. 行の追加・変更後は `pnpm gen:doc-routing` を実行して rules を再生成すること

## ルーティング表

| ID            | コード領域 (glob)                                                  | 変更時に読むべき doc                                                                                                                                                                                                       | 確認観点                                                                                        |
| ------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| screens       | `app/**`                                                           | `docs/reference/functional_spec.md` (該当章のみ), `docs/reference/design_system.md`, `docs/adr/ADR-0053-navigation-header-sot.md`, `docs/reference/tasks/lessons/navigation.md`                                            | 画面構成・navigation pattern (ADR-0030 Case 分類)・文言は i18n key 経由・header SoT             |
| db            | `src/db/**`, `drizzle.config.ts`                                   | `docs/adr/ADR-0008-f02-event-data-model.md`, `docs/reference/tasks/lessons/db.md`                                                                                                                                          | schema 変更は user_version migration 必須・snake_case row mapping 罠・ALTER TABLE REFERENCES 罠 |
| iap           | `src/features/pro/**`, `src/services/proService.ts`                | `docs/adr/ADR-0009-f13-revenuecat-billing.md`, `docs/how-to/release/iap-setup-checklist.md`, `docs/reference/tasks/lessons/iap.md`, `docs/reference/tasks/lessons/billing.md`                                              | 課金 12 step・entitlement 名・territory (価格利用不可)・purchases SDK 罠                        |
| ads-consent   | `src/features/ads/**`, `src/services/adService.ts`                 | `docs/adr/ADR-0010-f14-admob-banner-design.md`, `docs/adr/ADR-0017-store-compliance-att-ump-privacy.md`, `docs/how-to/development/admob_advertising_setup.md`, `docs/store-listing/data-safety/data-safety-declaration.md` | **データ収集記述と実装の一致 (法的)**・テスト広告 ID 段階ゲート (RELEASE_STAGE)・UMP 同意       |
| notification  | `src/features/notification/**`                                     | `docs/adr/ADR-0014-f16-local-notification.md`, `docs/reference/tasks/lessons/notification.md`                                                                                                                              | 許可ダイアログ 1 回限り罠・soft-ask・inexact alarm 遅延・Dev Client reschedule 剪定             |
| recurrence    | `src/core/recurrence/**`, `src/features/recurrence/**`             | `docs/adr/ADR-0056-recurring-schedule.md`                                                                                                                                                                                  | RRULE 仕様 (BYDAY 等)・TZ 境界・予定と記録の区別 (status)                                       |
| theme         | `src/core/theme/**`                                                | `docs/reference/design_system.md`, `docs/adr/ADR-0015-f15-theme-system.md`, `docs/reference/tasks/lessons/design.md`                                                                                                       | token SoT (hardcode 禁止)・dark/light 両対応・DANGER 系は dangerColor 経由                      |
| i18n          | `src/core/i18n/**`                                                 | `docs/adr/ADR-0033-i18n-translation-policy.md`                                                                                                                                                                             | 19 言語全 key 揃え (`pnpm i18n:check`)・禁止語 (R-3 reminder 等)・英語 fallback 一括 pattern    |
| native-build  | `plugins/**`, `android/**`, `app.config.ts`, `eas.json`            | `docs/how-to/development/android_build.md`, `docs/how-to/development/dev_vs_preview_builds.md`, `docs/reference/tasks/lessons/build.md`                                                                                    | native 設定・EAS profile・config plugin 罠 (NDK/lld 等)・release は cloud-first                 |
| e2e           | `maestro/flows/**`                                                 | `docs/how-to/testing/testing.md`, `docs/how-to/maestro-standard-pattern.md`                                                                                                                                                | testID 経由のみ (text tap 禁止)・template 派生・launchApp 後 Back・3 回反復                     |
| scripts       | `scripts/**`                                                       | `docs/README.md`, `docs/how-to/development/dev-workflow.md`                                                                                                                                                                | script 改名・追加時は言及する how-to / package.json との整合 (改名は repo 全 grep)              |
| ci            | `.github/workflows/**`                                             | `docs/how-to/workflow/git_workflow.md`, `docs/how-to/workflow/whole_workflow.md`                                                                                                                                           | CI と手順書の一致・job 名変更時は branch protection required checks も追従 (P-14 防御 4)        |
| store-meta    | `fastlane/metadata/**`                                             | `docs/store-listing/README.md`, `docs/how-to/workflow/store_listing_guide.md`, `docs/how-to/workflow/release_notes_template.md`                                                                                            | placeholder 禁止 (`pnpm metadata:check`)・19 言語・個人情報 (審査連絡先) は repo に置かない     |
| legal-privacy | `docs/legal/**`, `docs/privacy/**`, `src/services/legalService.ts` | `docs/adr/ADR-0017-store-compliance-att-ump-privacy.md`, `docs/store-listing/data-safety/data-safety-declaration.md`                                                                                                       | 法務ページとアプリ内リンクの一致・Data Safety フォームとの整合・GitHub Pages クリーン URL       |

## この表が働く 3 場面

1. **開発中**: 該当 glob のファイルを Read した瞬間、生成済み routing rule が自動でコンテキストに注入される (path-scoped rules、公式機能)
2. **PR 時**: PR テンプレート core §8 の「doc-routing.md の該当行を確認した / 影響 doc を更新した or 不要の理由」チェック (P4 で追加済み 2026-06-11)
3. **棚卸時**: `pnpm metrics:doc-freshness` が「doc の最終 commit < 対応コードの最終 commit」かつ「`docs/audit/freshness-ledger.md` の最終検証日が 90 日超」の doc を自動列挙 (P4 で追加済み)

## 運用メモ

- 行を増やしすぎない (1 ファイル Read で注入される指示は短いほど効く)。「罠があるのに doc が読まれず再発した」実績が出た領域から追加する
- doc を改名・移動したら `verify:doc-routing` (実在検査) が落ちるので、この表も同 PR で更新する
- 固定値 (ADR 番号等) はこの表が正本。他 doc からは「doc-routing.md 参照」と書く (P-14 防御 0)
