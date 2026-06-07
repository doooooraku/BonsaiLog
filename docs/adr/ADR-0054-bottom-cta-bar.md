# ADR-0054: FAB 廃止 + Bottom CTA Bar 全面化 (Sess72)

- Status: Accepted
- Date: 2026-06-07
- Deciders: @doooooraku
- Related: ADR-0042 (本 ADR で Superseded) / ADR-0020 (4 タブ構造 + Notes Amended) / ADR-0030 (navigation patterns 統一) / ADR-0037 (BADGE_SOFT + KAV) / ADR-0038 (RecordTabScreen + log mode) / ADR-0052 (dark theme cascade) / ADR-0033 (翻訳ポリシー) / `docs/reference/design_system.md` §22 (4 階層 CTA) / `.claude/recurrence-prevention.md` R-13/R-58/R-60 / Sess72 議論 (6 専門家 + 4 ペルソナ + 業界事例) / 業界 1 次情報 [Material 3 Floating Action Button](https://m3.material.io/components/floating-action-button/overview) + [Apple HIG Bottom Toolbar](https://developer.apple.com/design/human-interface-guidelines/toolbars) + [Nielsen Norman Group "One-handed mobile UX" 2024](https://www.nngroup.com/) + [WCAG 2.2 SC 2.4.6 Headings and Labels](https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels.html) + [WCAG 2.2 SC 3.2.4 Consistent Identification](https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html)

---

## Context（背景）

### テスター報告 (2026-06-03、 Sess72 議論起点)

> 「フローティングアクションボタンがリストと重なって配置されているのが気になりました」 (スクショ: bonsai-detail 履歴 tab、 緑 FAB が「水量: 軽く」 chip と⋮メニュー右辺と視覚的に重なる)

### 構造的根本問題 (なぜなぜ 5 回からの導出)

#### 問題: 4 画面の ScrollView/FlatList `paddingBottom` 計算が散在 + FAB 上端との clearance 不足

- **盆栽 list**: `tabBarHeight + AD_BANNER + 32`
- **予定 / 記録 tab (CalendarTabScreen)**: ハードコード `96`
- **bonsai-detail (履歴 / 予定 tab)**: `tabBarHeight + 32`
- **FAB top edge** (計算式): `tabBarHeight + insets.bottom + 16 + 56 = tabBarHeight + insets.bottom + 72`
- 結果として bonsai-detail で **40 〜 74 px の FAB と最終項目の overlap** が常時発生 (insets.bottom により増減)

#### 真因 (Sess36 ADR-0042 の SoT 化漏れ)

ADR-0042 D3 で FAB component の SoT (`src/components/common/FAB.tsx`) は確立したが、 **「FAB を置く画面の Scroll 領域 `paddingBottom` 計算 (= Layout Contract)」 が SoT 化対象から漏れた**。

ADR-0042 Acceptance test では「FAB が tabBar や banner にかぶらない」 は検証したが、 **「FAB が ScrollView 最終項目にかぶらない」 は検証項目になかった**。 当時 short list での視覚確認のみで long list / dynamic insets での衝突を見落とした。

これは「Component SoT」 と「Layout Contract SoT」 が **本来 2 つの SoT であるべき** だったが、 1 つに圧縮された認識の欠落 (本 ADR で R-62 として recurrence-prevention 化)。

### 議論 (Sess72、 6 専門家 + 4 ペルソナ + 業界事例 + WCAG)

- **6 専門家評価**: 純 UX 視点 12:6 で バー型 優位 (テックリード ◎ / QA ◎ / UX ◎ / PM ○ / End User 3/4 ペルソナ ◎ / Security ◎)
- **4 ペルソナ評価**:
  - 高橋 62 (シニア): バー型 ◎ (「文字付きで安心」)、 FAB △ (「+ の意味不明」)
  - 業務プロ (100 鉢): バー型 ◎ (「100 件超リストで最後 2 件が常に隠れる」 を構造解消)
  - Marcus 35 (米国 IT): どちらも ○ (僅差で FAB だが、 ラベル付き Extended FAB へのシフトを支持)
  - ライト (1-2 本): バー型 ○ (「文字付きで安心」)
- **業界トレンド**: Material 3 / Apple HIG / Nielsen Norman 2024 共に「**FAB → ラベル付き / Bottom CTA Bar へのシフト**」 を推奨。 日本市場 (銀行アプリ / PayPay / JR 東日本 / TimeTree 等) はバー型が主流。
- **既存資産整合**: 空状態 (`homeEmptyCta`) で既にバー型「+ 盆栽を登録」 が実装済 → 全画面に展開する設計が文化的に一貫

### 制約 / 前提

- ADR-0020 4 タブ構造 (盆栽 / 予定 / 記録 / ふりかえり) 不変、 ふりかえり tab は CTA バー不要 (ナビゲーション hub)
- ADR-0033 翻訳ポリシー: i18n 値変更 1 key (`addScheduleCta`: 予定を追加 → 予定を登録、 19 言語 native-quality 翻訳)、 ja のみ変更 / en は「Add schedule」 維持を許容
- ADR-0042 既存テスト・E2E (testID `e2e_fab_*`) は `e2e_bottom_cta_*` にリネーム、 Maestro flow は scrollUntilVisible 化で堅牢化
- ADR-0052 dark theme cascade 完走 (main=`9c1db6b` Sess71 時点) と BRAND_GREEN / ON_BRAND token 整合維持
- 依存パッケージ追加禁止 (R-50)、 `useBottomTabBarHeight()` + `useSafeAreaInsets()` + 既存 `useColors()` で達成

---

## Decision（結論）

### Sess72 で 5 sub-decision を統合 (7 PR、 user 全 A 承認)

#### D1: FAB 廃止 + `<BottomCtaBar />` 全画面採用

- **決定**: `<FAB />` component を撤回し、 5 画面 (盆栽 list / bonsai-detail 履歴 / bonsai-detail 予定 / 予定 tab / 記録 tab) で **`<BottomCtaBar />` 共通 component に置換**
- **ふりかえり tab**: 配置しない (ナビゲーション hub のため CTA 不要)、 ただし component の export は維持して将来追加に備える
- **理由**: 6 専門家 + 4 ペルソナで 1 ペルソナ △ なしで全員 ◎ / ○、 業界トレンドと整合、 重なり問題が **構造的に発生不可** (paddingBottom 計算不要)

#### D2: Component 設計 = `<BottomCtaBar />` (Sess73 PR-1 Amendment 反映)

- **新規 component**: `src/components/common/BottomCtaBar.tsx`
  - props: `label: string`, `onPress: () => void`, `accessibilityLabel?: string` (default = label), `testID: string`, `icon?: React.ReactNode` (default `<PlusIcon size={20} color={c.onTint} />`), `disabled?: boolean` (default false)
  - hook: `useColors()` (scheme-aware brand 色取得、 ADR-0052 / R-58 整合)
  - style: **inline 配置** (`position: absolute` 不使用、 R-62 構造解決)、 `paddingHorizontal: 16` / `paddingTop: 8` / `paddingBottom: 8` (wrap)、 **height 64dp** (Sess73 Amendment、 D2 初出 56dp + 旧実装 72dp の drift を 64dp で統一、 親指リーチ最適化 + 圧迫感緩和、 WCAG 2.5.8 余裕クリア)、 `c.tint` bg + `c.onTint` text/icon、 `borderRadius: 14` (既存 emptyCta 整合 pill 寄り)
  - **Multilingual text contract** (Sess73 PR-1 / R-62 拡張): label に `lineHeight: 28` (= fontSize 20 × 1.4、 descender クリアランス確保で en「Register」 / 「Log a care event」 の g 見切れ防止) + `<ThemedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>` (長文言語 ru「Запланировать задачи」 / de / vi 等の overflow 構造解消、 layout 不変で全 19 言語 1 行維持)
- **置換**: 全 4 inline `<FAB />` 利用箇所 + 空状態 (homeEmptyCta) を `<BottomCtaBar ... />` に統一

#### D3: ラベル設計 (i18n 整合)

| #   | 画面                   | ラベル (ja)   | i18n key                           | 値変更                                                                                                             |
| --- | ---------------------- | ------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | 盆栽一覧 (盆栽 tab)    | ＋ 盆栽を登録 | `bonsaiCreateNew` / `homeEmptyCta` | なし                                                                                                               |
| 2   | bonsai-detail 履歴 tab | ＋ 作業を記録 | `eventLogCta`                      | なし                                                                                                               |
| 3   | bonsai-detail 予定 tab | ＋ 予定を登録 | `addScheduleCta`                   | **予定を追加 → 予定を登録** (ja のみ)                                                                              |
| 4   | 予定タブ (画面下)      | ＋ 予定を追加 | `planFabLabel`                     | **一括予定追加 → 予定を追加** (ja のみ、 Sess73 PR-3、 他 18 言語の現訳 (Schedule tasks 等) 維持 = 英訳許容差発動) |
| 5   | 記録タブ (画面下)      | ＋ 作業を記録 | `recordFabLabel`                   | en 未翻訳バグ修正 (Sess72 で 'Log care' 翻訳済)                                                                    |

- **動詞統一方針**: 「**登録 (entity 永続化) / 記録 (event log) / 追加 (関連物 追加)**」 の 3 動詞で統一。 予定 = 登録 はシニア層 (高橋 62) の安心感優先 (R-14 配慮)、 予定 tab の bulk フローでは「予定 を 追加」 で user 自然語彙優先 (Sess73 PR-3)
- **英訳許容差**: `addScheduleCta` ja は「予定を登録」、 en は「Add schedule」 で意訳 (ADR-0033 ターゲット文化への寄せ書き許容)。 `planFabLabel` も ja「予定を追加」 / en「Schedule tasks」 維持で同パターン (Sess73 PR-3 英訳許容差発動)
- **bonsai-multi-select 画面 CTA** (Sess73 PR-3 追加項目): 旧 `bulkLog: '一括記録'` (ja) / `bulkSchedule: '作業を選ぶ'` (ja) → 両 key とも **「次へ」 (動作予告型) 全 19 言語統一**。 旧 18 言語の英語 fallback (`'Log all'` / `'Select task'`) を解消、 各言語 native 翻訳 (de「Weiter」 / ru「Далее」 / vi「Tiếp theo」 等) で ADR-0033 整合

#### D4: ADR-0042 Superseded + 新 ADR-0054 起票

- **決定**: ADR-0042 Status: `Accepted` → `Superseded by ADR-0054` + Notes Amended に「Sess72 で FAB を廃止、 BottomCtaBar に移行」 を追記。 FAB.tsx 削除に伴い ADR-0042 D3 (FAB SoT) は失効、 D1/D2/D4/D5 (タブ icon / lint / Notes Amended) は引き続き有効 (NotebookIcon と check-icon-duplication.mjs は無傷で維持)
- **理由**: 過去判断 (FAB SoT) を「新知見でアップデート」 と明文化、 ADR-0011→0015 / ADR-0013→0039 と同じ Supersede パターン (ADR-0046 D-2 retire 手順準拠)

#### D5: R-62 起票 (再発防止 meta-rule)

- **決定**: `.claude/recurrence-prevention/specialized.md` に **R-62「Component SoT 化時は Layout Contract も同じ ADR で SoT 化必須」** を起票 + 親 `.claude/recurrence-prevention.md` 索引に追加
- **rule 本文**: Component の SoT 化 (例: FAB / BottomSheet / Header / KAV) を ADR で決定する時、 必ず **「その Component を使う画面側の Layout Contract (paddingBottom / margin / safe area / KeyboardAvoiding offset)」 も同じ ADR で SoT 化する**。 Component と Layout Contract は 2 つの SoT として扱う
- **理由**: Sess36 ADR-0042 で FAB SoT は確立したが Layout Contract が漏れた → Sess72 で同型再発を構造防止 (CLAUDE.md §9 ルール準拠、 1 回事故 → 自動化検討)

---

## Decision Drivers

- **Driver 1 (最重要)**: テスター真意「FAB がリストと重なる違和感」 を構造的に解消 (4 ペルソナ ◎ / ○、 ✕ なし)
- **Driver 2**: 構造解決 (Component SoT + Layout Contract SoT の 2 SoT 化) で再発防止、 対症療法回避 (CLAUDE.md §3 + §9 / R-61 meta-rule)
- **Driver 3**: 既存資産活用 (`useBottomTabBarHeight` / `useSafeAreaInsets` / `useColors` / `BRAND_GREEN` / `ON_BRAND` / `homeEmptyCta` 実装パターン)、 依存追加ゼロ (R-50)
- **Driver 4**: ADR-0020 / 0030 / 0037 / 0038 / 0052 整合維持、 i18n 影響最小 (1 key 値変更 + en 1 翻訳バグ修正)、 Maestro testID リネームのみ
- **Driver 5**: Material 3 / Apple HIG / Nielsen Norman 2024 / WCAG 2.2 (SC 2.4.6 / 3.2.4) 準拠
- **Driver 6**: シニアペルソナ (高橋 62) 配慮 = R-14 「専門用語ゼロモード」 と整合する CTA ラベル明文化 (アイコンのみ → 文字付き)

### 粒度 × 4 ペルソナ matrix (ADR template 必須項目)

| 粒度                            | 高橋 62 (シニア) | Marcus 35 (米国 IT) | 業務プロ (100 鉢) | ライト (1-2 本) |
| ------------------------------- | ---------------- | ------------------- | ----------------- | --------------- |
| 個別画面 1 (盆栽 list)          | ◎                | ○                   | ◎                 | ○               |
| 個別画面 2 (bonsai-detail 履歴) | ◎                | ◎                   | ◎                 | ○               |
| 個別画面 3 (bonsai-detail 予定) | ◎                | ○                   | ◎                 | ○               |
| 個別画面 4 (予定 tab)           | ◎                | ○                   | ◎                 | ○               |
| 個別画面 5 (記録 tab)           | ◎                | ◎                   | ◎                 | ○               |
| 全画面整合                      | ◎                | ○                   | ◎                 | ○               |

全 cell ✕ なし、 △ なし。

---

## Alternatives considered

### Option A: BottomCtaBar 全面化 + ADR-0042 Superseded ★採用

- 概要: 上記 Decision の通り
- 良い点: 4 ペルソナ ✕ なし、 重なり問題が構造的に発生不可、 業界トレンド整合、 既存資産流用
- 採用理由: user 真意 + 構造解決の両立、 ✕ なし、 dark theme 完走後で衝突ゼロ

### Option B: FAB 維持 + `useFabContentPadding()` hook + lint 自動化 (元 案 A)

- 概要: FAB は維持、 ScrollView paddingBottom 計算を hook 経由に SoT 化 + `scripts/check-fab-padding.mjs` lint で再発防止
- 良い点: 実装コスト最小 (案 A 3 時間)、 ADR-0042 撤回不要、 i18n / ストアスクショ変更ゼロ
- 悪い点: シニア層 (高橋 62) の「+ アイコンの意味不明」 問題が残存、 業界トレンドに逆行、 paddingBottom 維持の fragile な仕組み
- 却下理由: UX 評価で B (バー型) に 12:6 で敗北、 user 判断で「dark theme 衝突無視で UX 最優先」 方針確定

### Option C: 自動非表示 FAB (auto-hide on scroll) = 元 案 B

- 概要: ScrollView の onScroll で direction 計算、 下スクロール時 FAB を画面外に hide
- 良い点: 案 A よりさらに「重なり感」 が消える、 Material 3 推奨パターン
- 悪い点: animation 実装複雑、 iOS / Android 挙動差、 E2E 検証困難、 discoverability 問題 (見えない CTA)
- 却下理由: 「FAB 自体の文字なし問題」 を解決しない、 v1.1 polish 枠候補

### Option D: Extended FAB (文字付き丸ボタン) = 元 案 H

- 概要: 「+ 記録」 と書かれた pill 型 floating CTA
- 良い点: FAB の floating 感 + 文字発見性の両取り、 Material 3 公式パターン
- 悪い点: 重なり問題は paddingBottom で別途対処必要 (Option B と組合せ前提)、 floating ゆえ画面下端に固定でない
- 却下理由: バー型と比較して構造的解決度で劣る、 user 判断で BottomCtaBar 優先

### Option E: 上部ヘッダーボタン (右上 + ボタン、 Notes app 風) = 元 案 D

- 概要: navigation header 右側に + ボタン
- 良い点: 重なり問題が完全消滅 (bar と list が別領域)
- 悪い点: タブ画面に上部 Stack header が無い (ADR-0053 整合崩壊)、 シニア層 (老眼で右上見えにくい)、 親指届きにくい
- 却下理由: ADR-0053 Navigation Header SoT との整合崩壊、 シニア層 ✕

---

## Consequences

### Positive (嬉しい)

- 5 画面で重なり問題が **構造的に発生不可** (paddingBottom 計算不要、 BottomCtaBar が screen 下端固定で list は bar の上で自然に終わる)
- シニア層 (高橋 62) の「+ の意味不明」 問題が文字ラベルで解消、 R-14 整合
- 業界トレンド (Material 3 / Apple HIG / Nielsen Norman 2024) 最新整合
- 既存資産 (`homeEmptyCta` 実装パターン) の全画面展開で開発・テスト両面で一貫性
- WCAG 2.4.6 / 3.2.4 / 1.3.1 で明確に優位 (テキストラベル直接、 ARIA 設定漏れ防止)

### Negative (辛い / 副作用)

- ストアスクショ (fastlane/metadata) の FAB が映る画面で 19 言語 batch 再撮影 (UI Diff 自動化で対応)
- i18n 値変更 1 key (`addScheduleCta`) × 19 言語 = 19 文字列の手動翻訳 (R-13 / ADR-0033)
- Maestro testID `e2e_fab_*` → `e2e_bottom_cta_*` リネーム (PR-3 で flow 一括更新)
- ADR-0042 D3 (FAB SoT) の失効 → 同 ADR の D1 / D2 / D4 / D5 は維持 (タブ icon / NotebookIcon / lint / Notes Amended)

### Follow-ups (後でやる宿題)

- [ ] ADR-0042 Status を `Superseded by ADR-0054` に更新 (本 PR で実施)
- [ ] `src/components/common/FAB.tsx` 削除 (PR-5、 全置換完了確認後)
- [ ] `docs/reference/design_system.md` §FAB → §BottomCtaBar 改訂 (PR-5)
- [ ] R-62 起票 (本 PR の一部、 D5 で実施) + 親 .claude/recurrence-prevention.md 索引更新
- [ ] ストアスクショ 19 言語 batch 再撮影 (PR-7、 UI Diff 自動化、 kill switch + summary)
- [ ] v1.1 検討: auto-hide on scroll (Option C) を opt-in props で乗せる
- [ ] ふりかえり tab に CTA 機能追加時は本 ADR の component を流用

---

## Acceptance / Tests

### PR-1 完了時

- 本 ADR-0054 merge + ADR-0042 Status: Superseded + R-62 起票
- `pnpm verify` 緑 (docs:lint で ADR 連番チェック通過)

### PR-2 完了時

- `<BottomCtaBar />` component + 単体テスト 5 ケース全 pass:
  - default render (label + onPress + testID)
  - icon override (custom React.ReactNode)
  - showAdBanner=true で bottom 計算に AD_BANNER 加算
  - disabled=true で opacity + bg 変化
  - accessibilityLabel = label fallback
- Jest: `pnpm test BottomCtaBar`

### PR-3 完了時

- 5 画面で `<BottomCtaBar />` 統一使用 (`<FAB />` 残存ゼロ)
- 実機検証 (SH-M25 Dev Build):
  - 短リスト (記録 0〜1 件) で バー画面下固定、 重なりゼロ
  - 長リスト (記録 100 件超 seed) で 最下端スクロール時、 last item がバーに隠れない
  - AdBanner ON 状態 (盆栽 list) で 順序「list → bar → AdBanner → TabBar」
  - iOS Home Indicator (insets.bottom=34) で余白適切
  - Android gesture nav ON/OFF 両方で余白適切
- Maestro 全 flow 緑 (testID `e2e_fab_*` → `e2e_bottom_cta_*` リネーム反映)

### PR-4 完了時

- `addScheduleCta` ja 値「予定を登録」 で 19 言語整合 (en は「Add schedule」 維持許容)
- `recordFabLabel` en 翻訳バグ修正 (現状 ja のまま → 「Log care」 等)
- `pnpm i18n:check` 緑

### PR-5 完了時

- `src/components/common/FAB.tsx` 削除確認 (grep で参照ゼロ)
- `docs/reference/design_system.md` §BottomCtaBar 新設、 §FAB 撤去

### PR-6 完了時

- `.github/PULL_REQUEST_TEMPLATE.md` §7.5 に「BottomCtaBar 配置画面チェックリスト」 追加
- R-62 完成形 (PR-1 起票 + 具体例追加)

### PR-7 完了時

- ストアスクショ 19 言語 batch 再撮影、 FAB が映る画面の旧 SS 削除
- `pnpm metadata:check` 緑

---

## Rollout / Rollback

- **リリース手順**: PR-1 〜 PR-6 全 merged → 次回 Android リリース (`/release-android` Skill) で配信、 PR-7 (スクショ再撮影) は Play Console listing 更新時に反映
- **ロールバック方針**: 全 PR を revert で main から戻せる (FAB.tsx は git history から復元可)、 ストアスクショは旧バージョン保管必須
- **検知方法**: Play Console テスター report / クラッシュ率 / star rating の悪化を 1 週間 monitoring。 重大 regression 検知時は即時 revert + hotfix リリース

---

## Links

- constraints: `docs/reference/constraints.md` (関連章: 5 タブ構造 / FAB 配置)
- reference: `docs/reference/design_system.md` (§FAB → §BottomCtaBar 改訂、 PR-5)
- PR: # (本 ADR の PR、 マージ後に追記)
- Superseded ADR: [ADR-0042](./ADR-0042-tab-icon-and-fab-sot.md) (D3 FAB SoT 失効、 D1/D2/D4/D5 は維持)
- 連動 ADR: ADR-0020 (4 タブ構造) / ADR-0030 (navigation patterns) / ADR-0037 (BADGE_SOFT + KAV) / ADR-0038 (RecordTabScreen) / ADR-0052 (dark theme cascade) / ADR-0033 (翻訳ポリシー)
- 行動 lesson: `.claude/recurrence-prevention/specialized.md` R-62 (新規、 PR-1 で起票)
- 業界 1 次情報: Material 3 / Apple HIG / Nielsen Norman 2024 / WCAG 2.2 (Related 章参照)

---

## Notes

### 議論経緯 (Sess72)

- **議論モード**: `/discuss` (R-13 予告 = 3 ラウンド + 最大 3 質問、 R-16 ADR 上位 SoT 明示、 R-7 議論深さ 3 ラウンド、 R-10 4 ペルソナ評価)
- **6 専門家 + 4 ペルソナ + 業界事例 + WCAG**: バー型 12:6 で FAB に優位
- **Sess36 ADR-0042 撤回の覚悟**: user 判断「dark theme 衝突無視 = 純 UX 視点で再評価」 → バー型確定 → ADR-0042 Superseded + 新 ADR-0054 起票

### R-62 の意義

本 ADR で起票する R-62 は、 ADR-0042 Sess36 当時の **「Component SoT 化したが Layout Contract が漏れた」** という根本原因を構造防止する meta-rule。 R-61 (人間判定 → 機械判定) と並列の meta-rule で、 個別ルール (R-58/59/60) の上位に位置する。

将来 BottomSheet / Header / KAV / Modal 等の Component SoT 化時にも適用される (例: BottomSheet の SoT 化時は、 BottomSheet を開く screen の content padding / scroll behavior / focus management も同じ ADR で SoT 化)。

### Amendments

#### Sess73 2026-06-07 (PR-1 + PR-2 + PR-3 で順次反映)

- **D2 height 統一**: 初出 56dp 記述 + 旧実装 72dp の drift を **64dp** に統一 (PR-1)。 親指リーチ最適化 + 圧迫感緩和、 ADR docs と実装の SoT 整合復元 (R-25 構造系)。
- **D2 Multilingual text contract 追加**: label に `lineHeight: 28` + `numberOfLines={1}` + `adjustsFontSizeToFit minimumFontScale={0.85}` を SoT 化 (PR-1)。 en「Register」 / 「Log a care event」 の descender (g/p/q/y) 見切れ + ru「Запланировать задачи」 / de / vi 等の長文 overflow を構造解消。 R-62 を **「Layout Contract + Multilingual Visual Contract」 の 2 contract に拡張** (PR-1 で specialized.md / design_system.md にも反映)。
- **D3 matrix 更新** (PR-3): `planFabLabel` ja「一括予定追加」 → 「予定を追加」 (ja のみ、 他 18 言語維持 = 英訳許容差発動) + `bulkLog` / `bulkSchedule` 全 19 言語「次へ」 統一 (旧 18 言語英語 fallback 解消、 各言語 native 翻訳に置換)。
- **D5 R-62 拡張版**: typical 項目に「Multilingual text layout」 を追加、 Acceptance test テンプレに「en / de / ru / vi 代表 4 言語の visual smoke (descender + 長文 overflow)」 を必須化 (PR-1 で `.claude/recurrence-prevention/specialized.md` に反映)。
