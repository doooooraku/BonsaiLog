# ストア掲載アセット

Apple App Store と Google Play 向けの、ローカライズされたストア掲載コンテンツです。

## ディレクトリ構成

```
store-listing/
  android/
    <locale>/
      title.txt              # アプリタイトル（最大 30 文字）
      short-description.txt  # 短い説明（最大 80 文字）
      full-description.txt   # 詳しい説明（最大 4000 文字）
  ios/
    <locale>/
      description.txt        # App Store の説明
```

## 対応ロケール（19 言語）

| コード | 言語             | Android ディレクトリ | iOS ディレクトリ |
| ------ | ---------------- | -------------------- | ---------------- |
| en     | 英語             | en-US                | en-US            |
| ja     | 日本語           | ja-JP                | ja               |
| fr     | フランス語       | fr-FR                | fr-FR            |
| es     | スペイン語       | es-ES                | es-ES            |
| de     | ドイツ語         | de-DE                | de-DE            |
| it     | イタリア語       | it-IT                | it               |
| pt     | ポルトガル語     | pt-BR                | pt-BR            |
| ru     | ロシア語         | ru-RU                | ru               |
| zhHans | 中国語（簡体字） | zh-Hans              | zh-Hans          |
| zhHant | 中国語（繁体字） | zh-Hant              | zh-Hant          |
| ko     | 韓国語           | ko-KR                | ko               |
| hi     | ヒンディー語     | hi-IN                | hi               |
| id     | インドネシア語   | id                   | id               |
| th     | タイ語           | th                   | th               |
| vi     | ベトナム語       | vi                   | vi               |
| tr     | トルコ語         | tr-TR                | tr               |
| nl     | オランダ語       | nl-NL                | nl               |
| pl     | ポーランド語     | pl-PL                | pl               |
| sv     | スウェーデン語   | sv-SE                | sv               |

## ワークフロー

詳しい手順は[ストア掲載ガイド](../how-to/workflow/store_listing_guide.md)を参照してください。
