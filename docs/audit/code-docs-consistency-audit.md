# コード/ドキュメント整合性監査レポート

> **Diátaxis**: Reference (調査記録)
> **作成日**: 2026-05-30
> **担当**: Claude Code (Sess56)
> **対象 main**: `29de527` (Phase 7 完了)
> **次工程**: user 承認後に docs 修正 PR を起票

---

## 1. 目的

リファクタ大行進 Phase 3-7 完遂直後の **コードとドキュメント (`docs/` / `README.md` / `AGENTS.md` / `.claude/` / `scripts/` コメント部)** の整合性を、 **コードを正、 docs を従** の原則で網羅監査する。

本レポートは「監査結果と修正方針の合意文書」 であり、 実際の docs 修正は本レポート承認後に別 PR で実施する (R-17 4 段階厳守)。

## 2. 監査方法

### 2.1 4 エージェント並列スキャン (Agent A〜D)

| Agent | 担当領域                                                                                                                                                                         | 用途                           |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| A     | `docs/reference/` + `docs/explanation/`                                                                                                                                          | 機能仕様コアの矛盾抽出         |
| B     | `docs/adr/` (46 ファイル)                                                                                                                                                        | Status / Superseded リンク確認 |
| C     | `docs/how-to/` + `docs/handoff/` + `docs/refactor/` + `docs/reports/`                                                                                                            | 運用ドキュメント整合           |
| D     | `AGENTS.md` + `README.md` + `.claude/` + `scripts/` コメント部 + `docs/store-listing/` + 法務 (`docs/privacy/` `docs/terms/` `docs/legal/`) + `docs/mockups/` README + MEMORY.md | 横断                           |

### 2.2 コード根拠 (fact-base)

並列スキャン後、 矛盾候補は以下のコマンドで実体確認 (推測排除)。

```sh
# 依存撤去確認 (package.json)
grep -E '@tanstack/react-query|@gorhom/bottom-sheet|tamagui|@shopify/flash-list|@shopify/react-native-skia|@expo/vector-icons|expo-store-review|expo-symbols' package.json
# → 0 件 (撤去確認)

# 実装本体への参照確認
grep -RIn 'WateringHeatmap|CrossWateringCalendar' src/ app/ __tests__/
# → コメント内のみ (実装本体 0、 撤去済)

grep -RIn '@shopify/react-native-skia' src/ app/
# → 0 件

grep -RIn '@gorhom/bottom-sheet' src/ app/
# → コメント内のみ 5 件 (実装本体 0)

# F-17 (作業カレンダー) 実装確認
find app/(tabs)/plan src/features/calendar src/features/plan
# → 全ディレクトリ + ファイル存在 (実装確認)

# QR コード機能確認
grep -RIn -i 'QRcode|qr-code|qrcode' src/ app/
grep -i 'qrcode|qr-code' package.json
# → 0 件 (未実装、 user 指示「今後も対応しない」 確定)
```

## 3. Source of Truth 優先順位 (AGENTS.md §2.2 準拠)

1. **コード** (`package.json` / CI ワークフロー / 実際の挙動)
2. `docs/reference/constraints.md` (不変ルール)
3. `docs/adr/` (理由付き意思決定)
4. その他 doc (古い可能性)

本監査はこの順位で矛盾を判定。

## 4. A〜F 分類定義

| 分類 | 意味                              | 修正対応                 |
| ---- | --------------------------------- | ------------------------ |
| A    | コードと一致                      | 不要                     |
| B    | コードと矛盾                      | 修正対象 (本命)          |
| C    | docs にあるがコードに見つからない | 削除 or ロードマップ送り |
| D    | コードにあるが docs にない        | 追記                     |
| E    | 将来予定として書くべき            | 付録 E (ロードマップ) へ |
| F    | 要確認 (grep / 追加調査必要)      | 要確認リストに残置       |

## 5. 整合性サマリ

### 5.1 統計

| 分類     | 件数 (重複統合前) | 件数 (テーマ統合後)   |
| -------- | ----------------- | --------------------- |
| B 矛盾   | 22                | **6 テーマ + 個別 4** |
| C 不在   | 3                 | 1 (F-04 関連残置)     |
| D 不足   | 2                 | 1 (F-17 ID 定義)      |
| E 将来   | 0                 | 0                     |
| F 要確認 | 10                | 5                     |

### 5.2 整合 OK (修正不要) 項目

