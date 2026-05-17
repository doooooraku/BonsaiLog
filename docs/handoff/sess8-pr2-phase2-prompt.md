# Sess8 PR-2: ADR-0025 Phase 2 (action 起動実装) 用 Claude Code prompt

> **使い方**: 次セッション開始時、 user が以下の内容を Claude Code に渡す。
> 短縮版 + 詳細版の 2 種類、 慣れた user は短縮版で OK。

---

## 短縮版 (推薦、 慣れた user 用)

```
ADR-0025 Phase 2 (action 起動実装) を進めてください、
docs/handoff/sess8-pr2-phase2-prompt.md の詳細版を参照。
```

---

## 詳細版 (Sess8 開始時にコピペ用)

```
ADR-0025 Phase 2 (action 起動実装) を進めてください。

【スコープ】
- 予定タブ tap で複数選択モード自動入り → 盆栽選択 → BulkScheduleDateSheet 起動
- 記録タブ tap で複数選択モード自動入り → 盆栽選択 → BulkWorkPickerSheet 起動
- 「複数選択」 button (Header) 削除
- 盆栽 0 件 = empty state + 「盆栽を追加」 CTA
- 盆栽 1 件のみ = 自動 1 件選択固定 + 直接 Sheet 起動 (selectMode 不要)
- 盆栽 2 件以上 = 通常の選択モード

【必読 docs (R-20 議論前 Read 厳守)】
1. docs/adr/ADR-0025-bottom-tab-restructure.md (Phase 2 詳細記載済)
2. docs/how-to/ui-diff/screen-integration-loop.md (8 step ループ手順)
3. docs/adr/ADR-0011-remove-recommendations-keep-record-only.md (記録のみ哲学整合確認)
4. docs/adr/ADR-0020 §3 Notes Amended 2026-05-17 (タブ構造現状)
5. docs/adr/ADR-0024 (BottomSheet 全廃、 formSheet/modal、 sheet 階層上限)
6. .claude/recurrence-prevention.md R-1 / R-9 / R-13 / R-17 / R-25 / R-29 (拡張済)

【計画段階 (R-17 段階 2) 厳守 — R-9 教訓適用必須】
事前に以下を網羅 grep + Read で確認した上で計画書を提示してください
(Sess7 PR-1 で SearchHeader.showSettings prop の発見遅延 = R-9 違反気味、
次は事前調査徹底):

1. **expo-router tabBarPress event** の動作:
   - `<Tabs.Screen listeners={{ tabPress: (e) => e.preventDefault() }}>` で画面遷移を block 可能か
   - PoC (Proof of Concept、 動作検証) で実機確認必須 (R-30 外部 lib stability)
   - 動かなければ plan B (FAB 起動) へ revert 可能性、 ADR-0025 §Subject to Revision

2. **既存 SelectionToolbar 動線** (src/features/bonsai/SelectionToolbar.tsx):
   - 現状: 盆栽タブ「複数選択」 button → SelectionToolbar 「予定追加」 / 「一括記録」
   - 変更: 予定/記録タブ tap → SelectionToolbar 自動表示
   - 共通 component の lifecycle と props 確認

3. **既存 BulkWorkPickerSheet / BulkScheduleDateSheet 起動経路**:
   - app/(modals)/bulk-work-picker.tsx / bulk-schedule-date.tsx
   - router.push 経路の現状確認、 Phase 2 で新動線から起動するための path / params

4. **既存 SearchHeader.onSelectPress prop**:
   - src/features/bonsai/SearchHeader.tsx
   - 盆栽タブ Header 「複数選択」 button、 Phase 2 で削除対象
   - 削除後の影響 (関連 testID / Maestro flow 等) 全 grep

5. **app/(tabs)/record/index.tsx** (Sess7 PR-1 で stub 作成済):
   - Phase 2 で本実装に変更
   - 盆栽 0/1/2+ 件の edge case 対応

6. **app/(tabs)/plan/index.tsx**:
   - 現状: 通常カレンダー画面
   - 変更: action 起動経路追加 (但しタブ tap で intercept なので画面自体は変わらない設計)

【計画書に明示してください — R-9 厳格適用】
- **新規実装 vs 既存活用 vs 修正** を全 file 別に分類
- 既存 prop / hook / script の path 明記
- PoC 計画 (どう動作検証するか、 失敗時の plan B)

【質問 + 4 段階厳守】
- R-13 予告 (質問数 + ラウンド数) を冒頭で
- R-7 議論深さ 3 ラウンド以上、 R-8 フラット視点 (そもそも論)、 R-10 4 ペルソナ + R-26 ブランド統一感
- 質問は判断材料 + 推薦セット (R-11)
- 全部推薦 OK 即時実行禁止、 TaskCreate → 計画 → 承認 → 実行 (R-17)

【検証手順 (Phase 2 完了の合否基準)】
- PoC 段階: tabBarPress intercept が動く + 盆栽 0/1/2+ 件の各パターンで動作確認
- ホットリロード反映 (Metro background + Dev Build)
- 手動 3 パターン確認 (盆栽 0 件 / 1 件 / 2+ 件)
- Maestro flow は Phase 3 で対応 (本 PR スコープ外)
- pnpm verify EXIT=0
- R-32 git diff --cached 目視
- R-25 構造系 4 項目評価 (Phase 2 後の bonsai-tab + 新 record-tab)

【リスク + plan B】
- tabBarPress intercept が動かない場合:
  - ADR-0025 §Subject to Revision で案 B (FAB 起動) へ revert
  - もしくは案 C (Header CTA、 「複数選択して予定追加」 button)
  - 計画段階で plan B を ADR-0025 Notes Amended で先確定
- シニア (高橋 62 歳) リリース後混乱の場合:
  - Phase 4 で tutorial 追加 (任意)
  - もしくは Phase 2 revert

【期待する完成像】
- TabBar 4 タブ (盆栽 / 予定 / 記録 / ふりかえり)
- 予定タブ tap → 盆栽選択モード自動入り
- 記録タブ tap → 盆栽選択モード自動入り
- 「複数選択」 button (Header) なし = UI シンプル化
- 盆栽 1 件のみ → 自動選択 + 直接 Sheet 起動
- ふりかえりタブ = 現状維持 (CareHub 3 カード)

【スコープ外 (Sess8 PR-3 で対応)】
- Maestro flow 更新 (settings-tab.yml、 新 record-tab.yml、 plan-tab.yml)
- skip-list 更新 (Phase 2 後の R-25 再評価結果)
- pairing-report 更新

【私 (user) の確認は 3 回以内に】
- Step 3 質問 (修正候補 + ペルソナ評価) で 1 回
- Step 8 commit 前の pairing-report or 動作確認で 1 回
- 必要なら commit OK で 1 回
合計 3 回以内
```

---

## 補足: Phase 3 / Phase 4 prompt (Sess8 以降)

### Phase 3 (Maestro flow + skip-list + pairing-report 更新)

```
ADR-0025 Phase 3 を進めてください。 Phase 2 (Sess8 PR-2) merge 後の
動線変更を Maestro flow + skip-list + pairing-report に反映。
詳細は docs/adr/ADR-0025-bottom-tab-restructure.md Phase 3 参照。
```

### Phase 4 (tutorial 追加、 任意)

```
ADR-0025 Phase 4 (tutorial 追加) を進めてください。 リリース後 user feedback で
タブ = action 起動が混乱の場合のみ実装、 そうでなければスキップ可。
```

---

## 関連 docs

- `docs/adr/ADR-0025-bottom-tab-restructure.md` (Phase 計画完全版)
- `docs/how-to/ui-diff/screen-integration-loop.md` (8 step ループ手順書)
- `docs/explanation/ui-diff-loop-for-beginners.md` (初心者向け解説、 家リフォーム例え話)
- `.claude/recurrence-prevention.md` (R-1 / R-9 / R-13 / R-17 / R-25 / R-29 拡張済)
