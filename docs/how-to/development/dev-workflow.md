# 開発ワークフロー: Hot Reload vs Build の判定 (完全自動化)

> **Sess71 PR-1〜PR-5 で構造化**。 Claude Code + pnpm script + Git diff の 3 経路から file 種別を自動判定、 Native 影響あれば自動 build、 JS-only なら Metro reload 数秒で完結。

## このドキュメントの読み方

「**なぜ build と reload の判定が必要なのか?**」 から「**実際の使い方**」 まで、 開発者初心者にもわかるレベルで段階的に説明します。

---

## 1. 基本知識: アプリの「2 層」 構造

スマホアプリは大きく分けて 2 つの層でできています:

```
┌─────────────────────────────────────────────┐
│ 上の層 (JS 層) — 画面の見た目・色・文字     │ ← TSX/TS ファイル
│                                             │   (色 token / component / ロジック)
├─────────────────────────────────────────────┤
│ 下の層 (ネイティブ層) — カメラ/通知/DB/設定 │ ← Java/Kotlin/Swift + app.json
│                                             │   (APK に焼き込む)
└─────────────────────────────────────────────┘
```

### Hot Reload (Metro reload) で対応できるもの = 上の層のみ

- 色や文字、 レイアウトの変更
- TypeScript/JavaScript ロジック
- React component 構造
- 多言語 i18n のキー追加

→ **数秒で反映**、 build 不要。

### Build が必要なもの = 下の層に変更があった場合

- 新しい npm package 追加 (`package.json`)
- アプリ設定変更 (`app.json` / `app.config.*`)
- Android/iOS Native コード直接編集 (`android/**` / `ios/**`)
- Expo plugin 追加 (`plugins/**`)
- patches 適用 (`patches/**`)

→ **10-15 分かかる**、 install も必要。

---

## 2. なぜ自動判定が必要なのか?

### Sess70 で発生した実害

開発セッション中に Claude Code が **JS-only 変更 (色 token / TSX のみ)** にも関わらず `pnpm build:android:dev:local` (10-15 分) を kick off。 user 指摘「ホットリロードで反映できないの?」 で気付き、 Metro reload に切替えて完遂。

**累積効果**: 1 セッション 1-2 回 × 月 N セッション = **月 30-60 分の無駄な待機時間**。

### user の本質指摘 (2026-06-07)

> 「そもそも人間が判定する必要性ってどこにある? Claude Code が file の変更種類で分かるんだから」

→ **完全自動化が可能。 y/N prompt のような人間確認は不要**。

---

## 3. 仕組みの全体像

```
                ┌──────────────────────────────────────┐
                │ 共通エンジン (心臓部)                 │
                │ scripts/check-native-impact.mjs       │
                │  ↓ 判定                              │
                │  ・ 編集 file path を pattern match  │
                │  ・ Native / JS-only / unknown 分類   │
                │  → dist/.native-dirty flag 操作      │
                └────────┬─────────────────────────────┘
                         │
        ┌────────────────┼─────────────────┐
        │                │                 │
        ▼                ▼                 ▼
   ┌─────────┐    ┌──────────────┐    ┌──────────────┐
   │  A 経路 │    │  B 経路       │    │  C 経路       │
   │ Metro   │    │ Claude Code  │    │ pnpm dev:    │
   │ reload  │    │ hook         │    │ android      │
   │ 起動時  │    │ (PostToolUse)│    │ 起動時       │
   └─────────┘    └──────────────┘    └──────────────┘
```

### 各経路の役割

| 経路                                     | いつ動く?                                     | 何を見ている?              |
| ---------------------------------------- | --------------------------------------------- | -------------------------- |
| **A: `reload-app.sh`**                   | user が `bash scripts/dev/reload-app.sh` 実行 | flag file + git diff 補完  |
| **B: Claude Code hook**                  | Claude が Edit / Write tool 使った直後        | stdin で受信した file path |
| **C: `pnpm dev:android` (dev-start.sh)** | user が `pnpm dev:android` で Metro 起動      | flag file + git diff 補完  |

3 経路すべて同じ判定エンジン (`scripts/check-native-impact.mjs`) を call、 結果は **共通の flag file** (`dist/.native-dirty`) で共有。

---

