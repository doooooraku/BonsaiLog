# ADR-0031: カレンダー統一動線 + Single log mode stale closure 撲滅 + 構造的再発防止 (Sess19)

- Status: Accepted
- Date: 2026-05-21
- Deciders: @doooooraku
- Related: ADR-0024 (modal 一本化) / ADR-0025 (4 タブ構成 + 案 X 記録タブ) / ADR-0027 (作業記録 form 統合 Phase α-β) / ADR-0028 (leaf_first_aid 追加) / ADR-0029 (Form UX 恒久化 Phase γ) / ADR-0030 (Navigation patterns 統一) / Sess19 議論 (6 専門家チーム + 4 ペルソナ全員 ◎、 user 提案「作業記録カレンダー」 + stale closure bug fix 一本化) / `docs/reference/functional_spec.md` §7.3 / `.claude/recurrence-prevention.md` R-39 (本 ADR 同時起票)

---

## Context（背景：いま何に困っている？）

### Sess19 実機検証で判明した重大 bug (Single 動線 DB 書込失敗)

Sess16-18 で 53 PR を投下し 14 種別作業記録 form の整備が完了したが、 Sess19 実機検証 (8 試行 100% 再現) で以下を確認:

| 動線                                                         | 「記録する」 後                  | DB 書込     | 履歴反映 | Plan tab 反映    |
| ------------------------------------------------------------ | -------------------------------- | ----------- | -------- | ---------------- |
| **Single × log** (水やり / 朝ごはん) ×3 + 5 種別 ×1 = 8 試行 | router.back() → work-picker      | ❌ **失敗** | ❌ なし  | ❌ なし          |
| **Single × schedule** (5/22 水やり 予定)                     | DatePicker dialog → OK           | ✅ 成功     | ✅ 反映  | ✅ 反映          |
| **Bulk × log** (水やり / 朝ごはん+テスト)                    | router.replace('/(tabs)/record') | ✅ 成功     | ✅ 反映  | ✅ 「水やり ×2」 |

Single × log mode のみ **100% 再現で DB 書込失敗**。 schedule mode (Case A) と Bulk (直接 await) は正常動作。

### 根本原因 — stale closure 連鎖

`app/(tabs)/bonsai/[id]/index.tsx:160-194` の useFocusEffect:

```ts
useFocusEffect(
  React.useCallback(() => {
    const logResult = usePickerStore.getState().consumeWorkLogConfirmResult();
    if (logResult) {
      void countSameDayPlannedOrLoggedEvents(occurredAtUtc).then((count) => {
        if (count >= EVENT_OVERLOAD_THRESHOLD) {
          showEventOverloadPopupForPayload(logResult); // ★stale
        } else {
          void persistEventWithPayload(logResult); // ★stale
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleSchedulePickerSelect]),
);

async function persistEventWithPayload(payload: WorkLogPayload) {
  if (!item) return; // ★初回 mount 時 item=null で早期 return
  ...
}
```

useCallback の deps `[handleSchedulePickerSelect]` には `item` も `persistEventWithPayload` も含まれず、 `// eslint-disable-next-line react-hooks/exhaustive-deps` で抑制。 結果、 callback closure が **初回 mount 時の関数 reference を永続保持**、 初回 mount 時 `item=null` を参照して `if (!item) return;` で **静かに早期 return** → DB 書込スキップ。

F-05「気遣い型」 popup (showEventOverloadPopupForPayload) も同じく stale closure で連鎖破綻、 popup の「そのまま登録」 ボタン経由でも書込されない。

### user 提案「作業記録カレンダー」 と 1 本化

user 真意「予定タブを『カレンダー』 に rename + 作業記録の遷移先もそこに統一」。 現状の PlanScreen は既に planned + logged 両方をカレンダー上にドットで表示済 (機能としては既存)、 user 提案は「flow の最終遷移先にする (記録した日が選択状態で開く)」。

採用すると Single 動線の DB 書込 path が **bonsai-detail の useFocusEffect 経由を排除**、 stale closure bug が **副次的に解消**。 つまり提案 ≒ bug fix で 1 本化が成立。

### なぜなぜ 5 段階 (Sess19 議論 Step 3)

「ESLint exhaustive-deps disable + メンタル契約」 で乗り切る設計が **構造的に破綻 (1 度の見落としで bug 化)**、 かつ **Maestro / unit test の DB 反映 assertion が欠落** していたため検出仕組みも不在で、 53 PR Sess16-18 通過後の本検証で初めて顕在化。

### 制約 / 前提

