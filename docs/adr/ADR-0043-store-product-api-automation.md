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

## スコープ外（次セッション以降）

- RevenueCat ダッシュボード構築（製品 → entitlement `premium` → offering `default` パッケージ、RevenueCat MCP 活用）
- Google 初回 AAB アップロード / Apple アプリ版同時審査提出 / 実機サンドボックステスト 12 パターン / プライバシー19言語・DPA
