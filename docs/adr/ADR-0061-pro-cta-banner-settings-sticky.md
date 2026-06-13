# ADR-0061: Pro CTA Banner — Settings 内 sticky 配置 + PlanSection 6-7 行再利用

- Status: Accepted
- Date: 2026-06-13
- Deciders: @doooooraku
- Related: ADR-0009 (RevenueCat billing 基盤) / ADR-0010 (F-14 Home banner、Pro 誘導心理装置) / ADR-0049 (Pro 機能境界 7 項目 SoT) / ADR-0052 (dark theme cascade) / ADR-0054 (BottomCtaBar 全面化) / Issue #1251 (PR-6) / Sess106 議論セッション (Q1-Q7 確定)

---

## Context（背景：いま何に困っている？）

- 現状:
  - ADR-0049 で Pro 機能 7 項目の境界が確定済 (写真 / タグ / 作業記録写真 / CSV/PDF / 広告非表示 / カスタム樹種 / 定期予定)
  - `PlanSection.tsx` が Settings → アカウント画面に **6-7 行の機能比較表 + Primary CTA「Pro プランを見る」** を表示 (Sess59 PR2 + Sess60 PR3 で paywallFeature\* i18n キーを Paywall と DRY 化)
  - ADR-0010 §80 D1 は「Settings → アカウント に **機能列挙型 3 行 (写真枚数 / 樹種作業時期 / CSV/PDF)** の常時表示 Pro CTA カード」を当初決定としていた
  - 実装 PlanSection (6-7 行) と ADR-0010 §80 (3 行原型) の乖離が **Sess106 Phase B 調査** で発見済
