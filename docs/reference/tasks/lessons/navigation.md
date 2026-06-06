# Navigation Lessons (Sess12 PR-G 確立)

expo-router の navigation API は **仕様未確定/直感に反する挙動** が多く、 実機検証で
発覚した罠を集約。 新規 navigation コード追加時に必ず一読推奨。

## 罠 1: `router.dismissAll()` は nested modal で 1 階のみ閉じる

### 症状

modal stack が 2 階以上 (例: BonsaiMultiSelect → BulkWorkPicker) のとき、
`router.dismissAll()` で **最上位の 1 階のみ閉じる**、 root stack まで戻らない。

### 実例 (Sess12 PR-B+C)

```
[予定タブ] FAB tap
  → router.push BonsaiMultiSelect (1 階)
  → BonsaiMultiSelect で確定 → router.push BulkWorkPicker (2 階)
  → BulkWorkPicker で 水やり tap → bulkScheduleEvents + Toast
  → router.dismissAll()  ★ ここで 2 階のみ閉じる、 BonsaiMultiSelect 残存!
[BonsaiMultiSelect] (user は ← で予定タブまで戻る必要)
```

### 解決策

完了時の navigation には **`router.replace('/(tabs)/...)`** を使う:

```ts
// schedule mode の完了
router.replace('/(tabs)/plan' as Href);
// log mode の完了
router.replace('/(tabs)/record' as Href);
```

理由:

- `replace` は **目的タブを明示**、 modal stack 全体を unmount + tab 画面に直接遷移
- 副作用なし、 安全、 user 直感的

## 罠 2: `while (router.canDismiss()) { router.dismiss(); }` は無限 loop

### 症状

`canDismiss()` が root stack 到達後も `true` を返し続け、 loop が抜けない →
**JS thread freeze** → 画面 tap 反応なし、 ← back も効かない深刻 freeze。

### 実例 (Sess12 PR-F 改善 I)

PR-F で dismissAll の 1 階問題を回避するため canDismiss loop を導入したが、
実機検証で水やり tap → 画面 freeze、 logcat に JS error なし (silent freeze)。
1 commit revert (`0b0f41a`) で `dismissAll` 単発に戻して fix。

### 教訓

- `canDismiss()` の挙動を **1 次情報 (expo-router docs / source) で確認せず使用しない**
- 「`while (canX) { doX() }` パターン」 は無限 loop リスク、 max iteration limit 必須
- 不確実な API は test 環境 + 実機で挙動確認してから採用

## 罠 3: `router.replace` 後の back gesture で前 modal が出ない

### 症状

`router.replace('/(tabs)/plan')` の後、 user が back gesture (左→右 swipe) で
前 modal を呼び戻そうとしても、 すでに unmount されているので動作しない。

### 解決策

これは仕様であり、 「完了画面で戻り無効」 が user 期待。 「完了 → 戻ってやり直し」
を許容するなら別 navigation pattern (例: confirm dialog) を検討。

## ベストプラクティス

| 操作                     | 推薦 API                         | 理由                                       |
| ------------------------ | -------------------------------- | ------------------------------------------ |
| 進む (画面遷移)          | `router.push`                    | 戻り可能、 history 維持                    |
| 上書き (flow control)    | `router.replace`                 | history 残らない、 完了後に使う            |
| 戻る (1 階)              | `router.back`                    | スタック pop、 default back gesture と同じ |
| **完了 (modal 全閉じ)**  | `router.replace('/(tabs)/...)`   | nested modal でも安全                      |
| ❌ 完了 (modal 1 階閉じ) | `router.dismissAll` (NG)         | 仕様が直感に反する、 1 階のみ閉じる        |
| ❌ 全 modal 閉じる loop  | `canDismiss + dismiss loop` (NG) | 無限 loop リスク                           |

## 罠 4: 子画面 `router.push` から戻ると親 ScrollView の contentOffset が 0 リセットされる (Sess72 R-63)

### 症状

form 画面 (例: 盆栽 新規登録、 詳細画面) でユーザーが画面の中盤までスクロール → 子画面 (例: tag-edit) に `router.push` → 戻ってくると、 親画面が **画面の先頭 (contentOffset.y = 0)** に巻き戻されている。

