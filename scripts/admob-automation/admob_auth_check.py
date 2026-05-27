#!/usr/bin/env python3
"""AdMob API OAuth 同意 + アクセス確認（403 無料チェック）。

store-automation (ADR-0043) と同じ流儀:
  - 標準ライブラリ (urllib) のみ。requests / google-* ライブラリ不使用。
  - 秘密 (client_secret / access_token / refresh_token / 認可コード) は
    標準出力・ログに一切出さない (§0)。

このスクリプトがやること:
  1. デスクトップ OAuth クライアント JSON を読む
       既定: docs/01_key/client_secret_*.json (最新1件を自動検出)
       env ADMOB_OAUTH_CLIENT でパス上書き可。
  2. 保存済み refresh token (docs/01_key/admob_token.json) があれば
       access token を更新するだけ → ブラウザ不要。
     無ければ loopback (http://localhost:PORT) 同意フローを実行:
       URL を表示 → 人間がブラウザで「許可」→ リダイレクトを捕捉
       → refresh token を取得して保存 (0600)。
  3. accounts.list を1回叩く (読むだけ=安全・無料)。
       200 → 認証OK + アカウント可視。publisher ID を表示。
       403 → アクセス不可。
  4. --probe-create 指定時のみ: 「作成API (apps.create)」に
       空ボディ {} を1回だけ送る。
       空ボディは Google のバリデーションで必ず弾かれるため
       "アプリは作成されない"。返ってくるエラーコードで権限を判定:
         403 PERMISSION_DENIED → 作成API は使えない (limited access 未許可)
         400 INVALID_ARGUMENT  → 作成API は使える (認証は通過、ボディだけ不正)
       これで「不可逆な作成」を1件もせずに 403/400 を見分けられる。

使い方:
  python3 admob_auth_check.py                # 同意(初回) + accounts.list
  python3 admob_auth_check.py --probe-create # 上記 + 作成権限の安全プローブ
  python3 admob_auth_check.py --manual       # WSL等でlocalhost捕捉が不調な時、
                                             #   リダイレクトURLを手貼りする方式
"""
from __future__ import annotations

import glob
import json
import os
import socket
import sys
import threading
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer

KEY_DIR = os.environ.get("ADMOB_KEY_DIR", "/home/doooo/04_app-factory/docs/01_key")
TOKEN_PATH = os.path.join(KEY_DIR, "admob_token.json")

# accounts.list には readonly で十分。作成 (apps/adUnits) には monetization が必要。
# 将来の自動化でも同じ token を使い回せるよう、同意時に両方まとめて要求する。
SCOPES = " ".join([
    "https://www.googleapis.com/auth/admob.readonly",
    "https://www.googleapis.com/auth/admob.monetization",
])
AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
ADMOB_V1 = "https://admob.googleapis.com/v1"
ADMOB_V1BETA = "https://admob.googleapis.com/v1beta"


def log(msg: str) -> None:
    print(msg, flush=True)


# ----------------------------- 鍵 / token -----------------------------

def find_client_json() -> str:
    p = os.environ.get("ADMOB_OAUTH_CLIENT")
    if p:
        if not os.path.exists(p):
            raise FileNotFoundError(f"ADMOB_OAUTH_CLIENT が見つかりません: {p}")
        return p
    cands = sorted(glob.glob(os.path.join(KEY_DIR, "client_secret_*.json")),
                   key=os.path.getmtime, reverse=True)
    if not cands:
        raise FileNotFoundError(
            f"client_secret_*.json が {KEY_DIR} にありません。"
            " 手順2でダウンロードした OAuth クライアント JSON を置いてください。")
    return cands[0]


def load_client(path: str) -> dict:
    d = json.load(open(path, encoding="utf-8"))
    node = d.get("installed") or d.get("web")
    if not node:
        raise ValueError("OAuth クライアント JSON の形式が不正 (installed/web キー無し)。"
                         " 種別『デスクトップ アプリ』で作り直してください。")
    return node


def save_token(tok: dict) -> None:
    with open(TOKEN_PATH, "w", encoding="utf-8") as f:
        json.dump(tok, f, ensure_ascii=False, indent=2)
    os.chmod(TOKEN_PATH, 0o600)
    log(f"  → refresh token を保存しました: {TOKEN_PATH} (パーミッション 600)")


