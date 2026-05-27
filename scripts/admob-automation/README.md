# admob-automation — AdMob 広告設定の API 自動化（ADR-0044）

store-automation (ADR-0043) と対になる、広告側の自動化ツール。
**標準ライブラリ (urllib) のみ。秘密は出力・ログ・commit に出さない (§0)。**

## 自動化できる範囲（実地確認済み・ADR-0044）

| 手作業                   | API           | 本アカウントの実地結果                                           |
| ------------------------ | ------------- | ---------------------------------------------------------------- |
| アプリ登録 (Android/iOS) | あり (v1beta) | ❌ **403 PERMISSION_DENIED**（limited access）→ 管理画面で手作業 |
| バナー広告ユニット作成   | あり (v1beta) | ❌ 同上（アプリ作成が 403 のため未到達）→ 管理画面で手作業       |
| 欧州規制(GDPR)メッセージ | **なし**      | 管理画面のみ・手作業                                             |
| IDFA メッセージ          | **なし**      | 管理画面のみ・手作業                                             |
| 4 ID の `.env` 記入      | 読み取りで可  | ✅ `admob_create.py --write-env`（手作業作成後に自動転記）       |

> ⚠️ **probe の教訓**: `apps.create` 空ボディ → 400 は「作成可」の証拠**ではない**。
> Google は ①ボディ schema 検証 → ②認可 の順で評価し、空ボディは①で 400（②未到達）。
> 有効ボディで初めて ②に到達し **403**。真の判定は 403-on-valid-body のみ。

AdMob API は **サービスアカウント不可**。ユーザー OAuth 同意 (ブラウザで「許可」を
1 回) → refresh token 保存 → 以降は自動、という形をとる。

## 前提（人間が事前に済ませる / 済）

- Google Cloud プロジェクト `spry-catcher-482116-c4` で **AdMob API 有効化**
- **デスクトップ型 OAuth クライアント** を作成し JSON を `docs/01_key/` に配置
- OAuth 同意画面: 外部 + テストユーザーに自分を登録（テスト中で OK）

## 使い方

```bash
cd scripts/admob-automation

# 同意(初回のみブラウザ) + accounts.list（読むだけ=安全）
python3 admob_auth_check.py

# 上記 + 「作成できる権限があるか」を安全に判定（空ボディを送るだけ＝何も作らない）
python3 admob_auth_check.py --probe-create

# WSL で localhost 捕捉が不調なとき（リダイレクト URL を手貼り）
python3 admob_auth_check.py --manual --probe-create
```

判定の読み方:

- `accounts.list` が **200** → 認証 OK・アカウント可視
- `--probe-create` の 400 は **作成可否を示さない**（上の「probe の教訓」参照）

## 手順（B 案: 手作業作成 + `.env` 自動転記、ADR-0044）

作成 API は本アカウントで 403 のため、アプリ/広告ユニットは管理画面で作る。
ただし命名を `config.bonsailog.admob.json` と一致させれば、ID 転記は自動化できる。

1. **AdMob 管理画面で手作業作成**（Repolog 同様、約10分）:
   - アプリ: `BonsaiLog`（Android / iOS）
   - バナー広告ユニット: `BonsaiLog_Android_Banner_Home_Bottom` / `BonsaiLog_iOS_Banner_Home_Bottom`
2. **4 ID を `.env` に自動転記**（読み取りのみ・安全）:
   ```bash
   cd scripts/admob-automation
   python3 admob_create.py --write-env   # 既存を displayName で検出し .env に記入
   ```
   書き込まれるキー: `ADMOB_ANDROID_APP_ID` / `ADMOB_IOS_APP_ID`（`~`形式 App ID）、
   `ADMOB_ANDROID_BANNER_ID` / `ADMOB_IOS_BANNER_ID`（`/`形式 ad unit ID）。
3. **GDPR / IDFA メッセージを管理画面で作成・公開**（API 無し）。

> `admob_create.py --commit` は残置（将来 Google が作成権限を付与すれば動作）。
> 現状は 403 で安全に失敗し、何も作成しない。

## 鍵 / token の場所（すべて git 管理外）

- クライアント JSON: `docs/01_key/client_secret_*.json`（env `ADMOB_OAUTH_CLIENT` で上書き可）
- 取得した token: `docs/01_key/admob_token.json`（パーミッション 600・自動保存）

## 依存

Python3 標準ライブラリのみ。pip インストール不要。
