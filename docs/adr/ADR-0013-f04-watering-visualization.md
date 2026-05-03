---


# ADR-0013: F-04 水やり履歴の可視化（ヒートマップ単独構成 + Apple Health 風 BottomSheet）

- Status: Accepted
- Date: 2026-04-30
- Deciders: @doooooraku
- Related:
  - 上書き対象: `functional_spec.md` §9（F-04 詳細仕様）— 棒グラフ → ヒートマップ単独に全面再設計
  - 上書き対象: `basic_spec.md` §F-04 — 同上
  - 連動: ADR-0008（F-02 events STI + Drizzle + ULID + status）/ ADR-0009（F-13 Pro メリット）/ ADR-0010（F-14 広告）/ ADR-0011（記録のみ哲学）
  - 影響先: ADR-0011 オンボーディング Step 4 — ヒートマップ凡例説明を統合
  - Issue: #<TBD>

---

## Context（背景：いま何に困っている？）

- 現状：
  - F-04 は `functional_spec.md` §9 / `basic_spec.md` §F-04 で「棒グラフ（30/90/365 日切替）+ 全盆栽比較（Pro 限定）」が提案されているが、**チャートライブラリ未確定**（擬似コードで「VictoryNative / Recharts」と記述、確定なし）。
  - F-04 は痛み 🩹2「健康問題の 98% が水やり由来」(Bonsai Direct 公式) への対応で、KPI = 水やり習慣化。
  - 既存依存: `react-native-svg ^15.15.3`（Tamagui 連携）。チャート / カレンダー / Skia 系は未導入。
- 困りごと：
  1. **棒グラフが意味薄い**: 1 日 1 回の水やりが大半 → 棒の高さが「あり/なし」の 2 値しか表現できず、グラフとして退化。
  2. **ライブラリ未確定**: `VictoryNative / Recharts` 並記のまま実装に進むと、実装時に選定で迷う + 後から差し替え困難。
  3. **シニア UX とライト UX の両立**: 高橋 62 歳は「最後から X 日」テキストで満足、Marcus 35 歳 / 盆栽園プロは年俯瞰可視化を欲する。
  4. **ライトユーザーの不公平感**: 「本数で色濃さ」だと 100 本持ちは即濃緑、1 本持ちは薄緑のまま → 達成感の不公平。
  5. **Pro 価値の差別化** vs **Free 体験の充実** のトレードオフ: ヒートマップを Pro 限定にすると Free 体験劣化、Free にすると Pro 訴求弱まる。
  6. **過去 + 未来予定の混在リスク**: ADR-0008 で status='planned' を導入したが、F-04 ヒートマップに混ぜると意味不明化。
- 制約/前提：
  - `docs/reference/constraints.md` §1-1（Local-first、外部 API 0）
  - `docs/reference/constraints.md` §1-4（AI / 推奨機能 NG、「台帳であり判定するものではない」）
  - `docs/reference/constraints.md` §5-2（UI 禁止語: 診断 / 判定 / 推奨 / べき / reminder / tracker / alert）
  - `docs/reference/constraints.md` §2-2（Free / Pro 不変差分）
  - `docs/reference/constraints.md` §3-1（19 言語 LTR、Hermes Intl 動作）
  - `docs/reference/personas.md`（4 ペルソナ：高橋 62 歳 / Marcus 35 歳 / 盆栽園プロ / ライト）
  - `.claude/recurrence-prevention.md` R-1〜R-12（行動 lesson）
  - ADR-0008 §events STI + Drizzle + ULID + status + datetime ラッパー
  - ADR-0011 §29「F-04 は判定なし、グラフ可視化のみ（事実表示）」

---

## Decision（決めたこと：結論）

F-04 を以下の構成で実装する。

### 可視化の構成

1. **ヒートマップ単独 + 「最後から X 日」テキスト**（棒グラフ削除、カレンダー削除）。
2. **Free 全機能利用可**（Pro 限定要素なし）。Pro 訴求は ADR-0009 の既存 4 メリット（写真無制限 / CSV / PDF / QR / 広告非表示）で行う。
3. **過去のみ表示**（status='logged' のみ）。未来予定（status='planned'）は F-02 タイムラインタブで表示し、F-04 には出さない。

### ヒートマップ仕様

4. **形状: GitHub Contribution Graph 風 7 行 × 52 列**（年モード）/ **7 行 × 5 列**（月モード）。
5. **期間切替**: セグメンテッドコントロール `[ 月 ] [ 年 ]` で切替。年送り / 月送りボタン併設。
6. **配色**: ColorBrewer 2.0 Greens 4-class（color-blind safe + 盆栽の緑系世界観）。
   - L0 (空): `#F5F8F5`、L1: `#BAE4B3`、L2: `#74C476`、L3: `#238B45`
