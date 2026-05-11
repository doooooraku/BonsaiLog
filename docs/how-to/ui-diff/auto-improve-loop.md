# UI Diff 自動改善ループ — 運用ドキュメント

> **このファイルのロール**: Claude Code が実機 SS と mockup 事前撮影 PNG を比較して、整合度未達の画面を自動改善するループの運用 doc。Phase 0.1 で土台整備、Phase 0.5 以降で footer 拡張検討。

最終更新: 2026-05-11 (Phase 0.1 起動準備、PR 予定)

---

## ロール

Claude Code が以下を自動実行:

```
preflight → seed (idempotent) → flow 実行 → 実機 SS 取得 → mockup PNG コピー
  → diff 比較 → report.md 生成 → Claude が Read で目視評価 → 整合度判定
  → 未達なら改善 PR (TaskCreate → 実装 → verify → push → CI → merge)
  → SUMMARY-loop.md 更新 → 次サイクル
```

ユーザー側操作は **実機 USB 接続 + 初回 Continue dialog 1 タップのみ**。以降は Claude が自走。

---

## スコープ (R-17 厳守)

### ✅ 本ループで自動修正可能

- style / layout (色 / margin / padding / font-size 等)
- mockup 整合性 (位置 / 配置 / アイコン)
- 翻訳文言の微調整 (mockup 整合のため)

### ❌ 本ループで禁止 (人間判断要)

- 機能追加 / 削除
- DB schema 変更
- API 変更
- ADR 変更 / spec 変更
- 新規画面 / route 追加

機能変更が必要な場合は **Claude が人間に上申** (PR に `needs-human-review` ラベル)。

---

## 起動方法

ユーザーが「**ループ開始**」または「**auto-improve loop start**」と Claude Code に伝える。

Claude は以下を順次実行:

1. preflight (5 項目チェック)
2. SUMMARY-loop.md 状態確認
3. 未達 flow を順次試走
4. 各サイクルで PR → CI → merge
5. 終了条件で自動停止

---

## 停止方法

### 即時停止

- ユーザーが「**stop**」「**待って**」と言う → Claude が即時停止

### 次サイクル前に停止

- `touch /tmp/claude-stop.flag` → kill-switch.mjs が検知して次サイクル前に停止
- 解除: `rm /tmp/claude-stop.flag`

### 自動停止

- 全対象 flow が整合度レベル 2 (80%) 達成
- 全対象 flow が永久 skip リストに入る (改善不能)
- 試走連続 5 回失敗 (環境異常)

---

## 承認モード (Q2=(a) 半自走、10 秒承認)

各 PR 前に Claude が以下を提示:

1. **TaskCreate** で改善タスクを追加
2. **計画提示** (簡潔、1 文程度): 「\<flow\> の \<項目\> を \<修正内容\> に変更します」
3. **10 秒待機**
4. ユーザー応答なし → **暗黙承認** → 実装着手
5. ユーザーが「待って」「stop」「change」等で介入 → 即停止

ユーザーは別作業 / 寝てて OK。10 秒以内に応答する必要なし。

### Retro-G: 「ループ開始」 と再開タイミング (2026-05-11 学び)

半自走モードでは、Claude が長い処理 (capture / verify / CI 待ち) で **一時的に待機状態** になることがある。
本セッションでは ScheduleWakeup (Claude が自分で目覚ましをかける仕組み) が動かないケースがあり、
ユーザーが手動で **「ループ開始」** と入力して Claude を再開させた。

**現状の実用知識**:

- ✅ **Background task 完了通知 (task-notification)** は自動届く、確実
- ⚠️ **ScheduleWakeup** は環境によっては動かない (本セッション数回発生)
- ✅ **ユーザー手動「ループ開始」** が確実な再開手段

**推奨運用**:

- 長い処理は `run_in_background: true` で task 化 → 完了通知主体で進める
- ScheduleWakeup を使う場合も、ユーザーが手動再開できるよう「ループ開始」を案内する
- 次セッション以降で別仕組み (例: Polling / webhook) が出たら本 doc 更新

