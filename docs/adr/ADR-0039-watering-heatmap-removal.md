# ADR-0039: F-04 水やり履歴ヒートマップ機能の撤廃

- Status: Accepted
- Date: 2026-05-22
- Deciders: @doooooraku
- Related:
  - Supersedes: [ADR-0013](./ADR-0013-f04-watering-visualization.md) (F-04 水やり履歴の可視化 — ヒートマップ単独構成 + BottomSheet)
  - Amends: [ADR-0020](./ADR-0020-claude-design-full-adoption.md) (画面マップ row 13 / row 16、HeatmapScreen 整合)
  - Amends: [ADR-0011](./ADR-0011-remove-recommendations-keep-record-only.md) (オンボーディング Step 4「ヒートマップの読み方」 → 「作業履歴の見方」 簡略化)
  - 連動: [ADR-0008](./ADR-0008-f02-event-data-model.md) (events STI、無影響)、[ADR-0009](./ADR-0009-f13-revenuecat-billing.md) (Pro 訴求、無影響)
  - Issue: Sess31 PR-B
  - PR: TBD (Sess31 PR-B、 PR-A は #773 で merge 済)

---

## Context（背景：いま何に困っている？）

- 現状：
  - F-04 水やり履歴可視化は ADR-0013 (2026-04-30) + ADR-0020 (2026-05-05 集約モード廃止改訂) + ADR-0024 (BottomSheet → inline / modal 化) で実装済。
  - ふりかえりタブ → CareHub「水やり履歴」 card → `app/(tabs)/look-back/watering-history.tsx` で「Skia ヒートマップ (7 行 × 30/90/365 列) + 月別 CrossWateringCalendar + Range セグメント + Summary + 日別詳細 modal」 を提供。
  - PR-A (#773) で shared util (`toLocalDateKey` 等) を `dateUtils.ts` に分離済 (本 PR の前段)。

- 困りごと：
  1. **意思決定価値の欠如**: 水やり実施判断は土の湿り気・天気・気温・湿度の合成で決まるため、 過去の水やり履歴をヒートマップで色濃淡表示しても「次にいつ水やるか」 「水やりが足りているか」 という user の困りごとに対して情報量ゼロ。
  2. **ADR-0011 哲学との半矛盾**: 「記録のみ、 判定しない」 を貫きつつ、 ヒートマップの色濃さは「達成感」 = 達成判定の暗黙メッセージを発する (ADR-0013 Driver 4「公平な達成感」)。 user 判断「達成感の演出より判断価値の欠如解消が優先」。
  3. **保守コストの累積**: Skia 依存 (+400〜750KB bundle)、 i18n 19 言語 × 36 keys = 約 684 文字列、 Maestro flow 2 件、 ADR Notes Amended 連鎖、 mockup HTML との整合タスク (Issue #502 未解決) を継続維持しており、 価値の出ない機能のメンテ負荷が累積している。
  4. **CareHub の階層深化**: ふりかえりタブ → CareHub 4 card → 水やり履歴画面 (2 ビュー切替) → 日別詳細 modal の 4 階層は Hick's Law 観点で過剰。

- 制約/前提：
  - `docs/reference/constraints.md` §1-4 (判定 / 推奨機能 NG、 「台帳であり判定するものではない」)
  - `docs/reference/constraints.md` §5-2 (UI 禁止語: 診断 / 判定 / 推奨 / べき / reminder / tracker / alert)
  - ADR-0011 (記録のみ哲学)
  - ADR-0008 (events STI、 DB schema 変更ゼロ — 既存 watering events は無影響で保持)
  - PR-A (#773) で `dateUtils.ts` 分離済 (本 PR の機械的削除を構造的に安全化)

---

## Decision（決めたこと：結論）

F-04 水やり履歴のヒートマップ系可視化 UI を **画面ごと完全削除** する。 ただし **「最後の水やりから N 日」 テキスト** (`LastWateredText` + `classifyLastWatered` + `getDaysSinceLastWatering`) は事実表示として **盆栽カード上で継続表示** する (ADR-0011 整合)。

### 削除する UI / コード

1. **画面**:
   - `app/(tabs)/look-back/watering-history.tsx` (横断水やり履歴画面)
   - `app/(modals)/watering-day-detail.tsx` (日別詳細 modal route)
2. **コンポーネント**:
   - `src/features/watering/WateringHeatmap.tsx` (Skia ヒートマップ)
   - `src/features/watering/heatmapA11y.ts` (a11y label 純関数)
   - `src/features/watering/CrossWateringCalendar.tsx` (月別カレンダー)
   - `src/features/watering/WateringDayDetailScreen.tsx` (日別詳細 component)
3. **pure 関数 (ヒートマップ専用)**:
   - `src/features/watering/wateringHeatmap.ts` 全体 (`getDailyWateringCounts` / `getHeatmapLevel` / `buildHeatmapDateKeys` / `buildHeatmapSummary` / `getEventsForDay` / `buildIndividualSummary` + 型 `WateringHeatmapLevel` / `HeatmapSummary` / `IndividualHeatmapSummary`)
4. **CareHub カード**: 4 card (水やり履歴 / 針金がけ / 検索 / タグ) → **3 card** (針金がけ / 検索 / タグ)
5. **pickerStore slice**: `wateringDayDetailContext` / `wateringDayDetailEntry` + 型 `WateringDayDetailContext`
6. **i18n keys (19 言語 × 36 keys = 684 文字列)**: `wateringHeatmap*` / `wateringCalendar*` / `wateringHistoryAll*` / `wateringHistoryLinkTitle` / `wateringRange*` / `wateringSummary*` / `wateringDayDetail*` / `wateringDisclaimer*` / `lookBackCardWatering*` / `stackWateringDayTitle` / `wateringLastFromLabel`
7. **テスト**: `__tests__/features/watering/wateringHeatmap.test.ts` / `__tests__/features/watering/heatmapA11y.test.ts`
8. **Maestro**: `maestro/flows/watering-filter.yml` / `maestro/flows/ui-diff/look-back-watering-history.yml`
9. **ui-diff config**: `scripts/ui-diff/config.ts` (`look-back-watering-history` entry) / `scripts/ui-diff/skip-list.json` (該当 skipped entry)

### 残すもの（維持）

- `src/features/watering/dateUtils.ts` (PR-A #773 で分離済、 shared util 6 関数 + 型 `LastWateredKind`) — 5 cross-feature consumers が継続利用
- `src/features/watering/LastWateredText.tsx` — 盆栽カード「最後の水やりから N 日」 事実表示
- i18n: `wateringLastNoRecord` / `wateringLastToday` / `wateringLastOneDay` / `wateringLastSeveralDays` / `wateringLastManyDays` / `wateringLastOverYear`
- DB schema: watering events は無変更で保持 (events table、 `type='watering'` / `status='logged'`)

### Skia 依存削除 (任意の後続 PR-C)

`@shopify/react-native-skia` は本 PR 時点で `WateringHeatmap.tsx` のみが利用 (grep 確認済)。 PR-B 完了後に再 grep し、 他用途ゼロなら別 PR で `package.json` から除去 (bundle -300〜750KB)。

---

## Decision Drivers（判断の軸）

- **Driver 1 — user 真意「価値なし」 の最優先**: 「困りごと / 悩みに対して解決できる機能・ 価値がない」 を最優先で受け入れ。 価値の出ない機能の保守はビジネス的に負債。
- **Driver 2 — ADR-0011 哲学整合**: 「記録のみ、 判定しない」 を達成感ゲーム化 (色濃さ) で薄める要素を排除し、 哲学整合性を強化。
- **Driver 3 — シンプル化 (Hick's Law)**: CareHub 4→3 card で選択肢削減、 ふりかえりタブの認知負荷低減。
- **Driver 4 — 保守コスト削減**: Skia 依存 + i18n 684 文字列 + Maestro 2 flow + mockup HTML 整合 Issue #502 を一括で解決可能。
- **Driver 5 — 構造的安全性 (PR-A 前段)**: shared util 分離 PR-A (#773) で機械的削除リスク #1 (cross-feature 連鎖崩壊) を構造的にゼロ化済。

---

## Alternatives considered（他の案と却下理由）

### Option A: 狭義削除 (Skia ヒートマップのみ削除、 画面は CrossWateringCalendar で維持)

- 概要: `WateringHeatmap.tsx` だけ消し、 `watering-history` 画面に月別カレンダー + Summary を残す。
- 良い点: 段階的、 ロールバック容易、 user の価値判断にゆとり。
- 悪い点: 「価値がない」 user 判断は月別ドット表示にも同様に当てはまる (土壌湿度依存で過去履歴は意思決定価値なし)。 中途半端な画面が残るのは UX 観点で最悪。
- 却下: チーム議論 (UX デザイナー指摘) で「画面はあるが見るものが減った」 状態は不快感を増すため。

### Option C: 広義削除 (LastWateredText も削除)

- 概要: B に加えて盆栽カードの「最後の水やりから N 日」 も削除。
- 良い点: i18n / コード削減量最大、 哲学整合性最強。
- 悪い点: 「最後にいつ水やったか」 は事実表示で土の湿り気判断の補助情報。 高橋 62 歳ペルソナの便利フィードバック (議論時) も。
- 却下: 事実表示は判定ではないため ADR-0011 整合、 削除は過剰。

### Option E: 1 PR で全削除 (PR-A 統合 = D 段階分離なし)

- 概要: shared util 分離せず 1 PR で削除 + import 再配線。
- 良い点: PR 数最小。
- 悪い点: cross-feature 利用関数の連鎖崩壊リスク高 (議論時のリスク #1)、 review しづらい diff。
- 却下: PR-A (#773) で構造的安全化済 → PR-B は「削除のみ」 の安全 diff を維持。

---

## Consequences（結果）

### Positive（嬉しい）

- 「記録のみ」 哲学の貫徹強化 (達成感ゲーム化要素の排除)
- ふりかえりタブ CareHub: 4 → 3 card (Hick's Law 整合)
- DB schema 変更ゼロ (既存 watering events は無影響)、 ロールバック容易
- i18n 684 文字列削減 (19 言語メンテコスト軽減)
- Maestro flow 2 件 + ui-diff Issue #502 解消
- bundle 候補 -300〜750KB (PR-C で Skia 削除する場合)
- 議論時の構造リスク #1 (shared util 連鎖崩壊) を PR-A 分離で構造的にゼロ化、 PR-B が機械的安全 diff

### Negative（辛い/副作用）

- ふりかえりタブ Hub 階層の選択肢が 1 減ることで「水やりっていつだったかな?」 を盆栽カード LastWatered で確認する動線に集約 (悪化はしない、 むしろシンプル化)
- ADR-0013 / ADR-0020 整合の mockup HTML 残骸 → 本 ADR で Supersede 明示、 mockup は下書き扱い (R-16 棄却後の F 案運用)
- 過去の議論成果 (ADR-0013 5 ラウンド議論 + 4 ペルソナ 12 論点 ◎ 評価) が結果的に破棄される

### Follow-ups（後でやる宿題）

- [ ] PR-C (任意): `@shopify/react-native-skia` 依存削除可否を grep 検証、 削除可なら別 PR で `package.json` / `pnpm-lock.yaml` 更新
- [ ] `docs/reference/functional_spec.md` §9 (F-04) を「撤廃」 セクション化 or 削除 (本 PR で実施)
- [ ] `docs/reference/basic_spec.md` §F-04 を「撤廃」 表記化 (本 PR で実施)
- [ ] `docs/reference/glossary.md` ヒートマップ / Skia Atlas / ColorBrewer / 達成率 / BottomSheet 等を「廃止済」 マーク (本 PR で実施)
- [ ] `.claude/recurrence-prevention/specialized.md` に **R-50「機能削除前に削除対象フォルダ内 export を cross-feature import 検査」** を新規追加 (本 PR で実施)
- [ ] `docs/reference/tasks/lessons/feature-removal-cross-import.md` 新規 lesson 作成 (本 PR で実施)
- [ ] ADR-0013 Status を `Superseded by ADR-0039` に更新 (本 PR で実施)
- [ ] ADR-0020 Notes Amended に「2026-05-22 ADR-0039 で F-04 ヒートマップ完全撤廃」 追記 (本 PR で実施)

---

## Acceptance / Tests（合否：テストに寄せる）

### 自動テスト

- [ ] `pnpm verify` 全緑 (lint / type / test / i18n / docs:lint / iteration / screen-testid / modal-autofocus / maestro-lint)
- [ ] `pnpm i18n:check` で 19 言語の dead key ゼロ
- [ ] `__tests__/features/watering/dateUtils.test.ts` (PR-A 由来、 PASS 継続)
- [ ] 削除済テスト: `wateringHeatmap.test.ts` / `heatmapA11y.test.ts` がファイルごと消失

### 実機検証 (R-25 Claude Read 主導、 構造系 4 項目)

- [ ] ふりかえりタブを開き **カード 3 枚** (針金がけ / 検索 / タグ) で「水やり履歴」 カード消滅を SS で確認
- [ ] 盆栽タブ index で **「最後の水やりから N 日」 テキスト正常表示** (LastWateredText 無影響)
- [ ] 予定タブ / 記録タブ / カレンダー (CalendarTabScreen) のドット表示が無影響 (`toLocalDateKey` 連鎖崩壊なし)
- [ ] 通知 (`triggerReschedule` / `invalidator`) が無影響
- [ ] 直接 URL (deep link) 想定: `/(tabs)/look-back/watering-history` および `/watering-day-detail` route で 404 (route 削除済)

---

## Rollout / Rollback（出し方/戻し方）

- リリース手順: 通常マージ (PR-A は merge 済 #773、 PR-B 本 ADR と共に main merge)
- ロールバック方針: DB schema 変更ゼロのため、 PR-A / PR-B の git revert のみで完全復元可能。 過去 PR と本 ADR の Decision 履歴を参照しつつ再実装可能。
- 検知方法: `pnpm verify` CI / Maestro smoke / 実機 SS 検証

---

## Links（関連リンク）

- constraints: `docs/reference/constraints.md` (§1-4 / §5-2)
- reference: `docs/reference/functional_spec.md` §9 (本 ADR で「撤廃」 表記化)
- reference: `docs/reference/basic_spec.md` §F-04 (本 ADR で「撤廃」 表記化)
- glossary: `docs/reference/glossary.md` (ヒートマップ / Skia / ColorBrewer 用語を「廃止」 マーク)
- 連動 ADR: ADR-0011 (記録のみ哲学) / ADR-0013 (Superseded) / ADR-0020 (Notes Amended) / ADR-0008 (events STI、 無影響)
- 行動 lesson: `.claude/recurrence-prevention/specialized.md` R-50 (新規)
- lessons: `docs/reference/tasks/lessons/feature-removal-cross-import.md` (新規)

---

## Notes（メモ）

### 議論経緯 (Sess31)

1. ラウンド 1: user 提示「水やり履歴ヒートマップ機能は不要、 価値なし、 削除依頼」
2. 6 名チーム議論 (テックリード / QA / UX / PM / エンドユーザー代表 / セキュリティ): 解釈 B (画面まるごと削除) + PR 構成 D (2 PR 分割) + ADR-0039 起票 + Supersede + Skia grep 後判断、 4 件全推薦案で確定
3. PR-A #773 merge 完了 (shared util 分離、 挙動変更ゼロ)
4. PR-B 本 ADR + 全削除 + 関連 docs 更新

### 4 ペルソナ評価 (削除対応)

| 観点                      | 高橋 62 歳   | Marcus 35 歳     | 盆栽園プロ | ライト |
| ------------------------- | ------------ | ---------------- | ---------- | ------ |
| 「水やり履歴画面なし」    | ○ 元々未理解 | △ 物足りない懸念 | ○          | ○      |
| LastWatered 残置          | ◎ 便利       | ◎                | ◎          | ◎      |
| CareHub 3 card 化         | ◎ シンプル   | ○                | ○          | ◎      |
| 「記録のみ」 哲学整合強化 | ◎            | ◎                | ◎          | ◎      |
| 総合                      | ○            | ○                | ○          | ○      |

→ ✕ ゼロ、 全ペルソナ ○ 以上 (R-10 クリア)。

### R-16 棄却後の F 案運用 (再確認)

- mockup HTML (`care-screens-v2.jsx HeatmapScreen`、 `02-Home.html 09 ケア 水やり履歴ヒートマップ`) は本 ADR で「撤廃」 と確定し、 ADR が正。
- 将来のセッションで mockup を見て「復活実装」 されないよう、 ADR-0013 を Supersede 表記化 + ADR-0020 Notes に追記 + glossary を「廃止済」 マーク。

### v1.x 拡張候補 (本 ADR 対象外)

- 水やりトレンド分析 (天気 API 連動): 外部 API 依存で constraints §1-1 (Local-first) 違反のため対象外
- 水やり間隔の自動学習: ADR-0011 (判定 NG) 違反のため対象外
- 水やり推奨通知: 既存 F-16 (1 日 1 回固定サマリー通知) を維持、 推奨型 NG 継続

### Amended (2026-05-28、 ADR-0016 連動 — PDF 振り返り文脈の事実表示ヒートマップは本撤廃の対象外)

本撤廃 (ADR-0039) は **「F-04 水やり履歴のアプリ内可視化 UI (達成感を演出する常設ヒートマップ)」**
を対象とする。F-10 `list_pdf` エクスポート (全盆栽リスト PDF) の **月別作業件数ヒートマップ (木 × 月)**
は、以下 3 点で ADR-0011 (記録のみ哲学) と整合する **例外として採用**する (ADR-0016 連動、PDF Phase 2):

1. **常設 UI ではない**: ユーザーが明示的に生成する振り返り / 引き継ぎ文書 (蔵書目録) であり、
   アプリを開くたびに目に入る達成演出ではない。
2. **水やり達成度の判定ではない**: 全 14 作業種別の件数を集計した「お世話の記録の濃淡」であり、
   「水やりが足りているか」 のような判定 (ADR-0039 困りごと #1/#2 の本質) を一切しない。
3. **凡例で事実表示を明記 + 件数を併記**: 凡例に「セルの色は記録件数を表します (達成度ではなく
   事実の表示です)」 と明記し、各マスに件数の**数字を併記** (色は副次、件数=一次情報)。streak /
   スコア / % / トロフィー等の達成表現は一切入れない。色は緑単色の明度 5 段階のみ (色相 1 系統)。

判断根拠: ユーザーが議論 (Sess51 /discuss) で「色ありヒートマップ採用」 を明示選択。エージェントは
ADR-0039 との衝突可能性を提示した上での合意。本判断は ADR-0016 Notes にも記録。`list_pdf` の棒グラフ /
ヒートマップは純 CSS (div 幅% / td 背景色) で実装し、新規依存 (Skia 等) は追加しない (本撤廃の保守コスト
Driver 4 に反しない)。
