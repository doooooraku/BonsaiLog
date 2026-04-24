<!--
PR Template
目的：レビュー漏れ（テスト漏れ／docs更新漏れ／リスク記載漏れ／ロールバック不明）を減らす。
原則：本文は短く、理由はADR、合否はテストへ。
-->

# 概要（1〜3行 / REQUIRED）

<!-- 例：設定画面で言語 nl（オランダ語）時に表示が崩れる不具合を修正 -->

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

## 1. 関連リンク（REQUIRED）

- Issue: #
- ADR: docs/adr/ADR-XXXX.md（該当があれば）
- 参照（1つ以上推奨）:
  - constraints: docs/reference/constraints.md
  - basic_spec: docs/reference/basic_spec.md
  - functional_spec: docs/reference/functional_spec.md
  - workflow: docs/how-to/workflow/whole_workflow.md
  - figma: （URL）
  - spec/notes: （該当docsやIssueコメントURL）

---

## 2. 目的（Why / REQUIRED）

<!-- 「何を解決する？」「なぜ今？」を1〜5行で。長い議論はADRへ -->

- ユーザー価値:
- バグの再現条件（バグなら）:

---

## 3. 変更点（What / REQUIRED）

<!-- レビュアーが差分を追いやすい単位で箇条書き -->

-
- ***

## 4. 受け入れ条件（Acceptance Criteria / RECOMMENDED）

<!-- “合格/不合格が判定できる条件” を短く。理想はテスト（Jest/Maestro）で表現する -->

- [ ] 条件1：
- [ ] 条件2：

---

## 5. 影響範囲（Impact / REQUIRED）

### 5-1. 影響する箇所

- 画面（UI）: S-xx / （画面名）
- 機能: F-xx / UC-xx
- 影響する層:
  - [ ] Free
  - [ ] Pro
  - [ ] 両方

### 5-2. データ/互換性

- 既存データへの影響:
  - [ ] なし
  - [ ] あり（内容：　　　　　　　　　）
- 移行（migration）が必要:
  - [ ] なし
  - [ ] あり（手順/ロールバック：　　　　　　　　　）

### 5-3. i18n / 端末差分

- 言語/i18n 影響:
  - [ ] なし
  - [ ] あり（対象言語：　　　　　　）
- 端末/OS差分の懸念:
  - [ ] なし
  - [ ] あり（内容：　　　　　　　　　）

---

## 6. 動作確認（How to test / REQUIRED）

> “合否はテストへ” の中心。ここが薄いPRは基本レビューで止める。

### 6-1. 自動テスト（該当を残す / RECOMMENDED）

- [ ] pnpm test（結果：✅ / ❌）
- [ ] pnpm lint（結果：✅ / ❌）
- [ ] pnpm test:e2e（結果：✅ / ❌）※導入済みなら
- [ ] pnpm type-check（結果：✅ / ❌）※scriptsにある場合
- CI（GitHub Actions）:
  - [ ] 全部 ✅
  - [ ] 一部 ❌（理由：　　　　　　　　　）

> 実行できない場合は「なぜできないか」を書く（例：一時的にCI修理中／再現が端末依存 等）

### 6-2. 手動確認（手順を箇条書き / REQUIRED）

<!-- “誰でも同じ手順で再現できる” 書き方 -->

1.
2.
3.

- 期待結果:
- 実際結果:

### 6-3. 再現手順（バグ修正なら / RECOMMENDED）

- Before（修正前の再現）:
- After（修正後に再現しない）:

---

## 7. UI差分（UI変更がある場合 / REQUIRED if UI）

- Before: （スクショ/動画/リンク）
- After : （スクショ/動画/リンク）
- Figma: （URL、該当フレーム）

---

## 8. Docs影響（docs-as-code / REQUIRED）

> 仕様書を死なせないための “分岐チェック”。