7. **数字併記**: 各セルに白文字で数値オーバーレイ（"1" "2" "3+"）。色のみに依存しない（WCAG 1.4.1 / Apple Differentiate Without Color 評価基準）。
8. **凡例**: 画面下部に常時表示。ラベルは画面ごとに動的（後述 K5）。
9. **今日のセル**: 太枠 2dp `#238B45` でハイライト。
10. **未来日**: 灰色（`#E0E0E0`）で「未来」と区別。

### 凡例指標 K5 ハイブリッド

11. **盆栽詳細画面（個別 1 本）**: 「**この盆栽への水やり回数**」（K1）
    - 凡例: `□ 0 回 ■ 1 回 ■ 2 回 ■ 3+ 回`
12. **stats タブ（全盆栽集約）**: 「**持っている盆栽のうち水やった割合 %**」（K2 達成率）
    - 凡例: `□ 0% ■ 1-33% ■ 34-66% ■ 67-100%`
13. **stats タブで個別盆栽選択時**: K1 に切替（凡例ラベルも更新）。
14. **凡例ラベルに明示テキスト**: `凡例 (この盆栽への水やり回数):` または `凡例 (持っている盆栽のうち水やった割合):` を併記。

### 「最後から X 日」テキスト

15. **画面上部最大表示**: 24-28pt Bold、`#1A1A1A` on `#FFFFFF`（コントラスト 16:1、AAA 7:1 楽勝）。
16. **しきい値分岐**:
    - 0 件 → 「まだ記録がありません」+「記録する」ボタン
    - 0 日（今日）→ 「今日、水やりしました」
    - 1 日 → 「最後の水やりから 1 日」
    - 2-30 日 → 「最後の水やりから X 日」（28pt Bold `#1A1A1A`）
    - 31-365 日 → 「最後の水やりから X 日」（24pt Regular `#4A4A4A`）
    - 365 日超 → 「最後の水やりから 1 年以上」
17. **禁止語チェック**: 「水やりが必要です」「水やりを忘れています」「水やりすべきです」等 NG（constraints §5-2、`pnpm i18n:forbidden` で CI 検出）。
18. **集約モードでは表示しない**（X1）: stats タブ全盆栽集約時、「最後から X 日」は意味薄いため非表示。代わりに年間サマリー数字（提案 F）を表示。

### 詳細表示（Apple Health 風 BottomSheet）

19. **タップ時の挙動**: ヒートマップセルをタップ → 下から BottomSheet がせり上がる。
20. **ライブラリ**: `@gorhom/bottom-sheet`（業界標準、active メンテ、TypeScript 完全、a11y 対応）。
21. **シート内容**:
    - 日付（"2026年4月15日 (水)"）
    - 水やり回数
    - その日の events リスト（時刻 + 盆栽名）
    - `[ + この日に水やり記録 ]` ボタン
22. **閉じる操作**: 下スワイプ / シート外タップ / 背景タップ / OS 戻るボタン。

### 全盆栽サマリー（stats タブ）

23. **デフォルト = 全盆栽集約 (S1)**: 全盆栽の水やり日を 1 枚のヒートマップに重ね、達成率 % で色濃淡。
24. **フィルター（F1+F3 ハイブリッド）**:
    - ヒートマップ下に「すべての盆栽 (N本) ▼」シンプルドロップダウン（F1）。
    - タップで下から検索付きシート展開（F3）：
      - 検索ボックス
      - 「最近見た 3 本」セクション
      - 「すべての盆栽（アイウエオ順）」セクション
25. **個別盆栽選択時**: ヒートマップを K1（回数）に切替、凡例ラベルも更新。
26. **stats タブの場所**: `(tabs)/stats`（独立タブ、Free 全機能利用可）。

### 提案 F / H 採用

27. **年間サマリー数字**: 凡例下に「記録日数: X / 365 日 (Y%)」を表示。
28. **データ件数**: 凡例下に「記録件数: N 件」を表示（複数回水やった日があれば 件数 > 日数）。

### F-04 の範囲（E1）

29. **F-04 ヒートマップは水やり専用**。13 種他イベント（剪定/施肥等）は F-02 タイムラインタブで表示。
30. **理由**: Hick's Law（選択肢が多いと反応遅延）、Miller's Law（短期記憶 7±2）、痛み 🩹2 集中、ペルソナ全員 ◎ 評価。

