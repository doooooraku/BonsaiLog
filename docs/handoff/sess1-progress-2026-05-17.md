# Sess1 進捗ハンドオフ (2026-05-16 〜 2026-05-17)

> **このドキュメントの読み方**: Sess1 (本セッション) で何ができたか、何ができていないかを誰にでもわかるように書きました。次のセッション (Sess2) の Claude / 自分が読んで状況を即把握できるよう、専門用語には「やさしい言い換え」 を併記しています。

---

## 1 行サマリ

本セッションで **5 PR merge + 1 PR (PR-4) WIP** (作業途中、コミット未提出)。整合済 18/41 → **20/39 = 51%** (案 Q で tut1/tut2 撤去、分母 41 → 39 に再定義)。次セッション (Sess2) では **NDK ダウングレード + PR-4 完遂** で歯車除去 + 全 flow 再撮影、MVP 25/39 = 64% 通過を目指す。

---

## このプロジェクトのゴール (再確認)

### 全体像 (絵)

```
お手本 39 画面 (デザイナーが描いた絵)
        ←  比べる  →
実機の画面 39 枚 (スマホで動いてるアプリのスクショ)
        ↓
「同じ」 と判定できれば「整合済」、できなければ「未整合」
        ↓
全 39 画面が「整合済」 になればゴール (= 39/39 = 100%)
```

### 重要数字

| 名前                    | 意味                           | 値               |
| ----------------------- | ------------------------------ | ---------------- |
| 最終ゴール              | 全画面 100% 整合               | **39/39 = 100%** |
| MVP (通過点)            | 最低限ストアで売り出せるライン | **25/39 = 64%**  |
| Sess1 開始時            | 前セッション最終状態           | 18/41 = 44%      |
| **Sess1 終了時 (現在)** | 本セッション末                 | **20/39 = 51%**  |

---

## 進捗バー

```
[████████████████████░░░░░░░░░░░░░░░░░░░] 51% (20/39)
                    ↑ 現在地
                                  ↑ MVP 25/39 = 64% (あと 5 画面)
                                                       ↑ 100% (39/39)
```

→ MVP まで **あと 5 画面**、本来 Sess2 内で達成見込み (PR-4 完遂で +6-7 件)。

---

## やったこと (5 PR merge + 1 PR WIP)

### ✅ PR-pre1 (#529) ─ 古い問題 2 つの大掃除

**例え話**: 整理整頓されていない引き出し (ルールファイルが太りすぎ) と、古い書き方になっていたテストロボットの設定書を、一気に整理。

| やった作業                                   | 中身                                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------------ |
| 設計ルールのファイル分割                     | 261 行 → 134 行 (中身を別ファイル `specialized.md` に分割)                           |
| テストロボットの設定書 26 枚を新書き方に修正 | `- waitForAnimationToEnd:\n    timeout: 5000` → `- waitForAnimationToEnd` (引数なし) |
| 削除合計                                     | 774 行削除、504 行追加                                                               |

**コマンド説明**:

- `perl -i -0pe 's/.../.../g'` = ファイル内の特定パターンを一気に置き換える命令 (Python の sed みたいなもの)
- `corepack pnpm verify` = アプリ全体のチェック (lint / 型 / format / test / i18n / docs 等 15 種類) を一気に実行

### ✅ PR-1 (#530) ─ データの矛盾と仕様書のズレを修正

| やった作業                                                | 中身                                                                                   |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| skip-list の二重管理解消                                  | 同じ画面が「整合済」 と「失敗」 で同時登録されていた問題 (home-bulk-sched-date) を削除 |
| 仕様書 (functional_spec.md) の formSheet → modal 書き換え | 4 行修正 (`(sheets)/work-type formSheet` → `(modals)/work-picker modal`)               |

**コマンド説明**:

- `grep -i 'formSheet' docs/reference/functional_spec.md` = ファイル内で「formSheet」 という単語が残っていないか検索 (大文字小文字を区別しない `-i`)

### ✅ PR-2 (#532) ─ Onboarding 通知画面 (tut5) の整合

