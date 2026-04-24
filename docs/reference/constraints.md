# {{APP_NAME}} constraints（前提 / 制約 / 不変条件） - Reference

この文書は {{APP_NAME}} の「前提 / 制約 / 不変条件 / 非ゴール」を 1枚に集約した “ルールブック（Reference）” です。
仕様書が形骸化する最大要因である「ズレやすい情報まで抱え込む」を避けるため、
この文書は **変わりにくい“方針”と、変えるときに必ず全体へ影響する“決め”だけ**を扱います。

---

## 0. この文書の使い方（最重要）

### 0-1. いつ読む？（読むタイミング）

- Issue を切る前（やろうとしている変更が “前提を壊す” 変更ではないか確認）
- 実装方針を決める前（ADR を書くべき変更か判断）
- PR 作成時（更新トリガーに該当するなら、この文書も更新）
- PR レビュー時（「変更が constraints に反していないか」を最優先でチェック）

### 0-2. 矛盾したら何が正？（正の優先順位）

矛盾が起きた場合の優先順位は次の通りです。

1. **コード（実装）**：動いている事実。依存バージョンやスクリプト名は `package.json` / CI を正とする
2. **constraints（この文書）**：プロダクト/設計の “前提と制約” の正
3. **ADR（意思決定ログ）**：なぜそう決めたか（理由/比較/却下案/影響）
4. その他の仕様書：参考（古い可能性がある）

### 0-3. この文書に「書かない」こと（ズレ防止）

- バージョン番号の固定（→ `package.json` / CI を参照）
- “コードと同じ細かさ” の実装詳細（→ 実装とテストが正）
- UI のピクセル指定（→ Figma が正）
- コマンド手順の細部（→ How-to に置く。ここには置かない）

### 0-4. 更新トリガー（更新漏れ防止）

次のどれかが変わったら **必ず**この文書も更新します。

- 収益（広告/課金）やプラン差分
- 対応言語の増減、RTL/LTR 方針
- 外部SDK（RevenueCat/AdMob 等）の追加・削除・重大設定変更
- データ保存方針（ローカル/クラウド/削除方法/暗号化の方針）
- “やらない” を “やる” に変える（非ゴールの変更）
- マージ条件（必須チェック/必須レビュー）を変える

---

## 1. プロダクトの不変条件（変えない “核”）

### 1-1. ローカル志向（Local-first）

<!-- TODO: Fill in your app's specific details -->

- {{APP_NAME}} は **ローカル志向のアプリ** とする（自前バックエンドは持たない）
- ユーザー登録（メール/パスワード）を持たない
- ネットワークは “必要最小限” に限定する（課金/広告など）

> 変更する場合：必ず ADR を起票し、プライバシー/法務/テスト/ストア申請まで波及する前提で扱う。

### 1-2. データ保存の原則（端末内のみ）

- Habit / HabitLog：SQLite に保存する
- Settings / ProState：SecureStore（端末の暗号化ストレージ）に保存する
- v1.x は「アプリ内の全データ削除」ボタンを持たない（原則アンインストールで全削除）

### 1-3. 個人情報（PII）をアプリとして取得しない

- 氏名/メール/住所/電話など “直接個人が特定できる情報” をアプリ要件として取得しない
- ログ・デバッグ出力に個人特定情報を含めない

---

## 2. 収益モデルとプラン（Free / Pro）

### 2-1. 収益の柱（2本だけ）

- 収益は **サブスクリプション（Pro）** と **広告（Free向けバナー）** の2本柱
- **全画面広告（インタースティシャル）は採用しない**（体験劣化が大きい）

### 2-2. Free / Pro の不変差分（ここを崩さない）

- Free：習慣は **3つまで**
- Pro：習慣は **無制限**
- Free：ホーム画面下部にバナー広告を表示（常時）
- Pro：広告は **一切表示しない**（広告コンポーネントをマウントしない）
- 課金は RevenueCat 経由で行い、**復元（Restore purchases）を提供**する

### 2-3. AdMob（次回以降はマスト）

- 次回リリース以降：Free に **バナー広告（AdMob）を必ず組み込む**（Pro は常に広告ゼロ）
- 開発中は **テスト広告**を使う（本番広告を開発で表示しない）
- 本番の広告ユニットIDは **ソースへ直書きしない**（ビルド設定/Secrets/環境注入）

---

## 3. 言語・レイアウト（i18n）

### 3-1. 対応言語（v1.x）

- v1.x は **18言語対応**（アラビア語は除外）
- レイアウトは **LTR のみ**（RTL はサポート外）

対象言語（v1.0 ベース）：

- en, ja, fr, es, de, it, pt, ru, zhHans, zhHant, ko, th, id, vi, hi, tr, pl, sv

### 3-2. 言語コードの正（規格準拠）

- 言語タグは **BCP 47 / IANA Language Subtag Registry** を正とする
- オランダ語は **`nl`** が正（Dutch / Flemish）

---

## 4. v1.x の非ゴール（やらないこと）

次は v1.0〜v1.x のスコープ外として扱う（「ある前提」で仕様を書かない）。

- ウィジェット（ホームウィジェット）
- アプリアイコン変更（Pro限定アイコン等）
- RTL 対応
- アプリ内の OSS ライセンス一覧画面（必要なら別途方針決定）

---

## 5. セキュリティ / 秘密情報（絶対ルール）

- 課金情報（カード情報等）はストアが管理し、アプリは保持しない
- RevenueCat APIキー / AdMob 広告ユニットID 等は **直書き禁止**
- 通信は HTTPS（TLS）前提（HTTP は使用しない）
- ログに個人特定情報を出さない

---

## 6. UI の正（ズレ防止）

- UI の「見た目の正」は **Figma** とする（仕様書は “何ができるか/できないか” の合意まで）
- 仕様書にピクセル単位の細部を固定記述しない（Figma へ寄せる）

---

## 7. docs-as-code（更新を強制するための運用制約）

この章は「プロダクトを守るための開発運用上の制約」です。

- main（または release）ブランチは **保護**し、PR 経由でのみ変更する
- マージ条件：
  - CI の必須チェックが成功していること
  - PR テンプレの Done 条件を満たすこと（“必要なら docs/ADR/テストを更新”）
- docs 配下もコード同様にレビュー対象とし、差分で追えることを優先する

---

## 8. 参照リンク（一次情報）

- Expo SecureStore: https://docs.expo.dev/versions/latest/sdk/securestore/
- Expo SQLite: https://docs.expo.dev/versions/latest/sdk/sqlite/
- RevenueCat Restore Purchases: https://www.revenuecat.com/docs/getting-started/restoring-purchases
- react-native-google-mobile-ads（テストID等）: https://docs.page/invertase/react-native-google-mobile-ads/displaying-ads
- GitHub Branch protection: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule
- IANA Language Subtag Registry: https://www.iana.org/assignments/language-subtag-registry
- RFC 5646 (BCP47): https://datatracker.ietf.org/doc/html/rfc5646
- Diátaxis: https://diataxis.fr/
