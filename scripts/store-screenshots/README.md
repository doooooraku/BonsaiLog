# ストアスクリーンショットパイプライン（Store Screenshot Pipeline）

Apple App Store と Google Play 向けの、ストア掲載用の合成スクリーンショットを生成する。

それぞれの合成画像は、白い背景の上にマーケティングテキストのキャプション、その下に角丸と薄い影のついたアプリのスクリーンショットで構成される。

## パイプラインの概要

### Phase 0 -- マーケティングテキストの生成

Claude Code が `screenshot-config.ts` を読み込み、各画面・各ロケールのマーケティング文言を含む `data/marketing-text.ts` を生成する。

**入力:** `screenshot-config.ts`（アプリ情報、ペルソナ、画面の定義、テキストのガイドライン）
**出力:** `data/marketing-text.ts`

### Phase 1 -- 生スクリーンショットの撮影

Maestro が動作中のアプリから各ロケールの生スクリーンショットを撮影する。スクリーンショットは `screenshots/raw/<locale_dir>/` に保存される。

**入力:** Maestro フローファイル
**出力:** `screenshots/raw/<locale_dir>/<screen_id>.png`

### Phase 2 -- 合成画像の生成

`generate.ts` スクリプトが最終的なストア画像を合成する:

1. **合成（Compose）** -- マーケティングテキストとトリミングしたスクリーンショットを含む HTML ページを作成する
2. **レンダリング（Render）** -- Playwright がストアの正確なサイズで HTML をレンダリングする
3. **後処理（Postprocess）** -- Sharp がアルファを平坦化し、sRGB ICC を埋め込み、サイズを検証する

**入力:** 生スクリーンショット + マーケティングテキスト
**出力:** `screenshots/store/<store>/<locale_dir>/<screen_id>.png`

## セットアップ

### 1. 依存パッケージのインストール

```bash
pnpm add -D playwright sharp tsx
npx playwright install chromium
```

### 2. screenshot-config.ts の作成

```bash
cp scripts/store-screenshots/screenshot-config.ts.template \
   scripts/store-screenshots/screenshot-config.ts
```

ファイルを編集して、すべての TODO セクションにアプリ固有の値を入力する。

### 3. マーケティングテキストの生成（Phase 0）

Claude Code に `screenshot-config.ts` を読み込ませて `data/marketing-text.ts` を生成させる。

### 4. pnpm スクリプトの追加

`package.json` に以下を追加する:

```json
{
  "scripts": {
    "store-screenshots": "npx tsx scripts/store-screenshots/generate.ts"
  }
}
```

## 使い方

```bash
# 全ロケール・両ストア向けに生成
pnpm store-screenshots

# Apple App Store のみ
pnpm store-screenshots --store apple

# Google Play、日本語のみ
pnpm store-screenshots --store google --lang ja

# 複数ロケール
pnpm store-screenshots --lang en,ja,fr
```

## 出力サイズ

| ストア | サイズ      | 備考                                      |
| ------ | ----------- | ----------------------------------------- |
| Apple  | 1320 x 2868 | iPhone 6.9" -- App Store で必須           |
| Google | 1080 x 1920 | スマートフォン -- Google Play 標準 (9:16) |

## ディレクトリ構成

```
scripts/store-screenshots/
  generate.ts                    # CLI エントリーポイント
  screenshot-config.ts           # アプリ固有の設定（.template から作成）
  screenshot-config.ts.template  # TODO 付きのテンプレート
  data/
    marketing-text.ts            # 生成されたマーケティング文言
  lib/
    config.ts                    # サイズ定数とパス解決
    fonts.ts                     # フォント管理（@font-face の生成）
    renderer.ts                  # Playwright レンダリング
    template.ts                  # HTML テンプレート生成
    postprocess.ts               # Sharp によるトリミング / 平坦化 / 検証

screenshots/
  raw/<locale_dir>/              # Maestro の撮影結果（Phase 1 の入力）
  store/<store>/<locale_dir>/    # 最終合成画像（Phase 2 の出力）
```

## フォント

デフォルトでは、パイプラインは `assets/fonts/` にある Noto Sans 可変フォントを使用する。フォントモジュール（`lib/fonts.ts`）が各ロケールに合ったフォントを自動的に選択する（例: 日本語には Noto Sans JP、簡体字中国語には Noto Sans SC）。

アプリで別のフォントを使う場合は、`lib/fonts.ts` の `FONTS` マップを編集する。
