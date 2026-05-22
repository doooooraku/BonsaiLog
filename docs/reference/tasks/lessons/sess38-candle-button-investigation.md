# Sess38 副次調査 — 芽切り form 初回「1件にまとめて記録」 button 不発の根本原因

- **実施日**: 2026-05-23 (UTC) / 07:49-08:00 JST
- **実機**: SH-M25 (シャープ AQUOS、 Android、 720×1520)
- **症状**: Sess38 PR-2 (#820) 実機検証で発見した副次的 issue (sess38-pr1-verification.md §5「副次的観察」 で記録済)
- **目的**: 真因特定 + lessons 化 + 構造的問題の別 issue 起票

---

## 1. 真因確定 (2 layer)

### 真因 ① (即時、 test 操作の罠)

**KEYCODE_BACK 連打が Android IME 制御 + navigation back の dual purpose race を引き起こした**

#### 検証手順

1. 芽切り form を開く (FAB → 盆栽選択 → 一括記録 → 芽切り)
2. uiautomator dump で button「1件にまとめて記録」 bounds 確認: **[28, 1384][692, 1482] center (360, 1433)**
3. 本数 input tap (360, 892) → text "5" → KEYCODE_BACK → 1 sec sleep
4. メモ field tap (360, 1123) → text "Repro_test..." → KEYCODE_BACK → 2 sec sleep
5. **button tap 前** に screencap → **既に「作業 grid」 画面に戻っていた** (d3-before-tap.png で確認)

#### 原因解説

Android 物理戻るボタン (KEYCODE_BACK) は仕様上 **dual purpose**:

- IME 開いている時: IME を閉じる
- IME 閉じてる時: navigation back (画面 pop)

text 入力後の IME 状態は race condition:

- Case A: text 入力で IME 保持 → KEYCODE_BACK で IME 閉じ → 画面残存 (期待動作)
- Case B: text 入力後の極短時間で IME が一時 dismiss → **KEYCODE_BACK で navigation back に bypass** → 画面 pop (本事象)

防除・消毒 form (3 fields + KEYCODE_BACK 3 回) では Case A、 芽切り form (2 fields + KEYCODE_BACK 2 回) では Case B が発生した。

### 真因 ② (構造、 app 側の UX risk)

**`src/features/event/BulkLogConfirmScreen.tsx` + 全 form 画面に `BackHandler` / `useFocusEffect` / `preventDefault` 一切なし** → Android 物理戻るボタン即 pop で **未保存 changes 確認 dialog なし**

#### 検証 grep

```bash
grep -nE "BackHandler|hardwareBack|useFocusEffect|router.back|preventDefault|beforeRemove" \
  src/features/event/BulkLogConfirmScreen.tsx \
  src/features/event/*.tsx \
  src/components/form/*.tsx
# → 0 件 (全くなし)
```

#### UX risk

- user が誤って物理戻るボタンを押すと form 入力内容が即消失
- ADR-0036 R-44 (破壊的操作 UX) は破壊「操作」 のみ対象、 「画面離脱による入力消失」 は scope 外
- 業界事例: Material 3 Dialog / iOS HIG「Discard Changes」 alert pattern が標準

---

## 2. R-55 / R-56 適用実証

| Self-check           | 結果                                                                                                                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ①同パターン全件 grep | BackHandler を全 form file (BulkLogConfirm + WorkLogConfirm + BonsaiCreate + WorkLogTypeFormFields + LabeledNumberInput 等) で grep → 0 件                                              |
| ②i18n key inventory  | (該当なし)                                                                                                                                                                              |
| ③整合性検証          | ADR-0036 R-44 scope と「画面離脱」 の差分 = R-44 拡張候補                                                                                                                               |
| ④副次的問題発見      | 「test 操作の罠 (KEYCODE_BACK 連打)」 と「app 構造 UX risk」 の 2 layer に分離 (Plan agent 仮説「button disabled lock」 は 2 回目 button tap 成功と矛盾で却下、 実機 dump で別仮説特定) |
| ⑤PR 範囲拡張判断     | 本 PR (lessons + issue 起票) と app 修正 (R-44 拡張 PR) を分離                                                                                                                          |

R-56 効果実証: Explore agent 仮説 1 (handleSave button disabled lock) を実機 dump で却下、 推測ベース判断回避。

---

## 3. 別 issue 起票推奨内容

### Title: `[UX] form 画面で未保存 changes 時の物理戻るボタン確認 dialog (R-44 拡張候補)`

### Body

#### 背景

Sess38 PR-1 実機検証で「芽切り form 入力途中で物理戻るボタンが反応 → 入力内容消失」 を発見 (sess38-candle-button-investigation.md 参照)。 BulkLogConfirmScreen.tsx + 全 form 画面で `BackHandler` 制御なし。

#### 提案

1. 全 form 画面 (BulkLogConfirm / WorkLogConfirm / BonsaiCreate 等) で `useFocusEffect` + `BackHandler.addEventListener('hardwareBackPress', ...)` で未保存 changes 検知
2. 未保存 changes あり時に ConfirmDialog (ADR-0036 D1-D3 pattern 流用) で「破棄しますか?」 確認
3. 未変更時はそのまま back navigation 許可

#### 関連

- ADR-0036 R-44 拡張候補 (「破壊的操作」 → 「画面離脱による入力消失」 にも適用)
- Sess38 副次調査 (本 lessons)
- 既存 ConfirmDialog component 流用可能

---

## 4. test 操作 know-how (今後の adb 検証で活用)

### NG pattern (race condition リスク)

```bash
# text 入力直後の KEYCODE_BACK で IME 閉じ → 次の KEYCODE_BACK で navigation back に bypass
adb shell input tap <input>
adb shell input text "..."
adb shell input keyevent KEYCODE_BACK  # IME 閉じ
# ↓ 次の field tap までの間に IME が race で閉じる可能性
adb shell input tap <next_input>
adb shell input text "..."
adb shell input keyevent KEYCODE_BACK  # ← ここで navigation back!
```

### OK pattern (推奨)

```bash
# IME 閉じは KEYCODE_BACK ではなく別 element tap で
adb shell input tap <input>
adb shell input text "..."
adb shell input tap 50 50  # 空白部分 tap で IME 閉じ + field focus 外す
# or
adb shell input keyevent KEYCODE_ENTER  # Enter で確定 (一部 input で IME 閉じ)
```

### or 確実な方法: uiautomator dump で IME 状態判定後に判断

```bash
adb shell dumpsys input_method | grep mInputShown
# mInputShown=true なら IME 開いてる、 false なら閉じてる
```

---

## 5. 結論

| 項目                                              | 結果                                                                                |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Sess38 PR-1 実装側の bug                          | **なし** (button bounds [28, 1384][692, 1482] で y=1435 tap は正常 hit)             |
| Plan agent 仮説 (handleSave button disabled lock) | **却下** (2 回目 tap 成功と矛盾)                                                    |
| 真因 ① (test 操作)                                | KEYCODE_BACK 連打 + Android IME race で navigation back が発火                      |
| 真因 ② (構造)                                     | 全 form 画面で `BackHandler` 制御なし、 未保存 changes 確認 dialog 未実装           |
| 修正                                              | **app 側修正は別 issue で対応** (R-44 拡張 候補)、 本 PR は lessons + know-how のみ |
| Sess38 PR-1 動作影響                              | **なし** (chip 単位 / fontSize / memo ラベル は全て正常動作確認済)                  |

---

## 6. SS リスト (`/tmp/sess38-candle-debug/`)

| #          | SS                       | 内容                                                              |
| ---------- | ------------------------ | ----------------------------------------------------------------- |
| d0         | d0-current.png           | 検証開始時 (盆栽タブ)                                             |
| d1         | d1-bonsai-select.png     | FAB tap 後 盆栽選択画面                                           |
| d2         | d2-candle-form-empty.png | 芽切り form 初期表示 (Twin-Trunk Juniper、 範囲=そこそこ default) |
| **d3**     | **d3-before-tap.png** ⭐ | **button tap 前に作業 grid に戻った決定的証拠**                   |
| logcat.log | (1315 lines)             | RNScreens warning のみ、 navigation back の直接ログなし           |

---

## 7. 関連

- Sess38 PR-2 (#820) sess38-pr1-verification.md §5「副次的観察」 で報告済
- Sess38 PR-3 (#821) R-56 起票 (本調査で実証 2 回目)
- ADR-0036 R-44 (破壊的操作 UX、 拡張候補)
- BulkLogConfirmScreen.tsx (修正対象、 別 PR)
- WorkLogConfirmScreen.tsx (同上)
- BonsaiCreateScreen 等の全 form 画面 (同上)
