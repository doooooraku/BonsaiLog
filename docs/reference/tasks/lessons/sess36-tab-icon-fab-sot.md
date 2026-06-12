# Sess36 学び — タブ icon + FAB SoT 化 (ADR-0042、 6 PR #808-813)

## 概要

user 報告「画面下部タブバー『記録』 が水の表現で記録に合わない + FAB 位置が右寄り」 を 6 PR (Sess36) で構造的に解消。 4 ペルソナ評価 + ADR-0042 + design_system §25-26 SoT 化 + lint 自動化 (R-9 昇華)。

## 学び 1: Explore agent 報告の事実誤認は ADR Notes Amended で訂正可能

### 状況

Sess36 PR-1 (ADR-0042 起票) 時、 Explore agent 報告で「NavIcons.tsx に `DropletIcon` (size=28 nav 用) あり、 EventIcons.tsx に `DropletIcon` (size=16 watering 用) あり、 同名関数を別 file で重複定義」 と報告された → ADR-0042 D2 に「NavIcons の DropletIcon を削除」 と記述。

### 実際

**NavIcons.tsx に DropletIcon は元から存在しなかった**。 `app/(tabs)/_layout.tsx:20` の `import { ..., DropletIcon, ... } from '@/src/components/icons'` は barrel export 経由で **EventIcons.tsx の DropletIcon (size=16)** を import し、 `_layout.tsx:76` で `size={28}` 上書きして nav 用に兼用していた。

### 対応 (Sess36 PR-2)

- ADR を amend (force push) せず、 **ADR Notes Amended セクションで「D2 事実誤認の訂正」 を追記** → ADR 履歴の透明性維持 + force push 回避
- 本質的提案 (NotebookIcon に変更 + FAB 共通化 + lint) は正しいので merge 進行、 PR-2 commit で実装を正しく行う

### 教訓

- **Explore agent 報告は「初期仮説」 として扱い、 PR 実装着手前に実コードを Read で再検証**
- 事実誤認発覚時は **Notes Amended が clean** (ADR 本文を後から書き換えると履歴が消える)
- ADR 1 つを複数 commit / PR で進化させる pattern は ADR-0041 (Phase η/θ Notes Amended) と整合

## 学び 2: タブ icon の機能整合性は ADR で SoT 化必須

### 状況

旧 `_layout.tsx` で記録タブが `DropletIcon` (水滴 = watering icon と同形状) → ユーザーに「記録 = 水やり専用」 と誤認させる機能整合性 bug。 mockup `home-screens.jsx` HI.Droplet が記録タブ用と指定していたが、 mockup 採用時に「14 種別記録の象徴か」 評価が抜けていた。

### 対応 (Sess36 ADR-0042 D1)

タブ icon 選定 4 基準を **ADR で SoT 化**:

1. **機能整合**: icon = タブ全機能の象徴 (例: 「記録」 = 14 種別 → 「水滴」 は不可)
2. **重複排除**: NavIcons / EventIcons 間で同名禁止 (`scripts/check-icon-duplication.mjs` で CI 強制)
3. **4 ペルソナ ✕ なし** (R-10 整合)
4. **mockup 整合 or 上書き明示** (R-16 整合、 上書きは ADR で正当化)

### 教訓

- **タブ icon は新規ユーザーの第一印象 = 高 ROI 改善**、 実装者の主観で決めず ADR + 4 ペルソナ評価で構造化
- mockup は **下書き** (R-16)、 機能整合性 / 4 ペルソナ評価で上書き判断が正当 (Sess9 PR-6 TagIcon 追加と同 pattern)
- R-53 (本 lesson 連動) を起票して PR template §7.5.5 で構造化

## 学び 3: 共通 component 化で副次的に bug 解消

### 状況

PR-3 で共通 `<FAB />` component 化を進めた際、 既存 inline FAB 4 箇所を Read して以下の不整合を発見:

1. **bonsai-detail の FAB**: 旧 `<ThemedText>+</ThemedText>` で「+」 を **文字列実装** (他 3 箇所は `<PlusIcon size={28} />` SVG)。 text rendering / a11y / fontSize 統一性で他と差異
2. **bonsai-detail の FAB**: 旧 `bottom: 24` 固定で SafeArea (iOS Home Indicator 34pt / Android gesture nav) **無視** → Apple Review 指摘リスクあり

これら 2 件は user 報告外の **副次的 bug** だったが、 共通化 (1 SoT) で同時解消。

### 教訓

- **共通 component 化は技術負債解消 + 副次的 bug 解消の double effect**
- 1 SoT 原則 (`<FAB />` 1 件) は `useKeyboardAvoidingProps()` (Sess28 ADR-0037) と同じ 共通化 pattern
- 「右に寄っている?」 user 報告から始まり、 SafeArea 反映 + PlusIcon 統一まで scope 拡大が **構造的に正しい改善**

## 学び 4: lint 自動化は R-9 昇華 (人力 review 依存からの脱却)

### 状況

NavIcons / EventIcons の同名 `*Icon` 関数重複は **PR review 人力** では発見困難。 「barrel export 経由で意図せず別 file の icon を import する」 typo bug を恒久防止する必要あり。

### 対応 (Sess36 PR-5)

- `scripts/check-icon-duplication.mjs` 新規 (95 行)
- 対象: NavIcons.tsx + EventIcons.tsx (将来 icon file 追加時拡張)
- pattern: `export function (\w+Icon)\(` を comment 除外 grep
- `package.json` `verify:icon-duplication` 配線、 `pnpm verify` chain に組込
- 動作確認: 現状 **23 unique icons + 0 duplications** で exit 0

### 教訓

- **同種事故が 1 回 → R-9 昇華で即自動化** (CLAUDE.md §9「3 回再発 → ルール化、 1 回違反 → 自動化検討」)
- 既存 scripts/check-\*.mjs 10+ pattern と整合 (テンプレ流用で実装 30 分)
- CI yaml への追加は不要 (`pnpm verify` chain で自動実行)

## 関連

- ADR-0042 (本 lesson の親 ADR、 Sess36 PR-1)
- ADR-0042 Notes Amended (Sess36 PR-2 事実誤認訂正)
- ADR-0020 Notes Amended (Sess36 PR-6 icon 変更履歴追記)
- design_system §25 タブアイコン + §26 FAB (Sess36 PR-4)
- scripts/check-icon-duplication.mjs (Sess36 PR-5)
- R-53 specialized.md (Sess36 PR-6)
- PR template §7.5.5 TabBar icon 変更時チェックリスト (Sess36 PR-6)
- 関連 lesson: ~~`lessons/sess9-tag-overhaul.md`~~ (TagIcon 追加と同 pattern) ※同名ファイルは repo に存在しない (個人 memory のみ)。repo 上の Sess9 タグ改修記録 = ADR-0008 §Notes Amended 2026-05-18
