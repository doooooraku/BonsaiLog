# クイックスタートガイド

## 重要: Expo Go では動作しません

このテンプレートには AdMob、RevenueCat、SQLite などのネイティブモジュール（Native Module）が含まれているため、Expo Go では動作しません。アプリを実行するには、必ず開発ビルド（Dev Build）を作成してください。開発ビルドの作り方は「ビルド」セクションを参照してください。

## 必要なもの

- Node.js 22 以上（nvm の利用をおすすめします）
- pnpm（`npm install -g pnpm`）
- Android Studio（Android 開発用）
- Xcode（iOS 開発用、macOS のみ）
- EAS CLI（`npm install -g eas-cli`）

## 初期セットアップ

```bash
# 1. リポジトリをクローンして移動
git clone <your-repo-url>
cd <your-project>

# 2. 依存パッケージをインストール
pnpm install

# 3. 環境設定ファイルをコピー
cp .env.example .env
# .env を開いて、API キーを入力してください

# 4. すべて正しく動くか確認
pnpm verify
```

## 開発の流れ

### Android（実機）

```bash
# ワンコマンドで起動（ADB 確認・ポート転送・Metro 起動をまとめて行います）
pnpm dev:android

# 手動で行う場合:
adb devices                          # デバイスが接続されているか確認
adb reverse tcp:8081 tcp:8081       # ポート転送
pnpm dev                            # Metro を起動
```

### Android（エミュレータ）

```bash
pnpm dev
# Metro で 'a' キーを押すと Android エミュレータで開きます
```

### iOS（シミュレータ、macOS のみ）

```bash
pnpm dev
# Metro で 'i' キーを押すと iOS シミュレータで開きます
```

## ビルド

### 開発ビルド（Dev Build）（dev-client 用）

```bash
# ローカルビルド
eas build -p android --profile development --local

# クラウドビルド
eas build -p android --profile development
```

### プレビュービルド（Preview Build）（テスト用）

```bash
eas build -p android --profile preview
```

### 本番ビルド（Production Build）

```bash
eas build -p android --profile production
```

## デバッグ

```bash
# デバッグセッションを開始（ログ・スクリーンショット・録画を記録します）
pnpm debug:start

# ... アプリを操作する ...

# セッションを終了してデータを回収
pnpm debug:stop

# リアルタイムのクラッシュ監視
pnpm monitor
```

## テスト

```bash
# ユニットテスト
pnpm test

# E2E テスト（ビルド済み APK + エミュレータまたは実機が必要です）
pnpm test:e2e
```
