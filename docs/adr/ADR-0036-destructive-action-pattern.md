# ADR-0036: 破壊的操作 UX 統一 pattern (ConfirmDialog + UndoSnackbar + RowActionMenu + Haptics + wiring cascade、 Phase ζ-2)

- Status: Accepted
- Date: 2026-05-21
- Deciders: @doooooraku
- Related: ADR-0011 (記録のみ哲学) / ADR-0014 (F-16 通知) / ADR-0025 (4 タブ構成) / ADR-0031 (カレンダー統一動線) / ADR-0032 (planned/logged 視覚区別) / ADR-0034 (Phase δ UX 改善) / ADR-0035 (Phase ε カレンダー UX、 本 ADR で D3 拡張 Notes Amended 予定) / Sess25 議論 (6 専門家 + フラット視点 + 4 ペルソナ全員一致推薦、 user 全 A 承認) / `docs/reference/functional_spec.md` §23.3.4 (本 ADR で改訂) / `docs/reference/design_system.md` §18 「長押し UX 標準」 (本 ADR で新規) / `.claude/recurrence-prevention/specialized.md` R-44 + R-45 (本 ADR 同時起票) / 業界 1 次情報 [Material 3 Dialog](https://m3.material.io/components/dialogs/overview) + [Material 3 Snackbar](https://m3.material.io/components/snackbar/overview) + [Apple HIG Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts) + [Apple HIG Action Sheets](https://developer.apple.com/design/human-interface-guidelines/action-sheets) + [WAI-ARIA Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) + [WCAG 2.1 SC 2.1.1 / 2.5.7](https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html) + [Nielsen Norman Group "Undo Affordance"](https://www.nngroup.com/articles/recovery-from-error/) + [Gmail Undo Send pattern](https://support.google.com/mail/answer/2819488)

---

## Context（背景：いま何に困っている？）

### Sess23 ADR-0035 D3 実装後の実機検証 5 不足 (user 報告)

Sess23 PR-3-1 (#724) で「PlanScreen 個別 EventRow long-press → `Alert.alert` → softDelete」 を実装 → user 実機検証で以下 5 不足が露呈:

1. **group 行 (まとめ「💧 水やり ×3 ▼」) 長押し** が反応しない (`onLongPress` 未配線、 ADR-0035 D3 scope 漏れ)
2. **OS 標準 `Alert.alert`** が Android で Material 2 風古いデザインを引き継ぎ、 アプリ世界観 (NotoSerifJP + BRAND_GREEN + ACCENT_BARK) と断裂、 user「素人作りに見える、 作りこんでほしい」
3. **planned / logged 文言が統一** 「この**予定**を削除しますか?」 となり、 logged event を長押しした際にも「予定」 表記 → 認知不整合、 user 信頼度低下
4. **desc「削除した予定は 30 日後に自動的に消えます」 が冗長** → user 真意「即削除したい、 復元動線は別途」
5. **展開後カードに 作業名 + 日付 重複表示** → group header「💧 水やり ×3」 + selectedDateKey 既知のため各カードの「水やり」 「2026年5月22日」 は完全冗長

### user 真意 (Sess25 議論で確認)

「**破壊的な操作 (削除) でも、 アプリ独自の整ったデザインで、 文言は文脈に合った最小限で、 万が一誤って消しても元に戻せる安心感がほしい**」 = 業務プロ 100 鉢 user の解約防止 + シニア user の安心感 + Material 3 / iOS HIG の現代標準への追従。

### 4 ペルソナ評価 (Sess25 議論、 R-10 整合)

| 改善                             | 高橋 62 (シニア)            | Marcus 35 (米国 IT) | 業務プロ                | ライト (1-2 本)             | 総合 |
| -------------------------------- | --------------------------- | ------------------- | ----------------------- | --------------------------- | ---- |
| D1 ConfirmDialog カスタム化      | ◎ 安心感、 アプリ専用 fb    | ◎ 世界観統一        | ○ 作業効率不変          | ◎ シンプル                  | ◎    |
| D2 group long-press 削除         | ◎ 編集自由度                | ◎ DRY               | ◎ 100 鉢一括必須        | ○ 1-2 鉢で利用頻度低        | ◎    |
| D3 planned/logged 文言分離       | ◎ 明快                      | ◎ 整合              | ◎ 業務用語整合          | ◎ 直感                      | ◎    |
| D4 desc 行 削除                  | ○ 短くて読みやすい          | ◎ 即決可            | ◎ 即削除真意            | △ 30 日復元 spec 気づかない | ○    |
| D5 UndoSnackbar 4s               | ◎ シニア最重要 (誤操作救済) | ◎ Gmail/Notion 標準 | ◎ 100 鉢誤削除 リカバリ | ○ Snackbar 中断感少         | ◎    |
| D6 Haptics 長押し fb             | ○ 触覚 fb で長押し中認識    | ○                   | ○                       | ○                           | ◎    |
| D7 RowActionMenu kebab (⋮)       | ○ 発見性 ↑                  | ◎ standard discover | ◎ menu 統合で UI 整理   | ○ menu に少し慣れ要         | ◎    |
| D8 wiring cascade 自動削除       | ○ 取り外し予定の管理不要    | ○ 整合性 ◎          | ◎ 100 鉢で取外管理重要  | ○                           | ◎    |
| D9 EventRow 重複削除 (作業名+日) | ○ スキャン速度 ↑            | ○ 情報密度適正      | ◎ 1 画面情報量 ↑        | ○                           | ◎    |

**✕ なし、 △ 1 件 (ライト D4 desc 削除)** は UndoSnackbar (D5) で「気づかぬうちに削除」 を補完で解消。

### 制約 / 前提

- ADR-0011 (記録のみ哲学): 削除 UX は中立、 ユーザーを責めず救済
- ADR-0014 (F-16 通知): wiring cascade 削除時 `cancelForEvent` 連動でゴースト通知防止
- ADR-0033 (i18n 翻訳ポリシー): 19 言語手動翻訳 workflow 整合
- ADR-0035 (Phase ε): D3 を本 ADR で拡張 Notes Amended、 D7 (変換動線) は維持
- `events` / `photos` schema 不変 (forward-only)、 30 日ゴミ箱 (softDelete + restore + purge) を再利用 + 新 `restoreEvents` helper 追加

---

## Decision（決めたこと：結論）

### Phase ζ-2 で 9 sub-decision を統合 (10 PR、 user 全 A 承認)

#### D1: `<ConfirmDialog>` カスタムモーダル 新規 component (`Alert.alert` 置換)

- **決定**: `src/components/ConfirmDialog.tsx` 新設。 props = `{ visible, title, description?, confirmLabel, cancelLabel?, destructive?, onConfirm, onCancel, testID? }`、 `react-native` の `<Modal>` 直接使用 (Tamagui Dialog 不採用) + `transparent` + `animationType="fade"` (80ms、 Material 3 Motion) + `onRequestClose` で Android Back キャンセル + backdrop tap dismiss (Material 3 整合) + `accessibilityViewIsModal={true}` + `accessibilityRole="alert"` (WAI-ARIA Dialog Pattern + WCAG 2.1.1 整合) + onConfirm 直前に `Haptics.notificationAsync(NotificationFeedbackType.Warning)`
- **理由**: OS 標準 `Alert.alert` は Android で Material 2 風古い、 アプリ世界観 (NotoSerifJP + BRAND_GREEN) 断裂、 user「作りこんでほしい」 整合
- **影響**: 既存 `Alert.alert` callsite で「削除確認」 用途 2 箇所 (`app/(tabs)/plan/index.tsx` L244 + `app/(tabs)/bonsai/[id]/index.tsx` L920) を本 ADR で置換、 他 callsite (archive / 写真権限 / 日付エラー) は scope 外 (別 PR or v1.x)
- **参考実装**: 既存 inline Modal pattern `src/features/bonsai/StylePickerScreen.tsx:159-209` を component 化

#### D2: group 行 (まとめ) long-press 削除 配線

- **決定**: `app/(tabs)/plan/index.tsx` の planned section group `<Pressable>` (L449 周辺) + logged section group `<Pressable>` (L559 周辺) に `onLongPress={() => confirmDeleteGroup(type, events)}` 追加、 `confirmDeleteGroup` 関数で `<ConfirmDialog>` state 更新 (title 文言は D3 で planned/logged + group 文脈分岐)
- **理由**: ADR-0035 D3 scope 漏れ補完、 業務プロ 100 鉢「明日 12 鉢一気に水やり予定 → やっぱり明後日にしよう」 を 1 操作で実現
- **影響**: 既存 `toggleExpand` (tap 動作) は維持、 `delayLongPress` default 500ms 維持で誤判定回避

#### D3: planned / logged 文言分離

- **決定**: i18n key を分離 (PR-ζ-2-②):
  - `planEventDeleteConfirmPlannedSingleTitle` ja「この予定を削除しますか?」
  - `planEventDeleteConfirmLoggedSingleTitle` ja「この記録を削除しますか?」
  - `planEventDeleteConfirmPlannedGroupTitle` ja「この予定 {count} 件をまとめて削除しますか?」
  - `planEventDeleteConfirmLoggedGroupTitle` ja「この記録 {count} 件をまとめて削除しますか?」
  - `planEventDeleteConfirmWiringCascadeNote` ja「(関連する取り外し予定も削除されます)」 — wiring 含む group 削除時のみ title 末尾に追記
  - 旧 `planEventDeleteConfirmTitle/Desc` + bonsai-detail 旧 `eventDeleteConfirmTitle/Desc` 物理削除 (callsite を新 key に置換)
- **理由**: 「記録」 を long-press したのに「予定を削除」 文言は認知不整合、 user 信頼度低下防止
- **影響**: i18n 4 keys + 1 keys (cascade note) × 19 言語 = 95 文字列追加、 旧 4 keys × 19 = 76 文字列削除

#### D4: desc 行 削除 (即削除前提)

- **決定**: `<ConfirmDialog>` で `description` prop を **optional**、 全 削除 dialog 呼出で description **指定しない**。 「30 日後自動消去」 文言を ConfirmDialog から削除
- **理由**: user 真意「即削除したい、 30 日復元 spec を毎回読まされたくない」、 Apple HIG「Alerts」 推奨 title-only pattern (question form だけで内容判別可能なら desc 不要)
- **影響**: 復元動線は別 UI (ふりかえりタブ等、 v1.x scope) で明文化、 D5 UndoSnackbar が「気づかぬうち削除」 を即時補完

#### D5: `<UndoSnackbar>` 4s 表示 (Toast 拡張、 Material 3 Snackbar 整合)

- **決定**: 既存 `src/components/Toast.tsx` を action button slot 対応に拡張 (新規ゼロから NG、 z-index / position / animation 衝突回避):
  - `toastStore.show(message, opts?: { durationMs?: number; action?: { label, onPress } })`
  - 既存 callsite (action 未指定) 完全後方互換
  - 別 export helper `showUndoToast(message, undoFn)` で削除後 4s 表示「予定 {count} 件を削除しました [元に戻す]」、 tap で `restoreEvents(eventIds)` 実行 → 再表示
  - durationMs default 2000 (既存)、 Undo 用 4000 (Material 3 default 整合)
- **理由**: R6 (group 100 鉢誤削除) v1.0 release blocker 対策、 Gmail / Notion / Material 3 / iOS HIG の現代標準
- **影響**: 既存 Toast callsite (件数: 後方互換維持で 0 件 regression)、 新 helper 1 件 export

#### D6: Haptics 触覚 feedback (`expo-haptics`)

- **決定**: 長押し成功時 (削除 confirm dialog 表示直前) `Haptics.impactAsync(ImpactFeedbackStyle.Medium)` + 削除実行時 `Haptics.notificationAsync(NotificationFeedbackType.Warning)`。 全 `<Pressable onLongPress={...}>` 配線箇所で標準化 (R-45 で恒久化)
- **理由**: 視覚 fb (背景色変化) のみだと指で隠れて user が長押し中を認識できない、 触覚 + 視覚 + 聴覚 (OS 任意) 3 chan feedback で UX 標準
- **影響**: `expo-haptics` は既存依存 (package.json L100)、 新規 install 不要

#### D7: `<RowActionMenu>` kebab (⋮) menu 同時実装

- **決定**: `src/components/RowActionMenu.tsx` 新設、 bottom sheet 風 (Modal + slide-up animation + 上余白 backdrop tap dismiss、 iOS HIG Action Sheet / Material 3 Bottom Sheet 整合)。 props = `{ visible, items: RowActionMenuItem[], onDismiss, testID? }`、 items = `{ key, label, destructive?, onPress, testID? }[]`
  - planned section group: 2 items「削除」 (destructive) + 「全 {count} 件を記録」
  - logged section group: 1 item「削除」 (destructive)
  - **既存 ADR-0035 D7 緑 button (`e2e_plan_group_record_button_<type>`)** を本 menu「全 N 件を記録」 item に統合 (testID は menu item に rename + 旧 button 物理削除)
- **理由**: long-press は「power user 標準」 だが発見性低 (Nielsen Norman Group "Hidden Functionality")、 kebab は「discoverable 標準」 で共存 (Material 3 List Item Pattern)。 業務プロが「削除と全記録を 1 行で選択」 でき UI が整理
- **影響**: 既存 EventRow / PlanScreen group row に kebab icon button slot 追加、 `e2e_plan_group_record_button_*` testID は menu item に移行

#### D8: wiring + unwiring cascade 自動削除 (R-43 atomic 整合)

- **決定**: wiring planned event 削除時、 対応する unwiring **scheduled 通知** を自動 cancel:
  - **wiring planned → unwiring planned** (cascade 通知 cancel): wiring payload の `scheduled_unwire_at` から導出される scheduled notification identifier を `cancelForEvents` 経由で cancel
  - **wiring logged 削除** → 対応 unwiring scheduled 通知 cancel (同上)
  - **unwiring planned 削除** → wiring (logged) は残す (取り外し予定だけ取消、 wiring 記録は資産)
  - **unwiring logged 削除** → wiring は残す (同上)
- **重要**: Phase 1 調査で判明: **「unwiring event」 は独立 DB record として存在しない**。 wiring event payload 内 `scheduled_unwire_at` で予定日のみ保持、 通知 reschedule は SUMMARY 通知集約 (ADR-0014) のため event 削除で自動 cancel される。 → 別 `cascadeDeleteWiringUnwiring` DB helper **不要**、 `cancelForEvents(eventIds)` bulk wrapper で自動カバー
- **理由**: 「針金がけ予定を消したら取り外し予定も消えてほしい」 user 真意、 R-43 atomic transaction で wiring softDelete + 通知 cancel 連動
- **影響**: ConfirmDialog title に wiring 含む group 削除時のみ「(取り外し予定も削除)」 補足 (D3 i18n key `planEventDeleteConfirmWiringCascadeNote`)、 user 透明性確保

#### D9: EventRow 展開後カード 改善 (作業名 + 日付 重複削除)

- **決定**: `src/features/event/EventRow.tsx` の `showBonsaiName=true` 時のレイアウト改訂:
  - L147 `<ThemedText style={styles.eventRowDate}>` 物理削除 (PlanScreen は selectedDateKey で日付確定済)
  - L149-152 `{showBonsaiName && bonsaiName && (<ThemedText>{eventType}</ThemedText>)}` 物理削除 (group header に既表示)
  - 1 行目 = `bonsaiName` 単独 (eventRowMain の `justifyContent` 整理)
  - `showBonsaiName=false` 経路 (bonsai-detail history タブ) は **影響なし、 regression なし**
- **理由**: 同情報 4 回繰り返し = Nielsen Norman Group "Information Scent" のノイズ過多、 スキャン速度低下
- **影響**: accessibilityLabel は維持 (`${bonsaiName}, ${eventType}`)、 1 カード 3 行 → 2 行、 1 画面情報密度 ↑

### 既存 ADR との整合

- **ADR-0011** (記録のみ哲学): ConfirmDialog 文言「削除しますか?」 中立、 「○○すべき」 干渉なし → 整合
- **ADR-0014** (F-16 通知): D8 wiring cascade で SUMMARY 通知再計算、 ゴースト通知防止 → 整合
- **ADR-0025** (4 タブ構成): 影響なし
- **ADR-0031** (カレンダー統一動線): D2 group long-press 追加で破壊性 ↑ だが D5 Undo で安全担保 → 整合
- **ADR-0032** (planned/logged 視覚区別): D3 文言分離で「予定 / 記録」 概念分離をさらに強化 → 整合
- **ADR-0033** (i18n 翻訳ポリシー): 4 + 1 keys × 19 言語 = 95 文字列追加 + 旧 4 keys × 19 = 76 文字列削除、 ペルソナ翻訳整合 → 整合
- **ADR-0034** (Phase δ UX 改善): D7 kebab menu で D7 緑 button を統合、 視認性は menu icon で担保 → 整合 (Notes Amended 不要)
- **ADR-0035** (Phase ε): D3 を本 ADR で拡張 Notes Amended (group + kebab + cascade + Undo + Haptics)、 D7 (変換動線) + D9 (ふりかえり card 削除) は維持

---

## Decision Drivers（判断の軸：何を大事にした？）

- **Driver 1 (最重要)**: user 真意「即削除 + 安心の Undo + 文脈整合の文言 + アプリ世界観統一の作りこみ」 を 1 ADR で同時達成
- **Driver 2**: R6 (group 100 鉢誤削除リスク) v1.0 release blocker を `<UndoSnackbar>` 4s + `restoreEvents` で根本解決、 R-44 で恒久化
- **Driver 3**: ConfirmDialog / UndoSnackbar / RowActionMenu / Haptics は **全 destructive action (盆栽削除 / タグ削除 / 写真削除 / バックアップ削除) で再利用** する共通基盤、 投資価値 ◎
- **Driver 4**: 4 ペルソナ ✕ なし、 △ 1 件 (ライト D4 desc) は D5 Undo で吸収
- **Driver 5**: 既存 ADR-0035 達成資産を **拡張 (D3 のみ Notes Amended)** で保護、 他 D は維持
- **Driver 6 (Sess23 lesson)**: ADR-0035 D3「個別」 scope 限定 → group 想定漏れ事例 由来、 ADR テンプレに「粒度 (個別 / group / bulk) × 4 ペルソナ matrix」 必須化 (`docs/adr/adr_template.md` 改訂、 本 ADR PR-① で同時実施)
- **Driver 7**: Material 3 / iOS HIG / WAI-ARIA / WCAG 2.1 / Nielsen Norman Group / Gmail Undo の業界 1 次情報整合、 「現代標準への追従」 を文書化

---

## Alternatives considered（他の案と却下理由）

### Option A: 完全版 (ConfirmDialog + group + 文言分離 + Undo + Haptics + kebab + cascade + 改善 ②) ★採用

- 概要: 上記 D1-D9 統合、 10 PR / 6-8h
- 良い点: 4 ペルソナ ✕ なし全員一致、 1 ADR で概念整合、 全 destructive action 共通基盤
- 悪い点: PR 数 10、 i18n 95 文字列追加
- 採用理由: 6 専門家 + フラット視点 + 4 ペルソナ全員推薦、 user 全 A 承認

### Option B: Undo 後回し (core 6 PR、 Phase ζ-3 で Undo 3-4 PR)

- 概要: D1/D2/D3/D4/D6/D7/D8/D9 = 6 PR、 D5 Undo は次セッション
- 良い点: scope 分割で安全
- 悪い点: R6 (100 鉢誤削除) 未解消、 v1.0 release blocker 残存
- 却下理由: user 真意 + R6 重大度で 1 セッション統合採用

### Option C: 最小変更 (Alert.alert 維持 + group + 文言分離 + 改善 ②)

- 概要: 3-4 PR、 ConfirmDialog 不採用
- 良い点: 実装コスト最小
- 悪い点: user「作りこみ」 要望未対応
- 却下理由: user 真意整合せず

### Option D: long-press 廃止 + kebab menu のみ (Notion 風)

- 概要: long-press 動線削除、 kebab menu 統一
- 良い点: 発見性 ↑
- 悪い点: user 真意「長押し」 と乖離、 power user の効率低下
- 却下理由: kebab と long-press 共存が Material 3 標準 (D7 で kebab 追加で共存)

---

## Consequences（結果：嬉しいこと/辛いこと/副作用）

### Positive (嬉しい)

- **削除 UX 完全カスタム化** (D1、 アプリ世界観統一、 user「作りこみ」 真意達成)
- **group 削除動線追加** (D2、 ADR-0035 D3 scope 漏れ補完、 業務プロ 100 鉢効率 ↑)
- **文言分離** (D3、 planned / logged の認知整合、 user 信頼度 ↑)
- **即削除 + Undo 安全網** (D4 + D5、 R6 100 鉢誤削除 root cause 解決、 R-44 恒久化)
- **触覚 fb** (D6、 長押し中認識、 R-45 恒久化)
- **kebab menu** (D7、 発見性 ↑ + UI 整理、 既存緑 button 統合)
- **wiring cascade** (D8、 取り外し予定管理不要、 透明性確保)
- **EventRow 重複削除** (D9、 1 画面情報密度 ↑、 スキャン速度 ↑)
- **共通基盤** (ConfirmDialog / UndoSnackbar / RowActionMenu / Haptics は全 destructive action で再利用)

### Negative (辛い/副作用)

- **10 PR 1 セッション** (CI 緑保持要注意、 Sess23 11 PR 同実績で運用可)
- **i18n 95 文字列追加 + 76 文字列削除** (Sess20/21 workflow で吸収)
- **既存 PlanScreen + bonsai-detail + EventRow + Toast 大幅 refactor** (regression テストで担保)
- **既存 ADR-0035 D7 緑 button → kebab menu 移行** で視認性は menu icon で担保、 R-25 retro で評価
- **`Alert.alert` 他 callsite (archive / 写真権限 / 日付エラー) は scope 外** (将来 PR で同 ConfirmDialog 移行候補)

### Follow-ups (後でやる宿題)

- [x] R-44 / R-45 起票 (本 ADR PR-① で同時起票)
- [x] ADR テンプレ「粒度 × 4 ペルソナ matrix」 必須化 (本 ADR PR-① で adr_template.md 改訂)
- [x] design_system.md §18「長押し UX 標準」 新規 (本 ADR PR-① で同時起票)
- [ ] `scripts/eslint-rules/destructive-undo.mjs` (R-44 AST grep 自動検出) — Phase ζ-3 or v1.x
- [ ] `Alert.alert` 他 callsite (archive / 写真権限 / 日付エラー) の ConfirmDialog 移行 — 別 PR or v1.x
- [ ] kebab menu「全 N 件を別日に移動」 (3rd item、 業務プロ要望) — v1.x
- [ ] 30 日復元 UI 動線整備 (ふりかえりタブ等) — v1.x
- [ ] SUMMARY 通知 identifier 最適化 (個別 cancel + reschedule) — Phase η Future Work (ADR-0035 で持ち越し済)

---

## Acceptance / Tests（合否：テストに寄せる）

### 正 (自動テスト)

- **Jest**:
  - `__tests__/components/ConfirmDialog.test.tsx` (5-6 case: render / cancel / confirm / accessibility / haptics)
  - `__tests__/components/Toast.test.tsx` (action callback case 含む)
  - `__tests__/components/RowActionMenu.test.tsx` (items dynamic 構築 / dismiss)
  - `__tests__/db/bulkSoftDeleteEvents.test.ts` (5 case: 単一 / bulk / 部分失敗 rollback / wiring cascade / FTS 同期)
  - `__tests__/db/restoreEvents.test.ts` (4 case: 単一 / bulk / 30 日後 expired / wiring 復元時 cascade)
  - `__tests__/features/event/EventRow.test.tsx` (showBonsaiName true/false 両 snapshot + accessibility)
- **Maestro** (4 新規):
  - `plan-tab-delete-single.yml`: 個別 row 長押し → ConfirmDialog → 削除 → UndoSnackbar
  - `plan-tab-delete-group.yml`: group 行 長押し → ConfirmDialog → 削除 → UndoSnackbar
  - `plan-tab-kebab-menu.yml`: kebab tap → RowActionMenu → 「削除」 / 「全 N 件を記録」
  - `plan-tab-undo.yml`: UndoSnackbar [元に戻す] tap → restoreEvents

### 手動チェック (実機 SS R-25 評価、 PR-ζ-2-⑩ retro)

構造系 4 項目:

- [ ] group 行 長押し で削除 ConfirmDialog 表示 (planned / logged 両)
- [ ] 個別 row 長押し で文言分離 ConfirmDialog 表示
- [ ] desc 行 が UI に存在しない (grep 0)
- [ ] kebab menu items 動的構築 (planned = 2 / logged = 1)

動線系 4 項目:

- [ ] 削除後 4 秒 UndoSnackbar 表示、 [元に戻す] で復元
- [ ] wiring planned 削除 → 対応 unwiring scheduled 通知 cancel (`expo-notifications.getAllScheduledNotificationsAsync` で 0 確認)
- [ ] bonsai-detail history タブ も同 ConfirmDialog + cancelForEvent + Haptics
- [ ] 展開後カード で 作業名 + 日付 行 なし、 bonsai-detail history regression なし

---

## Rollout / Rollback（出し方/戻し方）

- **リリース手順への影響**: v1.0 ストア申請前 phase、 ステージング dev build → 実機 SS R-25 評価 (PR-ζ-2-⑩) → main merge → 次 Phase η で preview build
- **ロールバック方針**: 10 PR Wave 単位 rebase merge、 問題発生時は該当 Wave revert (Sess14 PR-PP/RR revert pattern 既実績)。 ConfirmDialog / UndoSnackbar / RowActionMenu は新規 component で `Alert.alert` 経路は PR-ζ-2-⑦/⑧ で削除のため、 revert 時に既存 `Alert.alert` 経路復帰
- **検知方法**: `pnpm verify` 緑 / Maestro 4 flow PASS / 実機 SS R-25 構造系 + 動線系 評価 PASS

---

## Links（関連リンク：正へ寄せる）

- constraints: `docs/reference/constraints.md`
- reference: `docs/reference/functional_spec.md` §23.3.4 (本 ADR で改訂) / `docs/reference/design_system.md` §18 (本 ADR で新規)
- PR: #(Phase ζ-2-① 〜 ⑩)
- Issue: (なし、 user 直接 報告)
- Figma: (本 PR では Design 参照なし、 既存 ADR-0035 D3 拡張)
- package.json: `expo-haptics ~55.0.9` (既存依存)
- CI: `pnpm verify` (15+ verify scripts)
- External docs:
  - [Material 3 Dialog](https://m3.material.io/components/dialogs/overview)
  - [Material 3 Snackbar](https://m3.material.io/components/snackbar/overview)
  - [Apple HIG Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts)
  - [Apple HIG Action Sheets](https://developer.apple.com/design/human-interface-guidelines/action-sheets)
  - [WAI-ARIA Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
  - [WCAG 2.1 SC 2.1.1 Keyboard](https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html)
  - [Nielsen Norman Group "Recovery from Error"](https://www.nngroup.com/articles/recovery-from-error/)
  - [Gmail Undo Send](https://support.google.com/mail/answer/2819488)

---

## Notes（メモ：任意）

### Sess25 議論 + R-25 構造系 評価 計画

- 議論プロセス: 6 専門家 (テックリード / QA / UX/UI / PM / エンドユーザー / セキュリティ) + フラット視点 (中立アーキテクト) + 4 ペルソナ (高橋 62 / Marcus 35 / 業務プロ / ライト) 全員一致推薦、 user Q1-Q3 全 A + 追加 Q (kebab items 中 / Undo 4s / TaskCreate 順次) 全推薦案承認
- R-25 構造系 4 項目: タブ名 / セクション label / dot 順序 / button 配置 (Sess23 既評価 PASS) + 本 ADR 追加: ConfirmDialog 種別 / kebab menu items / UndoSnackbar 表示 / wiring cascade 整合
- 動線系 4 項目: long-press 削除 / kebab menu 動線 / Undo 復元 / wiring cascade 通知 cancel

### Sess27 (2026-05-22) Notes Amended — D5/D6 撤回 + D7 拡張

**実機検証 (Claude Code 主導、 PlanScreen + bonsai-detail 両画面)** で以下を発見 + user 判断で本 ADR を以下 4 点修正:

1. **D5 `<UndoSnackbar>` 撤回**: 実機検証で Critical bug 2 件確証:
   - **bug ①**: `actionButton` hit area 約 86×22px → WCAG 2.2 SC 2.5.8 (Target Size Minimum 24×24) 縦違反
   - **bug ②**: `pointerEvents="box-none"` で Snackbar の text 領域が背後貫通 → Undo button 微妙外 tap で背後の row が反応 → 別画面遷移 → Snackbar 4s timeout 経過 → Undo 機会喪失 → データ永続削除
   - user 真意「Undo は不要、 ただの通知 Toast『記録 N 件を削除しました』 のみで OK」 → D5 → 通知 Toast (action なし) に簡素化、 R-44 緩和 (本 ADR + R-44 Sess27 緩和参照)
   - DB 上の 30 日 soft delete は維持 (誤削除保険として機能)、 ゴミ箱 UI は v1.x 以降も着手しない (user 判断)
2. **D6 Haptics の削除実行時 `notificationAsync(Warning)` 維持**、 ただし「Undo button 押下時」 の Haptics は撤回 (D5 廃止に伴う)
3. **D7 RowActionMenu 拡張**: 個別 row にも kebab ⋮ 追加 (Sess25 では group row のみ → Sess26 PR-η-1 で groupRecordButton 廃止 → Sess27 で個別 row にも kebab 配置で動線統一)。 長押しが分からない user 向けの代替動線として明示
4. **D3 文言**: count=1 case (group row だが 1 件のみ展開可能な場面) で「N 件をまとめて」 は日本語として不自然 → titleKey 選択 logic に `count === 1 ? SingleTitle : GroupTitle` 分岐追加 (i18n key 既存 `planEventDeleteConfirmLoggedSingleTitle` 再利用、 追加翻訳不要)

### Future Work (Phase ζ-3 + v1.x)

1. `scripts/eslint-rules/destructive-undo.mjs` で R-44 違反 AST 自動検出 (delete/archive/clear/purge callsite が Toast wrap なしを検出、 Sess26 PR-η-3 の lint script を AST 化 + 検証対象 `showUndoToast` → `Toast.show` に変更済)
2. `Alert.alert` 他 callsite (bonsai-detail handleArchive / 日付エラー / 写真権限) の ConfirmDialog 移行
3. ~~kebab menu「全 N 件を別日に移動」 3rd item (業務プロ要望)~~ **Sess27 user 判断で対応見送り (シンプル維持優先)**
4. ~~30 日復元 UI 動線整備 (ふりかえりタブ 「ゴミ箱」 card 等)~~ **Sess27 user 判断で対応見送り (DB の 30 日 soft delete は維持、 UI は不要)**
5. SUMMARY 通知 identifier 最適化 (ADR-0035 Phase η Future Work 整合)
6. accessibilityActions に「削除」 action 追加 (VoiceOver swipe up/down で 長押しできない user 対応、 R-45 拡張)