- 困りごと:
  - 現 PlanSection は ScrollView 内 inline 配置のため、Settings 画面を下スクロールしないと Pro CTA に到達しない → 見逃されやすい
  - Sess105 PR1 (#1242) で Paywall の sticky CTA が成功 → 同じ手法を Settings 内にも適用すれば訴求機会増の見込み
  - ADR-0010 §80 「3 行原型」 vs 実装「6-7 行表」の決定が未確定 → 新規 i18n キー追加 (3 行版 = 57 keys × 19 言語) と既存再利用 (追加ゼロ) で工数 4-6h 差
- 制約 / 前提:
  - `docs/reference/constraints.md` §2-3 (AdMob / Pro 機能 i18n は ADR-0049 SoT 参照)
  - ADR-0033 (i18n 翻訳ポリシー、新規キー追加時の 19 言語ペルソナ翻訳必須)
  - ADR-0049 (Pro 機能 7 項目 SoT、Sess101 Amendment ⑦ 定期予定追加済)
  - ADR-0053 (Navigation Header SoT、Expo Stack native header)
  - ADR-0054 (BottomCtaBar 全面化、height 64dp、inline 配置)
  - Sess57「設定画面にバージョン番号を表示しない」 (user global CLAUDE.md §12)

---

## Decision（決めたこと：結論）

**Q1-Q7 user 決定 (Sess106 議論)** に従い、以下を確定する。

### D1: 配置形式 = Settings 内 sticky header (Q1 確定)

- **位置**: Settings → アカウント画面内、Stack native header 直下の **sticky 配置**
- **表示**: 画面 scroll 開始時も header 直下に常時可視、PlanSection feature 比較表より上に固定
- **SafeArea**: `useSafeAreaInsets()` の `top` を尊重し、Status Bar / notch とは重複しない
- **scope**: Settings 画面のみ (= 全画面固定 header / FAB 風 / bottom fix は **不採用**)

### D2: 機能セット = PlanSection 6-7 行比較表を再利用 (Q2 確定)

- **既存 i18n キー再利用**: `paywallFeature*` namespace の 21 keys (7 機能 × label/free/pro) をそのまま流用
- **新規 i18n キー追加 = ゼロ** (Sess60 PR2 で Paywall / Settings 共用済の SoT を維持)
- **UI 構造**: PlanSection の `PRO_FEATURE_ROWS` 配列 + `FeatureRow` component を新 `ProBanner.tsx` から再利用
- **テーブル列**: Feature / Free / Pro の 3 列 (既存と同一)

### D3: Banner 寸法 + アクセシビリティ

- **高さ**: 64dp (ADR-0054 BottomCtaBar と統一、視覚的調和 + 親指リーチ整合)
- **コンテンツ**: アイコン (🌱 emoji or LeafIcon) + ラベル「Pro プランを見る」 (既存 `settingsViewProPlans` キー)
- **タップ領域**: Banner 全体 = タップで `/pro?source=settings_banner` 遷移
- **a11y**: `accessibilityRole="button"` + `accessibilityLabel` + `testID="e2e_settings_pro_banner"`

### D4: Free 限定継続 (Q5 確定)

- **条件 render**: `{!isPro && <ProBanner />}` で Free ユーザーのみ表示
- **Pro 即 unmount**: `useProStore((s) => s.isPro)` で Pro 切替時に banner unmount (Zustand reactive)
- **Grandfathered**: 該当なし (banner は UI のみ、機能 state 影響なし)

### D5: Paywall SoT 維持 = 単一 `/pro` ルート

- 新規 Paywall modal / bottom sheet は **作成しない**
- Banner tap → `router.push('/pro?source=settings_banner')` → 既存 `PaywallScreen.tsx`
- 既存 PlanSection の Primary CTA も `/pro?source=settings_plan_section` (将来移行) で source 分離可能

### D6: ADR-0049 との SoT lock-step

- Pro 機能境界の正は **ADR-0049** (§Decision の 7 行表)
- ADR-0061 banner は ADR-0049 の行キーに常時 lock-step
- ADR-0049 が改訂された場合、banner も自動追従 (i18n キー再評価で UI 連動)

### D7: 適用範囲

- v1.0 から Free 向け、Pro で完全非表示
- Sess106 sprint Phase 2 (PR-6 = Issue #1251) で実装

---

## Decision Drivers（判断の軸：何を大事にした？）

- Driver 1: **訴求機会増** — 画面遷移時にも目に入る sticky 配置で、見逃され防止 (= ADR-0010 「Pro 誘導心理装置」 哲学整合)
- Driver 2: **i18n 工数ゼロ** — Sess60 PR2 統一済の `paywallFeature*` 21 keys を再利用、19 言語翻訳追加なし (= Q2 確定根拠)
- Driver 3: **シニア UX** — Q5 Free 限定で Pro 加入後はノイズなし。64dp 高で BottomCtaBar と統一、視認性 ◎
- Driver 4: **既存 ADR 整合** — ADR-0010 §80 (常時表示) / ADR-0049 (Pro 機能 SoT) / ADR-0054 (高さ統一) を組み合わせた最小 delta 設計
- Driver 5: **分析可能性** — source=settings_banner で Home banner ad / Paywall 直接訪問と区別、ファネル分析可能

---

## Alternatives considered（他の案と却下理由）

### Option A: 全画面固定 header (Pro Banner)

- 概要: 全画面 (Home / 予定 / 記録 / ふりかえり / Settings) の header 上端に Pro Banner を sticky 配置
- 良い点: 視認性最大、どの画面でも Pro 訴求
- 悪い点: 上部スペース消費大、Home 画面の検索 / フィルタとの視覚衝突、シニア「画面が狭い」 違和感
- 却下理由: Q1 で「Settings 内」 確定 (= ADR-0054 衝突回避 + Sess57「上端スペース節約」 整合)

### Option B: FAB 風浮動 (画面右下)

- 概要: 画面右下に Pro Banner を浮動 button として配置
- 良い点: scroll に追従、邪魔にならず常時可視
- 悪い点: ADR-0054 で FAB 廃止済 (BottomCtaBar 全面化)、ADR-0042 Superseded と矛盾
- 却下理由: ADR-0054 既決事項に逆行、UX 一貫性破壊

### Option C: bottom fix Banner (画面下端固定)

- 概要: 画面下端、TabBar の上に Pro Banner を fix
- 良い点: 親指リーチ範囲、AdBanner と同位置で訴求集約
- 悪い点: AdBanner (Free 時) + BottomCtaBar + Pro Banner の 3 段重ね → 視覚混乱、TabBar との Z-order 競合
- 却下理由: ADR-0054 D2 Layout Contract 違反、Q1 「Settings 内 sticky」 と矛盾

### Option D: 機能列挙型 3 行 (ADR-0010 §80 原型)

- 概要: 「写真枚数 / 樹種作業時期 / CSV/PDF」 の 3 行コンパクト表示
- 良い点: 行数少、scroll 不要で全体見渡せる、シニアに優しい
- 悪い点: 新規 i18n キー 57 (3 行 × 19 言語) 追加必要 → Sess104 翻訳ペルソナ 4-6h 工数追加、Sess60 PR2 SoT (Paywall と DRY) 解体
- 却下理由: Q2 で「6-7 行再利用」 確定 (= i18n 工数ゼロ + SoT 維持)

### Option E: Pro ユーザーにも「ありがとう」 Banner 表示

- 概要: Pro 加入後も Banner 残し、「ご利用ありがとうございます」 メッセージ表示
- 良い点: Pro 体験のホスピタリティ向上、解約抑止
- 悪い点: Pro 向け i18n キー新規必要、Pro ユーザーには不要なノイズ
- 却下理由: Q5 で「Free 限定継続」 確定 (= ノイズ削減 + シンプル設計)

### Option F: Lifecycle 別 Banner (Free 7 日以上 = 加入訴求強化)

- 概要: Free ユーザーの登録日数で Banner 強度を変える (例: 7 日以上経過で「30% OFF」)
- 良い点: 解約予測 + 訴求最適化
- 悪い点: v1.0 初回リリースで過剰設計、A/B test 基盤未整備
- 却下理由: v1.0 はシンプル設計優先 (Q5)、 v1.x 拡張候補

---

## Consequences（結果）

### Positive（嬉しい）

- **Pro 訴求機会増**: sticky 配置で Settings 滞在中常時可視、見逃され減
- **i18n 工数ゼロ**: 既存 `paywallFeature*` 21 keys 再利用、19 言語翻訳追加なし
- **分析可能**: source=settings_banner でファネル分離分析可能
- **高さ統一**: 64dp (ADR-0054 と同) で視覚的調和、TabBar / BottomCtaBar と並ぶ際の不一致なし
- **dark theme 整合**: `c.tint` / `c.onTint` / `c.border` cascade tokens 利用で light/dark 自動対応

### Negative（辛い/副作用）

- **scroll padding 調整**: PlanSection の ScrollView paddingTop を Banner height (64dp) + insets.top 分加算必要、長 list edge case の検証要
- **Pro→Free demotion UX**: Pro 解約直後にいきなり Banner 出現 → 違和感、release notes / settings notification で説明補完
- **bundle size 微増**: `<ProBanner />` component + 条件 logic で約 2KB gzipped (許容範囲)
- **ADR-0049 改訂時の影響範囲拡大**: 将来 Pro 機能 ⑧ 追加時に PlanSection + ProBanner 両方の表示 row 同期必要 (mitigation: ADR-0049 改訂手順に「全 CTA 画面の FeatureRow 整合確認」追加)

### Follow-ups（後でやる宿題）

- [ ] Sess106 PR-6 (Issue #1251) で `src/features/settings/ProBanner.tsx` 新規作成
- [ ] `src/features/settings/PlanSection.tsx` を ProBanner と「現在プラン / 期限日 / 復元」 残余に分割
- [ ] `app/settings/index.tsx` の SearchHeader 直下に ProBanner sticky 配置
- [ ] Maestro flow `settings-pro-banner.yml` 新規作成 (sticky scroll behavior + tap → Paywall 遷移検証)
- [ ] Jest test `__tests__/features/settings/ProBanner.test.tsx` (Free/Pro 切替、tap source 検証)
- [ ] ADR-0049 Sess106 Amendment に「全 CTA 画面 FeatureRow 統一」 Follow-up 追記
- [ ] ADR-0054 Sess106 Amendment に「Settings で bottom fix banner 禁止、sticky header 型推奨」 Notes 追加
- [ ] design_system.md に `§ProBanner` セクション新設 (height 64dp / typography / dark theme cascade / SafeAreaInsets 扱い)

---

## Acceptance / Tests（合否：テストに寄せる）

- 正（自動テスト）:
  - **Jest 単体テスト**:
    - `__tests__/features/settings/ProBanner.test.tsx` (新規)
      - Free (isPro=false) で render される
      - Pro (isPro=true) で null 返却 (testID `e2e_settings_pro_banner` が tree に存在しない)
      - tap で `router.push('/pro?source=settings_banner')` 呼出
      - dark theme で c.tint / c.onTint が反映 (snapshot)
    - `__tests__/features/settings/PlanSection.test.tsx` (分割後の残余)
      - 「現在プラン / 期限日 / 復元」 表示
      - Free/Pro で表示差確認
  - **Maestro E2E**:
    - `maestro/flows/settings-pro-banner.yml` (新規)
      - Free user → Settings 遷移 → Banner 表示確認
      - PlanSection 500px scroll → Banner top 固定維持
      - Banner tap → Paywall (/pro) 遷移確認
      - Paywall で Pro 購入 → Settings 戻り → Banner unmount 確認
- 手動チェック（必要最小限）:
  - **SafeAreaInsets 確認**: iPhone 13 (notch あり) + Pixel 7 (gesture nav) で Banner top margin が StatusBar と重ならない
  - **dark theme 確認**: light/dark 切替で c.tint / c.onTint コントラスト WCAG AA 4.5:1 維持
  - **19 言語視覚確認**: ja / en / ru / de (長単語言語) で 64dp 内に text 収まる (折返し / truncation なし)

---

## Rollout / Rollback（出し方/戻し方）

- リリース手順:
  - Sess106 sprint Phase 2 (PR-6 = Issue #1251) で実装
  - 依存: PR-4 (本 ADR 起票、Issue #1249) → PR-6 着手
  - リリースノートに「Settings 画面の Pro 機能紹介がより見やすくなりました」 を 19 言語追記
- ロールバック方針:
  - 不具合検知時は `ProBanner.tsx` を `return null` でハードコード非表示化
  - 完全 revert は `app/settings/index.tsx` の ProBanner import 削除 + PlanSection 統合復帰
- 検知方法:
  - Sentry: ProBanner render error 監視 (将来配線後)
  - RevenueCat dashboard: source=settings_banner のファネル分析 (Pro 加入率向上の実証)
  - ストアレビュー: 「設定が見づらい」 「広告増えた」 系キーワード監視

---

## Links（関連リンク）

- constraints: `docs/reference/constraints.md` §2-3 (AdMob 運用 / Pro 機能境界 ADR-0049 参照)
- reference: `docs/reference/functional_spec.md` §18 (F-13 Pro 機能、本 ADR 適用範囲)
- 連動 ADR:
  - `docs/adr/ADR-0009-f13-revenuecat-billing.md` (useProStore SoT、本 ADR が isPro 依存)
  - `docs/adr/ADR-0010-f14-admob-banner-design.md` (Home Pro 誘導と相補、別エントリポイント)
  - `docs/adr/ADR-0049-pro-feature-boundary-v1.md` (Pro 機能 7 項目 SoT、本 ADR が row template lock-step)
  - `docs/adr/ADR-0052-dark-theme-cascade.md` (c.tint / c.onTint cascade、本 ADR で再利用)
  - `docs/adr/ADR-0054-bottom-cta-bar.md` (height 64dp 統一、本 ADR で踏襲)
  - `docs/adr/ADR-0033-i18n-translation-policy.md` (新規 i18n キーなし、既存再利用方針整合)
- Issue: [#1251 (PR-6)](https://github.com/doooooraku/BonsaiLog/issues/1251) (実装) / [#1249 (PR-4)](https://github.com/doooooraku/BonsaiLog/issues/1249) (本 ADR 起票)
- Sess106 議論セッション (Q1-Q7 user 確定):
  - Q1: sticky 配置 (本 D1)
  - Q2: 6-7 行再利用 (本 D2)
  - Q5: Free 限定継続 (本 D4)

---

## Notes（メモ）

### Sess106 議論経緯

- /discuss → 7 件の判断ゲート (Q1-Q7) で user 確定
- Q1 sticky (vs 全画面 / FAB / bottom fix の 4 案比較)
- Q2 6-7 行再利用 (vs 3 行新規追加 = 57 i18n keys × 19 言語、4-6h 工数差)
- Q5 Free 限定継続 (vs Pro にもお礼 banner、複雑性増加)
- 詳細議論プロセス: Workflow `wn2fqxisj` 統合 plan + finalIntegration

### v1.x 拡張候補 (本 ADR 対象外)

- Pro ユーザー向け「ご利用ありがとうございます」 carousel banner (Q5 で v1.0 不採用、v1.x 再評価候補)
- Lifecycle 別 Pro 強度 banner (Free 7 日以上で割引訴求、v1.x A/B test 基盤整備後)
- Settings 以外 (Home / 詳細画面) への Pro Banner 拡張 (現状は AdMob banner で代替、Pro 加入率実績待ち)
- Banner CTA の i18n 改善 (例: 「今だけ」「期間限定」 等の緊急性訴求、ただし景品表示法第 5 条懸念)

### 4 ペルソナ評価マトリクス

| 要素                               | 高橋 62 歳 | Marcus 35 歳 | 盆栽園プロ | ライト | 総合 |
| ---------------------------------- | ---------- | ------------ | ---------- | ------ | ---- |
| Settings 内 sticky 配置 (Q1)       | ◎ 見やすい | ○            | ○          | ○      | ◎    |
| 6-7 行再利用 (Q2、Paywall と整合)  | ○ 一貫性   | ◎            | ◎          | ○      | ◎    |
| Free 限定継続 (Q5)                 | ◎ ノイズ減 | ◎            | ◎          | ◎      | ◎    |
| 64dp 高 (BottomCtaBar 統一)        | ◎ 大きさ◎  | ○            | ○          | ○      | ◎    |
| 既存 `/pro` ルート維持 (D5)        | ◎ 慣れ     | ◎            | ◎          | ◎      | ◎    |
| dark theme cascade 整合 (ADR-0052) | ◎          | ◎            | ◎          | ◎      | ◎    |

→ **全要素で全ペルソナ ○ 以上、× ゼロ** (R-10 クリア)
