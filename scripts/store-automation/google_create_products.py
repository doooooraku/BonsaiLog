#!/usr/bin/env python3
"""Google Play Android Publisher API で BonsaiLog の課金商品を作成 (ADR-0043)。

使い方:
  python3 google_create_products.py            # dry-run (読むだけ・作成計画を表示)
  python3 google_create_products.py --commit   # 本実行 (サブスク/basePlan/買い切りを作成+有効化)
  python3 google_create_products.py --config <path>

安全設計:
- 既定は dry-run。--commit のときだけ作成。
- 冪等: 既存 productId/basePlanId はスキップ。
- 秘密(JSON private_key/token)は出力しない。
- 注: 商品の購入テスト/公開には別途 AAB アップロードが必要 (S1 残)。
"""
from __future__ import annotations
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _common as C  # noqa

AP = "https://androidpublisher.googleapis.com/androidpublisher/v3"


REGIONS_VERSION = "2022/01"


def money(currency: str, amount: float) -> dict:
    units = int(amount)
    nanos = int(round((amount - units) * 1_000_000_000))
    return {"currencyCode": currency, "units": str(units), "nanos": nanos}


def usd_money(amount: float) -> dict:
    return money("USD", amount)


def eur_money(amount: float) -> dict:
    # USD 基準からの概算 EUR (otherRegionsConfig は usd/eur 両方必須)。後でストアが各国換算。
    return money("EUR", round(amount * 0.92, 2))


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

    token = C.google_token(g)
    C.log("  ✅ 認証OK (OAuthトークン取得)")
    subs, ones = get_existing(token, pkg)
    C.log(f"  既存サブスク: {subs or 'なし'} / 既存買い切り: {ones or 'なし'}")

    sub_id = g["subscriptionId"]
    C.log("\n--- サブスク + basePlan ---")
    C.log(f"  subscription: {sub_id}  ({'既存・スキップ' if sub_id in subs else '新規作成'})")
    for bp in g["basePlans"]:
        C.log(f"  ・basePlan {bp['basePlanId']} | {bp['billingPeriodDuration']} | 目標${bp['priceUsd']} (US)")
    C.log("\n--- 買い切り (onetimeproducts) ---")
    life = g["lifetime"]
    C.log(f"  ・{life['productId']} | 目標${life['priceUsd']} (US)  ({'既存・スキップ' if life['productId'] in ones else '新規作成'})")

    if not commit:
        C.log("\n[dry-run] 上記は『作成予定』です。問題なければ --commit を付けて本実行してください。")
        C.log("[dry-run] productId/basePlanId は作成後 変更不可。命名・期間を必ず確認のこと。")
        return

    C.log("\n=== COMMIT 開始 ===")
    # 1) サブスク本体 (basePlans は draft で作成 → activate)
    listings = []
    for lang, l in g["subscriptionListings"].items():
        listings.append({"languageCode": lang, "title": l["title"],
                          "benefits": [l.get("benefit1", ""), l.get("benefit2", "")],
                          "description": l["description"]})
    base_plans = []
    for bp in g["basePlans"]:
        base_plans.append({
            "basePlanId": bp["basePlanId"],
            # otherRegionsConfig = USD/EUR 基準で全地域に自動換算 ($ 基準方針 + US重複回避)
            "otherRegionsConfig": {"usdPrice": usd_money(bp["priceUsd"]),
                                   "eurPrice": eur_money(bp["priceUsd"]),
                                   "newSubscriberAvailability": True},
            "autoRenewingBasePlanType": {"billingPeriodDuration": bp["billingPeriodDuration"]},
        })
    if sub_id in subs:
        C.log(f"  サブスク既存スキップ: {sub_id}")
    else:
        body = {"packageName": pkg, "productId": sub_id, "listings": listings, "basePlans": base_plans}
        C.http("POST", f"{AP}/applications/{pkg}/subscriptions?productId={sub_id}&regionsVersion.version={REGIONS_VERSION}",
               token=token, json_body=body)
        C.log(f"  ✅ サブスク作成: {sub_id}")
        # basePlan を activate (作成直後は draft)
        for bp in g["basePlans"]:
            try:
                C.http("POST", f"{AP}/applications/{pkg}/subscriptions/{sub_id}/basePlans/{bp['basePlanId']}:activate",
                       token=token, json_body={"packageName": pkg, "productId": sub_id, "basePlanId": bp["basePlanId"]})
                C.log(f"     ✅ basePlan 有効化: {bp['basePlanId']}")
            except Exception as e:
                C.log(f"     ⚠ basePlan {bp['basePlanId']} 有効化失敗 ({type(e).__name__}) — Console で確認")

    # 2) 買い切り (onetimeproducts, 新API)
    if life["productId"] in ones:
        C.log(f"  買い切り既存スキップ: {life['productId']}")
    else:
        one_listings = [{"languageCode": lang, "title": l["title"], "description": l["description"]}
                        for lang, l in life["listings"].items()]
        usd = usd_money(life["priceUsd"]); eur = eur_money(life["priceUsd"])
        body = {
            "packageName": pkg, "productId": life["productId"], "listings": one_listings,
            "purchaseOptions": [{
                "purchaseOptionId": "buy", "buyOption": {},
                "regionalPricingAndAvailabilityConfigs": [
                    {"regionCode": "US", "price": usd, "availability": "AVAILABLE"}],
                "newRegionsConfig": {"usdPrice": usd, "eurPrice": eur, "availability": "AVAILABLE"},
            }],
        }
        # 新 one-time product は PATCH upsert (allowMissing) + updateMask が必須
        url = (f"{AP}/applications/{pkg}/onetimeproducts/{life['productId']}"
               f"?allowMissing=true&regionsVersion.version={REGIONS_VERSION}&updateMask=listings,purchaseOptions")
        try:
            C.http("PATCH", url, token=token, json_body=body)
            C.log(f"  ✅ 買い切り作成: {life['productId']}")
        except Exception as e:
            C.log(f"  ⚠ 買い切り作成失敗 ({type(e).__name__}) — billing 権限の反映待ち or Console UI で作成")

    C.log("\n=== COMMIT 完了。read で裏取り。購入テストには AAB アップロード(内部テスト)が別途必要。 ===")


if __name__ == "__main__":
    main()
