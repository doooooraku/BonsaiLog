# 再発防止プロトコル — 専門ルール (R-13 〜 R-79)

> 本ファイルは `.claude/recurrence-prevention.md` (親) の詳細部分。
> 親ファイル = R-1 〜 R-12 全文 + R-13 〜 R-79 索引 + 運用ルール。
> 本ファイル = R-13 〜 R-79 詳細記述。
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

### R-62. Component SoT 化時は Layout Contract も同じ ADR で SoT 化必須 (Sess72 ADR-0054 起票)

> **位置付け**: R-61 (人間判定 → 機械判定) と並列の **meta-rule (= ルールのルール)**。 個別ルールが「特定場面で何をする」 を決めるのに対し、 本 R-62 は「Component の SoT 化 ADR を書く時に何を意識する」 を決める。

#### ルール本文

Component (例: FAB / BottomSheet / Header / KAV / Modal / BottomCtaBar) の SoT 化を ADR で決定する時、 必ず **「その Component を使う画面側の Layout Contract + Multilingual Visual Contract」 も同じ ADR で SoT 化** する。 Component / Layout Contract / Multilingual Visual Contract は **3 つの SoT として扱う** (Sess73 PR-1 で「Multilingual Visual Contract」 を Sess72 当時の 2 contract に追加拡張)。

#### Layout Contract の典型項目

- **paddingBottom / paddingTop**: ScrollView / FlatList の content padding (Component が画面外固定の場合、 last item との clearance を確保)
- **safe area inset 反映**: `useSafeAreaInsets()` でデバイス依存余白を吸収
- **KeyboardAvoiding offset**: KAV の `keyboardVerticalOffset` 計算式 (Component と KAV の重なり防止)
- **focus management**: 画面遷移時の focus 移動 (`React.useFocusEffect` + `useRef` 連携)
- **animation timing**: 画面入退場の animation duration (Component と画面の同期)

#### Multilingual Visual Contract の典型項目 (Sess73 PR-1 拡張)

- **lineHeight 明示**: descender (g/p/q/y) のクリアランス確保。 fontSize × 1.4 が標準目安 (Noto Sans JP / Inter / NotoSerifJP 全フォント対応)。 未明示時 RN default は OS 依存で約 1.2、 descender が visualBox を超過し下端で切れる
- **numberOfLines + adjustsFontSizeToFit**: 長文言語 (ru / de / vi / zhHans 等) の overflow を構造解消。 `numberOfLines={1}` で 1 行維持 + `adjustsFontSizeToFit minimumFontScale={0.85}` で font 自動縮小、 layout 不変を保証
- **RTL 対応** (将来 ar / he 追加時): `textAlign` の SoT、 アイコン位置の `flexDirection: 'row-reverse'` 切替 SoT
- **数字 fallback**: 言語によって異なる数字書記 (例: hi デーヴァナーガリー数字、 ar アラビア数字) の `Intl.NumberFormat` SoT

#### Multilingual Visual Contract の Acceptance test テンプレ拡張 (Sess73)

Component SoT 化 ADR の PR 完了条件に以下を **必須項目** として追加:

- **代表 4 言語の visual smoke**: en (Latin descender g/p/q/y 確認) + de (中長文) + ru (キリル長文 + descender なし言語特性) + vi (合成文字付き Latin) で実機 or Jest snapshot SS 撮影
- **長文 overflow 検証**: 各 component の最大文字数想定 (i18n key 全 19 言語 max length grep) で layout 破綻なし確認
- **descender 検証**: Latin / Cyrillic / Vietnamese で g/p/q/y を含む実 i18n key (例 `bonsaiCreateNew` en = "Register new bonsai") で 1 文字も切れない確認

#### 違反例 (Sess36 ADR-0042 の SoT 漏れ)

- ADR-0042 D3 で **FAB component の SoT** (`src/components/common/FAB.tsx`) は確立
- しかし **FAB を置く画面の ScrollView paddingBottom 計算 (Layout Contract)** が SoT 化対象から漏れた
- 結果として 4 画面で paddingBottom 計算式が散在 (`tabBarHeight+32` / `tabBarHeight+60+32` / `96` ハードコード)
- **`FAB top edge (tabBarHeight+insets.bottom+72) > paddingBottom`** で 40〜74 px の重なり領域が常時発生
- 2026-06-03 テスター報告「FAB がリストと重なる」 → Sess72 で ADR-0042 D3 撤回 + ADR-0054 起票の手戻り
- ADR-0042 Acceptance test では「FAB が tabBar / banner にかぶらない」 は検証したが、 「FAB が ScrollView 最終項目にかぶらない」 は検証項目になかった (Layout Contract SoT 化漏れ)

#### 違反例 2 (Sess72 ADR-0054 の Multilingual Visual Contract 漏れ、 Sess73 で発見)

- ADR-0054 D2 で **BottomCtaBar component の SoT** + **Layout Contract** (inline 配置 → paddingBottom 計算不要) は確立
- しかし **Multilingual Visual Contract** (lineHeight / numberOfLines / adjustsFontSizeToFit / descender clearance) が SoT 化対象から漏れた
- 結果として 2026-06-07 user 報告で en「Register new bonsai」 / 「Log a care event」 の **g 見切れ** + ru「Запланировать задачи」 等の **長文 overflow リスク** が顕在化
- 真因: ADR-0054 D2 議論時 ja-only mock で確認したため Latin descender 文字 / 長文非日本語が登場せず、 Acceptance test の PR-2 完了条件に「multi-language visual smoke」 が抜けていた
- 対策: Sess73 PR-1 で本 R-62 を「Layout Contract + Multilingual Visual Contract」 の 2 contract に拡張、 typical 項目 + Acceptance test テンプレ追加

#### 適用例 (Sess72 以降の将来想定)

| Component | Layout Contract 項目 | Multilingual Visual Contract 項目 |
|---|---|---|
| `<BottomCtaBar />` (Sess72 ADR-0054 + Sess73 PR-1) | 画面下端固定 = paddingBottom 計算不要、 ただし AdBanner / TabBar との順序保証 | lineHeight 28 (descender クリアランス) + numberOfLines={1} + adjustsFontSizeToFit minimumFontScale=0.85 (Sess73 PR-1 で SoT 化) |
| `<BottomSheet />` (将来) | 画面下半分占有時の content scroll 動作 / focus 管理 | sheet title / cta label の長文 overflow / 折返し可否 |
| `<StickyHeader />` (将来) | scroll 時の content paddingTop / status bar 整合 | header title 長文 truncation (numberOfLines={1} + ellipsizeMode) |
| `<KeyboardAvoidingView />` (ADR-0037 既存) | keyboardVerticalOffset = Stack header 高さ + safe area inset、 form 画面の inner ScrollView padding | placeholder / submit cta の各言語長による layout 影響 |
| `<Modal />` / `<FormSheet />` (ADR-0024) | backdrop + 親画面 scroll lock / focus trap | modal title / body / cta の各言語 line wrap 確認 |

#### 検出 / 自動化方針

- **静的解析の困難**: 「Component を使う画面側の Layout Contract」 は型 / lint で完全検出が困難 (画面コンテキスト依存)
- **代替手段**: ADR template の Acceptance / Tests 章に **「Layout Contract 検証 (短リスト / 長リスト / dynamic insets) 必須」** を明文化 (`docs/adr/adr_template.md` 修正候補)
- **PR template**: `.github/PULL_REQUEST_TEMPLATE.md` §7.5 に「Component 新規追加時の Layout Contract チェックリスト」 追加 (Sess72 PR-6 で実装)
- **将来候補**: Maestro flow に「最下端まで scroll → 最終項目 testID visible 検証」 を共通 helper 化

#### 関連

- **ADR-0054** (Sess72): D5 で本 R-62 起票
- **ADR-0042** (Sess36): D3 撤回事例、 Component SoT 化漏れの典型
- **R-61** (Sess71): 並列の meta-rule (人間判定 → 機械判定)
- **R-25** (機械判定のみで達成判定禁止): Layout Contract 検証は機械判定だけでは不十分、 Claude Read 主導必須
- **`docs/reference/design_system.md`**: §FAB → §BottomCtaBar 改訂 (Sess72 PR-5、 Layout Contract も併記)

---

## R-63. 子画面 push 遷移を許す form 画面は scroll 復元 hook 必須 (Sess72 ADR-0040 D5 Amendment 由来)

### ルール