### チュートリアル統合（C1）

31. **ADR-0011 オンボーディング Step 4 で説明**:
    - 既存「Step 4: 作業履歴 + 水やりグラフ (F-04)」を「**ヒートマップの読み方**」に詳細化。
    - サンプルヒートマップ + 凡例説明 + 「緑が濃いほど多く水やりした日です」。
    - スキップボタン必須。
    - 19 言語ローカライズ。

### 屋外モード / ダークモード

32. **F-15 連動 (ADR-0015 で確定)**: F-04 ヒートマップは Tamagui トークン `bonsai_heatmap_l0..l3` を参照、3 mode (light/dark/outdoor) で自動切替。
    - light: L0 #F5F8F5 / L1 #BAE4B3 / L2 #74C476 / L3 #238B45 (本 ADR 既存値継続、H1)
    - dark: L0 #1E1E1E / L1 #2D4A2E / L2 #4A8A4D / L3 #7BC97D (Material 3 baseline)
    - outdoor: L0 #FFFFFF / L1 #A8D5A8 / L2 #4A8A4D / L3 #1B5E20 (純白 + 緑単色、9.7:1 AAA)
    - Skia Atlas sprite 配列を `useTheme()` 検知で再生成 (RD1、worklet 内 1 フレーム以内)
    - 「今日のセル」太枠は `bonsai_today_border` トークン (light/dark=accent、outdoor=純黒)
    - 詳細は ADR-0015 を正とする

### アクセシビリティ（WCAG 2.2 AAA + Apple HIG + Material 3）

33. **タップ領域**: カレンダーセル 44pt（iOS）/ 48dp（Android）以上、間隔 8dp 以上。
34. **コントラスト**: 「最後から X 日」7:1 以上（AAA）、ヒートマップセル隣接色 3:1 以上（WCAG 1.4.11）。
35. **accessibilityLabel**: 各セルに「2026年4月15日 水曜日、水やり 2 回」、ヒートマップ全体に「2026年の水やり実績ヒートマップ。365 日中 87 日記録、合計 95 件」。
36. **Dynamic Type / fontScale 対応**: iOS / Android のシステム文字拡大に追従。
37. **iOS Color Filters Grayscale モード**でテスト（Apple App Store Connect 評価基準）。

### 技術スタック

38. **新規追加パッケージ**:
    - `@shopify/react-native-skia`（ヒートマップ描画、Skia Atlas API）
    - `@gorhom/bottom-sheet`（詳細表示）
39. **既存活用**: `expo-sqlite ^55` / `drizzle-orm`（ADR-0008）/ `@tanstack/react-query ^5.90` / `date-fns ^4.1` + `date-fns-tz` (ADR-0008) / `react-native-reanimated ^4.2`。
40. **WIX react-native-calendars 不採用**: カレンダーUI 削除のため不要。
41. **集計純関数化**: `src/features/care/aggregateWatering.ts` に `aggregateByDay(events, tzOffsetMin)` を 1 ヶ所集約（テスト容易、ADR-0008 datetime ラッパー流用）。
42. **キャッシュ戦略**: `useLiveQuery`（Drizzle）+ React Query（`queryKey: ['watering', 'heatmap', bonsaiId, year]`）+ `invalidateHeatmap(bonsaiId, year)` ヘルパー追加（ADR-0008 invalidator パターン）。

### 適用範囲

43. v1.0 から全プラン（Free / Pro 両方）で全機能利用可。

---

## Decision Drivers（判断の軸）

- Driver 1: **「記録のみ」哲学の貫徹**（ADR-0011） — 判定 / 推奨ゼロ、事実表示のみ。
- Driver 2: **シニア UX 最優先**（高橋 62 歳） — 「最後から X 日」大表示、44pt セル、AAA 7:1、凡例常時、チュートリアル統合。
- Driver 3: **全ペルソナ ◎ 評価**（4 ペルソナ × 16 論点で ✕ ゼロ）— ライト / Marcus / 盆栽園プロも納得。
- Driver 4: **公平な達成感**（K5 ハイブリッド） — 1 本持ちでも 100 本持ちでも「達成率 %」で公平な色濃さ。
- Driver 5: **シンプル化** — ヒートマップ単独で WIX 不要、バンドル -300KB、メンテ対象ライブラリ最小。
- Driver 6: **コスト 0** — 全 OSS（MIT）、外部 API 0 円、ライセンス料ゼロ。
- Driver 7: **業界標準準拠** — GitHub Contribution Graph 形状、Apple Health 風 BottomSheet、ColorBrewer 配色、WCAG AAA。

