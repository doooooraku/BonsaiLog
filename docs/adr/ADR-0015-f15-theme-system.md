---
# ADR-0015: F-15 ダークモード / 屋外モード（Tamagui themes 全面再設計 + Material 3 baseline + 屋外モード緑単色）

> ## ⚠ 実装注意 (2026-05-30 Notes Amended)
  >
  > **本文 (Decision §) は当初 PoC 設計 (Tamagui themes 前提)**。 現実装は Phase 7 K5 で Tamagui を撤回し、 `src/core/theme/colors.ts` (plain hex) + `src/core/theme/useColors.ts` (Hook) で運用中。
  >
  > 参照すべき最新仕様:
  > 1. `docs/reference/design_system.md` §6 (Colors token SoT)
  > 2. `src/core/theme/useColors.ts` (実装 hook)
  > 3. 本 ADR 末尾の **Notes Amended (2026-05-30): Tamagui 撤回 → useColors + plain hex 採用**
  >
  > 本 ADR は ADR-0046 (廃止ポリシー、 番号保持 + Status 注記) に沿って **歴史的価値のみ保持**。 タイトル中の「Tamagui themes 全面再設計」 は当初 PoC 段階の表現であり、 現実装と一致しない点に留意。

  - Status: Accepted (Amended 2026-05-30: Tamagui 撤回、 実装は useColors hook + plain hex)
  - Date: 2026-05-01
  - Deciders: @doooooraku
  - Related:
    - 上書き対象: `functional_spec.md` §20（F-15 詳細仕様）— 4 mode + Material 3 + 屋外モード緑単色 + ヒートマップ 3 モード hex
    - 上書き対象: `basic_spec.md` F-15 セクション — 青系撤回、Material 3 反映
    - 上書き対象: `tamagui.config.ts` — 全面書換 (light/dark/outdoor 3 themes + neonPink/cyberBlue 削除)
    - 連動: ADR-0013 (F-04 ヒートマップ hex 継続) / ADR-0014 (F-16 太陽アイコン) / ADR-0010 (F-14 広告) / ADR-0011 (記録のみ哲学) / ADR-0007 (F-11 ZIP 引継ぎで AsyncStorage 含む)
    - 影響先: ADR-0013 / ADR-0014 に「F-15 連動 (heatmap_l0..l3 トークン参照)」明記、ESLint カスタムルール `no-direct-hex-in-jsx` 追加
    - 既存資産: `tamagui.config.ts` (現状 dark / neonPink / cyberBlue の 3 themes、neonGreen #39FF14 アクセント) ← **F-15 仕様と完全乖離、全面書換必須**
    - Issue: #<TBD>
---

## Context（背景：いま何に困っている？）

- 現状：
  - `tamagui.config.ts` は `dark` / `neonPink` / `cyberBlue` の 3 themes、accent `#39FF14` (ネオン緑) → **盆栽世界観と乖離 + F-15 仕様 (light/dark/outdoor) と完全不整合**。
  - functional_spec §20 / basic_spec F-15 で「屋外モード primary `#000080`」(ネイビー青) が指定されているが、リサーチで老眼者の青-紫弁別困難と矛盾と判明。
  - basic_spec F-15 で「ダークモード `#0A0E1A` (OLED 焼付き配慮)」とあるが、Material 3 baseline `#121212` との不整合、出典不明。
  - functional_spec §20.3.3 で「屋外モード secondary `#FFFF00` (黄色)」が含まれるが、屋外モードのシンプル原則 (純白/純黒/緑単色) と矛盾。
  - F-04 (ADR-0013) ヒートマップ hex は light モードのみ確定、dark/outdoor モード hex 未定義。
  - F-04 / F-16 / F-14 で「F-15 連動」と書かれているが、F-15 自体が ADR 化されていない。
  - 直 hex (`color="#xxx"`) のコード混入リスクがあるが、防止策なし。
- 困りごと：
  1. **既存 tamagui.config.ts と F-15 仕様の完全乖離**: light も outdoor も未定義、サイバーパンク調 accent (#39FF14) が盆栽世界観と相容れない。
  2. **シニア UX (高橋 62 歳) と既存仕様の矛盾**: 青系屋外モード (#000080) が老眼者の青-紫弁別困難 (Track 4 F4-2) と矛盾、緑系で統一すべき。
  3. **業界標準との不整合**: ダークモード背景 #0A0E1A が Material 3 baseline #121212 から逸脱、shadow 視認 + eye strain 軽減効果を享受できない。
  4. **ヒートマップ 3 モード対応未定義**: F-04 のヒートマップが light モードのみで dark/outdoor で破綻するリスク。
  5. **直 hex 混入の構造的防止策なし**: テーマ追加時の漏れ、メンテ時の不整合リスク。
  6. **屋外モード切替アクセス導線**: ADR-0014 で「S-08 右上太陽アイコン」確定だが、他画面でも屋外作業中に切替したい (シニア UX)。
- 制約/前提：
  - `docs/reference/constraints.md` §1-4（記録のみ哲学）/ §5-2（禁止語）/ §3-1（19 言語 LTR）
  - `docs/reference/personas.md`（4 ペルソナ：高橋 62 歳 / Marcus 35 歳 / 盆栽園プロ / ライト）
  - `.claude/recurrence-prevention.md` R-1〜R-12
  - WCAG 2.2 AAA 7:1（通常テキスト、シニア対応）
  - WCAG 2.2 1.4.11 Non-text Contrast 3:1（UI 要素・ヒートマップセル隣接色）
  - Apple HIG: Dark Mode / Differentiate Without Color
  - Material Design 3: dark theme baseline #121212
  - 既存依存: `tamagui ^1.144.3` / `@tamagui/animations-react-native ^1.144.3` / `@tamagui/lucide-icons ^1.144.3` / `expo` SDK 55 / `expo-status-bar`
  - ADR-0013 §32（F-04 が F-15 テーマトークン参照）
  - ADR-0014 §27（F-16 が太陽アイコン S-08 右上に配置、F-15 連動）

---

## Decision（決めたこと：結論）

F-15 を以下の構成で実装する。

### モード構成（4 状態）

1. **4 mode 切替**: `theme.mode` ∈ `{auto, light, dark, outdoor}`、AsyncStorage 永続化。
2. **Auto モード = OS dark mode 追従**: `useColorScheme()` で light/dark を自動選択、`null` フォールバックは **light** (IM1-A、シニア初見「真っ暗 = 故障?」回避)。
3. **Light モード**: 白背景 + 黒文字 + 緑系アクセント（通常モード）。
4. **Dark モード**: Material 3 baseline 暗背景 + 明るい文字 + 緑系アクセント（夜・暗所）。
5. **Outdoor モード**: 純白背景 + 純黒文字 + 緑単色アクセント（直射日光下、コントラスト 21:1）。

### Tamagui themes 設計（TC1: 全面書換）

6. **既存 themes (`dark` / `neonPink` / `cyberBlue`) 全削除**、`light` / `dark` / `outdoor` の 3 themes に再設計。
7. **トークン命名規約 (TN1)**: Tamagui 標準キー (`background` / `color` / `borderColor` 等) + 独自プレフィクス `bonsai_*`（例 `bonsai_heatmap_l0..l3`）で衝突防止。
8. **共通トークン構造**:
   - `background` / `surface` / `surface2` / `color` / `muted` / `borderColor` / `accent`
   - `bonsai_heatmap_l0` / `_l1` / `_l2` / `_l3`（F-04 ヒートマップ 3 モード対応）
   - `bonsai_today_border`（今日のセル太枠ハイライト）
   - `bonsai_outdoor_only` (屋外モード専用フラグ的な役割は不要、theme name で判定)
9. **`accent` キーは Tamagui 標準ではない独自命名**を継続（既存コード互換性維持、ADR Note に明記）。

### 配色（hex 値、コントラスト比）

#### Light theme (推奨デフォルト)

| トークン              | hex                                | コントラスト (vs background)                     |
| --------------------- | ---------------------------------- | ------------------------------------------------ |
| `background`          | `#FFFFFF`                          | (基準)                                           |
| `surface`             | `#FAFAFA`                          | 1.05:1                                           |
| `surface2`            | `#F5F5F5`                          | 1.10:1                                           |
| `color`               | `#1A1A1A`                          | **16:1 (AAA 楽勝)**                              |
| `muted`               | `#4A4A4A`                          | 8.6:1 (AAA)                                      |
| `borderColor`         | `#E0E0E0`                          | 1.31:1 (UI 要素 1.4.11 微妙、視認性目的でこの値) |
| `accent`              | `#2E7D32` (Material green primary) | 7.4:1 (AAA)                                      |
| `bonsai_heatmap_l0`   | `#F5F8F5` (ADR-0013 継続)          | (背景に近い灰白)                                 |
| `bonsai_heatmap_l1`   | `#BAE4B3`                          | 1.5:1 (薄緑)                                     |
| `bonsai_heatmap_l2`   | `#74C476`                          | 2.4:1 (中緑)                                     |
| `bonsai_heatmap_l3`   | `#238B45`                          | 4.7:1 (AA OK + 数字併記で AAA 補完)              |
| `bonsai_today_border` | `#238B45`                          | 太枠 2dp                                         |

#### Dark theme (Material 3 baseline)

| トークン              | hex                                  | コントラスト (vs background #121212) |
| --------------------- | ------------------------------------ | ------------------------------------ |
| `background`          | `#121212` (Material 3 baseline、BD1) | (基準)                               |
| `surface`             | `#1E1E1E` (surface +1 elevation)     | 1.18:1                               |
| `surface2`            | `#242424` (surface +2)               | 1.39:1                               |
| `color`               | `#E1E1E1`                            | **14.5:1 (AAA)**                     |
| `muted`               | `#A0A0A0`                            | 8.5:1 (AAA)                          |
| `borderColor`         | `#2C2C2C`                            | 1.42:1                               |
| `accent`              | `#7BC97D` (Material 3 tone 80、DA1)  | 8.5:1 (AAA)                          |
| `bonsai_heatmap_l0`   | `#1E1E1E`                            | (background ≈ 透過印象)              |
| `bonsai_heatmap_l1`   | `#2D4A2E`                            | 1.7:1                                |
| `bonsai_heatmap_l2`   | `#4A8A4D`                            | 4.2:1                                |
| `bonsai_heatmap_l3`   | `#7BC97D`                            | **8.5:1 (AAA)**                      |
| `bonsai_today_border` | `#7BC97D`                            | 太枠 2dp                             |

#### Outdoor theme (純白 + 純黒 + 緑単色、SC1 + OC1)

| トークン              | hex                                             | コントラスト (vs background #FFFFFF) |
| --------------------- | ----------------------------------------------- | ------------------------------------ |
| `background`          | `#FFFFFF`                                       | (基準)                               |
| `surface`             | `#FFFFFF` (装飾排除、影 OFF)                    | (同色)                               |
| `surface2`            | `#FFFFFF`                                       | (同色)                               |
| `color`               | `#000000`                                       | **21:1 (理論上限)**                  |
| `muted`               | `#000000` (屋外モードは muted も純黒)           | 21:1                                 |
| `borderColor`         | `#000000` (純黒、線幅 2dp+ で形状判別)          | 21:1                                 |
| `accent`              | `#1B5E20` (緑単色、OC1)                         | **9.7:1 (AAA)**                      |
| `bonsai_heatmap_l0`   | `#FFFFFF` (background 同色 → 枠線 1dp 黒で識別) | (同色)                               |
| `bonsai_heatmap_l1`   | `#A8D5A8`                                       | 1.6:1 + 数字「1」併記                |
| `bonsai_heatmap_l2`   | `#4A8A4D`                                       | 4.2:1 + 数字「2」併記                |
| `bonsai_heatmap_l3`   | `#1B5E20`                                       | **9.7:1 (AAA)** + 数字「3+」         |
| `bonsai_today_border` | `#000000`                                       | 太枠 2dp 純黒                        |

#### 屋外モード追加要件

10. **フォントウェイト強制 600+**: 細字を屋外で読ませない（屋外モード時 `fontWeight: '600' | '700'` を最低保証）。
11. **線幅最小 2dp**: 通常モードの 1dp ボーダーを屋外モードでは 2dp に拡張。
12. **影 (shadow) 完全 OFF**: 純白上で薄影は屋外で消える、形状判別を borderColor に依存。
13. **アイコン色 = `theme.color` (純黒)** + サイズ拡大（屋外モードのみアイコンサイズを通常 + 4dp）。

### モード切替の動作

14. **テーマ解決ロジック** (`app/_layout.tsx`):
    ```typescript
    function resolveTheme(
      mode: 'auto' | 'light' | 'dark' | 'outdoor',
      systemColorScheme: 'light' | 'dark' | null,
    ): 'light' | 'dark' | 'outdoor' {
      if (mode === 'outdoor') return 'outdoor';
      if (mode === 'auto') return systemColorScheme === 'dark' ? 'dark' : 'light'; // null → light (IM1-A)
      return mode; // 'light' | 'dark'
    }
    ```
15. **Auto モード** = OS 設定追従（`useColorScheme()`、Expo `userInterfaceStyle: 'automatic'`）。OS 設定変更時にアプリ即時再描画（React Native 標準動作）。
16. **手動モード切替**: `Appearance.setColorScheme('light' | 'dark')` でアプリ強制（OS 設定には影響しない）。Outdoor は OS API スコープ外、アプリ独自モードとして扱う。
17. **屋外モード OFF 時の挙動 (BR1)**: 前回モード (light or dark or auto) に戻る。`previousMode` を AsyncStorage に保存。
18. **アニメーション (A1)**: 200ms (Tamagui `quick` 標準)、Reduced Motion ON 時は **0ms**（`useReducedMotion()` 検知、react-native-reanimated）。
19. **ヒートマップ即時再描画 (RD1)**: F-04 Skia Atlas は theme 変更検知で sprite 配列を再生成、worklet 内で 1 フレーム以内反映。

### Settings UI (UI1)

20. **Settings → 外観**:

    ```
    テーマ
    [ システム ] [ ライト ] [ ダーク ]   ← セグメンテッドコントロール (排他選択)

    屋外モード        [ON]/[OFF]         ← 独立トグル
    ```

21. **屋外モード ON 時**: 上のセグメントは disabled 表示（屋外モード優先）。OFF 時にセグメントが有効化。
22. **言語非依存**: 設定ラベルは i18n キー経由（19 言語ローカライズ）。

### 屋外モード切替の物理的アクセス (OA1)

23. **全画面のヘッダー右上に太陽アイコン常設**: ワンタップで屋外モード ON/OFF。
24. **アイコン仕様**: Lucide `Sun` (屋外 OFF 時) / `SunDim` or 内部塗りつぶし (屋外 ON 時)、48×48 dp タッチ領域、`accessibilityLabel="屋外モードを切り替える"`。
25. **適用範囲**: 全画面（Home / 盆栽詳細 / 作業予定カレンダー S-08 / Settings 等）。タブバー優先、タブ追加なし。
26. **状態同期**: ヘッダーアイコンと Settings トグルは双方向バインド（`useThemeStore()`）。

### スプラッシュ / ステータスバー

27. **スプラッシュ (SP1)**: `app.config.ts` `userInterfaceStyle: 'automatic'` で OS dark mode 追従。Expo の SplashScreen 標準動作で自動対応。
28. **ステータスバー (SB1)**: `expo-status-bar` を `style={theme === 'dark' ? 'light' : 'dark'}` で動的切替。Outdoor は背景 #FFFFFF 前提なので `style="dark"`。

### 初回起動 (IM1-A)

29. **デフォルト**: `theme.mode = 'auto'` (system 追従)。
30. **`useColorScheme()` null フォールバック**: **light** (シニア初見「真っ暗 = 故障?」回避)。

### 永続化失敗時 (PE1)

31. **AsyncStorage 永続化失敗時**: 無音、Sentry にログのみ、セッション内は反映、再起動で前回値に戻る。エラーモーダル表示しない（シニア混乱回避）。

### 環境光センサー連動

32. **採用しない**: 誤判定が多い、シニア UX 重視で手動切替のみ（既存仕様維持）。

### 連動機能の屋外モード追従

33. **F-04 ヒートマップ (Y3 / Y6)**: theme.bonsai_heatmap_l0..l3 トークンを参照、3 モード自動切替。Skia Atlas sprite 配列を `useTheme()` 検知で再生成。
34. **F-08 写真 (Y3, PH1)**: 写真自体は変更なし（撮影時の色を保持、UX 期待通り）、UI 枠（背景・フレーム・キャプション）のみテーマ追従。
35. **F-08 カメラ UI (Y6)**: UI 枠のみ屋外モード追従（撮影プレビュー画像は OS 標準）。
36. **F-13 Paywall (Y7)**: 全画面で屋外モード追従、CTA ボタンは `accent` (緑単色 #1B5E20)。
37. **エラーモーダル (Y8)**: 屋外モード時は赤色撤回、純黒テキスト + 太枠 2dp で表現。
38. **BottomSheet (BS1、F-04 / F-16 で使用)**: シート背景 `#FFFFFF` (純白) + つまみ `#000000` (純黒)、シート外背景うっすら見える設計維持。
39. **アイコン (IC1、F-08 写真 / F-04 / F-16 等)**: Lucide アイコン全て `theme.color` 参照、ESLint EL1 で直 hex 禁止。

### 広告 (Y4 撤回 → 色変えない)

40. **AdMob 広告は色変えない**: 配信側 (Google) で広告画像/HTML が固定、アプリ側で色制御不可。屋外モード時も広告周囲枠は通常モードのまま。
41. **v1.x で再評価**: 屋外モード時広告非表示 (AD2 案) を将来検討。

### チュートリアル (TT2 採用、TT1 OS 追従撤回)

42. **チュートリアル (オンボーディング Step 1〜5) は常に light 固定**: 一貫性 + シンプル、初見ユーザーが「ダークから始まる」混乱回避。
43. **チュートリアル中はテーマ切替 UI 非表示** (Y5): ヘッダー太陽アイコンも非表示、Settings 遷移不可。

### F-11 引継ぎ (Y10)

44. **AsyncStorage キー (`theme.mode`) は ADR-0007 ZIP に含まれる**: 引継ぎ後に F-15 設定が自動復元。

### ESLint カスタムルール (EL1)

45. **`no-direct-hex-in-jsx` 追加**: JSX 内の `color` / `backgroundColor` / `borderColor` プロパティに直 hex (`#xxx`) 禁止、`useTheme()` 経由を強制。
46. **例外**: `tamagui.config.ts` 内の tokens 定義のみ許可。
47. **実装**: ESLint custom rule 自作 or `eslint-plugin-react-native` 拡張、CI で `pnpm lint` に組込。

### Maestro E2E (Y11)

48. **テーマ切替 snapshot 比較**: 各 mode (light/dark/outdoor) で主要画面 (Home / 盆栽詳細 / S-08 / Settings) のスクリーンショット比較。

### Engram 保存 (Y9)

49. **テーマ変更を Engram に保存しない**: AsyncStorage 永続化で十分、Engram は会話文脈のみ。

### 適用範囲

50. v1.0 から全プラン（Free / Pro 両方）で全機能利用可。

---

## Decision Drivers（判断の軸）

- Driver 1: **シニア UX 最優先**（高橋 62 歳） — 緑単色屋外モード、Material 3 dark eye strain 軽減、初回 light フォールバック、太陽アイコン全画面常設、200ms アニメ。
- Driver 2: **「記録のみ」哲学の貫徹**（ADR-0011） — テーマプリセット (春/秋/和風) v1.0 不採用、シンプル原則。
- Driver 3: **業界標準準拠** — Material 3 baseline #121212、WCAG 2.2 AAA 7:1、Apple HIG Dark Mode、ColorBrewer Greens 4-class。
- Driver 4: **構造的品質保護** — ESLint 直 hex 禁止、トークン命名 `bonsai_*` プレフィクス、theme.color 強制参照。
- Driver 5: **F-04 / F-16 / F-14 / F-08 全画面の一貫性** — Y3「ライトモードなのにここだけダーク?は気持ち悪い」のユーザー強調を反映、全機能で theme トークン参照。
- Driver 6: **コスト 0** — 既存 Tamagui 流用、新規ライブラリなし。
- Driver 7: **色覚異常 + 老眼の両対応** — 緑単色 monochromatic palette、青-紫弁別困難回避、数字併記。

---

## Alternatives considered（他の案と却下理由）

### Option A: 既存 tamagui.config.ts 維持 (TC2 追加方式)

- 概要: 既存 dark / neonPink / cyberBlue を残しつつ light / outdoor を追加。
- 良い点: 既存コード互換性。
- 悪い点: themes 5 個に肥大化、メンテコスト増、neonPink/cyberBlue は実利用なし。
- 却下理由: シンプル原則違反、ユーザー方針 TC1 全面書換採用。

### Option B: 段階移行 (TC3、v1.0 で light/dark のみ、outdoor は v1.x)

- 概要: 屋外モードを v1.x 延期。
- 良い点: 段階リリース可。
- 悪い点: 屋外作業 (盆栽園プロ・高橋 62 歳) のシニア UX 必須機能を遅延。
- 却下理由: F-04 / F-16 で「F-15 連動」と確定済、屋外モード必須。

### Option C: 屋外モード青系 (#000080) 維持 (OC3)

- 概要: 既存仕様の青系 primary を継続。
- 良い点: 既存決定維持。
- 悪い点: 老眼者の青-紫弁別困難 (リサーチ Track 4 F4-2)、F-04 緑系統一と矛盾。
- 却下理由: ユーザー方針 OC1 緑単色採用。

### Option D: ColorBrewer 公式値に揃える (H2)

- 概要: F-04 ヒートマップを ColorBrewer 公式 hex (`#F3F9F3 / #D4EDD4 / #73BE73 / #1FA61F`) に揃える。
- 良い点: 学術標準準拠。
- 悪い点: ADR-0013 既存値 (`#F5F8F5 / #BAE4B3 / #74C476 / #238B45`) との整合性 + 仕様書修正コスト。
- 却下理由: ユーザー方針 H1 既存値継続採用、微差は ADR Note に明記。

### Option E: ダークモード背景 #0A0E1A 維持 (BD2)

- 概要: 既存 basic_spec の #0A0E1A を継続。
- 良い点: 既存決定維持。
- 悪い点: Material 3 baseline #121212 から逸脱、shadow 視認性低下、出典不明。
- 却下理由: ユーザー方針 BD1 Material 3 採用。

### Option F: 屋外モード黄色 secondary (#FFFF00) 維持 (SC2)

- 概要: 既存仕様の黄色 secondary を継続。
- 良い点: 既存決定維持。
- 悪い点: 屋外モードのシンプル原則 (純白/純黒/緑単色) と矛盾、配色 4 色で識別負担増。
- 却下理由: ユーザー方針 SC1 削除採用。

### Option G: チュートリアル OS 追従 (TT1)

- 概要: チュートリアル中も OS dark mode 追従。
- 良い点: Settings デフォルトと整合。
- 悪い点: 初回起動でダークから始まる混乱、TT2 一貫性 light 固定の方がシニア向け。
- 却下理由: ユーザー方針 TT2 常 light 採用。

### Option H: 広告色変更 (AD1 周囲枠のみ屋外化、AD2 屋外時非表示)

- 概要: AdMob 広告周囲枠を屋外モード対応 or 屋外モード時非表示。
- 良い点: 一貫性最強 (AD2)。
- 悪い点: AD2 は収益機会喪失、AD1 は周囲枠のみで違和感残る。
- 却下理由: ユーザー方針 Y4 (色変えない) 採用、AdMob 配信側で色制御不可、v1.x で AD2 再評価。

### Option I: テーマプリセット (春 / 秋 / 和風) v1.0 採用

- 概要: ユーザー定義テーマプリセット。
- 良い点: 個性化、ロイヤルティ向上。
- 悪い点: シンプル原則違反、v1.0 範囲外、シニア混乱。
- 却下理由: ユーザー方針 Y2 不採用、v1.x 候補。

### Option J: ESLint ルール不採用 (EL2 人手 / EL3 型)

- 概要: 直 hex 禁止を人手チェック or TypeScript 型のみ。
- 良い点: 実装コスト最小。
- 悪い点: 人手は漏れる、型は実行時違反検出不可。
- 却下理由: ユーザー方針 EL1 ESLint カスタムルール採用、構造的保護重視。

---

## Consequences（結果）

### Positive（嬉しい）

- 「記録のみ」哲学を完全貫徹、constraints §1-4 / §5-2 と整合。
- 全ペルソナで全要素 ○ 以上、✕ ゼロ。
- 業界標準準拠（Material 3 / WCAG AAA / Apple HIG / ColorBrewer）。
- F-04 / F-16 / F-14 / F-08 全画面で一貫したテーマ追従、Y3「ここだけダーク?は気持ち悪い」解消。
- ESLint 直 hex 禁止で構造的品質保護、テーマ追加時の漏れ防止。
- 屋外モード緑単色で老眼者の青-紫弁別困難解消。
- Material 3 baseline #121212 で shadow 視認 + eye strain 軽減。
- 全画面ヘッダー太陽アイコンで屋外作業中どこでも切替、シニア UX 最強。
- 4 mode 切替 (Auto / Light / Dark / Outdoor) で多様な利用シーン対応。
- バンドル増ゼロ（既存 Tamagui 流用、新規ライブラリなし）。

### Negative（辛い/副作用）

- **tamagui.config.ts 全面書換**: 既存 `neonPink` / `cyberBlue` 参照コードがあれば修正必要 → grep で全ファイル確認 + 修正。
- **ESLint カスタムルール実装コスト**: `no-direct-hex-in-jsx` 自作 1〜2 日、ESLint plugin 知識必要。
- **AdMob 広告と屋外モードの違和感**: 屋外モード時に広告周囲枠だけ通常モード → ユーザー体感の不一致、ただし技術的に不可、v1.x 再評価。
- **Hermes Intl リスク**: F-15 単体では影響なし、ただし F-04 / F-16 連動部分で要注意 (ADR-0008 同様)。
- **テーマ切替時の Skia Atlas 再生成**: 100 本ヒートマップで 36,500 sprite 再生成 → worklet 内でも 50ms 程度の処理時間、Phase 0 PoC で実機検証。
- **チュートリアル light 固定の違和感**: OS dark 設定中ユーザーが初回起動 → light チュートリアル → 完了後 dark 切替の段差、ただしシンプル原則優先。
- **Outdoor モードの OS API 非統合**: iOS の Increase Contrast 設定とは独立、ユーザー学習コスト発生。

### Follow-ups（後でやる宿題）

- [ ] `tamagui.config.ts` 全面書換 (light/dark/outdoor 3 themes + bonsai\_\* トークン + neonPink/cyberBlue 削除)。
- [ ] `docs/reference/functional_spec.md` §20 全面書換 (4 mode + Material 3 + 屋外緑単色 + ヒートマップ 3 モード hex)。
- [ ] `docs/reference/basic_spec.md` F-15 セクション修正 (青系撤回、Material 3 反映)。
- [ ] `docs/reference/glossary.md` 用語追加: Material 3 baseline / monochromatic palette / userInterfaceStyle / useColorScheme / DynamicColorIOS / OLED 焼き付き / Reduced Motion / surface elevation。
- [ ] `docs/adr/ADR-0013-f04-watering-visualization.md` §32 補強 (heatmap_l0..l3 トークン参照明記)。
- [ ] `docs/adr/ADR-0014-f16-local-notification.md` 補強 (太陽アイコンを全画面ヘッダーに拡張、屋外モード切替挙動明記)。
- [ ] `app.config.ts` に `userInterfaceStyle: 'automatic'` 追加。
- [ ] `eslint.config.js` (or `.eslintrc.cjs`) に `no-direct-hex-in-jsx` カスタムルール追加 + `pnpm lint` で検出。
- [ ] `src/core/theme/themeStore.ts` 新規実装 (Zustand + AsyncStorage 永続化、`theme.mode` ∈ {auto, light, dark, outdoor})。
- [ ] `src/core/theme/resolveTheme.ts` 純関数 (`mode`, `systemColorScheme` → 解決テーマ)。
- [ ] `src/components/HeaderSunIcon.tsx` 新規実装 (全画面ヘッダー右上、屋外モード切替)。
- [ ] `src/screens/SettingsAppearance.tsx` 新規実装 (セグメント + トグル UI)。
- [ ] テスト: `__tests__/features/theme/resolveTheme.test.ts` (mode × systemColorScheme 全組合せ)。
- [ ] テスト: `__tests__/features/theme/persistTheme.test.ts` (AsyncStorage 永続化 + 復元)。
- [ ] テスト: `__tests__/features/theme/contrast.test.ts` (全モード hex のコントラスト比 7:1 検証、純関数)。
- [ ] テスト: `__tests__/features/theme/heatmapTheme.test.ts` (3 モード × ヒートマップ L0..L3 トークン整合)。
- [ ] Maestro: `maestro/flows/theme_switch.yml` (Settings → 各モード切替 → 主要画面遷移、snapshot)。
- [ ] Maestro: `maestro/flows/outdoor_mode.yml` (太陽アイコンタップ → 屋外モード適用 → 全画面確認)。
- [ ] Phase 0 PoC: 実機 iPhone 13 / Pixel 7 で OS dark mode 切替反映、Skia Atlas 再生成 FPS 計測、iOS Color Filters Grayscale で全画面チェック。
- [ ] Phase 0 PoC: F-04 ヒートマップ 3 モードでセル隣接色のコントラスト比 1.4.11 (3:1) を満たすか実機確認、満たさなければセル間 1dp 枠線追加判断。
- [ ] `docs/reference/tasks/lessons.md` 追記候補:
  - 「テーマシステムは ESLint 直 hex 禁止 + プレフィクス命名で構造的保護」
  - 「シニア向け屋外モードは緑単色 monochromatic + 純白純黒で青-紫弁別困難回避」
  - 「Material 3 baseline #121212 はダークモード eye strain 軽減 + shadow 視認の業界標準」

---

## Acceptance / Tests（合否：テストに寄せる）

### 自動テスト

- **Jest 単体テスト**:
  - `__tests__/features/theme/resolveTheme.test.ts`: mode × systemColorScheme 全 12 組合せ + null フォールバック
  - `__tests__/features/theme/persistTheme.test.ts`: AsyncStorage 永続化 + OFF→ON 復元 + previousMode 記憶
  - `__tests__/features/theme/contrast.test.ts`: 全モード × 全トークン hex のコントラスト比 7:1 (AAA) 検証
  - `__tests__/features/theme/heatmapTheme.test.ts`: 3 モード × ヒートマップ L0..L3 トークン値整合
- **ESLint custom rule**:
  - `eslint-plugin-bonsai/no-direct-hex-in-jsx.test.js`: JSX 内 color/backgroundColor 直 hex 検出
- **Maestro E2E**:
  - `maestro/flows/theme_switch.yml`: Settings → セグメント切替 (Auto/Light/Dark) → Home / 盆栽詳細 / S-08 snapshot 比較
  - `maestro/flows/outdoor_mode.yml`: 太陽アイコンタップ → 屋外モード適用 → 戻るで前回モード復帰 (BR1)
  - `maestro/flows/auto_mode.yml`: OS dark 切替 → アプリ自動追従

### 手動チェック (Phase 0 PoC 必須)

- 実機 Pixel 7 / iPhone 13:
  - OS dark mode 切替で Auto モードが即時追従
  - Skia ヒートマップ 3 モード再描画 60 FPS
  - 太陽アイコン全画面常設、タッチ領域 48×48 dp
  - スプラッシュ画面が OS dark mode 追従
  - ステータスバー文字色がモード別自動切替
- iOS:
  - VoiceOver で「太陽アイコン: 屋外モードを切り替える」読み上げ
  - Dynamic Type 最大設定で各モードレイアウト維持
  - iOS Color Filters Grayscale モードで全画面視覚的に動作 (Apple Differentiate Without Color 評価基準)
- Android:
  - TalkBack 読み上げ
  - fontScale 最大設定
  - edge-to-edge ステータスバー透過動作
- 屋外実機テスト (任意):
  - 直射日光下で outdoor モード視認可能
  - ヒートマップセル隣接色 (L0 vs L1 等) を識別可

### F-15 受け入れ条件

- [ ] tamagui.config.ts に light / dark / outdoor の 3 themes が存在 (neonPink/cyberBlue 削除)
- [ ] 全 themes で background / surface / color / muted / borderColor / accent / bonsai_heatmap_l0..l3 の 11 トークンを保持
- [ ] light: AAA 7:1 (color #1A1A1A on bg #FFFFFF = 16:1)
- [ ] dark: Material 3 baseline #121212 + AAA 14.5:1
- [ ] outdoor: 純白 + 純黒 21:1 + 緑単色 #1B5E20 (9.7:1)
- [ ] 4 mode 切替 (Auto / Light / Dark / Outdoor) 動作
- [ ] Auto モード = OS dark mode 即時追従
- [ ] null フォールバック light (IM1-A)
- [ ] 屋外モード ON で前モード保存、OFF で前モード復帰 (BR1)
- [ ] 200ms アニメーション、Reduced Motion ON で 0ms (A1)
- [ ] スプラッシュが OS dark mode 追従 (SP1)
- [ ] ステータスバーがモード別自動切替 (SB1)
- [ ] AsyncStorage 永続化失敗時は無音 + Sentry ログ (PE1)
- [ ] Settings UI セグメント (3 つ) + 屋外トグル (UI1)
- [ ] 全画面ヘッダー右上に太陽アイコン (OA1)、48×48 dp タッチ
- [ ] F-04 ヒートマップが 3 mode で即時再描画 (RD1)
- [ ] F-08 写真は変更なし、UI 枠のみテーマ追従 (PH1)
- [ ] BottomSheet が屋外モード時 純白/純黒 (BS1)
- [ ] Lucide アイコン全 theme.color 参照 (IC1)
- [ ] チュートリアル中は light 固定、太陽アイコン非表示 (TT2 + Y5)
- [ ] AdMob 広告は色変えない (Y4 確定)
- [ ] テーマプリセット (春/秋/和風) v1.0 不採用 (Y2)
- [ ] Home トグル提供しない、Settings + ヘッダー太陽のみ (Y1)
- [ ] F-11 引継ぎで AsyncStorage `theme.mode` 移行 (Y10)
- [ ] ESLint `no-direct-hex-in-jsx` で直 hex 検出 (EL1)
- [ ] トークン命名規約: 標準キー + bonsai\_\* プレフィクス (TN1)
- [ ] Maestro snapshot で各モード主要画面確認 (Y11)

---

## Rollout / Rollback（出し方/戻し方）

- リリース手順への影響：
  - F-01 / F-08 / F-02 マージ後、F-04 / F-16 / F-09 マージ前後どちらでも F-15 マージ可 (theme トークン参照は遅延束縛)
  - 推奨: foundation 完了 → F-15 → F-04 / F-16 / F-09 / F-14 の順 (theme 先行で他機能の参照が安定)
  - リリースノート: 「ライト・ダーク・屋外モードを切り替えられます」「直射日光下でも見やすい屋外モード」(19 言語)
- ロールバック方針：
  - F-15 を v1.0.x ホットフィックスで無効化する場合: tamagui.config.ts を最小限の light theme のみに戻し、theme.mode を 'light' 固定 (DB 影響なし)
  - 屋外モードのみロールバック: 太陽アイコン非表示 + Settings から「屋外モード」トグル削除 (theme トークンは残す)
- 検知方法：
  - Sentry: `ThemeError` (テーマ解決失敗、AsyncStorage 永続化失敗) 監視
  - ストアレビュー: 「文字が見えない」「色がおかしい」「屋外で使えない」キーワード監視
  - DAU: 各モード利用率 (Auto / Light / Dark / Outdoor)、屋外モード ON 率

---

## Links（関連リンク）

- constraints: `docs/reference/constraints.md` (§1-4 記録のみ / §5-2 禁止語 / §3-1 19 言語 / §6 UI Figma)
- reference: `docs/reference/basic_spec.md` (F-15 セクション — 本 ADR で書換)
- reference: `docs/reference/functional_spec.md` (§20 F-15 — 本 ADR で書換)
- reference: `docs/reference/personas.md` (4 ペルソナ評価)
- glossary: `docs/reference/glossary.md` (追加用語多数、本 ADR Follow-up)
- 行動 lesson: `.claude/recurrence-prevention.md` (R-1〜R-12)
- 既存資産: `tamagui.config.ts` (本 ADR で全面書換) / `app.config.ts` (`userInterfaceStyle` 追加)
- 連動 ADR:
  - `docs/adr/ADR-0007-f11-data-migration-design.md` (F-11 ZIP に AsyncStorage 含む)
  - `docs/adr/ADR-0010-f14-admob-banner-design.md` (F-14 広告、本 ADR で「色変えない」確定)
  - `docs/adr/ADR-0011-remove-recommendations-keep-record-only.md` (記録のみ哲学)
  - `docs/adr/ADR-0013-f04-watering-visualization.md` §32 (F-04 ヒートマップ、本 ADR で 3 モード hex 確定)
  - `docs/adr/ADR-0014-f16-local-notification.md` §27 (F-16 太陽アイコン、本 ADR で全画面拡張)
- 影響 Issue: 後日 #<TBD>（F-15 メイン Issue）
- PR: #<TBD>
- Issue: #<TBD>
- External docs:
  - [Tamagui Themes 公式](https://tamagui.dev/docs/intro/themes)
  - [Tamagui useTheme](https://tamagui.dev/docs/core/use-theme)
  - [React Native useColorScheme](https://reactnative.dev/docs/usecolorscheme)
  - [React Native Appearance](https://reactnative.dev/docs/appearance)
  - [React Native DynamicColorIOS](https://reactnative.dev/docs/dynamiccolorios)
  - [Expo color-themes](https://docs.expo.dev/develop/user-interface/color-themes/)
  - [Expo expo-status-bar](https://docs.expo.dev/versions/latest/sdk/status-bar/)
  - [iOS UITraitCollection.userInterfaceStyle](https://developer.apple.com/documentation/uikit/uitraitcollection/3238086-userinterfacestyle)
  - [Apple HIG Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
  - [Apple Differentiate Without Color](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/differentiate-without-color-alone-evaluation-criteria/)
  - [Material Design 2 Dark Theme (#121212 baseline)](https://m2.material.io/design/color/dark-theme.html)
  - [Material Design 3 Color theming](https://github.com/material-components/material-components-android/blob/master/docs/theming/Color.md)
  - [WCAG 2.2 1.4.6 Contrast Enhanced AAA](https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced.html)
  - [WCAG 2.2 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
  - [ColorBrewer 2.0 公式 CSV (4-class Greens)](https://github.com/axismaps/colorbrewer/blob/master/cb.csv)
  - [YAMAP プレミアム地図カラー (高コントラスト = 屋外モード業界事例)](https://yamap.com/magazine/58328)
  - [Strava Dark Mode リリース](https://press.strava.com/articles/available-today-strava-releases-dark-mode)
  - [Garmin MIP transflective Display](https://wiki.garminrumors.com/MIP_Display)
  - [iPhone display brightness (sunlight readability)](https://support.apple.com/guide/iphone/adjust-screen-brightness-color-balance-iph60ba71065/ios)
  - [Nature: age-related color search (老眼者 chromaticity loss)](https://www.nature.com/articles/s41598-020-78303-4)
  - [PMC: Vision through Healthy Aging Eyes](https://pmc.ncbi.nlm.nih.gov/articles/PMC8544709/)

---

## Notes（メモ）

### 議論経緯（3 ラウンド）

1. ラウンド 1: 「念のため再検証」議論で、リサーチで既存 tamagui.config.ts と F-15 仕様の完全乖離 + 5 件の修正必要事項 (青系撤回 / Material 3 baseline / 黄色 secondary 削除 / ESLint / 太陽アイコン全画面) を発見、7 大方針確定
2. ラウンド 2: 9 件の詳細 (アニメ 200ms / スプラッシュ OS 追従 / ステータスバー / IM1-A null フォールバック / BR1 屋外 OFF 戻り / DA1 dark accent / UI1 セグメント+トグル / RD1 ヒートマップ即時 / PE1 永続化失敗無音) + 5 件 Yes/No (Home トグル NO / プリセット NO / F-08 追従 YES / 広告色変える Yes (後 No に修正) / チュートリアル中切替 NO) 確定
3. ラウンド 3: 8 件の細部 (Skia Atlas 再生成 / 写真自体は変更なし / BottomSheet 屋外対応 / アイコン theme 参照 / TT2 チュートリアル light 固定 (TT1 OS 追従撤回) / トークン命名 bonsai\_\* / カメラ・Paywall・エラー屋外追従 / Engram 保存 NO / F-11 引継ぎ YES / Maestro YES) + Y4 広告は色変えない (技術調査で AdMob 配信側不可と判明、撤回) 確定

### 4 ペルソナ評価マトリクス（最終構成）

| 要素                                | 高橋 62 歳        | Marcus 35 歳  | 盆栽園プロ      | ライト        | 総合       |
| ----------------------------------- | ----------------- | ------------- | --------------- | ------------- | ---------- |
| Light/Dark/Outdoor 4 mode           | ◎ シニア生活      | ◎ 夜暗        | ◎ 屋外作業      | ◎             | ◎          |
| OS 連動 (Auto)                      | ◎ 自動            | ◎             | ○               | ◎             | ◎          |
| 屋外モード 緑単色 (OC1)             | ◎ 識別可          | ◎             | ◎ 屋外作業      | ◎             | ◎          |
| Material 3 dark #121212 (BD1)       | ◎ 目疲労軽減      | ◎ 業界標準    | ○               | ◎             | ◎          |
| ColorBrewer 既存値継続 (H1)         | ○ 変更なし        | ○             | ◎ ADR-0013 整合 | ○             | ○          |
| 全画面ヘッダー太陽アイコン (OA1)    | ◎ どこでも切替    | ○             | ◎ 屋外作業      | ○             | ◎          |
| ESLint 直 hex 禁止 (EL1)            | (UX 影響なし)     | (UX 影響なし) | (UX 影響なし)   | (UX 影響なし) | ◎ 構造保護 |
| 200ms アニメ (A1)                   | ◎ 自然            | ◎             | ◎               | ◎             | ◎          |
| OS 追従スプラッシュ (SP1)           | ◎                 | ◎             | ◎               | ◎             | ◎          |
| 初回 Auto + null=light (IM1-A)      | ◎ 設定不要 + 安心 | ◎             | ○               | ◎             | ◎          |
| 屋外 OFF で前回戻り (BR1)           | ◎ 夜屋外作業 OK   | ◎             | ◎ 業務終了時    | ◎             | ◎          |
| dark accent #7BC97D (DA1)           | ◎ Material 3      | ◎             | ◎               | ◎             | ◎          |
| Settings UI セグメント+トグル (UI1) | ◎ 直感的          | ○             | ◎               | ○             | ◎          |
| ヒートマップ即時再描画 (RD1)        | ◎ 違和感なし      | ◎             | ◎               | ○             | ◎          |
| F-08 写真画面追従 (Y3)              | ◎ 一貫性          | ◎             | ◎               | ◎             | ◎          |
| 広告色変えない (Y4 確定)            | ○                 | ○             | ○               | ○             | ○          |
| TT2 チュートリアル常 light          | ◎ 一貫性          | ○             | ○               | ◎             | ◎          |
| BS1 BottomSheet 屋外                | ◎                 | ○             | ◎               | ○             | ◎          |
| IC1 アイコン theme                  | ◎ 一貫性          | ◎             | ◎               | ◎             | ◎          |

→ **全要素で全ペルソナ ○ 以上、✕ ゼロ**（R-10 クリア）。

### v1.x 拡張候補（本 ADR 対象外）

- テーマプリセット (春 / 秋 / 和風) ユーザー定義
- 屋外モード時 AdMob 広告非表示 (AD2 案)
- 環境光センサー連動の自動屋外モード (誤判定改善後に再評価)
- iOS Provisional Notification + テーマ連動
- カスタムフォント (現状は OS 標準のみ)
- アニメ時間のユーザー設定 (Settings → アクセシビリティ → アニメ速度)

### Repolog との差分

- Repolog (前作) は単一 dark テーマのみ、BonsaiLog F-15 は 4 mode で大幅拡張。
- Repolog 由来の `tamagui.config.ts` 構造 (createTokens / createTamagui / themes) は維持、内容のみ全面再設計。

### lessons.md 追記候補

- 「テーマシステムは ESLint 直 hex 禁止 + プレフィクス命名規約 (`bonsai_*`) で構造的に保護、メンテ時の不整合防止」
- 「シニア向け屋外モードは緑単色 monochromatic + 純白純黒で青-紫弁別困難回避、業界標準 (Garmin / YAMAP) と一致」
- 「Material 3 baseline #121212 はダークモード eye strain 軽減 + shadow 視認の業界標準、純黒 #000000 や独自値 #0A0E1A は出典不明な選択」
- 「テーマ切替時の Skia Atlas 再生成は worklet 内 sprite 配列更新で 1 フレーム以内反映可能、メモリ最小」
- 「広告 (AdMob) は配信側で色制御不可、屋外モード対応は周囲枠のみ可能だが UX 違和感残る → v1.x で広告非表示再評価」

### 実装履歴

- **2026-05-02 / 05-03 セッション (前)**: Phase A〜E (theme tokens / resolveEffectiveScheme 純関数 / `_layout` 配線) で foundation を構築
- **2026-05-03 セッション (本)**: Phase F〜J + Phase K (10 PR) でホーム / Settings / 盆栽一覧 / Search / Tags / Export 全画面に OutdoorToggleButton を配置 + 旧 theme トークン残存 CI チェック追加
  - PR #134 Phase F: ホーム画面に屋外モード太陽アイコン
  - PR #135 Phase G: OutdoorToggleButton 共通コンポーネント抽出 (refactor)
  - PR #136 Phase H: Settings 画面に OutdoorToggleButton 配置
  - PR #137 Phase I: 盆栽一覧画面に OutdoorToggleButton 配置
  - PR #138 Phase J: Search/Tags/Export 画面に OutdoorToggleButton 配置
  - PR #145 Phase K: 旧 theme トークン残存 CI チェック (`scripts/theme-legacy-check.mjs`、`pnpm verify:theme`)
- **残作業**: ESLint plugin `eslint-plugin-bonsai/no-direct-hex-in-jsx` 自作、tamagui.config の 11 トークン構造的検証スクリプト等は v1.x で評価

---

## Notes Amended (2026-05-10): 屋外モード削除 (4 mode → 3 mode)

### 改訂内容

- ユーザー判断 (2026-05-10) により **屋外モード (outdoor) を v1.0 で不採用**、本 ADR の 4 mode 構成を 3 mode (Auto / Light / Dark) に縮小
- 理由: 屋外モードのユースケース実証が不十分 + UI 実装コスト (全画面ヘッダー太陽アイコン + Settings トグル + token 整合 + Skia 再描画) が利益を上回る判断
- §Decision §55-72 の「モード構成（4 状態）」「Tamagui themes 設計」「配色」を 3 mode に縮小、outdoor 関連の token / 切替動作 / 物理アクセス (太陽アイコン) を削除
- §192-201 「連動機能の屋外モード追従」(F-04 / F-08 / F-13 等) は不要、各機能は Light/Dark のみ追従

### 削除対象 (実装側)

- `src/core/theme/colors.ts` `OUTDOOR_TOKENS` 定義 (E3 PR で削除予定)
- `constants/theme.ts` `OUTDOOR_TOKENS` import + `Colors.outdoor` (E3 PR)
- `src/core/theme/themeResolver.ts` の outdoor 分岐 (E3 PR)
- `scripts/a11y-contrast-check.mjs` の outdoor pair (E3 PR)
- `useSettingsStore` の `outdoorMode` state + `setOutdoorMode` action (E4 PR)
- `OutdoorToggle` / `OutdoorToggleButton` コンポーネント全削除 (E4 PR)
- 全画面ヘッダーの SunIcon (太陽アイコン) 削除 (E4 PR)
- `Settings` 画面の Outdoor toggle row 削除 (E4 PR)
- i18n key 削除: `settingsOutdoorMode` / `settingsOutdoorModeDesc` 等 (E4 PR、19 言語一括)

### F-15 v1.0 仕様 (改訂後)

| トークン   | light                                | dark (M3)        |
| ---------- | ------------------------------------ | ---------------- |
| background | #FFFFFF (washi #F7F3E8 = BG_PRIMARY) | #121212          |
| color      | #1A1A1A (16:1)                       | #E1E1E1 (14.5:1) |
| accent     | BRAND_GREEN #1F3A2E (11:1)           | #6B9B7F (6.07:1) |
| heatmap L3 | #238B45                              | #7BC97D          |

3 mode (Auto / Light / Dark) のみ、Settings UI はセグメンテッドコントロール「[システム] [ライト] [ダーク]」のみ (Outdoor toggle 削除)。

### 関連 (本 Amended)

- ユーザー判断: 2026-05-10 セッション (Tier 3 Issue #32 着手時に方針変更)
- 実装フェーズ: E1 (本 PR、ADR Amended) → E2 (Issue #32 改訂) → E3 (theme tokens / a11y) → E4 (UI / i18n)
- 影響: F-04 (ヒートマップ) / F-13 (Paywall) / F-16 (通知) は Light/Dark のみ対応、本 Amended で簡素化

---

## Notes Amended (2026-05-30): Tamagui 撤回 → useColors + plain hex 採用 (Phase 7 K5)

### 改訂内容

本 ADR は当初「Tamagui themes (`tamagui.config.ts`) で F-15 theme system を実装」としていたが、その後の実装は **plain hex token + `useColors` hook** に作り替えられ、Tamagui は `tamagui.config.ts` / `tamagui.d.ts` / babel plugin のみ残った状態で `src`/`app` から **import 0 件の死蔵**となっていた。Phase 7 (死コード一掃) の判断 (user 確定 2026-05-30) で **Tamagui 一式を撤去**する。

### 実態と整合する theme system

- 正: `src/core/theme/colors.ts` + `src/core/theme/useColors.ts` + `constants/theme.ts` (Colors)、design system は `docs/reference/design_system.md` で集約。
- ADR-0042 (theme tokens SoT) が現実の theme 基盤を定義済。
- 「直 hex 禁止」は ESLint `no-restricted-syntax` の hardcode 検出 + `docs/reference/design_system.md` の token 経由強制で代替。

### 削除対象 (Phase 7 PR 7-4)

- `package.json` deps: `tamagui` / `@tamagui/animations-react-native` / `@tamagui/core` / `@tamagui/lucide-icons` / `@tamagui/portal`、devDep: `@tamagui/babel-plugin`
- `tamagui.config.ts` / `tamagui.d.ts`
- `babel.config.js` の `@tamagui/babel-plugin` ブロック
- `package.json` jest `transformIgnorePatterns` の `tamagui|@tamagui/.*`
- `knip.json` ignoreDependencies の `tamagui` / `@tamagui/babel-plugin`

### 将来の再導入

Tamagui を将来 UI 基盤として再評価したい場合は、本 ADR を超える新 ADR 起票 (Tamagui-based 全画面再構築の設計 + 移行計画) を前提とする。`pnpm add tamagui ...` で再導入可。
