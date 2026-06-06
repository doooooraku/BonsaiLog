# BonsaiLog - Design System Definition (DESIGN.md)

> このドキュメントは Claude Design / Claude Code 双方が参照する
> デザインシステムの「正（Source of Truth）」です。
> 色・書体・余白の具体的な値をここで固定します。

## 1. ブランド原則（戦略書§5より）

- P1. 鉢の前で、ひと手入れ: 屋外・片手・手袋、48dp+タップ領域
- P2. 診断しない、記録する: 「目安」「参考」「テンプレート」のみ
- P3. 永く、変わらない: 流行色・過度アニメ禁止、深緑・樹皮・和紙
- P4. 控えめで美しく: 可愛さ5%、余白の美、情報密度低め
- P5. 屋外で読める: WCAG AA 必須、AAA 目標、ダークモード+屋外モード

## 2. カラートークン

### 2-1. ライトモード（デフォルト）

| Token                     | HEX       | 用途                                                               |
| ------------------------- | --------- | ------------------------------------------------------------------ |
| `--bg-primary`            | `#F7F3E8` | 背景（washi 和紙色）                                               |
| `--bg-surface`            | `#FFFFFF` | カード背景                                                         |
| `--text-primary`          | `#1A1A1A` | 本文（sumi 墨色）                                                  |
| `--text-secondary`        | `#5A5248` | 補助テキスト                                                       |
| `--text-muted`            | `#767066` | 3次テキスト (ADR-0020 Phase 10 で AA 4.5:1 適合に補正、旧 #8A8274) |
| `--primary`               | `#1F3A2E` | プライマリ（深緑 fukamidori）                                      |
| `--primary-hover`         | `#2A4C3D` | 押下時                                                             |
| `--accent-bark`           | `#5A4637` | 樹皮色（タグ・区切り）                                             |
| `--accent-gold`           | `#C69E48` | 秋葉色（Pro バッジのみ）                                           |
| `--danger`                | `#8B2E2E` | 危険                                                               |
| `--success`               | `#3E5C39` | 成功                                                               |
| `--border`                | `#D9D1BF` | 境界線                                                             |
| `--border-strong`         | `#8A8274` | 強調境界線                                                         |
| `--badge-soft-bg`         | `#E8F0EA` | バッジ背景 (薄緑、 ADR-0037 Sess28、 §20 SoT)                      |
| `--badge-soft-text`       | `#1F3A2E` | バッジ文字色 (= primary、 token 統一参照)                          |
| `--button-secondary-bg`   | `#E8F0EA` | Secondary CTA button 背景 (ADR-0038 Sess29、 §22 SoT)              |
| `--button-secondary-text` | `#1F3A2E` | Secondary CTA button 文字色 (= primary、 token 統一参照)           |

### 2-2. ダークモード — 宵墨 (yoizumi) warm sumi (Sess66 PR4、 ADR-0015 Amendment)

ブランド「washi 和紙 → sumi 墨 → fukamidori 深緑」 を dark mode まで延長 (P3 永く変わらない整合)。 旧 navy 寒色系 (#0A0E1A 等) から **暖墨** 系に pivot (Sess66 PR4、 Claude Design `tokens.css` `[data-theme="dark"]` 提案値整合)。

| Token                   | HEX       | 用途                                                                   |
| ----------------------- | --------- | ---------------------------------------------------------------------- |
| `--bg-primary`          | `#16140F` | 背景 (宵墨 yoizumi、 暖かい墨)                                         |
| `--bg-surface`          | `#211E18` | カード背景 (重ねの紙)                                                  |
| `--text-primary`        | `#ECE6D6` | 本文 (淡 washi)                                                        |
| `--text-secondary`      | `#B3AA97` | 補助                                                                   |
| `--text-muted`          | `#837A68` | 3 次 (※ BG_SURFACE 上で AA 3.92:1、 UI 要素 3:1 OK、 本文用途は別配色) |
| `--primary`             | `#7FA98A` | プライマリ (苔緑、 夜目に映える深緑) — inline `c.tint` 経由            |
| `--primary-hover`       | `#93BD9E` | 押下                                                                   |
| `--tint-subtle`         | `#2A3328` | 選択中 row 背景 / Comparison 表 (Sess69 PR-A、 inline `c.tintSubtle`)  |
| `--badge-bg`            | `#2C3329` | ×n / N 日連続バッジ背景 (Sess69 PR-A、 inline `c.badgeBg`)             |
| `--button-secondary-bg` | `#2C3329` | Secondary CTA 背景 (Sess69 PR-A、 inline `c.buttonSecondaryBg`)        |
| `--on-tint`             | `#1A1A1A` | tint bg 上の sumi 文字 (苔緑上 9.5:1 AAA、 Sess69 PR-A `c.onTint`)     |
| `--disabled-bg`         | `#3A3631` | disabled 背景 (Sess69 PR-A、 inline `c.disabledBg`)                    |
| `--placeholder-bg`      | `#3A3631` | 画像 fallback (Sess69 PR-A、 inline `c.placeholderBg`)                 |
| `--accent-bark`         | `#A1886F` | 樹皮色 (warm) — inline `c.accentBark` (Sess69 PR-A 経由化)             |
| `--accent-gold`         | `#D4B062` | 秋葉 (Pro バッジ、 両 theme 同色維持)                                  |
| `--danger`              | `#CE7A72` | 危険 — inline `c.dangerColor` (Sess69 PR-A 経由化)                     |
| `--success`             | `#88B083` | 成功                                                                   |
| `--border`              | `#2C2820` | 境界線 (茶味の枠線)                                                    |
| `--border-strong`       | `#4A4534` | 強調境界線                                                             |

WCAG AA 検証 (`pnpm a11y:contrast` 22 pair、 Sess69 PR-A で 14 → 22 pair 拡張):

| pair                                   | 比      | 等級                           |
| -------------------------------------- | ------- | ------------------------------ |
| text (#ECE6D6) × bg (#16140F)          | 14.77:1 | AAA                            |
| text (#ECE6D6) × surface (#211E18)     | 13.34:1 | AAA                            |
| textSecondary (#B3AA97) × bg (#16140F) | 7.99:1  | AAA                            |
| textSecondary (#B3AA97) × surface      | 7.21:1  | AAA                            |
| textMuted (#837A68) × surface          | 3.92:1  | ⚠ AA 4.5 不達 (UI 要素 3:1 OK) |
| tint (#7FA98A 苔緑) × bg (#16140F)     | 6.96:1  | AA (大字 AAA)                  |
| onTint (#1A1A1A sumi) × tint (#7FA98A) | 6.58:1  | AA (大字 AAA)                  |
| danger (#CE7A72) × bg (#16140F)        | 5.83:1  | AA                             |
| tint (#7FA98A) × tintSubtle (#2A3328)  | 4.96:1  | AA                             |
| tint (#7FA98A) × badgeBg (#2C3329)     | 4.93:1  | AA                             |
| tint (#7FA98A) × buttonSecondaryBg     | 4.93:1  | AA                             |

### 2-3. 屋外モード（直射日光下、WCAG AAA 7:1目標）

| Token            | HEX       | 用途       |
| ---------------- | --------- | ---------- |
| `--bg-primary`   | `#FFFFFF` | 背景       |
| `--text-primary` | `#000000` | 本文       |
| `--primary`      | `#000080` | プライマリ |
| `--border`       | `#000000` | 境界線     |

> 注: 屋外モードは ADR-0015 Notes Amended 2026-05-10 で **撤去済**。 上表は歴史的参考。 PR4 配色 pivot で本節は更新予定。

### 2-4. Dark Theme Cascade 規約 (ADR-0052 / Sess66 PR3)

dark mode 視認性破綻が PR1 / PR2 / PR3 と 3 回連続再発した root cause = StyleSheet 内に
theme-dependent color token (`BG_PRIMARY` 等 light only static) を書く慣行。
ADR-0052 で **「StyleSheet 内 static 色禁止、 inline `c.*` 必須」** を SoT 化、 ESLint custom
rule `local/no-color-token-in-stylesheet` で CI gate、 `pnpm a11y:contrast` で WCAG AA 検証。

#### 必須パターン

```tsx
// ✅ 正しい — useColors() hook + inline c.* で theme cascade
import { useColors } from '@/src/core/theme/useColors';

function MyCard() {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={[styles.title, { color: c.text }]}>...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // layout / radius / typography のみ。 色は inline へ。
  card: { padding: 16, borderRadius: 12, borderWidth: 1 },
  title: { fontSize: 16, fontWeight: '600' },
});
```

#### 禁止パターン (ESLint で error)

```tsx
// ❌ 違反 — StyleSheet 内 theme-dependent token
import { BG_PRIMARY, TEXT_PRIMARY, BORDER_DEFAULT } from '@/src/core/theme/colors';

const styles = StyleSheet.create({
  card: {
    backgroundColor: BG_SURFACE, // ❌ dark mode 追従しない
    borderColor: BORDER_DEFAULT, // ❌
  },
  title: { color: TEXT_PRIMARY }, // ❌
});
```

#### Forbidden tokens (StyleSheet 内利用禁止)

| Token                                                             | 用途 (Light) | 用途 (Dark)           |
| ----------------------------------------------------------------- | ------------ | --------------------- |
| `BG_PRIMARY` / `BG_SURFACE`                                       | washi / 白   | 暗背景 / dark surface |
| `TEXT_PRIMARY` / `TEXT_SECONDARY` / `TEXT_MUTED` / `TEXT_DEFAULT` | sumi 墨色    | 淡 cream              |
| `BORDER_DEFAULT` / `BORDER_STRONG`                                | cream 細枠   | 暗枠                  |

→ すべて `c.background` / `c.surface` / `c.text` / `c.textSecondary` / `c.textMuted` / `c.border` (inline) で参照。

#### Allowed tokens (theme-invariant、 StyleSheet 内 OK) — Sess69 PR-A 改訂

| Token                              | 値           | 用途                                                            |
| ---------------------------------- | ------------ | --------------------------------------------------------------- |
| `ON_BRAND`                         | `#FFFFFF`    | light tint bg 上の白文字 (dark は `c.onTint` 経由)              |
| `ACCENT_GOLD`                      | `#C69E48`    | Pro バッジ専用、 両 theme で同色 (秋葉色)                       |
| `DANGER` / `SUCCESS` / `OVERLIMIT` | 赤 / 緑 / 赤 | status 色 — ※ 但し `DANGER` の dark 追従は `c.dangerColor` 推奨 |
| `HEATMAP_COLORS`                   | 4 段階緑     | F-04 ヒートマップ専用 (ADR-0013)                                |

#### 撤回された Allowed tokens (Sess69 PR-A、 brand scheme-aware 化)

下記 8 種は Sess69 PR-A で **撤回**、 inline `c.*` 経由必須。 PR-D で ESLint `FORBIDDEN_TOKENS` 拡張で構造禁止化。

| 旧 Allowed (撤回)           | 置換先 (scheme-aware)    | 撤回理由                                                            |
| --------------------------- | ------------------------ | ------------------------------------------------------------------- |
| ~~`BRAND_GREEN`~~           | `c.tint`                 | dark `#16140F` 上で `#1F3A2E` 深緑 contrast 1.5:1 ≪ AA 3.0:1 で破綻 |
| ~~`BRAND_GREEN_HOVER`~~     | `c.tintHover` (将来追加) | 同上                                                                |
| ~~`BRAND_GREEN_BG`~~        | `c.tintSubtle`           | dark で薄緑 `#F1F8F2` が白カードのように浮く                        |
| ~~`BADGE_SOFT_BG`~~         | `c.badgeBg`              | 同上                                                                |
| ~~`BADGE_SOFT_TEXT`~~       | `c.tint`                 | -- (BRAND_GREEN 等価)                                               |
| ~~`BUTTON_SECONDARY_BG`~~   | `c.buttonSecondaryBg`    | dark で薄緑 `#E8F0EA` が白 button のように浮く                      |
| ~~`BUTTON_SECONDARY_TEXT`~~ | `c.tint`                 | --                                                                  |
| ~~`DISABLED_BG`~~           | `c.disabledBg`           | dark で `#9E9E9E` 灰色が意図不明に浮く                              |
| ~~`ACCENT_BARK`~~           | `c.accentBark`           | dark で `#5A4637` 樹皮色が沈む (dark `#A1886F` warm 樹皮へ)         |

#### 検出仕組み

1. **ESLint custom rule** `local/no-color-token-in-stylesheet` (`eslint-rules/no-color-token-in-stylesheet.js`)
   - **Sess66 PR3 (#940)**: `'warn'` level 導入 (段階導入、 既存 ~245 違反は許容)
   - **Sess66 PR4-6 + Sess68 PR #A/B/C (#950-#952)**: 累計 245 → 0 違反完走
   - **Sess68 PR #D**: `'error'` level 昇格、 構造禁止恒久化 (新規違反は CI で merge block)
   - **Sess69 PR-D (予定)**: FORBIDDEN_TOKENS に brand-static 8 種追加 (上記撤回リスト)
2. **新 ESLint rule (Sess69 PR-D 予定)** `local/no-color-hex-literal-in-stylesheet`
   - hex 直書き (`'#XXX'` / `'#XXXXXX'`) を StyleSheet 内禁止
   - 例外: `'transparent'` / `'rgba(...)'` 半透明 + 写真 overlay / PDF / SVG export 上の固定背景色は `// eslint-disable-next-line ... // reason: <一文>` marker 必須
3. **a11y contrast CI** `pnpm a11y:contrast` (`scripts/a11y-contrast-check.mjs`) で代表 22 pair × WCAG AA 4.5:1 / UI 3.0:1 を機械検証
   - **Sess66 PR3**: 14 pair で導入
   - **Sess69 PR-A**: 22 pair に拡張 (brand pair 8 種追加: tint / tintSubtle / badgeBg / buttonSecondaryBg × light/dark)
4. **R-58** (`.claude/recurrence-prevention/specialized.md`): 画面追加 / 色変更 PR では `pnpm verify:a11y` + dark SS verify 必須
5. **R-59 + R-60 (Sess69 PR-D 起票予定)**: brand tokens scheme-aware 必須 / 新画面 PR は dark SS 添付必須

## 3. タイポグラフィ

### 3-1. フォントスタック

- Display（見出し）Japanese: `'Noto Serif JP', 'Hiragino Mincho ProN', serif` (weight 500)
- Display Latin: `'Source Serif 4', Georgia, serif` (weight 500)
- Body Japanese: `'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif` (weight 400)
- Body Latin: `'Inter', -apple-system, sans-serif` (weight 400)
- Monospace: `'IBM Plex Mono', 'SF Mono', monospace`

### 3-2. 使わないフォント（絶対禁止）

❌ Fraunces / Playfair Display / Georgia / Roboto / Arial /
DM Sans / Space Grotesk / system-ui（iOS/Androidデフォルト）

### 3-3. サイズスケール

| Name      | Size | LineHeight | 用途                       |
| --------- | ---- | ---------- | -------------------------- |
| displayXL | 48pt | 58pt (1.2) | 盆栽名のトップ表示         |
| displayL  | 32pt | 38pt (1.2) | 画面タイトル               |
| displayM  | 24pt | 29pt (1.2) | セクション見出し           |
| headingL  | 20pt | 30pt (1.5) | サブ見出し                 |
| headingM  | 18pt | 27pt (1.5) | 小見出し                   |
| bodyL     | 16pt | 26pt (1.6) | 本文デフォルト             |
| bodyM     | 14pt | 22pt (1.6) | セカンダリ本文             |
| caption   | 13pt | 19pt (1.5) | キャプション               |
| micro     | 11pt | 16pt (1.5) | 広告ラベル等、これ以下禁止 |

## 4. 余白スケール（spacing）

基準: 8px baseline。4・8・12・16・24・32・48 のみ使用。他の値禁止。

## 5. 角丸（Border Radius）

- 0: 写真枠のみ（額縁感）
- 8: 小ボタン・タグ
- 12: 中ボタン・入力欄
- 16: カード

**❌ 9999 (pill) 禁止**（モダンすぎて戦略P3と衝突）

## 6. シャドウ・Elevation

**原則: 影は使わない**。分離は `--border` で表現。例外:

- モーダル / シート: 極薄の上向きシャドウ（0 -2 8 rgba(0,0,0,0.04)）のみ

## 7. アクセシビリティ必須条件

| 項目                     | 値                               |
| ------------------------ | -------------------------------- |
| タップ領域 最小          | 48×48 dp                         |
| プライマリCTA タップ領域 | 56 dp                            |
| 本文 最小フォント        | 16pt                             |
| シニア向けキー画面       | 18pt                             |
| コントラスト比（本文）   | WCAG AA 4.5:1 必須、AAA 7:1 目標 |
| コントラスト比（UI要素） | 3:1                              |
| 色のみで情報伝達         | 禁止（アイコン・テキスト併用）   |
| reduced motion 対応      | 必須（400ms → 0ms）              |

## 8. モーション・アニメーション

- 画面プッシュ: 250ms ease-out
- モーダル fade-in: 200ms
- スナックバー slide-up: 300ms
- タップフィードバック: opacity 0.7, 100ms

❌ spring/bounce 禁止
❌ 500ms超のアニメ禁止
❌ ページロード時のstagger reveal禁止

## 9. DNT（Do Not Translate）リスト

以下は全言語で日本語音訳のまま。翻訳厳禁:

**盆栽用語**:
bonsai, niwaki, karikomi, nebari, jin, shari, kokedama,
yamadori, mame, shohin, akadama, kusamono, sabamiki, bunjin, ishizuki

**樹形スタイル**:
Chokkan, Moyogi, Shakan, Kengai, Han-Kengai,
Bunjin-gi, Sokan, Kabudachi, Yose-ue

**学名**:
Pinus thunbergii, Juniperus chinensis, Ficus retusa 等、
すべてラテン語のまま全言語共通。

## 10. UI 用語の許可・禁止リスト

### 許可語（使ってよい）

記録 / 履歴 / 整理 / 参考 / 目安 / テンプレート / 台帳
log / journal / record

### 禁止語（UIに出さない、ストア禁止カテゴリ抵触）

診断 / 判定 / 推奨 / べき / 危険 / 病気 / 治療
reminder（medical context） / tracker（health context） / alert（medical）

## 11. 対象デバイス

- **iOS 基準**: iPhone 15 Pro (393×852 pt)
  - SafeArea top: 59pt (Dynamic Island)
  - SafeArea bottom: 34pt (Home Indicator)
- **Android 確認**: Pixel 7 (412×915)
  - Status bar: 24pt
  - Navigation bar: 48pt or gesture
- **最小幅**: iPhone SE 第1世代 320pt（レイアウト崩れなし必須）
- **最大幅**: iPhone Pro Max 430pt

## 12. Form Atom Components (Sess14 PR-O 確立)

`src/components/form/` 配下に form 入力用の atom component を整備。 BonsaiBasicForm
など複数 form 画面で再利用し、 文字数表示 / 上限赤字 / 必須・任意 badge / 単位 suffix
等の UX を一貫させる。

### 12-1. `LabeledTextInput`

- **用途**: 一般文字列入力 (名前 / 入手元 / メモ / 鉢材質)
- **特徴**: 右上 N/MAX 表示、 上限到達 inline 赤字、 multiline 対応
- **必須 props**: label / value / onChangeText
- **任意 props**: required / optional / maxLength / showCounter / multiline / overlimitText / placeholder / testID

### 12-2. `LabeledNumberInput`

- **用途**: 数値入力 (樹齢 / 鉢幅 / 鉢深さ)
- **特徴**: keyboardType="numeric" + 数字以外 silent reject (正規表現で除去)、 単位 suffix 右側表示
- **必須 props**: label / value (string) / onChangeText
- **任意 props**: suffix (例: 'cm' / '年') / maxLength / placeholder / editable / required / optional / testID
- **注意**: parseFloat の責務は呼び出し側 (本 atom は文字列のまま渡す)、 NaN/負数防御は呼び出し側 (例: `unitToCm` で実施)

### 12-3. `LabeledPickerRow`

- **用途**: picker 画面遷移 row (樹種 / 樹形)
- **特徴**: 選択中 → row 右に × clear button (排他、 ChevronRight 非表示)、 未選択 → ChevronRight
- **必須 props**: label / onPress
- **任意 props**: valueText (null = 未選択) / placeholder / onClear (未指定なら × 非表示) / optional / testID / testIDClear

### 12-4. `LabeledDateRow`

- **用途**: DatePicker row (取得日 / 購入日)
- **特徴**: Native DatePickerDialog (Android) / UIDatePicker (iOS) modal、 row 右 × clear button、 maxToday=true で未来日選択禁止
- **必須 props**: label / value ('YYYY-MM-DD') / onChangeText
- **任意 props**: placeholder / maxToday / optional / required / testID / testIDClear

### 12-5. 使用ルール

1. ❌ `BonsaiBasicForm.tsx` 内で inline `<TextInput>` 直書き **禁止** (将来 ESLint custom rule で強制化検討)
2. ✅ form atom が無い場合は **新規 atom を抽出** してから利用 (例: `LabeledSwitchRow` 等)
3. ✅ atom の i18n key は呼び出し側が `t()` で解決して渡す (atom 内で `t()` 呼ばない、 純粋表示 component に保つ)
4. ✅ accessibilityLabel は label と同じが default、 異なる場合は明示指定
5. ✅ testID は呼び出し側で必ず指定 (Maestro flow 整合)

### 12-6. Form atom typography contract (ADR-0029 D1)

Form 系で使用する typography は `src/core/theme/typography.ts` の constants 経由で統一。 atom 内 hardcoded `fontSize` / `fontWeight` 直書き禁止。

| 用途        | constant          | fontSize | fontWeight | color                    | 備考                                       |
| ----------- | ----------------- | -------- | ---------- | ------------------------ | ------------------------------------------ |
| label       | `formLabel`       | 14       | '600'      | TEXT_PRIMARY             | atom の左上、 type="defaultSemiBold" 相当  |
| 任意 badge  | `formOptional`    | 10       | normal     | TEXT_MUTED               | letterSpacing: 0.8                         |
| 必須 badge  | `formRequired`    | 10       | normal     | BG_PRIMARY (背景 DANGER) | atom 内に `requiredBadge` で表示           |
| placeholder | `formPlaceholder` | (継承)   | (継承)     | TEXT_SECONDARY           | RN default 信頼しない (Sess16 PR-P 教訓)   |
| suffix      | `formSuffix`      | 14       | normal     | TEXT_MUTED               | input 右内側に灰色で表示                   |
| counter     | `formCounter`     | 12       | normal     | TEXT_MUTED               | 上限到達時 OVERLIMIT 色 + fontWeight '600' |
| input       | `formInput`       | 16       | normal     | TEXT_PRIMARY             | TextInput 本体                             |

**自動検出**: `scripts/check-form-typography.mjs` (grep-based、 warning 出力) — `src/components/form/**` と `src/features/**/[Ww]ork*Screen.tsx` で hardcoded `fontSize:` / `fontWeight:` を検出。 Sess17 では warning のみ、 ESLint AST rule 化は Sess18 以降。

---

## 13. Placeholder text 規約 (ADR-0029 D2、 Material Design 3 整合)

### 13-1. OK / NG パターン

**OK** (形式の見本):

- `例: 18` (数値の単位例)
- `例: 赤玉土:桐生砂 = 7:3` (構造例)
- `2026-05-20` (日付形式)
- `年 / 月 / 日` (日付形式の placeholder)

**NG** (label 再掲・命令形・汎用文言):

- `自由メモ (例: 朝8時、たっぷり)` → label「メモ」 を再掲 → **修正後**: `例: 朝8時、たっぷり`
- `選択してください` (命令形 + 抽象的) → **修正後**: 具体的な位置例 `南窓辺` 等
- `キャプション (任意・100文字まで)` → label 再掲 → **修正後**: 具体的キャプション例
- `○○を入力` / `○○を選んでください` (汎用命令形)

### 13-2. 根拠

Material Design 3「Text fields」 ガイドライン: 「Placeholder text should not repeat the label」 (label との情報重複は冗長、 ユーザー認知負荷を増やす)。 シニアペルソナ (高橋 62 歳) は老眼で文字密度が増えると読みにくい、 ライトユーザーは「形式の見本」 だけで何を入れればよいか理解可能。

### 13-3. 自動検出

`scripts/i18n-placeholder-audit.mjs` (新規) — i18n locales 全 19 言語を walk:

- AP-1: 同 file 内に同名 label key が存在し、 placeholder text に label 単語が含まれる場合 → 警告
- AP-2: placeholder text が `を入力` / `を選んで` / `してください` 等命令形を含む場合 → 警告

CI 統合: `pnpm i18n:check` の延長で実行、 NG keys 0 を CI 緑条件に追加。

### 13-4. 修正対象 (Sess17 Phase 3a で実施)

| key                              | 修正前                             | 修正後 (案)           |
| -------------------------------- | ---------------------------------- | --------------------- |
| `workLogNotePlaceholder`         | `自由メモ (例: 朝8時、たっぷり)`   | `例: 朝8時、たっぷり` |
| `workLogPositionToPlaceholder`   | `選択してください`                 | `例: 南窓辺`          |
| `workLogPhotoCaptionPlaceholder` | `キャプション (任意・100文字まで)` | `例: 春の新芽展開`    |

---

## 14. 数値 + 単位 field の規約 (ADR-0029 D3)

### 14-1. 統一 atom

`src/components/form/LabeledNumberInputUnit.tsx` を使用。 内部で `LabeledNumberInput` + 単位 segmented control + util (`unitToCanonical` / `canonicalToUnit`) を組み合わせ。

**props**:

```ts
type LabeledNumberInputUnitProps<U extends string> = {
  label: string;
  value: string; // user 入力単位の文字列
  unit: U; // 現在表示中の単位
  units: readonly U[]; // 切替可能な単位リスト (例: ['cm', 'mm', 'inch'])
  onChangeValue: (v: string) => void;
  onChangeUnit: (u: U) => void;
  defaultUnit: U; // 初期 unit (settings 値を渡す)
  settingsStorePath?: string; // 省略時は一時切替、 明示時は永続化
  suffix?: string; // unit 以外の固定 suffix (例: '年' for 樹齢)
  optional?: boolean;
  required?: boolean;
  testID?: string;
};
```

### 14-2. 動作モード

- **一時切替モード** (`settingsStorePath` 省略): segmented control で unit を切替えても `settingsStore` には保存しない (この form 内のみ)。 BonsaiBasicForm の鉢サイズ (Sess15 PR-BB) 採用。
- **永続化モード** (`settingsStorePath` 明示): segmented control で切替えると `settingsStore[path]` に保存。 user 設定として恒久反映。

### 14-3. canonical 単位の選択

DB 保存は **canonical 単位** (cm 系なら cm、 mm 系なら mm) で統一。 `src/core/util/unitConvert.ts` (potUnitConvert.ts を generic 化) で domain 別の conversion を提供。

### 14-4. 流用範囲

- BonsaiBasicForm 鉢情報 (Sess18 で移行)
- WorkLog repotting 鉢サイズ (Sess17 Phase 4 PR-F2 で移行)
- WorkLog wiring 番手 (Sess17 Phase 4 PR-F2 で hybrid input と組み合わせ)
- 将来の数値+単位 field

---

## 15. Hybrid input pattern (ADR-0029 D4)

### 15-1. 用途

pre-defined 選択肢 + その他 free input が必要な field。 シニアペルソナは pre-defined のみで完結、 業務プロは「その他」 で自由入力、 4 ペルソナすべて満足する pattern。

### 15-2. 統一 atom

`src/components/form/LabeledNumberSegmentOrFree.tsx`:

**props**:

```ts
type LabeledNumberSegmentOrFreeProps = {
  label: string;
  segments: readonly { value: string; label: string }[];
  value: string; // 「その他」 選択時は segments 外の string
  onChangeValue: (v: string) => void;
  freeLabel: string; // 「その他」 segment の label (例: 'その他')
  freeUnit?: string; // free input の単位 suffix (例: 'mm')
  freeMin?: number;
  freeMax?: number;
  optional?: boolean;
  required?: boolean;
  testID?: string;
};
```

### 15-3. 動作

- segments 内の値が選択中: segmented control の 1 つが highlighted
- 「その他」 選択中: 末尾 segment が highlighted、 直下に `LabeledNumberInput` (`freeUnit` あれば `LabeledNumberInputUnit`) が出現

### 15-4. 判断基準 (segment-only vs hybrid)

- user の選択肢が **enum で固定** (例: 剪定タイプ 枝/葉/新芽/根): segment-only で OK
- 数値で **連続値 / 異常値の可能性**: hybrid 必須 (例: 番手 1mm-3mm + プロが 3.5mm 要求)

### 15-5. 流用範囲

- WorkLog wiring 番手 (Sess17 Phase 4 PR-F2)
- 将来の数値選択 field (例: 樹齢 segment + その他)

---

## 16. Single / Bulk 動線整合 (ADR-0029 D5)

### 16-1. 原則

同じ EventType の入力 UI は **Single (WorkLogConfirm) と Bulk (BulkLogConfirm) で 1:1 一致**。 差分は「対象盆栽数」 表示のみ (例: 「全 N 本に同じ内容で記録」)。

### 16-2. 共通 component

`src/features/event/WorkLogTypeFormFields.tsx` (Sess17 Phase 5 で新設) — 14 種別 form の入力 fields のみを担当する **controlled component**。 props で state を受け取り (state hoisting)、 ref / forwardRef は使用禁止。

**props**:

```ts
type WorkLogTypeFormFieldsProps = {
  type: EventType;
  payload: WorkLogPayloadState; // 14 種別の union state
  onChange: (next: WorkLogPayloadState) => void;
};
```

### 16-3. caller (Single と Bulk) の責務

- WorkLogConfirmScreen (Single): payload state を local hoisting、 「記録する」 で `setWorkLogConfirmResult({ type, note, payload, occurredAtDate, photos })` → caller (bonsai-detail) が `createEvent` 呼出し
- BulkLogConfirmScreen (Bulk): payload state を local hoisting、 「記録する」 で `bulkLogEvents({ bonsaiIds, type, note, occurredAtUtc, payload })` → 全選択盆栽に同 payload 適用

### 16-4. bulkLogEvents の signature 拡張

`src/db/eventRepository.ts`:

```ts
type BulkLogInput = {
  bonsaiIds: readonly string[];
  type: EventType;
  note: string | null;
  occurredAtUtc?: string;
  payload?: Record<string, unknown>; // ★Sess17 Phase 6 PR-H1 で追加
};
```

schema 変更不要 (events.payload は JSON、 CHECK 制約なし)。 既存 caller は payload 省略で backward-compat。

---

## 17. Navigation patterns (ADR-0030 D1)

### 17-1. 原則 P1 — Up navigation

user 体感の戻る挙動は **1 画面 = 1 step** (Material Design Up navigation + iOS HIG Back navigation 整合)。 ← back button / 画面端 swipe gesture の両方が同じ挙動。

### 17-2. 原則 P2 — store-callback 使用条件限定

store-callback pattern (`router.back() + setX + caller の useFocusEffect で consume`) は以下のいずれかの場合のみ許容:

- **Case A (許容)**: picker → 結果が即時 dialog (DatePicker / Alert.alert 等) を呼び出す場合 (例: WorkPicker schedule mode → showDatePicker dialog)
- **Case B (許容)**: picker → 結果で caller の state のみ更新、 次の画面遷移を伴わない場合 (例: species-picker → caller の speciesId state 更新)
- **Case C (禁止)**: 上記以外で「次の画面に進む」 用途 → store-callback 禁止、 直接 `router.push` 必須

### 17-3. 原則 P3 — router.replace 使用条件

`router.replace` は「modal 系 stack を tab に switch する時のみ」 (Sess12 PR-G で確立、 `router.replace('/(tabs)/plan')` 等)。 同 stack 内の screen 置換用途では使用しない (back stack が壊れる)。

### 17-4. 自動検出

`scripts/check-navigation-patterns.mjs` (Sess18 で新設):

- AP-1: 同一 file 内に `router.back()` + `setX(...)` + `useFocusEffect` の 3 セット (= store-callback pattern + 次画面遷移の疑い) → Case A/B/C のいずれかを ADR-0030 §17 で判断する警告
- AP-2: `router.replace` 使用箇所 → 原則 P3 整合性確認の警告

### 17-5. WorkPicker → WorkLogConfirm 直接 push (Sess18 実装)

現状の store-callback chain (WorkPicker → router.back + setWorkPickerResult → bonsai-detail useFocusEffect で router.push) を、 log mode のみ WorkPicker から直接 `router.push('/work-log-confirm')` に変更。 schedule mode は Case A (DatePicker dialog) で store-callback 維持。

---

## 18. アンチパターン（絶対にやらないこと）

1. ❌ 紫グラデーション背景
2. ❌ White background + terracotta accent + italic（Claude デフォルト）
3. ❌ Pill形状のボタン（radius 9999）
4. ❌ 12pt未満の本文テキスト
5. ❌ 48dp未満のタップ領域
6. ❌ 色のみで意味を伝達（赤=危険のみ、アイコン/文字なし）
7. ❌ spring animation（ふわふわ）
8. ❌ アプリ内 SNS シェア直接投稿ボタン
9. ❌ 「診断」「推奨」「病気」等の禁止語
10. ❌ 樹種名の意訳（黒松 → "black pine" は許可、学名は維持）
11. ❌ Form 入力欄を直接 `<TextInput>` で書く (Sess14 PR-K/O 確立、 §12 Form Atom を必須利用)
12. ❌ Form atom 内に hardcoded color 直書き (Sess14 PR-R、 `src/core/theme/colors.ts` の constant 経由必須)
13. ❌ `ALTER TABLE ... ADD COLUMN ... REFERENCES ...` を `db.withTransactionAsync` 内で実行 (Sess14 PR-P で確認した silent failure 罠、 schema v14 部分失敗事例)

---

## 19. DB Migration アンチパターン (Sess14 PR-P 教訓)

### 19-1. `ALTER TABLE ADD COLUMN with REFERENCES` を transaction 内で禁止

**事例**: Sess13 schema v14 で実施した以下の migration が一部の DB で silent failure:

```sql
-- ❌ 危険なパターン
ALTER TABLE bonsai ADD COLUMN custom_species_id TEXT
  REFERENCES bonsai_species_custom(id) ON DELETE SET NULL;
```

**症状**:

- `PRAGMA user_version` だけバージョン bump される
- 実際の DDL (テーブル / カラム作成) は反映されない
- 結果: `if (version < N)` で migration は二度と走らず、 永続的にデッドロック状態に

**原因**: SQLite では `ALTER TABLE ... REFERENCES ...` 内の外部キー制約検証が、 `db.withTransactionAsync()` + `PRAGMA foreign_keys = ON` 環境で意図せず失敗する (transaction 内 DDL の遅延 commit と FK 制約 check の競合)。

### 19-2. 推奨パターン

```sql
-- ✅ 安全なパターン
ALTER TABLE bonsai ADD COLUMN custom_species_id TEXT;
-- FK 制約はアプリ層で担保 (DB column としては plain TEXT)
```

- 新規 FK 列追加は **REFERENCES 句を外して** ALTER TABLE
- FK 整合性はアプリ層 (`bonsaiRepository.ts` の create/update 時にバリデーション) で担保
- ON DELETE SET NULL 相当は呼び出し側で明示的に処理

### 19-3. 修復方法 (既に部分失敗した DB がある場合)

```typescript
// SCHEMA_VERSION を 1 bump し、 idempotent re-run migration を追加
if (version < N + 1) {
  await db.execAsync('CREATE TABLE IF NOT EXISTS ...'); // 既に存在なら no-op
  if (!(await hasColumn(db, 'bonsai', 'missing_column'))) {
    await db.execAsync('ALTER TABLE bonsai ADD COLUMN missing_column TEXT;');
    // REFERENCES 句を **外して** 再実行
  }
  version = N + 1;
}
```

### 19-4. 検出と未然防止

- 毎セッション migration 完了後に **schema verification step** 追加検討:
  - `PRAGMA user_version == SCHEMA_VERSION` だけでなく、 期待する全テーブル / カラムの存在チェック
  - 不一致なら警告 + 修復 migration 提案
- CI / e2e test で `__tests__/db/migrate.test.ts` を新規追加 (v0 → 最新 まで全 step 実行 + テーブル / カラム検証)

---

## 18. 長押し UX 標準 (ADR-0036 D6 / R-45 由来)

### 18-1. 原則 P1 — 触覚 + 視覚 + 動作 3 chan feedback

`Pressable onLongPress` を使う全 component で以下 3 段 fb を必須:

1. **触覚 (Haptics)**: 長押し成功時 `Haptics.impactAsync(ImpactFeedbackStyle.Medium)` を `onLongPress` callback 内 で実行直前に発火
2. **視覚 (Modal / Animation)**: ConfirmDialog 80ms フェードイン (Material 3 Motion duration、 animationType="fade")
3. **動作 (delayLongPress)**: default 500ms 維持 (Material 3 標準 + iOS HIG「Long Press」 整合)、 短縮禁止

### 18-2. 原則 P2 — 破壊的操作は ConfirmDialog + 通知 Toast 必須 (R-44 連動、 Sess27 緩和)

長押し → 破壊的操作 (削除 / アーカイブ / クリア) 動線では:

- OS 標準 `Alert.alert` 不採用、 必ずカスタム `<ConfirmDialog>` (`src/components/ConfirmDialog.tsx`) 利用
- 削除実行後 通常 `Toast.show()` (`src/components/Toast.tsx`) で「{処理} を実行しました」 表示 (default 3s、 action なし)
- 削除実行直前 `Haptics.notificationAsync(NotificationFeedbackType.Warning)` で 2 段目の触覚 fb
- ※ **Undo (元に戻す) button は不採用** (Sess27 実機検証で hit area WCAG 違反 + 貫通バグ判明 → user 真意「即削除 simple」 で撤回、 DB の 30 日 soft delete が誤削除保険として機能)

### 18-3. 原則 P3 — kebab menu (⋮) と long-press 共存 (group + 個別 両 row 配置、 Sess27 拡張)

発見性 (kebab) + power user 効率 (long-press) の両立:

- group 行 / **個別 row** 両方の右端に kebab icon button slot 配置 (`onKebabPress?: () => void` prop) — 長押しが分からない user 向けの代替動線
- kebab tap → `<RowActionMenu>` (`src/components/RowActionMenu.tsx`、 bottom sheet 風) で「削除」 1 item (将来 archive 等の拡張余地)
- Pressable nested で gesture 独立、 内側 kebab button 領域の長押しは parent に伝わらず button tap として処理 (React Native 仕様)

### 18-4. 自動検出 (将来)

- `scripts/eslint-rules/destructive-undo.mjs` (Phase ζ-3 or v1.x): `softDelete*` / `purge*` callsite が `Toast.show()` wrap されているか AST grep (R-44 連動、 Sess26 PR-η-3 の lint script を AST 化)
- 当面 code review + ADR-0036 整合 grep

### 18-5. 関連

- ADR-0036 D1-D9 (本セクション由来、 D5/D6 は Sess27 撤回 / D7 は個別 row にも適用)
- R-44 (破壊的操作 = ConfirmDialog + 通知 Toast 必須、 Sess27 緩和) / R-45 (長押し UX 標準)
- `src/components/ConfirmDialog.tsx` / `src/components/Toast.tsx` / `src/components/RowActionMenu.tsx`
- Material 3 Dialog / Snackbar / Bottom Sheet + Apple HIG Alerts / Action Sheets + WAI-ARIA Dialog Pattern

---

## 20. バッジ pattern (ADR-0037 D3 / Sess28 PR-1 由来)

> **Note**: §18 が本ファイル内で 2 重採番されている (line 436「アンチパターン」 と line 509「長押し UX 標準」)。 §20 を採番、 §18 重複は Sess28 retro で別 PR fix 予定。

### 20-1. 適用範囲

`×n` / `N 日連続` 等の **件数バッジ + ステータスバッジ** に統一適用 (4 箇所):

1. PlanScreen `groupCountBadge` (`app/(tabs)/plan/index.tsx`)
2. bonsai-detail `eventCountBadge` (history タブ、 `app/(tabs)/bonsai/[id]/index.tsx`)
3. bonsai-detail `eventCountBadge` (timeline タブ、 同上)
4. bonsai-detail `timelineConsecutive` (同上)

### 20-2. スタイル仕様

- `backgroundColor`: `BADGE_SOFT_BG` (= `#E8F0EA`、 薄緑)
- `color` (text): `BADGE_SOFT_TEXT` (= `BRAND_GREEN` `#1F3A2E`、 token 統一)
- `borderRadius`: 8
- `paddingHorizontal`: 6-8
- `paddingVertical`: 2
- `fontSize`: 11-12 (badge text 標準)
- `fontWeight`: 600 (可読性)
- `letterSpacing`: 0.4-0.6 (mono 風数字対応)

### 20-3. WCAG コントラスト

`#1F3A2E` text on `#E8F0EA` bg = **コントラスト比 9.5:1**、 WCAG **AAA** クリア (大文字 14pt 以上 OR 通常文字 12pt 以上両方クリア)。

### 20-4. 禁止パターン

- ❌ `backgroundColor: BRAND_GREEN` + `color: ON_BRAND` (= 旧 ×n 強調過剰、 washi 背景と不調和)
- ❌ ad-hoc HEX `#E8F0EA` を src に直接書く (token 経由必須)
- ❌ 透明背景 + border outline (周囲カード border と混在で視認性低下)

### 20-5. 関連

- ADR-0037 D3 (本セクション由来、 Sess28 PR-1)
- `src/core/theme/colors.ts` (BADGE_SOFT_BG / BADGE_SOFT_TEXT)
- ADR-0034 D7 (×N バッジ 件数補完、 色のみ本 ADR で変更)

---

## 21. キーボード被り完全対処 pattern (ADR-0037 D1 / R-46 v2、 Sess31 拡張)

### 21-1. 義務化 — KAV + ScrollView auto-scroll の 2 点セット必須

フォーム input (特に末尾配置 multiline メモ欄) を含む全 screen / modal で以下 **2 点セット**を必ず実装。 どちらか片方のみは不十分 (Sess28 で KAV 単体は「対応完了」 と誤認、 Sess30 実機検証で再発判明)。

```tsx
import { useKeyboardAvoidingProps } from '@/src/core/hooks/useKeyboardAvoidingProps';

function MyFormScreen() {
  const kavProps = useKeyboardAvoidingProps();
  // ① KAV (container 縮小)
  // ② ScrollView ref + onFocus → scrollToEnd (auto-scroll)
  const scrollRef = React.useRef<ScrollView>(null);
  const handleMemoFocus = React.useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
  }, []);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} {...kavProps}>
      <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled">
        <LabeledTextInput
          label="メモ"
          multiline
          value={memo}
          onChangeText={setMemo}
          onFocus={handleMemoFocus}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

### 21-2. KAV 戻り値仕様 (`useKeyboardAvoidingProps()`)

- iOS: `{ behavior: 'padding', keyboardVerticalOffset: useHeaderHeight() }` (Stack header 高さ動的取得)
- Android: `{ behavior: 'height', keyboardVerticalOffset: 0 }` (windowSoftInputMode=adjustResize と協調)

### 21-3. ScrollView auto-scroll 仕様 (Sess31 拡張)

- `<ScrollView ref={scrollRef}>` で ref を取得
- 末尾配置 multiline input の `onFocus` で `scrollRef.current?.scrollToEnd({ animated: true })` を実行
- **`setTimeout(..., 300)` 推奨** (IME 起動アニメーション完了待ち、 Android 約 250-300ms / iOS 約 200ms)
- 共通 component (`LabeledTextInput` 等) は `onFocus?: () => void` prop を expose して任意配線

### 21-4. 禁止パターン

- ❌ `behavior={Platform.OS === 'ios' ? 'padding' : undefined}` (Android で KAV 機能無効、 Sess15 PR-TT 由来 anti-pattern、 R-46 v1 違反)
- ❌ `keyboardVerticalOffset` のハードコード (hook 内で動的計算)
- ❌ **KAV のみで「対応完了」 判定** (Sess28 PR-2/3 で発生した anti-pattern、 R-46 v2 違反): KAV は container 縮小のみ機能、 ScrollView auto-scroll が無いと末尾 input が IME に隠れる
- ❌ ScrollView auto-scroll に `setTimeout` なしで即時呼出 (IME 起動アニメ未完了 → scroll 距離不正)

### 21-5. 関連

- ADR-0037 D1 (本 pattern v1 由来、 Sess28 PR-1)
- R-46 (本 pattern 違反検出ルール、 Sess31 で v2 拡張)
- `src/core/hooks/useKeyboardAvoidingProps.ts` (Sess28 PR-2 で新設)
- `src/components/form/LabeledTextInput.tsx` (Sess31 PR-1 で `onFocus` prop 追加)
- `android/app/src/main/AndroidManifest.xml` (windowSoftInputMode=adjustResize)
- React Native `<KeyboardAvoidingView>` 公式 docs (Note: does not adjust scroll position)
- React Native `<ScrollView>` 公式 docs (`scrollToEnd({ animated })`)

---

## 22. CTA Button pattern (ADR-0038 D4 / R-48 由来、 Sess29 PR-1)

### 22-1. 4 階層の CTA button

| 階層            | 用途                      | 背景                                   | 文字色                                   | 例                                                     |
| --------------- | ------------------------- | -------------------------------------- | ---------------------------------------- | ------------------------------------------------------ |
| **Primary**     | 主要 CTA (画面の主要動作) | `BRAND_GREEN` (#1F3A2E) filled         | `ON_BRAND` (#FFFFFF)                     | 「保存」「アーカイブ」「記録する」 (form 内の最終確定) |
| **Secondary**   | 補助 CTA (主要動作の補佐) | `BUTTON_SECONDARY_BG` (#E8F0EA) filled | `BUTTON_SECONDARY_TEXT` (= BRAND_GREEN)  | 「作業を記録」「全 N 件を記録」 (予定→記録変換動線)    |
| **Tertiary**    | text link 風              | 透明背景                               | `BRAND_GREEN`                            | 「戻る」「キャンセル」 (auxiliary)                     |
| **Destructive** | 破壊的操作                | `DANGER` (#8B2E2E) filled or border    | `ON_BRAND` (filled) or `DANGER` (border) | 「削除」「アーカイブ」 (破壊的)                        |

### 22-2. Secondary CTA の仕様 (本セクションの中心)

- `backgroundColor`: `BUTTON_SECONDARY_BG` (薄緑 #E8F0EA)
- `color` (text): `BUTTON_SECONDARY_TEXT` (= `BRAND_GREEN` #1F3A2E)
- `borderRadius`: 8
- `paddingHorizontal`: 12
- `paddingVertical`: 6
- `fontSize`: 12-14
- `fontWeight`: 600
- `letterSpacing`: 0.4

### 22-3. WCAG コントラスト

`#1F3A2E` text on `#E8F0EA` bg = **コントラスト比 9.5:1**、 WCAG **AAA** クリア。

### 22-4. 禁止パターン

- ❌ `backgroundColor: BRAND_GREEN` + `color: ON_BRAND` を **Primary 以外**の用途で使用 (強調過剰)
- ❌ ad-hoc HEX を src に直接書く (token 経由必須)
- ❌ 階層を無視して全ボタンを Primary にする (視覚優先度の階層崩壊)

### 22-5. 適用箇所 (現状 Sess29 PR-1 時点)

- **Primary**: BonsaiCreateScreen「保存」 / BonsaiBasicSection「保存」 / WorkLogConfirm「記録する」 / BulkLogConfirm「記録する」 / 一括予定追加 form「予定を追加」 等
- **Secondary**: EventRow `actionButton` (個別 row 「作業を記録」、 Sess29 PR-3 で適用予定) / PlanScreen + RecordTabScreen の group header「全 N 件を記録」 (Sess29 PR-4 で新設予定)
- **Tertiary**: Stack header back button / cancel button 等
- **Destructive**: bonsai-detail「アーカイブ」 / ConfirmDialog destructive 確定 button

### 22-6. 関連

- ADR-0038 D4 (本セクション由来、 Sess29 PR-1)
- R-48 (本 pattern 違反検出ルール)
- `src/core/theme/colors.ts` (BUTTON_SECONDARY_BG/TEXT)
- ADR-0036 §18 (長押し UX) と並列、 CTA / destructive 共通の動作軸

---

## 23. Form Screen Layout Pattern (ADR-0040 / R-50 由来、 Sess33)

フォーム画面 (盆栽追加 / 作業記録 / まとめて記録) の **4 要素 SoT**。 構造ばらつき禁止。

### 23-1. 必須 4 要素

1. **Header**: `<FormScreenHeader />` を `Stack.Screen options={{ headerShown: false }}` と組合せ sticky 配置
   - 戻るボタンのみ (タイトルは ScrollView 内に配置)
   - 高さ = 56 + insets.top、 SafeArea + StatusBar 内包
   - `accessibilityRole="header"` 必須

2. **Scroll**: 単一 `<ScrollView>` がタイトル / chips / フォーム要素を全て内包 (full-screen scroll)
   - sticky な要素 (タイトル / chips / Hero) を ScrollView 外に置く pattern 禁止
   - IME 起動時に全要素がスクロール可能

3. **KAV**: `useKeyboardAvoidingProps()` 強制利用 (R-46 v1 / ADR-0037 D1)
   - `<KeyboardAvoidingView {...kavProps}>` で ScrollView を wrap
   - footer (保存ボタン等) は KAV 内 ScrollView 外に配置

4. **SafeArea**: FormScreenHeader 内で `useSafeAreaInsets()` で top inset を吸収
   - 各画面で個別に SafeArea 対応する必要なし (FormScreenHeader が内包)

### 23-2. measureLayout 必須 pattern (R-46 v4 / ADR-0040 D2)

中盤 input (後ろに他フィールドあり) の auto-scroll は **UIManager 公式 API 必須**:

```tsx
import { UIManager, findNodeHandle, TextInput } from 'react-native';

const noteInputRef = React.useRef<TextInput>(null);
const handleNoteFocus = React.useCallback(() => {
  setTimeout(() => {
    const scrollNode = findNodeHandle(scrollRef.current);
    const inputNode = findNodeHandle(noteInputRef.current);
    if (scrollNode == null || inputNode == null) {
      scrollRef.current?.scrollToEnd({ animated: true });
      return;
    }
    UIManager.measureLayout(
      inputNode,
      scrollNode,
      () => scrollRef.current?.scrollToEnd({ animated: true }), // onFail
      (_x, y) => scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true }), // onSuccess
    );
  }, 350);
}, []);
```

❌ 禁止 pattern: `inputRef.current?.measureLayout(...)` — forwardRef 経由 ref では「native component ref」 として認識されず Console Error。

### 23-3. 対象外

- `bonsai-detail/[id]` (詳細画面 + タブ切替、 Stack header にタイトル必要)
- picker / multi-select modal (選択画面、 form ではない)

### 23-4. 検証必須項目 (R-46 v4 / R-51)

実機検証時は以下を **全部** 確認:

1. ✅ SS: タイトル / chips / フォーム要素が ScrollView 内に統合されている
2. ✅ SS: IME 起動時にメモ欄 / 末尾 input が画面内 visible
3. ✅ logcat: アプリ関連 ERROR / Warning / Exception 0 件
4. ✅ Dev menu Console: Error 0 件 (赤バー非表示)
5. ✅ 戻るボタン sticky 残存、 tap で `router.back()` 動作

### 23-5. 関連

- ADR-0040 (本セクション由来、 Sess33)
- R-46 v4 (KAV + auto-scroll 2 タイプ + logcat 検証強制)
- R-51 (FormScreenHeader + full-screen scroll 必須)
- `src/components/form/FormScreenHeader.tsx`
- `src/core/hooks/useKeyboardAvoidingProps.ts`

---

## 24. EventRow contract matrix (ADR-0041 Phase η/θ / Sess34)

`src/features/event/EventRow.tsx` の `displayMode: 'compact' | 'detailed'` prop で切替可能な表示モードの SoT。 callsite と整合性レベル 2 (ADR-0034 D4) を維持。

### 24-1. matrix

| 表示要素                                 | compact                                                     | detailed                                                                       |
| ---------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| layout 方向                              | horizontal row (iconBox left + content right + kebab right) | **vertical stack** (Phase θ D1)                                                |
| iconBox / 写真 strip                     | 36×36 EventIcon                                             | (なし、 PhotoBlock で置換)                                                     |
| **写真 PhotoBlock**                      | (なし)                                                      | 横幅 full × **aspect 4:3** (約 720-padding × 540)、 +N badge 右下 (Phase θ D2) |
| **盆栽名 (showBonsaiName=true)**         | 1 行目に表示 (fontSize 15)                                  | header に表示 (**fontSize 16-18**)                                             |
| **作業名 + 日付 (showBonsaiName=false)** | 1 行目 Fragment                                             | header に Fragment (fontSize 16)                                               |
| **時刻 HH:mm**                           | 非表示 (ADR-0036 D9)                                        | 非表示 (Phase θ D6)                                                            |
| **labeled chips block**                  | (なし、 chips は flexWrap で表示)                           | **vertical stack** で「label: [chip]」 形式 (Phase θ D4)                       |
| **chip max 数**                          | 制限なし                                                    | **max 4 + 「+N」 sentinel** (ADR-0041 D4)                                      |
| **WiringPeriodDisplay** (wiring 時)      | 通常表示                                                    | labeled chip 同列 (「装着期間: [N週]」、 Phase θ D11)                          |
| **scheduledUnwireLabel** (wiring 時)     | 通常表示                                                    | labeled chip 同列 (「解除予定日: [日付]」、 Phase θ D11)                       |
| **memo (ev.note)**                       | 2 行 truncate                                               | **3 行 truncate** + 「もっと見る ▶」 link (ADR-0041 D5)                        |
| **「もっと見る」 リンク**                | (なし)                                                      | truncate 時のみ表示、 tap で `/(tabs)/bonsai/[id]?tab=history` 遷移            |
| **kebab ⋮**                              | row 右端                                                    | header 右端                                                                    |
| **actionButton (planned 時)**            | content 末尾 (「作業を記録」、 ADR-0035 D7)                 | 同上 (logged では出ない)                                                       |

### 24-2. callsite 設定

| callsite                                                       | displayMode                      | showBonsaiName | 用途                                                                         |
| -------------------------------------------------------------- | -------------------------------- | -------------- | ---------------------------------------------------------------------------- |
| `CalendarTabScreen.tsx` planned section                        | `'compact'` (default、 明示不要) | true           | 予定 row (写真なし、 「全 N 件を記録」 button が主目的、 D7)                 |
| `CalendarTabScreen.tsx` logged section                         | `'detailed'`                     | true           | 記録 row (写真 + 詳細 chip 表示)                                             |
| `app/(tabs)/bonsai/[id]/index.tsx` history タブ (group 展開)   | `'detailed'`                     | false          | 整合性 lv 2 維持 (ADR-0034 D4、 Phase η Notes Amended で displayMode 値含む) |
| `app/(tabs)/bonsai/[id]/index.tsx` history タブ (single event) | `'detailed'`                     | false          | 同上                                                                         |

### 24-3. labeled chip 表示の i18n

- chip の `fieldLabelKey` は **既存 workLog\* keys 流用** (Sess16 各言語ペルソナ翻訳済)
- 追加 i18n 翻訳ゼロ (`historyField*` prefix 新設は user 指摘で path 撤回)
- 14 種別の chip mapping は `src/features/event/buildHistoryChips.ts` の switch + `fieldLabelKey` 参照
- RTL 配慮: i18n value にコロンを含めず、 component で `${t(key)}:` 結合

### 24-4. 写真ゼロ event の動的 row 高さ (Phase θ D12)

- 写真有 event: 行高 約 600px (PhotoBlock 4:3 + chips + memo)、 1 画面 1-2 row
- 写真無 event: PhotoBlock **完全非表示** (`photoRepository.getRepresentativePhotoByEventId` で null 時条件 render)、 行高 約 200-300px に縮小
- regression: 旧来の「全 row 同高度」 は破棄、 動的縮小で scroll 量緩和

### 24-5. EventIcon mapping (14 種別フル網羅、 ADR-0041 Phase θ D10)

`src/components/icons/EventIcons.tsx` の EventIcon switch は **exhaustive** (default なし)、 14 種別すべて non-null React element を返す:

| type                                                         | Icon component                            |
| ------------------------------------------------------------ | ----------------------------------------- |
| watering                                                     | DropletIcon                               |
| pruning / leaf_trimming / defoliation / deshoot / candle_cut | ScissorsIcon                              |
| wiring / unwiring                                            | WireIcon                                  |
| repotting / moss_care                                        | PotIconSmall                              |
| fertilizing                                                  | FertilizerIcon                            |
| pest_control                                                 | SprayIcon                                 |
| position_change                                              | CompassIcon                               |
| **leaf_first_aid**                                           | **LeafAidIcon (新規、 葉 + 絆創膏 2 色)** |

新規 EventType 追加時は `__tests__/components/icons/EventIcons.test.tsx` の exhaustive 走査で **non-null assertion fail** で silent miss 検出。

### 24-6. 単位表示の規約 (Sess37 PR-1 R-54 連動)

- 鉢サイズ等の長さ値は DB に **cm canonical** 保存 (`lengthToCanonical()` で cm 統一)
- 長さ単位 (mm/cm) は SI 国際共通で chip text に hardcode 可: `${payload.wire_size_mm}mm` / `${payload.pot_size_cm}cm`
- **言語依存単位 (倍 / 本 / pcs 等) は i18n key 経由必須** (R-54):
  - form input suffix と chip 表示で **同一 `workLog*Unit` i18n key** を参照 (DRY、 19 言語完備)
  - `HistoryChip` data に `valueUnitKey: TranslationKey` 格納、 component で `${chip.text}${t(chip.valueUnitKey)}` で結合表示
  - 例: pest_control dilution_ratio → `workLogPestDilutionUnit` (ja「倍」 / en「x」 / ko「배」 / ar「مرة」)
  - 例: candle_cut count → `workLogCandleCountUnit` (ja「本」 / en「pcs」 / zh「个」)
- user 入力時の単位 (cm/mm/inch) は保存後失われる、 表示は cm 固定

### 24-7. EventRow display typography token (Sess37 PR-1 / ADR-0029 拡張)

`src/core/theme/typography.ts` に **eventRow\* prefix で scope 明示** (form\* token と並列):

| token                      | fontSize | lineHeight | fontWeight | color          | 用途                                                                           |
| -------------------------- | -------- | ---------- | ---------- | -------------- | ------------------------------------------------------------------------------ |
| `eventRowChipText`         | 14       | 20         | (default)  | TEXT_SECONDARY | HistoryChip 値表示 (旧 11 → WCAG AA / Material 3 body medium)                  |
| `eventRowChipLabel`        | 14       | 20         | (default)  | TEXT_SECONDARY | HistoryChip 「希釈倍率:」 等 field label (chip 整合)                           |
| `eventRowMemo`             | 15       | 22         | (default)  | TEXT_SECONDARY | EventRow detailed mode の memo 本文 (旧 12 → 長文可読性向上、 lineHeight 1.47) |
| `eventRowReadMoreLink`     | 14       | 20         | (default)  | TEXT_SECONDARY | 「もっと見る ▶」「折りたたむ ▲」 link (chip と統一)                            |
| `eventRowMemoSectionLabel` | 12       | 16         | 600        | TEXT_MUTED     | memo セクションヘッダー「メモ」 (Sess37 PR-1 C6、 左 border なし)              |

設計判断:

- 盆栽 user (高齢層 60-70 代) WCAG AA 推奨 minimum 12px 達成 + Material 3 body medium 14sp baseline 採用
- detailedTitle 16px は維持 (盆栽名など見出しレベル、 fontSize 拡大対象外)
- chip `maxWidth` 200 → **240** に拡大 (fontSize 14 化で truncate 防止)
- memo セクションラベル「メモ」 は左 border **なし** (user 指摘確定、 視覚ノイズ防止)

### 24-8. 関連

- ADR-0041 (本セクション由来、 Phase η + θ、 Sess34)
- ADR-0034 D4 (整合性レベル 2、 Phase η Notes Amended で displayMode 含む)
- ADR-0036 D9 (重複表示削除、 時刻 / 日付 / wiring scheduled_unwire chip 非表示)
- ADR-0027 (14 種別 form + 写真/日付 共通基盤、 EventRow 表示の前提)
- `src/features/event/EventRow.tsx` (本 contract の実装)
- `src/features/event/EventRowPhotoBlock.tsx` (Phase θ 新規)
- `src/features/event/EventRowPhotoStrip.tsx` (Phase η、 forward-only 温存)
- `src/features/event/buildHistoryChips.ts` (14 種別 chip 生成 + fieldLabelKey)
- `src/features/event/HistoryChip.tsx` (labeled 表示)
- `src/features/event/payloadValidator.ts` (14 種別 schema、 PR-Q-fix で漏れ修正)
- `__tests__/components/icons/EventIcons.test.tsx` (exhaustive 走査)
- `__tests__/features/event/buildHistoryChips.test.ts` (14 種別 chip 生成 + payload 各 case)
- `__tests__/features/event/payloadValidator.test.ts` (schema strip 防止 test)

---

## 25. タブアイコン SoT (ADR-0042 D1/D2 / Sess36 PR-4 由来)

画面下部 4 タブの icon は **本セクションが SoT**。 icon 変更時は ADR-0042 D1 の 4 基準を満たすことを ADR 改訂で明文化する。

### 4 タブ icon matrix

| タブ index | route       | i18n key      | icon component              | 採用根拠                                                              | mockup 整合                                                                                                |
| ---------- | ----------- | ------------- | --------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1          | `bonsai`    | `tabBonsai`   | `LeafIcon` (葉)             | 盆栽 = 植物 = 葉、 4 ペルソナ全員 ◎                                   | mockup HI.Leaf 整合                                                                                        |
| 2          | `plan`      | `tabPlan`     | `CalendarIcon` (カレンダー) | 予定 = 日付管理 = カレンダー、 4 ペルソナ全員 ◎                       | mockup HI.Cal 整合                                                                                         |
| 3          | `record`    | `tabRecord`   | `NotebookIcon` (帳簿)       | 14 種別記録 = 帳簿、 4 ペルソナ全員 ◎/○、 BonsaiLog 和文化 brand 整合 | mockup HI.Droplet を ADR-0042 D2 で上書き (EventIcons watering 重複 + 機能誤認回避)                        |
| 4          | `look-back` | `tabLookBack` | `PencilNavIcon` (鉛筆)      | ふりかえり = 過去整理 = 書く、 4 ペルソナ全員 ◎/○                     | mockup HI.Pencil 整合 (ADR-0020 §Notes Amended で「探す」→「ふりかえり」 rename 時にコンパス→鉛筆に差替済) |

### タブ icon 選定 4 基準 (ADR-0042 D1)

タブ icon を変更/追加する際は **以下 4 基準を全て満たす** ADR 改訂を必須化:

1. **機能整合**: icon が表すメンタルモデルがタブの **全機能** を象徴 (例: 「記録」 = 14 種別記録 → 「水滴」 (1 種別 = watering のみ) は不可)
2. **重複排除**: NavIcons と EventIcons / 他 icon library で **同名関数を作らない** (`scripts/check-icon-duplication.mjs` で CI 強制、 Sess36 PR-5)
3. **4 ペルソナ ✕ なし**: `docs/reference/personas.md` 4 名全員で ✕ がない (1 名でも ✕ なら再検討、 R-10)
4. **mockup 整合 or 上書き明示**: `docs/mockups/v1.0/wireframes/*.jsx` HI.\* との整合が原則、 上書き時は ADR で理由明示 (ADR-0042 D2 が該当)

### 実装ファイル (SoT 参照先)

- `src/components/icons/NavIcons.tsx` (LeafIcon / CalendarIcon / NotebookIcon / PencilNavIcon の SVG 実装、 size=28 default、 strokeWidth=1.5 統一)
- `src/components/icons/index.ts` (barrel export)
- `app/(tabs)/_layout.tsx` (Tab 配線、 `tabBarIcon` prop)

### 関連 ADR

- ADR-0020 (4 タブ構造)、 ADR-0020 §Notes Amended (icon 変更履歴 = タブ rename / icon 差替の記録、 Sess36 PR-6 で追記)
- ADR-0042 D1/D2 (本 SoT の出典)

---

## 26. FAB SoT (ADR-0042 D3 / Sess36 PR-4 由来)

画面右下 Floating Action Button (FAB) は **本セクションが SoT**、 全画面で共通 component `src/components/common/FAB.tsx` を使用。 inline 実装禁止 (将来 lint 自動化検討、 Sess36 PR-6 の R-X 候補)。

### FAB 位置・サイズ token

| 項目               | 値                                                                                 | 根拠                                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `right`            | **20**                                                                             | 8px grid 整合 + 端からの誤タップ余裕 (旧 inline は 16、 高橋 62 歳ペルソナで「画面端から指 1 本分」 懸念解消) |
| `bottom` (計算式)  | `tabBarHeight + (showAdBanner ? AD_BANNER_HEIGHT_APPROX : 0) + insets.bottom + 16` | tab bar 上 + AdBanner 上 + SafeArea (iOS Home Indicator 34pt / Android gesture nav) 反映                      |
| `width` × `height` | **56 × 56dp**                                                                      | Material 3 FAB 標準、 WCAG 2.2 SC 2.5.8 minTarget 44dp を余裕クリア                                           |
| `borderRadius`     | **28**                                                                             | 完全円 (size / 2)                                                                                             |
| `position`         | `'absolute'`                                                                       | 画面右下固定                                                                                                  |
| `zIndex`           | **10**                                                                             | 他 UI 上に表示                                                                                                |

### FAB icon

- **default**: `<PlusIcon size={28} color={ON_BRAND} />` (NavIcons.tsx)
- 旧 bonsai-detail で `<ThemedText>+</ThemedText>` 文字列実装の不整合 → Sess36 PR-3 で PlusIcon に統一済
- カスタム icon が必要な画面は `icon` prop で override 可

### FAB 色 token

| state    | bg            | icon color           | shadow                             |
| -------- | ------------- | -------------------- | ---------------------------------- |
| 通常     | `BRAND_GREEN` | `ON_BRAND` (#FFFFFF) | shadow + elevation 6               |
| disabled | `TEXT_MUTED`  | `ON_BRAND`           | opacity 0.5、 shadow + elevation 0 |

### FAB 適用画面 (Sess36 PR-3 時点)

| 画面                                       | testID                  | a11y label key    | showAdBanner               | disabled 条件           |
| ------------------------------------------ | ----------------------- | ----------------- | -------------------------- | ----------------------- |
| 盆栽 tab                                   | `e2e_home_fab_create`   | `bonsaiCreateNew` | **true** (AdBanner と併用) | なし                    |
| 予定 tab (CalendarTabScreen mode='plan')   | `e2e_plan_fab_action`   | `planFabLabel`    | false                      | 過去日選択時 true       |
| 記録 tab (CalendarTabScreen mode='record') | `e2e_record_fab_action` | `recordFabLabel`  | false                      | なし (記録は過去日有効) |
| bonsai-detail history タブ                 | `e2e_history_fab`       | `eventLogCta`     | false                      | なし                    |
| bonsai-detail timeline タブ                | `e2e_timeline_fab`      | `addScheduleCta`  | false                      | なし                    |

### §22 (4 階層 CTA) との整合

§22 の 4 階層 CTA (Primary / Secondary / Tertiary / Destructive) は **画面内固定配置** の button pattern。 FAB は **floating CTA カテゴリ** として独立 (画面外 absolute 配置)、 §22 の Primary と同色 BRAND_GREEN bg + ON_BRAND text/icon で視覚一貫性を維持。

### 実装ファイル (SoT 参照先)

- `src/components/common/FAB.tsx` (component 実装)
- 使用箇所: `app/(tabs)/bonsai/index.tsx` / `src/features/calendar/CalendarTabScreen.tsx` / `app/(tabs)/bonsai/[id]/index.tsx` (history + timeline 2 箇所)

### 関連 ADR

- ADR-0042 D3 (本 SoT の出典)
- 過去 issue: #440 / #441 (Phase 1 で初期実装、 Sess36 で SoT 化)

---

## 27. グループカード レイアウト pattern (Sess42 バグ4 由来)

カレンダー (`CalendarTabScreen` の予定/記録セクション) の連続日まとめ「グループカード」 のように、
**1 行に複数の操作 (記録 button / 展開 toggle / kebab) + 種類名 + 件数バッジ** を詰める行 layout の標準。

### 27-1. 原則 — 横並び 1 行に詰め込まず「2 段組み + 伸縮塊」

- 種類名 (i18n、 19 言語で長さが大きく異なる。 例: 防除・消毒=5 字 / 独語 pest_control=20 字級) と、
  右側の操作群を**同一行に固定で並べると、狭幅端末 (360dp) で破綻**する。
- **解決 (案C+B)**:
  1. **2 段組み** — 1 段目 = アイコン + 種類名 + 件数バッジ + kebab、 2 段目 = 操作 button + toggle。
  2. **種類名 + バッジを `flex: 1` + `minWidth: 0` の塊 (cluster)** にし、 label は `flexShrink: 1` +
     `numberOfLines={1}` で**長言語名のみ「…」省略**、 短い言語はフル表示。

### 27-2. 禁止パターン (Sess42 バグ4 の失敗から)

- ❌ 同一 row に `flex: 1` の伸びる spacer と `flexShrink: 1` の label を同居 →
  flexbox の縮め配分 (`flexShrink × flexBasis`) で label に縮めが集中し、 **label が過剰潰れ (「··」)**。
  〔出典: React Native Flexbox 公式 / CSS-Tricks "Flexbox and Truncated Text"〕
- ❌ label に `minWidth: 0` 相当 (= cluster の `flex:1`+`minWidth:0`) なしで `numberOfLines` →
  中身幅以下に縮まず、 兄弟要素を画面外へ押し出す (はみ出し)。

### 27-3. タップ領域 (シニア誤タップ防止)

- 行内の操作 button (例: 「全 N 件を記録」) は **`minHeight: 44`** を確保 (WCAG 2.5.5 AAA / Apple 44pt /
  Material 48dp 準拠)。 44px 未満は誤操作率が約 3 倍 (高橋 62 歳ペルソナ = 老眼 + 誤タップ恐怖)。
- fontSize は §22 Secondary CTA の 12-14 に合わせる (Sess42 で 11→13)。

### 27-4. 実装ファイル (SoT 参照先)

- `src/features/calendar/CalendarTabScreen.tsx` (`groupRow` / `groupLine` / `groupLeftCluster` /
  `groupLine2` / `groupRecordButton`)

### 27-5. 関連

- ADR-0038 D3 (「全 N 件を記録」 button + kebab 併存、 本カードの操作要素の出典)
- §20 (バッジ) / §22 (CTA Button、 Secondary)
- Sess42 バグ4 (本セクション由来、 実機 720×1520 で「防除・消毒」 が「··」 潰れ → 2 段化で解消)

---

_このドキュメントは `src/core/theme/colors.ts` として TypeScript 定数にも反映される。_
_変更時は ADR `docs/adr/YYYY-MM-DD-design-tokens.md` を作成。_