---

## Alternatives considered（他の案と却下理由）

### Option A: 既存 functional_spec §9 維持（棒グラフ + 30/90/365 日切替 + Pro 限定）

- 概要: VictoryNative / Recharts いずれかで棒グラフ、Pro 限定で 365 日表示。
- 良い点: 既存仕様流用、議論短縮。
- 悪い点: 1 日 1 回の水やりで棒の意味なし（退化）、ライブラリ未確定、Pro / Free の差別化が弱い、シニアにグラフ理解負担。
- 却下理由: ユーザー判断「棒グラフは不要、退化」。

### Option B: WIX react-native-calendars + Skia ヒートマップ（カレンダー Free + ヒートマップ Pro）

- 概要: 月カレンダー（dot 表示）を Free、年俯瞰ヒートマップを Pro。両方実装。
- 良い点: シニアにカレンダー親和、Marcus にヒートマップ満足、Pro 訴求明確。
- 悪い点: バンドル +900KB、ライブラリ 2 個（保守コスト 2 倍）、Free 体験劣化。
- 却下理由: ユーザー判断「2 つ可視化する実装コストは無し、ヒートマップのみで Free 全公開」。

### Option C: ヒートマップ単独 + Pro 限定（年俯瞰のみ Pro）

- 概要: Pro 限定でヒートマップ、Free は「最後から X 日」のみ。
- 良い点: Pro 訴求明確。
- 悪い点: Free 体験が極端に薄い、痛み 🩹2 への対応が弱まる、Marcus / ライトの離脱リスク。
- 却下理由: ユーザー判断「Free でも問題なく見れるようにしましょう」。

### Option D: テキスト主体 + Sparkline（ミニ折れ線）

- 概要: 「最後から X 日」大表示 + 直近 30 日 Sparkline のみ、ヒートマップなし。
- 良い点: 工数最小、シニア UX 最強、バンドル増ゼロ。
- 悪い点: Marcus / 盆栽園プロが物足りない、業界標準から退化。
- 却下理由: 振り返り価値が薄い、Pro 訴求要素も無くなる。

### Option E: Skia 完全自前（カレンダー / ヒートマップ全部 Skia）

- 概要: WIX も BottomSheet ライブラリも使わず全部 Skia + 自前実装。
- 良い点: 究極の柔軟性、バンドル中。
- 悪い点: 工数 5-7 日、a11y / ジェスチャ全自前、Skia 直接実装の学習コスト大。
- 却下理由: ROI 悪い、業界標準ライブラリ（@shopify/react-native-skia + @gorhom/bottom-sheet）で十分。

### Option F: 凡例指標「本数」(K1 全画面適用)

- 概要: stats タブも「水やり本数」で色濃さ判定。
- 良い点: シンプル、絶対値で直感的。
- 悪い点: 100 本持ちは即濃緑、1 本持ちは薄緑のまま → ライトユーザーの不公平感、達成感格差。
- 却下理由: ユーザー判断「ライトユーザーのことを考えていない」、K5 ハイブリッドへ変更。

### Option G: 「2 値モード」（水やり有無のみ、4 段階階調なし）(K3)

- 概要: その日水やったか否かの 2 色のみ。
- 良い点: 最もシンプル、シニアに分かりやすい。
- 悪い点: 情報量少、Marcus / 盆栽園プロが物足りない、階調の達成感ゼロ。
- 却下理由: 4 段階配色で全ペルソナ対応可能、シンプルすぎ。

### Option H: 過去 + 未来予定の両方表示（P1）

- 概要: F-04 ヒートマップに status='logged' + 'planned' 両方表示、色分け。
- 良い点: F-05 気遣い型ポップアップとの連動性。
- 悪い点: ヒートマップは「過去の事実表現」UI、未来混入で意味不明、シニア UX 劣化。
- 却下理由: 未来予定はタイムラインタブで表示、F-04 は過去のみに集中（P2 採用）。

### Option I: 温湿度の手動記録機能 v1.0 実装

- 概要: events.payload に temperature / humidity 追加、F-04 グラフに重ねる。
- 良い点: 盆栽園プロの業務需要対応。
- 悪い点: 高橋 62 歳の入力 UX 劣化、ニッチ需要、19 言語の単位（℃ / ℉）対応コスト。
- 却下理由: ユーザー判断「T2 起票なし、対応不要」。v1.x で要望が来たら events.payload で柔軟対応可（設計変更不要）。

---

## Consequences（結果）

