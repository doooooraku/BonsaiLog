#!/usr/bin/env python3
"""AdMob アプリ + バナー広告ユニットの API 自動作成 (ADR-0044)。

store-automation (ADR-0043) と同じ流儀:
  - 標準ライブラリ (urllib) のみ。秘密は標準出力・ログ・commit に出さない (§0)。
  - 既定は dry-run (無変更)。--commit で実作成。作成は API/UI とも【取り消し不可】。
  - 冪等: 同 platform+displayName のアプリ / 同 displayName の広告ユニットが
    既存なら作成せず再利用 (二重作成防止)。

前提: admob_auth_check.py を先に1回実行し、docs/01_key/admob_token.json
(refresh token) を作成済みであること。本スクリプトはブラウザ同意に入らない。

使い方:
  python3 admob_create.py                       # dry-run: 作成予定を表示 (無変更)
  python3 admob_create.py --commit              # 実作成 (不可逆)
  python3 admob_create.py --commit --write-env  # 実作成 + .env に4IDを書込
  python3 admob_create.py --write-env           # (既存4件が揃っていれば).env のみ更新
  python3 admob_create.py --config <path>       # 別アプリの config を指定
"""
from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.error

# 同ディレクトリの admob_auth_check からヘルパを再利用
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from admob_auth_check import (  # noqa: E402
    ADMOB_V1,
    ADMOB_V1BETA,
    TOKEN_PATH,
    exchange_token,
    find_client_json,
    http,
    load_client,
    log,
)

DEFAULT_CONFIG = "config.bonsailog.admob.json"


# ----------------------------- 認証 (非対話) -----------------------------

def get_token_noninteractive(client: dict) -> str:
    if not os.path.exists(TOKEN_PATH):
        raise RuntimeError(
            f"token が見つかりません: {TOKEN_PATH}\n"
            "  先に `python3 admob_auth_check.py` を実行して同意を済ませてください。")
    saved = json.load(open(TOKEN_PATH, encoding="utf-8"))
    rt = saved.get("refresh_token")
    if not rt:
        raise RuntimeError("保存済み token に refresh_token がありません。admob_auth_check.py を再実行してください。")
    t = exchange_token(client, {"grant_type": "refresh_token", "refresh_token": rt})
    return t["access_token"]


# ----------------------------- API -----------------------------

def get_account(token: str) -> str:
    res = http("GET", f"{ADMOB_V1}/accounts", token=token)
    accs = res.get("account", [])
    if not accs:
        raise RuntimeError("AdMob アカウントが0件です。Googleアカウントに publisher が紐づくか確認してください。")
    return accs[0]["name"]  # accounts/pub-XXXXXXXXXXXXXXXX


def list_apps(token: str, account: str) -> list[dict]:
    return http("GET", f"{ADMOB_V1BETA}/{account}/apps", token=token).get("apps", [])


def list_adunits(token: str, account: str) -> list[dict]:
    return http("GET", f"{ADMOB_V1BETA}/{account}/adUnits", token=token).get("adUnits", [])


def app_display_name(app: dict) -> str:
    info = app.get("manualAppInfo") or app.get("linkedAppInfo") or {}
    return info.get("displayName", "")


def post_with_retry(url: str, token: str, body: dict, tries: int = 3) -> dict:
    last = None
    for i in range(tries):
        try:
            return http("POST", url, token=token, json_body=body)
        except urllib.error.HTTPError as e:
            last = e
            if e.code >= 500 and i < tries - 1:
                time.sleep(1.5)
                continue
            raise
    raise last  # type: ignore[misc]


def create_app(token: str, account: str, platform: str, display_name: str) -> dict:
    body = {"platform": platform, "manualAppInfo": {"displayName": display_name}}
    return post_with_retry(f"{ADMOB_V1BETA}/{account}/apps", token, body)


def create_adunit(token: str, account: str, app_id: str, display_name: str,
                  ad_format: str, ad_types: list[str]) -> dict:
    body = {"appId": app_id, "displayName": display_name,
            "adFormat": ad_format, "adTypes": ad_types}
    return post_with_retry(f"{ADMOB_V1BETA}/{account}/adUnits", token, body)


# ----------------------------- .env 更新 -----------------------------

def update_env(env_path: str, mapping: dict[str, str]) -> None:
    text = open(env_path, encoding="utf-8").read() if os.path.exists(env_path) else ""
    for key, val in mapping.items():
        line = f"{key}={val}"
        pat = re.compile(rf"^{re.escape(key)}=.*$", re.MULTILINE)
        if pat.search(text):
            text = pat.sub(line, text)
        else:
            if text and not text.endswith("\n"):
                text += "\n"
            text += line + "\n"
    with open(env_path, "w", encoding="utf-8") as f:
        f.write(text)
    log(f"  → .env を更新しました: {env_path} ({len(mapping)}キー)")


