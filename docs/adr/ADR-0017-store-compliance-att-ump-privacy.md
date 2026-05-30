---


# ADR-0017: ストア審査必須項目統合 (ATT / UMP / Privacy URL / Privacy Manifest / Data Safety、Repolog 流用 + BonsaiLog 専用差分)

- Status: Accepted
- Date: 2026-05-02
- Deciders: @doooooraku
- Related:
  - 流用元: Repolog `docs/adr/ADR-0008-admob-ump-consent-preflight.md` (UMP 同意プリフライト)
  - 流用元: Repolog `src/services/adService.ts` (145 行、AdsConsent.gatherConsent + canRequestAds + showPrivacyOptionsForm)
  - 流用元: Repolog `app.config.ts` (`delayAppMeasurementInit` + `userTrackingUsageDescription` + `ADMOB_CONSENT_*` extras)
  - 流用元: Repolog `docs/store-listing/data-safety/data-safety-declaration.md`
  - 流用元: Repolog `docs/how-to/development/admob_advertising_setup.md`
  - 連動: ADR-0010 (F-14 Home banner 広告) / ADR-0009 (F-13 RevenueCat 課金、Pro で広告ゼロ) / ADR-0005 (iOS encryption export compliance) / ADR-0011 (記録のみ哲学)
  - 既存資産:
    - BonsaiLog `src/services/adService.ts` = Repolog 最新版と完全同期 (diff 0、両方 145 行)
    - BonsaiLog `app.config.ts` 134-135 行 `delayAppMeasurementInit: true` + `userTrackingUsageDescription` 既存
    - BonsaiLog `app.config.ts` 187-190 行 `ADMOB_*` extras 既存
  - Issue: #37 (F-LEGAL-001) / #38 (F-LEGAL-002) / #39 (F-LEGAL-003) / #40 (F-LEGAL-004)

---

## Context（背景：いま何に困っている？）

- 現状:
  - BonsaiLog `app.config.ts` と `src/services/adService.ts` は Repolog 流用で**配線手前まで完了**しているが、ADR が未起票のため「なぜこの方式か」が未文書化。
  - ATT (App Tracking Transparency、iOS 14.5+ 必須) について BonsaiLog 内 ADR / 仕様書で言及がない (constraints §2-3 で UMP のみ言及)。
  - UMP (User Messaging Platform、EEA / UK / スイス) は Repolog ADR-0008 で確定済だが、BonsaiLog 文脈での再記述がない。
  - Claude Design (`screens.jsx`) に ATT / UMP の独自前置き画面が存在するが、ユーザー判断で **OS 標準ダイアログのみ (前置き画面なし) = Repolog 方式**を採用。
  - BonsaiLog 専用の Privacy URL / Terms URL 未準備 (Repolog `LEGAL_PRIVACY_URL` 流用 NG)。
  - iOS 17+ Privacy Manifest (`PrivacyInfo.xcprivacy`) は依存バージョン依存、Repolog 状態の確認 + BonsaiLog 反映が必要。
  - Google Play Data Safety 宣言は Repolog 雛形あり、BonsaiLog 用に複製が必要。
- 困りごと:
  1. **ストア審査リスク**: ATT 未対応で iOS Reject、UMP 未対応で AdMob BAN、Privacy URL なしで Apple/Google 両 Reject。
  2. **Repolog との関係不明確**: adService.ts が Repolog ミラーであることが ADR で固定されていない。
  3. **法令対応の散在**: ATT (Apple 規約) / UMP (EU GDPR + UK GDPR + スイス nFADP) / CCPA・CPRA (米国) / LGPD (ブラジル) / Data Safety (Google) が別々に扱われると漏れる。
  4. **ストア審査前チェックリストなし**: 配信開始前に通すべきチェックが文書化されていない。
  5. **Pro 加入後の挙動**: Pro 切替時の AdBanner 取り外しは ADR-0010 既存だが、adService 状態の解放挙動が不明確。
- 制約 / 前提:
  - `docs/reference/constraints.md` §1-3 (PII 取得しない、位置情報一切保持しない)
  - `docs/reference/constraints.md` §2-3 AdMob 運用ルール (UMP 実装、テスト広告、ハードコード禁止、UMP 同意取得)
  - `docs/reference/constraints.md` §5-1 (RevenueCat / AdMob キーは直書き禁止、`.env` + `app.config.ts extra` 経由)
  - `docs/reference/personas.md` 4 ペルソナ (高橋 62 歳 / Marcus 35 歳 / 盆栽園プロ / ライト)
  - `.claude/recurrence-prevention.md` R-1〜R-20
  - ADR-0009 (F-13 RevenueCat、Pro エンタイトルメント = 広告非表示)
  - ADR-0010 (F-14 Home tabBar 上バナー、Pro Funnel 設計)
  - ADR-0005 (iOS encryption export compliance、TLS 通常利用 = 申告不要)
  - 既存依存: `react-native-google-mobile-ads`、`expo-localization`、Expo Config Plugin
  - Repolog ADR-0008 / adService.ts 完全流用可能 (145 行同一、両プロジェクトでメンテ)

