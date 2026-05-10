# 再発防止プロトコル（行動パターン）

> **セッション開始時に必ず読むこと**。
> このファイルは「**行動 lesson**」を集約。技術 lesson は `docs/reference/lessons.md` を参照。
> 役割分担: lessons.md = DB / Backup / ビルド等の技術領域、本ファイル = 全タスク横断の行動ルール。

---

## 12 ルール（過去セッションで再発した指示の構造化）

### R-1. 一括処理後の目視確認

- **ルール**: Python / sed / awk で複数行を一括置換した後は、必ず Read で目視確認 + grep で残存確認 + git diff 確認。
- **根拠**: 過去 2 回、想定外の場所まで置換された事例あり。
- **自動化**: `~/.claude/settings.json` Hooks で検知時に警告。
- **検証手順**:
  1. Python で変更した範囲を Read で開いて Claude Code が直接目視確認
  2. grep で関連キーワードを検索し、想定外の置換が起きていないか確認
  3. 変更前後の git diff を確認

### R-2. 履歴は ADR に集約、仕様書には現在の仕様のみ

- **ルール**: `docs/explanation`, `docs/reference`, `docs/how-to` に取り消し線・削除お知らせブロックを残さない。削除した機能の経緯は ADR にのみ書く。
- **根拠**: 仕様書が膨大になり、「現在の仕様」が読みにくくなる。5 年後の読み手が混乱。
- **自動化**: CI で取り消し線パターン (`~~F-[0-9]+~~|削除お知らせ|履歴のため残置`) を検出。

### R-3. UI 文言の品の良さ

- **ルール**: 直接的すぎる表現（「うるさい」「やめよう」等）、第三者団体名訴求（「協会推奨」「公認」等）、特定層偏重訴求（金額分解「1 日 ¥X」等は若年層向け、シニアに刺さらない）を避ける。
- **根拠**: ペルソナ評価で全層に刺さらないと判明した事例あり。
- **自動化**: `pnpm i18n:audit` の禁止語リストに追加。

### R-4. 不要な情報を残さない

- **ルール**: 「参考情報として残す」を理由に中途半端に機能や情報を残さない。完全採用 or 完全削除を徹底。
- **根拠**: ユーザー指摘「面倒な情報を見たくない、要らないものは入れない」。
- **自動化**: なし（人間判断、Skill チェックリストで強制）。

### R-5. 誰でもわかる説明

- **ルール**: 専門用語を使う場合は必ず 1 行の解説を併記。中学生でもわかる比喩を優先。タスクサマリは専門用語を使わない、グループ分け、所要時間目安、推奨順序を明記。
- **根拠**: グローバル `~/.claude/CLAUDE.md` §1 の「Clear Communication」徹底、過去 3 回「誰にでもわかるように」と指示された。
- **自動化**: Skill チェックリストで強制。

### R-6. 仕組み化優先（対処療法禁止）

- **ルール**: 「次から注意します」で済ませない。ESLint / CI / Hooks / DB CHECK / 型システムで構造的に防ぐ。
- **根拠**: グローバル `~/.claude/CLAUDE.md` §3 既存ルール。
- **自動化**: Skill チェックリストで強制。

### R-7. 議論深さ 3 ラウンド以上

- **ルール**: 議論で 1 回目の結論で終わらせない。「まだ表面化していない問題はないか?」を最低 2 ラウンド回す。
- **根拠**: 過去 3 回以上「まだ議論しましょう」と指示された。
- **自動化**: `/discuss` Skill チェックリストで「表面化していない問題 5 件以上」を強制。

### R-8. バイアス排除（フラット視点必須）

- **ルール**: 議論時、推奨案ありきで進めない。「そもそも論」の専門家を必ず 1 名立て、既存案を疑う。
- **根拠**: 過去複数回、推奨案バイアスを指摘された。
- **自動化**: `/discuss` Skill チェックリストで「フラット視点専門家 1 名以上」を強制。

### R-9. 既存ドキュメント先読み

- **ルール**: 推測で発言する前に、`docs/` `.github/` `AGENTS.md` `lessons.md` を grep で検索する。「事実」と「推測」を明示的に分ける。
- **根拠**: グローバル `~/.claude/CLAUDE.md` §1.1 既存ルール、過去「調べられることは調べて発言してください」と指示された。
- **自動化**: Skill チェックリストで強制。