# ----------------------------- HTTP -----------------------------

def http(method: str, url: str, token: str | None = None,
         json_body: dict | None = None, form: dict | None = None):
    """2xx は dict を返す。非2xx は urllib.error.HTTPError を送出。"""
    headers: dict[str, str] = {}
    payload: bytes | None = None
    if token:
        headers["Authorization"] = "Bearer " + token
    if json_body is not None:
        payload = json.dumps(json_body).encode()
        headers["Content-Type"] = "application/json"
    elif form is not None:
        payload = urllib.parse.urlencode(form).encode()
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    req = urllib.request.Request(url, data=payload, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=40) as r:
        raw = r.read().decode("utf-8", "replace")
        return json.loads(raw) if raw.strip() else {}


def exchange_token(client: dict, form: dict) -> dict:
    form = dict(form)
    form["client_id"] = client["client_id"]
    form["client_secret"] = client["client_secret"]
    return http("POST", client["token_uri"], form=form)


# ----------------------------- OAuth flows -----------------------------

def get_access_token(client: dict, manual: bool) -> str:
    # 1) 保存済み refresh token で更新を試す (ブラウザ不要)
    if os.path.exists(TOKEN_PATH):
        saved = json.load(open(TOKEN_PATH, encoding="utf-8"))
        rt = saved.get("refresh_token")
        if rt:
            try:
                log("保存済み refresh token を使って access token を更新します…")
                t = exchange_token(client, {"grant_type": "refresh_token", "refresh_token": rt})
                return t["access_token"]
            except urllib.error.HTTPError as e:
                log(f"  refresh 失敗 (HTTP {e.code})。同意をやり直します。")

    # 2) 同意フロー
    if manual:
        return consent_manual(client)
    return consent_loopback(client)


def build_auth_url(client: dict, redirect_uri: str) -> str:
    q = {
        "client_id": client["client_id"],
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": SCOPES,
        "access_type": "offline",  # refresh token を得るため
        "prompt": "consent",       # 毎回 refresh token を確実に発行させる
    }
    return AUTH_ENDPOINT + "?" + urllib.parse.urlencode(q)


def _print_consent_help(url: str) -> None:
    log("")
    log("=" * 70)
    log("【ブラウザで同意してください】")
    log("下の URL を Windows のブラウザで開き、doooooraku@gmail.com で")
    log("ログイン → 「許可」を押してください。")
    log('途中「このアプリは確認されていません」と出たら →')
    log('  「詳細」→「(アプリ名) に移動」をクリック (テスト中アプリなので正常)。')
    log("-" * 70)
    log(url)
    log("=" * 70)
    log("")


def consent_loopback(client: dict) -> str:
    holder: dict[str, str] = {}

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):  # noqa: N802
            qs = urllib.parse.urlparse(self.path).query
            params = urllib.parse.parse_qs(qs)
            holder["code"] = (params.get("code") or [""])[0]
            holder["error"] = (params.get("error") or [""])[0]
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            msg = "認証が完了しました。このタブを閉じてターミナルに戻ってください。"
            self.wfile.write(f"<html><body><h2>{msg}</h2></body></html>".encode())

        def log_message(self, *a):  # サーバのアクセスログを抑制
            pass

    # 空きポートを取得して localhost にバインド
    s = socket.socket(); s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]; s.close()
    redirect_uri = f"http://localhost:{port}"
    httpd = HTTPServer(("127.0.0.1", port), Handler)
    httpd.timeout = 300

    _print_consent_help(build_auth_url(client, redirect_uri))
    log(f"(ローカル待受: {redirect_uri} — 最大5分待ちます)")

    t = threading.Thread(target=httpd.handle_request)  # 1リクエストだけ捌く
    t.start(); t.join(timeout=310)

    if holder.get("error"):
        raise RuntimeError(f"同意が拒否されました: {holder['error']}")
    code = holder.get("code")
    if not code:
        raise RuntimeError(
            "リダイレクトを捕捉できませんでした。WSL の localhost 転送が不調かもしれません。\n"
            "  → `python3 admob_auth_check.py --manual` で手貼り方式をお試しください。")

    tok = exchange_token(client, {
        "grant_type": "authorization_code", "code": code, "redirect_uri": redirect_uri})
    save_token(tok)
    return tok["access_token"]