詳細学びは `docs/reference/tasks/lessons/auto-improve-loop.md` §4 参照。

---

## 終了条件 (Q4=(a))

- **全対象 flow が整合度レベル 2 (80%) 達成** (`docs/reference/integration-criteria.md` 参照)
- **対象**: 4 HTML (01-Onboarding / 02-Home / 04-Export / 05-Monetization) 全 41 画面
- **進捗管理**: `scripts/ui-diff/skip-list.json` の `achieved` 配列に追加されたら達成扱い

---

## 暴走対策 (3 重防御)

### 1. Kill switch (人間介入手段)

- ファイル: `/tmp/claude-stop.flag`
- 確認: `node scripts/ui-diff/kill-switch.mjs` (exit 1 = STOP, exit 0 = CONTINUE)

### 2. Skip list (無限ループ防止、Q6=(a))

- ファイル: `scripts/ui-diff/skip-list.json`
- 同 flow + 同箇所が **2 回連続失敗** で永久 skip リストに自動追加
- 失敗判定: pnpm verify fail / CI fail / 整合度悪化

### 3. CI gate (悪化 PR 阻止)

- 全 PR で `pnpm verify` 緑必須
- GitHub CI 緑必須 (docs-cleanliness / template-check / verify)
- 整合度悪化検知: `node scripts/ui-diff/auto-revert.mjs <flow>`
  - latest RMSE > prev RMSE × 1.1 (10% 以上悪化) で REGRESSION 検出
  - 検出時: Claude が `git revert HEAD` で main を 1 コミット戻す + skip 追加

---

## 進捗共有 (Q7=(a))

### SUMMARY-loop.md (毎サイクル更新)

- ファイル: `scripts/ui-diff/out/SUMMARY-loop.md`
- 生成: `pnpm exec tsx scripts/ui-diff/summary.ts`
- 内容: 全 flow 進捗 / 達成リスト / 永久 skip リスト / 進捗率

### Engram 保存 (5 サイクルごと)

- topic_key: `auto-improve-loop-<date>-<cycle_n>`
- 内容: ループ N サイクル目の結果サマリ

---

## Claude Read 評価ガイド

Claude が `out/<timestamp>/diff/<flow>-side-by-side.png` を Read で見て整合度判定する手順:

### 1. 全体構造の確認

- header / body / footer の配置 が mockup と同じか?
- TabBar が画面下に同じ順序で並んでいるか?

### 2. 主要要素の確認

- 主要 component (Card / Button / Input / Heatmap 等) が mockup と一致するか?
- 写真 / アイコンの位置とサイズ
- リスト要素の数

### 3. 色トークン確認

- BRAND_GREEN / BG_PRIMARY / BG_SURFACE / TEXT_PRIMARY 等の主色が一致
- 細部 (角丸 px / shadow 強度) は許容

### 4. テキスト確認

- ヘッダー文言 / ボタン文字 / placeholder が mockup と一致
- font は実機環境差を許容

### 5. 整合度判定

- レベル 0: 構造のみ一致 (40-60%)
- **レベル 2 ⭐ (整合済): 80% 一致** ← 達成目標
- レベル 3: 95%+ (本ループでは目指さない)

詳細: `docs/reference/integration-criteria.md` 参照。

---

## 永久 skip 候補 (環境差で直せない)

以下は実装で直せないため、検出時は即 skip リスト追加:

- **Font hinting / sub-pixel rendering**: OS / device 差
- **Status bar**: 実機にバッテリー / 時刻 / アンテナ表示、mockup は 9:41 固定
- **Safe area**: Android / iOS で異なる
- **AdMob banner**: mockup には無い、実機 Free モードに表示
- **Dev menu**: 実機の Expo Dev Client 表示 (production では出ない)
- **Keyboard**: 実機キーボード表示時の差
- **解像度**: mockup 393×852 (iPhone 16 Pro pt) vs 実機 任意 Android 解像度

