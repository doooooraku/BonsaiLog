# Lessons: デバッグ / Android / 開発環境

> 索引: [`README.md`](./README.md)

---

### `ULIDError: Failed to get cryptographically secure random number`

- **何が起きたか**: 盆栽新規登録画面で「保存」ボタン押下時に `Uncaught (in promise, id: 2) ULIDError: Failed t...` の赤バナーが表示され、ID 生成失敗で DB INSERT 不能。実機 (Android) のみ再現、Jest テストでは再現しない (Node v22 には Web Crypto あり)。
- **根本原因**: `ulid` パッケージ v3 系は `crypto.getRandomValues` (Web Crypto API) で安全な乱数を取得する設計。React Native ランタイムには Web Crypto がデフォルトで搭載されておらず、`crypto` グローバルが undefined → 取得失敗で `ULIDError` を投げる。v2 系には `Math.random()` フォールバックがあったが v3 で撤廃された。
- **ルール**:
  1. `ulid` v3 系 (`^3.x.x`) を使う場合は **必ず `react-native-get-random-values` を依存に追加**し、`app/_layout.tsx` の **最上部 (他の import より先)** で `import 'react-native-get-random-values';` を評価する。
  2. polyfill は「最初の評価時に global.crypto をセット」する設計のため、ulid 等のライブラリより **import 順序が後だと無効**。Babel の hoist で `import` は先に評価されるが、副作用付き import (`'pkg'` 単体) は **記述順** に評価されるため、polyfill を真っ先に書くのが鉄則。
  3. テストでは Node 標準の Web Crypto により再現しない → 実機 (RN ランタイム) で必ず動作確認する。
  4. 同種の問題: `crypto-js`、`uuid` v9 系、`@noble/hashes` 等もこの polyfill が必須。

---

### Android logcat の False Positive パターン

- **何が起きたか**: Android ログ監視で、アプリとは無関係なシステムログがエラーとして検出され、デバッグの邪魔になった
- **無視すべきシステムログ**:
  - `Finsky` (Google Play): VerifyApps パッケージスキャン
  - `FullBackup_native`: Android バックアップデータ計測
  - `installd`: キャッシュパージ / ストレージ管理
  - `PFTBT/Backup`: バックアップ転送エラー（クォータ超過）
  - `ActivityManager`: プロセスライフサイクル（bkup, prev, empty, cch）
  - `NxpTml / WifiStaIfaceHidlImpl`: ハードウェア I/O エラー（NFC, WiFi）
- **ルール**: logcat 監視スクリプトにはこれらのタグを除外フィルタとして設定する

---

### Dev Build + Metro が必須な理由

- **何が起きたか**: Preview/Production ビルドでデバッグしようとしたが、`__DEV__` ガード付きのログが一切出力されなかった
- **根本原因**: `__DEV__` ガード付きのログは Dev Build + Metro 接続時のみ出力される。Preview/Production ビルドでは Hermes のデッドコード除去で完全に消える
- **ルール**: デバッグログに依存する作業（自動スクリーンショット、ナビゲーション監視等）は必ず Dev Build + Metro 接続環境で行う

---

### predictiveBackGestureEnabled で戻るジェスチャーがアプリ終了になる

- **何が起きたか**: Android 端末で左端スワイプバック（戻るジェスチャー）をすると、前の画面に戻らずアプリが閉じる。全画面で発生
- **根本原因**: `app.json` の `predictiveBackGestureEnabled: true` が `react-native-screens` v4 未対応の Predictive Back API を有効化。ジェスチャーが JS レイヤーをバイパスし、Activity 終了として処理される
- **一次情報**: expo/expo#39092（OPEN）、react-native-screens Discussion #2540
- **ルール**:
  1. `react-native-screens` が Predictive Back を正式サポートするまで `predictiveBackGestureEnabled: false` を維持する
  2. 非同期処理中にバックで離脱されるリスクがある画面には `BackHandler`（Android）を追加する
  3. SDK/ライブラリアップグレード時に expo/expo#39092 の解決状況を確認する

---

### 非インタラクティブシェルで nvm Node が PATH に含まれない

- **何が起きたか**: Claude Code の Bash 環境で `node -v` が古いバージョンを返し、EAS ローカルビルドが失敗する。`.bashrc` に `nvm use` 設定済みだが効かない
- **根本原因**: nvm.sh は非インタラクティブシェルで PATH を変更しない場合がある。apt インストールの `/usr/bin/node`（古いバージョン）が優先される
- **ルール**:
  1. `.bashrc` の nvm セクションに「nvm が PATH を変更しなかった場合のフォールバック」を追加する
  2. `.nvmrc` や `engines` フィールドは「警告」であり「強制」ではない。PATH 自体の設定が根本対策

---

### Claude Code Bash 環境で ANDROID_HOME / JAVA_HOME / Node PATH が未設定