- `events` / `photos` schema 不変 (forward-only、 v15 維持)
- `createEvent` / `bulkLogEvents` API 不変 (backward-compat)
- ADR-0030 store-callback Case A (schedule mode DatePicker dialog) は正常動作のため維持
- `pickerStore.planSelectedDateKey` (Sess12 PR-H) 既存活用

---

## Decision（決めたこと：結論）

### 5 sub-decision を 1 ADR に統合

#### D1: log mode navigation 統一 (Single + Bulk 共に直接 await + replace)

- **決定**:
  1. **Single (`WorkLogConfirm.handleSubmit`)** を `setWorkLogConfirmResult + router.back()` から **直接 await pattern** に書換:
     - `await createEvent({ bonsaiId, type, payload, occurredAtUtc, note })`
     - `for-await addPhotoFromUri(eventId 紐付け)`
     - `await triggerSummaryReschedule(t)` (Bulk と同等の通知再予約)
     - Toast「記録しました」
     - `router.replace('/(tabs)/plan?selectedDateKey=<occurredAtDate>')`
  2. **Bulk (`BulkLogConfirm.handleSave`)** の遷移先を `'/(tabs)/record'` (stub) → `'/(tabs)/plan?selectedDateKey=...'` (カレンダー) に変更
  3. **WorkPicker** の URL param 拡張: `bonsaiId` も渡す (現状 `bonsaiName` のみ、 WorkLogConfirm 直接書込のため id 必須)

#### D2: 「予定」 → 「カレンダー」 rename (i18n 19 言語)

- **決定**:
  1. `tabPlan` → `tabCalendar` (TabBar title)
  2. `planScreenTitle` → `calendarScreenTitle` (SearchHeader)
  3. 関連 keys (`planMonthYearSuffix` / `planMonthSuffix` / `planSelectedListLabel` / `planSelectedListTodayLabel` / `planSelectedEmpty` / `planGroupExpand` / `planGroupCollapse` / `planFabLabel` / `planEventPlanned` / `planPrevMonth` / `planNextMonth`) は keep (内部参照、 rename 不要) or 一括 `calendar*` に rename (議論で判断)
  4. 19 言語 × 必要 keys 整合、 `pnpm i18n:check` 緑

#### D3: stale closure 撲滅 (bonsai-detail useFocusEffect log mode 削除)

- **決定**:
  1. `bonsai-detail` の useFocusEffect から **log mode consume + persistEventWithPayload 呼出を完全削除** (path 不要化)
  2. `persistEventWithPayload` / `showEventOverloadPopupForPayload` 関数も削除 (F-05 popup logic は WorkLogConfirm に移植、 D4)
  3. schedule mode (Case A、 store-callback + DatePicker dialog) は **維持** (正常動作)
  4. `pickerStore.workLogConfirmResult` / `setWorkLogConfirmResult` / `consumeWorkLogConfirmResult` API を **削除** (使用箇所ゼロ)
  5. `// eslint-disable-next-line react-hooks/exhaustive-deps` コメントを当該箇所から削除

#### D4: F-05「気遣い型」 popup を WorkLogConfirm に移植

- **決定**:
  1. `WorkLogConfirm.handleSubmit` 内に F-05 popup logic 移植:
     - `await countSameDayPlannedOrLoggedEvents(occurredAtUtc)` を popup 表示前に呼ぶ
     - `count >= EVENT_OVERLOAD_THRESHOLD` (= 5) で `Alert.alert` 3 ボタン (そのまま登録 / 一覧を見る / 今後表示しない)
     - 設定 OFF (`eventOverloadEnabled = false`) なら popup 出さず即書込
  2. popup の各ボタン内で **同コンポーネント scope の関数を呼ぶ** ため stale closure 問題なし

#### D5: R-39 構造防止 + Maestro flow 強化 + PR テンプレ拡張

- **決定**:
  1. **R-39 新設** (`.claude/recurrence-prevention.md`):
     - 「画面間で state を渡す場合、 store-callback chain ではなく query param + 直接 await を優先 (ADR-0030 Case A/B のみ store-callback 許容、 Case C は直接 await)」
     - 「useFocusEffect callback で関数呼出時、 useCallback deps に必ず含める、 または useEvent / useRef pattern 使用」
     - 「`// eslint-disable-next-line react-hooks/exhaustive-deps` は禁止、 例外は ADR 起票」
  2. **`scripts/check-navigation-patterns.mjs` AP-3 追加**:
     - `useFocusEffect.*useCallback\(.*\]` の deps に呼出関数が含まれているか grep-based 検出
     - warning 出力、 false positive 抑制
     - 将来 ESLint AST rule 化検討
  3. **Maestro flow 強化**:
     - `maestro/flows/work-log-*.yaml` × 10 + `bulk-log-*.yaml` × 10
     - 「保存 → 1 秒待 → `assertVisible: e2e_history_item_<type>_<date>`」 必須化
     - DB 反映を E2E で必須検証 (本 bug 再発防止の test-driven 防御)
  4. **PR テンプレ §7.6.4 拡張**:
     - navigation 変更 PR の「DB 反映 manual 検証 SS 添付」 必須化
     - チェックボックス追加

