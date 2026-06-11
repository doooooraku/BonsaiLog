---
name: device-verify
description: 実機確認の標準ループ — 前提チェック (dev/release 判定) → reload/build 自動判定 → 反映 → take-ss.sh 撮影 → Claude Read 目視 → PR/レポート記録。修正・改善後の実機検証を毎回同じ手順で実施する。
user-invocable: true
argument-hint: '[検証したい画面/機能の説明] (任意)'
---

# /device-verify — 実機確認の標準ループ (Sess99 恒久策)

修正や改善を行ったら**必ずテストと実機確認を行う**ための標準手順。
「JS だけならホットリロード / native・DB ならビルド」の判定 (Sess71) の**先**、
つまり「反映 → 撮影 → 目視 → 記録」までを毎回同じ順で実施する。

## 起動条件

- user が「実機確認して」「実機で見て」「スクショ撮って確認」「/device-verify」と言った時
- UI / 動線 / DB に触れる PR の merge 後 (PR テンプレ §6-3 が要求)

## 背景 (なぜこの順番か)

- **Sess99 事故 1**: 「DevBuild で進めている」前提で検証を始めたら、実機は Play 配信の
  release だった (installer=com.android.vending、DEBUGGABLE なし)。→ Step 1 で機械判定。
- **Sess70 事故**: JS-only 変更に 10-15 分のビルドを kick → Step 2 (Sess71 自動判定) で防止。
- **Sess99 事故 2**: DB migration はホットリロードでは適用されない (migration は app 起動時に
  走る) → Step 3 に再起動 step を組み込み。
- **R-1/R-25 教訓**: 「✅ 生成完了」ログだけの報告で崩れを見逃す → Step 5 で SS を必ず Read。

---

## Step 1: 前提チェック (read-only、毎回必須)

```bash
adb devices                                   # 端末接続
adb shell dumpsys package com.dooooraku.bonsailog | grep -E "versionCode|installerPackageName"
adb shell dumpsys package com.dooooraku.bonsailog | grep -E "pkgFlags"   # DEBUGGABLE の有無
curl -s -m 3 http://localhost:8081/status || echo METRO_NOT_RUNNING
```

判定表:

| 観測 | 意味 | 次の行動 |
| --- | --- | --- |
| `installerPackageName=com.android.vending` / DEBUGGABLE なし | **Play 配信 release** が入っている | ホットリロード不可。dev build 差し替えが必要 → **user に報告して承認を取る** (アンインストール = 端末データ消去) |
| DEBUGGABLE あり | dev build | Step 2 へ |
| 端末なし | USB 未接続 | user に接続依頼 |

差し替え時の注意: 手元の古い dev APK は **native 依存 (package.json の native module) が
最新 main と一致しているか**を必ず確認 (古い APK + 新 JS bundle = native module 欠落 crash)。
不一致なら**クラウドで作り直す**:

```bash
gh workflow run build-android-dev.yml
RUN_ID=$(gh run list --workflow=build-android-dev.yml -L1 --json databaseId -q '.[0].databaseId')
gh run watch "$RUN_ID"
gh run download "$RUN_ID" -n bonsailog-dev-apk -D dist/
adb install -r dist/bonsailog-dev.apk
# 署名違いの release が入っている場合は事前に adb uninstall — データ消去 = user 承認必須
```

**ローカル build は原則禁止** (WSL2 メモリ枯渇 → ページング I/O 失敗 → BSOD 3 回の前科。
`scripts/guard-local-build.mjs` がブロックする。lessons/build.md 参照)。

## Step 2: 反映方法の判定 (Sess71 自動判定)

`docs/how-to/development/dev-workflow.md` の判定に従う:

- **JS-only** (`*.ts` / `*.tsx` / i18n / token) → Metro reload で数秒
- **native 影響** (`package.json` 依存追加 / `app.config.*` / `android|ios/**` / `plugins/**` / `patches/**`) → **cloud build** (`gh workflow run build-android-dev.yml`、上記 Step 1 の手順) + install

## Step 3: 反映

```bash
# Metro 起動 (未起動時、background)
corepack pnpm dev    # PATH prepend 必須 (wsl2-environment.md)
adb reverse tcp:8081 tcp:8081
bash scripts/dev/reload-app.sh   # wake → force-stop → start を 1 行で
```

- **DB migration (schema v 上げ) を含む変更は、reload ではなく必ず force-stop → 再起動**
  (migration は起動時にしか走らない)。reload-app.sh は force-stop を含むためそのまま使える。
- Dev Client の「Continue」dialog は Back キーで dismiss (text tap 禁止、Developer Menu 誤起動)。

## Step 4: 撮影 (take-ss.sh、CRLF 破損ガード付き)

```bash
bash scripts/dev/take-ss.sh <name> <session-tag>   # dist/<tag>-verify-<ts>/SS-NN-<name>.png
```

- 検証対象の画面ごとに 1 枚以上。操作 (`adb shell input tap x y`) → `sleep 1-2` → 撮影。
- 座標は直前の SS を Read して決める (解像度は `adb shell wm size`)。
- 日本語入力は adb 不可 (`bonsailog-adb-verify-constraints` 参照)、ASCII で代替。

## Step 5: Claude Read 目視 (必須 — ログだけの合格判定禁止)

撮影した PNG を **Read tool で開き**、期待と一致するかを画面ごとに判定する:

- 変更点が画面に現れているか (文言 / レイアウト / カード / ダイアログ)
- 既存要素が壊れていないか (R-25 構造系: タブ構成 / セクション / UI 種別 / スクロール)
- dark mode 影響がある変更は light/dark 両方撮影

## Step 6: 記録

- 結果を **PR コメント or セッション報告に SS パス付きで記載** (PR テンプレ §6-3 のチェックを更新)
- **完了報告には「やさしい説明」を必ず含める** (PR テンプレ §2.5 と同義、Sess101 #1173)
- 不一致を見つけたら: 修正 → Step 2 から再実行 (合格するまで「済」にしない)
- 検証不能だった項目は「vc__ smoke に委譲」として明記 (黙って省略しない)

---

## つまずきと復旧 (Sess101 実走で実証した 3 件)

| 症状 | 原因 | 復旧 |
| --- | --- | --- |
| adb コマンドが無応答 (timeout exit 124) | WSL2 adb daemon ロック (並行 adb / 残留 process、`adb-daemon-parallel-hang` 参照) | `/mnt/c/Windows/System32/taskkill.exe /F /IM adb.exe` → `adb start-server` → `adb devices` で再認可確認 |
| reload-app.sh が build を要求するが flag の `native_files: (none)` | `dist/.native-dirty` の `unknown_files` にリポジトリ外 path (例: `~/.claude/settings.json` = harness 設定) が混入した誤検知 | flag の中身を **Read で確認**し、リポジトリ外 path のみなら `rm dist/.native-dirty` で続行 (構造修正 = Issue #1174) |
| `input tap` が効かない / 別の要素に当たる | Read で見る SS 画像は実画面の縮小プレビューで、見た目の座標と実 px がずれる | 座標は **`adb shell uiautomator dump` の bounds が正** — `bounds="[x1,y1][x2,y2]"` の中心を tap する |

---

## 関連

- `docs/how-to/development/dev-workflow.md` (Sess71 reload/build 自動判定)
- `scripts/dev/reload-app.sh` / `scripts/dev/take-ss.sh`
- `docs/how-to/testing/testing.md` §9 (実機 adb 検証制約)
- PR テンプレ §6-3 (実機確認の択一欄、Sess99 恒久策)
- `/verify` (汎用 run-and-observe)、`/release-check` (リリース前照合)