---

## Decision（決めたこと：結論）

BonsaiLog のストア審査必須項目を以下の構成で実装する。

### ① ATT (App Tracking Transparency)

1. **OS 標準ダイアログのみ採用**: 独自前置き画面 (Claude Design `screens.jsx` ATT 画面) は**不採用**。
2. **Info.plist への注入**: `app.config.ts` `react-native-google-mobile-ads` plugin の `userTrackingUsageDescription` で OS ダイアログ説明文を注入 (既存実装継続)。
3. **発火タイミング**: AdMob `initializeAds()` 呼び出し時 = `AdsConsent.gatherConsent()` 経由で OS が自動発火 (Repolog 方式)。アプリ独自の発火制御なし。
4. **「許可しない」時の挙動**: AdMob は **non-personalized 広告 (ランダム広告) を配信**。広告自体は出るがパーソナライズなし。
5. **Pro 加入者**: AdBanner 自体マウントしないため (ADR-0010)、ATT ダイアログは発火しない。
6. **シニア UX 配慮**: 前置き画面なしで OS ダイアログ 1 枚のみ、画面遷移最小化。

### ② UMP (User Messaging Platform、EEA / UK / スイス / 米国規制州)

7. **Repolog ADR-0008 完全継承**: `AdsConsent.gatherConsent()` を**毎起動時**に実行、`canRequestAds === true` のときだけ Mobile Ads SDK 初期化 + バナー描画。
8. **`adService.ts` 完全流用**: BonsaiLog `src/services/adService.ts` は Repolog `src/services/adService.ts` のミラー。差分発生時は **Repolog 側修正 → BonsaiLog 同期 PR** の順 (Repolog がマスター)。
9. **Privacy options 再選択**: `showAdPrivacyOptionsForm()` で `privacyOptionsRequirementStatus === REQUIRED` チェック、要件外なら無音 (false 返却)。
10. **対応リージョン**: EEA + UK + スイス (UMP デフォルト) + Regulated US States (`AdsConsentDebugGeography.REGULATED_US_STATE` 既存対応)。CCPA / CPRA は UMP 内で吸収、追加実装不要。
11. **`delayAppMeasurementInit: true`**: Expo Config Plugin で同意完了前の AdMob 計測初期化を遅延 (BonsaiLog `app.config.ts` 既存実装継続)。

### ③ Settings → 広告のプライバシー設定 (Privacy options 導線)

12. **配置**: Settings → プライバシーセクション内、F-13 課金関連項目の直後 (Repolog 同等)。
13. **表示条件**: **Free のみ表示**、Pro 加入時は非表示 (Pro は広告ゼロのため再選択不要)。
14. **タップ時挙動**: `showAdPrivacyOptionsForm()` 呼出、`REQUIRED` でないリージョンでは無音終了。
15. **i18n キー**: `settings.privacy.ad_privacy_options_title`、`settings.privacy.ad_privacy_options_description` (19 言語ローカライズ)。

### ④ BonsaiLog 専用 Privacy URL / Terms URL

16. **公開先**: GitHub Pages、`https://doooooraku.github.io/BonsaiLog/privacy/` および `https://doooooraku.github.io/BonsaiLog/terms/` (Repolog と同形式)。
17. **`app.config.ts` extras**:
    ```typescript
    LEGAL_PRIVACY_URL: process.env.LEGAL_PRIVACY_URL ?? 'https://doooooraku.github.io/BonsaiLog/privacy/',
    LEGAL_TERMS_URL: process.env.LEGAL_TERMS_URL ?? 'https://doooooraku.github.io/BonsaiLog/terms/',
    ```
18. **内容**: Repolog 文書を BonsaiLog 文脈に書換 (盆栽 → Repolog → BonsaiLog 用に表現変更、AI 機能なし / 推奨機能なし / 位置情報非取得 を明記)。
19. **App Store Connect / Google Play Console への登録**: 申請時に上記 URL を登録、Privacy URL は審査必須。

### ⑤ iOS 17+ Privacy Manifest (`PrivacyInfo.xcprivacy`)

20. **依存バージョン要件**: `react-native-google-mobile-ads` v13.x 以降は Privacy Manifest 同梱。BonsaiLog `package.json` 依存版を確認、必要なら 13.x 以降にアップデート。
21. **アプリ側 PrivacyInfo.xcprivacy**: BonsaiLog 用に作成、宣言項目:
    - `NSPrivacyAccessedAPITypes`: UserDefaults (CA92.1)、FileTimestamp (C617.1)、SystemBootTime (35F9.1)、DiskSpace (E174.1) — Expo / RN 標準利用
    - `NSPrivacyTrackingDomains`: AdMob 関連ドメイン (Google 公式リスト参照)
    - `NSPrivacyTracking`: true (AdMob 利用のため)
22. **Repolog との同期**: Repolog `ios/PrivacyInfo.xcprivacy` (存在すれば) をミラー、なければ Repolog で先行整備 → BonsaiLog 同期。

### ⑥ Google Play Data Safety 宣言