### 既存 ADR との整合

- **ADR-0024** (modal 一本化): 影響なし
- **ADR-0025** (案 X 記録タブ): Notes Amended — 記録 tab 役割再定義 (依然 tab tap intercept、 ただし完了後遷移先がカレンダーに統一)
- **ADR-0027** (Phase α-β): Notes Amended — Single 動線 DB 書込 path 変更 (store-callback → 直接 await)
- **ADR-0029** (Phase γ): 影響なし (Form atom / placeholder 規約 / Bulk 14 種別展開は維持)
- **ADR-0030** (Navigation patterns): Notes Amended — Case 4 (log mode 直接 await + replace) 追加、 ADR-0030 D2 Case C 解消方針の **完全実装**

---

## Decision Drivers（判断の軸：何を大事にした？）

- **Driver 1 (最重要)**: Single 動線 DB 書込 bug の確実な解消 (v1.0 リリース blocker、 業務プロ ✕ 致命的)
- **Driver 2**: user 真意「作業記録カレンダー」 整合 (4 ペルソナ全員 ◎、 業界標準 Notion/Day One 整合)
- **Driver 3**: stale closure 再発の **構造的防止** (R-39 + script + Maestro + PR テンプレ 4 重防御)
- **Driver 4**: Sess16-18 で 53 PR 投下した form 改修への影響ゼロ (navigation のみ変更、 schema / form atom / typography token 不変)
- **Driver 5**: 段階分割で PR レビュー可能 (8-10 PR、 1 PR ≤ 250 行目安)

---

## Alternatives considered（他の案と却下理由）

### Option A: カレンダー統一 + 直接 await + R-39 構造防止 ★採用

- 概要: 上記 Decision の通り、 5 sub-decision 統合
- 良い点: user 提案 + bug fix 1 本化、 4 ペルソナ全員 ◎、 path 簡素化で再発防止仕組み化容易
- 悪い点: 40+ files 変更、 navigation 大改修
- 採用理由: 6 専門家チーム全員一致推薦、 user 承認

### Option B: bug fix のみ (カレンダー統一は別 PR)

- 概要: useFocusEffect deps 修正のみ、 navigation 遷移先は現状維持
- 良い点: 15 files 変更で最小修正
- 悪い点: user 提案を無視、 UX 改善ゼロ、 stale closure pattern を残す
- 却下理由: user 真意「カレンダー統一」 反映なし、 構造的再発リスク残存

### Option C: useRef pattern (最小修正)

- 概要: persistEventWithPayload を useRef で wrap、 ref を毎 render 更新で stale closure 完全排除
- 良い点: 8 files の最小修正、 即時 bug fix
- 悪い点: useRef pattern は熟練要、 後続が誤理解しがち、 UX 改善ゼロ
- 却下理由: 後続保守性 △、 user 提案未対応

### Option D: store-callback 全廃 + query param ベース統一 (radical)

- 概要: 全 picker / form を URL param で結ぶ、 pickerStore.\* deprecated
- 良い点: 構造統一で長期保守 ◎
- 悪い点: 80+ files 変更、 既存正常動作 (species picker / tag-edit 等) を壊すリスク大、 v1.0 前 blocker リスク高
- 却下理由: overkill、 既存 Case A/B (正当用途) を維持しつつ Case C のみ禁止する Option A が適切

---

## Consequences（結果：何が変わる？）

### Pro

- **Single 動線 DB 書込 bug 完全解消** (8 試行 100% 再現 → 0 件再現)
- **user 真意「作業記録カレンダー」 達成** (4 ペルソナ全員 ◎)
- **path 簡素化** (Single も Bulk も「記録する → カレンダー遷移」 で UI 整合)
- **stale closure 再発の 4 重防御** (R-39 + script + Maestro + PR テンプレ)
- **既存正常動作 (schedule mode Case A) は不変** (regression リスク最小)
- **記録 tab stub 解消** (Bulk 完了後 stub 表示 → カレンダー視認、 UX 改善)

### Con

