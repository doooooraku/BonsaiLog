# Retro Lessons (= sprint 振り返り 集約)

> sprint / milestone 単位の retro 結果を 集約する file。 新 retro は **最新が上** で 追記。

---

## [2026-06-10] Sess95 Doc-Truth Audit P0〜P2 + 修正スプリント (9 PR)

2h20m で 監査基盤 (台帳 415 件) + 判定 20 件 + 9 PR (#1064-1075 の監査由来分) + ログ採掘 (134 transcript / 956MB)。重大発見 = repo PUBLIC + Pages 全公開 (→ ADR-0057 で容認明文化) / fastlane placeholder → ASC 自動 push 事故経路 (→ #1064 gate で構造封鎖)。

### Keep

- **検出と修正の分離**: 監査セッションは読み取り専用 + 1 件ごと台帳更新 → user 承認 → 修正スプリント。判定には必ず code path:line 根拠
- **gate を実文化より先に配線** (#1064 → #1068): 「直すより先に事故経路を塞ぐ」順序
- **生ログ非読込の script 採掘** + redaction 既定 + 手法限界の明示
- **並行セッション対策**: local main に触らず `git checkout -b X origin/main` 直 branch
- **memory→docs 昇格は .bak + 参照 1 行化**をセットで (二重管理防止、13 件適用)

### Problem

- **台帳列挙漏れ 76 件** (S1 を .md/.html filter にしたため store-listing/\*.txt が漏れ、バッチ②a で発覚) — 根本原因 = 網羅性を主張する成果物に網羅性の機械検算が無かった (R-25 同型の機械出力過信)
- 手戻り 3 件 (~15 分): sed 区切り `#` ×「PR #1064」衝突 / template-check が自分の comment 例示 `{ {VAR} }` (= 二重波括弧 VAR、 本文に literal で書くと再発火するため空白区切りで記載) を検知 / lessons 行数上限を 250 と誤認 (実物 200、plan 時の 1 次資料確認漏れ = R-20 同型)
- 訂正採掘 regex の S/N 比低 (198 hit 中有効 ~10)

### Try (次回以降)

- 列挙系 script は「全数 − 除外 = 採用」の**検算行を必ず出力**、不一致は file 名列挙
- lint の例示文言は当該 lint の allowlist 内の語 (`{{PLACEHOLDER}}` 等) を使う
- 採掘 regex は小サンプルで校正してから本走 (2 段方式)
- 行数上限・lint 仕様は plan 段階で script 実物を Read

### 教訓

- **網羅を謳う成果物には網羅の検算を仕込む** — 「機械列挙だから正しい」は R-25 の親戚

---

## [2026-06-10] Sess90 画面ヘッダー font/背景 統一 + 検出 lint 配線 (3 PR)

### Keep

- **議論モード Explore agent + Plan agent cross-check** — 47 file 走査で hardcode 4 箇所分散 早期特定、 cross-check で gotcha 全潰し (= TypeScript 型制限 / nested cascade 等)
- **token SoT 化を 1 session 完遂** — `screenTitleTab` / `screenTitleStack` + `c.background` で「change one place, takes effect everywhere」 保証
- **段階導入の lint 配線** — ADR-0029 D1 form typography 同型、 warning のみ (exit 0) で false positive 観察期間を確保
- **2 段 pattern を既存正典から流用** — settings/index.tsx (Sess74 PR-3) の `Stack.Screen + useEffect(setOptions)` をそのまま 3 manager screen に適用
- **deep link で実機検証高速化** — `bonsailog://<route>` で screen 直接 navigate、 タブ → row tap の遷移省略

### Problem

- **Plan agent の cascade 認識誤り** — 「root → nested 自動 cascade」 と書かれていたが Expo Router は cascade しない、 実装中発覚で 4 nested layout 追加修正
- **TypeScript 型制限を実装後発覚** — `headerTitleStyle` が `Pick<TextStyle, 'fontFamily'|'fontSize'|'fontWeight'> & { color? }` 限定で letterSpacing/lineHeight 除外要、 `screenTitleStack` を 2 プロパティに絞り直し
- **JSDoc コメント内 `**/\*.tsx`syntax error** —`\*\*/`がブロックコメント terminator として誤認識、`app 配下の .tsx` 言い換えで回避
- **PR-C lint script の false positive 17→3 件 縮減サイクル** — 初版は `c.surface` を全 file で検出、 body card 系 16 件誤検出 → header context lookback 追加で fix
- **adb screencap CRLF 罠 3 回目再発** (Sess77/89/90) — `adb shell screencap > file.png` で PNG header に CRLF 混入、 `exec-out` で binary-safe 取得が正解
- **設定 → テーマ tap 座標 2 回誤認識** — y=1040 で「言語」 row tap、 y=985 で再度「言語」 tap、 真の「テーマ」 row は y=1060。 dark mode 切替後の row 位置 ずれ + scroll position 認識誤り

### Try (次回以降)

1. ✅ **`scripts/dev/take-ss.sh` 起票** (= P0、 **Sess91 PR-A で完遂**) — adb exec-out + 連番命名 + REPORT.md 雛形 自動生成 + PNG ヘッダー verify で罠再発時の即検出
2. ✅ **Plan agent 出力の critical claim を実装前に Read で 1 次資料確認** (= **Sess91 PR-A で `.claude/CLAUDE.md` §2 に追記済**) — cascade / 型挙動 等 framework specific は agent の memory に依存しがち
3. **PR-C lint script を Sess92+ で error 昇格** — false positive 2 セッション以上観察、 残 3 件 (= body 内 NotoSerifJP) を別 PR で fix
4. **`worktree-init.sh` で `check-hooks.mjs` 自動順序確認** — PR 毎の format check 失敗 → prettier auto-fix を構造排除
5. **`docs/reference/deep-link-route-map.md` 起票** — `(tabs)` group route は tab tap 必須 等の罠を documented ※2026-06-11 監査注記: 未起票のまま (git 履歴なし)。必要が再浮上したら起票

### 教訓 5 (= 次 app 作る時 必ず思い出す)

1. **token SoT 化は 1 session 完遂可、 design system の hardcode 検出は grep lint で十分** — Sess90 PR-A/B/C 累計 2 時間で font/background/lint 全完遂、 ESLint AST rule 化は 3 回再発で検討 (= CLAUDE.md §9 段階昇華)
2. **Expo Router の `<Stack screenOptions>` は nested Stack に cascade しない、 各 nested で明示 spread 必須** — Plan agent の認識誤りを実装中発覚、 R-75 で構造防止
3. **user 報告「統一性がない」 は必ず全 file inventory 必須、 1 箇所修正で他 N 箇所漏れの罠** — R-55 関連項目網羅調査の典型例、 grep だけでは漏れる
4. **dark mode 確認は OS uimode ではなく app 内 themeMode 切替が必要** — themeMode='light' 固定の app は OS 追従しない (= 設計通り)、 設定 → テーマ → ダーク tap 必須
5. **adb screencap は `exec-out` で binary-safe、 shell pipe は CRLF 変換罠 (= 3 回目再発)** — Sess77/89/90 同型、 `scripts/dev/take-ss.sh` 起票が必須 → Sess91 PR-A で完遂

### 関連

- 詳細 plan: `~/.claude/plans/cuddly-enchanting-token.md` (= PR-A 計画 → Sess91 PR-A で 改善策 #1+#2 上書き)
- 実機 検証 REPORT: `dist/sess90-verify/2026-06-10-0547/REPORT.md` (= 12 SS + 学び 4 件)
- 連鎖 PR: #1041 (PR-A) → #1043 (PR-B) → #1044 (PR-C)
- 起票 R 番号: R-74 (= Stack screen title 2 段 pattern) / R-75 (= screen header font geometry hardcode 禁止)
- ADR Amendment: ADR-0053 Sess90 PR-A Amendment (font 統一) + Sess90 PR-B Amendment (背景 washi 統一)
- design_system §3-4 Screen header background contract 新設

---

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
