# ストアスクリーンショット生成

## 概要

スクリーンショットパイプライン（Screenshot Pipeline）は、Maestro で撮影した生のスクリーンショットから、Apple App Store と Google Play 向けの合成画像（Composite）を生成します。

## パイプラインの各フェーズ

### Phase 0: マーケティングテキスト生成

Claude Code を使って、各言語のマーケティング文言を作成します。

1. テンプレートから `scripts/store-screenshots/screenshot-config.ts` を作成する
2. Claude Code に `data/marketing-text.ts` の生成を依頼する

### Phase 1: 生スクリーンショットの撮影

Maestro を使って、各ロケール（言語設定）の生スクリーンショットを撮影します。

```bash
# Maestro フローを実行してスクリーンショットを撮影する
maestro test maestro/flows/screenshots.yml
```

スクリーンショットは `screenshots/raw/<locale_dir>/` に保存されます。

### Phase 2: 合成画像の生成

```bash
# 全ロケール・両ストア向けに生成
npx tsx scripts/store-screenshots/generate.ts

# Apple のみ
npx tsx scripts/store-screenshots/generate.ts --store apple

# 特定のロケールのみ
npx tsx scripts/store-screenshots/generate.ts --lang ja
```

## セットアップ

```bash
# 1. 必要なツールをインストール
pnpm add -D playwright sharp tsx
npx playwright install chromium

# 2. テンプレートから設定ファイルを作成
cp scripts/store-screenshots/screenshot-config.ts.template \
   scripts/store-screenshots/screenshot-config.ts

# 3. アプリのマーケティングテキストと画面定義を設定ファイルに記入する
```

## ストアの要件

| ストア          | スマートフォン   | タブレット        |
| --------------- | ---------------- | ----------------- |
| Apple App Store | 1290x2796 (6.7") | 2048x2732 (12.9") |
| Google Play     | 1290x2796        | 2048x2732         |

## ヒント

- Phase 1 は実機で実行すると、もっとも正確なスクリーンショットが撮れます
- マーケティングテキストは短めに（1 行あたり 2〜3 語がベスト）
- 19 ロケール全部を生成する前に、まず 1 ロケールでテストしましょう
- スクリーンショットは `screenshots/store/` に出力されます（gitignore 対象）
