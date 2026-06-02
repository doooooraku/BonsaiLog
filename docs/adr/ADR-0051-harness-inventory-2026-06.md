# ADR-0051: ハーネス棚卸し 2026-06 + 3 skill 活用強化 + CI 修復方針

- Status: Accepted
- Date: 2026-06-02
- Deciders: @doooooraku
- Related: Issue #932 / Sess63 /discuss (ハーネスエンジニアリング記事検討) / Zenn 記事 https://zenn.dev/aicon_kato/articles/harness-engineering-startup / 一次情報 https://martinfowler.com/articles/harness-engineering.html + https://www.latent.space/p/harness-eng / 先行 [ADR-0046](./ADR-0046-harness-inventory-and-retirement-policy.md) (退役ポリシー) / [ADR-0047](./ADR-0047-review-output-contract.md) (Output Contract) / `.claude/recurrence-prevention.md` (R-15 / R-17 / R-20 / R-55) / `scripts/harness-metrics.mjs` (sensors 計測スクリプト) / Plan ファイル `~/.claude/plans/d-6-90-staged-quill.md`

---

## Context（背景：いま何に困っている？）

- **きっかけ**: Zenn 記事「ハーネスエンジニアリングがスタートアップの開発を変える」(Aicon Kato) を起点に、開発プロセス分解 / サブエージェント整備 / CI 有効性 / 自己改善ループ の 4 観点で導入候補を検討。
- **一次情報検証 (Sess63 Subagent A 並列調査)**:
  - 記事の「OpenAI 5 ヶ月で 100 万行・1500 PR・3 人」 主張は latent.space (Ryan Lopopolo) で数値は真。**但し** 「no human REVIEWED code before merge」 + 「greenfield repository」 + 「no script... applies generally」 という重要制約を Zenn 記事は省略。BonsaiLog は **既存 57 万行 + 商用 + non-greenfield** で OpenAI 自身が一般化を否定する条件。
  - Martin Fowler 記事の核心は **「feedforward (guides) / feedback (sensors) の steering loop」**。「Architectural Constraints の 3 本柱整理」 は Zenn 著者の二次解釈で、Fowler 本文に「architectural constraints」 表現は確認できず。
  - 用語「harness」 の起源は LangChain ブログ ("the anatomy of an agent harness")、Fowler/Böckeler が用語を shorthand 化。
- **既存ハーネスの実効性 (Sess63 Subagent C 並列調査、`pnpm harness:metrics` 実行)**:
  - merged PR throughput: **764 / 30 日** (Zenn 記事の 681/半月 = ~382/30日 を既に上回る)
  - CI 成功率 (直近 20): **80%**
  - revert 比率 (事故率代理、全期間): **2.4% (21/871)** = industry top tier
  - commit-helper subagent: 60 日 871 commit 中 848 (97.4%) Conventional Commits 準拠
- **困りごと (一次情報で確定)**:
  - 既存 hook 10 / skill 12 / ADR 50 / R-1〜R-57 のうち、**形骸化リスク 4 hook** (session-end-cleanup / stop-verify-suggestion / discuss-mode-check / session-start-design-reminder) は block せず警告のみで効果計測不能。
  - **90 日未使用 3 skill** (upgrading-react-native / skill-creator / react-native-best-practices) の真因は「不要」ではなく **「description キーワードが BonsaiLog 実会話パターンと噛み合っていない」 + 「該当文脈を能動検知する hook が無い」** 可能性が高い (Subagent Explore 再調査で実証、ADR で Hermes Intl V1 / FlashList が 10+ 件言及されているのに react-native-best-practices 一度も自動発火していない逸失機会あり)。
  - **CI 別 100 run 集計で 3 workflow が継続失敗**: Maestro Smoke 0% (3/3 失敗、ADR-0021 UI diff の屋台骨) / Push App Store Metadata 0% (2/2) / Build Android & Submit 25% (1/4、Sess62 修復進行中)。「常に red」状態は実質的ガード喪失。
  - **ADR-0046 D-3 足す前ゲート (c)「1 つ廃止」が一度も運用されていない** (Sess62 で cloud-first 化により出番ゼロになった eas-build-doctor subagent が明確な退役候補)。
  - **ADR-0047 Future Work ③-b 判定分離は計測 (施策②) 待ち** の状態。`harness:metrics` 自身に「hook ブロック回数の正確計測は follow-on」 と既明記。
