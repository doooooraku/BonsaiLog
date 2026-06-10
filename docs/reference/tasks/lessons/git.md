# Git 運用の罠 — 並行 PR / stash / rebase

> Doc-Truth Audit P2 (2026-06-10) で memory から昇格した git 知見。並行 PR 運用 (worktree pattern) で再発しうるもの。

## 1. `rebase --strategy-option=theirs` は同 anchor 後ろの追加を消す

- **何が起きたか**: PR #469 が i18n key を `bonsaiFieldAcquiredAt` の直後に追加、後続 PR #471 が**同じ anchor** の直後に別 key を追加。順次 rebase で `--strategy-option=theirs` を使ったため conflict 解決が main 側を採用し、**PR #469 の追加分が消失**した。
- **ルール**:
  1. 複数 PR が同一ファイル (特に `locales/ja.ts` / `en.ts`) に追記するときは**異なる anchor** を使う
  2. `--strategy-option=theirs` での一括解決を避け、conflict は内容を見て手動 merge
  3. rebase 後に「自分の追加 key が残っているか」を grep で確認
- **出典**: memory `pr-rebase-theirs-anchor-loss` から昇格。

## 2. `stash --staged` + `reset --soft` で new file が untracked に戻る

- **何が起きたか**: staged の new file を `git stash push --staged` → pop → `git reset --soft HEAD~1` の流れで、new file が `??` (untracked) に戻り、再 commit に**含まれず漏れた**。`git log -1 --stat` の数字確認では見落とす (PR #479)。
- **ルール**: commit 直後は `git log -1 --name-status` で **file 名単位**で含まれているか確認する (数字だけの `--stat` では不十分)。
- **出典**: memory `git-stash-staged-newfile-trap` から昇格。

## 関連

- `.claude/recurrence-prevention.md` R-32 (commit 直前の `git diff --cached` 目視)
- `docs/how-to/workflow/git_workflow.md` (標準 git フロー)
