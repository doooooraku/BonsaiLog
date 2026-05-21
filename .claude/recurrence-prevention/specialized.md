# 再発防止プロトコル — 専門ルール (R-13 〜 R-33)

> 本ファイルは `.claude/recurrence-prevention.md` (親) の詳細部分。
> 親ファイル = R-1 〜 R-12 全文 + R-13 〜 R-33 索引 + 運用ルール。
> 本ファイル = R-13 〜 R-33 詳細記述。
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

## 関連

- 親ファイル: `.claude/recurrence-prevention.md` (R-1 〜 R-12 全文 + R-13 〜 R-41 索引 + 運用ルール)
- `~/.claude/CLAUDE.md` — 個人横断ルール
- `AGENTS.md` — 全 AI エージェント共通ルール
- `.claude/CLAUDE.md` — Claude Code 固有挙動
- `.claude/hooks/` — 構造的防止 Hook 群 (R-33 → `check-obsolete-routes.mjs`)
- `scripts/obsolete-routes.json` — 廃止 route 一元管理 (Sess8 Retro S-2)
- `scripts/check-adr-sources.mjs` — ADR 業界事例 sources URL チェック (Sess8 Retro S-1)
- `docs/reference/tasks/lessons/` — 技術 lesson (領域別フォルダ)
