# billing-setup-automation.md — Claude 自動実行手順 (RevenueCat 課金まわり)

> **役割**: Phase 8 (= 課金設定) のうち、 Claude Code が API / RevenueCat MCP / 自作 Python スクリプトで自動実行する Phase 1 / 3 / 5 / 7 / 8 の完全実行手順。 人間が能動的にやる作業は Notion 「Phase 8 課金設定」 ページ、 トラブル時の確認手順は `iap-setup-checklist.md` を参照する。
>
> **読者**: Claude Code (自動実行時の SoT)、 および「Claude が何をやっているか」 を把握したい人間。
>
> **由来**: ADR-0043 (Store Product API Automation) + Sess47-48 実績 + Sess81 territory 罠発覚 + Sess82 PR-D 構造解決 + Sess107 までの累積知見。
>
> **作成日**: 2026-06-14 (= Notion Phase 8 改修と同時)。

---

## 0. 役割棲み分け (= 3 つの SoT)

| 場所                                              | 役割                                     | 主たる読者      |
| ------------------------------------------------- | ---------------------------------------- | --------------- |
| Notion 「Phase 8 課金設定」 純化版                | アプリ別 4 ステップ (能動)               | 人間            |
| `iap-setup-checklist.md` (Sess81 起源、 触らない) | トラブル時 12 ステップ + Q&A 6 つ (受動) | 人間 (修復時)   |
| **本ファイル**                                    | Phase 1/3/5/7/8 自動実行手順 (機械)      | **Claude Code** |

---

## 0.5. /goal 形式の呼び出しテンプレート (= 完了条件付き、 Notion Phase 8 純化版と同期)

ユーザーが Notion Phase 8 ページからコピペして呼び出すコマンドのテンプレート。 本ファイルと内容を同期させ、 Claude が「途中離脱せず Phase 8 健康診断の全 6 条件達成まで走り切る」 ことを構造的に担保する。

```
/goal RevenueCat 課金まわりの完全配線

具体: docs/how-to/release/billing-setup-automation.md の手順で
Phase 1 (RC 箱 + 公開キー) / Phase 3 (ストア商品 6 作成) / Phase 5 (RC 配線) /
Phase 7 (Apple メタデータ) / Phase 8 (健康診断) を自動実行。

完了条件 (= Phase 8 健康診断、 mcp__revenuecat__get-product-store-state で全 6 商品確認):
  ① Apple monthly subscription: raw_store_status = READY_TO_SUBMIT
  ② Apple annual subscription: raw_store_status = READY_TO_SUBMIT
  ③ Apple lifetime non_consumable: raw_store_status = READY_TO_SUBMIT
  ④ Google subscription basePlan monthly: state = ACTIVE
  ⑤ Google subscription basePlan annual: state = ACTIVE
  ⑥ Google onetime product lifetime: state = ACTIVE

全 6 条件達成で完了報告。 途中で人間作業 (Notion Phase 8 純化版 Step 1-4 =
Google JSON アップ / Apple S2S URL / Google S2S 設定 / RC 購入記録確認)
が必要になったら案内して一時停止。

製品 ID は不可逆 (作成後変更・削除不可) → --commit 前に必ず --dry-run で
user 承認待ち。 RC 公開キー / .p8 / Google JSON の中身は log/memory/commit
に出さないこと。
```

### Claude 側の挙動契約 (= /goal を受けた時の Claude の振る舞い)

1. **前提チェック失敗時**: §1 の前提条件 (鍵存在 / config 設定 / Phase 2 完了 / RC MCP 接続) を確認し、 1 つでも欠ければ user に欠落項目を提示して abort
2. **不可逆操作前**: Apple/Google の `apple_create_products.py` / `google_create_products.py` を呼ぶ前に必ず `--dry-run` で作成予定を提示 → user の `--commit` 承認待ち
3. **人間作業待ち**: Phase 3/5 後に Notion Step 1 (Google JSON アップロード) が完了していないと Phase 8 健康診断の Google 側が ACTIVE にならない可能性 → 該当時は Notion Phase 8 純化版の URL を案内して一時停止
4. **完了判定**: `mcp__revenuecat__get-product-store-state` を 6 商品に対し実行、 全 6 条件達成を verbatim で報告 (= 条件 ①〜⑥ それぞれに対し ✅/❌ + 実値)
5. **失敗時の対応**: 1 商品でも未達成なら原因を §9 (Sess48 で発覚した罠) と `iap-setup-checklist.md` から特定し、 修復手順を user に提示 (= 自動修復は dry-run まで、 commit は user 承認)