## 4. 判定ルール (誰にでもわかる判定表)

### 🔴 Native 影響あり = build 必要 (flag 立てる)

| file パターン                             | なぜ build 必要?                             |
| ----------------------------------------- | -------------------------------------------- |
| `package.json` (deps 変更)                | 新しいライブラリは APK に焼き込み            |
| `pnpm-lock.yaml`                          | lockfile 変更で deps 更新                    |
| `app.json` / `app.config.{js,ts,mjs,cjs}` | アプリの「設計図」、 native 設定を含む       |
| `android/**`                              | Android Native コード直接                    |
| `ios/**`                                  | iOS Native コード直接                        |
| `patches/**`                              | npm package のパッチは native build 時に適用 |
| `plugins/**` (Expo plugin)                | native config を自動生成                     |
| `eas.json`                                | EAS Build 設定                               |
| `metro.config.*`                          | Metro 設定変更は再ビルド必要                 |
| `babel.config.*`                          | JS 変換ルール変更                            |
| `expo-env.d.ts`                           | Expo 環境変数型定義                          |

### 🟢 JS-only = build 不要 (Metro reload で OK)

| file パターン                                            | なぜ build 不要?                     |
| -------------------------------------------------------- | ------------------------------------ |
| `(constants\|src\|app\|components)/**/*.{tsx,ts,jsx,js}` | JS 層のみ、 Metro が配信             |
| `assets/**` (画像のみ)                                   | 静的 asset、 Metro 配信可            |
| `docs/**`、 `*.md`                                       | ドキュメント、 アプリに影響なし      |
| `eslint-rules/**`                                        | 開発時検査のみ                       |
| `__tests__/**`                                           | unit test、 アプリに影響なし         |
| `.claude/**`                                             | 開発ツール (Claude Code 設定 / hook) |
| `scripts/**` (build 系除く)                              | 開発スクリプト                       |
| `.github/**`                                             | CI workflow、 アプリに影響なし       |
| `README*`、 `.prettierrc*`、 `.gitignore`                | メタ file                            |

### ⚠ unknown = 安全側で native 扱い

NATIVE_PATTERNS / JS_ONLY_PATTERNS のどちらにも該当しない file は、 **安全側に振って native 扱い** で flag 立てます。 false positive (実は build 不要なのに走らせる) は許容、 false negative (実は build 必要なのにスキップ) は許容しない設計。

---

## 5. 実際の使い方

### Pattern A: 通常開発 (Claude Code 経由)

```bash
# 1. Metro 起動 (バックグラウンド推奨)
pnpm dev:android   # = bash scripts/dev-start.sh

# 2. 編集後の reload
bash scripts/dev/reload-app.sh
```

#### Claude が JS-only file を編集した場合 (例: 色 token)

```
[reload-app] Native fingerprint flag check...
[reload-app] No flag, running CLI-mode native impact check via git diff...
[reload-app]   [check-native-impact] JS-only changes (source=cli, files=3). Metro reload sufficient.
[reload-app] adb reverse tcp:8081
[reload-app] wake up device
[reload-app] force-stop com.dooooraku.bonsailog
[reload-app] start com.dooooraku.bonsailog/.MainActivity
[reload-app] done — Dev Client が Metro から最新 bundle を取得します
```

→ **数秒で完了**、 build 走らず。

#### Claude が Native 影響 file を編集した場合 (例: package.json deps)

```
[reload-app] Native fingerprint flag found at dist/.native-dirty:
[reload-app]   # BonsaiLog native-dirty flag (Sess71 PR-1)
[reload-app]   ...
[reload-app] Native impact detected → starting auto build (pnpm build:android:dev:local)
[reload-app] This takes 10-15 minutes. Press Ctrl+C to skip (not recommended).
[ ... build progress 10-15 min ... ]
[reload-app] Build done. Installing dev APK...
[reload-app] Install done. Removing flag.
[reload-app] adb reverse tcp:8081
[reload-app] ...
[reload-app] done
```

→ **自動 build + install + reload**、 user は何も判断しない。

### Pattern B: 手動編集 (Claude 経由なし)

`vi package.json` や `git pull` 等で直接編集した場合も検出されます (git diff 補完経路):

```bash
vi app.json   # 手動編集
bash scripts/dev/reload-app.sh
# → git diff で app.json 変更 detect → 自動 build
```

