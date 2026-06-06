# ADR-0042: タブバー記録 icon 変更 + FAB SoT 化 + lint 自動化 (Sess36)

> **2026-06-07 追記 (Superseded by [ADR-0054](./ADR-0054-bottom-cta-bar.md))**: D3 (FAB SoT 化) は Sess72 ADR-0054 で **FAB 廃止 + Bottom CTA Bar 全面化** に置換されました。 ただし D1 (タブ icon 4 基準) / D2 (NotebookIcon) / D4 (check-icon-duplication.mjs lint) / D5 (ADR-0020 Notes Amended) は **無傷で有効** です。 FAB は本 ADR D3 で「Component SoT」 化したが、 「画面側の Layout Contract (ScrollView paddingBottom 計算)」 を同時 SoT 化し損ねた事が Sess72 のテスター報告 (FAB がリストと重なる) の根本原因。 ADR-0054 D5 で R-62「Component SoT 化時は Layout Contract も同じ ADR で SoT 化必須」 を起票。

- Status: Superseded by [ADR-0054](./ADR-0054-bottom-cta-bar.md) (D3 のみ、 D1/D2/D4/D5 は有効)
- Date: 2026-05-23
- Superseded Date: 2026-06-07 (Sess72)
- Deciders: @doooooraku
- Related: ADR-0020 (4 タブ構造 + Notes Amended 「探す」 → 「ふりかえり」 rename 履歴) / ADR-0027 (14 種別 form + 写真/日付) / ADR-0037 (BADGE_SOFT token + KAV 共通 hook) / ADR-0038 (記録タブ動線復活 + RecordTabScreen + BUTTON_SECONDARY) / `docs/reference/design_system.md` §22 (4 階層 CTA pattern、 本 ADR で §タブアイコン + §FAB を新設) / `docs/mockups/v1.0/wireframes/home-screens.jsx` HI.\* (mockup の TabBar icon SoT、 本 ADR で上書き判断) / `.claude/recurrence-prevention.md` R-9 (lint 自動化) R-25 (構造系 4 項目 + 本 ADR で「タブ icon 変更時の mockup 整合 + 4 ペルソナ評価」 追加) / Sess36 議論 (6 専門家チーム + 4 ペルソナ評価マトリクス + 2 ラウンド) / 業界 1 次情報 [Apple HIG Tab Bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) + [Material 3 Navigation Bar](https://m3.material.io/components/navigation-bar/overview) + [Material 3 FAB](https://m3.material.io/components/floating-action-button/overview) + [WCAG 2.2 SC 2.5.8 Target Size Minimum 24×24](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

---

## Context（背景：いま何に困っている？）

### user 報告 (2026-05-23、 Sess36 議論起点)

> 画面下部のタブバー「記録」 の UI が水の表現で「記録」 にあっていないです。 「記録」 に合う UI を設定してください。 加えて、 現在タブバーに表示している 4 つの UI がそれぞれユーザーにとって分かりやすいのか、 ペルソナを立てて検討して一番合うものを用意してください。 FAB のボタン位置ですが、 若干右に寄ってない? 良い感じの位置に調整してください。 これは FAB ボタンがある全画面で言えることね。

### 構造的な根本問題

#### 問題 1: タブ icon の意味的不整合 + 同名関数重複

- **`src/components/icons/NavIcons.tsx`**: 「記録」 タブ用に `DropletIcon` (水滴、 size=28) が定義されている
- **`src/components/icons/EventIcons.tsx`**: 「水やり (watering)」 event 用に **同名 `DropletIcon`** (size=16) が定義されている (本 ADR で size=16 のみ維持)
- 結果として:
  - 記録タブ icon = 水滴 を見たユーザーは「記録 = 水やり専用」 と誤認 (ADR-0027 で実装した 14 種別記録の全 form を活かせない)
  - NavIcons と EventIcons で **同名関数 `DropletIcon` を別 file で重複定義** = 名前空間衝突、 lint 検出困難
- mockup `docs/mockups/v1.0/wireframes/home-screens.jsx` HI.\* 確認: mockup でも記録タブは Droplet 想定 (HI.Droplet) → mockup 整合と機能整合がトレードオフ

#### 問題 2: FAB 共通 component 不在 + 値ばらつき

- BonsaiLog の FAB は **共通 component 不在**、 全 4 画面で inline `<Pressable>` + `StyleSheet` 実装:
  | 画面 | file:line | bottom 計算 |
  |---|---|---|
  | 盆栽 tab | `app/(tabs)/bonsai/index.tsx:270-283` | `tabBarHeight + AD_BANNER_HEIGHT_APPROX + 16` |
  | 予定/記録 tab | `src/features/calendar/CalendarTabScreen.tsx:949-963` | `tabBarHeight + 16` |
  | bonsai-detail (Stack) | `app/(tabs)/bonsai/[id]/index.tsx:1170-1185` | `bottom: 24` 固定 (SafeArea 無視) |
- 全画面で **`right: 16` 固定** = 画面端から指 1 本分、 高橋 62 歳ペルソナ (老眼 + タップ精度低) で誤タップ懸念
- bonsai-detail で iOS Home Indicator (34pt SafeArea) と被るリスク (Apple Review 指摘可能性)

### 既存 bug (本 ADR で同時 fix)

- **NavIcons `DropletIcon` (size=28) と EventIcons `DropletIcon` (size=16) の同名重複** = ESLint で検出されないが、 import 時に typo すると意図しない方を import するリスク (lint 自動化で恒久防止)
- **bonsai-detail FAB の SafeArea 無視** = iOS Home Indicator 被り

### 4 ペルソナ評価 (Sess36 議論、 6 専門家チーム討議)

#### タブ icon 案 (Round 2、 鉛筆と被る Option C 除外後)

| 案                         | 高橋 62 (シニア)     | Marcus 35 (米国 IT) | 業務プロ (100 鉢)          | ライト (1-2 本)  | 総合  |
| -------------------------- | -------------------- | ------------------- | -------------------------- | ---------------- | ----- |
| **A. NotebookIcon** (帳簿) | ◎ 家計簿の安心感     | ○ 機能伝わる        | ◎ 顧客樹管理の帳簿感       | ○ 直感的         | **◎** |
| B. ClipboardCheckIcon      | ○ チェック付き完了感 | ◎ Material 標準     | ◎ 検品感                   | ○ タスクアプリ風 | ◎     |
| D. DocumentTextIcon        | ○ 書類感             | ○ 汎用              | △ エクスポートと紛らわしい | △ 識別性低い     | ○     |

**A 採用**: 4 ペルソナ全員 ◎/○、 BonsaiLog 和文化 brand と整合、 鉛筆 (ふりかえり) との差別化完全。 ✕ なし。

#### FAB アプローチ案

| 案                        | 概要                                                                   | 工数 | 保守性    |
| ------------------------- | ---------------------------------------------------------------------- | ---- | --------- |
| **F1. 完全集約案 (採用)** | 共通 `<FAB />` 1 component、 props `tabBarVisible` で Tab/Stack 両対応 | 中   | ◎ (1 SoT) |
| F2. 段階移行案            | `<TabFAB />` + `<StackFAB />` の 2 component に分離                    | 大   | △ (2 SoT) |

**F1 採用**: 1 SoT 原則、 テスト容易、 工数も妥当。

### 制約 / 前提

- ADR-0020 4 タブ構造 (盆栽 / 予定 / 記録 / ふりかえり) 不変、 icon のみ変更
- ADR-0033 翻訳ポリシー: i18n key `tabRecord` ラベル不変 (icon 変更のみで 19 言語追加不要)
- ADR-0038 RecordTabScreen / 'log' mode FAB 不変、 FAB icon (PlusIcon) も不変
- ADR-0037 BADGE_SOFT token / `useKeyboardAvoidingProps()` 既存 hook 共通化 pattern と整合
- 既存 testID (`e2e_tab_record` 等 Maestro flow 依存) 不変、 flow 影響なし
- 依存パッケージ追加禁止 (R-50)、 `useBottomTabBarHeight()` (expo-router) + `useSafeAreaInsets()` (既存) で達成

---

## Decision（決めたこと：結論）

### Sess36 で 5 sub-decision を統合 (6 PR、 user 全 A 承認)

#### D1: タブ icon 選定 4 基準を SoT 化

- **決定**: タブ icon を変更/追加する際は以下 4 基準を全て満たす ADR 改訂を必須化:
  1. **機能整合**: icon が表すメンタルモデルがタブの全機能を象徴 (例: 「記録」 = 14 種別記録 → 「水滴」 (1 種別) は不可)
  2. **重複排除**: NavIcons と EventIcons / 他 icon library で同名関数を作らない (`scripts/check-icon-duplication.mjs` で CI 強制)
  3. **4 ペルソナ ✕ なし**: `docs/reference/personas.md` 4 名全員で ✕ がない (1 名でも ✕ なら再検討)
  4. **mockup 整合 or 上書き明示**: `docs/mockups/v1.0/wireframes/*.jsx` HI.\* との整合が原則、 上書き時は ADR で理由明示 (本 ADR D2 が該当)
- **理由**: タブ icon は新規ユーザーの第一印象を決める SoT、 実装者の主観で決まる現状を恒久解消

#### D2: 記録タブ icon を `NotebookIcon` (帳簿) に変更

- **決定**:
  - **新規**: `src/components/icons/NavIcons.tsx` に `NotebookIcon` (size=28 default、 SVG = 開いた帳簿 = 中央綴じ + 2 ページ + 横線数本、 `strokeWidth=1.5` で `LeafIcon` / `CalendarIcon` / `PencilNavIcon` と統一)
  - **削除**: NavIcons の `DropletIcon` (size=28 nav 用、 mockup HI.Droplet 由来)
  - **無傷**: `src/components/icons/EventIcons.tsx` の `DropletIcon` (size=16 watering 用) は完全に維持
  - **配線**: `app/(tabs)/_layout.tsx:20, 76` の import + `tabBarIcon` を差替
- **mockup 上書き理由 (D1 基準 4 適用)**: mockup HI.Droplet は記録タブ初期実装時の素朴な選択、 EventIcons watering との重複 + 機能誤認 (1 種別誤誘導) のため上書き判断。 ADR-0020 Notes Amended に履歴追記 (D5)
- **i18n 影響なし**: `tabRecord` ラベル不変 (「記録」 / "Record" / 19 言語そのまま)
- **A11y**: tab `accessibilityRole="button"` + `accessibilityLabel=t('tabRecord')` (既存維持)

#### D3: FAB SoT 化 (共通 component + design_system §FAB 新設)

- **決定**:
  - **新規 component**: `src/components/common/FAB.tsx`
    - props: `onPress: () => void`, `icon?: React.ReactNode` (default `<PlusIcon />`), `accessibilityLabel: string`, `testID: string`, `showAdBanner?: boolean` (default false), `tabBarVisible?: boolean` (default true)
    - hook: `useBottomTabBarHeight()` (tabBarVisible=true 時のみ、 Stack screen は呼ばない) + `useSafeAreaInsets()` (常時)
    - style: `position: 'absolute'`, `right: 20` (16 → 20 で +4px = 8px grid 整合 + 端からの余裕)、 size 56×56dp (Material 3 FAB 標準)、 BRAND_GREEN bg、 `borderRadius: 28`
    - bottom 計算式: `(tabBarVisible ? tabBarHeight : 0) + (showAdBanner ? AD_BANNER_HEIGHT_APPROX : 0) + insets.bottom + 16`
  - **置換**: 全 4 inline FAB を `<FAB ... />` に置換:
    - 盆栽 tab: `<FAB showAdBanner onPress={...} accessibilityLabel={...} testID={...} />`
    - 予定/記録 tab (CalendarTabScreen 共通): `<FAB onPress={...} ... />` (mode に応じた a11y + testID は呼び出し側で分岐)
    - bonsai-detail (Stack): `<FAB tabBarVisible={false} onPress={...} ... />`
  - **`AD_BANNER_HEIGHT_APPROX`** 定数は FAB.tsx 内に集約 (盆栽 tab inline から移動)
- **理由**: 1 SoT 原則、 SafeArea 反映で Apple Review リスク低減、 right=20 で誤タップ余裕、 Stack screen 対応で全画面統一

#### D4: lint 自動化 (`scripts/check-icon-duplication.mjs`)

- **決定**: `scripts/check-icon-duplication.mjs` 新規:
  - `src/components/icons/NavIcons.tsx` + `src/components/icons/EventIcons.tsx` (将来 icon file 追加時は拡張) の `export function *Icon\(` を grep
  - 同名関数を 2 file 以上で検出 → 違反 list を stderr 出力 → `process.exit(1)`
  - 例外 list (将来必要時): なし (初期は 0 件、 厳格 mode)
  - 既存 `scripts/check-*.mjs` 10+ ファイルと同 pattern (`check-form-screen-scroll.mjs` 参考)
- **配線**: `package.json` に `lint:icon-duplication` script 追加、 `pnpm verify` に組込、 `.github/workflows/ci.yml` lint step に追加
- **unit test**: `scripts/__tests__/check-icon-duplication.test.ts` 5 case (重複あり/なし/部分一致/関数名類似/正常)
- **R-9 昇華**: タブ icon 変更時の重複事故を「PR review 人力」 から「CI 自動」 に昇華 (1 回事故 → 即自動化、 ルール §9 適用)

#### D5: ADR-0020 Notes Amended (タブ icon 履歴追記)

- **決定**: `docs/adr/ADR-0020-*.md` 末尾 Notes Amended セクションに「2026-05-23 Sess36: 記録タブ icon DropletIcon → NotebookIcon 変更、 理由 = EventIcons watering との同名重複 + 14 種別記録の機能整合、 ADR-0042 D1/D2 参照」 を追記
- **理由**: ADR-0020 が 4 タブ構造 SoT、 icon 変更履歴を 1 file で追跡可能化 (Sess9 PR-6 TagIcon 追加と同 pattern)

---

## Decision Drivers（判断の軸：何を大事にした？）

- **Driver 1 (最重要)**: user 真意「水の表現を記録に合うものへ + FAB を良い位置に」 達成 (4 ペルソナ ◎/○ 全員)
- **Driver 2**: 構造的解決 (1 SoT + lint 自動化) で再発防止、 対症療法回避 (CLAUDE.md §3 + §9)
- **Driver 3**: 既存資産活用 (`useBottomTabBarHeight` / `useSafeAreaInsets` / 既存 hook 共通化 pattern)、 依存追加ゼロ (R-50)
- **Driver 4**: ADR-0020/0037/0038 整合維持、 i18n 影響ゼロ、 Maestro testID 不変
- **Driver 5**: Apple HIG Tab Bars + Material 3 Navigation Bar + WCAG 2.2 SC 2.5.8 (target size) 準拠

### 粒度 × 4 ペルソナ matrix (ADR template 必須項目)

| 粒度                    | 高橋 62 (シニア) | Marcus 35 (米国 IT) | 業務プロ (100 鉢) | ライト (1-2 本) |
| ----------------------- | ---------------- | ------------------- | ----------------- | --------------- |
| icon 個別 (記録 1 タブ) | ◎                | ◎                   | ◎                 | ○               |
| icon 全 4 タブ整合      | ◎                | ○                   | ◎                 | ○               |
| FAB 1 画面 (例: 盆栽)   | ◎                | ◎                   | ○                 | ◎               |
| FAB 全 4 画面整合       | ◎                | ◎                   | ◎                 | ○               |

全 cell ✕ なし、 △ なし。

---

## Alternatives considered（他の案と却下理由）

### Option A: NotebookIcon + 共通 FAB component + lint 自動化 ★採用

- 概要: 上記 Decision の通り
- 良い点: 4 ペルソナ ✕ なし、 構造的解決、 1 SoT、 lint 自動化で再発防止
- 採用理由: user 真意 + 構造解決の両立、 ✕ なし

### Option B: 値調整のみ (right 16 → 20、 共通化なし)

- 概要: FAB は inline 維持で数値だけ修正
- 良い点: 工数最小 (4 file 数値修正のみ)
- 悪い点: 今後追加画面で同じばらつきが再発、 SafeArea 未対応で iOS Review リスク残存、 構造的解決にならず CLAUDE.md §9 (3 回再発 → ルール化) を守れない
- 却下理由: 対症療法、 持続性なし

### Option C: 記録タブ icon を ClipboardCheckIcon に変更

- 概要: B 案 (Round 2 評価) を採用
- 良い点: Material/iOS 標準で Marcus ペルソナ ◎、 完了感あり
- 悪い点: 高橋シニア層 ○ (業務的すぎ)、 BonsaiLog 和文化 brand と整合△、 SVG パスが ✓ 含むため A より複雑
- 却下理由: 総合 ○ で A の総合 ◎ に劣る

### Option D: 4 タブ全 icon 見直し (盆栽 = Leaf も差替検討)

- 概要: 4 タブ全 icon を新規候補で再評価
- 良い点: 全体最適
- 悪い点: 盆栽 = Leaf (葉) / 予定 = Calendar / ふりかえり = Pencil は 4 ペルソナ評価で問題なし、 変更コスト > 効果
- 却下理由: ROI 低、 scope creep

---

## Consequences（結果：何が変わる？）

### Pro

- 記録タブ icon が機能 (14 種別記録) と整合、 新規ユーザー誤認解消
- NavIcons と EventIcons の同名重複解消、 lint で永続防止
- FAB が全 4 画面で統一、 SafeArea 反映で iOS Home Indicator 被り解消
- design_system §タブアイコン + §FAB SoT 化で今後の追加画面で参照先明確
- ADR-0020 Notes Amended で icon 変更履歴追跡可能

### Con

- ストアスクショ (`fastlane/metadata/`) のタブバー部分が変わる → 19 言語 batch 再撮影 (v1.0 リリース前で UI Diff 自動化活用)
- 既存 `DropletIcon` を import している箇所 (Sess36 時点で `_layout.tsx` 1 箇所のみ確認、 他は EventIcons 経由で size=16 のみ使用) の追加 grep 確認が PR-2 で必要

### Follow-ups（後でやる宿題）

- [ ] PR-2 後: `_layout.tsx` 以外で nav 用 `DropletIcon` を import している箇所がないか grep 確認
- [ ] PR-6 後: R-25 (構造系) に「タブ icon 変更時の mockup 整合 + 4 ペルソナ評価必須」 5 項目目を追記
- [ ] PR-6 後: PR template §7.5 に「TabBar icon 変更時チェックリスト」 追加
- [ ] v1.0 リリース前: ストアスクショ 19 言語 batch 再撮影 (UI Diff 自動化 with kill switch)

---

## Implementation（実装メモ）

### Phase 分割 (6 PR)

| PR   | 内容                                                        | 主な対象ファイル                                                                                                                                         |
| ---- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR-1 | 本 ADR-0042 起票                                            | `docs/adr/ADR-0042-tab-icon-and-fab-sot.md`                                                                                                              |
| PR-2 | NotebookIcon 追加 + 記録タブ差替 + DropletIcon (nav用) 撤去 | `src/components/icons/NavIcons.tsx`, `src/components/icons/index.ts`, `app/(tabs)/_layout.tsx`                                                           |
| PR-3 | 共通 `<FAB />` component 新設 + 4 画面置換                  | `src/components/common/FAB.tsx` (新規), `app/(tabs)/bonsai/index.tsx`, `src/features/calendar/CalendarTabScreen.tsx`, `app/(tabs)/bonsai/[id]/index.tsx` |
| PR-4 | design_system §タブアイコン + §FAB SoT 追記                 | `docs/reference/design_system.md`                                                                                                                        |
| PR-5 | check-icon-duplication lint 自動化                          | `scripts/check-icon-duplication.mjs` (新規), `package.json`, `.github/workflows/ci.yml`, `scripts/__tests__/check-icon-duplication.test.ts`              |
| PR-6 | R-25 拡張 + PR template + ADR-0020 Notes Amended + Engram   | `.claude/recurrence-prevention.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `docs/adr/ADR-0020-*.md`                                                         |

### Design Tokens (FAB)

- **size**: 56×56dp (Material 3 FAB 標準、 WCAG 2.2 SC 2.5.8 minTarget 44dp 余裕クリア)
- **bg**: BRAND_GREEN
- **borderRadius**: 28 (完全円)
- **icon**: `<PlusIcon size={28} color={BG_PRIMARY} />` (既存)
- **position**: `right: 20`, `bottom: 動的計算式 (上記 D3)`
- **shadow**: iOS shadowOpacity 0.15 + Android elevation 4 (既存 inline 値を踏襲、 共通化)

### NotebookIcon SVG 設計 (NavIcons.tsx 追加)

```tsx
/** ノート (記録タブ TabBar アイコン)。28px。
 *
 * mockup v1.0 home-screens.jsx HI.Droplet (旧) を ADR-0042 D2 で上書き。
 * 14 種別記録 (剪定 / 針金 / 植替 / 施肥 / etc.) を象徴する帳簿型 icon。
 * 形状: 開いた帳簿 (中央綴じ縦線 + 左右 2 ページ + 各ページ横線 2 本)。
 */
export function NotebookIcon({ size = 28, color = TEXT_PRIMARY }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* 帳簿の外枠 + 中央綴じ */}
      <Path
        d="M4 5h7v14H4zM13 5h7v14h-7z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* 左ページの横線 2 本 */}
      <Path d="M6 9h3M6 12h3" stroke={color} strokeWidth="1.25" strokeLinecap="round" />
      {/* 右ページの横線 2 本 */}
      <Path d="M15 9h3M15 12h3" stroke={color} strokeWidth="1.25" strokeLinecap="round" />
    </Svg>
  );
}
```

### testID 命名規約

- `e2e_tab_record` (既存維持、 不変)
- `e2e_fab_<screen>` (例: `e2e_fab_bonsai_list`, `e2e_fab_plan`, `e2e_fab_record`, `e2e_fab_bonsai_detail_history` / `e2e_fab_bonsai_detail_plan`) — PR-3 で共通化、 既存 testID は呼び出し側 props で維持

### A11y

- タブ icon: 既存 `tabBarButtonTestID` + `accessibilityLabel=t('tab*')` 維持
- FAB: `accessibilityRole="button"` + `accessibilityLabel` 呼び出し側 props 必須 + minTarget 56dp 確保

---

## Acceptance / Tests（合否：テストに寄せる）

### PR-1 完了時

- 本 ADR (ADR-0042) merge
- `pnpm verify` 緑 (docs:lint で ADR 連番チェック通過)

### PR-2 完了時

- 記録タブに NotebookIcon (帳簿) が表示される (Android 実機 SS)
- EventRow watering chip の DropletIcon (size=16) は無傷 (Android 実機 SS で確認)
- `grep -r "DropletIcon" src/ app/` で nav 用 (size=28) 残存なし、 EventIcons (size=16) のみ
- `pnpm verify` 緑

### PR-3 完了時

- 全 4 画面 (盆栽 / 予定 / 記録 / bonsai-detail) で `<FAB />` 統一使用
- iOS Simulator + Android 実機で FAB 位置検証:
  - 盆栽 tab (AdBanner ON/OFF 両方) で FAB が banner と被らない
  - 予定 / 記録 tab で FAB が tab bar と被らない
  - bonsai-detail で iOS Home Indicator (34pt) と被らない
- Maestro 全 flow 緑 (testID 不変なので影響なし)
- `pnpm verify` 緑

### PR-4 完了時

- design_system.md に §タブアイコン + §FAB 新設、 §22 4 階層 CTA と整合性確認 (FAB は floating CTA カテゴリで独立)
- `pnpm docs:lint` 緑

### PR-5 完了時

- `scripts/check-icon-duplication.mjs` 実装 + unit test 5 case 全 pass
- 故意に NavIcons に `DropletIcon` (size=28) 復活させて lint が exit 1 になることを手動確認
- `package.json` `lint:icon-duplication` script + `pnpm verify` 配線
- CI で lint step pass

### PR-6 完了時

- `.claude/recurrence-prevention.md` R-25 に「タブ icon 変更時の mockup 整合 + 4 ペルソナ評価必須」 追記
- PR template §7.5 に「TabBar icon 変更時チェックリスト」 追加
- ADR-0020 Notes Amended に Sess36 履歴追記
- Engram に Sess36 完遂サマリ保存

---

## Notes Amended (随時更新)

### 2026-05-23 Sess36 PR-2: D2 事実誤認の訂正

PR-1 (ADR 起票) 時の Explore agent 報告に誤認があり、 D2 の以下記述を訂正:

- 誤: **「NavIcons.tsx の `DropletIcon` (size=28 nav 用) を削除」 「NavIcons と EventIcons で同名関数 `DropletIcon` を別 file で重複定義」**
- 正: **NavIcons.tsx に `DropletIcon` は元から存在しない**。 `app/(tabs)/_layout.tsx:20` の import 文 `import { CalendarIcon, DropletIcon, LeafIcon, PencilNavIcon } from '@/src/components/icons'` は barrel export 経由で **EventIcons.tsx の `DropletIcon` (size=16 watering 用) を import** し、 `_layout.tsx:76` で `<DropletIcon size={28} color={color} />` と size override して nav 用に兼用していた

### 実装の正しい手順 (D2 訂正版)

1. **新規追加**: `src/components/icons/NavIcons.tsx` に `NotebookIcon` (size=28 default)
2. **barrel export**: `src/components/icons/index.ts` の NavIcons exports に `NotebookIcon` 追加 (削除はゼロ件)
3. **配線切替**: `app/(tabs)/_layout.tsx:20, 76` の import + `tabBarIcon` を `DropletIcon` → `NotebookIcon`
4. **無傷**: `EventIcons.tsx` の `DropletIcon` (size=16 watering 用) は本 ADR では一切触らない。 watering 用に **3 箇所** で使用中 (`EventIcons.tsx:191` EventIcon switch / `CalendarTabScreen.tsx:551,678` 月カレンダー row / `BonsaiCard.tsx:154` 盆栽カード)

### D4 lint の意義 (訂正版)

- 当初想定の「現状の同名重複を CI で検出して二度と作らない」 → 実際は **「現状重複ゼロを保つ予防策」**
- NavIcons (UI ナビ用 24-28px) と EventIcons (event 種別用 14-18px) は **意味的役割が完全に異なる** ため、 同名 export は将来も禁止すべき (例: NavIcons に水滴 icon が必要なら `WaterDropletIcon` 等で別名)
- 現状重複ゼロを baseline として CI 強制 → 仕様変更で偶発的重複が入った瞬間 fail で検出可能

### `_layout.tsx` doc comment 修正

- L6 `* - 記録 (Droplet): ...` → `* - 記録 (Notebook): ... (ADR-0042 D2 で icon 変更)` に修正済 (PR-2)

### 2026-06-07 Sess72 ADR-0054 起票による Superseded (D3 のみ)

Sess72 で本 ADR D3 (FAB SoT 化) を **撤回し、 `<BottomCtaBar />` 全画面採用に移行**。 詳細は [ADR-0054](./ADR-0054-bottom-cta-bar.md) 参照。

**経緯**:

- 2026-06-03 テスター報告: 「FAB がリストと重なって配置されているのが気になりました」 (bonsai-detail 履歴 tab スクショ)
- 真因: 本 ADR D3 で FAB component の SoT は確立したが、 **「FAB を置く画面の ScrollView paddingBottom (Layout Contract)」** が SoT 化対象から漏れ、 4 画面で paddingBottom 計算式が散在 (`tabBarHeight+32` / `tabBarHeight+60+32` / `96` ハードコード)、 結果として `FAB top edge (tabBarHeight+insets.bottom+72) > paddingBottom` で 40〜74 px の重なり領域が常時発生
- 議論 (Sess72): 6 専門家 + 4 ペルソナ + 業界事例 (Material 3 / Apple HIG / Nielsen Norman 2024) で 純 UX 視点 12:6 で バー型 優位、 user 判断「dark theme 衝突無視で純 UX 優先」 → バー型 (ADR-0054 Option A) 確定

**本 ADR で生きている部分 (D1/D2/D4/D5 無傷)**:

- **D1**: タブ icon 選定 4 基準 (機能整合 / 重複排除 / 4 ペルソナ ✕ なし / mockup 整合 or 上書き明示) は今後も適用
- **D2**: NotebookIcon (記録タブ icon) は無傷で維持、 `src/components/icons/NavIcons.tsx` 不変
- **D4**: `scripts/check-icon-duplication.mjs` lint は無傷で維持 (NavIcons / EventIcons の同名関数禁止)
- **D5**: ADR-0020 Notes Amended (タブ icon 履歴追記) は無傷で維持

**ADR-0054 で新規追加**:

- D1 (FAB 廃止) + D2 (BottomCtaBar component) + D3 (ラベル設計 ＋ i18n) + D4 (ADR-0042 Superseded) + D5 (**R-62 起票** = Component SoT 化時は Layout Contract も同じ ADR で SoT 化必須)

**学び (R-62 の起票根拠)**:

- 本 ADR Acceptance test では「FAB が tabBar / banner にかぶらない」 は検証したが、 「FAB が ScrollView 最終項目にかぶらない」 は検証項目になかった (= Layout Contract の SoT 化漏れ)
- これは「Component SoT」 と「Layout Contract SoT」 が **本来 2 つの SoT であるべき** だったが、 1 つに圧縮された認識の欠落
- ADR-0054 D5 で R-62 を起票し、 将来 BottomSheet / Header / KAV 等の Component SoT 化時にも適用