### Positive（嬉しい）

- 「記録のみ」哲学を完全貫徹、constraints §1-4 / §5-2 と整合。
- 全ペルソナで全要素 ○ 以上、✕ ゼロ（高橋 62 歳 / Marcus 35 歳 / 盆栽園プロ / ライト）。
- ライトユーザーの不公平感解消（K5 ハイブリッドで 1 本持ちも 100% 達成感）。
- バンドルサイズ最小化（WIX 不要、Skia + BottomSheet のみで +750KB 程度）。
- 業界標準準拠（GitHub Contribution、Apple Health 風 BottomSheet、ColorBrewer 配色、WCAG AAA）。
- Pro 訴求は ADR-0009 既存 4 メリットで成立、Free 体験が充実。
- 過去のみに集中で UI 単純化、シニア UX 向上。
- 集計純関数化で TZ 境界 / キャッシュ問題を構造的に解決（ADR-0008 datetime ラッパー流用）。

### Negative（辛い/副作用）

- **Skia / BottomSheet の学習コスト**: チーム未経験、初回 PR で躓く可能性 → Skia / BottomSheet 公式 docs を AGENTS.md / Issue Context に必読リンク追加で吸収。
- **ヒートマップ理解の認知負荷**: 高橋 62 歳の初見時の混乱リスク → 凡例常時 + チュートリアル Step 4 + 数字併記 + 「最後から X 日」大表示の 4 重防御。
- **バンドル +750KB**: シニア低速回線で 2-3 秒追加 DL → 許容範囲（iOS 100MB / Android 200MB 制限に余裕）。
- **Skia バンドル増の Android Auto Update 影響**: 軽微（差分更新）。
- **K5 ハイブリッドの集計純関数 2 種類**: テストコスト増、ただし純関数なのでテスト容易。
- **iOS Color Filters Grayscale テスト**: CI 自動化が技術的に難しい → Phase 0 で手動チェック、v1.x で自動化検討。
- **Pro 加入率モニタリング必要**: Free 全公開で Pro 動機弱まる懸念 → 半年後に Pro 加入率を確認、必要なら ADR-0009 Pro メリット強化。

### Follow-ups（後でやる宿題）

- [ ] `docs/reference/functional_spec.md` §9 を全面書き換え（棒グラフ → ヒートマップ単独）。R-2 履歴は ADR、仕様書は現在のみ。
- [ ] `docs/reference/basic_spec.md` F-04 セクション（L196-217）を更新。
- [ ] `docs/reference/basic_spec.md` Free/Pro 差分表（L725 周辺）から「水やり履歴グラフ Free=直近 30 日のみ / Pro=全期間」を削除（全機能 Free のため）。
- [ ] `docs/reference/glossary.md` に追加: ヒートマップ / BottomSheet / ColorBrewer / Skia Atlas / セグメンテッドコントロール / K5 ハイブリッド凡例 / 達成率 (%) / 「最後から X 日」/ 凡例 / Apple Health 風 BottomSheet。
- [ ] `docs/adr/ADR-0011-remove-recommendations-keep-record-only.md` のオンボーディング Step 4 仕様を「ヒートマップの読み方」に詳細化（C1 統合）。
- [ ] `package.json` に追加: `@shopify/react-native-skia` / `@gorhom/bottom-sheet`（実装 PR で実施）。
- [ ] `src/features/care/aggregateWatering.ts` に純関数 `aggregateByDay(events, tzOffsetMin)` 新規実装。
- [ ] `src/core/queries/invalidators.ts` に `invalidateHeatmap(bonsaiId, year)` 追加（ADR-0008 invalidator パターン流用）。
- [ ] テスト: `__tests__/features/care/aggregateWatering.test.ts`（純関数集計、TZ 境界、空日、複数回水やり）。
- [ ] テスト: `__tests__/features/care/daysSinceWatering.test.ts`（しきい値分岐 0/1/2-30/31-365/365+ 日）。
- [ ] テスト: `__tests__/features/care/heatmapData.test.ts`（K5 ハイブリッド: K1 個別 / K2 達成率）。
- [ ] テスト: `maestro/flows/watering_heatmap.yml`（ヒートマップ表示 → セルタップ → BottomSheet → 閉じる）。
- [ ] テスト: `maestro/flows/watering_filter.yml`（フィルターシート展開 → 検索 → 個別選択 → 凡例切替）。
- [ ] Phase 0 PoC: 実機（Pixel 7 / iPhone 13）で 1825 件 events + 100 本対応の FPS 計測（60 FPS 達成必須）。
- [ ] Phase 0 PoC: Hermes Intl 動作確認、19 言語月名・曜日名で `RangeError` 出ないこと、必要なら `@formatjs/intl-*` polyfill 追加。
- [ ] Phase 0 PoC: iOS Color Filters Grayscale モードで視覚確認（数字併記が機能するか）。
- [ ] F-15（ダークモード / 屋外モード）議論時に F-04 用テーマトークン定義を反映。
- [ ] `docs/reference/tasks/lessons.md` に「機能の意味が薄い指標（本数）はライトユーザーの達成感格差を生む。達成率 % など正規化指標を検討」追記。