### 環境変数で挙動制御

| 環境変数                  | デフォルト     | 効果                                                                             |
| ------------------------- | -------------- | -------------------------------------------------------------------------------- |
| `SKIP_BUILD_CHECK=1`      | 0 (check 実行) | Step 0 Native fingerprint check を skip (緊急時用)                               |
| `AUTO_BUILD=0`            | 1 (自動 build) | flag 検出時に build せず警告のみ (手動で build 実行)                             |
| `SKIP_DEBUGGABLE_CHECK=1` | 0 (check 実行) | Step 0.5 APK debuggable check を skip (Sess77 Follow-up T3、 緊急時用)           |
| `AUTO_FIX_DEBUGGABLE=1`   | 0 (warn のみ)  | Release/Preview APK 検出時、 自動 uninstall + dev APK install (★ DB データ wipe) |

```bash
# 例: 緊急時に build check をスキップして reload のみ
SKIP_BUILD_CHECK=1 bash scripts/dev/reload-app.sh

# 例: build は手動で走らせたい
AUTO_BUILD=0 bash scripts/dev/reload-app.sh

# 例: Release APK が installed の 状態を 自動修正 (= DB wipe して dev APK へ 切替)
AUTO_FIX_DEBUGGABLE=1 bash scripts/dev/reload-app.sh

# 例: debuggable check も skip (= Metro 反映期待しない 確認用、 通常不要)
SKIP_DEBUGGABLE_CHECK=1 bash scripts/dev/reload-app.sh
```

### Step 0.5 APK debuggable check (Sess77 Follow-up T3)

Sess77 検証で 発覚した「Release APK (debuggable=false) installed のまま Metro reload して 10 分ロス」 罠を 構造的に防止。

**検出方法**:

```
adb shell dumpsys package com.dooooraku.bonsailog | grep "pkgFlags=" | grep "DEBUGGABLE"
```

**動作**:

- **Dev Build (debuggable=true)**: `pkgFlags=[ DEBUGGABLE HAS_CODE ... ]` 含む → ✅ continue
- **Release/Preview Build (debuggable=false)**: `pkgFlags=[ HAS_CODE ... ]` のみ → ⚠️ warn + 対処方法表示 + exit 1
- **パッケージ未 install**: clean install scenario として skip
- **`SKIP_DEBUGGABLE_CHECK=1`**: check 自体を skip

**Release/Preview APK 検出時の 対処方法 (出力例)**:

```
[reload-app] ⚠️  APK debuggable=false 検出 (Release/Preview build)
[reload-app]    pkgFlags:     pkgFlags=[ HAS_CODE ALLOW_CLEAR_USER_DATA ALLOW_BACKUP LARGE_HEAP ]
[reload-app]    → embedded bundle を 使用するため、 Metro bundle が 反映されません
[reload-app]    → Sess76 release APK が 残っている可能性、 dev APK への 切替推奨
[reload-app] 対処方法:
[reload-app]   (a) dev APK へ 切替 (DB wipe 伴う):
[reload-app]       adb uninstall com.dooooraku.bonsailog && adb install dist/bonsailog-dev.apk
[reload-app]   (b) Auto fix で 上記を 自動実行 (5秒 grace period 付き):
[reload-app]       AUTO_FIX_DEBUGGABLE=1 bash scripts/dev/reload-app.sh
[reload-app]   (c) 今回だけ skip (Metro 反映不可なので 検証は 期待通り動かない):
[reload-app]       SKIP_DEBUGGABLE_CHECK=1 bash scripts/dev/reload-app.sh
[reload-app]   (d) ローカル dev APK が 存在しない 場合は 先に build:
[reload-app]       pnpm build:android:dev:local
```

**実装上の注意**:

- adb shell 出力は CRLF (`\r\n`) なので `tr -d '\r'` で 正規化必須
- `set -o pipefail` + `grep -q` は 早期 exit で SIGPIPE (rc=141) → 偽 false 検出。 `grep -c` (常に全 input 読込) + `|| true` で 回避

---

## 6. トラブルシューティング

### Q1: 「Native impact detected」 と出るが、 実は build 不要だった (false positive)

