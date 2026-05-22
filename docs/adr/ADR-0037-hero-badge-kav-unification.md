# ADR-0037: 盆栽詳細 Hero 縮小 + ×n バッジ統一 + KeyboardAvoidingView 共通 hook 化

- Status: Accepted
- Date: 2026-05-22
- Deciders: @doooooraku (user 真意 4 改善項目 / Sess28 議論)
- Related: ADR-0020 (Claude Design 全採用、 Notes Amended で Hero 規定変更) / ADR-0034 D7 (×N バッジ 件数補完) / R-46 (本 ADR 由来、 KAV 共通 hook) / Issue #?? (Sess28 user 報告 4 改善)

---

## Context（背景：いま何に困っている？）

Sess27 完遂後の Sess28 開始時、 user 実機検証で 4 改善要求が判明。 議論で個別分析した結果、 4 項目のうち **3 項目 (Hero / バッジ / KAV)** が密接に関連する UX 整合性 + コード整合性問題と判明し、 1 ADR にまとめて意思決定する方が ADR matrix の保守性 + 議論一貫性で優位。

### 現状の問題

1. **メモ欄キーボード被り (Critical bug)**
   - `BonsaiCreateScreen.tsx:50-53` で `<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>` (Sess15 PR-TT 由来)
   - Android で `behavior=undefined` = KAV 機能無効、 modal presentation で `windowSoftInputMode=adjustResize` が効きにくい
   - メモ欄 (multiline, numberOfLines=4) がフォーム末尾 + footer 直上のため、 Android 実機でキーボード起動時にメモ欄が完全に隠れる
   - **別画面 (bonsai-detail.tsx:572) は既に修正済**だが新規 modal で**同パターン再現 = 仕組み欠如**。 user 指摘「他の文字列入力欄の挙動を統一して、 コード的にも見やすく分かりやすくできないモノなの?」

2. **盆栽詳細 Hero 情報過剰**
   - 現状 BonsaiHero (`src/features/bonsai/BonsaiHero.tsx`) は **height 280px + overlay 140px** + 盆栽名 + 樹種 (common + scientific italic) + 樹形 の 3-4 行表示
   - ペルソナ 1 (高橋 62 歳老眼) には情報過剰、 list 領域が初期表示で 1-2 件しか見えない
   - user 真意「名前だけで OK」 + 「黒帯も低く」

