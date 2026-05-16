# Sess2 開始時 Claude Code プロンプト (2026-05-17 作成)

> **このドキュメントの使い方**: Sess2 を開始したら、下記の「📋 コピペ用 プロンプト」 セクションを **そのまま Claude Code に貼り付けて** ください。Sess1 の WIP 状態を Claude が即座に把握して PR-4 完遂に着手します。

---

## 📋 コピペ用 プロンプト (Sess2 で Claude Code に渡す)

```
Sess2 を開始します。Sess1 で WIP のまま残った PR-4 (Expo Dev Client FAB 非表示 + 古い flow 17 件修正 + 全 flow 再撮影) を完遂してください。

## 開始前必須作業

1. docs/handoff/sess1-progress-2026-05-17.md を Read で読み込む (Sess1 進捗詳細)
2. git status で WIP 状態確認 (branch: refactor/sess1-pr4-devclient-fab-disable-and-flow-fix)
3. mem_context で Engram 前回セッションの context 確認
4. adb devices で実機接続確認 (SX3LHMA362304722)
5. Metro 起動状況確認 (ps aux | grep -E 'metro|expo start')

## Sess2 タスク (順序付き、105-150 分想定)

### Step 1: NDK 26.1.10909125 ダウングレード (30-60 分)

(a) Android Studio で SDK Manager 開く (GUI 操作、user 側)
    → SDK Tools タブ → NDK (Side by side) → 26.1.10909125 にチェック → Apply で install
    (10-15 分かかる)

(b) android/build.gradle に 1 行追加 (Expo prebuild 後に android/ dir 生成、要 prebuild 先行)
    android {
      ndkVersion = "26.1.10909125"
    }

(c) APK 再 build:
    SKIP_KEYS=1 corepack pnpm build:android:apk:local
    → dist/app-dev.apk が生成 (10-15 分)

(d) 実機 install:
    adb install -r dist/app-dev.apk
    → 起動して右上の歯車マーク (⚙) が消えることを確認

### Step 2: 全 flow 再撮影 (30-45 分)

22 件の Maestro flow を順次実行、各 1 回反復 (R-30 緩和、user 指示)。
過去の batch script を参考に bash for loop で:
- 各 flow を maestro test で実行
- 成功時に adb shell screencap で SS 取得
- scripts/ui-diff/out/<TS>-batch/<flow>/<flow>.png に保存
- 失敗 flow は個別 retry

### Step 3: skip-list 一括更新 + HTML レポート再生成 (10 分)

(a) skip-list achieved の artifact path を新 batch dir に統一 (node script、PR-3 で使ったものを再利用)

(b) HTML ペアリングレポート再生成:
    pnpm ui-diff:pairing-report
    → scripts/ui-diff/out/pairing-report.html

### Step 4: user 視覚確認待ち

ブラウザで pairing-report.html を開いて確認:
- 歯車マーク (⚙) が実機 SS から消えているか
- 全 flow の撮影品質が改善されているか
- 整合済件数の更新

### Step 5: pnpm verify + commit + push + PR + CI watch + merge (20 分)

(a) pnpm verify > /tmp/sess2-verify.log 2>&1 (background、R-22 厳守)
(b) commit (HEREDOC + Co-Authored-By: Claude Opus 4.7)
(c) git push -u origin HEAD
(d) gh pr create --title "..." --body "..."
(e) gh pr checks <PR#> --watch (background)
(f) merge (squash + delete-branch)

### Step 6: Sess2 検証 + Engram session_summary (15 分)

(a) 整合済件数確認 (期待: 25-27/39 = 64-69%、MVP 通過)
(b) Engram mem_session_summary 保存 (R-19 1KB 以内、Goal / Discoveries / Accomplished / Next Steps)
(c) 残タスク handoff (Sess3 へ)

## ルール厳守

- R-13: /discuss 起動時は議論ラウンド数 + 質問数を冒頭予告
- R-14: user 「わからない」 発言時、専門用語に「やさしい言い換え」 併記
- R-17: 包括承認後も TaskCreate → 計画提示 → 承認 → 実行 の 4 段階厳守、各 PR 着手前に 1 文計画提示
- R-19: mem_save content ≤ 1KB
- R-22: background pnpm verify の末尾に tail/pipe 禁止、grep -E '^EXIT=' で exit code 明示確認
- R-30 (Sess1 特例継承): 全 flow 再撮影は各 1 回 PASS で OK (user 指示)
- R-31: 新規 Maestro flow は _template.yml 準拠 + testID 事前 grep

## 半自走モード継続条件

- 各 PR 前 1 文計画 + 10 秒待機 (/tmp/claude-stop.flag 確認)
- user 「stop」 / 「待って」 で即停止
- scope 大幅変更時は user 再承認待ち

## 整合済目標

Sess1 終了: 20/39 = 51%
↓ + PR-4 完遂 (撮影品質 + 17 flow 整合)
Sess2 終了: 25-27/39 = 64-69% (MVP 25/39 = 64% 通過)

着手前に上記内容で進めて良いか確認してから (R-17 step 3 承認待ち)、step 1 から半自走モードで実行してください。
```

