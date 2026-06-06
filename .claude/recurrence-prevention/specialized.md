# 再発防止プロトコル — 専門ルール (R-13 〜 R-61)

> 本ファイルは `.claude/recurrence-prevention.md` (親) の詳細部分。
> 親ファイル = R-1 〜 R-12 全文 + R-13 〜 R-61 索引 + 運用ルール。
> 本ファイル = R-13 〜 R-61 詳細記述。
> 親ファイルの「専門ルール 索引」 から各 R-N に飛ぶ運用。

---

### R-13. 議論モードでの質問数・ラウンド数の予告

- **ルール**: `/discuss` 起動時に「この議論で **N 件質問**します、想定 **M ラウンド**です」を冒頭で予告する。
- **根拠**: F-04/F-09/F-10/F-15 議論で「念のため」追加質問が 5-10 件ずつ発生し、ユーザーが粒度を予測できなかった事例が頻発。
- **自動化**: `.claude/hooks/discuss-mode-check.mjs` で UserPromptSubmit に `/discuss` 含む時にリマインダー注入。

### R-14. 専門用語ゼロモード（シニア向け）

- **ルール**: ユーザーが「誰にでもわかるように」「わからない」「専門用語多い」と発言したら、以降の応答で **専門用語が出る都度「やさしい言い換え」併記**を強制。技術略語（API/CSS/SQL 等）も例外なし。
- **根拠**: F-04/F-09/F-10 で「専門用語多くて理解できない」フィードバックが 3 回発生。R-5 の上位互換ルール。
- **自動化**: なし（応答時の自己強制）。R-14 違反検出は人間のフィードバック依存。

### R-15. MCP ツールのハング判定

- **ルール**: MCP ツール（特に Engram `mem_save` `mem_context`）が **30 秒以上応答ない**場合、ハングとして扱い、ユーザーに以下を即時報告：
  1. ハングの可能性
  2. 待機継続 / キャンセル / 代替手段（会話履歴 + ファイル保存で代替）の 3 択提示
- **根拠**: F-15 議論完了後に `mem_save` が 13 分 49 秒スタック、「権限拒否」と誤認した事例あり。
- **自動化**: `ScheduleWakeup` で 30 秒後に状態確認、または `Bash run_in_background` で別タイムアウト監視（実装は応答時判断）。

### R-16. Design / モックアップ参照時は領域別 Source of Truth を冒頭明示

- **ルール**: Design / モックアップ / Wireframe / 外部資料を参照開始する**最初の応答**で領域別 SoT を明示する:
  - **UI 表現** (見た目 / レイアウト / コピー / コンポーネント形状): **OpenDesign 出力 (最新版) が正**、ADR Notes は追従更新
  - **ビジネス仕様** (機能有無 / Pro 限定 / 課金 / プライバシー / データ送信 / 法令): **議論済 ADR (`docs/adr/`) が絶対上位**、Design / OpenDesign が矛盾しても ADR を採用
  - **境界判定**: R-28 (境界判定フロー) を参照
- **根拠**: F-10 議論で Claude Design「全機能 Free」記述を信じて「PR1: 全機能 Free」を**強く推薦してしまい**、ADR-0009/0011 (Pro 限定) で撤回した事例 = ビジネス仕様の誤判定。一方 2026-05-07 議論で「OpenDesign で 9 割 UI 採用」方針確定 → ビジネス仕様と UI 表現で SoT を分離する必要性が顕在化。
- **自動化**: `.claude/hooks/session-start-design-reminder.mjs` で SessionStart に常時注入 (領域別 SoT を含む)。

### R-17. 「全部推薦で OK」即時実行禁止（4 段階強制）

- **ルール**: ユーザーから「全部推薦で OK」「進めて」等の包括承認を受領しても、必ず以下 4 段階を経る：
  1. **TaskCreate** で実装タスクを並べる
  2. **計画提示**（やる順 + 所要時間 + 触らないファイル明記）
  3. **承認待ち**（「この計画で進めて良いですか?」）
  4. **実行**
- **根拠**: F-10 議論で「全部推薦で OK」回答後にいきなり書換進行しかけた、複数機能で類似事例。R-17 は Engram 中断・PR 作成等にも適用。
- **自動化**: `/plan` Skill チェックリストで強制、応答テンプレ化。

### R-18. Read 前 Edit の絶対禁止

- **ルール**: `Edit` / `Write` ツールを呼ぶ前に、必ず**そのセッション内で同じファイル path の `Read` を 1 回以上**実施。並列 Edit 時は全ファイルを Read 済み確認。
- **根拠**: 本セッションで `Edit` を `Read` 前に試行 → "File has not been read yet" エラーが 5 回以上発生。
- **自動化**: `.claude/hooks/check-read-before-edit.mjs` で PreToolUse に Edit/Write を block する hook 実装。Hook が「直近の Read tool_use ログに該当 path がない」を検出 → exit 2 で中断 + メッセージ。

### R-19. Engram 保存は短い要約版に制限

- **ルール**: `mem_save` の `content` は **1KB（1024 文字）以内**に制限。長文の決定事項は ADR ファイル / Issue 本文に書き、Engram は「ADR-0016 起票完了、Pro 限定維持」程度の索引のみ保存。
- **根拠**: F-15 議論完了時に約 5KB の長文 `mem_save` が Engram MCP をハングさせた事例。Engram は「索引」、本文は「ADR / Issue / 会話履歴」が正。
- **自動化**: `.claude/hooks/check-mem-save-size.mjs` (Hook で content 長を確認) または応答時の自己制約。

### R-20. 「念のため再検証」議論前に既存 ADR を必ず Read

- **ルール**: ユーザープロンプトに「念のため」「再検証」「再議論」「もう一度」が含まれたら、**議論開始前**に該当機能の既存 ADR / functional_spec の該当セクションを必ず Read する。リサーチ subagent 起動より優先。
- **根拠**: F-09 / F-10 議論で既存 ADR-0008 / functional_spec §15 を読み込む前に subagent リサーチを起動 → 既存決定事項を再発見する非効率が発生。
- **自動化**: `.claude/hooks/discuss-mode-check.mjs` で UserPromptSubmit に「念のため」検知 → 関連 ADR を Read するシステムリマインダー注入。

### R-21. 並列サブエージェントは worktree 隔離必須

- **ルール**: `Agent` ツールを `run_in_background=true` で起動する際、`isolation: "worktree"` を **必ず指定する**。foreground (1 件ずつ実行) なら不要。read-only / 専用エージェント (Explore / Plan / commit-helper 等) は対象外。
- **根拠**: 2026-05-02 セッションで 5 サブエージェントが同 working directory を共有し、互いの git stash / checkout / edit が衝突 → F-09 / F-10 / F-32 が完成不能、F-15 エージェントが eventRepository.ts を 45 行誤削除しかけた。並列エージェント完了報告 6 件中 4 件が「並列カオスで完了不能」と報告。
- **自動化**: `.claude/hooks/check-agent-isolation.mjs` で PreToolUse Agent / Task tool 起動時に isolation チェック、未指定なら exit 2 で block。

### R-22. pnpm verify を background で実行する時の exit code 保全

- **ルール**: `pnpm verify` を `2>&1 | tail -N` 形式でパイプしない。失敗の exit code が tail の 0 で隠蔽される。代わりに `> /tmp/log 2>&1; echo EXIT=$?; tail -N /tmp/log` 形式で必ず exit code を確認。同様に **セミコロン区切りの compound command の最後に `tail` を置くと全体 exit code が tail のもの (= 0) になる** ため、最後に `pnpm verify` 単体を置くか、log の `EXIT=N` 行を `grep -E '^EXIT=' /tmp/log` で明示抽出する。
- **根拠**: 2026-05-02 F-13 Phase 0 で `pnpm verify 2>&1 | tail -100` の background 起動 → 完了通知では exit 0 だったが、実際は format fail。誤って「全 7 ゲート緑」と報告しかけた。2026-05-16 Sess1 PR-1 着手時も `corepack pnpm verify > /tmp/log 2>&1; echo EXIT=$?; tail -50 /tmp/log` 構造で「EXIT=1」 を log 中身で発見した (R-22 を踏みかけたが tail 出力で検知)。
- **自動化**: なし (Bash パイプ全般を block するのは過剰)、応答時の自己強制。

### R-23. 既存スキーマフィールド名を変更前に grep / Read で検証

- **ルール**: DB スキーマ由来の型 (Drizzle `$inferSelect`、Valibot output) のフィールド名を初めて使う時、必ず schema.ts を Read して実際のフィールド名を確認する。型推論まかせで書かない。
- **根拠**: 2026-05-02 F-04 純関数で `Event.kind` (実際は `Event.type`) / `occurredAtTzOffsetMin` (実際は `tzOffsetMin`) を書いてしまい type-check fail。Edit で修正必要だった。
- **自動化**: ESLint `no-restricted-syntax` で頻出する誤用パターン (`event.kind` 等) を error にする。本セッションで導入済 (eslint.config.js)。

### R-24. lessons.md / recurrence-prevention.md の肥大化防止

- **ルール**: lessons/<area>.md = **200 行以内**、recurrence-prevention.md = **250 行以内** を維持。超過したら新ファイル分割 or 既存を hook / ESLint / CI に昇華して削除。同一テーマで 3 件以上たまったら自動化への昇華を必須化。
- **根拠**: lessons.md が膨大になると重要部分が読まれない (ユーザー指摘 2026-05-03)。注意で済ませず構造的に防ぐ。2026-05-16 Sess1 PR-1 着手時に recurrence-prevention.md が 261 行に到達 (R-24 違反) → 本 split で `.claude/recurrence-prevention/specialized.md` (R-13〜R-31 詳細) に分割、メインは R-1〜R-12 + 索引で 250 行以内へ。
- **自動化**: `scripts/docs-lint.mjs` の `checkRuleDocsLineLimit()` で行数上限を error 検出。

### R-25. ADR Decision と実コードの整合性チェック (spec-code drift)

