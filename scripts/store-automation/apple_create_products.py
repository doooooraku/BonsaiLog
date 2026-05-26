#!/usr/bin/env python3
"""Apple App Store Connect API で BonsaiLog の課金商品を作成 (ADR-0043)。

使い方:
  python3 apple_create_products.py                 # dry-run (読むだけ・作成計画を表示)
  python3 apple_create_products.py --commit        # 本実行 (製品作成 + 価格設定。製品IDは変更不可!)
  python3 apple_create_products.py --config <path>

安全設計:
- 既定は dry-run。--commit のときだけ作成/価格POST。
- 冪等: 既存 productId はスキップ。価格は未設定の場合のみ設定 (再実行安全)。
- 秘密(JWT等)は出力しない。

価格設定方式 (実機検証で確定):
- サブスク: PATCH /v1/subscriptions/{id} に prices を included sidepost (単独 POST /subscriptionPrices は RELATIONSHIP.INVALID で不可)。
- 買い切り(IAP v2): POST /v1/inAppPurchasePriceSchedules に manualPrices を included sidepost。
"""
from __future__ import annotations
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _common as C  # noqa

TERR = "USA"


def get_existing(token, app_id):
    """groups: {ref:{id, subs:{productId:subId}}}, iaps: {productId:iapId} を返す。"""
    groups = {}
    g = C.http("GET", f"{C.ASC_BASE}/v1/apps/{app_id}/subscriptionGroups?limit=200", token=token)
    for grp in g.get("data", []):
        ref = grp["attributes"].get("referenceName")
        subs = {}
        s = C.http("GET", f"{C.ASC_BASE}/v1/subscriptionGroups/{grp['id']}/subscriptions?limit=200", token=token)
        for x in s.get("data", []):
            subs[x["attributes"].get("productId")] = x["id"]
        groups[ref] = {"id": grp["id"], "subs": subs}
    iaps = {}
    i = C.http("GET", f"{C.ASC_BASE}/v1/apps/{app_id}/inAppPurchasesV2?limit=200", token=token)
    for x in i.get("data", []):
        iaps[x["attributes"].get("productId")] = x["id"]
    return groups, iaps


def nearest_point(token, url, target):
    best = None
    for pp in C.http("GET", url, token=token).get("data", []):
        try:
            price = float(pp["attributes"]["customerPrice"])
        except Exception:
            continue
        if best is None or abs(price - target) < abs(best[1] - target):
            best = (pp["id"], price)
    return best


def sub_has_price(token, sub_id):
    r = C.http("GET", f"{C.ASC_BASE}/v1/subscriptions/{sub_id}/prices?limit=1", token=token)
    return len(r.get("data", [])) > 0


def set_sub_price(token, sub_id, target_usd):
    if sub_has_price(token, sub_id):
        C.log(f"     価格は設定済み・スキップ"); return
    pp = nearest_point(token, f"{C.ASC_BASE}/v1/subscriptions/{sub_id}/pricePoints?filter[territory]={TERR}&limit=8000", target_usd)
    if not pp:
        C.log("     ⚠ price point 解決失敗"); return
    body = {
        "data": {"type": "subscriptions", "id": sub_id,
                 "relationships": {"prices": {"data": [{"type": "subscriptionPrices", "id": "${p1}"}]}}},
        "included": [{"type": "subscriptionPrices", "id": "${p1}",
                      "attributes": {"startDate": None, "preserveCurrentPrice": False},
                      "relationships": {"subscriptionPricePoint": {"data": {"type": "subscriptionPricePoints", "id": pp[0]}}}}],
    }
    C.http("PATCH", f"{C.ASC_BASE}/v1/subscriptions/{sub_id}", token=token, json_body=body)
    C.log(f"     ✅ 価格設定: {TERR} ≈ ${pp[1]} (目標 ${target_usd})")


def iap_has_price(token, iap_id):
    try:
        r = C.http("GET", f"{C.ASC_BASE}/v2/inAppPurchases/{iap_id}/iapPriceSchedule", token=token)
        return bool(r.get("data"))
    except Exception:
        return False


def set_iap_price(token, iap_id, target_usd):
    if iap_has_price(token, iap_id):
        C.log("     価格は設定済み・スキップ"); return
    pp = nearest_point(token, f"{C.ASC_BASE}/v2/inAppPurchases/{iap_id}/pricePoints?filter[territory]={TERR}&limit=8000", target_usd)
    if not pp:
        C.log("     ⚠ IAP price point 解決失敗 — ASC UI で価格選択が必要"); return
    body = {
        "data": {"type": "inAppPurchasePriceSchedules",
                 "relationships": {
                     "inAppPurchase": {"data": {"type": "inAppPurchases", "id": iap_id}},
                     "baseTerritory": {"data": {"type": "territories", "id": TERR}},
                     "manualPrices": {"data": [{"type": "inAppPurchasePrices", "id": "${q1}"}]}}},
        "included": [{"type": "inAppPurchasePrices", "id": "${q1}",
                      "attributes": {"startDate": None},
                      "relationships": {
                          "inAppPurchasePricePoint": {"data": {"type": "inAppPurchasePricePoints", "id": pp[0]}},
                          "inAppPurchaseV2": {"data": {"type": "inAppPurchases", "id": iap_id}}}}],
    }
    C.http("POST", f"{C.ASC_BASE}/v1/inAppPurchasePriceSchedules", token=token, json_body=body)
    C.log(f"     ✅ IAP価格設定: {TERR} ≈ ${pp[1]} (目標 ${target_usd})")


