# 学んだこと（Lessons Learned）— 索引のみ

> **このファイルは旧パス互換のため残置しています**。実際の lesson は **領域別ファイル** に分割されました。
>
> - 技術 lesson: [`./lessons/`](./lessons/) フォルダ参照
> - 行動 lesson: [`.claude/recurrence-prevention.md`](../../../.claude/recurrence-prevention.md) (R-1〜R-20)

## 領域別ファイル

| ファイル                                                         | 内容                                                                                                                                | 想定読者                     |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| [`lessons/docs.md`](./lessons/docs.md)                           | ドキュメント管理 / 棚卸 / 索引更新 / 参照整合性                                                                                     | docs 編集時                  |
| [`lessons/db.md`](./lessons/db.md)                               | SQLite マイグレ / Drizzle / バックアップ / i18n                                                                                     | DB / i18n 実装時             |
| [`lessons/build.md`](./lessons/build.md)                         | EAS local build / 環境変数 / 画像相対パス / CI                                                                                      | ビルド・CI 作業時            |
| [`lessons/runtime.md`](./lessons/runtime.md)                     | デバッグ / Android / 開発環境 PATH                                                                                                  | デバッグ・Android 実装時     |
| [`lessons/store.md`](./lessons/store.md)                         | ストア申請 / メタデータ / UX 文言                                                                                                   | リリース作業時               |
| [`lessons/billing.md`](./lessons/billing.md)                     | RevenueCat / Champion 方式 / ペルソナ再評価                                                                                         | 課金実装時                   |
| [`lessons/wsl2-mobile.md`](./lessons/wsl2-mobile.md)             | WSL2 + adb / Maestro 2.0 / Expo Go 衝突 / pgrep -f 自分マッチ → preflight.mjs で構造的検出 (ADR-0021)                               | UI 差分検出 / Maestro 実装時 |
| [`lessons/auto-improve-loop.md`](./lessons/auto-improve-loop.md) | Maestro Android 技術制約 (Unicode / Pressable 階層 / BottomSheet 描画ラグ) + 既存スクリプト周知 + skip-list 判定 + 半自走モード運用 | UI 自動改善ループ運用時      |
| [`lessons/notification.md`](./lessons/notification.md)           | 通知 F-16 (未配線デッドコード検出 / 許可取得 soft-ask タイミング / 単一トグル起動時副作用)                                          | 通知・権限実装時             |
| [`lessons/refactor.md`](./lessons/refactor.md)                   | 大規模リファクタ Phase 3-7 の学び (knip ignore の両刃 / pnpm verify 完全実行 / app.config plugin / git rm+add 罠 / K7 慎重判断)     | 次回大規模リファクタ時       |

## 運用ルール

1. 新しい lesson は領域別ファイルに追加 (新領域なら新ファイル + [`lessons/README.md`](./lessons/README.md) に追記)
2. 1 ファイル 200 行以内を維持
3. **行動パターンの再発防止は `.claude/recurrence-prevention.md`** (本フォルダではなく)
4. 本ファイル (`lessons.md`) は新規 lesson を追加せず、索引のみ