---

## 1. 前提条件 (Claude が自動実行する前にチェックする項目)

```bash
# 鍵の存在確認 (app-factory 共通)
ls docs/01_key/01_AppStore/AppStoreConnect\ API/AuthKey_*.p8     # Apple ASC API
ls docs/01_key/01_AppStore/InAppPurchaseKey/SubscriptionKey_*.p8 # Apple IAP
ls docs/01_key/02_PlayStore/*.json                                # Google Service Account

# 設定ファイル
ls scripts/store-automation/config.<app>.json                     # アプリ別の値
cat scripts/store-automation/config.<app>.json | jq '.apple.bundleId, .google.packageName'

# Phase 2 (AAB upload) 完了の証拠
python3 scripts/store-automation/google_get_track_status.py       # alpha/internal track に AAB あるか

# RevenueCat MCP 接続確認
# (実行時に mcp__revenuecat__list-projects を 1 回叩く)
```

**前提が満たされていなければ abort + user に欠落項目を提示**。

---

## 2. 自動実行する 5 Phase の全体像

```
Phase 1: RC に箱を作る (project + app + 公開キー)
   │
   ▼
[ Phase 2: AAB を Play Console に upload (= 👤 人間が `/release-android` で実行) ]
   │
   ▼
Phase 3: ストア商品を一括作成 (Apple 3 + Google 3)
   │  ├─ Apple ASC API 直叩き (apple_create_products.py)
   │  └─ Google Android Publisher API 直叩き (google_create_products.py)
   │
   ▼
[ Phase 4: Apple = RC に合鍵投入 (本ファイル) / Google = 👤 RC ダッシュボード手動 ]
   │  └─ Apple のみ: mcp__revenuecat__update-app で ASC API キー投入
   │
   ▼
Phase 5: RC で entitlement / offering / package を配線
   │  ├─ create-product ×6
   │  ├─ create-entitlement (lookup_key=premium)
   │  ├─ attach-products-to-entitlement
   │  ├─ create-offering (lookup_key=default)
   │  ├─ create-packages ×3 ($rc_monthly / $rc_annual / $rc_lifetime)
   │  └─ attach-products-to-package ×6
   │
   ▼
Phase 7: Apple 商品メタデータを完成 (MISSING_METADATA → READY_TO_SUBMIT)
   │  ├─ set-product-store-state: availability (全 175 国) → price → 審査メモ
   │  ├─ equalize-subscription-prices (base=US) で月/年の全 175 国価格自動補完
   │  └─ get-product-store-state-operation で succeeded まで poll
   │
   ▼
Phase 8: 健康診断 (配線が正しいか機械確認)
      └─ get-product-store-state で Apple 3=READY_TO_SUBMIT / Google 3=ACTIVE 確認
```

---

## 3. Phase 1: RevenueCat に箱と公開キーを作る

### なぜ最初か

本番 AAB (= Phase 2) に **RevenueCat 公開 SDK キー** を埋め込む必要がある。 これが空だと `scripts/prebuild-env-check.mjs` で AAB build が即停止する。 順序として Phase 1 → Phase 2 → Phase 3 が固定。

### コマンド