---

## 既知の罠 (Phase 1-5 で発見、本ループで対応済)

### 1. Expo Dev Client Continue dialog

- 症状: `adb shell am force-stop` 後に毎回復活
- 対策: 各 flow に `runFlow when: visible: 'Continue'` で conditional dismiss step (PR #391)

### 2. BonsaiCard loading 競合

- 症状: seed 投入後 force-stop すると BonsaiCard fetch 中で FAB 非 render
- 対策: 「フィルタタブ"すべて"visible 待ち」step + FAB は testID `e2e_home_fab_create` で tap (PR #390)

### 3. snake_case row mapping (DB 関連)

- 症状: `expo-sqlite` raw SQL の row が snake_case で返り、TypeScript 型 (camelCase) と乖離
- 対策: `src/db/rowMapper.ts` で snake/camel 両対応 (PR #387/#388)

### 4. 編集ボタン scroll 必要

- 症状: 詳細画面の編集ボタンが画面下端で、scrollUntilVisible なしでは tap 不可
- 対策: Phase 0.5 以降で flow に `scrollUntilVisible` 追加予定

---

## ファイル構成 (Phase 0.1 で整備)

```
docs/
├── how-to/ui-diff/auto-improve-loop.md  ← 本ファイル (運用 doc)
└── reference/integration-criteria.md     ← 整合度判定基準 (既存)

scripts/ui-diff/
├── run.ts                ← トップレベル CLI (既存)
├── preflight.mjs         ← 5 項目環境チェック (Phase 0.1 簡素化)
├── capture-app.sh        ← Maestro flow + adb screencap (既存)
├── capture-design.ts     ← 種別 B (事前撮影 PNG コピー、Phase 0.1 切替)
├── compare.ts            ← ImageMagick diff (既存)
├── report.ts             ← per-flow report.md 生成 (既存)
├── config.ts             ← SCREEN_PAIRS 定義 (既存、Phase 0.5 で footer 追加検討)
├── summary.ts            ← SUMMARY-loop.md 自動生成 (Phase 0.1 新規)
├── skip-list.json        ← 永久 skip リスト (Phase 0.1 新規)
├── kill-switch.mjs       ← 停止チェック (Phase 0.1 新規)
└── auto-revert.mjs       ← RMSE 悪化検知 (Phase 0.1 新規)

maestro/flows/ui-diff/
├── bonsai-tab.yml        ← 既存 + Continue dismiss step
├── ... (15 flow、Phase 0.5 で 26 flow 自動生成検討)

docs/mockups/v1.0/screenshots/
└── ... (70 PNG、Issue #366 PR #367 で生成、git 凍結保管)
```

---

## 起動コマンド (Claude Code 内、Bash)

```bash
# 単発 1 サイクル (人間確認用)
pnpm exec tsx scripts/ui-diff/run.ts <flow-id>

# SUMMARY 更新
pnpm exec tsx scripts/ui-diff/summary.ts

# kill-switch チェック
node scripts/ui-diff/kill-switch.mjs

# 整合度悪化検知
node scripts/ui-diff/auto-revert.mjs <flow-id>

# ループ起動 (Claude が自身で連続実行)
# = ユーザーが「ループ開始」と言うことで起動、Claude Code 内部で連続呼び出し
```

---

## 関連

- ADR-0021 (UI 差分検出パイプライン)
- `docs/reference/integration-criteria.md` (整合度判定基準)
- `scripts/ui-diff/out/SUMMARY-loop.md` (進捗 SUMMARY、自動生成)
- Issue #345 (本ループの運用 ops issue)
- Issue #366 (mockup 70 PNG 撮影、本ループの mockup 比較対象)
- 本日学び: PR #387 / #388 (snake_case fix) / #390 (loading 待ち) / #391 (Continue dismiss)
