# Retro Lessons (= sprint 振り返り 集約)

> sprint / milestone 単位の retro 結果を 集約する file。 新 retro は **最新が上** で 追記。

---

## [2026-06-13] Sess105 一気通貫 workflow bypass retro (= /discuss → /implement ダイレクト遷移 + Issue 化 skip)

### 数値サマリ

- 期間: Paywall FB 受領 → PR #1242 merged まで約 1 セッション (createdAt 06:50Z → mergedAt 07:06Z + 事前 /discuss + 17 言語翻訳)
- PR: 1 件 (#1242 main merged) + follow-up Issue #1243 (= 事後 10 分後起票)
- 違反 step: 親 Issue 化 (W-01〜W-05) skip = high severity / 計画承認後の再質問 = medium severity
- 影響: 実装品質は問題なし (Jest 15/15 + Maestro 拡張 + 実機 5 SS + i18n 19 言語) — 構造課題は phase 遷移のみ
- 関連 R: 新規 R-82 起票 (= 本 retro 還流 PR で同時起票、 #1244)

### Keep

- /discuss 6 専門家議論 + 案 C 採用 — UX デザイナー + PM 推薦根拠あり、 法務リスク (景表法) も /discuss で事前判定済
- 実機検証 5 SS + mockup 整合確認 — ADR-0059 標準フロー完遂、 PR §6.3 適用済
- follow-up Issue #1243 自発起票 — 意図的不採用 2 要素を後送り台帳化、 R-79 (先送り禁止) 同型問題を構造化
- PR §2.5 やさしい説明 + 完了報告両方記載 — Sess101 #1173 ルール遵守、 オーナー理解 DoD 達成

### Problem

- ★ Issue 化 (W-01〜W-05) skip (= high severity、 初回検知) — /discuss → /implement にダイレクト遷移、 PR #1242 に親 Issue 不在。 #1243 は事後 follow-up であり親 Issue ではない
- ★ /discuss 終了時に user 既承認事項の再質問 4 件 (= Sess102 同型 2 回目) — feedback-plan-approval-implies-execution.md L16 違反パターン、 memory 記載のみで機械 enforce 無し
- phase 遷移 enforce hook 不在 — 既存 16 hooks は物理制約 (Read 前 Edit / worktree / verify 緑) のみ、 Workflow 論理順序 (/discuss → /plan → /implement) を観測する hook event が未確立だった

### Try (= Sess106+)

1. `.claude/hooks/check-phase-transition.mjs` 新設 (= P0) — UserPromptSubmit + Stop で transcript 走査、 /discuss 承認なし /implement 起動 + Issue Context 不在を warn (1 セッション後に exit 2 昇格判断)
2. `.github/workflows/pr-issue-link-check.yml` + `scripts/ci/check-pr-issue-link.mjs` 新設 (= P0) — PR body の Closes #N / Refs #N / label:no-issue いずれか必須化、 CI で機械強制
3. R-82 起票 (= P0) — `.claude/recurrence-prevention/specialized.md` に 「/discuss → /implement ダイレクト遷移禁止、 /plan の Issue 化 step は省略不可」 + Sess102/Sess105 同型 2 回再発記録
4. `.claude/hooks/check-replan-reapproval.mjs` 新設 (= P1、 follow-up) — Stop event で /plan 完了報告内の再承認要求文字列 (「この計画で OK なら」 等) を検知して警告
5. /implement SKILL.md argument-hint に validation 追加 (= P2、 follow-up) — `[#Issue番号]` hint を gh issue view 実在 + ## Context heading 確認まで拡張

### 教訓 5 (= 次 app 作る時 必ず思い出す)

1. Workflow phase 遷移は LLM 判断ではなく hook で機械強制 — SKILL.md 文字列ガイダンス + memory 行動 lesson は 2 回再発 (Sess102 + Sess105) で hook 化必須 (CLAUDE.md §9)
2. PR 作成時の親 Issue 必須化は CI で gate — PR template REQUIRED 表記は人間判定、 機械 enforce が無いと skip 可能 (本セッションで実証)
3. transcript 走査 hook pattern は phase 遷移検知に流用可能 — parallel-session-guard.mjs / stop-verify-gate.mjs の transcript 走査 pattern を check-phase-transition.mjs に展開
4. 「計画承認 = 実行承認」 ルールは 「計画 = Issue 化済」 を暗黙前提にしている — Issue 化自体を skip するケースは R-17/R-27/R-79 のいずれも想定外、 R-82 で明文化必要
5. 実装品質と Workflow 遵守は独立軸 — Sess105 は実装 high quality (Jest + Maestro + 実機 + i18n + 法務判定) だが phase 遷移 deviation で audit 対象、 両軸を分離して評価する

### 関連

- 対象 PR: #1242 (Paywall PlanCard 再設計) / follow-up Issue #1243 / 本 retro 還流 PR (#1244)
- 起票 R: R-82 (= /discuss → /implement ダイレクト遷移禁止)
- 関連 memory: feedback-plan-approval-implies-execution.md (Sess101 確立、 Sess102 1 回違反、 Sess105 2 回目同型) / feedback-use-ask-user-question.md (Sess105 user 指示、 AskUserQuestion 使用)
- 関連 SoT: docs/how-to/workflow/whole_workflow.md §1.5.4 / .claude/skills/{discuss,plan,implement}/SKILL.md / .github/pull_request_template.md §1+§2.5+§14
- mechanism 3 点セット: check-phase-transition.mjs (tool) + settings.json hooks + ci.yml 配線 (adoption) + 次 retro で PR 親 Issue 率 + hook 発火ログ確認 (auditing)

---

## [2026-06-12] Sess104 ja 文言監査 + 全 18 言語ペルソナ翻訳 完遂 (#1208 + #1207 / 27 PR / 約 4.5h / CI fail 1 / revert 0)

実データ: PR #1209-#1235 全 merge (ja 監査 6 + 翻訳規範 1 + 言語別 18 + 表セル fix 1 + α)。diff 面積 = locales 97.6%。CI fail 1 (#1209 初回 prettier、verify 実行中の file 編集が原因)。手戻り commit 0。ローカル verify 51 回。翻訳量 ~8,800 値、en 同一値 55% → 2.7%。実機 SS 87 枚 (全 18 言語切替)。

### Keep

- **agent はソース非編集・JSON 出力のみ** — 17 並列翻訳で conflict ゼロ。ソース編集と検証を main loop に一元化 (適用経路は ADR-0033 Sess104 Amendment に記録済)
- **dry-run 自己検証を agent prompt に組込** — 5 agent が独立に apply script の致命バグ (隣接キー無言削除) を再発見 = 設計に交差検証が内蔵された
- **en を用語参照として先行確定 → 17 言語へ** — settingsRestore の課金導線誤訳 (購入復元→バックアップ復元) が全言語に伝染していたのを翻訳前に止血
- **「変更キーのみ提出」指示** — agent 出力を約半分に圧縮、apply も差分のみで安全
- **言語別 1 PR + 機械検査 3 種 (placeholder / PROTECTED_TERMS / forbidden) + 全 verify** — 545 行級 diff でも合否が機械判定できた

### Problem

- **実機の言語切替 SS 掃引が brittle** — uiautomator dump が時々 text 空 / BACK の挙動が文脈依存 (paywall・リスト・home) / 誤タップでテスト広告の Chrome に 2 回脱落。18 言語で再同期を 6 回以上 (推定 +25 分)
- **worktree agent 起動が core.hooksPath を `.git/hooks` に戻す** — 3 回再発 (CLAUDE.md §9 の仕組み化しきい値到達)。verify:hooks が検出するが修復は手動
- **apply script に潜在バグ 2 件** (double-quote 終端誤認 / 実改行未エスケープ) — 兆候は「missed 1 件」「prettier parse error」として現れた。dry-run の missed 件数を 0 でない時に即調査する規律が効いた
- **check-native-impact が package.json の scripts 追加で native 判定** — 誤検知 2 回、dev build 15 分を提案された (rm flag で回避、根拠は deps diff)
- **verify 実行中に file 編集** → CI prettier fail 1 回 (検査スナップショットのすり抜け)

### Try (次回以降)

- **hooksPath 自動修復の仕組み化** (3 回再発 → Issue #1236 起票): worktree agent 完了後 or pre-commit で check-hooks.mjs の自動修復を走らせる
- **言語切替 SS 掃引の script/Maestro 化**: 言語リスト行に testID を付与し `maestro/flows/i18n-sweep.yml` で 18 言語 × 3 画面を機械化 (今回の座標+SS 方式は人手再同期が必要)
- **check-native-impact.mjs を deps 限定判定に改良** (package.json は dependencies/devDependencies の diff のみ native 扱い)
- **verify 実行中は file 編集をしない** (検査対象のスナップショット保全)
- **PR チェーン 1 コマンド化 (commit→push→PR→CI watch→merge --repo)** は有効だった — merge は `--repo` 指定で local git 非接触にするのが安全 (gh の --delete-branch は checkout を奪う)

### 教訓

- **SoT 言語の誤訳は全言語に複製される — 翻訳の前に原文監査 (ja → en → 17 言語の順序自体が品質装置)**

実データ: PR #1194-#1200 (merge 10:16〜11:27 JST、平均 12 分/PR)。CI 全 success (verify 約 2 分 ×7)。手戻り commit 0。diff 面積 = docs/reference 59% + i18n 15.7% (並行セッション分込み)。ローカル verify 3 回 + CI watch 5 回。R 増分 = 注記修正のみ (新規起票 0)。

### Keep

- **進捗の外部保存で compaction 無損失** — plan ファイル「セッション進捗サマリ」+ Issue 進捗コメントに batch 単位で書き残し、記憶リセット直後に 1 分で再開できた
- **注記方式の一貫適用** — 歴史文書 (ADR/lessons/design_system §採番) は本文温存 + 死パス・stale 記述に「※現行は X」付せん。採番 rename は参照破壊リスクで全件回避
- **「予定」表記は完了裏取りしてから現行化** — script 実在 + R 起票 grep + git log で裏取り → design_system「Sess69 PR-D 予定」×3 が実は完了済みと確定
- **並行セッション完全分離** — worktree 6 本使い捨て + #1178 完全譲渡で衝突ゼロ (R-81 hook 有効性の実証)

### Problem

- **幽霊参照が憲法級ファイルに長期生存** — AGENTS.md の「Codex 不採用 ADR」「R-22 (Codex 不採用)」は存在しない記録への参照 (R-22 は起票時から verify exit code 保全)。Sess56 監査も素通り = 既存 lint は「パスの実在」を見るが「参照内容の真偽」(ADR 番号・R 番号と実体の一致) を見ない
- **R-55 sweep の対象漏れ 1 件** — 「約 15 分」grep が `scripts/*.sh` を含まず orchestrate.sh コメント見逃し (Batch 2 で補完)。grep 対象拡張子の列挙漏れは網羅主張の穴
- **merge + worktree 清掃の足場事故 ×2** — worktree cwd 内から `gh pr merge --delete-branch` + `git worktree remove` を実行し cwd 消失 / branch 削除失敗の小手戻り

### アドリブ成功の棚卸し (仕組み化判定 — Amazon「Good intentions don't work, mechanisms do」/ トヨタ「標準なくして改善なし」適用)

| アドリブ成功                                                                | 効果 (実測)                                                      | 判定                                                | 実装先                                                                                                                       |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| plan ファイル「セッション進捗サマリ」逐次更新                               | compaction 後 1 分で再開 (損失ゼロ)                              | **仕組み化 ✅**                                     | `/plan` Skill W-05.5 に必須手順として追記 (本 PR)                                                                            |
| CI watch を background 化し次バッチの Read と並行                           | 6 PR 直列なのに wall-time 約 1h40m に圧縮 (CI 待ち ≈18 分を吸収) | **仕組み化 ✅**                                     | `/retro` Step 5 深掘りプロトコル経由で発見 → 運用知として本エントリ + 次は whole_workflow W-11 追記検討 (2 回目の有効実証で) |
| git 考古学 (`git show <commit>:<path>` + `git log -S`) で幽霊参照の真偽確定 | 「R-22 の中身が昔から違う」を証拠付きで確定                      | 知識として記録 (頻度低、 mechanism 化は過剰)        | 本エントリ + lessons/docs.md は次回発生時                                                                                    |
| `test -e` 一括パス生存 + Read 目視の 2 段方式                               | 60+ パスを数秒で機械判定 → 疑義のみ精読                          | 記録のみ (docs-lint が大半を常時監視済みのため重複) | —                                                                                                                            |

### Try (次回以降)

- **R/ADR 番号参照の実在チェック** を docs-lint 昇華候補に (「R-XX (説明)」の説明と specialized.md 見出しの突合)。3 回目の幽霊参照発見で必須化 (今回 2 件 = 検討開始ライン)
- **merge + 清掃は main repo cwd から** `gh pr merge` → `git worktree remove` の順で実行 (worktree 内から自分の足場を消さない)
- **次回 docs 監査は差分方式** — 完走 commit `158054e1` 以後の変更 doc のみ (7/10 棚卸に統合済)
- **/retro Step 2 幅広収集メニュー + Step 5 深掘りプロトコル + アドリブ成功レンズ** (本 PR で Skill 化) — 「詰まった点」の記憶依存を低減し、成功駆動の改善入口を常設
- (見送り) docs-only PR の CI fast-lane — i18n locales = code であり path filter の誤分類が品質ゲートを破壊するリスク (QA 視点)。verify 約 2 分は許容コストと判定

### 教訓

- **「参照の実在」と「参照の真偽」は別の検査** — パス実在 lint は「存在しない ADR 番号」「中身の違う R 番号」を検出できない。番号参照は引用時に 1 次資料 (実ファイルの見出し) と突合する

---

## [2026-06-11] Sess100 #1149 Stop hook verify ゲート — 採用判断

**判定: 採用** (default ON、PR #1160 で本配線)。根拠: 合成 7 ケース (#1155) + 採用版 5 ケース + live 3 関門 (#1156 実装フローで実走) = 15/15 PASS、誤 block ゼロ。指紋 = `git stash create` tree oid (commit 不変) が「verify→commit→終了」の正規フローと両立することを T6/live③ で実証。

- **教訓 1**: opt-in 試験版 → live 実証 → default ON の 3 段階が安全だった (R-30 の 2/2 基準を段階ごとに適用)
- **教訓 2**: default ON 化の前に「他セッションの残置変更で docs 専用セッションが誤爆する」シナリオを発見 → transcript 走査 (R-18 hook と同方式) で「自セッションが編集した時だけ」条件を追加。**hook を全員 ON にする時は『自分以外が原因の状態』での誤発動を必ずシミュレーションする**
- **/goal 併用 (Sess100 同日試行済み)**: CLI 組み込みのため user 手入力が必要 (`/goal Issue #1123 の AC 全達成 + pnpm verify が EXIT=0` で発動確認)。session スコープの Stop hook として動作し、条件成立まで終了 block + 条件成立で自動解除。**Stop gate との関係 = 補完**: gate は機械条件 (verify 緑) を毎セッション無条件で守る恒久層、/goal は意味条件 (AC 達成等) をセッション単位で user が宣言する任意層。重複ではないので両方維持。推奨運用 = 大きめの実装セッション冒頭に user が /goal を 1 行打つ
- 安全網: `.claude/.stop-gate-off` (R-61) + 公式の連続 8 block 強制終了

## [2026-06-11] Doc-Truth Audit 2 日間総括 (後半戦 バッチ②b〜⑩ + 完走)

6/10 20:04 (基準 `11b3337`) 〜 6/11 09:33 (#1113) で台帳 420 行 全判定・未処理 0 を機械検算 (✅349 / 修正・処置済 35 / 🟡24 / 🔴5 / ❌4 / ⚪1)。監査由来 28 PR + 構造防御 4 件 (placeholder gate check7 / R 索引 parity check8 / verify:ai-sync / main branch protection)。前半戦 (P0〜P2) の retro は下記 [2026-06-10] エントリ、本エントリは後半戦 + 全体総括で重複なし。

### Keep

- **検出と修正の分離が 10 バッチ通して破綻ゼロ** — 読み取り専用バッチ → user 判断 (候補 A〜G 方式、判断材料 + 推薦提示) → 修正スプリント。台帳 PR 1 本刻みで同日 3 セッション並行でも衝突なし
- **機械検査 → flagged のみ手動切り分けの 2 段方式** — 例: バッチ⑤ how-to 35 件 → flagged 17 → 真の腐敗 9。全文精読は load-bearing (constraints 等) に限定
- **検査の限界を台帳に正直に明記** — 「✅ は path 実在の機械判定、意味的鮮度は未深読み」等。過大主張しない監査記録が次回の信頼基盤になる
- **修正のたび gate へ昇華** — 親索引欠落の 2 回目再発 → 即 docs-lint check 8 化 (CLAUDE.md §9 段階昇華の模範例)

### Problem

- **固定値の多層コピー drift 4 例** — R 番号範囲 3 箇所 / 作業種別数 2 箇所 / lessons 旧 path 3 層 / 索引 2 重化。コピーの枚数だけ直し忘れが発生する構造そのものが根本原因
- **gate 自体の死角** — validate-metadata 旧 check 6 が SKIP_DIRS + ロケール loop 外で「placeholder のまま PASS」を実走確認。「gate があるから安全」は未検証だった
- **合意成果物の未 commit 6 件** — git 考古学の結果 5 件は当時から候補扱い (約束ではない)、真の約束倒れは 1 件。合意の場で Issue 化しなかったものは消える
- **R-49 再発 2 回目** — P2 説明 + retro 報告で user「全く理解できません」(Sess83-86 に続く)。AskUserQuestion 前だけでなく議論・報告の 1 文目から self-check 必要 (3 回目で hook 化検討)

### Try (次回以降)

- **差分監査**: 次回は完走 commit `b4c9716` 以後に変更された doc のみ台帳方式で再判定 (全 420 行の再走は不要、/memory-review 2 週間周期に統合)
- 新規 doc の固定値 (件数・番号範囲・path) は「最新は X 参照」の非固定表記を既定にする
- gate 新設時は「わざと壊して fail する」実走証明 (PASS → 改変 exit 1 → 復元 exit 0、#1107 の 3 段階方式) を必須にする
- 構造防御 4 件は次 app 開始日に初期装備する (P-14 手順書、本 retro と同日新設)

### 教訓

- **乖離は「直す」より「発生源 (固定値の多重コピー) を断つ + ブザー (gate) を付ける」** — 420 行 × 2 日の大掃除は、gate なしで 2 ヶ月走った代償。次 app は初日から 4 防御で大掃除自体を不要にする

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
