# docs/legal/

法務ページのテンプレートと公開用 HTML。

## ファイル

| ファイル                       | 用途                                                                      |
| ------------------------------ | ------------------------------------------------------------------------- |
| `privacy-policy.template.html` | プライバシーポリシーのテンプレート（HTML）                                |
| `terms-of-use.template.html`   | 利用規約 (EULA) のテンプレート（HTML、Apple 審査ガイドライン 3.1.2 準拠） |

## 使い方

### 1. テンプレートをコピー

```bash
cp docs/legal/privacy-policy.template.html docs/legal/privacy-policy.html
cp docs/legal/terms-of-use.template.html docs/legal/terms-of-use.html
```

### 2. `<!-- TODO: ... -->` を埋める

各ファイル内の TODO コメントを実値に置き換える:

- 最終更新日
- 連絡先メールアドレス
- 取得するデータの種類
- 準拠法・管轄裁判所

### 3. GitHub Pages で公開

リポジトリの設定で GitHub Pages を有効化し、`docs/legal/` を公開ディレクトリにする。

公開後の URL:

- `https://doooooraku.github.io/{{APP_SLUG}}/legal/privacy-policy.html`
- `https://doooooraku.github.io/{{APP_SLUG}}/legal/terms-of-use.html`

### 4. アプリと Store に URL を設定

- **`.env`** の `LEGAL_PRIVACY_URL` と `LEGAL_TERMS_URL` に URL を設定
- **App Store Connect** のアプリ情報にプライバシーポリシー URL を設定
- **Google Play Console** のストア掲載情報にプライバシーポリシー URL を設定
- **アプリ内の Paywall 画面** に利用規約リンクを表示（Apple 審査必須）

## 重要

- **Apple 審査ガイドライン 3.1.2**: サブスクリプションを含むアプリは、Paywall に利用規約リンクを表示する必要がある
- 多言語対応する場合は各言語版を作成（日本語 + 英語が最低ライン）
- 法務ページの内容は **法的助言ではありません**。実際の運用前に弁護士に確認することを推奨