**例え話**: テストロボットが「次の画面で A が出ると思って待っていた」 が、実は B が先に出ていた = **待つ場所を間違えていた**。

| やった作業                                | 中身                                                                                                                         |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Issue #526 真因確定 (コード Read で 5 分) | `ONBOARDING_STEP_ORDER`: welcome → language → **tut5 (Notification)** → tut1 → tut2 (Language Next 後は tut5、tut1 ではない) |
| `onboarding-notification.yml` 新規作成    | Maestro 2/2 PASS、R-25 構造系 4 項目評価通過                                                                                 |
| 整合済 +1 (Notification 通知画面)         | 18/41 → 19/41 = 46%                                                                                                          |

### ✅ PR-2.5 (#533) ─ 機能チュート (tut1/tut2) の完全撤去 ★大規模

**例え話**: アプリの説明書きを「最初の盆栽を追加しましょう」 「樹種を登録しましょう」 と書いてあるページごと**ゴミ箱に捨て**、設計書もそれに合わせて書き換え。

| やった作業                                     | 中身                                                                                                              |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| アプリのコード 4 ファイルから tut1 / tut2 削除 | tutorialSteps.ts / onboardingFlow.ts / onboardingStore.ts / [step].tsx                                            |
| 19 言語の翻訳ファイル × 4 個の翻訳削除         | 合計 **112 行削除** (`onboardingTut1Title` / `onboardingTut1Body` / `onboardingTut2Title` / `onboardingTut2Body`) |
| 設計書 (ADR-0018 / ADR-0020) 改訂              | Onboarding 8 → 6 → **4 画面**に縮小 (Splash + Welcome + Language + Notification)                                  |
| Issue #531 close                               | 機能撤去で mockup HTML 作成不要                                                                                   |
| 41 → 39 分母再定義 (案 Q)                      | MVP 25/39 = 64% に改訂                                                                                            |

**コマンド説明**:

- `perl -i -0pe 's/^ {2}onboardingTut[12](Title|Body):[^\n]*\n( {4}[^\n]*\n)*//gm'` = 19 言語ファイルから 4 keys を一気に削除 (Body が複数行に渡る場合も対応)

### ✅ PR-3 (#534) ─ お手本確認の「見える化」 ★今日完成

**例え話**: バラバラに置かれた写真 41 枚を「アルバム」 にきれいに並べて、横に実機の写真 (撮れているもの) を貼って、「同じか?」 確認しやすくした。

| やった作業                                | 中身                                                                                          |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| HTML ペアリングレポート機構 v2 新規実装   | `scripts/ui-diff/generate-pairing-report.mjs` (mockup 主導、41 件全件表示)                    |
| 並び順整理                                | 01-Onboarding → 02-Home → 04-Export → 05-Monetization (HTML グループ別)                       |
| multi-page 表示                           | `<id>-01.png` / `-02.png` / `-03.png` を全部縦並び inline 表示 (スクロール画面の全体把握可能) |
| 9 件 mockupFile 紐付け追加                | config.ts で「お手本ファイル名」 を明示指定                                                   |
| bonsai-select-mode 新規整合 (+1 件整合済) | 盆栽選択モード画面、Maestro 2/2 PASS + R-25 評価通過                                          |
| 5 区分 status                             | ✅ 整合済 / ⚠️ 要再評価 / ⏸️ 永続 skip / 🟡 未測定 / 📋 mockup-only                           |
| ATT/UMP は強制 mockup-only                | ADR-0017 (OS 標準ダイアログ採用、自前画面なし) と整合                                         |
| mockup HTTP server 機構追加               | `pnpm mockup:serve` で `http://localhost:8082/01-Onboarding.html` でブラウザ閲覧可能          |
| package.json に 3 scripts                 | mockup:serve / mockup:screenshots / ui-diff:pairing-report                                    |

**コマンド説明**:

- `python3 -m http.server 8082 -d docs/mockups/v1.0/wireframes` = 簡易 web サーバを起動 (port 8082、wireframe フォルダを公開)
- `pnpm mockup:screenshots` = Playwright + chromium-headless で 41 mockup 画面を自動撮影

