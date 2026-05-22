# ADR-0038: 記録タブ動線復活 + 「作業を記録」 button 統合設計

- Status: Accepted
- Date: 2026-05-22
- Deciders: @doooooraku (user 真意 4 改善項目 / Sess29 議論)
- Related: ADR-0025 (4 タブ構成、 §② Notes Amended で記録タブ動線整合) / ADR-0035 (Phase ε、 D6 Notes Amended で「予定 → 記録動線統合」 を「タブ別動線」 に再整合) / ADR-0036 (D7 拡張、 group button + kebab menu 併存) / ADR-0037 (Sess28、 D2 Notes Amended で Hero 縮小撤回) / R-47 (本 ADR 由来、 navigation anti-pattern check) / R-48 (本 ADR 由来、 CTA design 整合) / `docs/reference/design_system.md` §22 (本 ADR 由来、 ボタン pattern SoT)

---

## Context（背景：いま何に困っている？）

Sess28 完遂後の Sess29 開始時、 user 実機検証で 4 改善要求が判明。 議論で 6 専門家評価 + 4 ペルソナ評価 + R-13 議論プロセスを徹底した結果、 **Sess23 ADR-0035 D6 で見落とした「タブ名 ↔ タブ内 FAB 動作 整合性」**という UI 標準違反が根本原因と判明。 4 件の改善を 1 ADR (本 ADR) に集約して意思決定する。

### 現状の問題

1. **「記録」 タブ tap で「予定」 タブが緑になる** (タブ標準違反)
   - `app/(tabs)/_layout.tsx:44-51` で `e.preventDefault()` + `router.push('/(tabs)/plan?source=tab&selectedDateKey=today')`
   - Material 3「Navigation bar」 + iOS HIG「Tab Bars」 で「tap したタブが必ずハイライト」 が基本原則
   - user 体感「これバグだと思う」 = タブ標準違反として正しく報告

2. **「記録」 タブの FAB が「予定追加」 を起動** (タブ名 ↔ FAB 動作 不整合)
   - `app/(tabs)/plan/index.tsx:74` で `useBulkActionFlow('schedule')` (mode='schedule' 固定)
   - 記録タブから FAB tap しても「予定追加」 flow になる = タブ名と矛盾
   - user 指摘「予定と記録 2 つ用意している意味が無い」 + 「疑問に思えよ」
   - **Sess23 ADR-0035 D6 で見落とした論点** = 議論プロセス欠陥として R-47 で構造化

3. **予定セクション group header に「全 N 件を記録」 button が無い**
   - Sess25 ADR-0036 D7 で「group の緑 button → kebab menu に統合」 して以来
   - kebab ⋮ tap → menu 開く → 「全 N 件を記録」 tap = **3 タップ**必要
   - 個別 row には「作業を記録」 button あるが、 group header には無い
   - ペルソナ 3 (プロ 100 鉢) で 1 タップ達成不能

4. **「作業を記録」 button の色合いが強調過剰**
   - `src/features/event/EventRow.tsx:245-253` で BRAND_GREEN ベタ塗り + 白文字 + fontWeight 600
   - washi 背景 + serif フォント世界観と不調和
   - Sess28 PR-5 で「×n バッジ」 を BADGE_SOFT に統一済、 button だけ取り残された

