# docs/how-to/git_workflow.md

# Git Workflow（Issue → Branch → Commit → PR → Merge）

この文書は **How-to（やり方）** です。  
「なぜそうするか（背景・議論）」は ADR に、  
「合格/不合格の条件」は テスト（Jest/Maestro/CI）に寄せます。

---

## 0. この文書はいつ使う？

- 何か作業（機能追加・バグ修正・リファクタ）をするとき
- Issue を1つ選んで、ブランチを切って、PRを出して、mainに入れるとき
- 「次に何をすればいい？」を迷わないための **手順書**

---

## 1. まず「どこが正（source of truth）か」を固定する

How-to はコマンドを書き散らすより、**“正しい場所”を固定**すると死ににくいです。

### 1.1 正（source of truth）一覧（最重要）

- **CIで実行される手順**：`.github/workflows/ci.yml`
  - 「マージして良いか」は最終的にここで判定される
- **ローカルで叩くべきコマンド**：`package.json` の `scripts`
  - `pnpm lint` / `pnpm test` / `pnpm test:e2e`
  - 型チェックを入れるなら `type-check` を scripts に追加して運用
- **PRで確認すべき観点**：`.github/pull_request_template.md`
- **Issueで必須入力を強制する**：`.github/ISSUE_TEMPLATE/*.yml`（Issue Forms）
- **誰がレビュー責任者か**：`.github/CODEOWNERS`
- **前提/制約の一枚岩**：`docs/reference/constraints.md`
- **意思決定の理由**：`docs/adr/ADR-*.md`

---

## 2. 最短で迷わない「1サイクルの全体像」

1. Issueを選ぶ（受け入れ条件がある状態）
2. mainを最新化する
3. ブランチを切る（命名規則に沿う）
4. 実装する（必要ならテストを足す / ADRを書く）
5. ローカルテスト（CIと同じ順）
6. add → commit
7. push
8. PR作成（テンプレ埋める）
9. CIが全部OK（必要なら修正→push繰り返し）
10. レビューOK → mainへマージ
11. 後片付け（ブランチ削除 / main同期 / Issueクローズ）

---

## 3. 事前準備（初回だけ）

### 3.1 リポジトリをクローン

```bash
git clone <repo-url>
cd <repo-name>
pnpm install
```

### 3.2 main ブランチを使う前提

この手順は **main が本流**の前提です。

---

## 4. 手順（超具体）

以降、1 Issue を終わらせるまでの流れです。

---

### 4.1 Issue を選ぶ（スタート地点）

#### 何をする？

- いま取り組む Issue を1つ決める
- Issue に「受け入れ条件（Acceptance Criteria）」が書いてある状態にする

#### なぜ？

- 受け入れ条件がないと「どこまでやれば終わり？」が曖昧になり、仕様がズレやすい

#### ここが大事（抜けやすい）

- 受け入れ条件は **テストに落とせる形**が理想
  例：
  - ✅「設定画面で言語 nl を選ぶと、全UIがオランダ語になる」
  - ✅「アプリ起動→ホーム→習慣追加→保存が1分でできる（smoke）」など

#### 追加でやること（タスク分割）

- Issue本文に **チェックリスト形式でタスク分割**を書く
  - 1つのIssueが大きい場合は **サブIssue** に分割する
  - GitHubの「tasklist block」は廃止されているため、親子関係はサブIssueで持つ

---

### 4.2 main を最新にする（毎回）

#### 目的

「古いmain」からブランチを切ると、あとでコンフリクト地獄になりやすいので最初に潰す。

#### コマンド

```bash
git status
git fetch origin
git switch main
git pull --ff-only origin main
```

#### コマンドの意味（初心者向け）

- `git status`
  いまの作業状態を見る。変更が残っていたら事故りやすいので最初に確認。
- `git fetch origin`
  リモート（GitHub）の最新情報を手元に取り込む（作業ファイルは変えない）。
- `git switch main`
  main ブランチに移動する（古い `git checkout main` と同じ目的）。
- `git pull --ff-only origin main`
  リモートmainを取り込む。`--ff-only` は「変なマージコミットを作らない安全モード」。

> `git checkout main` を使ってもOK。ただし今は `git switch` の方が分かりやすいです。

---

### 4.3 ブランチを切る（Issueごとに1本）

#### 命名ルール（例）

- 機能追加：`feat/<issue番号>-<短い英語>`
- バグ修正：`fix/<issue番号>-<短い英語>`
- 雑務/整備：`chore/<issue番号>-<短い英語>`

例：

