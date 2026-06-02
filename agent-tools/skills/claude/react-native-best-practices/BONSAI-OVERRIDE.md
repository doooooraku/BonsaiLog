# BonsaiLog Override — react-native-best-practices

> **目的**: upstream Callstack の `SKILL.md` は無改変のまま、BonsaiLog 固有の React Native 性能・Intl 文脈をここに追補する (ADR-0051 D-6)。本ファイルは `pnpm ai:sync` で `agent-tools/skills/claude/react-native-best-practices/` → `.claude/skills/react-native-best-practices/` に自動コピーされる。
> **使い方**: Claude Code が `react-native-best-practices` skill を発火した時、SKILL.md 本体と併せて本ファイルを Read し、 BonsaiLog 文脈に当てはめて判断する。

---

## 1. BonsaiLog で頻出する性能・Intl 文脈

### 1-1. Hermes Intl 19 言語 RangeError (最頻出リスク)

- **背景**: BonsaiLog は v1.x で **19 言語フル展開** (`docs/reference/constraints.md` §3-1 参照、SoT は ADR-0004)。`Intl.DateTimeFormat` / `Intl.NumberFormat` / `formatInTimeZone` (date-fns-tz) を多用。
- **既知の地雷**: Hermes V1 では `Intl` polyfill 不完備で言語コードによっては `RangeError` で即クラッシュする (例: `hi` / `th` の月名)。
- **判定基準**:
  - 「Intl で crash」「formatInTimeZone」「month names が出ない」 「RangeError」 と user が報告したら、 まず Hermes Intl カバレッジを疑う
  - `@formatjs/intl-*` polyfill 採用は **bundle size** と **TTI** を悪化させるトレードオフ
- **既存 ADR / lessons (BonsaiLog 内)**:
  - `docs/adr/ADR-0010` (AdMob banner) で Hermes / RC SDK の互換性に言及
  - `docs/adr/ADR-0018` (onboarding-flow) でロケール初期化順序
  - `docs/reference/tasks/lessons.md` 索引 → `lessons/i18n.md` (もし存在すれば)
- **対処順序**:
  1. 該当ロケールで実機再現 (Dev Build + 言語切替 + reload)
  2. logcat で `RangeError` stack trace 確認
  3. SKILL.md の `native-*` / `bundle-*` Guideline を参照しつつ polyfill vs Hermes upgrade を比較
  4. 採用方針は ADR 起票で SoT 化 (BonsaiLog R-25 spec-code drift 防止)

### 1-2. Paywall 比較表 / Settings 行リストの FlashList 候補

- **背景**: Sess57 (PR #908) で PlanSection 2→7 要素、 Sess60 (PR #918) で SpeciesPicker / StylePicker に section header + 「カスタム」 chip + 残枠 counter を追加。Settings 画面は 3 列表 + Pro 比較表 (ADR-0049 §2-2) で行数が多い。
- **判定基準**:
  - 1 画面で **30 行超のスクロールリスト** + **頻繁な state 更新** (Pro 切替 / 課金状態) があれば FlashList 化候補
  - 但し **FlatList で十分** なケースで FlashList 化は **過剰最適化** (BonsaiLog 単独運用、 RN 0.83、FlashList は別依存)
- **適用判定の判断軸**:
  - jank 体感 (実機 SH-M25 / 老眼ペルソナ目線で frame drop が認知できる) があるか
  - 修正範囲が **既存 ADR-0015 theme system** や Pickers の row component と衝突しないか
- **既存 ADR (BonsaiLog 内)**:
  - `docs/adr/ADR-0016` (export PDF) で FlashList 言及あり (PDF プレビュー画面のみ採用)
  - `docs/adr/ADR-0015` (theme system) で React Native 標準コンポーネント原則

### 1-3. expo-sqlite + Drizzle の N+1 / 写真 base64 肥大

- **背景**: BonsaiLog は完全ローカル SQLite (`docs/reference/constraints.md` §1-2)、写真は `Paths.document/photos/<bonsaiId>/<photoId>.jpg` で相対パス保存 (絶対パス禁止)。
- **既知の地雷 (Sess50 PR #869)**:
  - 個別 PDF 多写真で WebView 真っ白 = Chromium tile memory 上限 (largeHeap で解決せず、 #2683)
  - 56px 表示に原寸 base64 を渡すと payload 肥大、 メモリ圧迫
- **判定基準**:
  - 「PDF プレビュー真っ白」「個別 export crash」「メモリ警告」 と user が報告したら base64 vs file URI を疑う
  - SKILL.md の `js-*` (memory) Guideline + `bundle-*` (size) Guideline を参照

### 1-4. Reanimated 4 / Worklets / Gesture Handler の組合せ

- **背景**: package.json で `react-native-reanimated ~4.2.1` + `react-native-worklets 0.7.4` + `react-native-gesture-handler ~2.30.1`。
- **判定基準**:
  - 「BottomSheet が遅い」「FAB 表示が遅延」「画面遷移時にカクツク」 と user が報告したら、 Reanimated worklet と JS thread を疑う
  - Sess24 ADR-0036 で破壊的アクションの BottomSheet 撤廃 (ネイティブ presentation 化) が確立済、 新規 BottomSheet 追加は再検討推奨

---

## 2. 「本来発火すべきだったのに発火していない」 既知の文脈 (Sess63 audit より)

過去 3 ヶ月で以下のキーワードが ADR / lessons 内で言及されたが、 `react-native-best-practices` skill は発火していなかった (= 逸失機会):

- ADR-0010 / 0018 / 0024 等 10+ ファイルで「Hermes」 言及
- ADR-0016 で「FlashList」 1 件 (PDF プレビュー)
- Sess の jank / frame drop 議論

`.claude/hooks/check-rn-perf-hint.mjs` で以下キーワードを検知 → 本 skill 参照リマインダー注入: `Hermes` / `FlashList` / `Reanimated` / `FPS` / `TTI` / `bundle size` / `memory leak` / `jank` / `frame drop` / `再レンダリング` / `JS thread` / `bridge overhead` / `Intl crash` / `formatInTimeZone`

---

## 3. 適用時のチェックリスト (R-25 / R-55 整合)

1. **同パターン全件 grep** (R-55): 修正対象以外に同 pattern (例: 他言語の Intl crash) が無いか必ず grep。
2. **i18n key inventory** (R-55): 文言修正なら 19 言語の key 整合性確認 (`pnpm i18n:check`)。
3. **mockup ↔ ADR 整合** (R-25): UI 修正なら mockup と ADR の構造系 4 項目 (タブ / セクション / UI 種別 / スクロール範囲) を Claude Read で確認。
4. **R-9 既存スクリプト先読み**: 性能計測は既存の `scripts/` 配下 (theme-*, navigation-*, a11y-*) と重複しないか確認。
5. **追加課金ゼロ厳守** (ADR-0047): Reactotron / Flipper / Sentry 等の有料プランは不採用、Hermes Profiler + adb dumpsys で代替。

---

## 4. 参照リンク (BonsaiLog 内)

- `docs/reference/constraints.md` §1-2 (データ保存) / §1-4 (AI 非搭載) / §3 (19 言語)
- `docs/adr/ADR-0010` (AdMob) / ADR-0015 (theme) / ADR-0016 (export) / ADR-0024 (BottomSheet 撤廃)
- `docs/adr/ADR-0049` (Pro 機能境界、 Paywall 比較表)
- `docs/reference/tasks/lessons.md` (索引、 性能関連は `lessons/db.md` `lessons/i18n.md` 等)
- `package.json` dependencies (RN 0.83.6 / Reanimated 4.2.1 / SQLite 55.0.16)
