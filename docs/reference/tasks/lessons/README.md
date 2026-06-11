# Lessons Learned (索引)

技術 lesson は領域別フォルダに分割されています。**膨大化で重要部分が読まれない問題を回避**するため、必要な領域のファイルのみ Read してください。

> 行動 lesson (議論深さ / バイアス排除 / ペルソナ評価 等) は **`.claude/recurrence-prevention.md`** を参照 (最新の R 番号は同ファイルの索引が正)。
>
> **本ファイルが領域索引の唯一の正** (Doc-Truth Audit バッチ⑦ 2026-06-11 で一本化。旧 `../lessons.md` は誘導のみ)。

## 領域別ファイル

| ファイル                                         | 内容                                                                                      | 想定読者                 |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- | ------------------------ |
| [`docs.md`](./docs.md)                           | ドキュメント管理 / 棚卸 / 索引更新 / 参照整合性                                           | docs 編集時              |
| [`db.md`](./db.md)                               | SQLite マイグレ冪等性 / Drizzle / バックアップフィールド / i18n キー管理                  | DB / i18n 実装時         |
| [`build.md`](./build.md)                         | EAS local build / 環境変数 / API キー / 画像相対パス / CI/CD 検証スクリプト               | ビルド・CI 作業時        |
| [`runtime.md`](./runtime.md)                     | デバッグワークフロー / logcat False Positive / Android predictive back / 開発環境 PATH    | デバッグ・Android 実装時 |
| [`store.md`](./store.md)                         | App Store / Google Play 申請 / メタデータ / UX 文言 / 法的リンク                          | リリース作業時           |
| [`billing.md`](./billing.md)                     | RevenueCat / Pro 状態管理 / Champion 方式 / 別アプリ踏襲時のペルソナ再評価                | 課金実装時               |
| [`design.md`](./design.md)                       | Claude Design 作成時の ADR 添付 / テンプレ残骸検査 / design_system.md 整合確認            | UI 改修・Design 作成時   |
| [`discuss.md`](./discuss.md)                     | 議論プロセス (R-34 認識ギャップ防止 / R-35 alternative 提示 / 業界事例)                   | /discuss 起動時          |
| [`notification.md`](./notification.md)           | 通知 F-16 (未配線デッドコード検出 / 許可取得タイミング soft-ask / 単一トグル起動時副作用) | 通知・権限実装時         |
| [`navigation.md`](./navigation.md)               | expo-router の仕様未確定/直感に反する挙動の罠集約 (Sess12 PR-G 確立)                      | navigation 実装時        |
| [`iap.md`](./iap.md)                             | IAP / RevenueCat 構造修復の学び (territory / offering / 価格取得、Sess81 起こし)          | IAP 改修時               |
| [`release.md`](./release.md)                     | リリース工程の繰り返し回避 lesson (ADR-0050 補完、Sess61〜)                               | リリース作業時           |
| [`wsl2-mobile.md`](./wsl2-mobile.md)             | WSL2 + adb / Maestro 2.0 / Expo Go 衝突 → preflight.mjs で構造的検出 (ADR-0021)           | UI 差分 / Maestro 実装時 |
| [`auto-improve-loop.md`](./auto-improve-loop.md) | Maestro Android 技術制約 + skip-list 判定 + 半自走モード運用                              | UI 自動改善ループ運用時  |
| [`refactor.md`](./refactor.md)                   | 大規模リファクタ Phase 3-7 の学び (knip / verify 完全実行 / git rm+add 罠)                | 次回大規模リファクタ時   |
| [`retro.md`](./retro.md)                         | sprint / milestone 単位 retro 結果集約 (KPT + ボトルネック + 教訓)                        | sprint 完了時            |
| [`git.md`](./git.md)                             | 並行 PR の rebase theirs anchor 消失 / stash --staged new file 罠 (P2 昇格)               | 並行 PR / rebase 作業時  |

## 運用ルール

