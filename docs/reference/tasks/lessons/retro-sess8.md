# Retro Sess8 — 学び集約 + 仕組み化

> **対象**: 2026-05-17〜18 Sess8 (PR #545 / #546 / #547 / #548 / #549) + Retro PR (本 PR、 仕組み化)
> **役割**: ADR-0025 全 Phase 完遂セッションの学び + 仕組み化 (R-33 / S-1 / S-2 / 2 回ルール) を集約
> **R-24 遵守**: 200 行以内、 新規学びは関連 PR 番号付きで追記

---

## 1. Keep (続けるべき良かった点)

### K-1. 議論モード起動 + 1 次情報裏取りで誤引用発見

- **経緯**: ADR-0025 初版 (#543) で「Strava Record タブ pattern」 を業界事例として引用 → Sess8 PR-1 議論で 1 次情報 ([Strava Support](https://support.strava.com/hc/en-us/articles/216917397-Recording-an-Activity)) 確認 → 「実は案 C 系」 と判明、 ADR Driver 根拠崩壊
- **対応**: ADR-0025 案 A → 案 B 切替 (#545)
- **教訓**: 議論モードで疑念があれば WebFetch / WebSearch で 1 次情報確認、 ADR Driver 引用元を verify

### K-2. 半自走モード + 4 段階強制 (R-17) で 5 PR 連続完遂

- **経緯**: user 「半自走モード」 承認後、 各 PR で「計画 → 実装 → user F5 確認 → merge」 サイクル繰り返し
- **結果**: 5 PR (#545-#549) を 1 セッション内で完遂、 user 確認回数を要所 (PR 作成 + merge) に限定
- **教訓**: 大規模変更でも半自走 + 4 段階で混乱なし、 user 真意の都度確認も柔軟対応可能

### K-3. 手動 SS 21 枚で機能実証 (Maestro 自動化 fail 代替)

- **経緯**: Phase 3 で Maestro 実機実行 → Expo Developer Menu 誤起動で fail
- **対応**: 手動 SS (`adb exec-out screencap -p`) で機能動作を実証、 skip-list に provisional entry 登録
- **教訓**: 自動化が外部 lib bug で fail でも、 機能動作実証手段は複数あり

### K-4. 大幅シンプル化 (1,013 行削除)

- **経緯**: 5 PR で +1,153 / -1,013 行 = ネット +140 行 (機能拡大 + 削減バランス)
- **特に PR #549**: bonsai-select-mode 完全廃止で 498 行削除
- **教訓**: user 真意整合の追求 = コード削減と機能維持の両立

---

## 2. Problem (改善余地ある問題)

### P-1. 業界事例の誤引用が ADR Driver の根拠を崩壊

- **経緯**: Strava = 案 A と引用 → 1 次情報で案 C 系判明、 Apple HIG iOS 26 anti-pattern 認識追加
- **発生回数**: 2 回 (ADR-0025 初版 + 議論で発見) = **2 回ルール (本セッション Q-3 で強化) で hook 化必須**
- **仕組み化**: **S-1 = `scripts/check-adr-sources.mjs`** (新規)、 ADR 内で「業界事例」 等の keyword あれば URL 必須化、 `pnpm verify:adr-sources` で任意実行可

### P-2. Phase 1b 漏れ 3 件 (SearchHeader path / look-back showSettings / Maestro 14→19)

- **経緯**: Sess7 PR-1 で settings タブ削除 + `app/settings/` 移動時、 影響範囲 grep 不足で漏れ 3 件発生
- **発見**: Sess8 PR-1 議論で grep し直して全件判明
- **発生回数**: 2 回 (Sess7 PR-1 で漏れ + Sess8 PR-1 で発見) = **2 回ルールで hook 化必須**
- **仕組み化**: **S-2 = `.claude/hooks/check-obsolete-routes.mjs` + `scripts/obsolete-routes.json`** (新規)、 廃止 route を構造管理、 Edit/Write 前に block

### P-3. R-9 違反気味の連発 (計画段階で「14 件」 楽観計上、 実は 19 件)

- **経緯**: 計画段階で「Maestro flow 14 個」 と楽観計上、 実 grep で 19 個と判明 (差分 5 件)
- **発生回数**: 2 回以上 (Sess7 PR-1 + Sess8 PR-1) = **2 回ルールで仕組み化必須**
- **仕組み化**: **R-33 新設 + PR テンプレ §7.8「全網羅 grep」 必須化**、 計画段階で実 grep 結果を PR 本文に必須記載

### P-4. user 真意の動的変化 (長押し維持 → 不要)

- **経緯**: Sess8 PR-2 計画段階で Q-A「(a) 長押し経路は維持」 を承認、 Sess8 PR-5 で「実機上不要」 に方針転換
- **対応**: ADR-0025 §10 を 2 回改訂 (Notes Amended)
- **教訓**: ADR の Subject to Revision は重要、 user 真意は実機検証で変化する前提

### P-5. format check 隠れ FAIL (echo 誤認)

- **経緯**: Phase 1c で `pnpm verify` の format:check が FAIL したが、 echo `EXIT=0` が誤表示
- **対応**: prettier 自動修正後に再 verify で確認
- **教訓**: R-22 の `grep -E '^EXIT_CODE='` 明示確認は必須、 echo パイプの誤認注意

### P-6. Maestro Tools button bug 再発 (Sess4 → Sess8)

- **経緯**: Sess4 で Y2 受容運用確定、 Sess8 で再発 (実機の Tools toggle が persist しない)
- **教訓**: 受容運用は session 間で persist する仕組みが必要、 別 Issue 起票推奨

---

## 3. Try (次セッション以降の試行)

### T-1. Sources URL チェック を ADR 起票 PR で必須化

- 本 PR で `pnpm verify:adr-sources` 任意実行 → 次は **CI block** に昇格検討 (既存 ADR の URL 整備後)

### T-2. obsolete-routes.json の継続メンテナンス

- 今後 route 変更時に新 entry 追加が必須、 PR テンプレ §7.8 で構造的検出

### T-3. R-33 + 2 回ルールの実運用

- 次セッションで route / Phase 変更 PR があれば、 §7.8 を必須記入、 hook block で漏れ防止

### T-4. Maestro 自動化の Tools button bug 対応 (別 Issue)

- 別 Issue 起票で Tools button OFF persist 仕組み (session-start hook or adb script)

---

## 4. 仕組み化マッピング (本 PR 実装内容)

| 学び                                | 仕組み                           | 実装ファイル                                                                                  |
| ----------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------- |
| **P-1** 業界事例誤引用              | **S-1** ADR sources URL チェック | `scripts/check-adr-sources.mjs` + `package.json verify:adr-sources`                           |
| **P-2** Phase 1b 漏れ (path 文字列) | **S-2** 廃止 route hook          | `.claude/hooks/check-obsolete-routes.mjs` + `scripts/obsolete-routes.json`                    |
| **P-3** R-9 違反 (grep 不足)        | **R-33 + S-3** PR テンプレ §7.8  | `.claude/recurrence-prevention/specialized.md` R-33 + `.github/pull_request_template.md` §7.8 |
| **共通** 3 回ルール → 2 回ルール    | **Q-3** 2 回ルール強化           | `.claude/recurrence-prevention.md` 運用ルール §6 拡張                                         |

## 5. Docs vs Code 整合確認結果 (Q-2)

本セッション変更 8 ファイル vs 対応 docs の整合確認:

| 変更コード                                                     | 対応 docs                                | 整合状態 |
| -------------------------------------------------------------- | ---------------------------------------- | -------- |
| `app/(tabs)/bonsai/index.tsx` (selectMode 完全削除)            | ADR-0025 §③ §10 (PR #549 で明文化)       | ✅ 整合  |
| `app/(tabs)/record/index.tsx` (案 X stub)                      | ADR-0025 §② (PR #547 で明文化)           | ✅ 整合  |
| `app/(tabs)/plan/index.tsx` (FAB 追加)                         | ADR-0025 §② (PR #546 で明文化)           | ✅ 整合  |
| `app/(tabs)/_layout.tsx` (記録タブ listeners)                  | ADR-0025 §② (PR #547 で明文化)           | ✅ 整合  |
| `app/(modals)/_layout.tsx` + `bonsai-multi-select.tsx`         | ADR-0024 (modal 一本化) + ADR-0025 §②    | ✅ 整合  |
| `src/features/event/useBulkActionFlow.ts` (新規 hook)          | ADR-0025 §② (共通 hook 言及済)           | ✅ 整合  |
| `src/features/event/BonsaiMultiSelectScreen.tsx` (新規 screen) | ADR-0025 §② (bonsai-multi-select 言及済) | ✅ 整合  |
| `src/features/bonsai/SearchHeader.tsx` (props simplify)        | ADR-0025 §③ §9 (PR #546 追補)            | ✅ 整合  |
| `src/features/bonsai/SelectionToolbar.tsx` (削除)              | ADR-0025 §③ §10 (PR #549 廃止明文化)     | ✅ 整合  |

**`functional_spec.md`** 確認結果:

- selectMode / SelectionToolbar / bonsai-select-mode の言及 = **元から無い** (drift ではなく未記載、 spec gap)
- ADR-0025 が **唯一の SoT** として機能、 R-16 適用 (運用系は ADR 優先)
- 次回 functional_spec.md 改訂時に「タブ動線」 セクション追加検討 (別 Issue)

**結論**: 本セッション変更コードと既存 docs に **drift なし**、 ADR-0025 が full coverage で SoT として機能。

---

## 6. 関連 PR + 仕組み化 file 一覧

- **PR #545**: Phase 1c hotfix + 案 A → 案 B 切替
- **PR #546**: Phase 2 案 B FAB 起動実装
- **PR #547**: 案 X 記録タブ直接 modal
- **PR #548**: Phase 3 Maestro + 17 言語翻訳
- **PR #549**: bonsai-select-mode 完全廃止
- **本 PR (Retro)**: 仕組み化 (S-1 / S-2 / R-33 / 2 回ルール) + lessons 追加

**新規仕組み file**:

- `scripts/check-adr-sources.mjs` (S-1)
- `scripts/obsolete-routes.json` (S-2)
- `.claude/hooks/check-obsolete-routes.mjs` (S-2)
- `.claude/recurrence-prevention/specialized.md` R-33 (S-3)
- `.claude/recurrence-prevention.md` 2 回ルール (Q-3)
- `.github/pull_request_template.md` §7.8 (S-3)
- `docs/reference/tasks/lessons/retro-sess8.md` (本ファイル)
