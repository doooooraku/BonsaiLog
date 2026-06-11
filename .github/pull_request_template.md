<!--
PR Template (core)
目的：レビュー漏れ（テスト漏れ／docs更新漏れ／リスク記載漏れ／ロールバック不明）を減らす。
原則：本文は短く、理由はADR、合否はテストへ。
条件付きチェック（UI / mockup / Maestro / navigation / route 変更 / export / 課金広告 / release）は
docs/how-to/workflow/pr-template-appendix.md — 該当する PR では該当節を本文へコピーして記入する。
§番号は旧テンプレ互換で維持（§6.4 / §7.x / §10 / §11 は付録側、§12 は廃止）。
2026-06-11 Doc-Truth Audit P4 でコア再構成（直近 PR の実運用に合わせ REQUIRED 中心へ圧縮）。
-->

# 概要（1〜3行 / REQUIRED）

---

## 0. 種別（REQUIRED）

- [ ] fix（バグ修正）
- [ ] feat（機能追加）
- [ ] refactor（仕様非変更の整理）
- [ ] perf（性能改善）
- [ ] test（テスト追加/修正）
- [ ] docs（ドキュメント）
- [ ] chore（雑務：依存更新など）
- [ ] release（リリース準備）
- [ ] hotfix（緊急修正）

---

## 0.5. 開発前提チェック（REQUIRED）

> Sess81 振り返り由来。PR push 前に全 ✓（CI fail 3 回事故の構造防止）。

- [ ] `node --version` が `.nvmrc` と一致（`pnpm verify:node`）
- [ ] **`pnpm verify` 全部 green**（部分実行ではなく全 chain）
- [ ] base が main から rebase / merge 済（behind 5+ commit なら main merge 推奨）
- [ ] pre-commit hook 配線済（`pnpm verify:hooks`）

---

## 1. 関連リンク（REQUIRED）

- Issue: #
- ADR: docs/adr/ADR-XXXX.md（該当があれば）
- 参照 doc: （constraints / functional_spec / 該当 how-to 等、1 つ以上推奨）

---

## 2. 目的（Why / REQUIRED）

<!-- 「何を解決する？」「なぜ今？」を1〜5行で。長い議論はADRへ -->

---

## 2.5. やさしい説明（Plain Summary / REQUIRED — Sess101 #1173）

<!-- 専門用語を使わず、「何を」「なぜ」直した/作ったかを 2〜4 文で。
     読者想定 = 開発に関わっていない人（オーナー / テスター / 将来の自分）。
     チャットの完了報告は流れて消えるため、PR 本文が恒久保存先（user 決定 2026-06-11 = 両方に残す）。 -->

---

## 3. 変更点（What / REQUIRED）

-

## 3.5. 副次発見（REQUIRED、Issue #1025 由来）

- [ ] 作業中に見つけた**スコープ外の別問題**を列挙した（なければ「なし」）:
  - なし
- [ ] 各問題の処置を明記した（本 PR に含めた / Issue #N 起票 / 起票不要の理由）

---

## 4. 受け入れ条件（Acceptance Criteria / RECOMMENDED）

- [ ] 条件1：

---

## 5. 影響範囲（Impact / REQUIRED）

- 画面 / 機能: （S-xx / F-xx、なければ「コード外」）
- 影響する層: [ ] Free / [ ] Pro / [ ] 両方 / [ ] なし
- 既存データへの影響・migration: [ ] なし / [ ] あり（内容と手順・ロールバック：）
- i18n 影響: [ ] なし / [ ] あり（対象言語：）

---

## 6. 動作確認（How to test / REQUIRED）

> 各層の要否は `docs/how-to/workflow/whole_workflow.md` §1.5 検証 tiering 表（T1〜T8）が正。
> 省略する層は該当欄に理由を記載（宣言なしの省略は禁止）。

### 6-1. 自動テスト

- [ ] `pnpm verify`（結果：✅ / ❌）+ CI 全 ✅
- [ ] E2E (Maestro): [ ] 実行（結果：） / [ ] 省略（tiering 表 T\_\_ 該当、理由：）
- 実行できない場合の理由：

### 6-2. 手動確認（バグ修正は Before / After の再現手順を含める）

1.

- 期待結果:
- 実際結果:

### 6-3. 実機確認（UI / 動線 / DB に触れる PR は REQUIRED — Sess99 恒久策）

> `/device-verify` (= 前提チェック → reload/build 判定 → SS 撮影 → Read 目視) で実施。
> **「verify 緑」だけの完了報告は禁止** — どちらかに必ずチェック:

- [ ] 実機確認 **済**（SS リンク / 添付：）
- [ ] **vc\_\_ smoke test に委譲**（理由 + 対象ビルド：）
- [ ] 適用対象外（docs / script / CI のみで画面・動線・DB に触れない）

