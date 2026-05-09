# P-12: 画面実装サイクルプロンプト (P-09 ui-diff + P-11 mockup 実装の統合版)

OpenDesign で作った UI 画面 (`docs/mockups/v1.0/wireframes/`) を、実機の React Native + Expo アプリに **1 セッション 1 画面 1 サイクル** で順次反映するためのプロンプト集。P-09 (ui-diff pipeline) と P-11 (mockup 実装) を統合した「画面実装サイクル」を Claude Code が完遂する。

本プロンプトは PR #271/#272/#276 (02-Home 完遂) で得られた 10 件の失敗事例を踏まえた改良版。

---

## ✨ 使い方 (超シンプル、これだけ覚えれば OK)

新規 Claude Code セッションで、最初のメッセージにこれを送るだけ:

```
P-12 で「<画面名>」を実装してください
```

`<画面名>` を下の対応表から日本語で 1 つ選んで置き換える。

---

## 📋 対応表 (日本語 1 語で OK)

| 日本語 (これだけ覚える)                 | 状態      | 画面 ID (内部)            | mockup ファイル                             |
| --------------------------------------- | --------- | ------------------------- | ------------------------------------------- |
| **盆栽タブ** (起動直後の盆栽カード一覧) | ✅ 完了済 | `bonsai-tab`              | `home-screens.jsx HomeScreen` (mockup v1.0) |
| **オンボーディング (Welcome)**          | ⏳ 未着手 | `onboarding-welcome`      | `screens.jsx Welcome`                       |
| **オンボーディング (言語選択)**         | ⏳        | `onboarding-language`     | `screens.jsx LanguagePicker`                |
| **オンボーディング (通知)**             | ⏳        | `onboarding-notification` | `screens.jsx Notification`                  |
| **盆栽詳細**                            | ⏳        | `bonsai-detail`           | `detail-screens.jsx Detail*`                |
| **予定タブ**                            | ⏳        | `plan-tab`                | `care-screens.jsx CalendarScreen`           |
| **探すタブ**                            | ⏳        | `find-tab`                | `care-screens.jsx SearchScreen`             |
| **設定タブ**                            | ⏳        | `settings-tab`            | `monetization-screens.jsx Settings*`        |
| **Paywall**                             | ⏳        | `paywall`                 | `monetization-screens.jsx PaywallScreen`    |
| **水やり履歴ヒートマップ**              | ⏳        | `watering-heatmap`        | `care-screens-v2.jsx HeatmapScreen`         |
| **作業記録シート**                      | ⏳        | `work-log-confirm`        | `care-screens.jsx WorkLogConfirmSheet`      |
| **エクスポート**                        | ⏳        | `export-hub`              | `export-screens.jsx Export*`                |

> 対応表の出典: ADR-0020 §Notes §画面マップ + ADR-0021 Notes Amended (OpenDesign 出力 = mockups v1.0 を Source of Reference として参照)

---

## 3 つの版の使い分け

| 版               | サイズ    | 使うシーン                  |
| ---------------- | --------- | --------------------------- |
| **A. 1 行版**    | 1 行      | 慣れた後、毎回これで OK     |
| **B. 標準版** ⭐ | 約 200 行 | 標準的な作業、推奨          |
| **C. 完全版**    | 約 400 行 | 初回 / 別 PC / チーム共有時 |

---

## A. 1 行版

```
P-12 で「<画面名>」を実装してください
```

例: `P-12 で「オンボーディング (Welcome)」を実装してください`

---

## B. 標準版 ⭐ (推奨、毎回これで OK)

