# ADR-0034: 作業カレンダー UX 改善 Phase δ (凡例 + アイコン併用 + 粒度作業別 + EventRow 共通化 + ふりかえりハブ + 仕様 SoT)

- Status: Accepted
- Date: 2026-05-21
- Deciders: @doooooraku
- Related: ADR-0011 (記録のみ哲学) / ADR-0020 (Claude Design) / ADR-0025 (4 タブ構成、 §⑤ ふりかえり hub 拡張) / ADR-0030 (Navigation patterns) / ADR-0031 (カレンダー統一動線 + stale closure 撲滅) / ADR-0032 (planned/logged 視覚区別、 本 ADR D3 で D1 アイコン併用 Notes Amended) / ADR-0033 (i18n 翻訳ポリシー) / Sess22 議論 (6 専門家チーム + フラット視点 + 4 ペルソナ全員 ◎/○、 user 全 A 推薦案承認) / `docs/reference/functional_spec.md` §23 (本 ADR で新設、 F-17 作業カレンダー SoT) / `.claude/recurrence-prevention.md` R-42 (本 ADR 同時起票、 WCAG 1.4.1 色 + アイコン併用ルール) / 業界 1 次情報 [Eleken Calendar UI](https://www.eleken.co/blog-posts/calendar-ui) + [UX Patterns Dev Calendar](https://uxpatterns.dev/patterns/data-display/calendar) + [Page Flows Calendar Design](https://pageflows.com/resources/exploring-calendar-design/)

---

## Context（背景：いま何に困っている？）

### ADR-0031/0032 達成後の残課題 4 件

Sess19 ADR-0031 で「保存後の遷移先をカレンダーに統一」、 Sess19-2 ADR-0032 で「planned/logged を色で区別 (logged=BRAND_GREEN 緑 / planned=ACCENT_BARK 茶) + listing section 分割」 を実装。 しかし Sess22 議論 + 4 ペルソナ評価 + 業界 1 次情報調査で 4 つのギャップ判明:

1. **WCAG 1.4.1 (Use of Color) 違反**: planned/logged を **色のみ** で区別。 色覚多様性 (赤緑色覚異常 = 男性 8%) + シニア老眼 + 屋外モード視認性で識別不能。 業界 1 次情報「Do not rely on color alone to convey severity, completion, or selection state. Should be backed by pattern or icon differentiation for color-blind users」 (UX Patterns Dev) と非整合
2. **凡例 (Legend) 不在**: dot の緑/茶/「+」 が何を意味するか初見 user に伝わらない。 業界 best practice「Highlighting important dates with color codes or icons」「focus shifts to time formats, **legend** and color coding」 (Eleken) 違反
3. **ドット粒度 = 盆栽 × 作業件数**: 現状 `dotsByDay` は events.length ベースで「同日 watering 5 鉢」 だと dot 5 個。 user 真意「複数盆栽でも 1 作業なら ・ 1 個」 (作業の有無 = unique by type) と齟齬
4. **listing row の重複実装**: PlanScreen 内の eventCard (line 386-422, 472-503) と bonsai-detail history の `EventSingleRow` (line 1028-1108) が別実装、 一貫性欠如 + 保守コスト 2 倍

### 副次的課題 2 件

5. **ふりかえりタブからの「過去軸」 ハブ不在**: 下タブ Calendar は「今日中心の月ナビ」、 ふりかえりタブの 4 card (water/wiring/search/tags) には「いつ何をしたか日付軸で振り返る」 入口が欠落。 「ふりかえり = 振り返り + 整理」 (Sess9 PR-6 ADR-0025 §⑤ Notes Amended で意義拡張) 文脈で過去軸 hub が自然な拡張
6. **functional_spec カレンダー画面 SoT 欠落**: §3 機能マップに「カレンダー (F-XX)」 が無く、 仕様は ADR-0031/0032 に分散。 R-2 「履歴は ADR、 仕様は spec」 違反気味。 §22 (画面遷移マップ) 直後の新 §23 として F-17 SoT 整備が必要

### 4 ペルソナ評価 (Sess22 議論)

| 議題                              | 高橋 62 (シニア老眼) | Marcus 35 (米国 IT) | 盆栽園プロ                      | ライト (1-2 本) | 総合              |
| --------------------------------- | -------------------- | ------------------- | ------------------------------- | --------------- | ----------------- |
| ① 凡例 collapsible + アイコン併用 | ◎ 色弱配慮 + 安心    | ○ 業界標準          | ◎ 100鉢で誤認防止               | ◎ 直感性        | ◎                 |
| ② ドット粒度 = 作業別 unique      | ○ シンプル化歓迎     | ◎ Notion 整合       | △ 件数情報欠落 → listing で補強 | ◎ シンプル      | ○                 |
| ③ 色 + アイコン併用 (●/○)         | ○                    | ○                   | ◎                               | ◎               | ◎                 |
| ④ EventRow 共通化                 | ◎ 一貫性             | ◎ DRY               | ◎                               | ○               | ◎                 |
| ⑤ ふりかえり hub 5 card 目        | ○ 入口増             | △ 二重動線          | ○                               | ◎ 発見性        | ○                 |
| ⑥ functional_spec §23 F-17 新設   | —                    | —                   | —                               | —               | (Doc 改善、 全 ◎) |

**✕ なし** → 全議題実装方向で安全。 (△ 2 件は緩和策併設)

### 制約 / 前提

- ADR-0031 (Sess19) 統一動線 + Sess19 stale closure 4 重防御 (R-39 + AP-3 + Maestro + PR テンプレ) 維持
- ADR-0032 (Sess19-2) section 分割 (planned/logged) + 期限切れ警告色維持
- `events` / `photos` schema 不変 (forward-only)
- ADR-0033 (Sess20/21) i18n 18 言語手動翻訳 workflow 整合 (`scripts/i18n/apply-translation.mjs` Sess20/21 multi-line 対応済)
- ADR-0025 §⑤ ふりかえり hub 拡張は Sess9 PR-6 「タグを管理」 4 card 目追加で前例あり

---

## Decision（決めたこと：結論）

### 7 sub-decision を 1 ADR に統合

#### D1: カレンダー凡例 collapsible Legend bar 追加 + 永続化

- **決定**:
  1. 月選択 row と DOW header の間に **collapsible Legend bar** を配置 (ScrollView 内で共に流れる)
  2. 凡例内容 (4 行):
     - **● 完了**: BRAND_GREEN filled 円 + `t('planLegendDotLoggedLabel')`
     - **○ 予定**: ACCENT_BARK outline 円 + `t('planLegendDotPlannedLabel')`
     - **+ 複数作業**: `t('planLegendDotMultipleLabel')` (4 種以上 unique で表示される「+」 説明)
     - 期限切れ planned: ADR-0032 D3 整合で TEXT_MUTED 薄表示 (本 ADR では凡例 row 化保留、 v1.x 検討)
  3. **永続化**: `useSettingsStore.calendarLegendCollapsed: boolean` (default `false` = 初回展開)、 既存 Zustand persist middleware で自動 AsyncStorage 永続化
  4. **新規 component**: `src/features/plan/CalendarLegend.tsx` (props: `{ collapsed: boolean, onToggle: () => void }`)
  5. testID: `e2e_plan_legend` (root) / `e2e_plan_legend_toggle` (Pressable) / `e2e_plan_legend_item_<type>` (各 row)

#### D2: ドット粒度を「作業別 unique (Set<EventType>)」 に変更

- **決定**:
  1. **純関数化**: `src/features/plan/dotsByDay.ts` 新規:
     ```ts
     export type DotsByDay = Map<
       string,
       { plannedTypes: Set<EventType>; loggedTypes: Set<EventType> }
     >;
     export function computeDotsByDay(events: Event[], tzOffsetMin: number): DotsByDay;
     ```
  2. 同日 watering ×3 (異なる bonsai) → `loggedTypes = Set(['watering'])` で size 1 (旧 logic では 3 件 → dot 3 個)
  3. render 修正: `loggedTypes.size` ベース、 「+」 閾値 = `(plannedTypes.size + loggedTypes.size) > 3`
  4. PlanScreen `dotsByDay` useMemo を純関数呼出に置換
  5. unit test 5 case (`dotsByDay.test.ts`): 同日複数同 type / 混在 / 4+ / 空 / TZ 跨ぎ
  6. **件数情報損失への対処** = D7 listing 補完で吸収

#### D3: dot に色 + アイコン併用 (logged=● filled / planned=○ outline) — WCAG 1.4.1 解消

- **決定**:
  1. **新規 component**: `src/features/plan/CalendarDot.tsx` (props: `{ status: 'planned' | 'logged', size?: number }`、 default size 6px)
  2. logged: 塗りつぶし円 (背景 BRAND_GREEN、 borderRadius = size/2)
  3. planned: outline 円 (背景 transparent、 borderWidth 1px、 borderColor ACCENT_BARK、 borderRadius = size/2)
  4. PlanScreen の dot render block を `<CalendarDot status="logged" />` / `<CalendarDot status="planned" />` 化、 legacy `styles.dotLogged` / `styles.dotPlanned` / `styles.dot` 削除
  5. cell `accessibilityLabel` 拡張: `${d}日, 完了 N 件, 予定 N 件`
  6. **ADR-0032 D1 Notes Amended**: 色のみ → 色 + アイコン併用に拡張 (本 PR で同時改訂)

#### D4: PlanScreen listing で bonsai-detail history の EventRow を流用 (整合性レベル 2)

- **決定**:
  1. 既存 PlanScreen の eventCard render (line 386-422, 472-503) を `<EventRow />` 呼出に置換
  2. 同日 type 内 events を `EventRow` で展開 = bonsai-detail history の row 表現と完全一致 (PlanScreen ⟷ bonsai-detail で同一 event 表示が pixel 整合)
  3. **連続日 stack (`groupContinuousEvents` 流用) は本 ADR では PlanScreen 適用せず**: PlanScreen は「選択日」 中心 listing で連続日跨ぎは意味薄、 既存 expandedTypes pattern (Sess19-2 D2 section 内 type 別 group) を維持し row format のみ統一
  4. wiringDuration / scheduledUnwireLabel 計算は EventRow props `eventsForBonsai` に **全期間 events を bonsai 単位 filter** して注入 (短絡防止、 D5 で props 設計)

#### D5: EventRow を src/features/event/EventRow.tsx に共通化

- **決定**:
  1. 既存 `EventSingleRow` (bonsai-detail/[id]/index.tsx line 1028-1108) を `src/features/event/EventRow.tsx` に export 化
  2. props 拡張:
     ```ts
     type EventRowProps = {
       ev: Event;
       eventsForBonsai: Event[]; // 該当 bonsai の全期間 events (wiring 判定用)
       bonsaiName?: string; // PlanScreen で使用
       lang: string;
       t: (key: TranslationKey) => string;
       onLongPress?: (ev: Event) => void; // bonsai-detail で delete confirm
       onPress?: (ev: Event) => void; // PlanScreen で router.push
       indent?: boolean;
       showBonsaiName?: boolean; // PlanScreen=true / bonsai-detail=false
     };
     ```
  3. 旧 `EventSingleRow` 定義削除、 `import { EventRow } from '@/src/features/event/EventRow'` で置換
  4. unit test 6 case (`EventRow.test.tsx`): wiring 期間 (within/overdue/unwired) / scheduledUnwire / note / showBonsaiName / onLongPress / chip row

#### D6: ふりかえりタブ hub に 5 card 目「カレンダー」 追加 (過去軸 default)

- **決定**:
  1. `app/(tabs)/look-back/index.tsx` の cards 配列に 5 entry 目を 2 番目に挿入 (履歴系を連続配置、 順序: watering / **calendar** / wiring / search / tags)
  2. card key: `'calendar'`、 title: `t('lookBackCardCalendarTitle')` (「カレンダー」)、 subtitle: `t('lookBackCardCalendarDesc')` (「月ごとに過去の作業を振り返る」)
  3. onPress: `router.push('/(tabs)/plan?selectedDateKey=<past30dKey>')` (過去 30 日 default で「過去軸」 入口と差別化)
  4. `src/features/look-back/computePast30DaysKey.ts` 新規 (TZ 跨ぎ test 付き)
  5. CalendarIcon: 既存 TabBar で使用中の `src/components/icons.tsx CalendarIcon` を再利用
  6. testID: `e2e_look_back_card_calendar` (既存 pattern `e2e_look_back_card_<key>` で自動生成)
  7. **ADR-0025 §⑤ Notes Amended**: 4 card → 5 card 拡張 (Sess9 PR-6 と同じ拡張 pattern)

#### D7: 件数情報損失への listing 補完「×N 鉢」

- **決定**:
  1. PlanScreen groupRow (現 line 370-374, 461-465) で `events.length === uniqueBonsaiCount` 判定
  2. 異なる場合のみ補完表示: `t('planListingBonsaiCount').replace('{count}', String(uniqueBonsaiCount))` で「×3 (3 鉢)」 等表示
  3. accessibilityLabel 同様補完: `${groupLabel} ${events.length} 件 ${uniqueBonsaiCount} 鉢, ${toggleText}`
  4. 業務プロ「同日 5 鉢の watering」 が dot 1 個でも listing で件数把握可能

#### D8: functional_spec.md に新 §23 F-17 作業カレンダー SoT 新設 + R-42 起票

- **決定**:
  1. `docs/reference/functional_spec.md` §3 機能マップ表に `| F-17 | 作業カレンダー | §23 |` 行追加
  2. 既存 §23 (Deep Link) → §24 / 既存 §24 (エラーコード) → §25 に shift、 新 §23 を挿入
  3. 新 §23 構成 (8 サブセクション): 目的 / 画面 / 入口 / 期待動作 (凡例 + dot + listing + section + section 内 group) / 境界値 / エラー / 受入条件 / 対応テスト / 関連 ADR
  4. 外部参照 grep: `grep -rn "functional_spec.md#§23\|§24" docs/` で hit 修正
  5. **R-42 新規** (`.claude/recurrence-prevention/specialized.md`): 「色で意味を伝える UI 設計時、 アイコン or pattern を必ず併用 (WCAG SC 1.4.1、 Level A)」 (本 ADR D3 由来、 別 PR で起票)

### 既存 ADR との整合

- **ADR-0011** (記録のみ哲学): 凡例は情報補強のみ、 「○○すべき」 干渉なし → 整合
- **ADR-0025** (4 タブ構成): §⑤ ふりかえり hub Notes Amended (4 → 5 card)
- **ADR-0030** (Navigation patterns): 影響なし (deep link `selectedDateKey` は既存)
- **ADR-0031** (カレンダー統一動線): 影響なし、 統一動線維持
- **ADR-0032** (planned/logged 区別): D1 Notes Amended (色のみ → 色 + アイコン併用)
- **ADR-0033** (i18n ポリシー): 9 keys × 19 言語 = 171 文字列を D1 ペルソナ手動翻訳で追加 → 整合

---

## Decision Drivers（判断の軸：何を大事にした？）

- **Driver 1 (最重要)**: WCAG 1.4.1 (Use of Color、 Level A) 達成 = 色覚多様性 + シニア老眼 + 屋外モード視認性向上
- **Driver 2**: 4 ペルソナ全員 ◎/○ (✕ なし、 △ は緩和策併設で吸収)
- **Driver 3**: 業界 1 次情報整合 (Eleken / UX Patterns Dev / Page Flows / Muzli の calendar best practice)
- **Driver 4**: 既存 ADR-0031/0032/0033 達成資産を **拡張のみで保護** (refactor 除き UI/動線/i18n の壊し変更ゼロ)
- **Driver 5**: 純関数 + 共通 component SoT 化で **R-25 spec-code drift 構造防止**
- **Driver 6**: 段階分割 13 PR (1 PR ≤ 250 行目安) で review 可能 + Sess16-21 確立の workflow 整合

---

## Alternatives considered（他の案と却下理由）

### Option A: 凡例 + アイコン併用 + 粒度作業別 + EventRow 共通化 + hub 拡張 ★採用

- 概要: 上記 Decision の通り、 7 sub-decision 統合
- 良い点: 4 ペルソナ全員 ◎/○、 WCAG + 業界標準 + 既存資産活用、 13 PR 段階分割で安全
- 悪い点: PR 数多 (13)、 i18n 171 文字列追加、 ふりかえり hub の二重動線 △
- 採用理由: 6 専門家チーム全員一致推薦、 user 全 A 推薦案承認

### Option B: アイコンのみ (色なし) で識別

- 概要: dot を全て monochrome icon (●/○) のみで区別、 色は廃止
- 良い点: WCAG 完全準拠、 ダーク/屋外モード一律
- 悪い点: 既存 BRAND_GREEN / ACCENT_BARK 色資産 (Sess19-2 で 19 言語整合済) 破棄、 業界標準は「色 + アイコン併用」 で「色のみ」 ではなく「アイコンのみ」 でもない
- 却下理由: 色は識別 + ブランド統一感の double role、 廃止は過剰

### Option C: Legend を画面外 modal 化 (? icon tap で表示)

- 概要: 月名横の (?) tap で Alert / modal で凡例表示
- 良い点: 縦スペース節約
- 悪い点: 発見性低 (Discoverability)、 高橋ペルソナ ✕ (老眼で ? icon 認知困難)、 4 ペルソナ評価で「初回展開 + 折りたたみ可」 pattern が最良
- 却下理由: 業界標準 (Google Calendar / Notion) は inline collapsible bar

### Option D: 現状維持 + バッジ強化のみ

- 概要: 既存 dot のまま、 「予定」 バッジを大きく
- 良い点: 最小修正
- 悪い点: WCAG 違反継続、 user 真意 (粒度 + 凡例 + hub) 未対応
- 却下理由: 議論で 4 ペルソナ評価 ✕、 問題未解決

---

## Consequences（結果：何が変わる？）

### Pro

- **WCAG 1.4.1 達成**: 色覚多様性 8% + シニア老眼 + 屋外モードで識別可能 (R-42 構造化)
- **業界標準整合**: Eleken / UX Patterns Dev / Notion / Google Calendar の calendar best practice 準拠
- **user 真意「複数盆栽でも 1 作業なら ・ 1 個」 達成**: dot 粒度作業別 unique
- **PlanScreen ⟷ bonsai-detail row 一貫性レベル 2**: EventRow 共通化で重複削除 + 整合
- **ふりかえり hub 過去軸入口**: 「いつ何をしたか」 を日付軸で振り返る discoverability ↑
- **仕様 SoT 整備**: functional_spec §23 F-17 新設で R-2 (履歴/仕様分離) 整合
- **R-42 構造防止**: 今後の色依存 UI 設計時のチェック仕組み化

### Con

- **13 PR 段階分割** (Phase 0-5、 6-8 h)
- **i18n 9 keys × 19 言語 = 171 文字列追加** (Sess20/21 workflow で吸収可)
- **既存 PlanScreen 大幅 refactor** (regression テストで担保)
- **ふりかえり hub 二重動線**: 下タブ Calendar との重複懸念 → subtitle で「過去軸」 差別化 + 過去 30 日 default で吸収
- **dot outline 視認性**: planned が outline 化で 5px → 6px に微増、 借入線 1px の細さ視認確認要 (PR-1-3 a11y SS)

### Forward-only 互換性

- `events` / `photos` schema 不変、 既存 logged/planned events への影響なし
- `useSettingsStore.calendarLegendCollapsed` 追加は Zustand persist middleware で自動移行 (default false = 初回展開)
- `EventSingleRow` → `EventRow` への refactor は呼出 1 箇所 (bonsai-detail) のみ、 import path 切替で完結

---

## Implementation（実装メモ）

### Phase 構成 (Sess22、 計画書 `/home/doooo/.claude/plans/precious-riding-reddy.md` 参照)

| Phase | PR              | 内容                                          |
| ----- | --------------- | --------------------------------------------- |
| 0     | PR-0-1 (本 ADR) | ADR-0034 起票 + ADR-0032 Notes Amended D1     |
| 0     | PR-0-2          | R-42 起票                                     |
| 0     | PR-0-3          | functional_spec §23 F-17 新設 + §3 マップ更新 |
| 1     | PR-1-1          | i18n 9 keys × 19 言語 (171 文字列)            |
| 1     | PR-1-2          | CalendarLegend + settingsStore 永続化         |
| 1     | PR-1-3          | CalendarDot + WCAG 1.4.1 解消                 |
| 2     | PR-2-1          | dotsByDay 作業別 unique 化 (Set<EventType>)   |
| 2     | PR-2-2          | listing 件数補完「×N 鉢」                     |
| 3     | PR-3-1          | EventRow 共通化                               |
| 3     | PR-3-2          | PlanScreen で EventRow 流用                   |
| 4     | PR-4-1          | ふりかえり hub 5 card 目                      |
| 5     | PR-5-1          | Maestro flow 3 新規 + 1 更新                  |
| 5     | PR-5-2          | Sess22 R-25 retro                             |

### testID 命名規約 (継承 + 新規)

- 既存: `e2e_plan_screen` / `e2e_plan_cell_<dateKey>` / `e2e_plan_group_<status>_<type>` / `e2e_plan_event_<id>` / `e2e_plan_section_upcoming` / `e2e_plan_section_done`
- 新規: `e2e_plan_legend` / `e2e_plan_legend_toggle` / `e2e_plan_legend_item_<type>` / `e2e_plan_dot_<status>` / `e2e_look_back_card_calendar`

### testing 戦略

- Maestro: `plan-tab.yml` 更新 + 新規 `plan-tab-legend.yml` / `plan-tab-dot-icon.yml` / `look-back-card-calendar.yml` (PR-5-1)
- unit: `dotsByDay.test.ts` (5 case) + `EventRow.test.tsx` (6 case) + `computePast30DaysKey.test.ts` (TZ 跨ぎ)
- 実機 SS R-25 評価 (PR-5-2 retro): タブ構成 / セクション構成 / UI 種別 / スクロール範囲

### Risks + mitigations

| #   | リスク                                              | 緩和策                                       |
| --- | --------------------------------------------------- | -------------------------------------------- |
| 1   | EventRow 共通化で bonsai-detail 履歴タブ regression | unit test 6 case + 実機 SS 完全一致確認      |
| 2   | Legend 折りたたみ AsyncStorage flicker              | persist rehydrate 完了確認後 render パターン |
| 3   | dot outline 視認性低下                              | size 6px + a11y SS グレースケール mode 確認  |
| 4   | 粒度変更で件数情報損失                              | listing「×N 鉢」 補完 (D7)                   |
| 5   | functional_spec § 番号 shift で外部参照破壊         | PR-0-3 で全 grep 修正                        |
| 6   | Maestro flow flaky (DEV seed 依存)                  | 固定 date hardcode + cell tap pattern        |
| 7   | i18n 17 言語ペルソナ翻訳の品質ばらつき              | ADR-0033 D1 ペルソナ集合厳守 + R-1 目視      |

---

## Notes Amended (随時更新)

(初版 2026-05-21、 Sess22 議題 ⑦ 議論結果反映、 7 sub-decision 統合)

### 2026-05-21 Sess22 PR-5-2 retro 完了 — R-25 構造系 4 項目評価 PASS

13 PR (#705-#717) + 1 hotfix (#707) 全 main merge 完了、 R-25 構造系 4 項目評価 PASS (詳細: `docs/reference/tasks/lessons/sess22-r25-evaluation.md`)。

実機 SS 検証 (Sess22 dev build 反映済) で D1-D8 全達成確認:

- ✅ Legend collapsible bar 表示 + 3 row (● 完了 / ○ 予定 / + 複数作業)
- ✅ dot icon 化 (logged=● filled / planned=○ outline)、 WCAG 1.4.1 解消
- ✅ 作業別 unique 粒度 (実機 5/20 = ●●● = 3 種別 logged)
- ✅ ふりかえり hub 5 card (順序: watering / **カレンダー** / 針金がけ一覧 / 盆栽を検索 / タグを管理)
- ✅ i18n ja proper 整合 (「凡例」 「完了 (●)」 「予定 (○)」 「複数作業 (+)」 等)

### Future Work (Sess23+ 候補)

1. **EventRow `eventsForBonsai` の O(N\*M) を useMemo 化** (PlanScreen で N=1000+ / M=20 で性能課題なら)
2. **17 言語 `settingsNotifWateringToggle` の意味的整合** (en.ts のみ Sess22 hotfix で `reminders → notifications`、 他 18 言語の各国語 word も「通知」 ベースに統一すべき)
3. **R-42 自動化** (`scripts/a11y-contrast-check.mjs` を拡張、 AST grep で「色のみ識別」 pattern 検出)
4. **Legend rehydrate flicker 検証** (persist rehydrate 前 default false → 折りたたみ切替 flicker、 実機で目視確認 + 必要なら `useSettingsBootstrap` で対応)
5. **plan-tab-dot-icon.yml の DEV seed 固定 date pattern** (本 Sess22 で skip、 flaky 抑制実装後に追加)

### 2026-05-21 Sess23 ADR-0035 起票で D1 凡例 + D3 dot 順序 + D6 完全 revert で改訂

ADR-0035 (Phase ε) で本 ADR の 3 D を改訂:

- **D1 凡例 label 改訂**: 「完了 (●)」 → 「**記録 (●)**」 (タブ名「予定」 (ADR-0035 D1) + section header「予定/記録」 (ADR-0035 D4) と語彙統一)
  - i18n key `planLegendDotLoggedLabel` 物理削除 → `planLegendDotRecordedLabel` 新規追加
  - `src/features/plan/CalendarLegend.tsx` items array で planned (○) を **先頭** に並べ替え (D3 dot 順序 flip 整合)
  - testID `e2e_plan_legend_item_logged` / `e2e_plan_legend_item_planned` は維持 (Maestro 互換性、 内容 flip でも testID 名固定)
- **D3 dot 順序 flip**: 旧「logged (●) 左、 planned (○) 右」 → 新「**planned (○) 左、 logged (●) 右**」 (時間軸「予定 → 記録」 を左→右で表現、 自然順序)
  - render 順 flip: `renderedPlanned` 先 → `renderedLogged` 後 (旧: logged 先 → planned 後)
  - cell accessibilityLabel: 「予定 N 件, 記録 N 件」 (順序整合)
  - 「+」 閾値 `totalUniqueCount > 3` (ADR-0034 D2) 維持
- **D6 完全 revert**: ふりかえりタブ hub 5 card 目「カレンダー」 (本 ADR D6 で新設、 Sess22 PR-4-1 #714) を **物理削除** (4 card に戻す)
  - `app/(tabs)/look-back/index.tsx` cards 配列 calendar entry 削除、 `CardDef.key` union から `'calendar'` 削除
  - `src/features/look-back/computePast30DaysKey.ts` + test 物理削除 (`git rm`)
  - i18n keys `lookBackCardCalendarTitle` + `lookBackCardCalendarDesc` 物理削除 (19 言語 × 2 = 38 文字列)
  - 理由: user 真意「別にタブバー記録から確認すればいいのだから」、 ADR-0035 D6 (記録タブ tap → カレンダー画面遷移) で hub 経由は二重動線
- 本 ADR D2 (作業別 unique 粒度) / D4 (PlanScreen で EventRow 流用) / D5 (EventRow 共通化) / D7 (件数補完「×N 鉢」) / D8 (functional_spec §23 SoT) は **引き続き有効**
- 関連: ADR-0035 D1/D3/D5/D6/D9 / PR-2-1 (D3 dot 順序 + D1 凡例) / PR-5-1 (D6 完全 revert)

### 2026-05-23 Sess32 ADR-0041 起票で D4 整合性レベル 2 を範囲拡張 (displayMode 含む)

ADR-0041 (Phase η) で本 ADR D4「PlanScreen ⟷ bonsai-detail history で同一 event 表示が pixel 整合 (整合性レベル 2)」 を **`displayMode` 値を含めて pixel 整合** に範囲拡張:

- **新 contract**: 整合性レベル 2 = 「同一 event を **同じ `displayMode`** で表示した時、 PlanScreen ⟷ bonsai-detail history で pixel 整合」
- **新 mode 値**: `EventRow` に `displayMode: 'compact' | 'detailed'` prop 追加 (default = `'compact'`、 既存 callsite 後方互換)
- **適用範囲拡張**: CalendarTabScreen の **logged section + bonsai-detail history タブ** で `displayMode='detailed'` を渡す (両画面で同期同時改修、 ADR-0041 PR-6)
- **planned section** は本 ADR D4 整合性レベル 2 を **`displayMode='compact'`** で引き続き満たす (ADR-0041 D7)
- 本 ADR D5 (EventRow 共通化 + props 設計) は引き続き有効、 ADR-0041 で `displayMode` prop が追加されるのみ
- 関連: ADR-0041 D1/D7/D8 + PR-5 (displayMode prop 追加) + PR-6 (全 callsite 適用)