- **制約/前提**:
  - **追加課金ゼロ厳守** (ADR-0047): claude-code-action / Cursor Bug Bot / Coderabbit / Greptile / PR-Agent すべて API トークン or サブスク課金で抵触。
  - 自己採点バイアスは revert 2.4% で許容範囲、無料代替が出るまで現状受容。
  - R-15 リスク (指示の半分が無視される肥大化): ハーネス純増は ADR-0046 D-3 足す前ゲートを通すことが前提。

---

## Decision（決めたこと：結論）

### D-1. 記事方式 (21 体エージェント) は採用しない

既存 Skill 12 体 + Subagent 2 体で同等以上の細分化済 (W-flow 17 ステップ + R-17 4 段階)。さらに細分化は R-15 (指示無視) を招く。新規 subagent 追加は ADR-0046 D-3 足す前ゲート (a)(b)(c) を Issue/PR に 1 行記載する前提。

### D-2. 有料 AI レビューツール 5 候補すべて却下

ADR-0047「追加課金ゼロ」厳守。**自己採点バイアスは現状受容** (revert 2.4% で許容範囲、無料代替が出るまで Hold)。

- claude-code-action: BYO Anthropic API key 課金 (Claude Code Max とは別請求バケット) → 却下
- Cursor Bug Bot ($25-35/月): 却下
- CodeRabbit Pro ($24/月 private): 却下 (BonsaiLog は private repo)
- Greptile ($30/seat/月、OSS 免除は MIT/Apache/GPL 非商用限定): 却下
- PR-Agent (qodo-ai) self-host: BYO LLM 課金 + Python toolchain → 却下

### D-3. hook 別計測ログ拡張を Adopt (PR-1、別 PR)

`scripts/harness-metrics.mjs` L13 に「follow-on」と既明記の未完成箇所。各 hook 末尾に append-only NDJSON ログ (`.claude/hook-events.ndjson`) を 1 行追記、`pnpm harness:metrics` に集計セクション追加。「効果不明 4 hook」 の判定材料を取得 → 1 ヶ月後の退役判断材料化 (ADR-0046 D-3 の前提条件を満たす)。

### D-4. CI 失敗 3 workflow 根本原因解析 + 修復を Adopt (PR-2/3/4、別 PR)

- **PR-2**: Maestro Smoke 0% (直近 3/3 失敗) — UI diff 屋台骨、最優先
- **PR-3**: Push App Store Metadata 0% (2/2 失敗) — リリース時のメタデータ同期破綻
- **PR-4**: Build Android & Submit 25% (1/4) — Sess62 PR 継続

3 workflow とも logcat / report.xml / fastlane log を根本解析し、修復 or 設計見直し or disable + ADR で明文化。

### D-5. eas-build-doctor subagent 退役 (PR-5、別 PR、ADR-0046 D-1 方式)

Sess62 cloud-first 化により出番ゼロ実証 (30 日間 EAS build 関連 commit 1 件のみ、それも release-android skill 経由)。`~/.claude/agents/eas-build-doctor.md` を Status=Deprecated 注記 (ファイル保持・参照破壊なし)。ADR-0046 D-3 足す前ゲート (c)「1 つ廃止」 の運用初実例。

### D-6. 90 日未使用 3 skill を「活用強化」(退役ではなく) Adopt (本 PR、Issue #932)

upgrading-react-native / skill-creator / react-native-best-practices を以下 4 介入で活性化:

1. **UserPromptSubmit hook 3 個追加** (`.claude/hooks/check-{rn-perf,rn-upgrade,skill-edit}-hint.mjs`) — BonsaiLog 会話キーワード検知 → skill 参照リマインダーを `hookSpecificOutput.additionalContext` で注入
2. **BONSAI-OVERRIDE.md 3 個追加** (`agent-tools/skills/claude/<name>/BONSAI-OVERRIDE.md`) — upstream SKILL.md は無改変、BonsaiLog 文脈の追補を別ファイルで分離保持。`pnpm ai:sync` で `.claude/skills/` に自動コピー (cp -r で BONSAI-OVERRIDE.md も含む)
3. **AGENTS.md §4.3 表に「トリガ補強 hook / BonsaiLog override」列追加** — 補強 hook と override の SoT 化
4. (sync-agent-tools.mjs 改修は **不要** — `cp -r` で BONSAI-OVERRIDE.md も含めて完全コピーされ、両者一致で `ai:doctor` 緑のまま)

