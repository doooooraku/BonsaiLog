# ADR-0030: Navigation patterns 統一 — store-callback 使用条件限定 + WorkPicker 直接 push 化 (Sess18 実装)

- Status: Accepted
- Date: 2026-05-21
- Deciders: @doooooraku
- Related: ADR-0024 (modal 一本化、 native presentation 置換 Phase G) / ADR-0025 (4 タブ構成 + 予定/記録タブ action 起動) / ADR-0027 (作業記録 form 統合 Phase α-β) / ADR-0029 (Form UX 恒久化 Phase γ) / `docs/reference/tasks/lessons/navigation.md` (Sess12 PR-F/G 確立、 expo-router navigation 罠 3 件) / `.claude/recurrence-prevention.md` R-36 (navigation API 1 次情報確認 + 実機検証必須) / Sess17 議論 (戻るボタン skip 違和感)

---

## Context（背景：いま何に困っている？）

### 戻るボタン skip 違和感 (Sess17 user 指摘)

user が実機で操作した結果、 「植替えを記録」 (WorkLogConfirm) 画面で ← (戻る) を押すと、 期待される「作業を選ぶ」 (WorkPicker) 画面ではなく、 1 つ飛ばして「盆栽詳細」 画面に直接戻る挙動を確認:

```
user の体感: bonsai-detail → WorkPicker → WorkLogConfirm → ← → ★WorkPicker (期待)
実際の挙動: bonsai-detail → WorkPicker → WorkLogConfirm → ← → ★bonsai-detail (skip)
```

### 根本原因 — store-callback pattern の使用

`src/features/event/WorkPickerScreen.tsx` L40-L43:

```ts
const handleSelect = (type: EventType) => {
  usePickerStore.getState().setWorkPickerResult({ type, mode });
  router.back(); // ★WorkPicker を pop してから...
};
```

`app/(tabs)/bonsai/[id]/index.tsx` L164-L201 (useFocusEffect):

```ts
useFocusEffect(
  React.useCallback(() => {
    const workResult = usePickerStore.getState().consumeWorkPickerResult();
    if (workResult) {
      if (workResult.mode === 'log') {
        handleWorkPickerSelect(workResult.type); // ★router.push('/work-log-confirm') を実行
      }
    }
    // ...
  }),
);
```

つまり「WorkPicker → cell tap → router.back() で WorkPicker pop → bonsai-detail に戻る → useFocusEffect が consume → router.push('/work-log-confirm')」 という store-callback chain で、 WorkLogConfirm から ← 戻ると WorkPicker は既に pop 済のため bonsai-detail に直行する。

### なぜなぜ 5 段階分析の結論

1. なぜ 1: WorkPicker → cell tap で store-callback pattern (router.back() + setWorkPickerResult + caller useFocusEffect で router.push) を使用
2. なぜ 2: Phase G2 (ADR-0024) で BottomSheet → 全画面化した時、 BottomSheet 時代の store-callback pattern を画面遷移に流用、 直接 router.push の選択肢が議論されなかった
3. なぜ 3: navigation API (router.push / router.back / router.replace / store-callback) の使い分け基準が design_system.md に明文化されていない
4. なぜ 4: 「user の戻る体感が 1 画面ずつであるべき」 という UX 原則 (Material Design Up navigation + iOS HIG Back navigation) が docs に明示されていない
5. なぜ 5: R-36 (navigation API 1 次情報確認) は API 仕様の正しさのみ評価、 user 体感の back 動作チェックリストが含まれない

**根本原因**: navigation pattern の UX 哲学不在 + store-callback pattern の濫用 + R-36 の UX 評価不足

### 既存資源 (流用 / 改訂)

- `docs/reference/tasks/lessons/navigation.md` Sess12 PR-F/G 確立済 (expo-router 罠 3 件 + ベストプラクティス table)
- `.claude/recurrence-prevention.md` R-36 既存 (1 次情報確認 + 実機検証必須)
- `src/stores/pickerStore.ts` の `setWorkPickerResult` / `consumeWorkPickerResult` (Sess12 確立)

---

## Decision（決めたこと：結論）

### D1: navigation pattern の UX 哲学を明文化

`docs/reference/design_system.md` §17 「Navigation patterns」 を新設し、 以下 3 原則を明記:

