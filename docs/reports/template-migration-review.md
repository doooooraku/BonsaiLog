# テンプレート移植レビューレポート

> 作成日: 2026-04-02
> 対象リポジトリ: doooooraku/app_template

---

## 1. 現状の全体像：ドキュメント棚卸し

| ファイル                                  | 言語            | 内容                                          | 対象読者           |
| ----------------------------------------- | --------------- | --------------------------------------------- | ------------------ |
| `README.md`                               | **英語**        | テンプレートの概要、技術スタック、Quick Start | 全ユーザー         |
| `TEMPLATE_README.md`                      | **英語**        | 使い方ガイド、セットアップ、コマンド一覧      | テンプレート利用者 |
| `setup.sh`                                | **英語** (出力) | 対話式の初期化スクリプト                      | 初回セットアップ   |
| `docs/README.md`                          | 日本語          | ドキュメント全体のインデックス                | 開発チーム         |
| `docs/explanation/product_strategy.md`    | 日本語          | プロダクト戦略                                | PO/意思決定者      |
| `docs/reference/basic_spec.md`            | 日本語          | 基本仕様                                      | 実装者             |
| `docs/reference/functional_spec.md`       | 日本語          | 機能仕様                                      | 実装者             |
| `docs/reference/constraints.md`           | 日本語          | 制約・ルール                                  | 全員               |
| `docs/reference/glossary.md`              | 日本語          | 用語集                                        | 全員               |
| `docs/reference/feature_spec_template.md` | **英語**        | 機能仕様テンプレート                          | 仕様作成者         |
| `docs/reference/tasks/lessons.md`         | **英語**        | 学びの記録                                    | 開発者             |
| `docs/adr/README.md`                      | 日本語          | ADR運用ガイド                                 | 意思決定者         |
| `docs/adr/ADR-0001-initial-decisions.md`  | 日本語          | 初期ADR                                       | 全員               |
| `docs/adr/adr_template.md`                | 日本語          | ADR書式テンプレ                               | ADR作成者          |
| `docs/how-to/quickstart.md`               | **英語**        | クイックスタート                              | 新規開発者         |
| `docs/how-to/debug-guide.md`              | **英語**        | デバッグガイド                                | デバッガー         |
| `docs/how-to/screenshot-generation.md`    | **英語**        | スクショ生成ガイド                            | マーケ/リリース    |
| `docs/how-to/store-listing-guide.md`      | **英語**        | ストア掲載ガイド                              | マーケ/リリース    |
| `docs/how-to/sentry_setup.md`             | **英語**        | Sentry導入ガイド                              | インフラ担当       |
| `docs/how-to/whole_workflow.md`           | 日本語          | 開発フロー全体                                | 開発チーム         |
| `docs/how-to/git_workflow.md`             | 日本語          | Gitワークフロー                               | 開発者             |
| `docs/how-to/testing.md`                  | 日本語          | テスト手順                                    | 開発者             |
| `docs/how-to/実装ルール.md`               | 日本語          | コーディング規約                              | 実装者             |
| `docs/how-to/android_ビルド手順.md`       | 日本語          | Androidビルド                                 | リリース担当       |
| `docs/how-to/ios_ビルド手順.md`           | 日本語          | iOSビルド                                     | リリース担当       |
| `docs/store-listing/README.md`            | **英語**        | ストア掲載構成                                | マーケ             |
| `scripts/store-screenshots/README.md`     | **英語**        | スクショパイプライン                          | マーケ             |

**英語のファイル: 12個** / **日本語のファイル: 15個**

---

## 2. 多角的議論：5つの視点からの検討

### 視点A：初心者ユーザー

**現状の問題点：**

1. `TEMPLATE_README.md`が英語 — 読めない・読みたくない
2. 前提知識が書いてない — Node.js？pnpm？そもそも何？
3. EAS Project IDの取得方法が不明 — setup.shで聞かれるけどどこで手に入れるの？
4. Dev Buildが必要という説明がゼロ — テンプレにはAdMob、RevenueCat、SQLiteなどネイティブモジュールが入っているため、Expo Goでは動かない
5. `quickstart.md`にNode >= 20と書いてあるが、実際は22が必要

### 視点B：シニアエンジニア

| 観点               | 評価  | 理由                                          |
| ------------------ | ----- | --------------------------------------------- |
| コード品質         | ★★★★★ | CI/CD、lint-staged、テスト24件、型チェック    |
| ドキュメント構造   | ★★★★☆ | Diataxis準拠、「正の置き場」哲学が優秀        |
| セットアップ体験   | ★★★☆☆ | setup.sh良いが、前後の説明不足                |
| サービス連携ガイド | ★★☆☆☆ | Sentryのみ。AdMob・RevenueCat・Supabaseが無い |
| 言語一貫性         | ★★☆☆☆ | 日英混在で対象読者が不明確                    |

### 視点C：DevOps/リリースマネージャー

**深刻な欠落：**

1. GitHub Secrets/Vars の一覧表がない
2. Android署名キーのバックアップ手順がない
3. Google Play Service Account の作成手順がない
4. OTA Update（EAS Update）のガイドがない

### 視点D：プロダクトオーナー

