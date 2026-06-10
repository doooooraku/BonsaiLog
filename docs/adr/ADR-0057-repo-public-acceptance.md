# ADR-0057: リポジトリ PUBLIC + GitHub Pages docs/ 全体公開を意図的に容認する

- Status: Accepted
- Date: 2026-06-10
- Deciders: @doooooraku
- Related: Doc-Truth Audit 2026-06 P0 (docs/audit/doc-truth-audit-2026-06/state.md) / ADR-0017 §④ (Privacy URL / Terms URL)

---

## Context（背景：いま何に困っている？）

- 現状：Doc-Truth Audit 2026-06 P0 のヘルスチェックで以下を実測確認した。
  - リポジトリ `doooooraku/BonsaiLog` は **PUBLIC** (`gh repo view` で確認)
  - GitHub Pages が **`main:/docs` 全体**を配信 (戦略 reports / ADR 全件 / lessons / 監査記録が HTTP 200 で誰でも閲覧可能)
- 困りごと：プロダクト戦略文書・課金設計 ADR・監査記録まで公開されており、「意図的なオープン運用」なのか「設定事故」なのかが明文化されていなかった。
- 制約/前提：
  - `app.config.ts` (LEGAL_PRIVACY_URL / LEGAL_TERMS_URL) と `fastlane/metadata/*/privacy_url.txt` が Pages URL (`https://doooooraku.github.io/BonsaiLog/privacy/` 等) に依存 → **Pages の単純停止はストア審査要件とアプリ内リンクを壊す**
  - GitHub Actions 無料枠：public repo = 無制限 / private repo = 2,000 分/月 (Android cloud build は 1 回約 33 分)

---

## Decision（決めたこと：結論）

- 決定：**リポジトリは PUBLIC のまま、Pages の docs/ 全体配信も現状維持とし、これを意図的な容認 (accepted risk) とする。**
- 適用範囲：BonsaiLog リポジトリ全体 (コード / docs / .claude / 監査記録)。

---

## Decision Drivers（判断の軸：何を大事にした？）

- Driver 1: **費用** — private 化すると GitHub Actions 無料枠が 2,000 分/月に制限され、cloud build (33 分/回) 運用が成立しない。追加課金ゼロ方針 (ADR-0047) と整合。
- Driver 2: **ストア審査の継続性** — privacy/terms の公開 URL は審査必須。現 URL を壊さないことを最優先。
- Driver 3: **実害の小ささ** — 秘匿必須情報 (API キー / PII) は preflight・hooks で repo 不混入を担保済み。戦略文書の公開は個人開発アプリとして競争上の実害が限定的。

---

## Alternatives considered（他の案と却下理由）

### Option A: private 化 + 公開 site 分離 (第一希望だった案)

- 概要：repo を private 化し、privacy/terms/support だけ別の小さな public repo で配信。
- 良い点：戦略文書・監査記録の露出を止められる。
- 悪い点：Actions 無料枠 2,000 分/月に制限 (cloud build 約 60 回/月相当が不可)。URL 変更でストア設定 + アプリ内リンク更新が必要。過去に public だった履歴は完全には消えない。
- 却下理由：**費用制約** (user 判断 2026-06-10、「金が無いので public のまま意図的容認として進めて」)。

### Option B: Pages 配信元のみ限定 (docs/public/ 等へ)

- 概要：repo は public のまま、Pages の配信範囲だけ狭める。
- 悪い点：repo 自体が public なので GitHub 上で全 docs が見える事実は変わらず、露出低減効果が無い。
- 却下理由：効果がない割に URL 移行コストが発生する。

---

## Consequences（結果：嬉しいこと/辛いこと/副作用）

### Positive（嬉しい）

- Actions 無制限 + Pages 無料配信の現運用を維持できる。
- privacy/terms URL・アプリ内リンク・ストア設定の変更が不要。

### Negative（辛い/副作用）

- 戦略 reports・ADR・lessons・監査記録 (Doc-Truth Audit 台帳含む) が恒久的に公開される。
- 以後 docs/ に書くものはすべて「公開される」前提で書く必要がある。

### Follow-ups（後でやる宿題）

- [ ] 監査・開発中に「秘匿すべき情報が docs/ にある」発見をした場合は public 前提で重大度を上げて報告する (Doc-Truth Audit 運用ルールに記載済)
- [ ] 収益が立って GitHub 課金が許容できるようになったら Option A を再評価する

---

## Acceptance / Tests（合否：テストに寄せる）

- 正（自動テスト）：なし (リポジトリ設定の意思決定であり、コード挙動なし)
- 手動チェック（必要なら最小限）：
  - 手順：`gh api repos/doooooraku/BonsaiLog/pages` と `gh repo view --json visibility`
  - 期待結果：Pages = main:/docs 配信、visibility = PUBLIC (本 ADR の前提が変わったら本 ADR を見直す)

---

## Rollout / Rollback（出し方/戻し方）

- リリース手順への影響：なし (現状維持の明文化)。
- ロールバック方針：Option A (private 化 + site 分離) へ移行する場合は、①公開 site repo 作成 → ②ストア privacy URL 更新 → ③アプリ内リンク更新 (要リリース) → ④private 化、の順で URL を壊さず移行する。
- 検知方法：ストア審査で privacy URL 到達不能が指摘されたら即この ADR の前提を確認。

---

## Links（関連リンク：正へ寄せる）

- constraints: `docs/reference/constraints.md`
- 監査台帳: `docs/audit/doc-truth-audit-2026-06/state.md` (P0 ヘルスチェック実測値 + 承認記録)
- ADR-0017 §④ (Privacy URL / Terms URL を GitHub Pages で公開する決定)
- ADR-0047 (追加課金ゼロ方針)
- Pages 実 URL: <https://doooooraku.github.io/BonsaiLog/>

---

## Notes（メモ：任意）

- 本決定は Doc-Truth Audit 2026-06 P0 セッション (2026-06-10) の user 判断を明文化したもの。CLAUDE.md §3「受容する場合は ADR で明文化する」に基づく。
