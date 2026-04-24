# Android\_ビルド手順（Debug運用 / Release提出）

最終更新: 2026-01-19（JST）

## 2. Debug（開発用）: ExpoGoを活用しエミュレータでデバッグ

### 2-1. 全体の流れ（一本道）

1. エミュレータ起動（Android Studioなど）
2. adb devicesで接続確認
3. Metro起動
4. ExpoGoを用いてエミュレータで確認

### 2-2. 手順（超具体）

#### Step 0: ルートへ移動

cd <project-root>

意味：

- cd：フォルダ移動

#### Step 1: adb接続確認

adb devices

意味：

- adb：Android端末/エミュレータ操作ツール
- devices：接続端末一覧を表示

#### Step 2: Metro起動

npx expo start --clear

意味：

- npx：このプロジェクトのExpoを使って起動
- expo start：開発サーバ開始
- --clear：キャッシュ削除して起動

#### Step 3: ExpoGoで確認

- エミュレータ上でExpoGoを起動
- MetroのQR/URLから対象プロジェクトを開いて動作確認

## 3. Release（提出用）: EASで署名済みAABを作る

### 3-1. “prebuildが必要か？”判定

ネイティブに効く変更をしたら：
npx expo prebuild --platform android

意味：

- expo prebuild：ネイティブ側（android/）を設定に合わせて更新
- --platform android：Androidのみ対象

### 3-2. AAB作成（初回：鍵作成のため）

（実行場所）プロジェクトルート
eas build -p android --profile production --local --non-interactive --output=○○.aab

意味：

- eas build：ビルド
- -p android：Android向け
- --profile production：提出用設定
- --local：ローカルでビルド
- --non-interactive：対話なし
- --output：成果物名

### 3-3. 提出（EAS Submitを使う場合）

- Google Playのサービスアカウントキーが必要（EAS Credentialsに登録して再利用）

## 4. AAB作成（2回目以降）: GradleでAABファイル作成

注意：

- versionCodeを確実に増やす

### 4-1. AAB作成

cd android
./gradlew clean
./gradlew bundleRelease

意味：

- cd android：Androidネイティブプロジェクトへ移動
- ./gradlew：Gradle Wrapperでビルド実行
- clean：前回成果物を削除
- bundleRelease：Release用AABを生成

### 4-2. 成果物確認

ls -alht app/
ls -ahlt app/build/outputs/bundle/release/

### 4-3. 証明書情報の確認（必要時）

keytool -printcert -jarfile app/build/outputs/bundle/release/app-release.aab

成果物：
android/app/build/outputs/bundle/release/app-release.aab
