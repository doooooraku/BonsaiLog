# IAP セットアップチェックリスト (Sess81、 ADR-0009 + ADR-0043 Amendment)

> **目的**: 新規アプリのリリース時、 もしくは IAP 動線で「価格利用不可」 「購入に失敗しました」 等のテスター苦情が来たときに、 漏れなく現状確認 + 修復するための 12 ステップ + トラブルシューティング Q&A。
>
> **対象**: BonsaiLog / Repolog / app-factory 派生アプリ。
>
> **更新履歴**: 2026-06-09 Sess81 で初版作成 (= ADR-0043 §「スコープ外」 を消化する form 化)。

---

## チェックリスト 12 ステップ

### Step 1: RevenueCat Dashboard アカウント

- [ ] https://app.revenuecat.com/ にログイン可能
- [ ] 該当アプリの project が存在 (= `list-projects` で確認、 BonsaiLog なら `projed4e672d`)

### Step 2: Apps 登録 (iOS / Android)

- [ ] iOS app: `bundle_id` がアプリの `IOS_BUNDLE_IDENTIFIER` (= `.env`) と完全一致
- [ ] Android app: `package_name` がアプリの `ANDROID_PACKAGE` (= `.env`) と完全一致
- [ ] iOS: `app_store_connect_api_key_configured: true` + `subscription_key_configured: true`
- [ ] Android: Google Play Service Account JSON 登録済 (= `docs/01_key/02_PlayStore/*.json` をアップロード)

### Step 3: Products 登録 (= ストア商品の RC への import)

- [ ] iOS 3 商品: `bonsailog_pro_monthly` (subscription) / `_annual` (subscription) / `_lifetime` (non_consumable)
- [ ] Android 3 商品: `bonsailog_pro:monthly` (subscription P1M) / `:annual` (subscription P1Y) / `bonsailog_pro_lifetime` (one_time)
- [ ] 全 6 商品が `state: active`

### Step 4: Entitlement 作成

- [ ] `premium` (lookup_key = `premium`) で 1 つだけ作成、 `state: active`
- [ ] 上記 6 商品全部を `premium` に Attach (= `mcp__revenuecat__list-entitlements` で products に 6 件出るか)

### Step 5: Offering + Package 紐付け

- [ ] Offering `default` (lookup_key = `default`) 1 つだけ作成、 `is_current: true`
- [ ] Package: `$rc_monthly` / `$rc_annual` / `$rc_lifetime` 3 つ
- [ ] 各 Package に iOS + Android の対応 product を attach (= 計 6 attach)

### Step 6: API Keys 取得 + `.env` 反映

- [ ] Android Public API キー (`goog_xxxxx...`) を `REVENUECAT_ANDROID_API_KEY` に
- [ ] iOS Public API キー (`appl_xxxxx...`) を `REVENUECAT_IOS_API_KEY` に
- [ ] `.env.example` に接頭辞コメント追加 (= 取り違え事故防止、 R-68 候補)

### Step 7: Play Console - Products Active 化

- [ ] **Monetize > Products > Subscriptions** > `bonsailog_pro` > monthly / annual basePlan を **Active**
- [ ] **Monetize > Products > In-app products** > `bonsailog_pro_lifetime` を **Active** (= Sess47-48 で DRAFT のまま残りやすい)

### Step 8: Play Console - **販売地域 (Country/region availability) を全 175 国に**

> ⚠️ **Sess81 罠**: `google_create_products.py` 実行時、 意図は「USD 基準で全地域自動換算」 だが Google 側で region 1 つだけ (例: MN) が個別 entry として登録されてしまうことがある。 結果として `Purchases.getOfferings()` が `current=null` → Paywall「利用不可」。
>
> ⚠️ **修復は API 不可**: Google Android Publisher API は「既存 region の削除」 を拒否する (= 既存購読者保護)。 Play Console UI 経由でのみ修正可能。

- [ ] Subscriptions > `bonsailog_pro` > monthly basePlan > **Edit** > **Pricing & availability** > **Country/region availability** > **Select all regions** > Save
- [ ] **Sess81 user 詰まり教訓**: territory ON 直後は「価格を設定してください」 エラーで保存不可。 **画面右上「Set prices」 → USD 価格入力 (= monthly $3.99 / annual $29.99 / lifetime $69.99) → 「他の通貨に自動的に換算」 ON → Apply** → 全 173 国の価格が自動入力されてから「変更を保存」
- [ ] Subscriptions > `bonsailog_pro` > annual basePlan > 同上 (= USD $29.99)
- [ ] In-app products > `bonsailog_pro_lifetime` > **Pricing & availability** > **Country/region availability** > **Select all regions** > Save (= USD $69.99)

> 💡 **Sess82 PR-D 適用後の新規アプリ**: `python3 scripts/store-automation/google_create_products.py --commit` 1 発で全 175 国 territory が明示登録される (= MN-only 罠ゼロ化)。 本 Step 8 手動操作は **Sess81 以前の既存アプリ修復時のみ** 必要。

