---

#  理想サイクル（全体像）


* **Explanation（Why / 価値と境界）**：`docs/explanation/product_strategy.md`
* **Reference（変わりにくい事実）**：

  * `docs/reference/constraints.md`（前提/制約の一枚岩）
  * `docs/reference/basic_spec.md`（基本仕様＝不変条件寄り）
  * `docs/reference/functional_spec.md`（機能仕様＝UI/状態/制約の“結論”だけ）
  * `docs/reference/glossary.md`（用語の正）
* **ADR（なぜそう決めたか）**：`docs/adr/ADR-*.md`（本文から理由を追い出す）
* **How-to（手順）**：

  * `docs/how-to/workflow/whole_workflow.md`（開発〜リリースの回し方）
  * `docs/how-to/workflow/git_workflow.md`（Issue~mergeの回し方）
  * `docs/how-to/testing/testing.md`（テストの回し方。正はCI/package.jsonにリンク）
  * `docs/how-to/development/android_build.md`（Androidビルド手順）
  * `docs/how-to/development/ios_build.md`（iOSビルド手順）
* **合否（Acceptance Criteria）**：基本は **自動テスト（Jest）** ＋ 必要なら E2E（Maestro）
  → 「合格/不合格」を人の文章から機械に寄せる。
* **強制装置（Docs-as-code）**：Issue Forms / PRテンプレ / Required checks / CODEOWNERS
  → “やった気”を潰す仕組み。

---

# `docs/how-to/whole_workflow.md`（提案：全文）

> ※ あなたの「工程カード（トリガー/INPUT/OUTPUT/完了条件/担当…）」形式で書きます
> ※ “正を見る場所”を固定（package.json / CI / 公式Docs）して、写経を減らします

---

## 0. この文書の目的

{{APP_NAME}} を **「仕様→Issue→実装→テスト→PR→マージ→リリース」** のサイクルで回し続け、
**ドキュメントが古くならない（＝仕様が死なない）**状態を作る。

## 0.5. 役割分担: Claude Code / Codex（重要）

このプロジェクトは **Claude Code + Codex の 2 エージェント** で回す前提です。
各 W ステップの担当は以下の通り。

```
┌──────────────────────────────────────┐
│  Claude Code（計画 + レビュー）       │
│                                       │
│  W-00 フィードバック収集              │
│  W-01 課題の発見                      │
│  W-02 Issue 作成                      │
│  W-03 優先度付け                      │
│  W-04 ブランチ準備                    │
│  W-05 仕様の結論 + AC 定義            │
│  W-05.5 Codex 引き継ぎ                │
└──────────────────────────────────────┘
                    ↓ Issue + Context for Codex
┌──────────────────────────────────────┐
│  Codex（実装）                        │
│                                       │
│  W-06 実装                            │
│  W-07 テスト作成                      │
│  W-08 ローカル検証 (pnpm verify)      │
│  W-08a CI 失敗リカバリ（2 回まで）   │
│  W-09 コミット + push                 │
│  W-10 PR 作成                         │
└──────────────────────────────────────┘
                    ↓ PR URL
┌──────────────────────────────────────┐
│  Claude Code（レビュー + マージ）    │
│                                       │
│  W-10.5 PR レビュー（/review-pr）    │
│  W-11 マージ（人間承認 or auto-merge）│
│  W-11.5 仕様棚卸し（マイルストーン時）│
│  W-12 リリース（週次 or ms 完了時）  │
└──────────────────────────────────────┘
```

対応する Skill:

- Claude Code: `/discuss`, `/plan`, `/review-pr`, `/retro`, `/progress`, `/store-text`, `/release-check`
- Codex: `/implement`, `/fix-ci`, `/i18n-add`

**Codex 導入は優先度低**（2026-04-11 決定）。まず Claude Code 単独で 2 週間運用してから検証。

## 1. 参照する“正（ソース・オブ・トゥルース）”

- 実装の正：コード（`src/**`）
- コマンドの正：`package.json` の scripts
- CIで走るものの正：`.github/workflows/ci.yml`
- 仕様の正：
  - 価値/境界：`docs/explanation/product_strategy.md`
  - 前提/制約：`docs/reference/constraints.md`
  - 仕様（結論）：`docs/reference/basic_spec.md` / `docs/reference/functional_spec.md`
  - 用語：`docs/reference/glossary.md`
  - 理由：`docs/adr/ADR-*.md`
  - 合否：テスト（Jest）＋必要なら `maestro/**`（E2E）

---

## 工程カード一覧（作成→リリースまで）

### 工程 W-00：フィードバック収集（NEW）

- **トリガーキー**: リリース後の定期実行 / ユーザー問い合わせ / ストアレビュー投稿
- **作業内容**: Play Console / ASC のレビューを読み、問い合わせメールを処理し、Issue 化すべきものを判定
- **INPUT**: Play Console review / ASC Reviews / support メール / Sentry クラッシュレポート
- **OUTPUT**: W-01 への入力候補（1〜3 件）
- **完了条件**: 未処理のフィードバックがゼロ
- **担当**: Claude Code（週次 or リリース直後）
- **使う Skill**: `/discuss`（判定が必要な場合）

