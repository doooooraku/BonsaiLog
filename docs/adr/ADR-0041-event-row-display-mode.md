# ADR-0041: EventRow 表示モード拡張 (compact/detailed) + 写真 strip + Viewer Modal (Phase η)

- Status: Accepted
- Date: 2026-05-23
- Deciders: @doooooraku
- Related: ADR-0008 (events STI + Valibot payload) / ADR-0011 (記録のみ哲学) / ADR-0024 (modal 一本化、 `presentation:'modal'`) / ADR-0027 (14 種別 form + 写真/日付 共通基盤) / ADR-0030 (Navigation patterns) / ADR-0034 D4-D5 (EventRow 共通化 + 整合性レベル 2、 本 ADR で D4 Notes Amended 拡張) / ADR-0036 D7/D9 (kebab + 重複表示削除、 本 ADR で wiring scheduled_unwire chip 削除整合) / Sess32 discussion (6 専門家チーム + フラット視点 + 4 ペルソナ + 9 件 user 確認) / `docs/reference/functional_spec.md` §23 (F-17 SoT、 本 ADR で contract 追記) / `docs/reference/design_system.md` (EventRow 表示モード matrix 新設予定) / `.claude/recurrence-prevention.md` R-25 (構造系 4→5 項目化、 PR-9 で実施) / 業界 1 次情報 [Nielsen Norman Group "Information Scent"](https://www.nngroup.com/articles/information-scent/) + [Material 3 List](https://m3.material.io/components/lists/overview) + [WCAG 2.1 SC 1.4.3 / 2.5.8](https://www.w3.org/WAI/WCAG21/Understanding/) + [iOS HIG Lists](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables) + [iOS HIG Photos](https://developer.apple.com/design/human-interface-guidelines/images)

---

## Context（背景：いま何に困っている？）

### user 報告 (2026-05-22)

カレンダー画面 (`CalendarTabScreen`、 予定タブ/記録タブ共通) の **「記録 (logged)」 section 展開後の個別 row** が「盆栽名 + 短い memo (2 行打ち切り)」 だけで、 ユーザーが入力した詳細情報 (剪定量・土の種類・写真等) が見えない。 user 真意「**記録した内容をサクッと見れるようにしたい、 ただし入力した情報や画像は消さずに見えるようにしたい**」。

### 構造的な根本問題

- **ADR-0027 投資の表示で活かせない問題**: ADR-0027 (Phase α-γ、 25-40 PR) で 14 種別 form + 写真 + 詳細 payload (`parts[]` / `amount` / `count` / `wire_gauge` / `pot_size` / `soil_mix` / `roots` / `kind` / `product` / `purpose` / `agent` / `dilution` / `trim_range` / `symptom` / `treatment` / `from` / `to`) を実装したが、 表示側 `EventRow.tsx` は ADR-0036 D9「作業名 + 日付 重複削除」 で意図的に最小化された結果、 入力情報の大半が UI で不可視
- **写真の完全非表示**: photos.event_id 紐付け済 (ADR-0027 schema 完備) でも EventRow に写真 render 無し
- **buildHistoryChips の網羅性不足**: 現状 13 種別 (leaf_first_aid 漏れ = 既存 bug)、 各 type で payload field の一部のみ chip 化、 form 拡張 (Sess14 以降) との同期取れていない
- **bonsai-detail history タブも同様問題**: ADR-0034 D4 で EventRow 共通化したため両画面で同時に分かりにくい状態

### 既存 bug 発見

- **leaf_first_aid case 欠落**: `buildHistoryChips.ts` の switch に case 無し → silent fallthrough で chip ゼロ (Sess16 PR-E で `LeafFirstAidPayload` 追加時に同期漏れ)
- **wiring scheduled_unwire_at の二重表示**: `EventRow.tsx` 既存 `WiringPeriodDisplay` + `scheduledUnwireLabel` (line 165-178) と `buildHistoryChips` chip (line 105-107) で同情報が 2 箇所表示 (Sess23-24 で同時実装したまま重複未除去)

### 4 ペルソナ評価 (Sess32 議論、 6 専門家チーム討議)

| 改善                                   | 高橋 62 (シニア) | Marcus 35 (米国 IT) | 業務プロ (100 鉢)      | ライト (1-2 本) | 総合 |
| -------------------------------------- | ---------------- | ------------------- | ---------------------- | --------------- | ---- |
| D1 displayMode (compact/detailed)      | ◎ 詳細安心       | ◎ 標準 IA           | ◎ 100 鉢効率           | ○ 概要派        | ◎    |
| D2 写真 strip 1 枚 + +N badge          | ◎ 視覚記憶       | ○ 標準              | ◎ 樹個体識別           | ◎ 直感          | ◎    |
| D3 写真 Viewer modal (swipe)           | ◎ 拡大安心       | ◎ iOS Photos 整合   | ◎ 細部確認             | ○               | ◎    |
| D4 chips max 4 + +N sentinel           | ○ 整理           | ◎ 情報密度          | ○ もっと欲しい         | ◎ シンプル      | ○    |
| D5 memo 3 行 + 「もっと見る」          | ◎ 老眼配慮       | ○                   | ◎ 業務情報量           | ○               | ◎    |
| D6 時刻 HH:mm 非表示                   | ○                | ○                   | △ あったほうが         | ◎               | ○    |
| D7 planned compact 維持                | ○                | ◎ 機能整合          | ◎ 100 鉢 record 主目的 | ◎               | ◎    |
| D8 bonsai-detail history 同時 detailed | ◎ 一貫性         | ◎ DRY               | ◎                      | ○               | ◎    |
| D9 wiring chip 重複 fix                | ○                | ◎                   | ◎                      | ○               | ◎    |

**✕ なし**、 △ 1 件 (業務プロ D6) は WiringPeriodDisplay 等の文脈情報で補完。

### 制約 / 前提

- ADR-0011 (記録のみ哲学): row は user 入力の忠実な再現、 AI 提案ゼロ
- ADR-0027: 写真は `photos.event_id` 紐付け済、 14 種別 payload は JSON 保存
- ADR-0034 D4: 整合性レベル 2 を **本 ADR で displayMode 値を含めて pixel 整合に拡張** (Notes Amended)
- ADR-0036 D9: 「作業名 + 日付重複削除」 を vehicle、 時刻も同様に非表示で貫徹
- 依存パッケージ追加禁止 (R-50 cross-feature import 観点): 既存 expo-image + react-native-reanimated + FlatList horizontal で達成
- `events` / `photos` schema 不変 (forward-only)

---

## Decision（決めたこと：結論）

### Phase η で 9 sub-decision を統合 (9 PR、 user 全 A 承認)

#### D1: `EventRow` に `displayMode: 'compact' | 'detailed'` prop を追加

- **決定**: `src/features/event/EventRow.tsx` の `EventRowProps` に `displayMode?: 'compact' | 'detailed'` を追加 (default = `'compact'`、 既存 callsite 後方互換)。 `detailed` 時のみ写真 strip + chips フル + memo 3 行 + 「もっと見る」 リンクを render。 既存の bonsai 名 / kebab / actionButton / wiring period 表示は両モード共通
- **理由**: EventRow contract に「概要 row 一辺倒」 仮定があり、 user 期待「展開後は詳細」 を満たせない。 mode 抽象化で 1 component 内で表現差を吸収、 整合性レベル 2 (ADR-0034 D4) を維持

#### D2: 写真 strip (1 枚 + 残枚数 +N badge)

- **決定**: `src/features/event/EventRowPhotoStrip.tsx` 新設。 props = `{ photo: PhotoRead | null, remainingCount: number, onPress: () => void, testID?: string }`。 写真 0 件時は条件 render で非表示。 thumbnail 80×60px (aspectRatio 4:3、 PhotoField token 流用)、 残枚数 +N badge は右下重ね (BADGE_SOFT_BG)
- **理由**: row 内に複数枚並べると視線分散、 1 枚に集約 + tap で Viewer 展開が iOS Photos.app + Material 3 List with leading thumbnail 整合
- **影響**: `photoRepository` に `getRepresentativePhotoByEventId(eventId)` 追加 (is_cover 優先 → 先頭 fallback)。 旧 logged events (event_id 未紐付け) は Strip 非表示

#### D3: 写真 Viewer Modal (`app/(modals)/photo-viewer.tsx`、 swipe 対応)

- **決定**: `expo-router` modal stack に `photo-viewer` 追加 (`presentation: 'modal'`、 ADR-0024 整合)。 URL param: `?eventId=<id>&initialIndex=<n>`。 内部実装は `FlatList horizontal pagingEnabled` + `expo-image` (`priority="high"` + 前後 1 枚 preload)。 BG は **常時 black** 維持 (theme token 経由禁止、 iOS Photos.app 整合)。 swipe で event 紐付け全写真切替、 close は Stack header の戻るボタン
- **理由**: 既存 expo-router modal 8 画面 pattern と整合、 Android back キーで自動 close、 URL deep-link 将来性確保
- **影響**: `photoRepository.getAllPhotosByEventId(eventId)` 新規追加。 `react-native-pager-view` 等の新規依存追加なし (R-50 整合)
- **A11y**: `accessibilityRole="image"` + `accessibilityLabel` (caption or `t('photoViewerIndexOfTotal').replace('{i}', String(i+1)).replace('{n}', String(n))`) + `accessibilityActions=[{name:'increment'},{name:'decrement'}]`

#### D4: chips max 4 + 「+N」 sentinel + buildHistoryChips 14 種別フル網羅

- **決定**:
  1. `HistoryChipRow` に `maxVisible?: number` prop 追加 (default = undefined = 制限なし)。 detailed 時に `maxVisible={4}` を渡し、 超過は末尾「+N」 chip で sentinel
  2. `buildHistoryChips.ts` を 14 種別フル網羅化:
     - 既存 13 種別の chip 拡張 (pruning に `parts[]` + `amount` 反映、 repotting に `roots` + `pot_size` 反映、 candle_cut に `count` 反映、 pest_control に `dilution_ratio` 反映、 fertilizing に `product` 反映 等)
     - **leaf_first_aid 新規 case** (`symptom` + `treatment` の i18n key 解決)
     - **wiring の `scheduled_unwire_at` chip を削除** (D9 整合)
     - exhaustive switch with `never` assertion で type 漏れを compile error 化
  3. `payloadLabels.ts` に新規 enum 値追加 (該当時)、 i18n 19 言語に key 追加
- **理由**: ADR-0027 投資の表示活用、 chip 数の上限で row 高さ暴走防止
- **影響**: `__tests__/features/event/buildHistoryChips.test.ts` を 14 ケース新規作成 (各 type で payload full + payload empty + edge case)

#### D5: memo 3 行 + 「もっと見る」 リンク

- **決定**: detailed 時に memo `numberOfLines={3}` 化 (現状 2)。 末尾 ellipsis (...) 表示時は同 row 内に `t('eventRowReadMore')` (「もっと見る ▶」) リンクを表示、 tap で `router.push('/(tabs)/bonsai/[id]?tab=history')` (row tap と同一遷移先で混乱防止)
- **理由**: 業務プロ「100 鉢/日詳細記録」 で memo が長文化、 2 行打ち切りでは要旨見えず。 3 行は Material 3 List で「primary + secondary + supporting」 の 3 行 pattern と整合
- **影響**: i18n 1 key (`eventRowReadMore`) × 19 言語 = 19 文字列追加

#### D6: 時刻 HH:mm 非表示 (ADR-0036 D9 貫徹)

- **決定**: detailed mode でも時刻表示しない。 ADR-0036 D9「作業名 + 日付」 削除と同じ思想で「同 row 内重複情報排除」、 時刻は `WiringPeriodDisplay` 等の文脈情報や bonsai-detail history タブの詳細表示に委譲
- **理由**: 4 ペルソナで業務プロ △ あったが、 WiringPeriodDisplay 等の文脈情報 + bonsai-detail での詳細確認動線で補完可能。 シンプル維持を優先

#### D7: planned (予定) row は compact 維持 (logged のみ detailed)

- **決定**: `CalendarTabScreen.tsx` の planned section EventRow callsite は `displayMode='compact'` (default のため明示不要)、 logged section のみ `displayMode='detailed'` を渡す
- **理由**: planned は作業前で写真・詳細 payload は通常未入力 (空 chips + 空 strip = 視覚ノイズ)。 planned section の主目的は「全 N 件を記録」 button (ADR-0038 D3) の即時 conversion 動線

#### D8: bonsai-detail history タブも同時 detailed 移行 (整合性レベル 2 維持)

- **決定**: `app/(tabs)/bonsai/[id]/index.tsx` の history タブ EventRow callsite 2 箇所 (連続日 group + single event) に `displayMode='detailed'` を渡す。 ADR-0034 D4「PlanScreen ⟷ bonsai-detail で同一 event 表示が pixel 整合」 を本 ADR で **「displayMode 値を含めて pixel 整合」 に範囲拡張** (D4 Notes Amended)
- **理由**: 整合性レベル 2 維持、 user 視点で「同 event が 2 画面で同じ見た目」 確保
- **影響**: bonsai-detail history タブは旧来「日付軸の流し読み」 用途だったが、 detailed 化で row 高さ拡大 + 写真表示。 1 画面 2-3 row しか入らなくなるが、 user 確認済 (4 件目回答「OK 詳細優先」)

#### D9: wiring の `scheduled_unwire_at` chip 削除 (既存重複 bug fix)

- **決定**: `buildHistoryChips.ts` の wiring switch 内の `scheduled_unwire_at` chip 化を削除 (line 105-107 相当)。 同情報は `EventRow.tsx` 既存 `WiringPeriodDisplay` + `scheduledUnwireLabel` で表示済
- **理由**: ADR-0036 D9「重複表示削除」 と整合、 同情報の 2 箇所表示は user 認知ノイズ
- **影響**: wiring row では「wire_gauge」「wire_parts」 chip + WiringPeriodDisplay (週数) + scheduledUnwireLabel (日付) の組合せに整理

---

## Decision Drivers（判断の軸：何を大事にした？）

- **Driver 1 (最重要)**: user 真意「サクッと見れる + 入力情報・画像も見える」 達成 (4 ペルソナ ◎/○ 全員)
- **Driver 2**: ADR-0027 投資 (14 種別 form + 写真) の表示活用、 Pro 訴求材料 (PDF 出力 ADR-0010 連携時の詳細項目反映)
- **Driver 3**: ADR-0034 D4 整合性レベル 2 維持 (bonsai-detail history タブ同時改修で範囲拡張)
- **Driver 4**: 既存 ADR-0036 D9 / D7 思想との整合 (重複削除 / kebab pattern)
- **Driver 5**: 依存パッケージ追加ゼロ (R-50 cross-feature import 整合)、 既存 expo-image + react-native-reanimated + FlatList で達成

### 粒度 × 4 ペルソナ matrix (R-44 由来、 破壊的操作 ADR 必須項目を本 ADR は「表示拡張」 だが念のため適用)

| 粒度              | 高橋 62 (シニア)             | Marcus 35 (米国 IT) | 業務プロ (100 鉢) | ライト (1-2 本)  |
| ----------------- | ---------------------------- | ------------------- | ----------------- | ---------------- |
| 個別 row (logged) | ◎ 詳細安心                   | ◎ 標準 IA           | ◎ 100 鉢効率      | ○ 詳細不要派あり |
| group (まとめ ▼)  | (本 ADR scope 外、 既存維持) | (同)                | (同)              | (同)             |
| bulk (全選択)     | (本 ADR scope 外、 該当なし) | (同)                | (同)              | (同)             |

「個別 row のみ拡張」 で group / bulk への影響は意図的に除外、 group は「件数把握」 役割で row 拡張不要 (ADR-0034 D7 件数 listing と整合)。

---

## Alternatives considered（他の案と却下理由）

### Option A: EventRow 拡張 (displayMode prop) ★採用

- 概要: 上記 Decision の通り
- 良い点: 4 ペルソナ全員 ◎/○、 ADR-0034 D4 整合維持、 実装コスト中、 依存追加なし
- 採用理由: ✕ なし、 整合性 + 投資活用 + シンプル維持を満たす唯一の案

### Option B: EventRow とは別の `EventDetailedRow` 新設

- 概要: detailed 用に別 component、 EventRow は compact 専用維持
- 良い点: 用途別最適化、 EventRow に prop 増えない
- 悪い点: コード重複 (写真 / chips / memo / kebab logic を 2 component で書く)、 ADR-0034 D4「整合性レベル 2」 を「2 component で pixel 整合」 にする必要、 保守コスト 2 倍
- 却下理由: ADR-0034 D4 違反、 DRY 違反、 ADR-0040「FormScreenHeader 構造統一」 と同じ「散らかった構造」 を再生産

### Option C: row 現状維持 + tap で詳細モーダル

- 概要: row は変えず tap で全画面 modal (写真ギャラリー + 全 payload + memo full)
- 良い点: 実装コスト最小 (3-5 PR)、 整合性レベル 2 完全維持
- 悪い点: 「サクッと見たい」 = タップ無しで詳細見える の user 真意未達 (もう 1 タップ要)、 ADR-0027 投資の表示価値露出が控えめ
- 却下理由: エンドユーザー代表 ◎ から △ に降格、 ROI 低

### Option D: 2 段階展開 (group ▼ 後、 row tap で行内 inline 展開)

- 概要: row tap = bonsai-detail 遷移 を撤回 + 行内詳細展開に置換
- 良い点: 段階的詳細表示で初期表示は軽い
- 悪い点: ADR-0030 D2 (navigation patterns) 影響大、 row tap 動作変更で user 混乱、 ADR-0034 D4 行内構造大幅変更
- 却下理由: navigation pattern 安定性優先、 ADR-0030 違反

---

## Consequences（結果：何が変わる？）

### Pro

- カレンダー記録 row + bonsai-detail history で「サクッと見れる + 入力情報・画像も見える」 達成
- ADR-0027 投資 (14 種別 form + 写真) が表示で活かされ、 Pro 訴求 (PDF 出力 ADR-0010 連携) の素材に
- `buildHistoryChips` の 14 種別フル網羅で `leaf_first_aid` silent bug 解消
- wiring scheduled_unwire の 2 箇所表示 (既存 bug) 解消、 ADR-0036 D9 整合
- EventRow contract に「表示モード matrix」 が SoT 化 (恒久策 1)
- ESLint `switch-exhaustiveness-check` 強制で新規 EventType 追加時の chip 漏れを build error 化 (恒久策 3)

### Con

- row 高さ 80-100px → 180-220px (約 2 倍)、 1 画面に 2-3 row しか入らない (user 確認済「OK」)
- i18n 19 言語 × 新規 enum 値 (推定 5-15 keys × 19 lang ≒ 95-285 文字列) を手動翻訳 (ADR-0033 workflow)
- 旧 logged events (`photos.event_id` 未紐付け) で写真不表示、 ADR-0041 §Migration 明記 (FAQ 不要)
- 9 PR の Phase 分割で 3 段階の user 承認待ちが入る (PR 進行は速度より丁寧さ優先)

### Follow-ups（後でやる宿題）

- [ ] PR-7 実機 SS 検証 (R-25 構造系 5 項目目「EventRow 表示モード」 適用)
- [ ] PR-8 functional_spec §23 + design_system §X EventRow contract SoT 改訂
- [ ] PR-9 PR テンプレ §7.5 R-25 4 → 5 項目化 + ESLint exhaustiveness 有効
- [ ] R-52 候補「list row 表示拡張時の visible-by-default 行高制約 max 220px」 を Phase η lessons から構造化検討
- [ ] memo「もっと見る」 リンクで bonsai-detail 遷移後の当該 event highlight scroll (`?highlightEventId=xxx`) は別 Issue 化 (scope creep 防止)

---

## Implementation（実装メモ）

### Phase 分割 (3 段階、 9 PR)

| Phase     | PR   | 作業                                                                                                                                    |
| --------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 🟢 1 設計 | PR-1 | 本 ADR 起票 + ADR-0034 D4 Notes Amended                                                                                                 |
| 🟢 1 設計 | PR-2 | buildHistoryChips 14 種別フル網羅 + leaf_first_aid bug fix + wiring chip 削除 + unit test 14 ケース + payloadLabels 拡張 + i18n 19 言語 |
| 🟡 2 実装 | PR-3 | photoRepository に getRepresentativePhotoByEventId + getAllPhotosByEventId 追加                                                         |
| 🟡 2 実装 | PR-4 | EventRowPhotoStrip + (modals)/photo-viewer.tsx 新規                                                                                     |
| 🟡 2 実装 | PR-5 | EventRow に displayMode prop 追加 + HistoryChipRow maxVisible prop 追加                                                                 |
| 🟡 2 実装 | PR-6 | 全 EventRow callsite を detailed mode へ (CalendarTabScreen + bonsai-detail history)                                                    |
| 🔵 3 検証 | PR-7 | 実機 SS 検証 (R-25 構造系 5 項目)                                                                                                       |
| 🔵 3 検証 | PR-8 | functional_spec §23 + design_system EventRow contract SoT 改訂                                                                          |
| 🔵 3 検証 | PR-9 | PR テンプレ §7.5 R-25 5 項目化 + ESLint switch-exhaustiveness-check                                                                     |

### Migration Strategy

- **旧 logged events (`photos.event_id` NULL)**: PhotoStrip は写真 0 件として条件 render 非表示。 同写真は bonsai 単位で `photos` table に既存し bonsai-detail 写真機能から参照可。 FAQ 不要
- **旧 payload (validator strict 化前)**: `safeParsePayloadJson` で fallback null → chip 空配列 → strip と同様 graceful degradation

### Design Tokens (PhotoField 流用)

- Strip thumbnail: `aspectRatio: 4/3`、 `borderRadius: 8`、 backgroundColor `BG_SURFACE`、 border `BORDER_DEFAULT`
- +N badge: `BADGE_SOFT_BG` + `BADGE_SOFT_TEXT` (既存 token、 ADR-0037 BADGE_SOFT)
- Viewer BG: 常時 `#000000` (dark mode token 経由禁止、 iOS Photos.app 整合)
- 「もっと見る」 リンク: `TEXT_SECONDARY` + `fontSize: 11` (chip と同 size)、 underline なし、 ▶ icon 併用

### testID 命名規約

- `e2e_event_row_photo_strip_<eventId>` (Strip root)
- `e2e_event_row_photo_strip_image_<eventId>` (Image tap target)
- `e2e_event_row_photo_strip_badge_<eventId>` (+N badge)
- `e2e_event_row_read_more_<eventId>` (「もっと見る」 link)
- `e2e_photo_viewer_image_<index>` (Viewer 内 image)
- `e2e_photo_viewer_close` (戻るボタン、 Stack header 自動)

### A11y

- Strip: `accessibilityRole="image"` + `accessibilityLabel="t('photoStripAccessibility').replace('{count}', String(total))"` (例:「写真 5 枚、 タップで拡大」)
- 「もっと見る」: `accessibilityRole="link"` + `accessibilityLabel="t('eventRowReadMoreAccessibility')"` (例:「メモ全文を表示」)
- Viewer: `accessibilityRole="image"` + caption + index/total + `accessibilityActions=[{name:'increment'},{name:'decrement'}]` で VoiceOver swipe 操作対応

---

## Acceptance / Tests（合否：テストに寄せる）

### Phase 1 完了時

- `pnpm verify` 緑
- `pnpm test __tests__/features/event/buildHistoryChips.test.ts` で 14 種別カバレッジ + exhaustive switch + leaf_first_aid case 存在
- `pnpm i18n:check` で 19 言語 key 漏れなし
- 本 ADR (ADR-0041) + ADR-0034 D4 Notes Amended の merge

### Phase 2 完了時

- 実機 (Android Dev Build) で:
  - 記録タブ展開後 row に写真 1 枚 + chips + memo 3 行 が表示される
  - 写真 tap で PhotoViewerModal 開く、 swipe で event 紐付け全写真切替
  - 「もっと見る」 tap で bonsai-detail 遷移
  - planned row は compact 維持 (写真・chips 拡張なし)
  - bonsai-detail history タブも detailed 化、 整合性レベル 2 維持
- iOS / Android 両方で写真描画 OK
- 写真欠落 / payload 空 / memo 空 / 旧 event のいずれでも崩れない

### Phase 3 完了時

- Maestro flow (該当 flow) 通過
- `scripts/ui-diff/` で 14 種別 SS + RMSE がベースライン以内
- functional_spec §23 + design_system EventRow contract SoT 反映
- PR テンプレ §7.5 R-25 5 項目化、 ESLint exhaustiveness 有効

---

## Notes Amended (随時更新)
