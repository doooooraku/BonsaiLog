# Phase 6 (FSD 境界整理) 完了レポート

> 作成日: 2026-05-30
> 種別: 完了レポート (Before/After + 学び)
> 正: `docs/adr/ADR-0048-fsd-layer-definition.md`(層定義 + allow-matrix)/ `docs/refactor/phase-6-plan.md`
> 関連: `docs/architecture.md` §1-2 / `master-plan.md` Phase 6

## Context

`docs/architecture.md` は FSD 風の一方向依存を「目指す姿」として宣言していたが、層間 import を機械検査する仕組みが無く、Phase 1 で検出した境界違反 7 件が放置されていた。Phase 6 で `eslint-plugin-boundaries` を導入し、違反を是正のうえ **error 化 + CI gate** で再発を構造防止した。ユーザー観察可能な挙動は不変。

## Before / After (境界違反 7 → 0)

| ID    | 違反                      | 対応                                                                  | PR     |
| ----- | ------------------------- | --------------------------------------------------------------------- | ------ |
| —     | (土台)                    | ADR-0048 + `eslint-plugin-boundaries` warn 導入 + allow-matrix        | #891   |
| F1b/c | `core→stores` (型)        | `PotUnit` を `src/types/units.ts` へ移設 + re-export 凍結             | #892   |
| F3    | `db→features`             | `payloadValidator` を `src/db/eventPayloadValidator.ts` へ + 循環解消 | #893   |
| F1a   | `core→stores` (useColors) | core 据え置き + 当該 import 1 本を eslint-disable で例外受容          | #894   |
| F2a/b | `db→services` (写真 I/O)  | `src/features/photos/photoOrchestrator.ts` へ I/O 分離、repo 純化     | #895   |
| F4    | `stores→services`         | services を SDK ラッパ層と定義し**正規化=合法**(コード変更なし)       | (定義) |
| —     | (封じ込め)                | `boundaries/dependencies` を **error** 化 + CI gate + docs 整合       | #896   |

## DoD 検証

- [x] `boundaries/dependencies` violation = 0、**error** で CI(verify:lint)gate 化
- [x] `import/no-cycle` 0 維持(F3 で循環解消)
- [x] `pnpm verify` 全 green、`pnpm test` 全 green(80 suites / 1123 tests、node22)
- [x] ADR-0048 が main 在、`architecture.md` / `master-plan.md` の ADR 参照を 0048 に整合
- [x] 各 PR 本文に違反数の推移(6→4→3→2→0)を証拠提示

## 設計上の判断(学び)

- **F1a useColors は移設不可だった**: app/components/features 全層が使う横断テーマ hook で、かつ `themeMode`(stores の state)を読む。components が import 可な層(core/types/db)で stores を import 可な層は存在しない(空集合)→ どこへ移しても別の違反が出る。pragmatic に **core 据え置き + 例外 1 本受容**(ADR-0048 Amendment)とした。一律「移設で解消」が常に最適ではない好例。
- **F2 はファイル I/O と DB の分離**: repository を純データアクセスに戻し、写真ファイル copy/delete(imperative shell)を feature 層 orchestrator に集約(architecture.md §3)。孤児防止の順序保証(ファイル削除→DB削除)は静的テストを 2 層に分割して維持。
- **F4 は「違反」でなく層定義の問題だった**: services を SDK ラッパ低層と定義すれば `stores→services` は正当。allow-matrix の明文化で誤検出を回避。
- **計画前提の訂正 2 件**: ① ADR 番号(master-plan の「ADR-0046」は使用済 → 0048)② boundary plugin は Phase 3 で繰延され未導入だった(Phase 6 で導入から)。着手前の実測(grep + lint)で前提を更新できた。

## 残課題(Phase 6 スコープ外)

- `components→db`(EventIcons の `type EventType`)の暫定許可: 将来 共有 schema 型を `src/types/` へ移設し例外撤去(ADR-0048 Notes)。
- `.expo/` 自動生成物の eslint ignore 追加(無害な unused-disable warning)。
- Phase 7(死コード一掃 + Tamagui 撤去 + ADR-0015 amend): Phase 7 起票時に ADR 番号を再採番(master-plan の Phase 7 ADR 番号は要更新)。
- Phase 5(共通化)は cooling-off で延期中(2026-06-12 頃 再評価)。