- **ルール**: ADR の Decision で具体的な技術仕様 (DB schema、SDK バージョン、tokenize オプション等) が書かれている場合、実装着手前 + Phase 完了前に該当ファイルを Read + grep で ADR と整合確認する。テストや CI 緑だけでは drift 検出できない。さらに **ImageMagick RMSE / CI / lint 等の機械的検証ツール合格だけで「達成 / 完遂」 と判定してはいけない。最終判定は Claude Read による目視評価 (構造系 4 項目: タブ構成 / セクション構成 / UI 種別 / スクロール範囲) が必須**。
- **根拠**: 2026-05-03 セッションで `events_fts` の `tokenize="trigram"` (実コード) と ADR-0008 §4.3.4 の `tokenize='trigram remove_diacritics 1' detail=column` (仕様) の乖離を発見。2026-05-11 セッションで ImageMagick RMSE 22249 (5.4% 改善) のみで bonsai-detail 達成と判定したが、ユーザー指摘で構造的大差 (read-only vs 編集 form / list vs timeline) を見逃していたことが発覚 (Issue #439-#441 再起票、PR #442 で運用切替)。
- **自動化**: `.claude/hooks/check-structure-eval-before-skiplist-update.mjs` で skip-list.json 編集時に構造系 4 項目キーワード未含有を block。`.github/pull_request_template.md` §7.6 で PR description に構造系 4 項目記載を必須化。

### R-26. 外部 Design 部分採用判定時のブランド統一感評価 + 画面マップ必須化

- **ルール**: Claude Design / Figma / Wireframe 等の外部 Design を **部分採用 / 全面採用** 判定する議論で、`/discuss` Skill に **「ブランド統一感」軸** を 4 ペルソナと同列の独立評価軸として必須化。さらに ADR Notes に **「Design 画面 → 実装画面 マップ表」** を必ず記載 (採用しない画面も「不採用」と明記)。
- **根拠**: 2026-05-04 ADR-0019「Claude Design 部分採用」を 35 PR で実装後、2026-05-05 実機検証で user 期待 (100% 採用) と乖離が発覚。原因は (1) 4 ペルソナ評価のみで「アプリ全体のデザイン統一感」を捕捉できなかった、(2) Claude Design の `home-screens.jsx HomeScreen` が実装の「盆栽タブ」に対応するという画面マッピングが ADR Notes に無かった、の 2 点。ADR-0020 で全面採用に切替時に 5 軸評価 + 画面マップ表を実施し全項目 ○ 以上を確認。
- **自動化**: `/discuss` Skill チェックリストに「外部 Design 取込時の 5 軸評価 (4 ペルソナ + ブランド統一感)」「画面マップ表 ADR Notes 必須記載」を追加。`scripts/design-mapping-check.mjs` (将来) で ADR 内マップと Design ファイル名の突合検査。

### R-27. Issue 起票前に既存実装を Explore で確認

- **ルール**: 機能 Issue (`gh issue create`) を起票する**前**に、当該機能名で Explore agent または `grep` で既存実装の有無を確認し、結果を Issue 本文の「既存実装の確認」セクションに必ず貼る。「コンポーネント / DAO / store / hook の有無」「TODO コメントの有無」「Issue スコープ (新規 / 拡張 / バグ修正 / データ問題)」を 4 区分で記載。
- **根拠**: 2026-05-06 セッションで Issue #253 #254 を起票した際、`HomeFilterTabs` (フィルタロジックの TODO のみ) と `BonsaiCard` (実装済み) を見落とし、後で Explore して「実は実装済み」と判明 → #254 close、#253 のスコープを「新規 UI 追加」から「フィルタロジック実装」に修正する手戻りが発生した。同様の事例が 2 回 (#253 / #254 で同時に発生)。
- **自動化**: `.github/ISSUE_TEMPLATE/feature_request.yml` の `existing_implementation_check` セクションを `required: true` で構造的強制。さらに `report.ts` (UI diff レポート) のテンプレに「データ問題 vs 実装問題の判別フロー」を組み込み (ADR-0021 §Acceptance、本セッション PR で実装)。

### R-28. UI 表現 vs ビジネス仕様 の境界判定フロー

- **ルール**: Design / OpenDesign 出力を採用する際、以下のフローで「UI 表現」「ビジネス仕様」のどちらに該当するか判定し、適切な SoT (R-16) に従う:
  1. **法令 / プライバシー / 利用規約 / ストア審査関連?** (ATT / UMP / IAP / GDPR 等) → **ビジネス仕様 → ADR 絶対上位**
  2. **機能の有無 / Free vs Pro 区分 / 課金プラン?** → **ビジネス仕様 → ADR**
  3. **データ送信 / DB 構造 / API 連携?** → **ビジネス仕様 → ADR**
  4. **A11y / WCAG / コントラスト / タップ領域?** → **ADR + design_system.md** (verify:a11y で自動検証)
  5. **モーション / 触覚 / 効果音 / 通知音?** → **ADR + design_system.md** (OpenDesign 範囲外)
  6. **タイポグラフィ詳細 (フォント / サイズ / 行間)?** → **ADR + design_system.md**
  7. **上記いずれにも該当しない** (見た目 / レイアウト / コピー / コンポーネント形状)? → **UI 表現 → OpenDesign が正、ADR Notes 画面マップは追従更新**
- **更新フロー**:
  - **UI 表現変更**: 軽量プロセス (1 PR で ADR Notes 画面マップ + 実装変更、R-17 4 段階は適用しない)
  - **ビジネス仕様変更**: R-17 4 段階厳守 + 新 ADR 起票
- **根拠**: 2026-05-07 議論で「PaywallScreen CTA 文言」「Empty state コピー」等 UI / ビジネス境界が曖昧な領域が判明。判定フロー明文化で「OpenDesign 9 割 UI 採用」方針と「F-10 撤回リスク」を両立。
- **自動化**: `.claude/hooks/session-start-design-reminder.mjs` で R-28 判定フローを併せて注入。`/discuss` Skill チェックリストに R-28 を追加。

### R-29. 写経駆動開発の強制 (5 段階チェックリスト)

- **ルール**: 各 PR で mockup integration を行う際、以下 5 段階を必ず実施。PR 本文の checklist で確認:
  1. **mockup の該当 jsx component を完全 Read** (file path + 行範囲を PR に明記)
  2. **mockup の該当画面スクショを Read** (`docs/mockups/v1.0/screenshots/<id>.png`、T1-2 で生成済)
  3. **既存 RN 実装ファイルを Read** (R-18 の延長)
  4. **実装後、RN スクショを撮影** (実機 / Web / アタッチメント)
  5. **mockup スクショと RN スクショを並べて Read で目視比較** → 整合性レベル明記 (`docs/reference/integration-criteria.md` 参照)
- **整合性レベル要求**: レベル 2 (見た目 80% 一致) 以上で「整合済」マーク (将来レベル 3 へ)
- **根拠**: 2026-05-10 セッションで PR #341/#342/#350 を「整合済」マークしたが、実機画像比較で乖離 (チェックマーク未表示 / SelectionToolbar 未表示 / FAB 連動失敗 / 「N件選択中」未表示) が発覚。「視覚確認ループ無し」+ 「整合済の定義不在」が根本原因。
- **自動化**: `.github/pull_request_template.md` で 5 段階チェックボックス強制 (T1-3)。`docs/reference/integration-criteria.md` でレベル定義 (T1-1)。

### R-30. 外部 lib のテスト stability 変更時 PoC 必須化

- **ルール**: 外部ライブラリ (Maestro / Detox / @gorhom 等 testing 関連) の変更・置換・削除を伴う移行 + ui-diff flow の R-25 再評価は、本実装前に PoC で **2/2 = 100% 厳格基準** で実証する (2026-05-13 user 指示で 3 → 2 短縮、2026-05-12 retro で 5 → 3 短縮の更新)。PoC 不合格時は plan B / plan C を ADR で先確定。
- **根拠**: 2026-05-12 セッションで Phase G (@gorhom 全廃) 設計時、過去 PR #404/#415 で `waitForAnimationToEnd` 追加実装も `home-bulk-sched-date` の Maestro skip が解消せず永続化した経緯あり。実証なしに移行すると同じ失敗を繰り返すリスクが高い。2026-05-13 P3 セッションで 2 回反復で十分との user 判断、検証時間 33% 削減 + ループ高速化。
- **自動化**: ADR-0024 Phase G 完了後に lint rule 起票 (PR タイトルに `@gorhom`/`detox`/`maestro` 等 + `remove`/`replace` を含む場合、ADR 先行原則 + PoC 2/2 結果リンクを必須化)。S5 iteration consistency lint で R-30 baseline 自動チェック。

### R-31. Maestro flow 新規作成時の事前 testID 検索 + template 使用

- **ルール**: 新規 `maestro/flows/*.yml` 作成時、必ず以下を実施:
  1. 関連画面の testID 事前 grep (`grep -rn 'e2e_' app/<screen>/ src/features/<feature>/`)
  2. `maestro/flows/_template.yml` をコピーして start (`cp maestro/flows/_template.yml maestro/flows/<new>.yml`)
  3. 標準 step 順序を維持 (launchApp → pressKey:Back → extendedWaitUntil → 固有手順)
  4. `tapOn: text: '...'` 禁止 (testID 経由のみ、TabBar 「設定」 text tap で Developer Menu 誤起動回避)
- **根拠**: 2026-05-12 セッションで testID 確認を後回しにし、6 段階の試行錯誤で 1 時間ロス (R-9 violation)。`text: '設定'` tap で Expo Dev Client Developer Menu が誤起動した事例あり。
- **自動化**: `.claude/hooks/check-maestro-flow-creation.mjs` で PreToolUse Write at `maestro/flows/*.yml` を hook、禁止パターン (text tap / 誤 appId) 検出で exit 2 block。`scripts/lint-maestro.mjs` で CI 強制 (pnpm verify:maestro-lint)。

### R-32. commit 直前の git diff --cached 目視 + 議論修正項目の inclusion verify

- **ルール**: `git commit` 実行直前に必ず以下を実施:
  1. `git diff --cached --stat` で staged ファイル一覧を確認
  2. `git diff --cached <file>` で議論で修正したと記憶している箇所が **本当に staged に含まれているか**目視
  3. 議論で「Edit した」 と認識している修正が staged に無い場合、`git restore` 等で revert された可能性 → 再 Edit してから commit
  4. 修正規模が大きい時は `git diff --cached --stat` の inserts/deletes 数が議論内容と乖離してないか確認
- **根拠**: 2026-05-17 Sess2 で `app.config.ts` の `showFloatingButton: false` → `toolsButton: false` 修正を実行 (Edit) したが、その後の議論段階で `git restore` で revert され、最終 commit には反映されず main に残った。Sess4 で実際に Dev Build install して初めて発覚、デバッグに数時間ロス。「Edit したと思い込んでいた」 が「commit には含まれてない」 という認知バイアスを構造的に防ぐ必要あり。
- **自動化候補**: `.claude/hooks/pre-commit-staged-verify.mjs` で `pre-commit` git hook 経由 (`.githooks/`)、staged file list と commit message keyword の整合チェック (例: commit message に「toolsButton」 含まれるなら app.config.ts に該当 keyword の staged diff 必須)。Sess5+ で実装。

### R-39. useFocusEffect callback での関数呼出時 deps 必須 + store-callback chain 限定用途 (Sess19 ADR-0031 D5 由来)

- **ルール**:
  - **R-39.1**: `useFocusEffect(React.useCallback(() => { ... }, [deps]))` の callback 内で「コンポーネント scope の関数」 を呼ぶ場合、 useCallback deps 配列に **必ず含める** か、 useEvent / useRef pattern を使う
  - **R-39.2**: `// eslint-disable-next-line react-hooks/exhaustive-deps` コメントは **禁止**、 例外は ADR 起票して明文化
  - **R-39.3**: store-callback chain (`setX + router.back() + caller useFocusEffect で consume`) は ADR-0030 Case A (dialog 起動) + Case B (state 更新のみ) のみ許容。 「次の画面に進む / DB に書込む」 用途は **直接 await + router.replace / router.push** 必須 (ADR-0031 Case 4 で log mode form 保存後遷移 pattern を確立)
  - **R-39.4**: grep-based 検出: `scripts/check-navigation-patterns.mjs` AP-3 (Sess19 PR-7 で追加) で warning。 将来 ESLint AST rule 化
- **根拠**: 2026-05-21 Sess19 実機検証 (8 試行 100% 再現) で発覚。 Sess16-18 で 53 PR 投下した form 改修中、 Single 動線の DB 書込が **stale closure で完全失敗** していた。 `app/(tabs)/bonsai/[id]/index.tsx` の useFocusEffect callback が `useCallback(..., [handleSchedulePickerSelect])` で memoize、 `persistEventWithPayload` 関数を closure 経由で呼ぶが、 callback memo 化により **初回 mount 時の関数 reference (item=null) を永続保持** → `if (!item) return;` で静かに早期 return → DB 書込スキップ。 ESLint exhaustive-deps disable + メンタル契約で構造的破綻、 Maestro flow にも DB 反映 assertion が無く 53 PR 通過。 ADR-0031 で path 変更 (直接 await + router.replace) + 本 R-rule で構造防止。
- **自動化**: `scripts/check-navigation-patterns.mjs` AP-3 で `useFocusEffect.*useCallback.*persist|countSameDay` pattern を grep-based 検出、 warning 出力 (Sess19 PR-7 で追加)。 PR テンプレ §7.6.4 で navigation 変更 PR の DB 反映 manual 検証 SS 添付必須化 (Sess19 PR-7)。
- **関連**: ADR-0030 (Navigation patterns Case 分類) / ADR-0031 (Sess19 カレンダー統一 + stale closure 撲滅) / `scripts/check-navigation-patterns.mjs` / Sess19 retro

---

### R-33. route / Phase 変更時の影響範囲全網羅 grep (廃止 route 構造的検出)

- **ルール**: route (e.g., `/(tabs)/<name>` / `/<route>`) や Phase / 構造を変更する PR では、 以下を必ず実施:
  1. **事前 grep**: 廃止予定の path / testID / component 名で `grep -rn '<pattern>' --include="*.tsx" --include="*.ts" --include="*.yml" --include="*.json"` を全網羅実行
  2. **影響範囲を PR 本文 §11「影響範囲全網羅 grep 結果」 に記載**: 全 hit を列挙、 修正済 / 修正不要 の判断を明記
  3. **`scripts/obsolete-routes.json` に新 entry 追加**: 廃止 route を構造管理、 `.claude/hooks/check-obsolete-routes.mjs` (Sess8 Retro S-2) が Edit/Write 時に block
  4. **計画段階で「N 件」 と楽観計上禁止**: 実 grep を先に走らせて確定数を出す
- **根拠**: 2026-05-17 Sess7 PR-1 (#543) で settings タブ → `app/settings/` 移動時、 (1) `SearchHeader.tsx:138` の `router.push('/(tabs)/settings')` 古い path 残存、 (2) `look-back/index.tsx:81` の `showSettings={false}` (歯車不表示)、 (3) Maestro flow 14 個と計画したが実 grep で 19 個と判明 = 計 3 件の漏れ。 Sess8 PR-1 (#545) で hotfix。 同種の path 漏れは Phase 1b 系で多発リスク。
- **自動化**:
  - `.claude/hooks/check-obsolete-routes.mjs`: Edit/Write 前に対象 file 内の廃止 route hit で block (S-2)
  - `scripts/obsolete-routes.json`: 廃止 route を一元管理 (新規 entry 追加 → 全ファイル grep 自動 block)
  - `.github/pull_request_template.md` §11: route / Phase 変更時の全網羅 grep 結果記載を必須化 (S-3)

---

### R-40. i18n Phase H2 翻訳適用前の glossary.md Read 義務 (Sess20 ADR-0033 D3 由来)

- **ルール**: i18n Phase H2 翻訳適用 PR (画面別 17 言語翻訳適用、 PR-H2-1 〜 PR-H2-7) 着手前に `docs/reference/glossary.md` を必ず Read。 各言語プロペルソナ手動翻訳時、 glossary 概念定義 + 翻訳禁止リスト (bonsai/niwaki/karikomi/nebari/jin/shari/kokedama/yamadori/mame/shohin/akadama/kusamono/sabamiki/bunjin/ishizuki 計 15 語) を厳守。
- **根拠**: 2026-05-21 Sess20 議論で確認。 Crowdin / Lokalise 2026 業界 standard で「Glossary 早期構築 + 厳守」 が大規模 i18n の最重要 best practice。 「同概念 3 種類の用語」 worst pattern を構造的回避。 user 真意「18 言語手動翻訳」 (ADR-0033 D1) と整合。
- **自動化**: `scripts/i18n/apply-translation.mjs --glossary docs/reference/glossary.md` (PR-0-2 で追加) で翻訳禁止リスト違反を warn。 Phase 2 で glossary.md 全文 parse 拡張予定。
- **関連**: ADR-0033 D3 (glossary 厳守) / `docs/reference/glossary.md` (用語集 19 言語統一表記) / `scripts/i18n/apply-translation.mjs` (PR-0-2 で昇格) / Crowdin 2026 best practice

---

### R-41. user 視覚部分の直書きハードコード禁止 (Sess20 ADR-0033 D2 由来)

- **ルール**: 以下 pattern の user 視覚 string は i18n key 化必須、 直書き hardcode 禁止:
  - JSX text 内日本語: `>[ぁ-んァ-ヶ一-龯][^<]*<`
  - props string literal 日本語: `title|headerTitle|label|placeholder|message|accessibilityLabel|aria-label|alt|subtitle|caption|hint` 等の prop key で日本語 literal
  - `Alert.alert\(` 第 1/2 引数 + `Snackbar.show\(` + `Toast.show/success/error/info/warn\(` の user 表示 string
  - **除外**: console.log/warn/error/info/debug, `__DEV__` 内ブロック (簡易 brace tracking で検出), Sentry tag, `test/__tests__/`, `*.test.ts(x)`, `src/core/i18n/locales/`, `scripts/`, `docs/`
- **根拠**: 2026-05-21 Sess20 user 追加指示「直書きハードコードは無くしていきましょう」。 Sess19-4 PR-T1a (#690) 完遂後も Stack header 11 件 (modals/_layout.tsx 7 + bonsai/_layout.tsx 3 + plan/_layout.tsx 1) の日本語直書きが残存、 18 言語切替で ja 以外でも日本語表示 = user 信頼喪失。 「注意ではなく構造で防ぐ」 (CLAUDE.md §9 記憶の昇華ルール) 準拠で PreCommit hook + lint:hardcode 機械検証。
- **自動化**:
  - `scripts/check-hardcode-strings.mjs` (Sess20 PR-0-3) で grep-based 検知、 violation あれば exit 1
  - `pnpm lint:hardcode` script 経由
  - Phase H1 完了 (PR-H1 で 11 件全 fix) 後、 `pnpm verify` に組込 + `.githooks/pre-commit` 連動 (PR-H1 完了 commit に含める or 別 PR)
  - `--json` mode で CI 連携可能
- **関連**: ADR-0033 D2 (直書き禁止) / `scripts/check-hardcode-strings.mjs` (PR-0-3 新規) / Sess20 PR-H1 (11 件全件 i18n key 化) / Phase 1 explore agent 報告

---

### R-42. 色で意味を伝える UI は アイコン or pattern を必ず併用 (WCAG 1.4.1 Level A、 Sess22 ADR-0034 D3 由来)

- **ルール**: 状態 (planned/logged/error/warning/success) や severity を **色のみ** で識別する UI 設計禁止。 必ずアイコン形状 (●/○/✓/!) or pattern (縞模様/斜線) で重複表現。 既存「色のみ」 識別 UI を新規発見時は ADR で受容 (色覚不要層対象 + grayscale 視認性確認済の場合のみ) or 改修 PR 起票
- **根拠**: WCAG 2.1 SC 1.4.1 Use of Color (Level A、 必達)。 色覚多様性 (赤緑色覚異常 = 男性 8%、 女性 0.4%) + シニア老眼 + 屋外モード + ダークモードで「緑/茶」 等の色相差は識別困難。 Sess22 ADR-0034 D3 で planned/logged dot (緑/茶) が色のみ識別 = WCAG 違反確証 → ●filled / ○outline アイコン併用に改修。 業界 1 次情報 ([UX Patterns Dev Calendar](https://uxpatterns.dev/patterns/data-display/calendar)) 整合
- **自動化**: 当面 code review + ADR-0034 D3 整合 grep。 Phase ε 検討: `scripts/a11y-contrast-check.mjs` を `scripts/a11y-check.mjs` に拡張し AST grep で「色のみ識別」 pattern 検出 (e.g., `styles.<state>: { color: <COLOR> }` で対応 icon component 不在)
- **関連**: ADR-0034 D3 (本ルール由来) / ADR-0032 D1 Notes Amended (色のみ → 色+アイコン併用) / `src/features/plan/CalendarDot.tsx` (実装) / WCAG 2.1 SC 1.4.1

---

### R-43. business operation 単位の transaction helper 必須 (Sess23 ADR-0035 D7 由来)

- **ルール**: 1 業務操作で複数 DB 書込 (例: 「予定→記録変換」 = softDelete + createEvent + FTS5 同期) を扱う場合、 必ず単一 `db.withTransactionAsync(async () => { ... })` で wrap。 sequential `runAsync` での「成功半分 + 失敗半分」 状態を構造禁止 (SQLite ACID 保証)。 単独 API (例: `softDeleteEvent` / `createEvent`) を組合せて呼出側で transaction 制御は **NG**、 必ず business operation 専用 helper を提供
- **根拠**: Sess23 ADR-0035 D7 で「予定→記録変換」 = 2 操作の部分失敗時にデータ整合崩れ (元 planned が softDelete されたが新 logged の createEvent 失敗 → user データ消失)。 `src/db/photoRepository.ts` L291/311/335 で同 pattern 既存使用済、 eventRepository.bulkLogEvents (Promise.allSettled) は **個別 transaction** で「業務操作 = bulk 全体」 ではないことを明記
- **自動化**: 当面 code review + ADR-0035 D7 整合 grep。 Phase ζ 検討: ESLint AST rule 化
- **関連**: ADR-0035 D7 / `src/db/eventRepository.ts` convertPlannedToRecorded / `src/db/photoRepository.ts` (前例)

---

### R-44. 破壊的操作 = ConfirmDialog + 通知 Toast 必須 (Sess25 ADR-0036 由来、 Sess27 緩和)

- **ルール**: 破壊的操作 (delete / archive / clear / purge) を実装する場合、 以下 2 件必須:
  1. **`<ConfirmDialog>`** (`src/components/ConfirmDialog.tsx`) で 確認 → OS 標準 `Alert.alert` 不採用 (アプリ世界観統一)。 title は question form (Apple HIG)、 desc は **optional** (即削除前提では省略推奨、 ADR-0036 D4)
  2. **通知 Toast** (`src/components/Toast.tsx` 既存 `Toast.show()` helper) で 実行直後に「{処理} を実行しました」 表示 (Material 3 Snackbar 表示時間 default 3s)。 user に操作完了を視覚通知。 ※ **Undo (元に戻す) action は不要** (Sess27 user 真意「即削除でシンプル、 Undo button は WCAG 違反 + 貫通 bug の温床」、 DB 30 日 soft delete が誤削除保険として機能)
- **根拠**: Sess23 ADR-0035 D3「個別 row 削除のみ」 scope 限定 → Sess25 実機検証で group 100 鉢誤削除リスク (R6) v1.0 release blocker 確証。 Sess27 実機検証で UndoSnackbar の Critical bug 2 件 (hit area 86×22px WCAG 違反 + pointerEvents=box-none で背後 row 貫通 → Undo 失敗 → 別画面遷移 → データロス) 判明 → user 判断「Undo button 撤廃 + 通知 Toast のみ」 で R-44 緩和、 DB 30 日 soft delete を真の誤削除保険として位置付け
- **自動化**: ✅ **Sess26 PR-η-3 完遂** — `scripts/check-destructive-undo.mjs` で `bulkSoftDeleteEvents` / `softDeleteEvent` / `purgeOldTrash` / `deleteEventHard` / `restoreEvents` callsite が **同 file 内 `Toast.show()` 併用** されているか grep 検証 (Sess27 PR-7 で `showUndoToast` から `Toast.show` に検証対象変更)。 `pnpm lint:destructive-undo` で実行、 違反時 exit 1。 除外: `src/dev/` (seed) / `src/db/` (実装) / `src/services/` / `src/features/notification/` (wrapper) / test ファイル
- **関連**: ADR-0036 D1/D4/D5 (本ルール由来、 D5/D6 は Sess27 撤回) / `src/components/ConfirmDialog.tsx` / `src/components/Toast.tsx` / Material 3 Snackbar

---

### R-45. 長押し UX 標準 = Haptics 必須 + delayLongPress 500ms (Sess25 ADR-0036 由来)

- **ルール**: `Pressable onLongPress` を使う全 component で以下を必須:
  1. **`expo-haptics.impactAsync(ImpactFeedbackStyle.Medium)`** を `onLongPress` callback 内で 実行直前に発火 (触覚 fb で長押し中認識補助)
  2. **`delayLongPress` default 500ms** 維持 (Material 3 標準 + iOS HIG「Long Press」 整合)、 短縮禁止
  3. 破壊的操作の場合は ConfirmDialog 表示時に 80ms フェードイン (Material 3 Motion duration)
  4. 削除実行時 `Haptics.notificationAsync(NotificationFeedbackType.Warning)` で 2 段目の触覚 fb
- **根拠**: 視覚 fb (背景色変化) のみだと指で隠れて user が長押し中を認識できない。 触覚 + 視覚 + 聴覚 (OS 任意) 3 chan feedback で UX 標準。 Sess25 議論で「長押し UX 標準」 未整備が判明、 design_system.md §18 に SoT 化
- **自動化**: 当面 code review + design_system.md §18 整合 grep。 Phase ζ-3 検討: ESLint rule 化 (`onLongPress` 検出時に `Haptics` import + invocation を check)
- **関連**: ADR-0036 D6 (本ルール由来) / `docs/reference/design_system.md` §18 / `expo-haptics` (既存依存) / Material 3 / iOS HIG「Long Press」

---

### R-47. Navigation 改修時の Material 3 / iOS HIG anti-pattern check (Sess29 ADR-0038 由来)

- **ルール**: tab / stack navigation を改修する PR では、 以下 7 項目の anti-pattern を **議論段階で必須チェック**:
  1. **タブハイライト整合**: tap したタブが必ずハイライト (preventDefault + router.push の anti-pattern 禁止)
  2. **タブ名 ↔ タブ内 主要 CTA (FAB) 動作 整合**: タブ名が「記録」 なら FAB は「記録」 系 flow、 「予定」 なら「予定」 系 flow
  3. **タブ tap の冪等性**: 同じタブ複数回 tap で挙動破綻なし
  4. **戻る動作整合**: navigation back button + 画面端 swipe gesture 両方で意図通り
  5. **deep link 整合**: URL から直接到達した時に正しい tab がハイライト
  6. **state 復元**: タブ切替で前回 state が復元される (R-30 PoC pattern 整合)
  7. **lazy mount 整合**: 初回 tap で mount される screen が他 tab に影響しない
- **根拠**: Sess23 ADR-0035 D6 で「タブ名 ↔ FAB 動作 整合性」 (項目 2) を見落とし、 Sess29 で user 指摘「予定と記録 2 つ用意している意味が無い」 「疑問に思えよ」 で顕在化。 6 専門家評価で UX/UI デザイナー視点でも見落とされる pattern。
- **自動化**: 当面 code review + 議論 template `/discuss` skill 拡張で必須 question 化。 Phase Future: ESLint custom rule で `<Tabs.Screen listeners={{ tabPress: handler }}>` の preventDefault + router.push を warning 化
- **関連**: ADR-0038 (本ルール由来) / ADR-0025 §② / ADR-0035 D6 Notes Amended / Material 3 Navigation bar / iOS HIG Tab Bars / WAI-ARIA Tab Pattern

---

### R-49. 議論時の説明品質 Self-check 必須 (Sess30 retro 由来)

- **ルール**: `/discuss` モード中、 user に `AskUserQuestion` を投下する前に以下 **6 項目 Self-check** を必須実施。 1 つでも違反があれば AskUserQuestion を取り下げて再構築:
  1. **専門用語訳**: ADR-XXXX / R-XX / 案 A-1/B-Y / § 等の参照記号には**中学生でもわかる併記**を付ける (例: 「ADR-0035 D6 (= 1 ヶ月前の決定)」)
  2. **図解 or 例え**: 構造を持つ概念 (タブ動線 / カレンダー / button 配置) は ASCII 図 or 物理世界の例え (リモコン / ノート / 押し入れ等) で補強
  3. **選択肢ラベル長**: 各選択肢の label は **80 文字以内**、 description は 150 文字以内 (読みやすさ確保)
  4. **記憶前提排除**: 「過去セッションで既に提示した A-2 案」 のような **user が記憶していない前提**で質問しない、 毎回その質問内で完結する説明
  5. **clarify オプション提示**: 質問の最後に「**分かりにくい点を教えてください**」 を必ず添える (user 退路確保)
  6. **判断材料の明示**: description で **メリット / デメリット / 推薦理由**を 1 文ずつ明示
- **トリガー**: user が `AskUserQuestion` 応答で **「clarify したい」「全く理解できない」「もっと簡単に」 のいずれかを 1 回でも発した時点で即時 Self-check 起動**、 説明品質に問題ありとして仕切り直し
- **根拠**: Sess29 議論で「A-1/A-2/A-3」「B-X/B-Y/B-W」 等の記号 + ADR-0035 D6 / R-47 等の専門用語を多用、 user が clarify 要求を **3 回繰返** → 議論ロス約 30 分。 user instructions (CLAUDE.md「中学生にもわかる」) を agent が議論モードに入ると逸脱する認知バイアス
- **自動化**: ✅ **Sess30 PR-5 完遂** — `scripts/check-discuss-jargon.mjs` で議論文 (file or stdin) を解析、 7 種の参照記号 pattern (ADR-XXXX / ADR-XXXX D-X / R-XX / §N / 案 X-Y / SessN / PR #N) を grep し、 周辺 ±80 文字に併記表現「(= ...)」「= ...」 等の有無を判定。 違反 3 件以上で exit 1 (CI ブロック)。 `pnpm lint:discuss-jargon <file>` or `cat draft.md | pnpm lint:discuss-jargon` で実行、 `--json` で JSON 出力 (CI 連携)。 unit test 10 件で構造保証 (`__tests__/scripts/check-discuss-jargon.test.js`)。
- **使用例 (議論時 self-check)**: AskUserQuestion 投下予定の text を一時 file に保存 → `pnpm lint:discuss-jargon /tmp/q.md` で違反検出 → 違反箇所に「(= 中学生語訳)」 を併記 → 再実行で 0 件確認 → 投下
- **関連**: Sess30 retro `docs/reference/tasks/lessons/sess30-retro.md` / `~/.claude/CLAUDE.md` (中学生レベル説明 user instructions) / `/discuss` skill template (Sess30 別作業で本ルール組込) / `scripts/check-discuss-jargon.mjs` (本 PR で実装)

---

### R-48. CTA button design 整合 (Sess29 ADR-0038 由来)

- **ルール**: CTA (Call-to-Action) button を実装する際、 `docs/reference/design_system.md` §22 (ボタン pattern SoT) の 4 階層 (Primary / Secondary / Tertiary / Destructive) のいずれかに従う。 ad-hoc な色・サイズ・配置を禁止:
  1. **Primary**: BRAND_GREEN filled + ON_BRAND text (例: 保存 / アーカイブ)
  2. **Secondary**: BUTTON_SECONDARY_BG filled + BUTTON_SECONDARY_TEXT (例: 作業を記録 / 全 N 件を記録)
  3. **Tertiary**: text link 風 (透明背景 + BRAND_GREEN text、 例: 戻る)
  4. **Destructive**: DANGER 系 (例: 削除 / アーカイブ ※破壊的)
- **根拠**: Sess28 PR-5 で「×n バッジ」 は BADGE_SOFT に統一したが、 同じ世界観違反 (BRAND_GREEN ベタ + 白文字) を持つ「作業を記録」 button が射程外で取り残された。 Sess29 user 指摘「色合い的に強調しすぎ」 + 「アプリのデザインに合致するように」。 業界標準 (Material 3 filled) をそのまま和風 BonsaiLog に適用する固定観念が原因。
- **自動化**: 当面 code review + design_system §22 整合 grep。 Phase Future: ESLint custom rule で `backgroundColor: BRAND_GREEN` + `color: ON_BRAND` の組合せを Primary CTA file (allow list) 以外で warning 化
- **関連**: ADR-0038 (本ルール由来) / `docs/reference/design_system.md` §22 / `src/core/theme/colors.ts` (BUTTON_SECONDARY_BG/TEXT) / Material 3 Buttons / Apple HIG Buttons

---

### R-46. キーボード被り完全対処 = KAV + ScrollView auto-scroll の **2 点セット**必須 (Sess28 起票、 Sess31 拡張、 Sess32 v3 拡張、 Sess33 v4 拡張)

- **ルール (Sess33 v4 拡張)**: フォーム input を含む全 screen / modal で **2 点セット**を必ず実装。 input の位置 (末尾 / 中盤) に応じて auto-scroll の手段を **2 タイプ使い分け** + **logcat / Console Error 検証強制**:

  1. **KAV (KeyboardAvoidingView)**: `useKeyboardAvoidingProps()` を利用、 `<KeyboardAvoidingView {...kavProps}>` で展開。 **KAV は container 高さを縮めるのみ**。
     - iOS: `behavior='padding'`、 offset = `useHeaderHeight()` 動的取得
     - Android: `behavior='height'`、 offset = 0、 windowSoftInputMode=adjustResize と協調
  2. **ScrollView auto-scroll** (input 位置で **2 タイプ使い分け**):
     - **タイプ A (末尾 input)**: ScrollView 末尾配置 input は `scrollRef.current?.scrollToEnd({ animated: true })` で OK。 例: BonsaiCreateScreen / WorkLogConfirm / bonsai-detail 基本情報タブ
     - **タイプ B (中盤 input)** (Sess33 v4 で UIManager API に変更): ScrollView 中盤配置 input (後ろに他フィールドあり) は **`findNodeHandle` + `UIManager.measureLayout`** で精密 scroll 必須。 例: BulkLogConfirmScreen (メモ欄の後に写真フィールド)。
       ```tsx
       import { UIManager, findNodeHandle, TextInput } from 'react-native';
       const inputRef = React.useRef<TextInput>(null);
       const handleFocus = () => {
         setTimeout(() => {
           const scrollNode = findNodeHandle(scrollRef.current);
           const inputNode = findNodeHandle(inputRef.current);
           if (scrollNode == null || inputNode == null) {
             scrollRef.current?.scrollToEnd({ animated: true });
             return;
           }
           UIManager.measureLayout(
             inputNode, scrollNode,
             () => scrollRef.current?.scrollToEnd({ animated: true }), // onFail
             (_x, y) => scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true }), // onSuccess
           );
         }, 350);
       };
       ```
     - ❌ **禁止**: `inputRef.current?.measureLayout(scrollNode, success, fail)` — forwardRef 経由 ref では「native component ref」 として認識されず Console Error `ref.measureLayout must be called with a ref to a native component.` (Sess32 PR-1 から Sess33 PR-2 hotfix で発覚)
     - 共通 component (`LabeledTextInput`) は `forwardRef<TextInput>` 化 + `onFocus?` prop expose で両タイプ対応 (Sess32 PR-1)

- **検証必須項目 (Sess33 v4 追加)**:
  - ✅ SS: タイトル / chips / フォーム要素が ScrollView 内に統合 (sticky 要素は FormScreenHeader のみ)
  - ✅ SS: IME 起動時にメモ欄 / 末尾 input が画面内 visible
  - ✅ **logcat**: `adb logcat -d -t 500 | grep -iE "ERROR|Warning|Exception|measureLayout"` で アプリ関連 0 件確認
  - ✅ **Dev menu Console**: Error 0 件 (赤バー非表示) — SS のみ確認は禁止 (Sess32 検証漏れの教訓)

- **根拠 (Sess30 retro → Sess31 構造化)**:
  - Sess15 PR-TT で `behavior={Platform.OS === 'ios' ? 'padding' : undefined}` (Android で KAV 無効化 anti-pattern) → Sess28 で user 報告で顕在化
  - Sess28 PR-2/3 で KAV 共通 hook 化、 全 form 適用 → 「対応完了」 判定
  - **しかし KAV は container 縮小のみ機能、 ScrollView 内部の auto-scroll は別途配線必要**だった (React Native 公式 docs `<KeyboardAvoidingView>` Note: This component will not adjust the scroll position」、 1 次情報未参照で見落とし)
  - Sess30 実機検証で BulkLogConfirmScreen メモ欄が IME に隠れる事象を再発見、 真因「KAV + auto-scroll の 2 点セット必須」 を Sess31 で構造化

- **自動化**:
  - ✅ Sess28: `KeyboardAvoidingView` 直接利用検出 (R-46 v1、 hook 強制)
  - Future Work: `scripts/check-form-keyboard.mjs` で「multiline TextInput + KAV + ScrollView ref + onFocus 配線」 の **4 点 grep** (R-46 v2 = Sess31 起票候補)

- **関連**: ADR-0037 D1 (本ルール v1 由来) / Sess30 retro `docs/reference/tasks/lessons/sess30-retro.md` (Sess31 拡張根拠) / `src/core/hooks/useKeyboardAvoidingProps.ts` / `src/components/form/LabeledTextInput.tsx` (Sess31 PR-1 で `onFocus` prop 追加) / `docs/reference/design_system.md` §21 / Android `windowSoftInputMode=adjustResize` / React Native `<ScrollView>` 公式 docs (`scrollToEnd`)

---

### R-50. 機能削除前に cross-feature import 検査 (Sess31 ADR-0039 由来)

- **ルール**: 機能 (feature) フォルダの中身を削除する PR を起こす前に、 削除対象フォルダ内の **export を `grep -rn '<exportName>' --include='*.ts*'` で他機能利用検査** すること。 1 件でも越境ヒット (cross-feature import) があれば、 **shared util を別 module に分離する PR を先行** させ、 削除 PR は「削除のみ」 の安全 diff に保つ。
  - 違反例 (Sess31): `src/features/watering/wateringHeatmap.ts` に `toLocalDateKey` 等 shared util が同居していた状態。 `dotsByDay` / `groupContinuousEvents` / `cardDataBuilder` / `CalendarTabScreen` / `notification/*` の **10 箇所が cross-feature import** していた → ヒートマップ削除を 1 PR でやると予定タブ / 記録タブ / 盆栽カード / カレンダー / 通知が **連鎖崩壊** する構造リスク。
  - 正しい対応 (Sess31 採用): PR-A (#773) で `dateUtils.ts` に shared util を分離 + 後方互換 re-export + import 切替 (挙動変更ゼロ refactor) → PR-B で機械的削除のみ。
- **根拠**: Sess31 計画議論で QA / テックリード両者が「リスク #1 cross-feature 連鎖崩壊」 を最重大判定 (発生確率: 中、 影響度: 高、 リスクレベル: 🔴 高)。 「機能フォルダ = 機能境界」 だが「フォルダ内ファイル = 機能内サブ責務」 という暗黙ルールが曖昧で、 汎用 util が機能フォルダに残置されることが構造的に発生する。
- **自動化**: 当面 review 時の手動 grep。 3 回再発したら `scripts/check-cross-feature-imports.mjs` を作成し、 機能削除時に `pnpm lint:cross-feature-imports <path>` で feature フォルダ外への import を検出して exit 1 (ESLint custom rule 化候補)。
- **関連**: ADR-0039 (本ルール由来) / `docs/reference/tasks/lessons/feature-removal-cross-import.md` (詳細 lesson) / Sess31 PR-A #773 (shared util 分離成功事例) / Sess31 PR-B (削除のみの安全 diff 事例)

---

### R-51. フォーム画面は `FormScreenHeader` + full-screen scroll 必須 (Sess33 ADR-0040 由来)

- **ルール**: フォーム画面 (盆栽追加 / 作業記録 / まとめて記録) では以下 4 要素を全部満たすこと:
  1. `Stack.Screen options={{ headerShown: false }}` で Stack header 廃止
  2. `<FormScreenHeader />` を sticky 配置 (戻るボタンのみ、 高さ 56 + insets.top)
  3. 単一 `<ScrollView>` がタイトル / chips / フォーム要素を全部内包 (full-screen scroll)
  4. `useKeyboardAvoidingProps()` で KAV 設定 (R-46 v1 整合)
  - ❌ 禁止: タイトル / chips / Hero を ScrollView の外に sticky 配置 (BulkLogConfirm 旧構造)
  - ❌ 禁止: Stack header + 別の sticky 要素 を併用する二重 header
  - **対象外**: bonsai-detail (詳細画面)、 picker/multi-select modal (選択画面)
- **根拠**: Sess28-32 連続改善で 4 form 画面のキーボード被りを R-46 で個別対応、 Sess33 で「全体スクロール」 user 報告を機に構造ばらつき発覚。 design_system §21 に sticky header の規約なし = 暗黙的実装判断で 4 画面の構造が分岐していた。 ADR-0040 で構造統一を SoT 化。
- **自動化**:
  - ✅ Sess33 P2-2: `scripts/check-form-screen-scroll.mjs` で「フォーム画面 (BulkLogConfirm / BonsaiCreate / WorkLogConfirm) の `Stack.Screen options.headerShown=false` 強制 + `FormScreenHeader` 配置強制」 を grep で検出、 `pnpm verify:form-screen-scroll` 経由で `pnpm verify` に組込。
  - Future Work: ESLint custom rule (eslint-plugin-bonsailog 新設要)。
- **関連**: ADR-0040 (本ルール由来) / R-46 v4 (KAV + auto-scroll 2 タイプ + logcat 検証) / design_system §23 (Form Screen Layout Pattern SoT) / `src/components/form/FormScreenHeader.tsx`

---

## R-52. EventType 追加時 4 同期確認チェックリスト (silent bug 連鎖防止、 Sess34 ADR-0041 由来)

- **適用範囲**: `src/db/schema.ts` の `EVENT_TYPES` に新規 type を追加する時 (例: Sess16 PR-E で `leaf_first_aid` 追加時の変更)。 既存 EventType の payload field 名変更時も同様。
- **必須 4 同期**:
  1. **WorkLogTypeFormFields** (`src/features/event/WorkLogTypeFormFields.tsx`) — form rendering + state schema + `buildWorkLogPayload` の case 追加
  2. **payloadValidator** (`src/features/event/payloadValidator.ts`) — `<EventType>Payload = v.object({...})` schema 追加 + `PAYLOAD_SCHEMAS` mapping 追加。 **新 field 名を schema に必ず記載** (valibot v.object は default で unknown props を **discard** するため、 schema 漏れは silent bug 化、 PR-Q-fix #799 由来)
  3. **buildHistoryChips** (`src/features/event/buildHistoryChips.ts`) — switch case 追加 + fieldLabelKey (`workLog*` 流用) 設定。 exhaustive switch with `never` assertion で compile error 化
  4. **EventIcon** (`src/components/icons/EventIcons.tsx`) — switch case 追加 + 必要に応じて新規 Icon component (Sess34 PR-8b LeafAidIcon 例)
- **任意 同期 (該当時)**:
  - i18n locales — 新規 enum 値ラベル追加 (workLog\* 流用で多くの場合は追加翻訳ゼロ)
  - test 群 — buildHistoryChips.test.ts + payloadValidator.test.ts + EventIcons.test.tsx に新 case 追加 (exhaustive 走査 test で missed sync を build error 化)
- **silent bug 連鎖履歴** (Sess16 PR-E `leaf_first_aid` 追加時 → Sess34 で 3 回連鎖発覚):
  1. buildHistoryChips switch case 欠落 → Phase η PR-2 で fix (chip ゼロ silent bug)
  2. EventIcon switch case 欠落 → Phase θ PR-8b で fix (iconBox 空白 silent bug)
  3. payloadValidator schema 漏れ → PR-Q-fix #799 で fix (valibot strip による payload 消失 silent bug、 5 種別同時発覚: watering / pruning / repotting / pest_control / candle_cut)
  - user 質問「鉢サイズ単位表示」 検証で 3 件目連鎖が発覚、 構造防止必須化
- **構造防止**:
  1. ESLint `@typescript-eslint/switch-exhaustiveness-check` rule (Sess34 PR-13 で有効化) で buildHistoryChips + EventIcon の switch case 漏れを build error 化
  2. exhaustive 走査 unit test (EventIcons.test.tsx の `test.each(EVENT_TYPES)` pattern) で runtime 確認
  3. payloadValidator は valibot v.object 挙動 (default strip) を明示コメント化、 schema 拡張漏れを review で catch
- **検証手順** (新規 EventType 追加 PR レビュー時):
  - [ ] `grep -rn '<new_type>' src/` で 4 file (WorkLogTypeFormFields / payloadValidator / buildHistoryChips / EventIcons) すべてに hit するか
  - [ ] `pnpm test` で exhaustive 走査 test 全 PASS
  - [ ] 実機検証で「row 展開時 chip + iconBox + form 入力 + 保存 / 表示」 すべて動作
- **関連**: ADR-0041 Phase η/θ (Sess34) / Sess16 PR-E (silent bug 起点) / PR-Q-fix #799 (schema 漏れ修正) / design_system §24-5 (EventIcon mapping SoT) / PR テンプレ §7.5 R-25 5 項目目「EventRow 表示モード + sub-layout」

---

### R-53. タブ icon 選定 4 基準 + 重複検出 lint (ADR-0042 D1/D4 由来、 Sess36)

- **適用範囲**: 画面下部 4 タブの icon を **変更・追加** する時 (`app/(tabs)/_layout.tsx` の `tabBarIcon` 変更を伴う PR)。 NavIcons.tsx / EventIcons.tsx の新 icon 追加時も同様。
- **必須 4 基準** (ADR-0042 D1):
  1. **機能整合**: icon が表すメンタルモデルがタブの **全機能** を象徴 (例: 「記録」 = 14 種別記録 → 「水滴」 (1 種別 = watering のみ) は不可)
  2. **重複排除**: NavIcons / EventIcons / 他 icon file で **同名関数を export しない** (`scripts/check-icon-duplication.mjs` で CI 強制、 Sess36 PR-5)。 用途が異なる類似 icon (例: 水滴) が必要なら別名 (例: NavIcons は `WaterDropletIcon`、 EventIcons は `DropletIcon` のまま) で区別
  3. **4 ペルソナ ✕ なし**: `docs/reference/personas.md` 4 名全員で ✕ がない (1 名でも ✕ なら再検討、 R-10 整合)
  4. **mockup 整合 or 上書き明示**: `docs/mockups/v1.0/wireframes/*.jsx` HI.\* との整合が原則、 上書き時は ADR で理由明示 (ADR-0042 D2 が該当)
- **根拠**: Sess36 ADR-0042 議論で発覚した「記録タブ icon = 水滴」 (EventIcons watering icon の size override 兼用) で「記録 = 水やり専用」 と新規ユーザーに誤認させる機能整合性 bug。 加えて Explore agent 報告の事実誤認 (「NavIcons に DropletIcon あり」 と誤認 → 実際は EventIcons 兼用) が PR-1 起票後に判明、 ADR Notes Amended で訂正した経緯。 lint 自動化で人力 review 依存から脱却。
- **自動化**: `scripts/check-icon-duplication.mjs` (Sess36 PR-5)、 `pnpm verify:icon-duplication` 経由で `pnpm verify` chain に組込済。 現状重複ゼロ baseline を CI 強制 → 偶発的重複が入った瞬間 fail。
- **検証手順** (タブ icon 変更 PR レビュー時):
  - [ ] PR 本文に「4 基準を満たす」 説明あり (機能整合 / 重複排除 / 4 ペルソナ評価 / mockup 整合 or 上書き明示)
  - [ ] `node scripts/check-icon-duplication.mjs` で 0 errors
  - [ ] mockup 上書きの場合は ADR Notes Amended で履歴追記 (ADR-0020 の rename / icon 差替履歴と同 pattern)
- **関連**: ADR-0042 D1/D4 (本ルール由来) / design_system §25 (タブアイコン SoT) §26 (FAB SoT) / `src/components/icons/NavIcons.tsx` `EventIcons.tsx` / Sess36 PR-1〜6

---

### R-54. 単位表現は form / chip 両画面で i18n unit key 一元化 (Sess37 PR-1 由来)

- **適用範囲**: number field に suffix 単位 (倍 / 本 / mm / cm / pcs / 年 等) を表示する全 component。 form input の suffix と display chip / row の text 両方で同 SoT (i18n key) 参照を必須化。
- **必須運用**:
  1. **i18n key 命名規則**: `workLog<FieldName>Unit` で統一 (例: `workLogPestDilutionUnit` / `workLogCandleCountUnit` / `workLogWireGaugeUnit` (新規時) 等)。 form 側 suffix と chip 側 `valueUnitKey` で同 key を参照。
  2. **form 側参照**: `LabeledNumberInput` 等の `suffix` prop に `t('workLog*Unit')` で渡す。 hardcode (例: `suffix="倍"`) 禁止、 必ず i18n 経由。
  3. **chip 側参照**: `HistoryChip` data に `valueUnitKey?: TranslationKey` を格納し、 `HistoryChip.tsx` component が `${chip.text}${t(chip.valueUnitKey)}` で結合表示 (Sess37 PR-1 確立 pattern)。
  4. **19 言語完備**: form / chip いずれかで新 unit key を追加する時は **必ず 19 言語全部に翻訳追加** (ADR-0033 D1 ペルソナ翻訳 workflow)、 form 既存 key を chip でも流用する場合は追加翻訳ゼロで OK。
- **根拠**: Sess37 PR-1 C4 由来 — `pest_control.dilution_ratio` chip が `×1000` で表示されるが form input は「倍」 suffix 表示で integrity レベル 2 違反 (ADR-0034 D4 違反)。 同様に `candle_cut.count` も `×5` で「本」 単位なし。 form と display で異なる単位表現は user 認知不整合の元凶。 既存 i18n key (`workLogPestDilutionUnit` 19 言語完備、 ja「倍」/ en「x」/ ko「배」 等) は form でのみ使用、 chip 側は hardcode `×` で SoT 二重化 → R-54 で一元化を明文化。
- **検出方法**:
  - **grep 検出**: `grep -rE "(suffix=|text:.*\`(?!.*workLog)).*[倍本mm cm本本]" src/` で hardcoded 単位 suffix を warning (Sess37 PR-2 で `scripts/check-unit-i18n.mjs` 起票検討、 任意)
  - **R-55 連動**: 新規 number field 追加時は R-55 関連項目調査で form / chip / SoT 整合性を必ず Self-check
- **検証手順** (number field 追加 PR レビュー時):
  - [ ] form input suffix が `t('workLog*Unit')` 経由 (hardcode 「倍」「本」 等なし)
  - [ ] chip 生成 (buildHistoryChips 等) で `valueUnitKey: 'workLog*Unit'` 格納
  - [ ] 同 key が 19 言語完備 (`pnpm i18n:check` 緑)
  - [ ] 実機 SS で form 入力中の suffix + chip 表示が **同一文言** で表示 (integrity レベル 2)
- **関連**: ADR-0027 (14 種別 form schema) / ADR-0029 (Form Atom Typography) / ADR-0041 D5 (EventRow displayMode、 Notes Amended 予定) / Sess37 PR-1 (#814) / R-55 (関連項目網羅調査)

---

### R-55. 問題発見時の関連項目網羅調査必須 (Sess37 PR-1 由来)

- **適用範囲**: user / Plan agent / QA / Maestro / CI から問題 / 修正対象を 1 つでも指摘されたら、 **実装着手前に同 pattern を持つ他箇所を grep / inventory で網羅調査** する。 単一箇所修正 → user 再修正リクエストの recurrence loop を構造的に防止。
- **Self-check 5 項目** (実装着手前 = 最終提案前に必ず実行):
  1. **同パターン全件 grep**: 指摘箇所の表現 / 単位 / format を 14 種別 / 全 component / 全 i18n locale で grep
  2. **i18n key inventory**: 関連 key が 19 言語完備か / 既存流用可能か / 追加必要か grep 確認
  3. **整合性検証**: form ↔ display ↔ docs SoT (functional_spec / design_system / ADR) で integrity チェック
  4. **副次的問題発見の能動的姿勢**: grep 結果から「他にもおかしい箇所」 を 1 件以上発見しようとする (発見できなければ「網羅調査済」 と明示)
  5. **PR 範囲拡張判断**: 関連項目を本 PR に含めるか別 PR にするかを user に明示提示 (1 件のみ修正 vs 統合修正のトレードオフを user 判断)
- **根拠**: Sess37 PR-1 C4 で「`×1000` / `×5` を単位表示に直して」 user 指示 → 関連調査で **4 件の副次問題発見** (en `workLogCandleCountUnit: 'count'` が「5count」 で不自然 / `position_change` の `→` 矢印が label「移動先:」 と冗長 / 19 言語 i18n key が form 側で既完備で流用可能 / `wire_size_mm` / `pot_size_cm` の hardcoded は SI 単位で OK 確認)。 user 再修正リクエストを **1 PR で未然防止** + i18n 追加翻訳 **38 → 0 entries** に削減。
- **R-54 との関係**: R-54 は「単位表現の SoT 一元化」 で具体的 (number + suffix の場合)、 R-55 は「関連項目網羅調査」 で一般的 (全 pattern 対象)。 R-54 違反は R-55 の 1 ケース。
- **検証手順** (PR レビュー時):
  - [ ] PR 本文に「R-55 Self-check 5 項目 実施結果」 セクションあり
  - [ ] 関連箇所の grep 結果を PR 本文に貼付 (例: `grep -rE "対象 pattern" src/` 結果)
  - [ ] 副次的問題発見の能動的姿勢 (発見した副次問題、 もしくは「網羅調査済 (副次なし)」 と明示)
  - [ ] PR 範囲拡張判断の user 承認記録 (本 PR に含めるか別 PR か)
- **自動化** (PR-2 以降検討、 任意):
  - `scripts/check-related-coverage.mjs` で「同一 i18n key prefix の grep カバレッジ」 を warning 出力
  - global `~/.claude/CLAUDE.md` §2 に「関連項目網羅調査」 原則として昇華推奨 (user 承認後手動編集)
- **関連**: ADR-0027/0029/0041 / R-54 (単位 SoT) / R-9 (既存スクリプト先読み) / R-25 (構造系 5 項目) / Sess37 PR-1 (#814) / 全プロジェクト共通の「測定 2 回、 切断 1 回」 原則

---

### R-56. 議論で言及する技術参照は実在 grep 確認必須 (Sess38 retro 由来)

- **適用範囲**: 議論モード (`/discuss` / Plan mode / AskUserQuestion) で具体的な技術参照を user に推薦する前。 i18n key / file path / function 名 / 型名 / ADR 番号 / R-XX 番号 など、 実在確認が grep / ls で可能なものすべて。
- **必須運用 — Self-check 4 項目** (議論で技術参照を含む推薦を user に提示する前):
  1. **言及する i18n key を grep 確認**: `grep -rn "keyName" src/core/i18n/locales/` で 19 言語完備か実在確認、 不在なら「新規 key 追加が必要」 と user に明示
  2. **言及する file path を確認**: `ls /path/to/file` or `Read` で実在確認、 存在しない path を「既存 file」 と提示しない
  3. **言及する function / 型名を grep 確認**: `grep -rn "functionName\|TypeName" src/` で実在確認、 推測で「既存 function」 と書かない
  4. **不在の場合は明示**: 「既存流用 / 追加翻訳 0 entries」 と書く前に grep 確認、 不在なら「新規追加 N entries」 と数値で示す
- **根拠**: Sess37 PR-1 議論で「memo セクションラベルは既存 `workLogMemoTitle` 流用、 追加翻訳 0 entries」 と推薦 → Plan agent validation で **0/19 言語存在** 判明 → 既存 `workLogNote` 流用に訂正 (form の memo field label と完全整合、 結果として真の DRY 達成)。 推測ベース議論が Plan agent validation 経由でしか検出されない構造は脆弱、 議論段階で能動的 grep 確認に切替。
- **R-9 / R-13 / R-55 との関係**:
  - R-9 (既存スクリプト先読み): 実行段階の検出
  - R-13 (議論前 spec Read): 仕様レベルの確認
  - R-55 (関連項目網羅調査): 問題発見後の同 pattern 拡大調査
  - R-56 (本ルール): **議論段階の具体的技術参照の実在 grep 確認** (R-13 と相補、 R-55 の前段)
- **検証手順** (議論モード PR レビュー時):
  - [ ] 議論で言及した i18n key を grep 結果として PR 本文に貼付 (19 言語完備の確認 evidence)
  - [ ] 議論で言及した file path を ls / Read 結果として確認 evidence 明示
  - [ ] 「既存流用」 と書いた箇所はすべて grep 確認済か (推測ゼロ)
  - [ ] Plan agent validation で flag された致命的問題があれば PR 本文の「R-56 違反として訂正」 セクションに記録
- **自動化** (検討、 議論段階は git diff として捕捉困難):
  - 議論段階 hook 化は Claude Code 側機能依存 (将来 improvement)
  - PR 段階の補完: `scripts/check-i18n-key-references.mjs` で `t('xxx')` 全件 19 言語完備確認 (PR diff 範囲)
- **関連**: Sess38 retro / Sess37 PR-1 (#814、 workLogMemoTitle 致命的事象) / R-9 / R-13 / R-55 / Plan agent validation pattern

---

### R-57. PR マージ時にブランチを都度削除 (Sess51 由来)

- **ルール**: PR を main にマージしたら、 **ローカル・リモート両方の作業ブランチをその場で削除**し溜めない。
  1. マージは `gh pr merge <PR番号> --squash --delete-branch` で行う (`--delete-branch` がローカル枝とリモート枝を同時削除)
  2. マージ直後に `git fetch --prune` (GitHub で消えたブランチの死んだ追跡参照を掃除)
  3. GitHub repo 設定 `delete_branch_on_merge=true` (Sess51 で ON) により、 web UI マージや他経路でも remote 枝は自動削除される (二重の安全網)
- **根拠**: Sess51 で `git fetch --prune` 実行時に、 過去の squash マージ済み PR が残したブランチが **ローカル 126 本 + リモート 75 本** 累積していたことが発覚し一括掃除した。 root cause = ①GitHub 設定 `delete_branch_on_merge=false` (自動削除 OFF) ②マージ手順にローカル枝削除が明記されていなかった、 の 2 点。「気をつける」 頼みでは必ず溜まる。
- **自動化 / 構造防止**:
  - remote: `delete_branch_on_merge=true` (設定で恒久自動化、 Sess51 で適用済)
  - local + remote: マージコマンドを `--delete-branch` 固定 (`docs/how-to/workflow/git_workflow.md` §4.11 / §4.12 に明記)
- **検証手順**: マージ後に `git branch` (ローカル) / `git branch -r` (リモート) で当該枝が消えていることを確認。 OPEN PR の枝・未マージ作業を含む枝 (中身が main に無いもの) は削除対象外として保護。
- **関連**: Sess51 / `docs/how-to/workflow/git_workflow.md` (マージ手順 SoT) / R-2 (履歴は最小に) / 「測定 2 回、 切断 1 回」 原則

---

### R-58. dark theme cascade 構造禁止 (Sess66-68 起点、 Sess70 PR-D 拡張)

- **ルール**: 画面追加 / 色変更 / theme 関連 PR では以下 4 点必須:
  1. **`StyleSheet.create()` 内に theme-dependent / brand-static color token を書かない** (16 種):
     - 旧 8 種 (Sess66 PR3): `BG_PRIMARY` / `BG_SURFACE` / `TEXT_PRIMARY` / `TEXT_SECONDARY` / `TEXT_MUTED` / `TEXT_DEFAULT` / `BORDER_DEFAULT` / `BORDER_STRONG`
     - Sess70 PR-D 追加 8 種 (brand-static 撤回): `BRAND_GREEN` / `BRAND_GREEN_HOVER` / `BRAND_GREEN_BG` / `BADGE_SOFT_BG` / `BADGE_SOFT_TEXT` / `BUTTON_SECONDARY_BG` / `BUTTON_SECONDARY_TEXT` / `DISABLED_BG`
  2. **`useColors()` hook + inline `c.*` で動的色注入**: Sess69 PR-A で 7 prop 追加 (`c.tint` / `c.tintSubtle` / `c.badgeBg` / `c.buttonSecondaryBg` / `c.onTint` / `c.disabledBg` / `c.accentBark` + `c.dangerColor`)
  3. **`pnpm a11y:contrast` で全 22 pair WCAG AA pass** (PR-A で 14→22 拡張、 brand pair 含む)
  4. **dark mode 実機 SS で視認性確認** (R-60 と連動)

- **根拠**: Sess65 user 報告「設定画面が dark で真っ白」 + Sess66 残 245 違反 + Sess68 PR #A/B/C で完走 (旧 8 種) + Sess69 で真因確定 (brand-static 罠 = light `BRAND_GREEN = #1F3A2E` 深緑が dark `#16140F` 上で contrast 1.5:1 ≪ AA 3.0:1 で破綻) → 5 回連続再発の主要因。 Sess70 PR-A/B/C1/C2/C3/D で「設計レベル是正 = brand 色も scheme-aware」 完遂、 構造禁止で恒久化。

- **段階移行 (warn → 違反 0 化 → error)**:
  - Sess66 PR3 (`'warn'`、 8 種) → Sess68 PR #D (`'error'`、 245→0 完走)
  - Sess70 PR-D (`'warn'`、 16 種に拡張) → PR-E 予定 (`'error'`、 残違反 0 化)
- **brand-static 維持判断 (4 種)**:
  - `ON_BRAND` (`#FFFFFF`、 light 専用 = brand 上の白文字、 dark は `c.onTint` = sumi `#1A1A1A`)
  - `ACCENT_GOLD` (`#C69E48` 秋葉、 Pro バッジ専用、 両 theme 同色維持)
  - `DANGER` / `SUCCESS` / `OVERLIMIT` (status 色、 ただし dark mode 追従が必要な場合は `c.dangerColor` 経由)
  - `HEATMAP_COLORS` (F-04 ADR-0013 専用 4 色)
- **関連**: ADR-0052 + ADR-0015 Notes Amended (Sess66 PR4 + Sess69 PR-A + Sess70 PR-D) / `eslint-rules/no-color-token-in-stylesheet.js` (16 種 FORBIDDEN) / `scripts/a11y-contrast-check.mjs` (22 pair) / Sess65 PR #938 / Sess66 PR #940 #941 #943 / Sess67 PR #942 / Sess68 PR #950-#953 / Sess69 PR #954 #955 / Sess70 PR #956 #957 #958 + 本 PR

---

### R-59. StyleSheet 内 hex literal 禁止 (Sess70 PR-D 起票、 ADR-0052 Amendment)

- **ルール**: `StyleSheet.create()` 内に raw hex literal (`'#RGB'` / `'#RRGGBB'` / `'#RRGGBBAA'`) を **書かない**。 inline `c.*` (`useColors` hook 経由) に変換するか、 reason marker を付ける。
  - 例外なし pass: `'transparent'` / `'rgba(R,G,B,A)'` 半透明
  - 例外 marker: `// eslint-disable-next-line local/no-color-hex-literal-in-stylesheet`、 直下に `// reason: <一文>` 必須
  - 例外 marker は **5 件以下上限** (`scripts/check-eslint-disable-count.mjs` で CI 監視、 PR-E 同梱予定)
  - 例外用途 (reason 候補): 写真 overlay text 固定 (例: `BonsaiBasicSection.tsx:84` 写真上の盆栽名) / PDF/SVG export 紙白固定 (例: `listPdfExport.ts:180`) / Pro 金 badge 上 `ON_BRAND` 文字 (`PaywallScreen.tsx:508` / `PlanSection.tsx:358`)

- **根拠**: Sess69 で R-58 既存 rule (token 名 base) が hex literal を見逃した盲点が判明 (4 file: `BonsaiTimelineTab.tsx:246` / `EventRowCompact.tsx:143` / `EventRowDetailed.tsx:309` / `SearchResultRows.tsx:226`)。 Sess70 PR-C1/C2/C3 で 4 file inline `c.*` 化済、 PR-D で構造禁止化。
- **段階移行**: PR-D `'warn'` 導入 → PR-E で残違反 0 化 + `'error'` 昇格
- **自動化 / 構造防止**: `eslint-rules/no-color-hex-literal-in-stylesheet.js` (AST walker `isInsideStyleSheetCreate` + hex regex `/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/`)
- **関連**: ADR-0052 Notes Amended (Sess70 PR-D) / `eslint-rules/no-color-hex-literal-in-stylesheet.js` / R-58 (連動)

---

### R-60. 新画面 PR は dark mode SS 添付必須 (Sess70 PR-D 起票)

- **ルール**: 新画面追加 PR (`app/**/*.tsx` 新規 file) では PR 本文に **dark mode で撮影した SS を最低 1 枚添付**必須。
  - 既存画面の修正 PR でも、 dark mode 視覚変化がある場合は推奨
  - PR テンプレに「☐ dark mode SS 添付」 check 項目を追加 (PR-E 同梱予定)
  - 将来 hook (`scripts/check-pr-dark-ss.mjs`) で機械検証も検討
- **根拠**: Sess65→69 で「ユーザーが dark mode で実機テストして報告 → 開発者が cascade 漏れに気付く」 を 4 回繰り返した root cause = 「新画面で dark mode 視覚検証が任意」 の仕組み欠落 (Sess66 ADR-0052 で a11y CI を入れたが、 brand pair が漏れていた = R-58 拡張で対応)。 開発者の「dark mode 後回し」 認知バイアスを構造的に抑制。
- **自動化 / 構造防止 (PR-E 以降)**:
  - PR テンプレに check 項目追加 (人手 reminder)
  - `scripts/check-pr-dark-ss.mjs` で PR 本文を grep し dark SS 画像 link 検出 (機械検証)
  - check-list 失敗時 CI fail or PR レビューで指摘
- **R-25 連動**: 既存 R-25 (機械判定のみで達成判定禁止 + Claude Read 主導) の「dark mode 視覚検証」 領域版。
- **関連**: ADR-0052 Notes Amended (Sess70 PR-D) / R-25 (Claude Read pattern) / R-58 (連動)

---

### R-61. 人間判定 → 機械判定 + 安全網 (meta-rule、 Sess71 PR-5 起票 / ADR-0046 Amendment)

> **位置付け**: 個別ルール (R-58/59/60 等) の上位に位置する **meta-rule (= ルールのルール)**。 個別ルールが「特定場面で何をする」 を決めるのに対し、 本 R-61 は「ルールを作る時に何を意識する」 を決める。

#### ルール本文

新規 R / ADR / hook / check / lint を **足す前に**、 ADR-0046 Amendment (Sess71) の 4 つ目自問:

> **「人間判定が必要か? 機械判定に置き換えられないか?」**

を必須 self-check する。 「念のため XX しよう」 「経験で判断」 「経験者なら分かる」 のような mental model を **仕組み化対象として認識** し、 機械判定 (file pattern / hash / git diff / npm audit / lint / hook / regex) で代替可能なら **必ず機械化**。

#### 安全網 (機械判定の bug 対策)

- 機械判定の bug を恐れて手動 fallback を残す場合は **明示的 reason を必須記載**
- 例: 「`--dry-run` mode で false positive 検出可」 「環境変数 `SKIP_XX_CHECK=1` で緊急時 skip 可」
- 完全自動化が原則、 手動 fallback は最後の安全網

#### 適用例 (BonsaiLog 既存 + 新規)

| 場面 | 旧 (人間判定) | 新 (機械判定) | 起票 / 実装 |
|---|---|---|---|
| build vs reload 判定 | 「念のため build しよう」 | PostToolUse hook + git diff 補完で自動判定 | Sess71 PR-1〜PR-3 (`scripts/check-native-impact.mjs`) |
| 新画面の dark SS 必要性 | 「dark mode 影響あるか」 と人間が悩む | R-60 で機械判定 (新画面なら強制) | Sess70 PR-D 起票 |
| ESLint 例外許可判断 | 「この hex literal は例外で OK?」 | reason marker 必須 + 5 件以下 monitor | R-59 (Sess70 PR-D) |
| dependency 更新の安全度 | 「メジャー更新だけど大丈夫か」 | `npm audit` + 自動 PR check | 将来検討 (機械化候補) |
| dark mode token 違反 | 「これは brand-static で OK?」 | ESLint rule で FORBIDDEN | R-58 (Sess66 PR3 → Sess70 PR-D で 8→16 種) |
| カスタム iconMap 重複 | 「icon 重複してない?」 | `scripts/check-icon-duplication.mjs` で CI 強制 | R-53 (Sess36) |

#### Sess70 → Sess71 の根拠 (なぜなぜ 5 回からの導出)

**問題**: Sess70 で「JS-only 変更なのに build を選択した」 = 時間ロス + token 消費

- なぜ 1: build 選んだ → 「念のため」 安全側
- なぜ 2: 念のため → JS bundle キャッシュ懸念、 dev-client + Metro 仕組み失念
- なぜ 3: 仕組み失念 → 「build vs reload 判定指針」 が BonsaiLog ドキュメントに明文化なし
- なぜ 4: 判定指針未明文化 → 「開発者の経験で判断」 という暗黙ルール
- なぜ 5: 暗黙ルールが見えなかった → **meta-rule (人間判定の存在を疑う視点) が無い**

**根本原因**: ADR-0046 「足す前ゲート」 の 3 自問に「人間判定 vs 機械判定」 が欠落。 個別ルール (R-58/59/60) は「特定場面で何をする」 を決めるが、 「人間判定の存在自体を疑う」 視点が ADR レベルにも欠けていた。

**恒久策**: 本 R-61 起票 + ADR-0046 Amendment (D-3 を 3 → 4 自問拡張)。

#### Sess71 実装 (本 R-61 の最初の適用)

1. **PR-1 (#960)**: `scripts/check-native-impact.mjs` 共通核 (17 unit test) — 編集 file 種別で機械判定
2. **PR-2 (#961)**: `.claude/hooks/check-native-impact-hook.mjs` PostToolUse 連携 — Claude 編集を即時 detect
3. **PR-3 (#962)**: `scripts/dev/reload-app.sh` + `dev-start.sh` 起動時 flag check + 自動 build
4. **PR-4 (#963)**: `docs/how-to/development/dev-workflow.md` 新規 + ADR-0046 Notes Amended
5. **PR-5 (本)**: R-61 起票 (索引 + 詳細)

期待される効果: 1 セッション 1-2 回 × 月 N セッション = **月 30-60 分節約** + 「念のため build」 認知バイアスの構造的根絶。

#### 横断適用 (Sess71 以降の検討候補)

1. **dependency 更新の安全度** → npm audit + automated PR check (Snyk / Dependabot 連動)
2. **新規 i18n key の網羅性** → `scripts/check-i18n-key-references.mjs` 既存、 hook 化検討
3. **TZ off-by-one (Sess67)** → `scripts/check-utc-date-slice.mjs` で機械検出済
4. **ADR 重複起票** → R-9 既存、 grep 機械化済

#### 関連

- ADR-0046 Notes Amended (Sess71): 「人間判定 vs 機械判定」 4 つ目自問追加
- ADR-0052 Notes Amended (Sess66 PR4 + Sess69 PR-A + Sess70 PR-D): dark cascade 構造禁止
- R-58 / R-59 / R-60 (Sess70 PR-D): 個別ルール、 R-61 のメタ rule に従って起票された
- `docs/how-to/development/dev-workflow.md` (Sess71 PR-4): R-61 の最初の実装解説
- `scripts/check-native-impact.mjs` (Sess71 PR-1): 共通核 (file pattern 判定)
- Sess70 retrospective: 「人間判定の暗黙ルール」 が仕組み化対象として見えていなかった事象

---

## 関連

- 親ファイル: `.claude/recurrence-prevention.md` (R-1 〜 R-12 全文 + R-13 〜 R-61 索引 + 運用ルール)
- `~/.claude/CLAUDE.md` — 個人横断ルール
- `AGENTS.md` — 全 AI エージェント共通ルール
- `.claude/CLAUDE.md` — Claude Code 固有挙動
- `.claude/hooks/` — 構造的防止 Hook 群 (R-33 → `check-obsolete-routes.mjs`)
- `scripts/obsolete-routes.json` — 廃止 route 一元管理 (Sess8 Retro S-2)
- `scripts/check-adr-sources.mjs` — ADR 業界事例 sources URL チェック (Sess8 Retro S-1)
- `docs/reference/tasks/lessons/` — 技術 lesson (領域別フォルダ)
