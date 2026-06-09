#!/usr/bin/env python3
"""Google Play Android Publisher API で BonsaiLog の課金商品を作成 (ADR-0043 + R-68 適用)。

使い方:
  python3 google_create_products.py            # dry-run (読むだけ・作成計画を表示)
  python3 google_create_products.py --commit   # 本実行 (サブスク/basePlan/買い切りを作成+有効化)
  python3 google_create_products.py --config <path>

安全設計:
- 既定は dry-run。--commit のときだけ作成。
- 冪等: 既存 productId/basePlanId はスキップ。
- 秘密(JSON private_key/token)は出力しない。
- 注: 商品の購入テスト/公開には別途 AAB アップロードが必要 (S1 残)。

Sess82 R-68 適用 (= Sess81 振り返り):
- TERRITORIES_175 を明示して `regionalConfigs` / `regionalPricingAndAvailabilityConfigs`
  に全 175 territory の `newSubscriberAvailability=True` / `availability=AVAILABLE`
  を展開。 これにより Sess47-48 で起きた「territory = MN (モンゴル) のみ登録」 罠を
  構造防止。
- Lifetime PATCH 後に `onetimeproducts:activate` を呼出 (= state DRAFT → ACTIVE)。
- REGIONS_VERSION を 2022/01 → 2025/03 に最新化。
- 価格は `otherRegionsConfig.usdPrice` / `newRegionsConfig.usdPrice` 経由で Google
  自動換算 (= ADR-0049 USD 基準方針整合)、 各 territory ごとの個別 price 指定は
  不要 (= price 省略で自動換算)。
"""
from __future__ import annotations
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _common as C  # noqa

AP = "https://androidpublisher.googleapis.com/androidpublisher/v3"


# Sess82 PR-D: regions version を 最新化 (2022/01 は古いため、 一部 territory が認識されない可能性)
REGIONS_VERSION = "2025/03"


# Sess82 PR-D: Apple Lifetime store_state 由来 175 territory list (ISO 国コード)。
# Sess81 で `google_expand_territories.py` で同じ list を使用 (= 173 territory が
# Google で実際に有効、 残 2 国 = `XKS` 等は Google が認識せず skip される、 これは
# 仕様通りで問題なし)。
TERRITORIES_175 = [
    "AE","AF","AG","AI","AL","AM","AO","AR","AT","AU","AZ","BA","BB","BE","BF","BG","BH",
    "BJ","BM","BN","BO","BR","BS","BT","BW","BY","BZ","CA","CD","CG","CH","CI","CL","CM",
    "CN","CO","CR","CV","CY","CZ","DE","DK","DM","DO","DZ","EC","EE","EG","ES","FI","FJ",
    "FM","FR","GA","GB","GD","GE","GH","GM","GR","GT","GW","GY","HK","HN","HR","HU","ID",
    "IE","IL","IN","IQ","IS","IT","JM","JO","JP","KE","KG","KH","KN","KR","KW","KY","KZ",
    "LA","LB","LC","LK","LR","LT","LU","LV","LY","MA","MD","ME","MG","MK","ML","MM","MN",
    "MO","MR","MS","MT","MU","MV","MW","MX","MY","MZ","NA","NE","NG","NI","NL","NO","NP",
    "NR","NZ","OM","PA","PE","PG","PH","PK","PL","PT","PW","PY","QA","RO","RS","RU","RW",
    "SA","SB","SC","SE","SG","SI","SK","SL","SN","SR","ST","SV","SZ","TC","TD","TH","TJ",
    "TM","TN","TO","TR","TT","TW","TZ","UA","UG","US","UY","UZ","VC","VE","VG","VN","VU",
    "XKS","YE","ZA","ZM","ZW",
]


def money(currency: str, amount: float) -> dict:
    units = int(amount)
    nanos = int(round((amount - units) * 1_000_000_000))
    return {"currencyCode": currency, "units": str(units), "nanos": nanos}


def usd_money(amount: float) -> dict:
    return money("USD", amount)


def eur_money(amount: float) -> dict:
    # USD 基準からの概算 EUR (otherRegionsConfig は usd/eur 両方必須)。後でストアが各国換算。
    return money("EUR", round(amount * 0.92, 2))


