# iOS Privacy Manifest 検証手順（人間検証）

最終更新: 2026-05-02（JST）

> この文書は **人間が実機 / Xcode で検証する手順** をまとめたものです。
> 自動化（pnpm verify）でカバーできない iOS App Store 提出前の最終確認を扱います。
> 関連 ADR: `docs/adr/ADR-0017-store-compliance-att-ump-privacy.md` §⑤

---

## 1. 背景

iOS 17+ で必須化された Privacy Manifest (`PrivacyInfo.xcprivacy`) を BonsaiLog アプリに同梱し、
ストア審査をクリアする。`app.config.ts` の `ios.privacyManifests` を経由して Expo Config Plugin
（`@expo/config-plugins` の `withPrivacyInfo`）が prebuild 時に
`ios/<projectName>/PrivacyInfo.xcprivacy` を生成する。

宣言済み項目（ADR-0017 §⑤21 準拠）:

- `NSPrivacyAccessedAPITypes`
  - `NSPrivacyAccessedAPICategoryUserDefaults` (CA92.1)
  - `NSPrivacyAccessedAPICategoryFileTimestamp` (C617.1)
  - `NSPrivacyAccessedAPICategorySystemBootTime` (35F9.1)
  - `NSPrivacyAccessedAPICategoryDiskSpace` (E174.1)
- `NSPrivacyTracking: true`（AdMob 利用のため）
- `NSPrivacyTrackingDomains`: 7 ドメイン（doubleclick.net 等の AdMob 配信ドメイン）

Google Mobile Ads SDK / UserMessagingPlatform.xcframework は SDK 自身の
`PrivacyInfo.xcprivacy` を同梱しているが、Apple の仕様上 **アプリ側 Manifest は SDK の宣言を継承しない**。
そのため、AdMob 関連トラッキングドメインはアプリ側で明示宣言する必要がある。

---

## 2. ローカル prebuild で xcprivacy が生成されるか確認

### 2-1. prebuild 実行

```bash
PATH=/usr/bin:/bin:/home/doooo/.nvm/versions/node/v22.22.2/bin:$PATH \
  npx expo prebuild --platform ios --clean
```

### 2-2. 生成ファイル確認

```bash
ls -la ios/BonsaiLog/PrivacyInfo.xcprivacy
cat ios/BonsaiLog/PrivacyInfo.xcprivacy
```

期待結果:

- ファイルが存在する
- `NSPrivacyTracking` が `<true/>` として書かれている
- `NSPrivacyTrackingDomains` 配列に 7 ドメインが含まれる
- `NSPrivacyAccessedAPITypes` 配列に 4 種別が含まれる

### 2-3. Xcode プロジェクト統合確認

```bash
grep -A 3 "PrivacyInfo" ios/BonsaiLog.xcodeproj/project.pbxproj | head
```

期待結果: `PrivacyInfo.xcprivacy` がリソースとして追加されている。

---

## 3. ローカルビルド（`pnpm build:ios:local` 相当、Mac のみ — ※script 未整備、iOS 配信準備時に追加予定）

### 3-1. ローカル iOS ビルド実行

```bash
PATH=/usr/bin:/bin:$PATH \
  npx eas-cli@latest build -p ios --profile development --local --output dist/app-dev.ipa
```

### 3-2. ipa 内に PrivacyInfo.xcprivacy が同梱されているか確認

```bash
mkdir -p /tmp/ipa-extract
unzip -o dist/app-dev.ipa -d /tmp/ipa-extract
find /tmp/ipa-extract -name "PrivacyInfo.xcprivacy" | head
```

期待結果: 以下が見つかる:

- `/tmp/ipa-extract/Payload/BonsaiLog.app/PrivacyInfo.xcprivacy` （アプリ側、自分で宣言したもの）
- `/tmp/ipa-extract/Payload/BonsaiLog.app/Frameworks/GoogleMobileAds.xcframework/.../PrivacyInfo.xcprivacy` （SDK 同梱）
- `/tmp/ipa-extract/Payload/BonsaiLog.app/Frameworks/UserMessagingPlatform.xcframework/.../PrivacyInfo.xcprivacy` （SDK 同梱）