### 工程 W-01：課題の発見（価値の仮説づくり）

- **トリガーキー**：アイデア発生 / 苦情 / データ変化
- **作業内容**：
  誰の、どの困りごとを、どう良くするか（価値）と、やらないこと（境界）を決める。
- **INPUT**：Storeレビュー、利用ログ、競合観察、身近な不便
- **OUTPUT**：
  - `docs/explanation/product_strategy.md` の作成
  - `docs/reference/basic_spec.md` の作成/更新
  - `docs/reference/functional_spec.md` の作成/更新
  - `docs/reference/glossary.md`（用語が増える場合）

- **完了条件**：第三者が読んで「何を作る/作らない」が同じ理解になる
- **担当**：人間（あなた）

### 工程W-02：Issue作成（必須項目の強制）

- **トリガーキー**：W-01 完了 / バグ発生
- **作業内容**：Issue Forms で **“必須項目を埋めないとIssueが作れない”** 状態にする  
  さらに、Issue本文に **タスク分割（チェックリスト or サブIssue）** を書く
  - 小さければチェックリスト
  - 大きければサブIssue（親子で追える状態にする）
- **INPUT**：W-01で作成した.mdファイル、現象ログ、スクショ
- **OUTPUT**：GitHub Issue（bug / feature）
- **完了条件**：
  - 受け入れ条件が“テスト文”で書かれている
  - 参照先（constraints / glossary / basic_spec / functional_spec / ADR）がリンクされている
  - Issue本文に「タスク分割」がある（チェックリスト or サブIssue）

- **担当**: Claude Code (`/plan` Skill)

### 工程W-03：優先度付け（いまやる/やらない）

- **トリガーキー**：Issueが溜まった
- **作業内容**：Impact（効果）× Effort（手間）× Risk（危険）で並べ替え
- **INPUT**：Issue一覧
- **OUTPUT**：優先度（P0/P1/P2…）
- **完了条件**：次にやるIssueが1つ選べる
- **担当**: Claude Code (`/plan` Skill)

### 工程W-04：着手準備（ブランチ作成）

- **トリガーキー**：W-03で優先度の高いIssueの存在を確認
- **作業内容**：mainから作業ブランチを切る
- **INPUT**：Issue番号
- **OUTPUT**：ブランチ（例：`feature/123-admob-banner`）
- **完了条件**：ブランチがpushされ、CIが動く状態
- **担当**: Claude Code (`/plan` Skill)

### 工程 W-05：仕様の結論を固める + AC 定義

- **トリガーキー**: 実装前に迷いがある / 仕様が増える / Issue の AC が未定義
- **作業内容**:
  - 人間（あなた）と対話して不明点を解消する
  - 不変条件 → `basic_spec.md`
  - 用語 → `glossary.md`
  - 前提 / 制約 → `constraints.md`
  - 理由（なぜ）→ 新 ADR を作成
  - **AC（受け入れ条件）を Jest テストに落とせる粒度で決める**
- **INPUT**: Issue、既存 docs
- **OUTPUT**: docs 更新 + AC 明記
- **完了条件**: Issue 本文を読むだけで実装できる状態
- **担当**: Claude Code (`/plan` Skill)

### 工程 W-05.5: Codex への引き継ぎ（NEW）

- **トリガーキー**: W-05 完了
- **作業内容**: Issue 本文に `## Context for Codex` セクションを追加:
  - Acceptance Criteria（チェックボックス形式）
  - Files to read first（関連ファイル一覧）
  - Files likely to change（変更予想ファイル）
  - Constraints（pnpm 必須 / API キー直書き禁止 等）
  - Test strategy（Jest / Maestro）
  - Suggested implementation order
  - Related ADRs
- **INPUT**: W-05 の成果物
- **OUTPUT**: Codex が着手可能な Issue
- **完了条件**: `gh issue view <番号>` で Codex が全情報を取得できる
- **担当**: Claude Code (`/plan` Skill 内の最後のステップ)

### 工程 W-06：実装（小さく刻む）

- **トリガーキー**: W-05.5 完了
- **作業内容**: 実装ルールに従って変更する（命名 / 設計 / 責務分離など）
- **INPUT**: Issue（`## Context for Codex` 含む）
- **OUTPUT**: コード差分
- **完了条件**: ローカルで最低限の確認ができる
- **担当**: **Codex (`/implement` Skill)**

### 工程W-07：受け入れ条件をテストへ落とす（“合否を機械化”）

- **トリガーキー**：各Issueの実装完了後
- **作業内容**：Jestで判定できる形にする
- **INPUT**: Issue の AC
- **OUTPUT**: `__tests__/**` 追加 / 更新
- **完了条件**: テストが落ちれば「何がダメか」が分かる
- **担当**: **Codex (`/implement` Skill)**
- **ポイント**: 仕様本文に「合格条件の長文」を置くのではなく、**テストが合否を持つ**。

