---


# ADR-0009: F-13 課金設計（RevenueCat 月/年/買切 + Pocket Casts Champion 方式 + Billing Library 8 移行）

- Status: Proposed
- Date: 2026-04-29
- Deciders: @doooooraku
- Related:
  - 上書き対象: `functional_spec.md` §18（F-13 詳細仕様）— Champion 方式 + 10.x 昇格を反映
  - 連動: ADR-0003（ストレージ方針、Pro 状態の SecureStore 保存）/ ADR-0007（F-11 のバックアップ ZIP に Pro 状態を含めない）/ ADR-0008（F-02 events に Free 制限なし、Free 制限は写真のみ）
  - 影響先: Issue #15 (F-08 写真管理) — Free 3 枚/本 制限 + `isPro` 連携の実装波及
  - 既存資産: Repolog `/src/services/proService.ts`、`/src/stores/proStore.ts`、`/src/features/pro/PaywallScreen.tsx` (95% 踏襲可能)
  - Issue: [#20](https://github.com/doooooraku/BonsaiLog/issues/20)

---

## Context（背景：いま何に困っている？）

- 現状：
  - F-13 は basic_spec §F-13 / functional_spec §18 で「月/年/買切の 3 プラン + RevenueCat」が提案済み。Repolog でも同じ 3 プラン構成が実装済み（買切 ¥9,800 含む）。
  - 既存パッケージ: `react-native-purchases ^9.6.6` がインストール済み（Repolog から踏襲）。
  - product_strategy.md で Lifetime ¥9,800 / 年額 ¥3,980 / 月額 ¥500 の 3 プランが確定済み。
- 困りごと：
  1. **Repolog に「買切購入後にサブスク非表示」UI が未実装**: Repolog は `isPro` 一括判定で全 CTA を disabled にする方針。BonsaiLog はシニアペルソナ（高橋さん 62 歳）向けに「もう買ったのに購入を促される」UX を完全排除したい。
  2. **react-native-purchases 9.6.6 が Billing Library 7 系**: **2026/8/31 に Google Play で Billing Library 7 が deprecated** → 10.x への昇格が事実上必須（リリースタイミング次第）。
  3. **Hermes V1 + New Arch + RC SDK の組合せ未検証**: Expo SDK 55 + RN 0.83 + React 19 + Hermes V1 (試験段階) で react-native-purchases 10.x の動作報告が限定的。
  4. **Local-first 哲学との整合**: RevenueCat は外部サーバーに購入イベントを送信する → constraints.md §1-1 の「ローカル志向」と整合判断が必要。
  5. **Apple Review 5.0 透明性**: 既にサブスク中のユーザーが Lifetime を購入する場合、サブスクは自動キャンセルされない → UI で明示しないとリジェクトリスク。
  6. **Pro → Free 戻りのデータ保護方針が未確定**: Pro で写真 4 枚以上撮影 → 期限切れで Free 戻り → 既存写真をどう扱うか。
- 制約/前提：
  - `docs/reference/constraints.md` §1-1（Local-first、外部サーバー連携は最小限）
  - `docs/reference/constraints.md` §2-1（収益 3 本柱: サブスク + 買切 + バナー広告）
  - `docs/reference/constraints.md` §2-2（Free 制限: 写真 3 枚/本、Pro 無制限）
  - `docs/reference/constraints.md` §5-1（API キー直書き禁止、環境変数注入）
  - 既存パッケージ: `react-native-purchases ^9.6.6`

---

## Decision（決めたこと：結論）

F-13 を以下の構成で実装する。

### コア設計

1. **3 プラン構成**: 月額 ¥500 / 年額 ¥3,980 / Lifetime 買切 ¥9,800（v1.0 固定、A/B テストは v1.x 再評価）
2. **Entitlement / Offering**: `premium` 1 つ + `default` 1 つ
3. **Product ID 命名規則**: `bonsailog_pro_monthly` / `bonsailog_pro_yearly` / `bonsailog_pro_lifetime`（Repolog の `derivePlanType` 文字列マッチ依存に合わせる、短縮命名 `pro_y1` 等は禁止）
4. **App User ID**: 匿名 UUID v4（`$RCAnonymousID:` プレフィックス）。メアド・氏名等の PII は送信しない（Local-first 哲学と整合）

### Repolog 踏襲（95% コピペ）

5. **コピペ対象**:
   - `Repolog/src/services/proService.ts`（237 行、命名変更のみ）
   - `Repolog/src/stores/proStore.ts`（77 行、Zustand 統合）
   - `Repolog/src/features/pro/PaywallScreen.tsx`（566 行、文言・項目を盆栽ドメインに差し替え）
   - `Repolog/app/_layout.tsx` L21-26（CustomerInfoUpdateListener）
   - `Repolog/__tests__/proServicePure.test.ts`（12 ケース、命名変更）
   - `Repolog/app.config.ts` L160-164（API キー注入）+ L5（BILLING_PERMISSION）

### Champion 方式（Repolog にない要件）

6. **「買切購入後にサブスク非表示」UI 制御**: Pocket Casts Champion 方式準拠
   - `useProStore` に `planType === 'lifetime'` セレクタを追加
   - Paywall の monthly/yearly Package を `null` 返す（描画しない）
   - Lifetime カードは「Pro メンバー (買切)」固定バッジ表示
   - Restore Purchases ボタンは常時表示（Apple Review 3.1.1 準拠）
7. **Apple Review 5.0 対応**: 既にサブスク中のユーザーが Lifetime を購入する場合、購入前ダイアログで「サブスクは自動キャンセルされません。App Store の設定から手動で解約してください」と明示
8. **Pro メンバー状態の冗長表示** (シニア UX):
   - Settings → アカウントに「Pro メンバー (買切)」「Pro メンバー (年額・期限まで)」「無料プラン」の 3 状態
   - ホーム画面に小さな「Pro」バッジ常時表示
   - Paywall 開封時の上部固定バナー（Lifetime 所持時）

### Free → Pro → Free データ保護（Notion 方式）

9. **Pro 加入時**: 既存 Free データはそのまま、新規追加が無制限化
10. **Pro → Free 戻り時**: 既存 4 枚以上の写真は **閲覧可能**、新規追加のみ「3 枚まで」制限
11. **Free 制限の実装**: `photoUtils.ts` 純関数で `isPro` を渡すだけ（Repolog 踏襲）。F-08 #15 で実装

### SDK バージョン昇格（最重要 + 期限付き）

12. **`react-native-purchases` 9.6.6 → 10.x 昇格**:
    - **2026/8/31 の Billing Library 7 廃止に対応**
    - F-13 着手と同時に実施（PR 内で同居、別建て不要）
    - Breaking Change: one-time product restore 動作変更（Billing Lib 7 → 8）
    - Sandbox で全フロー検証必須
13. **Hermes V1 + New Arch 検証**: F-13 PR 内で実機ベンチを Phase 0 として実施。動作不能なら一時的に Hermes V1 を無効化、V2 リリースまで待つ

### Restore Purchases 配置

14. **Paywall + Settings 両方に配置**（Apple Review 3.1.1 準拠、Repolog 踏襲）

### オフライン挙動

15. **subscription**: SDK キャッシュ + 3 日グレースピリオド (Repolog 踏襲)
16. **Lifetime**: Offline Entitlements 対象外（RC 仕様）→ **購入直後はオンライン確認強制**を実装

### Privacy Policy / DPA

17. **Privacy Policy 更新**: 「課金管理に RevenueCat を使用、匿名 ID のみ送信、データは EU/US サーバーに保管」を 19 言語で明記
18. **DPA 締結**: RevenueCat 公式から取得（https://www.revenuecat.com/gdpr）、署名後 Privacy Policy にリンク
19. **日本消費税 (JCT 10%)**: Apple/Google が 2025/4 から代理徴収、SDK 側で何もしない

### 適用範囲

- v1.0 から全プラン適用。

---

## Decision Drivers（判断の軸）

- Driver 1: **シニア UX 最大化** — 「もう買ったのに購入を促される」混乱を Champion 方式で完全排除（高橋さん 62 歳ペルソナ向け）。
- Driver 2: **Apple Review 通過の確実性** — 3.1.1 (Restore 必須) / 3.1.2 (Upgrade) / 5.0 (透明性) を業界標準パターンで満たす。
- Driver 3: **Repolog 踏襲によるコスト最小化** — 95% コピペで動く 8 ファイル、命名変更と Champion 方式追加のみ。
- Driver 4: **2026/8/31 期限への確実な対応** — Billing Library 7 廃止前に 10.x 昇格、Sandbox で全フロー検証。
- Driver 5: **Local-first 哲学との整合** — 匿名 UUID 運用、PII 送信なし、ADR で「課金 SDK は外部送信を許容」を明文化。
- Driver 6: **コスト 0** — RevenueCat 無料枠 $2,500 MTR、99% シナリオで $0、外部 API 課金なし。

---

## Alternatives considered（他の案と却下理由）

### Option A: Repolog 完全踏襲（Champion 方式なし、9.6.6 維持）

- 概要: Repolog の `isPro` 一括判定をそのまま使用、SDK バージョンも維持。
- 良い点: コピペ実装最速、学習コスト 0。
- 悪い点: シニア UX で「買切後もサブスク表示」混乱、2026/8/31 Billing Lib 7 廃止で詰む。
- 却下理由: ペルソナ違いの考慮なし、期限リスク高。

### Option B: Adapty 移行

- 概要: Paywall A/B テスト + AI 最適化で訴求力強化。
- 良い点: 価格 A/B テスト機能が優秀、Lifetime ¥7,800 vs ¥9,800 等の検証可能。
- 悪い点: Repolog 踏襲メリット消失（全実装やり直し）、日本語事例少。
- 却下理由: v1.0 は工数最小化、A/B は v1.x で再評価。

### Option C: Apphud 移行

- 概要: 無料枠 $10k MTR で次点候補。
- 良い点: 無料枠が RevenueCat の 4 倍。
- 悪い点: Repolog 踏襲不可、日本語ドキュメント・コミュニティ薄い。
- 却下理由: BonsaiLog 規模では RevenueCat 無料枠 $2,500 で十分、移行メリット薄い。

### Option D: 自前 react-native-iap 実装

- 概要: SDK 不使用、Apple/Google API を直接叩く。
- 良い点: 1% 手数料ゼロ、追跡データ送信なし。
- 悪い点: レシート検証サーバー必須、Apple/Google API 変更追従コスト膨大。シニアエンジニア工数で年間赤字。
- 却下理由: 保守コスト > 1% 手数料、明確に却下。

### Option E: Stripe + Web 経由（外部リンク決済）

- 概要: アプリ外で課金、ストア手数料 30% 回避。
- 良い点: ストア手数料完全回避。
- 悪い点: 日本では「reader app」以外は外部リンク誘導不可（2026 年現在）、19 言語対応で米国限定は不可。
- 却下理由: 日本市場対応不能、却下。

### Option F: 月額廃止して 2 プラン化（年額 + Lifetime のみ）

- 概要: シニア向けに月額 ¥500 を撤廃、年額 + 買切のみ。
- 良い点: シンプル、シニア離脱要因削減。
- 悪い点: Marcus 35 歳ペルソナの月額志向を捨てる、ユーザー要件 (3 プラン維持) と矛盾。
- 却下理由: ユーザー確定要件を変更しない、A/B は v1.x で評価。

---

## Consequences（結果）

### Positive（嬉しい）

- Repolog 95% コピペで実装工数最小（8 ファイル、約 1000 行）。
- Champion 方式により買切ユーザーの UX が業界最高水準（Pocket Casts 準拠）。
- 2026/8/31 Billing Library 7 廃止に確実に対応。
- RevenueCat 無料枠 $2,500 MTR で 99% シナリオ $0 運用。
- Apple Review 3.1.1 / 3.1.2 / 5.0 すべて業界標準パターンで通過。
- Notion 方式データ保護でユーザー信頼を保つ（Pro→Free 戻りで写真消失なし）。

### Negative（辛い/副作用）

- **react-native-purchases 9.6.6 → 10.x Breaking Change**: Restore 動作変更等、Sandbox 全フロー検証コスト発生（半日〜1 日）。
- **Hermes V1 + New Arch + RC SDK 動作未検証**: 動作不能の可能性（推測）、対応不可なら Hermes V1 一時無効化。
- **Champion 方式の独自実装**: Repolog にないため新規コード（推定 100 行）+ テスト追加。
- **Family Sharing トグル**: App Store Connect で一度有効化すると無効化不可、慎重判断必要。
- **DPA 締結 + Privacy Policy 更新**: 19 言語翻訳コスト + 法務確認時間。
- **Apple サーバーのレシート反映遅延**: Sandbox で Restore が一時的に失敗することがある（5 分待ち）→ テスト手順書に明記。

### Follow-ups（後でやる宿題）

- [ ] `docs/reference/functional_spec.md` §18 を Champion 方式 + 10.x 昇格 + Notion 方式データ保護で書き換え
- [ ] `docs/reference/glossary.md` に「Pro メンバー (買切) / Pro メンバー (年額) / 無料プラン / Champion 方式 / Notion 方式データ保護」を追加
- [ ] `package.json` を `react-native-purchases ^10.x` に昇格（F-13 PR 内で実施）
- [ ] Repolog 8 ファイルを移植 + Champion 方式実装
- [ ] Privacy Policy 19 言語更新（RevenueCat 利用明記）
- [ ] DPA 締結（RevenueCat 公式から取得）
- [ ] iOS App Store Connect で Family Sharing トグル ON 検討（v2.x 家族共有を見据える）
- [ ] Lifetime 価格の A/B テスト計画（v1.x、Adapty 検討と同時）
- [ ] `docs/reference/tasks/lessons.md` に「Repolog 踏襲時はペルソナ違いを再評価」を追記
- [ ] Issue #15 (F-08) に Free 写真 3 枚制限 + isPro 連携の波及コメント追加
- [ ] EAS environment への RC API キー登録（Repolog lessons.md L427 由来の 3 箇所更新ルール）

---

## Acceptance / Tests（合否：テストに寄せる）

- 正（自動テスト）：
  - **Jest 単体テスト**:
    - `__tests__/services/proService.test.ts`（toProState / derivePlanType / findPackage、Repolog 移植）
    - `__tests__/features/pro/paywallCopy.test.ts`（19 言語の i18n キー存在確認、Repolog 移植）
    - `__tests__/features/pro/championMode.test.ts`（**新規**、`planType === 'lifetime'` で sub Package が空）
    - `__tests__/features/photos/freeLimit.test.ts`（写真 3 枚制限、`isPro` 切替で動作確認）
  - **Maestro E2E**: `maestro/flows/paywall_to_purchase.yaml`（RevenueCat Sandbox 連携、新規実装）
- 手動チェック（必要最小限）：
  - **Sandbox 全フロー検証** (10.x Breaking Change のため):
    1. iOS Sandbox: 月額購入 → 解約 → 期限切れ → Free 戻り → Restore
    2. iOS Sandbox: 年額購入 → アップグレード月額 → 年額再購入 → Restore
    3. iOS Sandbox: Lifetime 購入 → Champion モード確認（sub 非表示） → Restore
    4. Android Sandbox (Internal Testing): 同上 3 パターン
    5. iOS + Android クロス検証: 同一 Apple ID / Google アカウントで両端末 Restore
  - **Family Sharing 確認** (本番でのみ可能、Sandbox 不可)
  - **StoreKit Configuration File** で Lifetime 永続性検証
  - **Hermes V1 + New Arch + RC SDK 10.x の実機動作確認** (PoC、Phase 0)

---

## Rollout / Rollback（出し方/戻し方）

- リリース手順への影響：
  - F-13 マージ後、App Store Connect で 3 プランの Product ID 登録 + Family Sharing トグル決定
  - Google Play Console で 3 プランの Product 登録 (Subscription 2 + Non-Consumable 1)
  - リリースノートに「Pro 機能を解放できます。月/年/買切から選べます」を 19 言語で追記
- ロールバック方針：
  - F-13 を v1.0.x ホットフィックスで無効化する場合、UI 側で Paywall への遷移をハードコード非表示化
  - 既購入ユーザーは Restore で Pro 状態を復元可能（DB は残す）
  - SDK バージョン戻し（10.x → 9.6.6）は **不可**（マイグレ不可逆、Billing Lib 8 → 7 もダウングレード不可）
- 検知方法：
  - Sentry で `BackupError.code` 別エラーレート監視（`PURCHASE_CANCELLED` / `STORE_PROBLEM` / `PRODUCT_ALREADY_PURCHASED` / `NETWORK` / `PAYMENT_PENDING`）
  - RevenueCat Dashboard でリアルタイム MTR / 解約率 / Restore 成功率
  - ストアレビューで「購入できない」「復元できない」キーワード監視

---

## Links（関連リンク）

- constraints: `docs/reference/constraints.md` (§1-1 Local-first、§2-1 収益、§2-2 Free 制限、§5-1 API キー)
- reference: `docs/reference/basic_spec.md` (§F-13)
- reference: `docs/reference/functional_spec.md` (§18 — 要書き換え)
- explanation: `docs/explanation/product_strategy.md` (§7 価格 = 月¥500/年¥3,980/買切¥9,800)
- 連動 ADR: `docs/adr/ADR-0003-storage-policy.md`、`docs/adr/ADR-0007-f11-data-migration-design.md`、`docs/adr/ADR-0008-f02-event-data-model.md`
- 影響先 Issue: #15 (F-08)
- Repolog 既存資産（移植元）:
  - `/home/doooo/04_app-factory/apps/Repolog/src/services/proService.ts`
  - `/home/doooo/04_app-factory/apps/Repolog/src/stores/proStore.ts`
  - `/home/doooo/04_app-factory/apps/Repolog/src/features/pro/PaywallScreen.tsx`
  - `/home/doooo/04_app-factory/apps/Repolog/app/pro.tsx`
  - `/home/doooo/04_app-factory/apps/Repolog/app/_layout.tsx`
  - `/home/doooo/04_app-factory/apps/Repolog/__tests__/proServicePure.test.ts`
  - `/home/doooo/04_app-factory/apps/Repolog/app.config.ts`
- PR: #<TBD>
- Issue: [#20](https://github.com/doooooraku/BonsaiLog/issues/20)
- External docs:
  - [RevenueCat Pricing](https://www.revenuecat.com/pricing/)
  - [RevenueCat React Native Installation](https://www.revenuecat.com/docs/getting-started/installation/reactnative)
  - [react-native-purchases Releases](https://github.com/RevenueCat/react-native-purchases/releases)
  - [RevenueCat Offline Entitlements](https://www.revenuecat.com/blog/engineering/introducing-offline-entitlements/)
  - [RevenueCat Apple Family Sharing](https://www.revenuecat.com/blog/engineering/implement-apple-family-sharing/)
  - [RevenueCat Identifying Customers (Anonymous ID)](https://www.revenuecat.com/docs/customers/identifying-customers)
  - [RevenueCat GDPR & DPA](https://www.revenuecat.com/gdpr)
  - [Apple App Store Review Guidelines (3.1)](https://developer.apple.com/app-store/review/guidelines/)
  - [Apple Tax & price updates (JCT 10% 代理徴収)](https://developer.apple.com/news/?id=bdl07n0d)
  - [Google Play Billing Deprecation FAQ (8/31/2026)](https://developer.android.com/google/play/billing/deprecation-faq)
  - [Pocket Casts Champion (Lifetime UX 業界先行例)](https://support.pocketcasts.com/knowledge-base/lifetime-access-to-pocket-casts-plus/)
  - [Notion Plan Downgrade Policy](https://www.notion.com/help/plan-downgrade)
  - [RevenueCat Hide subscription package after lifetime](https://community.revenuecat.com/sdks-51/notify-user-about-purchase-while-switching-between-lifetime-purchase-and-subscription-5986)

---

## Notes（メモ）

### Phase 0 PoC 必須項目（F-13 着手の最初に実施）

1. **Hermes V1 + New Arch + react-native-purchases 10.x の動作確認**: Sandbox で月額購入 → Restore の 1 サイクルが成功すること
2. **Repolog `derivePlanType` の文字列マッチ動作**: `bonsailog_pro_yearly` 等の単語形式 Product ID で `lifetime` / `annual` / `monthly` 文字列マッチが機能すること
3. **App User ID の永続性**: アプリ再インストールで `$RCAnonymousID:` が変わるが、Restore で復元可能なこと

### Repolog → BonsaiLog 命名変更マッピング

| Repolog                                                   | BonsaiLog                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------- |
| `ENTITLEMENT_ID = 'Pro_Plan'`                             | `ENTITLEMENT_ID = 'premium'`                                        |
| `dotchain_pro_state_v1` (legacy) → `repolog_pro_state_v1` | `bonsailog_pro_state_v1` (新規 SecureStore key)                     |
| `dooooraku.repolog.pro.monthly`                           | `bonsailog_pro_monthly`                                             |
| `dooooraku.repolog.pro.yearly`                            | `bonsailog_pro_yearly`                                              |
| `dooooraku.repolog.pro.lifetime`                          | `bonsailog_pro_lifetime`                                            |
| `paywallFeature*` (Photos / Pdf / Watermark / Ads)        | `paywallFeature*` (写真無制限 / 樹種計算 / CSV/PDF / 広告非表示 等) |
| `MAX_FREE_PHOTOS_PER_REPORT = 10`                         | `MAX_FREE_PHOTOS_PER_BONSAI = 3`                                    |

### v1.x 拡張候補（本 ADR 対象外）

- Lifetime 価格 A/B テスト (¥7,800 vs ¥9,800)
- Adapty 移行（A/B テスト機能強化）
- Family Sharing トグル ON（iOS）+ Google Play Family Library 対応（Android、買切のみ）
- Promo Offers / Introductory Offers の追加（初回 7 日無料等）
- Pocket Casts Champion 風の特別ラベル UI 強化

### Repolog との同期方針

- Repolog (9.6.6) → BonsaiLog (10.x) は **逆移植不可** （Billing Lib 7 → 8 の Breaking Change）
- 互換性は維持しない方針（Repolog は Repolog として維持、BonsaiLog は新基盤で進化）
- Repolog の lessons.md L427-437 (RC API キー EAS 登録ルール) は BonsaiLog でも踏襲必須
