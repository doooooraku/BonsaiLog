# iOS TestFlight 配信手順 + トラブルシュート

最終更新: 2026-06-13 (Sess106)
関連: ADR-0050 Sess106 Amendment / `.claude/skills/release-ios/SKILL.md`

---

## 0. ざっくり全体像 (3 分でわかる)

iPhone にアプリを届ける流れは「**お弁当を Apple マンションに届ける**」 のと同じ:

1. **お弁当 (.ipa) を作る** — GitHub Actions の Mac サーバーで EAS が作る
2. **配達伝票 (= ASC API Key) を見せて受付通過** — Apple App Store Connect の受付
3. **試食コーナー (= TestFlight) に並べる** — Apple が processing して 10-15 分で並ぶ
4. **試食者 (= テスター) に通知** — 内部テスター max 100 名は即時、外部テスターは Beta App Review 1-2 日

`/release-ios` Skill が 1 コマンドで ①②③ を自動化、 ④ は user 手作業 (内部テスター追加だけ App Store Connect で 1 回)。

---

## 1. 用語集 (= わからなくなったらここ)

| 略称                         | 正式名                        | 意味 (小中学生にもわかる)                                                                              |
| ---------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| **TestFlight**               | Apple TestFlight              | iPhone 用アプリの「**試食配信サービス**」。完成前のアプリをテスターに先行配布できる                    |
| **IPA (.ipa)**               | iOS App Archive               | iPhone 用アプリの「**おにぎり (お弁当)**」。Apple に提出する実体                                       |
| **EAS**                      | Expo Application Services     | Expo 社が提供する「**アプリビルド代行業者**」。Mac 持ってなくてもおにぎりを作ってくれる                |
| **ASC**                      | App Store Connect             | Apple の「**アプリ管理ダッシュボード**」。https://appstoreconnect.apple.com                            |
| **ASC API Key**              | App Store Connect API Key     | ASC を機械から操作するための「**会員カード (.p8 ファイル + Key ID + Issuer ID)**」                     |
| **Distribution Certificate** | iOS Distribution Certificate  | 「このアプリは○○さんが作りました」 と押す「**実印**」                                                  |
| **Provisioning Profile**     | プロビジョニング プロファイル | 「この特定のアプリを iPhone に入れて良い」 という「**引換券**」。Bundle ID ごとに必要                  |
| **Bundle ID**                | Bundle Identifier             | アプリの「**ID 名**」。BonsaiLog は `com.dooooraku.bonsailog`                                          |
| **ascAppId**                 | App Store ID                  | App Store Connect 上でアプリに割り当てられる「**数字の ID**」。BonsaiLog は `6763495229`               |
| **Apple Team ID**            | Apple Developer Team ID       | 開発者個人/法人の「**チーム番号**」。BonsaiLog は `HSH4HJ72Y8`                                         |
| **Privacy Manifest**         | PrivacyInfo.xcprivacy         | iOS 17+ で必須の「**個人情報利用宣言ファイル**」                                                       |
| **macos-15**                 | macOS Sequoia                 | GitHub Actions が提供する Mac サーバーのバージョン名                                                   |
| **`eas build --local`**      | EAS local build               | EAS の Cloud サーバーを使わず、 自分の (= macOS runner 上の) Xcode で build。 月 30 回上限を消費しない |

---

## 2. 初回フロー (Claude が代行)

### 2-1. user が用意するもの (= 既に揃ってる)

すべて確認済み:

- [x] Apple Developer Program 加入 (= 年 $99) — Sess47 課金商品作成で実働中
- [x] App Store Connect 上で BonsaiLog アプリ登録 — `ascAppId=6763495229`
- [x] ASC API Key 発行 (= `App Manager` ロール、Key ID `6768KZU85A`)
- [x] `.p8` ファイル (`docs/01_key/01_AppStore/App Store Connect API/AuthKey_6768KZU85A.p8`)
- [x] `.env` に iOS 用キー (`ADMOB_IOS_*` / `REVENUECAT_IOS_API_KEY` / `IOS_BUNDLE_IDENTIFIER`)
- [x] BonsaiLog repo public 確定 (= macOS runner 無料)

### 2-2. Claude が代行する作業

