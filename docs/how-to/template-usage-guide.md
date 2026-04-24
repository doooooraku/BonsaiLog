# テンプレート使い方ガイド

このドキュメントでは、App Factory テンプレートを使って新しいアプリを作るまでの手順を、Phase 0〜4 に分けて説明します。

> **Phase 5 以降**（サービス連携、ストア公開、運用）は、各個別ドキュメントを参照してください。  
> → [Phase 5 以降のリンク集](#phase-5-以降のリンク集)

---

## Phase 0: 前提条件（ツールの準備）

アプリ開発を始める前に、以下のツールをパソコンにインストールしてください。

### 必須ツール

| ツール             | バージョン | 何をするもの？                            | インストール方法                                              |
| ------------------ | ---------- | ----------------------------------------- | ------------------------------------------------------------- |
| **Node.js**        | 22 以上    | JavaScript を動かすエンジン               | [nvm](https://github.com/nvm-sh/nvm) 経由がおすすめ           |
| **pnpm**           | 10 以上    | ライブラリ（部品）を管理するツール        | `npm install -g pnpm`                                         |
| **Git**            | 最新       | コードの変更履歴を管理するツール          | [git-scm.com](https://git-scm.com/)                           |
| **Android Studio** | 最新       | Android アプリの開発環境                  | [developer.android.com](https://developer.android.com/studio) |
| **JDK**            | 17         | Java の開発キット（Android ビルドに必要） | Android Studio に同梱                                         |
| **EAS CLI**        | 16 以上    | Expo のビルド・配信ツール                 | `npm install -g eas-cli`                                      |

### macOS の場合は追加で必要

| ツール        | 何をするもの？       | インストール方法             |
| ------------- | -------------------- | ---------------------------- |
| **Xcode**     | iOS アプリの開発環境 | Mac App Store から           |
| **CocoaPods** | iOS のライブラリ管理 | `sudo gem install cocoapods` |

### nvm で Node.js 22 をインストールする方法

```bash
# nvm をインストール（まだの場合）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash

# ターミナルを再起動してから:
nvm install 22
nvm use 22

# 確認
node --version  # v22.x.x と表示されればOK
```

### pnpm と EAS CLI のインストール

```bash
npm install -g pnpm
npm install -g eas-cli

# 確認
pnpm --version   # 10.x.x
eas --version     # eas-cli/16.x.x
```

---

## Phase 1: リポジトリ作成

### GitHub の「Use this template」を使う

1. ブラウザで [テンプレートリポジトリ](https://github.com/doooooraku/app_template) を開く
2. 緑の **「Use this template」** ボタンをクリック
3. **「Create a new repository」** を選ぶ
4. リポジトリ名を入力（例: `my-awesome-app`）
5. **Private** を選んで **「Create repository」** をクリック

> **「Fork」との違い:**
>
> - **Use this template**: テンプレートのコミット履歴を引き継がず、まっさらな状態で始められる（おすすめ）
> - **Fork**: テンプレートの全履歴を引き継ぐ。テンプレート自体を改善したい場合に使う

### ローカルにクローン

```bash
git clone https://github.com/あなたのユーザー名/リポジトリ名.git
cd リポジトリ名
```

---

## Phase 1.5: Claude Code Skills のインストール（最初の 1 回のみ）

> **重要**: Claude Code v2.1+ は **プロジェクト直下の `.claude/skills/` を認識しません**。Skills は **ユーザーレベル `~/.claude/skills/`** に配置する必要があります。

このテンプレートには **11 個の Claude Code Skills + 3 個の Codex Skills** が同梱されています。最初に 1 回だけ **ユーザー領域にコピー**してください（2 回目以降の新アプリ作成時はスキップ可）。

**内訳**:

- **自作 (8)**: `/discuss` `/plan` `/review-pr` `/retro` `/progress` `/store-text` `/release-check` `/session-end` — W-flow + セッション終了用
- **Anthropic 公式 (1)**: `skill-creator` — 新しい Skill を対話形式で作成 ([anthropics/skills](https://github.com/anthropics/skills))
- **Callstack 公式 (2)**: `react-native-best-practices` `upgrading-react-native` — RN パフォーマンス/アップグレード ([callstackincubator/agent-skills](https://github.com/callstackincubator/agent-skills), MIT)

### Skills を `~/.claude/skills/` にインストール

```bash
mkdir -p ~/.claude/skills
cp -r .claude/skills/* ~/.claude/skills/

# Codex 用（実装）— Codex を使う場合のみ
mkdir -p ~/.codex/skills
cp -r .codex/skills/* ~/.codex/skills/
```

### インストール確認

新しい Claude Code セッションを起動して `/skills` を実行すると、11 個の Claude Code Skills が表示されます。

### 各 Skill の使い方

| Skill                         | 呼び出し                   | いつ使う                                       |
| ----------------------------- | -------------------------- | ---------------------------------------------- |
| `/discuss`                    | `/discuss <議題>`          | 議論したい・方針を決めたい                     |
| `/plan`                       | `/plan #123`               | Issue を実装前の状態まで固める                 |
| `/review-pr`                  | `/review-pr #456`          | Codex が作った PR をレビュー                   |
| `/retro`                      | `/retro <対象>`            | マイルストーン完了・リリース後                 |
| `/progress`                   | `/progress`                | 進捗 3 軸確認                                  |
| `/store-text`                 | `/store-text`              | ストア掲載テキスト生成                         |
| `/release-check`              | `/release-check`           | リリース前最終チェック                         |
| `/session-end`                | `/session-end`             | **毎セッション終了時** (memory保存+commit提案) |
| `skill-creator`               | 自動起動（Skill を作る時） | 新しい独自 Skill を対話形式で作成              |
| `react-native-best-practices` | 自動起動（RN 最適化時）    | FPS/TTI/バンドルサイズ/メモリ最適化            |
| `upgrading-react-native`      | 自動起動（RN 更新時）      | Expo SDK/RN バージョンアップ時の diff 適用手順 |

> **補足**: `skill-creator`・`react-native-best-practices`・`upgrading-react-native` は `description` マッチングで **自動的に**トリガーされる設計です（`/xxx` で明示呼び出しはしません）。

### Skills をプロジェクト単位で管理したい場合

現行の Claude Code では不可能ですが、将来対応された場合に備えて、このテンプレートでは `.claude/skills/<name>/SKILL.md` の構造で同梱しています。

---

## Phase 2: 初期セットアップ（setup.sh）

### setup.sh を実行する

```bash
bash setup.sh
```

スクリプトが以下の項目を聞いてきます。一つずつ入力してください。

### 入力項目の説明

| 項目                       | 意味                               | 入力例                       | 補足                     |
| -------------------------- | ---------------------------------- | ---------------------------- | ------------------------ |
| **アプリ表示名**           | ユーザーに見えるアプリの名前       | `My App`                     | スペースや日本語もOK     |
| **アプリスラッグ**         | URL やフォルダ名に使う英数字の名前 | `my-app`                     | 小文字・ハイフンのみ推奨 |
| **Android パッケージ名**   | Android 上でアプリを識別する名前   | `com.example.myapp`          | 一度公開したら変更不可   |
| **iOS バンドルID**         | iOS 上でアプリを識別する名前       | `com.example.myapp`          | 通常 Android と同じ      |
| **ディープリンクスキーム** | アプリを URL から開くための接頭辞  | `myapp`                      | 小文字英数字のみ         |
| **アプリの一行説明**       | アプリの簡単な説明                 | `毎日の習慣を記録するアプリ` |                          |
| **EAS プロジェクトID**     | EAS のプロジェクト識別子           | `xxxxxxxx-xxxx-...`          | 不明なら空欄でOK         |

### EAS プロジェクト ID の取得方法

EAS プロジェクト ID は、Expo のクラウドビルドやOTAアップデートに必要です。後から設定もできます。

1. [expo.dev](https://expo.dev/) にログインする
2. **「Projects」** →**「Create a project」** をクリック
3. プロジェクト名を入力して作成
4. プロジェクトページの URL に含まれる UUID がプロジェクト ID
   - 例: `https://expo.dev/accounts/xxx/projects/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
   - この `xxxxxxxx-xxxx-...` の部分がプロジェクト ID

> **💡 後から設定する場合:** `.env` ファイルの `EAS_PROJECT_ID=` に値を入れればOK

### setup.sh が内部でやっていること

1. コードベース内の `{{APP_NAME}}` などのプレースホルダーをあなたの入力値に置換
2. `.env.example` を元に `.env` ファイルを作成
3. `app.json` と `package.json` を更新
4. `TEMPLATE_README.md` を削除（セットアップ後は不要）
5. `pnpm install` で依存関係をインストール
6. `pnpm verify` で全チェックを実行

### よくある間違い

| 間違い                       | 対処                                                    |
| ---------------------------- | ------------------------------------------------------- |
| パッケージ名に大文字を使った | 小文字のみ使用する（例: `com.Example` → `com.example`） |
| スラッグにスペースを入れた   | ハイフンに置き換える（例: `my app` → `my-app`）         |
| EAS ID を間違えた            | `.env` の `EAS_PROJECT_ID` を直接修正すればOK           |

---

## Phase 3: 初回起動

### 重要: Expo Go では動きません

このテンプレートには **ネイティブモジュール**（AdMob、RevenueCat、SQLite など）が含まれているため、Expo Go アプリでは実行できません。**Dev Build**（開発用ビルド）を作成する必要があります。

> **Expo Go とは?**
> Expo が提供する汎用アプリ。簡単なアプリならこれで動くが、ネイティブモジュールを使うアプリには対応していない。
>
> **Dev Build とは?**
> あなたのアプリ専用の開発用バイナリ。ネイティブモジュールを含んでビルドされるため、すべての機能が動く。

### Dev Build の作り方（Android）

```bash
# ローカルでビルド（おすすめ・無料）
eas build -p android --profile development --local

# または EAS クラウドでビルド（月30回まで無料）
eas build -p android --profile development
```

ビルドが完了すると `.apk` ファイルが生成されます。

### APK をデバイスにインストール

```bash
# USB で接続したデバイスにインストール
adb install dist/app-factory-template-dev.apk

# デバイスが認識されているか確認
adb devices
```

### 開発サーバーを起動

```bash
pnpm dev
```

デバイスでアプリを開くと、Metro（開発サーバー）に自動接続されます。コードを変更すると画面が即座に更新されます（Hot Reload）。

### 物理デバイスでの起動（ワンコマンド）

```bash
# ADB接続確認 + ポートフォワーディング + Metro起動を一括で行う
pnpm dev:android
```

### Dev Build の作り方（iOS・macOS のみ）

```bash
# ローカルでビルド
eas build -p ios --profile development --local

# シミュレータで起動
pnpm dev
# Metro で 'i' キーを押す
```

---

## Phase 3.5: 実機スモークテスト（最重要）

> **Repolog の教訓**: コア実装後 28 日間、実機テストをしなかった結果、6 件のバグが同時に噴出し修正に 10 日以上かかった。**Phase 3 完了後 3 日以内に必ず実機テストを行うこと。**

### なぜ Phase 3.5 が必要か

Jest や TypeScript の型チェックでは native bridge API（expo-print, expo-image-manipulator 等）の境界条件バグを検出できません。実機でしか発見できないバグ（OOM, hang, blank output, メモリリーク等）は、早期に発見するほど修正コストが低い。

### チェックリスト

#### 準備

- [ ] Dev Build APK をビルド: `pnpm build:android:apk:local`
- [ ] 実機に ADB でインストール
- [ ] Metro 接続を確認

#### 全画面基本操作

- [ ] Home 画面が表示される
- [ ] 主要機能の作成→保存→表示の全フロー
- [ ] 設定画面の全項目が動作
- [ ] ダークモード切替
- [ ] 戻るジェスチャー（Android）

#### native API 境界条件テスト

- [ ] PDF 生成（該当する場合）: 0枚/1枚/10枚/50枚
- [ ] カメラ撮影→保存→出力の全フロー
- [ ] バックアップ: Export → Import → データ整合性

#### 完了基準

- [ ] **P0/P1 バグがゼロ**（Phase 4 に進む前提条件）
- [ ] 発見した P2 以下のバグが Issue 化済み
- [ ] `pnpm verify` 全パス

---

## Phase 4: カスタマイズ

### 削除すべきサンプルコード

テンプレートにはサンプルコードが含まれています。自分のアプリを作り始める前に、以下を削除・置き換えてください。

| ファイル・フォルダ                    | 内容                   | 対処                     |
| ------------------------------------- | ---------------------- | ------------------------ |
| `src/features/example/`               | サンプル機能           | フォルダごと削除         |
| `src/db/exampleRepository.ts`         | サンプル DB リポジトリ | 削除                     |
| `src/db/schema.ts`                    | サンプルテーブル定義   | 自分のスキーマに書き換え |
| `app/(tabs)/explore.tsx`              | サンプル画面           | 自分の画面に書き換え     |
| `components/hello-wave.tsx`           | サンプルコンポーネント | 削除                     |
| `components/parallax-scroll-view.tsx` | サンプルコンポーネント | 必要なければ削除         |

### 画面の追加方法

Expo Router はファイルベースのルーティングを使います。ファイルを置くだけで画面が追加されます。

```bash
# 例: 新しいタブ画面を追加
app/(tabs)/my-screen.tsx    # ← このファイルを作ると /my-screen ルートが追加される
```

```tsx
// app/(tabs)/my-screen.tsx の最小構成
import { View, Text } from 'react-native';

export default function MyScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Hello!</Text>
    </View>
  );
}
```

### i18n キーの追加方法

1. `src/core/i18n/locales/en.ts` にキーを追加
2. **全19言語のファイル** に同じキーを追加（`...baseEn` フォールバックに頼らない）
3. `pnpm i18n:check` で漏れがないか確認

```ts
// src/core/i18n/locales/en.ts
export const en = {
  // ... 既存のキー
  myFeature: {
    title: 'My Feature',
    description: 'This is my feature',
  },
};
```

> **重要:** `...baseEn` スプレッドがあると英語がフォールバックとして使われますが、これに頼ると「翻訳されていない」キーを見落とします。必ず全ファイルに明示的に追加してください。

### DB テーブルの追加方法

このテンプレートでは `expo-sqlite` と `PRAGMA user_version` によるマイグレーションパターンを使います。

1. `src/db/schema.ts` にテーブル定義を追加
2. `src/db/db.ts` のマイグレーション関数に `CREATE TABLE` を追加
3. `PRAGMA user_version` をインクリメント

```ts
// マイグレーションの例
if (currentVersion < 2) {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS my_table (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
db.execSync('PRAGMA user_version = 2');
```

> **注意:** `ALTER TABLE ADD COLUMN` を使う場合は、カラムの存在チェックを先に行ってください（冪等性の確保）。詳しくは [lessons.md](../reference/tasks/lessons.md) を参照。

### アイコン・スプラッシュの差し替え

| ファイル                                    | 用途                       | サイズ        |
| ------------------------------------------- | -------------------------- | ------------- |
| `assets/images/icon.png`                    | アプリアイコン             | 1024x1024     |
| `assets/images/splash-icon.png`             | 起動画面のロゴ             | 200x200 以上  |
| `assets/images/android-icon-foreground.png` | Android Adaptive Icon 前景 | 108dp (432px) |
| `assets/images/android-icon-background.png` | Android Adaptive Icon 背景 | 108dp (432px) |
| `assets/images/android-icon-monochrome.png` | Android モノクロアイコン   | 108dp (432px) |
| `assets/images/favicon.png`                 | Web 用ファビコン           | 48x48         |

> `app.json` の `icon`、`splash`、`android.adaptiveIcon` のパスがこれらのファイルを参照しています。ファイル名を変える場合は `app.json` も更新してください。

---

## Phase 5 以降のリンク集

セットアップとカスタマイズが終わったら、以下のドキュメントを参照してください。

| Phase | 内容                              | ドキュメント                                                             |
| ----- | --------------------------------- | ------------------------------------------------------------------------ |
| 5     | サービス連携（Sentry）            | [development/sentry_setup.md](./development/sentry_setup.md)             |
| 5     | サービス連携（AdMob・RevenueCat） | `.env` のキー設定で有効化                                                |
| 6     | テスト                            | [testing/testing.md](./testing/testing.md)                               |
| 6     | デバッグ                          | [development/debug_guide.md](./development/debug_guide.md)               |
| 7     | ストア掲載準備                    | [workflow/store_listing_guide.md](./workflow/store_listing_guide.md)     |
| 7     | スクリーンショット生成            | [workflow/screenshot_generation.md](./workflow/screenshot_generation.md) |
| 8     | Android ビルド                    | [development/android_build.md](./development/android_build.md)           |
| 8     | iOS ビルド                        | [development/ios_build.md](./development/ios_build.md)                   |
| 9     | 開発フロー全体                    | [workflow/whole_workflow.md](./workflow/whole_workflow.md)               |
| 9     | Git ワークフロー                  | [workflow/git_workflow.md](./workflow/git_workflow.md)                   |
| 9     | 実装ルール                        | [development/coding_rules.md](./development/coding_rules.md)             |