旧 D-6 (退役判定) は撤回、1 ヶ月後の判定不要。description 直接編集は upstream drift (anthropics/skills + callstackincubator 更新時 conflict) 回避のため避ける。

---

## Decision Drivers（判断の軸）

- **Driver 1 — ADR-0047 追加課金ゼロ厳守**: D-2 で全有料候補を即時却下する根拠。
- **Driver 2 — ADR-0046 足す前ゲート + 退役運用**: 本 ADR 自体が「足す」 (D-3/D-6 で hook 数増) だが、削る側を 1 件 (D-5 eas-build-doctor) 同梱で純増抑制。
- **Driver 3 — R-15 リスク回避**: 21 体 subagent 体制は指示の半分無視を招くため D-1 で不採用。
- **Driver 4 — 実証データ起点**: harness:metrics (764 PR/30 日、revert 2.4%、CI 80%) で「既に industry top tier」 を事実認識、記事への劣等感不要。

---

## Alternatives considered（他の案と却下理由）

### Option A: Zenn 記事方式の 21 体 subagent 体制

- 概要: claude-requirements / claude-detailed-design / claude-implement-from-issue / claude-auto-review 等を YAML 化して導入。
- 良い点: 職務分掌で 1 タスク確実化。
- 却下理由: BonsaiLog は既に PR 764/30 日 で記事を上回る。R-15 リスク確定、自己申告ベース、greenfield 限定の前提が BonsaiLog (既存大規模 + 商用) と乖離。

### Option B: claude-code-action 採用 (BYO Anthropic API key)

- 概要: GitHub Actions で `@claude` メンション → 別プロセスで PR レビュー。自己採点バイアス解消。
- 良い点: ADR-0047 Future Work ③-b の自然な実装。
- 却下理由: Anthropic API key 課金が Claude Code Max とは別請求バケット。ADR-0047 「追加課金ゼロ」 抵触。**user 明示却下** (Sess63)。

### Option C: Cursor Bug Bot / CodeRabbit Pro / Greptile / PR-Agent

- 概要: 各種 AI PR レビュー SaaS / OSS。
- 却下理由: 月額サブスク or BYO LLM 課金で全件 ADR-0047 抵触。

### Option D: 90 日未使用 3 skill を退役 (旧 D-6)

- 概要: ADR-0046 D-1 方式で Status=Deprecated 注記。
- 良い点: ハーネス純減、SessionStart 注入サイズ削減。
- 却下理由: **user 指摘により撤回 (Sess63 後半)**。3 skill は AGENTS.md §4.3 の auto-trigger 設計、 真因は「description マッチング不足 + 文脈検知 hook 無し」。退役は将来の SDK upgrade / perf 改修時の UX friction (user が `/skill` 明示呼び強制) を招く。代替案は **D-6 活用強化** (hook 誘導 + override 分離)。

### Option E: skill description を直接編集して BonsaiLog 文脈に合わせる

- 概要: `agent-tools/skills/claude/<name>/SKILL.md` の description を Hermes Intl 19 言語 / Paywall FlashList 等の文言に書き換え。
- 良い点: シンプル、追加ファイル不要。
- 却下理由: anthropics/skills + callstackincubator の **upstream 更新時に手動 merge 必須** = drift リスク + 保守負担。BONSAI-OVERRIDE.md 分離保持で両立 (D-6)。

---

## Consequences（結果：嬉しいこと / 辛いこと / 副作用）

### Positive（嬉しい）

- 既存ハーネス可視化 (D-3) + 壊れた CI 修復 (D-4) + 形骸化資産退役 (D-5) + 90 日未使用 skill 活用強化 (D-6) で 4 方向改善
- 追加サブスク・API 課金ゼロ、ADR-0047 完全整合
- Fowler の steering loop (feedforward = D-6 hook 誘導 / feedback = D-3 計測) を実装、「自己改善ループ」 (user 元の問い 4) の具体実現
- 「記事に追い越されていない」 事実認識で過剰投資回避

### Negative（辛い / 副作用）

