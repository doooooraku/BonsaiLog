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

| Token              | HEX       | 用途                                                               |
| ------------------ | --------- | ------------------------------------------------------------------ |
| `--bg-primary`     | `#F7F3E8` | 背景（washi 和紙色）                                               |
| `--bg-surface`     | `#FFFFFF` | カード背景                                                         |
| `--text-primary`   | `#1A1A1A` | 本文（sumi 墨色）                                                  |
| `--text-secondary` | `#5A5248` | 補助テキスト                                                       |
| `--text-muted`     | `#767066` | 3次テキスト (ADR-0020 Phase 10 で AA 4.5:1 適合に補正、旧 #8A8274) |
| `--primary`        | `#1F3A2E` | プライマリ（深緑 fukamidori）                                      |
| `--primary-hover`  | `#2A4C3D` | 押下時                                                             |
| `--accent-bark`    | `#5A4637` | 樹皮色（タグ・区切り）                                             |
| `--accent-gold`    | `#C69E48` | 秋葉色（Pro バッジのみ）                                           |
| `--danger`         | `#8B2E2E` | 危険                                                               |
| `--success`        | `#3E5C39` | 成功                                                               |
| `--border`         | `#D9D1BF` | 境界線                                                             |
| `--border-strong`  | `#8A8274` | 強調境界線                                                         |

### 2-2. ダークモード（OLED焼き付き配慮）

| Token              | HEX       | 用途                   |
| ------------------ | --------- | ---------------------- |
| `--bg-primary`     | `#0A0E1A` | 背景                   |
| `--bg-surface`     | `#131826` | カード背景             |
| `--text-primary`   | `#E8E4D6` | 本文（淡washi）        |
| `--text-secondary` | `#B0A897` | 補助                   |
| `--text-muted`     | `#7A7265` | 3次                    |
| `--primary`        | `#6B9B7F` | プライマリ（夜目の緑） |
| `--primary-hover`  | `#7FB095` | 押下                   |
| `--accent-bark`    | `#8C7561` | 樹皮色                 |
| `--accent-gold`    | `#D4B062` | 秋葉                   |
| `--danger`         | `#C9575D` | 危険                   |
| `--success`        | `#7DAE7A` | 成功                   |
| `--border`         | `#2A2F3E` | 境界線                 |

### 2-3. 屋外モード（直射日光下、WCAG AAA 7:1目標）

| Token            | HEX       | 用途       |
| ---------------- | --------- | ---------- |
| `--bg-primary`   | `#FFFFFF` | 背景       |
| `--text-primary` | `#000000` | 本文       |
| `--primary`      | `#000080` | プライマリ |
| `--border`       | `#000000` | 境界線     |

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

_このドキュメントは `src/core/theme/colors.ts` として TypeScript 定数にも反映される。_
_変更時は ADR `docs/adr/YYYY-MM-DD-design-tokens.md` を作成。_
