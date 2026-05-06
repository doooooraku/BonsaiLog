# WSL2 + Mobile (adb / Maestro / Expo) の罠 — ADR-0021 PoC で発見

> ADR-0021 (UI 差分検出パイプライン) PoC 中に踏んだ 4 つの罠と、構造的な対処を記録する。
> **「気をつけます」ではなく仕組みで防ぐ** ため、`scripts/ui-diff/preflight.mjs` で 7 項目を実行前にチェックする。

## 1. WSL2 ADB ラッパーの CRLF 問題

### 症状

- WSL2 の `/usr/local/bin/adb` は Windows 側 `adb.exe` への 88 byte シェルラッパー。
- Windows ADB の出力は **CRLF (`\r\n`)** を含む。WSL bash で受けると `\r` が文字列中に残る。
- 結果として:
  - **`adb devices | awk '$2=="device"'`** が引っかからない (`device\r` ≠ `"device"`)
  - **`adb exec-out screencap -p > out.png`** で出力に CRLF 変換が入り **PNG バイナリが壊れる**(真っ黒な画像)

### 構造的対処

| 用途         | 旧 (壊れる)                           | 新 (CRLF 安全)                                                               |
| ------------ | ------------------------------------- | ---------------------------------------------------------------------------- |
| テキスト出力 | `adb devices \| awk ...`              | `adb devices \| tr -d '\r' \| awk ...`                                       |
| バイナリ転送 | `adb exec-out screencap -p > out.png` | `adb shell screencap -p /sdcard/tmp.png && adb pull /sdcard/tmp.png out.png` |

### 検出方法

`scripts/ui-diff/preflight.mjs` の `checkAdb()` で `tr -d '\r'` 後に awk 相当の正規表現マッチ。失敗時は明確なエラー + hint 出力。

---

## 2. Maestro 2.0 系の構文変更

### 症状

`maestro/flows/smoke.yml` 等の旧形式 (`steps:` キー) は Maestro 1.x 系の書き方。Maestro 2.0 系では:

- **`steps:` キー廃止** → `---` 区切りで「設定セクション」と「コマンドセクション」を分ける
- **`assertVisible: timeout: ...` のオプション廃止** → `extendedWaitUntil:` に置き換え
- **`waitForAnimationToEnd:` の引数廃止** → 単独命令(引数なし)で使う

### 構造的対処

新しい flow を書くときは `maestro/flows/ui-diff/bonsai-tab.yml` を雛形にする。Maestro 2.0 構文の例:

```yaml
appId: 'com.example.app'
name: 'My flow'
tags:
  - my-tag
---
- launchApp:
    clearState: false

- extendedWaitUntil:
    visible:
      text: 'header text'
    timeout: 60000

- waitForAnimationToEnd
```

### 検出方法

Maestro CLI が起動時に YAML を検証。`> Commands Section Required` や `> Unknown Property: timeout` エラーで気付く。preflight では Maestro 自体は起動しないため検出できないが、capture-app.sh が flow 実行時に拾う。

---

## 3. Expo Go との deep link 衝突

### 症状

- 実機に **Expo Go アプリ (`host.exp.exponent`)** が別途インストールされていると、`exp://` scheme の deep link を **Expo Go が拾う**。
- Expo Go のバージョンが古いと、新しい SDK 55 のプロジェクトで `Project is incompatible with this version of Expo Go` エラー画面が出る。
- 自前の Development Build (`com.doooooraku.bonsailog`) は Dev Launcher を持っているが、`exp://` を取られてしまう。

### 構造的対処

- `exp://` を **使わない**
- 代わりに **アプリ専用 scheme + Dev Launcher 専用 path** を使う:
  ```
  bonsailog://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081
  ```
- `<scheme>` は `app.json` の `"scheme": "bonsailog"` で定義。
- `expo-development-client/?url=...` パスで Dev Launcher が deep link を直接受け、Metro server に自動接続する (Expo SDK 50+)。

### 検出方法

`scripts/ui-diff/preflight.mjs` の `checkExpoGo()` で `adb shell pm list packages host.exp.exponent` を実行。インストール済みなら **warning** + hint 表示(uninstall は強制せず、`bonsailog://` scheme を使う対処を案内)。

---

## 4. `pgrep -f` が自分自身にマッチする

### 症状

```bash
pgrep -f "expo start" | xargs -r kill
```

このコマンドを bash から実行すると、bash 自身のコマンドラインに `"expo start"` という文字列が含まれるため `pgrep -f` が **自分自身を検出**して kill してしまう。Bash exit code 144 (128 + SIGTERM)。

### 構造的対処

- **`pgrep -f` の代わりに、`pgrep` (フルコマンドラインを見ない) を使う**
- もしくは **`grep -v $$`** で自分の PID を除外する:
  ```bash
  pgrep -f "expo start" | grep -v "^$$\$" | xargs -r kill
  ```
- もしくは **PID をファイルに保存してそれを kill** する:
  ```bash
  ( pnpm dev > /tmp/metro.log 2>&1 & echo $! > /tmp/metro.pid )
  kill "$(cat /tmp/metro.pid)"
  ```

### 検出方法

preflight では検出しない (実害は scripts/ui-diff/ 外で起きる)。本 lesson を読んで気付くか、後始末スクリプトで PID ファイル方式を使う。

---

## 仕組化の要点

- **preflight.mjs (scripts/ui-diff/preflight.mjs)** が capture-app.sh の冒頭で必ず呼ばれ、7 項目をチェックする。Node v22 / adb authorized / Expo Go / Metro / Playwright + chromium / ImageMagick / ClaudeDesign 正本。
- **問題があれば fail-fast** + 対処方法 (hint) を出力 → ユーザーが何をすればよいか即わかる。
- **再発時は本ドキュメントを Read** して根本原因を理解する。

## 関連ファイル

- `scripts/ui-diff/preflight.mjs` (実行前チェック本体)
- `scripts/ui-diff/capture-app.sh` (preflight を呼ぶ)
- `maestro/flows/ui-diff/bonsai-tab.yml` (Maestro 2.0 構文 + bonsailog scheme の雛形)
- `docs/adr/ADR-0021-ui-diff-pipeline.md` (本パイプライン全体の意思決定)
- `docs/reference/lessons.md` (索引、本ファイルもここから辿れる)
- `~/.claude/projects/.../memory/ui-diff-wsl2-quirks.md` (Auto memory 索引)