```
あなたは BonsaiLog のシニアモバイル UI エンジニア兼 QA 自動化エンジニアです。
docs/mockups/v1.0/ の OpenDesign 採用版を React Native + Expo の実機 UI に
順次反映する 1 サイクルを 1 セッションで完遂してください。

# 今回の対象画面
「<画面名>」 (上記対応表から 1 つ選ぶ。例: 「オンボーディング (Welcome)」)

# 進め方ルール (11 厳守事項、注意ではなく仕組みで防ぐ)
1. R-17 4 段階厳守: TaskCreate → 計画提示 → ユーザー承認 → 実行 (「全部 OK」でも 4 段階)
2. R-27 既存実装確認: ui-diff 結果分析の前段で必ず Glob/Grep/Read 実施 (実装済みなら差分は無視 = データ問題)
3. R-22 exit code 保全: pnpm verify を background 実行時は `> /tmp/log 2>&1; echo EXIT=$?; tail -50 /tmp/log` 形式
4. R-1 一括処理確認: sed/Python 一括変更後は grep + Read + git diff で必ず検証
5. R-15 ハング判定: 30 秒以上応答ない場合はユーザーに即報告
6. 絶対パス使用: scripts/ci/wait-for-pr.sh と scripts/git/{start,end}-pr.sh は絶対パス推奨
7. 都度報告モード: 各 Step 完了で 1〜3 行報告、専門用語にやさしい言い換え併記 (R-14)
8. 1 セッション 1 画面: 準備 PR + 修正 PR + ADR 更新 = 最大 3 PR で完了
9. R-10 ペルソナ評価: 修正実装時に 4 ペルソナ (高橋 62 歳 / Marcus 35 歳 / 盆栽園プロ / ライト) で評価
10. R-28 境界判定: ビジネス仕様 (Pro / 課金 / プライバシー / 法令) は ADR が絶対上位、UI 表現のみ mockup 採用
11. R-25 drift 検出: tokens.css 値 → constants/colors.ts 必須、ハードコード禁止

# Step 1: P-09/P-11 判定 (3 条件チェック)
- [ ] app/<screen> または app/(tabs)/<screen> 実装ファイル → ある？
- [ ] maestro/flows/ui-diff/<screen-id>.yml → ある？
- [ ] scripts/ui-diff/config.ts SCREEN_PAIRS エントリ → ある？
判定:
- 3 つすべて「ある」 → P-09 (差分修正、準備 PR 不要)
- 「app 実装あり」のみ「ある」 → P-09 + 準備 PR 必要 (SCREEN_PAIRS + Maestro flow 新規作成)
- すべて「ない」 → P-11 (新規実装) ルート

# Step 2: コンテキスト把握 (Read 必須、漏らさない)
- docs/mockups/v1.0/README.md
- docs/mockups/v1.0/docs/principles.md (PR チェックリスト必読)
- docs/mockups/v1.0/docs/display-schema.md
- docs/mockups/v1.0/wireframes/<screen>.html (該当 HTML、複数 UI 含む)
- docs/mockups/v1.0/wireframes/<関連>.jsx (該当画面の jsx)
- docs/mockups/v1.0/wireframes/tokens.css
- docs/adr/ADR-0020 §Notes §画面マップ
- docs/adr/ADR-0021 + ADR-0021 Notes Amended (OpenDesign が UI SoT)
- docs/adr/ADR-0009 (RevenueCat、ビジネス仕様、絶対上位)
- docs/adr/ADR-0010 (AdMob、絶対上位)
- docs/adr/ADR-0011 (記録のみ哲学、絶対上位)
- docs/adr/ADR-0017 (ATT/UMP/Privacy、絶対上位)
- docs/adr/ADR-0015 (テーマ、design_system.md と整合)
- .claude/recurrence-prevention.md R-1〜R-28
- 既存実装の有無 (R-27): Glob/Grep で該当ディレクトリ確認、実装済みコンポーネントを Read

# Step 3: R-17 4 段階で計画提示
- TaskCreate で実装タスク分割 (準備 / ui-diff 実行 / 差分分析 / 修正 / ADR 更新 / Issue 起票)
- 計画提示 (変更ファイル / 新規ファイル / 影響範囲 / リスク / スコープ除外項目を明示)
- ユーザー承認待ち
- 実行

# Step 4: 準備 PR (SCREEN_PAIRS / Maestro flow 未準備時のみ)
- bash scripts/git/start-pr.sh chore/ui-diff-config-<screen>
- scripts/ui-diff/config.ts に SCREEN_PAIRS.<screen-id> エントリ追加 (designHtml / designSelector / appFlow / notes)
- maestro/flows/ui-diff/<screen-id>.yml 新規作成 (Maestro 2.0 構文厳守、appId + commands 列、`---` セパレータ)
- pnpm verify 全 11 ゲート緑
- gh pr create → wait-for-pr.sh (絶対パス) → squash merge → end-pr.sh

# Step 5: 環境前提チェック (ui-diff 実行前、preflight が確認するが事前確認推奨)
- [ ] Node v22+ (PATH=/home/doooo/.nvm/versions/node/v22.22.2/bin:$PATH を prepend)
- [ ] adb authorized device (実機 USB 接続 + 「USB デバッグ許可」承認、`adb devices` で確認)
- [ ] Metro server WSL2 内起動 (`pnpm dev` を WSL ターミナルで、Windows PowerShell 不可)
- [ ] `adb reverse tcp:8081 tcp:8081` 実行
- [ ] Playwright + chromium installed (`pnpm exec playwright install chromium`)
- [ ] ImageMagick compare installed (`sudo apt install imagemagick` 済)
- [ ] mockups v1.0 root: docs/mockups/v1.0/wireframes/ 存在確認

# Step 6: ui-diff pipeline 実行
- 実行: PATH=...node v22... corepack pnpm exec tsx scripts/ui-diff/run.ts <screen-id>
- preflight が止めたら hint に従う、ユーザーに状況報告 (R-15)
- 完了後 4 ステップ実行確認: capture-app + capture-design + compare + report

# Step 7: 差分分析 (R-27 + 4 ペルソナ評価必須)
- report.md (scripts/ui-diff/out/<timestamp>/report.md) を Read
- 5 画像を Read で詳細確認:
  - design/<screen>.png (mockup、単独 Read 必須)
  - app/<screen>.png (実機 raw、単独 Read 必須)
  - app/<screen>-resized.png (実機リサイズ)
  - diff/<screen>.png (差分)
  - diff/<screen>-side-by-side.png (横並び)
- ⚠️ side-by-side だけでなく実機/mockup 単独 Read で詳細確認 (PR #272 学び)
- ⚠️ メトリック値より「位置・色・有無」を重視
- 差分を以下フローで分類:
```

