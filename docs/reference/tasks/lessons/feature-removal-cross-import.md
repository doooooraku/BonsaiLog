# Lesson: 機能削除前の cross-feature import 検査

**Sess31 ADR-0039 (F-04 水やり履歴ヒートマップ撤廃) の経験から構造化**

## 何が起きたか

Sess31 PR-B で `src/features/watering/` 配下のヒートマップ画面群 + pure 関数 (`wateringHeatmap.ts`) を一括削除しようとしたところ、 `wateringHeatmap.ts` に同居していた cross-feature shared util (`toLocalDateKey` / `diffDayKeys` / `getLastWatering` / `getDaysSinceLastWatering` / `classifyLastWatered`) が以下 10 箇所から import されていることが事前調査で発覚:

```
src/features/plan/dotsByDay.ts
src/features/event/groupContinuousEvents.ts
src/features/bonsai/cardDataBuilder.ts
src/features/calendar/CalendarTabScreen.tsx
src/features/watering/CrossWateringCalendar.tsx
src/features/watering/LastWateredText.tsx
src/features/notification/invalidator.ts
src/features/notification/triggerReschedule.ts
app/(tabs)/bonsai/index.tsx
app/tags.tsx
```

機械的に `wateringHeatmap.ts` を削除すると、 上記 10 箇所がコンパイルエラー → 予定タブ / 記録タブ / 盆栽カード / カレンダー / 通知 / タグ画面 / 盆栽 home が **同時連鎖崩壊** する構造リスクだった。

## なぜ起きたか (なぜなぜ分析 5 階層)

```
問題: 機能削除で shared util が連鎖崩壊する
├─ なぜ 1: 削除対象ファイルに shared util が同居しているから
├─ なぜ 2: Phase A で wateringHeatmap.ts を「水やり関連の純関数置き場」 として作り、 後で toLocalDateKey 等を「最初の置き場のまま」 放置した (Phase B/D で関数追加時に分離しなかった)
├─ なぜ 3: 「機能フォルダ = 機能境界」 だが「フォルダ内ファイル = 機能内サブ責務」 という暗黙ルールが曖昧。 汎用 util を src/core/datetime/ に移すべきだったが、 import 再配線コストを誰も払わなかった
├─ なぜ 4: ESLint に「cross-feature import 検出」 ルールが無く、 「機能削除時に shared util を分離する」 プロセスが lessons / R-XX に無い
├─ なぜ 5: 「機能を削除する」 活動が今まで稀で (追加 / 改善が主)、 削除に対する hook / CI / lessons が育っていない
├─ 根本原因: 機能フォルダ内 utility が cross-feature 利用されているか検出・分離する仕組みの不在
└─ 恒久策:
    (i) 機能削除 PR 前に「shared util 分離 PR」 を先行する 2 段階 PR pattern を標準化 (R-50)
    (ii) cross-feature import 検査 grep 手順を本 lesson に明記
    (iii) 3 回再発で scripts/check-cross-feature-imports.mjs に昇華 (ESLint custom rule 候補)
```

## 学んだこと: 2 段階 PR pattern

### Pattern A: 単純機能削除 (cross-feature 利用ゼロの場合)

機能フォルダ内の export を grep し、 越境利用が 0 件なら **1 PR で削除** OK。

### Pattern B: 2 段階分離 (cross-feature 利用が 1 件以上ある場合) ★Sess31 採用

**PR-1 (前段、 挙動変更ゼロ refactor)**:

1. 削除対象フォルダ内の shared util を、 同フォルダ内の **新 module** (例: `dateUtils.ts`) に物理分離
2. 旧ファイルで新 module を再 export (後方互換、 PR-2 で完全削除)
3. 全 cross-feature consumer の import path を新 module に切替
4. テスト分割 (shared util テストは新 test ファイルへ)
5. `pnpm verify` 全緑、 diff は import path 変更 + 関数移管のみ、 挙動変化ゼロ
6. main merge

**PR-2 (後段、 機械的削除)**:

1. 旧ファイル + 機能専用関数 + 画面 + route を一括削除
2. i18n / pickerStore slice / Maestro flow / ui-diff config も削除
3. ADR で意思決定根拠を残す (Supersede + 新規起票)
4. main merge

### 利点

- **構造リスク #1 (連鎖崩壊) を物理ゼロ化**: PR-2 は「削除のみ」 の安全 diff、 review が高速・ 安全
- PR-1 が挙動変更ゼロなので、 review コスト最小・ rollback 容易
- 「shared util の所在を見直す」 機会として品質向上副次効果

## 実例 (Sess31)

### PR-A #773 (Pattern B PR-1)

- 新規: `src/features/watering/dateUtils.ts` (shared util 6 関数 + 型)
- 修正: `wateringHeatmap.ts` (re-export shim 化)
- 修正: 10 consumer の import path を `dateUtils` に切替
- 修正: テスト分割 (`dateUtils.test.ts` 新規 + `wateringHeatmap.test.ts` は heatmap 専用に縮小)
- 検証: `pnpm verify` 全緑 (54 suite / 823 test PASS)
- diff: +356 / -296 (主に関数移管とテスト分割)

### PR-B (Pattern B PR-2、 ADR-0039)

- 削除: 画面 2 + コンポーネント 4 + pure 関数 1 (wateringHeatmap.ts) + テスト 2 + Maestro 2 = 11 ファイル
- 修正: `(modals)/_layout.tsx` / `look-back/index.tsx` / `pickerStore.ts` / `ui-diff/config.ts` / `skip-list.json`
- 削除: i18n 36 keys × 19 言語 = 684 文字列
- 起票: ADR-0039 + ADR-0013 Supersede 表記 + ADR-0020 Notes Amended
- 検証: `pnpm verify` 全緑、 機能削除のみで連鎖崩壊なし

## 関連

- R-50 (本 lesson の構造化ルール)
- ADR-0039 (撤廃の Decision 詳細)
- ADR-0013 (Superseded、 元設計)
- PR #773 (Pattern B PR-1 成功事例)
- Sess31 PR-B (Pattern B PR-2 成功事例)
- 計画ファイル: `/home/doooo/.claude/plans/cozy-dancing-pike.md` (議論経緯 + 6 名チーム評価)