---

## 補足情報 (Sess2 で参照すべき)

### 既存の活用可能なスクリプト

| スクリプト                                       | 用途                                      | コマンド                      |
| ------------------------------------------------ | ----------------------------------------- | ----------------------------- |
| `scripts/ui-diff/generate-mockup-screenshots.ts` | mockup PNG 41 件全自動撮影 (Playwright)   | `pnpm mockup:screenshots`     |
| `scripts/ui-diff/generate-pairing-report.mjs`    | HTML ペアリングレポート生成 (mockup 主導) | `pnpm ui-diff:pairing-report` |
| `python3 -m http.server 8082`                    | mockup wireframe HTTP 配信                | `pnpm mockup:serve`           |

### Sess1 で確立した運用パターン

1. **半自走モード**: 各 PR 前 1 文計画 + 10 秒待機 + kill switch チェック
2. **R-22 verify exit code**: background command の末尾を `pnpm verify` 単体に、または `grep -E '^EXIT=' /tmp/log` で明示確認
3. **batch flow 再撮影**: bash for loop + 個別 retry (1 件失敗で全停止しない)
4. **HTML レポート user 視覚確認**: 重要決定は user に path 提供 + 視覚確認待ち
5. **scope 拡大時の R-17 厳守**: user 再承認待ち + 議論モード即停止 (案 Y)

### Sess1 で確認した重大事実

1. **Expo Dev Client FAB 非表示**: `app.config.ts` の plugin config `showFloatingButton: false` で永続無効化、ただし **APK 再 build 必須**
2. **NDK 27 linker error**: ld.gold が ARM64 (machine 183) 未対応 + LLVMgold.so 不在
3. **NDK 26.1.10909125** が「golden 版」 (RN 0.83-0.84 で安定動作報告多数、WeblineGlobal blog ソース)
4. **Expo SDK 56 (RN 0.85) は Q2 2026 stable 予定**: 機能向上目的の RN upgrade は Sess5+ 候補、本セッション対象外

### 失敗事例の教訓 (Sess1 で発生、Sess2 で繰り返さない)

| 事例                                                      | 学び                                                            |
| --------------------------------------------------------- | --------------------------------------------------------------- |
| `bonsai-select-mode.png` を `bulk` keyword grep で見逃し  | R-9: 既存ドキュメントを複数 keyword で検索、grep 結果は全件目視 |
| `pnpm verify` を末尾 tail で exit code 隠蔽               | R-22: background command 設計時に exit code 保全を冒頭で確認    |
| user 「不要なので削除」 を SS 削除と誤解 (本当は機能撤去) | R-14: ambiguous な指示は確認質問してから着手                    |
| `generate-mockup-screenshots.ts` の存在を見逃し           | R-9: scripts/ 配下を新規実装前に必ず grep                       |

---

## Sess1 で改訂した ADR / 設計書 (Sess2 開始時に Read 推奨)

1. `docs/adr/ADR-0018-onboarding-flow-integration.md` — Notes Amended (2026-05-16): 機能チュート 2 → 0 ステップ
2. `docs/adr/ADR-0020-claude-design-full-adoption.md` — Notes Amended (2026-05-16、v1.x-2): Onboarding 6 → 4 画面、41 → 39 分母再定義
3. `.claude/recurrence-prevention.md` (本ファイル、134 行に縮小) + `.claude/recurrence-prevention/specialized.md` (R-13〜R-31、新規 162 行)

---

🤖 Sess1 担当: Claude Opus 4.7 (1M context、effort xhigh)
📝 ハンドオフ作成日: 2026-05-17
