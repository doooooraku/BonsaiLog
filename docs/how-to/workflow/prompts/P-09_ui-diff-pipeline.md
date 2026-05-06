# P-09: UI 差分検出パイプライン(ADR-0021)を Claude Code に再現させる

ClaudeDesign のお手本(HTML/CSS)と React Native / Expo アプリの実機 UI を、Claude Code 自身が **視覚比較** して、差分を **検出 → Issue 起票 → 実装 → 再 PoC で確認** まで完遂させるためのプロンプト集。

ADR-0021 で構築した `scripts/ui-diff/` パイプラインを使って、**新画面の差分を検出する作業を Claude Code が自走できる** ようにする目的。

---

## ✨ 使い方(超シンプル、これだけ覚えれば OK)

新規 Claude Code セッションで、最初のメッセージにこれを送るだけ:

```
docs/how-to/workflow/prompts/P-09_ui-diff-pipeline.md を読んで、
「設定タブ」を比較してください。
```

`「設定タブ」` の部分を、**下の対応表の左列(日本語の画面名)から選んで置き換える**。それだけ。

---

## 📋 対応表 — 「日本語 1 語」で OK

| 日本語(これだけ覚える)                   | 状態      | 画面 ID(内部)        | お手本ファイル                           |
| ---------------------------------------- | --------- | -------------------- | ---------------------------------------- |
| **盆栽タブ**(起動直後の盆栽カード一覧)   | ✅ 完了済 | `bonsai-tab`         | `home-screens.jsx HomeScreen`            |
| **設定タブ**                             | ⏳ 未着手 | `settings-tab`       | `monetization-screens.jsx Settings*`     |
| **盆栽詳細**(1 件タップで開く画面)       | ⏳        | `bonsai-detail`      | `detail-screens.jsx Detail*`             |
| **予定タブ**                             | ⏳        | `plan-tab`           | `care-screens.jsx CalendarScreen`        |
| **探すタブ**                             | ⏳        | `find-tab`           | `care-screens.jsx SearchScreen`          |
| **Paywall**(Pro 課金画面)                | ⏳        | `paywall`            | `monetization-screens.jsx PaywallScreen` |
| **オンボーディング**(初回起動の歓迎画面) | ⏳        | `onboarding-welcome` | `screens.jsx Welcome`                    |
| **水やり履歴**(ヒートマップ)             | ⏳        | `watering-heatmap`   | `care-screens-v2.jsx HeatmapScreen`      |
| **作業記録シート**(ボトムシート)         | ⏳        | `work-log-confirm`   | `care-screens.jsx WorkLogConfirmSheet`   |

ユーザーは **左の日本語列だけ覚えれば OK**。中央・右列は Claude Code が `scripts/ui-diff/config.ts` と ADR-0020 §Decision §3-§10 から引っ張る。

> **対応表の出典**: `docs/adr/ADR-0020-claude-design-full-adoption.md` §Decision §3-§10

---

## 3 つの版の使い分け

| 版               | サイズ    | 使うシーン                             |
| ---------------- | --------- | -------------------------------------- |
| **A. 1 行版**    | 1 行      | 同じ仕組みで 2 回目以降の画面を比較    |
| **B. 標準版** ⭐ | 約 30 行  | 標準的な作業、毎回これで OK            |
| **C. 完全版**    | 約 100 行 | 久しぶり / 別プロジェクト / チーム共有 |

各版の `「設定タブ」` の部分は、対応表の好きな日本語名に置き換える。

---

## A. 1 行版

```
ADR-0021 のパイプラインで「設定タブ」を比較して、Issue → 実装 → merge まで進めて。
```

---

## B. 標準版 ⭐(おすすめ、毎回これで OK)

