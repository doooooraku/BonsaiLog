# ADR-0024: @gorhom/bottom-sheet 全廃 + native presentation 置換 (Phase G)

- Status: **Provisionally Accepted** (2026-05-12 Phase G1 着手時、実機 5/5 検証は Phase G1 完了後)
- Date: 2026-05-12
- Deciders: @doooooraku
- Related: Issue #475 / ADR-0020 (Notes Amended 2026-05-12) / `docs/reference/functional_spec.md` §6.2 / §7.2 / §9.3.4 / §22

> **2026-05-12 Phase G1 着手時 update**: ユーザー明示承認下で **実機 5 回 × 3 案 = 15 回検証 (PoC) をスキップ**、暫定 formSheet 採用で Phase G1 (SpeciesPicker + StylePicker 本実装) を着手。R-25 / R-30 リスク受容、実機 5/5 検証は Phase G1 完了後または G2-G4 内で順次実施、不合格判明時は revert + plan B (Expo UI BottomSheet) 切替。詳細は本 ADR §Notes Amended (2026-05-12 Phase G1) 参照。
>
> **2026-05-12 retro update**: 反復回数を **5 回 → 3 回 (業界標準)** に短縮、timeout 値も 33-40% 短縮 (各 run ~4 分 → ~3 分、3 flow 検証 60 分 → 27 分、55% 削減)。Phase G1 実機検証は実質 5/5 + 5/5 = 10/10 PASS で完了 (g1-species + g1-style)、g2-work は scroll 課題のみ残。合格基準は新基準 **3/3 = 100%** で運用、R-30 update 済。

---

## Context（背景：いま何に困っている？）