- `MEMORY.md` (Phase 3-7 反映済)
- `docs/refactor/phase-{4,6,7}-report.md` (Phase 完遂と完全整合)
- ADR-0013 (F-04 ヒートマップ Superseded by ADR-0039) ✅ 模範例
- ADR-0019 (Home画面 Superseded by ADR-0020) ✅ 模範例
- ADR-0024 / ADR-0039 / ADR-0046 / ADR-0048 (全て Accepted、 コードと整合)
- `docs/store-listing/` (撤去済技術への言及なし)
- `docs/privacy/` `docs/terms/` `docs/legal/` (法務文書、 撤去済技術への言及なし)
- Codex 不採用記述 (docs-lint 許可パターンで運用)
- Skill (`/discuss` / `/plan` / `/review-pr` / `/retro` / `/progress` / `/session-end` 等) は全て現役、 `docs/how-to/workflow/whole_workflow.md` と整合

## 6. 矛盾一覧 (B 分類、 テーマ別)

### Theme 1: Tamagui 撤去 (ADR-0015 Amendment 2026-05-30、 PR #900)

**コード根拠**: `grep tamagui package.json` = 0 / `grep -RIn tamagui src/ app/` = `app/onboarding/tut/[step].tsx:140` の **コメント 1 件のみ** (今回スコープ外、 F 分類)。