---

## 4. Xcode Organizer でアーカイブ確認

1. Xcode を起動 → Window → Organizer
2. 該当アプリのアーカイブを選択
3. 右パネルで **Privacy Report** ボタンをクリック
4. レポートに以下が含まれているか確認:
   - 自分で宣言した API 利用理由（4 種別）
   - AdMob SDK が宣言した API 利用理由 + tracking domains
   - アプリ側 NSPrivacyTrackingDomains に宣言したドメイン（7 件）
5. 警告 / エラーが 0 件であること

---

## 5. App Store Connect 提出時の確認

### 5-1. 提出前チェック

1. Xcode → Distribute App → App Store Connect
2. アップロード時、以下が表示されないこと:
   - "Missing Privacy Manifest" 警告
   - "Required Reason API" missing 警告
   - "NSPrivacyTracking is true but NSPrivacyTrackingDomains is empty" 警告

### 5-2. 提出後 App Store Connect での確認

1. App Store Connect → アプリ → TestFlight or 提出ビルド
2. ビルド一覧 → 該当ビルド → Build Metadata → **Privacy Report**
3. 以下を確認:
   - **Required Reason APIs**: 4 種別すべて該当する `Reason` コードが表示される
   - **Tracking Domains**: アプリ側 7 ドメイン + SDK 同梱ドメインが表示される
   - **Tracking**: `Yes` （`NSPrivacyTracking: true` 由来）
4. 警告ゼロで「ビルド使用可」状態になること

---

## 6. リリース毎の確認チェックリスト

`react-native-google-mobile-ads` のバージョンアップ毎、または半年に 1 回以下を確認:

- [ ] `react-native-google-mobile-ads` の release notes で Privacy Manifest 関連変更を確認
- [ ] 新しい AdMob トラッキングドメインが SDK 同梱 Manifest に追加されていないか
- [ ] `app.config.ts` `NSPrivacyTrackingDomains` を更新する必要があるか
- [ ] Apple の `NSPrivacyAccessedAPICategory*` Reason コード一覧に変更がないか確認
- [ ] 上記 §3 / §4 で実機検証 + Xcode Organizer 確認

---

## 7. トラブルシューティング

### 7-1. App Store Connect で「Privacy Manifest is missing」

**原因**: prebuild で `PrivacyInfo.xcprivacy` が生成されていない、もしくは Xcode プロジェクトに resource として登録されていない。

**対処**:

1. `ios/` フォルダを削除して `expo prebuild --clean` で再生成
2. `app.config.ts` の `ios.privacyManifests` を確認
3. `@expo/config-plugins` のバージョンを確認（55.x で `withPrivacyInfo` サポート済み）

### 7-2. 「NSPrivacyTrackingDomains required」警告

**原因**: `NSPrivacyTracking: true` を宣言したが、`NSPrivacyTrackingDomains` が空 or 未宣言。

**対処**:

1. `app.config.ts` の `NSPrivacyTrackingDomains` 配列に最低 1 ドメイン宣言
2. 現状は AdMob 関連 7 ドメインを宣言済み（doubleclick.net など）

### 7-3. 「Required Reason API used without declaring reason」警告

**原因**: アプリが利用している API について `NSPrivacyAccessedAPITypes` に該当 Reason コードが宣言されていない。

**対処**:

1. Xcode Organizer の Privacy Report で警告対象 API を確認
2. Apple の [Required Reason APIs](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api) で該当 Reason コードを確認
3. `app.config.ts` `NSPrivacyAccessedAPITypes` 配列に追加

---

## 8. 参考リンク（一次情報）

- [Apple Privacy Manifest Files](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files)
- [Apple Required Reason APIs](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api)
- [Google Mobile Ads iOS Privacy](https://developers.google.com/admob/ios/privacy)
- [Expo Config: ios.privacyManifests](https://docs.expo.dev/versions/latest/config/app/)
- ADR-0017: `docs/adr/ADR-0017-store-compliance-att-ump-privacy.md`
- AdMob 配線手順: `docs/how-to/development/admob_advertising_setup.md`