```
mcp__revenuecat__create-project(name=<アプリ名>)
  → 戻り値の project ID を保持 (例: projed4e672d)

mcp__revenuecat__create-app(project_id=<上>, type=app_store, bundle_id=<iOS bundle>)
  → 戻り値の iOS app ID (例: app288b3baccf)

mcp__revenuecat__create-app(project_id=<上>, type=play_store, package_name=<Android pkg>)
  → 戻り値の Android app ID (例: appff0185c07e)

mcp__revenuecat__list-app-public-api-keys(project_id=<上>, app_id=<iOS app>)
  → appl_xxxxx... (= REVENUECAT_IOS_API_KEY)

mcp__revenuecat__list-app-public-api-keys(project_id=<上>, app_id=<Android app>)
  → goog_xxxxx... (= REVENUECAT_ANDROID_API_KEY)
```

### DoD (= 完了の証拠)

- `.env` に `REVENUECAT_IOS_API_KEY=appl_...` と `REVENUECAT_ANDROID_API_KEY=goog_...` が埋まっている (Claude が `.env` を書き換える、 git ignored)
- `scripts/prebuild-env-check.mjs` が pass する

### 罠

| 罠                                       | 原因                               | 回避                                   |
| ---------------------------------------- | ---------------------------------- | -------------------------------------- |
| AAB build が即停止                       | RC 公開キーが空のまま Phase 2 開始 | 本 Phase を必ず Phase 2 より先に完了   |
| MCP `create-app` で「project not found」 | project_id をハードコードした      | 上の `create-project` 戻り値を毎回読む |

---

## 4. Phase 3: ストア商品を一括作成

### 前提: Phase 2 (AAB Play Console upload) 完了

**Google 買い切り (one-time product) は BILLING 権限入り AAB が Play Console の internal/alpha/production track に存在しないと作成不可** (= Google 側の構造ガード)。 Sess47 で実際に踏んだ罠、 Sess48 で AAB upload 後に再実行で成功。

Claude は本 Phase の前に必ず以下で Phase 2 完了を確認:

```bash
python3 scripts/store-automation/google_get_track_status.py
# → alpha track に versionCode N の AAB が見える = OK
# → 空なら abort + user に「/release-android を先に実行してください」 と提示
```

### コマンド (Apple: 月/年サブスク + 買い切り)

```bash
# 1. dry-run で作成予定を提示
python3 scripts/store-automation/apple_create_products.py --config config.<app>.json
# → 作成予定の 3 商品 (subscription_monthly / _annual / non_consumable_lifetime) を表示

# 2. user 承認後、 commit
python3 scripts/store-automation/apple_create_products.py --config config.<app>.json --commit
# → 製品 ID 不変、 タイポは取り返しがつかないため --commit は必ず user 承認後
```

### コマンド (Google: サブスク basePlan + 買い切り)

```bash
# 1. dry-run
python3 scripts/store-automation/google_create_products.py --config config.<app>.json
# → 作成予定: subscription (basePlan monthly + annual) + onetime product (lifetime)

# 2. user 承認後、 commit
python3 scripts/store-automation/google_create_products.py --config config.<app>.json --commit
# → Sess82 PR-D 反映済: 全 175 国 territory 明示展開 + Lifetime ACTIVE 自動化
```

### DoD

- Apple ASC で 3 商品 (monthly subscription / annual subscription / lifetime non_consumable) が作成済 (state=MISSING_METADATA、 これは正常)
- Google Play で `<app>_pro` subscription (basePlan monthly + annual) が ACTIVE
- Google Play で `<app>_pro_lifetime` onetime product が ACTIVE
- 全 175 国 territory + 価格が登録済 (Sess82 PR-D 構造解決)

### 罠

| 罠                                       | 原因                                             | 回避                                                                                                          |
| ---------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Google 買い切りが「権限不足」 で作成失敗 | AAB 未 upload (Phase 2 不完全)                   | google_get_track_status.py で事前確認                                                                         |
| Google 既存 region 削除拒否 (400)        | regionalConfigs から既存 region を消そうとした   | Sess82 PR-D で全 175 国新規追加方式に。 既存壊れアプリは Play Console UI 修復 (iap-setup-checklist.md Step 8) |
| Apple 価格 equalize が失敗               | availability (販売地域) 未設定で価格設定を呼んだ | apple_create_products.py が「availability → price」 順を強制                                                  |
| 商品 ID タイポで永遠に修正不可           | config.<app>.json の typo                        | --dry-run で必ず確認、 --commit は user 承認後のみ                                                            |

