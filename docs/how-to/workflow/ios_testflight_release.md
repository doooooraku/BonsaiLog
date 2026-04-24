# iOS TestFlight リリース手順

CI/CD での TestFlight 自動提出と、App Store 公開までのワークフロー。

## 前提

- Apple Developer Program メンバーシップ（年間 $99）
- App Store Connect にアプリが登録済み
- ASC API Key が発行済み

## 1. 初回セットアップ（1 回のみ）

### 1-1. ASC API Key の作成

1. [App Store Connect → ユーザーとアクセス → 統合 → キー](https://appstoreconnect.apple.com/access/integrations/api)
2. 「キーを生成」→ 名前: `CI-Build`、ロール: `App Manager`
3. `.p8` ファイルをダウンロード（1 回のみ）
4. Key ID と Issuer ID をメモ

### 1-2. GitHub Secrets に登録

```
ASC_API_KEY_P8_BASE64  = base64 -i AuthKey_XXXXXX.p8
ASC_API_KEY_ID         = XXXXXX
ASC_API_KEY_ISSUER_ID  = xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
EXPO_TOKEN             = expo login で取得
```

### 1-3. EAS の設定

```bash
eas credentials --platform ios
```

Apple Developer アカウントとの紐付け、証明書・プロビジョニングプロファイルの設定を行う。

## 2. CI/CD による自動提出

`v*` タグを push すると `.github/workflows/build-ios-testflight.yml` が自動実行:

```bash
# バージョンタグを作成
git tag v1.0.0
git push --tags
```

ワークフローの流れ:

1. `pnpm install` → lint/type-check/test
2. `eas build --platform ios --profile production --local`
3. `eas submit --platform ios --path app.ipa`
4. ビルドサマリーを GitHub Actions に出力

## 3. 手動ビルド & 提出

CI を使わない場合:

```bash
# ローカルビルド
eas build --platform ios --profile production --local --output app.ipa

# TestFlight に提出
eas submit --platform ios --path app.ipa
```

## 4. TestFlight での確認

1. App Store Connect → TestFlight → ビルドを確認
2. 「暗号化コンプライアンス」:
   - `usesNonExemptEncryption: false` が `app.json` に設定済みなら自動スキップ
   - 未設定の場合は手動で回答が必要（ADR-0005 参照）
3. 内部テスターグループにビルドを配布
4. 実機で動作確認

## 5. App Store 公開

1. App Store Connect → アプリ → バージョン
2. TestFlight で検証済みのビルドを選択
3. ストア掲載情報を最終確認
4. 「審査に提出」

## チェックリスト

### ビルド前

- [ ] `pnpm verify` が通る
- [ ] `.env` に本番の環境変数が設定されている
- [ ] `usesNonExemptEncryption: false` が `app.json` に設定されている
- [ ] リリースノートが全言語で準備済み
- [ ] fastlane/metadata/ が最新

### 提出後

- [ ] TestFlight にビルドが表示された
- [ ] 「Missing Compliance」が表示されない
- [ ] 内部テスターでインストール・起動を確認
- [ ] 広告・課金フローが正常に動作

### App Store 公開後

- [ ] ストアページでアプリが公開されている
- [ ] 実機でダウンロード・起動を確認
- [ ] Git タグを作成: `git tag v1.x.x && git push --tags`

## トラブルシューティング

### 「Missing Compliance」が毎回表示される

- `app.json` の `expo.ios.config.usesNonExemptEncryption` を `false` に設定する
- 詳細は `docs/adr/ADR-0005-ios-encryption-compliance.md` を参照

### TestFlight でレビューダイアログが表示されない

- Apple の仕様で TestFlight ビルドでは `SKStoreReviewController.requestReview()` は動作しない
- App Store Production 版か Xcode dev ビルドで検証する

### EAS Submit が失敗する

- `eas credentials --platform ios` で証明書の有効性を確認
- ASC API Key が `App Manager` ロールを持っているか確認
- `.p8` ファイルが正しくエンコードされているか確認: `echo $ASC_API_KEY_P8_BASE64 | base64 -d | head -1` で `BEGIN PRIVATE KEY` が表示されること