- [ ] 仕様/前提/制約が変わる → docs/reference/constraints.md を更新（リンク：）
- [ ] 用語が増える/意味が変わる → docs/reference/glossary.md を更新（リンク：）
- [ ] 運用手順が変わる → docs/how-to/whole_workflow.md を更新（リンク：）
- [ ] リリース手順に影響 → docs/how-to/android*ビルド手順.md / docs/how-to/ios*ビルド手順.md を更新（リンク：）
- [ ] 意思決定が増えた/変わった → docs/adr/ADR-XXXX.md を追加 or 更新（リンク：）
- [ ] テスト観点が変わる → テスト（Jest/Maestro）を追加/更新（リンク or 該当ファイル：）
- [ ] どれも不要（理由：外部仕様/運用/テスト観点に影響なし、内部リファクタのみ）

---

## 9. リスク評価 & ロールバック（REQUIRED）

### 9-1. リスク（短く）

- 想定リスク:
- 検知方法（どうやって気づく？）:
- 影響の大きさ:
  - [ ] 低（困るが致命傷ではない）
  - [ ] 中（ユーザーの一部が詰まる）
  - [ ] 高（課金/データ消失/起動不可など）

### 9-2. ロールバック（戻し方 / REQUIRED）

- 戻し方（最短手順）:
  - 例：このPRを revert / 前のタグへ戻す / 機能フラグOFF など
- 影響範囲の切り分け（できれば）:
  - 例：Freeのみ / 特定OSのみ / 特定画面のみ

---

## 10. セキュリティ / 課金 / 広告（該当時のみ / REQUIRED if 該当）

- [ ] Secrets/キーを直書きしていない（APIキー/広告ユニットID/RevenueCat等）
- [ ] 個人情報をログ出力していない
- [ ] 通信はHTTPS前提で問題ない
- [ ] 課金（RevenueCat）の影響がある → 購入/復元/解約導線の確認手順を「6」に追記した
- [ ] 広告（AdMob）の影響がある → Freeのみ表示 / Proはゼロ を確認する手順を「6」に追記した
- [ ] 外部GitHub Actionsの追加/更新がある → 第三者Actionは commit SHA pin した

---

## 11. リリース影響（release/hotfix だけ / RECOMMENDED）

- ストア提出が必要:
  - [ ] なし
  - [ ] あり（iOS / Android）
- 段階配信を推奨:
  - [ ] なし
  - [ ] あり（理由：　　　　　　　　　）
- 監視ポイント（24〜48h）:
  - クラッシュ:
  - レビュー:
  - 課金:
  - 広告:

---

## 12. PRサイズ（RECOMMENDED）

- 変更行数の感覚:
  - [ ] 小（〜200行）
  - [ ] 中（〜500行）
  - [ ] 大（500行超）→ 分割を検討（理由：　　　　　　　　　）

---

## 13. チェックリスト（DoD / REQUIRED）

- [ ] 変更目的が1文で説明できる
- [ ] 影響範囲（UI/機能/データ/Free/Pro）を書いた
- [ ] “合否が判定できる” 動作確認を記載した（自動/手動）
- [ ] CIが通った（または通せない理由を明記）
- [ ] docs影響を判定し、必要なら更新した（links記載）
- [ ] リスクとロールバックを書いた

---

## 14. W-10.5 レビュー（Claude Code が記入）

<!-- Codex が PR を作成後、Claude Code が /review-pr Skill で記入する -->

- [ ] **AC 充足確認**: Issue の Acceptance Criteria が全て ✅ になっている
- [ ] **constraints / ADR 準拠**: docs/reference/constraints.md と関連 ADR に違反していない
- [ ] **影響範囲の乖離チェック**: W-05 で予想した影響範囲と実際の変更が一致している
- [ ] **デグレリスク**: 既存テストが壊れていない、カバレッジが下がっていない
- [ ] **コード品質**: 既存の vertical slice パターンに従っている、不要な抽象化がない
- [ ] **ドキュメント更新**: lessons.md / ADR / functional_spec が必要に応じて更新されている

**レビュー判定**: [ ] Approve / [ ] Request Changes / [ ] Discuss

**理由（2〜3 文）**:

**マージ方法**: [ ] `auto-merge` ラベル付きで自動 / [ ] 人間承認待ち

<!--
補足：
- 詳しい議論メモは本文に溜めない。必要なら ADR を作り、ここにはリンクだけ残す。
- Claude Code は /review-pr Skill でこのセクションを記入する。
-->
