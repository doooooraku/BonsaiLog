# ADR-0032: カレンダー画面で作業予定 vs 作業記録の視覚区別 (Sess19-2)

- Status: Accepted
- Date: 2026-05-21
- Deciders: @doooooraku
- Related: ADR-0011 (記録のみ哲学) / ADR-0014 (F-16 通知) / ADR-0020 (Claude Design) / ADR-0025 (4 タブ構成 + 案 X 記録タブ) / ADR-0031 (カレンダー統一 + stale closure 撲滅) / Sess19 議題 A 議論 (6 専門家チーム + 4 ペルソナ全員 ◎/○) / `docs/reference/functional_spec.md` §13 / `docs/mockups/v1.0/screenshots/plan-tab-01.png`

---

## Context（背景：いま何に困っている？）

### Sess19 ADR-0031 達成後の課題

Sess19 で「予定タブ → カレンダー」 rename + Single/Bulk の保存後遷移先を `'/(tabs)/plan?selectedDateKey=...'` に統一 (= 1 つのカレンダー画面に planned + logged 両方を表示する設計)。 ただし **planned と logged を視覚区別する UI は最小限**:

- カレンダー grid のドット = BRAND_GREEN 1 色のみ (件数のみ反映)
- 選択日 listing で `e.status === 'planned'` のとき右側に小さい「予定」 バッジ (fontSize 10)
- logged には何のバッジもなし (= 「予定でないもの」 という暗黙の意味)

### user 真意 (Sess19-2 議題 A)

「予定と記録を区別したい」 「共存化を図る」 = 1 つのカレンダーに両方を表示しつつ、 user が一目で「これはやる予定 (TODO)」 「これはやった記録 (DONE)」 と分かる UI。

### 4 ペルソナ評価 (Sess19-2 議題 A 議論)

- 高橋 62 (シニア): 老眼でバッジ視認困難、 色違いの方が分かりやすい
- Marcus 35 (米国): 業界標準 (Notion / Google Calendar / Apple Reminders) は未完了/完了を色 + チェックで明確区別
- 業務プロ: 100 本/日 で予定と実績の差分視認は業務効率の核心
- ライト: 「やった / やってない」 が直感的に分かるべき

→ 4 ペルソナ全員 ◎ 評価で改善必要。

### 制約 / 前提

- ADR-0011 (記録のみ哲学): AI 提案 / べき NG、 ただし planned/logged の区別自体は OK
- schema 不変 (events.status は既存、 planned/logged の 2 値)
- mockup `plan-tab-01.png` には「記録」 button (planned → logged 変換 action) があるが、 本 ADR では D4 (Future) として保留、 v1.x で検討
- `pickerStore.planSelectedDateKey` (Sess12 PR-H 確立) は維持

---

## Decision（決めたこと：結論）

### D1: カレンダー grid のドット色を planned/logged で分岐

- **決定**: `dotsByDay` を `Map<string, { planned: number, logged: number }>` に拡張
  - 各日のドット render は以下の Pattern C (シンプル) を採用:
    - **全 logged のみ** → 緑ドット (BRAND_GREEN)
    - **全 planned のみ** → 茶ドット (ACCENT_BARK)
    - **混在 (planned + logged)** → 緑ドット + 茶ドットを併記 (max 3 個まで、 4+ は「+」)
- **理由**: 4 ペルソナ全員 ○ 以上、 業界標準 (Google Calendar の色付き event 整合)、 既存 BRAND_GREEN を完了状態色として保持

### D2: 選択日 listing を section 分割

- **決定**: 旧「選択日 listing」 (groupedEvents で type 別 group) を以下に拡張:
  - **「これから」 section** (planned events) — 上部
    - 種別ごとに row + 件数 (既存 expand 機能維持)
    - 期限切れ (occurredAtUtc < today、 D3 参照) は警告色 (TEXT_MUTED 茶) で表示
  - **「完了」 section** (logged events) — 下部
    - 種別ごとに row + 件数 (既存 expand 機能維持)
    - 完了マーク (緑チェック等) を icon に小さく重ねる
  - 各 section の見出し: 「これから (N 件)」 「完了 (N 件)」、 件数 0 の section は **非表示**

### D3: 期限切れ planned の視覚的表現 (Sess19-3 F-05 削除整合で更新)

- **決定**: planned event の occurredAtUtc < 今日 (TZ 補正後) の場合、 「これから」 section 内で **警告色 (TEXT_MUTED) のみ** で表示 (「期限切れ」 ラベルは表示しない)
- **理由**: Sess19-3 F-05 popup 削除 (user 真意「干渉不要」) と一貫性。 「期限切れ」 ラベルは「忘れてますよ」 と告げる干渉、 視覚色のみで自然な認知 (user は自分で判断: 記録する/予定削除/放置)、 ADR-0011 記録のみ哲学整合

### D4 (Future): mockup「記録」 button (planned → logged 変換)

- **保留**: 本 ADR では未実装、 v1.x で別 ADR 検討
- **理由**: planned → logged の変換は event update logic 追加 (`updateEventStatus` 等) + UI button、 v1.0 リリース前の安定性優先。 user は別途 + FAB → 直接 logged 記録 path で実質的に同等の操作が可能

### D5: i18n 19 言語の新 keys 追加 (Sess19-3 F-05 削除整合で更新)

- **決定**: 以下 2 keys を 19 言語に追加 (D3 「期限切れ」 ラベル削除に伴い `planEventOverdue` 削除):
  - `planSectionUpcoming` (ja: 「これから」 / en: 「Upcoming」)
  - `planSectionDone` (ja: 「完了」 / en: 「Done」)