- 自己採点バイアスは現状受容 (revert 2.4% 許容、再発時は ADR 改訂で claude-code-action PoC 再検討)
- D-6 で hook 3 個 / override 3 個追加 → ハーネス純増だが、D-5 eas-build-doctor 退役で 1 件相殺
- BONSAI-OVERRIDE.md は upstream 同期外のローカル資産で、ai:sync 時に両者一致 (cp -r 範囲内) が必要 (Acceptance で担保)

### Follow-ups（後でやる宿題、Issue 番号は別 Issue で起票予定）

- [x] PR-6 (本 PR、Issue #932): D-6 3 skill 活用強化
- [ ] PR-1: D-3 hook 別計測ログ拡張
- [ ] PR-2: D-4① Maestro Smoke 修復
- [ ] PR-3: D-4② Push App Store Metadata 修復
- [ ] PR-4: D-4③ Build Android & Submit 修復継続
- [ ] PR-5: D-5 eas-build-doctor 退役 (ADR-0046 D-2 4 ステップ)

---

## Acceptance / Tests（合否）

### 正（自動）

- `pnpm docs:lint; echo "EXIT=$?"` = **EXIT=0** (ADR-0051 追加で連番 0050 → 0051 連続、新たな歯抜けなし)
- `pnpm verify` 全 21 step 緑維持
- `pnpm ai:sync --check` 緑 (BONSAI-OVERRIDE.md が agent-tools/skills/ → .claude/skills/ 両方に存在し一致)
- 3 hook 単体テスト:
  ```bash
  echo '{"user_prompt":"Hermes Intl で formatInTimeZone が RangeError"}' | node .claude/hooks/check-rn-perf-hint.mjs | jq .hookSpecificOutput.additionalContext
  # → "【RN 性能/Intl 文脈検知 ...」 を含む文字列
  ```

### 手動チェック

- `git diff --stat` に **src/ の変更 0 件** (本 ADR は doc + ハーネスのみ、アプリ挙動・ストアに無影響)
- AGENTS.md §4.3 表に「トリガ補強 hook」「BonsaiLog override」 新列が 3 行 (skill-creator / react-native-best-practices / upgrading-react-native) に埋まっている

---

## Rollout / Rollback（出し方 / 戻し方）

- リリース手順への影響: なし (doc + ハーネスのみ、アプリ挙動・ストア配信に無影響)
- ロールバック: `git revert` で全戻し、参照破壊なし (ADR 番号物理削除なし)
- 検知方法: `pnpm verify` の docs:lint ステップ (CI)、`pnpm ai:sync --check` で BONSAI-OVERRIDE.md 整合確認

---

## Links（関連リンク）

- Issue: #932
- 先行 ADR: [ADR-0046](./ADR-0046-harness-inventory-and-retirement-policy.md) / [ADR-0047](./ADR-0047-review-output-contract.md)
- constraints: `docs/reference/constraints.md`
- recurrence-prevention: `.claude/recurrence-prevention.md` (R-15 / R-17 / R-20 / R-55)
- harness 計測スクリプト: `scripts/harness-metrics.mjs`
- Plan ファイル: `~/.claude/plans/d-6-90-staged-quill.md`
- 一次情報 (Fowler): https://martinfowler.com/articles/harness-engineering.html
- 一次情報 (latent.space インタビュー、Ryan Lopopolo): https://www.latent.space/p/harness-eng
- Zenn 記事 (検討起点): https://zenn.dev/aicon_kato/articles/harness-engineering-startup

---

## Notes（足す前ゲート 自問回答、ADR-0046 D-3）

本 ADR は新規 D-3〜D-6 = hook 3 個 + override 3 個 + 列追加 = 新規資産を「足す」側のため、D-3 自問に PR 本文 (#932) で回答:

- **(a) 構造で防げないか?**: Hook (UserPromptSubmit) は注意ではなく構造 (会話毎に確実発火)、注意で代替不可。
- **(b) 既存と重複しないか?**: discuss-mode-check.mjs と同パターンだが対象キーワードが直交 (RN perf / SDK upgrade / skill 編集)、重複なし (grep 確認済)。
- **(c) 1 つ廃止できないか?**: 本 ADR は活用強化で純増、廃止は D-5 (eas-build-doctor 退役、PR-5) で同セッション内に相殺予定。