[差分発見]
↓
[該当コンポーネント Glob/Grep/Read で R-27 確認]
↓
├─ 既存実装あり、ロジック OK
│ ├─ DB データ無し → データ問題 (Issue 起票せず、テストデータ追加で再 PoC)
│ └─ DB データあり → 設定問題 (環境変数 / props / state 確認)
├─ 既存実装あり、ロジック未実装 (TODO) → 拡張 Issue 起票
└─ 既存実装なし → 新規実装 Issue 起票

```
- 4 ペルソナ評価 (R-10): 各実装問題について 4 ペルソナで評価、1 人でも ✕ なら再検討

# Step 8: 修正 PR (実装問題のみ)
- bash scripts/git/start-pr.sh feat/<screen>-from-mockups
- jsx → React Native 変換 (※ OpenDesign HTML/JSX は React.js Web 向け、RN 直 import 不可):
- <div> → <View> / <Pressable> / <SafeAreaView> 場面で選ぶ
- <span> / <p> → <Text> (ThemedText で colors/typography token 経由)
- <img> → <Image> (Expo Image 推奨)
- className="..." → style={styles.foo} (StyleSheet.create)
- inline style {color:'#1F3A2E'} → constants/colors.ts の BRAND_GREEN (R-25)
- map list → FlatList / ScrollView (大量なら FlashList @shopify)
- onClick → onPress
- tokens.css 値 → constants/colors.ts (ハードコード禁止、R-25)
- i18n キー追加 (19 言語、ja は日本語値、他 18 言語は英語フォールバック)
- Maestro flow 更新 (verify:maestro 緑、Maestro 2.0 構文厳守)
- pnpm verify 全 11 ゲート緑
- git add 該当ファイルのみ + git commit (HEREDOC + co-author trailer)
- git push -u + gh pr create
- bash /home/doooo/04_app-factory/apps/BonsaiLog/scripts/ci/wait-for-pr.sh <PR> (絶対パス必須)
- gh pr merge <PR> --squash --delete-branch
- bash scripts/git/end-pr.sh <branch>

# Step 9: ADR-0020 §Notes §画面マップ更新 (軽量 PR、必須)
- 該当 row の種別を「整合済 (PR #N1 / PR #N2)」に更新
- ファイル列に「(mockup v1.0)」追記
- pnpm verify + 軽量 PR でマージ

# Step 10: Issue 起票 (スコープ外を全て記録)
- 本 PR スコープから除外した実装項目を gh issue create
- R-27 既存実装確認結果を Issue 本文の「既存実装の確認」セクションに必ず記載
- 優先度 (P1/P2/P3) を明示
- データ問題 (テストデータ薄) は Issue 起票せず、テストデータ追加で再 PoC 推奨をコメント

# Step 11: セッション終了
- /session-end で Engram session_summary 保存 + commit + push 提案
- 残作業 (次セッション) を整理

# 禁止事項
- いきなりコード編集 (R-18: Read → Edit 厳守)
- いきなり pnpm add (package 追加は明示承認後)
- 破壊的コマンド (rm -rf / git reset --hard / push --force / --no-verify / git stash drop)
- 新規 Maestro flow で 1.x 構文 (steps: / assertVisible.timeout / waitForAnimationToEnd プロパティ)
- ADR-0009/0010/0011/0017 のビジネス仕様変更 (mockup で表現されていても採用しない、R-28 ガード)
- docs/mockups/v1.0/ 直接編集 (凍結保管、PR #269 で確定)
- mockups の jsx をそのまま import (Web 向け、RN 非互換)
- tokens.css 値を hardcode (constants/ に必ず通す、R-25)

# やさしい言い換え (R-14)
- ui-diff: 「お手本HTMLと実機のスクショを並べて差分を出す仕組み」
- preflight: 「ui-diff 実行前の環境チェック門番」
- SCREEN_PAIRS: 「どの実機画面とどのお手本HTMLを比較するかの対応表」
- DESIGN_ROOT: 「お手本HTMLが置いてあるディレクトリの起点」
- drift: 「設定が複数箇所に書かれていてズレてる現象」(R-25)
- R-27: 「Issue 起票前 / 差分判定前に既存実装の有無を Glob/Grep で確認」
- 4 ペルソナ: 「高橋 62 歳・Marcus 35 歳・盆栽園プロ・ライトの 4 名で評価」(R-10)

# 期待アウトプット
1. 1 画面ごとに 1〜3 PR (準備 / 修正 / ADR 更新)
2. ADR-0020 §Notes §画面マップ整合済マーク
3. Issue 起票 (スコープ外、データ問題は除外)
4. report.md 所見セクションに差分分析結果記載
5. 新しい罠 → 別 PR で仕組化 (scripts/ または lessons § 追加、R-24)
6. /session-end で Engram session_summary 保存

スタートしてください。
```