5. **Sess28 PR-4 で Hero を 280px → 180px に縮小したが user 真意「画像サイズはそのまま」 と判明**
   - PR-4 で実装した Hero 縮小は撤回必要、 ただし黒帯 64px + 盆栽名のみ表示は維持 (Sess28 #3 確定済)

### 制約 / 前提

- `docs/reference/constraints.md` §1-4: AI 非搭載原則 (影響なし)
- ADR-0025 §② (記録タブ案 X = modal 直接起動): Sess23 D6 で revert 済、 本 ADR で再整合
- ADR-0035 D6 (記録タブ = 予定タブ統合): 本 ADR で **Notes Amended** = 「タブ別動線 + 共通画面構造」 に再整合
- ADR-0035 D7 (予定→記録 atomic 変換): **維持** (記録タブからも引き続き利用可能)
- ADR-0035 D9 (ふりかえり「カレンダー」 card 完全削除): **維持** (記録タブ復活で hub 経由は引き続き二重動線回避)
- ADR-0036 D7 (kebab menu + group button 統合): 本 ADR D3 で **Notes Amended** = 「kebab menu + group button 併存」 に再整合 (案 B-2 user 確定)

---

## Decision（決めたこと：結論）

### D1. RecordTabScreen 新規実装 + tab listener 撤去 (案 A-2)

- 新規 `app/(tabs)/record/index.tsx` を実画面化 (stub から完全実装へ)
- 構成: PlanScreen と**同等の画面構造** (月カレンダー + 日付選択 + 予定/記録 listing) を再利用
- 違いは 2 点のみ:
  1. **default 日付**: 今日 (PlanScreen は明日)
  2. **FAB action**: `startBulkAction(..., 'log')` (PlanScreen は 'schedule')
- `app/(tabs)/_layout.tsx` の `handleRecordTabPress` を **撤去** (preventDefault + router.push 削除)、 通常の tab navigation でタブハイライト自然に「記録」 に
- D7 動線 (予定→記録 atomic 変換) は RecordTabScreen でも維持 (planned section の「作業を記録」 button)

### D2. 予定タブ動作の明確化 (現状維持の SoT 確定)

- 「予定」 タブ tap → PlanScreen (明日 default) + FAB = 'schedule' mode + タブハイライト「予定」 ⭕
- 「記録」 タブ tap → RecordTabScreen (今日 default) + FAB = 'log' mode + タブハイライト「記録」 ⭕
- 両タブとも独立 component (PlanScreen + RecordTabScreen) として並存、 内部実装は共通 component 抽出を将来検討 (本 ADR スコープ外、 Future Work)

### D3. 予定セクション group header に「全 N 件を記録」 button 復活 + kebab menu 併存 (案 B-2)

- PlanScreen + RecordTabScreen の planned section group header に「全 N 件を記録」 button 配置
- 既存の kebab menu「全 N 件を記録」 item は **維持** (案 B-2、 user 明示)
- 動線は 2 経路 (button 直接 + kebab menu 経由) 併存、 user の用途で使い分け
- logged section には button 配置せず (planned section のみ、 既存 D7 仕様維持)

### D4. 新 token + button 色統一 (案 C-2)

- `src/core/theme/colors.ts` に新 token:
  - `BUTTON_SECONDARY_BG = '#E8F0EA'` (薄緑、 BADGE_SOFT_BG と同色だが用途分離で別 token)
  - `BUTTON_SECONDARY_TEXT = BRAND_GREEN` (= `#1F3A2E`)
- 適用箇所:
  1. EventRow `actionButton` (個別 row、 「作業を記録」 button)
  2. PlanScreen + RecordTabScreen group header の「全 N 件を記録」 button (新規追加分)
- `docs/reference/design_system.md` §22 (ボタン pattern SoT) を新設、 4 段階階層 (Primary / Secondary / Tertiary / Destructive) を定義

### D5. Hero 縮小撤回 (Sess28 PR-4 部分 revert)

- `src/features/bonsai/BonsaiHero.tsx`:
  - container height: **180px → 280px** (Sess28 PR-4 撤回)
  - overlay height: **64px 維持** (盆栽名 1 行分のみ、 Sess28 確定)
  - PotIcon size: **100 → 120** (container 復元に合わせる)
- 樹種・樹形 表示は引き続き**非表示** (Sess28 user 真意 #3 維持、 基本情報タブで参照)
- ADR-0037 D2 を Notes Amended で「Hero 縮小撤回、 黒帯のみ 64px 維持」 に再整合

### 適用範囲

- v1.x 全期間
- iOS / Android 両 platform

---

## Decision Drivers（判断の軸：何を大事にした？）

1. **user 真意尊重**: 4 改善要求 + 「疑問に思えよ」 指摘 → タブ名 ↔ FAB 動作 整合性を最優先
2. **タブ標準遵守**: Material 3 / iOS HIG の「tap したタブが必ずハイライト」 原則
3. **D7 動線維持**: 予定→記録 atomic 変換動線は記録タブからも利用可能
4. **構造的再発防止**: R-47 (navigation anti-pattern check) + R-48 (CTA design 整合) 起票
5. **既存資産活用**: bulk-log flow (mode='log') は既に実装存在、 起動経路追加のみ

---

## Alternatives（却下した案）

### A1: PlanScreen の FAB を URL param で動作分岐 (案 A-1)

- 利点: 実装ファイル数最小 (2 file)
- 却下理由: タブハイライト問題が未解決、 PlanScreen の責務肥大化、 中長期保守性低下

### A2: 記録タブ tap で modal 直接起動 (案 A-3、 旧 ADR-0025 §② 案 X 復活)

- 利点: 実装ファイル数最小 (1 file)
- 却下理由: 画面表示なしで user 混乱大、 D7 動線断絶、 Sess23 で revert 済の pattern 復活で ADR 一貫性破綻

### B1: kebab menu 削除 + group button のみ (案 B-1)

- 利点: 動線シンプル化
- 却下理由: user 明示「kebab 残していて OK」、 案 B-2 採用

### C1: BADGE_SOFT token 流用 (案 C-1)

- 利点: 新 token 不要
- 却下理由: バッジ (情報) と button (CTA) の機能区別が曖昧化、 user 明示「新 token」、 案 C-2 採用

---

## Consequences（結果）

### 良いこと

- タブ標準遵守で user 認知混乱解消 (ペルソナ 1 シニア + ライト両者 ◎)
- タブ名 ↔ FAB 動作 整合で「予定と記録 2 つ用意している意味」 明確化
- ペルソナ 3 (プロ 100 鉢) の業務効率向上 (group button 1 タップで N 件記録)
- 4 段階 CTA 階層 (Primary/Secondary/Tertiary/Destructive) を design_system §22 で SoT 化
- R-47/R-48 で navigation + CTA design 整合性を構造的担保

### 悪いこと / リスク

- ADR Notes Amended 3 件 (ADR-0025/0035/0037) の文書修正コスト (本 ADR で同時更新)
- RecordTabScreen と PlanScreen の重複コード (将来 refactor で共通化、 本 ADR スコープ外)
- bulk-log flow (mode='log') が Sess23 以降 record タブから到達経路なかったため、 実機検証で動作不良が無いか確認必須 (Sess16 PR-B1 で実装は健在のはず)

### 副作用 / 関連変更

- design_system.md §22 (ボタン pattern SoT) を新設
- colors.ts に新 token 2 件追加
- recurrence-prevention/specialized.md に R-47 + R-48 追加
- ADR-0025/0035/0037 Notes Amended (3 件)
- maestro flow record-tab-fab-log.yml 新設、 record-tab-to-plan.yml 廃止

---

## Plan / TODO（次にやる小さなステップ）

- [x] **PR-1**: 本 ADR 起票 + 新 token + R-47/R-48 + design_system §22
- [ ] **PR-2**: RecordTabScreen 新規実装 + tab listener 撤去
- [ ] **PR-3**: actionButton 色変更 (新 token、 個別 row + group 両方)
- [ ] **PR-4**: group header に「全 N 件を記録」 button 追加 + kebab 併存
- [ ] **PR-5**: Hero 縮小撤回 (BonsaiHero 280 復活 + ADR-0037 Notes Amended)
- [ ] **PR-6**: ADR Notes Amended 連動 (0025/0035) + Maestro flow 更新
- [ ] **PR-7**: Sess29 retro + Engram session_summary

### Future Work

- [ ] PlanScreen + RecordTabScreen 共通 component 抽出 refactor (重複コード解消)
- [ ] R-47/R-48 自動化 (ESLint custom rule for tab listener + CTA button color)
- [ ] dark mode の新 token 対応

---

## Acceptance / Tests

- 正 (自動テスト):
  - `pnpm verify` 全緑 (16 種類のゲート)
  - Jest: 新規 RecordTabScreen の snapshot 追加
  - Maestro: record-tab-fab-log.yml 新設で 5 ステップ動線検証
- 手動チェック (Pixel 6 + iOS シミュレータ 14):
  - 「記録」 tap → 記録 tab ハイライト + 今日 default + FAB tap で「盆栽を選ぶ」
  - 「予定」 tap → 予定 tab ハイライト + 明日 default + FAB tap で「予定追加」
  - 予定 group header の「全 N 件を記録」 button + 個別 row の「作業を記録」 button が新 token 色
  - kebab menu「全 N 件を記録」 item 維持
  - Hero 280px + 黒帯 64px + 盆栽名のみ
  - 19 言語切替で表示崩れなし、 dark mode 切替で破綻なし

### 4 ペルソナ評価

| 評価軸                       | 高橋 62 (シニア)   | Marcus 35 (海外) | プロ 50 (業務) | ライト 28 (新人) | 総合 |
| ---------------------------- | ------------------ | ---------------- | -------------- | ---------------- | ---- |
| D1 RecordTabScreen           | ◎ タブ整合         | ◎                | ◎ 業務 path    | ◎                | ◎    |
| D2 予定タブ明確化            | ◎                  | ◎                | ◎              | ◎                | ◎    |
| D3 group button + kebab 併存 | ◎ 1 タップ         | ◎                | ◎ 100 鉢       | ◎                | ◎    |
| D4 新 token + 色統一         | ◎ 品の良いデザイン | ○                | ○              | ○                | ◎    |
| D5 Hero 280 復活             | ◎ 写真大きく       | ◎                | ◎ 識別容易     | ○                | ◎    |

→ 全項目 ◎/○、 ✕ ゼロ (R-10 クリア)

---

## Rollout / Rollback

- **リリース手順への影響**:
  - PR-1〜PR-7 を各 1 commit で順次 main merge、 毎 PR `pnpm verify` 緑必達
  - 各 PR は最小スコープ + 独立 revert 可能
- **互換性**:
  - DB schema 変更なし、 i18n key 追加なし → backward compatible
  - 既存 PlanScreen 動作不変 (予定タブ tap で従来通り動作)
- **Rollback 手順**:
  - PR-2 失敗時: record/index.tsx を stub に戻す + handleRecordTabPress 復元
  - PR-3/4 失敗時: 個別 PR revert で動作復元
  - PR-5 失敗時: BonsaiHero 180 維持で revert

---

## 関連

- ADR-0025 §② (記録タブ動線、 本 PR で Notes Amended)
- ADR-0035 D6 (記録タブ統合、 本 PR で Notes Amended)
- ADR-0035 D7 (予定→記録 atomic 変換、 維持)
- ADR-0036 D7 (kebab menu、 本 PR で Notes Amended = button 併存)
- ADR-0037 D2 (Hero 縮小、 本 PR で Notes Amended = 撤回)
- R-47 (navigation anti-pattern check、 本 ADR 由来)
- R-48 (CTA design 整合、 本 ADR 由来)
- `docs/reference/design_system.md` §22 (ボタン pattern SoT)
- `src/core/theme/colors.ts` (BUTTON_SECONDARY_BG/TEXT)
