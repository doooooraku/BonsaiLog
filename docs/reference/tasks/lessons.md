# 学んだこと（Lessons Learned）

同じミスを繰り返さないように、パターンや修正内容をここに記録する。

## フォーマット

```
### [日付] カテゴリ: 短いタイトル
- 何が起きたか:
- 根本原因:
- ルール: (次回どうすべきか)
```

---

## 初期レッスン（過去のプロジェクトから）

### ドキュメント管理

#### 新しいファイルを追加したらドキュメントマップを更新する

- **ルール:** 新しいドキュメントを追加したら、必ず docs/README.md のファイルマップを更新する。
- **根本原因:** ドキュメント作成時に「他に影響するファイル」を確認するチェックリストがなかった。

#### 機能を置き換える前に既存機能を一覧にする

- **ルール:** 既存の機能を新しいバージョンに置き換えるときは、まず古いバージョンの全機能を一覧にする。意図的に削除したものと見落としを区別する。
- **根本原因:** 古い機能の能力が外部にドキュメント化されていなかったため、再設計時に見落とされた。

#### 古い参照の更新

- **ルール:** 完了の定義（Definition of Done）に「関連ドキュメントのクロスリファレンスチェック」を含める。
- **根本原因:** 新機能の TODO に、既存ドキュメントの古い参照を確認する項目がなかった。

---

### DB / データ

#### マイグレーションの冪等性（べきとうせい）

- **ルール:** `PRAGMA user_version` は無条件でセットする（if ブロックの中に入れない）。`ALTER TABLE ADD COLUMN` はカラムの存在を先にチェックする。
- **根本原因:** `CREATE TABLE IF NOT EXISTS` は冪等だが、`ALTER TABLE ADD COLUMN` は冪等ではない。アプリ再起動時に version=0 となり、再マイグレーションが走って「カラムが重複しています」エラーになる。

#### バックアップ / エクスポートのフィールドカバレッジ

- **ルール:** `reports` や `photos` にカラムを追加したら、必ず対応する Backup 型、エクスポートマッピング、backupService のインポート INSERT を更新する。
- **根本原因:** スキーマ変更時にバックアップへの影響を確認するプロセスがなかった。

---

### i18n（多言語対応）

#### baseEn のフォールバックに頼らない

- **ルール:** 新しい翻訳キーは、すべてのロケールファイルで明示的にオーバーライドする。`...baseEn` のスプレッドを使うとキーは「存在する」が、翻訳されないまま英語が残る。
- **根本原因:** i18n:check スクリプトは en.ts のキーとコードの使用箇所を照合するが、スプレッドで英語をそのまま引き継いでいるロケールファイルは検出できない。

---

### UX / 文言

#### ユーザー向けテキストに専門用語を使わない

- **ルール:** ファイル名、ディレクトリ名、JSON、スキーマなどの内部用語をユーザーに見せない。技術的に「何であるか」ではなく、「何をするか」を説明する。
- **根本原因:** 開発者がバックアップの中身を正確に記述した（`manifest.json + photos/`）が、その目的を説明すべきだった。

---

## 実戦レッスン（Repolog リリースから得た汎用知見）

> 以下は Repolog アプリ（iOS/Android リリース済み）の開発・申請・運用で得た教訓のうち、
> アプリ非依存の汎用パターンのみを抽出したもの。

### ストア申請

#### en-US メタデータの法的リンク漏れで App Store リジェクト

- **何が起きたか:** ローカライズ時に ja 他 17 言語の description.txt にはフッターリンク (Privacy Policy / Terms of Use) を追加したが、en-US の原文に追加し忘れた。en-US の privacy_url.txt も空のままだった。Guideline 3.1.2(c) でリジェクト
- **根本原因:** 「原文は最初に書くので完成済み」という思い込み。ローカライズ後に他言語に追加した要素を原文にも反映するチェックが欠如していた
- **ルール:** ストア申請前に全ロケールの必須フィールド（privacy_url.txt が非空、description.txt に法的リンク含む）を横断チェックする。原文（en-US）は「完成済み」ではなく「ローカライズと同じチェック対象」として扱う

---

### ビルド・環境変数

#### API キーがビルドに含まれず課金画面が全プラン「Unavailable」