---

## 5. Phase 4 部分自動: Apple 合鍵を RC に渡す

Google サービスアカウント JSON のアップロードは RC ダッシュボードに `update-app` 経由の項目が無いため Claude には不可能。 Notion 純化版 Step 1 で人間が手動。

### コマンド (Apple のみ)

```
mcp__revenuecat__update-app(
  project_id=<Phase1>,
  app_id=<iOS app>,
  app_store_connect_api_key={
    key_id=<docs/01_key/01_AppStore/AppStoreConnect API/KeyID>,
    issuer_id=<同 IssuerID>,
    p8_key=<.p8 ファイル中身>
  },
  subscription_key={
    key_id=<docs/01_key/01_AppStore/InAppPurchaseKey/KeyID>,
    issuer_id=<同 IssuerID>,
    p8_key=<.p8 ファイル中身>
  },
  shared_secret=<App 共有シークレット>
)
```

### DoD

```
mcp__revenuecat__get-app(project_id=<>, app_id=<iOS>)
  → app_store_connect_api_key_configured: true
  → subscription_key_configured: true
```

### 罠

- **p8 key を memory / log / commit に出さない** (CLAUDE.md §0 プライバシー禁則)
- shared_secret は ASC > Apps > 該当 App > App-specific shared secret から user 取得済の値を使う

---

## 6. Phase 5: RC で entitlement / offering / package を配線

### 順序 (RevenueCat 公式推奨)

「商品 → entitlement → 紐付け → offering/package」。 順序を逆にすると `create-product` 時に「unknown product」 で失敗する (= 前提として Phase 3 完了が必須)。

### コマンド

```
# 1. RC に商品を import (= Phase 3 で作った商品 ID を RC に教える)
mcp__revenuecat__create-product(project_id=<>, app_id=<iOS>, store_identifier=<app>_pro_monthly, type=subscription)
mcp__revenuecat__create-product(project_id=<>, app_id=<iOS>, store_identifier=<app>_pro_annual, type=subscription)
mcp__revenuecat__create-product(project_id=<>, app_id=<iOS>, store_identifier=<app>_pro_lifetime, type=non_consumable)
mcp__revenuecat__create-product(project_id=<>, app_id=<Android>, store_identifier=<app>_pro:monthly, type=subscription)
mcp__revenuecat__create-product(project_id=<>, app_id=<Android>, store_identifier=<app>_pro:annual, type=subscription)
mcp__revenuecat__create-product(project_id=<>, app_id=<Android>, store_identifier=<app>_pro_lifetime, type=one_time)

# 2. entitlement 作成
mcp__revenuecat__create-entitlement(project_id=<>, lookup_key=premium, display_name="Pro Membership")

# 3. 6 商品を entitlement に紐付け
mcp__revenuecat__attach-products-to-entitlement(
  project_id=<>,
  entitlement_id=<上>,
  product_ids=[<6 商品の RC ID>]
)

# 4. offering 作成
mcp__revenuecat__create-offering(project_id=<>, lookup_key=default, display_name="Pro Plan")

# 5. package 3 つ作成
mcp__revenuecat__create-packages(
  project_id=<>,
  offering_id=<上>,
  packages=[
    {lookup_key: "$rc_monthly", display_name: "Monthly"},
    {lookup_key: "$rc_annual", display_name: "Annual"},
    {lookup_key: "$rc_lifetime", display_name: "Lifetime"}
  ]
)

# 6. 各 package に iOS + Android の対応 product を attach
# iOS は eligibility=all、 Android は google_sdk_ge_6
mcp__revenuecat__attach-products-to-package(
  project_id=<>, package_id=<$rc_monthly>,
  attachments=[
    {product_id: <iOS monthly>, eligibility_criteria: "all"},
    {product_id: <Android monthly>, eligibility_criteria: "google_sdk_ge_6"}
  ]
)
# annual / lifetime も同様
```

### DoD

