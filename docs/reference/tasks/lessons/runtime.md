# Lessons: デバッグ / Android / 開発環境

> 索引: [`README.md`](./README.md)

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
