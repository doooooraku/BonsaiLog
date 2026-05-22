# Sess28 Retro — Hero 縮小 + バッジ統一 + KAV 共通 hook + 履歴 mockup 整合 (8 PR)

- 日付: 2026-05-22
- 関連 ADR: ADR-0037 (新規) + ADR-0020 Notes Amended (Hero 規定変更)
- 関連 R: R-46 (KAV 共通 hook 必須、 新規)
- 関連 PR: #755 (ADR/token/R-46) / #756 (hook + BonsaiCreate) / #757 (hook 水平展開) / #758 (Hero 縮小) / #759 (バッジ 4 箇所統一) / #760 (SEED_PACK 拡充) / #761 (履歴 timeline) / 本 PR (Maestro + retro)

---

## 学び ① — 「他の入力欄も統一して」 = R-46 構造化トリガー

**事実**: user 報告 #1「Home FAB → 編集 → メモ欄キーボード被り」 への対応議論で、 user が「**他の文字列入力欄の挙動を統一して、 コード的にも見やすく分かりやすくできないモノなの?**」 と発言。 これが議論で提案していた「`useKeyboardAvoidingProps()` 共通 hook 化」 と完全一致、 R-46 起票の即時トリガーになった。

**Why 重要か**:

- 単純な bug fix (BonsaiCreateScreen のみ修正) で終わらず、 **構造的な再発防止 (R-46 + Lint 自動化候補)** に発展できた
- user 視点で「重複した修正履歴」 を察知する能力が、 Claude の「3 件再発で昇華」 ルール (CLAUDE.md §9) を補完
- 過去 Sess15 PR-TT で「Android `behavior=undefined`」 を「adjustResize に任せる」 と仮定したまま放置していた 構造欠陥が、 user 真意トリガーで顕在化

**反省**:

- Sess15 PR-TT 当時の決定を ADR で残さなかった (BonsaiCreateScreen.tsx comment 1 行のみ)
- 同じ pattern が WorkLogConfirmScreen / BulkLogConfirmScreen に拡散 (KAV 無し) して**潜在的に同じ bug を抱えていた**

**Future Work 候補**:

- ESLint custom rule で `behavior={Platform.OS === 'ios' ? ... : undefined}` を error 化 (`eslint.config.js` PR 別途)
- `scripts/check-keyboard-avoiding.mjs` で `KeyboardAvoidingView` 直接利用 (test 除く) を grep 検出、 `pnpm lint:kav` 必達

---

## 学び ② — mockup 整合性は「退行」 ではなく「未達」 として扱う

**事実**: user 報告 #2 は当初「前のほうがよかった」 と誤表現されたが、 議論で**「mockup `bonsai-detail-history-01.png` への整合性レベル 2 達成失敗 = 未達」** と判明。 row layout 自体は変わっていなかったが、 (1) note + chip 表示 (data 不足)、 (2) 連続日展開時の縦線 + ○ marker (UI 未実装) の 2 領域が未達だった。

**Why 区別が重要か**:

- 「退行」 と勘違いすると revert を試みて全体が混乱、 mockup の意図と乖離
- 「未達」 と認識すれば mockup スクショ + 公式 wireframe (\02-Home.html\) を SoT として、 段階的に整合性を上げられる
- 「mockup vs ADR」 の SoT 判定 (R-16 → 破棄後の F 案運用、 2026-05-12) で「ADR を正、 mockup は下書き」 と決めたが、 **未達 = mockup 規定に向けた段階達成**は別軸の整合タスク

**対策 (本セッション)**:

- PR-6 で SEED_PACK 拡充 (note + payload chips 表示用 data 整備)
- PR-7 で UI 実装追加 (連続日 timeline 化)
- PR-X (Sess29 以降) で event 単位 photo schema 拡張 (mockup の盆栽サムネ写真整合、 別 ADR 起票候補)

**Future Work 候補**:

- mockup 整合性 (レベル 1 〜 3) の自動計測 script を再整備 (Sess5 PR-3 で `screen-integration-loop.md` 整備、 Sess28 で多くの mockup 未整合領域が露呈)
- R-25 強化: mockup スクショと実機 SS の構造系 4 項目 (タブ構成 / セクション構成 / UI 種別 / スクロール範囲) を自動 diff 化

---

## 学び ③ — pre-existing test fail は PR-1 で hot-fix することで連鎖を断つ

**事実**: PR-1 で `pnpm verify` 実行時、 main で**既に 62 lint errors + 2 test failures**が pre-existing だった (Sess26 PR-η-3 で追加された test files の `describe`/`test`/`expect` no-undef + Sess27 PR-7 で showUndoToast 撤回後の test expectation 古い)。 PR-1 内で hot-fix を同梱、 全 PR を緑状態で merge 続行できた。

**Why 同梱が正解だったか**:

- pre-existing fail を放置すると PR-2 以降すべての `pnpm verify` が fail → CI / pre-commit hook で blocking
- 別 PR 起票で hot-fix → main rebase の手順は scope 拡張だが時間効率最良
- user 方針「auto 進行 OK」 + R-9 「既存スクリプト先読み」 で hot-fix 範囲は最小 (eslint.config.js に 1 block + test file 2 行修正)

**反省**:

- Sess26 PR-η-3 で test files の lint env 設定確認漏れ
- Sess27 PR-7 で showUndoToast 撤回時に test expectation 更新漏れ
- いずれも「local verify が main で fail していた」 を**誰も気づかずに 1 セッション以上放置**

**Future Work 候補**:

- main 保護: `pnpm verify` を pre-push hook に追加し、 fail 時 push block (現状 pre-commit のみ)
- 各 PR で `pnpm verify` の exit code を必ず PR body に記載 (template 追加候補)

---

## 学び ④ — Phase 1 (P0) + Phase 2 (P1) の段階分割が user 信頼に直結

**事実**: 議論段階で user に 3 つの選択肢 (案 ⅰ 全 8 PR / 案 ⅱ Phase 分割 / 案 ⅲ event photo まで) を提示し、 user は **案 ⅱ「P0 → P1 連続」** を選択。 結果として P0 PR-1〜PR-5 完遂後そのまま P1 PR-6〜PR-8 を実行できた。

**Why 段階分割が有効だったか**:

- Critical bug (項目 1) + user 明示要求 (項目 3/4) を**先に解消**して即時価値を提供
- 履歴 mockup 整合 (項目 2) は デザイン考慮が深いので**集中して別 PR group** で扱う
- event photo 機能 (mockup スクショの盆栽サムネ) は schema 変更 + 大規模 → **別セッション** に隔離

**Future Work 候補**:

- セッション開始時の議論で「P0/P1/P2 + Future Work」 分類を必須項目化 (議論 template 追加)
- Engram session summary に「未着手の P1/P2 残量」 を明示記録

---

## 関連

- ADR-0037 §Decision (D1-D3 統合根拠)
- ADR-0020 §Notes Amended 2026-05-22 (Hero 280→180)
- `.claude/recurrence-prevention/specialized.md` R-46
- `src/core/hooks/useKeyboardAvoidingProps.ts` (本 retro が示す R-46 構造化の本体)
- mockup `docs/mockups/v1.0/screenshots/bonsai-detail-history-01.png` (本 retro 学び ② 由来 SoT)