### R-10. ペルソナ評価必須

- **ルール**: 議論時に必ず複数ペルソナで評価。プロジェクトに `docs/reference/personas.md` があれば自動 Read。無ければユーザーにペルソナ定義を確認してから議論を開始。
- **根拠**: 過去 3 回「ペルソナを立てて再評価」と指示された。
- **自動化**: `/discuss` Skill が `personas.md` を自動 Read、評価マトリクス必須。

### R-11. 質問は判断材料 + 推薦セット

- **ルール**: ユーザーに 2 択を投げない。各案の「メリット / デメリット / コスト / 業界事例 / 既存決定との整合」+ 「私の推薦 + 理由 + 反対意見」をセットで提示。
- **根拠**: 「2 択を言い寄られた」と指摘あり、判断材料がないと質問しにくい。
- **自動化**: Skill チェックリストで強制。質問フォーマットを Skill に明示。

### R-12. 残タスクは「誰でもわかる」レベルで提示

- **ルール**: 残タスクサマリ提示時は専門用語を使わない、機能名でグループ分け、所要時間目安、推奨順序、依存関係を明記。
- **根拠**: 過去 3 回「現状の残タスクを誰にでもわかるように」と指示された。
- **自動化**: なし（人間判断、Skill チェックリストで強制）。

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

- **ルール**: `pnpm verify` を `2>&1 | tail -N` 形式でパイプしない。失敗の exit code が tail の 0 で隠蔽される。代わりに `> /tmp/log 2>&1; echo EXIT=$?; tail -N /tmp/log` 形式で必ず exit code を確認。
- **根拠**: 2026-05-02 F-13 Phase 0 で `pnpm verify 2>&1 | tail -100` の background 起動 → 完了通知では exit 0 だったが、実際は format fail。誤って「全 7 ゲート緑」と報告しかけた。
- **自動化**: なし (Bash パイプ全般を block するのは過剰)、応答時の自己強制。

### R-23. 既存スキーマフィールド名を変更前に grep / Read で検証

- **ルール**: DB スキーマ由来の型 (Drizzle `$inferSelect`、Valibot output) のフィールド名を初めて使う時、必ず schema.ts を Read して実際のフィールド名を確認する。型推論まかせで書かない。
- **根拠**: 2026-05-02 F-04 純関数で `Event.kind` (実際は `Event.type`) / `occurredAtTzOffsetMin` (実際は `tzOffsetMin`) を書いてしまい type-check fail。Edit で修正必要だった。
- **自動化**: ESLint `no-restricted-syntax` で頻出する誤用パターン (`event.kind` 等) を error にする。本セッションで導入済 (eslint.config.js)。

### R-24. lessons.md / recurrence-prevention.md の肥大化防止

- **ルール**: lessons/<area>.md = **200 行以内**、recurrence-prevention.md = **250 行以内** を維持。超過したら新ファイル分割 or 既存を hook / ESLint / CI に昇華して削除。同一テーマで 3 件以上たまったら自動化への昇華を必須化。
- **根拠**: lessons.md が膨大になると重要部分が読まれない (ユーザー指摘 2026-05-03)。注意で済ませず構造的に防ぐ。
- **自動化**: `scripts/docs-lint.mjs` の `checkRuleDocsLineLimit()` で行数上限を error 検出。

### R-25. ADR Decision と実コードの整合性チェック (spec-code drift)

- **ルール**: ADR の Decision で具体的な技術仕様 (DB schema、SDK バージョン、tokenize オプション等) が書かれている場合、実装着手前 + Phase 完了前に該当ファイルを Read + grep で ADR と整合確認する。テストや CI 緑だけでは drift 検出できない。
- **根拠**: 2026-05-03 セッションで `events_fts` の `tokenize="trigram"` (実コード) と ADR-0008 §4.3.4 の `tokenize='trigram remove_diacritics 1' detail=column` (仕様) の乖離を発見。F-09 検索 Phase H まで進んでいたが drift は気付かれず、構造的検出機構が無かった。
- **自動化候補**: ADR の Decision セクションから「具体的な hex / SQL / バージョン文字列」を抽出して、対応するコード/設定ファイルに対して grep する CI スクリプト (将来検討、現状は人間レビューで対応)。

### R-27. Issue 起票前に既存実装を Explore で確認

