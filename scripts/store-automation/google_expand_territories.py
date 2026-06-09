#!/usr/bin/env python3
"""Sess81: 既存 Google Play サブスク/買い切りの販売地域 (territory) を MN のみ → 175 国に拡張 (ADR-0043 Sess81 Amendment)。

使い方:
  python3 google_expand_territories.py            # dry-run (= 現状 GET + 変更計画表示)
  python3 google_expand_territories.py --commit   # 本実行 (PATCH で territory 拡張)
  python3 google_expand_territories.py --config <path>

背景:
- Sess47-48 で google_create_products.py により 3 商品作成、 当時の意図は「USD 基準で全地域自動換算」。
- しかし 2026-06-09 (Sess81) の RC MCP 照会で **availability.territories = MN のみ** が判明 (= 174 国で販売不可)。
- 結果: テスター 12 人 (= JP 配信) の Paywall で価格「利用不可」、 Purchases.getOfferings() が current=null。

修正方針:
- 既存 subscription `bonsailog_pro` の basePlans (`monthly` / `annual`) を PATCH で update。
- regionalConfigs を **clear** (= MN single entry を削除)、 全 territory は otherRegionsConfig.usdPrice から自動換算。
- regionsVersion を 2022/01 → 2025/03 に最新化 (= Google が 2025 territory list を使う)。
- 買い切り `bonsailog_pro_lifetime` も同様に全地域 AVAILABLE で再 PATCH。

安全設計 (ADR-0043 Decision 4):
- 既定は dry-run。 --commit のときだけ PATCH。
- 既存 subscription を archive せず、 product ID 不変。 既存 RC entitlement との紐付け維持。
- 秘密(JSON private_key/token)は出力しない。
"""
from __future__ import annotations
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _common as C  # noqa

AP = "https://androidpublisher.googleapis.com/androidpublisher/v3"

# 2026-06-09 Sess81: Apple Lifetime store_state で確認した 175 territory list (ISO 国コード)。
# JP (日本) + US (米国) を含む全 175 国。
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
    "XKS","YE","ZA","ZM","ZW"
]

REGIONS_VERSION = "2025/03"  # Sess81 update (= 2022/01 → 最新化)


def money(currency: str, amount: float) -> dict:
    units = int(amount)
    nanos = int(round((amount - units) * 1_000_000_000))
    return {"currencyCode": currency, "units": str(units), "nanos": nanos}


def usd_money(amount: float) -> dict:
    return money("USD", amount)


def eur_money(amount: float) -> dict:
    return money("EUR", round(amount * 0.92, 2))


def fetch_current_sub(token, pkg, sub_id):
    """既存 subscription を GET。"""
    return C.http("GET", f"{AP}/applications/{pkg}/subscriptions/{sub_id}", token=token)


def fetch_current_onetime(token, pkg, product_id):
    """既存 onetime product を GET。 404 ありうる (= Sess48 の "GET 404" 既知の癖)。"""
    try:
        return C.http("GET", f"{AP}/applications/{pkg}/onetimeproducts/{product_id}", token=token)
    except Exception as e:
        C.log(f"  (onetime GET 注意: {type(e).__name__} — Sess48 既知)")
        return None


def summarize_basePlan(bp: dict) -> str:
    """basePlan の territory 状態を要約。"""
    rc = bp.get("regionalConfigs", []) or []
    orc = bp.get("otherRegionsConfig", {}) or {}
    rc_regions = [r.get("regionCode") for r in rc]
    return (
        f"basePlanId={bp.get('basePlanId')} state={bp.get('state', '?')} "
        f"regionalConfigs={len(rc_regions)} regions ({', '.join(rc_regions[:5])}{'...' if len(rc_regions) > 5 else ''}) "
        f"otherRegionsConfig usd={'set' if orc.get('usdPrice') else 'missing'} "
        f"eur={'set' if orc.get('eurPrice') else 'missing'} "
        f"newSubscriber={orc.get('newSubscriberAvailability', '?')}"
    )