| フェーズ | 内容                   | ドキュメント                              | 評価 |
| -------- | ---------------------- | ----------------------------------------- | ---- |
| 0        | 前提条件（ツール導入） | quickstart.md (英語、Node版不整合)        | ⚠️   |
| 1        | GitHubからリポ作成     | README.md (英語)                          | ⚠️   |
| 2        | setup.sh実行           | TEMPLATE_README.md (英語)                 | ⚠️   |
| 3        | 初回開発実行           | quickstart.md (英語、Expo Go前提で間違い) | ❌   |
| 4        | アプリのカスタマイズ   | 実装ルール.md (日本語)                    | △    |
| 5        | サービス連携           | Sentryのみ (英語)                         | ❌   |
| 6        | テスト用ビルド         | ビルド手順 (日本語、一部)                 | △    |
| 7        | ストア準備             | screenshot/store-listing (英語)           | ⚠️   |
| 8        | 本番ビルド・提出       | ビルド手順 (日本語、一部)                 | △    |
| 9        | リリース後運用         | sentry_setup.md (英語)                    | ❌   |

### 視点E：テンプレート設計者（自分自身）

- 自分でも setup.sh 実行後に何をやるか、毎回思い出す必要がある
- サービス連携のセットアップを毎回ゼロから調べ直すことになる
- 英語ドキュメントを読み返す手間がある

---

## 3. 英語→日本語への改修対象（12ファイル）

| #   | ファイル                                  | 優先度   | 理由                       |
| --- | ----------------------------------------- | -------- | -------------------------- |
| 1   | `README.md`                               | **最高** | リポジトリの顔。最初に見る |
| 2   | `TEMPLATE_README.md`                      | **最高** | テンプレートの使い方本体   |
| 3   | `docs/how-to/quickstart.md`               | **最高** | 初回セットアップ手順       |
| 4   | `docs/how-to/debug-guide.md`              | 高       | デバッグ時に必ず見る       |
| 5   | `docs/how-to/sentry_setup.md`             | 高       | サービス連携               |
| 6   | `docs/how-to/screenshot-generation.md`    | 中       | リリース時に見る           |
| 7   | `docs/how-to/store-listing-guide.md`      | 中       | リリース時に見る           |
| 8   | `docs/store-listing/README.md`            | 中       | ストア掲載構成             |
| 9   | `docs/reference/feature_spec_template.md` | 低       | テンプレ的利用             |
| 10  | `docs/reference/tasks/lessons.md`         | 低       | 学びの記録                 |
| 11  | `scripts/store-screenshots/README.md`     | 低       | スクショ詳細               |
| 12  | `setup.sh`（出力メッセージ）              | 中       | 対話時の表示               |

---

## 4. 提案A：`template-usage-guide.md` の新規作成

**対象: Phase 0〜Phase 4のみ**（Phase 5以降は既存の個別ドキュメントに委譲）

### 構成案

```
Phase 0: 前提条件
  - 必要なツール一覧（各ツールのインストール方法）
  - Node.js 22、pnpm、Android Studio、Xcode、EAS CLI、Git
  - 各コマンドの意味（「pnpmとは何か」レベルから）

Phase 1: リポジトリ作成
  - GitHubの「Use this template」の使い方
  - git cloneの手順

Phase 2: 初期セットアップ（setup.sh）
  - EAS Project IDの取得方法（expo.devでの操作）
  - setup.shの各入力項目の意味と例
  - setup.shが内部でやっていること

Phase 3: 初回起動
  - 【重要】Expo Goでは動かない理由
  - Dev Build APKの作り方
  - デバイスでの起動確認

Phase 4: アプリのカスタマイズ
  - 削除すべきサンプルコード一覧
  - 画面の追加方法
  - DB テーブルの追加方法
  - i18nキーの追加方法
  - アイコン・スプラッシュの差し替え
```

---

## 5. 提案B：README.mdの日本語化方針

**決定: 日本語のみ**

理由:

- テンプレートは自分（doooooraku）が使うためのもの
- メンテナンスコスト最小
- 将来OSS化したくなったらその時に `README.en.md` を追加

---

## 6. 発見された問題点

| #   | 問題                                  | 深刻度 | 内容                                  |
| --- | ------------------------------------- | ------ | ------------------------------------- |
| 1   | Node版不整合                          | **高** | quickstart.mdに`>= 20`、実際は`22`    |
| 2   | Expo Go非対応の説明なし               | **高** | ネイティブモジュールありでExpo Go不可 |
| 3   | setup.sh矛盾メッセージ                | 低     | TEMPLATE_README.md削除後に参照        |
| 4   | Supabase中途半端                      | 中     | 依存にあるが未使用 → **削除決定**     |
| 5   | GitHub Secrets一覧なし                | **高** | CIが9個以上のsecrets/vars要求         |
| 6   | 署名キーバックアップ警告なし          | **高** | 紛失すると更新不可                    |
| 7   | RevenueCat entitlement名ハードコード  | 中     | `Pro_Plan`固定                        |
| 8   | EAS Project ID取得手順なし            | 中     | setup.shで聞かれる                    |
| 9   | Maestro smoke.ymlに`CHANGE_ME_APP_ID` | 中     | setup.sh後も残る可能性                |
| 10  | quickstart.mdがExpo Go前提            | **高** | ネイティブモジュール入りで不可        |

---

## 7. 優先度別アクションプラン

### 優先度S（必須）

1. `docs/how-to/template-usage-guide.md` 新規作成（日本語、Phase 0〜4）
2. `README.md` 日本語化
3. `TEMPLATE_README.md` 日本語化
4. `docs/how-to/quickstart.md` 日本語化 + Node版修正 + Expo Go警告追加

### 優先度A（重要）

5. 残りの英語ドキュメント8ファイルの日本語化
6. GitHub Secrets/Vars 一覧表の作成
7. setup.shのメッセージ日本語化 + バグ修正
8. Supabase依存の削除

### 優先度B（できればやる）

9. AdMob/RevenueCatのセットアップガイド追加
10. 署名キーバックアップ手順の追加