`<画面名>` を、対応表の好きな日本語名 (例:「盆栽詳細」「Paywall」) に置き換える。

---

## C. 完全版 (初回・別 PC・チーム共有時)

```
あなたは BonsaiLog (別プロジェクトなら名前を変える) のシニアモバイル UI エンジニア兼 QA 自動化エンジニアです。
docs/how-to/workflow/prompts/P-09_ui-diff-pipeline.md と
docs/how-to/workflow/prompts/P-12_screen-implementation-cycle.md を確認してください。

# 目的
docs/mockups/v1.0/ の OpenDesign 採用版モックアップを、React Native + Expo の実機 UI に
順次反映するサイクル (1 セッション 1 画面 1〜3 PR) を Claude Code が自走で完遂する。

# 既存資産 (これらは触らず流用)

| 場所 | 役割 |
|---|---|
| docs/mockups/v1.0/ | OpenDesign 採用版モックアップ (PR #269、凍結保管) |
| docs/mockups/v1.0/README.md | 運用ルール |
| docs/mockups/v1.0/docs/principles.md | 設計原則 + PR チェックリスト |
| docs/mockups/v1.0/docs/display-schema.md | 14 作業の入力 → チップ → PDF → CSV 表示スキーマ |
| docs/mockups/v1.0/wireframes/ | HTML 4 + jsx 9 + tokens.css |
| docs/mockups/v1.0/app.sqlite | OpenDesign チャット履歴 (.gitignore 除外、sqlite3 で参照) |
| docs/adr/ADR-0020 | 画面マップ (実装側ルート ↔ mockup 画面) |
| docs/adr/ADR-0021 | UI 差分検出パイプライン |
| docs/adr/ADR-0021 Notes Amended | OpenDesign 出力を比較対象として参照 (PR #267) |
| docs/adr/ADR-0009 | RevenueCat 課金 (ビジネス仕様、絶対上位) |
| docs/adr/ADR-0010 | AdMob (ビジネス仕様、絶対上位) |
| docs/adr/ADR-0011 | 記録のみ哲学 (ビジネス仕様、絶対上位) |
| docs/adr/ADR-0017 | Privacy / ATT / UMP (ビジネス仕様、絶対上位) |
| docs/adr/ADR-0015 | テーマ (design_system.md と整合) |
| docs/reference/design_system.md | tokens / フォント / 角丸 (ADR-0015 確定済) |
| .claude/recurrence-prevention.md | 行動ルール R-1〜R-28 |
| scripts/git/start-pr.sh + end-pr.sh | 他者 M 自動 stash/pop |
| scripts/ci/wait-for-pr.sh | CI polling + flake 自動 rerun (絶対パス使用必須) |
| scripts/ui-diff/ | UI 差分検出パイプライン |
| scripts/maestro-flow-lint.mjs | Maestro 2.0 構文 lint (verify:maestro ゲート) |

# 進め方ルール (11 厳守事項)
1. R-17 4 段階厳守: TaskCreate → 計画 → 承認 → 実行
2. R-27 既存実装確認: ui-diff 結果分析の前段で必ず Glob/Grep/Read
3. R-22 exit code 保全: background 実行時は `> /tmp/log; echo EXIT=$?; tail -50 /tmp/log`
4. R-1 一括処理確認: sed/Python 後は grep + Read + git diff
5. R-15 ハング判定: 30 秒以上応答ないなら即報告
6. 絶対パス使用: ci/wait-for-pr.sh / git/{start,end}-pr.sh
7. 都度報告モード: 各 Step 完了で 1〜3 行報告、R-14 やさしい言い換え併記
8. 1 セッション 1 画面: 最大 3 PR で完了
9. R-10 ペルソナ評価: 4 ペルソナで評価、1 人でも ✕ なら再検討
10. R-28 境界判定: ビジネス仕様 (Pro / 課金 / プライバシー / 法令) は ADR が絶対上位
11. R-25 drift 検出: tokens.css 値 → constants/ 必須、ハードコード禁止

# Step 1〜11 の詳細は標準版を参照

# 禁止事項
- いきなりコード編集 (R-18: Read → Edit 厳守)
- いきなり pnpm add (明示承認後)
- 破壊的コマンド (rm -rf / git reset --hard / push --force / --no-verify / git stash drop)
- 新規 Maestro flow で 1.x 構文 (steps: / assertVisible.timeout / waitForAnimationToEnd)
- ADR-0009/0010/0011/0017 のビジネス仕様変更 (R-28 ガード)
- docs/mockups/v1.0/ 直接編集 (凍結保管)
- mockups jsx の直 import (Web 向け、RN 非互換)
- tokens.css 値を hardcode (constants/ に必ず通す、R-25)
- 「次は気をつけます」で済ます (3 件以上発生したら仕組化、R-24)
- lessons.md / recurrence-prevention.md を行数制限超で肥大化 (R-24)

# 期待アウトプット
1. 4 ステップパイプライン完走 (capture-app + capture-design + compare + report)
2. 5 画像 Read で確認 → 差分を report.md に追記、データ問題 vs 実装問題分類
3. 本物の実装問題のみ Issue 起票 (R-27 / ISSUE_TEMPLATE 準拠)
4. P1 から順に実装 PR、各 PR を verify 全 11 ゲート緑 → squash merge → main 同期
5. ADR-0020 §Notes §画面マップ更新 (整合済マーク)
6. 新しい罠 → 別 PR で仕組化 (scripts/ または lessons § 追加、R-24)
7. セッション終了時に /session-end で Engram session_summary 保存


スタートしてください。
```