| #       | file                                      | line / 範囲     | 該当 (現状)                                                                         | 修正方針 (承認待ち)                                                                                                                                                                                                                                           |
| ------- | ----------------------------------------- | --------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B-T1-01 | `AGENTS.md`                               | L75             | `UI: Tamagui v1`                                                                    | `UI: React Native 標準 + useColors theme system (ADR-0015 Amendment)`                                                                                                                                                                                         |
| B-T1-02 | `README.md`                               | L19             | `Tamagui v1, React Navigation`                                                      | `React Native 標準コンポーネント, React Navigation`                                                                                                                                                                                                           |
| B-T1-03 | `docs/reference/basic_spec.md`            | L544            | F-15 内「F-04 ヒートマップ 3 mode 自動切替 (`bonsai_heatmap_l0..l3` トークン)」     | 削除 (F-04 撤廃 + Tamagui 撤去 の二重矛盾)                                                                                                                                                                                                                    |
| B-T1-04 | `docs/reference/functional_spec.md`       | L2557-2703      | `<TamaguiProvider>` / `@tamagui/lucide-icons` import / `tamagui.config.ts` 受入条件 | 実装合致のコード例 (`useColors` hook + 別 icon library) + 受入条件に書き換え                                                                                                                                                                                  |
| B-T1-05 | `docs/reference/glossary.md`              | L583-595        | `bonsai_*` プレフィクス (Tamagui トークン命名規約)                                  | 「Tamagui 撤去 → token 命名は ADR-0042/design_system §6 を参照」 に短縮                                                                                                                                                                                       |
| B-T1-06 | `docs/how-to/development/coding_rules.md` | §4.3 (L112-116) | 「Tamagui 利用ルール / 直値を増やしすぎない / トークン/テーマを優先」               | §4.3 全削除 (Tamagui 不在のため意味消失)                                                                                                                                                                                                                      |
| B-T1-07 | `scripts/theme-token-check.mjs`           | L38 コメント    | 「Phase 7 K5: Tamagui 撤去後は本 check は obsolete」 (現状の skip 説明あり)         | コメント更新 (「token SoT は design_system.md §6 + ADR-0042、 本 script は graceful skip 維持」 と明記)                                                                                                                                                       |
| B-T1-08 | `docs/adr/ADR-0015-f15-theme-system.md`   | 冒頭            | Status: `Accepted` (Amendment 入りなのに) / タイトルが Tamagui 前提 PoC を指す      | **案 B 採用** (user 合意): 冒頭に `## ⚠ 実装注意 — 本文 (Decision §) は当初 PoC 設計。 現実装は plain hex + useColors hook (Notes Amended 2026-05-30 / `design_system.md §6`/`src/core/theme/useColors.ts`)。 本 ADR の歴史的価値のみ保持。」 disclaimer 追加 |

### Theme 2: React Query 撤去 (PR #898)

**コード根拠**: `grep @tanstack/react-query package.json` = 0。

| #       | file        | line | 該当                                                   | 修正方針                           |
| ------- | ----------- | ---- | ------------------------------------------------------ | ---------------------------------- |
| B-T2-01 | `AGENTS.md` | L76  | `State: Zustand + AsyncStorage (persist), React Query` | `React Query` 削除                 |
| B-T2-02 | `README.md` | L20  | `Zustand + persist, React Query`                       | `Zustand + AsyncStorage (persist)` |

### Theme 3: F-04 ヒートマップ撤廃 (ADR-0039 Accepted, 2026-05-22)

**コード根拠**: `grep -RIn WateringHeatmap|CrossWateringCalendar src/ app/ __tests__/` → コメント内のみ (実装本体 0)。 `__tests__/features/watering/dateUtils.test.ts` のみ存在 (F-04 ヒートマップではなく日付 util テスト)。

| #       | file                                   | line / 範囲         | 該当                                                                          | 修正方針 (user 合意: 本文削除 + ADR リンク 1 行)                                                                                                                     |
| ------- | -------------------------------------- | ------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B-T3-01 | `docs/reference/basic_spec.md`         | L196-235            | F-04 撤廃ヘッダ + 旧仕様本文 ~40 行 (ヒートマップ + BottomSheet + フィルタ)   | 本文丸ごと削除、 `### F-04 水やり履歴の可視化 — 撤廃 (ADR-0039、 2026-05-22)\n詳細は ADR-0039 を参照。 維持: 「最後の水やりから N 日」 テキストのみ。` の 3 行に置換 |
| B-T3-02 | `docs/reference/functional_spec.md`    | L690-867            | §9 F-04 本文 ~150 行 (Skia Atlas / ColorBrewer / BottomSheet 詳細仕様残置)    | 本文削除、 ADR-0039 リンク + 「LastWateredText 仕様のみ残置」 に短縮                                                                                                 |
| B-T3-03 | `docs/reference/functional_spec.md`    | L2717               | F-15 受入条件「F-04 ヒートマップが 3 mode で即時再描画 (Skia Atlas worklet)」 | 削除                                                                                                                                                                 |
| B-T3-04 | `docs/reference/glossary.md`           | L349-367            | 「ヒートマップ」「Skia Atlas」「BottomSheet」 用語定義 (廃止済と並記が散在)   | 各エントリ 1 行に短縮 + 「撤去済 (ADR-0039/0024/0015 Amendment)」 と明記                                                                                             |
| B-T3-05 | `docs/explanation/product_strategy.md` | §3-1 マスター対応表 | 🩹2 行「水やり履歴グラフ + 最後の水やりから X 日表示」 (グラフは撤去済)       | 「最後の水やりから X 日表示」 のみに短縮 (グラフ削除)                                                                                                                |
| B-T3-06 | `docs/explanation/product_strategy.md` | §6-1 #3             | v1.x コア機能「水やり履歴グラフ (棒グラフで可視化)」                          | 削除 (撤去済機能を v1 コアに記載するのは矛盾)                                                                                                                        |
| B-T3-07 | `docs/reference/basic_spec.md`         | §1.4 v1 (MVP)       | F-04 を v1 MVP リストに含めている                                             | F-04 行を削除、 「F-02 内に最後の水やりからの経過日数を表示する」 を別の機能要件として残置 (要 user 確認、 F 分類)                                                   |

### Theme 4: FlashList 撤去 (PR #901、 死 deps 4 件)

**コード根拠**: `grep @shopify/flash-list package.json` = 0。

| #       | file                                                               | line       | 該当                                                                           | 修正方針                                              |
| ------- | ------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------ | ----------------------------------------------------- |
| B-T4-01 | `docs/reference/basic_spec.md`                                     | §6.1       | 「FlashList 前提: 50 件以上は `@shopify/flash-list` を使う (`FlatList` 不可)」 | 削除 (knip で死 deps 検出済、 撤去済)                 |
| B-T4-02 | `docs/how-to/workflow/prompts/P-11_implement-from-mockups.md`      | L340       | 「map list → FlatList / ScrollView (大量なら FlashList @shopify)」             | 「map list → FlatList / ScrollView (key 最適化推奨)」 |
| B-T4-03 | `docs/how-to/workflow/prompts/P-12_screen-implementation-cycle.md` | L172, L455 | 同上 (2 箇所)                                                                  | 同上 (2 箇所)                                         |

### Theme 5: BottomSheet 全廃 (ADR-0024 Accepted, 2026-05-12)

