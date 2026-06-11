# P-14: Doc-Truth 構造防御 4 件の初期装備 (次 app 開始日用)

- **渡す先**: Claude Code (新アプリのリポジトリで)
- **タイミング**: Phase 0 (P-01 プロジェクト初期化) 直後、最初の機能 PR より前。一部は「該当構造を作った日」(下記運用メモ)
- **目的**: BonsaiLog で doc と実態の乖離が 2 ヶ月で台帳 420 行 × 2 日がかりの監査 (Doc-Truth Audit 2026-06) を要するまで溜まった反省から、新アプリでは **乖離の発生源を初日から構造封鎖** する
- **背景**: 監査完走 retro (`docs/reference/tasks/lessons/retro.md` [2026-06-11] エントリ) の Try「構造防御 4 件は次 app 開始日に初期装備」の実装手順書

---

## 指示 (ここから下をそのまま Claude Code に渡す)

このアプリに「ドキュメントと実態の乖離を自動検出する構造防御」を導入してください。
BonsaiLog で実証済みの移植です。新規の設計議論は不要、以下に従ってください。

### 防御 0 (執筆原則、初日から常時適用): 固定値は正本 1 箇所だけ

- 固定値 (件数・番号範囲・path・一覧) は **正本 1 箇所にだけ** 書く。他の doc には「最新は X を参照」と書く
- 根拠: BonsaiLog の監査で見つかった乖離の主因は固定値の多重コピー (同じ数字を 2〜3 箇所に書き写し、変更時に直し忘れ)。**書き写した瞬間に将来の乖離が 1 件予約される**

### 共通原則: gate は「3 段階実走証明」までやって完了

- ① 正常系で PASS → ② わざと違反を作って exit 1 を確認 → ③ 復元して exit 0 を確認 (BonsaiLog PR #1107 方式)。PR 本文に 3 段階の出力を貼る
- gate の除外設定 (skip dir / loop 対象範囲) は死角になる。除外範囲と「そこは何が守るのか」を必ずコメントに明記する
- 根拠: BonsaiLog では既設 gate の skip 設定の死角を素通りした placeholder がストアへ自動 push される事故経路が残存していた (実走で証明して発覚)

### 防御 1: ストア metadata placeholder gate

- 守る事故: 仮文言 (`TODO` / `<>` / 例文) のままストア提出物が自動 upload される
- 手順: fastlane/metadata を導入した日に、placeholder 検査 script を CI (verify chain) に連結。ロケール loop 対象の全ファイル + **loop 外の root-level ファイル (copyright 等) + 個人情報 dir の復活ガード** を含める
- 注意: 審査連絡先など個人情報になる値は repo に置かない (PUBLIC repo なら git 管理外 + ストア管理画面で手入力)

### 防御 2: ルール索引 parity 検算

- 守る事故: 親索引 (一覧) と本文 (見出し) がずれて、ルールが索引から消えたまま気づかない
- 手順: 「索引 + 本文」の 2 ファイル構造 (再発防止ルール集等) を作った日に、本文の見出しを正規表現抽出 → 索引行と突合して欠落で exit 1 する check を docs-lint に入れる
- 原則: **索引は 1 つだけ**。二重索引はそれ自体が drift 源 (BonsaiLog は索引 2 本が相互バラバラになり一本化で解消)

### 防御 3: 生成ファイル drift 検出 (`--check` mode)

- 守る事故: 正本から生成される複製 (例: agent-tools → .claude/skills) を直接編集してしまい、次回同期で消える
- 手順: 「正本 → 生成」の構造を作った日に、sync script へ `--check` mode (生成結果と現物の diff があれば exit 1) を実装し verify chain に連結 (BonsaiLog: `verify:ai-sync`)

### 防御 4: main branch protection (リポジトリ作成日に設定)

- 守る事故: CI 赤のまま merge (BonsaiLog では保護なし期間に CI 赤 merge が実際に通った)
- 手順: CI の最初の required check (最低 `verify` 1 本) を作ったら即、以下を実行:

```bash
gh api -X PUT repos/{OWNER}/{REPO}/branches/main/protection --input - <<'JSON'
{
  "required_status_checks": { "strict": false, "contexts": {REQUIRED_CHECKS} },
  "enforce_admins": true,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```

- BonsaiLog 実設定 (2026-06-11 に `gh api .../branches/main/protection` で確認): required = `verify` / `check-r30` / `docs-cleanliness` / `template-check`、`enforce_admins: true`、force push / deletion 禁止
- 注意: contexts は新 app の **workflow job 名** に合わせる (名前不一致だと永久 pending で merge 不能)。設定後、自分で 1 PR を通して保護下 merge を実地テストする

### 参照実装 (port 元、まず Read して構造を踏襲)

- `/home/doooo/04_app-factory/apps/BonsaiLog/scripts/validate-metadata.mjs` (防御 1: placeholder + root-level 検査 + 復活ガード)
- `/home/doooo/04_app-factory/apps/BonsaiLog/scripts/docs-lint.mjs` (防御 2: 親索引 × 本文見出しの parity 検算)
- `/home/doooo/04_app-factory/apps/BonsaiLog/agent-tools/scripts/sync-agent-tools.mjs` (防御 3: `--check` mode)
- 同 repo `package.json` の `verify` chain (`verify:docs` / `verify:ai-sync` の連結例)
- 経緯の 1 次資料: 同 repo `docs/archive/doc-truth-audit-2026-06/state.md` (台帳) + `docs/reference/tasks/lessons/retro.md` の [2026-06-10] / [2026-06-11] エントリ

---

## 変数

| 変数                | 意味                                      | 例 (BonsaiLog の場合)                                      |
| ------------------- | ----------------------------------------- | ---------------------------------------------------------- |
| `{OWNER}/{REPO}`    | GitHub リポジトリ                         | doooooraku/BonsaiLog                                       |
| `{REQUIRED_CHECKS}` | required check の JSON 配列 (= CI job 名) | ["verify","check-r30","docs-cleanliness","template-check"] |

## 運用メモ

- 4 防御すべてが初日に適用できるとは限らない。原則は「**その構造を作った日 = gate を付ける日**」(metadata gate は fastlane 導入日、drift 検出は生成構造を作った日)。防御 0 と防御 4 だけは初日から
- 後回しにした gate は付かないまま走る (BonsaiLog は 2 ヶ月後の監査でまとめて精算した)。PR レビューで「新しい構造を作ったのに gate がない」を指摘事項にする
