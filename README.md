# App Factory テンプレート

Expo SDK 55 + React Native 0.83.4 の全部入りテンプレートです。

> **このテンプレートを使う方へ** セットアップの手順は [TEMPLATE_README.md](TEMPLATE_README.md) をご覧ください。

## クイックスタート

```bash
# 1. このテンプレートから新しいリポジトリを作成（GitHub の「Use this template」ボタン）
# 2. クローンしてセットアップスクリプトを実行
bash setup.sh

# 3. 開発を始める
pnpm dev
```

## 含まれているもの

| カテゴリ           | 内容                                                         |
| ------------------ | ------------------------------------------------------------ |
| **フレームワーク** | Expo 55, React Native 0.83.4, New Architecture               |
| **UI**             | Tamagui v1, React Navigation                                 |
| **状態管理**       | Zustand + persist, React Query                               |
| **データ**         | expo-sqlite（マイグレーション対応）                          |
| **多言語対応**     | 19 言語（expo-localization + 独自システム）                  |
| **収益化**         | RevenueCat（サブスクリプション）、AdMob + UMP（広告）        |
| **CI/CD**          | GitHub Actions（verify、Maestro smoke、Dependabot）          |
| **品質管理**       | ESLint, Prettier, lint-staged, pre-commit hooks              |
| **テスト**         | Jest（ユニット）、Maestro（E2E）                             |
| **スクリプト**     | デバッグツール、dev-start、i18n 監査、スクショパイプライン   |
| **EAS**            | ビルドプロファイル（dev/preview/production）、Submit、Update |
| **ドキュメント**   | Diataxis 構成、ADR テンプレート、PR テンプレート             |

## 環境変数（Environment Variables）

アプリ固有の値はすべて `.env` から読み込みます。一覧は `.env.example` を参照してください。

**必須**（未設定だと起動時にエラー）:

- `APP_NAME`, `APP_SLUG`, `IOS_BUNDLE_IDENTIFIER`, `ANDROID_PACKAGE`

**任意**（サービスキー）:

- AdMob ID、RevenueCat キー、Sentry DSN、利用規約 URL、EAS 設定

## プロジェクト構成

```
app/              # Expo Router ページ（ファイルベースルーティング）
src/
  core/           # i18n、デバッグユーティリティ
  db/             # SQLite データベース層
  features/       # 機能ごとの垂直スライス
  services/       # ビジネスロジックサービス
  stores/         # Zustand ステートストア
  types/          # TypeScript 型定義
scripts/          # 開発・ビルドスクリプト
plugins/          # Expo 設定プラグイン
docs/             # ドキュメント（Diataxis 構成）
__tests__/        # ユニットテスト
maestro/          # E2E テストフロー
```
