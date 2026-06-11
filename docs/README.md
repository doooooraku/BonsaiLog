# docs/README.md

このディレクトリは「仕様を生かし続ける」ための docs-as-code の中核です。
ドキュメントは **役割で分けて、更新ルールを固定** します。
分類の枠組みは [Diátaxis](https://diataxis.fr/)（Tutorial / How-to / Reference / Explanation）+ ADR です。

> **本 README は「ディレクトリの役割」だけを宣言します。個別ファイルは列挙しません**
> （列挙は drift 源 — Doc-Truth Audit 2026-06 の教訓）。
> 各ファイルの鮮度・判定は `docs/audit/freshness-ledger.md`（中央台帳）が正。
> ディレクトリ一覧の機械検査は `scripts/docs-lint.mjs`（`pnpm docs:lint`）の allowlist が正。

---

## 1. ディレクトリマップ（役割宣言）

### Diátaxis 4 区分 + ADR（知識の置き場）

| ディレクトリ     | 区分                 | 役割・更新ルール                                                                                                                                               |
| ---------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `explanation/`   | Diátaxis Explanation | なぜ作るか・価値・スコープ境界（`product_strategy.md` が代表）。変えにくい「地図」                                                                             |
| `reference/`     | Diátaxis Reference   | 変わりにくい事実: 仕様（basic/functional）、`constraints.md`、`glossary.md`、`design_system.md`、`architecture.md`、`doc-routing.md`、`tasks/lessons/`（教訓） |
| `how-to/`        | Diátaxis How-to      | 手順書。`development/` `workflow/` `testing/` `ui-diff/` `release/` + `workflow/prompts/`（次セッション用 prompt 雛形 = P-XX とテンプレ）                      |
| `adr/`           | ADR                  | なぜそうしたか（決定ログ）。履歴として増える。変更は Amendment で追記（R-2: 履歴は ADR に集約）                                                                |
| （`tutorials/`） | Diátaxis Tutorial    | **現状なし**（個人開発でオンボーディング需要が薄いため未設置）。必要になったら新設し、本表と docs-lint allowlist に追加                                        |

### 運用記録（生きているトラッカー）

| 場所              | 役割                                                                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `audit/`          | 監査・検証の運用記録。`freshness-ledger.md` = 全 doc の鮮度中央台帳（30 日棚卸、scripts からパス参照されるため移動禁止）+ 実機検証記録 |
| `improvements.md` | PR ごとの「意図的な妥協」トラッカー（PR テンプレ DoD と連動）                                                                          |

### アーカイブ（完了したプロジェクトの凍結記録）

| 場所       | 役割                                                                                                                                                                        |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `archive/` | 完了済みプロジェクトの計画書・報告書・調査資料・監査台帳スナップショット。`<topic-YYYY-MM>/` 単位（例: `refactor-2026-05/` `research-2026-04/` `doc-truth-audit-2026-06/`） |

**archive ルール**:

1. プロジェクトが完了（報告書 merge / 結論を現役 doc へ反映済み）したら `docs/archive/<topic-YYYY-MM>/` へ `git mv` する
2. archive 内は **凍結** — 内容は当時のまま温存し、旧パス記述も修正しない（スナップショットとしての価値を守る）
3. 現役 doc から archive を参照するのは OK（根拠資料リンク）。archive を SoT として扱うのは NG
4. 役目を終えた一時 doc（セッション handoff 等）は archive ではなく **削除**（git 履歴が記録）

### 公開物・アセット（Diátaxis 外）

| 場所                                               | 役割                                                                                                                      |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `index.html` / `privacy/` / `terms/` / `.nojekyll` | **GitHub Pages 公開物**。URL がアプリ（app.config.ts / Paywall）・ストア申請から参照されるため **移動・削除・改名は禁止** |
| `legal/`                                           | 上記公開 HTML の生成テンプレート（運用は `legal/README.md`）                                                              |
| `mockups/`                                         | v1.0 モックアップ + スクリーンショット（R-29 写経駆動開発の参照元）                                                       |
| `store-listing/`                                   | ストア掲載文の作業場（提出の正本は `fastlane/metadata/` — 詳細は `store-listing/README.md`）                              |
| `assets/`                                          | ドキュメント用画像（手順書のスクリーンショット等）                                                                        |

---

## 2. 「最初は固定」の考え方

- **原則は正しい**。ただし「固定」ではなく **「変えにくい」** が正確
- 変えにくい（基盤）: `product_strategy.md` / `basic_spec.md` / `functional_spec.md` / `glossary.md`
- 集約して更新: `constraints.md`（1 枚に集約、追記型ではない）
- 履歴として増える: `adr/ADR-*.md`（決定ログが蓄積）
- 仕様書は「仕様変更の根拠（ADR）」と「テスト（合否）」が揃う時だけ変える

---

## 3. 仕様が「生き続ける」条件（最小セット）

1. **Issue Forms** で必須項目を強制する
2. **PR テンプレ** で docs/ADR/テストの更新要否を毎回判断させる
3. **ブランチ保護 + CI（`pnpm verify`）** でゲートを必須にする
4. **テストが合否の正** になる（CI で必ず動く）
5. **30 日棚卸**（`pnpm metrics:doc-freshness` + `metrics:doc-30day-zero` → `audit/freshness-ledger.md` へ反映）

---

## 4. ドキュメント更新の判断フロー

- **A. 仕様に影響する？** → YES: `basic_spec` / `functional_spec` を更新
- **B. 前提/制約が変わる？** → YES: `constraints.md` を更新
- **C. 用語の意味が変わる？** → YES: `glossary.md` を更新
- **D. 「なぜそうしたか」が議論になる？** → YES: ADR を追加
- **E. 合否条件が変わる？** → YES: テストを追加/更新
- **F. プロジェクトが完了した？** → YES: 計画書/報告書を `archive/` へ、一時 doc は削除、台帳の行を更新

---

## 5. 迷った時のチェックリスト

- 仕様の正はどこ？（基本は docs + テスト + ADR。優先順位は `AGENTS.md` §2.2）
- その変更は「前提/制約」を壊していない？
- 合否はテストで判定できる？
- 新しいディレクトリを docs/ 直下に作っていない？（作るなら本 README §1 に役割を書き、`scripts/docs-lint.mjs` の allowlist に追加 — 無断追加は `pnpm docs:lint` が検出）