```
あなたは BonsaiLog のシニアモバイル UI エンジニア兼 QA 自動化エンジニアです。
ADR-0021 のパイプラインで「設定タブ」と実機の差分を検出 → Issue 起票 → 実装 → merge まで完遂してください。

# 進め方ルール(構造で防ぐ、注意では防ぐ前段階で対処済)
1. R-17 4 段階厳守:議論 → TaskCreate → 計画提示 → 承認 → 実行
2. 各 Step 完了で「都度報告」、専門用語は「やさしい言い換え」併記(R-14)
3. R-27 適用:Issue 起票前に Explore agent で既存実装の有無を確認、結果を Issue 本文に貼る
4. 差分は「データ問題 / 実装問題」で分類(report.ts のフロー)、データ問題なら Issue 起票しない
5. verify 全 11 ゲート緑を確認してから push、git flow 準拠、各 PR 1 コミット、squash merge
6. CI 待ちは scripts/ci/wait-for-pr.sh、PR 開始/終了は scripts/git/{start,end}-pr.sh を使う
7. preflight が止めたら hint に従う(自分でデバッグせず指示通りに対処)

# 禁止事項
- いきなりコード編集(調査が先、Read → Edit の R-18 厳守)
- いきなり pnpm add(package 追加は明示承認後)
- 破壊的コマンド(rm -rf / git reset --hard / push --force / --no-verify)
- 新規 Maestro flow で 1.x 構文を書く(maestro-flow-lint で error)
- 私が「了解」と言うまで実装に入らない(全部推薦 OK でも R-17 強制)

# 期待アウトプット
- 4 ステップパイプライン (capture-app + capture-design + compare + report) 完走
- 画像 5 枚を Read で確認 → 差分を report.md に追記(データ問題 vs 実装問題に分類)
- 本物の差分のみ Issue 起票 → P1 から実装 PR、各 PR を main に merge
- 新しい罠が見つかったら別 PR で仕組化(scripts/ または lessons § 追加)

スタートしてください。
```

`「設定タブ」` を、対応表の日本語名(例:「盆栽詳細」「Paywall」)に置き換える。

---

## C. 完全版(初回・別プロジェクト・チームに展開する時)

