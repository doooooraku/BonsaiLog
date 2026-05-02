# AdMob 広告セットアップガイド

AdMob バナー広告をアプリに統合する手順。`react-native-google-mobile-ads` を使用。

## 前提

- Google アカウントがある
- `ADR-0002-revenue-model.md` で収益モデルを決定済み
- Expo managed workflow で開発中

## 1. AdMob アカウント作成

1. [AdMob コンソール](https://apps.admob.com/) にアクセス
2. Google アカウントでログイン
3. 支払い情報を設定（銀行口座の紐付けは後からでも可）

## 2. アプリの登録

1. AdMob コンソール → アプリ → アプリを追加
2. プラットフォームごとに登録:
   - **Android**: パッケージ名 = `com.doooooraku.bonsailog`
   - **iOS**: バンドル ID = `com.doooooraku.bonsailog`
3. App ID をメモ（`ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY` 形式）

## 3. 広告ユニットの作成

1. AdMob コンソール → 広告ユニット → 広告ユニットを追加
2. バナー広告を選択
3. 広告ユニット名を設定（例: `home_banner`）
4. 広告ユニット ID をメモ（`ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ` 形式）
5. iOS と Android それぞれに作成する

## 4. 環境変数の設定

`.env` に以下を追加:

```dotenv
ADMOB_IOS_APP_ID=ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY
ADMOB_IOS_BANNER_ID=ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ
ADMOB_ANDROID_APP_ID=ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY
ADMOB_ANDROID_BANNER_ID=ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ
```

**開発時はテスト広告 ID を使用**:

- iOS バナー: `ca-app-pub-3940256099942544/2435281174`
- Android バナー: `ca-app-pub-3940256099942544/9214589741`

## 5. app.json の設定

`react-native-google-mobile-ads` の Config Plugin を追加:

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "YOUR_ANDROID_APP_ID",
          "iosAppId": "YOUR_IOS_APP_ID"
        }
      ]
    ]
  }
}
```

## 6. UMP 同意フロー（GDPR / EU 対応）

EU/EEA ユーザーには UMP（User Messaging Platform）同意フローが必要:

1. AdMob コンソール → プライバシーとメッセージ → ヨーロッパの同意
2. GDPR メッセージを作成・公開
3. アプリ側で `AdsConsent.requestInfoUpdate()` を呼ぶ
4. `pnpm ump:validate` で検証（`.github/workflows/ump-consent-validation.yml` 参照）

## 7. ストア申請時の注意

### Google Play

1. Play Console → アプリのコンテンツ → 広告
2. 「広告を含む」にチェック
3. データセーフティ: AdMob が収集するデータを申告

### App Store

1. App Store Connect → App Privacy
2. AdMob が収集するデータタイプを申告:
   - 使用状況データ（広告データ）
   - デバイス ID（IDFA）

## 8. テスト広告 → 本番切り替えチェックリスト

- [ ] `.env` のテスト ID を本番 ID に差し替え
- [ ] `prebuild-env-check.mjs` で ID 形式を検証
- [ ] Free でバナーが表示されることを確認
- [ ] Pro でバナーが表示されないことを確認
- [ ] UMP 同意ダイアログが EU 環境で表示されることを確認

## 9. ストア審査前チェックリスト (F-LEGAL-004 / ADR-0017 §⑦)

リリース直前に実機 (Pixel 7 / iPhone 13 等) で全 12 項目を確認し、PR description にエビデンスを添付する。

- [ ] AdMob テスト ID で動作確認 (本番 ID で開発しない)
- [ ] EEA デバッグ: `ADMOB_CONSENT_DEBUG_GEOGRAPHY=EEA` で UMP ダイアログ発火確認
- [ ] iOS: ATT ダイアログ発火確認 (`userTrackingUsageDescription` 表示)
- [ ] Privacy URL / Terms URL 公開済 + リンク動作確認 (`https://doooooraku.github.io/BonsaiLog/privacy/` / `https://doooooraku.github.io/BonsaiLog/terms/`)
- [ ] Pro 加入で広告非表示確認
- [ ] Pro 解約で広告再表示確認 (再起動後)
- [ ] 「許可しない」選択で non-personalized 広告配信確認
- [ ] Settings → 広告のプライバシー設定 で再選択ダイアログ表示確認 (EEA テスト時)
- [ ] PrivacyInfo.xcprivacy 同梱確認 (Issue #39 完了、PR #60 マージ済)
- [ ] Data Safety 宣言の Google Play Console 登録完了 ([data-safety-declaration.md](../../store-listing/data-safety/data-safety-declaration.md) から転記)
- [ ] App Store Connect 提出: ATT / Privacy URL 登録完了
- [ ] Google Play Console 提出: Data Safety + Privacy URL 登録完了

### 連動

- ADR-0017 (統合 ADR — ATT / UMP / Privacy URL / Privacy Manifest / Data Safety / チェックリスト)
- Issue #37 (F-LEGAL-001 ATT/UMP 配線)
- Issue #39 (F-LEGAL-003 iOS Privacy Manifest、完了)
- Issue #40 (F-LEGAL-004 本セクション + Data Safety 宣言)

## 参考リンク

- [react-native-google-mobile-ads](https://docs.page/invertase/react-native-google-mobile-ads)
- [AdMob テスト広告](https://developers.google.com/admob/android/test-ads)
- [UMP SDK](https://developers.google.com/admob/android/privacy)