1. **eas.json 編集** (Sess106 で完了): `submit.production.ios` 4 フィールド追加
2. **`.github/workflows/build-ios-testflight.yml` 改修** (Sess106 で完了): macos-15 + `--local` + Privacy Manifest 検証 + `--wait` 等 12 step
3. **`/release-ios` Skill 起票** (Sess106 で完了): 8 Phase
4. **GitHub Secrets 6 個 + Variables 2 個 一括投入** (Sess106 で実施予定): user 承認のもと `gh secret set` / `gh variable set` 代行

### 2-3. user が一度だけやる作業

**= 何もしない** (Apple ID 入力すら不要、ASC API Key で完全自動)

強いて言えば:

- 初回 build 完了後、 App Store Connect → TestFlight → 内部テスト → 自分自身を内部テスターに追加 (3 分)

---

## 3. リリースフロー (毎回)

### 3-1. Claude に依頼

```
「iOS リリース」「TestFlight に上げて」 と言うだけ
```

→ `/release-ios` Skill 起動、 Phase 0-7 完遂。

### 3-2. 所要時間目安

| Phase     | 内容                                  | 時間            |
| --------- | ------------------------------------- | --------------- |
| Phase 0-2 | 開始確認 / verify / preflight         | ~5 分           |
| Phase 3   | GitHub Actions build + submit (cloud) | 25-35 分        |
| Phase 4   | TestFlight processing 完了確認        | 10-15 分        |
| Phase 6   | User report                           | ~1 分           |
| **合計**  |                                       | **約 40-55 分** |

### 3-3. リリース後の user 手作業 (= 1 分以下)

- (内部テスト) App Store Connect → TestFlight → 該当 build → 内部テスター登録済グループに追加 (= 1 クリック)
- (任意外部テスト) Beta App Review 申請 (= 1 クリック、Apple 審査 1-2 日)

---

## 4. トラブルシュート

### 4-1. build fail: "Provisioning Profile not found"

**原因**: 初回 build 時に EAS が BonsaiLog 専用 Provisioning Profile を Apple Developer Portal から自動生成中で、 反映待ち。

**対処**:

1. 5 分待って workflow を `gh workflow run build-ios-testflight.yml` で再起動
2. それでも fail なら `EXPO_APPLE_TEAM_ID` / `EXPO_APPLE_TEAM_TYPE` env が GitHub Variables に登録されているか確認 (`gh variable list`)
3. ASC API Key のロールが `App Manager` 以上か確認 (= ASC > ユーザーとアクセス > 統合 > App Store Connect API)

### 4-2. submit fail: "Missing Compliance"

**原因**: `app.config.ts` の `ios.config.usesNonExemptEncryption` が `false` でないため、Apple が暗号化コンプライアンス書類を求めている。

**対処**: ADR-0005 に従い、 `app.config.ts` で `ios.config.usesNonExemptEncryption: false` を確認。

### 4-3. submit fail: "Missing Privacy Manifest"

**原因**: IPA に `PrivacyInfo.xcprivacy` が同梱されていない。

**対処**:

1. `app.config.ts` の `ios.privacyManifests` 配列が定義されているか確認 (ADR-0017 §⑤)
2. workflow yml の「Verify Privacy Manifest inclusion」 step が fail していないか確認
3. ローカルで `npx expo prebuild --platform ios --clean && ls ios/BonsaiLog/PrivacyInfo.xcprivacy` で生成確認 (`docs/how-to/development/ios-privacy-manifest-validation.md` §2)

### 4-4. processing fail: "Invalid Binary"

**原因**: App Store Connect の processing 中に Apple が「このビルドは使えない」 と判断。

**対処**:

1. ASC ダッシュボードの Activity ログを確認 (Apple からのメール通知あり)
2. よくある原因:
   - bitcode 関連 (= Xcode 16 では bitcode 非対応、 EAS が正しく無効化しているはず)
   - 64-bit only でない (= 古い Xcode で稀)
   - エクスポート オプションの mismatch (= EAS 自動なので稀)
3. 上記でも未解決なら、Claude が ASC API で `buildBundles` を取得して詳細を user に提示

### 4-5. ビルド時間超過 (> 60 min)