- **原則 P1 (Up navigation)**: user 体感の戻る挙動は **1 画面 = 1 step** (Material Design Up navigation + iOS HIG Back navigation 整合)。 ← back button / 画面端 swipe gesture の両方が同じ挙動
- **原則 P2 (store-callback 使用条件限定)**: store-callback pattern (`router.back() + setX + caller の useFocusEffect で consume`) は以下のいずれかの場合のみ許容:
  - **Case A**: picker → 結果が**即時 dialog** (DatePicker / Alert.alert 等) を呼び出す場合 (例: WorkPicker schedule mode → showDatePicker dialog)
  - **Case B**: picker → 結果で**caller の state のみ更新**、 次の画面遷移を伴わない場合 (例: species-picker → caller の speciesId state 更新)
  - **Case C**: 上記以外で「次の画面に進む」 用途 → store-callback 禁止、 **直接 router.push 必須**
- **原則 P3 (router.replace 使用条件)**: `router.replace` は「modal 系 stack を tab に switch する時のみ」 (Sess12 PR-G で確立、 `router.replace('/(tabs)/plan')` 等)。 同 stack 内の screen 置換用途では使用しない

### D2: WorkPicker → WorkLogConfirm の直接 push 化 (Sess18 実装)

`src/features/event/WorkPickerScreen.tsx` を修正:

```ts
const handleSelect = (type: EventType) => {
  if (mode === 'log') {
    // 直接 router.push で WorkLogConfirm に進む (Case C: 次画面遷移)
    router.push(
      `/work-log-confirm?bonsaiName=${encodeURIComponent(bonsaiName)}&type=${type}` as Href,
    );
  } else {
    // schedule mode は dialog (DatePicker) を caller で呼ぶ Case A
    // store-callback pattern 維持 (router.back() + setWorkPickerResult)
    usePickerStore.getState().setWorkPickerResult({ type, mode });
    router.back();
  }
};
```

`app/(tabs)/bonsai/[id]/index.tsx` の useFocusEffect は schedule mode のみ残す:

```ts
useFocusEffect(
  React.useCallback(() => {
    const workResult = usePickerStore.getState().consumeWorkPickerResult();
    if (workResult && workResult.mode === 'schedule') {
      handleSchedulePickerSelect(workResult.type); // Case A: DatePicker dialog
    }
    // log mode は WorkPicker から直接 push されるため、 caller consume 不要
    // ...
  }),
);
```

**WorkLogConfirm の save handler** (`handleSubmit` 内) は引き続き store callback (`setWorkLogConfirmResult`) で payload を caller に返却 → router.back() で WorkPicker に戻る。 これは Case B (caller の state 更新で次画面遷移なし) なので維持。

### D3: 自動検出仕組み

`scripts/check-navigation-patterns.mjs` 新規:

- `src/**` を grep して以下 anti-pattern を検出:
  - **AP-1**: 同一 file 内に `router.back()` + `setX(...)` + `useFocusEffect` の 3 セット (= store-callback pattern + 次画面遷移の疑い)
  - **AP-2**: `router.replace` の使用箇所 (D1 原則 P3 整合性確認)
- 検出時は warning 出力、 各箇所に「Case A/B/C のいずれか」 を ADR-0030 D1 で判断する促し

### D4: R-36 強化

`.claude/recurrence-prevention.md` R-36 に以下チェックリスト項目追加:

- [ ] **R-36.4 (UX 評価必須)**: 新規 navigation 実装時、 「← で戻ったら user は何画面戻ったと感じるか」 を議論 step として必須化
- [ ] **R-36.5 (実機検証義務)**: navigation 変更を伴う PR は実機で back gesture + ← button の挙動 SS を PR 添付必須 (PR テンプレ §7.6 拡張)

### Sess17 / Sess18 の分割

- **Sess17**: 本 ADR 起票のみ、 実装は Sess18
- **Sess18**: D2 実装 (WorkPicker 直接 push 化 + caller useFocusEffect 整理) + D3 (check-navigation-patterns.mjs) + D4 (R-36 強化)

理由: navigation refactor は影響範囲広く高リスク (store-callback chain を解く際の regression リスク)、 単独セッションで集中するべき (Plan agent critical review 推奨)