### 🔄 PR-4 (WIP、コミット未提出) ─ 歯車除去 + 古い flow 修正 ★中途半端

**例え話**: 古い掃除機 (linker = ld.gold) で最新型のごみ袋 (ARM64) を取り付けようとしたら、掃除機が形を理解できず作業失敗。次セッションで掃除機を新しいバージョン (NDK 26.1) に買い換えて再挑戦。

| やった作業                                                          | 状態                                                                                                                                |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| ① `app.config.ts` に `showFloatingButton: false` plugin config 追加 | ✅ 完了 (untracked)                                                                                                                 |
| ② 古い flow 6 件を新設計に追従 rewrite                              | ✅ 完了 (bonsai-tab / look-back-tab / settings-tab / look-back-search / home-bulk-sched-work / bonsai-detail-edit-sheet、untracked) |
| ③ 残 11 件 flow から撤去済 tut1/2/3/4 step 削除 (220 行削除)        | ✅ 完了 (perl 一括処理)                                                                                                             |
| ④ APK 再 build                                                      | ❌ **失敗** (NDK 27 + ld.gold linker error、環境問題)                                                                               |
| ⑤ 全 flow 再撮影                                                    | ❌ 未実施                                                                                                                           |
| ⑥ HTML レポート最新化                                               | ❌ 未実施                                                                                                                           |
| ⑦ commit + push + PR                                                | ❌ 未実施 (WIP のまま)                                                                                                              |

---

## できていないこと (Sess2 で対応)

### 1. NDK ダウングレード (Sess2 最優先 step)

**現状の問題** (誰でもわかる説明):

```
スマホアプリの C++ 部分をコンパイル後、組み立て担当 (linker = ld.gold) が
最新スマホ (ARM64) の形式を理解できず、組み立て失敗。
```

**修復方法 (1 行設定)**:

1. Android Studio で「Android SDK Manager」 を開く
2. 「SDK Tools」 タブで **NDK 26.1.10909125** を install (10-15 分)
3. `android/build.gradle` に **1 行追加**: `ndkVersion = "26.1.10909125"`
4. APK 再 build (`pnpm build:android:apk:local`、10-15 分)

→ 合計 **30-60 分** で歯車マーク除去 + linker 修復完了。

### 2. 全 flow 再撮影 (Sess2、約 30 分)

22 件の Maestro flow を順次実行、各 1 回反復 (user 指示で R-30 緩和)。

### 3. 未測定 entry 18 件 (Sess3 以降)

mockup あるが SCREEN_PAIRS に未登録の画面:

- bonsai-tag-add (タグ追加モーダル)
- bonsai-empty (盆栽 0 件 Empty 状態)
- bonsai-detail-add-action / add-date / menu / pdf-lock (詳細画面の細かい部分)
- export-hub / options / progress / share / pdf-single / pdf-list (Export 系 6 件)
- monetization-backup / archive / archive-delete / home-ads (お金関連 4 件)

→ Sess3-7 で SCREEN_PAIRS 追加 + Maestro flow 新規 + R-25 評価。

### 4. 将来の機能向上 (Sess5+、Q2 2026 以降)

- **Expo SDK 56 (RN 0.85) upgrade**: SDK 56 stable release 後に計画
- 恩恵: 起動 1.7x 高速化 / TTI 797ms → 531ms / Hermes V1 / Jetpack Compose 安定
- 別 PR / 別計画 (歯車除去とは別目的)

---

## 課題の解消状況 (発生 / 解消 / 残存)

### 解消済 ✅ (本セッションで対処完了、9 件)