**原因**: macos runner cold start + CocoaPods install + Xcode archive で稀に発生。

**対処**:

1. workflow `timeout-minutes: 90` に拡大済 (Sess106)、 通常は 30-40 分で完了
2. 1 時間超なら一旦 cancel し、`gh workflow run` で再起動
3. 連続失敗時は `actions/cache` で Pods キャッシュを追加検討

### 4-6. Beta App Review 却下

**原因**: 外部テスター向け Beta App Review で Apple 審査が却下 (= 内部テスト max 100 名は審査不要、影響なし)。

**対処**:

1. Apple Reviewer フィードバックを ASC > TestFlight > 該当 build > レビュー詳細で確認
2. よくある却下理由:
   - クラッシュ報告未対応 (= Sentry 配線推奨)
   - メタデータ不一致 (= スクリーンショットと実機差分)
   - プライバシーポリシー URL 動作不良 (= ADR-0017 §④)
3. 修正後に再申請 (= Beta App Review の修正は 1-2 日)

---

## 5. 案 A (EAS Cloud Build) への切替 (将来用)

Sess106 は案 B (macos-15 + `--local`) を採用したが、 将来 Cloud build に戻す場合の最小変更:

```yaml
# .github/workflows/build-ios-testflight.yml
- runs-on: macos-15
+ runs-on: ubuntu-latest

- run: eas build --platform ios --profile production --local --non-interactive --output=dist/app.ipa
+ run: eas build --platform ios --profile production --non-interactive
+   # output は EAS Cloud から自動 DL される
```

Cloud build に切替えると:

- ✅ ubuntu-latest = Linux runner (macos-15 より起動が速い)
- ⚠️ EAS Free 月 30 回上限を消費 (= PoC 多発時は注意)
- ✅ Xcode 互換性は EAS 保守

---

## 6. よくある質問

### Q1. 「macos-15 が突然壊れたらどうなる?」

GitHub が runner image 更新時に Xcode 互換性問題を出すことが稀にあります。 その場合:

1. 月 1 回、 Claude が macos-16 への移行検討を口頭で提示
2. 緊急時は `macos-15` を `macos-15-large` (Apple Silicon) に切替えて回避できることもある
3. 最悪は案 A (= EAS Cloud Build) にフォールバック (= 上記 §5)

### Q2. 「月 30 回上限って実際そんなに使うの?」

通常リリースは月 5-10 回未満。 でも「Privacy Manifest 検証で何度も rebuild」 のような PoC では 1 日 5-10 回試すことも。 案 B (= `--local`) なら制限ゼロ。

### Q3. 「macOS runner って Public repo で本当に無料?」

公式: https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions

> "GitHub Actions usage is free for both public repositories and self-hosted runners."  
> Public repo は **macOS runner を無制限に無料利用可能**。 minute 制限なし。

### Q4. 「証明書を Expo サーバーに預けるのが不安」

EAS の credentials 管理は Expo の Enterprise 顧客も使う仕組みで、 信頼性は高い。 もし不安なら案 C (fastlane match で自前管理) もあるが、 個人開発では over-engineering。 ADR-0050 Sess106 Amendment で「EAS サーバー委譲」 を恒久方針として固定。

---

## 7. 関連リンク (1 次情報)

- [Expo Docs: Run EAS Build locally with local flag](https://docs.expo.dev/build-reference/local-builds/) — `--local` が cloud quota 非消費の根拠
- [Expo Docs: Submit to the Apple App Store](https://docs.expo.dev/submit/ios/) — eas submit ios の公式
- [Expo Docs: Trigger builds from CI](https://docs.expo.dev/build/building-on-ci/) — CI 自動化の公式
- [Apple Developer: App Store Connect API](https://developer.apple.com/documentation/appstoreconnectapi) — ASC API の公式
- [Apple Developer: TestFlight](https://developer.apple.com/testflight/) — TestFlight の公式
- [Apple Developer: Privacy Manifest Files](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files) — Privacy Manifest の公式
- [GitHub Docs: macos-15 runner image](https://github.com/actions/runner-images/blob/main/images/macos/macos-15-Readme.md) — macos-15 同梱ソフト一覧