- **ルール**: 機能 Issue (`gh issue create`) を起票する**前**に、当該機能名で Explore agent または `grep` で既存実装の有無を確認し、結果を Issue 本文の「既存実装の確認」セクションに必ず貼る。「コンポーネント / DAO / store / hook の有無」「TODO コメントの有無」「Issue スコープ (新規 / 拡張 / バグ修正 / データ問題)」を 4 区分で記載。
- **根拠**: 2026-05-06 セッションで Issue #253 #254 を起票した際、`HomeFilterTabs` (フィルタロジックの TODO のみ) と `BonsaiCard` (実装済み) を見落とし、後で Explore して「実は実装済み」と判明 → #254 close、#253 のスコープを「新規 UI 追加」から「フィルタロジック実装」に修正する手戻りが発生した。同様の事例が 2 回 (#253 / #254 で同時に発生)。
- **自動化**: `.github/ISSUE_TEMPLATE/feature_request.yml` の `existing_implementation_check` セクションを `required: true` で構造的強制。さらに `report.ts` (UI diff レポート) のテンプレに「データ問題 vs 実装問題の判別フロー」を組み込み (ADR-0021 §Acceptance、本セッション PR で実装)。

### R-26. 外部 Design 部分採用判定時のブランド統一感評価 + 画面マップ必須化

- **ルール**: Claude Design / Figma / Wireframe 等の外部 Design を **部分採用 / 全面採用** 判定する議論で、`/discuss` Skill に **「ブランド統一感」軸** を 4 ペルソナと同列の独立評価軸として必須化。さらに ADR Notes に **「Design 画面 → 実装画面 マップ表」** を必ず記載 (採用しない画面も「不採用」と明記)。
- **根拠**: 2026-05-04 ADR-0019「Claude Design 部分採用」を 35 PR で実装後、2026-05-05 実機検証で user 期待 (100% 採用) と乖離が発覚。原因は (1) 4 ペルソナ評価のみで「アプリ全体のデザイン統一感」を捕捉できなかった、(2) Claude Design の `home-screens.jsx HomeScreen` が実装の「盆栽タブ」に対応するという画面マッピングが ADR Notes に無かった、の 2 点。ADR-0020 で全面採用に切替時に 5 軸評価 + 画面マップ表を実施し全項目 ○ 以上を確認。
- **自動化**: `/discuss` Skill チェックリストに「外部 Design 取込時の 5 軸評価 (4 ペルソナ + ブランド統一感)」「画面マップ表 ADR Notes 必須記載」を追加。`scripts/design-mapping-check.mjs` (将来) で ADR 内マップと Design ファイル名の突合検査。

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

---

## 運用ルール

1. **本ファイルはセッション開始時に必読**（`AGENTS.md` Session Start Checklist 経由）。
2. **新たな再発パターンが見つかったら本ファイルに追記**（lessons.md ではなく）。
3. **R-N の番号は変更しない**（既存参照を破壊しない、削除する場合は「~~R-N: 削除~~」と注記）。
4. **項目が 30 を超えたら別ファイル分割を検討**（**250 行以内** を維持、現状 R-1〜R-29）。`scripts/docs-lint.mjs` で自動検出。
5. **R-13 以降は Hook で構造的に防止**（注意ではなく仕組み化、`.claude/hooks/` 参照）。
6. **3 回再発で昇華必須**（CLAUDE.md §9 記憶の昇華ルール）: 同一テーマが lessons / recurrence-prevention に 3 件以上溜まったら、hook / ESLint / CI / 型システムで構造的に防ぐ仕組みに昇華し、下位記憶からは該当記述を削除する。

## 関連ファイル

- グローバル `~/.claude/CLAUDE.md` — 個人横断ルール
- プロジェクト `AGENTS.md` — 全 AI エージェント共通ルール
- プロジェクト `.claude/CLAUDE.md` — Claude Code 固有挙動
- プロジェクト `.claude/hooks/` — 構造的防止 Hook 群（R-16/R-18/R-19/R-20 自動化）
- プロジェクト `.claude/settings.json` — Hook 登録
- プロジェクト `docs/reference/tasks/lessons/` — 技術 lesson（領域別フォルダ、`lessons/db.md` 等）
- プロジェクト `docs/reference/personas.md` — ペルソナ定義（議論時に自動 Read）