23. **複製先**: BonsaiLog `docs/store-listing/data-safety/data-safety-declaration.md` (Repolog 流用)。
24. **宣言項目**:
    - 収集データ: 広告 ID (AdMob、Free のみ)、診断データ (クラッシュレポート、将来 Sentry 配線時)
    - 共有データ: 広告 ID → AdMob (広告配信用)
    - 暗号化: HTTPS 通信のみ、ローカル保存は AsyncStorage / SecureStore / SQLite (constraints §1-2)
    - 削除リクエスト: アンインストールで全削除 (constraints §1-2)、別途削除リクエストフォーム不要
25. **Google Play Console 登録**: ストア提出時に Data Safety 宣言を入力、内容は本ファイルから転記。

### ⑦ ストア審査前チェックリスト

26. **複製先**: BonsaiLog `docs/how-to/development/admob_advertising_setup.md` (Repolog 流用、BonsaiLog 用に書換)。
27. **チェック項目**:
    - [ ] AdMob テスト ID で動作確認 (本番 ID で開発しない)
    - [ ] EEA デバッグ: `ADMOB_CONSENT_DEBUG_GEOGRAPHY=EEA` で UMP ダイアログ発火確認
    - [ ] iOS: ATT ダイアログ発火確認 (`userTrackingUsageDescription` 表示)
    - [ ] Privacy URL / Terms URL 公開済 + リンク動作確認
    - [ ] Pro 加入で広告非表示確認
    - [ ] Pro 解約で広告再表示確認 (再起動後)
    - [ ] 「許可しない」選択で non-personalized 広告配信確認
    - [ ] Settings → 広告のプライバシー設定 で再選択ダイアログ表示確認 (EEA テスト時)
    - [ ] PrivacyInfo.xcprivacy 同梱確認
    - [ ] Data Safety 宣言の Google Play Console 登録完了

### ⑧ Free / Pro での適用

28. **Free**: ATT + UMP 両方発火、AdBanner 表示 (canRequestAds=true 時のみ)。
29. **Pro**: AdBanner マウントしないため ATT / UMP 共に発火しない (`adService.initializeAds()` も呼ばない)。Pro 解約後は再起動時に Free 経路に戻る。
30. **Pro 加入直後**: 同セッション中は AdBanner コンポーネント側の `useProGate()` で非表示化 (ADR-0010 既存)、SDK の動的解放はしない (Repolog 同方針)。

### ⑨ ADR-0011 / ADR-0014 オンボーディングとの関係

31. **オンボーディングでの ATT / UMP 説明**: 行わない。OS ダイアログのみで完結 (ADR-0018 でオンボーディング統合議論時に再確認)。
32. **通知許可 (オンボーディング Step 5、ADR-0014)** とは別系統で発火、画面重複なし。

### ⑩ 適用範囲

33. v1.0 から全プラン対象 (Free で ATT / UMP 動作、Pro で広告非表示)。

---

## Decision Drivers（判断の軸）

- Driver 1: **ストア審査クリア**: ATT (Apple 必須) / UMP (Google AdMob 必須) / Privacy URL (両ストア必須) / Privacy Manifest (iOS 17+ 必須) / Data Safety (Google Play 必須) を漏れなく実装。
- Driver 2: **Repolog 流用最大化**: adService.ts 完全同期 (145 行)、ADR-0008 / 雛形文書流用、新規記述最小。
- Driver 3: **シニア UX 最優先**: ATT 独自前置き画面なし、画面遷移最小化、OS ダイアログのみで完結。
- Driver 4: **構造的品質保護**: Repolog ミラー方針 ADR 化で同期漏れ防止、ストア審査前チェックリスト docs 化で配信前ミス防止。
- Driver 5: **シンプル原則**: 統合 ADR 1 件で関連項目を 1 箇所集約、5 年後の読み手のトレース容易。
- Driver 6: **コスト 0**: Repolog 流用で実装コスト最小、新規ライブラリなし。
- Driver 7: **Pro 整合**: ADR-0009 (RevenueCat) / ADR-0010 (F-14 広告) と完全整合、Pro で広告ゼロ保証維持。

---

## Alternatives considered（他の案と却下理由）

### Option α: 完全自記述 ADR (Repolog 内容を BonsaiLog で再記述)

- 概要: ATT / UMP / Privacy 全項目を BonsaiLog 文脈で詳述、Repolog 知識前提なし。
- 良い点: 自己完結、外部開発者にも読みやすい。
- 悪い点: Repolog ADR-0008 と内容重複、メンテコスト 2 倍。
- 却下理由: BonsaiLog は doooooraku 個人 + Claude Code 開発、Repolog 知識前提で OK。

### Option β: 軽量 ADR (Repolog ADR-0008 参照のみ + 差分追記)

- 概要: 80-120 行の薄い ADR、本体は Repolog ADR-0008 を必読。
- 良い点: 工数最小、重複ゼロ。
- 悪い点: ATT は Repolog ADR にないため吸収不可、Privacy URL / Manifest / Data Safety も別 ADR 必要、結局 ADR 数が増える。
- 却下理由: 統合性で γ に劣る。