def main():
    commit, cfg_path = C.parse_args(sys.argv[1:])
    cfg = C.load_config(cfg_path)
    a = cfg["apple"]
    mode = "本実行(COMMIT)" if commit else "dry-run(変更なし)"
    C.log(f"=== Apple 課金商品作成 [{mode}] / {cfg['appName']} {a['bundleId']} (appId {a['appId']}) ===")

    token = C.asc_token(a)
    app = C.http("GET", f"{C.ASC_BASE}/v1/apps/{a['appId']}", token=token)
    C.log(f"  ✅ 認証OK / 対象: {app['data']['attributes'].get('name')} ({app['data']['attributes'].get('bundleId')})")
    groups, iaps = get_existing(token, a["appId"])
    C.log(f"  既存グループ: {list(groups)} / 既存IAP: {list(iaps)}")

    grp_ref = a["subscriptionGroupReferenceName"]
    C.log(f"\n計画: グループ {grp_ref} / サブスク {[s['productId'] for s in a['subscriptions']]} / IAP {[i['productId'] for i in a['iaps']]}")

    if not commit:
        C.log("\n[dry-run] 上記を作成予定。--commit で本実行。製品IDは作成後 変更不可。")
        return

    C.log("\n=== COMMIT 開始 ===")
    # 1) グループ
    if grp_ref in groups:
        grp_id = groups[grp_ref]["id"]; C.log(f"  グループ既存: {grp_ref} ({grp_id})")
    else:
        grp_id = C.http("POST", f"{C.ASC_BASE}/v1/subscriptionGroups", token=token, json_body={
            "data": {"type": "subscriptionGroups", "attributes": {"referenceName": grp_ref},
                     "relationships": {"app": {"data": {"type": "apps", "id": a["appId"]}}}}})["data"]["id"]
        C.log(f"  ✅ グループ作成: {grp_ref} ({grp_id})")
        for loc in ("en-US", "ja"):
            C.http("POST", f"{C.ASC_BASE}/v1/subscriptionGroupLocalizations", token=token, json_body={
                "data": {"type": "subscriptionGroupLocalizations",
                         "attributes": {"name": cfg["appName"] + " Pro", "locale": loc},
                         "relationships": {"subscriptionGroup": {"data": {"type": "subscriptionGroups", "id": grp_id}}}}})
        groups[grp_ref] = {"id": grp_id, "subs": {}}

    # 2) サブスク (作成 → ローカライズ → 価格)。既存は作成スキップ + 価格のみ補完。
    existing_subs = groups[grp_ref]["subs"]
    for s in a["subscriptions"]:
        pid = s["productId"]
        if pid in existing_subs:
            sub_id = existing_subs[pid]; C.log(f"  サブスク既存: {pid} ({sub_id})")
        else:
            sub_id = C.http("POST", f"{C.ASC_BASE}/v1/subscriptions", token=token, json_body={
                "data": {"type": "subscriptions",
                         "attributes": {"name": s["referenceName"], "productId": pid, "subscriptionPeriod": s["subscriptionPeriod"]},
                         "relationships": {"group": {"data": {"type": "subscriptionGroups", "id": grp_id}}}}})["data"]["id"]
            C.log(f"  ✅ サブスク作成: {pid} ({sub_id})")
            for loc, l in s["localizations"].items():
                C.http("POST", f"{C.ASC_BASE}/v1/subscriptionLocalizations", token=token, json_body={
                    "data": {"type": "subscriptionLocalizations",
                             "attributes": {"name": l["name"], "description": l["description"], "locale": loc},
                             "relationships": {"subscription": {"data": {"type": "subscriptions", "id": sub_id}}}}})
        set_sub_price(token, sub_id, s["priceUsd"])

    # 3) 買い切り IAP (作成 → ローカライズ → 価格スケジュール)
    for i in a["iaps"]:
        pid = i["productId"]
        if pid in iaps:
            iap_id = iaps[pid]; C.log(f"  IAP既存: {pid} ({iap_id})")
        else:
            iap_id = C.http("POST", f"{C.ASC_BASE}/v2/inAppPurchases", token=token, json_body={
                "data": {"type": "inAppPurchases",
                         "attributes": {"name": i["referenceName"], "productId": pid, "inAppPurchaseType": i["inAppPurchaseType"]},
                         "relationships": {"app": {"data": {"type": "apps", "id": a["appId"]}}}}})["data"]["id"]
            C.log(f"  ✅ IAP作成: {pid} ({iap_id})")
            for loc, l in i["localizations"].items():
                C.http("POST", f"{C.ASC_BASE}/v1/inAppPurchaseLocalizations", token=token, json_body={
                    "data": {"type": "inAppPurchaseLocalizations",
                             "attributes": {"name": l["name"], "description": l["description"], "locale": loc},
                             "relationships": {"inAppPurchaseV2": {"data": {"type": "inAppPurchases", "id": iap_id}}}}})
        try:
            set_iap_price(token, iap_id, i["priceUsd"])
        except Exception as e:
            C.log(f"     ⚠ IAP価格設定で例外 ({type(e).__name__}) — ASC UI で価格選択を。商品自体は作成済み。")

    C.log("\n=== COMMIT 完了。read で裏取りを。 ===")
    C.log("※ 初回IAP/サブスクは App 本体バージョンと同時に審査提出が必要 (API では承認まで不可)。")


if __name__ == "__main__":
    main()
