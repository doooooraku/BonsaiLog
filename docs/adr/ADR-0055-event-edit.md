---


# ADR-0055: event 編集機能 (個別 row kebab メニュー経由、 Sess77)

- Status: Proposed
- Date: 2026-06-08
- Deciders: @doooooraku
- Related:
  - 連動: ADR-0008 (event data model、 STI + payload_json + updateEvent SoT) / ADR-0011 (記録のみ哲学、 本 ADR で Notes Amended) / ADR-0033 (i18n 翻訳ポリシー D1) / ADR-0036 (破壊的操作 UX、 kebab menu D7 拡張) / ADR-0049 (Pro 写真境界 ③ 流用)
  - 影響: R-65 (CRUD カバレッジ、 本 ADR で同時起票)
  - Issue: (新規起票)
  - PR: PR-1 (本 ADR 起票) / PR-2-5 (実装)

---

## Context（背景：いま何に困っている？）

### Sess76 配信前テスター苦情

- Sess76 で Android v1.0.0 versionCode 12 を Play Console Alpha track Draft submit 完了 (`main=eb4f490`、 rollout は user 手動)
- 配信前のテスター 12 人から 「過去の作業は一切入力させない方針でしょうか? 入力忘れの対応もできた方が良いと思いました」 という意見

### 真意 解析 (2 解釈)

- **解釈 ①** (バックデート登録): 「3 日前の水やりを今から登録したい」 → 既存 `LabeledDateRow` で過去日選択は可能だが、 UI の発見性が低い (placeholder 「日付を選択」 のみで「変更可能」 が読み取れない)
- **解釈 ②** (既存記録の編集): 「日付を間違えた」 「メモを直したい」 → 完全に未実装、 現在は「削除 + 再作成」 のみ。 EventRow の kebab ⋮ は削除のみ、 行 tap は bonsai-detail 遷移、 編集動線ゼロ。

### 困りごと

- v1.0 alpha rollout 直前にテスターから「修正できない」 苦情 → Play Store ★ 評価低下リスク
- 業務プロ user (100 鉢/日) の修正頻度高 → 解約理由
- 削除 + 再作成は破壊的操作 + 5 ステップ重複入力で UX 劣悪
- DB 層 `updateEvent(id, UpdateEventInput)` (`src/db/eventRepository.ts:264-309`) は **完全実装済 + FTS5 sync 付き**、 UI 動線がないだけ

### 制約 / 前提

- ADR-0008 (event data model): schema 不変、 `updateEvent` 既存 atomic 実装流用
- ADR-0011 (記録のみ哲学): 「AI 推奨提示なし」 哲学維持、 user 自発の Update は許容
- ADR-0033 (i18n D1): 19 言語、 ja+en proper、 17 lang fallback
- ADR-0036 (破壊的操作 D7): kebab menu pattern (RowActionMenu) 流用
- ADR-0049 (Pro 写真 ③): 編集モードでも `useProGuard({feature: 'photo_worklog'})` 同条件、 Grandfathered (4+ 枚) は表示 / 削除 OK 維持

---

## Decision（決めたこと：結論）

### 編集動線

- **kebab ⋮ menu に「編集」 item 追加**、 個別 row のみ + planned/logged 両方 (group row 対象外、 group は意味不明)
- 動線 2 経路: ① record / 予定タブ (calendar の RowActionMenu) ② bonsai-detail 履歴タブ (BonsaiHistoryTab の RowActionMenu)
- 「編集」 tap → `/work-log-confirm?eventId=...&bonsaiId=...&bonsaiName=...&type=...` push
- 既存 `WorkLogConfirmScreen` を **3 mode 拡張**: `new` (現状) / `convert` (planned → logged、 fromPlannedId trigger、 既存) / `edit` (eventId trigger、 新規)

### 編集モードの UX

- mount 時: `getEventById(eventId)` + `getAllPhotosByEventId(eventId)` で fetch → form prefill
- title: `Edit {type}` (i18n key `workLogTitleEditing`)
- save CTA: `Update` (i18n key `workLogUpdateCta`)
- 保存後: `updateEvent` + 写真差分 + `triggerSummaryReschedule(t)` + Toast `Updated` (i18n key `workLogUpdatedToast`) + `router.replace('/(tabs)/record?selectedDateKey=...')`
- 未保存ガード: 既存 `useUnsavedChangesGuard` 流用、 `initialFormStateRef` は prefill 完了後に同期更新

### 日付選択 発見性向上 (解釈 ①)