- **40+ files 変更** (コア 9 + 文書 8 + テスト 22 + i18n 19 言語 × 5 keys)
- **PR レビュー工数増** (8-10 PR 分割、 1-2 セッション必要)
- **i18n 19 言語 × 5 keys = 95 文字列 rename** (機械的 replace 可、 翻訳品質は既存 key 流用)
- **ストア metadata 「予定タブ」 言及修正** (該当あれば 19 言語、 マイナーアップデート v1.0.x なら不要、 v1.1 として明示)

### Forward-only 互換性

- `events` / `photos` schema 不変、 既存 logged events / planned events への影響なし
- 既存 logged events は Plan tab / bonsai-detail history で従来通り表示
- `pickerStore.workLogConfirmResult` 削除は **使用箇所ゼロ確認後** (PR-6 で grep 検証)

---

## Implementation（実装メモ）

### Phase 構成 (Sess19、 計画書 `/home/doooo/.claude/plans/sess19-calendar-unified.md` 参照)

| Phase   | PR            | 内容                                                                                    |
| ------- | ------------- | --------------------------------------------------------------------------------------- |
| Phase 1 | PR-1 (本 ADR) | ADR-0031 起票 + ADR-0025/0027/0030 Notes Amended                                        |
| Phase 2 | PR-2          | i18n 19 言語 rename + 新 key 追加、 `pnpm i18n:check` 緑                                |
| Phase 3 | PR-3          | TabBar title rename + PlanScreen URL param 受信                                         |
| Phase 4 | PR-4          | WorkLogConfirm 直接 await + F-05 popup 移植 + bonsaiId URL param 拡張 (WorkPicker)      |
| Phase 5 | PR-5          | BulkLogConfirm 修正 (replace 先 + Toast 件数 hardcode 修正)                             |
| Phase 6 | PR-6          | bonsai-detail useFocusEffect 簡素化 + pickerStore.workLogConfirmResult API 削除         |
| Phase 7 | PR-7          | check-navigation-patterns.mjs AP-3 + R-39 起票 + PR テンプレ §7.6.4 拡張                |
| Phase 8 | PR-8          | Maestro flow DB 反映 assertion 強化 (work-log + bulk-log)                               |
| Phase 9 | PR-9          | 実機 SS R-25 評価 (Sess19 retro レポート、 14 種別 × Single + Bulk + schedule = ~14 SS) |

### testID 命名規約 (継承)

- `e2e_work_log_*` (Single)
- `e2e_bulk_log_*` (Bulk)
- 新規: `e2e_history_item_<type>_<date>` (Maestro flow assertion 用、 PR-8)

### testing 戦略

- Single Maestro flow `work-log-watering.yaml` 等で `e2e_work_log_save` tap → 1 秒待 → `e2e_history_item_watering_<today>` visible 検証必須
- Bulk Maestro flow `bulk-log-*.yaml` 同様
- schedule mode Maestro flow `work-schedule-*.yaml` regression なし確認 (既存 flow 緑)
- unit test `eventRepository.createEvent` spy で呼出回数検証 (将来追加検討)
- 実機 SS R-25 評価 (14 種別 × Single + Bulk + schedule = ~14 SS)

### F-05 popup 移植時の整合性

- `countSameDayPlannedOrLoggedEvents` は `src/db/eventRepository.ts` の export 関数 (component scope 不要)、 WorkLogConfirm から直接 import + call
- `useSettingsStore.getState().eventOverloadEnabled` で OFF 判定
- `Alert.alert` 3 ボタンは React Native 標準 (component scope 不要)
- 「そのまま登録」 = 同 handleSubmit 内の persist 関数を呼ぶ (fresh closure)

---

## Notes Amended (随時更新)

(初版 2026-05-21、 Sess19 進行中に更新予定)

### 2026-05-21 Sess23 ADR-0035 D1 起票で D2「予定 → カレンダー」 rename 取消 (revert)

ADR-0035 D1 (Phase ε) で以下を反映:

- **「カレンダー」 タブ → 「予定」 タブ** に **revert** (i18n 19 言語、 `tabCalendar` → `tabPlan` rename、 ja proper「カレンダー」 → 「予定」)
- 理由: user 真意「カレンダーは手段、 予定が目的」、 タブ tap = 予定入力動線の入口として動詞性が自然 (Sess23 議論で 4 ペルソナ全員 ◎/○)
- 本 ADR の D1 (Single 動線 DB 書込 path 直接 await + replace) / D3 (stale closure 撲滅) / D4 (F-05 popup 移植) / D5 (R-39 構造防止) は **引き続き有効**、 D2 (rename) のみ revert
- PlanScreen の route path `/(tabs)/plan` は不変、 表示名のみ戻す (内部実装影響なし)
- 関連: ADR-0035 D1 / Sess19 PR-3 #678 (タブ rename) は表示名のみ revert で URL param 受信 logic は維持