def build_new_basePlans(cfg_basePlans: list) -> list:
    """新しい basePlans を構築 (= regionalConfigs を空にして全地域自動換算)。"""
    new_bps = []
    for bp in cfg_basePlans:
        new_bps.append({
            "basePlanId": bp["basePlanId"],
            "state": "ACTIVE",
            "otherRegionsConfig": {
                "usdPrice": usd_money(bp["priceUsd"]),
                "eurPrice": eur_money(bp["priceUsd"]),
                "newSubscriberAvailability": True,
            },
            "autoRenewingBasePlanType": {
                "billingPeriodDuration": bp["billingPeriodDuration"]
            },
            # regionalConfigs は空 (= 全 territory が otherRegionsConfig から自動換算される)
            "regionalConfigs": [],
        })
    return new_bps


def expand_subscription(token, pkg, sub_id, cfg_basePlans, sub_listings, commit: bool):
    C.log(f"\n--- サブスク {sub_id} ---")
    current = fetch_current_sub(token, pkg, sub_id)
    C.log(f"  ✅ 既存 subscription GET 成功")
    current_bps = current.get("basePlans", [])
    for bp in current_bps:
        C.log(f"  [現状] {summarize_basePlan(bp)}")
    C.log(f"  [計画後] regionalConfigs を空 (= MN single entry 削除) + otherRegionsConfig USD/EUR で 全 175 territory 自動換算")
    C.log(f"  [計画後] regionsVersion: 2022/01 → {REGIONS_VERSION}")

    if not commit:
        C.log("  [dry-run] subscription PATCH せず")
        return

    # PATCH で basePlans + listings を update
    new_bps = build_new_basePlans(cfg_basePlans)
    listings = []
    for lang, l in sub_listings.items():
        listings.append({
            "languageCode": lang, "title": l["title"],
            "benefits": [l.get("benefit1", ""), l.get("benefit2", "")],
            "description": l["description"],
        })
    body = {
        "packageName": pkg,
        "productId": sub_id,
        "listings": listings,
        "basePlans": new_bps,
    }
    # updateMask で basePlans + listings のみ update (= 他フィールドは Google 側維持)
    url = (
        f"{AP}/applications/{pkg}/subscriptions/{sub_id}"
        f"?regionsVersion.version={REGIONS_VERSION}"
        f"&updateMask=basePlans,listings"
    )
    try:
        C.http("PATCH", url, token=token, json_body=body)
        C.log(f"  ✅ subscription PATCH 成功 ({sub_id})")
    except Exception as e:
        C.log(f"  ❌ subscription PATCH 失敗: {type(e).__name__}")
        if hasattr(e, "read"):
            try:
                err_body = e.read().decode("utf-8", "replace")
                C.log(f"  --- error body ---\n{err_body}\n  --- end error body ---")
            except Exception:
                pass
        C.log(f"  --- url: {url}")
        C.log(f"  --- request body (truncated to 2000 chars) ---")
        C.log(json.dumps(body, ensure_ascii=False)[:2000])
        C.log(f"  --- end request body ---")
        raise