3. **×n バッジ強調過剰**
   - PlanScreen `groupCountBadge` + bonsai-detail `eventCountBadge` (history + timeline) が **濃緑 BRAND_GREEN ベタ塗り + 白文字**
   - 周囲の washi 背景 + serif フォント世界観と不調和 (ペルソナ 1 「品の良いデザイン」 要求から乖離)
   - アプリ内既存の「優しい色」 リファレンス (`timelineConsecutive`: 薄緑 #E8F0EA + 濃緑文字) が存在するが**水平展開されていない**

### 制約 / 前提

- `docs/reference/constraints.md` §1-4: AI 非搭載原則 (本 ADR に直接影響なし)
- `docs/reference/constraints.md` §6: UI の正は Figma、 仕様書はピクセル不固定 → 本 ADR では「±20% 程度の調整は許容、 mockup 整合性レベル 2 (80%) 達成」 が目標
- ADR-0020: Claude Design 全採用 → Hero 280px 規定は本 ADR Notes Amended で覆す
- R-25 (Claude Read 必須): Hero 縮小後の SS を Claude Read で構造系 4 項目チェック必須

---

## Decision（決めたこと：結論）

### D1. KeyboardAvoidingView を共通 hook `useKeyboardAvoidingProps()` に集約 (R-46 起票)

- 新規 `src/core/hooks/useKeyboardAvoidingProps.ts`
- 戻り値: `{ behavior, keyboardVerticalOffset, style }` (`<KeyboardAvoidingView {...kavProps}>` で展開)
- iOS: `behavior='padding'`、 offset = `useHeaderHeight()` 自動取得
- Android: `behavior='height'`、 offset = 0 (modal の native ヘッダ高は 0 扱い)
- 全 modal / screen で**この hook を使うことを R-46 で義務化**、 `KeyboardAvoidingView` 直接利用は test 以外禁止
- 適用範囲: BonsaiCreateScreen → bonsai-detail.tsx → work-log-confirm.tsx → 他 modal 全て

### D2. 盆栽詳細 Hero 縮小 + 情報削減

- `BonsaiHero` の container height: **280px → 180px** (約 -36%)
- overlay height: **140px → 64px** (盆栽名 1 行 + padding のみ)
- 樹種 (common + scientific italic) + 樹形 表示を**削除**
- placeholder PotIcon size: 120 → 100 (container 縮小に合わせる)
- 樹種・樹形は **基本情報タブ**の LabeledPickerRow で確認可能 (現状実装で既に表示済、 追加実装不要)
- `BonsaiHero` props の `speciesCommonName` / `speciesScientificName` / `styleLabel` は dead prop として**物理削除** (cleanup)
- ADR-0020 Notes Amended で「Hero は盆栽名のみ、 樹種・樹形は基本情報タブで参照」 を明文化

### D3. ×n バッジ 4 箇所統一 + BADGE_SOFT トークン新設

- `src/core/theme/colors.ts` に新トークン:
  - `BADGE_SOFT_BG = '#E8F0EA'` (薄緑、 timelineConsecutive 既存使用色を SoT 化)
  - `BADGE_SOFT_TEXT = BRAND_GREEN` (= `#1F3A2E`、 re-export)
- 適用箇所 (4 箇所):
  1. `app/(tabs)/plan/index.tsx` `groupCountBadge` (line 929-937)
  2. `app/(tabs)/bonsai/[id]/index.tsx` `eventCountBadge` (line 1112-1117、 history タブ)
  3. `app/(tabs)/bonsai/[id]/index.tsx` `eventCountBadge` (line 同、 timeline タブで再利用)
  4. `app/(tabs)/bonsai/[id]/index.tsx` `timelineConsecutive` (line 1205-1213、 既に同色だが ad-hoc HEX を token 参照に書き換え)
- `docs/reference/design_system.md` §3 (色トークン) + §18 (バッジ pattern 新設) に SoT 化
- WCAG コントラスト比 9.5:1 (AAA クリア)

### 適用範囲

- v1.x 全期間
- iOS / Android 両 platform
- light mode (現状)、 dark mode は次セッション対応 (`useColors().badgeSoftBg` 拡張余地)

---

## Decision Drivers（判断の軸：何を大事にした？）

1. **user 真意尊重**: 4 改善要求の意図を実装と整合させる (Sess28 議論で 4 ペルソナ全員 ◎ 確認)
2. **構造的再発防止**: R-46 で KAV 設定の anti-pattern を Lint 化、 Sess15 PR-TT の再発を構造防止
3. **トークン集約**: BADGE_SOFT_BG / BADGE_SOFT_TEXT を 1 SoT (design_system.md) に集約、 ad-hoc HEX 散在を解消
4. **YAGNI 遵守**: BonsaiHero に `showMeta?: boolean` prop 追加等の将来拡張は実施せず、 利用箇所 1 件のみで保守コスト最小化
5. **既存 ADR との整合**: ADR-0020 (Claude Design 全採用) を Notes Amended で部分修正、 新規 ADR の独立性確保

---

## Alternatives（却下した案）

### A1: keyboard-controller ライブラリ導入 (項目 1)

- 利点: Android / iOS 挙動統一、 業界標準 (2025 年)
- 却下理由: 依存追加 0 件方針 + Dev Build 再ビルド = リリースリスク、 KAV 共通 hook で十分

### A2: BonsaiHero に `showMeta?: boolean` prop 追加 (項目 3)

- 利点: 将来再利用箇所増加に対応
- 却下理由: YAGNI 違反、 現状再利用箇所 0 件、 dead prop の保守コスト増

### A3: バッジを背景透明 + border outline (項目 4)

- 利点: より控えめ
- 却下理由: 周囲のカード border と混在して視認性低下、 アプリ内に同 pattern なし

### A4: BRAND_GREEN_BG (#F1F8F2) 既存トークン流用 (項目 4)

- 利点: 新トークン追加なし、 既存資産活用
- 却下理由: BRAND_GREEN_BG は Comparison 表 / 選択中背景の用途で確立済、 用途分離が望ましい

---

## Consequences（結果）

### 良いこと

- ペルソナ 1 (高橋 62 歳老眼) の認知負荷低減 (Hero 削減 + バッジ薄色)
- list 領域が初期表示で 100px 増加 → event 1-2 件追加可視 (ペルソナ 3 プロの一覧性向上)
- KAV 統一で**今後の新規 form 実装でキーボード被りが構造的に発生しない**
- ADR matrix を 3 改善 1 ADR で管理、 文書整合性向上

### 悪いこと / リスク

- ADR-0020 Notes Amended による文書修正コスト (本 PR で同時更新)
- BonsaiHero の写真構図がやや変わる (height 280→180 で写真上部やや切り取られる) → user 受容性は cover photo の構図次第、 contentFit="cover" 維持で吸収

### 副作用 / 関連変更

- design_system.md に新セクション (§17 バッジ pattern or §3 token 追加) 必要
- recurrence-prevention/specialized.md に R-46 追加
- src/core/theme/colors.ts に 2 トークン追加
- ADR-0020 Notes Amended (Sess28 PR-1) で Hero 規定変更明文化

---

## Plan / TODO（次にやる小さなステップ）

- [x] **PR-1**: ADR-0037 起票 + BADGE_SOFT_BG / BADGE_SOFT_TEXT token + R-46 + ADR-0020 Notes Amended (本 PR)
- [ ] **PR-2**: `useKeyboardAvoidingProps()` hook 新設 + BonsaiCreateScreen 適用
- [ ] **PR-3**: hook を bonsai-detail.tsx + 他 modal に水平展開 (R-46 完遂)
- [ ] **PR-4**: BonsaiHero 縮小実装 (container 280→180、 overlay 140→64、 dead prop 削除)
- [ ] **PR-5**: ×n バッジ 4 箇所統一 (BADGE_SOFT token 参照に書き換え)

### Future Work

- [ ] **dark mode 対応**: `useColors().badgeSoftBg` 拡張で dark 時の token 値を別定義
- [ ] **R-46 自動化**: `scripts/check-keyboard-avoiding.mjs` で `KeyboardAvoidingView` 直接利用 grep 検出、 `pnpm lint:kav` 必達
- [ ] **ESLint rule 化**: `behavior={Platform.OS === 'ios' ? ... : undefined}` pattern を error 化 (次セッション候補)

---

## Acceptance / Tests

- 正 (自動テスト):
  - `pnpm verify` 全緑 (lint / type-check / format / test / i18n / config / docs)
  - Jest: BonsaiHero snapshot 更新 (3 行 → 1 行表示)
  - Maestro: bonsai-detail flow + bonsai-create flow + キーボード起動時メモ欄可視性 assertion 追加
- 手動チェック (Pixel 6 + iOS シミュレータ 14):
  - 盆栽新規作成 modal メモ欄 focus → メモ欄底辺 と キーボード上辺余裕 ≥ 8dp (Android) / ≥ 16pt (iOS)
  - bonsai-detail 開封時 Hero 高 180px、 黒帯 64px、 盆栽名のみ
  - 樹種・樹形が基本情報タブで確認可能
  - 予定タブ + 履歴タブ + timeline タブの ×n バッジが薄緑 + 濃緑文字
  - timelineConsecutive も同色 (4 箇所統一)
  - 19 言語切替で表示崩れなし、 dark mode 切替で破綻なし

### 4 ペルソナ評価

| 評価軸           | 高橋 62 (シニア)   | Marcus 35 (海外) | プロ 50 (業務)   | ライト 28 (新人) | 総合 |
| ---------------- | ------------------ | ---------------- | ---------------- | ---------------- | ---- |
| D1 KAV 共通 hook | ◎ メモ欄完全可視   | ◎                | ◎ 業務 form 安定 | ◎                | ◎    |
| D2 Hero 縮小     | ◎ 老眼負荷低減     | ◎ 一覧性         | ◎ 100 鉢で重要   | ○                | ◎    |
| D3 バッジ統一    | ◎ 品の良いデザイン | ○                | ○                | ○                | ◎    |

→ 全項目 ○ 以上、 ✕ ゼロ (R-10 クリア)

---

## Rollout / Rollback

- **リリース手順への影響**:
  - PR-1〜PR-5 を各 1 commit で順次 main merge、 毎 PR `pnpm verify` 緑必達
  - 各 PR は最小スコープ + 独立 revert 可能
- **互換性**:
  - DB schema 変更なし、 i18n key 追加なし → backward compatible
  - 既存 cover photo / 樹種 / 樹形 data は不変、 表示位置のみ変更
- **Rollback 手順**:
  - PR-2/3 失敗時: 個別 PR revert で hook 適用範囲を巻き戻し
  - PR-4 (Hero) 失敗時: BonsaiHero.tsx + ADR-0020 Notes Amended の revert で 280px 復帰
  - PR-5 (バッジ) 失敗時: BADGE_SOFT 参照を BRAND_GREEN/ON_BRAND に書き戻し

---

## 関連

- ADR-0020 (Claude Design 全採用、 本 PR で Notes Amended)
- ADR-0034 D7 (×N バッジ 件数補完、 本 ADR で色のみ変更)
- ADR-0036 (破壊的操作パターン、 Toast.show pattern を流用)
- R-25 (Claude Read 必須、 Hero 縮小後の SS で構造系 4 項目チェック)
- R-46 (本 ADR D1 由来、 KAV 共通 hook 必須)
- `docs/reference/design_system.md` (BADGE_SOFT token + Hero 規定 SoT)
- `src/core/theme/colors.ts` (token 定義)
- `src/core/hooks/useKeyboardAvoidingProps.ts` (PR-2 で新設)
- mockup `bonsai-detail-history-01.png` (履歴タブ整合性レベル 2 達成は PR-6〜PR-8 で対応)