form 画面 (`<FormScreenHeader />` + `<ScrollView>`) で `router.push` する flow がある画面は、 戻り時の scroll 位置保持を `src/core/hooks/useScrollPreservation.ts` (Sess72 PR-1 #969) で**明示**する。

### 真因

React Native の ScrollView は子要素の layout が変動した瞬間に **contentOffset を 0 にリセット**する挙動を持つ (RN core 実装、 native-stack の screen preserve とは別レイヤー)。 form 画面で子画面に `router.push` して戻った時:

1. `useFocusEffect` 内で `consumeXxxResult()` → setState (例: `setSelectedTagIds` + `setRecentTags`)
2. 2 連 setState で子 component (例: `BonsaiTagsSection`) の JSX 分岐が変化
3. layout pattern が「empty 縦並び」 → 「wrap row 横並び」 に変化
4. 親 ScrollView の contentSize が変動
5. ★ contentOffset が 0 にリセットされる

つまり「子画面に行って戻ると、 直前まで見ていた位置 (例: タグ欄、 高さ 420px) が一瞬で「先頭 (高さ 0)」 に巻き戻される」。

### 解決 (hook 化)

```tsx
import { useScrollPreservation } from '@/src/core/hooks/useScrollPreservation';

const scrollRef = useRef<ScrollView>(null);
const { onScroll, scrollEventThrottle } = useScrollPreservation(scrollRef);

<ScrollView
  ref={scrollRef}
  onScroll={onScroll}
  scrollEventThrottle={scrollEventThrottle}
>
  ...
</ScrollView>
```

hook 内では:

- `onScroll` callback で `contentOffset.y` を `useRef` に保存
- `useFocusEffect` + `requestAnimationFrame` で setState commit 後の描画タイミングに `scrollTo` 復元 (race 防止)
- cleanup で `cancelAnimationFrame` (focus 後すぐ離脱した race 防止)
- 初回フォーカス時 `lastOffset=0` で `scrollTo(0)` は no-op として安全

### 検出

`scripts/check-form-screen-scroll.mjs` (R-51 既存) を拡張し、 以下を warn:

- `FormScreenHeader` を import し `<ScrollView>` を使う画面で `useScrollPreservation` を import していない → warn 起動 (warn → 違反 0 確認後 error 昇格、 Sess68 と同じ階段)

除外: 子画面 push が無い form 画面 (`router.replace` のみ等) は `// scroll-preservation: no-child-push (<理由>)` 注釈で明示。

### 適用先 (Sess72 PR-2/3/4 で完遂)

- `src/features/bonsai/BonsaiCreateScreen.tsx` (新規登録 modal、 tag-edit へ push) — PR-2 #970
- `app/(tabs)/bonsai/[id]/index.tsx` (詳細画面、 タグ追加 / picker / work-picker へ push) — PR-3 #971
- `app/export/index.tsx` (Export Hub、 個別盆栽 PDF へ push) — PR-4 #972

### 除外 (PR-0 調査で子画面 push なしと判明)

- `src/features/event/WorkLogConfirmScreen.tsx` (`router.replace` のみ)
- `src/features/event/BulkLogConfirmScreen.tsx` (`router.replace` のみ)
- `app/export/pdf.tsx` (内部 share sheet + FlatList ベース、 ScrollView ではない)

### 由来

Sess72 テスター苦情「タグ追加画面から基本情報画面に戻ると必ず画面の先頭に戻ってしまうのが気になりました」。 ADR-0040 (Sess33 form 構造統一) の Future Work にすら明記されていなかった盲点で、 「子画面 push → 戻り flow」 が Sess33 検証シナリオに含まれていなかった root cause。

なぜなぜ分析 (5 回深掘り) で「**画面間の遷移後の state/UI 復元を見る規約・自動チェックが未整備**」 が真因の真因と判明、 本 R-63 で構造化。 R-25 (機械判定のみで「達成」 判定禁止、 Claude Read 主導) と整合。

### 関連

- **ADR-0040 D5 Amendment** (Sess72 PR-5、 2026-06-07): form 画面 scroll 構造統一に scroll 位置保持を追加
- **PR-1 #969**: `useScrollPreservation` hook 新設 + Jest 6/6
- **R-46 v4** (KAV + auto-scroll): 既存 hook と併存、 別 trigger で衝突なし
- **R-51** (FormScreenHeader + full-screen scroll、 CI 自動化): 同 lint script に統合
- **R-25** (Claude Read 主導): scroll 位置のような non-React state は人手の実機検証 + hook 化で対応

---

## R-64. 新 worktree 作成後は `worktree-init.sh` 実行で `.env` + `node_modules` symlink (Sess75 PR-A 起票)

### ルール

新 `git worktree add` 直後に **必ず** `bash scripts/dev/worktree-init.sh` を実行する。
親 repo (= main worktree) の `.env` と `node_modules` を新 worktree に symlink で繋ぎ、 `pnpm dev` / `pnpm verify` を即実行可能にする。

### 真因

Sess73 + Sess75 で **2 回再発** した DX 罠:

- Expo `app.config.ts` が `required('APP_NAME')` 等で `.env` を強制参照 → 新 worktree には `.env` がないので `pnpm dev` 起動時に `Missing required env var: APP_NAME` で Metro が起動できない
- worktree の `node_modules` は parent と独立、 worktree ごとに `pnpm install` (5-10 分) は時間浪費

CLAUDE.md §9 / 運用ルール §6 「2 回再発で hook 化検討、 3 回目で必須」 該当条件 = R-64 で構造化。

### 実装

`scripts/dev/worktree-init.sh` (約 80 行):

```bash
# 1. git worktree list --porcelain で main worktree を自動検出
# 2. $MAIN_WORKTREE/.env と $MAIN_WORKTREE/node_modules を
#    $CURRENT_WORKTREE/.env と $CURRENT_WORKTREE/node_modules に symlink
# 3. 既存 symlink は keep (no-op)
# 4. 既存 real file は warn のみで上書きしない (user 編集保護)
# 5. FORCE_RELINK=1 で既存 symlink を再作成 (parent path 変更時用)
```

### 使い方

```bash
git worktree add .claude/worktrees/<name> -b feat-<name>
cd .claude/worktrees/<name>
bash scripts/dev/worktree-init.sh
# → linked .env → /path/to/main/.env
# → linked node_modules → /path/to/main/node_modules
# → done — pnpm dev / pnpm verify can be run now
pnpm dev
```

### 由来

- Sess73 統合 worktree (`sess73-verify-integration`) で `.env` 不在に気付き、 手動 ln -s で解消 → memory に学び記録
- Sess75 PR-A 検証 (`feat-tag-presets-pr1`) で **再び** `.env` 不在で Metro 起動 fail、 同じ手動対処 → R-9/R-19 違反 (= 仕組み化必須)
- 真因の真因: worktree 作成時の post-create hook が未整備、 memory は「索引」 で「仕組み」 ではない

### Future Work (本 R 起票時点で scope 外)

- (a) Claude Code の `EnterWorktree` tool に PostCreate hook で `worktree-init.sh` 自動実行
- (b) `.claude/hooks/check-worktree-init.mjs` で worktree 内 `pnpm dev` 直前に `.env` / `node_modules` 存在チェック
- (c) `pnpm verify` の最初に `scripts/check-worktree-symlinks.mjs` を組み込み

### 検出

- 手動 (= 本 R-64 ルール準拠): worktree 作成時に script 実行
- 将来: hook 化 (Future Work)
- false negative 検出: Metro 起動 fail / `pnpm verify` で `Missing required env var` を grep → 検出済の symptom (= 再発時に R-64 違反として alert 可)

### 関連

- `scripts/dev/worktree-init.sh` (Sess75 PR-A 新規)
- `docs/how-to/development/dev-workflow.md` §10 (Sess75 PR-A 追記)
- Sess73 worktree pattern (memory: `sess73-verify-integration`)
- Sess75 PR-A (本 R-64 の起票元)

---

## R-65. CRUD 機能を扱う ADR は Create/Read/Update/Delete の 4 動詞を Acceptance に明示する (Sess77 ADR-0055 起票由来)

### Rule

新規 ADR (新機能 or 既存機能拡張) を 起票する時、 該当機能が **data 操作 (C/R/U/D) を扱う** 場合、 ADR 内に **「CRUD Coverage」 section** を必須記載する。 各 operation について「対応 / 未対応 / 将来対応」 と 動線 / 制約 を明示する。

### Why

ADR-0008 (event data model) で **U (Update)** が DB 層のみ実装され、 UI 動線が未整備のまま 1 年放置。 Sess76 Play Console alpha rollout 直前のテスター苦情「過去の作業は一切入力させない方針か?」 で顕在化。

**真因**: ADR 議論で「機能の追加」 (= 新しい何かを足す) に focus が偏り、 「機能の完備性」 (= ユーザーが取れる操作が CRUD 全部揃っているか) を **構造的に評価する仕組み** が欠落。 ADR テンプレに CRUD 4 操作の明示欄が なかった。

「破壊的操作 matrix」 (R-44 / Sess23 ADR-0036 由来) は「D = 削除」 を対象に明文化されたが、 「U = 更新」 は議論対象から漏れた。

### How to apply

1. **ADR 起票時**: data 操作 (C/R/U/D) を 扱う ADR は、 `## CRUD Coverage` section を必ず書く (ADR テンプレ参照、 ADR-0055 を 参照例 とする)。
2. **各 cell に記載**: 「対応する PR / Issue」 または「未対応の理由」。 「将来対応」 は Follow-ups にも追加。
3. **非 CRUD 系 ADR** (UI 統一 / 文書整備 / build 設定 等) は スキップ可。 ただし title に CRUD 動詞 (create/edit/update/delete) を含む場合は 記載必須 (`pnpm docs:lint` で 警告)。

### 検出

- 自動: `scripts/docs-lint.mjs` の `checkAdrCrudCoverage()` で ADR-0050 以降を走査、 title に CRUD 動詞を含むのに `## CRUD Coverage` heading 不在なら warn (false positive 防止で error 化はせず warn のみ)。
- 手動: ADR review 時に CRUD Coverage section 存在 + 各 cell の妥当性 確認。

### 関連

- ADR-0055 (本 R 同時起票、 編集機能 ADR、 CRUD Coverage table 完全記載例)
- ADR-0008 (event data model、 R 起票元の問題発生 ADR、 U 動線が放置された反省)
- ADR-0036 (破壊的操作 D pattern、 R-44 = 削除側の matrix と本 R = CRUD 完備性 matrix の役割分担)
- `docs/adr/adr_template.md` (本 R 整合で `## CRUD Coverage` section 追加)
- `scripts/docs-lint.mjs` (`checkAdrCrudCoverage` 関数追加)

### 由来

- 2026-06-08 Sess77 ADR-0055 起票時、 user 改善要望「テスター苦情 = 編集できない問題」 のなぜなぜ 5 段分析で「ADR テンプレに CRUD カバレッジ評価仕組み欠落」 が 根本原因と確定
- CLAUDE.md §9「2 回再発で hook 化検討、 3 回目で必須」 該当 (ADR-0008 + ADR-0027 で連続 U 議論漏れ = 構造問題認定)

---

## R-66 RRULE 展開時の TZ 罠防止 (Sess78 ADR-0056 起票)

### ルール

RRULE 展開時 (= recurring schedule から planned events を 生成する 処理)、 `rrule` lib の `between(from, to)` の 戻り値 (= Date 配列) を **必ず `toLocalDateKey(isoUtc, getTzOffsetMin())` で 正規化** してから DB 保存。

- ❌ `rrule.between(from, to).map(d => d.toISOString().slice(0, 10))` — UTC 日付を返す、 JST 早朝 (0:00-8:59) に「昨日」 化、 ADR-0008 §TZ 3 層防御違反
- ❌ `rrule.between(from, to).map(d => d.toISOString().slice(0, 10))` (Branded Type unwrap だけで本質は同じ)
- ✅ `rrule.between(from, to).map(d => toLocalDateKey(d.toISOString() as IsoUtc, getTzOffsetMin()))`

### 適用範囲

- `src/core/recurrence/rrule.ts` (Sess78 PR-3 新規)
- `src/db/recurrenceRuleRepository.ts` の `expandFutureEvents` (Sess78 PR-3 新規)
- 将来 .ics export 等で RRULE を 扱う 全コード

### 検出

- 自動: `scripts/check-utc-date-slice.mjs` 既存 (Sess36 PR-9 R-55) で `nowUtc.*slice|new Date().*slice` を grep、 RRULE 展開 file も対象に含む (`src/core/recurrence/*` を対象 dir に追加)
- 例外: なし (recurrence は user 体感「日付」 そのものなので 例外不要)

### 由来

- ADR-0008 §TZ 3 層防御 ラッパー 6 つ (Notes Amended 2026-05-23 で `toLocalDateKey` を 6 つ目に追加) の RRULE 拡張
- R-55「関連項目網羅調査」 の RRULE 展開固有 pattern として 明示化
- Sess36 PR-7 の `(nowUtc() as string).slice(0, 10)` 罠の 3 件発覚教訓踏襲

### 関連

- ADR-0008 §TZ 3 層防御 ラッパー 6 (`toLocalDateKey`)
- ADR-0056 (本 R 同時起票、 recurring schedule の Decision SoT)
- R-55 (CLAUDE.md §2 関連項目網羅調査、 本 R の 親規約)
- Sess14 ALTER TABLE 罠 (PR-2 で nullable 列のみで回避、 schema migration 失敗の 別罠)

---

## R-67 status を持つ entity の 機能設計時、 各 status の操作意味を matrix で明示

### ルール

ADR 起票時、 該当機能が `status` 列を 持つ entity (例: `events.status = 'planned' | 'logged' | 'cancelled'`) に対する 操作を 定義する 場合、 **各 status での 操作意味を matrix で 明示** する。 「個別だけ評価」 で `status` 漏れによる 設計ミスを 構造的に防止。

### Matrix template

| 粒度 / 操作 | planned | logged | cancelled | 備考 |
| --- | --- | --- | --- | --- |
| C (Create) | (UI 動線) | (UI 動線) | (通常 user 操作なし) | |
| R (Read) | (表示位置) | (表示位置) | (履歴のみ) | |
| U (Update) | (編集動作 = 例: 種別差し替え) | (編集動作 = 例: payload 編集) | (通常 user 操作なし) | |
| D (Delete) | (削除動作) | (削除動作) | (= 物理削除) | |

### 適用範囲

- ADR 起票時、 events / future event-like entity (例: PR-2 の recurrence_rules) の機能設計時 必須
- ADR-0055 (event 編集機能) で Sess77 Follow-up「planned/logged で 編集の意味分化」 が 設計ミスとして発覚 → 本 R 起票
- ADR-0056 (recurring schedule、 本 R 同時起票) で 早期適用

### 検出

- 手動: ADR review 時に matrix 存在 + 各 cell の妥当性 確認
- 自動 (将来検討): `scripts/docs-lint.mjs` で `events.status` / `recurrence_rules` 等を 言及する ADR に 本 matrix の heading (`## Status Matrix` 等) 存在 check (false positive 防止で warn のみ)

### 由来

- 2026-06-08 Sess77 PR-3 で planned/logged を 同じ edit mode に統合 → user 実機検証で 「planned event の payload は通常空、 編集 = 種別差し替えが真意」 と発覚 → Follow-up PR で status 別意味分化
- 「個別だけ評価」 = 1 status だけ想定で 設計し、 他 status が 漏れる パターン が ADR-0036 (R-44 削除側) + ADR-0055 (編集側) で 2 回 発覚 → 構造問題認定
- CLAUDE.md §9「2 回再発で hook 化検討、 3 回目で必須」 該当 → 本 R で 構造化

### Sess81 拡張: 2 重 matrix pattern (= entity が rule + instance の 2 層の場合)

ADR-0056 (定期予定 recurring schedule) で **events entity** (recurring 由来 instance) と **recurrence_rules entity** (rule 自体) の 2 entity が 連動更新する設計が登場 → R-67 を **2 重 matrix** で適用。

#### 2 重 matrix pattern の適用判定

以下 全てに 該当する場合、 **2 重 matrix 必須**:

1. 1 entity が 別 entity の 「instance 展開元」 になる (例: rule → events、 template → instances)
2. instance entity が 独自の status 列を持つ (例: events.status)
3. rule entity の操作 (= U/D) が instance entity に cascade 影響する (= 連動更新あり)

#### 2 重 matrix template

**Instance entity の matrix** (= 通常の R-67 matrix、 status 別):

| 操作 \ status | status_A | status_B | status_C | 備考 |
|---|---|---|---|---|
| C (Create) | ... | ... | ... | |
| R (Read) | ... | ... | ... | |
| U (Update) | ... | ... | ... | |
| D (Delete) | ... | ... | ... | |

**Rule entity の matrix** (= status 列なし、 操作だけ列挙):

| 操作 | 動作 | 動線 / 実装 |
|---|---|---|
| C (Create) | ... | ... |
| R (Read) | ... | ... |
| U (Update) | ... | rule の U が instance に cascade する場合は **scope 暗黙適用** を明記 |
| D (Delete) | ... | rule の D が instance に cascade する場合は **soft-delete 連鎖** を明記 |

#### 適用実例

- **ADR-0056 §CRUD Coverage** (2026-06-09 Sess81 で 追記、 events 12 cell + recurrence_rules 4 cell)
- 将来候補: tag presets (= master tag の rule、 ADR-0049 ②) 拡張時 / wiring_scheduled template 拡張時

### 関連

- ADR-0055 §Notes Amended Sess77 Follow-up (本 R の問題提起元)
- ADR-0056 (本 R 同時起票、 D6 3 択 dialog で 適用、 Sess81 で **2 重 matrix pattern 拡張**)
- R-65 (CRUD カバレッジ、 本 R の 補完規約: R-65 = C/R/U/D 完備性 / R-67 = status × 操作 意味分化)
- ADR-0036 (破壊的操作 D7 kebab pattern + R-44 削除側 matrix)

---

## R-68 外部サービス連携 ADR は preflight smoke test 配線済が Accepted 必須条件 (Sess81 起票)

### 由来

Sess81 (2026-06-09) でテスター 12 人苦情「サブスクの購入はまだ未対応ですかね？」 (= Paywall 3 プラン全部「利用不可」 + 購入失敗ダイアログ) を構造調査 → **真因は Play Console subscription `bonsailog_pro` の Country/region availability が `MN` (モンゴル) のみ登録**、 JP/US 含む 174 国で `Purchases.getOfferings()` が `current=null` → Paywall「利用不可」 + Package not found エラー。

調査で判明した重大な構造問題:

- ✅ RC Dashboard 完璧構築 (project / apps / 6 products / entitlement `premium` / offering `default` is_current=true / Package 3 件全部紐付け済)
- ✅ アプリ側 `.env` の RC API キー (`goog_optOZ...` / `appl_cWMo...`) は RC Dashboard 値と完全一致
- ✅ アプリ側 jest 全 pass、 Maestro flow 全 pass
- ❌ Play Console 1 か所だけ broken (= MN-only territory)

つまり「**アプリ側全部 green、 外部設定 1 つだけ broken**」 状態が Sess47 (2026-05-26) から Sess81 (2026-06-09) まで **3 ヶ月超** 検知できなかった。 ADR-0009 §残作業 + ADR-0043 §「スコープ外」 で「Sandbox 全 12 パターン手動検証 / Banking / DPA / Privacy Policy 19 言語 / RC Dashboard 構築」 を明示的に先送り宣言 → 後続セッション 80+ PR で UI / dark theme / 定期予定機能等の「目に見える機能」 集中、 課金は「画面が出ている = OK」 と暗黙判定。

### ルール

外部サービス連携機能 (= 課金 / 広告 / 解析 / 法務 / プッシュ通知 / マップ / 認証 / クラウド同期 / KPI ダッシュボード 等) を扱う ADR は、 Status: Accepted 昇格前に **以下 2 つを必須**:

1. **preflight smoke test 配線済**:
   - リリース前 `scripts/preflight-android-release.mjs` (or iOS 同等) に「外部サービスから 1 次情報を取得して機能可否を判定する step」 を 1 行追加
   - 失敗時は CI exit 1 で release 中断
   - **SDK mock を使わず、 本物の外部 API を叩く** (= モック整合性 ≠ 本番動作)
   - ローカル開発時は skip 可 (= `--ci` 時のみ実行)、 ネットワーク不安定回避

2. **`.env.example` に明示要件**:
   - 外部サービスが要求する API キー / 設定値の名称
   - 接頭辞 (例: `goog_` / `appl_` / `ca-app-pub-` 等) を明示
   - 取得 URL を併記 (例: `https://app.revenuecat.com/...`)

### 適用例 (Sess81 で実装)

#### ADR-0009 (RevenueCat)

- `scripts/preflight-android-release.mjs` **G グループ** (新規): `checkRcOfferings()` で RC REST API `/v1/subscribers/<anonymous>/offerings` を叩いて current 非 null + 3 Package (`$rc_monthly` / `$rc_annual` / `$rc_lifetime`) 完備を verify
- `scripts/prebuild-env-check.mjs` **Layer 1.7** (新規): `REVENUECAT_ANDROID_API_KEY` は `goog_` 始まり、 `REVENUECAT_IOS_API_KEY` は `appl_` 始まりを verify (= 取り違え事故防止)
- `.env.example`: RevenueCat section に「Android: 必ず goog_xxxxx」 「iOS: 必ず appl_xxxxx」 + 取得 URL を明示
- `agent-tools/skills/claude/release-android/SKILL.md`: 「rollout は手動」 → 「Production rollout は必ず Play Console UI で実行 + 直リンク + 24h territory プロパゲーション注意」 に拡張

#### 適用候補 (Sess82+ で追加適用)

- **ADR-0010 (AdMob)**: preflight で AdMob テスト広告取得 smoke (= 既存 `pnpm ump:check` の拡張?) + `.env.example` で `ADMOB_*` 接頭辞 (`ca-app-pub-`) 明示
- **ADR-0017 (ATT/UMP/Privacy)**: preflight で UMP form 取得 smoke + RC GDPR DPA 取得 OK 判定
- **ADR-0050 (Android release)**: 14 日 opted-in 12 人ルールの自動カウント取得 (= Google Play Developer Reporting API)
- **Sentry** (将来導入時): preflight で DSN 接続 + テストイベント送信成功 verify

### 検出 / 強制

- **Sess81 自動配線**: 上記 G グループ + Layer 1.7 で技術的に違反不可
- **Sess82 PR review チェック**: PR review-pr Skill (or hook) に「外部サービス連携 ADR か? Yes なら preflight smoke test 配線済か?」 自動チェック追加候補
- **ADR template 拡張** (= `docs/adr/adr_template.md`): 「外部サービス連携」 セクションを新設、 該当 ADR は preflight smoke test 配線箇所 (= scripts path + step 名) を必須記載

### 関連

- **由来 ADR**: ADR-0009 §Notes Sess81 Amendment (= BillingError + offeringsEmpty + 3 ヶ月放置の経緯)
- **由来 ADR**: ADR-0043 §「Sess82 残作業」 (= iOS 同手順 + Apple Lifetime READY_TO_SUBMIT 解消)
- **由来 docs**: `docs/how-to/release/iap-setup-checklist.md` (Sess81 新規 12 step + Q&A)
- **由来 lesson (Engram id=510)**: 「Google API は region removal 拒否、 Play Console UI 必須」
- **同型 meta-rule**: R-61 (機械判定 + 安全網) / R-65 (CRUD カバレッジ)

---

## R-71 件数分岐 hook の UI 表現契約 SoT 化 (Sess83 ADR-0025 起票)

### ルール

`useBulkActionFlow` / 同型 hook で `0 件` / `1 件` / `N 件` 等の **件数分岐** で動線が変わる場合、 各分岐の **UI 表現 (chip 視覚 / header 文言 / icon / hint / a11y)** を **同じ ADR の Decision §** で SoT 化必須。 ADR が動線 (= どの画面に遷移するか) のみ確定し、 各 case の UI 表現を i18n / component に「暗黙委任」 すると、 別 PR で確定される際に **設計協調漏れ** が発生 = user が画面遷移後に「何が起きたか」 を 解釈不能になる構造問題が再発する。

### 必須テンプレ (= ADR Decision § に記載)

| 件数 | 動線 (遷移先) | header 文言 (i18n key) | chip 視覚 | hint 文言 | a11y label |
| --- | --- | --- | --- | --- | --- |
| 0 件 | (= 例: 別 tab へ誘導) | (= 例: 空状態 文言) | (= なし) | (= 「先に登録」 等の誘導) | (= 動線説明) |
| 1 件 | (= 例: 自動選択 + 次画面 push) | (= 例: 盆栽名直接埋込 ...Single key) | (= ✓ icon + bonsai 名) | (= 「自動選択」 等の cue) | (= 自動選択明示) |
| 2 件以上 | (= 例: 選択画面 push) | (= 例: 件数埋込 既存 key) | (= chip 並び) | (= なし) | (= 件数読み上げ) |

### 適用範囲

- count-based 動線分岐 hook 全般 (= `useBulkActionFlow` / 将来追加される同型 hook)
- 件数 = 0/1/N 以外でも、 status 分岐 (R-67) や mode 分岐 (= log/schedule/recurring) で **UI 表現が変わる** 全 hook が対象

### 検出

- 手動: ADR review 時に「件数分岐 hook」 の言及 + 各分岐の UI 表現契約 matrix 存在 確認
- 自動 (= follow-up Sess84+): `scripts/check-i18n-plural-cohabit.mjs` 新規起票で `{count}` placeholder と **複数前提語** (= 「同じ」「both」「Beide」「oba」 等) の i18n value 内 共存を ESLint custom rule で 静的検出 (= 1 件 case で文法成立しない違和感の早期発見)

### 由来

- 2026-06-09 Sess83 user 実機検証で「BulkWorkPicker 1 件 case の header 文言『1 件の盆栽に**同じ**作業を記録』 + chip 視覚曖昧」 が user 不安を生む構造問題が発覚
- 真因 = ADR-0025 §Decision §7 (= 1 件 skip 動線、 4 ペルソナ全員 ◎ で 1 ヶ月運用) を確定後、 i18n 文言 + chip 視覚を **別 PR で確定** = 設計協調漏れ
- ADR-0025 §7 + Sess80 PR-6.5 (#1002) + Sess82 PR-D (#1013、 recurring mode 追加) の 3 PR が **同 hook を 共有しながら 各 case の UI 表現を統一しなかった** = 構造問題
- R-62 (Layout Contract SoT) + R-67 (status 別意味分化) の系譜 = 「動作 を 決めたら 表現 も 同じ ADR で 決める」 meta-rule

### 関連

- ADR-0025 §Decision §7 + 2026-06-09 Sess83 Notes Amended (本 R の 起票元、 1 件 case 表現契約 SoT 化)
- ADR-0056 (= recurring mode、 本 R 同時適用)
- R-62 (Component SoT 化時は Layout Contract も同じ ADR で SoT 化必須、 Sess72 ADR-0054 起票、 本 R の 直接先行)
- R-67 (status を持つ entity の機能設計時、 各 status の操作意味を matrix で明示、 Sess78 ADR-0056 起票)
- R-55 (関連項目網羅調査、 本 R は 「同型問題を発見時に同 PR で 3 mode 全部直す」 として 本 PR で 即時適用)

---

## R-72 master/custom CRUD pattern SoT (Sess89 ADR-0049 ⑥ 構造実装由来)

### ルール

**master/custom 二層構造** で構成される領域 (= 樹種・樹形・タグ・定期予定 の 4 領域) は、 全領域で **CRUD 関数群が揃って実装** されていることを保証。 「追加」 だけ実装して「編集 / 削除」 が UI に存在しない構造実装漏れ (= ADR §Decision で「削除 OK」 と書きながら削除関数がない事故) を構造防止する。

### 必須関数 set (= 全 4 領域で 揃え)

| 関数 種別        | 樹種 ⑥                         | 樹形 ⑥                         | タグ ②                       | 定期予定 ⑦                              |
| ---------------- | ------------------------------ | ------------------------------ | ---------------------------- | --------------------------------------- |
| Create / find     | `createOrFindCustomSpecies`    | `createOrFindCustomStyle`      | `createOrFindTag`            | `createRecurrenceRule`                  |
| Rename (Update)  | `renameCustomSpecies`          | `renameCustomStyle`            | `renameTag`                  | `replaceRecurrenceRule` (= softDelete + create) |
| Delete           | `deleteCustomSpecies`          | `deleteCustomStyle` (= atomic) | softDelete via Alert.alert    | `softDeleteRecurrenceRule`              |
| Count (free 上限) | `countAllCustomSpecies`        | `countAllCustomStyles`         | `countCustomTags`            | `countActiveRecurrenceRules`            |
| canCreate (Pro guard) | `canCreateNewCustomSpecies` | `canCreateNewCustomStyle`      | `canCreateNewTag`            | `canCreateRecurrenceRule`               |
| Count bonsai by  | `countBonsaiByCustomSpecies`   | `countBonsaiByCustomStyle`     | `countBonsaiByTag`           | (= rule 単位で events 紐づけ、 N/A)     |
| WithStats        | `getCustomSpeciesWithStats`    | `getCustomStylesWithStats`     | `getTagsWithStats`           | `listActiveRecurrenceRules` (+ join)    |

### Why (= 由来 lesson)

ADR-0049 §Decision 「Grandfathered 緩: 削除 OK」 と明記されていたが、 Sess59 PR5 (= 2026-05-31 実装) では「追加 + Paywall ガード」 のみ実装、 **削除/編集動線が UI に存在しない構造実装漏れ** が 4 ヶ月放置 → Sess89 (= 2026-06-09) テスター苦情「樹種カスタムの編集、 削除機能は Pro? または今後の予定?」 で顕在化。

**真因**: ADR § Decision に「Grandfathered 緩 削除 OK」 と書きながら、 ADR § Acceptance テスト記述に「削除動線テスト」 が含まれず、 領域横断の整合性チェックが PR レビューで掛からなかった。 R-65 (= CRUD カバレッジ) の Notes 拡張で対応可能だが、 R-65 は ADR 単独の網羅性 lint、 本 R-72 は **複数領域横断の網羅性** lint で役割分担。

### How to apply

1. **新規 master/custom 領域追加時** (= 将来「カスタム肥料種類」 等が追加された場合): 上記 7 関数 set を必ず実装。 関数名は `<verb>Custom<Entity>` pattern に厳密に統一。
2. **CI 自動検出** (= `scripts/dev/check-custom-crud.mjs`、 Sess89 Phase 4 で起票候補):
   - 4 領域 (= species / styles / tags / recurrence) で 関数群 grep
   - 1 領域でも 関数欠落があれば warn (= error 化は Sess89 では せず、 R-72 違反検出のみ通知)
   - ADR-0049 §Notes Amended Sess89 PR-4 の matrix と DRY 整合
3. **削除時 cascade pattern matrix** (= ADR-0026 §Notes Amended Sess89 で確立、 本 R で要約参照):
   - FK + ON DELETE SET NULL: 樹種 (= cascade 自動)
   - raw text + atomic UPDATE NULL: 樹形 (= 案 c)
   - softDelete (= deleted_at セット): タグ + 定期予定

### 検出

- 自動 (= 候補): `scripts/dev/check-custom-crud.mjs` (= 未起票、 Sess89 Phase 4 follow-up or Sess90+)
  - 4 領域 grep + 関数 set 揃い check
  - false positive 防止で warn 出力のみ (= R-65 と同 pattern)
- 手動: 新規 master/custom 領域追加 PR review 時に CRUD 7 関数の揃いを確認

### 関連

- ADR-0049 §Notes Amended Sess89 PR-4 (= 本 R 起票元、 Grandfathered 緩 削除/編集 OK 実装完了)
- ADR-0026 §Notes Amended Sess89 PR-4 (= 樹形 raw text + 案 c atomic cascade matrix 確立)
- R-65 (= CRUD カバレッジ、 ADR 単独網羅性、 本 R は領域横断 補完)
- R-67 (= status × 操作 意味分化、 本 R は CRUD 関数揃い補完)
- 由来 PR: #1028 (= Phase 1 i18n) / #1030 (= Phase 2 樹種) / #1031 (= Phase 3 樹形 案 c) / 本 PR (= Phase 4 ADR + R-72)

### 由来

- 2026-06-09 Sess89 議論 (= テスター苦情「樹種/樹形カスタムの編集・削除は Pro? 予定?」) の真因 = ADR § Decision 「削除 OK」 と書きながら 4 ヶ月実装漏れが構造的に検出されなかった
- CLAUDE.md §9 「3 回再発で hook 化必須」 該当 (= Sess59 PR5 単独ではないが、 「ADR §Decision と §Acceptance の不整合」 は他 ADR でも潜在的に発生しうる構造問題)

---

## R 番号採番ルール (= 新規 R 起票時 必須手順、 Sess88 Issue #1024 由来)

### ルール

新規 R 番号 (= R-72 以降) を 起票する 時、 必ず以下の手順で 採番:

```bash
pnpm r:next
# stdout: 「72」 (= 数値のみ)
# stderr (--verbose 時): main HEAD + 既存 R 番号 list + 最新 R + 次 R
```

または:

```bash
pnpm r:next --verbose
# 詳細表示で 既存 R 番号 全件 + main HEAD SHA 確認
```

### 由来 (= Sess83 PR #1019 hotfix 30 分ロス)

Sess83 で worktree base (= cedb7c1) で 「R-67 が最新 = R-68 が次」 と判断、 main HEAD (= 28e3a08) で 既に Sess81/82 で R-68/R-69/R-70 起票済 → **3 番号衝突** で R-71 rename hotfix 30 分ロス。

真因 = R 番号採番 process が **local worktree の specialized.md grep のみ** で remote main 進化 を 構造的に検知しない。

### 構造防御

- `scripts/dev/next-r-number.mjs` (= Sess88 Issue #1024 で 起票) が `git fetch origin main` → 全 R 番号抽出 → max + 1 を 出力
- worktree base が古くても **main HEAD base で 採番** されるため 衝突回避
- ADR-0046 「足す前ゲート」 + R-61 (機械判定 + 安全網) meta-rule の R 番号適用

### 関連

- Issue #1024 (= 本 script 起票元)
- Sess83-86 retro: `docs/reference/tasks/lessons/retro.md` § 教訓 2
- PR #1019 hotfix commit: 56550ef (= main merge + R-68 → R-71 rename)
- 関連 R: R-61 (機械判定 + 安全網) / ADR-0046 (足す前ゲート)

---

## 関連

- 親ファイル: `.claude/recurrence-prevention.md` (R-1 〜 R-12 全文 + R-13 〜 R-73 索引 + 運用ルール)
- `~/.claude/CLAUDE.md` — 個人横断ルール
- `AGENTS.md` — 全 AI エージェント共通ルール
- `.claude/CLAUDE.md` — Claude Code 固有挙動
- `.claude/hooks/` — 構造的防止 Hook 群 (R-33 → `check-obsolete-routes.mjs`)
- `scripts/obsolete-routes.json` — 廃止 route 一元管理 (Sess8 Retro S-2)
- `scripts/check-adr-sources.mjs` — ADR 業界事例 sources URL チェック (Sess8 Retro S-1)
- `scripts/dev/next-r-number.mjs` — R 番号採番 main HEAD base (= 上記 ルール 自動化、 Sess88 Issue #1024)
- `docs/reference/tasks/lessons/` — 技術 lesson (領域別フォルダ)

---

## R-69 pre-commit hook は新規開発環境 (= worktree / clone) でも自動配線される仕組み必須 (Sess82 PR-F 起票)

### 由来

Sess81 (2026-06-09) で PR #1008 / #1009 を出した時、 prettier format 違反 + ESLint dynamic env access + i18n 19 言語完備 という 3 つの独立する CI fail が発生し、 私 (= Claude) は 3 回 fix push で対応した。 調査で判明:

- `.lintstagedrc.js` (= Apr 2026 から存在) + `.githooks/pre-commit` (= May 2026 から存在) という **pre-commit hook 配線資産は揃っていた**
- `package.json` `prepare` script (= `git config core.hooksPath .githooks`) も既存
- しかし **`core.hooksPath` が `.git/hooks` のまま** (= prepare が走っていない or worktree 内で反映漏れ)
- 結果として hook が無効、 commit 時に prettier --write が走らず、 format 違反のまま commit + push → CI fail

### ルール

`.lintstagedrc.js` + `.githooks/pre-commit` を維持する場合、 以下を必須:

1. **`scripts/dev/check-hooks.mjs` で `core.hooksPath` verify + auto-fix**: `.githooks` でなければ 自動設定 (= 開発者の手作業ゼロ)
2. **`package.json` `prepare` script に `check-hooks` 呼出**: `pnpm install` 直後で自動配線 (= clone / worktree でも有効)
3. **`verify:hooks` script** で CI 検証 (= `--check` mode で `core.hooksPath` 不一致なら exit 1)

### 適用例 (Sess82 PR-F)

- `scripts/dev/check-hooks.mjs` 新規 (= 53 行、 `.githooks` 配線 verify + auto-fix + `--check` / `--quiet` フラグ)
- `package.json` `prepare`: `git config core.hooksPath .githooks && node scripts/dev/check-hooks.mjs --quiet` (= 確実に配線)
- `package.json` `verify:hooks`: `node scripts/dev/check-hooks.mjs --check` (= CI で配線崩れ検出)

### 検出 / 強制

- 開発者が `pnpm install` するだけで自動配線 (= 既存挙動 + 検証)
- CI workflow に `pnpm verify:hooks` を merge gate 化 (= 配線崩れ時に CI fail)
- 将来: `.git/hooks` を空にして「`.githooks` 以外無効」 を強制する pattern (= Sess83+ 候補)

### 関連

- 同型 meta-rule: R-61 (= 機械判定 + 安全網) / R-68 (= 外部サービス連携 ADR は preflight smoke test 配線済が Accepted 必須)
- 由来: Sess81 PR #1008 CI fail 3 回 + Engram id=511 (= prettier pre-commit 漏れ lesson)
- 適用先 ADR: 該当なし (= 環境設定ルール、 ADR ではなく R で起票)

---

## R-70 Claude が長期 polling / Monitor を armed する前に「同コマンドの 1 サイクル分の中間値を log 出力で verify」 必須 (Sess82 PR-H 起票)

### 由来

Sess82 (2026-06-09) で Claude が Sess81 振り返り対策 4 PR (#1014/1015/1016/1017) の CI 完了を待つために `Monitor` を armed、 polling 内で以下のコマンドを実行:

```bash
v=$(gh pr checks $pr --json name,state | jq -r '.[] | select(.name=="verify") | .state')
```

しかし `gh pr checks` は **`--json` フラグを完全サポートしない** subcommand で、 JSON ではない text 出力が返ったため `jq` が `parse error: Invalid numeric literal at line 1, column 8` を出して空文字列が返却。 私の Monitor script は「空文字列 = まだ pending = 待機継続」 のロジックだったため、 **既に 4 PR 全部 SUCCESS なのに 10 分 timeout まで待ち続けた**。

user が Monitor 表示を見て「既に green なのに待ち続ける理由はないから、 取得している情報先がおかしいんじゃない?」 と指摘して発覚。 Sess81 振り返りで「『画面 = OK = リリース OK』 罠 (= IAP 構造修復)」 を構造防御した直後に、 Claude 自身が「『Monitor = 動いている = OK』 同型の罠」 にハマったことが構造問題として認識された。

### ルール

Claude が以下のいずれかを armed する前に、 polling 内で実行されるコマンドの **1 サイクル分の中間値を log 出力で verify** すること:

- `Monitor` tool
- `Bash run_in_background=true` での long-running script
- cron polling (= CronCreate)
- 自前 `while true; do ... sleep ...; done` ループ

具体的には:

1. **初回 cycle で必ず verbose log 出力** (= 空文字列 / error / 不明な値が返るなら即検出)
2. **コマンドの仕様確認**: `--json` 等のフラグが完全対応か、 docs を確認
3. **同コマンドを armed 前に手動 1 回実行**して期待値が返ることを verify
4. **silent failure を fail-fast に**: 「空文字列 = pending」 等の暗黙 fallback を作らず、 「空文字列 = polling 経路故障」 として escalate

### 適用例 (Sess82 PR-H で実装)

- `scripts/dev/wait-pr-ci.mjs` (新規、 = 96 行) で本ルールを具体化:
  - `gh pr view --json statusCheckRollup` (= JSON 完全対応、 `gh pr checks --json` は不可) を使用
  - 初回 cycle (`cycle === 1`) で全 PR の状態を必ず verbose log 出力
  - `status: COMPLETED` + `conclusion: SUCCESS` で判定、 不明値は error として log

### 検出

- 同型 Monitor / polling 設定時に「初回サイクル log なし」 を疑う
- 「pending 永続」 が timeout 近くまで継続したら polling 経路の故障を仮定 + 別経路で 1 度確認
- Sess83+ で hook 化候補: Monitor armed 前に「polling コマンドを 1 度手動実行」 を強制する Claude 行動ルール

### 関連

- 同型 meta-rule: R-61 (= 機械判定 + 安全網) / R-25 (= 機械判定のみで達成判定禁止) / R-68 (= 外部サービス連携 ADR は preflight smoke test 配線済必須)
- 由来 PR: Sess81 振り返り対策 PR-D/E/F/G (= #1014/1015/1016/1017) の CI 完了監視 + Sess82 PR-H (本 R 起票 + wait-pr-ci.mjs)
- 「画面 = OK = リリース OK」 罠 (= IAP territory MN-only) と同型構造、 認知バイアス防止

---

## R-73 複数件 INSERT は bulk transaction ラッパー経由必須 (Sess89 PR-C 起票)

### ルール

caller が `recurrence_rules` / `events` / `bonsai` 等の DB エンティティを **複数件 INSERT** する場合、 必ず `bulkXxx` ラッパー (= `db.withTransactionAsync` 内で全件 INSERT、 失敗時 ROLLBACK 保証) を使用する。 caller での for ループ + 個別 `createXxx` 直接呼び出しは禁止。

### Why

- N 件中の M 件目で失敗した場合、 (1..M-1) 件は既に commit されていて、 (M..N) 件は未作成という **データ不整合** が発生する
- user 体験罠: Toast「5 件作成しました」 と表示されるが、 実際 DB には 3 件しかない状態
- 既存 `bulkScheduleEvents` / `bulkLogEvents` (Sess12) は本 pattern を踏襲済、 横断 SoT
- Sess89 PR-C で 「定期予定 対象の盆栽 複数化」 → `bulkCreateRecurrenceRules` 新設で R-73 明文化

### How to apply

1. 複数件 INSERT する関数を新設する時は **`bulkXxx`** 命名を採用
2. 内部実装は `await db.withTransactionAsync(async () => { for (...) await db.runAsync(INSERT); })`
3. caller (= UI 層) は `inputs[]` 配列を渡すだけ、 transaction を意識しない
4. test で 「N 件中 M 件目で例外 → 全件 rollback (DB に 0 件残る)」 を verify

### 適用例 (Sess89 PR-C で実装)

- `src/db/recurrenceRuleRepository.ts:131` に `bulkCreateRecurrenceRules(inputs)` 新設
- `RecurrenceFormScreen.handleSave` で N 件 input 配列を一度に渡す
- 既存 `createRecurrenceRule` (= 単数) は後方互換のため維持

### 検出

- 新規 PR の review 時、 caller 内の `for (...) await createXxx(...)` 直接呼び出しを grep で発見
- ADR で「複数件作成」 use case が出てきたら R-73 適用を確認

### 関連

- 同型 pattern: `bulkScheduleEvents` (Sess12) / `bulkLogEvents` (Sess12) — 同 transaction wrapper
- 由来 ADR: ADR-0056 D2 (= recurrence_rules schema、 単数 bonsai_id NOT NULL)
- 由来 PR: Sess89 PR-C (本 R 起票)
- meta-rule: R-25 (= 機械判定で達成確認) / R-70 (= 中間 log で silent failure 防止)

---

## R-74 Stack screen の title 配線は `<Stack.Screen options>` + `useEffect(setOptions)` 両方必須 (Sess90 PR-A 起票)

### ルール

`app/<screen>.tsx` で React Navigation の Stack header に title を表示する場合、 以下 2 つを **両方** 実装する:

1. **`<Stack.Screen options={{title: t('...')}} />`** (= 初回 mount 用 declarative、 body 先頭に配置)
2. **`useEffect(() => navigation.setOptions({title: t('...')}), [navigation, t, lang])`** (= 言語切替時の動的更新)

片方だけだと、 **初回 mount に title 出ない** (= setOptions だけ) or **言語切替で title が古い言語のまま残る** (= options だけ) のいずれかの bug が発生する。

### Why

- `<Stack.Screen options={{...}} />` だけだと React Navigation が options を初回 mount 時に static snapshot として記録し、 i18n の `t()` が言語切替で別文字列を返しても再評価されない (= transient bug、 Sess74 PR-3 / E2 発端)
- `useEffect setOptions` だけだと、 初回 mount 時に effect 実行前に header が描画され、 一瞬 raw route 名 (= 「custom-species」 等) が ちらつく
- 2 段 pattern で両方の罠を相互補完

### How to apply

1. `import { Stack, useNavigation } from 'expo-router';`
2. `const { t, lang } = useTranslation();` (= `lang` を必ず取得)
3. `const navigation = useNavigation();`
4. `React.useEffect(() => { navigation.setOptions({ title: t('<key>') }); }, [navigation, t, lang]);`
5. JSX の body 先頭に `<Stack.Screen options={{ title: t('<key>') }} />`
6. body 内の `<ThemedText type="title">{t('<key>')}</ThemedText>` (= 旧 large title) は **削除** (Stack header と duplicate)、 desc 行 (= 画面意図説明) は keep

### 適用例 (Sess90 PR-A で実装)

- `app/custom-species.tsx` (= 旧 raw「custom-species」表示 bug fix)
- `app/custom-styles.tsx` (= 旧 raw「custom-styles」表示 bug fix)
- `app/tags.tsx` (= 旧 raw「tags」表示 bug fix)
- 正典 reference: `app/settings/index.tsx` (Sess74 PR-3 = E2 Amendment)

### 検出

- 新規 PR で `app/<screen>.tsx` を追加した時、 reviewer は `Stack.Screen` と `setOptions` の両方を grep
- 既知の漏れ候補: `app/onboarding/welcome.tsx` (= `headerShown:false` で代替済、 適用外)
- **配線済 (Sess90 PR-C)**: `scripts/dev/check-stack-screen-title.mjs` で grep lint 配線 + `pnpm verify` に統合 (= `verify:stack-screen-title`)。 `useTranslation` 使用かつ `Stack.Screen options` / `setOptions` 片方欠落を warning 出力 (= ALLOWLIST = `app/tag-edit.tsx` 等の意図的 例外 除外)。 Sess90 PR-C 時点で全 35 file 走査 / ok=7 / skip=28 / warn=0。 ESLint AST rule 化は false positive 観察後 (Sess91+) で検討

### 関連

- 同型 pattern (= 半分): R-?? `<Stack.Screen options>` 単独 (= Sess66 PR5 SoT 確立、 ADR-0053 本文)
- 完全 pattern 確立: ADR-0053 Sess74 PR-3 Amendment (E2 動的 title 更新) + Sess90 PR-A Amendment (本 R 起票で 3 screen 配線漏れ修復)
- meta-rule: R-25 (= 機械判定で達成確認) / R-55 (= 関連項目網羅調査)
- 由来 PR: Sess90 PR-A (本 R 起票)

---

## R-75 screen header の font geometry hardcode 禁止、 token 参照必須 (Sess90 PR-A 起票)

### ルール

画面ヘッダー (= タブ画面の自前 SearchHeader / Stack 画面の React Navigation native header) の **`fontFamily / fontSize / lineHeight / letterSpacing` を file 内に hardcode することを禁止**。 必ず `src/core/theme/typography.ts` の以下 2 token を spread して使用する:

- `screenTitleTab` (= タブ画面 22pt NotoSerifJP_500Medium)
- `screenTitleStack` (= Stack 画面 18pt NotoSerifJP_500Medium)

### Why

- Sess90 PR-A 時点で 4 箇所に font 設定が分散していて (= SearchHeader.tsx 22pt / app/_layout.tsx 未指定 / settings/_layout.tsx 重複 hardcode / (tabs)/plan/_layout.tsx 20pt の 第三の値)、 ユーザー報告「タブ画面と Stack 画面で統一性がない」 が顕在化
- font 変更を一律適用する時、 file 横断 grep を漏れなくする保証がない (= 「3 箇所修正したが 1 箇所だけ古い値が残る」 罠)
- token SoT 化で「change one place, takes effect everywhere」 保証

### How to apply

#### タブ画面 (= 自前 component)

```tsx
import { screenTitleTab } from '@/src/core/theme/typography';
<ThemedText style={[screenTitleTab, { color: c.text }, /* layout props */]}>
```

#### Stack 画面 (= root `app/_layout.tsx` および nested `_layout.tsx`)

```tsx
import { screenTitleStack } from '@/src/core/theme/typography';
<Stack screenOptions={{
  headerTitleStyle: { color: c.text, ...screenTitleStack },
  // ...
}}>
```

#### 重要: Expo Router の nested Stack は root から cascade されない

`app/_layout.tsx` の root `<Stack screenOptions>` は **nested Stack に cascade しない** (= 各 nested Stack は独立インスタンス)。 そのため `app/settings/_layout.tsx` / `app/(modals)/_layout.tsx` / `app/(tabs)/plan/_layout.tsx` / `app/(tabs)/bonsai/_layout.tsx` でも **明示的に `screenTitleStack` を spread が必要**。

### 適用例 (Sess90 PR-A で実装)

- `src/features/bonsai/SearchHeader.tsx` (= 旧 hardcoded 22pt 削除 → `screenTitleTab` 参照)
- `app/_layout.tsx` (= root global screenOptions に `...screenTitleStack` 追加)
- `app/settings/_layout.tsx` (= 重複 hardcode 削除 → `...screenTitleStack` 参照)
- `app/(modals)/_layout.tsx` (= 新規 `headerTitleStyle: screenTitleStack` 追加)
- `app/(tabs)/plan/_layout.tsx` (= 20pt hardcode 削除 → `headerTitleStyle: screenTitleStack`)
- `app/(tabs)/bonsai/_layout.tsx` (= 新規 `headerTitleStyle: screenTitleStack` 追加)

### 検出

- 新規 PR の review 時、 `app/**` 配下で `fontFamily: 'NotoSerifJP_500Medium'` / `fontSize: 17` / `fontSize: 18` / `fontSize: 22` の hardcode を grep
- **配線済 (Sess90 PR-C)**: `scripts/dev/check-screen-header-typography.mjs` で grep lint 配線 + `pnpm verify` に統合 (= `verify:screen-header-typography`)。 header context (= `headerTitleStyle` / `headerStyle` / `headerTintColor` を直近 5 行 lookback) のみで font hardcode + `c.surface` 直書きを warning 出力 (= body の card 系 c.surface は誤検出回避)。 Sess90 PR-C 時点で全 47 file 走査 / warn=3 件 (= body 内 NotoSerifJP 残存 検出、 別 PR scope)
- ESLint AST rule 化は 3 回再発 (= 本 PR で 1 回目) で検討 (CLAUDE.md §9 記憶の昇華ルール)

### 関連

- 同型 SoT pattern: ADR-0029 D1 form atom typography token (= `formLabel` / `formCounter` 等)、 Sess17 で warning lint 配線済
- design_system.md §3-4 Screen header typography contract (= 本 R 75 で参照される token spec)
- 由来 ADR: ADR-0053 Sess90 Amendment (= 本 R 75 と同 PR で確定)
- 由来 PR: Sess90 PR-A (本 R 起票)
- meta-rule: R-55 (= 関連項目網羅調査、 1 箇所修正で他 N 箇所漏れ防止)

---

## R-76 master/custom 領域 管理画面 UI 統一 SoT meta-rule (Sess91 PR-4 起票)

### ルール

`/tags` / `/custom-species` / `/custom-styles` (= 将来「カスタム肥料」「カスタム道具」 等 追加領域) で表現される 「**機能領域の master/custom 管理画面**」 は、以下 5 軸の SoT (= Single Source of Truth) を必ず守る:

| 軸 | SoT | 必須要素 |
|----|-----|----------|
| (a) styles | `src/features/manager-screen/managerScreenStyles.ts` | container / scroll / desc / addBtn / addBtnText / empty / rowWithToggle / rowWithoutToggle / rowMain / rowMainTextWrap / rowStats / rowStatsUnused / kebabButton / toggleArea / chevronWrap / masterBadge / expandedArea / moreLink |
| (b) row layout | 横並び (= name LEFT + stats RIGHT space-between) + 左 toggle ▶/▼ (= rowWithToggle) | flexShrink で長文 name overflow 対策、 numberOfLines={1} ellipsizeMode="tail" |
| (c) 操作 | row 主部 tap → 編集画面 push、 右 kebab (⋮) → RowActionMenu (編集 + 削除 2 択) → ConfirmDialog | ADR-0036 D7 整合、 master row は kebab 非表示 (= 編集/削除ロック整合) |
| (d) inline 展開 | 左 toggle ▶/▼ → 関連盆栽 BonsaiCard inline 展開 (= PEEK_LIMIT=3 + 「もっと見る (残り N 件)」 link) | Free 全開放、 retrieval 関数は repository に extract (= R-72 整合) |
| (e) addBtn | JSX 側で `+ ` prefix を挿入 (i18n 値からは prefix 撤去) | アラビア RTL 安全 + 統一性、 i18n key 値は domain verb のみ (= 「樹種を追加」「Add species」) |

### Why

`/tags` (Sess9 PR-10、 2026 年初頭) と `/custom-species` `/custom-styles` (Sess89、 2026-06-09) を別 session で独立実装した結果、 row 構造 (= 横並び vs 縦並び)、 toggle 有無、 kebab 有無、 ChevronRight vestigial 残存、 addBtn の prefix 戦略 etc. で **見た目バラバラ + 操作迷い** が発生。 user 報告「タグを管理 をほぼ全て転用したつもりでしたが全然なっていません」 (Sess91)。

5 Whys 真因 = 「機能領域の管理画面 UI 共通 SoT が存在せず、 各実装者 (= Claude Code) が 2 つの先行画面 (= `/tags` と `RecurrenceListScreen`) の劣化合成を生んだ」。 R-72 (= CRUD repository 層 SoT、 Sess89 PR-4 起票) を起票した直後だが、 UI 層は別物として漏れた = CLAUDE.md §9 「3 回再発で hook 化必須」 該当 (= 3 領域目で気付くべき共通化機会の見逃し)。

### How to apply

新規「カスタム X」 領域 (例: カスタム肥料 / カスタム道具) を追加する際:

1. `.claude/templates/manager-screen-template.tsx` を copy して `app/custom-<x>.tsx` 作成
2. `managerScreenStyles` を import (= 新規 StyleSheet 作成しない)、 共通 styles SoT 参照
3. `<RowActionMenu>` + `<ConfirmDialog>` 経由の編集/削除動線必須 (= ADR-0036 D7)
4. retrieval 関数を `bonsaiRepository.ts` に extract (= `getAllActiveBonsaiByCustom<X>Id(<x>Id, locale)` 等)、 R-72 SoT 整合
5. addBtn label は JSX 側で `+ ` prefix、 i18n 値は domain verb のみ
6. `scripts/dev/check-manager-screen-symmetry.mjs` 走査対象に追加して構造同型 lint
7. ふりかえりタブ Hub card (`app/(tabs)/look-back/index.tsx`) に新 card 追加

### 検出

- **配線済 (Sess91 PR-4)**: `scripts/dev/check-manager-screen-symmetry.mjs` で `app/tags.tsx` / `app/custom-species.tsx` / `app/custom-styles.tsx` の 3 画面間で 必須 element 数 (= `managerScreenStyles.rowWithToggle` / `RowActionMenu` / `ConfirmDialog` / `toggleArea` / `kebabButton` / `expandedArea` 出現回数) を grep + Compare、 不整合あれば exit 1 warning。 ESLint AST rule 化は 3 回再発 (= 本 PR が 1 回目の構造防御、 SoT 違反観察後の昇格を Sess92+ で検討)。
- 新規 PR で `app/<管理画面>.tsx` を追加した時、 reviewer は本 R-76 の (a)〜(e) 5 軸チェックリストで confirm

### 関連

- 由来 ADR: ADR-0036 §Notes Amended Sess91 PR-4 (= 本 R 76 で SoT 明記)
- 由来 PR: Sess91 PR-1 / PR-2 / PR-3 / PR-4 (= 4 PR シリーズで 5 軸全部実装、 本 R 起票)
- 連携 R: R-72 (= CRUD repository 層 SoT、 本 R 76 と論理 set)
- meta-rule: R-55 (= 関連項目網羅調査、 1 領域改修で 3 画面同時改修必須)
- 設計原典: `~/.claude/plans/elegant-kindling-finch.md` (Sess91 議論 plan 6 名チーム + 4 ペルソナ + 5 Whys)

## R-77 業界標準採用時のドメイン適合性チェックリスト (Sess93 議論起票)

業界標準 (= Apple/Google/Microsoft 等) の UX パターンを採用するとき、 自アプリの domain で同じ前提が成立するかを評価せず採用すると、 過去に user 苦情で 廃止した機能を 復活させてしまう。 Sess89 で 個別予定通知を全廃した直後、 Sess93 で「予定日に通知する」 トグル (= モックアップ案) を 採用しそうになり、 議論で 検出 (= 案 C トグル削除に修正)。

### 適用ルール

- 業界標準 UX (= モック由来、 競合 app 観察由来、 ペルソナ要望由来) を採用する設計判断には、 以下 3 質問の **明示回答を ADR / 議論記録に残す** こと。
  1. **業界が解決している問題 = 自アプリで発生しているか?** 業界が大量データ・高頻度操作・複雑タスクで 必要としている機能を、 自アプリの小規模 domain で 採用すると 過剰機能で UX 劣化。
  2. **業界が前提とする使用頻度 = 自アプリで同じか?** Apple Reminders は 数百件/日 のタスクを前提、 BonsaiLog 盆栽手入れは 数件/日。 通知頻度 / 入力頻度 / 表示密度 を 業界基準で採用すると 自アプリ user は うるさい / 過密 と感じる。
  3. **業界が許容する副作用 = 自アプリ user は許容するか?** 業界 user 層 (= プロ / IT リテラシー高) が 慣れている UI complexity を、 自アプリ user 層 (= 趣味、 シニア、 ライト) に そのまま適用すると 学習コスト高 → 離脱。

### 違反 pattern (= 自動検出 候補)

- ADR に 「業界標準」「Apple ライク」「Google 整合」 という根拠だけで 採用された 設計判断
- 過去 ADR の Notes Amended で「廃止」 「削除」 と記録された機能を 業界標準根拠で 復活させる PR
- 「モック が こう なって いる」 だけで 設計判断する 議論 (= R-16 「Design は下書き、 ADR が正」 と重複だが 業界標準特化版)

### 検証方法

- ADR template の Decision Drivers 欄に 「業界標準を採用する場合は R-77 3 質問への回答必須」 を追記
- 議論モードで モック準拠 / 業界整合 を 採用根拠とする発言があれば、 議論記録に R-77 3 質問への回答を追加

### 関連

- 由来 議論: Sess93 通知 card 案 C 採用 (= NotificationCard 案 A toggle ありを 案 C toggle なしに 議論で修正)
- 由来 ADR: ADR-0014 Sess93 Notes Amended / ADR-0056 Sess93 Notes Amended
- 連携 R: R-16 (= Design は下書き、 ADR が正)、 R-20 (= 「念のため」 再議論時の ADR Read 必須)
- meta-rule: ADR-0011「気遣い型」 哲学 (= 自アプリ domain 特有の核心)

## R-78 破壊的データ操作は user に事前通知必須 (Sess93 議論起票)

内部 logic で 「削除 + 再生成」 「上書き」 「cascade 連鎖更新」 等の **データ書換** を行う操作は、 user の認識ズレを起こす可能性が ある。 認識ズレ = user が「単純更新」 と思って 編集ボタンを押したが、 実際は 既存データが 一旦削除されて 再生成される → 過去に作った スケジュールが 消えた と感じる。

Sess93 RecurrenceFormScreen 編集モード = `replaceRecurrenceRule` (= softDelete + create wrapper) で 既存 planned events を 一旦 soft-delete + 新 RRULE で 再生成。 user は「ルール 1 件を 編集した」 つもりだが、 内部では 8 件の events が 削除 + 8 件 新規 = audit trail 不連続。 これを ConfirmDialog で 事前通知する 設計を 議論で確定。

### 適用ルール

- 「softDelete + create wrapper」「全更新 + cascade」「物理削除 + 再生成」 系の operation を 実装する画面は、 保存ボタン押下時に **ConfirmDialog で 事前通知** すること。
- ConfirmDialog の文言は:
  - 何が起きるか (= 例: 「既存予定は削除され、 新ルールで作り直されます」)
  - 影響範囲 (= 例: 「未実施分のみ」 「過去の記録は変わりません」)
  - キャンセル可能 (= 「キャンセル」 button 必須)

### i18n key 命名規約

- title key: `{domain}EditConfirmTitle` (= 例: `recurringEditConfirmTitle`)
- body key: `{domain}EditConfirmBody`
- confirm label: `{domain}EditConfirmConfirm` (= cancel は `t('cancel')` 共通流用)

### 違反 pattern (= 自動検出 候補)

- `softDelete + create` wrapper を 直接 onPress で 呼出 (= ConfirmDialog なし)
- `await replaceXxx` / `await bulkUpdateXxx` を 単独 button press で 実行 (= 事前通知なし)

### 検証方法

- `.claude/recurrence-prevention/specialized.md` R-78 を Sess93+ 全 PR で 適用、 違反検出は コードレビューで 都度指摘
- 「替えて再作成」 「全更新」 等の 文言を i18n key に 持つ画面の onPress 動線で ConfirmDialog 配線を grep 検証

### 関連

- 由来 議論: Sess93 RecurrenceFormScreen 編集モード ConfirmDialog 採用 (= 検討漏れ ii)
- 由来 PR: Sess93 PR-4 (= 編集時 ConfirmDialog 配線済)
- 連携 R: R-67 (= status を持つ entity の操作意味 matrix)、 R-71 (= 件数別 UX 表現契約)
- meta-rule: WCAG 3.3.4 Error Prevention (= 法的・金融・データ削除 系 操作は user 確認必須)

## R-79 コンテキスト残量を理由とした次セッション先送り禁止 (Doc-Truth Audit P2 起票)

Claude がタスクの一部を「次セッションで対応」と先送りする判断を、**コンテキスト残量を理由に単独で行わない**。目安として **コンテキスト消費 85% までは本セッション内で継続** する。

### 適用ルール

- 85% 到達前の先送り提案は禁止。先送りが必要 (= 85% 超 / scope 上の分割 / user 指定の停止条件) な場合は、**先送りする内容を明示して user 承認を取る**。
- user 自身が定めた停止条件 (例: 監査プロトコルの「残量が苦しくなったら即保存・停止」) がある場合は **そちらが優先** (= 本 R は Claude 単独判断の先送りのみを禁止)。
- 先送りを承認された場合は、再開に必要な状態 (= 進行 memory / Engram / 状態ファイル) を保存してから停止する。

### Why (由来)

Doc-Truth Audit P2 (2026-06-10) のセッションログ採掘 (= 全 134 transcript の user 訂正 198 件解析) で、同種 user 訂正が 2 回検出された:

- 2026-05-13: 「毎回思うんだけど、まだコンテキスト的に 52% しか消費されていません。85% くらいまでは問題なく、本セッションでやってください」
- 2026-05-15: 「本 task は次セッション継続ではなく、本セッションで対応してください」

CLAUDE.md §9 (2 回再発でルール化検討) に基づき起票。

### 検出

- セッション中に「次セッションで」「持ち越し」を Claude が提案した時、user 承認の有無を確認 (= reviewer / retro でチェック)
- 自動検出は困難 (= 会話文脈依存) のため、まずルール運用。3 回目再発で Stop hook (= 残量推定 + 先送り語検出 warning) への昇格を検討

### 関連

- 由来: Doc-Truth Audit P2 集計③ (docs/audit/doc-truth-audit-2026-06/state.md)
- 連携 R: R-17 (= 即時実行禁止 4 段階、先送りの逆方向の統制)
- meta-rule: CLAUDE.md §9 記憶の昇華ルール

## R-80 テスター報告起点の修正は報告手順の実機なぞり検証必須 (Sess95 起票)

テスター報告を起点とする bug 修正 PR は、**報告された再現手順をそのまま実機でなぞった SS / 動画を PR 本文 or コメントに添付**してから「修正完了」と報告する。リリースノートに「修正済」と書けるのは、この証拠がある項目のみ。

### 適用ルール

- 対象 = テスター / user の bug 報告を起点とする修正 PR (新機能 / refactor / docs は対象外、PR テンプレ §7.6.5 で対象外宣言可)
- 検証は「Jest pass + lint 0 件」では代替不可。**報告の再現手順 (例: 「盆栽編集 → スクロール → タグ追加 → 戻る」) を実機で再現**し、修正後の挙動を SS / 動画で記録する
- 実機が使えないセッションでは「実機検証は未実施 (次回セッション / user 手動)」を PR 本文に明示し、リリースノート記載を保留する

### Why (由来)

Sess72 (2026-06-07) でテスター苦情「タグ追加から戻ると先頭に戻る」を useScrollPreservation hook (PR #969-973) で修正し、リリースノートに「スクロール位置がなるべく維持されるようになりました」と告知した。しかし Sess95 (2026-06-10) でテスターから「**維持されるのではなく全画面 TOP に戻る**」と再報告。真因 = RAF 1 frame 復元が非同期 setState の layout 変動に追い越される race が残存していたが、完了判定が「Jest 単体 pass + lint warn 0」のみで、**報告された実フローでの実機再現確認が gate に含まれていなかった**。「直したと告知して直っていない」は信頼毀損が最も大きい failure mode。

### 検出 / 自動化

- PR テンプレ §7.6.5 (REQUIRED if テスター報告起点) でチェックリスト強制
- 将来候補: PR title/body に「テスター」「tester」を含む fix PR で SS 添付なしを warn する bot (R-61 機械判定方針)

### 関連

- R-25 (機械判定のみで達成判定禁止) / R-36.5 (navigation 変更の実機検証義務) の系譜
- 由来 PR: Sess95 PR-2 (#1079 = scroll 復元 race 構造修正、本 R の初適用)
