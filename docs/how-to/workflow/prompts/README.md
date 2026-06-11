# Prompt Templates

Claude Code + Claude Design の 2 ツール協調で使うプロンプトテンプレート集（2026-05-01 Codex 不採用、Claude Code 単独運用に変更）。

## 一覧

| ID   | ファイル                                                                       | 渡す先        | タイミング                                                                            |
| ---- | ------------------------------------------------------------------------------ | ------------- | ------------------------------------------------------------------------------------- |
| P-00 | [P-00_ux-simulation.md](P-00_ux-simulation.md)                                 | Claude Design | UX ペルソナウォークスルー (= 新画面 / 次 app 起点で再利用)                            |
| P-01 | [P-01_project-init.md](P-01_project-init.md)                                   | Claude Code   | Phase 0: プロジェクト初期化 (= 次 app 起点で再利用)                                   |
| P-10 | [P-10_open-design-resume.md](P-10_open-design-resume.md)                       | Claude Code   | open-design 再開 (= 1 語トリガー、 安定タグ確認 → 起動 → URL 報告)                    |
| P-11 | [P-11_implement-from-mockups.md](P-11_implement-from-mockups.md)               | Claude Code   | docs/mockups/v1.0/ → React Native 実装 (R-28 境界判定厳守)                            |
| P-13 | [P-13_review-request-feature.md](P-13_review-request-feature.md)               | Claude Code   | レビュー依頼機能の標準実装 (= 次 app 移植用、 ADR-0006 設計の焼き込み)                |
| P-14 | [P-14_doc-truth-structural-defenses.md](P-14_doc-truth-structural-defenses.md) | Claude Code   | Doc-Truth 構造防御 4 件の初期装備 (= 次 app 開始日用、 監査 2026-06 retro の焼き込み) |
| P-15 | [P-15_doc-truth-audit.md](P-15_doc-truth-audit.md)                             | Claude Code   | Doc-Truth Audit 標準実行 (= P0 台帳 → P1 バッチ → P2 採掘、 2〜3 周後に skill 化判断) |

## 使い方

1. 該当するプロンプトを開く
2. `{変数}` を実際の値に置換する（`{PROJECT_ROOT}` は AGENTS.md で定義済み）
3. 対象ツールに渡す

## 変数一覧

| 変数             | 意味                         | 定義場所       |
| ---------------- | ---------------------------- | -------------- |
| `{PROJECT_ROOT}` | プロジェクトルートの絶対パス | AGENTS.md §2.4 |
| `{APP_NAME}`     | アプリ名                     | AGENTS.md §2.3 |
| `{PACKAGE_NAME}` | Android パッケージ名         | AGENTS.md §2.3 |

## Retire 履歴

- **2026-06-10 (Sess91 Phase 1c、 PR #1046 想定)**: P-02〜P-08 7 件 retire。 30 日 0-reads + ClaudeCode で 全 file 内容確認 + 7 分類判定 (A 役目終) で確定。 後継:
  - P-02 design-discussion → `/discuss` skill
  - P-03 codex-implementation → Issue template + `/plan` skill (= 2026-05-01 Codex 不採用と整合)
  - P-04 ui-implementation → `docs/how-to/development/coding_rules.md` + ADR-0015/0052 + R-58/59/60
  - P-05 local-apk-build → `pnpm build:android:apk:local` + `eas-build-doctor` agent
  - P-06 device-verification → `/verify` skill + sess メモ
  - P-07 pr-review → `/review-pr` skill (= 完全重複)
  - P-08 device-bug-triage → CLAUDE.md §3 4 段階デバッグ + sess メモ

  → keep 4 件 (P-00 / P-01 / P-09 / P-10) + P-11 / P-12 は 0 reads でないため retire 対象外 (その後 P-09 / P-12 は ADR-0059 ui-diff 退役で 2026-06-12 削除)。 ADR-0046 D-2 「物理削除禁止」 は ADR/R ルール対象、 prompt は git history で revert 可能なので物理削除採用。
