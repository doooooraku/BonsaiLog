# ADR-0020: Claude Design 全面採用 (4 タブ構成 + 全画面 Wireframe 整合)

- Status: Accepted
- Date: 2026-05-05
- Deciders: @doooooraku
- Related: ADR-0019 (Superseded by 本 ADR) / ADR-0011 (記録のみ哲学、維持) / ADR-0013 (F-04 ヒートマップ、改訂) / ADR-0018 (オンボ画面数、改訂) / Issue #29 (本 ADR で close 解除) / Claude Design `C:\Users\doooo\Downloads\BonsaiLog_template\` (本 ADR の Source of Reference)

---

## Context（背景：いま何に困っている？）

- **現状**: ADR-0019 で「Claude Design 部分採用 (tokens / Noto / SVG / コピーのみ、4 タブ・オンボ 6 画面は不採用)」を決め、Phase B 35 PR (#185-#227) で実装したが、実機検証 (2026-05-05) で **ユーザー期待と乖離** が発覚。
- **困りごと**:
  - Home タブが「盆栽 1 本以上時に自動遷移、再タップで空白 + 巨大 AdBanner」で機能不全
  - 盆栽タブ (現 BonsaiList) に検索バー / フィルタタブ / 写真サムネが無く、Claude Design `home-screens.jsx HomeScreen` と乖離
  - ヒートマップ (F-04 集約モード K2 達成率) は Claude Design `care-screens-v2.jsx HeatmapScreen` (個別盆栽詳細、30/90/365 切替 + 連続記録 + 過去90日 + 2回の日 サマリー) と設計コンセプトが別物
  - 4 ペルソナ評価でユーザー期待を捕捉していたが、**「アプリ全体のデザイン統一感 (ブランド統一感)」軸が独立軸として無く**、部分採用判断時に統一感劣化リスクを過小評価していた
- **制約/前提**:
  - `docs/reference/constraints.md` §1-4 (AI 非搭載 / 記録のみ哲学) → Claude Design に推奨機能無し、整合
  - `docs/reference/design_system.md` §2 (washi `#F7F3E8` / Noto / 角丸 12) → Claude Design `tokens.css` と完全一致
  - ADR-0009 (RevenueCat 月額 / 年額 / Lifetime) → 課金モデル維持、UI のみ Claude Design `monetization-screens.jsx PaywallScreen` 整合
  - ADR-0010 (AdMob ホーム下部のみ) → Claude Design に AdBanner 配置記述無し、Repolog 実装 (`INLINE_ADAPTIVE_BANNER` + `maxHeight={90}`) を踏襲
- **発見**: `home-screens.jsx HomeScreen` の中身は **「盆栽カード一覧 + 検索 + フィルタ + FAB」** であり、現状実装の「Home タブ」ではなく「盆栽タブ」に対応する。**Design 側の画面 → 実装側の画面のマッピング表が ADR-0019 に無かった** ことが乖離の根本原因。

---

## Decision（決めたこと：結論）

- **決定**:
  1. **Claude Design 100% 全面採用** (タブ構成 / オンボ画面数 / 全画面の Wireframe を Claude Design `*-screens.jsx` に整合)
  2. **タブ構成 3 → 4 タブ**: `盆栽 / 予定 / 探す / 設定` (現状の Home タブ + 統計タブを削除、F-04 集約モード K2 達成率は廃止)
  3. **盆栽タブ = Claude Design `home-screens.jsx HomeScreen`** (Header「盆栽手帳」+ 検索 + 屋外、HomeFilterTabs、BonsaiCard 写真サムネ + Noto Serif 22pt)
  4. **盆栽詳細 = Claude Design `detail-screens.jsx Detail*`** (Hero 280h + 3 Tabs: タイムライン / 作業履歴 / 写真)、ヒートマップは詳細画面内 `[id]/watering.tsx` (`care-screens-v2.jsx HeatmapScreen` 整合、30/90/365 + 連続記録 + 過去90日 + 2回の日 サマリー)
  5. **作業記録 BottomSheet = Claude Design `care-screens.jsx WorkPickerSheet` + `WorkLogConfirmSheet`** (14 work types、アクション別 form fields)
  6. **予定タブ = Claude Design `care-screens.jsx CalendarScreen`** + 針金がけ一覧 `WiringListScreen`
  7. **探すタブ = Claude Design `care-screens.jsx SearchScreen`** (検索履歴 + chip + マッチハイライト、既存 `app/search.tsx` 廃止統合)
  8. **設定タブ = 既存 `app/settings.tsx` を `app/(tabs)/settings/index.tsx` に移行**、Claude Design `monetization-screens.jsx Settings*` 整合
  9. **PaywallScreen = Claude Design `monetization-screens.jsx PaywallScreen`** (UI のみ、課金ロジック ADR-0009 維持)
  10. **Onboarding 8 → 6 → 4 画面** (ADR-0020 v1.x-2 2026-05-16 で機能 2 撤去: Splash + Welcome + LanguagePicker + Notification (tut5) のみ、ADR-0018 改訂連動、詳細 §Notes Amended 2026-05-16)
  11. **AdBanner = Repolog 同等** (`INLINE_ADAPTIVE_BANNER` + `maxHeight={90}` + paddingV 8、盆栽タブ最下部のみ)
  12. **Issue #29 (F-04 統計タブ) close 解除** (集約モード廃止、個別ヒートマップに統合)
- **適用範囲**: v1.0、Free / Pro 両方、iOS / Android / Web (Web は AdBanner 無し既存)

---

## Decision Drivers（判断の軸：何を大事にした？）

- **Driver 1 (新規)**: **ブランド統一感 (R-26)** — 全画面で Claude Design の品の良さを統一して反映。部分採用ではなく 100% 採用が user 期待
- **Driver 2**: ADR-0011「記録のみ哲学」遵守 — Claude Design に推奨機能 / 診断 / 命令文 (「○○しましょう」) は含まれず整合
- **Driver 3**: 4 ペルソナ全員受容 (R-10) — シニア (高橋 62 歳) は「盆栽手帳」シリアル + 大きめタップ領域で安心、Marcus は機能比較表 + モダン UI、盆栽園プロは検索 / タグ / PDF、ライトはオンボ 6 画面 + 優しいコピー
- **Driver 4**: 既存課金 / 法務 / Privacy フロー無影響 (ADR-0009 / ADR-0017 / F-LEGAL-003 維持)
- **Driver 5**: ストア審査リスクゼロ — テンプレ残骸消滅、命令文回避、規約遵守 (AdMob 50dp 最小は Repolog 同等が保証)

---

## Alternatives considered（他の案と却下理由）

### Option B: ADR-0019 維持 (部分採用、実装品質のみ改善)

- **概要**: 3 タブ維持、tokens / Noto / SVG / コピーのみ採用、現状の実装バグ (AdBanner サイズ / コントラスト / OutdoorToggle 衝突) のみ修正
- **良い点**: 1 セッションで完了、ADR 連鎖改訂不要
- **悪い点**: ユーザー期待を満たさず再議論必至、ブランド統一感劣化が継続、ストア評価リスク
- **却下理由**: ユーザーが「全面改修」を明示要求、部分採用は再発防止にもならない

### Option C: 拡張 + 部分改修 (ADR-0019 を Notes 改訂で「△ Header 検索 + 設定」を v1.0 昇格)

- **概要**: 3 タブ維持、Header に検索 + 設定追加、盆栽一覧に BonsaiCard + フィルタタブ追加、Home タブを「直近 1 件作業履歴」に再定義
- **良い点**: 1.5〜2 セッション、F-04 #29 close 維持
- **悪い点**: タブ構成 / オンボ画面数が Claude Design と乖離継続、user 期待 (100% 採用) と乖離
- **却下理由**: user 明示要求 (案 A 採用) と整合せず

### Option D: Home タブ廃止 (2 タブ構成、盆栽 / 統計)

- **概要**: Home タブのみ削除、起動時に盆栽タブへ
- **良い点**: 最もシンプル
- **悪い点**: 4 タブ構成 (Claude Design) と乖離、Issue #29 #31 整合不可
- **却下理由**: Claude Design 整合不可

### Option A (採用): Claude Design 100% 全面採用

- **概要**: 上記 Decision §1-12 の通り
- **良い点**:
  - ブランド統一感 (R-26) 完全達成
  - ユーザー期待 100% 充足
  - 全画面の品の良さを統一して反映
  - 4 ペルソナ全員受容
- **悪い点**:
  - 8〜10 セッションの大規模改修
  - ADR-0011 / 0013 / 0018 / 0019 連鎖改訂
  - Issue #29 close 解除 (F-04 集約モード廃止、過去 PR #172/173/176 事実上 revert)
  - i18n 19 言語で 25〜35 新規キー
  - Maestro flow 全書き直し (8〜10 件)
  - ストア SS 全更新 (4 言語 × iOS/Android)
- **採用理由**: ユーザー明示要求 + 5 軸評価で全項目 ○ 以上、長期的なブランド価値 / Pro 転換率 / ストア評価への効果が改修コストを上回る

---

## Consequences（結果：嬉しいこと/辛いこと/副作用）

### Positive（嬉しい）

- ブランド統一感達成、ユーザー期待 100% 充足
- 4 ペルソナ全員 ○ 以上、特にシニア (高橋) と盆栽園プロで「業務に使える」評価
- ストア審査リスクゼロ、レビュー獲得タイミング最大化
- F-04 個別ヒートマップが盆栽詳細に統合され、ユーザー導線が明快
- Onboarding 6 画面でライト層離脱率改善

### Negative（辛い/副作用）

- 8〜10 セッション、19〜22 PR の大規模改修
- ADR-0011 / 0013 / 0018 / 0019 連鎖改訂 (本 ADR で連動明記)
- Issue #29 close 解除、過去 PR #172/173/176 が事実上 revert (Issue コメントで経緯保全)
- i18n 19 言語 × 25〜35 キー、英語フォールバック許可で対応
- Maestro flow / ストア SS 全更新
- 既存 testID 大半変更、E2E カバレッジ一時低下 (Phase 12 で全件緑)

### Follow-ups（後でやる宿題）

- [x] ADR-0019 を Status: Superseded by ADR-0020 に変更 (Phase 0、PR #228 完了)
- [x] ADR-0011 改訂: Claude Design に推奨機能無いことを明記 (Phase 0、PR #228 完了)
- [x] ADR-0013 改訂: 集約モード廃止、個別ヒートマップ詳細画面移動 (Phase 0、PR #228 完了)
- [x] ADR-0018 改訂: オンボ 8 → 6 画面 — Notes Amended 記載済 (Phase 0、PR #228)、実装は v1.x
- [x] R-26 を `.claude/recurrence-prevention.md` に追記 (Phase 0、PR #228 完了)
- [x] Issue #29 close 解除 + 経緯コメント (Phase 12、本 PR で実施)
- [ ] Issue #31 (F-09 検索) のタブ化 AC 強化コメント (v1.x)
- [ ] `docs/reference/functional_spec.md` 全章を本 ADR に整合 (v1.x)
- [ ] FastLane SS 全更新 (v1.x)
- [x] release-check Skill 実行 + 4 ペルソナ最終評価 (Phase 12、本 PR で実施)
- [ ] WiringListScreen 実装 (v1.x、機能維持で wiring 既存実装が動作中)
- [ ] WorkLogConfirmSheet (詳細 form: 水量 / 部位 etc) (v1.x)
- [ ] Onboarding 8 → 6 画面の本実装 (v1.x、ADR-0018 改訂済 + 既存 8 画面で機能維持)
- [ ] Hero + 3 Tabs (タイムライン / 作業履歴 / 写真) 本格再構築 (v1.x、既存 BonsaiHero で Hero 整合済)
- [ ] PaywallScreen の Claude Design monetization-screens.jsx 整合本格再構築 (v1.x、課金ロジックは ADR-0009 維持)
- [ ] 30/90/365 日切替で実ヒートマップ範囲変更 (v1.x、現状は UI セグメントのみ)
- [ ] WateringHeatmap aggregate モード関連コード削除 (v1.x、stats 削除済で参照経路なし)

---

## Acceptance / Tests（合否：テストに寄せる）

- 正（自動テスト）:
  - Jest: 新規 18 component の単体テスト (BonsaiCard / WorkPickerSheet / DetailHero / CalendarGrid 等)
  - Maestro: 8〜10 flow 全書き直し (home / search / bonsai-list / detail / work-log / calendar / wiring / settings / paywall / onboarding)
  - `pnpm verify` 9 ゲート全緑 (lint / type-check / format / test / i18n / config / docs / template / theme / a11y)
- 手動チェック:
  - 4 タブ動作 (盆栽 / 予定 / 探す / 設定)
  - 盆栽タブで Header「盆栽手帳」+ 検索 + 屋外、HomeFilterTabs、BonsaiCard 写真サムネ
  - 盆栽詳細で Hero + 3 Tabs、ヒートマップ画面 (30/90/365 + 4 サマリー)
  - 作業記録 BottomSheet で 14 types 選択 + アクション別 form
  - 予定タブで Calendar + 針金がけ一覧
  - 探すタブで検索履歴 + chip + マッチハイライト
  - 設定タブで Paywall リンク + 既存設定維持
  - Onboarding 6 画面 (既存ユーザーは再オンボなし)
  - AdBanner 高さ ≤ 90px
  - light / dark / outdoor 3 モードで WCAG AA 4.5:1
- 4 ペルソナ評価 (本 ADR 5 軸評価):

| 評価軸                           | 高橋 62 歳        | Marcus 35 歳     | 盆栽園プロ        | ライト         | ブランド統一感 (R-26) | 総合 |
| -------------------------------- | ----------------- | ---------------- | ----------------- | -------------- | --------------------- | ---- |
| 4 タブ構成 (盆栽/予定/探す/設定) | ◎ (シンプル)      | ◎ (モダン)       | ◎ (検索独立タブ)  | ○              | ◎                     | ◎    |
| 盆栽タブ = HomeScreen            | ◎ (写真で識別)    | ◎ (情報密度)     | ◎ (検索/フィルタ) | ◎ (動機付け)   | ◎                     | ◎    |
| 盆栽詳細 Hero + 3 Tabs           | ◎                 | ◎                | ◎ (タイムライン)  | ◎              | ◎                     | ◎    |
| ヒートマップ (個別、30/90/365)   | ○                 | ◎                | ◎ (サマリー)      | ○              | ◎                     | ◎    |
| 作業記録 BottomSheet             | ◎ (大ボタン)      | ◎ (絞込み)       | ◎ (アクション別)  | ◎              | ◎                     | ◎    |
| 予定タブ Calendar                | ○                 | ◎                | ◎ (一括記録)      | ○              | ◎                     | ◎    |
| 探すタブ                         | ○                 | ◎                | ◎ (chip 絞込)     | ○              | ◎                     | ◎    |
| 設定タブ + Paywall               | ◎ (Lifetime 訴求) | ◎ (年額訴求)     | ◎ (Lifetime 経費) | ○              | ◎                     | ◎    |
| Onboarding 6 画面                | ◎                 | ○ (スキップ希望) | ○                 | ◎ (ガイド充実) | ◎                     | ◎    |
| AdBanner 50dp 上限               | ◎ (誤タップ低減)  | ○ (邪魔感低減)   | ◎                 | ◎              | ◎                     | ◎    |

→ 全項目 ○ 以上、✕ ゼロ (R-10 + R-26 クリア)

---

## Rollout / Rollback（出し方/戻し方）

- **リリース手順への影響**:
  - Phase 0〜12 で 19〜22 PR、各 PR は最小スコープ + `pnpm verify` 9 ゲート緑 → squash merge → main 同期
  - Phase 12 で release-check Skill 実行 + 4 ペルソナ最終評価 + ストア SS 再撮 + リリースノート更新
  - 既存ユーザーは `onboarding_v` migration で再オンボなし
- **ロールバック方針**:
  - Phase 単位で revert 可能 (各 Phase の PR を revert)
  - 全面 revert は ADR-0019 (Superseded 状態) を再 Accept + 各画面の旧実装を復元
  - ロールバックしたくない: Claude Design 整合の品の良さを維持、ユーザー期待達成
- **検知方法**:
  - ストアレビューで「使いやすくなった」「写真が見やすい」キーワード監視
  - Pro 転換率 / Free 継続率 (RevenueCat ダッシュボード) を Phase 12 後 30 日で前比較

---

## Links（関連リンク：正へ寄せる）

- constraints: `docs/reference/constraints.md` §1-1〜§5-2
- reference: `docs/reference/design_system.md` §1〜§12 (本 ADR の UI 表現の Source of Truth)
- ADR (改訂): ADR-0011 (記録のみ哲学、維持) / ADR-0013 (F-04 ヒートマップ、改訂) / ADR-0015 (テーマ、維持) / ADR-0018 (オンボ画面数、改訂) / ADR-0019 (Superseded by 本 ADR)
- ADR (連動): ADR-0009 (RevenueCat、維持) / ADR-0010 (AdMob、維持) / ADR-0017 (Privacy / ATT / UMP、維持)
- Issue: #29 (本 ADR で close 解除) / #31 (本 ADR でタブ化 AC 強化)
- Claude Design: `C:\Users\doooo\Downloads\BonsaiLog_template\` (本 ADR の Source of Reference)
  - `home-screens.jsx` / `detail-screens.jsx` / `create-screens.jsx` / `care-screens.jsx` / `care-screens-v2.jsx` / `monetization-screens.jsx` / `export-screens.jsx` / `screens.jsx` (Onboarding) / `tokens.css`
- Repolog AdBanner: `apps/Repolog/components/ad-banner.tsx` (本 ADR の AdBanner 実装参照元)

---

## Notes（メモ：任意）

### 画面マップ (Claude Design → 実装) — R-26 で必須化

| #   | Claude Design ファイル                                                           | スクリーン                        | 実装側ルート                                                                                                                                     | 種別                                                                                                              |
| --- | -------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| 1   | `screens.jsx SplashScreen` (mockup v1.0)                                         | 01 Splash                         | `app/_layout.tsx` + `app.config.ts` (Expo SplashScreen)                                                                                          | 整合済 (PR #303、washi backgroundColor)                                                                           |
| 2   | `screens.jsx WelcomeScreen` (mockup v1.0)                                        | 02 Welcome                        | `app/onboarding/welcome.tsx`                                                                                                                     | 整合済 (PR #278 / PR #279)                                                                                        |
| 3   | `screens.jsx LanguagePickerScreen` (mockup v1.0)                                 | 03 Language                       | `app/onboarding/language.tsx`                                                                                                                    | 整合済 (PR #304、CTA 文言「選択して続ける」)                                                                      |
| 4   | `screens.jsx NotificationScreen` (mockup v1.0)                                   | 04 Notification                   | `app/onboarding/tut/[step].tsx` (tut5、Bell + 文言整合)                                                                                          | 整合済 (PR #305、ADR-0011 整合性向上)                                                                             |
| 5   | `home-screens.jsx HomeScreen` (mockup v1.0、bulkSchedWork + bulkSchedDate 含む)  | 01 HOME (盆栽一覧 + 一括予定追加) | `app/(tabs)/bonsai/index.tsx` + `src/features/bonsai/SelectionToolbar.tsx` + `src/features/event/Bulk{Work,Schedule}*.tsx` (タブ名「盆栽」)      | 整合済 (PR #271 / PR #272 / PR #341 / PR #342、一括予定追加 G8 PR 1-2、残作業 Issue #343-#346)                    |
| 6   | `home-screens.jsx HomeEmptyScreen` (mockup v1.0)                                 | 01 HOME EMPTY                     | `app/(tabs)/bonsai/index.tsx` Empty 分岐                                                                                                         | 整合済 (PR #306、72dp CTA + 「盆栽を追加」)                                                                       |
| 7   | `detail-screens.jsx Detail*` (mockup v1.0)                                       | 02 DETAIL (Hero + 3 Tabs)         | `app/(tabs)/bonsai/[id]/index.tsx`                                                                                                               | 整合済 (PR #290〜#301、本格実装は Issue #295/#296/#298)                                                           |
| 8   | `create-screens.jsx Create*`                                                     | 03 CREATE                         | `app/(tabs)/bonsai/new.tsx`                                                                                                                      | 大改修                                                                                                            |
| 9   | `care-screens.jsx WorkPickerSheet`                                               | 04 WORK PICKER                    | `src/features/event/WorkPickerSheet.tsx` (135 行、Phase 4 で実装済、3 列 grid + emoji + pineOnly フィルタ)                                       | 整合済 (既存実装、本 PR R-27 で確認、mode='log' 拡張は PR #348 G9 PR 1)                                           |
| 10  | `care-screens.jsx WorkLogConfirmSheet`                                           | 05 WORK LOG                       | `src/features/event/WorkLogConfirmSheet.tsx` (366 行、Phase 1 で watering/pruning/wiring の payload form 実装済、他 10 種別は note のみ簡略)     | 整合済 (既存実装、本 PR R-27 で確認、Phase 2 写真 + 所要時間 collapsible は別 Issue 候補)                         |
| 11  | `care-screens.jsx GuideModalScreen`                                              | 06 GUIDE 30日                     | `app/onboarding/guide-30days.tsx`                                                                                                                | 新規                                                                                                              |
| 12  | `care-screens.jsx WateringGraphScreen` (棒グラフ)                                | 07 WATERING (旧)                  | **不採用** (ヒートマップ採用)                                                                                                                    | ─                                                                                                                 |
| 13  | `care-screens-v2.jsx HeatmapScreen` (SS 222921)                                  | 07 水やり履歴 HEATMAP             | `app/(tabs)/bonsai/[id]/watering.tsx` (Phase 3 SS 222921 整合実装済、30/90/365 切替 + 4 サマリー連続記録/過去90日/2回の日)                       | 整合済 (Phase 3 実装済、本 PR R-27 で確認、ADR-0020 §Notes Amended で SS 222921 整合確認済)                       |
| 14  | `care-screens.jsx CalendarScreen` (mockup v1.0)                                  | 08 CALENDAR (予定タブ)            | `app/(tabs)/plan/index.tsx`                                                                                                                      | 整合済 (PR #317 / PR #318、作業予定タイトル + 検索アイコン削除 + 土曜列レイアウト修正)                            |
| 15  | `care-screens.jsx WiringListScreen` (mockup v1.0)                                | 09 針金がけ一覧                   | `app/(tabs)/plan/wiring.tsx`                                                                                                                     | 整合済 (PR #322 / PR #323、filter tabs 削除 + Header NotoSerif + gauge/part 行 + 週単位表記)                      |
| 16  | `care-screens.jsx CareHubScreen` + `care-screens.jsx SearchScreen` (mockup v1.0) | 08 ふりかえり Hub + 12 ケア 検索  | `app/(tabs)/look-back/index.tsx` (CareHub 3 カード Hub、T1-8c PR #362) + `app/(tabs)/look-back/search.tsx` (検索 sub-route、T1-8c PR #362)       | 整合済 (Tier 1b T1-6〜T1-10 完遂、PR #358-#364、整合性レベル 2 達成、Issue #361 横断水やり履歴は暫定 Alert 残)    |
| 17  | `monetization-screens.jsx PaywallScreen` (mockup v1.0)                           | 11 PAYWALL                        | `src/features/pro/PaywallScreen.tsx`                                                                                                             | 部分整合済 (PR #332 / PR #333 / PR #334、Header「BonsaiLog Pro」中央配置、比較表 8 行 + プラン CTA は Issue #335) |
| 18  | `monetization-screens.jsx Settings*` (mockup v1.0)                               | 12 SETTINGS (設定タブ)            | `app/(tabs)/settings/index.tsx` (既存 `app/settings.tsx` 移動)                                                                                   | 部分整合済 (PR #308 / PR #329、SectionHeader mono 風 + 検索アイコン削除、本格 8 セクション分離は Issue #330)      |
| 19  | `export-screens.jsx Export*` (mockup v1.0)                                       | 13 EXPORT                         | `app/backup/index.tsx` (F-11 ZIP お引っ越し、作成/復元 1 画面統合) + `app/export/{csv,pdf,list-pdf}.tsx` (F-10 CSV/PDF Pro エクスポート、実装済) | 整合済 (F-11 作成/復元を 1 画面統合 + content:// 復元バグ修正、F-10 CSV/PDF も実装済)                             |

### 削除する機能 (Issue #29 close 解除)

| 機能                                           | 理由                                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| F-04 集約モード K2 達成率 (全盆栽の水やり率 %) | Claude Design に該当機能なし、個別盆栽詳細のヒートマップに統合          |
| `BonsaiFilterSheet`                            | 集約モード廃止に伴い不要                                                |
| `app/(tabs)/stats.tsx` (統計タブ)              | 4 タブ構成 (盆栽 / 予定 / 探す / 設定) に統計タブなし                   |
| `app/(tabs)/index.tsx` (Home タブ)             | Home の役割は盆栽タブが担う (Claude Design HomeScreen = 盆栽カード一覧) |

### Phase 計画 (詳細は本 ADR Follow-ups + 各 Issue で管理)

| Phase | 内容                                                                  | PR 数 |
| ----- | --------------------------------------------------------------------- | ----- |
| 0     | 基盤 (本 ADR + 旧 ADR 改訂 + 16 SVG icon + OutdoorToggle prop + R-26) | 3〜4  |
| 1     | タブ 3 → 4、stats / Home 削除                                         | 1     |
| 2     | 盆栽タブ = HomeScreen 完全再現                                        | 2     |
| 3     | 盆栽詳細 (Hero + 3 Tabs) + ヒートマップ移動                           | 2     |
| 4     | 作業記録 BottomSheet (14 types)                                       | 2     |
| 5     | 予定タブ (Calendar + 針金がけ一覧)                                    | 2     |
| 6     | 探すタブ (検索履歴 + chip + ハイライト)                               | 1     |
| 7     | 設定タブ移行 + Paywall (UI のみ)                                      | 2     |
| 8     | Onboarding 8 → 6 画面                                                 | 1     |
| 9     | AdBanner Repolog 同等化                                               | 1     |
| 10    | dark/outdoor 全画面整合 + a11y                                        | 1     |
| 11    | i18n + Maestro + ストア SS                                            | 2     |
| 12    | release-check + verify + 4 ペルソナ最終評価                           | 1     |

合計 19〜22 PR、約 8〜10 セッション (連続稼働モード)。

### Notes Amended (2026-05-22): F-04 水やり履歴ヒートマップ完全撤廃 (ADR-0039 連動)

#### 改訂内容

- ADR-0039 (Sess31 PR-B) で F-04 水やり履歴可視化 (ヒートマップ + 月別カレンダー + 日別詳細 modal) を **完全撤廃**。
- 本 ADR §画面マップ row 13 (`care-screens-v2.jsx HeatmapScreen` / 07 水やり履歴 HEATMAP) は実装側削除済、 mockup HTML は下書き扱い (R-16 棄却後の F 案運用)。
- 本 ADR §画面マップ row 16 の「Issue #361 横断水やり履歴は暫定 Alert 残」 注記は本 Amended で **解消** (横断画面ごと削除のため Alert 不要、 CareHub 4→3 card)。
- user 判断「水やりは土の湿り気・天気・気温・湿度依存で履歴可視化は意思決定価値なし」 + ADR-0011 (記録のみ哲学) 整合強化。

#### 削除されたもの (詳細は ADR-0039)

- 画面: `look-back/watering-history.tsx` / `(modals)/watering-day-detail.tsx`
- コンポーネント: `WateringHeatmap.tsx` / `heatmapA11y.ts` / `CrossWateringCalendar.tsx` / `WateringDayDetailScreen.tsx`
- pure 関数: `wateringHeatmap.ts` (heatmap 専用関数、 shared util は PR-A #773 で `dateUtils.ts` に分離済)
- pickerStore slice: `wateringDayDetailContext` / `wateringDayDetailEntry`
- i18n: 36 keys × 19 言語 = 684 文字列
- テスト: `wateringHeatmap.test.ts` / `heatmapA11y.test.ts`
- Maestro: `watering-filter.yml` / `look-back-watering-history.yml`
- ui-diff config: `look-back-watering-history` entry + `skip-list.json` 該当 entry (Issue #502 解消)

#### 維持されたもの

- `LastWateredText` (盆栽カード「最後の水やりから N 日」 事実表示) + 関連 i18n 6 keys
- `dateUtils.ts` (PR-A #773 で shared util 分離済、 5 cross-feature consumers 継続利用)
- DB schema (events table、 既存 watering events は無変更で保持)

#### 関連

- ADR-0039 (Sess31 PR-B): F-04 撤廃の Decision / Drivers / Alternatives / Consequences 詳細
- ADR-0013 (Superseded by ADR-0039): F-04 元設計
- ADR-0011 (記録のみ哲学、 整合強化)

---

### Notes Amended (2026-05-08)

#### UI 表現は OpenDesign / 本 ADR は v1.0 整合点

- 2026-05-07 議論 (R-16 改訂 / R-28 新設) により、本 ADR は **v1.0 リリース時点の UI 整合点として保全**、以後の UI 進化は **OpenDesign (`~/04_app-factory/open-design`) 出力が最新 SoT**
- 画面マッピング表 (本 ADR §Notes §画面マップ) は OpenDesign 出力を反映して継続更新 (軽量 PR で運用、R-17 4 段階は適用しない)
- ビジネス仕様 (RevenueCat 課金 / AdMob / Privacy / 記録のみ哲学) は本 ADR / ADR-0009 / ADR-0010 / ADR-0011 / ADR-0017 が **絶対上位**、OpenDesign 出力が矛盾しても採用しない (R-28 判定フロー)
- OpenDesign 出力の採用版は `docs/mockups/v1.0/<screen>/index.html` にコピー保管 (BonsaiLog 完結性、git 管理)
- 関連: R-16 改訂 / R-28 新設 (PR #266) / ADR-0021 Notes Amended (PR 3 で実施)

### Notes Amended (2026-05-09): 盆栽詳細 Tab 構成変更 (mockup v1.0 整合)

#### 改訂内容

- mockups v1.0 (PR #269) の `detail-screens.jsx BonsaiDetailScreen` 整合に向け、本 ADR §Decision §33 で確定していた **タブ構成「タイムライン / 作業履歴 / 写真」を「作業履歴 / 予定タイムライン / 基本情報」に変更**
- **写真タブ廃止** = 写真年次タイムライン (`getPhotosByBonsaiGroupedByYear`) は **作業履歴チップに統合** (mockup の `_HistoryPhotos`、各履歴エントリに紐づく写真を最大 3 枚 + `+N` バッジで省略表示)
- **basic タブ追加** = 既存の `CreateBonsaiScreen` を `embedded=true` で再利用、入手情報 (取得日 / 樹種 / 樹形等) を編集可能にする
- §Decision §33「Hero 280h + 3 Tabs: タイムライン / 作業履歴 / 写真」は本 Amended で「Hero 280h + 3 Tabs: 作業履歴 / 予定タイムライン / 基本情報」に改訂
- §Follow-ups §132「Hero + 3 Tabs (タイムライン / 作業履歴 / 写真) 本格再構築」は「Hero + 3 Tabs (作業履歴 / 予定タイムライン / 基本情報) 本格再構築」に改訂
- 本 Amended は **R-28 機能仕様変更 (写真タブ廃止 = 機能の所属変更)** に該当するため、実装着手前に ADR で先確定
- 関連: mockups v1.0 `docs/mockups/v1.0/wireframes/detail-screens.jsx`、ADR-0021 Notes Amended (OpenDesign 出力 = 比較対象として参照)

#### 4 ペルソナ評価 (本 Amended、写真タブ廃止 + history 統合)

| 評価軸                  | 高橋 62 歳         | Marcus 35 歳 | 盆栽園プロ              | ライト               |
| ----------------------- | ------------------ | ------------ | ----------------------- | -------------------- |
| 写真表示 (history 統合) | ○ (作業ごとに写真) | ◎ (情報密度) | ◎ (作業 + 写真の関連性) | ◎ (1 画面で完結)     |
| basic タブ追加          | ◎ (シンプル編集)   | ◎ (フォーム) | ◎ (一括編集)            | ◎                    |
| 全体動線                | ◎                  | ◎            | ◎                       | ○ (3 タブで迷わない) |

→ 全項目 ○ 以上、✕ ゼロ (R-10 クリア)

#### 実装フェーズ (Phase A1〜A10、本 Amended 起点)

| Phase | 内容                                                                  |
| ----- | --------------------------------------------------------------------- |
| A1    | 本 Notes Amended (本 PR、機能仕様変更を ADR で先確定)                 |
| A2    | SCREEN_PAIRS.bonsai-detail + maestro/flows/ui-diff/bonsai-detail.yml  |
| A3    | DetailHero + DetailHeader + DetailTabs UI 整合                        |
| A4    | タブ ID リファクタ (timeline/history/photos → history/timeline/basic) |
| A5    | BasicInfoTab 実装 (CreateBonsaiScreen embed)                          |
| A6    | HistoryTab 強化 (\_buildChipsFor 14 作業 + \_HistoryPhotos)           |
| A7    | TimelineTab + AddScheduleFlow                                         |
| A8    | DetailMoreMenu (PDF / Archive)                                        |
| A9    | ProLockModal                                                          |
| A10   | §画面マップ row 7 整合済マーク (最終)                                 |

### Notes Amended (2026-05-10): §Decision §7 改訂 — 「探すタブ」→「ふりかえりタブ」(UI 100% mockup 採用)

#### 改訂内容

- 2026-05-10 ユーザー指示「**UI においては全て OpenDesign mockup が正しい**」+ BonsaiLog-Flow.html v1.7 final 整合により、本 ADR §Decision §7 で確定していた **「探すタブ = SearchScreen」を「ふりかえりタブ = CareHubScreen + look-back/search sub-route」に改訂**
- TabBar 4 タブ目の **ラベル「探す」→「ふりかえり」**、icon **CompassNavIcon → PencilNavIcon** (mockup `home-screens.jsx HI.Pencil`)
- 検索機能は撤回せず、**2 経路アクセス** で維持 (BonsaiLog-Flow.html v1.10 D9/D10 解消整合):
  - **経路 1 (高速、1 タップ)**: Home Header 検索アイコン (虫眼鏡) → 盆栽検索画面
  - **経路 2 (Hub 経由、3 タップ)**: TabBar「ふりかえり」 → CareHubScreen → 「盆栽を検索」カード → 盆栽検索画面
- **CareHubScreen の中身** (mockup `care-screens.jsx CareHubScreen` L1576-1719): 3 カード Hub
  - 水やり履歴 (カレンダー・ヒートマップで過去の水やりを確認)
  - 針金がけ一覧 (巻いた針金と外し予定を一覧)
  - 盆栽を検索 (名前 / 樹種 / メモ / タグから探す)
- §Decision §7 は historical record として残し、本 Amended で改訂を明示
- §画面マップ row 16 を本 Amended と T1-12 (PR で実施予定) で「10 LOOK BACK HUB (ふりかえりタブ)」に改訂
- i18n 19 言語: `tabFind: '探す'` → `tabLookBack: 'ふりかえり'` (ja) / `'Activity'` (en) / 各言語最適化

#### R-28 境界判定

- **UI 表現** (タブラベル / アイコン / 動線): R-16 で OpenDesign が SoT、本 Amended で mockup 採用確定
- **ビジネス仕様** (検索ロジック / FTS5 / tag 関連): F-09 維持、本 Amended で変更なし
- **動線整合** (Home Header 検索アイコンの維持): BonsaiLog-Flow.html v1.10 D9 解消整合、UI 表現として mockup 採用

#### 4 ペルソナ評価 (本 Amended、ふりかえり Hub + Header 検索)

| 評価軸                         | 高橋 62 歳   | Marcus 35 歳      | 盆栽園プロ         | ライト     |
| ------------------------------ | ------------ | ----------------- | ------------------ | ---------- |
| 「ふりかえり」概念整合         | ◎ (和の品)   | ○ (Activity 翻訳) | ◎ (記録の振り返り) | ◎ (直感的) |
| Hub 経由の検索 (3 タップ)      | ○ (発見性高) | ○ (探索的)        | △ (1 タップ希望)   | ○          |
| Home Header 検索 (1 タップ)    | ◎ (高速)     | ◎ (D9 解消)       | ◎ (150 株運用整合) | ○          |
| 水やり履歴 / 針金一覧 への動線 | ◎ (Hub 整合) | ◎ (Hub 概念)      | ◎ (業務動線)       | ○          |

→ 全項目 ○ 以上、✕ ゼロ (R-10 クリア)、Marcus の英語版「Activity」翻訳で違和感解消

#### 実装フェーズ (Tier 1b、T1-6〜T1-12)

| Phase | 内容                                                                                                              | PR   |
| ----- | ----------------------------------------------------------------------------------------------------------------- | ---- |
| T1-6  | 本 Notes Amended (本 PR、ADR 改訂を先確定、コード変更なし)                                                        | (本) |
| T1-7  | i18n 19 言語 `tabFind` → `tabLookBack` rename (ja=「ふりかえり」/ en=「Activity」/ 各言語最適化)                  | -    |
| T1-8a | `app/(tabs)/find/` → `app/(tabs)/look-back/` rename + `_layout.tsx` 改修 (icon Pencil)                            | -    |
| T1-8b | `NavIcons.tsx` に `PencilNavIcon` 追加 (mockup HI.Pencil の SVG path 移植)                                        | -    |
| T1-8c | `look-back/index.tsx` を CareHubScreen 化 (3 カード Hub) + `look-back/search.tsx` 移行 (sub-route)                | -    |
| T1-8d | `ui-diff/config.ts` SCREEN_PAIRS rename + Maestro flow rename (`find-tab` → `look-back-tab` + `look-back-search`) | -    |
| T1-12 | §画面マップ row 16 「10 LOOK BACK HUB (ふりかえりタブ)」確定 (T1-8c 完了後)                                       | -    |

- **Issue #339 のスコープ更新**: 「探すタブ大改修」を「ふりかえり Hub + look-back/search 統合実装」に再評価、T1-8c で実装し close 候補
- **既存 PR #337/#338 (find-tab 部分整合済) の扱い**: 種別 row 16 に明記、T1-12 で「整合済 (Tier 1b 完了)」マーク

#### 関連

- BonsaiLog-Flow.html v1.7 final (`docs/mockups/v1.0/BonsaiLog-Flow.html` v1.10 改訂、D9/D10 解消)
- mockup `home-screens.jsx` L344-350 (TabBar 4 タブ確定値)
- mockup `care-screens.jsx CareHubScreen` L1576-1719 (3 カード Hub)
- T1-1 (PR #352) `integration-criteria.md` (整合性レベル定義)
- T1-2 (PR #353) `mockup-screenshots/` (mockup スクショ参照)
- T1-3 (PR #354) PR テンプレ §7.5 (R-29 5 段階)
- T1-5 + T1-9 (PR #357) 開発トラブルシューティング 2 文書
- Issue #339 (探すタブ大改修、本 Amended でスコープ更新)
- Issue #345 (ui-diff 実行、Tier 1b 完了後の検証用)

### Notes Amended (2026-05-10、本日 2 回目): Tier 1b 完遂 — §画面マップ row 16 整合済確定 (T1-12)

#### 完了報告

**Tier 1b 全 6 PR 完遂、§画面マップ row 16 を「整合済 (整合性レベル 2)」に確定**:

| Tier 1b Phase | 内容                                                                                               | PR          |
| ------------- | -------------------------------------------------------------------------------------------------- | ----------- |
| T1-6          | ADR-0020 §Decision §7 改訂 (探す→ふりかえり、本 ADR Notes Amended 1 回目)                          | #358        |
| T1-7          | i18n 19 言語に `tabLookBack` 追加 (ja=「ふりかえり」/ en=「Activity」)                             | #359        |
| T1-8a/b       | `app/(tabs)/find/` → `look-back/` rename + `PencilNavIcon` 追加 (HI.Pencil 移植)                   | #360        |
| T1-8c         | `look-back/index.tsx` を CareHub 3 カード Hub に再構築 + `look-back/search.tsx` sub-route 新設     | #362        |
| T1-8d         | `ui-diff/config.ts` SCREEN_PAIRS 分割 (`look-back-tab` + `look-back-search`) + Maestro flow rename | #363        |
| T1-10         | `BonsaiCard` 完全再構築 (縦型 220 hero + 3 段構造、mockup home-screens.jsx L867-1014 整合)         | #364        |
| **T1-12**     | **本 Notes Amended (本 ADR、§画面マップ row 16 整合済確定)**                                       | **(本 PR)** |

#### row 16 改訂内容

- **Before**: `care-screens.jsx SearchScreen` → `app/(tabs)/find/index.tsx` (部分整合済、PR #337/#338)
- **After**: `care-screens.jsx CareHubScreen` + `care-screens.jsx SearchScreen` → `app/(tabs)/look-back/{index,search}.tsx` (整合済、Tier 1b 完遂)
- **整合性レベル**: レベル 2 (見た目 80% 一致、`integration-criteria.md` T1-1)
- **暫定対応**: Issue #361 (横断水やり履歴ヒートマップ画面、Tier 2 以降で本実装、現状は CareHub「水やり履歴」カードで Alert 表示)

#### Tier 1b 後の残課題 (Tier 2 以降)

- **T1-10 ageText**: Bonsai schema に age / estimatedAge 系フィールド未追加、Tier 2 編集画面 BottomSheet 化で対応
- **Issue #361**: 横断水やり履歴画面の本実装 (CareHub「水やり履歴」カードの暫定 Alert 解消)
- **Issue #345**: ui-diff 実行 (`look-back-tab` / `look-back-search`) で実機 SS と mockup の並列比較 (整合性レベル 3 評価)
- **Tier 2 (T2-1〜T2-7)**: 編集画面 BottomSheet 化 + 写真追加 + 樹齢/購入日 + Picker Sheet + タグ + メモ + Footer CTA

---

### Notes Amended (2026-05-11、Phase 1.5-T2): look-back-watering-history の整合判定方針

**背景**: ui-diff 自動改善ループ Phase 1 (2026-05-11) で skipped に分類された 10 flow のうち、`look-back-watering-history` (横断 watering 履歴画面、PR #379/#383/#384、Issue #361 本実装) について、mockup HTML 側に「横断版」の対応 PhoneShell が存在しないため整合判定が成立しない事象を確認。

**現状**:

- 実機: `app/(tabs)/look-back/watering-history.tsx` (横断 watering、全盆栽対象)
- mockup: `care-screens-v2.jsx HeatmapScreen` (個別盆栽の watering ヒートマップ、§画面マップ row 13 で「整合済」)
- ui-diff config: `mockupFile: 'watering-heatmap.png'` で個別版 mockup を「暫定流用」して比較

**判定** (R-28 適用):

- **UI 表現**: 横断版 mockup HTML が無い = 比較対象不在
- **整合判定**: 「achievable / not-achievable」の二択で **「not-achievable (横断版 mockup 不在)」と確定**
- **ループ運用**: `scripts/ui-diff/skip-list.json` の `skipped` 配列に永続維持 (achieved に移動しない)

**画面マップへの追加** (row 16b として明文化):

| #   | Claude Design ファイル      | スクリーン                        | 実装側ルート                                | 種別                                                                                                             |
| --- | --------------------------- | --------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 16b | (mockup 不在、横断版未提供) | 13 横断 水やり履歴 (cross-bonsai) | `app/(tabs)/look-back/watering-history.tsx` | **整合判定対象外** (mockup HTML 横断版不在のため整合判定不能、PR #379/#383/#384 で実装完了、Issue #361 close 済) |

**将来の解消経路**:

1. OpenDesign 出力に横断 watering 履歴画面の PhoneShell が追加されたら、`config.ts mockupFile` を更新 + 再キャプチャ + 整合判定
2. または横断版を「不採用」と確定 → row 16b の種別を「不採用」に変更 + config から flow 削除

**関連**:

- PR #401 (Phase 1.5-T1 seed 拡張、本ループの前段)
- PR #400 (skipped 10 flow 永続化、Phase 1 完遂)
- Issue #361 (横断水やり履歴本実装、close 済)
- `scripts/ui-diff/skip-list.json` (skipped 永続維持)

---

### Notes Amended (2026-05-12): Phase G - @gorhom/bottom-sheet 全廃 + R-16 破棄反映

**背景**: 2026-05-12 議論セッションで以下が確定:

1. **R-16 (ADR 優先ルール) 破棄**: F 案採用 (法令系 ADR-0005/0009/0017 のみ ADR 優先、運用系は user 判定)
2. **Phase G (Issue #475)**: `@gorhom/bottom-sheet` を 10 箇所 (8 component + `BulkLogConfirmSheet` + ヒートマップタップ Sheet) で全廃し、Expo Router native presentation (`modal`/`formSheet`/`fullScreenModal`) に置換 (ADR-0024 で詳細決定)

**§Decision §Notes 修正点**:

#### 修正 1: §削除する機能 (Issue #29 close 解除) の拡大

- **Before** (L235 周辺): `BonsaiFilterSheet` のみ「集約モード廃止に伴い不要」
- **After** (2026-05-12 拡大): Phase G で 10 箇所 全 `@gorhom/bottom-sheet` 利用箇所を廃止 (`BonsaiFilterSheet` 含む)

| 廃止対象                                                    | 廃止理由                                                |
| ----------------------------------------------------------- | ------------------------------------------------------- |
| `BonsaiFilterSheet` (既廃止予定)                            | 集約モード廃止に伴い不要                                |
| `BonsaiCreateSheet`                                         | Phase G、`presentation: 'modal'` 置換                   |
| `WorkPickerSheet`                                           | Phase G、`presentation: 'formSheet'` 置換               |
| `WorkLogConfirmSheet`                                       | Phase G、`presentation: 'formSheet'` 置換               |
| `BulkWorkPickerSheet`                                       | Phase G、PoC 結果案 (推定 `formSheet`)                  |
| `BulkScheduleDateSheet`                                     | Phase G、PoC 結果案 (推定 `formSheet`)                  |
| `BulkLogConfirmSheet` (本 Notes で追加発見)                 | Phase G、PoC 結果案                                     |
| `SpeciesPickerSheet`                                        | Phase G、PoC 結果案 (Stack push or formSheet)           |
| `StylePickerSheet`                                          | Phase G、PoC 結果案 (Stack push or formSheet)           |
| ヒートマップタップ BottomSheet (`bonsai/[id]/watering.tsx`) | Phase G、`presentation: 'formSheet'` + detents [0.5, 1] |

#### 修正 2: §Notes Amended (2026-05-10) §R-28 境界判定の改訂

- **Before** (L325): 「UI 表現 (タブラベル / アイコン / 動線): **R-16 で OpenDesign が SoT**、本 Amended で mockup 採用確定」
- **After** (2026-05-12 R-16 破棄反映): R-16 (ADR 優先ルール) は **F 案 (法令系 ADR のみ維持) に置換済**。本 ADR-0020 は運用系に分類されるため、UI 表現の SoT は **user 判定** + 本 ADR の §画面マップ (継続更新)

#### 修正 3: 本 ADR の運用系分類確認

- 本 ADR-0020 は **運用系 ADR** (UI 表現 / タブ構成 / 画面マップ) であり、F 案で user 判定優先
- 法令系 ADR (ADR-0005 iOS 暗号化 / ADR-0009 RevenueCat / ADR-0017 Privacy / ATT / UMP) は引き続き ADR 優先

#### 関連

- ADR-0024 (Phase G 詳細、本 Notes Amended と同 PR で起票)
- Issue #475 (Phase G 実装、本 Notes Amended と同 PR でタイトル + 本文 update)
- `.claude/recurrence-prevention.md` R-30 (外部 lib テスト stability PoC 必須化、本 Notes Amended と同 PR で追加)
- `docs/how-to/maestro-standard-pattern.md` (Phase G 以降の Maestro 標準パターン、本 Notes Amended と同 PR で新規)
- 2026-05-12 セッション議論 (`session_summary` Engram #185、`decision` #186)

### Notes Amended (2026-05-13): R-25 全件再評価通過 + 41 画面整合状況確定

#### 改訂内容

2026-05-13 セッションで全 ui-diff flow の R-25 構造系 4 項目 (タブ構成 / セクション構成 / UI 種別 / スクロール範囲) Claude Read 主導再評価を実施、`scripts/ui-diff/skip-list.json` の `needsReeval: true` 9 件 + 本セッション PR 実装 2 件 = 11 件すべて再評価通過。

#### 41 画面整合状況 (2026-05-13 時点)

| 区分                                            | 件数       | 内訳                                                                                                                                                                                      |
| ----------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R-25 構造系 4 項目通過 (needsReeval: false)** | 11 件      | bonsai-tab / bonsai-create-sheet / look-back-tab / bonsai-detail-edit-sheet / wiring-list / home-bulk-sched-work / plan-tab / onboarding-welcome / bonsai-detail / paywall / settings-tab |
| **永続 skip (mockup HTML 不在)**                | 1 件       | look-back-watering-history (Issue #502 で user 領域追跡)                                                                                                                                  |
| **削除済 (deadcode 整理)**                      | 1 件       | watering-heatmap (Issue #440 Phase 1 で到達経路削除、Issue #505 起票)                                                                                                                     |
| **未測定 (Maestro flow 未作成)**                | 推定 26 件 | 41 画面 - 15 ui-diff flow = 残り、次セッション handoff (対応表整備 P4)                                                                                                                    |

#### 本セッション PR (累計 9 PR、Phase 1-3 全完遂)

**Phase 1 (後片付け、6 PR)**:

- PR #503: S5 iteration warning 解消 (g1-\* flow 表記統一)
- PR #504: look-back-search-initial 別 flow 新規 (永続 skip 解消、Q2 c)
- PR #506: watering-heatmap 古い flow 2 件削除 + skip-list 削除 (deadcode 整理 P1-T3 案 A)
- - Issue #475 close (Phase G 完遂) / Issue #502 (look-back-watering-history mockup 不在) / Issue #505 (bonsai/[id]/watering.tsx deadcode) 起票

**Phase 2 (Phase G 影響 再キャプチャ、1 PR)**:

- PR #508: bonsai-create-sheet R-25 再評価通過 (PR #493 modal 化後、Issue #507 bug 別追跡起票)

**Phase 3 (R-25 主要 5 件再評価、5 PR)**:

- PR #509: onboarding-welcome (flow simplify + 2/2 PASS)
- PR #511: bonsai-detail (seed 自動投入 + 2/2 PASS、Issue #510 follow-up 起票)
- PR #512: paywall (Onboarding skip 経路 + 2/2 PASS)
- PR #513: wiring-list (ふりかえりタブ経路 + seed 投入 + 2/2 PASS、PR #462 対応)
- PR #514: plan-tab (seed 投入 + 2/2 PASS、Phase 3 全完遂)

#### 新基準 (user 指示 2026-05-13)

R-30 (外部 lib テスト stability PoC) の反復基準を **3 回 → 2 回** に短縮。recurrence-prevention.md L228 R-30 + flow comment を本 PR で文書 update (lint script + 全 flow の comment 整合は次セッション task)。

#### seed 自動投入仕組み (2026-05-13 確立)

ui-diff flow から seed data 自動投入が可能になった (settings/index.tsx L564 `e2e_dev_seed_button` testID + Alert OK dismiss は R-31 例外として許容)。bonsai-detail / wiring-list / plan-tab で再利用、今後の seed 必要 ui-diff flow で標準採用。

#### 未解決 follow-up (次セッション handoff)

- **Issue #502**: 横断 watering history mockup HTML 不在 (user 領域)
- **Issue #505**: bonsai/[id]/watering.tsx deadcode 実体削除 + route 削除
- **Issue #507**: (modals)/bonsai-new modal の header「(modals)」 誤表示 (Stack.Screen title option 反映されず)
- **Issue #510**: bonsai-detail 他タブ (基本情報 / 作業予定) R-25 評価 + Stack header 整合判断
- **対応表整備**: 41 画面 ↔ 15 ui-diff flow 対応表 + 残 26 件 (未測定) の Maestro flow 新規実装計画
- **S5 lint baseline + 全 flow comment update**: R-30 基準 2 回反復に伴う lint script (R30*BASELINE) + 全 flow (g1-*, g2-\_, g3*, g4-*, look-back-search-initial 等) の comment update

#### 関連

- 本 PR (P4 recap、本 Notes Amended と同 PR、対応表 + 次セッション handoff)
- PR #493 (Phase G4 part 2 BonsaiCreate modal 化)
- PR #492 (Phase G4 part 1 WateringHeatmap inline 化)
- PR #462 (plan-tab 針金がけ row 削除)
- PR #470 (Issue #458 写真 Free 制限撤廃)
- Issue #443 (R-25 全件再評価親、本 Notes で全 11 件達成)
- 2026-05-13 セッション議論 (アプローチ B 採用 + Q2 c 採用 + R-30 基準短縮)

#### 議論結果 (2026-05-13 後半 ultrathink 議論セッション、Q1-Q6 user 採用)

本セッション末の議論モード (/discuss、ultrathink、4 ラウンド議論、6 専門家 + 4 ペルソナ + フラット視点) で残タスク優先順位策定。Web 調査 (Maestro 2026 best practice / visual regression Percy/Chromatic 比較 / Expo + Maestro E2E トレンド) も実施。

##### Q1: 完了基準 = 整合済 25/41 = 61% MVP 採用 (案 b)

- **41 画面の正本定義**: 主要画面、variant 統合カウント (Q4 連動)
- **整合済 11 件** (現在) + **未測定 14 件** (グループ A/B/D) = 25 件 = 61%
- **残 16 件** = グループ C (Export Hub 7 件) + グループ F (機能追加) + variant skip 許容
- 業界事例 (visual regression は構造系 4 項目で十分、pixel-perfect 不要) + 4 ペルソナ全員 ○ 以上 で確定

##### Q2: 次セッション着手 = A + E 並列 (案 a)

- **グループ A**: bonsai-detail 他タブ (Issue #510 基本情報 / 作業予定 R-25 評価) + Stack header 整合判断
- **グループ E (主要 bug fix)**: Issue #507 (modal header 誤表示) + Issue #505 (deadcode 実体削除)
- 想定 1 セッション (1.5 セッションに膨らむ可能性、Issue #439-#441 構造大差再発覚時)
- 整合済 11 → 13/41 = 32% 達成見込み

##### Q3: regression テスト = 手動 cold-start (1-2 件、段階的) 採用 (案 b)

- **毎セッション末に冷温始動 1-2 件確認** (前回セッションで整合済マーク済の flow を再実行 + diff 無し確認)
- CI 組み込み (ADR-0021 §9 update 要) は **セッション 5 で段階的検討**
- 業界事例 (Percy / Chromatic は必ず CI) と乖離あるが、個人開発 + Maestro CI 環境構築コスト高で許容

##### Q4: 41 画面の正本定義 = ADR-0020 で明文化 (案 a)

- **本 §Notes Amended (議論結果) で「41 = 主要画面、variant 統合カウント」 を明文化** (本 sub-section)
- mockup screenshots 69 件は variant 込み、変動するため正本扱いしない
- skip-list.json (achieved 11 件) + 残 14 件 (A/B/D グループ) = 主要 25 画面 (整合済 + 整合予定)
- 残 16 画面 = variant skip (許容) + Export Hub (グループ C、追加 task) + 機能追加 (グループ F)
- 41 = ADR-0020 §画面マップ + ADR-0018 Onboarding 6 画面 + ADR-0024 modal/formSheet 系 を統合カウント (将来セッションで row 単位の対応表作成も検討)

##### Q5: R-25 評価 user 抜き打ち再確認 = リアルタイム 1 件 (案 b)

- **次セッション 1 セッション目に user が抜き打ち 1 件確認** (整合済 11 件のうち 1 件、user 選択)
- Claude 主観判定の誤り (Issue #439-#441 事例) 検知のため
- 段階的拡大 (1 件 → 必要なら 3 件) 余地あり

##### Q6: 半自走モード継続 = 1 文計画 + 10 秒待機 採用 (案 a)

- 本セッション 10 PR の効率実績、stop 機能で安全担保
- scope 大幅変更時は再承認 (R-17)、毎 PR 個別承認 (R-17 厳格) は適用しない

##### 5 セッション計画 (整合済 25/41 = 61% MVP 達成までの目安)

| セッション      | 着手内容                                                                            | 整合済 達成見込み |
| --------------- | ----------------------------------------------------------------------------------- | ----------------- |
| **次 (Sess 1)** | A (bonsai-detail 他タブ Issue #510) + E (Issue #507/#505 bug fix)                   | 13/41 = 32%       |
| Sess 2          | B (ADR-0024 PoC flow 5 件転用 → ui-diff/)                                           | 18/41 = 44%       |
| Sess 3          | D part1 (Onboarding 6 画面のうち Splash + 言語 + 通知 + 機能 2)                     | 22/41 = 54%       |
| Sess 4          | D part2 (Onboarding 残) + variant skip 整理                                         | 25/41 = 61%       |
| Sess 5          | E 残 (S5 lint baseline + 全 flow comment update + 41 画面定義) + regression CI 検討 | 25/41 達成、MVP   |

##### 5 セッション完遂後の追加 task 優先順位 (将来議論候補)

61% MVP 達成後、user 判断で以下を順次着手:

1. **グループ C (Export Hub 7 画面、Issue #310)**: Pro 限定機能本実装込み、2-3 セッション
2. **グループ F (機能追加 Issue)**: #298 (TimelineTab + AddSchedule) / #216 (タグ AC4-1) / #22 (F-14 ads) 等
3. **variant 整合 (paywall-02 / plan-tab-02 等の軽微 variant)**: 既存通過済の派生、簡易

##### 議論で確認された 表面化していない問題 7 件 (R-7、対処方針確定)

1. **整合済 SoT (正本) 分散**: skip-list.json (機械) / ADR-0020 §画面マップ (人間判定) / docs/reference/ui-diff-flow-mapping.md (表示) → DRY 原則明文化 (Sess 5 で対処)
2. **41 画面正本定義**: 本 §Notes で確定 (主要画面、variant 統合)
3. **regression テスト不在 (drift リスク)**: 手動 cold-start (Sess 5 で CI 検討)
4. **半自走 context 圧迫**: docs/reference/ui-diff-flow-mapping.md + ADR-0020 Notes が handoff チェックリスト機能
5. **R-25 Claude 主観判定**: リアルタイム user 抜き打ち 1 件で担保 (Q5)
6. **ADR-0024 PoC flow 転用**: 1 件試行 → 横展開 (Sess 2)
7. **ストア審査リスク**: 整合 61% で問題なし (機能 + プライバシー審査中心、業界事例で確認)

##### 1 次情報調査 結果 (議論時)

- **Maestro 公式 (2026)**: flakiness rate < 1%、`--retry-on-failure` 推奨 (本プロジェクトは 2/2 PASS 厳格基準で未採用、現方針維持)
- **visual regression 業界 (2026)**: Percy + BrowserStack は実機 pixel-perfect、Chromatic は Storybook 必須、本プロジェクトの DIY (Maestro + ImageMagick + Claude Read) は個人開発に最適コスト
- **Expo + Maestro (2026)**: Detox は Expo eject 不要なら不要、Maestro 推奨が業界整合
- **テストピラミッド (2026)**: 70% unit / 20% integration / 10% E2E、本プロジェクトは E2E 偏重だが「mockup 整合」 が主目的で許容

##### 関連

- 2026-05-13 後半 ultrathink 議論セッション (Q1-Q6 採用)
- WebSearch 結果 (Maestro 2026 best practice / Percy vs Chromatic / Expo + Maestro)

### Notes Amended (2026-05-17、 Sess7 PR-1): §3 タブ構成 部分改訂 (ADR-0025 連動)

- ADR-0025「4 タブ構成変更」 起票連動、 §Decision §3 マッピング row 18 設定タブ削除 + 新 record タブ追加:
  - **row 18 設定タブ削除**: `app/(tabs)/settings/` → `app/settings/` に移動 (タブ外 Stack route)、 既存 SearchHeader.Cog (歯車 ⚙) icon から router.push('/settings') 経路で到達
  - **新 row 18b 記録タブ追加**: `app/(tabs)/record/index.tsx` (Phase 1b stub、 Phase 2 で action 起動実装)
  - **新 4 タブ構成**: 盆栽 / 予定 / **記録** / ふりかえり (設定タブ削除)
- 動機: user 動線最短化 + 業界事例 (Strava Record tab pattern + Apple HIG Settings header) 整合
- Phase 2 (Sess7 PR-2) で予定/記録タブ action 起動 + SelectionToolbar 動線変更 + 「複数選択」 button (Header) 削除を実装予定
- 詳細は `docs/adr/ADR-0025-bottom-tab-restructure.md` 参照

---

### Notes Amended (2026-05-16): 機能チュート (tut1 / tut2) 全撤去 (ADR-0020 v1.x-2)

#### 改訂内容

2026-05-16 セッション議論 (ultrathink、案 A + 案 X + 案 Q + 案 γ+α 採用) で機能チュート全撤去確定:

- **Before** (v1.x-1): Onboarding 6 画面 = Splash + Welcome + Language + Notification (tut5) + 機能 1 (tut1) + 機能 2 (tut2)
- **After** (v1.x-2): Onboarding **4 画面** = Splash + Welcome + Language + Notification (tut5)

#### 撤去理由

1. **user 判断「不要なので削除」**: tut1/tut2 機能撤去で押し付けがましさゼロ (ADR-0011 記録のみ哲学整合性向上)
2. **drift 解消**:
   - ADR-0018 §16-21 改訂当初の「機能 2 = 盆栽追加 + 作業記録」想定と実装 (tut1 = 盆栽追加 + tut2 = 樹種登録) で drift
   - mockup wireframe (screens.jsx) に tut1 / tut2 が無いまま実装独自で作成されていた経緯
3. **ストア完走率最大化**: シンプルなアプリ (Calm / Headspace 等) はオンボ 3-4 画面が主流、多機能チュート不要

#### 41 → 39 分母再定義 (MVP 達成基準)

ADR-0020 §Decision §10 が 6 → 4 画面に変更されたため、41 画面 = 主要画面の定義から **tut1 / tut2 を撤去**:

- **Before**: 41 画面 (整合済 + 永続 skip + 未測定 = MVP 25/41 = 61%)
- **After**: **39 画面** (MVP **25/39 = 64%** に改訂)

#### 影響範囲

- **コード削除**:
  - `src/features/onboarding/tutorialSteps.ts`: `TutorialStep` 型から tut1 / tut2 削除、`TUTORIAL_STEPS` 配列簡素化 (1 entry のみ)
  - `src/features/onboarding/onboardingFlow.ts`: `ONBOARDING_STEP_ORDER` から tut1 / tut2 削除 (3 step に簡素化)
  - `src/stores/onboardingStore.ts`: `OnboardingStep` 型から tut1 / tut2 / tut3 / tut4 削除 (廃止済整理)
  - `app/onboarding/tut/[step].tsx`: tut5 専用簡素化 (dynamic route 維持)
- **i18n 削除**:
  - 19 言語 × 4 keys (`onboardingTut1Title` / `onboardingTut1Body` / `onboardingTut2Title` / `onboardingTut2Body`) = 112 行削除
  - `pnpm i18n:check` 0 missing 維持
- **テスト更新**:
  - `__tests__/features/onboarding/tutorialSteps.test.ts`: tut1 / tut2 関連 test 削除、tut5 のみ test 化
  - `__tests__/features/onboarding/onboardingFlow.test.ts`: `ONBOARDING_STEP_ORDER` 検証更新
  - `__tests__/stores/onboardingStore.test.ts`: tut1 参照を tut5 に置換
- **skip-list**:
  - `scripts/ui-diff/skip-list.json` `skipped[]` から `onboarding-tut1` / `onboarding-tut2` 削除 (PR-2 永続 skip 撤回)
- **Issue**:
  - **Issue #531 close** (機能撤去で mockup HTML 作成不要)
- **ADR**:
  - ADR-0018 Notes Amended (2026-05-16) 追加 (本改訂連動)
  - ADR-0020 §Decision §10 改訂 + 本 Notes Amended 追加

#### 4 ペルソナ評価 (本 Notes Amended)

| 評価軸              | 高橋 62 (シニア)       | Marcus 35    | 盆栽園プロ  | ライト                               |
| ------------------- | ---------------------- | ------------ | ----------- | ------------------------------------ |
| 機能チュート撤去    | ◎ 押し付けがましさゼロ | ◎ 完走率向上 | ◎ 業務速度  | ○ 機能発見性は Settings ヘルプで代替 |
| Onboarding 4 画面化 | ◎ シンプル             | ◎ 30 秒完走  | ◎ 30 秒完走 | ◎                                    |
| ADR-0011 整合       | ◎ 記録のみ哲学         | ◎            | ◎           | ◎                                    |
| ストア出荷影響      | ◎ なし                 | ◎            | ◎           | ◎                                    |
| **総合**            | **◎**                  | **◎**        | **◎**       | **○**                                |

→ 全項目 ○ 以上、✕ ゼロ (R-10 クリア)

#### 関連

- 2026-05-16 セッション議論 (ultrathink、案 A + 案 X + 案 Q + 案 γ+α 採用)
- ADR-0011 (記録のみ哲学、本改訂で整合性向上)
- ADR-0018 (Onboarding 統合フロー、Notes Amended 2026-05-16 連動)
- Issue #526 (PR #532 で close 済、tut5 経路特定)
- Issue #531 (機能 1/2 mockup HTML 作成依頼、本 PR で close)
- PR-2.5: refactor(onboarding): tut1/tut2 機能撤去 + ADR 改訂 (本 PR)

---

### Notes Amended (2026-05-18、 Sess9 PR-6): ふりかえり Hub に「タグを管理」 4 カード目追加 + 意義拡張

#### 改訂内容

- mockup `care-screens.jsx CareHubScreen` (L1576-1719) は **3 カード Hub** (水やり履歴 / 針金がけ一覧 / 盆栽を検索) で確定だったが、 user 真意 (Sess9 議論 Q1 H1 二重動線) で **「タグを管理」 4 カード目を追加**
- ふりかえり Hub の subtitle を意義拡張:
  - **Before** (mockup 完全整合): 「記録したケアを一覧で振り返るビューです。」
  - **After** (Sess9 PR-6): 「記録を振り返り、 整理するビューです。」
  - 「整理」 ワードで **タグ管理 (CRUD)** を含む意味拡張
- 既存「設定 → タグを管理」 row は **併存維持** (高橋ペルソナの既存習慣尊重 + discoverability 最大化)

#### 理由 (議論経緯)

1. **user 要望**: 「下のタブバーにある「ふりかえり」をタップすると「タグを管理」も作って遷移できるようにしてください」
2. **業界事例**: Apple Notes / Things 3 / Notion / Bear いずれも tag management に 2 経路以上提供 (Hub + Settings、 sidebar + menu 等)
3. **動線短縮**: 設定経由のみだと 3 タップ、 Hub 経由なら 2 タップで到達可
4. **mockup 不在の理由**: care-screens.jsx は v1.0 初期 (タグ機能成熟前) に作成、 Sess9 PR-1 で event_tags 廃止 + bonsai_tags 一本化 + タグ管理画面刷新 (PR-3) を経て、 タグ機能が成熟したタイミングでの動線追加

#### R-28 境界判定

- **UI 表現** (カード追加 / icon / subtitle 改訂): R-16 では OpenDesign が SoT だが、 mockup `care-screens.jsx` が古い (タグ機能成熟前) ため、 ADR Amended で意義拡張 + mockup 上書きを明文化
- **ビジネス仕様** (タグ管理機能本体): 既存 `app/tags.tsx` をそのまま利用、 変更なし
- **動線整合** (設定 row 併存): 既存 user の habit migration リスクを回避

#### 4 ペルソナ評価 (本 Notes Amended)

| 評価軸            | 高橋 62 (シニア)   | Marcus 35 (海外) | プロ 50 (業務) | ライト 28 (新人) |
| ----------------- | ------------------ | ---------------- | -------------- | ---------------- |
| Hub 4 カード化    | ◎ 設定経由習慣維持 | ◎ 多経路         | ○              | ◎ 発見性         |
| subtitle 意義拡張 | ◎ 意味通る         | ◎ シンプル       | ◎              | ◎                |
| **総合**          | ◎                  | ◎                | ○              | ◎                |

→ R-10 4 ペルソナ評価で △ ゼロ、 user 真意整合 (Q1 H1 8/8 点)

#### 関連

- Sess9 PR-6 (本 PR、 #TBD): app/(tabs)/look-back/index.tsx 4 カード化 + ja/en 19 言語 i18n
- Sess9 議論: タグ機能 5 PR スコープ (Q1-Q4 で user 真意確定)
- mockup care-screens.jsx CareHubScreen (L1576-1719、 historical reference 維持)

---

### Notes Amended (2026-05-22、 Sess28 PR-1、 ADR-0037 連動): 盆栽詳細 Hero 規定変更 (盆栽名のみ表示)

#### 改訂内容

- mockup v1.0 `detail-screens.jsx DetailHero` (Claude Design 整合) では Hero に **盆栽名 + 樹種 (common + scientific italic) + 樹形** の 3 行情報 + container height **280px** + overlay height **140px** だったが、 Sess28 user 真意 + 4 ペルソナ評価により **盆栽名のみ** + container **180px** + overlay **64px** に縮小
- 樹種 (常用名 + 学名) と 樹形 は **基本情報タブ**の LabeledPickerRow で確認 (現状実装で既に表示済、 追加実装不要)
- 一覧画面 (BonsaiCard) では樹種 + 樹形 を引き続き表示 (cardDataBuilder)、 詳細 Hero でのみ非表示
- placeholder PotIcon size: 120 → 100 (container 縮小に合わせる)

#### Before / After

| 項目                       | Before (mockup v1.0 整合) | After (Sess28 PR-4)           |
| -------------------------- | ------------------------- | ----------------------------- |
| container height           | 280px                     | **180px**                     |
| overlay height             | 140px                     | **64px**                      |
| 盆栽名 fontSize            | 28pt NotoSerifJP          | **同じ** (老眼対応で大型維持) |
| 樹種 (common + scientific) | 表示                      | **非表示**                    |
| 樹形 (style label)         | 表示                      | **非表示**                    |
| 樹種・樹形 到達経路        | Hero overlay (常時可視)   | **基本情報タブ**で参照        |

#### 理由 (議論経緯)

1. **user 要望** (Sess28 改善項目 #3): 「盆栽カードをタップした際に表示される画面で、 一番上の画像に名前と樹形と樹種が表示されていますが名前だけで OK。 薄い黒い帯においても名前だけになるので、 高さを低めて調整してください」
2. **ペルソナ 1 (高橋 62 歳老眼)**: 情報過剰、 list 領域が初期表示で 1-2 件しか見えない → Hero 縮小で event 1-2 件追加可視
3. **ペルソナ 3 (盆栽園プロ 100 鉢)**: 一覧性向上で業務効率改善
4. **mockup 上書きの理由**: Claude Design は初期 (v1.0) の HTML wireframe、 user 実機検証で「情報過剰」 が判明、 R-25 で実機検証主導の改訂が許容範囲

#### R-28 境界判定 + R-16

- **UI 表現** (Hero 高さ + 表示情報削減): R-16 では mockup HTML が下書き / ADR が正、 本 Notes Amended で ADR を正に確定
- **ビジネス仕様**: データ層変更なし (樹種 / 樹形 / cover photo の保存形式は不変)、 表示位置のみ変更
- **動線整合**: 樹種・樹形は基本情報タブで確認可能、 user 学習負荷ほぼ 0

#### 4 ペルソナ評価 (本 Notes Amended)

| 評価軸                    | 高橋 62 (シニア) | Marcus 35 (海外) | プロ 50 (業務) | ライト 28 (新人) |
| ------------------------- | ---------------- | ---------------- | -------------- | ---------------- |
| Hero 縮小 (180px)         | ◎ 老眼負荷低減   | ◎ 一覧性向上     | ◎ 100 鉢で重要 | ○                |
| 樹種・樹形 = 基本情報タブ | ◎ シンプル       | ◎ 動線明確       | ◎ 業務効率     | ○ 学習軽い       |
| **総合**                  | ◎                | ◎                | ◎              | ○                |

→ R-10 4 ペルソナ評価で ✕ ゼロ、 user 真意整合

#### 関連

- ADR-0037 (本 Notes Amended の親 ADR、 Sess28 PR-1)
- Sess28 PR-4 (BonsaiHero.tsx 実装変更、 dead prop 削除)
- `src/features/bonsai/BonsaiHero.tsx` (Sess28 PR-4 で修正)
- `src/features/bonsai/BonsaiBasicForm.tsx` (樹種 / 樹形 = 基本情報タブで現状通り表示)
- mockup `detail-screens.jsx DetailHero` (historical reference 維持)

---

### Notes Amended (2026-05-23、 Sess36 PR-6、 ADR-0042 連動): 記録タブ icon 変更 (DropletIcon → NotebookIcon) + タブ icon 履歴 SoT 化

#### 背景 (Sess36 ADR-0042)

user 報告: 「画面下部のタブバー『記録』 の UI が水の表現で『記録』 にあっていない」。 ADR-0042 D2 で **記録タブ icon を `DropletIcon` (水滴) → `NotebookIcon` (帳簿) に変更**。

#### 構造的問題 (本 Notes Amended で SoT 化)

- 旧: `_layout.tsx:20, 76` は barrel export 経由で **EventIcons.tsx の `DropletIcon` (size=16 watering 用) を import** し、 `size={28}` 上書きして nav 用に兼用
- 結果として:
  - 「記録 = 水やり専用」 と新規ユーザーに誤認 (実際は剪定 / 針金 / 植替 / 施肥など 14 種別記録)
  - NavIcons / EventIcons の名前空間で 1 関数を 2 用途 (UI ナビ 28px + event 種別 16px) で兼用 → lint 検出困難

#### Sess36 解消 (6 PR)

- PR-1 (#808): ADR-0042 起票 (5 sub-decision: D1 4 基準 / D2 NotebookIcon / D3 FAB SoT / D4 lint / D5 ADR-0020 Notes Amended)
- PR-2 (#809): NotebookIcon 追加 + 配線切替 (EventIcons.DropletIcon は無傷で watering 用 3 箇所維持)
- PR-3 (#810): 共通 `<FAB />` component 新設 + 4 画面置換 (right=20, SafeArea 反映, bonsai-detail の ThemedText「+」 → PlusIcon 統一 + iOS Home Indicator 被り bug fix)
- PR-4 (#811): design_system §25 タブアイコン + §26 FAB SoT 追記
- PR-5 (#812): scripts/check-icon-duplication.mjs lint 自動化 (R-9 昇華)
- PR-6 (本 Notes Amended): R-53 起票 + PR template §7.5.5 + ADR-0020 Notes Amended (本記録) + Engram + lessons

#### タブ icon 履歴 (4 タブ、 本 Notes Amended で SoT 化)

| タブ index | route     | icon (現在)                 | 履歴                                                                                                                            |
| ---------- | --------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1          | bonsai    | `LeafIcon` (葉)             | 初版から変更なし、 mockup HI.Leaf 整合                                                                                          |
| 2          | plan      | `CalendarIcon` (カレンダー) | 初版から変更なし、 mockup HI.Cal 整合                                                                                           |
| 3          | record    | `NotebookIcon` (帳簿)       | **Sess36 ADR-0042 D2 で変更** (旧: `DropletIcon` = EventIcons watering icon size override 兼用、 mockup HI.Droplet)             |
| 4          | look-back | `PencilNavIcon` (鉛筆)      | **Sess9 ADR-0020 §Notes Amended で変更** (旧: `CompassNavIcon` = mockup HI.Compass、 タブ rename「探す」 → 「ふりかえり」 連動) |

#### 4 ペルソナ評価 (本 Notes Amended 連動、 ADR-0042 Round 2 議論)

| icon 案                   | 高橋 62 (シニア)     | Marcus 35 (米国 IT) | 業務プロ (100 鉢)          | ライト (1-2 本)  | 総合  |
| ------------------------- | -------------------- | ------------------- | -------------------------- | ---------------- | ----- |
| **NotebookIcon (採用)**   | ◎ 家計簿の安心感     | ○ 機能伝わる        | ◎ 顧客樹管理の帳簿感       | ○ 直感的         | **◎** |
| ClipboardCheckIcon (次点) | ○ チェック付き完了感 | ◎ Material 標準     | ◎ 検品感                   | ○ タスクアプリ風 | ◎     |
| DocumentTextIcon (却下)   | ○ 書類感             | ○ 汎用              | △ エクスポートと紛らわしい | △ 識別性低い     | ○     |

→ R-10 4 ペルソナ評価で ✕ ゼロ、 BonsaiLog 和文化 brand 整合で NotebookIcon 採用

#### 関連

- ADR-0042 (本 Notes Amended の親 ADR、 Sess36 PR-1)
- ADR-0042 Notes Amended (Sess36 PR-2): D2 事実誤認の訂正 (NavIcons には元から DropletIcon なし)
- `src/components/icons/NavIcons.tsx` (NotebookIcon 追加、 Sess36 PR-2)
- `src/components/common/FAB.tsx` (共通 FAB component、 Sess36 PR-3)
- `docs/reference/design_system.md` §25 タブアイコン + §26 FAB (SoT、 Sess36 PR-4)
- `scripts/check-icon-duplication.mjs` (lint 自動化、 Sess36 PR-5)
- `.claude/recurrence-prevention/specialized.md` R-53 (本 Notes Amended 連動)
- `.github/pull_request_template.md` §7.5.5 TabBar icon 変更時チェックリスト (Sess36 PR-6)
