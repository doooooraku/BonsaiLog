# refactor — リファクタ Phase 3-7 の学び

> 想定読者: 次回大規模リファクタ・死コード一掃・依存撤去を担当する人
> 関連: `docs/refactor/phase-{4,6,7}-report.md` / `master-plan.md` / ADR-0045 / ADR-0048 / ADR-0015 Amendment

---

## L1: knip の `ignore` は両刃の剣 (Phase 7)

**症状**: knip の `ignore` リストに「使われていないけど削除判断保留」のファイルを置くと、**そのファイル自体が死蔵化しても knip からは見えなくなる**。Phase 7 で `ignore` を整理した結果、`external-link.tsx` / `reviewService.ts` / `structuredLog.ts` の 3 ファイル + そこだけで参照されていた 4 deps (`@expo/vector-icons` / `@shopify/flash-list` / `expo-web-browser` / `expo-store-review`) が露呈した。

**教訓**:

- `ignore` は **「knip 偽陽性の抑止」目的でだけ使う**。「保留」「とりあえず除外」は禁物。
- 定期的に `ignore` リストの各ファイルが**本当に使われているか** grep で再確認する。
- 「ignore に入れたい」と思ったら、**まず削除を検討**。

## L2: 大物撤去 PR は push 前に `pnpm verify` 完全実行必須 (Phase 7)

**症状**: PR 7-5 (4 deps + 3 ファイル削除) で `pnpm lint && pnpm test` のみローカル確認して push → CI で `verify:config` が「Failed to resolve Expo config」、続いて `verify:theme` (theme:tokens) が「tamagui.config.ts not found」で連続失敗。

**教訓**:

- 大物撤去 PR (deps / 設定ファイル / 大型 dir 削除) は、push 前に **`pnpm verify` 全 20+ sub-checks をローカルで完全実行**する。lint/tsc/test だけでは不十分。
- 特に `verify:config` (`npx expo config`) は app.config.ts 経由で deps を間接参照するため、dep 削除時の隠れ依存をここで検出できる。
- `verify:theme` 系のカスタムスクリプトは過去のライブラリ依存をハードコードしている可能性がある (ex: `theme-token-check.mjs` が `tamagui.config.ts` を必須としていた)。

## L3: app.config.ts の plugin 参照は knip 不可視 (Phase 7 K5)

**症状**: `expo-web-browser` を JS 用途 (`external-link.tsx`) と config plugin (`app.config.ts:141 ensurePlugin('expo-web-browser')`) の両方から参照していたが、knip project が `["app/**", "src/**", "components/**", "hooks/**", "constants/**"]` で **root 直下の `app.config.ts` を含まない**ため、knip は plugin 参照を見れず「未使用」と誤判定した。

**教訓**:

- Expo plugin 経由で必要な deps (`expo-web-browser` / `expo-build-properties` 等) は **`knip.json` `ignoreDependencies` に明記**してその旨をコメントで残す。
- 別解: `knip.json` `project` に `"app.config.ts"` を追加して plugin 参照も解析させる方法もあるが、副作用 (knip が config の動的 import を誤検出する等) があるため要検討。

## L4: ADR/script の obsolescence は大物撤去で顕在化する (Phase 7 K5)

**症状**: `scripts/theme-token-check.mjs` が `tamagui.config.ts` の存在を前提に theme tokens を検査していた。Tamagui 撤去 (PR 7-4) で tamagui.config.ts が消えた瞬間、スクリプトが exit 1。

**教訓**:

- 大物ライブラリ撤去時は **周辺スクリプト・docs・ADR の参照**を grep で網羅し、obsolescence したものに「skip / 撤回 amend / 削除」のどれかを選ぶ。
- 「Tamagui 撤回」は ADR-0015 Amendment で明文化したが、関連スクリプトの skip 化は当初 plan に無かった。**ADR amend と「周辺ハードコード参照の整合」はセットで考える**。

## L5: `git rm` 後の `git add` ピットフォール (Phase 6/7 で 3 回再発)

**症状**: `git rm <file>` で削除後、続けて `git add <別ファイル> <削除済file>` を実行すると、`<削除済file>` が「pathspec did not match」で fatal となり、**git add コマンド全体が abort**。後続の `<別ファイル>` も staged されず、commit が不完全になる。PR 6-2 / PR 7-1 / PR 7-2 で発生。

**教訓**:

- **`git rm` で削除した path は `git add` に絶対に含めない** (削除は git rm で既に staged 済)。
- `git add` は存在するファイルのみを対象に。
- `git status -s` で `D` 行はスキップ、`M` / `??` 行のみ git add する。

## L6: K7 (未使用 export) の bulk 削除は危険 (Phase 7 計画段階)

**症状**: knip 「Unused exports 33 件」のうち、`deleteBonsaiHard` / `getEventsByStatus` / `bulkLogEvents` 等の repo 関数は **characterization テスト**から参照されている。bulk 削除するとテスト破壊。

**教訓**:

- knip の「Unused exports」は **「production code から import 0 件」** を意味し、**「テストからの参照」までは含めない**判断もある (project 設定次第)。
- 削除前に **per-export で `grep __tests__` を確認**。テスト参照ありなら「intentional API」とみなして残す or テストごと削除する判断。
- 「knip flag = safe to delete」は**誤り**。文脈確認必須。

## L7: Phase 5 cooling-off の正当性が実測で証明された

**症状**: Phase 4 (god 分割) 完了直後に Phase 5 (共通化) を実行しようとしたが、grep 実測で「3+ 箇所で再利用される未抽出部品 = 実質ゼロ」と判明 → cooling-off 延期。

**教訓**:

- god 分割直後の「共通化候補」は**理論上多数あっても実測ゼロ**になり得る (まだ使い始めた段階のため)。
- master-plan §7 アーキテクト視点が指摘した cooling-off (2 週間延期) は妥当だった。**「分割直後の共通化は早すぎ」を実測で確認できた珍しいケース**。
- 計画書の自己批判 (§7 5視点ペルソナ) は機能する。書く価値あり。

---

## 関連 ADR / Report

- ADR-0045 (god 分割 coordinator の成功基準 = 責務分離 + ≤約450)
- ADR-0048 (FSD 層定義 + allow-matrix + boundaries error 化)
- ADR-0015 Amendment 2026-05-30 (Tamagui 撤回)
- `phase-4-report.md` / `phase-6-report.md` / `phase-7-report.md`
