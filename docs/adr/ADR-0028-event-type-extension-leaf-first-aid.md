# ADR-0028: EventType 拡張 (leaf_first_aid 追加) + schema migration 不要発見 + defoliation/leaf_trimming 概念整理

- Status: Accepted
- Date: 2026-05-20
- Deciders: @doooooraku
- Related: ADR-0008 (events STI + Valibot payload) / ADR-0011 (記録のみ哲学) / ADR-0027 (Phase α-β form 統合) / Sess16 PR-E (#638) / `docs/reference/functional_spec.md` §7 / `docs/mockups/v1.0/screenshots/スクリーンショット 2026-05-20 135145.png` (mockup 葉の手当)

---

## Context（背景：いま何に困っている？）

- **現状**: Sess16 Phase β (PR-D1〜D6) で 13 種別 form の mockup 整合が完了。 ただし mockup user 提供 SS 135145.png に **「葉の手当」 (leaf_first_aid)** が描かれており、 これは既存 13 種別 EVENT_TYPES に存在しない 14 種類目の新規 EventType。
- **困りごと**:
  - leaf_first_aid を追加するには (a) DB schema 変更要否、 (b) Valibot payload schema 拡張、 (c) UI 配線 (WorkTypeIcon / WorkLogConfirm) を全て対応必要
  - 初期計画 (Plan v1) では schema v15 → v16 bump + migration 必要と想定 → 実装着手時に **schema migration 不要** と判明 (本 ADR の主たる発見)
  - defoliation (旧「葉抜き」 → PR-D5 で「全葉刈」 にリネーム) と leaf_trimming (「葉刈り」) で UI 同一 (範囲 segment) のため、 機能差が user に伝わるか?
- **制約 / 前提**:
  - `docs/reference/constraints.md` §1-4 (記録のみ哲学) → 種別追加は OK、 自動診断系機能は不要
  - schema v15 で events.type column は CHECK 制約なし (text のみ) → enum 値の追加・削除は schema-level migration 不要
  - Valibot v.object は **strict ではない** (追加 prop は warning なく通過) → 既存 events の payload を破壊しない

---

## Decision（決めたこと：結論）

- **決定**:
  1. **EVENT_TYPES に 'leaf_first_aid' を追加** (13 → 14 種別)
  2. **schema migration / SCHEMA_VERSION bump は不要** (events.type CHECK 制約なしのため EVENT_TYPES 配列追加 + Valibot PAYLOAD_SCHEMAS map 追加で完結)
  3. **LeafFirstAidPayload** を Valibot で定義 (`symptom?: string` + `treatment?: string`、 optional)
  4. **WorkTypeIcon に leaf_first_aid case 追加** (葉 + 十字 cross outline SVG、 mockup 整合)
  5. **WorkLogConfirm に leaf_first_aid case 追加** (症状 segment: 葉焼け/枝枯れ/虫/カビ/その他 + 処置 text input)
  6. **defoliation と leaf_trimming は別 EventType として維持** (UI は同じ範囲 segment だが、 機能差は user の意図で区別される、 統合せず)
- **適用範囲**: v1.x、 Free / Pro 両方、 iOS / Android
- **実装**: Sess16 PR-E (#638) で完遂 + PR-G (#639) で work-picker grid 表示漏れ修正

---

## Decision Drivers（判断の軸：何を大事にした？）

- **Driver 1 (最重要)**: mockup user 提供 SS 14 種別整合 (135145.png leaf_first_aid 追加)
- **Driver 2**: schema migration の最小化 (Sess14 PR-P で v14 部分失敗 lesson、 migration 不要なら安全)
- **Driver 3**: 既存 13 種別の payload schema を破壊しない (forward-only 互換性)
- **Driver 4**: defoliation/leaf_trimming は user の意図 (全部抜く vs 部分カット) で意味的に別 → 統合却下、 別概念維持

---

## Alternatives considered（他の案と却下理由）

### Option A: 14 種別追加 + schema migration 不要 ★採用

- 概要: 上記 Decision の通り
- 良い点: schema 変更ゼロでリスク低、 既存 user の DB に影響なし
- 悪い点: Valibot strict ではないため型安全性は手動担保 (ADR-0027 §Implementation 注記)
- 採用理由: 安全 + コスト最小 + 機能完成

### Option B: schema v16 bump + CHECK 制約に 14 種別列挙

- 概要: events.type column に CHECK 制約追加 (14 種別のみ許可)
- 良い点: DB レベルで type 安全性担保
- 悪い点: migration リスク (Sess14 PR-P v14 部分失敗の trauma)、 将来 type 追加時に毎回 migration 必要
- 却下理由: 過剰防御、 アプリ層 (Valibot + UI 配線) で十分。 enum 値の追加は schema 設計上 column 型を変えるものではない

### Option C: defoliation と leaf_trimming を統合 (1 EventType に)

- 概要: 「葉刈り」 と「全葉刈」 を 1 種別に統合し、 「範囲」 segment で区別
- 良い点: EventType 数削減
- 悪い点: 機能差 (全部抜く vs 部分カット) が user に伝わらない、 mockup でも 2 種別として明示されている
- 却下理由: user 真意 (作業の意味的区別) を重視、 mockup 整合維持

---

## Consequences（結果：何が変わる？）

### Pro

- mockup 14 種別整合 (R-25 構造系 4 項目 全 ✅)
- schema 変更ゼロでリスク最小、 既存 DB に影響なし
- Valibot DU で 14 種別の payload 型安全 (実装側)
- WorkTypeIcon で 14 種別すべて SVG outline 統一

### Con

- **手動 list 漏れリスク**: `ALL_WORK_TYPES` (WorkPickerScreen) / `BULK_WORK_TYPES` (BulkWorkPickerScreen) は EVENT_TYPES から動的生成していない手動配列。 Sess16 PR-G で実機 SS 検証時に leaf_first_aid 表示漏れ発覚 → 緊急 fix。 **将来 EventType 追加時に同じ漏れリスク**、 動的化 refactor (本 ADR §Follow-up T-5) を推奨
- defoliation/leaf_trimming は UI 同一 (範囲 segment のみ) のため、 user 視点で機能差が伝わりにくい (mockup label 「葉刈り」 vs 「全葉刈」 で区別) — 文言設計で吸収

---

## Follow-up（次にやる）

### T-5: ALL_WORK_TYPES / BULK_WORK_TYPES の動的化 refactor (優先度 低)

- 現状: 手動配列で EVENT_TYPES の subset を列挙 (BulkWorkPicker は candle_cut 除外で 12 → leaf_first_aid 追加で 13)
- 改善案: `EVENT_TYPES.filter((t) => !PINE_ONLY.has(t) || isPine)` で動的生成
- 効果: 将来 EventType 追加時に WorkPickerScreen / BulkWorkPickerScreen への漏れリスク恒久解消
- 規模: ~30 分、 30 行修正
- ADR-0028 §Consequences §Con で言及した課題の恒久対応

### T-6: 旧 logged events の payload backward compatibility

- wiring 旧 events: payload に `gauge`/`parts`/`duration` (PR-A5 で schema を `wire_size_mm`/`body_part`/`scheduled_unwire_at` に変更)
- 表示時 (wiring-list 等) で `duration` → `scheduled_unwire_at` 計算 fallback 追加
- 規模: ~1-2 時間

---

## Notes Amended

### 2026-05-20 PR-G fix integration

実機 SS 検証で leaf_first_aid が work-picker grid に表示されない bug 発見 → PR-G で ALL_WORK_TYPES / BULK_WORK_TYPES に 'leaf_first_aid' 1 行追加で fix。 これは本 ADR §Consequences §Con「手動 list 漏れリスク」 の典型例。 T-5 動的化 refactor を将来優先で実施。