---

## 流れ図 (各ステップの役割を可視化)

```
ユーザー: 「P-12 で <画面名> を実装」
        ↓
Claude Code が P-12 を Read
        ↓
┌─ Step 1: P-09/P-11 判定 ──────────────────────────────┐
│ app/<screen> ある？ + maestro/flows/ui-diff/ ある？        │
│ + SCREEN_PAIRS エントリ ある？                              │
│ ┌─ 3 つ全部「ある」 → P-09 (差分修正)                      │
│ ├─ app 実装のみ「ある」 → P-09 + 準備 PR 必要              │
│ └─ 全部「ない」 → P-11 (新規実装)                          │
└────────────────────────────────────────────────────────┘
        ↓
Step 2: コンテキスト把握
  - docs/mockups/v1.0/README + principles.md + display-schema.md
  - wireframes/<screen>.html + jsx + tokens.css
  - ADR 0020/0021/0009/0010/0011/0017/0015
  - recurrence-prevention.md R-1〜R-28
  - 既存実装の Glob/Grep (R-27)
        ↓
Step 3: R-17 4 段階
  TaskCreate → 計画提示 → 承認待ち → 実行
        ↓
Step 4: 準備 PR (必要なら)
  SCREEN_PAIRS + Maestro flow 新規作成 → verify → PR → CI → merge
        ↓
Step 5: 環境前提チェック
  Node v22 / adb / Metro / Playwright / ImageMagick / mockups root
        ↓
Step 6: ui-diff pipeline 実行
  preflight → capture-app + capture-design → compare → report
        ↓
Step 7: 差分分析 (R-27 + 4 ペルソナ)
  ┌─ 既存実装あり、ロジック OK
  │  ├─ DB データ無し → データ問題 (Issue 起票せず)
  │  └─ DB データあり → 設定問題
  ├─ 既存実装あり、ロジック未実装 → 拡張 Issue
  └─ 既存実装なし → 新規実装 Issue
        ↓
Step 8: 修正 PR (実装問題のみ)
  start-pr.sh → jsx→RN 変換 → tokens→constants → i18n 19 言語 →
  Maestro 更新 → verify → push → PR → wait-for-pr.sh (絶対パス) →
  squash merge → end-pr.sh
        ↓
Step 9: ADR-0020 §Notes §画面マップ更新 (軽量 PR)
  該当 row 「整合済 (PR #N1/#N2)」マーク
        ↓
Step 10: Issue 起票 (スコープ外、R-27 確認結果を本文に貼る)
        ↓
Step 11: /session-end (Engram session_summary 保存)
```