# ----------------------------- main -----------------------------

def parse_args(argv: list[str]) -> tuple[bool, bool, str]:
    commit = "--commit" in argv
    write_env = "--write-env" in argv
    cfg = DEFAULT_CONFIG
    for i, a in enumerate(argv):
        if a == "--config" and i + 1 < len(argv):
            cfg = argv[i + 1]
    return commit, write_env, cfg


def main(argv: list[str]) -> int:
    commit, write_env, cfg_path = parse_args(argv)
    mode = "本実行 (--commit)" if commit else "dry-run (無変更)"
    log(f"=== admob_create / モード: {mode} ===")

    cfg = json.load(open(cfg_path, encoding="utf-8"))
    client = load_client(find_client_json())
    token = get_token_noninteractive(client)
    account = get_account(token)
    log(f"アカウント: {account}")

    existing_apps = list_apps(token, account)
    existing_units = list_adunits(token, account)

    # envKey -> 解決した ID
    resolved: dict[str, str] = {}
    # platform -> appId (広告ユニット作成で参照)
    app_id_by_platform: dict[str, str] = {}

    # --- アプリ ---
    log("\n[アプリ]")
    for a in cfg["apps"]:
        plat, name, env_key = a["platform"], a["displayName"], a["envKey"]
        match = next((x for x in existing_apps
                      if x.get("platform") == plat and app_display_name(x) == name), None)
        if match:
            app_id = match["appId"]
            app_id_by_platform[plat] = app_id
            resolved[env_key] = app_id
            log(f"  ✓ 既存 (skip): {plat} '{name}' → {app_id}")
        elif not commit:
            log(f"  + 作成予定: {plat} アプリ '{name}'  ({env_key})")
        else:
            res = create_app(token, account, plat, name)
            app_id = res["appId"]
            app_id_by_platform[plat] = app_id
            resolved[env_key] = app_id
            log(f"  ✚ 作成しました: {plat} '{name}' → {app_id}")

    # --- 広告ユニット ---
    log("\n[広告ユニット (バナー)]")
    for u in cfg["adUnits"]:
        plat, name, env_key = u["platform"], u["displayName"], u["envKey"]
        match = next((x for x in existing_units if x.get("displayName") == name), None)
        if match:
            resolved[env_key] = match["adUnitId"]
            log(f"  ✓ 既存 (skip): {plat} '{name}' → {match['adUnitId']}")
            continue
        app_id = app_id_by_platform.get(plat)
        if not commit:
            base = app_id or "(アプリ作成後に決定)"
            log(f"  + 作成予定: {plat} バナー '{name}'  appId={base}  ({env_key})")
        elif not app_id:
            log(f"  ✕ {plat} のアプリ appId が無いため広告ユニットを作成できません: '{name}'")
        else:
            res = create_adunit(token, account, app_id, name, u["adFormat"], u["adTypes"])
            resolved[env_key] = res["adUnitId"]
            log(f"  ✚ 作成しました: {plat} '{name}' → {res['adUnitId']}")

    # --- 結果サマリ ---
    log("\n[.env マッピング]")
    all_keys = [a["envKey"] for a in cfg["apps"]] + [u["envKey"] for u in cfg["adUnits"]]
    for k in all_keys:
        log(f"  {k} = {resolved.get(k, '(未解決)')}")

    # --- .env 書込 ---
    if write_env:
        env_path = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(cfg_path)),
                                                  cfg.get("envPath", "../../.env")))
        if all(k in resolved for k in all_keys):
            log("")
            update_env(env_path, {k: resolved[k] for k in all_keys})
        else:
            log("\n  △ --write-env: まだ未解決のIDがあるため .env は更新しません。")
            log("    (dry-run では作成前なので未確定。--commit で作成後にもう一度実行してください)")
    else:
        log("\n(.env に書き込むには --write-env を付けてください)")

    if not commit:
        log("\n→ 内容を確認し、問題なければ `--commit --write-env` で本実行してください (作成は不可逆)。")
    log("\n完了。")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except (FileNotFoundError, ValueError, RuntimeError) as e:
        log(f"エラー: {e}")
        sys.exit(1)
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:400]
        log(f"APIエラー: HTTP {e.code}\n{detail}")
        sys.exit(1)