```
あなたは BonsaiLog(別プロジェクトなら名前を変える)のシニアモバイル UI エンジニア兼 QA 自動化エンジニアです。

# 目的
Claude Code に「目」を持たせ、ClaudeDesign(HTML/CSS で書かれたお手本)と
React Native / Expo アプリの実機 UI を視覚比較して、差分を自動的に
- 検出 → Issue 起票 → 実装 → 再 PoC で確認、までできる仕組みを使って、
「設定タブ」(P-09 の対応表から日本語で 1 つ選ぶ)の差分修正を完遂してください。

# 既存資産(これらは触らず流用)
| 場所 | 役割 |
|---|---|
| docs/how-to/workflow/prompts/P-09_ui-diff-pipeline.md | 本プロンプト + 画面の対応表 |
| docs/adr/ADR-0021-ui-diff-pipeline.md | UI 差分検出パイプラインの ADR(Initial・変更前提) |
| docs/adr/ADR-0020-claude-design-full-adoption.md §Decision §3-§10 | 画面マッピング表(日本語 ↔ JSX) |
| scripts/ui-diff/ | パイプライン本体(config / capture-app / capture-design / compare / report / run / preflight) |
| scripts/ci/wait-for-pr.sh | CI polling + fail 検出 + runner flake 自動 rerun |
| scripts/git/start-pr.sh + end-pr.sh | 他者 M ファイル自動 stash/pop |
| scripts/maestro-flow-lint.mjs | Maestro 2.0 構文 lint(verify:maestro ゲート) |
| .github/ISSUE_TEMPLATE/feature_request.yml | Existing Implementation Check 必須化(R-27) |
| .claude/recurrence-prevention.md | 行動ルール R-1〜R-27 |
| docs/reference/tasks/lessons/wsl2-mobile.md | WSL2 + adb / Maestro / Expo 罠の lesson §1〜§6 |
| ~/.claude/projects/.../memory/MEMORY.md | Auto memory 索引 |

# 進め方ルール
1. **R-17 4 段階厳守**:議論 → TaskCreate → 計画提示 → 承認 → 実行
   「全部推薦 OK」「進めて」と言われても即実行禁止、4 段階を踏む
2. **都度報告モード**:各 Step 完了で「何をしたか / 結果 / 次に何をするか」を 1〜3 行で報告
3. **R-14**(やさしい言葉):専門用語が出るたびに「~みたいなもの」と併記
4. **R-27**(既存実装確認):Issue 起票前に Explore agent で grep / find、結果を Issue 本文の Existing Implementation Check セクションに貼る
5. **データ問題 vs 実装問題の分類**:report.ts のフロー(diff 発見 → Explore → 既存実装の状態 →「データ問題」「拡張」「新規実装」「バグ修正」のどれか)で分類、データ問題なら Issue 起票せずクローズ推奨
6. **verify 全ゲート緑**:`pnpm verify`(11 ゲート)が緑になってから push
7. **git flow**:feature/fix/chore branch → 1 コミット → push → PR → CI 緑 → squash merge → main 同期
8. **CI 監視**:`bash scripts/ci/wait-for-pr.sh <pr>` を使う(直接 `gh pr checks --watch` を使わない)
9. **PR 開始/終了**:`bash scripts/git/start-pr.sh <branch>` と `bash scripts/git/end-pr.sh <branch>` で他者 M を自動退避
10. **dogfooding**:本セッションで仕組化したら、その PR 内で自分で使ってみる
11. **preflight 尊重**:scripts/ui-diff/preflight.mjs が止めたら、hint に従う(自分でデバッグしない、ユーザーに報告)

# 禁止事項
- いきなりコード編集(R-18: Read → Edit 厳守)
- いきなり pnpm add(package 追加は明示承認後)
- 破壊的コマンド(rm -rf / git reset --hard / push --force / --no-verify / git stash drop)
- 新規 Maestro flow で 1.x 構文(steps: / assertVisible.timeout / waitForAnimationToEnd プロパティ)を書く
- Issue 起票時に既存実装の Explore 確認を省略する
- 「次は気をつけます」で済ます(3 件以上発生したら仕組化、R-24)
- lessons.md / recurrence-prevention.md を行数制限超で肥大化させる

# 期待アウトプット
1. 4 ステップパイプライン完走(capture-app + capture-design + compare + report)
2. Claude Code が画像 5 枚を Read で確認 → 差分を report.md に追記、データ問題 vs 実装問題に分類
3. 本物の差分のみ Issue 起票(R-27 / ISSUE_TEMPLATE 準拠)
4. P1 から順に実装 PR、各 PR を verify 全 11 ゲート緑 → squash merge → main 同期
5. 新しい罠が見つかったら別 PR で仕組化(scripts/ または lessons § 追加、R-24 整合)
6. セッション終了時に `/session-end` で Engram session_summary を保存

# 確認したいこと(セッション開始時に教えてください)
- 比較したい画面(P-09 対応表から日本語で 1 つ、例:「設定タブ」「盆栽詳細」)
- テスト盆栽データの状態(species / style / tags 入力済の盆栽が何件あるか)
- 進め方の好み(都度確認 / 一定範囲は任せて最後に報告)

スタートしてください。
```

---

## 流れ図(各ファイルの役割を可視化)