**コード根拠**: `grep @gorhom/bottom-sheet package.json` = 0。 ただし **src/ 内に由来説明コメント 5 件残存** (今回スコープ外、 F 分類で記録)。

| #       | file                                      | line | 該当                                   | 修正方針                                                                                 |
| ------- | ----------------------------------------- | ---- | -------------------------------------- | ---------------------------------------------------------------------------------------- |
| B-T5-01 | `docs/how-to/maestro-standard-pattern.md` | L196 | `gorhom Issue #1753` リンク (歴史参照) | 注釈追記「@gorhom/bottom-sheet は ADR-0024 (Phase G) で全廃。 native presentation 採用」 |

### Theme 6: R-XX 番号範囲記述の経年劣化

**コード根拠**: `.claude/recurrence-prevention.md` を Read → R-1〜R-12 本文 + R-13〜R-57 索引。 `.claude/recurrence-prevention/specialized.md` を Read → R-13〜R-57 本文。

| #       | file                                           | line    | 該当 (古い)                               | 実態 (新)                   | 修正方針                                                  |
| ------- | ---------------------------------------------- | ------- | ----------------------------------------- | --------------------------- | --------------------------------------------------------- |
| B-T6-01 | `AGENTS.md`                                    | L130    | 「R-1〜R-12 として構造化されている」      | R-1〜R-57                   | 「R-1〜R-12 (汎用) + R-13〜R-57 (専門、 specialized.md)」 |
| B-T6-02 | `AGENTS.md`                                    | L148    | 「(全タスク横断、 150 行以内必読性確保)」 | 153 行 (docs-lint 上限 250) | 「(全タスク横断、 250 行以内、 docs-lint で構造防止)」    |
| B-T6-03 | `.claude/CLAUDE.md`                            | L80     | 「behavioral rules (R-1〜R-24)」          | 同上                        | 「(R-1〜R-57: 汎用 R-1〜R-12 + 専門 R-13〜R-57)」         |
| B-T6-04 | `.claude/recurrence-prevention.md`             | L1 周辺 | ヘッダ「R-13 〜 R-33」                    | 同上                        | 「R-13 〜 R-57」                                          |
| B-T6-05 | `.claude/recurrence-prevention.md`             | L93     | 見出し「専門ルール R-13 〜 R-31」         | 同上                        | 「R-13 〜 R-57」                                          |
| B-T6-06 | `.claude/recurrence-prevention/specialized.md` | L1      | ヘッダ「R-13 〜 R-33」                    | 同上                        | 「R-13 〜 R-57」                                          |

### 個別 B 矛盾

| #      | file                                                  | line     | 該当                                                      | 修正方針                                                                                                |
| ------ | ----------------------------------------------------- | -------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| B-X-01 | `docs/adr/ADR-0040-form-screen-scroll-unification.md` | L3       | `- **Status**: Accepted` (二重ボルド = 他 ADR と表記ゆれ) | `- Status: Accepted` に統一 (cosmetic)                                                                  |
| B-X-02 | `docs/explanation/product_strategy.md`                | §6-1 #11 | v1.x コア機能リスト「QR コード印刷 → スキャン」           | **行削除 + §6-2 非ゴールへ移動なし** (user 指示「今後も対応しない」 → 非ゴール扱いだが明示削除に留める) |
| B-X-03 | `docs/explanation/product_strategy.md`                | §7-3 表  | 「QR コード印刷 Free 不可 / Pro 可」 行                   | 表から行削除                                                                                            |

## 7. C 分類 (docs にあるがコードに見つからない)

| #    | 項目                     | コード状況                                | 判定                                       | 修正方針                                                           |
| ---- | ------------------------ | ----------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------ |
| C-01 | QR コード印刷 → スキャン | `grep -i qrcode src/app/package.json` = 0 | **未実装** (user 指示「今後も対応しない」) | **B-X-02 / B-X-03 と統合**。 v1.x 非ゴール ($4) に追加せず単純削除 |

## 8. D 分類 (コードにあるが docs にない、 追記要)

| #    | 項目                                       | コード根拠                                                                                                                                                                                                                         | 判定           | 修正方針                                                                                                                          |
| ---- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| D-01 | **F-17 作業カレンダー (機能 ID 定義不足)** | `app/(tabs)/plan/` + `src/features/calendar/` + `src/features/plan/` ディレクトリ存在 / `functional_spec.md §23 (L3025)` 本文存在 / `functional_spec.md L71` 機能 ID マップに F-17 行あり / `constraints.md §8` に F-17 行**なし** | **実装済確定** | `constraints.md §8` 機能 ID 表に「F-17 作業カレンダー」行追加 + `basic_spec.md §1.4 v1 (MVP)` リストに「F-17 作業カレンダー」追加 |