- **現状**:
  - 本プロジェクトは `@gorhom/bottom-sheet` v5.2.13 を 10 箇所で利用 (8 component + `BulkLogConfirmSheet` + ヒートマップタップ)
  - Maestro skip-list.json に 3 件の永続 skip。うち 1 件 (`home-bulk-sched-date`) は **@gorhom Sheet 描画タイミング限界**が直接原因 (PR #404 / PR #415 で 2 段階待機追加も解消せず)
  - `docs/reference/functional_spec.md` は §6.2 L301 で `(modals)/bonsai-new` (`modal` presentation)、§7.2 L436-L437 で `(sheets)/work-type` `(sheets)/work-confirm` (`formSheet` presentation) を **既に設計済**だが、現実装は `@gorhom/bottom-sheet` 自前実装で未整合
- **困りごと**:
  - Maestro 失敗 (テスト skip) が解消できない → CI 緑化に支障 + リリース直前の手動検証コスト膨張
  - `@gorhom/bottom-sheet` v5 でも Maestro Studio で content が選択不能になる Issue が報告 (gorhom #1753)
  - Maestro 公式 Issue #1703 (animation 中の tap flaky) は **"not planned"** で close 済 → ライブラリ側での解決は望めない
  - functional_spec.md の native presentation 設計が未実装のまま、`@gorhom` 自前 Sheet が肥大化
- **制約 / 前提**:
  - `docs/reference/constraints.md` §1-4 (記録のみ哲学)、§5 (シニア UX) — Apple Health 風 BottomSheet (`functional_spec.md` L699) はシニア UX 観点で意図的に採用された設計、廃止する場合は同等以上の UX を維持する義務あり
  - `docs/mockups/v1.0/docs/principles.md` (BottomSheet 直接記載なし、philosophy のみ規定)
  - Expo SDK 55 + React Native 0.83.4 + Expo Router 55 (本プロジェクト現行スタック)
  - Expo v54 + RN 0.81 で報告された formSheet content 空問題 (`contentStyle` で `height: '100%'` 必須) — v55 でも予防的に追加する
  - `.claude/recurrence-prevention.md` の R-25 (Claude Read 主導) / R-26 (Phase 完遂 ≠ Issue 完遂) を遵守
- **R-16 (ADR 優先ルール) 破棄後の SoT**: 2026-05-12 セッションで F 案採用済 (法令系 ADR-0005 / 0009 / 0017 のみ ADR 優先、運用系は user 判定)。本 ADR は **運用系** に分類されるため、user 判定 (本 ADR 起票者) を SoT とする

---

## Decision（決めたこと：結論）

- **決定**:
  1. **`@gorhom/bottom-sheet` 全廃** (10 箇所、Phase G 完了後に `package.json` から依存削除)
  2. **Phase G を G0 (PoC) + G1-G4 (本実装) 2 段階化**
  3. **Phase G0 (PoC、1 セッション)**: SpeciesPicker を 3 案 (X = 完全画面 push / Y = `presentation:'modal'` / Z = `presentation:'formSheet'` + `sheetAllowedDetents:[0.5, 1]` + `contentStyle:{height:'100%'}`) で並列実装、実機 (Pixel 6) で Maestro flow を 5 回ずつ実行
  4. **PoC 合格基準**: **5/5 = 100% 厳格**。4/5 以下は不採用
  5. **PoC 全 3 案不合格時の plan B**: Expo UI BottomSheet (新公式 alternative、`@gorhom` API 互換、native 実装) を単独 PoC、それも不合格なら ADR-0025 起票で Detox or Maestro Cloud 移行を検討
  6. **Phase G1-G4 (4-6 PR、4-6 セッション)**: PoC で確定した最安定パターンを採用、全 10 箇所を段階的に移行
  7. **Maestro 標準パターン化**: 全 tap に `retryTapIfNoChange: true`、全 step 後に `waitForAnimationToEnd: { timeout: 5000 }`、全新規 screen に `testID` 厳格付与 (`e2e_<screen>_<element>` スネークケース)
  8. **lint ルール起票** (Phase G 完了後の follow-up): Maestro flow lint (waitForAnimationToEnd 不在検出) + testID ESLint rule (新規 screen 必須)
- **適用範囲**: v1.x、Free / Pro 両方、iOS / Android (Web は @gorhom 利用なし、影響なし)

---

## Decision Drivers（判断の軸：何を大事にした？）

- **Driver 1 (最重要)**: Maestro 失敗を **確実に解消** する (ユーザー要求「同じ失敗を繰り返したくない」)
- **Driver 2**: シニア UX (Apple Health 風 BottomSheet、functional_spec.md L699-L702) を維持する — `presentation: 'formSheet'` + detents で同等表現を実現
- **Driver 3**: functional_spec.md 既存設計 (§6.2 modal / §7.2 formSheet / §22 fullScreenModal) に整合する
- **Driver 4**: 業務ペルソナ (高橋プロ 62 歳 150 株運用) の操作速度を維持する — 完全画面 push は業務速度後退
- **Driver 5**: PoC で **実証してから採用** することで R-25 (機械判定のみで「達成」 判定禁止) 整合 + 失敗リスク最小化

---

## Alternatives considered（他の案と却下理由）

### Option A: 完全画面 push (Issue #475 原案、全 BottomSheet を Stack push に置換)

- 概要: 全 10 箇所を `router.push('/xxx')` で完全画面遷移化
- 良い点: BottomSheet 描画問題完全消滅、Maestro skip 確実に解消
- 悪い点: Apple Health 風 BottomSheet (シニア UX◎) を喪失、業務ペルソナのタップ数 + 待ち時間増加、iOS Sheet 慣行 (Apple HIG) から逸脱
- 却下理由: 5 専門家全員反対 + 4 ペルソナ評価で △ 多数 (R-10 不合格)

### Option B: native presentation 整合 (modal / formSheet / fullScreenModal) ★採用

- 概要: 上記 Decision の通り、用途別に Expo Router の `presentation` を使い分け
- 良い点: functional_spec.md 既存設計に整合、UX 維持、Maestro skip 解消期待 (PoC で実証要)
- 悪い点: PoC コスト 1 セッション、PoC 不合格時の plan B 必要
- 採用理由: 4 ペルソナ評価で全員 ○ 以上 ✕ ゼロ、5 専門家 + フラット視点全員推奨

### Option C: Expo UI BottomSheet (新公式 alternative)

- 概要: `@gorhom/bottom-sheet` API 互換の Expo UI BottomSheet (native 実装、iOS SwiftUI / Android Compose) に置換
- 良い点: コード変更最小、UX 完全維持
- 悪い点: Expo UI BottomSheet 自体の Maestro 対応未検証、新興ライブラリで実績少
- 却下理由: plan B として残置 (PoC 全 3 案不合格時)

### Option D: @gorhom 維持 + Maestro 追加 wait

- 概要: ピンポイント `waitForAnimationToEnd` 追加、@gorhom は v5 維持
- 良い点: コスト最小
- 悪い点: 過去 PR #404/#415 で 2 段階追加待機実装も解消せず、Maestro Issue #1703 が "not planned" で close
- 却下理由: 過去実証済の失敗パターン、ユーザー要求「同じ失敗を繰り返したくない」 と直接矛盾

---

## Consequences（結果：嬉しいこと/辛いこと/副作用）

### Positive（嬉しい）

- Maestro skip 解消 (少なくとも `home-bulk-sched-date` 1 件、PoC 結果次第で複数件)
- CI 緑化、リリース直前の手動検証コスト削減
- functional_spec.md 既存設計 (modal / formSheet / fullScreenModal) との整合性回復
- `@gorhom/bottom-sheet` 依存削除 (-1 dependency、bundle size 数 KB 減)
- Maestro 標準パターン化 → 今後の新規 flow も flaky リスク低減
- testID 厳格化 → E2E カバレッジ向上、accessibility 改善
- シニア UX (Apple Health 風) を維持

### Negative（辛い/副作用）

- Phase G 全体 7-11 PR、4-6 セッション (中規模)
- PoC 1 セッション分のコスト (短期的にはコストだけ、結果次第)
- `@gorhom` の柔軟な custom snap point 機能を喪失 → Native `sheetAllowedDetents` は detents 配列で表現
- iOS / Android の見え方差 (formSheet は iOS Sheet 風 / Android Modal) — 4 ペルソナ評価で許容済
- 既存 testID の網羅性チェック必要 (Phase G 着手前に既存 21 flow 全 testID 監査)

### Follow-ups（後でやる宿題）

- [ ] PoC G0 PR 実装 (X / Y / Z 3 ブランチ並列)
- [ ] PoC 結果記録 PR (`scripts/ui-diff/out/poc-g0/results.md` 新規)
- [ ] ADR-0024 を Proposed → Accepted に更新 (PoC 結果反映)
- [ ] Phase G1 (Species + Style picker)
- [ ] Phase G2 (Work picker + Log confirm)
- [ ] Phase G3a (Bulk work picker + Bulk log confirm)
- [ ] Phase G3b (Bulk schedule date)
- [ ] Phase G4 (Bonsai create modal + Heatmap formSheet)
- [ ] Phase G5 (`@gorhom/bottom-sheet` 依存削除 + skip-list update)
- [ ] R-30 (外部 lib テスト stability 変更時 PoC 必須化) を `.claude/recurrence-prevention.md` に追加
- [ ] `docs/how-to/maestro-standard-pattern.md` 新規作成 (本 ADR 同 PR)
- [ ] Maestro flow lint rule 起票 (waitForAnimationToEnd 不在検出、Phase G 完了後)
- [ ] testID ESLint rule 起票 (新規 screen 必須、Phase G 完了後)
- [ ] `functional_spec.md` の native presentation 記述明確化 (本 ADR 同 PR)
- [ ] ADR-0020 Notes Amended (BonsaiFilterSheet 廃止 → 10 箇所全廃に拡大、R-16 言及破棄反映) (本 ADR 同 PR)

---

## Acceptance / Tests（合否：テストに寄せる）

- **正（自動テスト）**:
  - Maestro: 全 21 flow + 新規 G0 PoC flow 3 件 + G1-G4 で更新される flow が CI 緑
  - Maestro: PoC で **5 回連続実行**して 5/5 (100% 厳格)、後の Phase G 各 PR でも 5 回連続緑 (flaky check)
  - Jest: 既存 18 component 単体テスト + Phase G で新規追加の screen の test
  - `pnpm verify` 9 ゲート全緑 (lint / type-check / format / test / i18n / config / docs / template / theme / a11y)
- **手動チェック (実機)**:
  - iOS / Android 両 OS で 10 箇所すべての遷移が動作
  - シニア UX (大文字 + 片手操作) 維持確認
  - back ボタン / スワイプダウン / 背景タップでの dismiss 動作
- **4 ペルソナ最終評価**: 全員 ○ 以上、✕ ゼロ (R-10 クリア)

| 評価軸                       | みどり 65 (シニア) | 茂 45 (150 株業務) | 高橋プロ 62  | Linda 22 (ライト) |
| ---------------------------- | ------------------ | ------------------ | ------------ | ----------------- |
| G0 PoC で確実性検証          | ◎                  | ◎                  | ◎            | ◎                 |
| 5/5 厳格基準                 | ◎                  | ◎                  | ◎            | ◎                 |
| ADR 先行原則                 | ◎ 透明性           | ◎ 再現性           | ◎ 記録       | ○ 安心            |
| formSheet + detents [0.5, 1] | ◎ 大字             | ◎ 片手             | ◎ 素早い     | ◎                 |
| Maestro 標準化 + lint        | ◎                  | ◎                  | ◎            | ○                 |
| Phase G 全体 4-6 セッション  | ○ 待てる           | △ 早く欲しい       | ◎ 確実性優先 | ○                 |
| plan B (Expo UI / Detox)     | ◎ バックアップ     | ◎                  | ◎            | ◎                 |
| skip 解消 AC                 | ◎                  | ◎                  | ◎            | ◎                 |

→ 全項目 ○ 以上、✕ ゼロ (R-10 クリア)

---

## Rollout / Rollback（出し方/戻し方）

- **リリース手順への影響**:
  - Phase G0 (PoC) → G1 → G2 → G3a → G3b → G4 → G5 (依存削除) の 7-11 PR、各 PR は最小スコープ + `pnpm verify` 9 ゲート緑 → squash merge → main 同期
  - 各 Phase 完了時に Maestro 全 flow 5 回連続実行 (flaky check)
  - Phase G 完了後に ADR-0024 を Accepted に確定
- **ロールバック方針**:
  - Phase 単位で revert 可能 (各 Phase の PR を revert)
  - 全面 revert は `@gorhom/bottom-sheet` v5.2.13 復元 + 各 component 旧実装復元
  - PoC 全 3 案不合格時は plan B (Expo UI BottomSheet) へ自動切替、本 ADR は plan B 採用版に更新
- **検知方法**:
  - Maestro skip-list.json の skip 件数が増えたら CI fail
  - PR 単位で `pnpm verify` 緑、各 Phase 完了時に 4 ペルソナ評価実施

---

## Links（関連リンク：正へ寄せる）

- constraints: `docs/reference/constraints.md` §1-4 (記録のみ哲学) / §5 (シニア UX)
- reference: `docs/reference/functional_spec.md` §6.2 (盆栽追加) / §7.2 (作業記録) / §9.3.4 (ヒートマップ詳細) / §22 (主要画面遷移)
- ADR (関連): ADR-0020 (Claude Design 全採用、Notes Amended 2026-05-12 で 10 箇所拡大) / ADR-0021 (ui-diff pipeline)
- Issue: #475 (本 ADR で詳細化、タイトル update)
- Maestro 一次情報:
  - mobile-dev-inc/Maestro Issue #1703 (animation flaky、"not planned" で close)
  - gorhom/react-native-bottom-sheet Issue #1753 (v4.6.0 Maestro バグ、v5 で解消未確認)
  - Maestro 公式 docs: <https://docs.maestro.dev/api-reference/commands/waitforanimationtoend>
- Expo 一次情報:
  - Expo Router Modal docs: <https://docs.expo.dev/router/advanced/modals/>
  - Expo UI BottomSheet docs: <https://docs.expo.dev/versions/v56.0.0/sdk/ui/drop-in-replacements/bottomsheet/>
  - Jyuuroku Blog (Expo v54 formSheet 空問題 + contentStyle 回避): <https://www.jyuuroku.com/en/blog/expo-formSheet-empty>
- React Navigation 8.0:
  - Passing parameters: <https://reactnavigation.org/docs/params/>
  - pushParams API + ParamList 型推論

---

## Notes（メモ：任意）

### Phase G0 PoC 実装ブランチ構成 (本 ADR 同 PR 後)

| ブランチ                                 | 実装                                                                                          | Maestro flow                                |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `feat/g0-poc-species-picker-X-push`      | 完全画面 push (`app/bonsai/species-picker.tsx` Stack 通常 push)                               | `maestro/flows/poc/g0-species-picker-X.yml` |
| `feat/g0-poc-species-picker-Y-modal`     | `presentation: 'modal'` (`(modals)/species-picker.tsx`)                                       | `maestro/flows/poc/g0-species-picker-Y.yml` |
| `feat/g0-poc-species-picker-Z-formsheet` | `presentation: 'formSheet'` + `sheetAllowedDetents:[0.5, 1]` + `contentStyle:{height:'100%'}` | `maestro/flows/poc/g0-species-picker-Z.yml` |

### Maestro 標準パターン (本 ADR で確定、`docs/how-to/maestro-standard-pattern.md` に詳細)

```yaml
# 全 tap step に retryTapIfNoChange: true
- tapOn:
    id: 'e2e_<screen>_<element>'
    retryTapIfNoChange: true

# 全 tap 後に waitForAnimationToEnd
- waitForAnimationToEnd:
    timeout: 5000

# 必要なら assertVisible で animation 終了確認
- assertVisible:
    id: 'e2e_<screen>_<element>'
```

### testID 命名規約 (既存規約踏襲、本 ADR で再確認)

- `e2e_<screen>_<element>` スネークケース
- 例: `e2e_species_picker_screen`, `e2e_species_option_kuromatsu`
- 新規 screen に testID + accessibilityLabel 両方必須

### PoC 結果記録テンプレ (`scripts/ui-diff/out/poc-g0/results.md`)

| 実装          | 5 回成功率 | 平均所要時間 | ghost tap 回数 | 採否 |
| ------------- | ---------- | ------------ | -------------- | ---- |
| X (push)      | ?/5        | ?ms          | ?              | ?    |
| Y (modal)     | ?/5        | ?ms          | ?              | ?    |
| Z (formSheet) | ?/5        | ?ms          | ?              | ?    |

→ 5/5 達成のうち最速案を採用、全不合格なら plan B (Expo UI BottomSheet)

### R-30 新規追加内容 (`.claude/recurrence-prevention.md`)

```markdown
### R-30. 外部 lib のテスト stability 変更時 PoC 必須化

- **ルール**: 外部ライブラリ (Maestro / Detox / @gorhom 等 testing 関連) の変更・置換・削除を伴う移行は、本実装前に PoC で 5/5 = 100% 厳格基準で実証する。PoC 不合格時は plan B / plan C を ADR で先確定。
- **根拠**: 2026-05-12 セッションで Phase G (@gorhom 全廃) 設計時、過去 PR #404/#415 で `waitForAnimationToEnd` 追加実装も `home-bulk-sched-date` の Maestro skip が解消せず永続化した経緯あり。実証なしに移行すると同じ失敗を繰り返すリスクが高い。
- **自動化**: 本 ADR Phase G 完了後に lint rule 起票 (PR タイトルに `@gorhom`/`detox`/`maestro` 等 + `remove`/`replace` を含む場合、ADR 先行原則 + PoC 5/5 結果リンクを必須化)。
```
