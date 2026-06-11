# Doc 鮮度中央台帳 (freshness-ledger)

> **目的**: 全 doc の「最後に実態と突き合わせて検証した日」を 1 箇所で管理する中央台帳 (Doc-Truth Audit P3-4、per-doc frontmatter は付けない = user 決定 2026-06-11)。
> **初期データ**: Doc-Truth Audit 2026-06 の監査台帳 (`docs/archive/doc-truth-audit-2026-06/state.md`、完走 commit `b4c9716`) から path / 区分 / 判定 / 処理日 (= 最終検証日) を機械転記。判定の根拠・要約は原台帳を参照。
> **更新ルール**:
>
> 1. doc を実態と突き合わせて検証したら該当行の「最終検証日」と「判定」を更新する
> 2. 新規 doc を作ったら行を追加する (判定 ✅ / 最終検証日 = 作成日)
> 3. doc を削除・改名したら行を更新する
> 4. **棚卸 cadence (30 日周期、次回 2026-07-10 頃)**: `pnpm metrics:doc-30day-zero` (利用頻度) と `pnpm metrics:doc-freshness` (正確性 — 「doc の最終 commit < 対応コードの最終 commit」かつ「最終検証日 90 日超」を自動列挙) の **両方** を実行し、flagged を本台帳へ反映する。実行導線 = /retro Step 9 / /memory-review。全面再監査が必要になったら `docs/how-to/workflow/prompts/P-15_doc-truth-audit.md` (差分監査の基準 = `b4c9716`)
>
> **凡例 (判定)**: ✅=一致 / ❌=乖離あり / 🟡=軽微・不急 / 🔴=要対応 (処置済は注記) / ⚪=判定保留 / 🔵=user 手動確認待ち / 修正済=監査内で修正完了 / 削除=repo から削除済 (path は当時のまま、復元は git 履歴)
> **SoT 区分**: C=code-derived / D=decision(歴史文書) / P=process(手順書) / E=external(ストア・SaaS が正) / G=governance / M=memory

## 台帳 (427 行 = 初期転記 420 + 補遺 7)