- **何が起きたか:** EAS local build で .aab をビルドしたが、Paywall 画面の全プランが「Unavailable」。RevenueCat の API キーが EAS production 環境に未登録だったため、`app.config.ts` の `process.env.REVENUECAT_*_API_KEY` が undefined → 空文字にフォールバック → バイナリに空文字が埋め込まれた
- **根本原因:** `eas build --local` は `.gitignore` に従い `.env` を一時ビルドディレクトリにコピーしない。環境変数は EAS サーバーの environment 設定から注入されるが、新しいキーの登録が漏れていた
- **ルール:**
  1. 新しい API キーを追加したら **3 箇所を同時更新**: `.env`（ローカル開発）、EAS 環境変数（`eas env:create --environment production`）、`.env.example`（チーム共有）
  2. ビルドスクリプトに環境変数チェックを必ず入れる（`scripts/prebuild-env-check.mjs`）
  3. ビルド後は `assets/app.config` の `extra` フィールドで API キーの埋め込みを検証する
  4. RevenueCat SDK のログが出ない場合は、API キーの不在を最初に疑う
  5. EAS ビルドログの「Environment variables loaded from ... environment on EAS」行で、必要な変数がリストされているか確認する

---

### 画像・ファイルパス

#### Store 更新後にアプリ内画像が全て表示不能

- **何が起きたか:** App Store / Google Play 経由でアプリを更新すると、更新前に保存した全画像が表示されなくなった。画像エリアが黒いプレースホルダー、タップするとローディングスピナーが無限回転
- **根本原因:** DB に**絶対パス**（`file:///var/mobile/Containers/Data/Application/UUID/Documents/...`）を保存していた。iOS では Store 更新時にコンテナ UUID が変更されうるため、旧パスで画像ファイルを参照できなくなる。開発中の `expo run:ios` や `eas build --local` → `adb install` ではコンテナ UUID が変わらないため再現しない
- **ルール:**
  1. **ファイルシステムのパスを DB に保存するときは必ず相対パスを使う**（Apple 公式: 「アプリコンテナへの絶対パスを永続ストレージに保存してはいけない」）
  2. `filePathUtils.ts` の `toRelativePath()` / `toAbsolutePath()` を通じてパス変換を行う
  3. リリース前に Store 更新シナリオのテスト（旧バージョン → 新バージョンアップデート後にデータが残っているか）を手動チェックリストに含める
  4. DB にファイルパスを含むカラムを追加する場合は、必ず相対パスで保存されることをレビューする

---

### CI/CD

#### ビルド検証スクリプトの iOS IPA 未対応

- **何が起きたか:** Android APK/AAB 用に設計した postbuild-verify スクリプトを iOS TestFlight パイプラインで使おうとしたが、IPA 内のパス構造の違いで `assets/app.config not found` エラーが発生
- **根本原因:** IPA 内のパスは `Payload/AppName.app/EXConstants.bundle/app.config` であり、APK/AAB の `assets/app.config` とは異なる。さらに IPA の ZIP エントリは Data Descriptor 形式（PKWARE APPNOTE 4.4.4）で書かれており、Local File Header ベースの自作パーサーでは読めない
- **ルール:**
  1. ビルド検証スクリプトを新プラットフォームの CI で使う前に、実物アーカイブの `unzip -l` 出力を確認する
  2. プラットフォーム固有の CI ステップは、対象プラットフォームのアーカイブ形式（APK/AAB/IPA）で事前にローカルテストする
  3. 必須チェックキーはプラットフォーム別に分離する（iOS ビルドに Android API キーは不要）
  4. **ビルドキー検証は「手元の .env」ではなく「EAS 環境変数」を直接見る**（`eas env:list` を使う）
  5. リリースワークフローは build & ship に絞り、品質チェックは PR ワークフロー（`ci.yml`）に集約する

---

### デバッグワークフロー

#### Android logcat の False Positive パターン

- **何が起きたか:** Android ログ監視で、アプリとは無関係なシステムログがエラーとして検出され、デバッグの邪魔になった
- **無視すべきシステムログ:**
  - `Finsky` (Google Play): VerifyApps パッケージスキャン
  - `FullBackup_native`: Android バックアップデータ計測
  - `installd`: キャッシュパージ / ストレージ管理
  - `PFTBT/Backup`: バックアップ転送エラー（クォータ超過）
  - `ActivityManager`: プロセスライフサイクル（bkup, prev, empty, cch）
  - `NxpTml / WifiStaIfaceHidlImpl`: ハードウェア I/O エラー（NFC, WiFi）
- **ルール:** logcat 監視スクリプトにはこれらのタグを除外フィルタとして設定する

#### Dev Build + Metro が必須な理由