---

## Decision Drivers（判断の軸：何を大事にした？）

- **Driver 1 (最重要)**: user 真意「1 画面ずつ戻る」 = Material/iOS HIG 整合
- **Driver 2**: 既存 lessons/navigation.md (Sess12 PR-F/G) + R-36 の延長線、 既存知見を仕組み化に昇華
- **Driver 3**: Sess18 単独セッションで集中、 regression リスク最小化 (Plan agent critical review 推奨)
- **Driver 4**: store-callback pattern の正当な用途 (Case A/B) は維持、 不正な用途 (Case C) のみ禁止 (過剰な禁止を避ける)

---

## Alternatives considered（他の案と却下理由）

### Option A: WorkPicker 直接 push + 原則明文化 + 自動検出 ★採用

- 概要: 上記 Decision の通り
- 良い点: user 体感整合 + 仕組み化で再発防止 + 既存 store-callback の正当用途は維持
- 悪い点: Sess18 単独セッション要、 navigation refactor の regression リスク
- 採用理由: user 真意整合 + Plan agent 推奨

### Option B: 全画面で store-callback pattern を廃止 (radical)

- 概要: pickerStore の callback API を全廃、 全 navigation を router.push 直接化
- 良い点: navigation pattern 完全統一
- 悪い点: schedule mode (DatePicker dialog) や species/style picker などの正当用途も改変要、 影響範囲爆発
- 却下理由: 過剰、 正当用途を維持しつつ不正用途のみ禁止する Option A が適切

### Option C: WorkPicker 直接 push のみ (docs / 自動検出なし)

- 概要: D2 のみ実装、 D1 docs / D3 自動検出 / D4 R-36 強化なし
- 良い点: Sess18 工数最小
- 悪い点: 他の navigation 箇所で再発、 仕組み化なし
- 却下理由: user 真意「対処療法でなく恒久対策」 に反する

---

## Consequences（結果：何が変わる？）

### Pro

- **user 体感の戻る挙動が 1 画面 = 1 step に統一** (Material/iOS HIG 整合)
- **navigation pattern の使い分け基準が明文化**、 将来の picker / screen 追加時に判断ぶれない
- **store-callback pattern の正当 / 不正用途の自動検出**、 仕組み化で再発防止
- **R-36 強化で議論時の UX 評価義務化**、 navigation 設計の質向上

### Con

- **Sess18 単独セッション要** (規模 10-12 PR、 navigation 中心)
- **既存 store-callback 箇所の用途別分類が必要** (species/style/work/tag-edit/bonsai-multi-select 等 15+ 箇所)、 grep + 手動分類のコスト

### Forward-only 互換性

- `pickerStore` の API は当面維持 (Case A/B の正当用途で継続使用)
- 既存 logged events / planned events への影響なし (navigation のみ変更、 DB schema 不変)

---

## Implementation（実装メモ）

### Phase 構成 (Sess18 で実装、 Sess17 では本 ADR 起票のみ)

| Phase     | PR   | 内容                                                              |
| --------- | ---- | ----------------------------------------------------------------- |
| Phase 7-1 | 1 PR | design_system.md §17 「Navigation patterns」 新設 (D1 原則 P1-P3) |
| Phase 7-2 | 1 PR | WorkPicker 直接 push 化 + caller useFocusEffect 整理 (D2)         |
| Phase 7-3 | 1 PR | check-navigation-patterns.mjs 新規 (D3)                           |
| Phase 7-4 | 1 PR | R-36 強化 + PR テンプレ §7.6 拡張 (D4)                            |
| Phase 7-5 | 1 PR | 実機 SS — 14 種別 form の back gesture + ← button 挙動検証        |

### testID 命名規約 (継承)

- 既存 testID (`e2e_work_picker_*` / `e2e_work_log_*`) は変更なし、 Maestro flow 互換維持

### testing 戦略

- 既存 Maestro flow (`maestro/flows/work-log-*`) が緑であること
- 新規 Maestro flow `work-log-back-navigation.yaml` で 1 step back 挙動検証
- 実機 SS で ← + swipe gesture の両方確認 (R-36.5)

---

## Notes Amended (随時更新)

(初版 2026-05-21、 Sess18 実装時に更新予定)
