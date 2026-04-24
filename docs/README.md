# docs/README.md

このディレクトリは「仕様を生かし続ける」ための docs-as-code の中核です。
ドキュメントは **役割で分けて、更新ルールを固定** します。

---

## 1. まず全体像（どれが何の文書？）

### Explanation（なぜ/価値/境界）

- `docs/explanation/product_strategy.md`
  - 価値、やる/やらない、判断基準を固定する「地図」

### Reference（変わりにくい事実）

- `docs/reference/basic_spec.md`
  - アプリが「何をするか」の基本仕様
- `docs/reference/functional_spec.md`
  - 機能が「どう動くか」の仕様
- `docs/reference/feature_spec_template.md`
  - 機能仕様を追加するときのテンプレート
- `docs/reference/glossary.md`
  - 用語の意味の辞書
- `docs/reference/constraints.md`
  - 前提/制約/非ゴールの一枚岩（ルールブック）
- `docs/reference/tasks/lessons.md`
  - 開発中に得た教訓・学びの記録

### ADR（なぜそうしたか）

- `docs/adr/ADR-0001-initial-decisions.md` — 初期の技術選定・アーキテクチャ決定
- `docs/adr/ADR-0002-revenue-model.md` — 収益モデルの選択（広告 + サブスク）
- `docs/adr/ADR-0003-storage-policy.md` — データ保存方針（AsyncStorage vs SecureStore）
- `docs/adr/ADR-0004-language-set.md` — ローカライズ範囲（19 言語、RTL 除外）
- `docs/adr/ADR-0005-ios-encryption-compliance.md` — iOS 暗号化エクスポートコンプライアンス
- `docs/adr/ADR-0006-in-app-review-trigger.md` — アプリ内レビュー促進のタイミング設計
- `docs/adr/adr_template.md` — ADR を追加するときのテンプレート

### How-to（手順 — サブディレクトリ別）

**ルート**（テンプレート全体に関わる）

- `docs/how-to/template-usage-guide.md` — テンプレートの使い方完全ガイド（Phase 0〜4）
- `docs/how-to/quickstart.md` — プロジェクトの初期セットアップ手順

**development/**（開発時に頻繁に参照）

- `docs/how-to/development/coding_rules.md` — 実装時のコード規約・設計ルール
- `docs/how-to/development/android_build.md` — Android の Debug / Release ビルド手順
- `docs/how-to/development/ios_build.md` — iOS の Debug / Release ビルド手順
- `docs/how-to/development/debug_guide.md` — デバッグの進め方ガイド
- `docs/how-to/development/sentry_setup.md` — Sentry（エラー監視）のセットアップ手順
- `docs/how-to/development/admob_advertising_setup.md` — AdMob 広告のセットアップ手順
- `docs/how-to/development/dev_vs_preview_builds.md` — Dev Build vs Preview Build の使い分け

**workflow/**（フロー / リリース運用）

- `docs/how-to/workflow/whole_workflow.md` — 仕様→Issue→実装→テスト→PR→マージ→リリースの全体フロー
- `docs/how-to/workflow/git_workflow.md` — Issue→Branch→Commit→PR→Merge の Git 運用手順
- `docs/how-to/workflow/store_listing_guide.md` — ストア掲載情報の管理ガイド
- `docs/how-to/workflow/screenshot_generation.md` — ストア掲載用スクリーンショットの生成手順
- `docs/how-to/workflow/google_play_release.md` — Google Play ストアリリース手順
- `docs/how-to/workflow/ios_testflight_release.md` — iOS TestFlight リリース手順
- `docs/how-to/workflow/release_notes_template.md` — リリースノートテンプレート

**testing/**（テスト関連）

- `docs/how-to/testing/testing.md` — テストの実行方法（Jest / Maestro / CI）

**i18n/**（多言語対応）

- 必要に応じて追加（翻訳ルール、ロケールチェック手順など）

---

## 2. 「最初は固定」の考え方は正しい？

結論：

- **はい、原則は正しい**です。
- ただし **「固定」ではなく「変えにくい」** が正確。

### 2-1. 変えにくい（基盤になる）

- `product_strategy.md`
- `basic_spec.md`
- `functional_spec.md`
- `glossary.md`

これらは **アプリ開発の土台** なので、
変えると影響が大きい → だから **安定させる** のが狙いです。

### 2-2. 進むほど増える/蓄積する

- `constraints.md` は **1枚に集約して更新**（増えるが「追記型」ではない）
- `docs/adr/ADR-*.md` は **履歴として増える**（決定ログが蓄積）

### 2-3. “固定に見えるが動く” もの

- 仕様書（basic/functional）は更新し得る
  - ただし **「仕様変更の根拠（ADR）」と「テスト（合否）」が揃う時だけ** 変える

---

## 3. 仕様が「生き続ける」条件（最小セット）

1. **Issue Forms** で必須項目を強制する
2. **PRテンプレ** で docs/ADR/テストの更新要否を毎回判断させる
3. **CODEOWNERS + ブランチ保護** でレビューとCIを必須にする
4. **テストが合否の正** になる（CIで必ず動く）

この4つが揃うと「更新漏れ」が自然に止まります。

---

## 4. ドキュメント更新の判断フロー（超簡単）

### A. 仕様に影響する変更？

- YES → `basic_spec` / `functional_spec` を更新
- NO → 次へ

### B. 前提/制約が変わる？

- YES → `constraints.md` を更新
- NO → 次へ

### C. 用語の意味が変わる？

- YES → `glossary.md` を更新
- NO → 次へ

### D. 「なぜそうしたか」が議論になる？

- YES → ADR を追加
- NO → 次へ

### E. 合否条件が変わる？

- YES → テストを追加/更新
- NO → そのまま

---

## 5. “仕様を生かし続ける” ための役割分担（人間 / AI）

- 人間（あなた）：価値判断、境界決め、最終責任
- AI（Codex）：文章整形、Issue起票補助、テスト/実装の反復

---

## 6. 具体例（1つだけ）

「Free のアイテム数を 5 件まで増やす」変更をする場合：

- `constraints.md` を更新（Free/Pro 差分が変わる）
- ADR を追加（なぜ 5 にする？代案は？）
- `basic_spec.md` と `functional_spec.md` を更新
- テスト（Jest/E2E）で合否条件を更新
- PR テンプレで更新済みリンクを貼る

---

## 7. 迷った時のチェックリスト

- 仕様の正はどこ？（基本は docs + テスト + ADR）
- その変更は「前提/制約」を壊していない？
- 合否はテストで判定できる？
- PRテンプレに必要なリンクは貼った？
