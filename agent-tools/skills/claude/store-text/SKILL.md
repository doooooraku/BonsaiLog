---
name: store-text
description: Generate App Store and Google Play listing text (title, description, keywords).
user-invocable: true
argument-hint: '[対象言語 or --all (デフォルト: ja + en)]'
---

# /store-text — ストア掲載テキスト生成

ユーザーが「ストアの説明文を書いて」「App Store / Google Play のテキストを生成」と言ったらこの手順に従う。

## 入力

- `docs/explanation/product_strategy.md` を読み、以下を把握:
  - アプリの 1 行説明
  - ターゲットユーザー / ペルソナ
  - 主要機能
  - 差別化ポイント
  - 収益モデル

## 生成するテキスト

### Apple App Store

1. **サブタイトル**（30 文字以内） × 3 案
2. **プロモーションテキスト**（170 文字以内）
3. **概要**（4000 文字以内）
4. **キーワード**（100 文字以内、カンマ区切り、スペースなし）

### Google Play

5. **簡単な説明**（80 文字以内） × 3 案
6. **詳しい説明**（4000 文字以内）

## 構成ルール

概要 / 詳しい説明の構成:

1. キャッチコピー（1 行）
2. 主要機能（箇条書き 5 つ）
3. 差別化ポイント
4. 「こんな人におすすめ」
5. 技術的特徴（プライバシー、オフライン対応等）

## 制約

- **キーワード**: 競合が少なく検索ボリュームがあるものを優先
- **Apple**: シンプル / 簡潔
- **Google**: 詳細 / SEO 寄り
- **言語**: 日本語 + 英語で生成（19 言語版は別途）
- **禁止表現**:
  - 商標名（WhatsApp, LINE, Zalo 等）
  - 誇大表現（No.1, best, fastest, most popular）
  - 「Coming soon」「近日公開」等の未実装機能
- ラテン文字言語（fr, es, de, pt, it 等）はアクセント記号を必ず使う（ASCII-only 禁止）

## 品質チェック

- [ ] ASO: 検索キーワードが自然に含まれているか
- [ ] 訴求力: 最初の 3 行だけ読んでもインストールしたくなるか
- [ ] 審査: メタデータガイドライン違反がないか
- [ ] 文化依存の表現を避けているか

## 出力先

- `fastlane/metadata/<locale>/` に各ファイルとして保存
- `pnpm metadata:check` で検証
