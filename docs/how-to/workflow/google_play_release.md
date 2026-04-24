# Google Play ストアリリース手順

Google Play Console でのアプリ公開ワークフロー。

## 前提

- Google Play Console アカウントが有効
- アプリが Google Play Console に登録済み
- EAS Build でプロダクションビルドが可能

## 1. 初回セットアップ（1 回のみ）

### 1-1. Google Play Console でアプリ作成

1. [Google Play Console](https://play.google.com/console/) → アプリを作成
2. アプリ名、デフォルト言語、アプリ/ゲーム種別を設定
3. コンテンツ評価アンケートに回答

### 1-2. ストア掲載情報の入力

1. メインのストア掲載情報 → タイトル、説明、スクリーンショットを入力
2. カテゴリとタグを設定
3. 連絡先情報（メール、プライバシーポリシー URL）を入力

### 1-3. 署名キーの設定

1. Play Console → セットアップ → アプリの署名
2. Google Play アプリ署名に登録（推奨）
3. アップロード鍵を生成 or EAS が生成したものを使用

## 2. ビルド

```bash
# ローカルビルド（AAB 形式）
pnpm build:android:aab:local

# または EAS クラウドビルド
eas build --profile production --platform android
```

## 3. ビルドのアップロード

### 方法 A: EAS Submit（推奨）

```bash
eas submit --platform android --path ./app.aab
```

### 方法 B: Play Console から手動アップロード

1. Play Console → リリース → 製品版
2. 新しいリリースを作成
3. AAB ファイルをアップロード

## 4. リリースノートの作成

1. Play Console → リリースノートを追加
2. 全対応言語でリリースノートを記載
3. `docs/how-to/workflow/release_notes_template.md` のテンプレートを使用

## 5. 審査提出

1. 内容を確認 → 「審査に送信」
2. 審査は通常 1〜3 日（初回は長い場合あり）

## 6. 段階的公開（推奨）

初回リリース後は段階的公開を活用:

1. 10% → 1〜2 日様子を見る
2. 50% → クラッシュ率・レビューを確認
3. 100% → 問題なければ全体公開

## チェックリスト

### ビルド前

- [ ] バージョン番号を更新（`eas.json` の `autoIncrement` が有効か確認）
- [ ] `.env` に本番の環境変数が設定されている
- [ ] `pnpm verify` が通る
- [ ] リリースノートが全言語で準備済み

### アップロード後

- [ ] Play Console でビルドが正常にアップロードされた
- [ ] コンテンツ評価が最新
- [ ] データセーフティが最新
- [ ] 価格と配布地域が正しい

### リリース後

- [ ] ストアページでアプリが公開されている
- [ ] 実機でダウンロード・起動を確認
- [ ] クラッシュレポートを確認（Play Console → 品質）
- [ ] Git タグを作成: `git tag v1.x.x && git push --tags`

## トラブルシューティング

### 「署名が一致しません」エラー

- アップロード鍵と Play Console の鍵が一致しているか確認
- EAS Build のキーストアが正しいか `eas credentials` で確認

### 審査リジェクト

- リジェクト理由を確認（Play Console → ポリシーステータス）
- 広告に関するポリシー違反が多い — データセーフティの申告漏れを確認