```
mcp__revenuecat__list-entitlements(project_id=<>)
  → premium が active、 product 6 件 attach 済

mcp__revenuecat__list-offerings(project_id=<>)
  → default が is_current=true、 packages 3 件 (各 2 product attach)
```

### 罠

| 罠                                     | 原因                                            | 回避                                                                                               |
| -------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| entitlement の lookup_key が `pro`     | コード側は `premium` 想定 (ENTITLEMENT_ID 定数) | 必ず `premium` を使う (大文字小文字も)                                                             |
| Android 買い切りが is_consumable: true | RC 自動判定の癖                                 | 配線後 get-product で確認、 必要なら update-product                                                |
| create-product が「unknown product」   | Phase 3 未完了                                  | apple_create_products.py / google_create_products.py の successful 出力を確認してから本 Phase 開始 |

---

## 7. Phase 7: Apple 商品メタデータ完成 (MISSING_METADATA → READY_TO_SUBMIT)

Apple 商品は Phase 3 直後 `state=MISSING_METADATA`。 販売地域・価格・審査情報を入れて `READY_TO_SUBMIT` まで持っていく。

### 順序の鉄則: availability → price

販売地域 (availability) を価格 (price) より**先に**設定する。 地域が空のまま価格 equalize を呼ぶと失敗する (Sess48 で実証)。

### コマンド (3 商品それぞれに対して)

```
# 1. availability (全 175 国)
mcp__revenuecat__set-product-store-state(
  project_id=<>, product_id=<RC product ID>,
  state={
    availability: { territories: [<175 国コードリスト>] },
    privacy_policy_url: "https://doooooraku.github.io/<app>/privacy/",
    review_notes: "<審査メモ、 アプリ別>"
  }
)

# 2. price (買い切りは個別、 サブスクは equalize で全 175 国補完)
mcp__revenuecat__set-product-store-state(
  project_id=<>, product_id=<lifetime>,
  state={ pricing: { territory_prices: [{ territory: "US", price: 69.99 }, ...] } }
)
mcp__revenuecat__equalize-subscription-prices(
  project_id=<>, subscription_id=<monthly>, base_territory="US", base_price=3.99
)
mcp__revenuecat__equalize-subscription-prices(
  project_id=<>, subscription_id=<annual>, base_territory="US", base_price=29.99
)

# 3. 各 async は succeeded まで poll
mcp__revenuecat__get-product-store-state-operation(operation_id=<>)
  # status: pending → succeeded まで sleep 2s で再 poll
```

### DoD

```
mcp__revenuecat__get-product-store-state(project_id=<>, product_id=<>)
  → state: READY_TO_SUBMIT
  → pricing.territory_prices.length >= 170
  → availability.territories.length >= 170
```

### 罠

| 罠                                           | 原因                                     | 回避                                                                                           |
| -------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 価格 equalize が即失敗                       | availability 未設定で price を先に呼んだ | availability → price の順を絶対に守る                                                          |
| `READY_TO_SUBMIT` 到達後にスクショ未差し替え | プレースホルダー画像のまま審査提出       | 本番審査前 (Phase 10) に user が実機ペイウォール SS に差し替えること を Notion Phase 10 に明記 |

---

## 8. Phase 8: 健康診断 (配線の機械確認)

### コマンド

```
mcp__revenuecat__get-product-store-state(project_id=<>, product_id=<>)
  # 6 商品それぞれに対して、 store_status を取得
```

### 合格条件

- Apple 3 商品: `raw_store_status: READY_TO_SUBMIT`
- Google subscription `<app>_pro:monthly`: `state: ACTIVE`
- Google subscription `<app>_pro:annual`: `state: ACTIVE`
- Google onetime product `<app>_pro_lifetime`: `state: ACTIVE`

### バイアス排除 (任意、 RC 経由ではない独立確認)

```bash
# Apple 側を ASC API 直叩きで確認
python3 -c "from scripts.store_automation._common import asc_token, http, ASC_BASE; ..."

# Google 側を Android Publisher API 直叩きで確認
python3 scripts/store-automation/google_get_track_status.py
```

