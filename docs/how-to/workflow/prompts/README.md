# Prompt Templates

Claude Code + Codex + Claude Design の 3 ツール協調で使うプロンプトテンプレート集。

## 一覧

| ID   | ファイル                                                     | 渡す先                   | タイミング                    |
| ---- | ------------------------------------------------------------ | ------------------------ | ----------------------------- |
| P-00 | [P-00_ux-simulation.md](P-00_ux-simulation.md)               | Claude Design            | 実装前の UX 検証              |
| P-01 | [P-01_project-init.md](P-01_project-init.md)                 | Claude Code              | Phase 0: 土台づくり           |
| P-02 | [P-02_design-discussion.md](P-02_design-discussion.md)       | Claude Code `/discuss`   | リスク高い機能の設計前        |
| P-03 | [P-03_codex-implementation.md](P-03_codex-implementation.md) | Codex                    | 各 Issue の実装指示           |
| P-04 | [P-04_ui-implementation.md](P-04_ui-implementation.md)       | Claude Code              | Claude Design 出力の UI 実装  |
| P-05 | [P-05_local-apk-build.md](P-05_local-apk-build.md)           | Claude Code              | APK ビルド + 実機インストール |
| P-06 | [P-06_device-verification.md](P-06_device-verification.md)   | Claude Code              | 実機検証 + ログ取得           |
| P-07 | [P-07_pr-review.md](P-07_pr-review.md)                       | Claude Code `/review-pr` | Codex の PR レビュー          |
| P-08 | [P-08_device-bug-triage.md](P-08_device-bug-triage.md)       | Claude Code → Codex      | 実機バグの解析 → 修正指示     |

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