def expand_onetime(token, pkg, life_cfg, commit: bool):
    product_id = life_cfg["productId"]
    C.log(f"\n--- 買い切り {product_id} ---")
    current = fetch_current_onetime(token, pkg, product_id)
    if current:
        C.log(f"  ✅ 既存 onetime GET 成功")
        po = (current.get("purchaseOptions") or [{}])[0]
        rpac = po.get("regionalPricingAndAvailabilityConfigs", [])
        nrc = po.get("newRegionsConfig", {})
        C.log(f"  [現状] regionalPricing={len(rpac)} regions, newRegionsConfig usd={'set' if nrc.get('usdPrice') else 'missing'} availability={nrc.get('availability', '?')}")
    else:
        C.log(f"  ⚠ 既存 onetime GET 失敗 (Sess48 既知の癖)、 PATCH 冪等で進める")

    C.log(f"  [計画後] regionalPricingAndAvailabilityConfigs 空 + newRegionsConfig.availability=AVAILABLE で 全地域自動換算")

    if not commit:
        C.log("  [dry-run] onetime PATCH せず")
        return

    usd = usd_money(life_cfg["priceUsd"])
    eur = eur_money(life_cfg["priceUsd"])
    one_listings = [
        {"languageCode": lang, "title": l["title"], "description": l["description"]}
        for lang, l in life_cfg["listings"].items()
    ]
    body = {
        "packageName": pkg,
        "productId": product_id,
        "listings": one_listings,
        "purchaseOptions": [{
            "purchaseOptionId": "buy",
            "buyOption": {},
            "regionalPricingAndAvailabilityConfigs": [],
            "newRegionsConfig": {
                "usdPrice": usd,
                "eurPrice": eur,
                "availability": "AVAILABLE",
            },
        }],
    }
    url = (
        f"{AP}/applications/{pkg}/onetimeproducts/{product_id}"
        f"?allowMissing=true&regionsVersion.version={REGIONS_VERSION}"
        f"&updateMask=listings,purchaseOptions"
    )
    try:
        C.http("PATCH", url, token=token, json_body=body)
        C.log(f"  ✅ onetime PATCH 成功 ({product_id})")
    except Exception as e:
        C.log(f"  ❌ onetime PATCH 失敗: {type(e).__name__}")
        if hasattr(e, "read"):
            try:
                err_body = e.read().decode("utf-8", "replace")
                C.log(f"  --- error body ---\n{err_body}\n  --- end error body ---")
            except Exception:
                pass
        C.log(f"  --- url: {url}")
        C.log(f"  --- request body ---")
        C.log(json.dumps(body, ensure_ascii=False)[:2000])
        C.log(f"  --- end request body ---")
        raise


def main():
    commit, cfg_path = C.parse_args(sys.argv[1:])
    cfg = C.load_config(cfg_path)
    g = cfg["google"]
    pkg = g["packageName"]
    mode = "本実行(COMMIT)" if commit else "dry-run(変更なし)"
    C.log(f"=== Google territory 拡張 [{mode}] / {cfg['appName']} ({pkg}) ===")
    C.log(f"  territory: 175 国 (JP + US 含む、 ISO コード)")
    C.log(f"  regionsVersion: {REGIONS_VERSION}")

    token = C.google_token(g)
    C.log("  ✅ 認証OK (OAuthトークン取得)")

    skip_sub = "--skip-subscription" in sys.argv
    skip_one = "--skip-onetime" in sys.argv

    # 1) サブスク (Google API は regional_configs から既存 entry を削除すると拒否するため、
    #    user が Play Console UI で「全地域 ON」 する方が時間効率良い。 --skip-subscription で skip 可能。)
    if not skip_sub:
        try:
            expand_subscription(
                token, pkg,
                sub_id=g["subscriptionId"],
                cfg_basePlans=g["basePlans"],
                sub_listings=g["subscriptionListings"],
                commit=commit,
            )
        except Exception as e:
            C.log(f"\n  ⚠ subscription expand 失敗: {type(e).__name__}。 onetime expand に継続。")
            C.log(f"  → 代替: Play Console UI > Monetize > Products > Subscriptions > bonsailog_pro")
            C.log(f"          → monthly / annual basePlan > Edit > Pricing & availability > Select all regions")
    else:
        C.log("\n--- サブスク (skip、 --skip-subscription) ---")

    # 2) 買い切り
    if not skip_one:
        expand_onetime(token, pkg, g["lifetime"], commit=commit)
    else:
        C.log("\n--- 買い切り (skip、 --skip-onetime) ---")

    if not commit:
        C.log("\n[dry-run] 上記が変更計画です。 問題なければ --commit で実行してください。")
        C.log("[dry-run] 既存 product ID は不変、 RC entitlement との紐付け維持。")
    else:
        C.log("\n=== COMMIT 完了。 RC MCP で再度 get-product-store-state して確認推奨。 ===")


if __name__ == "__main__":
    main()
