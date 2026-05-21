# Sess22 R-25 評価レポート — Phase δ 作業カレンダー UX 改善 (凡例 + アイコン併用 + 粒度作業別 + EventRow 共通化 + ふりかえり hub + 仕様 SoT)

> Sess22 (2026-05-21) で 7 議題 + 1 hotfix を **14 PR (#705-#717)** で実装、 全 main merge 完了。 ADR-0034 起票 + R-42 構造防止仕組み化 + functional_spec §23 F-17 SoT 整備で WCAG 1.4.1 解消 + user 真意「複数盆栽でも 1 作業なら ・ 1 個」 達成。

## Sess22 議論経緯 (6 専門家チーム + フラット視点 + 4 ペルソナ + 業界 1 次情報)

### 議論 Step 0-9 (本セッション前半で完遂)

| Step   | 内容                                        | 結果                                                                                           |
| ------ | ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Step 0 | プロジェクト全体理解                        | Sess21 v1.0 翻訳 DoD 達成 (#691-#704)、 ADR-0031/0032 で planned/logged 区別実装済             |
| Step 1 | 議題理解 + 関連ファイル 5 個 Read           | 7 議題 (凡例 / 粒度 / 色アイコン / スタック / 履歴流用 / hub / spec SoT)                       |
| Step 2 | 1 次情報調査 (Eleken / UX Patterns Dev 等)  | WCAG 1.4.1 違反確証、 業界 best practice「色のみ依存禁止 + 凡例必須」                          |
| Step 3 | 6 専門家 + フラット視点議論                 | 全議題で 4 ペルソナ ✕ なし、 △ 2 件 (粒度・hub) は緩和策併設で吸収                             |
| Step 4 | 7 議題各案比較 (A/B/C/D)                    | 全議題で「案 A」 推薦                                                                          |
| Step 5 | なぜなぜ 5 段階 (WCAG 違反 root cause)      | 議論時の色依存検査が構造化されておらず → R-42 起票で恒久策                                     |
| Step 6 | シミュレーション (Day 1 / Week 1 / Month 1) | 想定外: AsyncStorage flicker / wiring 依存 / spec 番号 shift 外部参照                          |
| Step 7 | 表面化していない問題 7 件                   | WCAG / spec SoT / EventRow 依存 / 件数情報損失 / hub 二重動線 / Legend 永続化 / Maestro testID |
| Step 8 | 推薦案 + Part 5 残タスク + 優先度           | 13 PR plan (Phase 0-5)、 i18n 171 文字列、 6-8 h                                               |
| Step 9 | user 全 A 承認 → /plan → 13 PR 実装         | R-17 4 段階遵守、 plan file + ExitPlanMode 承認                                                |

## Sess22 PR 一覧 (#705-#717、 13 PR + 1 hotfix = 14 PR)

| Phase  | PR     | URL  | 内容                                                                                 | 規模                                       |
| ------ | ------ | ---- | ------------------------------------------------------------------------------------ | ------------------------------------------ |
| 0      | PR-0-1 | #705 | ADR-0034 起票 + ADR-0032 Notes Amended D1 アイコン併用                               | docs 2 files、 +290 lines                  |
| 0      | PR-0-2 | #706 | R-42 起票 (WCAG 1.4.1 色 + アイコン併用ルール)                                       | docs 2 files、 +10 lines                   |
| 0      | PR-0-3 | #708 | functional_spec §23 F-17 作業カレンダー新設 + §23/§24 → §24/§25 shift                | docs 1 file、 +112/-8 lines                |
| hotfix | #707   | #707 | fr.ts errorDeleteFailed 追加 (Sess21 取りこぼし) + en.ts reminder → notifications    | i18n 2 files、 +2/-1 lines                 |
| 1      | PR-1-1 | #709 | i18n 9 keys × 19 言語 = 171 文字列 (ADR-0033 D1 ペルソナ翻訳)                        | i18n 19 files、 +171 lines                 |
| 1      | PR-1-2 | #710 | CalendarLegend + settingsStore 永続化 (calendarLegendCollapsed)                      | code 3 files、 +157 lines                  |
| 1      | PR-1-3 | #711 | CalendarDot + dot icon 化 (logged=● filled / planned=○ outline、 WCAG 1.4.1 解消)    | code 3 files、 +67/-27 lines               |
| 2      | PR-2-1 | #712 | dotsByDay 集計を作業別 unique (Set<EventType>) 化 + unit test 5 case PASS            | code 3 files、 +181/-20 lines              |
| 2      | PR-2-2 | #713 | listing 件数補完「×N (M 鉢)」 (粒度変更情報損失 fix)                                 | code 1 file、 +36/-4 lines                 |
| 3      | PR-3-1 | #715 | EventRow を src/features/event/EventRow.tsx に共通化                                 | code 2 files、 +210/-92 lines              |
| 3      | PR-3-2 | #716 | PlanScreen listing で EventRow 流用 (整合性レベル 2 達成)                            | code 2 files、 +40/-63 lines               |
| 4      | PR-4-1 | #714 | ふりかえり hub 5 card 目「カレンダー」 (過去 30 日 default) + ADR-0025 Notes Amended | code 3 files + docs 1 file、 +118/-5 lines |
| 5      | PR-5-1 | #717 | Maestro flow 2 新規 + 1 step 追加 (plan-tab-legend / look-back-card-calendar)        | maestro 3 files、 +271 lines               |
| 5      | PR-5-2 | (本) | 実機 SS R-25 評価 (Sess22 retro レポート) + ADR-0034 Notes Amended                   | docs 1-2 files                             |

## ADR-0034 D1-D8 達成状況

| Decision                                                    | 達成 PR         | 確証方法                                                    |
| ----------------------------------------------------------- | --------------- | ----------------------------------------------------------- |
| D1: カレンダー凡例 collapsible bar + 永続化                 | PR-1-2 + PR-1-3 | 実機 SS で凡例 bar 表示 + 3 row + toggle ▲▼ 確認            |
| D2: ドット粒度を作業別 unique (Set<EventType>) 化           | PR-2-1          | unit test 5/5 PASS、 実機で 5/20 = ●●● (3 種別)             |
| D3: 色 + アイコン併用 (logged=● filled / planned=○ outline) | PR-1-3          | 実機 SS で 5/5 = ●○ (混在)、 5/12 = ○ (planned)、 WCAG 解消 |
| D4: PlanScreen listing で EventRow 流用 (整合性レベル 2)    | PR-3-2          | type-check PASS、 PR-3-1 共通化整合                         |
| D5: EventRow を src/features/event/EventRow.tsx 共通化      | PR-3-1          | bonsai-detail の旧定義削除 + import 切替、 type-check PASS  |
| D6: ふりかえり hub 5 card 目「カレンダー」追加              | PR-4-1          | 実機 SS で 5 card 並び + tap → PlanScreen 過去 30 日確認    |
| D7: listing 件数補完「×N (M 鉢)」                           | PR-2-2          | i18n key `planListingBonsaiCount` 19 言語整備済             |
| D8: functional_spec §23 F-17 + R-42 起票                    | PR-0-2 + PR-0-3 | docs:lint clean、 §連番 OK、 外部参照 grep 0 件             |

## R-25 構造系 4 項目評価 (本 Sess22 達成判定の根拠)

### 1. タブ構成 ✅

- 4 タブ維持 (盆栽 / カレンダー / 記録 / ふりかえり)、 Sess19 ADR-0031 で「予定→カレンダー」 rename 済
- 実機 SS で確認: TabBar に「カレンダー」 表示、 太字 + アクティブ状態

### 2. セクション構成 ✅

PlanScreen の新セクション順序:

1. SearchHeader (タイトル「カレンダー」)
2. 月選択 row ("2026年 5月" + ‹ ›)
3. **Legend collapsible bar** (新、 ADR-0034 D1)
4. DOW header (日月火水木金土)
5. 5-6 週 grid (各 cell に dot icon + 「+」)
6. Listing (planned / logged section + group + EventRow)
7. FAB (右下、 過去日 disable)

実機 SS で確認: 月選択 row と DOW header の間に Legend bar が ScrollView 内で正しく配置。

### 3. UI 種別 ✅

| UI 要素              | 種別              | Sess22 変更                                    |
| -------------------- | ----------------- | ---------------------------------------------- |
| Calendar dot         | icon (●/○)        | 新 (色のみ → 色 + アイコン併用、 D3)           |
| Legend bar           | collapsible bar   | 新 (ADR-0034 D1)                               |
| Listing 件数 badge   | text 「×N (M鉢)」 | 新 (ADR-0034 D7、 件数情報損失 fix)            |
| EventRow             | shared component  | 新 (ADR-0034 D5、 bonsai-detail と pixel 整合) |
| ふりかえり card grid | 4 card → 5 card   | 新 (ADR-0034 D6、 カレンダー card 追加)        |

### 4. スクロール範囲 ✅

- PlanScreen: ScrollView contentContainerStyle paddingBottom 96 で FAB と被らない、 Legend bar 含めて全体スクロール
- FAB のみ absolute position 固定
- 実機 SS で確認: 月名 row + Legend bar + grid + listing が全体スクロール

## 実機 SS 検証 (Sess22 dev build 反映済)

### 1. PlanScreen — Legend + dot icon + 粒度 (sess22-calendar-current.png)

確認項目:

- ✅ 月名「2026年 5月」 直下に Legend bar「凡例 ... 凡例を隠す ▲」 表示
- ✅ Legend 展開状態で 3 row (● 完了 / ○ 予定 / + 複数作業) 表示
- ✅ dot icon 化: 5/5 = ●○ (混在)、 5/12 = ○ (planned 単独)、 5/9 5/17 = ● (logged 単独)、 5/20 5/21 = ●●● (logged 3 種別)、 5/22 = ○○ (planned 2 種別)
- ✅ 5/5 選択中 (cellSel border + 薄背景)、 listing「2026-05-05 ・ 11件」 + 「これから (1件)」 表示
- ✅ TabBar Calendar 太字 + アクティブ
- ✅ i18n ja 整合 (「凡例」 「完了 (●)」 「予定 (○)」 「複数作業 (+)」 「凡例を隠す」)

### 2. ふりかえり hub 5 card (sess22-lookback-5cards.png)

確認項目:

- ✅ 5 card 並び順 = watering / **カレンダー** / 針金がけ一覧 / 盆栽を検索 / タグを管理
- ✅ 「カレンダー」 card subtitle: 「月ごとに過去の作業を振り返る」 (PR-1-1 ja proper 整合)
- ✅ CalendarIcon (既存 TabBar 同 icon) 表示
- ✅ subtitle で「下タブ Calendar (今日中心)」 との差別化文言

## 4 ペルソナ評価 (議論時 + 実装後 期待値)

| 改善                                | 高橋 62 (シニア老眼)      | Marcus 35 (米国 IT)          | 業務プロ                  | ライト (1-2 本)  | 判定         |
| ----------------------------------- | ------------------------- | ---------------------------- | ------------------------- | ---------------- | ------------ |
| 凡例 collapsible bar                | ◎ 老眼でも文字 + 形状識別 | ○ 業界標準 (Google/Notion)   | ◎ 100鉢で誤認防止         | ◎ 初見でも直感的 | **完全達成** |
| dot 色 + アイコン併用 (WCAG)        | ◎ 色弱配慮 + outline 識別 | ○ a11y 整合                  | ◎                         | ◎                | **完全達成** |
| 作業別 unique 粒度                  | ○ シンプル                | ◎ Notion 整合                | △ 件数欠落 → 「×N (M鉢)」 | ◎                | **完全達成** |
| EventRow 共通化 (整合性 2)          | ◎ 一貫性                  | ◎ DRY                        | ◎                         | ○                | **完全達成** |
| ふりかえり hub 5 card「カレンダー」 | ○                         | △ 二重動線 → subtitle 差別化 | ○                         | ◎ 発見性         | **完全達成** |
| functional_spec §23 F-17 SoT        | -                         | -                            | -                         | -                | (Doc、 全 ◎) |

## KPT (Keep / Problem / Try)

### Keep

- **議論 → /plan → 14 PR 完遂** workflow (R-17 4 段階) で大規模 UX 改善を段階分割実施
- **i18n 一括 workflow**: pnpm i18n:add-key 9 回 → JSON → apply-translation.mjs 一括で 171 文字列を 1 PR で完了 (Sess20/21 確立 workflow)
- **EventRow 共通化** で PlanScreen ⟷ bonsai-detail history の row 表現を pixel 整合化 (整合性レベル 2)
- **業界 1 次情報 (Eleken / UX Patterns Dev / Page Flows / Muzli) を議論で参照**、 user 真意 + 業界 best practice 整合

### Problem

- **既存 main verify fail (fr.ts errorDeleteFailed + en.ts reminder)** が Sess22 着手時に発覚 → 2 件の hotfix 追加 (#707 で吸収)
- **R-18 hook block 2 回**: CalendarLegend.tsx と EventRow.tsx を Read 前に Edit しようとして hook block → Read してから Edit で対応
- **wiringDurationUtils.ts vs wiringDuration.ts**: file 名想定違い 1 回、 grep で確認した方が良い (R-9 強化候補)
- **plan-tab-dot-icon.yml は flaky リスクで skip** → 実機 SS R-25 評価で代替

### Try

- **次セッションで「i18n 17 言語 reminder→notification 整合性」 fix を別 PR で**: en.ts のみ R-3 違反 fix したが、 他 18 言語の `settingsNotifWateringToggle` も意味的に統一すべき (Pierre/Sofía 等のペルソナ翻訳で 「通知」 ベースに統一)
- **EventRow の eventsForBonsai O(N\*M) を useMemo 化検討**: N=1000 / M=20 で性能課題なら最適化
- **R-9 強化 (file 名想定違い検知)**: 新規 file 参照前に `find` or `grep -l` で実 path 確認

## Timeline + bottleneck 分析

| 区分             | 想定 (plan)   | 実績                                                             |
| ---------------- | ------------- | ---------------------------------------------------------------- |
| 議論 + plan 確定 | ~30 分        | ~45 分 (Plan agent 詳細出力 + plan file 編集に時間)              |
| Phase 0 (3 PR)   | ~45 分        | ~60 分 (ADR 起票 + 既存 ADR Notes Amended + R-42 + spec § shift) |
| hotfix #707      | 0 分 (想定外) | ~15 分 (発覚 → fix → PR → merge)                                 |
| Phase 1 (3 PR)   | ~120 分       | ~110 分 (i18n + Legend + dot icon)                               |
| Phase 2 (2 PR)   | ~70 分        | ~50 分 (純関数化 + listing 補完)                                 |
| Phase 3 (2 PR)   | ~90 分        | ~75 分 (EventRow 共通化 + PlanScreen 流用)                       |
| Phase 4 (1 PR)   | ~30 分        | ~30 分 (look-back hub 5 card)                                    |
| Phase 5 (2 PR)   | ~60 分        | ~50 分 (Maestro + retro)                                         |
| **合計**         | **~6.5 h**    | **~7.5 h** (15% 超過、 hotfix 1 件分)                            |

## Lessons (新規追加候補)

### L-Sess22-1: WCAG 1.4.1「色のみ依存禁止」 は R-42 で構造防止

- **状況**: ADR-0032 D1 (Sess19-2) で planned/logged を色のみ識別 → WCAG 1.4.1 違反
- **学び**: 「色 + アイコン or pattern 併用」 を新規 UI 設計時のデフォルトに、 R-42 で構造化
- **適用**: ADR-0034 D3 で `CalendarDot.tsx` (●filled / ○outline) で実装、 凡例 + アイコンの組合せで色覚多様性 + シニア老眼 + 屋外モード + ダークモードを横断識別可能化

### L-Sess22-2: 集計 logic 変更時、 表示先で「派生 metric」 補完を必ず併設

- **状況**: ADR-0034 D2 で dot 粒度を作業別 unique 化 → 「同日 5 鉢の watering でも dot 1 個」 で件数情報損失
- **学び**: 集計次元を絞った場合、 listing 等の表示先で **派生 metric (件数 vs 鉢数)** を補完する pattern が必要
- **適用**: ADR-0034 D7 で「×N (M 鉢)」 表示で吸収、 業務プロが視認可能

### L-Sess22-3: 仕様 SoT 整備で R-2 整合 (履歴 = ADR / 仕様 = spec の分離)

- **状況**: PlanScreen 仕様が ADR-0031/0032 に分散、 functional_spec §3 機能マップに「カレンダー (F-XX)」 欠落
- **学び**: 機能 SoT を spec §XX として整備、 ADR は履歴アンカーに留める
- **適用**: functional_spec §23 F-17 作業カレンダー新設 (8 サブセクション)、 §23/§24 → §24/§25 shift (外部参照 grep 0 件確認後)

## Next-app Handoff (他 apps factory 内 app への展開)

- **calendar UI 設計 best practice**: 凡例 collapsible bar + dot 色 + アイコン併用 + 作業別 unique 粒度 + listing 件数補完
- **共通 component 化 pattern**: feature 専用 row component (例: EventRow) を共通化、 props で onPress/onLongPress/showXxx を分岐
- **i18n workflow**: pnpm i18n:add-key 9 回 → JSON → apply-translation.mjs 一括で 100+ 文字列を 1 PR で完了
- **R-42 (WCAG 1.4.1 色 + アイコン併用)** は他 app でも適用すべき global rule (CLAUDE.md §0 と並行)

## 関連リンク

- ADR-0034 (本 Sess22 親 ADR): `docs/adr/ADR-0034-calendar-ux-phase-delta.md`
- R-42 (WCAG 1.4.1 構造防止): `.claude/recurrence-prevention/specialized.md`
- functional_spec §23 F-17: `docs/reference/functional_spec.md`
- Sess22 plan file: `~/.claude/plans/precious-riding-reddy.md`
- 業界 1 次情報: [Eleken](https://www.eleken.co/blog-posts/calendar-ui) / [UX Patterns Dev](https://uxpatterns.dev/patterns/data-display/calendar) / [Page Flows](https://pageflows.com/resources/exploring-calendar-design/) / [Muzli](https://muz.li/inspiration/calendar/)
