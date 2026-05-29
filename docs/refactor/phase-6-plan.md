# Phase 6: FSD 境界整理 — 計画書

> 作成日: 2026-05-29
> 種別: 計画書（Plan Mode 承認済、実装は PR シリーズで段階実施）
> SoT: `docs/refactor/master-plan.md` Phase 6 / `docs/architecture.md` §1-2 / **ADR-0048**（FSD 層定義 + allow-matrix）
> 適用ルール: リファクタ10ルール（APPROVE制 / 1commit1懸念 / 振る舞い不変 / tsc+lint+test 緑 / 2回失敗で停止 / 想定外で即停止）

---

## 目的

Phase 1 で検出し 2026-05-29 に現存を実測確認した **FSD 境界違反を是正**し、`eslint-plugin-boundaries`（`boundaries/dependencies`）を **warn→error 化**して再発を構造防止する。**ユーザー観察可能な挙動は不変**（import path 付け替え + ロジック不変が原則。例外は F2 のみ、characterization テスト + 実機検証で担保）。

## 是正対象（実測で確定した違反 = 6 件）

ADR-0048 の allow-matrix を適用した結果、残る違反（warn）:

| ID  | 違反        | 実ファイル:行                                             | 是正                                                |
| --- | ----------- | --------------------------------------------------------- | --------------------------------------------------- |
| F1a | core→stores | `src/core/theme/useColors.ts:16`（`useSettingsStore` 値） | useColors を `src/features/theme/` へ移設（PR 6-3） |
| F1b | core→stores | `src/core/util/potUnitConvert.ts:18`（`type PotUnit`）    | PotUnit 型を `src/types/units.ts` へ（PR 6-1）      |
| F1c | core→stores | `src/core/i18n/lang-defaults.ts:14`（`type PotUnit`）     | 同上（PR 6-1）                                      |
| F2a | db→services | `src/db/photoRepository.ts:19`（`persistPhotoFile`）      | 写真 I/O を orchestrator へ（PR 6-4）               |
| F2b | db→services | `src/db/bonsaiRepository.ts:17`（`deletePhotoFile`）      | 同上（PR 6-4）                                      |
| F3  | db→features | `src/db/eventRepository.ts:23`（`payloadValidator`）      | payloadValidator を db 層へ移設（PR 6-2）           |

**F4（stores→services, `proStore→proService`）は ADR-0048 で正規化＝合法**。コード修正なし。
**正当エッジ**（allow に含め誤検出しない）: `db→core`（ADR-0008 の `nowUtc`）/ `services→core`（`getAppExtra`）/ `components→db`（`EventIcons` の `type EventType` のみ、将来 types/ 移設候補）。

## 対象ファイル一覧

- 設定: `eslint.config.js`（boundaries 追加）/ `package.json` + `pnpm-lock.yaml`（devDep）/ `knip.json`（ignoreDependencies 追記）
- ADR/docs: `docs/adr/ADR-0048-fsd-layer-definition.md` / 本計画書 / （6-5 で）`docs/architecture.md` `docs/refactor/master-plan.md`
- 移設（実体 + re-export 凍結）: `src/types/units.ts`★ / `src/db/eventPayloadValidator.ts`★ / `src/features/theme/useColors.ts`★ / `src/features/photos/photoOrchestrator.ts`★
- 純データ化: `src/db/photoRepository.ts` / `src/db/bonsaiRepository.ts`

## 変更前後のディレクトリツリー（要点）

```
Before                                  After
src/core/theme/useColors.ts (実体)      src/features/theme/useColors.ts (実体) ★
                                        src/core/theme/useColors.ts (re-export 凍結)
src/core/util/potUnitConvert.ts ─┐      src/types/units.ts (PotUnit) ★
src/core/i18n/lang-defaults.ts ──┘─→stores  └ 上記2つは @/src/types/units 参照へ
src/features/event/payloadValidator.ts  src/db/eventPayloadValidator.ts ★ (+旧 re-export)
src/db/{photo,bonsai}Repository.ts ─→services  src/features/photos/photoOrchestrator.ts ★ (I/O集約)
（boundary plugin なし）                 eslint.config.js (+boundaries: warn→error)
                                        docs/adr/ADR-0048-fsd-layer-definition.md ★
```