def consent_manual(client: dict) -> str:
    # OOB は廃止のため localhost を使うが、リダイレクト後の URL を手で貼ってもらう
    redirect_uri = "http://localhost:8765"
    _print_consent_help(build_auth_url(client, redirect_uri))
    log("ブラウザは『このサイトにアクセスできません localhost で接続が拒否されました』")
    log("等になりますが問題ありません。その時のアドレスバーの URL 全体をコピーして、")
    log("ここに貼り付けて Enter を押してください:")
    pasted = input("redirect URL> ").strip()
    qs = urllib.parse.urlparse(pasted).query
    code = (urllib.parse.parse_qs(qs).get("code") or [""])[0]
    if not code:
        raise RuntimeError("URL から code= を取り出せませんでした。URL 全体を貼れているか確認してください。")
    tok = exchange_token(client, {
        "grant_type": "authorization_code", "code": code, "redirect_uri": redirect_uri})
    save_token(tok)
    return tok["access_token"]


# ----------------------------- チェック本体 -----------------------------

def check_accounts(token: str) -> str | None:
    log("")
    log("[1/2] accounts.list を呼び出します (読むだけ=安全)…")
    try:
        res = http("GET", f"{ADMOB_V1}/accounts", token=token)
    except urllib.error.HTTPError as e:
        log(f"  ✕ HTTP {e.code}: アカウント一覧を取得できませんでした。")
        log(f"    詳細: {e.read().decode('utf-8','replace')[:300]}")
        return None
    accounts = res.get("account", [])
    if not accounts:
        log("  △ 認証は成功しましたが、AdMob アカウントが0件でした。")
        log("    このGoogleアカウントに AdMob パブリッシャーが紐づいているか確認してください。")
        return None
    acc = accounts[0]
    log(f"  ✓ 200 OK — AdMob アカウントが見えました:")
    log(f"      name        : {acc.get('name')}")
    log(f"      publisherId : {acc.get('publisherId')}")
    log(f"      通貨/国      : {acc.get('currencyCode')} / {acc.get('reportingTimeZone')}")
    return acc.get("name")  # 例: "accounts/pub-XXXXXXXXXXXXXXXX"


def probe_create(token: str, account_name: str) -> None:
    log("")
    log("[2/2] 作成権限プローブ: apps.create に【空ボディ】を1回送ります。")
    log("       ⚠️ 重要(Sess50 で判明): 空ボディの結果では作成可否は判定できません。")
    log("       Google は ①ボディ schema 検証 → ②認可 の順で評価するため、")
    log("       空ボディは①で 400 になり、②(limited access)に到達しません。")
    log("       真の判定は admob_create.py --commit (有効ボディ) の 403/成功 のみ。")
    url = f"{ADMOB_V1BETA}/{account_name}/apps"
    try:
        http("POST", url, token=token, json_body={})
        log("  ?! 予期せず 2xx が返りました (通常は起きません)。レスポンスを確認してください。")
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:200]
        if e.code == 400:
            log("  △ 400 INVALID_ARGUMENT — 認証は通過したが、これは【作成可の証拠にならない】。")
            log("    実際の作成権限は admob_create.py --commit (有効ボディ) で確認すること。")
        elif e.code == 403:
            log("  ✕ 403 PERMISSION_DENIED — 作成APIは許可されていません(limited access)。")
            log("    → アプリ/広告ユニット作成は手作業 (B案) に切り替え。")
        else:
            log(f"  ? HTTP {e.code} — 想定外。詳細: {detail}")


def main(argv: list[str]) -> int:
    manual = "--manual" in argv
    do_probe = "--probe-create" in argv

    client_path = find_client_json()
    log(f"OAuth クライアント JSON: {client_path}")
    client = load_client(client_path)
    if client.get("project_id"):
        log(f"  project_id: {client['project_id']}")

    token = get_access_token(client, manual=manual)
    account_name = check_accounts(token)

    if do_probe:
        if account_name:
            probe_create(token, account_name)
        else:
            log("\n[2/2] アカウントが取得できなかったため、作成プローブはスキップします。")
    else:
        log("\n(作成権限まで確認したい場合は --probe-create を付けて再実行してください)")

    log("\n完了。")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except (FileNotFoundError, ValueError, RuntimeError) as e:
        log(f"エラー: {e}")
        sys.exit(1)
