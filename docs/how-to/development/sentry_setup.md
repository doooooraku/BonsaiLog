# Sentry セットアップガイド

## 概要

[Sentry](https://sentry.io/) は、リアルタイムでクラッシュレポートやエラー監視を行うサービスです。
無料プランでは月 5,000 エラーまで対応でき、初期段階のアプリには十分です。

## 必要なもの

- Sentry のアカウントと、https://sentry.io で作成したプロジェクト
- Sentry DSN（Project Settings > Client Keys から確認できます）

## インストール

```bash
pnpm add @sentry/react-native
```

## 設定

### 1. `.env` に DSN を追加する

```env
SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
```

### 2. `app.config.ts` に追加する

`plugins` 配列に以下を追加します:

```ts
[
  '@sentry/react-native/expo',
  {
    organization: process.env.SENTRY_ORG ?? '',
    project: process.env.SENTRY_PROJECT ?? '',
  },
],
```

`extra` セクションに以下を追加します:

```ts
sentryDsn: process.env.SENTRY_DSN ?? '',
```

### 3. アプリのエントリポイントで初期化する

`app/_layout.tsx` に以下を追加します:

```ts
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

Sentry.init({
  dsn: Constants.expoConfig?.extra?.sentryDsn ?? '',
  enabled: !__DEV__,
});
```

### 4. EAS ビルドでソースマップ（Source Map）を設定する

`eas.json` のビルドプロファイルに以下を追加します:

```json
"production": {
  "env": {
    "SENTRY_AUTH_TOKEN": "your-auth-token"
  }
}
```

## 動作確認

1. プレビュー APK をビルドする
2. エラーを発生させる（例: `throw new Error('Sentry test')`）
3. Sentry のダッシュボードでエラーイベントが表示されるか確認する
4. ソースマップが正しく適用されているか確認する

## 注意点

- 開発中のノイズを避けるため、`__DEV__` モードでは Sentry は無効になります
- 本番環境では `SENTRY_AUTH_TOKEN` を `.env` ではなく EAS Secret として保存してください
- クラッシュ時にわかりやすい画面を表示するために、エラーバウンダリ（Error Boundary）コンポーネントの追加を検討してください