| #   | 課題                                                      | 解消方法                            |
| --- | --------------------------------------------------------- | ----------------------------------- |
| 1   | R-24 違反 (recurrence-prevention.md 行数オーバー、261 行) | PR-pre1 でファイル分割 → 134 行     |
| 2   | Maestro 2.0 構文違反 (26 ファイル)                        | PR-pre1 で perl 一括修正            |
| 3   | Issue #526 真因不明                                       | PR-2 でコード Read で tut5 経路確定 |
| 4   | tut1/tut2 機能の必要性                                    | PR-2.5 で「不要」 確定 + 完全撤去   |
| 5   | mockup HTML が CORS でブラウザに出ない                    | PR-3 で HTTP server (port 8082)     |
| 6   | ペアリングレポート 18 件不足                              | PR-3 v2 で 41 件全件表示            |
| 7   | スクロール画面 2 枚目以降が出ない                         | PR-3 v2 で multi-page 縦並び        |
| 8   | 並び順がバラバラ                                          | PR-3 v2 で HTML グループ順          |
| 9   | ATT/UMP 表示方針                                          | PR-3 v2 で「📋 mockup-only」 ラベル |

### 残存 🟡 (Sess2 以降で対処)

| #   | 課題                                          | 対処予定                                  |
| --- | --------------------------------------------- | ----------------------------------------- |
| 1   | 歯車マーク (Expo Dev Client FAB) 撮影品質低下 | Sess2 で NDK ダウングレード + 再 build    |
| 2   | APK 再 build 失敗 (NDK 27 + ld.gold linker)   | Sess2 で NDK 26.1.10909125 ダウングレード |
| 3   | 17 件 flow 修正済だが commit 未提出 (WIP)     | Sess2 で再撮影完了後にまとめて commit     |
| 4   | 18 件未測定 entry (SCREEN_PAIRS 未追加)       | Sess3-7 で順次追加                        |
| 5   | Expo SDK 56 upgrade (RN 0.85)                 | Q2 2026 stable 後、別計画                 |

---

## 環境状態 (Sess2 開始時の前提)

### Git