---

## Acceptance / Tests（合否：テストに寄せる）

### 自動テスト

- **Jest 単体テスト**:
  - `__tests__/features/care/aggregateWatering.test.ts`
    - 同日 2 回水やり → count=2
    - 空の日 → count=0（マス目灰色 L0）
    - TZ 境界（JST 23:55 水やり）→ ローカル日付で当日扱い
    - 100 本集約モード → 達成率 % 計算（K2）
  - `__tests__/features/care/daysSinceWatering.test.ts`
    - 0 件 → 「まだ記録がありません」
    - 0 日 → 「今日、水やりしました」
    - 1 日 / 7 日 / 30 日 / 365 日 / 1000 日の文言確認
  - `__tests__/features/care/heatmapData.test.ts`
    - K1: 個別盆栽の回数集計
    - K2: 全盆栽集約の達成率 % 計算
    - 月モード（7×5）/ 年モード（7×52）の sprite 配列生成
  - `__tests__/features/care/i18nForbiddenWords.test.ts`
    - 「水やりが必要です」「水やりすべきです」等が UI 文字列に出ないこと（CI `pnpm i18n:forbidden`）
- **Maestro E2E**:
  - `maestro/flows/watering_heatmap.yml`: 盆栽詳細 → ヒートマップ表示 → セルタップ → BottomSheet 表示 → 詳細確認 → 閉じる
  - `maestro/flows/watering_filter.yml`: stats タブ → フィルターシート展開 → 検索ボックス入力 → 個別盆栽選択 → 凡例ラベルが「（この盆栽への水やり回数）」に切替確認
  - `maestro/flows/watering_period_switch.yml`: 月 / 年セグメンテッドコントロール切替 → ヒートマップ形状変化確認

### 手動チェック（Phase 0 必須）

- 実機 Pixel 7 / iPhone 13:
  - 1825 件 events + 100 本ヒートマップ → 60 FPS 達成
  - フィルター切替アニメーション（集約 → 個別）→ スムーズ
  - BottomSheet 開閉 → スムーズ
- iOS:
  - VoiceOver 読み上げ: ヒートマップ全体ラベル + セル個別ラベル
  - Dynamic Type 最大設定で「最後から X 日」が崩れない
  - Color Filters Grayscale モードで数字併記が機能
- Android:
  - TalkBack 読み上げ
  - fontScale 最大設定でレイアウト維持

### F-04 受け入れ条件

- [ ] ヒートマップが 7×52（年）/ 7×5（月）で表示される
- [ ] ColorBrewer Greens 4 段階配色 + 数字併記
- [ ] 凡例が画面下部に常時表示
- [ ] 凡例ラベルが画面ごとに動的（個別=回数、集約=達成率%）
- [ ] 「最後から X 日」が画面上部に 24-28pt Bold で表示
- [ ] 集約モードで「最後から X 日」非表示
- [ ] セルタップ → BottomSheet で日別詳細表示
- [ ] フィルター（F1+F3 ハイブリッド）が動作
- [ ] 月 / 年セグメンテッドコントロール切替動作
- [ ] 過去のみ表示（未来予定は非表示）
- [ ] 「警告」「不足」「べき」等の判定語が UI に出ない（CI `pnpm i18n:forbidden`）
- [ ] Free / Pro 関係なく全機能利用可
- [ ] 19 言語ローカライズ（月名 / 曜日名 / 凡例ラベル / 「最後から X 日」）

---

## Rollout / Rollback（出し方/戻し方）

- リリース手順への影響：
  - F-01 / F-08 / F-02 マージ後に F-04 マージ（ADR-0008 events 基盤に依存）。
  - リリースノートに「水やり記録を年間ヒートマップで振り返れます」を 19 言語で追記。
- ロールバック方針：
  - F-04 を v1.0.x ホットフィックスで無効化する場合、UI 側で stats タブ + 盆栽詳細ヒートマップセクションを非表示化（DB は影響なし）。
  - 「最後から X 日」テキストは F-04 ロールバック後も残す（events から直接計算可能）。
