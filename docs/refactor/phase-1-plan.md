# Phase 1: Explore — 計画書

> 作成日: 2026-05-28
> 種別: 調査フェーズの計画書(読み取り専用 / コード変更なし)
> 関連成果物: `./phase-1-explore.md`(統合レポート)
> 作業用ドラフト: `/home/doooo/.claude/plans/calm-fluttering-owl.md`

---

## 目的

BonsaiLog の現状を**コードに一切触れず**に把握し、Phase 2 以降のリファクタ戦略を組むための「ベースライン地図」を作る。
具体的には以下 6点を一次情報(コマンド出力)から定量化する。

1. 現状アーキ図(Mermaid)
2. god component 上位 10件
3. FSD 境界違反の件数
4. 死コード総量
5. テストカバレッジ低い順 20件
6. SDK / 依存の健康状態(`expo-doctor`)

---

## 対象ファイル一覧(読み取りのみ)

| 区分                                     | 対象                                                                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 統治ドキュメント                         | `AGENTS.md`, `docs/reference/constraints.md`, `.claude/CLAUDE.md`, `package.json`, `tsconfig.json`, `babel.config.js` |
| アプリ本体(全read)                       | `app/**`(40ファイル), `src/**`(155ファイル: components/core/db/dev/features/services/stores/types)                    |
| 分析対象(コマンド経由)                   | `npx knip@latest` / `npx expo-doctor@latest` / `jest --coverage`                                                      |
| 書き込み対象(成果物のみ、本ファイル含む) | `docs/refactor/phase-1-explore.md`, `docs/refactor/phase-1-plan.md`                                                   |

書き込み対象は **このフェーズの成果物 2ファイルに限定**。コード本体・依存・コミットは **一切変更しない**。

---

## 変更前後のディレクトリツリー

### Before(調査前)

```
docs/
├── adr/
├── architecture.md          # 不在
├── how-to/
├── reference/
│   └── constraints.md
└── ...
```

### After(調査後 — 追加のみ、既存は不変)

```
docs/
├── adr/
├── how-to/
├── reference/
│   └── constraints.md
└── refactor/                # ★ 新規ディレクトリ
    ├── phase-1-explore.md   # ★ 統合レポート
    └── phase-1-plan.md      # ★ 本ファイル
```

> Phase 2 以降は `phase-N-plan.md` / `phase-N-execute.md` を同ディレクトリに積み上げる方針。

---

## ステップ(各 5分以内、実施済み)

| #   | ステップ                                                                          | 使用ツール                     | 種別                  | 所要時間 |
| --- | --------------------------------------------------------------------------------- | ------------------------------ | --------------------- | -------- |
| 1   | Plan Mode 有効化(R-17 4段階の 1段目)                                              | EnterPlanMode                  | 保護                  | <1分     |
| 2   | リポジトリ構造の把握(app / src の階層、`package.json` scripts)                    | Bash (`find`, `ls`, `node -e`) | 読                    | 1分      |
| 3   | 統治ドキュメント読了(`AGENTS.md` 見出し / `constraints.md` 全文)                  | Read                           | 読                    | 2分      |
| 4   | Wave 1(並列3): A=ルーティング Mermaid 化 / B=god component / C=knip + expo-doctor | Agent × 3(Explore)             | 読                    | 3〜5分   |
| 5   | Wave 2(並列3): D=Zustand+Context+重複state / E=jest --coverage / F=層境界違反     | Agent × 3(Explore)             | 読                    | 3〜5分   |
| 6   | 統合レポートの作成(`/home/doooo/.claude/plans/calm-fluttering-owl.md` への下書き) | Write                          | 書(plan ファイルのみ) | 2分      |
| 7   | ExitPlanMode で APPROVE 取得                                                      | ExitPlanMode                   | 承認                  | 即時     |
| 8   | `docs/refactor/` 作成 + `phase-1-explore.md` / `phase-1-plan.md` 保存             | Bash (`mkdir`) + Write × 2     | 書(成果物)            | 2分      |

合計実所要時間: 約 15〜20 分(I/O 待ち含む)。

---

## ロールバック手順

このフェーズは **コード変更ゼロ**のため、ロールバックは「成果物 2ファイルの削除」だけで完了する。

```bash
# Phase 1 の成果物を撤回したい場合
rm -rf docs/refactor/
```

依存関係・lockfile・コミットは一切触っていないので、`git status` で `docs/refactor/` の追加のみが見える状態。
仮にこのフェーズ全体を「無かったこと」にしたい場合は `git clean -fd docs/refactor/`(またはまだ commit していなければ単に `rm -rf` でよい)。

---

## 成功判定基準

以下をすべて満たした場合に Phase 1 を「完了」と判定する。

- [x] **(1) 現状アーキ図**: Mermaid 図 2種(レイヤ + ルーティング)が `phase-1-explore.md` §1 に存在し、構文として valid。
- [x] **(2) god component 上位 10件**: 行数 / hooks / props / 局所依存数を含む表が §2 に存在。
- [x] **(3) FSD 境界違反**: 件数の合計(7件)と内訳が §3 に存在し、例(file:line)付き。
- [x] **(4) 死コード総量**: knip 5区分(files / exports / type-exports / deps / devDeps)の件数が §4 に存在し、偽陽性リスク評価付き。
- [x] **(5) カバレッジ低い 20件**: %Stmts と risk 評価付きの表が §5 に存在。
- [x] **(6) SDK 健康状態**: expo-doctor 17/19 の結果と失敗 2件の詳細が §6 に存在。
- [x] **(7) コード変更ゼロの実証**: `git status -s -- src app` が空であること(調査では `src/` `app/` を触っていない)。
- [x] **(8) 成果物が 2ファイルのみ**: `docs/refactor/phase-1-explore.md` と `docs/refactor/phase-1-plan.md` 以外のファイル変更が無いこと。

---

## 次フェーズへの引き継ぎ事項

Phase 2(計画策定)起動前に、レポート §9 の **人間判断が必要な点 (a)〜(d)** を決定する必要がある。

- (a) Tamagui 撤去の可否
- (b) expo-doctor メジャー版ずれ 3件の扱い(このリファクタ群 vs 別 Issue)
- (c) リファクタ順序の合意(「安全網テスト先」推奨)
- (d) `useSettingsBootstrap` の `potUnit` 黙消し既知欠陥の扱い

決定後、Phase 2 の計画書 `docs/refactor/phase-2-plan.md` を別ターン(新 Plan Mode)で起票する。