- **何が起きたか:** Preview/Production ビルドでデバッグしようとしたが、`__DEV__` ガード付きのログが一切出力されなかった
- **根本原因:** `__DEV__` ガード付きのログは Dev Build + Metro 接続時のみ出力される。Preview/Production ビルドでは Hermes のデッドコード除去で完全に消える
- **ルール:** デバッグログに依存する作業（自動スクリーンショット、ナビゲーション監視等）は必ず Dev Build + Metro 接続環境で行う

---

### Android

#### predictiveBackGestureEnabled で戻るジェスチャーがアプリ終了になる

- **何が起きたか:** Android 端末で左端スワイプバック（戻るジェスチャー）をすると、前の画面に戻らずアプリが閉じる。全画面で発生
- **根本原因:** `app.json` の `predictiveBackGestureEnabled: true` が `react-native-screens` v4 未対応の Predictive Back API を有効化。ジェスチャーが JS レイヤーをバイパスし、Activity 終了として処理される
- **一次情報:** expo/expo#39092（OPEN）、react-native-screens Discussion #2540
- **ルール:**
  1. `react-native-screens` が Predictive Back を正式サポートするまで `predictiveBackGestureEnabled: false` を維持する
  2. 非同期処理中にバックで離脱されるリスクがある画面には `BackHandler`（Android）を追加する
  3. SDK/ライブラリアップグレード時に expo/expo#39092 の解決状況を確認する

---

### 開発環境

#### 非インタラクティブシェルで nvm Node が PATH に含まれない

- **何が起きたか:** Claude Code の Bash 環境で `node -v` が古いバージョンを返し、EAS ローカルビルドが失敗する。`.bashrc` に `nvm use` 設定済みだが効かない
- **根本原因:** nvm.sh は非インタラクティブシェルで PATH を変更しない場合がある。apt インストールの `/usr/bin/node`（古いバージョン）が優先される
- **ルール:**
  1. `.bashrc` の nvm セクションに「nvm が PATH を変更しなかった場合のフォールバック」を追加する
  2. `.nvmrc` や `engines` フィールドは「警告」であり「強制」ではない。PATH 自体の設定が根本対策

#### Claude Code Bash 環境で ANDROID_HOME / JAVA_HOME / Node PATH が未設定

- **何が起きたか:** Claude Code から `eas build --local` や `./gradlew assembleRelease` を実行すると失敗。`ANDROID_HOME` 未設定 → SDK not found
- **根本原因:** Claude Code は「非インタラクティブ・非ログイン」シェルを実行するため `.bashrc` も `.profile` も読み込まれない。さらに Gradle デーモンは初回起動時の PATH をキャッシュするため、手動 export 後もデーモン再起動なしでは反映されない
- **ルール:**
  1. **シェル初期化ファイルに依存しない**: 環境変数は `.bashrc` / `.profile` ではなく、ツール固有の設定（Claude Code の `settings.local.json` の `env`）で設定する
  2. **修正後は失敗コンテキストで検証する**: ターミナルで動いても Claude Code の Bash で動くとは限らない
  3. **Gradle ビルド前は `./gradlew --stop` + `--no-daemon`**: PATH 変更がデーモンにキャッシュされる問題を回避する

---

### ドキュメント棚卸

#### AI 生成ドキュメントの蓄積と技術スタック不整合

- **何が起きたか:** docs/ 配下が 85 ファイル・9,500 行以上に膨張。技術スタック不一致の参照実装が大量に放置。テンプレート 3 ファイルで同じ項目が 3 重重複
- **根本原因:** ドキュメント追加時の索引更新ルールが CI で強制されていない。AI 生成ドキュメントが無制限に蓄積される仕組みだった
- **ルール:**
  1. AI 生成ドキュメントは必ず技術スタック整合性を確認してからコミットする
  2. テンプレートはソロ開発の現実的な運用負荷に合わせて設計する
  3. バイナリ成果物（PNG/MP4/ログ）は docs/ ではなく gitignore 対象のディレクトリに保存する

#### ファイル移動・リネーム時の参照整合性

- **何が起きたか:** ファイル移動/リネーム後に古いパスへの参照が大量に残存。CIゲート追加時に関連ドキュメントの更新が漏れ、「CI は 4 ゲート」の記載が 7 箇所で不正確だった
- **根本原因:** ファイル移動/リネーム時に全参照の更新を確認するプロセスがない
- **ルール:**
  1. ファイルを移動/リネームしたら `grep -r "旧パス" docs/ .github/ scripts/ AGENTS.md` で全参照を確認する
  2. CI ゲートやスクリプトを変更したら、そのコマンドを記載している全 how-to を更新する（`pnpm verify` 1 コマンドに統一推奨）
  3. コンプライアンス文書（データ安全性申告）は実装（app.config.ts, 依存関係）と照合する