### 実例 (Sess72 テスター苦情)

> 「タグ追加画面から基本情報画面に戻ると、 必ず画面の先頭に戻ってしまうのが気になりました。」

```
[BonsaiCreate] スクロール → タグ欄 (高さ 420px) で [+ 追加] tap
  → router.push('/tag-edit?returnTo=bonsai-create')
[tag-edit] 名前 + 色入力 → [保存] tap → router.back()
[BonsaiCreate] 戻った瞬間に scroll 位置 = 0 (樹種欄まで巻き戻り) 😢
```

### 真因

React Navigation native-stack は parent screen 自体は unmount しない (= JS state は preserve)。 しかし:

1. 戻った瞬間 `useFocusEffect` 内で `usePickerStore.getState().consumeTagAddResult()` → 新タグ ID 取得
2. `setSelectedTagIds(prev => prev.add(newId))` (state 更新 1 回目)
3. `getRecentTags(8).then(setRecentTags)` 非同期で 0 件 → 1 件に変化 (state 更新 2 回目)
4. `BonsaiTagsSection` の JSX 分岐 (`recentTags.length === 0 ? <縦並び> : <横並び>`) が変化
5. 子要素の高さ変動 → 親 ScrollView の **contentSize.height が変動**
6. ★ native ScrollView は contentSize 変動時に「安全のため contentOffset を 0 にリセット」 (RN 実装挙動)

ユーザー視点では「子画面に行って戻ると先頭に巻き戻される」 という UX 退行になる。

### 解決策

`src/core/hooks/useScrollPreservation.ts` (Sess72 PR-1 #969) を適用:

```tsx
import { useScrollPreservation } from '@/src/core/hooks/useScrollPreservation';

const scrollRef = React.useRef<ScrollView>(null);
const { onScroll, scrollEventThrottle } = useScrollPreservation(scrollRef);

<ScrollView ref={scrollRef} onScroll={onScroll} scrollEventThrottle={scrollEventThrottle}>
  ...
</ScrollView>;
```

hook 内:

- `onScroll` で `contentOffset.y` を `useRef` に保存
- `useFocusEffect` + `requestAnimationFrame` で setState commit 後の描画タイミングに `scrollTo` 復元 (race 防止)

### 適用先 (Sess72 PR-2/3/4 完遂)

- `src/features/bonsai/BonsaiCreateScreen.tsx` (新規登録 modal)
- `app/(tabs)/bonsai/[id]/index.tsx` (詳細画面、 タブ式)
- `app/export/index.tsx` (Export Hub)

### 除外 (子画面 push なし)

- `WorkLogConfirmScreen.tsx` / `BulkLogConfirmScreen.tsx`: `router.replace` のみ
- `app/export/pdf.tsx`: FlatList ベース (ScrollView ではない) + 内部 share sheet のみ

除外は `// scroll-preservation: no-child-push (<理由>)` 注釈で明示。

### 仕組み化

`scripts/check-form-screen-scroll.mjs` (R-51 既存) に R-63 拡張:

- FormScreenHeader を使う画面で `router.push` あり + `useScrollPreservation` 未 import なら **warn**
- warn 起動 → 違反 0 確認後 error 昇格 (Sess68 と同じ階段)

### 関連

- ADR-0040 D5 Amendment (Sess72 PR-5)
- R-63 (`.claude/recurrence-prevention/specialized.md`)
- design_system.md §23-3 (Scroll 位置保持 hook)
- PR-1 #969 (`useScrollPreservation` hook 新設 + Jest 6/6)

## 関連 ADR / lessons

- `ADR-0024-bottom-sheet-removal-and-native-presentation.md` (modal 構造)
- `ADR-0025-bottom-tab-restructure.md` §Notes Amended 2026-05-19 Sess12 PR-G
- `ADR-0040-form-screen-scroll-unification.md` D5 Amendment (Sess72 PR-5)
- Sess12 retro (PR-F revert 経緯)
- Sess72 plan (`~/.claude/plans/6-bonsailog-squishy-glacier.md`、 R-63 / scroll preservation 全討議記録)