| No  | path                                                                                                                     | 区分 | 判定                         | 最終検証日 |
| --- | ------------------------------------------------------------------------------------------------------------------------ | ---- | ---------------------------- | ---------- |
| 1   | `docs/README.md`                                                                                                         | P    | ✅                           | 2026-06-11 |
| 2   | `docs/adr/ADR-0001-initial-decisions.md`                                                                                 | D    | ✅                           | 2026-06-11 |
| 3   | `docs/adr/ADR-0002-revenue-model.md`                                                                                     | D    | ✅                           | 2026-06-11 |
| 4   | `docs/adr/ADR-0003-storage-policy.md`                                                                                    | D    | ✅                           | 2026-06-11 |
| 5   | `docs/adr/ADR-0004-language-set.md`                                                                                      | D    | ✅                           | 2026-06-11 |
| 6   | `docs/adr/ADR-0005-ios-encryption-compliance.md`                                                                         | D    | ✅                           | 2026-06-11 |
| 7   | `docs/adr/ADR-0006-in-app-review-trigger.md`                                                                             | D    | ✅                           | 2026-06-11 |
| 8   | `docs/adr/ADR-0007-f11-data-migration-design.md`                                                                         | D    | ✅                           | 2026-06-11 |
| 9   | `docs/adr/ADR-0008-f02-event-data-model.md`                                                                              | D    | ✅                           | 2026-06-11 |
| 10  | `docs/adr/ADR-0009-f13-revenuecat-billing.md`                                                                            | D    | ✅                           | 2026-06-11 |
| 11  | `docs/adr/ADR-0010-f14-admob-banner-design.md`                                                                           | D    | ✅                           | 2026-06-11 |
| 12  | `docs/adr/ADR-0011-remove-recommendations-keep-record-only.md`                                                           | D    | ✅                           | 2026-06-11 |
| 13  | `docs/adr/ADR-0012-agent-tools-unified-management.md`                                                                    | D    | ✅                           | 2026-06-11 |
| 14  | `docs/adr/ADR-0013-f04-watering-visualization.md`                                                                        | D    | ✅                           | 2026-06-11 |
| 15  | `docs/adr/ADR-0014-f16-local-notification.md`                                                                            | D    | ✅                           | 2026-06-11 |
| 16  | `docs/adr/ADR-0015-f15-theme-system.md`                                                                                  | D    | ✅                           | 2026-06-11 |
| 17  | `docs/adr/ADR-0016-f10-export-csv-pdf.md`                                                                                | D    | ✅                           | 2026-06-11 |
| 18  | `docs/adr/ADR-0017-store-compliance-att-ump-privacy.md`                                                                  | D    | ✅                           | 2026-06-11 |
| 19  | `docs/adr/ADR-0018-onboarding-flow-integration.md`                                                                       | D    | ✅                           | 2026-06-11 |
| 20  | `docs/adr/ADR-0019-home-screen-role.md`                                                                                  | D    | ✅                           | 2026-06-11 |
| 21  | `docs/adr/ADR-0020-claude-design-full-adoption.md`                                                                       | D    | ✅                           | 2026-06-11 |
| 22  | `docs/adr/ADR-0021-ui-diff-pipeline.md`                                                                                  | D    | ✅                           | 2026-06-11 |
| 23  | `docs/adr/ADR-0024-bottom-sheet-removal-and-native-presentation.md`                                                      | D    | ✅                           | 2026-06-11 |
| 24  | `docs/adr/ADR-0025-bottom-tab-restructure.md`                                                                            | D    | ✅                           | 2026-06-11 |
| 25  | `docs/adr/ADR-0026-master-data-reduction-and-custom-first.md`                                                            | D    | ✅                           | 2026-06-11 |
| 26  | `docs/adr/ADR-0027-work-log-form-overhaul-phase-a-b.md`                                                                  | D    | ✅                           | 2026-06-11 |
| 27  | `docs/adr/ADR-0028-event-type-extension-leaf-first-aid.md`                                                               | D    | ✅                           | 2026-06-11 |
| 28  | `docs/adr/ADR-0029-form-ux-permanent-phase-gamma.md`                                                                     | D    | ✅                           | 2026-06-11 |
| 29  | `docs/adr/ADR-0030-navigation-patterns-unification.md`                                                                   | D    | ✅                           | 2026-06-11 |
| 30  | `docs/adr/ADR-0031-calendar-unified-flow-and-stale-closure-fix.md`                                                       | D    | ✅                           | 2026-06-11 |
| 31  | `docs/adr/ADR-0032-planned-logged-distinction.md`                                                                        | D    | ✅                           | 2026-06-11 |
| 32  | `docs/adr/ADR-0033-i18n-translation-policy.md`                                                                           | D    | ✅                           | 2026-06-11 |
| 33  | `docs/adr/ADR-0034-calendar-ux-phase-delta.md`                                                                           | D    | ✅                           | 2026-06-11 |
| 34  | `docs/adr/ADR-0035-calendar-and-conversion-phase-epsilon.md`                                                             | D    | ✅                           | 2026-06-11 |
| 35  | `docs/adr/ADR-0036-destructive-action-pattern.md`                                                                        | D    | ✅                           | 2026-06-11 |
| 36  | `docs/adr/ADR-0037-hero-badge-kav-unification.md`                                                                        | D    | ✅                           | 2026-06-11 |
| 37  | `docs/adr/ADR-0038-record-tab-and-button-design.md`                                                                      | D    | ✅                           | 2026-06-11 |
| 38  | `docs/adr/ADR-0039-watering-heatmap-removal.md`                                                                          | D    | ✅                           | 2026-06-11 |
| 39  | `docs/adr/ADR-0040-form-screen-scroll-unification.md`                                                                    | D    | ✅                           | 2026-06-11 |
| 40  | `docs/adr/ADR-0041-event-row-display-mode.md`                                                                            | D    | ✅                           | 2026-06-11 |
| 41  | `docs/adr/ADR-0042-tab-icon-and-fab-sot.md`                                                                              | D    | ✅                           | 2026-06-11 |
| 42  | `docs/adr/ADR-0043-store-product-api-automation.md`                                                                      | D    | ✅                           | 2026-06-11 |
| 43  | `docs/adr/ADR-0044-admob-console-api-automation.md`                                                                      | D    | ✅                           | 2026-06-11 |
| 44  | `docs/adr/ADR-0045-god-coordinator-line-target.md`                                                                       | D    | ✅                           | 2026-06-11 |
| 45  | `docs/adr/ADR-0046-harness-inventory-and-retirement-policy.md`                                                           | D    | ✅                           | 2026-06-11 |
| 46  | `docs/adr/ADR-0047-review-output-contract.md`                                                                            | D    | ✅                           | 2026-06-11 |
| 47  | `docs/adr/ADR-0048-fsd-layer-definition.md`                                                                              | D    | ✅                           | 2026-06-11 |
| 48  | `docs/adr/ADR-0049-pro-feature-boundary-v1.md`                                                                           | D    | ✅                           | 2026-06-11 |
| 49  | `docs/adr/ADR-0050-android-release-automation.md`                                                                        | D    | ✅                           | 2026-06-11 |
| 50  | `docs/adr/ADR-0051-harness-inventory-2026-06.md`                                                                         | D    | ✅                           | 2026-06-11 |
| 51  | `docs/adr/ADR-0052-dark-theme-cascade.md`                                                                                | D    | ✅                           | 2026-06-11 |
| 52  | `docs/adr/ADR-0053-navigation-header-sot.md`                                                                             | D    | ✅                           | 2026-06-11 |
| 53  | `docs/adr/ADR-0054-bottom-cta-bar.md`                                                                                    | D    | ✅                           | 2026-06-11 |
| 54  | `docs/adr/ADR-0055-event-edit.md`                                                                                        | D    | ✅                           | 2026-06-11 |
| 55  | `docs/adr/ADR-0056-recurring-schedule.md`                                                                                | D    | ✅                           | 2026-06-11 |
| 56  | `docs/adr/README.md`                                                                                                     | D    | ✅                           | 2026-06-11 |
| 57  | `docs/adr/adr_template.md`                                                                                               | D    | ✅                           | 2026-06-11 |
| 58  | `docs/reference/architecture.md`                                                                                         | C    | 🟡→**修正済 (本 PR)**        | 2026-06-11 |
| 59  | `docs/audit/code-docs-consistency-audit.md`                                                                              | D    | ✅                           | 2026-06-11 |
| 60  | `docs/audit/sess59-pr1-5-real-device-verification.md`                                                                    | D    | ✅                           | 2026-06-11 |
| 61  | `docs/audit/sess60-pr1-3-real-device-verification.md`                                                                    | D    | ✅                           | 2026-06-11 |
| 62  | `docs/explanation/product_strategy.md`                                                                                   | D    | 🟡                           | 2026-06-11 |
| 63  | `docs/explanation/ui-diff-loop-for-beginners.md`                                                                         | P    | ✅                           | 2026-06-11 |
| 64  | `docs/handoff/sess1-progress-2026-05-17.md`                                                                              | D    | 削除 (2026-06 docs 再編)     | 2026-06-11 |
| 65  | `docs/handoff/sess3-progress-2026-05-17.md`                                                                              | D    | 削除 (2026-06 docs 再編)     | 2026-06-11 |
| 66  | `docs/handoff/sess8-pr2-phase2-prompt.md`                                                                                | D    | 削除 (2026-06 docs 再編)     | 2026-06-11 |
| 67  | `docs/how-to/workflow/prompts/screen-integration-prompt.md`                                                              | P    | ✅                           | 2026-06-11 |
| 68  | `docs/how-to/development/admob_advertising_setup.md`                                                                     | P    | 🟡→**修正済 (本 PR)**        | 2026-06-11 |
| 69  | `docs/how-to/development/android_build.md`                                                                               | P    | 🟡→**修正済 (本 PR)**        | 2026-06-11 |
| 70  | `docs/how-to/development/coding_rules.md`                                                                                | P    | 🟡→**修正済 (本 PR)**        | 2026-06-11 |
| 71  | `docs/how-to/development/debug_guide.md`                                                                                 | P    | ✅                           | 2026-06-11 |
| 72  | `docs/how-to/development/dev-workflow.md`                                                                                | P    | ✅                           | 2026-06-11 |
| 73  | `docs/how-to/development/dev_vs_preview_builds.md`                                                                       | P    | 🟡→**修正済 (本 PR)**        | 2026-06-11 |
| 74  | `docs/how-to/development/f13-store-product-setup.md`                                                                     | P    | ✅                           | 2026-06-11 |
| 75  | `docs/how-to/development/ios-privacy-manifest-validation.md`                                                             | P    | 🟡→**修正済 (本 PR)**        | 2026-06-11 |
| 76  | `docs/how-to/development/ios_build.md`                                                                                   | P    | ✅                           | 2026-06-11 |
| 77  | `docs/how-to/development/screenshot-capture.md`                                                                          | P    | 🟡→**修正済 (本 PR)**        | 2026-06-11 |
| 78  | `docs/how-to/development/sentry_setup.md`                                                                                | P    | 🟡→**修正済 (本 PR)**        | 2026-06-11 |
| 79  | `docs/how-to/development/test-data-seed.md`                                                                              | P    | 🟡→**修正済 (本 PR)**        | 2026-06-11 |
| 80  | `docs/how-to/maestro-standard-pattern.md`                                                                                | P    | ✅                           | 2026-06-11 |
| 81  | `docs/how-to/quickstart.md`                                                                                              | P    | ✅                           | 2026-06-11 |
| 82  | `docs/how-to/release/iap-setup-checklist.md`                                                                             | P    | ✅                           | 2026-06-11 |
| 83  | `docs/how-to/testing/testing.md`                                                                                         | P    | ✅                           | 2026-06-11 |
| 84  | `docs/how-to/ui-diff/auto-improve-loop-quickstart.md`                                                                    | P    | ✅                           | 2026-06-11 |
| 85  | `docs/how-to/ui-diff/auto-improve-loop.md`                                                                               | P    | ✅                           | 2026-06-11 |
| 86  | `docs/how-to/ui-diff/multipage-capture-pattern.md`                                                                       | P    | ✅                           | 2026-06-11 |
| 87  | `docs/how-to/ui-diff/screen-integration-loop.md`                                                                         | P    | ✅                           | 2026-06-11 |
| 88  | `docs/how-to/workflow/git_workflow.md`                                                                                   | P    | 🟡→**修正済 (本 PR)**        | 2026-06-11 |
| 89  | `docs/how-to/workflow/google_play_release.md`                                                                            | P    | ✅                           | 2026-06-11 |
| 90  | `docs/how-to/workflow/ios_testflight_release.md`                                                                         | P    | ✅                           | 2026-06-11 |
| 91  | `docs/how-to/workflow/prompts/P-00_ux-simulation.md`                                                                     | P    | ✅                           | 2026-06-11 |
| 92  | `docs/how-to/workflow/prompts/P-01_project-init.md`                                                                      | P    | ✅                           | 2026-06-11 |
| 93  | `docs/how-to/workflow/prompts/P-09_ui-diff-pipeline.md`                                                                  | P    | ✅                           | 2026-06-11 |
| 94  | `docs/how-to/workflow/prompts/P-10_open-design-resume.md`                                                                | P    | ✅                           | 2026-06-11 |
| 95  | `docs/how-to/workflow/prompts/P-11_implement-from-mockups.md`                                                            | P    | 🟡→**修正済 (本 PR)**        | 2026-06-11 |
| 96  | `docs/how-to/workflow/prompts/P-12_screen-implementation-cycle.md`                                                       | P    | 🟡→**修正済 (本 PR)**        | 2026-06-11 |
| 97  | `docs/how-to/workflow/prompts/README.md`                                                                                 | P    | ✅                           | 2026-06-11 |
| 98  | `docs/how-to/workflow/release_notes_template.md`                                                                         | P    | ✅                           | 2026-06-11 |
| 99  | `docs/how-to/workflow/screenshot_generation.md`                                                                          | P    | ✅                           | 2026-06-11 |
| 100 | `docs/how-to/workflow/store_listing_guide.md`                                                                            | P    | ✅                           | 2026-06-11 |
| 101 | `docs/how-to/workflow/whole_workflow.md`                                                                                 | P    | 🟡→**修正済 (本 PR)**        | 2026-06-11 |
| 102 | `docs/improvements.md`                                                                                                   | P    | ✅                           | 2026-06-11 |
| 103 | `docs/index.html`                                                                                                        | P    | ✅                           | 2026-06-11 |
| 104 | `docs/legal/README.md`                                                                                                   | C    | 🟡                           | 2026-06-10 |
| 105 | `docs/legal/privacy-policy.template.html`                                                                                | C    | ✅                           | 2026-06-10 |
| 106 | `docs/legal/terms-of-use.template.html`                                                                                  | C    | ✅                           | 2026-06-10 |
| 107 | `docs/mockups/v1.0/BonsaiLog-Flow.html`                                                                                  | D    | ✅                           | 2026-06-11 |
| 108 | `docs/mockups/v1.0/README.md`                                                                                            | D    | ✅                           | 2026-06-11 |
| 109 | `docs/mockups/v1.0/docs/display-schema.md`                                                                               | D    | ✅                           | 2026-06-11 |
| 110 | `docs/mockups/v1.0/docs/principles.md`                                                                                   | D    | ✅                           | 2026-06-11 |
| 111 | `docs/mockups/v1.0/wireframes-analysis.html`                                                                             | D    | ✅                           | 2026-06-11 |
| 112 | `docs/mockups/v1.0/wireframes/01-Onboarding.html`                                                                        | D    | ✅                           | 2026-06-11 |
| 113 | `docs/mockups/v1.0/wireframes/02-Home.html`                                                                              | D    | ✅                           | 2026-06-11 |
| 114 | `docs/mockups/v1.0/wireframes/04-Export.html`                                                                            | D    | ✅                           | 2026-06-11 |
| 115 | `docs/mockups/v1.0/wireframes/05-Monetization.html`                                                                      | D    | ✅                           | 2026-06-11 |
| 116 | `docs/privacy/index.html`                                                                                                | C    | 🟡                           | 2026-06-10 |
| 117 | `docs/privacy/ja/index.html`                                                                                             | C    | 🟡                           | 2026-06-10 |
| 118 | `docs/archive/refactor-2026-05/master-plan.md`                                                                           | D    | ✅                           | 2026-06-11 |
| 119 | `docs/archive/refactor-2026-05/phase-1-explore.md`                                                                       | D    | ✅                           | 2026-06-11 |
| 120 | `docs/archive/refactor-2026-05/phase-3-plan.md`                                                                          | D    | ✅                           | 2026-06-11 |
| 121 | `docs/archive/refactor-2026-05/phase-4-bonsai-detail.md`                                                                 | D    | ✅                           | 2026-06-11 |
| 122 | `docs/archive/refactor-2026-05/phase-4-report.md`                                                                        | D    | ✅                           | 2026-06-11 |
| 123 | `docs/archive/refactor-2026-05/phase-6-plan.md`                                                                          | D    | ✅                           | 2026-06-11 |
| 124 | `docs/archive/refactor-2026-05/phase-6-report.md`                                                                        | D    | ✅                           | 2026-06-11 |
| 125 | `docs/archive/refactor-2026-05/phase-7-report.md`                                                                        | D    | ✅                           | 2026-06-11 |
| 126 | `docs/reference/basic_spec.md`                                                                                           | C    | 🟡→**一部修正済 (本 PR)**    | 2026-06-11 |
| 127 | `docs/reference/constraints.md`                                                                                          | C    | ❌→**修正済 (本 PR + F-2a)** | 2026-06-11 |
| 128 | `docs/reference/design_system.md`                                                                                        | C    | 🟡→**修正済 (本 PR)**        | 2026-06-11 |
| 129 | `docs/reference/feature_spec_template.md`                                                                                | P    | ✅                           | 2026-06-11 |
| 130 | `docs/reference/functional_spec.md`                                                                                      | C    | 🟡→**一部修正済 (本 PR)**    | 2026-06-11 |
| 131 | `docs/reference/glossary.md`                                                                                             | C    | ✅                           | 2026-06-11 |
| 132 | `docs/reference/integration-criteria.md`                                                                                 | C    | 🟡→**修正済 (本 PR)**        | 2026-06-11 |
| 133 | `docs/reference/personas.md`                                                                                             | P    | ✅                           | 2026-06-11 |
| 134 | `docs/reference/tasks/lessons.md`                                                                                        | P    | 🟡→**修正済 (本 PR)**        | 2026-06-11 |
| 135 | `docs/reference/tasks/lessons/README.md`                                                                                 | P    | 🟡→**修正済 (本 PR)**        | 2026-06-11 |
| 136 | `docs/reference/tasks/lessons/auto-improve-loop.md`                                                                      | P    | ✅                           | 2026-06-11 |
| 137 | `docs/reference/tasks/lessons/billing.md`                                                                                | P    | ✅                           | 2026-06-11 |
| 138 | `docs/reference/tasks/lessons/build.md`                                                                                  | P    | ✅ (判定訂正 + 表記明確化)   | 2026-06-11 |
| 139 | `docs/reference/tasks/lessons/db.md`                                                                                     | P    | ✅                           | 2026-06-11 |
| 140 | `docs/reference/tasks/lessons/design.md`                                                                                 | P    | ✅                           | 2026-06-11 |
| 141 | `docs/reference/tasks/lessons/discuss.md`                                                                                | P    | ✅                           | 2026-06-11 |
| 142 | `docs/reference/tasks/lessons/docs.md`                                                                                   | P    | ✅                           | 2026-06-11 |
| 143 | `docs/reference/tasks/lessons/feature-removal-cross-import.md`                                                           | P    | ✅                           | 2026-06-11 |
| 144 | `docs/reference/tasks/lessons/iap.md`                                                                                    | P    | ✅                           | 2026-06-11 |
| 145 | `docs/reference/tasks/lessons/navigation.md`                                                                             | P    | ✅                           | 2026-06-11 |
| 146 | `docs/reference/tasks/lessons/notification.md`                                                                           | P    | ✅                           | 2026-06-11 |
| 147 | `docs/reference/tasks/lessons/refactor.md`                                                                               | P    | ✅                           | 2026-06-11 |
| 148 | `docs/reference/tasks/lessons/release.md`                                                                                | P    | ✅                           | 2026-06-11 |
| 149 | `docs/reference/tasks/lessons/retro-sess8.md`                                                                            | P    | ✅                           | 2026-06-11 |
| 150 | `docs/reference/tasks/lessons/retro.md`                                                                                  | P    | 🟡→**注記済 (本 PR)**        | 2026-06-11 |
| 151 | `docs/reference/tasks/lessons/runtime.md`                                                                                | P    | ✅                           | 2026-06-11 |
| 152 | `docs/reference/tasks/lessons/sess17-r25-evaluation.md`                                                                  | P    | ✅                           | 2026-06-11 |
| 153 | `docs/reference/tasks/lessons/sess18-r25-evaluation.md`                                                                  | P    | ✅                           | 2026-06-11 |
| 154 | `docs/reference/tasks/lessons/sess19-r25-evaluation.md`                                                                  | P    | ✅                           | 2026-06-11 |
| 155 | `docs/reference/tasks/lessons/sess22-r25-evaluation.md`                                                                  | P    | ✅                           | 2026-06-11 |
| 156 | `docs/reference/tasks/lessons/sess23-r25-evaluation.md`                                                                  | P    | ✅                           | 2026-06-11 |
| 157 | `docs/reference/tasks/lessons/sess25-r25-evaluation.md`                                                                  | P    | ✅                           | 2026-06-11 |
| 158 | `docs/reference/tasks/lessons/sess27-undo-removal-and-kebab-extension.md`                                                | P    | ✅                           | 2026-06-11 |
| 159 | `docs/reference/tasks/lessons/sess28-hero-badge-kav-history.md`                                                          | P    | ✅                           | 2026-06-11 |
| 160 | `docs/reference/tasks/lessons/sess29-record-tab-button-design.md`                                                        | P    | ✅                           | 2026-06-11 |
| 161 | `docs/reference/tasks/lessons/sess30-retro.md`                                                                           | P    | ✅                           | 2026-06-11 |
| 162 | `docs/reference/tasks/lessons/sess34-phase-theta-verification.md`                                                        | P    | ✅                           | 2026-06-11 |
| 163 | `docs/reference/tasks/lessons/sess34-pr7-verification.md`                                                                | P    | ✅                           | 2026-06-11 |
| 164 | `docs/reference/tasks/lessons/sess35-pr2-14-types-verification.md`                                                       | P    | ✅                           | 2026-06-11 |
| 165 | `docs/reference/tasks/lessons/sess35-pr3-pest-candle-verification.md`                                                    | P    | ✅                           | 2026-06-11 |
| 166 | `docs/reference/tasks/lessons/sess35-pr4-a11y-verification.md`                                                           | P    | ✅                           | 2026-06-11 |
| 167 | `docs/reference/tasks/lessons/sess35-pr5-seed-migration-analysis.md`                                                     | P    | ✅                           | 2026-06-11 |
| 168 | `docs/reference/tasks/lessons/sess36-tab-icon-fab-sot.md`                                                                | P    | ✅                           | 2026-06-11 |
| 169 | `docs/reference/tasks/lessons/sess38-candle-button-investigation.md`                                                     | P    | ✅                           | 2026-06-11 |
| 170 | `docs/reference/tasks/lessons/sess38-pr1-verification.md`                                                                | P    | ✅                           | 2026-06-11 |
| 171 | `docs/reference/tasks/lessons/sess39-pr2-verification.md`                                                                | P    | ✅                           | 2026-06-11 |
| 172 | `docs/reference/tasks/lessons/store.md`                                                                                  | P    | ✅                           | 2026-06-11 |
| 173 | `docs/reference/tasks/lessons/wsl2-mobile.md`                                                                            | P    | 🟡→**修正済 (本 PR)**        | 2026-06-11 |
| 174 | `docs/reference/ui-diff-flow-mapping.md`                                                                                 | C    | 🟡                           | 2026-06-11 |
| 175 | `docs/archive/research-2026-04/basic-spec-research.md`                                                                   | D    | ✅                           | 2026-06-11 |
| 176 | `docs/archive/research-2026-04/functional-spec-research.md`                                                              | D    | ✅                           | 2026-06-11 |
| 177 | `docs/archive/research-2026-04/product-strategy-research-v1.md`                                                          | D    | ✅                           | 2026-06-11 |
| 178 | `docs/archive/research-2026-04/product-strategy-research-v2.md`                                                          | D    | ✅                           | 2026-06-11 |
| 179 | `docs/reports/repolog-feedback-handoff.md`                                                                               | D    | 削除 (2026-06 docs 再編)     | 2026-06-11 |
| 180 | `docs/reports/template-migration-review.md`                                                                              | D    | 削除 (2026-06 docs 再編)     | 2026-06-11 |
| 181 | `docs/store-listing/README.md`                                                                                           | E    | ✅                           | 2026-06-10 |
| 182 | `docs/store-listing/data-safety/data-safety-declaration.md`                                                              | E    | ✅                           | 2026-06-10 |
| 183 | `docs/terms/index.html`                                                                                                  | C    | 🟡                           | 2026-06-10 |
| 184 | `docs/terms/ja/index.html`                                                                                               | C    | 🟡                           | 2026-06-10 |
| 185 | `.github/ISSUE_TEMPLATE/bug_report.yml`                                                                                  | P    | ✅                           | 2026-06-11 |
| 186 | `.github/ISSUE_TEMPLATE/config.yml`                                                                                      | P    | ✅                           | 2026-06-11 |
| 187 | `.github/ISSUE_TEMPLATE/feature_request.yml`                                                                             | P    | ✅                           | 2026-06-11 |
| 188 | `.github/pull_request_template.md`                                                                                       | P    | ✅                           | 2026-06-11 |
| 189 | `.github/workflows/build-android-play.yml`                                                                               | P    | ✅                           | 2026-06-11 |
| 190 | `.github/workflows/build-ios-testflight.yml`                                                                             | P    | ✅                           | 2026-06-11 |
| 191 | `.github/workflows/ci.yml`                                                                                               | P    | ✅                           | 2026-06-11 |
| 192 | `.github/workflows/download-app-store-metadata.yml`                                                                      | P    | ✅                           | 2026-06-11 |
| 193 | `.github/workflows/i18n-audit.yml`                                                                                       | P    | ✅                           | 2026-06-11 |
| 194 | `.github/workflows/maestro-smoke.yml`                                                                                    | P    | ✅                           | 2026-06-11 |
| 195 | `.github/workflows/pr-title-r30-check.yml`                                                                               | P    | ✅                           | 2026-06-11 |
| 196 | `.github/workflows/push-app-store-metadata.yml`                                                                          | P    | ✅                           | 2026-06-11 |
| 197 | `.github/workflows/ump-consent-validation.yml`                                                                           | P    | ✅                           | 2026-06-11 |
| 198 | `AGENTS.md`                                                                                                              | G    | ❌                           | 2026-06-11 |
| 199 | `README.md`                                                                                                              | P    | ✅                           | 2026-06-11 |
| 200 | `.claude/CLAUDE.md`                                                                                                      | G    | ❌                           | 2026-06-11 |
| 201 | `.claude/agents/commit-helper.md`                                                                                        | G    | ✅                           | 2026-06-11 |
| 202 | `.claude/agents/eas-build-doctor.md`                                                                                     | G    | ✅                           | 2026-06-11 |
| 203 | `.claude/hooks/auto-grep-check.mjs`                                                                                      | G    | ✅                           | 2026-06-11 |
| 204 | `.claude/hooks/check-agent-isolation.mjs`                                                                                | G    | ✅                           | 2026-06-11 |
| 205 | `.claude/hooks/check-maestro-flow-creation.mjs`                                                                          | G    | ✅                           | 2026-06-11 |
| 206 | `.claude/hooks/check-native-impact-hook.mjs`                                                                             | G    | ✅                           | 2026-06-11 |
| 207 | `.claude/hooks/check-obsolete-routes.mjs`                                                                                | G    | ✅                           | 2026-06-11 |
| 208 | `.claude/hooks/check-read-before-edit.mjs`                                                                               | G    | ✅                           | 2026-06-11 |
| 209 | `.claude/hooks/check-rn-perf-hint.mjs`                                                                                   | G    | ✅                           | 2026-06-11 |
| 210 | `.claude/hooks/check-rn-upgrade-hint.mjs`                                                                                | G    | ✅                           | 2026-06-11 |
| 211 | `.claude/hooks/check-skill-edit-hint.mjs`                                                                                | G    | ✅                           | 2026-06-11 |
| 212 | `.claude/hooks/check-structure-eval-before-skiplist-update.mjs`                                                          | G    | ✅                           | 2026-06-11 |
| 213 | `.claude/hooks/discuss-mode-check.mjs`                                                                                   | G    | ✅                           | 2026-06-11 |
| 214 | `.claude/hooks/log-doc-reads.mjs`                                                                                        | G    | ✅                           | 2026-06-11 |
| 215 | `.claude/hooks/session-end-cleanup-check.mjs`                                                                            | G    | ✅                           | 2026-06-11 |
| 216 | `.claude/hooks/session-start-design-reminder.mjs`                                                                        | G    | ✅                           | 2026-06-11 |
| 217 | `.claude/hooks/stop-verify-suggestion.mjs`                                                                               | G    | ✅                           | 2026-06-11 |
| 218 | `.claude/recurrence-prevention.md`                                                                                       | G    | ❌                           | 2026-06-11 |
| 219 | `.claude/recurrence-prevention/specialized.md`                                                                           | G    | 🟡                           | 2026-06-11 |
| 220 | `.claude/settings.json`                                                                                                  | G    | ✅                           | 2026-06-11 |
| 221 | `.claude/settings.local.json`                                                                                            | G    | ✅                           | 2026-06-11 |
| 222 | `.claude/settings.local.json.example`                                                                                    | G    | ✅                           | 2026-06-11 |
| 223 | `.claude/skills/discuss/SKILL.md`                                                                                        | G    | ✅                           | 2026-06-11 |
| 224 | `.claude/skills/plan/SKILL.md`                                                                                           | G    | ✅                           | 2026-06-11 |
| 225 | `.claude/skills/progress/SKILL.md`                                                                                       | G    | ✅                           | 2026-06-11 |
| 226 | `.claude/skills/react-native-best-practices/BONSAI-OVERRIDE.md`                                                          | G    | ✅                           | 2026-06-11 |
| 227 | `.claude/skills/react-native-best-practices/SKILL.md`                                                                    | G    | ✅                           | 2026-06-11 |
| 228 | `.claude/skills/release-android/SKILL.md`                                                                                | G    | ✅                           | 2026-06-11 |
| 229 | `.claude/skills/release-check/SKILL.md`                                                                                  | G    | ✅                           | 2026-06-11 |
| 230 | `.claude/skills/retro/SKILL.md`                                                                                          | G    | ✅                           | 2026-06-11 |
| 231 | `.claude/skills/review-pr/SKILL.md`                                                                                      | G    | ❌→**修正済 (本 PR)**        | 2026-06-11 |
| 232 | `.claude/skills/session-end/SKILL.md`                                                                                    | G    | ✅                           | 2026-06-11 |
| 233 | `.claude/skills/skill-creator/BONSAI-OVERRIDE.md`                                                                        | G    | ✅                           | 2026-06-11 |
| 234 | `.claude/skills/skill-creator/SKILL.md`                                                                                  | G    | ✅                           | 2026-06-11 |
| 235 | `.claude/skills/store-text/SKILL.md`                                                                                     | G    | ✅                           | 2026-06-11 |
| 236 | `.claude/skills/upgrading-react-native/BONSAI-OVERRIDE.md`                                                               | G    | ✅                           | 2026-06-11 |
| 237 | `.claude/skills/upgrading-react-native/SKILL.md`                                                                         | G    | ✅                           | 2026-06-11 |
| 238 | `.claude/templates/manager-screen-template.tsx`                                                                          | G    | ✅                           | 2026-06-11 |
| 239 | `~/.claude/CLAUDE.md`                                                                                                    | G    | ✅                           | 2026-06-11 |
| 240 | `~/.claude/agents/commit-helper.md`                                                                                      | G    | ✅                           | 2026-06-11 |
| 241 | `~/.claude/agents/eas-build-doctor.md`                                                                                   | G    | ✅                           | 2026-06-11 |
| 242 | `~/.claude/plans/1-a1-9-10-11-indexed-nova.md`                                                                           | M    | ✅                           | 2026-06-11 |
| 243 | `~/.claude/plans/1-b-memoized-rabbit.md`                                                                                 | M    | ✅                           | 2026-06-11 |
| 244 | `~/.claude/plans/1-sh-m25-tranquil-giraffe.md`                                                                           | M    | ✅                           | 2026-06-11 |
| 245 | `~/.claude/plans/4-pr-linear-scone.md`                                                                                   | M    | ✅                           | 2026-06-11 |
| 246 | `~/.claude/plans/6-bonsailog-declarative-bumblebee.md`                                                                   | M    | ✅                           | 2026-06-11 |
| 247 | `~/.claude/plans/6-bonsailog-shimmying-kazoo.md`                                                                         | M    | ✅                           | 2026-06-11 |
| 248 | `~/.claude/plans/6-bonsailog-squishy-glacier.md`                                                                         | M    | ✅                           | 2026-06-11 |
| 249 | `~/.claude/plans/a-ok-stateful-quasar.md`                                                                                | M    | ✅                           | 2026-06-11 |
| 250 | `~/.claude/plans/admob-create-py-optimized-cookie.md`                                                                    | M    | ✅                           | 2026-06-11 |
| 251 | `~/.claude/plans/approve-concurrent-trinket.md`                                                                          | M    | ✅                           | 2026-06-11 |
| 252 | `~/.claude/plans/b-c-precious-catmull.md`                                                                                | M    | ✅                           | 2026-06-11 |
| 253 | `~/.claude/plans/binary-napping-gray.md`                                                                                 | M    | ✅                           | 2026-06-11 |
| 254 | `~/.claude/plans/calm-fluttering-owl.md`                                                                                 | M    | ✅                           | 2026-06-11 |
| 255 | `~/.claude/plans/claudecode-dev-build-eager-yeti.md`                                                                     | M    | ✅                           | 2026-06-11 |
| 256 | `~/.claude/plans/cozy-dancing-pike.md`                                                                                   | M    | ✅                           | 2026-06-11 |
| 257 | `~/.claude/plans/cozy-tinkering-popcorn.md`                                                                              | M    | ✅                           | 2026-06-11 |
| 258 | `~/.claude/plans/cuddly-enchanting-token.md`                                                                             | M    | ✅                           | 2026-06-11 |
| 259 | `~/.claude/plans/d-6-90-staged-quill.md`                                                                                 | M    | ✅                           | 2026-06-11 |
| 260 | `~/.claude/plans/declarative-purring-spring.md`                                                                          | M    | ✅                           | 2026-06-11 |
| 261 | `~/.claude/plans/deep-exploring-hickey.md`                                                                               | M    | ✅                           | 2026-06-11 |
| 262 | `~/.claude/plans/elegant-kindling-finch.md`                                                                              | M    | ✅                           | 2026-06-11 |
| 263 | `~/.claude/plans/fancy-bouncing-crab.md`                                                                                 | M    | ✅                           | 2026-06-11 |
| 264 | `~/.claude/plans/fancy-painting-cerf.md`                                                                                 | M    | ✅                           | 2026-06-11 |
| 265 | `~/.claude/plans/giggly-forging-volcano.md`                                                                              | M    | ✅                           | 2026-06-11 |
| 266 | `~/.claude/plans/golden-doodling-wilkinson.md`                                                                           | M    | ✅                           | 2026-06-11 |
| 267 | `~/.claude/plans/groovy-floating-reddy.md`                                                                               | M    | ✅                           | 2026-06-11 |
| 268 | `~/.claude/plans/hashed-orbiting-widget.md`                                                                              | M    | ✅                           | 2026-06-11 |
| 269 | `~/.claude/plans/hazy-roaming-turtle-agent-a3d36dfa08b80203b.md`                                                         | M    | ✅                           | 2026-06-11 |
| 270 | `~/.claude/plans/hazy-roaming-turtle.md`                                                                                 | M    | ✅                           | 2026-06-11 |
| 271 | `~/.claude/plans/hidden-shimmying-otter.md`                                                                              | M    | ✅                           | 2026-06-11 |
| 272 | `~/.claude/plans/hidden-wibbling-sundae.md`                                                                              | M    | ✅                           | 2026-06-11 |
| 273 | `~/.claude/plans/imperative-dancing-rabin.md`                                                                            | M    | ✅                           | 2026-06-11 |
| 274 | `~/.claude/plans/ios-android-expo-dapper-owl.md`                                                                         | M    | ✅                           | 2026-06-11 |
| 275 | `~/.claude/plans/jaunty-nibbling-llama.md`                                                                               | M    | ✅                           | 2026-06-11 |
| 276 | `~/.claude/plans/keen-dancing-quokka.md`                                                                                 | M    | ✅                           | 2026-06-11 |
| 277 | `~/.claude/plans/lovely-percolating-kite.md`                                                                             | M    | ✅                           | 2026-06-11 |
| 278 | `~/.claude/plans/melodic-sprouting-lighthouse.md`                                                                        | M    | ✅                           | 2026-06-11 |
| 279 | `~/.claude/plans/ok-1-parsed-flamingo.md`                                                                                | M    | ✅                           | 2026-06-11 |
| 280 | `~/.claude/plans/ok-1-playful-fern.md`                                                                                   | M    | ✅                           | 2026-06-11 |
| 281 | `~/.claude/plans/ok-1-valiant-wirth.md`                                                                                  | M    | ✅                           | 2026-06-11 |
| 282 | `~/.claude/plans/ok-1-virtual-newt.md`                                                                                   | M    | ✅                           | 2026-06-11 |
| 283 | `~/.claude/plans/ok-federated-flurry.md`                                                                                 | M    | ✅                           | 2026-06-11 |
| 284 | `~/.claude/plans/ok-typed-boole.md`                                                                                      | M    | ✅                           | 2026-06-11 |
| 285 | `~/.claude/plans/on-off-fancy-dawn.md`                                                                                   | M    | ✅                           | 2026-06-11 |
| 286 | `~/.claude/plans/partitioned-petting-marshmallow.md`                                                                     | M    | ✅                           | 2026-06-11 |
| 287 | `~/.claude/plans/pdf-csv-pdf-export-progress-mockup-transient-platypus.md`                                               | M    | ✅                           | 2026-06-11 |
| 288 | `~/.claude/plans/peaceful-booping-bird.md`                                                                               | M    | ✅                           | 2026-06-11 |
| 289 | `~/.claude/plans/phase-lovely-orbit.md`                                                                                  | M    | ✅                           | 2026-06-11 |
| 290 | `~/.claude/plans/polished-waddling-milner.md`                                                                            | M    | ✅                           | 2026-06-11 |
| 291 | `~/.claude/plans/precious-riding-reddy.md`                                                                               | M    | ✅                           | 2026-06-11 |
| 292 | `~/.claude/plans/purring-sniffing-cocke.md`                                                                              | M    | ✅                           | 2026-06-11 |
| 293 | `~/.claude/plans/quizzical-questing-plum.md`                                                                             | M    | ✅                           | 2026-06-11 |
| 294 | `~/.claude/plans/refactored-greeting-muffin.md`                                                                          | M    | ✅                           | 2026-06-11 |
| 295 | `~/.claude/plans/reflective-finding-wirth.md`                                                                            | M    | ✅                           | 2026-06-11 |
| 296 | `~/.claude/plans/snazzy-stirring-minsky.md`                                                                              | M    | ✅                           | 2026-06-11 |
| 297 | `~/.claude/plans/squishy-sparking-toast.md`                                                                              | M    | ✅                           | 2026-06-11 |
| 298 | `~/.claude/plans/streamed-finding-lynx.md`                                                                               | M    | ✅                           | 2026-06-11 |
| 299 | `~/.claude/plans/takt-assess-sunny-bird-agent-a907bdaf69b9d3a9e.md`                                                      | M    | ✅                           | 2026-06-11 |
| 300 | `~/.claude/plans/takt-assess-sunny-bird.md`                                                                              | M    | ✅                           | 2026-06-11 |
| 301 | `~/.claude/plans/temporal-conjuring-flamingo.md`                                                                         | M    | ✅                           | 2026-06-11 |
| 302 | `~/.claude/plans/tidy-pondering-spark.md`                                                                                | M    | ✅                           | 2026-06-11 |
| 303 | `~/.claude/plans/transient-spinning-lamport.md`                                                                          | M    | ✅                           | 2026-06-11 |
| 304 | `~/.claude/plans/virtual-noodling-storm.md`                                                                              | M    | ✅                           | 2026-06-11 |
| 305 | `~/.claude/plans/wise-twirling-widget.md`                                                                                | M    | ✅                           | 2026-06-11 |
| 306 | `~/.claude/plans/zany-questing-ullman.md`                                                                                | M    | ✅                           | 2026-06-11 |
| 307 | `~/.claude/plans/zazzy-humming-codd.md`                                                                                  | M    | ✅                           | 2026-06-11 |
| 308 | `~/.claude/rules/claude-code-specific.md`                                                                                | G    | ❌                           | 2026-06-11 |
| 309 | `~/.claude/rules/wsl2-environment.md`                                                                                    | G    | ✅                           | 2026-06-11 |
| 310 | `~/.claude/skills/discuss/SKILL.md`                                                                                      | G    | 🟡                           | 2026-06-11 |
| 311 | `~/.claude/skills/memory-review/SKILL.md`                                                                                | G    | ✅                           | 2026-06-11 |
| 312 | `~/.claude/skills/plan/SKILL.md`                                                                                         | G    | 🟡                           | 2026-06-11 |
| 313 | `~/.claude/skills/progress/SKILL.md`                                                                                     | G    | 🟡                           | 2026-06-11 |
| 314 | `~/.claude/skills/react-native-best-practices/SKILL.md`                                                                  | G    | 🟡                           | 2026-06-11 |
| 315 | `~/.claude/skills/release-check/SKILL.md`                                                                                | G    | 🟡                           | 2026-06-11 |
| 316 | `~/.claude/skills/retro/SKILL.md`                                                                                        | G    | 🟡                           | 2026-06-11 |
| 317 | `~/.claude/skills/review-pr/SKILL.md`                                                                                    | G    | 🟡                           | 2026-06-11 |
| 318 | `~/.claude/skills/session-end/SKILL.md`                                                                                  | G    | 🟡                           | 2026-06-11 |
| 319 | `~/.claude/skills/skill-creator/SKILL.md`                                                                                | G    | 🟡                           | 2026-06-11 |
| 320 | `~/.claude/skills/store-text/SKILL.md`                                                                                   | G    | 🟡                           | 2026-06-11 |
| 321 | `~/.claude/skills/upgrading-react-native/SKILL.md`                                                                       | G    | 🟡                           | 2026-06-11 |
| 322 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/MEMORY.md`                                          | M    | ✅                           | 2026-06-10 |
| 323 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/adb-daemon-parallel-hang.md`                        | M    | ✅                           | 2026-06-11 |
| 324 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/admob-optional-crash.md`                            | M    | ✅                           | 2026-06-11 |
| 325 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/adr-0024-phase-g-completion.md`                     | M    | 🟡                           | 2026-06-11 |
| 326 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/bonsailog-adb-verify-constraints.md`                | M    | ✅                           | 2026-06-11 |
| 327 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/calendar-grid-saturday-overflow.md`                 | M    | ✅                           | 2026-06-11 |
| 328 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/claude-code-effort-model-persistence.md`            | M    | ✅                           | 2026-06-11 |
| 329 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/cross-app-factory-deep-investigation.md`            | M    | ⚪                           | 2026-06-11 |
| 330 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/dev-vs-preview-build-pattern.md`                    | M    | ✅                           | 2026-06-11 |
| 331 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/eas-build-fixes.md`                                 | M    | ✅                           | 2026-06-11 |
| 332 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/expo-dev-client-continue-dismiss.md`                | M    | ✅                           | 2026-06-11 |
| 333 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/expo-toolsbutton-android-bug.md`                    | M    | ✅                           | 2026-06-11 |
| 334 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/f10-pdf-washi-and-build-gotchas.md`                 | M    | ✅                           | 2026-06-11 |
| 335 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/forbidden-words-reminder.md`                        | M    | ✅                           | 2026-06-11 |
| 336 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/git-stash-staged-newfile-trap.md`                   | M    | ✅                           | 2026-06-11 |
| 337 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/harness-engineering-initiative.md`                  | M    | ✅                           | 2026-06-11 |
| 338 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/i18n-bulk-fallback.md`                              | M    | ✅                           | 2026-06-11 |
| 339 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/large-issue-phase-strategy.md`                      | M    | ✅                           | 2026-06-11 |
| 340 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/legal-pages-github-pages.md`                        | M    | ✅                           | 2026-06-11 |
| 341 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/lintstagedrc-vs-package-json.md`                    | M    | ✅                           | 2026-06-11 |
| 342 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/maestro-android-limits.md`                          | M    | ✅                           | 2026-06-11 |
| 343 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/metro-auto-reload-script.md`                        | M    | ✅                           | 2026-06-11 |
| 344 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/ndk27-cmake-args-plugin.md`                         | M    | ✅                           | 2026-06-11 |
| 345 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/notif-device-verify-gotchas.md`                     | M    | ✅                           | 2026-06-11 |
| 346 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/parallel-agent-isolation.md`                        | M    | ✅                           | 2026-06-11 |
| 347 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/pnpm-v10-postinstall.md`                            | M    | ✅                           | 2026-06-11 |
| 348 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/pnpm-verify-config-node22.md`                       | M    | ✅                           | 2026-06-11 |
| 349 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/pr-rebase-theirs-anchor-loss.md`                    | M    | ✅                           | 2026-06-11 |
| 350 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/refactor-initiative.md`                             | M    | ✅                           | 2026-06-11 |
| 351 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/rn-fabric-measurelayout-gotcha.md`                  | M    | ✅                           | 2026-06-11 |
| 352 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/sess47-f10-export-7screens.md`                      | M    | ✅                           | 2026-06-11 |
| 353 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/sess50-pdf-many-photos.md`                          | M    | ✅                           | 2026-06-11 |
| 354 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/sess64-feature-registry-and-factory-improvement.md` | M    | ✅                           | 2026-06-11 |
| 355 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/sess65-dark-theme-overhaul.md`                      | M    | ✅                           | 2026-06-11 |
| 356 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/sess68-4pr-consolidation-completion.md`             | M    | ✅                           | 2026-06-11 |
| 357 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/sess68-verify-results.md`                           | M    | ✅                           | 2026-06-11 |
| 358 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/sess69-dark-theme-true-completion.md`               | M    | ✅                           | 2026-06-11 |
| 359 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/sess70-dark-theme-completion-pr-cd.md`              | M    | ✅                           | 2026-06-11 |
| 360 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/sess71-dev-workflow-automation.md`                  | M    | 🟡                           | 2026-06-11 |
| 361 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/sess72-scroll-preservation.md`                      | M    | ✅                           | 2026-06-11 |
| 362 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/sess74-supplementary-3prs.md`                       | M    | ✅                           | 2026-06-11 |
| 363 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/sess76-android-release-v12.md`                      | M    | 🟡                           | 2026-06-11 |
| 364 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/sess83-88-sprint-retro.md`                          | M    | ✅                           | 2026-06-11 |
| 365 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/sess89-custom-species-styles.md`                    | M    | 🟡                           | 2026-06-11 |
| 366 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/sess89-recurrence-ui-and-defense.md`                | M    | ✅                           | 2026-06-11 |
| 367 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/sess9-tag-overhaul.md`                              | M    | ✅                           | 2026-06-11 |
| 368 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/sess90-91-header-unification.md`                    | M    | ✅                           | 2026-06-11 |
| 369 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/sess90-doc-measurement.md`                          | M    | ✅                           | 2026-06-11 |
| 370 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/sess91-3-screen-unify.md`                           | M    | ✅                           | 2026-06-11 |
| 371 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/sess92-icon-refresh-stroke-unify.md`                | M    | ✅                           | 2026-06-11 |
| 372 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/sess92-pr3-chip-layout-sot.md`                      | M    | 🟡                           | 2026-06-11 |
| 373 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/setup-explore-cleanup.md`                           | M    | ✅                           | 2026-06-11 |
| 374 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/shakyou-driven-development.md`                      | M    | ✅                           | 2026-06-11 |
| 375 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/skip-list-auto-rules.md`                            | M    | ✅                           | 2026-06-11 |
| 376 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/sqlite-snake-case-rowmapper.md`                     | M    | ✅                           | 2026-06-11 |
| 377 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/theme-system-integration.md`                        | M    | ✅                           | 2026-06-11 |
| 378 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/ui-diff-auto-improve-loop.md`                       | M    | ✅                           | 2026-06-11 |
| 379 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/ui-diff-wsl2-quirks.md`                             | M    | ✅                           | 2026-06-11 |
| 380 | `~/.claude/projects/-home-doooo-04-app-factory-apps-BonsaiLog/memory/wsl2-android-build-config.md`                       | M    | ✅                           | 2026-06-11 |
| 381 | `fastlane/metadata/README.md`                                                                                            | E    | ✅→改訂 (PR #1085)           | 2026-06-10 |
| 382 | `fastlane/metadata/copyright.txt`                                                                                        | E    | 🔴→**修正済 (PR #1085)**     | 2026-06-10 |
| 383 | `fastlane/metadata/en-US/description.txt`                                                                                | E    | ✅                           | 2026-06-10 |
| 384 | `fastlane/metadata/en-US/keywords.txt`                                                                                   | E    | ✅                           | 2026-06-10 |
| 385 | `fastlane/metadata/en-US/marketing_url.txt`                                                                              | E    | ✅                           | 2026-06-10 |
| 386 | `fastlane/metadata/en-US/name.txt`                                                                                       | E    | ✅                           | 2026-06-10 |
| 387 | `fastlane/metadata/en-US/privacy_url.txt`                                                                                | E    | ✅                           | 2026-06-10 |
| 388 | `fastlane/metadata/en-US/promotional_text.txt`                                                                           | E    | ✅                           | 2026-06-10 |
| 389 | `fastlane/metadata/en-US/release_notes.txt`                                                                              | E    | ✅                           | 2026-06-10 |
| 390 | `fastlane/metadata/en-US/subtitle.txt`                                                                                   | E    | ✅                           | 2026-06-10 |
| 391 | `fastlane/metadata/en-US/support_url.txt`                                                                                | E    | 🔴→**修正済 (PR #1064)**     | 2026-06-10 |
| 392 | `fastlane/metadata/ja/description.txt`                                                                                   | E    | 🔴                           | 2026-06-10 |
| 393 | `fastlane/metadata/ja/keywords.txt`                                                                                      | E    | 🔴                           | 2026-06-10 |
| 394 | `fastlane/metadata/ja/marketing_url.txt`                                                                                 | E    | ✅                           | 2026-06-10 |
| 395 | `fastlane/metadata/ja/name.txt`                                                                                          | E    | 🔴                           | 2026-06-10 |
| 396 | `fastlane/metadata/ja/privacy_url.txt`                                                                                   | E    | ✅                           | 2026-06-10 |
| 397 | `fastlane/metadata/ja/promotional_text.txt`                                                                              | E    | 🔴                           | 2026-06-10 |
| 398 | `fastlane/metadata/ja/release_notes.txt`                                                                                 | E    | ✅                           | 2026-06-10 |
| 399 | `fastlane/metadata/ja/subtitle.txt`                                                                                      | E    | 🔴                           | 2026-06-10 |
| 400 | `fastlane/metadata/ja/support_url.txt`                                                                                   | E    | 🔴→**修正済 (PR #1064)**     | 2026-06-10 |
| 401 | `fastlane/metadata/primary_category.txt`                                                                                 | E    | ✅                           | 2026-06-11 |
| 402 | `fastlane/metadata/primary_first_sub_category.txt`                                                                       | E    | ✅                           | 2026-06-11 |
| 403 | `fastlane/metadata/primary_second_sub_category.txt`                                                                      | E    | ✅                           | 2026-06-11 |
| 404 | `fastlane/metadata/review_information/demo_password.txt`                                                                 | E    | 🔴→**修正済 (PR #1085)**     | 2026-06-10 |
| 405 | `fastlane/metadata/review_information/demo_user.txt`                                                                     | E    | 🔴→**修正済 (PR #1085)**     | 2026-06-10 |
| 406 | `fastlane/metadata/review_information/email_address.txt`                                                                 | E    | 🔴→**修正済 (PR #1085)**     | 2026-06-10 |
| 407 | `fastlane/metadata/review_information/first_name.txt`                                                                    | E    | 🔴→**修正済 (PR #1085)**     | 2026-06-10 |
| 408 | `fastlane/metadata/review_information/last_name.txt`                                                                     | E    | 🔴→**修正済 (PR #1085)**     | 2026-06-10 |
| 409 | `fastlane/metadata/review_information/notes.txt`                                                                         | E    | 🔴→**修正済 (PR #1085)**     | 2026-06-10 |
| 410 | `fastlane/metadata/review_information/phone_number.txt`                                                                  | E    | 🔴→**修正済 (PR #1085)**     | 2026-06-10 |
| 411 | `fastlane/metadata/secondary_category.txt`                                                                               | E    | ✅                           | 2026-06-11 |
| 412 | `fastlane/metadata/secondary_first_sub_category.txt`                                                                     | E    | ✅                           | 2026-06-11 |
| 413 | `fastlane/metadata/secondary_second_sub_category.txt`                                                                    | E    | ✅                           | 2026-06-11 |
| 414 | `docs/store-listing/android/<19 locale>/{title,short,full}.txt` (57 files 論理1件)                                       | E    | 🟡                           | 2026-06-10 |
| 415 | `docs/store-listing/ios/<19 locale>/description.txt` (19 files 論理1件)                                                  | E    | 🟡                           | 2026-06-10 |
| 416 | `.claude/skills/implement/SKILL.md`                                                                                      | G    | ✅                           | 2026-06-11 |
| 417 | `.claude/skills/fix-ci/SKILL.md`                                                                                         | G    | ✅                           | 2026-06-11 |
| 418 | `.claude/skills/i18n-add/SKILL.md`                                                                                       | G    | ✅                           | 2026-06-11 |
| 419 | `docs/how-to/release/production-promotion-checklist.md`                                                                  | P    | 🟡→**修正済 (本 PR)**        | 2026-06-11 |
| 420 | `docs/reference/tasks/lessons/git.md`                                                                                    | P    | ✅                           | 2026-06-11 |
| 421 | `docs/how-to/workflow/prompts/P-13_review-request-feature.md`                                                            | P    | ✅                           | 2026-06-11 |
| 422 | `docs/how-to/workflow/prompts/P-14_doc-truth-structural-defenses.md`                                                     | P    | ✅                           | 2026-06-11 |
| 423 | `docs/reference/doc-routing.md`                                                                                          | P    | ✅                           | 2026-06-11 |
| 424 | `docs/audit/freshness-ledger.md`                                                                                         | P    | ✅                           | 2026-06-11 |
| 425 | `docs/how-to/workflow/pr-template-appendix.md`                                                                           | P    | ✅                           | 2026-06-11 |
| 426 | `.claude/rules/ui-diff-loop.md`                                                                                          | G    | ✅                           | 2026-06-11 |
| 427 | `docs/how-to/workflow/prompts/P-15_doc-truth-audit.md`                                                                   | P    | ✅                           | 2026-06-11 |

## 転記検算 (2026-06-11 初期化時)

- 転記行数: 420 (原台帳の番号付き行 全件、欠番 なし)
- 原台帳完走時の機械集計: 判定済み 420 行・未処理 0 (内訳は原台帳「バッチ⑨⑩ + 残余 sweep 処理記録」参照)
- 補遺 No.421-427 (2026-06-11 P3/P4): 監査完走後の新規 doc 7 件を更新ルール 2 で追加 (台帳 計 427 行)