1. **新しい lesson は領域別ファイルに追加** (新領域なら新ファイル + 本索引に追記)
2. **1 ファイル 200 行以内**を維持 (超えたら追加分割検討、`pnpm docs:lint` が 200 行超で警告)
3. **行動パターンの再発防止は `.claude/recurrence-prevention.md`** (本フォルダではなく)
4. **既存ファイル `docs/reference/tasks/lessons.md` (旧パス) は誘導用に残置** (互換性維持)
5. **lesson 追加時は「自動検知できないか」を必ず検討**し、対応スクリプトがあれば下記マトリクスに記載

## 再発検知マトリクス (Lesson と CI 自動検知の対応表)

> 「lesson 書きっぱなし」を防ぐため、各 lesson に対応する自動検知スクリプトを明示する。
> 「自動検知なし」の lesson は **CLAUDE.md §9** に従い、検知方法の構造化を継続検討する。

| 領域 / Lesson                                                     | 自動検知    | スクリプト / Hook                                                       |
| ----------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------- |
| AdMob `APPLICATION_ID` 空 / 不正フォーマット                      | ✅          | `scripts/prebuild-env-check.mjs` (Layer 1.5)                            |
| `@shopify/react-native-skia` の `libskia.a` 不在                  | ✅          | `scripts/native-runtime-check.mjs` (検査 2)                             |
| `ulid` v3 / `uuid` v9 系の Web Crypto polyfill 不在 (ULIDError)   | ✅          | `scripts/native-runtime-check.mjs` (検査 1)                             |
| `<ScrollView>` 内 `<FlatList>` 縦ネスト警告                       | ✅          | `scripts/native-runtime-check.mjs` (検査 3)                             |
| Expo create-expo-app テンプレ残骸                                 | ✅          | `scripts/template-residue-check.mjs`                                    |
| 旧 AI 言及 / ADR 連番 / 取消線 / lessons 索引整合性               | ✅          | `scripts/docs-lint.mjs`                                                 |
| lessons ファイル 200 行超 (肥大化予防)                            | ✅          | `scripts/docs-lint.mjs` (warning)                                       |
| 旧 theme トークン (`neonGreen` 等) 残存                           | ✅          | `scripts/theme-legacy-check.mjs`                                        |
| 3 themes × 12 トークンの構造整合                                  | ✅          | `scripts/theme-token-check.mjs`                                         |
| EAS production 環境変数の API キー登録漏れ                        | ✅          | `scripts/prebuild-env-check.mjs` (Layer 2)                              |
| iOS Privacy Manifest 必須項目                                     | ✅          | `scripts/config-check.mjs`                                              |
| i18n キー欠損 / forbidden words                                   | ✅          | `scripts/i18n-check.mjs` / `scripts/i18n-forbidden-words.mjs`           |
| Edit / Write 前の Read 強制 (R-18)                                | ✅          | `.claude/hooks/check-read-before-edit.mjs` (PreToolUse)                 |
| `??` vs `\|\|` 空文字フォールバック (空値 → ネイティブ即死)       | ❌ TODO     | ESLint custom rule 検討                                                 |
| AndroidManifest と app.config.ts の値乖離 (prebuild --clean 漏れ) | ⚠️ 部分対応 | `scripts/prebuild-env-check.mjs` で事後検知のみ、prebuild 自動化が next |
| iOS `Info.plist` の `GADApplicationIdentifier` 不正               | ❌ TODO     | iOS 同種スクリプト未実装 (v1.x)                                         |

> **追加時のチェックリスト**: 新 lesson 追加 → 「同種の問題を **コード上 / ビルド時 / 起動時** のどこで検知できるか」を考える → 上記表に追記 → スクリプトを `pnpm verify` チェーンに組込む。

## フォーマット (各ファイル共通)

```
### カテゴリ: 短いタイトル
- **何が起きたか**: ...
- **根本原因**: ...
- **ルール**: 次回どうすべきか
- **一次情報**: URL (該当時のみ)
```
