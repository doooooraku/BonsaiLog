# IAP / 課金 / RevenueCat 関連 lesson (Sess81 起こし)

> **目的**: Sess81 (2026-06-09) で発生した IAP 構造修復 + 振り返り対策で得られた学びを、 領域別 lesson として永続記録。 新規開発者 (= 量産アプリ含む) が 同じ事故を避けるための実用知識。
>
> **対象**: BonsaiLog / Repolog / app-factory 派生アプリの課金実装担当。

---

## L-IAP-001: territory MN-only 罠 (Sess47-Sess81、 3 ヶ月放置)

### 何が起きたか

Sess47-48 (2026-05-26) で `google_create_products.py` を実行して subscription / one-time product を作成したが、 Google Play Console の Country/region availability が **`MN` (モンゴル) のみ登録**されてしまった。 3 ヶ月後 (Sess81、 2026-06-09) にテスター 12 人から「サブスクの購入はまだ未対応?」 苦情で発覚。 JP / US 含む 174 国で `Purchases.getOfferings()` が `current=null` を返し、 Paywall「利用不可」 + 「購入に失敗しました」 ダイアログ。

### 真因

- `google_create_products.py` が `regionalConfigs` を**明示せず** `otherRegionsConfig` だけ指定 (= 全地域自動換算を想定)
- Google API が「販売開始 region は明示必須」 と内部判定、 何らかの理由 (= 当時の log なし) で **MN 単独 entry** を作成
- ADR-0043 §Acceptance に「territory が全国 ON」 verify が欠落

### 修復

- **既存 broken state は API 経由不可** (= Google が region 削除を拒否、 `Cannot remove region once it has been added: MN` 400 エラー)
- Play Console UI > Subscriptions > basePlan > Pricing & availability > Country/region availability > **Select all regions** > **Set prices で USD 一括設定** > Save (= 約 10-15 分の手動操作)

### 構造解決 (= Sess82 で実施)

