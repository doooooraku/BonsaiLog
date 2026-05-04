# Lessons: ビルド / 環境変数 / CI/CD / ファイルパス

> 索引: [`README.md`](./README.md)

---

### `@shopify/react-native-skia` ビルドで `Could not find libskia.a`

- **何が起きたか**: ローカル Gradle ビルド (`pnpm build:android:apk:local` / `./gradlew assembleDebug`) が `:shopify_react-native-skia:configureCMakeDebug[arm64-v8a] FAILED` で停止、CMake が `node_modules/@shopify/react-native-skia/libs/android/arm64-v8a` に `libskia.a` を見つけられないと報告。
- **根本原因**: `@shopify/react-native-skia` は `scripts/install-libs.js` で `react-native-skia-android` パッケージから libs を `libs/android/` にコピーする postinstall を持つが、pnpm の `onlyBuiltDependencies` 制限で初回 install 時に実行されないことがある。Skia は CMake 段で初めて libs 不在に気付くため、エラーが Gradle 内部のメッセージに埋もれて `unknown error` になる。
- **ルール**:
  1. `@shopify/react-native-skia` を新規追加 / 更新した直後は `node node_modules/@shopify/react-native-skia/scripts/install-libs.js` を 1 度実行して `libs/android/` に `arm64-v8a` 等が並ぶことを確認する。
  2. `pnpm install` 時に postinstall がスキップされる場合は `package.json` の `pnpm.onlyBuiltDependencies` に `@shopify/react-native-skia` を追加するか、`postinstall` script で明示的に `node node_modules/@shopify/react-native-skia/scripts/install-libs.js` を呼ぶ。
  3. EAS local build の出力 (`eas-cli-local-build-plugin`) はエラーを集約して `unknown error` と出すため、詳細は `cd android && ./gradlew assembleDebug` を直接走らせて取得する。
  4. Skia 関連の CMake エラーが出たらまず `ls node_modules/@shopify/react-native-skia/libs/android/` で libs の有無を確認する (即原因切り分け)。

---

### API キーがビルドに含まれず課金画面が全プラン「Unavailable」

- **何が起きたか**: EAS local build で .aab をビルドしたが、Paywall 画面の全プランが「Unavailable」。RevenueCat の API キーが EAS production 環境に未登録だったため、`app.config.ts` の `process.env.REVENUECAT_*_API_KEY` が undefined → 空文字にフォールバック → バイナリに空文字が埋め込まれた
- **根本原因**: `eas build --local` は `.gitignore` に従い `.env` を一時ビルドディレクトリにコピーしない。環境変数は EAS サーバーの environment 設定から注入されるが、新しいキーの登録が漏れていた
- **ルール**:
  1. 新しい API キーを追加したら **3 箇所を同時更新**: `.env`（ローカル開発）、EAS 環境変数（`eas env:create --environment production`）、`.env.example`（チーム共有）
  2. ビルドスクリプトに環境変数チェックを必ず入れる（`scripts/prebuild-env-check.mjs`）
  3. ビルド後は `assets/app.config` の `extra` フィールドで API キーの埋め込みを検証する
  4. RevenueCat SDK のログが出ない場合は、API キーの不在を最初に疑う
  5. EAS ビルドログの「Environment variables loaded from ... environment on EAS」行で、必要な変数がリストされているか確認する

---

### Store 更新後にアプリ内画像が全て表示不能 (絶対パス禁止)

- **何が起きたか**: App Store / Google Play 経由でアプリを更新すると、更新前に保存した全画像が表示されなくなった。画像エリアが黒いプレースホルダー、タップするとローディングスピナーが無限回転
- **根本原因**: DB に **絶対パス**（`file:///var/mobile/Containers/Data/Application/UUID/Documents/...`）を保存していた。iOS では Store 更新時にコンテナ UUID が変更されうるため、旧パスで画像ファイルを参照できなくなる。開発中の `expo run:ios` や `eas build --local` → `adb install` ではコンテナ UUID が変わらないため再現しない
- **ルール**:
  1. **ファイルシステムのパスを DB に保存するときは必ず相対パスを使う**（Apple 公式: 「アプリコンテナへの絶対パスを永続ストレージに保存してはいけない」）
  2. `filePathUtils.ts` の `toRelativePath()` / `toAbsolutePath()` を通じてパス変換を行う
  3. リリース前に Store 更新シナリオのテスト（旧バージョン → 新バージョンアップデート後にデータが残っているか）を手動チェックリストに含める
  4. DB にファイルパスを含むカラムを追加する場合は、必ず相対パスで保存されることをレビューする

---

### ビルド検証スクリプトの iOS IPA 未対応

- **何が起きたか**: Android APK/AAB 用に設計した postbuild-verify スクリプトを iOS TestFlight パイプラインで使おうとしたが、IPA 内のパス構造の違いで `assets/app.config not found` エラーが発生
- **根本原因**: IPA 内のパスは `Payload/AppName.app/EXConstants.bundle/app.config` であり、APK/AAB の `assets/app.config` とは異なる。さらに IPA の ZIP エントリは Data Descriptor 形式（PKWARE APPNOTE 4.4.4）で書かれており、Local File Header ベースの自作パーサーでは読めない
- **ルール**:
  1. ビルド検証スクリプトを新プラットフォームの CI で使う前に、実物アーカイブの `unzip -l` 出力を確認する
  2. プラットフォーム固有の CI ステップは、対象プラットフォームのアーカイブ形式（APK/AAB/IPA）で事前にローカルテストする
  3. 必須チェックキーはプラットフォーム別に分離する（iOS ビルドに Android API キーは不要）
  4. **ビルドキー検証は「手元の .env」ではなく「EAS 環境変数」を直接見る**（`eas env:list` を使う）
  5. リリースワークフローは build & ship に絞り、品質チェックは PR ワークフロー（`ci.yml`）に集約する