| 項目                                   | 状態                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------- |
| 現在の branch                          | `refactor/sess1-pr4-devclient-fab-disable-and-flow-fix`                   |
| main 最新 commit                       | PR-3 (#534) merge 済                                                      |
| WIP file (commit していない、modified) | `app.config.ts` (plugin config 追加)、`maestro/flows/ui-diff/*.yml` 17 件 |
| WIP file (untracked、新規)             | なし                                                                      |

### 修正済 file 一覧 (WIP)

```
M  app.config.ts                                  # showFloatingButton: false 追加
M  maestro/flows/ui-diff/bonsai-tab.yml            # 完全 rewrite (新設計)
M  maestro/flows/ui-diff/look-back-tab.yml         # 完全 rewrite
M  maestro/flows/ui-diff/settings-tab.yml          # 完全 rewrite
M  maestro/flows/ui-diff/look-back-search.yml      # 完全 rewrite
M  maestro/flows/ui-diff/home-bulk-sched-work.yml  # 完全 rewrite
M  maestro/flows/ui-diff/bonsai-detail-edit-sheet.yml  # 完全 rewrite
M  maestro/flows/ui-diff/bonsai-detail-basic.yml   # tut1/2/3/4 削除 (20 行)
M  maestro/flows/ui-diff/home-bulk-sched-date.yml  # tut1/2/3/4 削除
M  maestro/flows/ui-diff/bonsai-detail.yml         # tut1/2/3/4 削除
M  maestro/flows/ui-diff/paywall.yml               # tut1/2/3/4 削除
M  maestro/flows/ui-diff/bonsai-detail-timeline.yml  # tut1/2/3/4 削除
M  maestro/flows/ui-diff/plan-tab.yml              # tut1/2/3/4 削除
M  maestro/flows/ui-diff/work-log-confirm.yml      # tut1/2/3/4 削除
M  maestro/flows/ui-diff/bonsai-create-sheet.yml   # tut1/2/3/4 削除
M  maestro/flows/ui-diff/species-picker.yml        # tut1/2/3/4 削除
M  maestro/flows/ui-diff/wiring-list.yml           # tut1/2/3/4 削除
M  maestro/flows/ui-diff/work-picker.yml           # tut1/2/3/4 削除
```

### Metro / 実機

| 項目            | 状態                                        |
| --------------- | ------------------------------------------- |
| Metro bundler   | 起動済 (PID 10009、port 8081)、SDK 55       |
| 実機            | SX3LHMA362304722 接続済                     |
| adb reverse     | `tcp:8081 tcp:8081` 設定済                  |
| Expo Dev Client | 起動可能 (但し APK は古い build = FAB あり) |

### Mockup HTTP server

| 項目                                        | 状態                                                 |
| ------------------------------------------- | ---------------------------------------------------- |
| http://localhost:8082/01-Onboarding.html 等 | アクセス可能 (起動中)                                |
| pairing-report.html                         | `scripts/ui-diff/out/pairing-report.html` で確認可能 |

---

## Sess2 でやること (順序付き、合計 105-150 分想定)

### Step 1: 環境準備 + 進捗確認 (10 分)

1. `docs/handoff/sess1-progress-2026-05-17.md` を Read
2. `git status` で WIP 状態確認
3. `mem_context` で Engram 前回サマリ確認
4. `adb devices` で実機接続確認
5. Metro 起動状況確認 (`ps aux | grep expo`)

### Step 2: NDK 26.1.10909125 ダウングレード (30-60 分)

```bash
# (1) Android Studio で SDK Manager 開く (GUI)
#     SDK Tools タブ → NDK (Side by side) → 26.1.10909125 にチェック → Apply

# (2) android/build.gradle に 1 行追加
#     android { ndkVersion = "26.1.10909125" }
#
#     ※ Expo prebuild 後に android/ dir 生成、そこで設定するため
#     先に prebuild が必要かも (要確認)

# (3) APK 再 build
SKIP_KEYS=1 corepack pnpm build:android:apk:local
# ↑ APK が dist/app-dev.apk に出力される

# (4) 実機 install
adb install -r dist/app-dev.apk
```

**期待結果**: 実機の右上歯車マーク (⚙) が消える (Expo Dev Client FAB 非表示)

### Step 3: 全 flow 再撮影 (30-45 分)

```bash
# Sess1 で使った batch script を流用 (各 1 回反復)
bash /tmp/batch-recapture.sh  # ← Sess1 で作成、保存場所要確認
```

- 22 flow 順次実行、各 1 回反復 (R-30 緩和、user 指示)
- adb screencap で SS 取得
- 失敗 flow は個別 retry

### Step 4: skip-list / HTML レポート最終化 (10 分)

```bash
# (1) skip-list artifact path 一括更新 (Sess1 PR-3 で使った node script を流用)
node -e "..."  # ← Sess1 で実行、再利用

# (2) HTML ペアリングレポート再生成
pnpm ui-diff:pairing-report
```

### Step 5: PR-4 commit + push + PR + merge (20 分)

```bash
# (1) git add
git add app.config.ts android/build.gradle maestro/flows/ui-diff/ scripts/ui-diff/

# (2) commit + push
git commit -m "chore(ui-diff): NDK 26.1 ダウングレード + Dev Client FAB 非表示 + 17 flow 新設計追従 + 全 flow 再撮影 (Sess1 PR-4)"
git push -u origin HEAD

# (3) PR 作成
gh pr create --title "..." --body "..."

# (4) CI watch + merge
gh pr checks <PR#> --watch
gh pr merge <PR#> --squash --delete-branch
```

### Step 6: Sess2 検証 + Engram session_summary (15 分)

- 整合済件数確認 (期待: 25-27/39 = 64-69%、**MVP 通過**)
- Engram `mem_session_summary` 保存 (R-19 1KB 以内)
- 残 Issue 整理 (#502 / #510 / #528 等)

---

## 引き継ぎポイント (注意事項、Sess2 Claude 必読)

### ルール厳守

| ルール                | 内容                                                                          |
| --------------------- | ----------------------------------------------------------------------------- |
| **R-13**              | `/discuss` 起動時は議論ラウンド数 + 質問数を冒頭予告                          |
| **R-14**              | user 「わからない」 発言で専門用語に「やさしい言い換え」 併記強制             |
| **R-17**              | 包括承認後も TaskCreate → 計画提示 → 承認 → 実行 の 4 段階厳守                |
| **R-19**              | `mem_save` content ≤ 1KB、長文は ADR / Issue 本文                             |
| **R-22**              | background `pnpm verify` で末尾 tail/pipe 禁止、`grep -E '^EXIT='` で明示確認 |
| **R-30 (Sess1 特例)** | 全 flow 再撮影は各 1 回 PASS で OK (user 指示で R-30 緩和)                    |
| **R-31**              | 新規 Maestro flow は `_template.yml` 準拠 + testID 事前 grep                  |

### 半自走モード継続条件

- 各 PR 着手前: 1 文計画提示 + 10 秒待機 (`/tmp/claude-stop.flag` 確認)
- user 「stop」 / 「待って」 で即停止
- scope 大幅変更時は user 再承認待ち

### 撮影品質の本質

- **歯車マーク (⚙)** は Expo Dev Client の Floating Action Button (FAB)
- 開発時のみ表示、リリース時は元から非表示
- 整合判定の客観性向上のため、開発ビルドでも非表示化する設計判断
- `app.config.ts` の `plugins: [['expo-dev-client', { showFloatingButton: false }]]` で実現
- ただし反映には **APK 再 build 必須** (= NDK ダウングレードで build 成功が前提)

---

## 関連 file / Issue / ADR

### 主要 ADR (Sess1 で改訂)

- `docs/adr/ADR-0018-onboarding-flow-integration.md` (Notes Amended 2026-05-16): 機能チュート 2 → 0 ステップ
- `docs/adr/ADR-0020-claude-design-full-adoption.md` (Notes Amended 2026-05-16、v1.x-2): Onboarding 6 → 4 画面、41 → 39 分母再定義
- `docs/adr/ADR-0021-ui-diff-pipeline.md`: 本セッションでは未改訂、Sess2 で「Dev Client FAB 非表示」 Notes Amended 候補

### 主要 file (Sess2 で参照すべき)

- `scripts/ui-diff/skip-list.json`: achieved 20 件 + skipped 1 件
- `scripts/ui-diff/config.ts`: SCREEN_PAIRS 23 件 (うち mockupFile 設定 100%)
- `scripts/ui-diff/mockup-screenshots-config.ts`: MOCKUP_SCREENSHOTS 41 件
- `scripts/ui-diff/generate-pairing-report.mjs`: v2 mockup 主導 HTML レポート
- `scripts/ui-diff/out/pairing-report.html`: 最新ペアリングレポート (41 件表示)
- `maestro/flows/ui-diff/*.yml`: 20 file (修正済 17 + bonsai-select-mode + onboarding-language + onboarding-notification 等)
- `docs/mockups/v1.0/screenshots/`: 68 PNG (41 entry + multi-page variants)

### 残 Issue

- **Issue #502**: 横断 watering history mockup HTML 不在 (user 領域、Claude では作れない)
- **Issue #510 Phase 3**: bonsai-detail Stack header 動的 title (Sess3 候補)
- **Issue #528**: retro 仕組み化 R-32/R-33 等 (将来課題、Sess3-5)

### 永続 skip (1 件)

- look-back-watering-history (Issue #502 で追跡、user 領域)

---

## まとめ (Sess1 → Sess2 への流れ)

```
Sess1 (本セッション)
├ PR-pre1 (#529): 古い問題 2 つ大掃除 (R-24 + Maestro 2.0)
├ PR-1 (#530): data hygiene
├ PR-2 (#532): Issue #526 解決 (tut5 経路)
├ PR-2.5 (#533): tut1/tut2 機能撤去 ★大規模
├ PR-3 (#534): mockup 主導 HTML レポート v2 + HTTP server ★
└ PR-4 (WIP): 歯車除去 + 17 flow 修正 + 全 flow 再撮影
   ├ ✅ 17 flow 修正完了 (commit 未提出)
   └ ❌ APK build 失敗 (NDK 27 linker error)
        ↓
Sess2 (次セッション)
├ NDK 26.1 ダウングレード + APK 再 build
├ 全 flow 再撮影 (各 1 回反復)
├ HTML レポート最新化
├ PR-4 commit + push + PR + merge
└ MVP 25/39 = 64% 達成見込み (整合済 25-27/39)
```

🤖 Sess1 担当: Claude Opus 4.7 (1M context、effort xhigh)