---

## Claude Code の力を引き出す 3 つのコツ

1. **既存資産を明示する** — `docs/mockups/v1.0/` や R-27 / R-28 を書くだけで、Claude Code は重複実装を避け最短経路を選ぶ。「見つけてください」より「これを使ってください」のほうが効く。
2. **R-28 境界判定を必ず通す** — UI 表現か ビジネス仕様かを毎回判定、迷ったら即停止 + ユーザー質問 (F-10 撤回事例の再発防止)。
3. **報告モードを最初に決める** — 「都度報告」「最後に報告」「Step ごと」のどれかを冒頭で固定。途中で変わると context が消費される。

---

## コマンド辞典 (やさしい解説 + 役割 + 失敗例)

### 🌿 ブランチ管理コマンド

#### `bash scripts/git/start-pr.sh <branch>`

- **やさしい解説**: 「これから作業するためのブランチを作る + 邪魔な変更を一旦よけて (stash) おく」
- **役割**: ブランチ作成 + 既存の他者 M ファイル (例: P-00_ux-simulation.md) を `session-pre-existing` stash で退避
- **例**: `bash scripts/git/start-pr.sh feat/onboarding-welcome`
- **失敗例**: staged changes が残っているとエラー → `git diff --cached` で確認、commit / unstage して再実行

#### `bash /home/doooo/04_app-factory/apps/BonsaiLog/scripts/git/end-pr.sh <branch>`

- **やさしい解説**: 「作業ブランチを片付けて main に戻し、よけてた変更 (stash) を戻す」
- **役割**: main checkout + pull --ff-only + ローカル branch 削除 + stash pop
- **例**: `bash scripts/git/end-pr.sh feat/onboarding-welcome`
- **失敗例**: stash pop で conflict → 手動解決、`git stash drop` 禁止