## ステップ（PR シリーズ、各 PR 内コミットは 5 分以内単位）

| PR      | 内容                                                                                                                     | 違反推移   | リスク                                              |
| ------- | ------------------------------------------------------------------------------------------------------------------------ | ---------- | --------------------------------------------------- |
| **6-0** | ADR-0048 起票 + 本計画書 + `pnpm add -D eslint-plugin-boundaries` + eslint.config.js に boundaries(warn) + knip.json     | 6 を可視化 | 低（doc/devDep/warn のみ）**user レビューゲート**   |
| **6-1** | F1b/c: `src/types/units.ts` に `PotUnit`、settingsStore で re-export 凍結、potUnitConvert/lang-defaults の import 元変更 | 6→4        | 低（型のみ・機械的）                                |
| **6-2** | F3: payloadValidator を `src/db/eventPayloadValidator.ts` へ、旧 path re-export 凍結。循環解消                           | 4→3        | 低〜中                                              |
| **6-3** | F1a: useColors を `src/features/theme/` へ、`src/core/theme/useColors.ts` は re-export 凍結（23 消費者無改修）           | 3→2        | 中（実機でテーマ切替確認）                          |
| **6-4** | F2: photo/bonsaiRepository を純データ化、`src/features/photos/photoOrchestrator.ts` に I/O 集約、呼出側更新              | 2→0        | **高**（実機検証必須・persist/delete 別コミット可） |
| **6-5** | boundaries warn→error + CI gate、architecture.md/master-plan の ADR 参照更新、（任意）phase-6-report.md                  | error 0    | 低                                                  |

## ロールバック手順

- 各 PR は独立 squash → `git revert <sha>` で単独復元。
- 全移設で re-export 凍結を使うため、途中 revert しても消費者は無影響。
- plugin は devDep → `pnpm remove eslint-plugin-boundaries` + config 削除で完全撤去。

## 成功判定基準

- [ ] `boundaries/dependencies` violation = 0、**error** で CI gate 化（6-5）
- [ ] `import/no-cycle` 0 維持（F3 で循環解消）
- [ ] `pnpm verify` 全 green、`pnpm test` 全 green（node22）
- [ ] F2 のみ実機検証（写真追加→ファイル実在 / 盆栽削除→ファイル消滅）で振る舞い差ゼロ
- [ ] ADR-0048 が main 在、architecture.md / master-plan の ADR 参照が 0048 整合
- [ ] 各 PR 本文に違反数の推移（6→4→3→2→0）を証拠提示

## 検証方法（end-to-end）

1. 各 PR: `PATH=/usr/bin:/bin:$PATH pnpm verify` 緑。
2. boundary: `pnpm exec eslint "src/**/*.{ts,tsx}" "app/**/*.{ts,tsx}"` の `boundaries/dependencies` 件数を PR ごとに記録。
3. F2 のみ実機: Dev Build install → 写真追加→保存→`run-as cat` でファイル実在、盆栽削除→ファイル消滅を adb で裏取り。
4. 回帰: 既存 Maestro smoke + repo characterization tests（bonsai/photo/event）全緑。

## 人間の判断が必要な点（PR 6-0 ゲートで確認）

- **Q1 useColors の配置**: 本命 `src/features/theme/`（ADR-0048 Decision 5）。新設 `src/shared/` 案は却下（ADR-0048 Alternatives A）。
- **Q2 ADR ゲート運用**: 「ADR-0048 を PR 6-0 で先行 → user レビュー確定 → F1〜F2 着手」の 2 段ゲート。

## 想定外で即停止する条件（Rule 8）

F2 で挙動差を検知 / 型エラー大量発生 / 依存の破壊的更新が必要 / 同一問題 2 回失敗 / context 窮迫。