### Option γ (採用): 統合 ADR (ATT + UMP + Privacy URL + Privacy Manifest + Data Safety を 1 件)

- 概要: 300-400 行、ストア審査必須項目を 1 ADR で網羅、Repolog 流用範囲を明示。
- 良い点: ストア審査関連を 1 箇所集約、follow-up Issue 4 件への展開明確、5 年後のトレース容易。
- 悪い点: 行数多め、読み飛ばしリスク。
- 採用理由: 統合性 + Repolog 流用明示 + 4 ペルソナ全員 ◎ 評価。

### Option I: ATT 独自前置き画面採用 (Claude Design 方式)

- 概要: OS ダイアログ前に Shield アイコン + 4 段説明の独自画面を表示、許可率向上を狙う。
- 良い点: ATT 許可率 60-75% 期待 (Apple Developer 事例)、Marcus 評価 ◎。
- 悪い点: 高橋 62 歳評価 △ (画面増)、シニア混乱、Repolog 方式と乖離。
- 却下理由: ユーザー方針「シニア最優先 + Repolog 方式」で OS ダイアログのみ採用 (Phase 1 議論で確定)。

### Option II: Pro 加入時の adService 動的解放

- 概要: Free → Pro 切替時に Mobile Ads SDK を解放、メモリ最小化。
- 良い点: メモリ削減 (約 5MB)。
- 悪い点: react-native-google-mobile-ads に解放 API なし、再起動で対応するのが業界標準。
- 却下理由: Repolog 同方針 (コンポーネント側 unmount のみ) を継承。

### Option III: 別 ADR 4 件 (ATT / UMP / Privacy / Data Safety を別個に起票)

- 概要: ストア審査関連を 4 ADR に分割。
- 良い点: 各 ADR の単機能性。
- 悪い点: ADR 数増 (0017-0020 占有)、相互整合確認コスト、トレース分散。
- 却下理由: 統合 ADR γ で集約。

---

## Consequences（結果）

### Positive（嬉しい）

- ストア審査必須項目を 1 ADR で網羅、漏れなし。
- Repolog 流用で実装工数最小、メンテコストも Repolog 1 箇所でカバー。
- ATT 独自前置き画面なしでシニア UX 最強化、画面遷移最小。
- UMP 完全実装で AdMob BAN リスクゼロ、EEA / UK / スイス / 米国規制州配信可。
- Privacy options 再選択導線で GDPR 「同意撤回権」対応。
- Privacy Manifest + Data Safety 整備でストア審査クリア。
- 4 ペルソナ全要素 ○ 以上、✕ ゼロ。
- ADR-0009 / ADR-0010 / ADR-0011 と完全整合、Pro で広告ゼロ保証維持。
- バンドル増ゼロ (既存 `react-native-google-mobile-ads` 利用)。

### Negative（辛い/副作用）

- **ATT 許可率がやや低下**: 独自前置き画面なしで 40-50% (業界標準 50-60% より低め)。Free 広告収益に影響。許可率モニタリングで Pro 加入率と比較、必要なら v1.x で前置き画面再評価。
- **Repolog 同期メンテ**: Repolog 側修正時に BonsaiLog への手動同期 PR 必要。GitHub Actions で diff 検出自動化を将来検討。
- **PrivacyInfo.xcprivacy の依存リスク**: `react-native-google-mobile-ads` バージョンアップで宣言項目が変わる可能性、毎リリース前に確認必要。
- **本番 Privacy URL / Terms URL の準備工数**: GitHub Pages 設定 + 19 言語ローカライズ (もしくは英語のみで日本語フォールバック) で 1-2 日。

### Follow-ups（後でやる宿題）

