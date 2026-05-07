# Prompt Templates

Claude Code + Claude Design の 2 ツール協調で使うプロンプトテンプレート集（2026-05-01 Codex 不採用、Claude Code 単独運用に変更）。

## 一覧

| ID   | ファイル                                                     | 渡す先                   | タイミング                                                        |
| ---- | ------------------------------------------------------------ | ------------------------ | ----------------------------------------------------------------- |
| P-00 | [P-00_ux-simulation.md](P-00_ux-simulation.md)               | Claude Design            | 実装前の UX 検証                                                  |
| P-01 | [P-01_project-init.md](P-01_project-init.md)                 | Claude Code              | Phase 0: 土台づくり                                               |
| P-02 | [P-02_design-discussion.md](P-02_design-discussion.md)       | Claude Code `/discuss`   | リスク高い機能の設計前                                            |
| P-03 | [P-03_codex-implementation.md](P-03_codex-implementation.md) | Claude Code              | 各 Issue の実装指示（ファイル名は履歴互換のため維持）             |
| P-04 | [P-04_ui-implementation.md](P-04_ui-implementation.md)       | Claude Code              | Claude Design 出力の UI 実装                                      |
| P-05 | [P-05_local-apk-build.md](P-05_local-apk-build.md)           | Claude Code              | APK ビルド + 実機インストール                                     |
| P-06 | [P-06_device-verification.md](P-06_device-verification.md)   | Claude Code              | 実機検証 + ログ取得                                               |
| P-07 | [P-07_pr-review.md](P-07_pr-review.md)                       | Claude Code `/review-pr` | PR セルフレビュー                                                 |
| P-08 | [P-08_device-bug-triage.md](P-08_device-bug-triage.md)       | Claude Code (Phase 1+2)  | 実機バグの解析 → 修正実装                                         |
| P-09 | [P-09_ui-diff-pipeline.md](P-09_ui-diff-pipeline.md)         | Claude Code              | ADR-0021 UI 差分検出パイプラインで画面比較 → Issue → 実装 → merge |
| P-10 | [P-10_open-design-resume.md](P-10_open-design-resume.md)     | Claude Code              | open-design 再開: 安定タグ確認 → 起動 → URL 報告(1 語トリガー)    |

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