- 検知方法：
  - Sentry: ヒートマップレンダリングエラー（`HeatmapRenderError`）監視。
  - PoC ベンチマーク CI: 1825 件 + 100 本シードで 60 FPS 維持を CI で計測（v1.x で自動化）。
  - Pro 加入率: 半年後にレビュー、Free 全公開の影響を評価。

---

## Links（関連リンク）

- constraints: `docs/reference/constraints.md` (§1-1 / §1-4 / §5-2 / §2-2 / §3-1 / §6 / §8 F-04 ID)
- reference: `docs/reference/basic_spec.md` (§F-04 詳細仕様 — 本 ADR で書換)
- reference: `docs/reference/functional_spec.md` (§9 F-04 詳細 — 本 ADR で書換)
- reference: `docs/reference/personas.md` (4 ペルソナ評価)
- glossary: `docs/reference/glossary.md` (Event / watering / 13 種 event_type / ヒートマップ / BottomSheet — 追加予定)
- 行動 lesson: `.claude/recurrence-prevention.md` (R-1〜R-12)
- 連動 ADR:
  - `docs/adr/ADR-0008-f02-event-data-model.md` (events STI + Drizzle + ULID + status + datetime ラッパー)
  - `docs/adr/ADR-0009-f13-revenuecat-billing.md` (Pro メリット = 写真∞/CSV/PDF/QR/広告無、本 ADR で変更なし)
  - `docs/adr/ADR-0010-f14-admob-banner-design.md` (広告 Home tabBar 上のみ、本 ADR で変更なし)
  - `docs/adr/ADR-0011-remove-recommendations-keep-record-only.md` (記録のみ哲学 + オンボーディング Step 4 — 本 ADR で詳細化)
