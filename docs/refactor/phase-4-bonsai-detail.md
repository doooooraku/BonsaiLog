# Phase 4 — A1: 盆栽詳細画面 (`bonsai/[id]/index.tsx`) 分割計画

> 作成日: 2026-05-29
> 種別: 実装計画書(APPROVE 済)
> 上位: `./master-plan.md` Phase 4a A1
> 対象: `app/(tabs)/bonsai/[id]/index.tsx`(1,573 行 → 目標 ≤ 400 行)
> 前提: Phase 1〜3(安全網)完了・main マージ済(`ad1a3ca`)。本計画は **A1 のみ**、A2/A3 は A1 完了+人間レビュー後に別途承認。

---

## 目的

アプリ最大かつ最頻出の god component を、**ユーザー観察可能な挙動を 1 ミリも変えず**に Strangler Fig で小部品へ分割する。安全な部品から先に割り、テストの難所(写真 Undo・スクロール追従)は jest 特性化 + 実機検証とセットで最後に回す。

---

## 責務マップ(実コード全読で確定)

| ID    | 責務                  | 備考                                                        |
| ----- | --------------------- | ----------------------------------------------------------- |
| R1    | ルーティング/URL 引数 | `useLocalSearchParams<{id, tab?, focusEventId?}>`           |
| R2    | データ取得 `reload`   | bonsai+photos+events、`useFocusEffect`、pending 写真 filter |
| R3    | タブ状態              | `activeTab` history/timeline/basic                          |
| R4 ⚠️ | 写真 CRUD + 5 秒 Undo | pendingDeletion + ref + timer + finalize + undo + unmount   |
| R5    | 予定追加              | picker→DatePicker→createEvent(planned)、consumeWorkPicker   |
| R6    | 履歴タブ              | filter chip + 連続日 group + EventRow                       |
| R7 ⚠️ | スクロール追従        | focusEventId→measureLayout(Fabric 罠)                       |
| R8    | イベント削除          | ConfirmDialog + 長押し/kebab + Toast                        |
| R9    | アーカイブ            | ConfirmDialog→archiveBonsai→back                            |
| R10   | 基本情報タブ          | `useBonsaiBasicForm`(=A2、public API 不変)                  |
| R11   | Pro 判定              | 写真上限出し分け                                            |

ファイル内ヘルパー: `TimelineRow` / `BonsaiBasicSection` / `formatDate` / 巨大 StyleSheet(~350 行)。⚠️=テスト難所。

---

## 対象ファイル一覧

- **分割元**: `app/(tabs)/bonsai/[id]/index.tsx`
- **再利用(触らない)**: `src/features/bonsai/{BonsaiHero,PhotoCard,PhotoUndoBanner}.tsx`・`photoOrderUtils.ts`・`src/features/event/{EventRow,groupContinuousEvents}.ts`・`BonsaiBasicForm.tsx`(A2)
- **新規(抽出先 `src/features/bonsai/detail/`)**: `dateFormat.ts` / `BonsaiBasicSection.tsx` / `BonsaiTimelineTab.tsx` / `useBonsaiDetailData.ts` / `useBonsaiDetailTabs.ts` / `usePhotoCrudWithUndo.ts` / `useScrollToEvent.ts`
- **新規テスト**: `__tests__/features/bonsai/photoOrderUtils.test.ts` / `usePhotoCrudWithUndo.test.ts`

---

## 変更前後のディレクトリツリー

```
Before                                  After (A1 完了)
app/(tabs)/bonsai/[id]/index.tsx        app/(tabs)/bonsai/[id]/index.tsx (≤400行 coordinator)
  (1,573行・全部入り)                   src/features/bonsai/detail/  ★新規
                                        ├ dateFormat.ts / BonsaiBasicSection.tsx
                                        ├ BonsaiTimelineTab.tsx
                                        ├ useBonsaiDetailData.ts / useBonsaiDetailTabs.ts
                                        ├ usePhotoCrudWithUndo.ts ⚠️ / useScrollToEvent.ts ⚠️
                                        __tests__/features/bonsai/  ★新規
                                        ├ photoOrderUtils.test.ts
                                        └ usePhotoCrudWithUndo.test.ts
```

---