- `LabeledDateRow` 直下に inline hint テキスト「タップで日付を変更できます」 (i18n key `dateFieldHint`)
- 新規 / 編集両モードで毎回表示 (dismiss flag なし、 設定 store 触らない)
- Toast / onboarding tutorial は不採用 (Toast = 表示直後消滅、 tutorial = ADR-0018 で 5 step 確定済で scope 拡張要)

### 写真差分処理

- mount 時: 既存写真を `PhotoFieldItem & {id: photoId}` で hydrate (`PhotoField` の型に `id?: string` 追加)
- save 時 diff: 削除集合 = initialIds − currentIds、 追加集合 = id を持たない photos
- 実行順: ① `updateEvent` (atomic + FTS5) ② `removePhotoById(id)` 新規 (`photoOrchestrator` に追加) ③ `addPhotoFromUri` 既存
- partial failure: ① 失敗 → Alert、 ②③ 失敗 → Toast「写真の一部失敗」 + 通常遷移 (rollback はしない)
- 順序維持 (`photos.order_index`): v1.0 scope 外、 Consequences で明示

### 通知 reschedule

- 編集保存時、 `await cancelForEvent(eventId, t)` で 既存 scheduled を全 cancel → `void triggerSummaryReschedule(t)` で再計算
- wiring `scheduled_unwire_at` 変更時も SUMMARY 通知に反映

---

## Decision Drivers（判断の軸：何を大事にした？）

- **Driver 1 (最重要)**: CRUD U (Update) を v1.0 alpha rollout 前に完備、 テスター苦情 + 業務プロ user retention 改善
- **Driver 2**: 既存 ADR-0036 D7 kebab menu pattern の自然な拡張 (削除と並ぶ位置、 業界標準 = Apple Notes / Google Keep / Notion)
- **Driver 3**: `WorkLogConfirmScreen` 流用で実装コスト最小、 既存 `updateEvent` (DB 層完成済) で技術リスク最小
- **Driver 4**: R-65 で「機能の完備性」 を 構造的に再発防止 (ADR テンプレ CRUD Coverage section + docs-lint check)
- **Driver 5**: 6 専門家 + 4 ペルソナ全員一致推薦 (Sess77 議論)、 user 全 A 承認

### 4 ペルソナ評価 (R-10 整合)

| 改善                        | 高橋 62 (シニア)         | Marcus 35 (米国 IT) | 業務プロ (100 鉢)   | ライト (1-2 本) | 総合 |
| --------------------------- | ------------------------ | ------------------- | ------------------- | --------------- | ---- |
| 編集動線 (kebab に「編集」) | ◎ 安心 (削除と並ぶ)      | ◎ 業界標準          | ◎ 修正頻度高で効率↑ | ○ 直感          | ◎    |
| 日付 hint inline            | ◎ 老眼でも 11px readable | ○ 邪魔度低          | ◎ 過去日記録明示    | ○               | ◎    |

### 粒度 × 4 ペルソナ matrix (ADR-0036 由来、 R-65 整合)

| 粒度           | 高橋 62 | Marcus 35 | 業務プロ | ライト | 編集対応                             |
| -------------- | ------- | --------- | -------- | ------ | ------------------------------------ |
| 個別 (1 件)    | ◎       | ◎         | ◎        | ◎      | **対応 (本 ADR)**                    |
| group (まとめ) | △       | △         | △        | △      | 非対応 (意味不明、 個別行のみで十分) |
| bulk (全選択)  | △       | △         | △        | △      | 非対応 (v1.x 以降検討)               |

---

## Alternatives considered（他の案と却下理由）

### Option A: kebab menu に「編集」 追加 (個別 row のみ、 planned + logged 両方) ★採用

- 概要: 上記 Decision 全 6 sub-decision、 5 PR / 17 ファイル変更
- 良い点: 6 名チーム + 4 ペルソナ全員 ◎、 既存資産流用、 業界標準 UX
- 悪い点: kebab item 増加で 少しごちゃごちゃ (許容範囲)
- 採用理由: 6 名全員一致、 user 全 A 承認

### Option B: 行 tap で 編集画面に遷移

- 概要: EventRow.onPress を「編集遷移」 に上書き
- 良い点: 1 ステップ少ない、 Linear/Things 一部標準
- 悪い点: Sess35 PR-1 で確立した `memo inline expand` + bonsai-detail 遷移を破壊、 シニア偶発タップ事故
- 却下理由: regression リスク高、 業務プロ「100 鉢一覧スクロール中誤タップ」 不安、 4 ペルソナ △ 2/4

### Option C: A + B 両方

- 概要: kebab + 行 tap 両方 で 編集起動
- 良い点: 発見性 ◎
- 悪い点: 工数倍 (~25 ファイル)、 B のデメリットを全部抱える、 v1.0 GA 前 scope blocker
- 却下理由: 過剰、 v1.0 alpha rollout 前 scope