def build_subscription_regional_configs() -> list:
    """Sess82 PR-D: subscription basePlan 用に全 175 territory を明示。

    price は省略 → `otherRegionsConfig.usdPrice` から Google 自動換算
    (= ADR-0049 USD 基準方針整合)。 `newSubscriberAvailability=True` で
    全 territory で新規購読受付。
    """
    return [
        {
            "regionCode": code,
            "newSubscriberAvailability": True,
        }
        for code in TERRITORIES_175
    ]


def build_onetime_regional_configs() -> list:
    """Sess82 PR-D: one-time product 用に全 175 territory を明示。

    price は省略 → `newRegionsConfig.usdPrice` から Google 自動換算。
    `availability=AVAILABLE` で全 territory で販売開始。
    """
    return [
        {
            "regionCode": code,
            "availability": "AVAILABLE",
        }
        for code in TERRITORIES_175
    ]


def get_existing(token, pkg):
    subs, ones = [], []
    try:
        r = C.http("GET", f"{AP}/applications/{pkg}/subscriptions", token=token)
        subs = [s.get("productId") for s in r.get("subscriptions", [])]
    except Exception as e:
        C.log(f"  (既存サブスク読み取り注意: {type(e).__name__})")
    try:
        r = C.http("GET", f"{AP}/applications/{pkg}/onetimeproducts", token=token)
        ones = [s.get("productId") for s in r.get("oneTimeProducts", r.get("onetimeproducts", []))]
    except Exception as e:
        C.log(f"  (既存買い切り読み取り注意: {type(e).__name__})")
    return subs, ones