### Step 9: Play Console - **License Testing 登録**

- [ ] **Settings > License testing** にテスター全員 (BonsaiLog は 12 人) の Google アカウント email を email list 形式で追加
- [ ] **License response = `RESPOND_NORMALLY`** を選択 → Save
- [ ] テスター個人が `https://play.google.com/apps/testing/<package_name>` 等の **opt-in URL** をクリック済

### Step 10: Play Console - **Closed Testing rollout 状態**

- [ ] Testing > Closed testing (Alpha) で対象 versionCode が **「Available to testers」** 状態
- [ ] **Countries / regions** に Japan (+ テスター在住国全部) が含まれている

### Step 11: Play Console - **Payments profile 提出済**

- [ ] **Setup > Payments profile** で銀行情報 + 納税情報が **Active** (= 未提出だと商品が販売開始できない、 RC 公式が「empty offerings の原因」 として列挙)

### Step 12: **24 時間プロパゲーション待ち**

- [ ] 商品を Active 化 + Country availability 設定後、 **24h 経過してから** テスター案内
- [ ] 早ければ 2-3 時間で反映されるが、 24h 保険として明記
- [ ] テスター案内文に「アプリを開いて価格が表示されない場合は数時間〜24h 待ってから再度開いてください」 を入れる

---

## トラブルシューティング Q&A

### Q1: 「価格利用不可」 と Paywall に表示される

**最頻原因 (Sess81 で判明)**: Play Console 側の **availability.territories が一部の国** に限定されている (= 上記 Step 8 の罠)。

**確認方法 (RC MCP)**:

```
mcp__revenuecat__get-product-store-state(project_id, product_id)
```

レスポンスの `common.availability.territories` を確認。 175 国未満なら異常。

**修復**: Step 8 の「Select all regions」 を user が Play Console UI から実行。 24h 待つ。

### Q2: 「購入に失敗しました。 後でもう一度お試しください。」 ダイアログ

**原因 1**: 上記 Q1 と同じ (= offerings null → Package not found)。

**原因 2 (アプリ側)**: `BillingError` 経由で原因別分岐すべきところ、 万能エラー `purchaseFailed` を投げている。 Sess81 PR の修正で `priceUnavailableStorePreparing` / `purchaseErrorOfferingsEmpty` に分岐済。

### Q3: License Tester でも「購入が許可されていません」

**原因**: テスターが Play Console > Settings > License testing に登録されていない、 もしくは opt-in URL を踏んでいない。 Step 9 を再確認。

### Q4: RevenueCat MCP で「Product store state plans are currently a limited beta feature and are not available for this project.」

**原因**: 該当 RC project が limited beta に opt-in していない。 RC support に申請するか、 Play Console UI 経由 / Google Android Publisher API 直接 PATCH で対応。

### Q5: Google Android Publisher API で「Cannot remove region once it has been added」

**原因**: 既存 `regionalConfigs` 配列から entry を削除しようとしている。 Google の既存購読者保護で API 経由削除不可。

**修復**: Play Console UI 経由 で region を追加 (= 削除ではなく追加) する。 もしくは archive → 再作成 (= 既存購読者がいない場合のみ可)。

### Q6: テスター 12 人が build を引けない

**原因**: Closed Testing rollout が「Draft」 のまま、 もしくは Countries に対象国が含まれていない、 もしくはテスターが opt-in URL を踏んでいない。 Step 10 + Step 9 を再確認。

---

## 関連 ADR / 仕組み

- **ADR-0009** (RevenueCat billing 基盤): Sess81 Amendment で本チェックリスト参照を追加
- **ADR-0043** (ストア商品 API 自動作成): Sess81 Amendment で「territory 罠」 + 「API 経由 region 削除不可」 を明文化、 §「スコープ外」 を本チェックリスト で完了化
- **ADR-0049** (Pro 機能境界): Sess81 PR-9 で 7 項目 (定期予定 ⑦ 追加) 反映済
- **R-68 候補** (Sess82 起票予定): 外部サービス連携機能 (課金 / 広告 / 解析 / 法務) は preflight smoke test 配線済が ADR Accepted 必須条件
- **scripts/store-automation/google_expand_territories.py** (Sess81 新規): 試行記録 + verbose error 取得、 dry-run / --commit / --skip-subscription / --skip-onetime フラグ

---

## 量産時のテンプレート反映 (= app-factory)

- [ ] `template/app_template/.mcp.json` に RevenueCat MCP 設定追加済 (= Sess81 で実施、 全プロジェクト即時利用可)
- [ ] `template/app_template/.claude/CLAUDE.md` または本チェックリストへのリンクを新規アプリ README に転記
- [ ] `scripts/store-automation/google_create_products.py` の `regionPrices` 構造を「全地域明示」 に拡張する RFC (= Sess82 候補、 Sess47-48 の MN-only 罠の構造解決)
