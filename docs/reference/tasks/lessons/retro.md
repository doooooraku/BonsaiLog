# Retro Lessons (= sprint 振り返り 集約)

> sprint / milestone 単位の retro 結果を 集約する file。 新 retro は **最新が上** で 追記。
>
> 関連: `.claude/recurrence-prevention.md` (= 行動ルール R-1〜R-71)、 `lessons/README.md`

---

## [2026-06-09] Sess83-86 4 PR sprint retro (= R-71 起票 + 副次発見 連鎖)

### 数値サマリ

- 期間: 16:14 (= 苦情報告) → 20:07 (= #1022 merge) JST = **3h53m**
- PR: **4 件 全 main merged** (= #1019/#1020/#1021/#1022、 CI 100% SUCCESS)
- diff: **+706 / -39 = 745 行**、 47 unique files (= 19 言語 i18n 重複考慮)
- 副次発見: **4 件** (= #1 RecurrenceList CTA「+ + 新規追加」 / #2 recurring Stack header / #3 OS dark = 設計通り / #4 BonsaiMultiSelect recurring fallback)
- 新 R 番号: **R-71** 起票 (= 元 R-68 → main 衝突 hotfix で R-71)
- 実機検証: **5 cell PASS** (= log/schedule/recurring × 1件 + log × 2件) + Sess84 改修 #1+#2 main 反映確認

### Keep (= 続けたい)

1. **議論モード で 仕様変更 回避** = 6 専門家 + 4 ペルソナ + 業界事例 (= Apple HIG Sole option auto-select) で D 案 (= skip 廃止) を 3 重否定、 B+C 合体 (= 文言 + chip 改善) で user 不安解消 + 業務プロ 100 鉢動線完全保護 両立
2. **worktree pattern + worktree-init.sh** (= R-64) で .env + node_modules symlink 自動化、 4 PR 連続作業中 main 衝突ゼロ
3. **pnpm i18n:add-key + sed 一括** で 19 言語 修正 高速 (= 副次発見 #1「+ 」 prefix 削除 30 秒、 手動 30 分 → 自動 30 秒)
4. **副次発見 段階追放** = 1 PR 完成 → 検証 → 別 PR 修正 で scope 縮減 + revert 容易、 連鎖 4 PR 全 main merge
5. **CI 緑 を必ず待つ** (= R-70 wait-pr-ci.mjs) で 4 PR 全 SUCCESS 確認後 merge、 main 壊れゼロ

### Problem (= 困った、 ★ は 2 回以上再発)

1. **★ R 番号衝突** (= 一番ロス、 30 分) — worktree base cedb7c1 で R-67 が最新と判断、 main 進化 (= Sess81/82 で R-68/69/70 既起票) 察知漏れ → R-71 rename hotfix
2. **★★ Metro 起動 dir 罠 (= 2 回再発)** — main worktree から起動済 Metro が worktree branch 改修反映せず、 user kill 許可必要、 15 分ロス。 Sess72 で 既 lesson 記録あった
3. **★★ AdMob banner overlap tap 罠 (= 2 回再発)** — dev build で 盆栽 tab y=1325 が AdMob 重複、 Chrome 飛び、 5 分ロス。 Sess75 で 既 lesson 記録あった
4. **副次発見 連鎖 4 件** — 1 件目検証で 2 件目発見、 連鎖で 4 PR sprint に膨張、 sprint 終了判断不明確
5. **議論初動 専門用語多用** (= R-49 trigger 起動) — ADR-0025 §7 等 多用 → user「全く理解できません」 → 仕切り直し、 R-49 self-check 6 項目 で 防ぐべき
6. **Maestro 実機 PASS 失敗** — tut5 後 通知 opt-in skip step 不足、 1 回試行で fail、 stability 改善 Sess87+ 持ち越し

### Try (= Sess87+)

1. **scripts/dev/next-r-number.mjs 起票** (= P0) — git fetch origin main → grep specialized.md HEAD: → max + 1 出力、 R 起票時 必ず呼出、 worktree base 古くても 衝突回避
2. **reload-app.sh に Metro cwd verify step 追加** (= 3 回再発で CLAUDE.md §9 自動 hook 化必須) — ps grep + worktree dir 比較、 不一致なら 警告 + 再起動推奨
3. **PR テンプレに「副次発見記録欄」 追加** (= P1) — sprint 連鎖 構造化、 次セッション復元で 即把握
4. **Maestro template `onboarding-skip-full.yml` 起票** — tut5 + 通知 opt-in 一体 skip template、 新規 flow stability 向上
5. **scripts/check-i18n-icon-duplicate.mjs 起票** (= P1) — i18n value「+ 」 prefix + BottomCtaBar 検出 lint、 副次発見 #1 同型問題 構造防止
6. **R-49 self-check 議論初動 強制適用** — AskUserQuestion 前だけでなく 議論 1 文目から 用語訳 / 図解 / 例え話 強制

### 教訓 5 (= 次 app 作る時 必ず思い出す)

1. **議論で「仕様変更」 は 最終手段、 まず「表現改善」 を 探す** — D 案 (= 仕様変更) は 業務プロ R-10 違反 + 同日 Sess80 PR-6.5 真逆 + 業界 best practice 違反 の 3 重否定、 B+C 合体 (= 文言 + chip) で 両立できた
2. **R 番号 採番 は main HEAD base** — worktree base 古いと衝突 hotfix、 `git fetch origin main && grep specialized.md HEAD: → max + 1` 必須
3. **Metro は 必ず worktree dir から起動 + cwd 確認** — `ps -ef | grep "expo start"` で cwd grep、 main worktree なら kill + 再起動 (= 2 回再発、 3 回目で hook 化必須)
4. **AdMob banner overlap tap 罠** — dev build で 盆栽 tab y=1325 衝突、 y=1100 帯 (= banner より上) で 確実 tap、 production は ADR-0010 予防済
5. **副次発見 連鎖 は 必ず起きる、 PR テンプレで 構造化** — 1 件目検証で 関連 component 動線網羅 grep (= R-55 整合) を 事前実行、 PR テンプレ副次発見欄 必須化

### 関連

- 詳細 plan: `~/.claude/plans/b-c-precious-catmull.md` (= 4 PR sprint retro)
- Engram session_summary: 2026-06-09 Sess83 (id 既保存) + Sprint pattern (= Sess87 追加保存)
- 連鎖 PR: #1019 (Sess83) → #1020 (Sess84) → #1021 (Sess85) → #1022 (Sess86)
- 起票 R 番号: R-71 (= 件数分岐 hook UI 表現契約 SoT 化)
