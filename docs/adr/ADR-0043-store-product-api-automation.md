# ADR-0043: ストア課金商品の API 自動作成（Apple ASC API + Google Android Publisher API）(Sess47)

- Status: Accepted
- Date: 2026-05-26
- Deciders: @doooooraku
- Related: ADR-0009 (F-13 RevenueCat 課金設計 / 本 ADR で「商品作成手段」を補完) / `docs/01_key/`(app-factory 共通鍵ストア、git 管理外) / Repolog Phase 8 課金構成（雛形元）/ `~/.claude/CLAUDE.md` §0 プライバシー禁則（秘密の memory/出力禁止）/ Sess47 議論（6 専門家チーム + 競合価格調査 + 両ストア API 1 次情報調査）/ 1 次情報 [App Store Connect API – Managing in-app purchases](https://developer.apple.com/documentation/appstoreconnectapi/managing-in-app-purchases) + [Android Publisher API – monetization.subscriptions](https://developers.google.com/android-publisher/api-ref/rest/v3/monetization.subscriptions) + [RevenueCat MCP overview](https://www.revenuecat.com/docs/tools/mcp/overview)

---

## Context（背景：いま何に困っている？）

ADR-0009 で課金コードは Repolog から流用済み（約90%完成）。残作業は「Apple/Google ストアに課金商品（月/年/買切）を作る」「RevenueCat に紐づける」「実機テスト」。

ユーザー要望（Sess47）：**前回 Repolog で手作業（ストア GUI ポチポチ）した課金商品作成を、できるだけ Claude Code に任せて手間を省きたい。app-factory で複数アプリを量産する前提なので、再利用できる自動化の投資価値が高い。**

### 調査で判明した事実（1 次情報で裏取り）

- **RevenueCat MCP ではストア商品を作成できない**（公式 blog 明言）。MCP は RevenueCat ダッシュボード内部（project/app/product 参照/entitlement/offering/paywall）の操作のみ。
- **Apple App Store Connect API**：サブスクグループ / 自動更新サブスク / 非消耗型 IAP の CRUD・ローカライズ・価格設定が可能。価格は Apple 既定の price point から選択（基準国を決めると他国自動換算）。**初回 IAP はアプリ本体バージョンと同時に審査提出が必要**で、API だけで「販売中」までは到達できない（審査承認は人手）。認証は JWT(ES256, .p8 + Issuer ID + Key ID)。
- **Google Android Publisher API**：`monetization.subscriptions`（subscription + basePlan + offer）、買い切りは `monetization.onetimeproducts`（旧 `inappproducts` は非推奨）で作成・地域別価格・activate が可能。任意金額の地域別価格指定可。認証はサービスアカウント JSON(OAuth2)。
- **鍵は app-factory 共通 `docs/01_key/` に既存・有効**（Sess47 の読み取りテストで検証済。Apple `AuthKey_6768KZU85A.p8` / Google `spry-catcher-482116-c4-*.json`）。`04_app-factory` は git 管理外で漏洩なし。
- **人間にしかできない前提**（API 範囲外）：有料契約同意・銀行/税務、鍵の発行、Apple 審査承認、Google 初回 AAB アップロード、サンドボックステスト操作。

## Decision（決定）

1. **ストア課金商品の作成・価格設定は、Apple ASC API + Google Android Publisher API で自動化する**（RevenueCat MCP は S4 のダッシュボード構築でのみ使う）。
2. **再利用可能な設定駆動スクリプト**を `scripts/store-automation/` に置く。1 アプリ分の値（bundleId / appId / Google package / 製品 ID / basePlan ID / 価格 / 表示名・説明 / entitlement / offering）を 1 ファイルに集約し、次アプリでも流用できる構造にする。
3. **鍵は `docs/01_key/` を参照**し、スクリプトは秘密（.p8 / JSON private_key / JWT / token）を標準出力・ログ・コミットに**一切出さない**（§0）。`secrets/` 経由を使う場合は `.gitignore` 済みを確認。
4. **製品 ID は作成後に変更・削除不可**のため、**必ず `--dry-run` で作成予定を提示 → ユーザー承認 → 本実行**の順とする（不可逆操作の安全ゲート）。スクリプトは冪等（既存はスキップ）とし、Apple API の散発的 500 にはリトライを実装。
5. 製品構成は ADR-0009 準拠：
   - Apple：グループ `BonsaiLog_Pro_Plan` / `bonsailog_pro_monthly`(ONE_MONTH) / `bonsailog_pro_annual`(ONE_YEAR) / `bonsailog_pro_lifetime`(NON_CONSUMABLE)
   - Google：subscription `bonsailog_pro`（basePlan `monthly`=P1M / `annual`=P1Y）+ onetimeproduct `bonsailog_pro_lifetime`
   - 価格：USD 基準 月 $3.99 / 年 $29.99 / 買切 $69.99（各国自動換算）

## Consequences（結果・影響）

- ✅ ストア商品作成の手作業（前回 Repolog で GUI 多数画面）が消え、ADR-0009 値を機械的に流すためタイポ事故（前回 Google コロン区切り等）を構造的に防げる。
- ✅ 量産時に次アプリへ流用可能（設定を差し替えるだけ）。
- ✅ 実機テスト時、RevenueCat MCP の read で「`premium` が顧客に付与されたか」を裏取りできる。
- ⚠️ **完全自動ではない**：Apple は初回 IAP のアプリ版同時審査提出 + 承認待ち、Google は購入テストに AAB アップロードが残る（いずれも人間/審査）。本 ADR は「商品の作成・価格・有効化」までを自動化対象とする。
- ⚠️ 秘密鍵の取り扱いを誤ると重大インシデント → §0 と Decision 3/4 で構造的に防止。

## 実行で判明した事項 (Sess47、実機 API 検証)

- **実行結果**: Apple 3商品(月/年/買切)+価格 ✅ / Google サブスク `bonsailog_pro`(basePlan monthly+annual)+価格+activate ✅ / Google 買い切り `bonsailog_pro_lifetime` は**未作成**。
- **Google 買い切りがブロックされた根本原因**: 買い切り(管理対象商品)の作成は **アプリ本体(AAB/APK、BILLING 権限入り)をトラックにアップロード済みであること**が Google の前提条件。BonsaiLog は AAB 未アップロードのため `request billing permission` で拒否された(購入系 API `voidedpurchases` も 404「No application found」)。**権限不足ではない**(管理者権限付与済・サブスクは作成成功)。新サブスク API はこのゲートを強制しないが、買い切り面は強制する。
- **恒久策(順序)**: 実行順序は **①AAB を内部テストにアップロード → ②商品作成スクリプト実行** とする。AAB アップロードは実機購入テストの前提でもあり、元から必須工程。
- **再開手順**: AAB アップロード後に `google_create_products.py --commit` を再実行(冪等)すれば買い切りが作成される。
- 出典: [Create an in-app product (Play Console Help)](https://support.google.com/googleplay/android-developer/answer/1153481) / [Getting ready – Play Billing](https://developer.android.com/google/play/billing/getting-ready)

## 追記 (Sess48、Google 買い切り作成 完了)

- **経緯**: `app-production.aab`(versionCode 2) を Play Console クローズドテスト(Alpha)に公開 → 上記「AAB アップロード済み」ゲートが解除。`google_create_products.py --commit` 再実行で **`bonsailog_pro_lifetime` 作成成功 (PATCH 200)**。US $69.99 / listings en-US「BonsaiLog Pro Lifetime」+ ja-JP「BonsaiLog Pro 買い切り」/ state=DRAFT。これで **Google 課金商品 3 種が全て本番に存在**（Apple 3 種は Sess47 で完了済 → 両ストアの商品作成完了）。
- **スクリプトの既知の癖（無害）**: 新 onetimeproducts API の **GET(読み取り)** は androidpublisher v3 で汎用 404(HTML) を返すため、`get_existing()` が買い切りを常に「なし」と表示する。だが作成は `PATCH ?allowMissing=true` の冪等 upsert のため、再実行しても重複・エラーにならず無害。作成成功の裏取りは PATCH 200 レスポンスの productId/価格で実施。
- **フォローアップ**: 買い切りは `state=DRAFT` のまま（サブスクの basePlan は `:activate` 済だが、スクリプトは買い切りを activate しない）。販売/購入テスト前に有効化が必要になる可能性 → 後工程で対応 (= **Sess82 PR-D で構造解決済、 Lifetime PATCH 後に `:activate` を自動実行**)。

## スコープ外（次セッション以降）

- RevenueCat ダッシュボード構築（製品 → entitlement `premium` → offering `default` パッケージ、RevenueCat MCP 活用） **← Sess81 で完了確認済 (RC Dashboard 完璧構築済を MCP 経由で裏取り)**
- Google 初回 AAB アップロード / Apple アプリ版同時審査提出 / 実機サンドボックステスト 12 パターン / プライバシー19言語・DPA

## §Acceptance (Sess82 PR-D Amendment)

本 ADR を Status: Accepted に保つには、 以下を **必須項目**とする (= R-68 適用):

1. ✅ **territory >= 170 国 (= 全 175 国明示展開、 Google が認識する 173 国以上が active)**: `google_create_products.py` が `TERRITORIES_175` を `regionalConfigs` / `regionalPricingAndAvailabilityConfigs` に明示展開、 `newSubscriberAvailability=True` / `availability=AVAILABLE` で全 territory ON。 検証: 作成後 RC MCP `get-product-store-state` で `availability.territories | length >= 170`
2. ✅ **全国価格設定済**: 各 territory に `regionalConfigs[*].price` 明示 (= 自動換算でも OK) もしくは `otherRegionsConfig.usdPrice` 経由 fallback で全国価格 fetched。 検証: RC MCP で `pricing.territory_prices | length >= 170`
3. ✅ **subscription basePlan / Lifetime 共に `state: ACTIVE`**: 作成後 `:activate` を自動実行 (= subscription basePlan は既存実装、 Lifetime は Sess82 PR-D 追加)
4. ✅ **preflight smoke test 配線済** (= R-68): `scripts/preflight-android-release.mjs` G グループで `Purchases.getOfferings()` 相当の RC REST API 直叩き verify

---

## Sess82 PR-D Amendment (2026-06-09)

### 実装

- `scripts/store-automation/google_create_products.py` を以下 4 点で構造改修:
  1. `TERRITORIES_175` const 追加 (= Apple Lifetime store_state 由来、 Sess81 `google_expand_territories.py` と同 list)
  2. `build_subscription_regional_configs()` + `build_onetime_regional_configs()` helper 追加、 全 175 territory を `regionalConfigs` / `regionalPricingAndAvailabilityConfigs` に明示展開 (= MN-only 罠の構造防止)
  3. Lifetime PATCH 後に `onetimeproducts:activate` を自動呼出 (= Sess48 §フォローアップ「state=DRAFT のまま」 を構造解決)
  4. `REGIONS_VERSION` を `2022/01` → `2025/03` に最新化
- `template/app_template/scripts/store-automation/` を新規作成、 同改修版を反映 (= 量産時の新規アプリで自動継承)
- `scripts/store-automation/config.bonsailog.json` `regionPrices._note` を Sess82 PR-D 反映に更新
- 本 ADR §Acceptance を 4 必須項目化 (= R-68 適用)
- `docs/how-to/release/iap-setup-checklist.md` Step 8 に「Set prices dialog で USD 一括設定」 サブステップ追記 (= Sess81 user 詰まり教訓)

### 効果

- **新規アプリ作成時**: `python3 google_create_products.py --commit` 1 発で全 175 国 territory + 全価格 + Lifetime ACTIVE まで完遂 (= Sess47-48 で 3 ヶ月放置した MN-only 罠 + Lifetime DRAFT 残り を構造的にゼロ化)
- **既存アプリ修復時**: 本 PR の改修は新規作成の挙動のみ変更、 既存 broken state の修復は API 経由不可 (= Google が既存 region 削除を拒否、 Sess81 §「実行で判明した事項 (Sess82 R-68)」)、 Play Console UI 経由でのみ可能 (= `iap-setup-checklist.md` Step 8 参照)

### 関連

- R-68 (= 外部サービス連携 ADR は preflight smoke test 配線済が Accepted 必須、 Sess81 起票)
- Sess81 PR #1009 (= preflight G グループ + R-68 起票) との相互補完
- Sess81 Engram id=510 (= Google API region 削除拒否 lesson)
- `template/app_template/scripts/store-automation/` (= 量産時自動継承)

---

## Sess81 Amendment (2026-06-09): RevenueCat ダッシュボード構築 完了確認 + territory 罠

**確認結果 (RC MCP `mcp__revenuecat__list-*` 経由、 2026-06-09)**:

- ✅ RC Dashboard project `projed4e672d` (BonsaiLog) は **Sess47-48 までに完璧構築済** だった (= 当時の「スコープ外」 と思っていた作業は実は既に完了済 or 後続セッションで完了済)
- ✅ Apps: iOS `app288b3baccf` (bundleId=`com.dooooraku.bonsailog`、 ASC API キー設定済、 subscription key 設定済) + Android `appff0185c07e` (package_name=`com.dooooraku.bonsailog`) + Test Store `appe22fd598d1`
- ✅ Products: 6 件全部 `state: active` (= iOS monthly/annual/lifetime、 Android `bonsailog_pro:monthly` / `:annual` / `bonsailog_pro_lifetime`)
- ✅ Entitlement `premium` (lookup_key=premium, state=active) に 6 product 全部 Attach 済
- ✅ Offering `default` (display: "Pro Plan") `is_current=true`、 Package 3 件 (`$rc_monthly` / `$rc_annual` / `$rc_lifetime`) 全部 紐付け済
- ✅ API Keys: Android Public `goog_optOZ...lzhM` / iOS Public `appl_cWMo...QrhB` (= `.env` 値と完全一致)

**しかし、 Google Play Console 側に Sess47-48 では気付かなかった「territory 罠」 が発覚**:

- Google subscription `bonsailog_pro` の basePlan monthly/annual で **availability.territories が `MN` (モンゴル) のみ** 登録されていた (= JP/US 含む 174 国で販売対象外)。 結果として `Purchases.getOfferings()` が `current=null` を返し、 Paywall で「利用不可」 + 「Package not found」 エラー。

**真因仮説 (Sess81 調査)**: Sess47-48 で `google_create_products.py` 実行時、 意図は ADR-0009 §40-44 「USD 基準で全地域自動換算」 だったが、 Google API 側の挙動で `regionalConfigs` に MN entry だけが個別に登録されてしまった (= スクリプトは `otherRegionsConfig.usdPrice + newSubscriberAvailability:true` で全地域自動換算を意図、 だが Google 側で MN が「個別 region entry」 として記録された)。

**修復試行**:

1. RC MCP `create-product-store-state-plan` → **limited beta 未対応 (403)**
2. RC MCP `set-product-store-state` → **`app_store` のみ対応、 `play_store` 不可**
3. 新規 script `scripts/store-automation/google_expand_territories.py` で Google Android Publisher API 直接 PATCH → **400 Bad Request "Cannot remove region once it has been added: MN" / "Regional configs were removed from the base plan: MN"**
4. → **API 経由は本質的に不可** (= Google の既存購読者保護セーフガード)。 唯一の現実解 = **Play Console UI** から「Country/region availability > Select all regions」 を 1 タップ実行 (= user 手作業)

**Sess81 で完了したこと** (= 「スコープ外」 の一部消化):

- ✅ RC Dashboard 構築は確認上「**既に完了済**」 (= 上記 ✅ 6 項目)
- ✅ Pro 機能 7 項目 (ADR-0049 Sess78 Amendment ⑦ 定期予定) を Paywall + PlanSection に反映済 (= acd028e Sess81 PR-9)
- ✅ アプリ側 IAP UI エラー文言分岐 (= ADR-0009 §Notes Sess81 Amendment、 BillingError + `offeringsEmpty` PurchaseErrorKind)
- ✅ scripts/store-automation/google_expand_territories.py 新規作成 (= 試行記録 + verbose error 取得、 R-58 候補 lesson)

**Sess81 + Phase A user 手作業**: Play Console > Monetize > Products > Subscriptions / In-app products > 各商品 > Pricing & availability > Country/region availability > **Select all regions** > Save。 約 10-15 分。

**残作業 (Sess82 以降)**:

- iOS Apple アプリ版同時審査提出 (= Apple Lifetime `proda4e42af3b5` の `store_status.status: needs_action` / `raw_store_status: READY_TO_SUBMIT` を解消するには iOS アプリ本体 build と同時審査要)
- 実機サンドボックステスト 12 パターン (= Android 6 + iOS 6)
- プライバシー 19 言語 + DPA (= ADR-0009 §残作業)
- preflight IAP smoke test (= R-68 候補、 Phase C で起票予定)

---

## Sess108 Amendment (2026-06-14): 3 SoT 棲み分け + Notion Phase 8 改修

### 経緯

Sess48 当時に作成された Notion ページ「💰 Phase 8: 課金設定 (RevenueCat)」 が、 Phase 0 〜 Phase 10 の全工程を 1 ページに混載 (🤖 Claude 自動 + 👤 人間 が混在) しており、 (a) user が「自分の作業がどれか分からない」 (b) Sess81 territory 罠 + Sess82 PR-D 解決が未反映 (c) repo 側の `iap-setup-checklist.md` (Sess81) と内容が重複、 という 3 課題が露呈。

### 決定

課金まわりの情報を 3 つの SoT に棲み分けて配置する:

| SoT                                                                              | 役割                                           | 主たる読者                | 性質                  |
| -------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------- | --------------------- |
| Notion 「Phase 8 課金設定」 純化版                                               | アプリ別 4 ステップ                            | 人間 (プロダクトオーナー) | 能動 (今回これをやる) |
| `docs/how-to/release/iap-setup-checklist.md` (既存、 Sess81 起源、 touch しない) | トラブル時 12 ステップ + Q&A 6 つ              | 人間 (修復作業時)         | 受動 (困ったら見る)   |
| `docs/how-to/release/billing-setup-automation.md` (本 Amendment で新規)          | Phase 1/3/5/7/8 自動実行手順 + 全罠 + 量産手順 | Claude Code               | 機械 (Claude が読む)  |

### 実装

- 新規ファイル: `docs/how-to/release/billing-setup-automation.md` (= Claude が自動実行する 5 Phase の完全 SoT、 ADR-0043 + ADR-0009 + ADR-0049 + Sess47/48/81/82 累積知見を統合)
- Notion 既存「Phase 8 課金設定」 ページ (ID `34b0ee330ea0813ea82eea0ee2e667b0`) を 4 ステップに大幅圧縮、 改修前原本は `docs/archive/notion-phase8-refactor-2026-06/notion-phase8-original.md` にバックアップ済
- Notion 新規 4 ページ (Phase 0 / 2 / 9 / 10) を「アプリ開発 [BonsaiLog]」 配下に並列配置 (= Notion ページタイトル「Phase 8」 と中身を一致させる純化)
- 本 Amendment で 3 SoT の役割明文化

### 効果

- **新規アプリ作成時**: Claude は `billing-setup-automation.md` 単一を読めば Phase 1〜8 自動実行可能 (= 散在情報の集約)
- **既存アプリトラブル時**: 人間は `iap-setup-checklist.md` 12 ステップを順に確認
- **アプリ別の能動作業**: 人間は Notion 「Phase 8 課金設定」 4 ステップだけを参照 (= 過剰情報の排除)
- 3 SoT 間で内容が drift しないよう、 本 ADR が「どこに何を書く」 の根拠 (= 構造ガード)

### 関連

- 本改修は ADR の趣旨変更ではなく「情報配置の明文化」 のみ。 Decision 1-5 (= API 自動化採用 + 設定駆動スクリプト + 鍵管理 + dry-run ゲート + 製品構成) は不変
- iap-setup-checklist.md は Sess81 で完成度が高く、 本改修では touch しない (= ADR-0009/0043 双方の Amendment で参照される共有資産)
- billing-setup-automation.md は本 ADR + ADR-0009 + ADR-0049 を root of truth とし、 ADR 更新時は本 .md にも反映する責務を持つ