### 🔍 検証コマンド

#### `pnpm verify`

- **やさしい解説**: 「アプリが壊れていないか 11 個の検査を全部走らせる」
- **役割**: lint / type-check / format / test / i18n / config / docs / template / theme / a11y / maestro
- **緑なら**: コードに問題なし、push OK
- **赤なら**: 失敗したゲート別に対処
- **注意**: WSL2 で v18 が引かれることがある → `PATH=/home/doooo/.nvm/versions/node/v22.22.2/bin:$PATH` を prepend

#### `pnpm exec tsx scripts/ui-diff/run.ts <screen-id>`

- **やさしい解説**: 「実機とお手本のスクショを撮って差分画像を生成する 4 ステップ自動実行」
- **役割**: preflight → capture-app + capture-design → compare (ImageMagick) → report (Markdown)
- **例**: `pnpm exec tsx scripts/ui-diff/run.ts onboarding-welcome`
- **前提**: Node v22 / adb / Metro / Playwright / ImageMagick / mockups v1.0
- **失敗例**: preflight が止めたら hint に従う (例: Metro 起動不足 → `pnpm dev` 別ターミナル)

### 🚀 GitHub PR / Issue コマンド

#### `gh pr create --title "..." --body "$(cat <<'EOF' ... EOF)"`

- **やさしい解説**: 「GitHub に新しい PR を作成する」
- **役割**: PR タイトル + 本文 (HEREDOC でフォーマット保持) で作成、URL 返却
- **Test plan / Related セクション必須**

#### `bash /home/doooo/04_app-factory/apps/BonsaiLog/scripts/ci/wait-for-pr.sh <pr-number>`

- **やさしい解説**: 「GitHub Actions の CI が緑になるまで自動で待つ + 一時失敗 (flake) を自動 rerun」
- **役割**: gh pr checks の polling、失敗時 retry 判定
- **注意**: ⚠️ **絶対パス使用必須** (相対パスで cwd エラー exit 127 事例あり)

#### `gh pr merge <pr-number> --squash --delete-branch`

- **やさしい解説**: 「PR を squash (コミットを 1 つにまとめて) main に取り込む + 作業ブランチを GitHub からも削除」
- **役割**: squash merge + remote branch 削除
- **注意**: CI 緑前は merge しない

#### `gh issue create --title "..." --body "..."`

- **やさしい解説**: 「GitHub に新しい Issue を作成する (TODO 記録)」
- **役割**: スコープ外実装、Follow-up、bug report の記録

---

## よくある質問

### Q. 対応表に無い画面を比較したい

A. `scripts/ui-diff/config.ts` の `SCREEN_PAIRS` に新エントリを追加 + `maestro/flows/ui-diff/<screen-id>.yml` を新規作成。本 P-12 の対応表にも追記。Claude Code に「対応表に追加して、〇〇画面を比較したい」と言えば自動で行う (Step 4 準備 PR で対応)。

### Q. mockups の jsx をどう React Native に変換する?

A. jsx は React.js Web 向け (HTML / className / inline style)。RN は ネイティブ View / StyleSheet / Themed components。**手作業で構造を写経 + StyleSheet.create で書き直す** のが業界標準 (OpenDesign は HTML/JSX 出力のみ、RN 直変換ツール無し)。

具体的:

- `<div>` → `<View>` (TouchableOpacity / SafeAreaView 等を場面で選ぶ)
- `<span>` / `<p>` → `<Text>` (ThemedText で colors/typography token 通す)
- `<img>` → `<Image>` (Expo Image 推奨)
- `className="..."` → `style={styles.foo}` (StyleSheet.create)
- inline style `{color: '#1F3A2E'}` → constants/colors.ts の BRAND_GREEN
- map list → FlatList / ScrollView (大量なら FlashList @shopify)
- onClick → onPress

### Q. mockups と ADR が矛盾したらどうする?

A. R-28 境界判定フロー:

- 法令 / 課金 / プライバシー / データ送信 → **ADR 絶対上位**
- 機能の有無 / Pro 限定 → **ADR 絶対上位**
- A11y / モーション / タイポ → **ADR + design_system.md**
- 見た目 / レイアウト / コピー → **mockups が正**
- 判断つかなければ即停止 + ユーザー質問

