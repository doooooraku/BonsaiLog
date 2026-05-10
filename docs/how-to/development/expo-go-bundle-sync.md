# ExpoGo Bundle 同期トラブルシューティング (T1-5)

> **このファイルのロール**: PR merge 後に ExpoGo / Dev Client で実機反映されない場合の調査 + 修正手順。R-29 写経駆動開発の Step 4 (実機検証) で問題発生時の標準対応。

最終更新: 2026-05-10 (T1-5、Tier 1a 基盤整備)

---

## 背景

本セッション (2026-05-10) ユーザー報告:

- PR #341/#342/#350 を merge **後** に ExpoGo で撮影したスクショで:
  - BonsaiCard チェックマーク overlay → 表示されない
  - SelectionToolbar (一括記録 / 予定追加) → 表示されない
  - FAB の selectMode 連動非表示 → 連動せず常時表示
  - HomeHeader「N件選択中」 → 表示されない

→ **コードは反映されているが実機で render されない** = 同期問題の可能性。

---

## 5 段階 systematic 調査フロー

### Step 1: Metro --clear で再起動 + 再撮影

最も多い原因。Metro server の bundle cache が古い版を返している。

```bash
# 別ターミナル (WSL2)
PATH=/home/doooo/.local/bin:/home/doooo/.nvm/versions/node/v22.22.2/bin:/usr/bin:/bin \
  corepack pnpm dev --clear
```

**コマンド意味**:

- `pnpm dev`: Metro server (bundler) 起動
- `--clear`: cache を完全クリアしてから起動 (約 30 秒待機)

並行で:

```bash
# 実機が同じ Metro に接続できるよう port 転送
adb reverse tcp:8081 tcp:8081
```

その後:

1. ExpoGo で BonsaiLog を再起動
2. 該当画面で **長押し 1 秒以上** で SelectionToolbar 出るか確認
3. 出る → 仮説 A (Metro cache) 確定、再撮影で記録

### Step 2: 実機で長押し動作確認

PR #341 で実装した `Pressable.onLongPress` の動作確認:

1. 盆栽カードを **1 秒以上長押し**
2. 期待: BonsaiCard 写真左上にチェックマーク overlay 表示 + SelectionToolbar 下部表示 + FAB 非表示
3. 期待通り → 実装 OK、Step 1 で再撮影
4. 期待外れ → Step 3 へ

### Step 3: コードレビュー (本セッション T1-5 で実施)

最新の main ブランチで以下を再確認:

- `app/(tabs)/bonsai/index.tsx`:
  - `selectMode` / `selectedIds` state 存在
  - `handleCardLongPress` 実装あり
  - `<BonsaiCard ... selecting={selectMode} selected={selectedIds.has(item.id)} onLongPress={...} />`
  - `{!selectMode && <Pressable ... FAB />}`
  - `{selectMode && <View style={styles.toolbarWrap}><SelectionToolbar ... /></View>}`
  - `<SearchHeader ... selectedCount={selectMode ? selectedIds.size : undefined} />`

- `src/features/bonsai/BonsaiCard.tsx`:
  - `selecting / selected / onLongPress` props 存在
  - `selecting && <View style={styles.checkbox}>...</View>` overlay あり

- `src/features/bonsai/SelectionToolbar.tsx`:
  - 56dp 高さ + 2 ボタン構成
  - testID `e2e_home_selection_toolbar`

- `src/features/bonsai/SearchHeader.tsx`:
  - `selectedCount` props + `displayTitle` 切替ロジック

→ **コードレビュー結果 (2026-05-10、T1-5 で確認済): 全て OK**。コードレベルでバグなし。

### Step 4: adb logcat で実機ログ確認

Step 1-3 でも解決しない場合:

```bash
adb logcat | grep -iE "bonsai|reactnative|expoclient|error"
```

**コマンド意味**:

- `adb logcat`: 実機ログをリアルタイム表示
- `grep -iE`: 大文字小文字無視 + 正規表現で「bonsai/reactnative/expoclient/error」を含む行抽出

期待出力: ReactNative の error や warning が出ていないか確認。

### Step 5: ExpoGo を完全 reset

それでも解決しない場合:

1. ExpoGo アプリを Force stop (Android: 設定 > アプリ > Expo Go > 強制停止)
2. ExpoGo アプリのキャッシュ削除 (設定 > アプリ > Expo Go > ストレージ > キャッシュ削除)
3. ExpoGo を再起動 + Metro 再接続
4. 該当画面で再検証

---

## 推奨手順 (本セッション T1-5 での結論)

ユーザー検証手順:

1. **Step 1 (Metro --clear)** を最初に試す → 80% のケースで解決見込み
2. 解決しない場合は **Step 2 (長押し検証)** で動作確認
3. 動作するが視覚的に違う → BonsaiCard / SelectionToolbar の見た目調整 (T1-10 で対応)
4. 動作しない → Step 4 (logcat) で具体的エラー確認、別 Issue 起票

---

## コードレビュー結果 (T1-5、2026-05-10)

本セッション T1-5 でコードレビュー実施:

| ファイル                                   | 確認項目                                                                  | 結果  |
| ------------------------------------------ | ------------------------------------------------------------------------- | ----- |
| `app/(tabs)/bonsai/index.tsx`              | selectMode / selectedIds / onLongPress / SelectionToolbar 配置 / FAB 条件 | ✅ OK |
| `src/features/bonsai/BonsaiCard.tsx`       | selecting/selected/onLongPress props + checkbox overlay                   | ✅ OK |
| `src/features/bonsai/SelectionToolbar.tsx` | 2 ボタン構成 + count===0 disabled                                         | ✅ OK |
| `src/features/bonsai/SearchHeader.tsx`     | selectedCount props + displayTitle 切替                                   | ✅ OK |

→ **コードレベルでバグなし**。実機未反映の原因は **Metro cache / ExpoGo bundle 同期** が最有力。Step 1 (--clear) で解決見込み高。

---

## 関連

- T1-1 (PR #352) integration-criteria.md
- T1-2 (PR #353) mockup スクショ
- T1-3 (PR #354) PR テンプレ §7.5
- T1-9 (本 PR、同 PR) screenshot-capture.md
- 過去 PR: #341 / #342 / #350 (実機未反映が報告された PR)
- MEMORY 索引: `pnpm-verify-config-node22.md` (PATH 罠) / `ui-diff-wsl2-quirks.md` (WSL2 罠)
