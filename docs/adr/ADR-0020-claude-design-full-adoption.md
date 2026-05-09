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
  10. **Onboarding 8 → 6 画面** (Claude Design `screens.jsx`: Splash + Welcome + LanguagePicker + Notification + 機能 2、ADR-0018 改訂)
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

| #   | Claude Design ファイル                             | スクリーン                | 実装側ルート                                                                   | 種別                                                                         |
| --- | -------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| 1   | `screens.jsx SplashScreen` (mockup v1.0)           | 01 Splash                 | `app/_layout.tsx` + `app.config.ts` (Expo SplashScreen)                        | 整合済 (PR #303、washi backgroundColor)                                      |
| 2   | `screens.jsx WelcomeScreen` (mockup v1.0)          | 02 Welcome                | `app/onboarding/welcome.tsx`                                                   | 整合済 (PR #278 / PR #279)                                                   |
| 3   | `screens.jsx LanguagePickerScreen` (mockup v1.0)   | 03 Language               | `app/onboarding/language.tsx`                                                  | 整合済 (PR #304、CTA 文言「選択して続ける」)                                 |
| 4   | `screens.jsx NotificationScreen` (mockup v1.0)     | 04 Notification           | `app/onboarding/tut/[step].tsx` (tut5、Bell + 文言整合)                        | 整合済 (PR #305、ADR-0011 整合性向上)                                        |
| 5   | `home-screens.jsx HomeScreen` (mockup v1.0)        | 01 HOME (盆栽一覧)        | `app/(tabs)/bonsai/index.tsx` (タブ名「盆栽」)                                 | 整合済 (PR #271 / PR #272)                                                   |
| 6   | `home-screens.jsx HomeEmptyScreen` (mockup v1.0)   | 01 HOME EMPTY             | `app/(tabs)/bonsai/index.tsx` Empty 分岐                                       | 整合済 (PR #306、72dp CTA + 「盆栽を追加」)                                  |
| 7   | `detail-screens.jsx Detail*` (mockup v1.0)         | 02 DETAIL (Hero + 3 Tabs) | `app/(tabs)/bonsai/[id]/index.tsx`                                             | 整合済 (PR #290〜#301、本格実装は Issue #295/#296/#298)                      |
| 8   | `create-screens.jsx Create*`                       | 03 CREATE                 | `app/(tabs)/bonsai/new.tsx`                                                    | 大改修                                                                       |
| 9   | `care-screens.jsx WorkPickerSheet`                 | 04 WORK PICKER            | 新規 BottomSheet                                                               | 新規                                                                         |
| 10  | `care-screens.jsx WorkLogConfirmSheet`             | 05 WORK LOG               | 新規 BottomSheet                                                               | 新規                                                                         |
| 11  | `care-screens.jsx GuideModalScreen`                | 06 GUIDE 30日             | `app/onboarding/guide-30days.tsx`                                              | 新規                                                                         |
| 12  | `care-screens.jsx WateringGraphScreen` (棒グラフ)  | 07 WATERING (旧)          | **不採用** (ヒートマップ採用)                                                  | ─                                                                            |
| 13  | `care-screens-v2.jsx HeatmapScreen` (SS 222921)    | 07 水やり履歴 HEATMAP     | `app/(tabs)/bonsai/[id]/watering.tsx`                                          | 新規                                                                         |
| 14  | `care-screens.jsx CalendarScreen`                  | 08 CALENDAR (予定タブ)    | `app/(tabs)/plan/index.tsx`                                                    | 新規                                                                         |
| 15  | `care-screens.jsx WiringListScreen`                | 09 針金がけ一覧           | `app/(tabs)/plan/wiring.tsx`                                                   | 新規                                                                         |
| 16  | `care-screens.jsx SearchScreen`                    | 10 SEARCH (探すタブ)      | `app/(tabs)/find/index.tsx` (既存 `app/search.tsx` 廃止統合)                   | 大改修                                                                       |
| 17  | `monetization-screens.jsx PaywallScreen`           | 11 PAYWALL                | `src/features/pro/PaywallScreen.tsx`                                           | 大改修                                                                       |
| 18  | `monetization-screens.jsx Settings*` (mockup v1.0) | 12 SETTINGS (設定タブ)    | `app/(tabs)/settings/index.tsx` (既存 `app/settings.tsx` 移動)                 | 部分整合済 (PR #308、SectionHeader mono 風、本格 8 セクション分離は別 Issue) |
| 19  | `export-screens.jsx Export*` (mockup v1.0)         | 13 EXPORT                 | `app/backup/export.tsx` (F-11 ZIP backup、F-10 Hub は Issue #310 で別実装予定) | 部分整合済 (PR #309、F-11 R-25 drift 解消、F-10 本実装は Issue #310)         |

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