## ステップ(安全→難所の順、各 PR 独立・1 コミット = 1 責務、各 5 分以内)

| PR      | 内容                                                                                                                                                                    | 依存 | リスク |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------ |
| A1-1    | `formatDate`→`detail/dateFormat.ts`、import 差替                                                                                                                        | —    | 極小   |
| A1-2    | `BonsaiBasicSection`→独立ファイル(専用 styles 6 キーをコロケート、props 不変 `{form,onArchive,customPhotoBlock?,onMemoFocus?}`)                                         | —    | 小     |
| A1-3    | 予定タブ丸ごと→`BonsaiTimelineTab.tsx`(`TimelineRow` 同梱、timeline 系 styles も移動。props `{events,lang,t}` 自己完結)                                                 | A1-1 | 小     |
| A1-4    | R2→`useBonsaiDetailData({id,lang,pendingDeletionRef})`。`setPhotos/setCaptions` 露出。`pendingDeletionRef` は index.tsx 残置→引数注入。**R5 consume は index.tsx 残置** | —    | 中     |
| A1-5    | R3→`useBonsaiDetailTabs(initialTabParam)`(`setActiveTab` 露出)                                                                                                          | —    | 小     |
| A1-6 ⚠️ | (a)`photoOrderUtils.test.ts` 先張り→(b)R4→`usePhotoCrudWithUndo`(ref 所有移管)→(c)`renderHook`+ローカル `jest.useFakeTimers` 特性化                                     | A1-4 | 高     |
| A1-7 ⚠️ | R7→`useScrollToEvent({scrollRef,scrollContentRef})`。**focusEventId effect は index.tsx に残す**                                                                        | A1-4 | 高     |

`ultrathink` は A1-6/A1-7 のみ。

### 重要な落とし穴(Plan 検証で確定、厳守)

- **R2↔R4 循環**: `pendingDeletionRef` を R4 が所有し R2 へ引数注入で片方向化。A1-4 残置→A1-6 移管の 2 段。
- **useFocusEffect 発火順序**: R5 consume(166-173)が reload(231-235)より先に登録。**R5 consume は data フックに同梱せず index.tsx 冒頭に残置**し順序保持。
- **eslint-disable exhaustive-deps** 2 箇所はそのまま移送(deps 追加で挙動変化リスク)。
- **fake timers** はテストファイル内ローカル導入(global 変更しない)。
- **不変厳守**: ADR-0020/0024/0030/0036/0037/0041/0042 / AsyncStorage key / SQLite schema / URL route / i18n key 変更なし。

---

## ロールバック手順

各 PR 独立 squash merge → `git revert <sha>` で単独巻き戻し。抽出は「新規作成→呼出置換→旧削除」順で途中でも revert 可。A1-6/A1-7 で振る舞い差検知 → 当該 PR のみ revert + 原因報告で停止(Rule 6)。

---

## 成功判定基準

- [ ] `app/(tabs)/bonsai/[id]/index.tsx` ≤ 400 行
- [ ] 各 PR で `pnpm tsc --noEmit && pnpm lint && pnpm test` 緑でのみコミット
- [ ] A1-6 で photoOrderUtils + usePhotoCrudWithUndo 特性化テスト追加・緑
- [ ] 各 PR で該当タブ実機目視、A1-6/A1-7 は実機 SS 添付
- [ ] ADR 違反ゼロ・key/route/i18n 変更ゼロ(PR 本文 self-check)
- [ ] 各 PR 後 `/code-review` 実行 + Explore で FSD 境界審査

---

## 検証方法(end-to-end)

1. 単体: `pnpm test`(node22)でフック特性化 + 純関数テスト緑
2. 静的: `pnpm tsc --noEmit` / `pnpm lint`(typed-lint・strict-type-checked)/ `pnpm verify:dead`(knip)緑
3. 実機(完了の鉄則): Dev Build install → 3 タブ操作 + 写真 追加/削除/Undo/離脱 + focusEventId ジャンプ → 振る舞い差ゼロ目視 + `adb screencap` SS → PR 添付
4. Maestro: 既存 `ui-diff/bonsai-detail*.yml` 緑維持。A1-6/A1-7 用 characterization flow 追加検討
