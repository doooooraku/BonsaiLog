"""store-automation 共通ユーティリティ (ADR-0043)。

- 設定/鍵の読み込み (秘密は標準出力に出さない)
- Apple ASC API 用 JWT 生成
- Google サービスアカウント OAuth トークン取得
- HTTP ヘルパ (GET/POST、500 リトライ)

依存: PyJWT, cryptography (検証済: 2.7.0 / 41.x)。requests 不使用 (urllib のみ)。
"""
from __future__ import annotations
import json, os, re, time, urllib.request, urllib.error, urllib.parse, sys
import jwt  # PyJWT

# ----------------------------- 設定/鍵 -----------------------------

def load_config(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def resolve_path(env_name: str | None, default: str | None) -> str:
    p = (os.environ.get(env_name) if env_name else None) or default
    if not p or not os.path.exists(p):
        raise FileNotFoundError(f"鍵/ファイルが見つかりません: env={env_name} default={default}")
    return p


def read_issuer_id(cfg_apple: dict) -> str:
    """Issuer ID を env か Repolog eas.json から取得 (committed config には書かない)。"""
    env = cfg_apple.get("issuerIdEnv")
    if env and os.environ.get(env):
        return os.environ[env]
    eas = cfg_apple.get("issuerIdFromEasJson")
    if eas and os.path.exists(eas):
        txt = open(eas, encoding="utf-8").read()
        m = re.search(r'"ascApiKeyIssuerId"\s*:\s*"([^"]+)"', txt)
        if m:
            return m.group(1)
    raise RuntimeError("Issuer ID を取得できません (env か eas.json を確認)")


# ----------------------------- Apple ASC -----------------------------

ASC_BASE = "https://api.appstoreconnect.apple.com"


def asc_token(cfg_apple: dict) -> str:
    p8 = resolve_path(cfg_apple.get("p8PathEnv"), cfg_apple.get("p8PathDefault"))
    key_id = cfg_apple["p8KeyId"]
    issuer = read_issuer_id(cfg_apple)
    now = int(time.time())
    return jwt.encode(
        {"iss": issuer, "iat": now, "exp": now + 600, "aud": "appstoreconnect-v1"},
        open(p8, encoding="utf-8").read(),
        algorithm="ES256",
        headers={"kid": key_id, "typ": "JWT"},
    )


# ----------------------------- Google OAuth -----------------------------

def google_token(cfg_google: dict) -> str:
    sa_path = resolve_path(cfg_google.get("serviceAccountPathEnv"), cfg_google.get("serviceAccountPathDefault"))
    sa = json.load(open(sa_path, encoding="utf-8"))
    now = int(time.time())
    assertion = jwt.encode(
        {"iss": sa["client_email"], "scope": "https://www.googleapis.com/auth/androidpublisher",
         "aud": "https://oauth2.googleapis.com/token", "iat": now, "exp": now + 3600},
        sa["private_key"], algorithm="RS256",
    )
    data = urllib.parse.urlencode({
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": assertion}).encode()
    body = http("POST", "https://oauth2.googleapis.com/token", data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"})
    return body["access_token"]


# ----------------------------- HTTP -----------------------------

def http(method: str, url: str, token: str | None = None, json_body: dict | None = None,
         data: bytes | None = None, headers: dict | None = None, tries: int = 3):
    """HTTP 実行。2xx は dict を返す。4xx/5xx は HTTPError を送出 (5xx はリトライ)。"""
    h = dict(headers or {})
    if token:
        h["Authorization"] = "Bearer " + token
    payload = data
    if json_body is not None:
        payload = json.dumps(json_body).encode()
        h.setdefault("Content-Type", "application/json")
    last = None
    for i in range(tries):
        req = urllib.request.Request(url, data=payload, headers=h, method=method)
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                raw = r.read().decode("utf-8", "replace")
                return json.loads(raw) if raw.strip() else {}
        except urllib.error.HTTPError as e:
            last = e
            if e.code >= 500 and i < tries - 1:
                time.sleep(1.5); continue
            raise
    raise last


def mask(s: str) -> str:
    """長い英数字列(鍵/トークン断片)を伏字化してログ出力する用。"""
    return re.sub(r"[A-Za-z0-9_\-]{20,}", "<伏字>", s or "")


def log(msg: str):
    print(msg, flush=True)


def parse_args(argv):
    """--commit で本実行、無指定は dry-run。--config でパス指定。"""
    commit = "--commit" in argv
    cfg = "config.bonsailog.json"
    for i, a in enumerate(argv):
        if a == "--config" and i + 1 < len(argv):
            cfg = argv[i + 1]
    return commit, cfg