## 9. F 分類 (要確認 / コード変更スコープ外)

| #    | 項目                                                         | grep 確認結果                                                                                                                               | 判定                                                                                                                                                                                         |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-01 | `app/onboarding/tut/[step].tsx:140` の Tamagui コメント      | 「将来 @tamagui/lucide-icons で置換予定」 残存                                                                                              | **コード変更スコープ外**。 別 Issue 化候補 (`chore(cleanup): tut step.tsx の死コメント除去`)。 docs/audit のみで記録                                                                         |
| F-02 | `scripts/native-runtime-check.mjs` Skia 検査 (`L18, L75-97`) | 実行時 skip ロジックあり (`if (!existsSync(skiaPkgPath)) return;`)。 コードコメント中に Skia 言及 8 行                                      | **動作に影響なし** (skia 不在で skip)。 別 Issue 化候補 (`chore(cleanup): native-runtime-check Skia 検査削除`)。 docs/audit で記録                                                           |
| F-03 | `src/` 内 `@gorhom/bottom-sheet` コメント 5 件               | `WorkPickerScreen.tsx` / `BonsaiBasicForm.tsx` / `BonsaiCreateScreen.tsx` / `WorkLogConfirmScreen.tsx` / `app/_layout.tsx` 由来説明コメント | **コード変更スコープ外**。 別 Issue 化候補 (`chore(cleanup): BottomSheet 由来コメント整理`)。 ただし `app/_layout.tsx:133` の `GestureHandlerRootView` 用途は確認要 (削除可能か grep)        |
| F-04 | ADR-0022 / ADR-0023 欠番                                     | `git log --all --diff-filter=D -- 'docs/adr/ADR-002[23]*'` = 0 (履歴上一度も存在せず)                                                       | **連番予約ミス** (削除ではなく最初から無い)。 docs-lint warning は既出。 `.claude/recurrence-prevention.md` か `lessons/refactor.md` に「ADR 連番予約は確定後に番号付け」 という教訓記録候補 |
| F-05 | `__tests__/features/watering/dateUtils.test.ts`              | F-04 ヒートマップではなく日付 utility テスト                                                                                                | **F-04 撤廃の影響なし**。 そのまま維持                                                                                                                                                       |

## 10. 実装済 / 未実装 / 要確認 一覧表

### 10.1 機能 ID (F-XX) 別

