# BonsaiLog（盆栽台帳）

Expo SDK 55 + React Native 0.83.4 で作る、樹種 × 地域気候 × 作業履歴を鉢 1 本ずつ一生分記録するオフライン完結の盆栽台帳アプリ。

> プロダクト戦略は `docs/explanation/product_strategy.md`、機能仕様は `docs/reference/basic_spec.md` / `docs/reference/functional_spec.md` を参照。

## クイックスタート

```bash
pnpm install
pnpm dev
```

## 含まれているもの

| カテゴリ           | 内容                                                         |
| ------------------ | ------------------------------------------------------------ |
| **フレームワーク** | Expo 55, React Native 0.83.4, New Architecture               |
| **UI**             | React Native 標準コンポーネント, React Navigation            |
| **状態管理**       | Zustand + AsyncStorage (persist)                             |
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