- [ ] **Issue #37** F-LEGAL-001: adService 配線 (App 起動 hook + Settings → 広告のプライバシー設定 + AdBanner) — Phase 2 foundation 完了 + F-13/F-14 着手前
- [ ] **Issue #38** F-LEGAL-002: BonsaiLog 専用 Privacy URL / Terms URL 公開 (GitHub Pages、Repolog 文書 BonsaiLog 文脈書換) — 即時着手可、foundation 待たず
- [ ] **Issue #39** F-LEGAL-003: Privacy Manifest (PrivacyInfo.xcprivacy) 確認 + 必要なら追加 — F-14 実装前
- [ ] **Issue #40** F-LEGAL-004: Data Safety 宣言 (Google Play Console) + ストア審査前チェックリスト docs 整備 — リリース直前
- [ ] `docs/reference/constraints.md` §2-3 に「ATT / UMP 実装方針は ADR-0017」を追記
- [ ] `docs/reference/constraints.md` §1-3 に「広告 ID は AdMob 利用時のみ Free で取得 (PII ではない)」を追記
- [ ] `docs/reference/glossary.md` 用語追加: ATT / UMP / IDFA / GDPR / UK GDPR / nFADP (スイス) / CCPA / CPRA / LGPD / Data Safety / Privacy Manifest / non-personalized 広告 / canRequestAds / privacyOptionsRequirementStatus / debugGeography
- [ ] `docs/how-to/development/admob_advertising_setup.md` 新規 (Repolog 流用) — Phase 2 着手時
- [ ] `docs/store-listing/data-safety/data-safety-declaration.md` 新規 (Repolog 流用) — リリース直前
- [ ] BonsaiLog `package.json` `react-native-google-mobile-ads` バージョン確認 + 必要なら v13.x へアップデート
- [ ] Repolog `src/services/adService.ts` 同期ルール: GitHub Actions で diff 検出自動化 (将来)
- [ ] テスト: `__tests__/services/adService.test.ts` (parseConsentDebugGeography / parseConsentTestDeviceIdentifiers / canRequestAdsAfterConsent モック) — Phase 2
- [ ] Maestro: `maestro/flows/att_dialog.yml` (iOS ATT ダイアログ表示確認) — Phase 2
- [ ] Maestro: `maestro/flows/ump_consent_eea.yml` (EEA デバッグで UMP 同意フォーム表示) — Phase 2
- [ ] `.claude/recurrence-prevention.md` lessons.md 追記候補:
  - 「Repolog 流用ファイル (adService.ts) は ADR で『Repolog がマスター、BonsaiLog はミラー』を明文化、同期漏れ防止」
  - 「ストア審査必須項目 (ATT/UMP/Privacy URL/Manifest/Data Safety) は機能議論より前に統合 ADR で固定、漏れ防止」

---

## Acceptance / Tests（合否：テストに寄せる）

### 自動テスト (Phase 2 着手時に実装)

- **Jest 単体テスト**:
  - `__tests__/services/adService.test.ts`:
    - `parseConsentDebugGeography('EEA')` → `AdsConsentDebugGeography.EEA`
    - `parseConsentDebugGeography('not_eea')` (大文字小文字混在) → `AdsConsentDebugGeography.NOT_EEA`
    - `parseConsentTestDeviceIdentifiers('id1, id2, , id1')` → `['id1', 'id2']` (重複除去 + 空除去)
    - `buildAdsConsentInfoOptions({ ADMOB_CONSENT_DEBUG_GEOGRAPHY: 'EEA', ADMOB_CONSENT_TEST_DEVICE_IDS: 'abc' })` → 期待 options
- **Maestro E2E**:
  - `maestro/flows/att_dialog.yml`: iOS で初回起動 → ATT ダイアログ表示 → 許可選択 → AdBanner 表示
  - `maestro/flows/ump_consent_eea.yml`: `ADMOB_CONSENT_DEBUG_GEOGRAPHY=EEA` で起動 → UMP 同意フォーム表示 → 同意 → AdBanner 表示
  - `maestro/flows/privacy_options_form.yml`: Settings → 広告のプライバシー設定 タップ → 再選択フォーム表示 (EEA デバッグ時)
  - `maestro/flows/pro_no_ads.yml`: Pro 加入後に AdBanner 非表示確認 + ATT / UMP 不発火

### 手動チェック (Phase 2 着手時 + リリース前必須)

- 実機 Pixel 7 / iPhone 13:
  - ATT 標準ダイアログ発火 + `userTrackingUsageDescription` 文言表示
  - 「許可しない」選択 → AdBanner 表示 (non-personalized 広告)
  - EEA デバッグで UMP 同意フォーム発火 + 同意後 AdBanner 表示
  - Pro 加入直後に AdBanner 非表示 + 再起動後も非表示
  - Pro 解約 + 再起動で AdBanner 再表示
  - Privacy URL / Terms URL リンク動作確認
- iOS:
  - VoiceOver で ATT ダイアログ読み上げ
  - Dynamic Type 最大設定で `userTrackingUsageDescription` 表示崩れなし
- Android:
  - TalkBack で UMP 同意フォーム読み上げ
  - 通知許可と UMP 同意の発火順序確認 (重複ダイアログなし)

### ADR-0017 受け入れ条件

- [ ] BonsaiLog `src/services/adService.ts` が Repolog 最新版とミラー (diff 0)
- [ ] BonsaiLog `app.config.ts` で `delayAppMeasurementInit: true` + `userTrackingUsageDescription` + `ADMOB_CONSENT_*` extras 維持
- [ ] BonsaiLog `app.config.ts` `LEGAL_PRIVACY_URL` / `LEGAL_TERMS_URL` が BonsaiLog 専用 URL
- [ ] BonsaiLog `https://doooooraku.github.io/BonsaiLog/privacy/` および `terms/` が公開済 + 19 言語 (or 英語 + 日本語フォールバック)
- [ ] iOS `PrivacyInfo.xcprivacy` 同梱、必要宣言項目網羅
- [ ] Google Play Data Safety 宣言完了
- [ ] ストア審査前チェックリスト 10 項目全て pass
- [ ] Pro 加入で広告ゼロ確認、Pro 解約で再表示確認
- [ ] EEA / UK / スイス デバッグで UMP 動作確認
- [ ] 「許可しない」で non-personalized 広告動作確認
- [ ] Settings → 広告のプライバシー設定 動作確認 (Free のみ表示)
- [ ] AdMob テスト ID で開発、本番 ID は `.env` 経由