### Option D: スワイプ操作で 編集 (Gmail 風)

- 概要: react-native-gesture-handler の Swipeable で行を 右スワイプ → 編集 button
- 悪い点: 既存動線 3 つ (tap / longPress / kebab) に 4 つ目で混乱、 シニアスワイプ苦手、 a11y で片手 user 困難
- 却下理由: 学習コスト高、 4 ペルソナ ✕ 1/4

### Option E: 履歴改竄回避で 編集禁止 (現状維持)

- 概要: ADR-0011 「記録のみ哲学」 と整合性で edit 禁止
- 悪い点: alpha tester 第一声「日付を間違えた」 想定の UX 致命傷、 ADR-0011 哲学は「AI 推奨提示なし」 であって「user 自発 Update 禁止」 ではない
- 却下理由: 哲学解釈の誤り (ADR-0011 Notes Amended で明文化)

---

## Consequences（結果：嬉しいこと/辛いこと/副作用）

### Positive (嬉しい)

- **CRUD U 動線整備** (テスター苦情解消、 業務プロ retention 改善)
- **14 種別すべて編集可** (日付/payload/メモ/写真)
- **既存 ADR 整合維持** (ADR-0008/0011/0033/0036/0049 すべて整合)
- **R-65 構造的再発防止** (CRUD カバレッジ評価仕組み化、 同じ抜けが二度と起きない)
- **共通基盤** (`updateEvent` + `photoOrchestrator` + `useUnsavedChangesGuard` + RowActionMenu pattern すべて再利用)

### Negative (辛い/副作用)

- **写真差分 partial failure 可能性** (updateEvent atomic 後の写真処理で失敗時 Toast 通知のみ、 rollback なし)
- **履歴改竄リスク** (user 自身の record 改竄、 audit log 未実装 = v2.x 検討)
- **順序維持はスコープ外** (`photos.order_index` 編集は v1.1)
- **i18n 95 文字列追加** (5 keys × 19 言語、 ADR-0033 D1 workflow で吸収)

### Forward-only 互換性

- `events` / `photos` schema 不変
- 既存 callsite (new mode / convert mode) は default 'new' で後方互換
- mode 判定関数化、 fromPlannedId と eventId 排他 (dev assert)

---

## Implementation（実装メモ）

### Phase 構成 (5 PR、 #987-#991)

| Phase | PR   | 内容                                                                                                               |
| ----- | ---- | ------------------------------------------------------------------------------------------------------------------ |
| PR-1  | #987 | R-65 起票 + ADR テンプレ CRUD Coverage section + ADR-0011 Notes Amended + docs-lint 拡張 + 本 ADR (Proposed)       |
| PR-2  | #988 | `payloadToFormState` 純関数 + `PhotoFieldItem.id?` 拡張 + 14 種別 unit test                                        |
| PR-3  | #989 | `WorkLogConfirmScreen` edit mode 配線 + kebab「編集」 (record + bonsai-detail) + 日付 hint + i18n 5 keys × 19 lang |
| PR-4  | #990 | 写真差分 (`removePhotoById` 新規) + 通知 reschedule + 未保存ガード edit 対応                                       |
| PR-5  | #991 | Maestro 3 flows + 実機 SH-M25 verify + 本 ADR Accepted 化                                                          |

### 主要 file

- 新規: `docs/adr/ADR-0055-event-edit.md` (本 ADR)
- 修正: `src/features/event/WorkLogConfirmScreen.tsx` (3 mode 拡張)
- 新規: `src/features/event/payloadToFormState.ts` + test
- 修正: `src/features/calendar/CalendarTabScreen.tsx` (RowActionMenu items)
- 修正: `src/features/calendar/useCalendarEventActions.ts` (handleEditEvent)
- 修正: `src/features/bonsai/detail/useEventActions.ts` (kebab pattern 拡張)
- 修正: `src/features/bonsai/detail/BonsaiHistoryTab.tsx` (RowActionMenu)
- 修正: `app/(tabs)/bonsai/[id]/index.tsx`
- 修正: `src/components/form/PhotoField.tsx` (`PhotoFieldItem.id?`)
- 修正: `src/features/photos/photoOrchestrator.ts` (`removePhotoById` 新規)
- 修正: `src/core/i18n/locales/*.ts` (19 言語、 5 新規 keys)
- 新規: `maestro/flows/work-log-edit.yml` + `work-log-edit-from-history.yml` + `work-log-edit-cancel.yml`

### testing 戦略

