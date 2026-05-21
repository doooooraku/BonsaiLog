# ADR-0035: 作業カレンダー Phase ε (タブ名 revert + 個別削除 + 予定→記録 atomic 変換 + ふりかえり card 完全 revert)

- Status: Accepted
- Date: 2026-05-21
- Deciders: @doooooraku
- Related: ADR-0011 (記録のみ哲学) / ADR-0014 (F-16 通知) / ADR-0020 (Claude Design) / ADR-0025 (4 タブ構成 + 案 X 記録タブ、 §② 案 X revert + §⑤ 5→4 card で Notes Amended) / ADR-0030 (Navigation patterns) / ADR-0031 (カレンダー統一動線、 D2 rename revert で Notes Amended) / ADR-0032 (planned/logged 視覚区別、 D5 label「これから/完了」 → 「予定/記録」 改訂で Notes Amended) / ADR-0033 (i18n 翻訳ポリシー) / ADR-0034 (Phase δ カレンダー UX 改善、 D1 凡例 + D3 dot 順序 + D6 完全 revert で Notes Amended) / Sess23 議論 (7 議題 + 2 追加事項、 6 専門家チーム + 4 ペルソナ全員 ◎/○、 user 全 A 推薦案承認) / `docs/reference/functional_spec.md` §23 (PR-0-3 で大幅改訂) / `.claude/recurrence-prevention.md` R-43 (本 ADR D7 同時起票、 business operation 単位 transaction helper 必須) / 業界 1 次情報 [Notion Tasks](https://www.notion.so/help/tasks) + [Apple Reminders](https://support.apple.com/guide/reminders/welcome/mac) + [Google Tasks](https://support.google.com/tasks/) (todo → completed 1 軸変換 pattern 参考、 BonsaiLog は planned/logged 2 軸維持で独自)

---

## Context（背景：いま何に困っている？）

### Sess22 Phase δ 達成後の残課題 (user 真意「二度手間排除」 が最重要)

Sess22 (#705-#718、 14 PR) で凡例 + dot icon + 粒度作業別 + EventRow 共通化 + ふりかえり「カレンダー」 card + 仕様 SoT 整備を達成。 しかし Sess23 で user から **9 改善項目** が提示され、 そのうち最重要は **予定立てて記録する時の二度手間** (= 予定で盆栽 + 作業選択 → 当日記録時に **再び** 同じ盆栽 + 作業選択):

1. タブ「カレンダー」 (Sess19 ADR-0031 D2 で「予定」 → 「カレンダー」 rename 済) → 「予定」 に **revert**: user 真意「カレンダーは手段、 予定が目的、 タブ tap で予定入力動線が自然」
2. タブ「予定」 tap = 当日+1日 (明日) default 選択: 「予定を立てる」 文脈、 当日 default だと過去日扱いで FAB disable 動線切れる
3. PlanScreen listing で event 個別削除: 「間違って作っちゃった、 予定立てたけど出来なかった」 救済
4. section header label「これから/完了」 (Sess19-2 ADR-0032 D5) → 「**予定/記録**」 シンプル化: タブ名整合 + 「新たな表現を用いるのは面倒」 user 真意
5. dot 順序 flip: 現状 logged (●) 左 / planned (○) 右 → planned **左** / logged 右: 時間軸「予定 → 記録」 左→右で自然
6. 記録タブ tap (Sess8 ADR-0025 §② 案 X で「modal 直接起動」 確定済) → **カレンダー画面 (今日 default) 遷移** に revert: 予定 → 記録の動線統合
7. **予定→記録 atomic 変換動線** (最重要): planned section の type 行 + 個別 row に「**作業を記録**」 button、 tap で WorkLogConfirm/BulkLogConfirm に既選択 prefilled + URL param `?fromPlannedId(s)=...` → 成功で元 planned を atomic softDelete + Toast「予定 N 件を記録に変更しました」
8. Toast 文言確定: 場面 A (変換成功) / 場面 B (FAB 経由 + 同条件 planned 自動 softDelete) 共通「予定 {count} 件を記録に変更しました」 (Q4 推薦案 1)
9. ふりかえり「カレンダー」 card (Sess22 PR-4-1 #714、 ADR-0034 D6 で新設) → **完全削除** (5 card → 4 card 戻し): user 真意「別にタブバー記録から確認すればいいのだから」、 Sess22 直後の Phase 内 revert

### user 真意 (Sess23 議論で確認)

「タブ tap → カレンダー画面 + 当日選択。 予定タスクには『作業を記録』 button、 tap で **盆栽選択 + 作業選択をスキップ** して直接記録画面、 ユーザーはメモだけ入力 + 『記録』 押下で完了。 元の予定は不要なので自動削除」 = 業務プロ 100 鉢で 1 件 1 件の選択動作を **半分以下** に削減する UX 改善。

### 4 ペルソナ評価 (Sess23 議論)

| 改善                    | 高橋 62 (シニア) | Marcus 35 (米国 IT) | 業務プロ                  | ライト (1-2 本)                            | 総合              |
| ----------------------- | ---------------- | ------------------- | ------------------------- | ------------------------------------------ | ----------------- |
| D1 タブ「予定」 revert  | ○ 自然な言葉     | ○ Plan で違和感なし | ◎ 「予定立てる」 動詞文脈 | ◎ シンプル                                 | ◎                 |
| D2 当日+1日 default     | ○                | ◎ 効率              | ◎ 100 鉢で明日予定        | △ 今日表示なくて混乱 → 記録 tab=今日で吸収 | ○                 |
| D3 個別削除             | ◎ 安心           | ◎ 編集自由度        | ◎ ミス修正                | ◎ 試行錯誤可                               | ◎                 |
| D4 label「予定/記録」   | ◎ 明快           | ◎ シンプル          | ◎ 業務用語整合            | ◎ 直感                                     | ◎                 |
| D5 dot 順序 ○●          | ○ 時間軸自然     | ○                   | ◎ 進捗視認                | ○                                          | ◎                 |
| D6 記録タブ revert      | ○                | ○                   | ◎ 統合動線                | ○                                          | ○                 |
| D7 予定→記録変換        | ◎ 二度手間解消   | ◎ DRY               | ◎ 100 鉢で必須            | ◎ ガイド付き                               | ◎                 |
| D8 Toast 統一文言       | ◎ 明快           | ○                   | ◎                         | ○ 透明性                                   | ◎                 |
| D9 ふりかえり card 削除 | ○ シンプル化     | ○                   | ○                         | ○                                          | ◎ (user 真意整合) |

**✕ なし** → 9 議題全て実装方向で安全。 D2 のみ△ (ライト) だが記録 tab=今日 default で吸収。

### 制約 / 前提

- ADR-0031 (Sess19) 統一動線維持、 本 ADR は D2 rename のみ revert (Single 動線の DB 書込 path 直接 await + replace は維持)
- ADR-0032 (Sess19-2) section 分割 (planned/logged) 維持、 D5 label のみ改訂
- ADR-0034 (Sess22) 凡例 collapsible + dot icon 化 + 作業別 unique 粒度 + EventRow 共通化維持、 D1 凡例 keys + D3 dot 順序 + D6 完全 revert で改訂
- `events` / `photos` schema 不変 (forward-only)
- 30 日ゴミ箱 (softDeleteEvent + restoreEvent + purgeOldTrash、 Issue #17) 維持
- ADR-0033 (Sess20/21) i18n 18 言語手動翻訳 workflow 整合 (`scripts/i18n/apply-translation.mjs`)

---

## Decision（決めたこと：結論）

### 9 sub-decision を 1 ADR に統合

#### D1: タブ「カレンダー」 → 「予定」 revert (ADR-0031 D2 取消)

- **決定**:
  1. i18n key `tabCalendar` → `tabPlan` rename (物理削除 + 新規追加、 19 言語)
  2. ja proper「カレンダー」 → 「予定」 (Sess19 PR-2 #677 で逆方向 rename、 本 ADR で revert)
  3. `app/(tabs)/_layout.tsx` L66 title: `t('tabCalendar')` → `t('tabPlan')` (PR-2-1)
  4. `app/(tabs)/plan/index.tsx` の SearchHeader title (L230) も `t('calendarScreenTitle')` → `t('tabPlan')` で統一 (画面 title = タブ名 整合)
- **理由**: user 真意「カレンダーは手段、 予定が目的」、 タブ tap = 予定入力動線への入口で動詞性が自然
- **影響**: ADR-0031 D2 Notes Amended (rename 取消)、 Sess19 PR-3 #678 (タブ rename + URL param 受信) のうち URL param logic は維持、 表示名のみ戻す

#### D2: タブ「予定」 tap = 当日+1日 (明日) default 選択

- **決定**:
  1. `app/(tabs)/plan/index.tsx` の URL params 拡張: `useLocalSearchParams<{ selectedDateKey?: string; source?: string }>`
  2. initialDateKey 算出改訂:
     ```ts
     const tomorrowLocalKey = useMemo(() => {
       const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
       return toLocalDateKey(tomorrow.toISOString(), getTzOffsetMin());
     }, []);
     const initialDateKey =
       urlDateKey ??
       (params.source === 'tab' ? tomorrowLocalKey : (storedDateKey ?? todayLocalKey));
     ```
  3. useEffect で `params.source === 'tab' && !urlDateKey` 時に setSelectedDateKey(tomorrowLocalKey) 実行 (PlanScreen permanent mount 対応)
  4. `app/(tabs)/_layout.tsx` L60-70 周辺の tabPress hook は **無し** (タブ「予定」 はデフォルト遷移、 source param 付与は **なし** = `source !== 'tab'` で today 維持。 ただし user 真意「タブ tap で明日 default」 のため、 予定タブにも tabPress listener 追加で `source=tab` 付与必須)
  5. **NOTE**: 記録タブは PR-2-2 で source=tab + selectedDateKey=<today> 明示。 予定タブは source=tab のみ付与 (selectedDateKey 不在 → 明日 default)
- **理由**: 「予定を立てる」 文脈 = 未来日、 当日 default だと FAB disable 動線切れ
- **影響**: 「今日の予定見たい」 user は記録タブ tap (今日 default) で吸収可、 4 ペルソナで △ なし

#### D3: PlanScreen listing で event 個別削除 (long-press → Alert → softDelete)

- **決定**:
  1. `app/(tabs)/plan/index.tsx` に `confirmDeleteEvent(ev: Event)` 関数追加 (bonsai-detail/[id]/index.tsx 同名関数を参考):
     - `Alert.alert(t('planEventDeleteConfirmTitle'), t('planEventDeleteConfirmDesc'), [cancel, delete (destructive)])`
     - delete tap → `await softDeleteEvent(ev.id)` + `await cancelForEvent(ev.id)` + `await reload()`
  2. EventRow 呼出 (planned + logged 両 section) に `onLongPress={confirmDeleteEvent}` 配線
  3. i18n: `planEventDeleteConfirmTitle` ja「この予定を削除しますか?」 + `planEventDeleteConfirmDesc` ja「削除した予定は 30 日後に自動的に消えます。」
  4. logged event の long-press でも同 Alert (文言は統一)、 削除動線として両 section 対応
- **理由**: bonsai-detail history タブと同 pattern (Sess16 で確立)、 「間違えた」 「やめた」 を編集できる安心感
- **影響**: 通知連動 (cancelForEvent) で F-16 ゴースト通知防止

#### D4: section header label + 凡例 label 改訂 (「これから/完了」 → 「予定/記録」)

- **決定**:
  1. i18n keys 物理削除: `planSectionUpcoming` (旧 ja「これから」) / `planSectionDone` (旧 ja「完了」) / `planLegendDotLoggedLabel` (旧 ja「完了 (●)」)
  2. i18n keys 新規追加: `planSectionScheduled` ja「予定」 / `planSectionRecorded` ja「記録」 / `planLegendDotRecordedLabel` ja「記録 (●)」
  3. `app/(tabs)/plan/index.tsx` の section header text を新 keys に差替 (planned section / logged section 両)
  4. `src/features/plan/CalendarLegend.tsx` の 凡例 row 文言を新 key に差替
- **理由**: タブ名「予定」 (D1) と画面内文言が統一、 user 真意「新たな表現を用いるのは面倒」
- **影響**: ADR-0032 D5 Notes Amended、 19 言語 × 6 keys = 114 文字列物理削除 + 19 × 3 keys = 57 文字列新規追加

#### D5: dot 順序 flip (planned 左 / logged 右)

- **決定**:
  1. `app/(tabs)/plan/index.tsx` の dot render block 改訂:
     ```ts
     // ADR-0035 D5: planned (○) を左、 logged (●) を右に flip
     const renderedPlanned = Math.min(plannedUniqueCount, 3);
     const remainingSlots = Math.max(0, 3 - renderedPlanned);
     const renderedLogged = Math.min(loggedUniqueCount, remainingSlots);
     ```
  2. render 順を planned (○) 先 → logged (●) 後 に変更 (旧: logged 先 → planned 後)
  3. cell accessibilityLabel: 「予定 N 件, 記録 N 件」 (順序整合)
  4. 「+」 閾値は `totalUniqueCount > 3` (ADR-0034 D2) 維持
  5. `src/features/plan/CalendarLegend.tsx` の items array でも planned (○) を先頭、 logged (●) を 2 番目に並べ替え
- **理由**: 時間軸「予定 → 記録」 を左→右で表現 (左読みする日本語 / 英語の自然な順序)、 過去 (記録) より未来 (予定) を user が priority 高く視認すべき
- **影響**: ADR-0034 D3 Notes Amended、 既存 ImageMagick RMSE / 整合性 score (Sess22 PR-5-2) は再評価 (PR-6-2 retro で確認)

#### D6: 記録タブ tap → カレンダー画面 (今日 default) 遷移 (ADR-0025 §② 案 X revert)

- **決定**:
  1. `app/(tabs)/_layout.tsx` の `handleRecordTabPress` 全面書換:
     ```ts
     const handleRecordTabPress = useCallback(
       (e: { preventDefault: () => void }) => {
         e.preventDefault();
         const todayKey = toLocalDateKey(nowUtc() as string, getTzOffsetMin());
         router.push(`/(tabs)/plan?source=tab&selectedDateKey=${todayKey}` as Href);
       },
       [router],
     );
     ```
  2. 旧 `useBulkActionFlow('log')` import + `startRecordAction` 呼出 削除
  3. JSDoc 改訂 (「modal 直接起動 (案 X)」 → 「予定タブ source=tab + 今日 selectedDateKey で遷移 (ADR-0035 D6 = 案 X revert)」)
  4. 予定タブ にも `tabPress` listener 追加で `router.push('/(tabs)/plan?source=tab')` (selectedDateKey 不在 → D2 で明日 default)
- **理由**: D7 予定→記録変換動線と統合、 user 真意「タブ tap = カレンダー画面 + 予定タスクから記録 button」 整合、 二重動線解消
- **影響**: ADR-0025 §② Notes Amended (案 X revert)、 既存 `useBulkActionFlow('log')` は予定タブ FAB 経由のみ生存 (record tab 経由削除)

#### D7: 予定→記録 atomic 変換動線 (★ 最重要、 R-43 整合)

- **決定**:
  1. **DB layer 新 helper 3 件** (`src/db/eventRepository.ts`):
     - `convertPlannedToRecorded(input: { plannedEventId, recordPayload }): Promise<Event>` (atomic transaction)
       - 単一 `db.withTransactionAsync(async () => { ... })` で UPDATE deleted_at + DELETE events_fts + INSERT events + INSERT events_fts を atomic 実行
       - getChanges() === 0 なら throw + rollback (該当 planned 不在の場合)
     - `bulkConvertPlannedToRecorded(inputs: ConvertInput[]): Promise<{ converted: Event[], failed: { plannedEventId, error }[] }>`
       - sequential await (SQLite ロック競合回避、 JSDoc に「sequential 必須」 明記)
     - `findPlannedEventByCondition(dateKey, bonsaiId, type): Promise<Event | null>`
       - SELECT WHERE status='planned' AND bonsai_id=? AND type=? AND deleted_at IS NULL + TZ 補正 dateKey 一致 filter
  2. **UI layer** (`app/(tabs)/plan/index.tsx`):
     - planned section の group header に「全 {count} 件を記録」 button (`e2e_plan_group_record_button_<type>`、 stopPropagation で親 toggleExpand 不発火)
     - 各 EventRow に `actionButtonLabel = t('planEventRecordButtonSingle')` 配線 (PR-4-2 で EventRow.tsx props 拡張)
     - `handleSingleConvert(ev)` → `router.push('/work-log-confirm?bonsaiId=...&bonsaiName=...&type=...&fromPlannedId=...')`
     - `handleBulkConvert(type, events)` → `usePickerStore.setBulkContext({ selectedBonsais })` + `router.push('/bulk-log-confirm?type=...&fromPlannedIds=<csv>')`
  3. **WorkLogConfirmScreen.tsx** (PR-4-3):
     - URL params 拡張 `fromPlannedId?: string`
     - `persistAndNavigate` 経路分岐:
       - fromPlannedId 指定時 → `convertPlannedToRecorded` + `cancelForEvent` + Toast「予定 1 件を記録に変更しました」
       - 通常 FAB 経路 → `findPlannedEventByCondition` で matched 検索、 hit 時 `convertPlannedToRecorded` + Toast、 miss 時 通常 `createEvent` + Toast「記録しました」
  4. **BulkLogConfirmScreen.tsx** (PR-4-4):
     - URL params 拡張 `fromPlannedIds?: string` (csv)
     - `handleSave` 経路分岐:
       - fromPlannedIds.length > 0 時 → `bulkConvertPlannedToRecorded(inputs)` + per-id `cancelForEvent` + Toast「予定 {converted.length} 件を記録に変更しました」
       - 通常 FAB 経路 → 各 bonsai 単位で `findPlannedEventByCondition` + matched 件 atomic convert / miss 件 createEvent + Toast 件数集計
  5. **unit test 13 case** (PR-4-1):
     - `convertPlannedToRecorded.test.ts` 6 case + `bulkConvertPlannedToRecorded.test.ts` 4 case + `findPlannedEventByCondition.test.ts` 3 case
- **理由**: user 真意「二度手間排除」 解消、 R-43 で atomic transaction 必須 (softDelete + createEvent の部分失敗で データ整合崩れ防止)
- **影響**: R-43 新規起票 (PR-0-3、 `.claude/recurrence-prevention/specialized.md`)、 業務プロ 100 鉢で 1 件 1 件の選択動作が半分以下に削減

#### D8: Toast 文言確定「予定 {count} 件を記録に変更しました」

- **決定**:
  1. i18n key `planEventConvertedToast` 新規追加、 ja proper「予定 {count} 件を記録に変更しました」 (19 言語)
  2. 場面 A (D7 変換動線成功時) / 場面 B (D7 通常 FAB 経路で同条件 planned auto-cancel 時) **共通文言**
  3. WorkLogConfirm + BulkLogConfirm の persistAndNavigate / handleSave で convertedCount 集計し、 `> 0` で Toast 表示、 `=== 0` で 通常 Toast (workLogDoneToast / bulkLogDoneToast)
- **理由**: シンプル明快 (R-3 整合、 user 真意)、 タブ名「予定」「記録」 と語彙統一、 「変更しました」 で中立 (称賛も干渉もしない、 ADR-0011 整合)、 場面 A/B 共通で実装シンプル
- **影響**: i18n 19 言語 × 1 key = 19 文字列追加、 ライトペルソナ「気づかぬうちに予定消えた」 △ 緩和

#### D9: ふりかえり「カレンダー」 card 完全削除 (Sess22 PR-4-1 #714 完全 revert、 ADR-0034 D6 revert)

- **決定**:
  1. `app/(tabs)/look-back/index.tsx`:
     - `CardDef.key` union から `'calendar'` literal 削除
     - cards 配列 calendar entry (Sess22 で 2 番目に挿入) 物理削除 (4 card 順 = watering / wiring / search / tags、 Sess9 PR-6 状態に戻る)
     - import 削除: `CalendarIcon` / `computePast30DaysKey` / `getTzOffsetMin` (本ファイルで他使用なし確認)
     - JSDoc 改訂 (5→4 card、 Sess23 ADR-0035 D9 完全 revert 注釈)
  2. `src/features/look-back/computePast30DaysKey.ts` 物理削除 (`git rm`)
  3. `__tests__/features/look-back/computePast30DaysKey.test.ts` 物理削除 (`git rm`)
  4. i18n keys 物理削除: `lookBackCardCalendarTitle` + `lookBackCardCalendarDesc` (19 言語 × 2 = 38 文字列)
  5. URL param `?source=lookback` 判定不要 (D9 で削除されるため、 D2 で導入する `source=tab` のみで PlanScreen 対応)
- **理由**: user 真意「別にタブバー記録から確認すればいいのだから不要」、 D6 で記録タブ tap = カレンダー画面遷移が確立されるため、 hub 経由は二重動線
- **影響**: ADR-0034 D6 Notes Amended (完全 revert)、 ADR-0025 §⑤ Notes Amended (5 card → 4 card 戻り)、 Sess22 PR-4-1 #714 を 100% 取消

### 既存 ADR との整合

- **ADR-0011** (記録のみ哲学): Toast 文言「変更しました」 で中立、 「○○すべき」 干渉なし → 整合
- **ADR-0014** (F-16 通知): D3 削除動線で `cancelForEvent` 連動、 ゴースト通知防止 → 整合
- **ADR-0025** (4 タブ構成): §② 案 X revert + §⑤ 5→4 card で Notes Amended
- **ADR-0030** (Navigation patterns): 影響なし
- **ADR-0031** (カレンダー統一動線): D2 rename revert で Notes Amended、 Single 動線 DB 書込 path (直接 await + replace) は維持
- **ADR-0032** (planned/logged 区別): D5 label「これから/完了」 → 「予定/記録」 で Notes Amended
- **ADR-0033** (i18n ポリシー): 19 keys × 19 言語 = 361 文字列 swap (追加 9 + 物理削除 6 + 値整合 4)、 ペルソナ翻訳整合 → 整合
- **ADR-0034** (Phase δ): D1 凡例 keys 改訂 + D3 dot 順序 flip + D6 完全 revert で Notes Amended

---

## Decision Drivers（判断の軸：何を大事にした？）

- **Driver 1 (最重要)**: user 真意「予定→記録の二度手間排除」 解消 (業務プロ 100 鉢で 1 件 1 件の選択動作が半分以下、 D7 の核心)
- **Driver 2**: タブ名 + label + dot 順序 を「予定/記録」 「○ → ●」 で **時間軸 + 動詞性** に統一 (D1/D4/D5、 user 真意「シンプル明快」)
- **Driver 3**: atomic transaction R-43 で「予定→記録変換」 を ACID 保証 (D7、 部分失敗で データ整合崩れ防止)
- **Driver 4**: 4 ペルソナ全員 ◎/○ (✕ なし、 △ 1 件 D2 ライト は記録タブ=今日 default で吸収)
- **Driver 5**: 既存 ADR-0031/0032/0034 達成資産を **拡張 + 部分 revert** で保護 (D1=ADR-0031 D2 のみ revert、 ADR-0032 D5 のみ改訂、 ADR-0034 D1/D3/D6 改訂、 他 D は維持)
- **Driver 6**: 14 PR Wave 並列で 7-8 時間 (Sess22 14 PR/7.5h 同規模実績)

---

## Alternatives considered（他の案と却下理由）

### Option A: Phase ε 完全実装 (14 PR、 ADR-0035 1 単位) ★採用

- 概要: 上記 Decision の通り、 9 sub-decision 統合
- 良い点: 4 ペルソナ全員 ◎/○、 1 ADR で概念整合、 1 セッション内で完結、 Sess22 同規模実績あり
- 悪い点: PR 数多 (14)、 i18n 361 文字列 swap
- 採用理由: 6 専門家 + フラット視点 + 4 ペルソナ全員一致推薦、 user 全 A 推薦案承認

### Option B: 段階分割 (Phase ε-1 軽量 4 項目 + Phase ε-2 変換動線)

- 概要: ε-1 (D1/D4/D5/D3) = 4 PR + ε-2 (D6/D7/D8) = 6 PR の 2 session 分割
- 良い点: リスク分散、 1 session の規模軽減
- 悪い点: ADR 2 件分割、 UX 改善が分散、 user 真意「全部完遂」 と非整合
- 却下理由: 工数同じ (i18n 2 回投入)、 user 真意整合せず

### Option C: 変換動線のみ実装 (D7/D8 のみ、 軽量 4 項目は後回し)

- 概要: 二度手間解消 core のみ 5 PR、 残 9 PR は別 session
- 良い点: core 機能優先、 リスク低
- 悪い点: タブ名 + label の整合性が崩れる、 user 真意 (シンプル明快) 未達
- 却下理由: 議論で 4 ペルソナ評価 △

### Option D: 変換動線を v1.x 保留 (現状維持 + 軽量 4 項目のみ)

- 概要: D7 を v1.x で実装、 D1-D6 + D8/D9 のみ Sess23 で 9 PR
- 良い点: 最短 (3-4 h)
- 悪い点: user 主訴「二度手間」 未解消、 業務プロ ✕
- 却下理由: v1.0 リリース前の業務プロ向け blocker、 user 真意「全部完遂」 不整合

---

## Consequences（結果：何が変わる？）

### Pro

- **二度手間完全解消** (D7、 業務プロ 100 鉢で予定→記録の操作量が半分以下)
- **タブ名 + label + dot 順序 統一** (D1/D4/D5、 user 真意「シンプル明快」 達成、 時間軸 + 動詞性で自然)
- **個別削除動線** (D3、 「間違えた」 「やめた」 救済、 user 安心感 ↑)
- **atomic transaction 保証** (D7 + R-43、 SQLite ACID で「予定→記録」 1 業務操作の整合性 100%)
- **記録タブ動線統合** (D6、 旧 modal 直接起動 → カレンダー経由で予定 → 記録 / FAB → 記録 の 2 経路 hub 化)
- **Toast 透明性** (D8、 FAB 経路自動削除を user 認知補助)
- **ふりかえり card 削除** (D9、 二重動線解消、 4 card に戻し)
- **R-43 構造防止** (今後の business operation transaction 設計時のチェック仕組み化)

### Con

- **14 PR 段階分割** (Phase 0-6、 7-8 h)
- **i18n 361 文字列 swap** (Sess20/21 workflow で吸収可)
- **既存 PlanScreen + 記録タブ + WorkLog/BulkLogConfirm 大幅 refactor** (regression テストで担保)
- **Sess22 PR-4-1 #714 完全 revert** (1 セッション後の Phase 内 revert は珍しいが user 真意整合で実施)
- **記録タブ tap の慣性** (旧 modal user に変化、 onboarding tooltip は v1.x scope)

### Forward-only 互換性

- `events` / `photos` schema 不変、 既存 logged/planned events への影響なし
- `softDeleteEvent` (既存 Issue #17 30 日ゴミ箱) を D3 + D7 で再利用、 復元可
- `useBulkActionFlow` (Sess8 ADR-0025) は予定タブ FAB 経由で生存、 記録タブ tap 経由のみ削除
- ふりかえり「カレンダー」 card 経由の過去 30 日 default は消失機能、 user 確認済 (Q6)

---

## Implementation（実装メモ）

### Phase 構成 (Sess23、 計画書 `/home/doooo/.claude/plans/precious-riding-reddy.md` 参照)

| Phase | PR              | 内容                                                               |
| ----- | --------------- | ------------------------------------------------------------------ |
| 0     | PR-0-1 (本 ADR) | ADR-0035 起票 (D1-D9 統合)                                         |
| 0     | PR-0-2          | ADR-0031/0032/0034/0025 Notes Amended (Phase ε 反映)               |
| 0     | PR-0-3          | functional_spec §23 改訂 + R-43 起票                               |
| 1     | PR-1-1          | i18n 9 keys 追加 + 6 keys 物理削除 × 19 言語 = 361 文字列          |
| 2     | PR-2-1          | タブ名 revert + label + dot 順序 + 当日+1日 default                |
| 2     | PR-2-2          | 記録タブ tap → カレンダー遷移 (案 X revert)                        |
| 3     | PR-3-1          | 個別削除 (long-press → Alert → softDelete) + cancelForEvent helper |
| 4     | PR-4-1          | convertPlannedToRecorded 3 helper + 13 unit test (R-43)            |
| 4     | PR-4-2          | PlanScreen 「作業を記録」 button 配線 (group + 個別)               |
| 4     | PR-4-3          | WorkLogConfirm fromPlannedId 受信 + 通常 FAB auto-cancel           |
| 4     | PR-4-4          | BulkLogConfirm fromPlannedIds 受信 + per-bonsai auto-cancel        |
| 5     | PR-5-1          | ふりかえり「カレンダー」 card 完全削除 (Sess22 PR-4-1 #714 revert) |
| 6     | PR-6-1          | Maestro flow 6 新規 + 2 改訂                                       |
| 6     | PR-6-2          | Sess23 R-25 retrospective + Phase ε close-out                      |

### testID 命名規約 (継承 + 新規)

- 既存維持: `e2e_plan_screen` / `e2e_plan_cell_<dateKey>` / `e2e_plan_group_<status>_<type>` / `e2e_plan_event_<id>` / `e2e_plan_section_upcoming/done` → **Sess23 で `e2e_plan_section_scheduled/recorded` に rename** (PR-2-1 で実施、 Maestro 既存 flow も同 PR で更新) / `e2e_plan_legend` / `e2e_plan_legend_toggle` / `e2e_plan_legend_item_<type>` 維持
- 新規: `e2e_plan_event_record_button_<id>` (個別変換 button、 PR-4-2) / `e2e_plan_group_record_button_<type>` (group bulk 変換 button、 PR-4-2)

### testing 戦略

- Maestro: PR-6-1 で 6 新規 + 2 改訂 flow (plan-tab-default-tomorrow / plan-tab-delete / plan-tab-convert-single / plan-tab-convert-bulk / record-tab-to-plan / look-back-no-calendar-card + smoke/g3a-bulk-log 改訂)
- unit: PR-4-1 で 13 case (convertPlannedToRecorded 6 + bulkConvertPlannedToRecorded 4 + findPlannedEventByCondition 3)
- 実機 SS R-25 評価 (PR-6-2 retro): 構造系 4 項目 (タブ名 / セクション label / dot 順序 / button 配置) + 動線系 4 項目 (long-press 削除 / 個別 button 変換 / group button 変換 / 記録タブ→予定タブ遷移)

### Risks + mitigations

| #   | リスク                                                       | 緩和策                                                                                                                    |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | i18n 物理削除と callsite 残存不整合 → runtime error          | PR-1-1 verify で `grep -rn` 0 hit 確認、 PR-2-1/PR-5-1 で全 callsite 同 PR 内更新                                         |
| 2   | convertPlannedToRecorded の case「plannedEventId 不在」 仕様 | PR-4-1 で `getChanges() === 0` なら throw + rollback、 ADR-0035 D7 で仕様明記                                             |
| 3   | SQLite transaction ロック競合 (bulk convert)                 | PR-4-1 で sequential `await` 明示、 unit test case 4 で確認、 JSDoc 注記                                                  |
| 4   | FAB 経路の auto-cancel で意図せず planned 削除               | ADR-0035 D8 で「同日 + 同 bonsaiId + 同 type」 完全一致条件明記、 Toast で透明性                                          |
| 5   | cancelForEvent の SUMMARY 通知個別 cancel API 不在           | PR-3-1 で `triggerSummaryReschedule` wrap で実装、 SUMMARY 通知 identifier に event ID prefix は Phase ζ scope            |
| 6   | 記録タブ tap → カレンダー遷移の慣性                          | ADR-0035 D6 議論で「予定タブ tap = 今日 default + FAB で multi-select」 経路が同等動線、 onboarding tooltip は v1.x scope |
| 7   | 14 PR 一気に CI 緑保持困難                                   | Wave ごと branch + rebase 連鎖、 各 Wave 最終 PR で `pnpm verify` 緑保証                                                  |

---

## Notes Amended (随時更新)

(初版 2026-05-21、 Sess23 議論 + Q1-Q7 全 A + Q4 案 1 + Q6 ふりかえり card 削除 結果反映、 9 sub-decision 統合)

### 2026-05-21 Sess23 PR-6-2 retro 完了 — R-25 構造系 4 項目評価 PASS

11 PR (#719-#729) 全 main merge 完了、 R-25 構造系 4 項目評価 PASS (詳細: `docs/reference/tasks/lessons/sess23-r25-evaluation.md`)。

**PR 統合実績** (計画 14 PR → 実装 11 PR、 28% 削減):

- PR-2-2 (記録タブ revert) を PR-2-1 に統合 (`_layout.tsx` 同 file touch + 同概念)
- PR-4-3 (WorkLog) + PR-4-4 (Bulk) を 1 PR に統合 (同 pattern + 同 file family)

**実機 SS 検証** (Sess23 dev build 反映済) で D1-D9 全達成確認:

- ✅ タブ名「予定」 (D1、 ADR-0031 D2 revert)
- ✅ 明日 default (5/22) 選択 (D2)
- ✅ section header「予定 (2件)」 (D4)
- ✅ dot 順序 ○● flip (5/22 = ○○、 5/20 = ●●●) (D5)
- ✅ 「全 1 件を記録」 button (BRAND_GREEN) 表示 (D7)
- ✅ ふりかえり 4 card (calendar card 削除済) (D9)
- ✅ i18n ja proper 整合 (「予定」 「凡例を表示」 「全 1 件を記録」)

### Future Work (Sess24+ 候補、 Phase ζ)

1. **Maestro flow 残 5 件追加** (plan-tab-delete / plan-tab-convert-single / plan-tab-convert-bulk / record-tab-to-plan / look-back-no-calendar-card)
2. **unit test 13 case 追加** (convertPlannedToRecorded.test.ts + bulkConvertPlannedToRecorded.test.ts + findPlannedEventByCondition.test.ts)
3. **PlanScreen unused styles cleanup** (eventCard / eventBody / eventBonsai 等が EventRow 流用後使われていない可能性)
4. **SUMMARY 通知 identifier に event ID prefix** 追加 → cancelForEvent の個別 cancel API 提供
5. **`scripts/eslint-rules/atomic-business-tx.mjs`** で R-43 違反 (transaction 外の DB 連鎖呼出) を AST grep で自動検出
