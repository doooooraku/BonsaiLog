# ADR-0052: Dark Theme Cascade Pattern — useColors + ESLint = 擬似 CSS Variables

- **Status**: Accepted
- **Date**: 2026-06-06
- **Session**: Sess66 PR3
- **Related**: ADR-0015 (Color System & outdoor 削除) / ADR-0021 (theme system) / ADR-0048 (FSD layer) / Sess65 PR1 #938 + PR2 #939 / R-58 (新)
- **Supersedes**: なし

## Context

BonsaiLog の dark mode 視認性破綻が Sess65 PR1 + PR2 で 7 画面修正完了したが、 **同 root cause (StyleSheet 内 light-only static color token を参照) の追加発見が PR3 段階でもまだ 4 画面残存**。 検出は user 報告 + 開発者の grep ベースで、 **機械的な再発防止仕組みが欠落** していた。

ADR-0015 で Tamagui を撤去した際、 「StyleSheet 内の theme 切替」 を保証する仕組み (CSS Variables 相当の cascade) も同時に失われた。 代わりに自作の `useColors()` hook + `c.background` 等の inline 色指定で擬似的に cascade を実現していたが、 **「StyleSheet 内に static 色を書く誘惑」 を構造的に防ぐルールが存在しなかった**。

また「もっと簡単に、 .css のように一括反映できないか」 という user の問いに対し、 web 系の CSS Variables を RN にそのまま持ち込む選択肢として `react-native-unistyles` 等の library があるが、 ADR-0015 で Tamagui を撤去した経緯と矛盾する追加依存となる。

## Decision

**自作 `useColors()` hook + ESLint custom rule + a11y contrast CI = 擬似 CSS Variables の最終形** として明文化し、 外部 library 導入は不採用とする。

### 採用する仕組み (3 層構造)

#### 1. ランタイム層 — `useColors()` hook

- `src/core/theme/useColors.ts` が現在の `themeMode` (system / light / dark) と OS appearance から `Colors[scheme]` を返す
- 各 component が `const c = useColors()` で取得し、 inline style に `c.background` / `c.surface` / `c.text` / `c.textSecondary` / `c.textMuted` / `c.tint` / `c.border` 等を指定
- StyleSheet.create() には **layout / size / radius / typography のみ** を入れ、 **色は inline で渡す**
- これにより theme 切替が runtime で全画面に cascade (CSS Variables 相当)

#### 2. 静的検査層 — `local/no-color-token-in-stylesheet` ESLint rule (段階導入)

- `eslint-rules/no-color-token-in-stylesheet.js` で `StyleSheet.create({ key: { color: TOKEN } })` パターンを検出
- **PR3 (Sess66) では `'warn'` level で導入**、 既存 ~245 違反 (60 ファイル) は許容
- PR4 (Sess67) / PR5 (Sess67) / PR6 (Sess67-68) で配色 pivot / 戻る動線統一 / component 徹底化と並行して違反を漸進修正
- 違反 0 到達後の最終 PR で `'error'` に昇格、 構造禁止 (新規違反 0 を恒久維持)
- 一括 `'error'` 化は scope 過大ゆえ、 段階移行を採用 (ハック修正ではなく正式設計)
- **Forbidden tokens** (StyleSheet 内利用禁止、 inline c.\* 必須):
  - `BG_PRIMARY` / `BG_SURFACE`
  - `TEXT_PRIMARY` / `TEXT_SECONDARY` / `TEXT_MUTED` / `TEXT_DEFAULT`
  - `BORDER_DEFAULT` / `BORDER_STRONG`