- 安全側設計なので、 unknown file や grey zone でも flag 立てます
- 慣れている場合は `AUTO_BUILD=0` で警告のみにして手動判断
- `scripts/check-native-impact.mjs` の `NATIVE_PATTERNS` / `JS_ONLY_PATTERNS` 配列を調整 (PR で提案)

### Q2: build が走ったが install で失敗

- `adb devices` で device 確認
- `pnpm install:device:dev` を手動で再実行
- `rm dist/.native-dirty` で flag 削除して reload-app.sh 再実行

### Q3: flag を手動で削除したい

```bash
rm dist/.native-dirty
```

- ただし「build が必要なのに削除する」 と JS bundle と native build のミスマッチが生じる
- 安全のため build を先に実行 → 自動で flag 削除されることを確認

### Q4: hook が動いていないようだ

```bash
# hook を手動 trigger
echo '{"tool_input":{"file_path":"package.json"}}' | node .claude/hooks/check-native-impact-hook.mjs
# → "Native impact detected" + dist/.native-dirty 作成されれば OK
```

- `.claude/settings.json` で PostToolUse の matcher が `Edit|Write` を含むか確認
- Claude Code を再起動 (`/clear` or 新セッション)

---

## 7. 関連ファイル

| ファイル                                            | 役割                                 |
| --------------------------------------------------- | ------------------------------------ | ------- |
| `scripts/check-native-impact.mjs`                   | 共通核 (判定エンジン)                |
| `__tests__/scripts/check-native-impact.test.js`     | unit test (17 件、 静的解析 + e2e)   |
| `.claude/hooks/check-native-impact-hook.mjs`        | Claude Code PostToolUse hook 連携    |
| `.claude/settings.json`                             | hook 登録 (matcher `Edit             | Write`) |
| `scripts/dev/reload-app.sh`                         | Metro reload + Native check 起動経路 |
| `scripts/dev-start.sh`                              | Metro 起動 + Native check 起動経路   |
| `docs/adr/ADR-0046-*.md` Amendment                  | 「人間判定 → 機械判定」 自問追加     |
| `.claude/recurrence-prevention/specialized.md` R-61 | メタルール起票                       |

---

## 8. 設計の根拠 (なぜこのアーキテクチャ?)

### 6 名専門家チーム議論 + 4 ペルソナ評価で確定 (Sess71 plan)

- **テックリード**: G (E+F ハイブリッド) 推薦、 共通核 1 個 + 3 経路 = DRY + 網羅
- **QA エンジニア**: unit test 17 件で false positive/negative 計測可
- **UX/UI デザイナー**: build 進捗 terminal 表示で透明化
- **プロダクトマネージャー**: 月 30-60 分節約、 ADR-0046 「足す前ゲート」 整合
- **エンドユーザー代表** (Marcus 35 歳 IT 系): ◎ 業界トップレベル開発者体験
- **セキュリティ**: dev 専用、 prod build は別仕組み (release-android skill)
- **フラット視点**: 公式 `expo run:android` 乗り換えは別議論

### 不採用案 (線引き明快)

| 案                                                   | 不採用理由                                                     |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| y/N prompt (人間判定)                                | user 根本指摘「人間判定不要」 整合、 完全自動化が本旨          |
| 完全 fingerprint base (`@expo/fingerprint` 本格採用) | 起動毎の hash 計算が遅い (~数秒)、 G 案の git diff で精度 90%+ |
| 公式 `expo run:android` 全面乗り換え                 | BonsaiLog 独自 wrapper 撤回 scope、 別議論                     |
| CI 統合                                              | dev 専用、 prod build は別仕組みで対応済                       |

---

## 9. 関連

- ADR-0046 Amendment (Sess71): 「人間判定 → 機械判定」 4 つ目自問追加
- R-61 (Sess71 起票): 「人間判定が必要な場面は機械判定に置き換える」 メタルール
- ADR-0050: Android release automation (prod build 自動化、 dev は本仕組みで対応)
- Plan: `/home/doooo/.claude/plans/ok-1-playful-fern.md` (Sess71)

---

## 10. Worktree 利用時の準備 (Sess75 PR-A、 R-64 起票)

並行作業や検証隔離で `git worktree add` を使う時、 新 worktree には `.env` と `node_modules` がないため **`pnpm dev` / `pnpm verify` が即 fail** する罠がある (Sess73 + Sess75 で 2 回再発)。