- `feat/123-add-admob-skeleton`
- `fix/210-crash-on-settings`
- `chore/88-update-docs-links`

#### コマンド

```bash
git switch -c feat/123-add-admob-skeleton
```

#### 意味

- `git switch -c <branch>`
  「新しいブランチを作って、そこへ移動する」

---

### 4.4 実装する（ここが本番）

#### ここで守ること（重要）

- 仕様の「前提/制約」を変えるなら `docs/reference/constraints.md` を更新
- 「なぜそれにしたか」を残す必要があるなら `docs/adr/` に ADR を追加
- 受け入れ条件を満たすために必要なら **テスト（Jest/Maestro）を足す**

> “コードと同じ細かさ” を docs に持たない。
> docs は「変わりにくいルール」と「リンク」で運用する（ズレにくい）。

---

### 4.5 ローカルテスト（CIと同じ順にする）

詳細は `docs/how-to/testing.md` を参照。
最低限はこの順番：

```bash
pnpm lint
pnpm test
```

（E2Eが必要なら）

```bash
pnpm test:e2e
```

（型チェックを運用している場合）

```bash
pnpm type-check
```

---

### 4.6 ステージング（add）

#### 基本

```bash
git status
git add -p
git status
```

#### 意味

- `git add -p`
  変更を「かたまり」ごとに選んで追加できる。
  **1コミットを小さく綺麗に**しやすい。

---

### 4.7 コミット（commit）

```bash
git commit -m "feat: add AdMob skeleton (#123)"
```

#### 意味

- `git commit -m "..."`
  「いま add した変更を、履歴として確定する」

#### コミット文のコツ（あなた向け）

- 1コミット=1目的
- `feat:` `fix:` `chore:` を頭につけると後から探しやすい
- Issue番号を末尾につけると紐づけが楽（任意）

---

### 4.8 プッシュ（push）

```bash
git push -u origin feat/123-add-admob-skeleton
```

#### 意味

- `git push`
  手元のコミットをGitHubに送る
- `-u`
  「このブランチの相手は origin のこのブランチ」と覚えさせる
  → 次回から `git push` だけで済む

---

### 4.9 PR を作る（レビューの入口）

#### やること

- GitHubで PR を作成（base: main）
- `.github/pull_request_template.md` を埋める
- Issueリンク、受け入れ条件、テスト結果を明記

#### ここが大事

- CIが落ちてるPRは「レビュー依頼しない」
  （レビューの時間を溶かすから）

---

### 4.10 レビュー対応（修正→push を繰り返す）

- 指摘を直す
- 必要ならテスト追加
- `git add -p` → `git commit` → `git push`

---

### 4.11 main にマージ（ゴール）

- CIが全部OK
- レビューOK
- マージ（推奨：Squash merge で履歴を綺麗に）

---

### 4.12 後片付け（重要）

#### mainを最新化

```bash
git switch main
git pull --ff-only origin main
```

#### ブランチ削除（任意だが推奨）

- GitHub上で Delete branch
- ローカルも消すなら：

```bash
git branch -d feat/123-add-admob-skeleton
```

---

## 5. 事故ったとき（よくあるトラブル）

### 5.1 コンフリクトした

1. mainを最新化
2. 自分のブランチに main を取り込む（初心者は merge が安全）

```bash
git switch main
git pull --ff-only origin main

git switch feat/123-add-admob-skeleton
git merge main
```

- コンフリクト箇所を直す
- 直したら：

```bash
git add <直したファイル>
git commit
git push
```

---

### 5.2 間違って main にコミットしそう

- mainで作業しない
- 必ず `git status` でブランチ名を確認してから add/commit

---

## 6. 付録：コマンド辞典（超ざっくり）

- `git status`：いまの状態を見る
- `git fetch`：リモートの情報だけ取る（安全）
- `git pull`：リモートの変更を取り込む（作業にも影響）
- `git switch -c`：ブランチ作成して移動
- `git add -p`：変更を小分けにして追加
- `git commit`：履歴に保存
- `git push`：GitHubへ送る

---

## 参考（一次情報）

- CODEOWNERS：GitHub公式の “About code owners”  
  https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- ブランチ保護：GitHub公式の “Protected branches”  
  https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches
- PRテンプレ：GitHub公式の “About pull request templates”  
  https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-pull-request-templates
- Issue Forms：GitHub公式の “About issue forms”  
  https://docs.github.com/en/issues/building-community/using-issues-and-pull-requests/about-issue-forms
- Diátaxis：公式サイト  
  https://diataxis.fr/
- ADR：Adr GitHub（テンプレ/背景のまとめ）  
  https://adr.github.io/

---