両ストアの生データが返れば合鍵 (Phase 4) が本物の証拠。

---

## 9. Sess48 で発覚した罠 (構造解決の経緯)

| 罠                                                          | 発見 Sess | 構造解決                                                                                                                 |
| ----------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------ |
| AAB 未 upload で Google 買い切り作成不可                    | Sess47    | Phase 2 → Phase 3 順序の固定 (本ファイル §2 全体像)                                                                      |
| Google subscription の territory が MN-only                 | Sess81    | Sess82 PR-D で `google_create_products.py` が全 175 国を `regionalConfigs` に明示展開 + Lifetime の自動 `:activate` 配線 |
| Apple 価格 equalize が availability 未設定で失敗            | Sess48    | apple_create_products.py が「availability → price」 順を強制                                                             |
| Google 既存 region 削除拒否 (400)                           | Sess81    | API 経由は本質的に不可、 Play Console UI のみ修復可能 (iap-setup-checklist.md Step 8)                                    |
| entitlement lookup_key を `pro` で作成、 コードは `premium` | Sess48    | 本ファイル §6 で `premium` を強制明記                                                                                    |

---

## 10. 量産時 (= 次アプリ) の使い回し手順

1. **共通鍵は流用** (`docs/01_key/` 配下、 app-factory 共通)
2. **設定ファイルを作成**:
   ```bash
   cp scripts/store-automation/config.bonsailog.json scripts/store-automation/config.<新アプリ>.json
   # 編集: bundleId / packageName / 製品 ID prefix / 価格 / projectName / privacyPolicyUrl
   ```
3. **Phase 1**: `mcp__revenuecat__create-project(name=<新アプリ>)` → 戻り値の project_id / app_id を `config.<新アプリ>.json` に反映
4. **Phase 2**: user が `/release-android` で AAB ビルド + Play Console upload
5. **Phase 3-8**: 本ファイルの §3〜§8 を順に実行 (約 30-40 分)
6. **人間作業**: Notion 「Phase 8 課金設定」 純化版の 4 ステップ
7. **実機テスト**: Notion 「Phase 9: 実機サンドボックステスト」 12 パターン
8. **審査**: Notion 「Phase 10: 審査・法務」

---

## 11. 用語集

| 用語                               | 意味                                                                   |
| ---------------------------------- | ---------------------------------------------------------------------- |
| entitlement (権利 / 会員証)        | 「この権利を持つ人 = Pro 会員」、 lookup_key = `premium`               |
| offering / package (商品棚 / 段)   | 購入画面に出す商品のまとまり、 `default` 棚に 3 段                     |
| 合鍵 (store credentials)           | RC がストアに購入を問い合わせる鍵 (.p8 / JSON)                         |
| S2S 通知 (電話線)                  | 購入/解約をストアが RC に即連絡する設定                                |
| MISSING_METADATA / READY_TO_SUBMIT | Apple 商品の state、 メタデータ未完 → 完成 (提出可)                    |
| DRAFT / ACTIVE                     | Google 商品の state、 下書き → 販売中                                  |
| equalize-subscription-prices       | US 価格を基準に全 175 国価格を自動補完                                 |
| territory                          | 販売国コード (US / JP / GB ...) 、 全 175 国は ADR-0043 Amendment 参照 |

---

## 12. 関連 ADR / Doc

- **ADR-0009** (F-13 RevenueCat billing): 商品構成・価格 SoT
- **ADR-0043** (Store Product API Automation) + Sess82 PR-D Amendment: 本ファイルの根拠
- **ADR-0049** (Pro Feature Boundary): entitlement `premium` の対象機能リスト
- **ADR-0050** (Release Automation): Phase 2 (AAB upload) の手順
- `docs/how-to/release/iap-setup-checklist.md`: 人間用 12 ステップ + Q&A (トラブル時)
- `scripts/store-automation/`: 本ファイルが呼ぶ Python スクリプト一式 (apple_create_products.py / google_create_products.py / config.<app>.json / \_common.py)
- Notion 「Phase 8 課金設定」 純化版: 人間用 4 ステップ (能動)
