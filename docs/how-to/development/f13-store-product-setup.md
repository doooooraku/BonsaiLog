# F-13 Phase 0 — App Store / Google Play / RevenueCat 登録手順

> **対象**: F-13 課金 (#20) の Phase 0 子 Issue #57 で必要な人間タスク手順書。  
> **目的**: Sandbox PoC ([./f13-rc-10x-poc.md](./f13-rc-10x-poc.md)) を実施するための前提条件 (Product / Entitlement / API キー) を整える。  
> **要件**: ADR-0009 §Decision の Product ID 命名 / Entitlement / Offering / API キー注入ルールに従う。

---

## 0. 全体像

```
[Apple App Store Connect]              [Google Play Console]
    bonsailog_pro_monthly                  bonsailog_pro_monthly
    bonsailog_pro_yearly         +         bonsailog_pro_yearly
    bonsailog_pro_lifetime                 bonsailog_pro_lifetime
                ↓                                  ↓
              [RevenueCat Dashboard]
              Entitlement: premium
              Offering:    default
              Package:     monthly / annual / lifetime
                          ↓
                    [BonsaiLog アプリ]
                    REVENUECAT_IOS_API_KEY
                    REVENUECAT_ANDROID_API_KEY
                    (3 箇所更新: .env / eas env / .env.example)
```

---

## 1. App Store Connect で 3 プラン Product 登録 (iOS)

### 1.1 サブスクリプションを 2 件 (月額 + 年額)

App Store Connect → My Apps → BonsaiLog → 機能 (Features) → アプリ内課金 (In-App Purchases) → Subscriptions

1. **Subscription Group**: `BonsaiLog Pro` を新規作成 (1 グループ内に月額 + 年額を入れる、グループ内の昇格 / 降格を Apple が自動処理)
2. **月額**:
   - Product ID: `bonsailog_pro_monthly` (**ADR-0009 §3 命名規則必須、短縮禁止**)
   - Reference Name: `BonsaiLog Pro Monthly`
   - 期間: 1 Month
   - 価格: ¥500 (Tier 5、19 言語各通貨 Apple 自動換算)
   - Display Name (19 言語): 「BonsaiLog Pro 月額」(ja) など
   - Description (19 言語): ADR-0009 + product_strategy.md の 4 機能訴求 (写真無制限 / 樹種計算 / CSV/PDF / 広告非表示 等)
3. **年額**:
   - Product ID: `bonsailog_pro_yearly`
   - Reference Name: `BonsaiLog Pro Yearly`
   - 期間: 1 Year
   - 価格: ¥3,980 (Tier 40 相当)
   - 「33% お得」訴求は Display Name に含めず、Paywall 側 (Phase 2) で表示
4. **Family Sharing**: トグル **OFF** で固定 (ADR-0009 §183、v2.x で再評価。一度 ON にすると無効化不可)

### 1.2 買い切り (Non-Consumable IAP) 1 件

App Store Connect → 機能 → アプリ内課金 → IAP

1. Product ID: `bonsailog_pro_lifetime`
2. Reference Name: `BonsaiLog Pro Lifetime`
3. Type: **Non-Consumable**
4. 価格: ¥9,800 (Tier 75 相当)
5. **Family Sharing**: OFF (買い切りも v1.0 は OFF 固定)
6. Display Name / Description: 「BonsaiLog Pro 買い切り」+ 「一度のお支払いで永久利用」訴求

### 1.3 共通設定

- [ ] 全 3 Product を **Ready to Submit** 状態にする (Localizations / Review Information / Pricing 全埋め)
- [ ] App Review 用の Screenshot を 19 言語各 1 枚アップロード (Paywall 画面、Phase 2 完了後に差し替え)
- [ ] Privacy Policy URL: `https://doooooraku.github.io/BonsaiLog/privacy/` を App Store Connect → App Privacy に登録 (ADR-0017 §16)

---

## 2. Google Play Console で 3 プラン Product 登録 (Android)

### 2.1 Subscription を 2 件

Google Play Console → BonsaiLog → 収益化 (Monetization) → 商品 (Products) → サブスクリプション

1. **月額**:
   - Product ID: `bonsailog_pro_monthly`
   - Name: `BonsaiLog Pro Monthly`
   - Base Plan: `monthly` (Auto-renewing、1 Month)
   - 価格: ¥500 (国別自動展開)
2. **年額**:
   - Product ID: `bonsailog_pro_yearly`
   - Name: `BonsaiLog Pro Yearly`
   - Base Plan: `yearly` (Auto-renewing、1 Year)
   - 価格: ¥3,980

### 2.2 Non-Consumable (One-time IAP) 1 件

Google Play Console → 収益化 → 商品 → アプリ内アイテム

1. Product ID: `bonsailog_pro_lifetime`
2. Name: `BonsaiLog Pro Lifetime`
3. 価格: ¥9,800
4. Type: Non-consumable

### 2.3 内部テスト追加

- [ ] 全 3 商品を **Active** にする (Localizations 全埋め)
- [ ] Internal Testing トラックに Tester アカウントを追加 (License Tester、5 分で期限切れ可)

> **注意**: Android は買切で Family Library 対応が技術的に可能だが、v1.0 では **OFF** 固定 (ADR-0009 §304、v2.x 再評価)。

---

## 3. RevenueCat Dashboard で Entitlement / Offering / Package 設定

### 3.1 プロジェクト追加

1. RevenueCat (https://app.revenuecat.com) にログイン
2. Project: `BonsaiLog` を新規作成
3. Apps を 2 件追加:
   - iOS: Bundle ID `com.dooooraku.bonsailog`
   - Android: Package Name `com.dooooraku.bonsailog`

### 3.2 ストア接続

1. iOS: App Store Server API Key (App Store Connect → Users and Access → Keys) を生成し、Apple In-App Purchase Key として RevenueCat にアップロード
2. Android: Google Play Service Account JSON (Google Cloud → IAM → Service Accounts、Pub/Sub Subscriber + Android Publisher 権限) を RevenueCat にアップロード

### 3.3 Entitlement

- ID: `premium` (**ADR-0009 §44 命名必須、固定値**)
- Display Name: `Premium`
- Description: `Pro 機能 (写真無制限 + CSV/PDF + 広告非表示 等)`

### 3.4 Products → Entitlement への紐付け

- `bonsailog_pro_monthly` → Entitlement: `premium`
- `bonsailog_pro_yearly` → Entitlement: `premium`
- `bonsailog_pro_lifetime` → Entitlement: `premium`

### 3.5 Offering

- ID: `default` (**ADR-0009 §44 命名必須**、これが `Purchases.getOfferings().current` で返る)
- Display Name: `BonsaiLog Pro`
- Packages:
  - `$rc_monthly` → Product `bonsailog_pro_monthly`
  - `$rc_annual` → Product `bonsailog_pro_yearly` (RevenueCat 規約上 `annual` キー、`yearly` ではない)
  - `$rc_lifetime` → Product `bonsailog_pro_lifetime`

### 3.6 API キー取得

- Project Settings → API Keys から **Public iOS SDK Key** と **Public Android SDK Key** をコピー
- これを §4 で BonsaiLog に注入する

---

## 4. EAS environment へ API キー注入 (3 箇所更新ルール)

> Repolog `lessons.md` L427-437 由来 — RC API キーは **`.env` / `eas env:create` / `.env.example` の 3 箇所** を更新しないと、ローカル開発と EAS production build で挙動が分かれる。

### 4.1 ローカル `.env` 更新

```bash
# .env (gitignore 済、コミット禁止)
REVENUECAT_IOS_API_KEY=appl_xxxxxxxxxxxxxxx
REVENUECAT_ANDROID_API_KEY=goog_xxxxxxxxxxxxxxx
IAP_DEBUG=1
```

### 4.2 EAS environment 登録 (production / preview / development)

```bash
eas env:create --environment production --name REVENUECAT_IOS_API_KEY --value appl_xxxx --secret
eas env:create --environment production --name REVENUECAT_ANDROID_API_KEY --value goog_xxxx --secret
eas env:create --environment preview     --name REVENUECAT_IOS_API_KEY --value appl_xxxx --secret
eas env:create --environment preview     --name REVENUECAT_ANDROID_API_KEY --value goog_xxxx --secret
eas env:create --environment development --name REVENUECAT_IOS_API_KEY --value appl_xxxx --secret
eas env:create --environment development --name REVENUECAT_ANDROID_API_KEY --value goog_xxxx --secret
```

確認:

```bash
eas env:list --environment production
eas env:list --environment preview
eas env:list --environment development
```

### 4.3 `.env.example` のキー枠を最新化 (既に存在、再確認のみ)

```bash
# RevenueCat
REVENUECAT_ANDROID_API_KEY=
REVENUECAT_IOS_API_KEY=
```

> 既に `.env.example` には枠あり (確認済)。値は **絶対にコミットしない**。

---

## 5. DPA 締結 (リリース前必須、Phase 4 で実施)

> Phase 0 では枠のみ。Phase 4 で実署名 + Privacy Policy への反映。

1. RevenueCat → https://www.revenuecat.com/gdpr で DPA テンプレートを取得
2. 法人 / 個人事業主の署名欄に記入し、RevenueCat に提出
3. 受領後、Privacy Policy 19 言語に「課金管理に RevenueCat を使用、匿名 ID のみ送信、データは EU/US サーバーに保管」を追記 (ADR-0009 §17)
4. App Store Connect / Google Play Console の Privacy URL から該当ページに到達できることを確認

---

## 6. 完了の判定基準 (Phase 0 PoC 着手前)

- [ ] App Store Connect: 3 プラン全て **Ready to Submit**
- [ ] Google Play Console: 3 プラン全て **Active**、Internal Testing 追加済
- [ ] RevenueCat: Entitlement `premium` + Offering `default` + 3 Package 紐付け済
- [ ] iOS / Android API Key 取得済
- [ ] `.env` ローカル / EAS environment (production / preview / development) / `.env.example` の 3 箇所 API キー枠が最新
- [ ] iOS Sandbox tester / Android License Tester アカウント作成済
- [ ] PoC ([./f13-rc-10x-poc.md](./f13-rc-10x-poc.md)) §2 シナリオ全て実施可能な状態

---

## 7. 関連リンク

- 親 Issue: [#20](https://github.com/doooooraku/BonsaiLog/issues/20)
- Phase 0 子 Issue: [#57](https://github.com/doooooraku/BonsaiLog/issues/57)
- ADR-0009 §Decision §1-19 (3 プラン構成 / Entitlement / Offering / Product ID 命名 / API キー注入 / DPA)
- ADR-0017 (App Store / Google Play 提出時の Privacy URL 必須)
- PoC 検証手順: [./f13-rc-10x-poc.md](./f13-rc-10x-poc.md)
- Repolog `lessons.md` L427-437 (RC API キー 3 箇所更新ルール、踏襲必須)
- RevenueCat Dashboard: https://app.revenuecat.com
- App Store Connect: https://appstoreconnect.apple.com
- Google Play Console: https://play.google.com/console
- EAS env CLI: https://docs.expo.dev/eas/environment-variables/