| F-ID     | docs 定義場所 (constraints §8 / basic §1.4 / functional §X)                         | コード実装                                                                                           | 状態                     | 備考                                                  |
| -------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------ | ----------------------------------------------------- |
| F-01     | constraints ✅ / basic ✅ / functional §3 ✅                                        | `src/features/bonsai/` `app/(tabs)/bonsai/` 等                                                       | ✅ 実装済                | -                                                     |
| F-02     | constraints ✅ / basic ✅ / functional §4 ✅                                        | `src/features/event/` `app/(modals)/work-log-confirm` 等                                             | ✅ 実装済                | -                                                     |
| F-03     | (欠番)                                                                              | -                                                                                                    | -                        | F-XX 連番欠番 (F-04 から)                             |
| F-04     | constraints ✅ / basic ✅ (L196-235 撤廃済本文残置) / functional §9 (L690-867 残置) | ヒートマップ撤去済、 LastWateredText のみ                                                            | 🚫 **撤廃済** (ADR-0039) | docs から本文削除要                                   |
| F-05     | constraints ✅ / basic ✅ / functional §5 ✅                                        | `src/features/care/` 等                                                                              | ✅ 実装済                | -                                                     |
| F-06     | (欠番)                                                                              | -                                                                                                    | -                        | -                                                     |
| F-07     | constraints ✅ / basic ✅ / functional §7 ✅                                        | `src/features/wiring/` 等                                                                            | ✅ 実装済                | -                                                     |
| F-08     | constraints ✅ / basic ✅ / functional §8 ✅                                        | `src/features/photos/` 等                                                                            | ✅ 実装済                | -                                                     |
| F-09     | constraints ✅ / basic ✅ / functional §10 ✅                                       | `src/features/search/` `src/features/tags/` 等                                                       | ✅ 実装済                | F-04 関連 BottomSheet 言及残置                        |
| F-10     | constraints ✅ / basic ✅ / functional §11 ✅                                       | `app/export/` 等 (PR #903 で動線改善済)                                                              | ✅ 実装済                | basic §F-10 で「7 画面」表記の更新検討 (Sess55 Amend) |
| F-11     | constraints ✅ / basic ✅ / functional §12 ✅                                       | `src/features/backup/` 等                                                                            | ✅ 実装済                | -                                                     |
| F-12     | constraints ✅ / basic ✅ / functional §13 ✅                                       | `src/core/i18n/` (19 locales)                                                                        | ✅ 実装済                | -                                                     |
| F-13     | constraints ✅ / basic ✅ / functional §14 ✅                                       | `src/features/purchase/` 等                                                                          | ✅ 実装済                | -                                                     |
| F-14     | constraints ✅ / basic ✅ / functional §15 ✅                                       | `src/features/ads/` 等                                                                               | ✅ 実装済                | -                                                     |
| F-15     | constraints ✅ / basic ✅ / functional §20 ✅ (Tamagui コード例残置)                | `src/core/theme/` (useColors + plain hex)                                                            | ✅ 実装済                | docs §20 を実装合致に書き換え要                       |
| F-16     | constraints ✅ / basic ✅ / functional §22 ✅                                       | `src/features/notification/` 等                                                                      | ✅ 実装済                | -                                                     |
| **F-17** | **constraints ❌ / basic ❌ / functional §23 ✅ + マップ L71 ✅**                   | **`app/(tabs)/plan/` + `src/features/calendar/` + `src/features/plan/` ディレクトリ + 多数ファイル** | ✅ **実装済**            | **constraints §8 / basic §1.4 への追記要 (D-01)**     |

### 10.2 依存ライブラリ別

| ライブラリ                   | package.json | 実装本体 (src/app) | コメント残存                   | docs 言及残存                                                                                     | 状態                         |
| ---------------------------- | ------------ | ------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------- | ---------------------------- |
| `tamagui` (全)               | ❌ 0         | ❌ 0               | ⚠ 1 件                         | ⚠ 7 ファイル (AGENTS / README / basic / functional / glossary / coding_rules / theme-token-check) | docs 修正要                  |
| `@tanstack/react-query`      | ❌ 0         | ❌ 0               | ❌ 0                           | ⚠ 2 ファイル (AGENTS / README)                                                                    | docs 修正要                  |
| `@gorhom/bottom-sheet`       | ❌ 0         | ❌ 0               | ⚠ 5 件                         | ⚠ 2 ファイル (basic / maestro-standard-pattern)                                                   | docs 修正 + コメント別 Issue |
| `@shopify/flash-list`        | ❌ 0         | ❌ 0               | ❌ 0                           | ⚠ 3 ファイル (basic / P-11 / P-12)                                                                | docs 修正要                  |
| `@shopify/react-native-skia` | ❌ 0         | ❌ 0               | ⚠ scripts に 1 ファイル (8 行) | ⚠ 4 ファイル (basic / functional / glossary / scripts)                                            | docs 修正 + scripts 別 Issue |
| `@expo/vector-icons`         | ❌ 0         | ❌ 0               | ❌ 0                           | -                                                                                                 | OK                           |
| `expo-store-review`          | ❌ 0         | ❌ 0               | ❌ 0                           | -                                                                                                 | OK                           |
| `expo-symbols`               | ❌ 0         | ❌ 0               | ❌ 0                           | -                                                                                                 | OK                           |

## 11. 修正対象 file 一覧 (本 PR スコープ)

### 11.1 トップレベル (2 ファイル)

- `AGENTS.md` (L75, L76, L130, L148)
- `README.md` (L19, L20)

### 11.2 docs/reference/ (4 ファイル)

- `docs/reference/basic_spec.md` (§1.4 + L196-235 + L544 + §6.1)
- `docs/reference/functional_spec.md` (L71 関連 + §9 L690-867 + §20 L2557-2703 + L2717)
- `docs/reference/glossary.md` (L349-367 + L583-595)
- `docs/reference/constraints.md` (§8 機能 ID 表に F-17 行追記)

### 11.3 docs/explanation/ (1 ファイル)

- `docs/explanation/product_strategy.md` (§3-1 + §6-1 + §7-3)

### 11.4 docs/how-to/ (4 ファイル)

- `docs/how-to/development/coding_rules.md` (§4.3)
- `docs/how-to/maestro-standard-pattern.md` (L196 注釈追加)
- `docs/how-to/workflow/prompts/P-11_implement-from-mockups.md` (L340)
- `docs/how-to/workflow/prompts/P-12_screen-implementation-cycle.md` (L172, L455)

### 11.5 docs/adr/ (2 ファイル)

- `docs/adr/ADR-0015-f15-theme-system.md` (冒頭 disclaimer 追加 — 案 B、 user 合意)
- `docs/adr/ADR-0040-form-screen-scroll-unification.md` (L3 表記ゆれ統一、 cosmetic)

### 11.6 .claude/ (3 ファイル)

- `.claude/CLAUDE.md` (L80)
- `.claude/recurrence-prevention.md` (L1, L93)
- `.claude/recurrence-prevention/specialized.md` (L1)

### 11.7 scripts/ コメント部 (1 ファイル)

- `scripts/theme-token-check.mjs` (L38 コメント更新)

**合計**: **17 ファイル**

### 11.8 本 PR スコープ外 (別 Issue 化候補)

- `app/onboarding/tut/[step].tsx:140` (Tamagui 死コメント) → 新規 Issue `chore(cleanup): tut step.tsx Tamagui 死コメント除去`
- `scripts/native-runtime-check.mjs` (Skia 検査ロジック削除) → 新規 Issue `chore(cleanup): native-runtime-check Skia 検査削除`
- `src/` 内 BottomSheet 由来コメント 5 件 → 新規 Issue `chore(cleanup): BottomSheet 由来コメント整理`

## 12. 修正方針 (テーマ別 SoT 化)

| テーマ                | 修正方針                                                                                                                                                               |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tamagui 撤去対応      | docs 言及全削除 + ADR-0015 に「実装は ADR-0042 / design_system.md §6 を参照」 disclaimer 追加。 タイトル変更しない (ADR 番号保持の精神)                                |
| React Query 撤去対応  | AGENTS / README の「Tech Stack」 表から削除のみ                                                                                                                        |
| F-04 ヒートマップ撤廃 | basic_spec §F-04 / functional_spec §9 本文を ADR-0039 リンク 3 行に短縮。 glossary 用語 1 行に短縮。 product_strategy §3-1 / §6-1 で「最後の水やりから N 日」 のみ残置 |
| FlashList 撤去対応    | 「FlashList 必須」 を「FlatList で十分 (knip Unused deps 0 維持)」 に書き換え                                                                                          |
| BottomSheet 全廃      | maestro-standard-pattern.md に注釈追加 (削除しない、 歴史記録として保持)                                                                                               |
| R-XX 番号範囲         | 全て「R-1〜R-57 (汎用 R-1〜R-12 + 専門 R-13〜R-57)」 に統一                                                                                                            |
| QR コード             | product_strategy から行削除のみ (user 指示「今後も対応しない」 → 非ゴール明示も不要)                                                                                   |
| F-17 機能 ID 定義     | constraints.md §8 + basic_spec §1.4 に追記                                                                                                                             |
| ADR-0040 表記ゆれ     | cosmetic 修正 (1 行)                                                                                                                                                   |

## 13. 検証コマンド計画 (修正後実行)

PR 起票前に以下を順次実行:

```sh
# 1. docs 整合性チェック
pnpm docs:lint
# → 期待: ❌ ERRORS なし (取り消し線 / R-22 / ADR 歯抜け warning は既知の 2 件 (0022/0023))

# 2. TypeScript 型チェック (docs 変更だが念のため)
pnpm type-check
# → 期待: 0 errors (docs しか触らないが、 import / コード参照に影響しない確認)

# 3. テスト (docs 変更だが念のため)
pnpm test -- --runInBand
# → 期待: 全 green (docs 変更で test 落ちないこと確認)

# 4. (オプション、 時間あれば) 完全検証
pnpm verify
# → 期待: 全 gate green (本 docs 修正で他チェックに影響なし確認)
```

## 14. 残リスク

| #   | リスク                                                                                           | 影響度 | 緩和策                                                                 |
| --- | ------------------------------------------------------------------------------------------------ | ------ | ---------------------------------------------------------------------- |
| R-1 | F-04 撤廃済本文を削除した後、 「過去仕様を参照したい」 ニーズが出る可能性                        | 低     | ADR-0039 と git 履歴に保存済。 仕様書からは clean に削除               |
| R-2 | F-17 を constraints / basic に追記すると、 既存 ADR / lessons の F-XX 連番に影響しない確認要     | 低     | 修正前に `grep -RIn 'F-17' docs/` で参照箇所確認、 必要なら同期        |
| R-3 | ADR-0015 disclaimer 追加で、 ADR 検索性 (「Tamagui で grep」 した時の hit) は維持される          | -      | (議論済) 案 B はあえて検索性維持                                       |
| R-4 | コード変更スコープ外 (F-01〜F-03) を「別 Issue 化」 と書いたが、 実際に Issue 起票されないと忘却 | 中     | 監査レポートの「次に人間が確認すべき点」 (§16) で明示                  |
| R-5 | product_strategy §3-1 マスター対応表の修正は v2.0 戦略書全体に影響する可能性                     | 中     | 修正は局所最小 (「グラフ」 削除のみ)。 戦略書改訂が必要なら別タスク    |
| R-6 | functional_spec §9 (F-04) と §20 (F-15) は巨大、 削除/書き換え時に隣接セクション崩壊リスク       | 中     | 修正前に各 file の Read + 行範囲明示 + git diff 確認 (R-1 / R-18 適用) |

## 15. 次に人間 (user) が確認すべき点

1. **本監査レポートの修正方針 (§6〜§12) が user 想定と一致しているか**
2. **§7.7 (Theme 3 F-04) basic_spec §1.4 v1 (MVP) リストから F-04 を削除する判断** (D 分類との関連)
3. **§11.8 (本 PR スコープ外、 別 Issue 化候補) の 3 件を別 Issue 化するか、 同じ PR に含めるか**
4. **§14 R-5 product_strategy §3-1 マスター対応表の改訂 (痛み 🩹2 → ヒートマップ表現削除)**
5. **修正 PR のタイトル案**: `docs: コード/docs 整合性監査 (Sess56) — Tamagui/React Query/F-04 撤廃済 docs 整合 + F-17 機能 ID 追記`

## 16. 議論記録 (Sess56 R2 / R3 合意事項)

| ラウンド | 議題                                     | user 合意                                                                   |
| -------- | ---------------------------------------- | --------------------------------------------------------------------------- |
| R2       | 監査スコープ                             | docs/ 配下 + .claude/ 配下 + scripts/ コメント部 全部 (徹底版)              |
| R2       | F-04 撤廃済本文 250 行残置の扱い         | 本文丸ごと削除、 ADR-0039 へのリンク 1 行だけ残す                           |
| R2       | コード根拠でない「将来予定」 機能の扱い  | 個別に user 判断 (機能ごとに毎回確認)                                       |
| R2       | 監査レポートの置き場所                   | `docs/audit/code-docs-consistency-audit.md` として新規作成                  |
| R3       | F-17 作業カレンダーの扱い                | コード grep で実装確認 → 実装済確定 → constraints §8 + basic §1.4 に追記    |
| R3       | QR コード機能                            | コード grep で未実装確認 → 「今後も対応しない」 → product_strategy から削除 |
| R3       | ADR-0015 Tamagui Amendment Status 不整合 | 案 B (Notes Amended に disclaimer 追加) 採用                                |
| R3       | 次工程                                   | docs/audit/ レポート作成 (修正は user 承認後に別ステップで実施)             |

## 17. 参考

- `docs/adr/ADR-0015-f15-theme-system.md` (Notes Amended 2026-05-30、 Tamagui 撤回)
- `docs/adr/ADR-0024-bottom-sheet-removal-and-native-presentation.md` (BottomSheet 全廃)
- `docs/adr/ADR-0039-watering-heatmap-removal.md` (F-04 撤廃)
- `docs/adr/ADR-0046-harness-inventory-and-retirement-policy.md` (廃止ポリシー)
- `docs/adr/ADR-0048-fsd-layer-definition.md` (FSD 層定義)
- `docs/refactor/master-plan.md` (Phase 3-7 完了バナー)
- `docs/refactor/phase-7-report.md` (Tamagui / react-query / 死コード一掃)
- `.claude/recurrence-prevention.md` (R-1〜R-12 本体 + R-13〜R-57 索引)
- `.claude/recurrence-prevention/specialized.md` (R-13〜R-57 本文)
- `MEMORY.md` (Auto memory、 Phase 3-7 反映済)