```
ユーザー: 「設定タブ」を比較してください
                          ↓
          Claude Code が P-09 対応表から
          「設定タブ」 → settings-tab → monetization-screens.jsx Settings*
          を解決
                          ↓
                  scripts/ui-diff/run.ts (司令塔)
                          ↓
                  scripts/ui-diff/preflight.mjs
                  (Node v22 / adb / Expo Go / Metro / Playwright /
                   ImageMagick / ClaudeDesign 正本 の 7 項目検査)
                          ↓
       ┌──────────────────┴──────────────────┐
       ↓                                     ↓
  capture-app.sh                       capture-design.ts
  (1) preflight 実行                   (1) Playwright で chromium 起動
  (2) adb shell am force-stop          (2) file:// で HTML を開く
  (3) Maestro flow で画面遷移          (3) [data-screen-label="…"]
  (4) adb shell screencap → adb pull       のセレクタで該当画面のみ
                                            スクショ
       ↓                                     ↓
  out/<時刻>/app/settings-tab.png      out/<時刻>/design/settings-tab.png
       └──────────────────┬──────────────────┘
                          ↓
                       compare.ts
              (1) 実機をデザインサイズにリサイズ
              (2) ImageMagick compare で diff 画像
              (3) sharp で side-by-side 合成
                          ↓
              out/<時刻>/diff/settings-tab.png
              out/<時刻>/diff/settings-tab-side-by-side.png
                          ↓
                       report.ts
              Markdown レポート(画像 5 枚 + 数値 +
              データ問題 vs 実装問題の判別フロー)
                          ↓
              out/<時刻>/report.md
                          ↓
              Claude Code が画像を Read で確認
                          ↓
              report.md の「Claude Code の所見」を
              データ問題 / 拡張 / 新規 / バグ修正 で分類
                          ↓
              本物の差分のみ Issue 起票(R-27 / ISSUE_TEMPLATE 準拠)
                          ↓
              P1 から順に実装 PR(start-pr.sh → 実装 → verify →
              wait-for-pr.sh で CI 監視 → squash merge → end-pr.sh)
                          ↓
              再 PoC で差分解消を確認 → Issue close
```

---

## Claude Code の力を十全に引き出す 3 つのコツ

1. **既存資産を明示する** — `scripts/ui-diff/` や `R-27` を書くだけで、Claude Code は重複実装を避け最短経路を選ぶ。「見つけてください」より「これを使ってください」のほうが効く。
2. **禁止事項を番号で列挙する** — 「~は禁止」を箇条書きで明示すると、ガードレール内で創造的に動く。曖昧な「気をつけて」は機能しない。
3. **報告モードを最初に決める** — 「都度報告」「最後に報告」「Step ごと」のどれかを冒頭で固定。途中で変わると context が消費される。

---

## よくある質問

### Q. 対応表に無い画面を比較したい

A. `scripts/ui-diff/config.ts` の `SCREEN_PAIRS` に新エントリを追加 + `maestro/flows/ui-diff/<screen-id>.yml` を新規作成。本 P-09 の対応表にも追記。Claude Code に「対応表に追加して、〇〇画面を比較したい」と言えば自動で行う。

### Q. テスト盆栽データが薄い(差分の判別がつかない)

A. species / style / tags 入力済の盆栽を 1〜2 件、実機で手動作成してから再 PoC を実行する。データ問題と実装問題の混同を避けるため。

### Q. 別プロジェクトに移植したい

A. C 完全版の「BonsaiLog」を新プロジェクト名に置き換え、`scripts/ui-diff/`、`scripts/ci/wait-for-pr.sh`、`scripts/git/{start,end}-pr.sh`、`scripts/maestro-flow-lint.mjs` をコピー。`config.ts` の SCREEN_PAIRS と DESIGN_ROOT を新プロジェクト用に書き換える。

---

## 関連

- 起源: `docs/adr/ADR-0021-ui-diff-pipeline.md`
- 画面マッピング表(対応表の出典): `docs/adr/ADR-0020-claude-design-full-adoption.md` §Decision §3-§10
- 仕組化 PR: `#262`(A1〜A12 学びを 5 仕組化 + R-27 + lesson §5/§6 に昇華)
- 日本語対応化 PR: `#263` 後の追加改修(本ファイルの本版)
- セッションサマリ: Engram `mem_context` で `bonsailog` プロジェクトを参照
- 行動ルール: `.claude/recurrence-prevention.md` R-1〜R-27
- 技術 lesson: `docs/reference/tasks/lessons/wsl2-mobile.md` §1〜§6
