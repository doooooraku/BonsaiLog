# 学んだこと（Lessons Learned）— 誘導のみ

> **このファイルは旧パス互換のための誘導です** (Doc-Truth Audit バッチ⑦ 2026-06-11 で索引を一本化)。
>
> - **領域索引 (正)**: [`./lessons/README.md`](./lessons/README.md) — 全領域ファイルの一覧 + 再発検知マトリクス
> - 技術 lesson 本体: [`./lessons/`](./lessons/) フォルダ (領域別、各 ≤200 行)
> - 行動 lesson: [`.claude/recurrence-prevention.md`](../../../.claude/recurrence-prevention.md) (最新の R 番号は同ファイルの索引が正)

## 運用ルール

1. 新しい lesson は領域別ファイルに追加 (新領域なら新ファイル + `lessons/README.md` の索引に追記)
2. 1 ファイル 200 行以内を維持 (`pnpm docs:lint` が検出)
3. 行動パターンの再発防止は `.claude/recurrence-prevention.md` (本フォルダではなく)
4. 本ファイルには索引表を持たない (二重索引 drift 防止 — 索引は README.md のみ)