- **方法**: `pnpm i18n:add-key` で en + ja proper、 17 言語英語 fallback (Sess16-18 既存 pattern 整合)

---

## Decision Drivers（判断の軸：何を大事にした？）

- **Driver 1 (最重要)**: 4 ペルソナ全員 ◎/○ (Sess19-2 議論で確認)
- **Driver 2**: ADR-0031 達成 (カレンダー統一) との延長線、 「予定 + 記録の共存」 を維持しつつ視認性向上
- **Driver 3**: schema 変更ゼロ、 既存 logic の最小拡張で実装
- **Driver 4**: mockup `plan-tab-01.png` 整合 (Pattern C dot 色分け + section 分割は mockup 精神整合、 「記録」 button は D4 で v1.x)
- **Driver 5**: 業界標準 (Notion / Google Calendar / Apple Reminders) 整合

---

## Alternatives considered（他の案と却下理由）

### Option A: 段階 1 (dot 色分け + section 分割) ★採用

- 概要: 上記 Decision D1-D5、 mockup「記録」 button は v1.x
- 良い点: 4 ペルソナ全員 ◎/○、 23 files で実装可、 デグレリスク最小
- 悪い点: mockup「記録」 button 未実装 (D4 で別 ADR)
- 採用理由: v1.0 リリース blocker でなく nice-to-have、 段階分割で安全

### Option B: 段階 2 (dot + section + 「記録」 button)

- 概要: mockup 整合の「記録」 button (planned → logged 変換) を含める
- 良い点: mockup 完全整合、 user 体験 ◎
- 悪い点: event update logic 追加 + button + 30+ files、 v1.0 前 blocker リスク
- 却下理由: 段階分割で A → B が realistic、 D4 で v1.x

### Option C: 3 tab + Filter chip (全面リニューアル)

- 概要: カレンダー上部に Filter chip (「すべて / 予定 / 記録」)、 listing も filter 連動
- 良い点: 柔軟性 ◎
- 悪い点: 40+ files、 大幅 refactor、 v1.0 前 blocker リスク大
- 却下理由: overkill、 user 真意は「共存しつつ区別」、 filter で切替えるは別概念

### Option D: 現状維持 + バッジ強化のみ

- 概要: dot 色 + section なし、 既存「予定」 バッジを大きく目立たせる
- 良い点: 最小修正、 5 files
- 悪い点: 「これはやった/やってない」 直感性が低い、 mockup 精神整合せず
- 却下理由: 議論で 4 ペルソナ評価 △、 問題未解決

---

## Consequences（結果：何が変わる？）

### Pro

- **planned/logged が一目で区別可能** (4 ペルソナ全員 ◎/○)
- **「これから」 + 「完了」 section で予定と実績を整理表示**、 業務プロが進捗視認可能
- **期限切れ planned 検知** (記録忘れの user 認知補助、 ADR-0011 記録のみ哲学整合)
- **業界標準 (Notion / Google Calendar) 整合**
- **既存 ADR-0031 達成 (カレンダー統一) の延長**

### Con

- **i18n 19 言語 × 3 keys = 57 文字列** 追加 (機械的、 i18n-add-key で一括)
- **PlanScreen の listing 構造変更**、 既存 expandedTypes logic を 2 階層 (section × type) に拡張要
- **期限切れ判定 logic 追加**、 TZ 補正で複雑性微増

### Forward-only 互換性

- `events.status` schema 不変
- 既存 planned / logged events への影響なし
- pickerStore.planSelectedDateKey 機構 (Sess12 PR-H + Sess19 PR-3 URL param) 不変

---

## Implementation（実装メモ）

### Phase 構成 (Sess19-2、 推定 2-3 PR)

| Phase    | PR               | 内容                                                             |
| -------- | ---------------- | ---------------------------------------------------------------- |
| Phase A1 | PR-A1 (本 ADR)   | ADR-0032 起票 + i18n 19 言語 × 3 keys + functional_spec §13 改訂 |
| Phase A2 | PR-A2            | PlanScreen 実装 (dot 色分け + section 分割 + 期限切れ警告)       |
| Phase A3 | PR-A3 (optional) | 実機 SS R-25 評価 retro                                          |

### testID 命名規約 (継承 + 新規)

- 既存: `e2e_plan_screen` / `e2e_plan_cell_<dateKey>` / `e2e_plan_group_<type>` / `e2e_plan_event_<id>`
- 新規: `e2e_plan_section_upcoming` / `e2e_plan_section_done` (section header 用)

### testing 戦略

- Maestro flow `plan-tab-*` で section visible 検証追加 (将来)
- unit test: `dotsByDay` 純関数化検討 (planned/logged 集計 logic)
- 実機 SS R-25 評価: dot 色 + section + 期限切れ + 同日混在 case

---

## Notes Amended (随時更新)

(初版 2026-05-21、 Sess19-2 議題 A 議論結果反映)

### 2026-05-21 Sess19-3 F-05 削除整合で D3 + D5 更新

F-05「気遣い型」 popup を Sess19-3 で完全削除 (user 真意「不要、 干渉」)。 本 ADR の D3 「期限切れ planned」 表示も同 user 真意整合で:

- 「期限切れ」 ラベル削除 (干渉なし、 視覚効果のみ)
- 警告色 (TEXT_MUTED) のみで自然な視認性
- i18n keys は 3 → 2 (`planSectionUpcoming` + `planSectionDone`)、 `planEventOverdue` 削除