- Unit: `payloadToFormState` 14 種別 × {正常 / 旧 field 名 / null / 不正 JSON / schema 違反} = 約 70 ケース
- Integration: `WorkLogConfirmScreen` edit mode prefill + isDirty + 写真差分 (RTL or hook 単体)
- E2E: Maestro 3 flows (record / bonsai-detail / cancel)
- 実機 (SH-M25): 14 種別 spot check + dark mode + TZ 罠 + 写真差分

---

## Acceptance / Tests（合否：テストに寄せる）

### 正 (自動テスト)

- **Jest**:
  - `src/features/event/payloadToFormState.test.ts` (約 70 case)
  - `src/features/event/WorkLogConfirmScreen.edit.test.tsx` (edit mode prefill / isDirty / 写真差分)
- **Maestro** (3 新規):
  - `work-log-edit.yml` (record タブ kebab 経由)
  - `work-log-edit-from-history.yml` (bonsai-detail 履歴タブ経由)
  - `work-log-edit-cancel.yml` (未保存ガード)
- **既存 maestro flow regression**: `log-event.yml` / `plan-tab-delete-*.yml` / `paywall-tag.yml` 全 PR で green 維持

### 手動チェック (実機 SS R-25 評価、 PR-5 retro)

構造系 4 項目:

- [ ] kebab menu に「編集」 表示 (planned + logged 個別 row のみ)
- [ ] edit mode タイトル「{type} を編集」 + Save CTA「更新する」 表示
- [ ] 日付欄直下 inline hint テキスト表示 (19 言語整合)
- [ ] 写真差分 (削除 + 追加) 反映

動線系 4 項目:

- [ ] kebab → 編集 → prefill 確認 → 1 field 変更 → 保存 → Toast → 戻って反映
- [ ] bonsai-detail 履歴 kebab も同一動線
- [ ] 未保存ガード dialog (Back キャンセル / 破棄)
- [ ] wiring `scheduled_unwire_at` 変更で 通知 reschedule

---

## Rollout / Rollback（出し方/戻し方）

- **リリース手順への影響**: v1.0 alpha rollout 前 phase、 SH-M25 Dev Build → 実機 SS R-25 評価 → main merge → versionCode 13 で alpha 再 submit (or rollout 開始)
- **ロールバック方針**: 5 PR を 順次 squash merge、 問題発生時は該当 PR revert (Sess14 PR-PP/RR revert pattern 既実績)。 mode 判定関数化で default 'new' 後方互換のため、 PR-3 revert で edit 動線のみ無効化可能
- **検知方法**: `pnpm verify` 緑 / Maestro 3 新 flow PASS + 既存 flow regression なし / 実機 SS R-25 構造系 + 動線系 PASS

---

## CRUD Coverage (R-65 整合、 ADR テンプレ新 section)

| Operation  | 状態              | 動線 / 制約                                                                                |
| ---------- | ----------------- | ------------------------------------------------------------------------------------------ |
| C (Create) | 対応              | record FAB / wiring-list 「外す」 / WorkPicker / plan→record convert (`useBulkActionFlow`) |
| R (Read)   | 対応              | record tab / 予定 tab / bonsai-detail 履歴 tab / 検索                                      |
| U (Update) | **対応 (本 ADR)** | record / 予定 / bonsai-detail 履歴 の kebab → 編集                                         |
| D (Delete) | 対応              | ADR-0036 (kebab → 削除 + ConfirmDialog + Toast)                                            |

---

## Links（関連リンク：正へ寄せる）

- constraints: `docs/reference/constraints.md`
- reference: `docs/reference/functional_spec.md` §7 (F-02、 本 ADR で改訂予定)
- PR: #987 (PR-1) / #988-#991 (PR-2-5)
- Issue: (新規起票、 PR-1 で同時)
- package.json: 既存依存のみ (新規 install ゼロ)
- CI: `pnpm verify` (15+ verify scripts) + Maestro
- 連動 ADR: ADR-0008 / ADR-0011 / ADR-0033 / ADR-0036 / ADR-0049
- 連動 R: R-65 (本 ADR 同時起票)

---

## Notes（メモ：任意）

### Sess77 議論プロセス

6 専門家 (テックリード / QA / UX/UI / PM / エンドユーザー / セキュリティ) + フラット視点 + 4 ペルソナ全員一致推薦、 user Q1-Q4 全 A + 解釈 ② 編集機能を中核 + 解釈 ① 発見性向上を副次タスクで両方対応 (B 案)、 アプローチ A (kebab に「編集」)、 今すぐ着手 (rollout 前)、 PR-1 で R-65 + ADR テンプレ + docs-lint 同時整備。
