# P-05: ローカル APK ビルド

- **渡す先**: Claude Code
- **タイミング**: 一通り実装が終わった後
- **目的**: ビルドして実機にインストール

---

## 指示

**まず以下のビルド手順書を読み込んでから作業してください**:

`{PROJECT_ROOT}/docs/how-to/development/android_build.md`

手順書に記載された環境要件（Node バージョン、SDK パス、環境変数等）を
確認してから進めてください。**手順書と異なる方法でビルドしないこと**。

## 手順（android_build.md に準拠）

### 1. 環境確認

- Node バージョンが手順書の要件を満たしているか確認
  （`.nvmrc` がある場合は `nvm use` で合わせる）
- Android SDK パスが正しいか確認
- 必要な環境変数（.env）が設定されているか確認

### 2. ビルド前チェック

- `pnpm verify` を実行（5 ゲート全パス必須）
- `prebuild-env-check` スクリプトがあれば実行
- `eas-build-doctor` Agent が利用可能なら起動してプリフライトチェック

### 3. APK ビルド

**android_build.md 記載のコマンドを使用する。**

WSL2 環境の場合は `PATH=/usr/bin:/bin:$PATH` を prepend すること。

### 4. 実機インストール

android_build.md 記載のインストールコマンドを使用する。

### 5. ビルド後検証

- `postbuild-verify` スクリプトがあれば実行
- APK 内の設定ファイルを確認（API キーの埋め込み状況）

## 失敗時の対応

1. **まず android_build.md の「よくある詰まりポイント」セクションを確認**
2. Node バージョン不一致 → `.nvmrc` に合わせる
3. ENOENT エラー → PATH に `/usr/bin:/bin` を追加
4. prebuild-env-check 失敗 → `.env` と EAS 環境変数を確認
5. **手順書にない問題の場合はエラーメッセージ全文を報告して停止**
   （推測で修正しない）

## 完了条件

- [ ] APK ファイルが生成されている
- [ ] ファイルサイズが妥当
- [ ] 実機にインストールして起動確認
- [ ] ビルド後検証をパス（スクリプトがある場合）
