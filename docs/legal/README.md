# docs/legal/

法務ページのテンプレートと公開用 HTML。

## 関連

- ADR-0017 §④ (BonsaiLog 専用 Privacy URL / Terms URL、GitHub Pages で公開)
- Issue #38 F-LEGAL-002 (BonsaiLog 専用 Privacy URL / Terms URL 公開)

## ファイル

| ファイル                       | 用途                                                   |
| ------------------------------ | ------------------------------------------------------ |
| `privacy-policy.template.html` | プライバシーポリシーのテンプレート（HTML、雛形保管用） |
| `terms-of-use.template.html`   | 利用規約 (EULA) のテンプレート（HTML、雛形保管用）     |
| `privacy-policy.html`          | **公開用 (日本語)** — GitHub Pages で配信中            |
| `privacy-policy.en.html`       | **公開用 (English)** — GitHub Pages で配信中           |
| `terms-of-use.html`            | **公開用 (日本語)** — GitHub Pages で配信中            |
| `terms-of-use.en.html`         | **公開用 (English)** — GitHub Pages で配信中           |

## 公開先 (GitHub Pages、有効化済 2026-05-02)

- 日本語:
  - <https://doooooraku.github.io/BonsaiLog/legal/privacy-policy.html>
  - <https://doooooraku.github.io/BonsaiLog/legal/terms-of-use.html>
- English:
  - <https://doooooraku.github.io/BonsaiLog/legal/privacy-policy.en.html>
  - <https://doooooraku.github.io/BonsaiLog/legal/terms-of-use.en.html>

`app.config.ts` の `LEGAL_PRIVACY_URL` / `LEGAL_TERMS_URL` extras にデフォルト値として設定済 (env で上書き可)。GitHub Pages の Source は `main` ブランチの `/docs` フォルダ。

## 使い方 (ユーザー手動)

### 1. テンプレートをコピー

```bash
cp docs/legal/privacy-policy.template.html docs/legal/privacy-policy.html
cp docs/legal/terms-of-use.template.html docs/legal/terms-of-use.html
```

### 2. プレースホルダーと TODO を埋める

各ファイル内の以下を実値に置き換える:

- `{{APP_NAME}}` → `BonsaiLog`
- `<!-- TODO: YYYY-MM-DD -->` → 公開日 (例: `2026-05-02`)
- 連絡先メールアドレス (個人情報、Engram 保存禁止)
- 取得するデータの種類 (ADR-0017 §⑥ Data Safety と整合: 広告 ID Free のみ、診断データ将来 Sentry 配線時)
- 準拠法・管轄裁判所 (個人情報、Engram 保存禁止)

### 3. BonsaiLog 用の必須事項 (constraints / ADR との整合)

privacy-policy.html に以下を明記:

- **完全ローカル保存** (constraints §1-1): クラウド同期なし、データはすべて端末内
- **PII 取得しない** (constraints §1-3): 氏名 / メール / 住所 / 電話 / 位置情報を取得しない
- **AI 機能なし** (constraints §1-4): 推奨機能 / 診断機能なし
- **広告 ID** (ADR-0017): Free プランで AdMob 広告配信時のみ取得、Pro 加入で取得停止
- **削除リクエスト**: アンインストールで全削除 (constraints §1-2)、別途削除フォーム不要

### 4. GitHub Pages で公開

リポジトリ Settings → Pages で:

- Source: Deploy from a branch
- Branch: `main` / Folder: `/docs`

または独立リポジトリ `doooooraku/bonsailog` を作成し、`legal/` 配下に配置。

公開後にアクセス確認:

```bash
curl -I https://doooooraku.github.io/bonsailog/legal/privacy-policy.html
curl -I https://doooooraku.github.io/bonsailog/legal/terms-of-use.html
```

### 5. アプリと Store に URL を設定

- **`.env`**: 必要なら `LEGAL_PRIVACY_URL` / `LEGAL_TERMS_URL` で上書き (デフォルトは `app.config.ts` で設定済)
- **App Store Connect**: アプリ情報にプライバシーポリシー URL を設定 (審査必須)
- **Google Play Console**: ストア掲載情報にプライバシーポリシー URL を設定 + ADR-0017 §⑥ Data Safety 宣言と整合
- **アプリ内 Paywall** (F-13 実装時、Apple 審査ガイドライン 3.1.2): 利用規約リンクを表示

## 重要

- **Apple 審査ガイドライン 3.1.2**: サブスクリプションを含むアプリは、Paywall に利用規約リンクを表示する必要がある
- 多言語対応 (v1.x): 19 言語版を作成、現状は日本語 + 英語が最低ライン
- 法務ページの内容は **法的助言ではありません**。実際の運用前に弁護士に確認することを推奨
- **個人情報の Engram 保存禁止**: メールアドレス / 住所 / 氏名等は Engram / memory に保存しない (グローバル CLAUDE.md §0)