- **何が起きたか**: Claude Code から `eas build --local` や `./gradlew assembleRelease` を実行すると失敗。`ANDROID_HOME` 未設定 → SDK not found
- **根本原因**: Claude Code は「非インタラクティブ・非ログイン」シェルを実行するため `.bashrc` も `.profile` も読み込まれない。さらに Gradle デーモンは初回起動時の PATH をキャッシュするため、手動 export 後もデーモン再起動なしでは反映されない
- **ルール**:
  1. **シェル初期化ファイルに依存しない**: 環境変数は `.bashrc` / `.profile` ではなく、ツール固有の設定（Claude Code の `settings.local.json` の `env`）で設定する
  2. **修正後は失敗コンテキストで検証する**: ターミナルで動いても Claude Code の Bash で動くとは限らない
  3. **Gradle ビルド前は `./gradlew --stop` + `--no-daemon`**: PATH 変更がデーモンにキャッシュされる問題を回避する

### `gh pr checks` ポーリングは 2 段判定にする

- **何が起きたか**: `until ! gh pr checks <PR> 2>/dev/null | grep -q "pending"; do sleep 25; done` で CI 完了を待つと、PR push 直後の「`no checks reported on the branch`」状態 (`gh` が exit 1) が「pending なし → 完了」と誤判定され、空打ちで終了する。
- **根本原因**: 単純な `! grep -q pending` は (1) `gh` の非ゼロ exit、(2) 出力空 (checks 未起動)、(3) 全 pass の 3 つを区別できない。
- **ルール**: 2 段判定にする → `until [ -n "$(gh pr checks <PR> 2>/dev/null | grep -E '^verify\s')" ] && ! gh pr checks <PR> 2>/dev/null | grep -q "pending"; do sleep 25; done`。verify 行が現れるまでは "未起動" として待ち、verify が見えてから pending 消失を判定する。
- **一次情報**: 本セッションで PR #141 / #142 監視時に発生 (2026-05-03)

### expo-sqlite の raw SQL `SELECT *` は snake_case で返る

- **何が起きたか**: `db.getFirstAsync<T>` の row が column 名そのまま (snake_case) で返り、TypeScript 型 (camelCase) と乖離。`row.relativePath` が `undefined` → 実機で「56年前」異常表示等 (PR #378/#380)。
- **ルール**: 新規 raw SQL は `snakeToCamelRow / snakeToCamelRows` (`src/db/rowMapper.ts`) で必ず吸収する。
- **出典**: memory `sqlite-snake-case-rowmapper` から昇格 (Doc-Truth Audit P2、2026-06-10)。

### RN Fabric の measureLayout は数値ハンドル不可・host ref 必須

- **何が起きたか**: `node.measureLayout(relativeTo, ...)` の第 1 引数に `findNodeHandle()` 等の数値ハンドルを渡すと実機で `must be called with a ref to a native component` エラー (PR #836)。`pnpm verify` は緑 = **机上では検出不可、実機のみ顕在化**。
- **ルール**: relativeTo には **ホストコンポーネントの ref (HostInstance)** を渡す。ScrollView 内容は `<View ref={...} collapsable={false}>` で包む。
- **出典**: memory `rn-fabric-measurelayout-gotcha` から昇格 (P2、2026-06-10)。

### 7 列グリッドは `width:'14%'+flexWrap` 禁止 (土曜列が折り返す)

- **何が起きたか**: カレンダーで `flexWrap + width:'14%' × 7 + gap` が合計 100% を超え、7 列目 (土曜) が折り返して空欄化 (PR #318、user 指摘で発覚)。
- **ルール**: 7 列等分は週行コンテナ (`flexDirection:'row' + gap`) + 各セル `flex:1`。`%` 幅は gap を吸収できないため等分グリッドでは使わない。
- **出典**: memory `calendar-grid-saturday-overflow` から昇格 (P2、2026-06-10)。

### WSL2 の adb daemon は background 並列実行でロックする

- **何が起きたか**: `adb devices` 等を `run_in_background` で並列起動 → Windows 側 daemon がロック、全 adb が timeout 124、`adb kill-server` も hang (2026-05-09)。また WSL2 の `pkill`/`kill` は **exit 144 (128+SIGTERM)** を返すが実害なしのことが多い (P2 ログ集計で 35 回、全て続行可だった)。
- **ルール**: ① adb 系は **foreground 直列** で実行 ② stuck したら `timeout 10 /mnt/c/Windows/System32/taskkill.exe /F /IM adb.exe` → `adb start-server` → 実機で USB デバッグ再許可 ③ exit 144 は失敗と即断しない。
- **出典**: memory `adb-daemon-parallel-hang` から昇格 (P2、2026-06-10)。`wsl2-mobile.md` §1 (CRLF) の姉妹知見。