### Q. テスト盆栽データが薄い (差分の判別がつかない)

A. species / style / tags 入力済の盆栽を 1〜2 件、実機で手動作成してから再 PoC を実行する。データ問題と実装問題の混同を避けるため。将来 `scripts/ui-diff/seed-test-data.ts` で自動 seed 化候補。

### Q. 1 PR で複数画面いけるか?

A. 推奨は **1 PR = 1 画面** (本 P-12 1 セッション 1 画面厳守)。jsx → RN 変換 + i18n + Maestro で 200-500 行になり、レビュー困難。

例外: 関連性が極めて強い画面 (例: Onboarding 6 画面の遷移) は **1 セッション 1 画面 × 6 セッション** で順次対応。

### Q. 実装中に「実は P-09 で差分修正だった」と判明したら?

A. 即停止 + ユーザー報告。「Step 1 判定で P-11 にしたが、`app/<screen>` を再 Glob したら実装ファイル発見。P-09 + 準備 PR に切替えますか?」と質問。

### Q. preflight が止めたら?

A. hint に従って対処 (自分でデバッグせず指示通り):

- ADB unauthorized → 実機画面で「USB デバッグ許可」ダイアログを承認
- Metro server timeout → 別ターミナルで `pnpm dev` 起動 (WSL2 内、Windows 側 NG) + `adb reverse tcp:8081 tcp:8081`
- Playwright not installed → `pnpm exec playwright install chromium`
- ImageMagick not found → `sudo apt install imagemagick`
- mockups v1.0 root not found → `git status` 確認 + `git checkout docs/mockups/v1.0/`

### Q. Engram 保存がハングしたら?

A. 30 秒以上応答ないならハング扱い (R-15)。ユーザーに即報告し、手動記録 (commit メッセージ / PR 本文 / Issue 本文に決定事項を記載) で代替。

### Q. R-22 形式とは?

A. background でコマンド実行する時、exit code をパイプで隠蔽せず保全する形式:

```bash
# ✗ 悪い例 (exit code が tail の 0 で隠蔽される)
pnpm verify 2>&1 | tail -100

# ✓ 良い例 (exit code 保全 + 末尾ログ確認)
pnpm verify > /tmp/verify.log 2>&1; echo "EXIT=$?"; tail -50 /tmp/verify.log
```

### Q. 1 行版で起動した時に Claude Code が標準版 / 完全版を勝手に Read してくれる?

A. はい。1 行版「P-12 で <画面名>」を受け取ったら Claude Code は本ファイル (`docs/how-to/workflow/prompts/P-12_screen-implementation-cycle.md`) を Read して標準版相当の挙動を取る。

---

## 関連

- 起源: 2026-05-09 セッション (02-Home P-09 完遂後の改良版設計)
- 入力: `docs/mockups/v1.0/` (PR #269)
- 関連 ADR:
  - ADR-0020 (Claude Design 全面採用、画面マッピング表)
  - ADR-0021 + ADR-0021 Notes Amended (UI 差分検出パイプライン、OpenDesign 出力を比較対象として参照)
  - ADR-0009 (RevenueCat、ビジネス仕様、絶対上位)
  - ADR-0010 (AdMob、絶対上位)
  - ADR-0011 (記録のみ哲学、絶対上位)
  - ADR-0017 (Privacy / ATT / UMP、絶対上位)
  - ADR-0015 (テーマ、design_system.md と整合)
- 関連 P:
  - P-09 (UI diff、既存実装の差分修正、本 P-12 で統合)
  - P-11 (mockups から RN 実装、本 P-12 で統合)
  - P-10 (open-design 再開)
- 行動ルール: `.claude/recurrence-prevention.md` R-1〜R-28
- 技術 lesson: `docs/reference/tasks/lessons/wsl2-mobile.md` §1〜§6
- 仕組化 PR (本 P-12 起源): #271 (config.ts mockups v1.0 切替) / #272 (盆栽タブ複数選択) / #276 (ADR-0020 §画面マップ整合済)
- セッションサマリ: Engram `mem_context` で `bonsailog` プロジェクトを参照