- **Allowed tokens** (theme-invariant、 StyleSheet 内可):
  - `ON_BRAND` (#FFFFFF) — brand 上の白文字 (Pro バッジ等)
  - `ACCENT_GOLD` (#C69E48) — Pro バッジ専用
  - `ACCENT_BARK`
  - `DANGER` / `SUCCESS` / `OVERLIMIT` — status 色は意図的に固定
  - `DISABLED_BG`
  - `HEATMAP_COLORS` (F-04 専用 4 色)
  - `BADGE_SOFT_*` / `BUTTON_SECONDARY_*` (薄緑 badge / Secondary CTA、 brand-static)
  - `BRAND_GREEN` / `BRAND_GREEN_HOVER` / `BRAND_GREEN_BG` (CTA primary、 brand intent で dark でも同色)
- CI で error level で gate、 違反は merge blocker

#### 3. 振る舞い検査層 — `pnpm a11y:contrast` CI step

- `scripts/a11y-contrast-check.mjs` が Colors.light / Colors.dark の代表 14 pair (7 pair × 2 scheme) を WCAG 2.x 相対輝度公式でコントラスト比検証
- **AA 4.5:1 (本文) / 3.0:1 (UI 要素) を割ったら exit 1 = CI fail**
- 色値変更 PR (例: PR4 配色 pivot) で WCAG 違反を機械検出
- 違反時の waiver は ADR で明文化必須 (場当たり disable 禁止)

### 不採用とした代替案

#### Alt-A: `react-native-unistyles` 等の library 導入

- メリット: CSS Variables 風 syntax + runtime theme 切替 + ESLint plugin 同梱
- 不採用理由:
  1. ADR-0015 で Tamagui を撤去した経緯と矛盾 (style 抽象 library の重さ)
  2. 既存 `useColors()` で実用上の 90% を達成済、 残り 10% は ESLint rule で構造化可能
  3. 全 ~150 component の書き換えコスト過大 (PR6 でも `View`→`ThemedView` 軽量 wrapper のみ)
  4. 依存追加によるバンドルサイズ増 (Hermes 上で ~50KB 増の事例)
- 将来の再評価: BonsaiLog v2 (RN 0.85+) で再評価候補

#### Alt-B: 各 component の StyleSheet を完全廃止し全 inline 化

- メリット: ESLint rule 自体が不要に
- 不採用理由:
  1. typography / layout / radius も inline 化することで render コスト増
  2. style sheet hashing (RN 内部最適化) の恩恵を捨てる
  3. 「色だけ動的、 layout は static」 という現在の整理が最もバランスが良い

#### Alt-C: コメント / レビュー依存で再発防止

- 不採用理由: 既に PR1 / PR2 / PR3 と 3 回再発しており、 仕組み化 (本 ADR) が必須

## Consequences

### Positive

- StyleSheet 内 static 色違反が **CI で自動検出**、 開発者の grep 依存を脱却
- WCAG AA contrast 違反が **機械検出**、 色変更 PR で安全網が機能
- 既存 `useColors()` 資産を活かしたまま構造強化、 移行コスト最小
- ADR-0015 の Tamagui 撤去と整合する軽量解
- PR4 配色 pivot (宵墨 warm 化) を a11y CI を gate に安全実施可能
- 新規 component で「色は inline、 StyleSheet は layout」 という規約が自然に浸透

### Negative

- ESLint rule の false-positive 対応コスト (初期段階で 0 想定だが、 新 token 追加時に rule 更新が必要)
- a11y CI が CI 時間 +1〜2 秒 (許容範囲)
- inline 色を書き忘れた場合の「素の `View` 背景 = transparent」 表示 → 視覚的に検出可能なので問題なし

### Neutral

- 「擬似 CSS Variables」 という呼称は本 ADR 内でのみ通用、 外部読者には `useColors()` パターンと同義

## Implementation

PR3 (Sess66) で実装:

1. `eslint-rules/no-color-token-in-stylesheet.js` を新規作成、 `eslint-rules/index.js` で plugin export
2. `eslint.config.js` で `plugins: { local: require('./eslint-rules') }` + `'local/no-color-token-in-stylesheet': 'error'` を `src/**` `app/**` に適用
3. `scripts/a11y-contrast-check.mjs` を新規作成、 7 pair × 2 scheme = 14 pair の WCAG AA 検証
4. `package.json` に `"a11y:contrast"` script + `verify` chain に含める
5. `.github/workflows/ci.yml` に `pnpm a11y:contrast` step 追加
6. `docs/reference/design_system.md` § 2 に「StyleSheet 内 static 色禁止、 inline `c.*` 必須」 規約明文化 + Allowed tokens 一覧
7. PR3 内で残 4 画面 (LabeledSegmented / LabeledNumberSegmentOrFree / LabeledNumberInputUnit / PhotoField gallery+toolbar) を inline c.\* 化、 新 rule 違反 0 で merge

## ペルソナ評価 (R-10)

| ペルソナ                          | 評価 | 理由                                                                                                                                       |
| --------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| シニア初心者 (60 代女性)          | ◎    | 「dark で文字が見えない」 のような重大 bug が CI で防止される、 直接 UX 改善                                                               |
| 業務プロ (40 代男性、 100 鉢管理) | ◎    | 夜間の屋内記録で目に優しい dark mode が安定動作                                                                                            |
| 高齢者 (70 代男性、 老眼)         | ◎    | WCAG AA gate で contrast 確保、 文字が読めない事故が機械的に防止                                                                           |
| 開発者ペルソナ                    | ○    | ESLint rule が新規 PR の merge を blocker する代わり、 「inline c.\* を書く」 という習慣が自然に形成される。 false-positive リスクは限定的 |

## R-58 (新) recurrence-prevention

「画面追加 / 色変更 / theme 関連 PR では `pnpm a11y:contrast` + 新 ESLint rule の error 0 + dark SS を必ず verify」 を `.claude/recurrence-prevention/specialized.md` に追加 (PR3 同梱)。

## 関連リンク

- ADR-0015: Color System & outdoor mode 削除 (本 ADR の前提)
- ADR-0021: Theme system PoC (useColors 起点)
- ADR-0048: FSD layer definition (useColors hook の例外配置根拠)
- Sess65 PR #938 / #939: dark 視認性破綻 7 画面修正の前段
- Sess66 PR4 (予定): DARK_TOKENS 宵墨 (warm sumi) pivot
- Sess66 PR5 (予定): Navigation Header SoT (ADR-0053)
- Sess66 PR6 (予定): ThemedView/ThemedText 全画面適用
