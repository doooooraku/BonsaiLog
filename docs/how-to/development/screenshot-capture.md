# 開発用スクショ撮影手順

> **このファイルのロール**: mockup 整合検証・実機検証レポート用スクショの撮影手順を統一。R-29 写経駆動開発 Step 4 (RN スクショ撮影) の標準手順。

最終更新: 2026-06-11 (Doc-Truth Audit バッチ⑤ — ExpoGo 時代の手順を Dev Build + take-ss.sh へ書き直し)

---

## 目的

R-29 写経駆動開発 5 段階の **Step 4「RN スクショ撮影」** で、撮影品質を統一:

- Expo Dev Client の floating button (Tools button) が画面に映り込まない
- 連番命名 + PNG 破損検出で「撮れたつもり」事故を防ぐ (Sess77/89/90 で 3 回再発した CRLF 罠対策)

---

## 1. mockup スクショ (T1-2 既完了、参考)

mockup 側のスクショは **事前生成済 + git commit 済** (`docs/mockups/v1.0/screenshots/`、26 png)。R-29 Step 2 で参照する。

再生成が必要な場合:

```bash
PATH=/home/doooo/.local/bin:/home/doooo/.nvm/versions/node/v22.22.2/bin:/usr/bin:/bin \
  corepack pnpm exec tsx scripts/mockups/generate-mockup-screenshots.ts
```

---

## 2. 実機スクショ (R-29 Step 4) — 現在の標準手順

### 2.1 前提

- **Dev Build** (Expo Dev Client) を実機にインストール済み (ExpoGo は不使用、`dev_vs_preview_builds.md` 参照)
- Metro 起動済み (`pnpm dev`) + `adb reverse tcp:8081 tcp:8081` 済み (まとめて `scripts/dev/reload-app.sh` でも可)

### 2.2 floating button (Tools button) の hide

Expo Dev Client の浮遊ボタンが UI を覆う場合: **Dev Menu (実機 Shake or 3 本指タップ) → 「Tools button」トグルを OFF**。

### 2.3 撮影は `take-ss.sh` (Sess91 PR-A 起票)

```bash
scripts/dev/take-ss.sh <出力dir> <名前>
# 例: scripts/dev/take-ss.sh /tmp/ss-sess97 home-light
```

`adb shell screencap > file.png` の直接リダイレクトは **WSL bash の CRLF 変換で PNG が壊れる罠**があるため禁止。take-ss.sh は:

- `adb exec-out` でバイナリ安全に取得
- 連番命名 + 出力 dir 自動管理 + REPORT.md 雛形生成
- PNG ヘッダー verify (破損時は即削除 + exit 1)

### 2.4 iOS 実機 (将来)

- Side ボタン + Volume Up 同時押しで物理スクショ → AirDrop / iCloud で PC 転送
- iOS 配信準備時に take-ss.sh 同等の helper を整備予定

---

## 3. R-29 Step 4-5 への参照

PR で実機スクショを撮影した後:

- アタッチメント or リンクで PR 本文に貼る
- mockup スクショ (`docs/mockups/v1.0/screenshots/<id>.png`) と並べて Read で目視比較
- 整合性レベル明記 (`docs/reference/integration-criteria.md` 参照)

---

## 4. ストア提出用スクショ

ストア提出用は別系統 — **`docs/how-to/workflow/screenshot_generation.md`** (`scripts/store-screenshots/generate.ts`、config は template から生成) を参照。

---

## 関連

- `scripts/dev/take-ss.sh` — 実機 SS helper (本手順の中核)
- `scripts/dev/reload-app.sh` — adb reverse + アプリ再起動の 1 コマンド化
- `docs/how-to/development/dev_vs_preview_builds.md` — Dev / Preview build 使い分け
- `docs/reference/integration-criteria.md` — 整合性レベル定義