---

## Rollout / Rollback（出し方/戻し方）

- リリース手順への影響:
  - foundation (#14 / #15 / #17) 完了 → F-13 課金 → F-14 広告 → ATT/UMP 配線 (Issue #<TBD-37>) の順
  - Privacy URL 公開 (Issue #<TBD-38>) は即時着手可、foundation 待たず
  - リリースノートに「広告ご利用時のプライバシー設定対応」を 19 言語で追記
- ロールバック方針:
  - ATT / UMP 動作不良時: AdBanner マウント無効化 (ADR-0010 ロールバック方針流用)、SDK 初期化スキップ
  - Privacy URL / Terms URL 公開不可時: 暫定で Repolog URL 流用 + 注記 (ストア提出 NG、本番リリース不可)
- 検知方法:
  - Sentry: `AdsConsentError` (将来配線後) 監視
  - AdMob console: 広告配信エラー率モニタリング
  - ストアレビュー: 「広告がうるさい」「許可しないと使えない」「プライバシーが心配」キーワード監視
  - Pro 加入率: ATT 許可率と Pro 加入率の相関分析、低い場合は前置き画面再評価

---

## Links（関連リンク）

- constraints: `docs/reference/constraints.md` (§1-2 ローカル保存 / §1-3 PII / §2-3 AdMob 運用 / §5-1 秘密情報)
- reference: `docs/reference/personas.md` (4 ペルソナ評価)
- glossary: `docs/reference/glossary.md` (ATT / UMP / IDFA / GDPR 等 — 追加予定)
- 行動 lesson: `.claude/recurrence-prevention.md` (R-1〜R-20)
- 連動 ADR:
  - `docs/adr/ADR-0005-ios-encryption-compliance.md` (TLS 通常利用、申告不要)
  - `docs/adr/ADR-0009-f13-revenuecat-billing.md` (Pro エンタイトルメント = 広告非表示)
  - `docs/adr/ADR-0010-f14-admob-banner-design.md` (F-14 広告位置、Pro Funnel)
  - `docs/adr/ADR-0011-remove-recommendations-keep-record-only.md` (記録のみ哲学)
- 流用元 (Repolog):
  - `/home/doooo/04_app-factory/apps/Repolog/docs/adr/ADR-0008-admob-ump-consent-preflight.md`
  - `/home/doooo/04_app-factory/apps/Repolog/src/services/adService.ts` (145 行、完全ミラー)
  - `/home/doooo/04_app-factory/apps/Repolog/app.config.ts` (`delayAppMeasurementInit` + `userTrackingUsageDescription` + `ADMOB_CONSENT_*` 設計)
  - `/home/doooo/04_app-factory/apps/Repolog/docs/store-listing/data-safety/data-safety-declaration.md` (雛形)
  - `/home/doooo/04_app-factory/apps/Repolog/docs/how-to/development/admob_advertising_setup.md` (チェックリスト)
- Issue: [#37](https://github.com/doooooraku/BonsaiLog/issues/37) / [#38](https://github.com/doooooraku/BonsaiLog/issues/38) / [#39](https://github.com/doooooraku/BonsaiLog/issues/39) / [#40](https://github.com/doooooraku/BonsaiLog/issues/40)
- PR: #<TBD>
- External docs (一次情報):
  - [Apple ATT 公式](https://developer.apple.com/documentation/apptrackingtransparency)
  - [Apple App Store User Privacy and Data Use](https://developer.apple.com/app-store/user-privacy-and-data-use/)
  - [Apple Privacy Manifest 公式](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files)
  - [Google UMP iOS 公式](https://developers.google.com/admob/ios/privacy)
  - [Google UMP Android 公式](https://developers.google.com/admob/android/next-gen/privacy)
  - [AdMob EU User Consent Policy](https://support.google.com/admob/answer/7666519?hl=en)
  - [Google Play Data Safety 公式](https://support.google.com/googleplay/android-developer/answer/10787469)
  - [Invertase react-native-google-mobile-ads EU consent](https://docs.page/invertase/react-native-google-mobile-ads/european-user-consent)
  - [GDPR 公式テキスト (EUR-Lex)](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
  - [UK Data Protection Act 2018](https://www.legislation.gov.uk/ukpga/2018/12/contents/enacted)
  - [スイス nFADP 公式](https://www.fedlex.admin.ch/eli/cc/2022/491/en)
  - [California CCPA / CPRA 公式](https://oag.ca.gov/privacy/ccpa)
  - [Brazil LGPD 公式](https://lgpd-brazil.info/)

---

## Notes（メモ）

### Repolog ADR-0008 との差分

Repolog ADR-0008 は UMP 主体、ATT は明示的な決定事項なし (Expo plugin の `userTrackingUsageDescription` 暗黙利用のみ)。本 ADR-0017 は ATT を明示決定 + Privacy URL / Manifest / Data Safety を統合。

### 4 ペルソナ評価マトリクス (最終構成)

| 要素                              | 高橋 62 歳     | Marcus 35 歳         | 盆栽園プロ | ライト     | 総合         |
| --------------------------------- | -------------- | -------------------- | ---------- | ---------- | ------------ |
| ATT OS 標準ダイアログのみ         | ◎ シンプル     | ○ 説明少             | ◎          | ○          | ◎            |
| UMP Repolog 流用                  | ◎ 自動         | ◎                    | ◎          | ◎          | ◎            |
| Settings → 広告のプライバシー設定 | ◎ 後で変更可   | ○                    | ◎          | ○          | ◎            |
| Free 「許可しない」でも広告出る   | ○ 許容         | △ パーソナライズ希望 | ○          | ○          | ○            |
| Pro 加入で広告ゼロ                | ◎ 課金で消える | ◎                    | ◎          | ◎          | ◎            |
| Privacy URL BonsaiLog 専用        | ◎ 信頼         | ◎                    | ◎          | ◎          | ◎            |
| Privacy Manifest 対応             | (UX 影響なし)  | (影響なし)           | (影響なし) | (影響なし) | ◎ ストア審査 |
| Data Safety 宣言                  | (影響なし)     | (影響なし)           | (影響なし) | (影響なし) | ◎ ストア審査 |
| ストア審査前チェックリスト        | (影響なし)     | (影響なし)           | (影響なし) | (影響なし) | ◎ 配信前安全 |

→ **全要素で全ペルソナ ○ 以上、✕ ゼロ** (R-10 クリア)

### v1.x 拡張候補 (本 ADR 対象外)

- ATT 独自前置き画面 (Apple Developer 推奨、許可率向上目的、許可率モニタリング後に再評価)
- 複数地域別の Privacy URL / Terms URL (現状は 1 セット、19 言語別ページ化検討)
- Sentry エラートラッキング配線 (Privacy Manifest 宣言項目追加が必要)
- Repolog ↔ BonsaiLog adService.ts diff 自動検出 (GitHub Actions)
- 屋外モード (ADR-0015) と Privacy options form の見た目連動 (現状 AdMob 側固定)

### ADR-0018 オンボーディング統合フロー (Notes 追記、2026-05-02)

**ADR-0018 で本 ADR §⑨ (オンボーディング非統合、ATT/UMP はホーム到達後 AdBanner マウント時発火) を再確認。Free ユーザーが Home タブを必ず初回表示 (ADR-0010 整合) で ATT/UMP に出会う動線を確定。**

- 詳細は `docs/adr/ADR-0018-onboarding-flow-integration.md` §⑧ 参照
- 本 ADR Decision 変更なし、ADR-0018 で具体的な発火動線を補強

### F-LEGAL-003 iOS Privacy Manifest 実装記録 (Notes 追記、2026-05-02)

Issue #39 (F-LEGAL-003) で本 ADR §⑤ Privacy Manifest を実装した記録。

**実装方式**: Expo SDK 55 の `@expo/config-plugins` `withPrivacyInfo` 経由で `app.config.ts` の
`ios.privacyManifests` から `ios/BonsaiLog/PrivacyInfo.xcprivacy` を prebuild 時に自動生成
（手動配置や独自 Config Plugin は不要、Expo 標準機能を利用）。

**Repolog との差分（ADR-0017 §⑤22 ミラー方針からの差分理由）**:

| 項目                        | Repolog `ios/Repolog/PrivacyInfo.xcprivacy`                        | BonsaiLog `app.config.ts` `ios.privacyManifests`                | 差分理由                                                                                   |
| --------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `NSPrivacyTracking`         | `false`                                                            | `true`                                                          | BonsaiLog は AdMob 配線あり (ADR-0010 / F-14)、Repolog は AdMob 未配線時の状態のため       |
| `NSPrivacyTrackingDomains`  | `[]` (空)                                                          | 7 ドメイン (doubleclick.net 等)                                 | 上記同様、AdMob 利用のため `NSPrivacyTracking: true` に伴う必須宣言                        |
| `NSPrivacyAccessedAPITypes` | 4 種別 (FileTimestamp / SystemBootTime / DiskSpace / UserDefaults) | 4 種別 (同じ Reason コード `C617.1` `35F9.1` `E174.1` `CA92.1`) | Reason コードは Apple 必須最小、両プロジェクトで同一                                       |
| `FileTimestamp` Reason      | `C617.1` + `3B52.1`                                                | `C617.1` のみ                                                   | BonsaiLog は backup 機能で `3B52.1` (バックアップ・復元) も将来必要、F-09 完了時に追加予定 |
| `DiskSpace` Reason          | `E174.1` + `85F4.1`                                                | `E174.1` のみ                                                   | BonsaiLog は `85F4.1` (ユーザー初期化処理) を現状利用していないため、必要時に追加          |

**実装方針上の差分** (Repolog が `ios/<project>/PrivacyInfo.xcprivacy` 直接配置に対し、BonsaiLog は `app.config.ts` 経由生成):

- 同一の最終バンドル出力になる (Expo prebuild の `withPrivacyInfo` が同じ XML を生成)
- `app.config.ts` 経由は `prebuild --clean` で常に同期、手動メンテ不要
- Repolog は EAS managed → bare 移行履歴の都合で直接配置、BonsaiLog は managed 維持なので
  `app.config.ts` 経由が clean

**Repolog 同期方針 (ADR-0017 §⑤22 補強)**:

- AdMob 配線完了時 (Repolog 側で本格運用開始時) に Repolog `PrivacyInfo.xcprivacy` を更新
- Repolog 更新後、BonsaiLog `app.config.ts` の `NSPrivacyTrackingDomains` を再確認
- `react-native-google-mobile-ads` バージョンアップ時は両プロジェクトで同時確認
  （`docs/how-to/development/ios-privacy-manifest-validation.md` §6 のチェックリスト参照）

**人間検証残タスク**:

- 実機 (iPhone 13+) で iOS local build 実施 + Xcode Organizer で Privacy Report 警告ゼロ確認
- App Store Connect 提出時に Privacy Manifest 警告ゼロ確認
- 詳細手順は `docs/how-to/development/ios-privacy-manifest-validation.md` 参照

### 議論経緯 (2 ラウンド)

1. ラウンド 1: Phase 1 計画提示で ATT/UMP/オンボーディングの用語確認 + Repolog 流用方針確定 (5 質問承認)
2. ラウンド 2: Session 2 議論で 12 論点 (L1-L12) 各方針確定 + ADR 書き方 γ 採用 + Issue 4 件同時起票確定 (3 質問承認)

### lessons.md 追記候補

- 「Repolog 流用ファイル (adService.ts) は ADR で『Repolog がマスター、BonsaiLog はミラー』を明文化、同期漏れ防止」
- 「ストア審査必須項目 (ATT/UMP/Privacy URL/Manifest/Data Safety) は機能議論より前に統合 ADR で固定、漏れ防止」
- 「ATT 独自前置き画面 vs OS 標準ダイアログのみは『シニア UX 優先』『許可率優先』のトレードオフ、本プロジェクトはシニア優先で OS のみ採用、許可率モニタリング後に再評価」
- 「Privacy Manifest (iOS 17+) は SDK バージョン依存 + 毎リリース前確認、自動化候補」

### F-LEGAL-001 ATT/UMP 配線実装履歴 (Notes 追記、2026-05-03)

Issue #37 (F-LEGAL-001) で本 ADR §④ ATT / §② UMP 配線を実装した記録。

**配線完了 (前セッション + 本セッション)**:

- `app/_layout.tsx` で `initializeAds()` を起動時呼出 (Pro 時はスキップ、ADR-0010 整合)
- `app/settings.tsx` に「広告のプライバシー設定」エントリ追加 (Free のみ表示の `!isPro` ゲート、Repolog 同等)
- `src/features/ads/AdBanner.tsx` で `resolveAdServingMode` 純関数 + Pro 時非表示 + UMP `canRequestAds` 反映
- `src/services/adService.ts` で `parseConsentDebugGeography` / `parseConsentTestDeviceIdentifiers` / `canRequestAdsAfterConsent` 純関数
- PR #112 Phase C で 7 ステップ順序判定純関数を実装
- PR #153 Phase D で Maestro yaml 4 件 (att-dialog / ump-consent-eea / privacy-options-form / pro-no-ads) 雛形を追加

**残作業 (本 ADR 対象外、別 PR)**:

- `expo-tracking-transparency` パッケージ追加 + `requestTrackingPermissionsAsync()` 配線 (現状 `attAuthorized: null` 固定で personalized 扱い、Phase E 別 PR で対応)
- iOS Sandbox / 実機での ATT 標準ダイアログ実発火確認
- EEA 偽装テスト (`ADMOB_CONSENT_DEBUG_GEOGRAPHY=EEA`) で UMP 同意フォーム実発火確認

### Sess57 Amendment (2026-05-30): 設定画面 + Paywall 二重掲載 AC

**AC 追加**: アプリ内の利用規約 / プライバシーポリシーは、設定画面の「その他」section と Paywall (`/pro`) 画面の Fine Print 近傍の **両方** から tap 可能であること。

**Why**: Apple Review 3.1.1 (アプリ内課金時の規約提示義務) / Google Play Data Safety (プライバシー情報のアクセス可能性) を一画面のみで満たすのは脆い。Paywall に直近で掲載することで「課金前にユーザーが規約に到達できる」 動線を構造的に保証する。

**配線完了 (Sess57)**:

- `src/features/legal/LegalLinksRow.tsx` を共通 component 化し、Settings + Paywall 両方で同一実装を利用。lang === 'ja' のとき GitHub Pages /ja/ 版に切替。
- ストア URL 公開 (PR #838-839) 後にアプリ内 wiring が「Alert.alert('準備中')」のまま放置されていた問題を解消。

**恒久策 DoD 追加**:

- 「ストア向け URL を公開する PR は、 アプリ内設定からも tap 可能になっていること」 を URL 公開 PR の DoD に含める (本 ADR の運用ルール)。