### 真因

- Expo の `app.config.ts` が `required('APP_NAME')` 等で .env を強制参照 → `.env` 不在で Metro 起動 fail (`Missing required env var: APP_NAME`)
- worktree の `node_modules` は親 repo と独立、 worktree ごとに `pnpm install` (5-10 分) するのは時間浪費

### 解決: `worktree-init.sh` (1 行自動化)

新 worktree 作成直後に 1 回だけ実行:

```bash
# 1. worktree 作成
git worktree add .claude/worktrees/<name> -b feat-<name>
cd .claude/worktrees/<name>

# 2. 初期化 (= .env + node_modules を親 repo から symlink)
bash scripts/dev/worktree-init.sh
# → linked .env → /path/to/main/.env
# → linked node_modules → /path/to/main/node_modules
# → done — pnpm dev / pnpm verify can be run now

# 3. 開発開始
pnpm dev
```

### 仕組み

`scripts/dev/worktree-init.sh` (約 80 行):

| 動作                        | 詳細                                                                       |
| --------------------------- | -------------------------------------------------------------------------- |
| **main worktree 自動検出**  | `git worktree list --porcelain` の 1 行目から main path を取得             |
| **.env を symlink**         | `ln -s $MAIN_WORKTREE/.env $CURRENT/.env` (既存 symlink は skip)           |
| **node_modules を symlink** | 同上、 `node_modules` を symlink (pnpm install 5-10 分の節約)              |
| **safe 動作**               | 既存 real file (= symlink でない) は **上書きしない** (user 編集の保護)    |
| **再 link option**          | `FORCE_RELINK=1 bash scripts/dev/worktree-init.sh` で既存 symlink を再作成 |

### 適用シーン

- 並行 PR 検証 (Sess67/Sess72/Sess73/Sess75 pattern)
- 統合 worktree (Sess73 `sess73-verify-integration` pattern)
- /loop / 自動改善ループの一時 worktree

### Future Work

- (a) Claude Code の EnterWorktree tool に PostCreate hook で `worktree-init.sh` 自動実行 (今は手動)
- (b) `.claude/hooks/check-worktree-init.mjs` で worktree 内 `pnpm dev` 直前に `.env` / `node_modules` 存在チェック (= 罠の事前検出)
- 本 PR scope では (a)(b) 共に保留、 manual run + R-64 で運用

---

## 11. Node version の正確な指定 (Sess82 PR-E R-61 適用)

### 目的

Sess81 (2026-06-09) で Claude が ローカル開発で Node 20 を使用、 `.nvmrc=22` 不一致で `pnpm test` が SQLite native module で 113 tests 誤検知 fail。 構造再発防止のため `pnpm verify:node` を `pnpm verify` 冒頭に配線。

### 仕組み

```bash
pnpm verify:node           # .nvmrc と node --version 一致 verify、 mismatch なら exit 1
pnpm verify                # 冒頭で verify:node を実行
```

`scripts/dev/check-node-version.mjs` が `.nvmrc` (= `22`) と `process.version` (= 現 node) を比較、 メジャー version 一致なら OK (= patch 違いは許容)。

### 開発者の選択肢 (= mismatch 時の対処)

1. **nvm (推奨)**: `nvm install 22 && nvm use 22`、 `~/.nvmrc` か `~/.bashrc` で `cd` 時に自動切替設定
2. **corepack** (= Node 同梱、 別途インストール不要): `corepack pnpm install` で起動
3. **PATH 直接指定** (= Claude / WSL2 pattern): `PATH=/usr/bin:/bin:$HOME/.nvm/versions/node/v22.22.2/bin:$PATH pnpm verify`
4. **direnv** (= 業界標準、 未導入): `.envrc` で `use node` 指定、 `cd` 時に自動切替

### Sess81 教訓

- `~/.claude/rules/wsl2-environment.md` (= user global) が Sess1-2 (2026-04) の Node 20 LTS 時代の指示のまま、 `.nvmrc=22` 更新時に同期されていなかった
- Sess82 PR-E で本 chapter + `pnpm verify:node` 配線 + `wsl2-environment.md` 動的読み込み pattern で構造解決