---

## 7. 条件付きチェック（該当時 REQUIRED — 付録を本文へコピーして記入）

> 付録: `docs/how-to/workflow/pr-template-appendix.md`（§番号は旧テンプレと同一）

- [ ] UI 変更あり → 付録 §7（Before/After SS）
- [ ] mockup 整合 / TabBar icon / BottomCtaBar → 付録 §7.5
- [ ] ui-diff 達成判定 / navigation 変更 / テスター報告起点 → 付録 §7.6
- [ ] Maestro flow 変更 → 付録 §7.7
- [ ] route / path / testID / Phase 変更 → 付録 §7.8（全網羅 grep）
- [ ] CSV / PDF export 出力内容の変更 → 付録 §6.4
- [ ] secrets / 課金 / 広告 影響 → 付録 §10
- [ ] release / hotfix → 付録 §11
- [ ] **どれにも該当しない**

---

## 8. Docs 影響（docs-as-code / REQUIRED）

- [ ] **doc-routing**: `docs/reference/doc-routing.md` の該当行を確認し、影響 doc を更新した（リンク：）or 更新不要（理由：）
- [ ] 仕様/前提/制約が変わる → docs/reference/constraints.md を更新（リンク：）
- [ ] 運用手順が変わる → 該当 how-to を更新（リンク：）
- [ ] 意思決定が増えた/変わった → ADR を追加 or 更新（リンク：）
- [ ] テスト観点が変わる → テスト（Jest/Maestro）を追加/更新（リンク：）
- [ ] どれも不要（理由：）

### 8.5. ADR 追加 / 改訂時の整合確認（REQUIRED if ADR 変更、Issue #1078-T4 由来）

- [ ] functional_spec / basic_spec の関連セクションを grep し、矛盾を同 PR で修正 or Issue 起票（該当：）
- [ ] open Issue を grep（`gh issue list --search`）し、前提が変わる Issue を更新 or クローズ（該当：）
- [ ] 旧 ADR を上書きする場合、旧 ADR に Notes Amended / Superseded を追記
- [ ] 適用対象外: 本 PR は ADR 変更を含まない

---

## 9. リスク & ロールバック（REQUIRED）

- 想定リスクと検知方法:
- 影響の大きさ: [ ] 低 / [ ] 中 / [ ] 高（課金/データ消失/起動不可など）
- 戻し方（最短手順）: （例: 本 PR を revert / 機能フラグ OFF）

---

## 13. チェックリスト（DoD / REQUIRED）

- [ ] 変更目的が1文で説明できる
- [ ] 影響範囲（UI/機能/データ/Free/Pro）を書いた
- [ ] “合否が判定できる” 動作確認を記載した（自動/手動）
- [ ] CIが通った（または通せない理由を明記）
- [ ] docs影響を判定し、必要なら更新した（§8、doc-routing 行を含む）
- [ ] リスクとロールバックを書いた

---

## 14. W-10.5 レビュー（Claude Code が /review-pr Skill で記入、ADR-0047 Output Contract）

- [ ] **AC 充足確認**: Issue の Acceptance Criteria が全て ✅ になっている
- [ ] **constraints / ADR 準拠**: docs/reference/constraints.md と関連 ADR に違反していない
- [ ] **影響範囲の乖離チェック**: W-05 で予想した影響範囲と実際の変更が一致している
- [ ] **デグレリスク**: 既存テストが壊れていない、カバレッジが下がっていない
- [ ] **コード品質**: 既存の vertical slice パターンに従っている、不要な抽象化がない
- [ ] **ドキュメント更新**: lessons / ADR / functional_spec が必要に応じて更新されている

### 指摘表（Findings）

| ID       | 深刻度                   | 種別                                 | 場所      | 内容 |
| -------- | ------------------------ | ------------------------------------ | --------- | ---- |
| FIND-001 | critical/high/medium/low | bug/constraints/quality/structure-UI | file:line |      |

**レビュー判定**: [ ] APPROVE / [ ] REQUEST_CHANGES

> ゲート規則（ADR-0047）: 種別 `bug`/`constraints` の `critical`/`high` が 1 件でもあれば REQUEST_CHANGES。
> 種別 `structure-UI` は機械ゲート対象外 → R-25 の Claude Read 構造系 5 項目評価（付録 §7.6）に回す。
> ゲートは「マージ阻止の下限」であって承認根拠ではない。

**マージ方法**（W-11 が正 — Sess101 #1173 実態化）: [ ] CI 全 pass を確認後に `gh pr merge --squash`（計画承認 = 実行承認のため人間の追加承認は不要） / [ ] 人間の明示承認待ち（計画外の変更を含む場合のみ）
