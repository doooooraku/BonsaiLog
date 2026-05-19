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

## 関連 ADR / lessons

- `ADR-0024-bottom-sheet-removal-and-native-presentation.md` (modal 構造)
- `ADR-0025-bottom-tab-restructure.md` §Notes Amended 2026-05-19 Sess12 PR-G
- Sess12 retro (PR-F revert 経緯)