### 工程 W-08：ローカル検証（5 ゲート）

- **トリガーキー**: コミットを出す前
- **作業内容**: `pnpm verify` を実行（内部で 6 ゲート）:
  1. `pnpm lint` — ESLint
  2. `pnpm type-check` — TypeScript strict
  3. `pnpm format:check` — Prettier
  4. `pnpm test` — Jest
  5. `pnpm i18n:check` — i18n キー整合性
  6. `pnpm config:check` — Expo config 検証
- **INPUT**: 実装差分
- **OUTPUT**: 全ゲート緑
- **完了条件**: 6 ゲート全てパス
- **担当**: **Codex (`/implement` Skill)**

### 工程 W-08a: CI 失敗リカバリ（NEW）

- **トリガーキー**: `pnpm verify` が 2 回連続失敗
- **作業内容**: `/fix-ci` Skill で慎重モード（根本原因特定 → 修正 → リグレッションテスト追加）
- **INPUT**: 失敗ログ
- **OUTPUT**: 修正 commit
- **完了条件**: `pnpm verify` 緑
- **エスカレーション**: 3 回目失敗で Claude Code の `/discuss` に引き継ぎ
- **担当**: **Codex (`/fix-ci` Skill)**

### 工程 W-09：コミット → push（CI を回す）

- **トリガーキー**: W-08 完了
- **作業内容**: Conventional Commits 形式で commit し push
- **INPUT**: 差分
- **OUTPUT**: GitHub 上にブランチ
- **完了条件**: CI が動き、結果が見える
- **担当**: **Codex (`/implement` Skill)**

### 工程 W-10：PR 作成（レビューと強制）

- **トリガーキー**: プッシュ完了
- **作業内容**: PR テンプレに沿って提出し、`/review-pr` を Claude Code に依頼
- **INPUT**: Issue、差分、CI 結果、PR テンプレ
- **OUTPUT**: PR
- **完了条件**: Required checks が全部通る（ブランチ保護で強制）
- **担当**: **Codex (`/implement` Skill)**

### 工程 W-10.5: PR レビュー（Claude Code が受け取る, NEW）

- **トリガーキー**: W-10 完了（PR 作成）
- **作業内容**: Claude Code が `/review-pr` Skill で以下を確認:
  - AC が全項目 ✅ か
  - constraints / ADR 準拠か
  - 影響範囲が W-05 の予想と一致か
  - デグレリスク（既存テスト破壊 / カバレッジ低下）
  - コード品質（既存パターンに従っているか）
  - ドキュメント更新（lessons / ADR / functional_spec）
- **INPUT**: PR URL
- **OUTPUT**: レビュー判定（Approve / Request Changes / Discuss）
- **完了条件**: 判定コメントが PR に付与される
- **担当**: **Claude Code (`/review-pr` Skill)**

### 工程 W-11：マージ（main に反映）

- **トリガーキー**: W-10.5 で Approve
- **作業内容**:
  - `auto-merge` ラベル付き PR → Claude Code が自動マージ
  - それ以外 → 人間承認を 30 秒待って、応答なしなら停止
- **INPUT**: PR
- **OUTPUT**: main 更新 + ブランチ削除 + Issue クローズ
- **完了条件**: main の CI が成功
- **担当**: **Claude Code + 人間承認**

### 工程W-11.5：仕様棚卸し（Spec → Issue への戻り）

- **トリガーキー**：W-11 完了
- **作業内容**：
  - 仕様書（product_strategy / constraints / \*spec）をざっと読み直す
  - 「まだIssue化されていない作業」があれば Issue を追加する
- **INPUT**：mainの最新仕様書
- **OUTPUT**：追加Issue（必要な場合）
- **完了条件**：Issue化の漏れが無い／無ければ次工程へ
- **担当**：人間（あなた）＋ Codex

### 工程W-12：リリース（EAS/Store手順に従う）

- **トリガーキー**：mainが安定 / 仕様書から作成するIssue/バグが無くなった
- **作業内容**：
  - `docs/how-to/development/android_build.md` の実施
  - `docs/how-to/development/ios_build.md` の実施
- **INPUT**：main、リリースノート、Storeメタ情報
- **OUTPUT**：TestFlight / Play内部テスト / 本番リリース
- **完了条件**：ストアの審査/配信が通る。
- **担当**：人間

---

## 2. Done（完了の定義：最小）

- CI（`.github/workflows/*.yml`）が全て成功
- PRテンプレのチェックが埋まっている（必要な docs / ADR / tests）
- 変更が constraints に触れるなら `docs/reference/constraints.md` も更新
- 仕様の“結論”が変わるなら `docs/reference/*spec*.md` を更新
- “なぜ”が増えたなら ADR を追加

---
