# store-automation — ストア課金商品の API 自動作成

ADR-0043 準拠。Apple App Store Connect API と Google Android Publisher API で、
課金商品（月額 / 年額 / 買い切り）の **作成・価格設定** を自動化する。

> **RevenueCat MCP ではストア商品は作れない**ため、各ストアの公式 API を使う。

## 前提（人間が事前に済ませる / 既に完了済み）

- Apple: 有料App契約・銀行/税務、ASC API キー（`.p8`）、アプリレコード作成 → **完了済み**
- Google: 支払いプロファイル、サービスアカウント JSON、アプリ作成 → **完了済み**
- 鍵は app-factory 共通 `docs/01_key/` に保管（git 管理外）。

## 設定

`config.bonsailog.json` に 1 アプリ分の値を集約（製品ID / 価格 / 表示名 / 期間）。
製品IDは **作成後 変更・削除 不可**。価格は **USD 基準**（各国はストアが自動換算）。

鍵パスは環境変数で上書き可:

- `ASC_P8_PATH` / `ASC_API_KEY_ISSUER_ID`（未指定時は config の default / Repolog eas.json から取得）
- `GOOGLE_SA_PATH`

## 実行（必ず dry-run → 確認 → commit）

```bash
# 1) dry-run: 認証確認 + 既存読み取り + 「作成予定」表示（無変更・安全）
python3 apple_create_products.py
python3 google_create_products.py

# 2) 内容を確認したら本実行（製品を作成。不可逆!）
python3 apple_create_products.py --commit
python3 google_create_products.py --commit
```

## 依存

- Python3 + PyJWT + cryptography（検証済）。`requests` 不要（urllib のみ）。

## 注意

- **製品IDは不変** → dry-run を必ず確認してから `--commit`。
- Apple: 初回 IAP/サブスクは **アプリ本体バージョンと同時に審査提出 → 承認待ち**（API では飛ばせない）。
- Google: 商品の購入テスト/公開には **AAB を内部テストにアップロード**が別途必要。
- 価格設定: Apple は price point から最近傍を選択、Google は US 価格を明示（他国は自動換算/将来地域設定）。初回 `--commit` のログを見て価格スキーマを微調整する場合あり。
- 秘密（`.p8` / JSON / token）はログ・コミットに出さない（§0 / ADR-0043）。

## 次工程（本スクリプトのスコープ外）

- RevenueCat ダッシュボード構築（製品 → entitlement `premium` → offering `default`、RevenueCat MCP）
- 実機サンドボックステスト / Apple 審査提出 / Google AAB
