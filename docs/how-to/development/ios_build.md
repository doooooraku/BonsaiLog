# iOS\_ビルド手順（Debug運用 / Release提出）

最終更新: 2026-01-20（JST）

> この文書は **最低限のたたき台** です。  
> 正確な手順・必要要件は **EAS / Apple 公式ドキュメント** を正としてください。

---

## 1. Debug（開発用）: シミュレータで確認

### 1-1. 全体の流れ（一本道）

1. iOS Simulator 起動（Xcode）
2. Metro 起動
3. Simulator で動作確認

### 1-2. 手順（超具体）

#### Step 0: ルートへ移動

```bash
cd <project-root>
```

意味：

- `cd`：フォルダ移動

#### Step 1: Metro 起動

```bash
npx expo start --clear
```

意味：

- `npx`：このプロジェクトの Expo を使って実行
- `expo start`：開発サーバ起動
- `--clear`：キャッシュ削除して起動

#### Step 2: iOS Simulator で起動

- Xcode の Simulator から端末を起動
- Metro の案内に従って iOS でアプリを開く

---

## 2. Release（提出用）: EAS で署名済みビルド

> ここは **プロジェクトごとの証明書/プロビジョニング** で差分が出ます。  
> まずは公式手順を確認してから進める。

### 2-1. “prebuild が必要か？”判定

ネイティブに効く変更をしたら：

```bash
npx expo prebuild --platform ios
```

意味：

- `expo prebuild`：ネイティブ（ios/）を設定に合わせて更新
- `--platform ios`：iOSのみ対象

### 2-2. iOS ビルド（EAS）

```bash
eas build -p ios --profile production --local --non-interactive --output=app.ipa
```

意味：

- `eas build`：ビルドを実行
- `-p ios`：iOS向け
- `--profile production`：提出用の設定
- `--local`：ローカルビルド
- `--non-interactive`：対話なし
- `--output`：成果物名

### 2-3. 提出（EAS Submit を使う場合）

```bash
eas submit -p ios --profile production
```

意味：

- `eas submit`：ストア提出を実行
- `-p ios`：iOS向け
- `--profile production`：提出用の設定

---

## 3. 事前に必要になりやすいもの

- Apple Developer Program への登録
- 証明書 / プロビジョニングプロファイル
- App Store Connect でのアプリ登録

---

## 4. 参考（正は公式）

- Expo EAS Build（iOS）: https://docs.expo.dev/build/introduction/
- Expo EAS Submit（iOS）: https://docs.expo.dev/submit/introduction/
- Apple Developer: https://developer.apple.com/