- **R-68 起票** (= Sess81 PR #1009): 外部サービス連携 ADR は preflight smoke test 配線済が Accepted 必須
- **`google_create_products.py` 175 国明示化** (= Sess82 PR-D #1014): `TERRITORIES_175` const + `regionalConfigs` / `regionalPricingAndAvailabilityConfigs` 明示展開、 新規アプリで構造的に同事故ゼロ化
- **template/app_template に反映** (= Sess82 PR-D): 量産時 新規アプリで自動継承

### 関連

- ADR-0043 §Acceptance (= R-68 適用 4 必須項目化)
- ADR-0049 §Pro 機能境界 7 項目
- Engram id=510 (= Google API region 削除拒否)
- `docs/how-to/release/iap-setup-checklist.md` (= 12 step + Q&A)

---

## L-IAP-002: Lifetime DRAFT 残り (Sess48-Sess81)

### 何が起きたか

Sess48 で Google one-time product `bonsailog_pro_lifetime` を `PATCH ?allowMissing=true` で作成成功したが、 **`state=DRAFT` のまま `:activate` が呼ばれず**、 販売対象として認識されない状態が継続。

### 真因

- `google_create_products.py` が one-time product 作成後の `:activate` 呼出を未実装
- ADR-0043 §フォローアップ に「販売/購入テスト前に有効化が必要になる可能性 → 後工程で対応」 と先送り宣言

### 構造解決 (= Sess82 PR-D)

- `google_create_products.py` Lifetime PATCH 後に `onetimeproducts:activate` を自動呼出
- ADR-0043 §Acceptance に「basePlan / Lifetime 共に `state: ACTIVE`」 必須項目化

---

## L-IAP-003: RC MCP の Limited Beta API 罠

### 何が起きたか

Sess81 で RC MCP `create-product-store-state-plan` を呼んで Play Console の territory 修復を試みたが、 **`HTTP 403 Product store state plans are currently a limited beta feature`** で拒否。 RC MCP の `set-product-store-state` も **`app_store` のみ対応**、 `play_store` 不可。

### 真因

- RC MCP の便利 API は limited beta で project 別に opt-in 必要
- Play Store 側の state 管理は直接 Google Android Publisher API を叩く必要

### 構造解決

- RC support に申請して limited beta opt-in
- もしくは Google Android Publisher API 直叩き (= Sess81 で `google_expand_territories.py` で実証、 ただし region 削除は API 不可、 Play Console UI 必須)

### 関連

- `scripts/store-automation/google_expand_territories.py` (= 試行記録 + verbose error)

---

## L-IAP-004: アプリ側 `purchaseFailed` 万能エラーの構造問題

### 何が起きたか

Sess81 で Paywall ボタン tap 時に「購入に失敗しました。 後でもう一度お試しください。」 という 万能エラーが表示され、 テスター 12 人が「壊れたアプリ」 と判定して uninstall リスク。 真因は territory MN-only だが、 アプリ側の UI 文言が原因を区別していなかった。

### 真因

- `PaywallScreen.tsx` の `PURCHASE_ERROR_MESSAGE_KEY` で `unknown` = `purchaseFailed` の万能 fallback
- `proService.ts` `purchase()` で `Error('Package not found.')` という generic Error throw、 `mapPurchaseErrorCode` で `unknown` 判定

### 構造解決 (= Sess81 PR #1008)

- `BillingError` class 新規作成、 `code: 'BILLING_OFFERINGS_EMPTY'` / `'BILLING_PACKAGE_NOT_FOUND'` の文字列 code 化
- `PurchaseErrorKind` に `offeringsEmpty` 追加、 「ストア準備中」 文言で前向きに表示
- 19 言語 fallback 追加

### 教訓

- 「画面 = OK = リリース OK」 と判断する暗黙バイアスを構造的に防ぐ
- OWASP 一般エラーメッセージ設計でも「原因を特定できる文言」 が原則

---

## L-IAP-005: 24 時間プロパゲーション (= Google → RevenueCat 同期遅延)

### 何が起きたか

Sess81 で user が Play Console UI で territory 修復後、 RC MCP `get-product-store-state` で Lifetime のみ HTTP 500 retryable が継続 (= subscription 2 件は即時 173 国 + 価格 + ACTIVE 確認できたが、 Lifetime は同期遅延)。

### 真因

- Google Play Console の商品変更は RC との同期に最大 24 時間かかる
- 特に新規 product / state 大幅変更時に同期キャッシュが reset される

### 教訓 + 運用ルール

- 商品 Active 化 + Country availability 設定後、 **24h 経過してから** テスター案内 + 動作確認
- 早ければ 2-3 時間で反映されるが、 24h 保険として明記
- テスター案内文に「アプリを開いて価格が表示されない場合は数時間〜24h 待ってから再度開いてください」 を含める (= Sess81 PR #1008 で `priceUnavailableStorePreparing` 文言として実装)

---

## L-IAP-006: License Tester opt-in URL クリック必須

### 何が起きたか

Sess81 で Play Console > Settings > License testing にテスター 12 人の Google アカウントを登録しても、 テスター個人が **opt-in URL** をクリックしていないと build を引けない。

### 真因

- Google Play の Closed testing の仕様: テスターは個別に opt-in が必要 (= 自動配信ではない)
- opt-in URL は Play Console > Testing > Closed testing > **Manage testers** > Web link に表示

### 教訓

- テスター登録時に opt-in URL を一緒に案内する手順を必須化
- `docs/how-to/release/iap-setup-checklist.md` Step 9 に明示済

---

## 関連 R-rules / ADR

- **R-68** (= Sess81 起票): 外部サービス連携 ADR は preflight smoke test 配線済が Accepted 必須
- **R-69** (= Sess82 PR-F 起票): pre-commit hook は新規開発環境でも自動配線
- ADR-0009 (= RevenueCat billing 基盤)
- ADR-0043 (= ストア商品 API 自動作成、 §Acceptance に R-68 適用)
- ADR-0049 (= Pro 機能境界 v1.0)
- `docs/how-to/release/iap-setup-checklist.md` (= 12 step + Q&A)