def main():
    commit, cfg_path = C.parse_args(sys.argv[1:])
    cfg = C.load_config(cfg_path)
    g = cfg["google"]
    pkg = g["packageName"]
    mode = "本実行(COMMIT)" if commit else "dry-run(変更なし)"
    C.log(f"=== Google 課金商品作成 [{mode}] / {cfg['appName']} ({pkg}) ===")
    C.log(f"  territory: 全 {len(TERRITORIES_175)} 国 (= Sess82 PR-D 明示)")
    C.log(f"  regionsVersion: {REGIONS_VERSION}")

    token = C.google_token(g)
    C.log("  ✅ 認証OK (OAuthトークン取得)")
    subs, ones = get_existing(token, pkg)
    C.log(f"  既存サブスク: {subs or 'なし'} / 既存買い切り: {ones or 'なし'}")

    sub_id = g["subscriptionId"]
    C.log("\n--- サブスク + basePlan ---")
    C.log(f"  subscription: {sub_id}  ({'既存・スキップ' if sub_id in subs else '新規作成'})")
    for bp in g["basePlans"]:
        C.log(f"  ・basePlan {bp['basePlanId']} | {bp['billingPeriodDuration']} | 目標${bp['priceUsd']} (US)")
        C.log(f"    + 全 {len(TERRITORIES_175)} 国 明示 (newSubscriberAvailability=True)")
    C.log("\n--- 買い切り (onetimeproducts) ---")
    life = g["lifetime"]
    C.log(f"  ・{life['productId']} | 目標${life['priceUsd']} (US)  ({'既存・スキップ' if life['productId'] in ones else '新規作成'})")
    C.log(f"    + 全 {len(TERRITORIES_175)} 国 明示 (availability=AVAILABLE)")
    C.log(f"    + activate (= state DRAFT → ACTIVE) を自動実行 (Sess82 PR-D)")

    if not commit:
        C.log("\n[dry-run] 上記は『作成予定』です。問題なければ --commit を付けて本実行してください。")
        C.log("[dry-run] productId/basePlanId は作成後 変更不可。命名・期間を必ず確認のこと。")
        return

    C.log("\n=== COMMIT 開始 ===")
    # 1) サブスク本体 (basePlans は draft で作成 → activate)
    listings = []
    for lang, l in g["subscriptionListings"].items():
        listings.append({
            "languageCode": lang,
            "title": l["title"],
            "benefits": [l.get("benefit1", ""), l.get("benefit2", "")],
            "description": l["description"],
        })
    sub_regional_configs = build_subscription_regional_configs()
    base_plans = []
    for bp in g["basePlans"]:
        base_plans.append({
            "basePlanId": bp["basePlanId"],
            # Sess82 PR-D: regionalConfigs に全 175 territory 明示 (= MN-only 罠の構造防止)。
            # 価格は otherRegionsConfig.usdPrice から自動換算 (= ADR-0049 整合)。
            "regionalConfigs": sub_regional_configs,
            "otherRegionsConfig": {
                "usdPrice": usd_money(bp["priceUsd"]),
                "eurPrice": eur_money(bp["priceUsd"]),
                "newSubscriberAvailability": True,
            },
            "autoRenewingBasePlanType": {"billingPeriodDuration": bp["billingPeriodDuration"]},
        })
    if sub_id in subs:
        C.log(f"  サブスク既存スキップ: {sub_id}")
    else:
        body = {"packageName": pkg, "productId": sub_id, "listings": listings, "basePlans": base_plans}
        C.http(
            "POST",
            f"{AP}/applications/{pkg}/subscriptions?productId={sub_id}&regionsVersion.version={REGIONS_VERSION}",
            token=token, json_body=body,
        )
        C.log(f"  ✅ サブスク作成: {sub_id} (regions={len(TERRITORIES_175)})")
        # basePlan を activate (作成直後は draft)
        for bp in g["basePlans"]:
            try:
                C.http(
                    "POST",
                    f"{AP}/applications/{pkg}/subscriptions/{sub_id}/basePlans/{bp['basePlanId']}:activate",
                    token=token,
                    json_body={"packageName": pkg, "productId": sub_id, "basePlanId": bp["basePlanId"]},
                )
                C.log(f"     ✅ basePlan 有効化: {bp['basePlanId']}")
            except Exception as e:
                C.log(f"     ⚠ basePlan {bp['basePlanId']} 有効化失敗 ({type(e).__name__}) — Console で確認")

    # 2) 買い切り (onetimeproducts, 新API)
    if life["productId"] in ones:
        C.log(f"  買い切り既存スキップ: {life['productId']}")
    else:
        one_listings = [
            {"languageCode": lang, "title": l["title"], "description": l["description"]}
            for lang, l in life["listings"].items()
        ]
        usd = usd_money(life["priceUsd"])
        eur = eur_money(life["priceUsd"])
        body = {
            "packageName": pkg,
            "productId": life["productId"],
            "listings": one_listings,
            "purchaseOptions": [{
                "purchaseOptionId": "buy",
                "buyOption": {},
                # Sess82 PR-D: 全 175 territory 明示 (= MN-only 罠の構造防止)。
                # price は newRegionsConfig.usdPrice から自動換算。
                "regionalPricingAndAvailabilityConfigs": build_onetime_regional_configs(),
                "newRegionsConfig": {"usdPrice": usd, "eurPrice": eur, "availability": "AVAILABLE"},
            }],
        }
        # 新 one-time product は PATCH upsert (allowMissing) + updateMask が必須
        url = (
            f"{AP}/applications/{pkg}/onetimeproducts/{life['productId']}"
            f"?allowMissing=true&regionsVersion.version={REGIONS_VERSION}&updateMask=listings,purchaseOptions"
        )
        try:
            C.http("PATCH", url, token=token, json_body=body)
            C.log(f"  ✅ 買い切り作成: {life['productId']} (regions={len(TERRITORIES_175)})")
        except Exception as e:
            C.log(f"  ⚠ 買い切り作成失敗 ({type(e).__name__}) — billing 権限の反映待ち or Console UI で作成")
            raise

        # Sess82 PR-D: Lifetime activate (= state DRAFT → ACTIVE)。
        # ADR-0043 Sess48 で「state=DRAFT のまま」 と記録、 本 PR で構造解決。
        activate_url = (
            f"{AP}/applications/{pkg}/onetimeproducts/{life['productId']}:activate"
        )
        try:
            C.http(
                "POST", activate_url, token=token,
                json_body={"packageName": pkg, "productId": life["productId"]},
            )
            C.log(f"     ✅ 買い切り 有効化: {life['productId']}")
        except Exception as e:
            C.log(f"     ⚠ 買い切り 有効化失敗 ({type(e).__name__}) — Console で activate")

    C.log("\n=== COMMIT 完了。read で裏取り。購入テストには AAB アップロード(内部テスト)が別途必要。 ===")


if __name__ == "__main__":
    main()
