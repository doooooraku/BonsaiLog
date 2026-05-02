# F-13 Phase 0 — react-native-purchases 10.x PoC 実機検証手順

> **対象**: F-13 課金 (#20) の Phase 0 完了基準。  
> **位置付け**: 自動チェック (`pnpm verify`) では検出できない Sandbox 連携 + 実機ネイティブ動作を、人間が実機 + Sandbox アカウントで検証する手順。  
> **タイミング**: Phase 0 PR (`react-native-purchases ^9.6.6` → `^10.0.1` 昇格) マージ後、Phase 1 (Repolog 移植 + 命名変更) 着手前。

---

## 0. 何のための PoC か

| 検証目的                                                                                        | 背景 (ADR-0009 §Phase 0 PoC 必須項目)                                                                   |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Hermes V1 + New Arch + RC SDK 10.x の 3 役組合せが実機で動くか                                  | Expo SDK 55 + RN 0.83 + React 19 + Hermes V1 (試験段階) で RC 10.x 動作報告は限定的                     |
| `Purchases.purchasePackage` → `Purchases.restorePurchases` の 1 サイクルが Sandbox で成功するか | RC 9 → 10 の Breaking Change (one-time product restore 動作変更) を確認                                 |
| `derivePlanType` の文字列マッチが Sandbox 用 Product ID で機能するか                            | `bonsailog_pro_yearly` 等の単語形式 ID で `lifetime` / `annual` / `monthly` を返すこと (短縮命名は禁止) |
| App User ID (`$RCAnonymousID:`) の永続性                                                        | アプリ再インストールで匿名 ID が変わるが、Restore で復元可能なこと                                      |

検証が **失敗** したら Phase 1 着手を遅らせ、`react-native-purchases` Issue tracker / RevenueCat Slack で報告し対応方針を決める。

---

## 1. 事前準備 (人間タスク)

`docs/how-to/development/f13-store-product-setup.md` の手順で以下を完了させる:

- [ ] App Store Connect で 3 プラン (`bonsailog_pro_monthly` / `_yearly` / `_lifetime`) を `Ready to Submit` 状態にする
- [ ] Google Play Console で 3 プランを内部テスト (Internal Testing) に追加する
- [ ] RevenueCat Dashboard で Entitlement `premium` + Offering `default` + 3 Package を設定する
- [ ] EAS environment に `REVENUECAT_IOS_API_KEY` / `REVENUECAT_ANDROID_API_KEY` を登録する (3 箇所更新ルール — `.env` / `eas env:create` / `.env.example`)
- [ ] iOS Sandbox tester アカウントを App Store Connect → Users and Access → Sandbox から作成
- [ ] Android License Tester アカウントを Google Play Console → Setup → License testing に追加

---

## 2. 検証シナリオ (実機 + Sandbox)

### 2.1 iOS Sandbox: 月額購入 → Restore の 1 サイクル

1. iPhone 実機を初期化する (もしくは「設定 → App Store → Sandbox Account」から既存テスターをサインアウト)
2. `pnpm build:ios:local` で Development build を作成し、TestFlight 経由か実機直接インストール
3. アプリ起動 → IAP_DEBUG ログを確認 (`[RC] platform=ios apiKey exists=true len=NN`)
4. Settings → Pro メンバーへアップグレード → 「月額 ¥500」を購入
5. Sandbox tester でサインインを促されたらサインインし、購入完了する
6. `[RC] configured` → `Purchases.purchasePackage` 完了の流れを Metro / Xcode console で確認
7. Pro 状態が反映されたか UI で確認 (Settings に「Pro メンバー」表示)
8. アプリを完全終了して再起動 → `loadLocalState` で Pro 状態が SecureStore から復元されること
9. アプリをアンインストール → 再インストール → 起動 → 「購入を復元」をタップ
10. `Purchases.restorePurchases` 完了 → Pro 状態復元を確認

**期待結果**:

- 全ステップでクラッシュなし
- `derivePlanType` が `'monthly'` を返す
- アンインストール後の Restore で `originalAppUserId` が変わっても Apple ID 経由で Pro が復元される

**失敗時のシグナル**:

- アプリがネイティブ層で即死 (Hermes V1 + New Arch + RC SDK 10.x 不整合の可能性)
- `Purchases.purchasePackage` が型エラー (10.x の Breaking Change で API が変わった可能性)
- `derivePlanType` が `null` を返す (Product ID の文字列マッチ失敗 → Product ID 命名見直し)

### 2.2 iOS Sandbox: Lifetime 購入 → Champion モード予兆確認

> Champion モード本体 (sub 非表示) は Phase 2 で実装。Phase 0 では `derivePlanType` が `'lifetime'` を返すかのみ確認。

1. 既存の月額購入を **設定 → App Store → サブスクリプション** からキャンセル + 期限切れまで待つ (Sandbox は数分で期限切れ)
2. アプリで「買い切り ¥9,800」を購入
3. `Purchases.purchasePackage` 完了後、`derivePlanType(productId, hasExpiration=false)` が `'lifetime'` を返すことを Metro console で確認
4. Settings に「Pro メンバー」表示、Restore も成功する

**期待結果**:

- `derivePlanType` の `if (!hasExpiration) return 'lifetime';` が機能 (proService.ts L59)
- Restore で `originalAppUserId` が同一 Apple ID 内で永続

### 2.3 Android Sandbox (Internal Testing): 同上 2 シナリオ

1. `pnpm build:android:apk:local` で Development APK 作成
2. 実機 (Pixel 等) に License Tester アカウントでサインインし APK インストール
3. iOS の §2.1 / §2.2 と同等の購入 → Restore フローを実行
4. License Tester は 5 分で期限切れに設定可能 (Google Play Console → Internal Testing → Subscription override)

**期待結果**:

- Android で `Purchases.configure({ apiKey: ANDROID_KEY })` 成功
- 月額 → Restore + Lifetime → Restore 両方緑

### 2.4 App User ID 永続性確認

1. iOS / Android どちらかで月額購入完了
2. `Purchases.getCustomerInfo()` で `originalAppUserId` をログ出力 (例: `$RCAnonymousID:abc123...`)
3. アプリをアンインストール → 再インストール → 起動 → `getCustomerInfo` で別の `$RCAnonymousID:` が返る
4. 「購入を復元」タップ → Apple ID / Google Account 経由で旧 `originalAppUserId` の購入履歴が同期される

**期待結果**:

- 匿名 ID は端末ごとに変わるが、同一 Apple ID / Google Account なら Restore で同期される
- ログに PII (メールアドレス / 氏名) が含まれない (Local-first 哲学整合)

---

## 3. 失敗時のロールバック方針

| 失敗パターン                              | 対応                                                                                                                                               |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hermes V1 + RC 10.x で起動時クラッシュ    | `app.config.ts` の Hermes 設定を一時的に `{ jsEngine: 'hermes' }` 旧モードへ。Hermes V2 安定版リリース (RN 0.84+) まで待機。Phase 1 着手を遅らせる |
| `Purchases.purchasePackage` の API 不整合 | `react-native-purchases` 10.x changelog を読み、proService.ts を修正。9.6.6 へのダウングレードは Billing Library 7 → 8 不可逆のため **不可**       |
| `derivePlanType` が想定外の値を返す       | Sandbox Product ID を ADR-0009 §Decision §3 の単語形式 (`bonsailog_pro_yearly`) で再登録                                                           |
| Sandbox tester で購入が走らない           | Apple サーバーのレシート反映遅延 (5 分待ち)、再試行                                                                                                |

---

## 4. PoC 完了の判定基準

- [ ] §2.1 iOS 月額 → Restore: クラッシュなし、Pro 反映、Restore 成功
- [ ] §2.2 iOS Lifetime: `derivePlanType` が `'lifetime'` を返す
- [ ] §2.3 Android 月額 → Restore + Lifetime → Restore: 両方緑
- [ ] §2.4 App User ID 永続性: 同一 Apple ID / Google Account で Restore 成功
- [ ] 全ステップで Hermes V1 + New Arch + RC SDK 10.x の組合せが安定動作
- [ ] PoC 検証ログ + スクリーンショットを親 Issue #20 にコメント添付

PoC 完了後、Phase 1 (Repolog 移植 + 命名変更) 子 Issue を起票して着手。

---

## 5. 関連リンク

- ADR-0009 §Notes Phase 0 PoC 必須項目: `docs/adr/ADR-0009-f13-revenuecat-billing.md`
- ストア登録準備手順: [./f13-store-product-setup.md](./f13-store-product-setup.md)
- 親 Issue: [#20](https://github.com/doooooraku/BonsaiLog/issues/20)
- Phase 0 子 Issue: [#57](https://github.com/doooooraku/BonsaiLog/issues/57)
- RevenueCat React Native v10 Migration: https://www.revenuecat.com/docs/getting-started/installation/reactnative
- react-native-purchases Releases: https://github.com/RevenueCat/react-native-purchases/releases
- Google Play Billing Deprecation FAQ (8/31/2026): https://developer.android.com/google/play/billing/deprecation-faq
