# P-15: Doc-Truth Audit の標準実行 (doc と実態の全突き合わせ監査)

- **渡す先**: Claude Code (BonsaiLog の再監査 / 次 app の初回監査どちらでも)
- **タイミング**: ①30 日棚卸 (`pnpm metrics:doc-freshness`) の flagged が 10 件超 ②doc 資産が 100 件を超えた新 app ③「docs が信用できない」と感じた時
- **目的**: BonsaiLog で 420 件 × 2 日で完走した監査手順 (P0 台帳 → P1 バッチ判定 → P2 ログ採掘) を再調査ゼロで再実行する
- **背景**: 2026-06 監査の実績焼き込み。実例は同 repo `docs/archive/doc-truth-audit-2026-06/state.md` (台帳の現物)、総括は `docs/reference/tasks/lessons/retro.md` の [2026-06-10] / [2026-06-11] エントリ
- **運用実績 2〜3 周で `/doc-audit` Skill 化を判断** (それまでは本プロンプト運用 — P4 user 決定 2026-06-11)

---

## 指示 (ここから下をそのまま Claude Code に渡す)

ドキュメントと実態 (コード・設定・ストア) の全突き合わせ監査を実行してください。
BonsaiLog Doc-Truth Audit 2026-06 で確立済みの手順の再実行です。新規の設計議論は不要。

### 監査原則 (全 Phase 共通、変更禁止)

1. **コードが唯一の正** — doc と code が食い違ったら code に合わせて doc を直す (逆は ADR 起票時のみ)
2. **検出と修正の分離** — 判定バッチは読み取り専用。修正は user 承認後の修正スプリントで別 PR
3. **不確実は ⚪ (判定保留)** — 推測で ✅ を付けない。検査の限界 (「path 実在のみ機械判定、意味は未深読み」等) を台帳に正直に明記
4. **網羅を謳う成果物には網羅の検算** — 列挙 script は「全数 − 除外 = 採用」の検算行を必ず出力。完走宣言は「未処理 0」の機械検算とセット
5. **歴史文書 (ADR / sess 系 lessons) は浅判定** — Status 行の機械確認のみ。当時の記述は腐敗と扱わない
6. **修正のたび gate へ昇華を検討** — 同型 2 回目で機械化検討、gate は 3 段階実走証明 (PASS → 改変 exit 1 → 復元 exit 0) 必須 (P-14 共通原則)

### P0: 台帳構築

1. 対象の全列挙 (docs/ + .claude/ + ルート設定 + ストア提出物 + memory)。**拡張子 filter に注意** — BonsaiLog では .md/.html filter で store の \*.txt 76 件が漏れた前例 (検算行で防ぐ)
2. 台帳 `docs/audit/<監査名>/state.md` に 1 行 1 doc で記録: No / path / SoT 区分 / サイズ / 判定 / 要約 / 処理日
3. SoT 区分: C=code-derived / D=decision (歴史文書) / P=process (手順書) / E=external (ストア・SaaS が正) / G=governance / M=memory
4. 判定凡例: `-` 未処理 / ✅ 一致 / ❌ 乖離 (修正案あり) / 🟡 軽微・不急 / 🔴 要対応 / ⚪ 保留 / 🔵 user 手動確認
5. 基準 commit を台帳ヘッダに記録 (完走後の差分監査の起点になる)

### P1: バッチ判定

1. 1 バッチ = 同種 doc 10〜40 件。**機械検査 → flagged のみ手動切り分け** の 2 段方式 (例: 記載 path/script の実在を script 一括検査 → hit だけ精読)
2. load-bearing doc (constraints / 中核 spec) のみ全文精読。大型 file は標本検査と明記
3. バッチごとに台帳 PR を 1 本 merge (中断・並行に強くする)
4. 発見は「候補 A/B/C…」と名付けて **判断材料 + 推薦付きで user に提示** → 承認分のみ修正スプリント
5. 層間マトリクス: 同一事実 (件数・path・番号範囲) が複数 doc にある場合は全層を突き合わせ、**正本 1 箇所 + 他は参照** へ寄せる (drift の根本対策)

### P2: セッションログ・記憶層の採掘

1. transcript は生ログを context に読み込まず **script 採掘** (redaction 既定、手法限界を明記)。採掘 regex は小サンプルで校正してから本走
2. memory → docs 昇格は「.bak 保全 + 元を参照 1 行化」セット (二重管理防止)
3. 「合意したのに作られていない成果物」を git log --diff-filter=A で切り分け (約束倒れ vs 当時から候補)

### 完了条件

- 台帳全行が判定済み (未処理 0 を機械検算して完走宣言)
- 中央台帳 `docs/audit/freshness-ledger.md` 形式へ path / 区分 / 判定 / 最終検証日を転記 (per-doc frontmatter は使わない)
- 総括 retro を lessons/retro.md に記録 + 恒久 gate 一覧を明記

### 2 回目以降 (差分監査)

全行の再走は不要。**前回完走 commit 以後に変更された doc のみ** を台帳方式で再判定し、freshness-ledger の該当行を更新する (BonsaiLog の基準: `b4c9716`)。日常の検出は `pnpm metrics:doc-freshness` (正確性) + `pnpm metrics:doc-30day-zero` (利用頻度) + /retro Step 9 が担う — 監査はそれらが溢れた時の大掃除。

---

## 変数

| 変数       | 意味                       | 例 (BonsaiLog の場合)   |
| ---------- | -------------------------- | ----------------------- |
| `{監査名}` | 台帳 dir 名                | doc-truth-audit-2026-06 |
| `{基準}`   | 前回完走 commit (差分監査) | b4c9716                 |

## 運用メモ

- 1 セッションで完走を狙わない (BonsaiLog 実績: 2 日 / 10 バッチ / 監査由来 28 PR)。台帳が SoT なので何度中断しても再開できる
- 監査の最大の成果は「直した数」ではなく **発生源の封鎖 (正本 1 箇所化) と gate** — P-14 の 4 防御を必ずセットで検討する