- 影響 Issue: 後日 #<TBD>（F-04 メイン Issue）
- PR: #<TBD>
- Issue: #<TBD>
- External docs:
  - [@shopify/react-native-skia 公式](https://shopify.github.io/react-native-skia/)
  - [@shopify/react-native-skia Atlas API](https://shopify.github.io/react-native-skia/docs/shapes/atlas)
  - [@shopify/react-native-skia Releases (v2.6.x = 2026-04)](https://github.com/Shopify/react-native-skia/releases)
  - [@gorhom/bottom-sheet 公式](https://gorhom.dev/react-native-bottom-sheet/)
  - [@gorhom/bottom-sheet GitHub](https://github.com/gorhom/react-native-bottom-sheet)
  - [ColorBrewer 2.0](https://colorbrewer2.org/)
  - [WCAG 2.2 1.4.3 Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
  - [WCAG 2.2 1.4.6 Contrast Enhanced AAA](https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced.html)
  - [WCAG 2.2 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
  - [WCAG 2.2 2.5.5 Target Size Enhanced](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html)
  - [Apple HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
  - [Apple Differentiate Without Color 評価基準](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/differentiate-without-color-alone-evaluation-criteria/)
  - [Material Design 3 Touch Target](https://m2.material.io/develop/web/supporting/touch-target)
  - [NN/g Senior Citizens UX 3rd Edition](https://www.nngroup.com/articles/usability-seniors-improvements/)
  - [PMC8001308 Bonsai Practitioners Demographics](https://pmc.ncbi.nlm.nih.gov/articles/PMC8001308/)
  - [GitHub Contribution Graph 仕様](https://bitsofco.de/github-contribution-graph-css-grid/)
  - [Bonsai Direct「健康問題の 98% 水やり由来」](https://bonsaidirect.co.uk/) (痛み 🩹2 出典)
  - [BJ Fogg Behavior Model](https://behaviormodel.org/) (Streak 不採用根拠)
  - [Duolingo Streaks Research](https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals/) (柔軟サマリ採用根拠)
  - [Apple Health UI Reference](https://www.apple.com/health/) (BottomSheet UX 参照)
  - [Day One Calendar View](https://dayoneapp.com/features/calendar-view/) (業界事例)
  - [Streaks App](https://streaksapp.com/) (業界事例)
  - [WIX react-native-calendars](https://github.com/wix/react-native-calendars) (検討候補、不採用)
  - [Hermes Intl Issue #1607](https://github.com/facebook/hermes/issues/1607) (Phase 0 PoC で確認必須)

---

## Notes（メモ）

### 議論経緯（5 ラウンド）

1. ラウンド 1: 棒グラフ + Victory Native XL 推薦 → ユーザー指摘「棒グラフ不要、退化」
2. ラウンド 2: カレンダー (Free) + ヒートマップ (Pro) 推薦 → ユーザー指摘「2 つ可視化のコスト無し、ヒートマップのみ Free 全公開」
3. ラウンド 3: ヒートマップ単独 + Apple Health 風 BottomSheet → 詳細図解、F1+F3 ハイブリッド提案
4. ラウンド 4: 凡例「本数」指標 → ユーザー指摘「ライトユーザー不公平」→ K5 達成率% ハイブリッド推薦
5. ラウンド 5: 月 / 年切替追加、提案 F / H 採用、最終確定

### 4 ペルソナ評価マトリクス（最終構成）

| 要素                          | 高橋 62 歳         | Marcus 35 歳    | 盆栽園プロ   | ライト     | 総合 |
| ----------------------------- | ------------------ | --------------- | ------------ | ---------- | ---- |
| ヒートマップ単独 (Free)       | ○ 凡例で理解可     | ◎ GitHub 風好き | ◎            | ○          | ○    |
| 「最後から X 日」24-28pt Bold | ◎                  | ○               | ○            | ◎          | ◎    |
| ColorBrewer Greens + 数字併記 | ◎                  | ○               | ◎            | ◎          | ◎    |
| BottomSheet 詳細              | ◎ 画面遷移なし     | ◎               | ◎            | ○          | ◎    |
| F1+F3 フィルター              | ◎ デフォルト集約   | ◎ 検索快適      | ◎ 100 本対応 | ◎          | ◎    |
| K5 ハイブリッド凡例           | ◎                  | ◎               | ◎            | **◎ 公平** | ◎    |
| 月/年切替                     | ◎ 月で大きく見える | ◎ 年で俯瞰      | ◎            | ○          | ◎    |
| 過去のみ (P2)                 | ◎ シンプル         | ○               | ○            | ○          | ○    |
| 屋外モード 21:1               | ◎ 屋外作業         | ○               | ◎ 屋外多い   | ○          | ◎    |
| Streak 不採用                 | ◎ プレッシャーなし | △ 物足りない    | ◎ 業務向け   | ◎          | ◎    |
| C1 オンボーディング統合       | ◎ シンプル         | ○ 即スキップ可  | ◎ シンプル   | ○          | ◎    |
| AAA 7:1 / 44pt セル           | ◎                  | ○               | ○            | ○          | ◎    |

→ **全要素で全ペルソナ ○ 以上、✕ ゼロ**（R-10 クリア）。

### v1.0 実装範囲の補足（Phase G-3 で追記）

- **ヒートマップ表示範囲**: v1.0 は **直近 12 週 (84 日) 固定**。年/月切替 (§3) は v1.x 課題。
- **凡例下サマリー (§27-28)**: v1.0 は 12 週固定の `記録日数: X / 84 (Y%)` + `記録件数: N` 表示。
- **ADR §27 「365 日」表記との差分**: 当初 ADR は 365 日想定だが、v1.0 ヒートマップ実装範囲 (12 週) と整合させるため 12 週で揃える。年/月切替実装時に「年モード = 365 日サマリー / 月モード = 35 日サマリー」へ拡張する。

### v1.x 拡張候補（本 ADR 対象外）

- **複数イベントカレンダー**（盆栽園プロ需要）: 13 種全イベントを 1 画面で俯瞰、別タブ
- **ヒートマップ SNS シェア**: 画像生成 + Share Sheet
- **過去年比較ビュー**: 2025 年 vs 2026 年の重ね合わせヒートマップ
- **温湿度の手動記録**: ADR-0008 events.payload に追加（v1.x で要望が来たら、現在は対応不要）
- **Apple Watch / Wear OS ウィジェット**: ヒートマップサマリー（constraints §4 非ゴール 15）

### Repolog との差分

Repolog（先行アプリ）には水やりヒートマップなし。BonsaiLog 新規設計。Repolog 由来の lessons.md パターン（`useLiveQuery`、相対パス保存、PRAGMA user_version）はそのまま適用。

### lessons.md 追記候補

- 「機能の指標選定はライトユーザーの達成感格差を生まないか確認する。絶対値（本数）より正規化指標（達成率 %）が公平」
- 「ヒートマップは IT 系ユーザー馴染み、シニア層には凡例 + 数字併記 + チュートリアル統合の 4 重防御で対応可能」
- 「BottomSheet（@gorhom/bottom-sheet）は Apple Health 風 UX を最小工数で実装可能、画面遷移なしでシニア UX◎」
