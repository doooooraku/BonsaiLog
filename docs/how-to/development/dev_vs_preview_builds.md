# Dev Build vs Preview Build の使い分け

EAS Build の 2 つのビルドプロファイルの違いと使い分け。

## 概要

| 項目             | Dev Build (`development`)    | Preview Build (`preview`)         |
| ---------------- | ---------------------------- | --------------------------------- |
| 用途             | 日常の開発・デバッグ         | QA テスト・社内配布               |
| Metro バンドラー | 接続あり（ホットリロード可） | 接続なし（自己完結型）            |
| デバッグメニュー | あり（シェイクで開く）       | なし                              |
| パフォーマンス   | 開発モード（遅い）           | リリースモードに近い（速い）      |
| 配布方法         | USB / 同一 WiFi              | EAS リンク / QR コード            |
| ストア提出       | 不可                         | 不可（production プロファイル要） |

## いつ Dev Build を使うか

- 新機能の実装中（ホットリロードで高速イテレーション）
- React DevTools / Flipper でのデバッグ
- `console.log` の出力確認
- コンポーネントの見た目調整

```bash
# ローカル Dev Build
pnpm build:android:dev:local
pnpm build:ios:dev:local

# EAS クラウド Dev Build
eas build --profile development --platform android
```

## いつ Preview Build を使うか

- QA テスト（本番に近いパフォーマンスで動作確認）
- チームメンバーへの配布（Metro 不要で動作）
- ストア提出前の最終確認
- 広告・課金フローの本番 ID でのテスト

```bash
# ローカル Preview Build
pnpm build:android:apk:local

# EAS クラウド Preview Build
eas build --profile preview --platform android
```

## いつ Production Build を使うか

- ストアに提出する最終ビルド
- App Store / Google Play に公開する APK/AAB/IPA

```bash
# ローカル Production Build
pnpm build:android:aab:local

# EAS クラウド Production Build
eas build --profile production --platform ios
```

## eas.json のプロファイル構成

```jsonc
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
    },
    "production": {
      "autoIncrement": true,
    },
  },
}
```

## 判断フローチャート

```
コードを書いている？ → Yes → Dev Build
  ↓ No
テスターに配布する？ → Yes → Preview Build
  ↓ No
ストアに提出する？ → Yes → Production Build
```

## 注意事項

- Dev Build と Preview/Production は**別アプリとしてインストール**される（applicationIdSuffix が異なる場合）
- Preview Build では `__DEV__` が `false` になる — 開発専用コードは実行されない
- 環境変数は `.env` から読み込まれる — ビルドプロファイルごとに切り替えが必要な場合は `eas.json` の `env` セクションを使用
