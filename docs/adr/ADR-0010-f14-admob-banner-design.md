---


# ADR-0010: F-14 Home 下部バナー広告設計（Pro 誘導の心理装置として再定義）

- Status: Accepted
- Date: 2026-04-29
- Deciders: @doooooraku
- Related:
  - 上書き対象: `functional_spec.md` §19（F-14 詳細仕様）— Pro 誘導目的に再定義 + 24h 遅延撤回 + スナックバー削除
  - 連動: ADR-0009（F-13 課金、`useProStore` 参照元）/ ADR-0008（F-02 events）/ ADR-0003（ストレージ方針）
  - 影響先: Issue #20 (F-13 課金) — Settings → アカウントの Pro CTA UI が F-13 と F-14 にまたがる
  - 既存資産: Repolog `/src/services/adService.ts` (146 行、既に BonsaiLog にコピー済)
  - Issue: [#22](https://github.com/doooooraku/BonsaiLog/issues/22)

---

## Context（背景：いま何に困っている？）

- 現状：
  - F-14 は basic_spec §F-14 / functional_spec §19 で「Free 向け Home 下部バナー」が確定済。
  - 当初は「収益 3 本柱の 1 つ」として設計されていたが、実態として AdMob バナーの収益期待値は月 $10〜$50（中立シナリオ）と低い。
  - 既存パッケージ: `react-native-google-mobile-ads ^16.0.0`（Repolog から踏襲）。
  - Repolog の `adService.ts` 全 146 行は BonsaiLog に既にコピー済（共通基盤）。
- 困りごと：
  1. **F-14 の目的が曖昧**: 「収益柱」と「Pro 誘導装置」のどちらが主か不明確のまま実装すると UX が中途半端。
  2. **24 時間広告非表示の Pro 誘導との矛盾**: Day1 離脱率 20-25%（VWO データ）→ 24h 遅延だと多くのユーザーが広告を見ずに離脱、Pro 誘導機会喪失。
  3. **Repolog にない要件**: ANCHORED ADAPTIVE BANNER、useForeground 60 秒制限、「広告」ラベル、48dp X ボタン、タブバー外配置（4 tab 構成）。
  4. **シニアペルソナの誤タップリスク**: constraints §11 で確定済の懸念、Pocket Casts 型より誠実な誤タップ防止が必要。
  5. **「Pro で消せます」訴求の最適配置が不明**: 業界事例（Spotify / Duolingo）は常時バナー、しかしシニアペルソナでは押し付けがましさのリスク。
  6. **Photo & Video カテゴリの転換率不利**: RevenueCat 2025 データで業界最低（年継続 23%）→ Pro 訴求設計が極めて重要。
- 制約/前提：
  - `docs/reference/constraints.md` §1-1（Local-first、外部追跡 SDK は最小限）
  - `docs/reference/constraints.md` §1-3（PII 取得しない）
  - `docs/reference/constraints.md` §2-1（収益 3 本柱 — F-14 は副次収益として維持）
  - `docs/reference/constraints.md` §2-3（AdMob 運用ルール: アダプティブバナー / X 48dp / 周囲 16dp / センシティブ全拒否 / UMP）
  - `docs/reference/constraints.md` §11（広告誤タップ → 怪しいサイトの懸念）
  - 既存 ADR-0009（F-13 の `useProStore` を F-14 が参照）

---

## Decision（決めたこと：結論）

F-14 を以下の構成で実装する。

### 設計目的の再定義

1. **F-14 = Pro 誘導の心理装置**（収益柱ではない、副次収益 $10〜$50/月で十分）
2. ユーザーが「広告うっとうしい → Pro に入りたい」を喚起する装置として機能
3. KPI: 月収益ではなく、**広告タップ後の Pro 加入率 / Settings Pro CTA 経由加入率**

### 広告基本仕様（functional_spec §19 維持）

4. **広告タイプ**: AdMob Anchored Adaptive Banner、Home tabBar の上のみ
5. **サイズ**: 高さ 50-60dp、X ボタン 48dp 以上、周囲 16dp 余白
6. **「広告」ラベル**: 12sp 以上、WCAG AA 4.5:1 以上、ロケールごとに 1 単語（日本語「広告」、英語「Ad」or「Sponsored」、混在禁止）
7. **タイミング**: アプリ起動後 3 秒以上経過後に表示
8. **iOS バックグラウンド復帰**: 60 秒以内は再ロードしない（useForeground hook）
9. **Pro 即非表示**: `useProStore` の `isPro` true で即 unmount
10. **設定**: `MaxAdContentRating.PG`、`tagForChildDirectedTreatment: false`、`tagForUnderAgeOfConsent: false`
11. **カテゴリフィルタ**: ギャンブル / アルコール / 出会い系 全拒否（AdMob 管理画面で運用）

### Day1 から広告表示（重要な方針転換）

12. **24 時間 delayed monetization は採用しない**（Day1 から広告表示）

- 理由: Day1 離脱率 20-25% で多くのユーザーが広告を見ずに離脱、Pro 誘導機会喪失
- 業界事例（Spotify / Duolingo）も Day1 即表示

### 誤タップ後の挙動（押し付けがましさを排除）

13. **誤タップ後は無音で戻す**（スナックバー UI 削除）

- 4 ペルソナ視点で「Pro で消せます」スナックバーは押し付けがましいと判定
- 高橋さん 62 歳: 「便乗営業」感、Marcus 35 歳: マーケ感強すぎ、盆栽園: 業務中断、ライト: 離脱要因
- 動線分離（広告 → 外部ブラウザ / Pro → アプリ内 Paywall）はスナックバーなしでも自然に成立

### Pro 訴求は Settings → アカウントの常時 CTA のみ

14. **Settings → アカウント** に常時表示の Pro CTA カード:
    ```
    🌱 BonsaiLog Pro
    • 写真の枚数を増やす
    • 樹種ごとの作業時期を見る
    • CSV / PDF で記録を残す
    [ 詳しく見る ]
    ```
15. **Pro CTA 文言の方針**:
    - **広告に言及しない**（品の良さ、4 ペルソナ全員に効く）
    - **Authority 訴求なし**（団体名「日本盆栽協会推奨」等使用禁止）
    - **金額分解訴求なし**（「1 日 ¥11」等は若年層向け、シニアに刺さらない）
    - 機能列挙型 3 行、19 言語ローカライズ
16. **広告非表示は機能比較表に静かに記載**（Paywall 内）

### ATT pre-prompt（中立説明型、シニア向け）

17. **ATT pre-prompt 文言**（19 言語ローカライズの原型）:
    ```
    [タイトル] 広告について
    [本文]
    このあと iPhone から「許可しますか?」と確認画面が表示されます。
    - どちらを選んでも BonsaiLog はそのままお使いいただけます
    - 個人情報や位置情報は外部に送りません
    - 「許可」を選ぶと、関連性の高い広告が表示されやすくなります
    [ボタン] 次へ進む
    ```
18. **避ける単語**: 追跡 / 識別 / collect / track / installation / services（脅威語）
19. **NSUserTrackingUsageDescription** は 19 言語必須翻訳（UMP 自動翻訳とは別）

### ATT → UMP 順序（functional_spec §19.3.1 維持）

20. functional_spec §19.3.1 の 7 ステップを維持（ウェルカム → 言語 → 通知 → ATT explainer → ATT → UMP requestInfoUpdate → UMP form）
21. **Google 公式の「UMP first → ATT 連動」は v1.x 再評価**（v1.0 は既存設計維持、ATT explainer の自社訴求価値あり）

### 改善案 5 項目（最終確定）

22. **採用**:
    - ✅ 背景色トークン分離（border-top + bg.secondary、和紙トーン）
    - ✅ 「広告」ラベル WCAG AA 4.5:1 + 12sp、ロケール 1 単語
    - ✅ タブバー直上 24dp セーフゾーン（タブバーと広告の間に透明バッファ）
    - ✅ Settings → アカウント常時 Pro CTA（機能列挙型・案 B）
23. **不採用**:
    - ❌ 24 時間広告非表示（Pro 誘導機会喪失、Day1 離脱対策）
    - ❌ 誤タップ後リカバリスナックバー（4 ペルソナで押し付けがましいと判定）

### SDK バージョン

24. **`react-native-google-mobile-ads` 16.0.0 → 16.3.3 に minor pin**（最新、Anchored Adaptive Banner deprecation 動向監視）
25. **iOS Privacy Manifest** (`PrivacyInfo.xcprivacy`) で `NSPrivacyTracking=true` + `NSPrivacyTrackingDomains` に AdMob ドメイン記載必須
26. **TCF v2.3 必須化** (2026-03-01) — Google CMP 利用で自動対応

### Repolog 踏襲との差分

27. **Repolog の `__DEV__` 逆運用を削除**: `canRequestAdsAfterConsent` の `return __DEV__` で UMP 失敗時も広告表示する設計は BonsaiLog の境界値仕様（UMP 拒否 → バナー非表示）と矛盾、削除
28. **`MaxAdContentRating`**: Repolog の `G` → BonsaiLog は **PG**（functional_spec §19.3.3 既定）
29. **`delayAppMeasurementInit`**: Repolog の二重否定命名（`ADMOB_DISABLE_*`）→ BonsaiLog は正論理（`ADMOB_DELAY_*`）に統一
30. **タブバー外配置**: Repolog 単一画面 → BonsaiLog `<Stack.Screen name="Main">` 直下に `<View><Tab.Navigator/><HomeBannerAd/></View>` パターン新規実装

### Privacy Policy / Apple Review

31. **Privacy Policy 19 言語更新**: 「広告に AdMob を使用、ATT/UMP 同意ベースで配信、IDFA は同意時のみ送信」
32. **Apple Review 5.1.2(i)**: ATT 拒否時もパーソナライズ広告送信は禁止 → NPA フォールバック必須
33. **Apple Review 5.1.1(i)**: AdMob と Google を第三者として明示 + データ保護同等性宣言
34. **Google Play**: Designed for Families 申請しない（BonsaiLog はシニア向け）

### 適用範囲

- v1.0 から Free 向け、Pro で完全非表示

---

## Decision Drivers（判断の軸）

- Driver 1: **Pro 誘導効果最大化** — F-14 の目的を「Pro 誘導の心理装置」と再定義、KPI を月収益 → Pro 加入率にシフト。
- Driver 2: **シニア UX 最優先** — 誤タップ防止 5 項目 + スナックバー削除 + 押し付けがましさゼロ。
- Driver 3: **Day1 から Pro 誘導開始** — 24h 遅延撤回、離脱前にメッセージング。
- Driver 4: **業界標準準拠** — Spotify / Duolingo の Day1 表示パターン、Apple Review 安全。
- Driver 5: **品の良さ** — Authority 訴求 / 金額分解 / 直接的「広告うるさい」表現を排除、機能訴求のみ。
- Driver 6: **コスト 0** — AdMob ライセンス料 0、月収益は副次的（$10〜$50）。

---

## Alternatives considered（他の案と却下理由）

### Option A: 戦略書通り (収益柱として広告)

- 概要: F-14 を 3 本柱の 1 つとして収益最大化、月 100K imp で $30〜$80 を目指す。
- 良い点: 戦略書 §3-1 🩹11 通り、明確な KPI。
- 悪い点: シニアペルソナで誤タップリスク、業界比較で eCPM 低い、Pro 加入率と相反する設計になる。
- 却下理由: BonsaiLog 規模（DAU 数千〜万）で広告収益は副次的、Pro 誘導効果のほうが事業価値高い。

### Option B: 広告ゼロ (F-14 削除)

- 概要: AdMob 不採用、Day One / Notion / Bear と同じ業界標準。
- 良い点: ATT/UMP/DPA/19 言語規約文すべて削除、UX 最良、Local-first 完全整合。
- 悪い点: 「Pro 加入の動機」が機能差のみになる、戦略書 §3-1 🩹11 を変更必要。
- 却下理由: ユーザー判断（質問 1 = A）で広告あり確定、戦略書を維持。

### Option C: 段階導入 (v1.0 ゼロ → v1.x 評価)

- 概要: v1.0 は広告ゼロ、3 ヶ月後 Pro 加入率を見て F-14 復帰判断。
- 良い点: 業界標準で出して、データで判断する柔軟性。
- 悪い点: ユーザー判断で A 確定、戦略書 §3-1 🩹11 通り進める方針。
- 却下理由: ユーザー判断尊重、A で進行。

### Option D: 自前 Pro 誘導 UI（広告風）

- 概要: AdMob ではなく、アプリ内で「Pro で消せます」自前バナー固定。
- 良い点: ATT/UMP 不要、規約 0、Local-first 完全整合。
- 悪い点: 副次収益ゼロ、「うっとうしさ」の心理効果が実 AdMob より弱い可能性。
- 却下理由: ユーザー判断で広告あり確定、ただし v1.x で「自前 + 月数回 AdMob」のハイブリッド検討余地あり。

### Option E: 24 時間 delayed monetization

- 概要: 専門家 3 提案、初回 24 時間広告非表示でリテンション安全策。
- 良い点: シニアの不安軽減、信頼構築。
- 悪い点: Day1 離脱率 20-25% で多くのユーザーが広告を見ずに離脱、Pro 誘導機会喪失。
- 却下理由: F-14 を「Pro 誘導目的」と再定義した時点で逆効果、ユーザー判断で撤回（質問 1 OK）。

### Option F: 誤タップ後リカバリスナックバー

- 概要: 「Pro で消せます」7 秒スナックバー、誤タップ時に Pro 訴求。
- 良い点: 不快ピーク = 訴求の最適タイミング（B.J. Fogg）。
- 悪い点: 4 ペルソナ視点で押し付けがましい、便乗営業感、業務中断、離脱要因。
- 却下理由: ペルソナテストで全員不採用、ユーザー判断で削除（質問 A OK）。

### Option G: Pro 訴求 3 箇所配置（Settings + Paywall 金額分解 + スナックバー）

- 概要: 当初推薦案、3 箇所で Pro CTA。
- 良い点: 訴求機会最大化。
- 悪い点: ペルソナ視点で 2/3 が逆効果（金額分解はシニアに刺さらない、スナックバー押し付けがましい）。
- 却下理由: ユーザー判断 + ペルソナ視点で 1 のみ採用（質問 3 で 2/3 不要確定）。

---

## Consequences（結果）

### Positive（嬉しい）

- F-14 の目的が明確化（Pro 誘導の心理装置）、KPI 設計しやすい
- Day1 から Pro 誘導開始、離脱前にメッセージング
- 4 ペルソナ全員にとって押し付けがましさゼロ
- 改善案 5 項目で誤タップ防止と Pro 訴求のバランス最適化
- 実装工数削減（24h 遅延ロジック + スナックバー削除）
- テスト工数削減（境界値テストパターン減少）
- Apple Review 業界標準準拠で通過確実
- Repolog `adService.ts` 既コピー済 + 新規実装最小化

### Negative（辛い/副作用）

- **副次収益が Pro 誘導目的に最適化される**: 月 $10〜$50 程度、収益柱として期待しない方針
- **`react-native-google-mobile-ads` 16.0.0 → 16.3.3 minor pin**: 動作確認必要、Anchored Adaptive Banner deprecation 動向監視
- **Hermes V1 + New Arch + AdMob SDK 動作未検証**: 実機検証必須（推測）
- **Privacy Policy 19 言語更新**: ATT/UMP/IDFA 言及追加、翻訳コスト
- **Repolog `__DEV__` 逆運用削除**: BonsaiLog では境界値仕様準拠で UMP 拒否時はバナー非表示に修正
- **タブバー外配置の新規実装**: Repolog 単一画面 → BonsaiLog 4 tab 構成、`<Stack.Screen name="Main">` パターン

### Follow-ups（後でやる宿題）

- [ ] `docs/reference/functional_spec.md` §19 を本 ADR の方針で書き換え（24h 遅延撤回、スナックバー削除、Pro CTA 案 B、ATT pre-prompt 中立説明型）
- [ ] `docs/reference/glossary.md` に「Pro 誘導の心理装置 / 機能列挙型 Pro CTA / NPA / 中立説明型 ATT pre-prompt」追加
- [ ] `docs/reference/constraints.md` §2-3 AdMob 運用ルールに「`MaxAdContentRating.PG`、24h 遅延なし、誤タップ後無音、Pro CTA は機能訴求のみ」追記
- [ ] `package.json` を `react-native-google-mobile-ads ^16.3.3` に minor pin
- [ ] Repolog `adService.ts` の `__DEV__` 逆運用を削除
- [ ] `MaxAdContentRating` を Repolog `G` → BonsaiLog `PG` に変更
- [ ] `delayAppMeasurementInit` の二重否定命名を正論理に統一
- [ ] タブバー外配置の新規実装（`<Stack.Screen name="Main">` パターン）
- [ ] Settings → アカウント画面に Pro CTA 機能列挙型実装（F-13 #20 と統合）
- [ ] ATT pre-prompt 中立説明型文言を 19 言語ローカライズ
- [ ] Privacy Policy 19 言語更新（AdMob 利用明記）
- [ ] Apple Review 5.1.2(i) NPA フォールバック実装
- [ ] iOS Privacy Manifest (`PrivacyInfo.xcprivacy`) に AdMob ドメイン記載
- [ ] Maestro `flows/banner_visibility.yml` 新規作成（Pro 切替で消える/出る）
- [ ] Pro 誘導指標の計測実装（広告タップ後 Pro 加入率 / Settings Pro CTA 経由加入率）
- [ ] Issue #20 (F-13) に Settings → アカウント Pro CTA UI の連携を波及通知
- [ ] `docs/reference/tasks/lessons.md` に「F-14 は Pro 誘導目的、収益柱ではない」を追記

---

## Acceptance / Tests（合否：テストに寄せる）

- 正（自動テスト）：
  - **Jest 単体テスト**:
    - `__tests__/features/ads/adService.test.ts`（consent helpers、`__DEV__` 逆運用削除確認）
    - `__tests__/features/ads/bannerVisibility.test.ts`（**新規**、Pro / Free / canRequestAds の 4 状態 × isPro 切替即 unmount）
    - `__tests__/features/settings/proCtaCopy.test.ts`（**新規**、Settings Pro CTA 19 言語キー存在）
  - **Maestro E2E**:
    - `maestro/flows/banner_visibility.yml`（**新規**、Free でバナー表示 / Pro 購入で即消失）
    - `maestro/flows/first_launch_consent.yml`（**新規**、ATT pre-prompt → ATT → UMP の 7 ステップ）
- 手動チェック（必要最小限）：
  - **誤タップ後の挙動確認**: 広告タップ → 外部ブラウザ → 戻る → アプリで無音（スナックバー出ない）
  - **`__DEV__` 削除確認**: 開発ビルドで UMP 拒否時にバナー非表示になること
  - **タブバー外配置確認**: 4 タブ切替でも `HomeBannerAd` が unmount されない
  - **iOS Privacy Manifest 検証**: `eas-build-doctor` で AdMob ドメイン記載確認
  - **Hermes V1 + New Arch + AdMob SDK 動作確認**: iOS / Android 実機

---

## Rollout / Rollback（出し方/戻し方）

- リリース手順への影響：
  - F-13 (#20) と同タイミングで本機能をリリース（`isPro` 連携必須）
  - Settings → アカウント Pro CTA UI は F-13 / F-14 共通実装
  - リリースノートに「Free でホーム下部に控えめなバナー広告が表示されます。Pro で広告非表示」を 19 言語で追記
- ロールバック方針：
  - F-14 を v1.0.x ホットフィックスで無効化する場合、`HomeBannerAd` を return null にハードコード非表示化
  - SDK バージョン戻し（16.3.3 → 16.0.0）は可能（minor pin 解除）
- 検知方法：
  - Sentry で `AdMobError` エラーレート監視
  - AdMob Dashboard で eCPM / インプレッション / 同意率
  - Pro 誘導指標: 広告タップ後 Pro 加入率 / Settings Pro CTA 経由加入率
  - ストアレビューで「広告うるさい」「広告で誤操作」キーワード監視（誤タップ事故検知）

---

## Links（関連リンク）

- constraints: `docs/reference/constraints.md` (§1-1 Local-first、§1-3 PII、§2-1 収益、§2-3 AdMob 運用、§11 シニア誤タップ)
- reference: `docs/reference/basic_spec.md` (§F-14)
- reference: `docs/reference/functional_spec.md` (§19 — 要書き換え)
- explanation: `docs/explanation/product_strategy.md` §3-1 🩹11 (シニア広告誤タップ懸念)
- 連動 ADR: `docs/adr/ADR-0009-f13-revenuecat-billing.md`、`docs/adr/ADR-0008-f02-event-data-model.md`、`docs/adr/ADR-0003-storage-policy.md`
- 影響先 Issue: #20 (F-13)
- Repolog 既存資産:
  - `/home/doooo/04_app-factory/apps/Repolog/src/services/adService.ts`
  - `/home/doooo/04_app-factory/apps/Repolog/app.config.ts` L60-176（plugin 設定）
  - `/home/doooo/04_app-factory/apps/Repolog/src/features/settings/SettingsScreen.tsx` L127-140（プライバシー設定 UI）
- BonsaiLog 既存資産: `/home/doooo/04_app-factory/apps/BonsaiLog/src/services/adService.ts` (146 行、Repolog 同一)
- PR: #<TBD>
- Issue: [#22](https://github.com/doooooraku/BonsaiLog/issues/22)
- External docs:
  - [react-native-google-mobile-ads docs](https://docs.page/invertase/react-native-google-mobile-ads)
  - [v16.x Releases](https://github.com/invertase/react-native-google-mobile-ads/releases)
  - [Google AdMob UMP iOS Setup](https://developers.google.com/admob/ios/privacy)
  - [Google AdMob UMP Android Setup](https://developers.google.com/admob/android/privacy)
  - [iOS IDFA / ATT Strategy](https://developers.google.com/admob/ios/privacy/idfa)
  - [TCF v2.3 Migration](https://support.google.com/admob/answer/9760862?hl=en)
  - [Apple App Review Guidelines (5.1.1 / 5.1.2)](https://developer.apple.com/app-store/review/guidelines/)
  - [Apple ATT Documentation](https://developer.apple.com/documentation/apptrackingtransparency)
  - [Google AdMob Discouraged Implementations](https://support.google.com/admob/answer/6275345?hl=en)
  - [NN/g - Banner Blindness Revisited](https://www.nngroup.com/articles/banner-blindness-old-and-new-findings/)
  - [Sub Club Podcast - How Headspace Optimized Revenue by Gating Content](https://subclub.com/episode/how-headspace-optimized-revenue-by-gating-content-shreya-oswal-and-keya-patel-headspace)
  - [RevenueCat - Hard paywall vs soft paywall](https://www.revenuecat.com/blog/growth/hard-paywall-vs-soft-paywall/)
  - [Adjust ATT Opt-In Rates 2025](https://www.adjust.com/blog/att-opt-in-rates-2025/)

---

## Notes（メモ）

### Pro 誘導指標の計測方針

v1.0 リリース後 3 ヶ月で以下を計測:

1. **広告タップ後 Pro 加入率**: 広告クリック → 外部ブラウザ → アプリ復帰 → 24h 以内に Pro 加入したユーザー率
2. **Settings Pro CTA 経由加入率**: Settings → アカウント の「詳しく見る」タップ → Paywall → Pro 加入率
3. **写真 4 枚目 Paywall 経由加入率**: F-08 Free 制限到達 → Paywall → Pro 加入率
4. **総合 Pro 加入率**: 全 DAU 中の Pro 加入者比率（業界中央値 2.18% を目標）

### Day1 表示の根拠

- VWO 2025: モバイルアプリ Day1 離脱率 20-25%
- Spotify / Duolingo / YouTube 全て Day1 から広告表示（業界標準）
- Duolingo Super 転換率 8.8% は Day1 表示で達成
- 24h delayed は信頼構築には有効だが Pro 誘導目的では機会喪失

### スナックバー削除の根拠（4 ペルソナ視点）

- 高橋さん 62 歳: 「便乗営業」感、誤タップで動揺中の商品訴求は失礼
- Marcus 35 歳: マーケ感強すぎ、機能で判断したい
- 盆栽園スタッフ: 業務中断、迅速に元の作業に戻りたい
- ライトユーザー: 離脱要因、押し付けがましい
- → 全員にとって有害、削除確定

### Settings Pro CTA 文言（案 B）の選定根拠

- 案 A（概要のみ）: メリット具体性なし
- 案 B（機能列挙、広告に言及しない）: 4 ペルソナ全員に効く、品の良さ
- 案 C（「画面下部の表示が消える」言及）: 婉曲すぎて伝わらない
- → 案 B 採用、広告非表示は Paywall 機能比較表に静かに記載

### v1.x 拡張候補（本 ADR 対象外）

- 動的バナー位置（Home/Detail/Calendar で変更、Adapty +35% 転換）
- Google 公式「UMP first → ATT 連動」順序への変更（5.1.2(i) 違反リスク低減）
- 自前 Pro 誘導 UI（Option D）+ 月数回 AdMob のハイブリッド
- リワード広告で「24 時間 Pro 体験」（任意）
- AppLovin MAX メディエーション（eCPM +10〜30%、Pro 誘導目的では不要）

### Repolog との同期方針

- Repolog (16.0.0、`__DEV__` 逆運用、`G`、INLINE_ADAPTIVE_BANNER) → BonsaiLog (16.3.3、`__DEV__` 削除、`PG`、ANCHORED_ADAPTIVE_BANNER)
- 互換性は維持しない方針（規模 / ペルソナ / シニア配慮で別設計）
- Repolog の `adService.ts` 共通基盤は維持、F-14 固有変更を BonsaiLog で実施

### Apple Review 安全性チェックリスト

- [ ] ATT pre-prompt 文言が「拒否すると使えません」「許可で機能解放」になっていない（5.1.1(iv) 準拠）
- [ ] NSUserTrackingUsageDescription が 19 言語必須翻訳済み
- [ ] PrivacyInfo.xcprivacy で `NSPrivacyTracking=true` + `NSPrivacyTrackingDomains` 記載
- [ ] Privacy Policy で AdMob と Google を第三者として明示 + データ保護同等性宣言
- [ ] X ボタン 48dp 以上、誤タップ防止 5 項目すべて実装
- [ ] パーソナライズ広告は ATT 同意時のみ、ATT 拒否時は NPA 配信
