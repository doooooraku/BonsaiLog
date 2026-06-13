# 再発防止プロトコル（行動パターン）

> **セッション開始時に必ず読むこと**。
> このファイルは「**行動 lesson**」を集約。技術 lesson は `docs/reference/tasks/lessons/` (索引 = `lessons/README.md`) を参照。
> 役割分担: lessons/ = DB / Backup / ビルド等の技術領域、本ファイル = 全タスク横断の行動ルール。
> **R-13 以降 (専門ルール) の詳細記述は `.claude/recurrence-prevention/specialized.md` を参照** (R-24 ファイル分割対応、2026-05-16)。

---

## 汎用ルール R-1 〜 R-12（過去セッションで再発した指示の構造化）

### R-1. 一括処理後の目視確認 (+ レポート系生成後の Claude self-verification、 Sess5 拡張)

- **ルール**:
  1. Python / sed / awk で複数行を一括置換した後は、必ず Read で目視確認 + grep で残存確認 + git diff 確認
  2. **(Sess5 拡張)** pairing-report.html 等のレポート系を生成した後は、 Claude 自身が Read or base64 chunk grep で新コンテンツが埋め込まれているか目視確認すること。 「✅ 生成完了」 ログだけで user 報告 NG (R-1 verification 漏れ)
- **根拠**: 過去 2 回、想定外の場所まで置換された事例あり。 Sess5 で pairing-report 生成後に Read せずに user 報告 → 古い SS が表示されたまま、 user に二度手間を強いた。
- **自動化**: `~/.claude/settings.json` Hooks で検知時に警告。(旧 pairing-report の SS 反映確認 log は ADR-0059 ui-diff 退役で削除)。
- **検証手順**:
  1. Python で変更した範囲を Read で開いて Claude Code が直接目視確認
  2. grep で関連キーワードを検索し、想定外の置換が起きていないか確認
  3. 変更前後の git diff を確認
  4. **(Sess5 拡張)** pairing-report 等のレポート生成時は base64 chunk grep で新コンテンツ反映を検証 (`base64 -w0 <new>.png | cut -c 500-700 | grep -f - report.html`)

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

### R-9. 既存ドキュメント / スクリプト 先読み

- **ルール**: 推測で発言する前 + 新規ファイル作成前に、`docs/` `.github/` `AGENTS.md` `lessons.md` `scripts/` `package.json` を grep で検索する。「事実」と「推測」を明示的に分ける。新規スクリプト作成時は **`grep -rn 'similar-purpose' scripts/`** + **`package.json` scripts** を必ず確認。
- **根拠**: グローバル `~/.claude/CLAUDE.md` §1.1 既存ルール、過去「調べられることは調べて発言してください」と指示された。**2026-05-11 セッション**で i18n-add.mjs を新規作成しかけたが既存 `scripts/i18n-add-key.mjs` (`pnpm i18n:add-key`) があり重複削除した。PR テンプレ §7.5 (R-29 5 段階チェックリスト) も同様に既存だったが見落とした。
- **自動化**: Skill チェックリストで強制。新規 script 追加時の grep 確認は `lessons/auto-improve-loop.md` §2 に既存スクリプト一覧を集約。

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

---

## 専門ルール R-13 以降（最新番号は本索引が正、詳細は `recurrence-prevention/specialized.md`）

| ID | テーマ | 1 行サマリ |
|----|--------|-----------|
| **R-13** | 議論モードでの質問数・ラウンド数の予告 | `/discuss` 起動時に「N 件質問 / M ラウンド」を冒頭で予告 |
| **R-14** | 専門用語ゼロモード (シニア向け) | ユーザー「わからない」発言で専門用語に「やさしい言い換え」併記強制 |
| **R-15** | MCP ツールのハング判定 | `mem_save` 等 30 秒以上応答ないらハング扱い、user に 3 択 (継続/キャンセル/代替) 報告 |
| **R-16** | Design / モックアップ参照時の SoT 明示 | UI = OpenDesign、ビジネス仕様 = ADR を冒頭明示 |
| **R-17** | 「全部推薦で OK」 即時実行禁止 (4 段階) | 包括承認後も TaskCreate → 計画 → 承認 → 実行 を厳守 |
| **R-18** | ~~Read 前 Edit の絶対禁止~~ (退役) | **退役 2026-06-11 (#1144)**: `check-read-before-edit.mjs` (PreToolUse exit 2) が全文を構造強制、違反は機械的に不可能。hook 撤去時は本 R を復活させること |
| **R-19** | Engram 保存は短い要約版 | `mem_save` content ≤ 1KB、長文は ADR / Issue 本文へ |
| **R-20** | 「念のため」 議論前に既存 ADR Read | 「念のため」「再検証」 検知時、議論前に既存 ADR を必ず Read |
| **R-21** | ~~並列サブエージェントは worktree 隔離~~ (退役) | **退役 2026-06-11 (#1144)**: `check-agent-isolation.mjs` (PreToolUse exit 2) が構造強制 (background Agent の isolation 未指定を block)。hook 撤去時は本 R を復活させること |
| **R-22** | verify exit code 保全 | background `pnpm verify` で 末尾 tail/pipe 禁止、`grep -E '^EXIT='` で明示確認 |
| **R-23** | スキーマフィールド名 grep 検証 | Drizzle / Valibot 型のフィールド名を初使用時、schema.ts Read |
| **R-24** | 行数上限 (肥大化防止) | lessons/<area>.md ≤ 200 行、recurrence-prevention.md ≤ 250 行 |
| **R-25** | spec-code drift + 機械判定禁止 | ADR と実コード grep 整合 + Claude Read による構造系 **5** 項目評価 (Sess34 ADR-0041 で 4→5 拡張: タブ / セクション / UI 種別 / スクロール範囲 / **EventRow 表示モード + sub-layout**) |
| **R-26** | 外部 Design 採用時の 5 軸評価 | 4 ペルソナ + 「ブランド統一感」 軸 + 画面マップ表必須 |
| **R-27** | Issue 起票前に Explore 確認 | gh issue create 前に既存実装 grep、結果を Issue 本文に記載 |
| **R-28** | UI 表現 vs ビジネス仕様 境界判定 | 7 ステップ判定フローで適切な SoT 選択 + 更新プロセス決定 |
| **R-29** | 写経駆動開発 5 段階 | mockup Read → mockup SS Read → RN Read → RN 撮影 → 並列比較 |
| **R-30** | 外部 lib stability PoC | testing lib 変更時 2/2 = 100% 厳格基準で PoC、plan B 先確定 |
| **R-31** | Maestro flow 作成時の事前確認 (一部 hook 昇華済み) | 人間手順 = testID grep + `_template.yml` 使用 + runtime は uiautomator dump 確認。text tap / 誤 appId は hook + verify:maestro が機械強制 (#1144) |
| **R-32** | commit 直前の git diff --cached 目視 | staged 内容と議論修正項目の整合確認、git restore 罠回避 |
| **R-33** | route / Phase 変更時の影響範囲全網羅 grep (一部 hook 昇華済み) | 人間手順 = 廃止 path 全 grep + PR 付録 §7.8 記載 + `obsolete-routes.json` 登録 + 楽観計上禁止。登録済み route の再使用は hook が機械 block (#1144) |
| **R-34** | 議論承認の整合性確認 (同類カテゴリ複数項目) | AskUserQuestion で同類カテゴリ (例: 「Home 要素」 D2/D3) 複数項目を 1 質問に詰め込まない。 個別質問に分離 OR 推薦案明示後に各項目について逐次確認。 Sess9 PR-2 (D2/D3 混同) で revert ロス。 詳細: `lessons/discuss.md` |
| **R-35** | 議論時 alternative 必須提示 + 業界事例「現状最適解」 明示 | 議論 Round で初期案 1 つだけでなく alternative 2-3 案を必ず併記。 業界事例リサーチで「最新トレンド = 現状最適解」 を明示し、 古いパターン (Apple Notes long-press 等) を「業界 outdated」 と判定。 Sess9 PR-9 → PR-10 long-press → toggle 60 分ロスが根拠。 詳細: `lessons/discuss.md` |
| **R-36** | navigation API 使用時 1 次情報確認 + 実機検証必須 | `router.dismissAll` / `router.canDismiss` 等 expo-router API の挙動を **docs/source で確認 + 実機で挙動検証** してから採用。 `while (canX) { doX() }` パターンは無限 loop リスクで禁止 (max iteration limit or 別 API)。 Sess12 PR-F で canDismiss loop → JS thread freeze 事例。 **Sess18 PR-3 (2026-05-21) で R-36.4/R-36.5 追加**: **R-36.4 UX 評価必須**: 新規 navigation 実装時、 「← で戻ったら user は何画面戻ったと感じるか」 を議論 step として必須化 (ADR-0030 §17 Case A/B/C 分類)。 **R-36.5 実機検証義務**: navigation 変更を伴う PR は実機で ← back button + 画面端 swipe gesture の両方の挙動 SS を PR 添付必須 (PR テンプレ §7.6)。 Sess17 違和感 ④ (戻る 2 画面飛び) が Case C 不明確で発生した教訓。 詳細: `lessons/navigation.md` + `docs/adr/ADR-0030.md` |
| **R-37** | 仕様 TBD (未確定) は ADR §TBD として明示残し | 議論で「あとで決める」 で先送りした仕様は ADR / Issue に `§TBD` として明文化、 実装時に user 承認で確定。 Sess12 PR-G で log mode の note 仕様 (a/b/c) を未確定で進めかけた事例。 |
| **R-39** | useFocusEffect callback の deps 必須 + store-callback chain 限定用途 | useCallback deps に component scope 関数を必ず含める / `exhaustive-deps` disable コメント禁止 (例外は ADR 起票) / store-callback chain は ADR-0030 Case A/B のみ許容、保存後遷移は直接 await + router.replace。検出: `scripts/check-navigation-patterns.mjs` AP-3。Sess19 ADR-0031 D5 由来。詳細: `recurrence-prevention/specialized.md` |
| **R-40** | i18n 翻訳適用前の翻訳禁止リスト確認 | 翻訳適用 PR 着手前に ADR-0033 D3 の翻訳禁止リスト (bonsai/nebari/jin + 樹形音訳 等) を必読・厳守。`scripts/i18n/apply-translation.mjs` が常時 warn (Sess101 で glossary.md 廃止、SoT は ADR-0033 D3 + script 内蔵 table)。詳細: `recurrence-prevention/specialized.md` |
| **R-41** | user 視覚 string の直書きハードコード禁止 | JSX 内日本語 / title・label・placeholder 等 props / Alert・Toast 引数の user 表示 string は i18n key 化必須。`pnpm verify:hardcode` で機械検出。Sess20 ADR-0033 D2 由来。詳細: `recurrence-prevention/specialized.md` |
| **R-42** | 色で意味を伝える UI は アイコン or pattern 必ず併用 (WCAG 1.4.1) | 状態 (planned/logged/error/warning) や severity を **色のみ** で識別する UI 設計禁止。 アイコン形状 (●/○/✓) or pattern (縞模様) で重複表現。 WCAG 2.1 SC 1.4.1 Level A 必達。 Sess22 ADR-0034 D3 由来 (planned/logged dot 緑/茶 色のみ識別が色覚多様性 + シニア老眼 + 屋外モードで不能)。 詳細: `recurrence-prevention/specialized.md` |
| **R-43** | business operation 単位の transaction helper 必須 (atomic) | 1 業務操作で複数 DB 書込 (例: 「予定→記録変換」 = softDelete + createEvent) を扱う場合、 必ず単一 `db.withTransactionAsync` で wrap (SQLite ACID 保証)。 単独 API 組合せで呼出側 transaction 制御は NG、 business operation 専用 helper 必須。 Sess23 ADR-0035 D7 由来 (convertPlannedToRecorded)、 photoRepository 既存 pattern 参考。 詳細: `recurrence-prevention/specialized.md` |
| **R-44** | 破壊的操作 = ConfirmDialog + 通知 Toast 必須 | delete / archive / purge 実装時は `<ConfirmDialog>` (OS Alert 不採用) + 実行直後 `Toast.show()` の 2 件必須。Undo button は撤廃 (WCAG 違反 + 貫通 bug、DB 30 日 soft delete が誤削除保険)。`pnpm lint:destructive-undo` で機械検証。Sess25 ADR-0036 由来 + Sess27 緩和。詳細: `recurrence-prevention/specialized.md` |
| **R-45** | 長押し UX 標準 = Haptics + delayLongPress 500ms | `onLongPress` 全箇所で `expo-haptics` Medium を発火 + `delayLongPress` 500ms 維持 (短縮禁止) + 破壊的操作は ConfirmDialog 80ms fade。Sess25 ADR-0036 由来。詳細: `recurrence-prevention/specialized.md` |
| **R-46** | キーボード被り完全対処 = KAV + auto-scroll 2 点セット | フォーム input を含む全 screen / modal で `useKeyboardAvoidingProps()` (KAV) + ScrollView auto-scroll を両方実装 (input 位置で 2 タイプ使い分け) + logcat / Console Error 検証強制。Sess28 起票、Sess31-33 で v4 拡張。詳細: `recurrence-prevention/specialized.md` |
| **R-47** | Navigation 改修時の anti-pattern check 7 項目 | tab / stack 改修 PR は タブハイライト整合 / タブ名↔CTA 動作整合 / tap 冪等性 等 7 項目を議論段階で必須チェック (Material 3 / iOS HIG 整合)。Sess29 ADR-0038 由来。詳細: `recurrence-prevention/specialized.md` |
| **R-48** | CTA button design 整合 (4 階層 SoT) | CTA button は `design_system.md` §22 の 4 階層 (Primary / Secondary / Tertiary / Destructive) のいずれかに従う、ad-hoc な色・サイズ・配置禁止。Sess29 ADR-0038 由来。詳細: `recurrence-prevention/specialized.md` |
| **R-49** | 議論時の説明品質 Self-check 6 項目 | AskUserQuestion 投下前に ①専門用語訳 ②図解 or 例え ③label 80 字以内 ④記憶前提排除 ⑤clarify 退路 ⑥判断材料明示 を Self-check、1 つでも違反なら取り下げ再構築。user clarify 1 回で即時起動。`pnpm lint:discuss-jargon` で①を機械検出。Sess30 retro 由来。詳細: `recurrence-prevention/specialized.md` |
| **R-50** | 機能削除前の cross-feature import 検査 | 機能フォルダ削除 PR の前に対象 export を grep で他機能利用検査、越境ヒットがあれば shared util 分離 PR を先行させ削除 PR は「削除のみ」に保つ。Sess31 ADR-0039 由来 (10 箇所 cross-feature import の連鎖崩壊リスク)。詳細: `recurrence-prevention/specialized.md` |
| **R-51** | フォーム画面 = FormScreenHeader + full-screen scroll 必須 | `headerShown: false` + `<FormScreenHeader />` sticky + 単一 ScrollView が全要素を内包、の 4 要素必須。`pnpm verify:form-screen-scroll` で機械検出。Sess33 ADR-0040 由来。詳細: `recurrence-prevention/specialized.md` |
| **R-52** | EventType 追加時 4 同期確認チェックリスト (silent bug 連鎖防止) | EVENT_TYPES に新規 type 追加時、 (1) WorkLogTypeFormFields の case (2) payloadValidator schema (3) buildHistoryChips switch case (4) EventIcon switch case の **4 同期必須**。 Sess16 PR-E (leaf_first_aid 追加) で 3 回連鎖 silent bug 発覚 (Phase η PR-2 buildHistoryChips / Phase θ PR-8b EventIcon / PR-Q-fix #799 payloadValidator)。 ESLint switch-exhaustiveness-check + exhaustive 走査 unit test で構造防止。 詳細: `recurrence-prevention/specialized.md` |
| **R-53** | タブ icon 選定 4 基準 + 重複検出 lint (Sess36 ADR-0042) | 画面下部 4 タブの icon 変更・追加時、 (1) 機能整合 (2) 重複排除 (`scripts/check-icon-duplication.mjs` CI 強制) (3) 4 ペルソナ ✕ なし (4) mockup 整合 or 上書き明示 の 4 基準を ADR 改訂で必須化。 Sess36 ADR-0042 で「記録タブ = 水滴」 が EventIcons watering と size override 兼用 + 機能整合 bug で発覚、 lint 自動化で恒久防止。 詳細: `recurrence-prevention/specialized.md` |
| **R-54** | 単位表現は form / chip 両画面で i18n unit key 一元化 (Sess37 PR-1 由来) | number field に suffix 単位 (倍 / 本 / mm / cm / pcs 等) を表示する時、 form input の suffix と display chip の text 両方で **同じ workLog*Unit i18n key を参照** する。 form は `t('workLog*Unit')` を suffix prop、 chip は `valueUnitKey: 'workLog*Unit'` を HistoryChip data に格納し component が結合表示 (Sess37 PR-1 で確立 pattern)。 Sess37 PR-1 C4 由来 (`pest_control.dilution_ratio` / `candle_cut.count` で form は「倍/本」 表示なのに chip は「×」 のみで integrity レベル 2 違反発覚)。 詳細: `recurrence-prevention/specialized.md` |
| **R-55** | 問題発見時の関連項目網羅調査必須 (Sess37 PR-1 由来) | user から問題 / 修正対象を 1 つ指摘されたら、 実装着手前に **同 pattern を持つ他箇所を grep / inventory で網羅調査** する。 Self-check 5 項目: ①同パターン全件 grep ②i18n key inventory ③form ↔ display ↔ SoT 整合性検証 ④副次的問題発見の能動的姿勢 ⑤PR 範囲拡張判断を user に提示。 Sess37 PR-1 C4 で「dilution_ratio + count 修正指示 → 関連調査で 4 件発見 (en 'count' 不自然 / position `→` 重複 / 19 言語 i18n 既完備 / wire mm cm OK)」 → user 再修正リクエスト未然防止の威力実証。 詳細: `recurrence-prevention/specialized.md` |
| **R-56** | 議論で言及する技術参照は実在 grep 確認必須 (Sess38 retro 由来) | 議論 (`/discuss` / Plan mode) で具体的な i18n key / file path / function 名 / 型名を user に推薦する前に、 **grep で実在を確認** する。 推測ベース議論禁止。 Self-check 4 項目: ①言及 i18n key を `grep -rn` で 19 言語完備確認 ②言及 file path を `ls` / Read で実在確認 ③言及 function / 型名を `grep -rn` で実在確認 ④不在の場合「新規追加 N entries」 と明示。 Sess37 PR-1 議論で `workLogMemoTitle` を「既存流用」 と推薦 → Plan agent validation で 0/19 言語存在判明 → `workLogNote` に訂正の事象由来。 詳細: `recurrence-prevention/specialized.md` |
| **R-57** | PR マージ時にブランチを都度削除 (Sess51 由来) | PR を main にマージしたら、 ローカル・リモート両方の作業ブランチを**その場で削除**し溜めない。 マージは `gh pr merge <PR番号> --squash --delete-branch`(ローカル + リモート枝を同時削除)+ 直後に `git fetch --prune`(死んだ追跡参照掃除)。 GitHub repo 設定 `delete_branch_on_merge=true`(Sess51 で ON)で web UI マージでも remote 枝は自動削除。 Sess51 で `git fetch --prune` 時にローカル 126 本 + リモート 75 本の枝累積が発覚し一括掃除した事象由来 (root cause = 自動削除設定 OFF + 手順非明記)。 詳細: `recurrence-prevention/specialized.md` |
| **R-58** | dark theme cascade 構造禁止 (Sess66-68 / ADR-0052、 Sess70 PR-D 拡張) | 画面追加 / 色変更 / theme 関連 PR では (1) `StyleSheet.create()` 内に theme-dependent color token (`BG_PRIMARY` / `BG_SURFACE` / `TEXT_*` / `BORDER_*` + Sess70 PR-D 追加 `BRAND_GREEN*` / `BADGE_SOFT_*` / `BUTTON_SECONDARY_*` / `DISABLED_BG` = 計 **16 種**) を**書かない** (`local/no-color-token-in-stylesheet` rule で段階移行: PR-D は `'warn'`、 PR-E で違反 0 化後 `'error'` 昇格)、 (2) `useColors()` hook + inline `c.*` (PR-A 追加 7 prop = `c.tint` / `c.tintSubtle` / `c.badgeBg` / `c.buttonSecondaryBg` / `c.onTint` / `c.disabledBg` / `c.accentBark` / `c.dangerColor`) で動的色注入、 (3) `pnpm a11y:contrast` で全 **22 pair** (PR-A で 14→22 拡張、 brand pair 含む) WCAG AA pass 必須、 (4) dark mode 実機 SS で視認性確認。 Sess65 user 報告 → Sess66-68 完走 (旧 8 種) → Sess69 真因確定 (brand-static 罠) → Sess70 拡張 (16 種) の由来。 brand-static 撤回理由: light `BRAND_GREEN = #1F3A2E` 深緑が dark `#16140F` 上で contrast 1.5:1 ≪ AA 3.0:1 で破綻 (5 回連続再発の主要因)。 残 theme-invariant 維持: `ON_BRAND` (light 専用、 dark は `c.onTint`) / `ACCENT_GOLD` (Pro バッジ専用) / `DANGER` (status) / `HEATMAP_COLORS` (F-04 専用)。 詳細: `docs/adr/ADR-0052-dark-theme-cascade.md` Notes Amended Sess70 PR-D |
| **R-59** | StyleSheet 内 hex literal 禁止 (Sess70 PR-D / ADR-0052 Amendment) | StyleSheet.create() 内に raw hex literal (`'#RGB'` / `'#RRGGBB'` / `'#RRGGBBAA'`) を **書かない** (`local/no-color-hex-literal-in-stylesheet` rule で段階移行: PR-D は `'warn'`、 PR-E で違反 0 化後 `'error'` 昇格)。 例外: `'transparent'` / `'rgba()'` 半透明は通過。 例外 marker (`// eslint-disable-next-line local/no-color-hex-literal-in-stylesheet // reason: <一文>`) は **5 件以下上限** (`scripts/check-eslint-disable-count.mjs` で CI 監視、 PR-E で同梱予定)、 reason 用途: 写真 overlay text 固定 / PDF/SVG export 紙白固定 / Pro 金 badge 上 `ON_BRAND` 文字。 Sess69 で R-58 既存 rule (token 名 base) が hex literal を見逃した盲点が判明 (4 file 残存: BonsaiTimelineTab:246 / EventRowCompact:143 / EventRowDetailed:309 / SearchResultRows:226) → 本 R-59 で構造禁止化。 詳細: `eslint-rules/no-color-hex-literal-in-stylesheet.js` |
| **R-60** | 新画面 PR は dark mode SS 添付必須 (Sess70 PR-D 起票) | 新画面追加 PR (`app/**/*.tsx` 新規 file) では PR 本文に **dark mode で撮影した SS を最低 1 枚添付**必須。 PR テンプレに「☐ dark mode SS 添付」 check 項目を追加 (PR-E 同梱予定)、 将来 hook (`scripts/check-pr-dark-ss.mjs`) で機械検証も検討。 Sess65→69 で「ユーザーが dark mode で実機テストして報告 → 開発者が cascade 漏れに気付く」 を 4 回繰り返した root cause = 「新画面で dark mode 視覚検証が任意」 の仕組み欠落。 開発者の「dark mode 後回し」 認知バイアスを構造的に抑制 (R-25 機械判定 + Claude Read pattern と整合)。 |
| **R-61** | 人間判定 → 機械判定 + 安全網 (meta-rule、 Sess71 PR-5 起票 / ADR-0046 Amendment) | 個別ルール (R-58/59/60 等) の上位に位置する **meta-rule**。 新規 R / ADR / hook / check / lint を **足す前に**、 ADR-0046 Amendment の 4 つ目自問「人間判定が必要か? 機械判定に置き換えられないか?」 を必須 self-check。 「念のため XX しよう」「経験で判断」 のような mental model を仕組み化対象として認識し、 機械判定 (file pattern / hash / git diff / npm audit / lint / hook) で代替可能なら必ず機械化。 適用例: build vs reload 判定 (Sess70 → Sess71 PR-1〜PR-3 で `scripts/check-native-impact.mjs` + PostToolUse hook + reload-app.sh 拡張で完全自動化、 月 30-60 分節約) / 新画面 dark SS 必要性 (R-60 で機械化済) / ESLint 例外許可 (R-59 reason marker + 5 件以下) / dependency 安全度 (npm audit 機械化候補)。 安全網: 機械判定の bug を恐れて手動 fallback を残す場合は明示的 reason 必須。 詳細: `recurrence-prevention/specialized.md` / `docs/adr/ADR-0046` Notes Amended (Sess71) / `docs/how-to/development/dev-workflow.md` |
| **R-62** | Component SoT 化時は Layout Contract も同じ ADR で SoT 化必須 (Sess72 ADR-0054 起票) | R-61 と並列の **meta-rule**。 Component (FAB / BottomSheet / Header / KAV / Modal 等) の SoT 化 ADR を書く時、 必ず **その Component を使う画面側の Layout Contract (scroll content padding / margin / safe area / KeyboardAvoiding offset / focus management / animation timing)** も同じ ADR で SoT 化する。 Component と Layout Contract は **2 つの SoT として扱う**。 違反例: Sess36 ADR-0042 D3 で FAB component SoT は確立したが、 4 画面の ScrollView paddingBottom 計算 (Layout Contract) が散在 → `FAB top edge > paddingBottom` で 40〜74 px の重なり、 Sess72 テスター報告で発覚 → ADR-0042 D3 撤回 + ADR-0054 起票の手戻り。 検出: 静的解析困難 (画面コンテキスト依存)、 ADR Acceptance に「Layout Contract 検証 (短/長 list + dynamic insets) 必須」 明文化 + PR template §7.5 + Maestro 「最下端 scroll → 最終 testID visible」 共通 helper 化。 詳細: `recurrence-prevention/specialized.md` / `docs/adr/ADR-0054-bottom-cta-bar.md` / `docs/adr/ADR-0042-*` Notes Amended (Sess72) |
| **R-64** | 新 worktree 作成後は `worktree-init.sh` 実行で `.env` + `node_modules` symlink (Sess75 PR-A 起票) | 新 `git worktree add` 直後に `bash scripts/dev/worktree-init.sh` を必ず実行。 `.env` (Expo `app.config.ts` の APP_NAME 等で必須) と `node_modules` (`pnpm install` 5-10 分節約) を親 repo から symlink。 Sess73 + Sess75 で 2 回再発 (`Missing required env var: APP_NAME` で Metro 起動 fail) → CLAUDE.md §9 「2 回再発で hook 化検討、 3 回目で必須」 該当。 Future Work: EnterWorktree PostCreate hook 自動実行 / `pnpm dev` 直前の存在 check hook。 詳細: `recurrence-prevention/specialized.md` / `docs/how-to/development/dev-workflow.md` §10 |
| **R-63** | 子画面 push 遷移を許す form 画面は scroll 復元 hook 必須 (Sess72 ADR-0040 D5 Amendment 起票) | form 画面 (`FormScreenHeader` + `<ScrollView>`) で `router.push` する flow がある画面は、 戻り時の scroll 位置保持を `src/core/hooks/useScrollPreservation.ts` (Sess72 PR-1 #969) で**明示**する。 真因: `useFocusEffect` 内 setState で子要素 layout 変動 → ScrollView の contentOffset が暗黙的に 0 リセットされる (RN ScrollView 仕様)。 Sess72 テスター苦情「タグ追加画面から基本情報画面に戻ると必ず画面の先頭に戻ってしまう」 由来。 検出: `scripts/check-form-screen-scroll.mjs` 拡張で「FormScreenHeader + ScrollView を使う画面で `useScrollPreservation` 未 import なら **warn**」 (warn 起動 → 違反 0 確認後 error 昇格、 Sess68 と同じ階段)。 除外: 子画面 push が無い form 画面 (`router.replace` のみ等) は `// scroll-preservation: no-child-push (<理由>)` 注釈で明示。 適用先 (Sess72 PR-2/3/4): `BonsaiCreateScreen` / `app/(tabs)/bonsai/[id]/index.tsx` / `app/export/index.tsx`。 詳細: `recurrence-prevention/specialized.md` / `docs/adr/ADR-0040` Notes Amended D5 / `useScrollPreservation` JSDoc |
| **R-65** | CRUD 機能を扱う ADR は Create/Read/Update/Delete の 4 動詞を Acceptance に明示する (Sess77 ADR-0055 起票) | data 操作 (C/R/U/D) を扱う ADR (新機能 or 既存機能拡張) は、 **`## CRUD Coverage` section** を必須記載。 各 operation について「対応 / 未対応 / 将来対応」 と 動線 / 制約 を表で明示。 由来: ADR-0008 (event data model) で **U (Update)** が DB 層のみ実装され UI 動線が 1 年放置 → Sess76 alpha rollout 前テスター苦情で顕在化、 「機能の追加」 議論偏重で「機能の完備性」 評価仕組み欠落が根本原因。 検出: `scripts/docs-lint.mjs` の `checkAdrCrudCoverage()` で ADR-0050 以降を走査、 title に CRUD 動詞 (create/edit/update/delete) を含むのに `## CRUD Coverage` heading 不在なら warn (false positive 防止で warn のみ)。 非 CRUD 系 (UI 統一 / 文書 / build) はスキップ可。 詳細: `recurrence-prevention/specialized.md` / `docs/adr/ADR-0055-event-edit.md` / `docs/adr/adr_template.md` |
| **R-66** | RRULE 展開時の TZ 罠防止 (Sess78 ADR-0056 起票) | 定期予定 (recurrence) で RRULE → 個別 events 展開する際、 UTC date 文字列 (`.toISOString().slice(0,10)`) を local date key として直接使用しない。 必ず `toLocalDateKey(..., getTzOffsetMin())` (`src/core/datetime/localDateKey.ts` SoT) 経由で TZ-safe 変換。 Sess67 PR #942 で JST 深夜 (0:00-8:59) に前日保存 bug 修復後の同型再発防止。 詳細: `recurrence-prevention/specialized.md` |
| **R-67** | status を持つ entity の機能設計時、 各 status の操作意味を matrix で明示 (Sess78 ADR-0056 起票、 Sess81 で 2 重 matrix pattern 拡張) | ADR 起票時、 `events.status = 'planned' \| 'logged' \| 'cancelled'` 等の status 列を持つ entity に対する 操作 (C/R/U/D) を **各 status での意味 matrix** で明示。 「個別だけ評価」 = 1 status だけ想定で設計し他 status が漏れる pattern が ADR-0036 (R-44 削除側) + ADR-0055 (編集側) で 2 回発覚 → 構造化。 Sess81 拡張: rule + instance 2 層 entity (= ADR-0056 recurrence_rules + events) で **2 重 matrix pattern** 必須化、 cascade 連動更新を明文化。 詳細: `recurrence-prevention/specialized.md` |
| **R-68** | 外部サービス連携 ADR は preflight smoke test 配線済が Accepted 必須条件 (Sess81 起票) | R-61 (機械判定 + 安全網) / R-65 (CRUD coverage) と並列の **meta-rule**。 外部サービス (= 課金 / 広告 / 解析 / 法務 / プッシュ通知 / 認証 / クラウド同期) に依存する機能を扱う ADR は、 Status: Accepted 昇格前に **(1) preflight smoke test 配線済 (= 本物の外部 API を叩く 1 step、 SDK mock 不可)、 (2) `.env.example` に必須環境変数 + 接頭辞 + 取得 URL を明示** を Acceptance 必須項目化。 由来: Sess81 (2026-06-09) で テスター 12 人苦情「サブスクの購入はまだ未対応ですかね？」 (= Paywall 3 プラン「利用不可」 + 購入失敗) を構造調査 → アプリ側 jest / Maestro 全 pass、 RC Dashboard 完璧、 真因は Play Console subscription の Country/region availability が `MN` (モンゴル) のみ登録 → `getOfferings()` null。 Sess47-48 (= 3 ヶ月前) で「スコープ外」 と明示先送り宣言した残作業が外部状態として broken のまま検出されなかった。 適用: ADR-0009 (RC) で本 PR が初適用 (= preflight G グループ + prebuild-env-check Layer 1.7 + `.env.example` 接頭辞コメント)。 適用候補: ADR-0010 (AdMob) / ADR-0017 (UMP/Privacy) も Sess82+ で同型適用。 検出: PR review-pr Skill に「外部サービス連携 ADR か? Yes なら preflight smoke test 配線済か?」 自動チェック (Sess82 候補)。 詳細: `recurrence-prevention/specialized.md` |
| **R-69** | pre-commit hook は新規開発環境 (= worktree / clone) でも自動配線される仕組み必須 (Sess82 PR-F 起票) | R-61 (機械判定 + 安全網) 適用の運用ルール。 **`.lintstagedrc.js` + `.githooks/pre-commit` 等の既存資産が存在しても、 `core.hooksPath` が標準 (= `.git/hooks`) のままだと hook が動かない**。 由来: Sess81 で BonsaiLog の `.lintstagedrc.js` (Apr 2026 から存在) + `.githooks/pre-commit` (May 2026 から存在) が揃っているのに、 `package.json` `prepare` script (= `git config core.hooksPath .githooks`) が **worktree 内で `pnpm install` 後に再走らない** ことで `core.hooksPath = .git/hooks` のまま (= hook 無効)、 PR #1008 で prettier format 違反が commit 時に検出されず CI fail。 適用: `scripts/dev/check-hooks.mjs` で `core.hooksPath` verify + auto-fix、 `package.json` `prepare` script に呼出追加 (= clone / install 直後で自動配線)、 `verify:hooks` script で CI 検証も可。 詳細: `recurrence-prevention/specialized.md` |
| **R-70** | Claude が長期 polling / Monitor を armed する前に「同コマンドの 1 サイクル分の中間値を log 出力で verify」 必須 (Sess82 PR-H 起票) | R-61 (機械判定 + 安全網) / R-25 (機械判定のみで達成判定禁止) の延長。 **Claude が `Monitor`、 `Bash run_in_background`、 cron polling 等の長期 polling を armed する前に、 polling 内で実行されるコマンドの「1 サイクル分の中間値」 を必ず log 出力で verify** する。 由来: Sess82 (2026-06-09) で Claude が 4 PR の CI 完了監視に Monitor を armed、 polling 内で `gh pr checks --json name,state` を使ったが、 `gh pr checks` は **`--json` フラグを完全サポートせず parse error**、 jq が空文字列を返し続け、 「空文字列 = まだ pending」 判定で **10 分 timeout まで silent failure**。 実際は既に 4 PR 全部 SUCCESS。 user 指摘で発覚、 「Sess81 振り返りで『画面 = OK = リリース OK』 罠を構造防御した直後に、 Claude 自身が『Monitor = 動いてる = OK』 同型の罠にハマった」 と認識。 適用: `scripts/dev/wait-pr-ci.mjs` (= Sess82 PR-H) で実装、 初回 cycle で必ず verbose log 出力 (= silent failure 即検出)、 `gh pr view --json statusCheckRollup` (= JSON 完全対応) を使用。 検出: 同型 Monitor / polling 設定時に「初回サイクル log なし」 を疑う、 「pending 永続」 が timeout 近くまで継続したら polling 経路の故障を仮定。 詳細: `recurrence-prevention/specialized.md` |
| **R-71** | 件数分岐 hook の UI 表現契約 SoT 化 (Sess83 ADR-0025 起票) | `useBulkActionFlow` / 同型 hook で 0/1/N 件等の件数分岐で動線が変わる場合、 各分岐の **UI 表現 (chip / header 文言 / icon / hint / a11y)** を **同じ ADR の Decision §** で SoT 化必須。 ADR が動線のみ確定し UI 表現を別 PR で確定する **設計協調漏れ** を構造防止。 Sess83 user 実機検証で「BulkWorkPicker 1 件 case 文言『1 件の盆栽に**同じ**作業を記録』 + chip 視覚曖昧」 が user 不安を生む構造問題発覚 → ADR-0025 §7 + Sess80 PR-6.5 (#1002) + Sess82 PR-D (#1013) の 3 PR で同 hook 共有しながら 各 case の UI 表現を 統一しなかった真因。 R-62 (Layout Contract SoT) + R-67 (status 別意味分化) の系譜 meta-rule。 検出 (= follow-up): `scripts/check-i18n-plural-cohabit.mjs` で `{count}` placeholder と 複数前提語 (「同じ」「both」 等) の共存を静的検出。 詳細: `recurrence-prevention/specialized.md` |
| **R-72** | master/custom CRUD pattern SoT (Sess89 ADR-0049 ⑥ 構造実装由来) | **master/custom 二層構造** で構成される領域 (= 樹種・樹形・タグ・定期予定 の 4 領域) は、 全領域で **CRUD 関数群が揃って実装** されていることを保証 (= Create / Rename / Delete / Count / canCreate / countBonsai / WithStats の 7 関数 set)。 「追加だけ実装、 編集/削除 UI 無し」 の構造実装漏れ (= ADR §Decision「削除 OK」 と書きながら 4 ヶ月削除関数なし、 Sess89 テスター苦情起点) を構造防止。 R-65 (= ADR 単独 CRUD カバレッジ) + R-67 (= status × 操作意味分化) と並列の meta-rule。 由来: Sess89 (= 2026-06-09) テスター苦情「樹種カスタムの編集、 削除機能は Pro? または今後の予定?」 を 4 PR で構造修復 (= #1028/1030/1031/本 PR)。 真因 = ADR § Decision と §Acceptance テスト記述の不整合 (= 削除動線 test 含まれず、 領域横断整合性検証なし)。 削除時 cascade matrix (= ADR-0026 §Notes Amended Sess89 で確立): FK (樹種) → ON DELETE SET NULL / raw text (樹形) → atomic UPDATE NULL (案 c) / M:N (タグ) + FK (定期予定) → softDelete。 検出 (= follow-up): `scripts/dev/check-custom-crud.mjs` で 4 領域 grep + 関数 set 揃い warn (= 未起票、 Sess90+ 候補)。 詳細: `recurrence-prevention/specialized.md` |
| **R-73** | 複数件 INSERT は bulk transaction ラッパー経由必須 | `recurrence_rules` / `events` / `bonsai` 等を複数件 INSERT する caller は `bulkXxx` ラッパー (`db.withTransactionAsync` + 失敗時 ROLLBACK 保証) を使用、for ループ + 個別 `createXxx` 直呼び禁止。R-43 (単一業務操作 atomic) の複数件版。Sess89 PR-C 起票。詳細: `recurrence-prevention/specialized.md` |
| **R-74** | Stack screen title 配線は `<Stack.Screen options>` + `useEffect(setOptions)` 両方必須 (Sess90 PR-A 起票、 PR-C 検出 lint 配線) | `app/<screen>.tsx` で React Navigation の Stack header に title を表示する場合、 **2 段 pattern を両方** 実装する (= `<Stack.Screen options={{title: t('...')}}/>` + `useEffect(() => navigation.setOptions({title: t('...')}), [navigation, t, lang])`)。 片方だけだと **初回 mount 漏れ** or **言語切替時 title 古いまま残存** の bug 発生。 由来: Sess90 PR-A で 3 screen (= `/custom-species` `/custom-styles` `/tags`) の Stack.Screen options 配線漏れで raw route 名表示 bug 発覚。 正典 reference = `app/settings/index.tsx` (Sess74 PR-3 = ADR-0053 E2 Amendment) で確立済の 2 段 pattern を全 manager screen に適用。 検出: `scripts/dev/check-stack-screen-title.mjs` で `useTranslation` 使用かつ `Stack.Screen options` / `setOptions` 片方欠落を warn (= Sess90 PR-C で起票、 `pnpm verify:stack-screen-title`)。 詳細: `recurrence-prevention/specialized.md` |
| **R-75** | screen header の font geometry hardcode 禁止、 token 参照必須 (Sess90 PR-A 起票、 PR-C 検出 lint 配線) | 画面ヘッダー (= タブ画面の自前 SearchHeader / Stack 画面の React Navigation native header) の **`fontFamily / fontSize / lineHeight / letterSpacing` hardcode 禁止**、 `src/core/theme/typography.ts` の `screenTitleTab` (= 22pt NotoSerifJP) / `screenTitleStack` (= 18pt NotoSerifJP) token spread 必須。 加えて header 背景は `c.background` (= washi/宵墨 scheme-aware) 統一 (ADR-0053 Sess90 PR-B Amendment)。 **Expo Router の root `<Stack screenOptions>` は nested Stack に cascade しない**、 settings / (modals) / (tabs)/plan / (tabs)/bonsai 等の nested `_layout.tsx` でも明示 spread が必要。 由来: Sess90 PR-A 時点で 4 箇所に font 設定分散 → user 報告「タブ画面と Stack 画面で統一性がない」 が顕在化、 token SoT 化で「change one place, takes effect everywhere」 保証。 同型 SoT pattern = ADR-0029 D1 form atom typography token (= Sess17 `formLabel` / `formCounter` warning lint 配線済)。 検出: `scripts/dev/check-screen-header-typography.mjs` で font hardcode + header 背景 c.surface drift を grep warn (= Sess90 PR-C で起票、 `pnpm verify:screen-header-typography`)。 詳細: `recurrence-prevention/specialized.md` |
| **R-76** | master/custom 領域 管理画面 UI 統一 SoT meta-rule (Sess91 PR-4 起票) | `/tags` / `/custom-species` / `/custom-styles` (+ 将来のカスタム X 領域) の管理画面は 5 軸 SoT 必須: (a) styles = `src/features/manager-screen/managerScreenStyles.ts` (b) row layout = 横並び + 左 toggle (c) 操作 = row tap 編集 + kebab → RowActionMenu → ConfirmDialog (ADR-0036 D7) (d) inline 展開 = PEEK_LIMIT=3 + もっと見る (e) addBtn = JSX 側 `+ ` prefix。 由来: Sess91 user 報告「タグ管理をほぼ全て転用したつもりが全然なっていません」、 5 Whys 真因 = UI 共通 SoT 不在で劣化合成。 検出: `scripts/dev/check-manager-screen-symmetry.mjs` (`pnpm verify:manager-screen-symmetry`)。 新規領域は `.claude/templates/manager-screen-template.tsx` から作成。 詳細: `recurrence-prevention/specialized.md` |
| **R-77** | 業界標準採用時のドメイン適合性チェックリスト (Sess93 議論起票) | 業界標準 UX (= Apple/Google ライク、 モック由来、 競合観察由来) を採用する設計判断には 3 質問の明示回答を ADR / 議論記録に残す: ①業界が解決している問題は自アプリでも発生しているか ②業界が前提とする使用頻度は同じか ③業界が許容する副作用を自アプリ user 層は許容するか。 由来: Sess89 で全廃した個別予定通知を Sess93 で業界標準根拠で復活させかけた (議論で検出、 案 C に修正)。 連携: R-16 (Design は下書き、 ADR が正) の業界標準特化版。 詳細: `recurrence-prevention/specialized.md` |
| **R-78** | 破壊的データ操作は user に事前通知必須 (Sess93 議論起票) | 「softDelete + create wrapper」「上書き」「cascade 連鎖更新」 等の内部データ書換 operation は、 保存ボタン押下時に **ConfirmDialog で事前通知** 必須 (= 何が起きるか + 影響範囲 + キャンセル可能)。 i18n key 規約: `{domain}EditConfirmTitle/Body/Confirm`。 由来: Sess93 `replaceRecurrenceRule` (= softDelete + create) で user 認識「ルール 1 件編集」 vs 内部「8 events 削除 + 再生成」 の認識ズレを議論で検出。 連携: R-67 (status entity 操作意味 matrix)、 WCAG 3.3.4。 詳細: `recurrence-prevention/specialized.md` |
| **R-79** | コンテキスト残量を理由とした次セッション先送り禁止 (Doc-Truth Audit P2 起票) | Claude がタスクを「次セッションで対応」と先送りする判断を、 **コンテキスト残量を理由に単独で行わない**。 目安として **消費 85% までは本セッション内で継続**。 85% 超 / scope 分割 / user 指定の停止条件で先送りする場合は、 先送り内容を明示して user 承認を取り、 再開用の状態 (memory / Engram / 状態ファイル) を保存してから停止。 由来: Doc-Truth Audit P2 (2026-06-10) セッションログ採掘で同種 user 訂正 2 回検出 (2026-05-13「85% くらいまでは本セッションで」 / 2026-05-15「次セッション継続ではなく本セッションで」)、 CLAUDE.md §9 (2 回再発でルール化) に基づく。 詳細: `recurrence-prevention/specialized.md` |
| **R-80** | テスター報告起点の修正は報告手順の実機なぞり検証必須 (Sess95 起票) | テスター報告を起点とする bug 修正 PR は、 **報告された再現手順を実機でなぞった SS / 動画を PR 本文に添付** してから「修正完了」 と報告する。 由来: Sess72 scroll 復元 (= 「直した」 とリリースノート告知後にテスター再報告「維持されず TOP に戻る」、 完了判定が Jest + lint のみで実フロー実機再現を含まなかった)。 PR テンプレ §7.6.5 で強制。 詳細: `recurrence-prevention/specialized.md` |
| **R-81** | 並行セッション時の worktree 分離強制 (Sess99 起票) | 同一 repo で複数セッションが並行する時、実装・branch 操作は **git worktree で分離** する (main checkout での checkout / switch / reset --hard は並行検知中 hook が block)。`.claude/hooks/parallel-session-guard.mjs` が heartbeat lock (`.claude/locks/`) で並行を検知し、UserPromptSubmit で警告注入 + PreToolUse(Bash) で block。worktree 内操作は `git -C <path>` で明示。由来: Sess99 (2026-06-11) 並行セッションが main checkout の branch を切替え、編集が巻き戻る事故が実発生 (reflog 実証)。R-64 の運用前提を機械強制化。詳細: `recurrence-prevention/specialized.md` |
| **R-82** | /discuss → /implement ダイレクト遷移禁止、 /plan の Issue 化 step は省略不可 (Sess102+Sess105 同型 2 回再発) | /discuss で user 承認後、 /plan (= W-01〜W-05 で親 Issue 起票 + AC + Context note) を skip して /implement 相当に直結すると orphan PR が生まれる。 ルール: ①/discuss 承認で即 /implement 禁止 ②必ず /plan で親 Issue 起票 ③/implement は親 Issue 番号引数 + `gh issue view <N>` で Context 実在確認 ④PR 本文に `Closes #<N>` / `Refs #<N>` 必須 (docs-only は `label:no-issue` で例外)。enforcement: `.claude/hooks/check-phase-transition.mjs` (UserPromptSubmit 警告 → block 昇格) + `.github/workflows/pr-issue-link-check.yml` (CI gate)。由来: Sess102 #1180 (/plan 後再承認要求) + Sess105 #1242 (/discuss → /implement 直結 + Issue 化 skip)、 CLAUDE.md §9 (2 回再発で hook 化) に基づき hook 前倒し。詳細: `recurrence-prevention/specialized.md` |

---

## 運用ルール

1. **本ファイルはセッション開始時に必読**（`AGENTS.md` Session Start Checklist 経由）。R-13 以降の詳細記述は `recurrence-prevention/specialized.md` を併読。
2. **新たな再発パターンが見つかったら本ファイル or specialized.md に追記**（lessons.md ではなく）。R-1 〜 R-12 への追加はメイン、R-13 以降の専門系は specialized.md。
3. **R-N の番号は変更しない**（既存参照を破壊しない、削除する場合は「~~R-N: 削除~~」と注記）。
4. **項目が増えたら別ファイル分割を検討**（**メイン 250 行以内** を維持）。`scripts/docs-lint.mjs` で自動検出。
5. **R-13 以降は Hook で構造的に防止**（注意ではなく仕組み化、`.claude/hooks/` 参照）。
6. **2 回再発で昇華必須 (本プロジェクト独自強化、 Sess8 Retro)**: CLAUDE.md §9 「3 回再発で昇華」 を本プロジェクトで **「2 回再発で hook 化検討、 3 回目で必須」** に強化。 同一テーマが lessons / recurrence-prevention に 2 件以上溜まったら、 hook / ESLint / CI / 型システムで構造的に防ぐ仕組み化を **検討**、 3 回目で **必須**。 user の「注意ではなく仕組み」 真意整合。 例: Sess8 Retro で「業界事例誤引用 (Sess7→Sess8 で 2 回目)」「Phase 1b 漏れ (R-9 違反 2 回目)」 を本ルールで hook 化 (R-33 / S-1 / S-2 新設)。

7. **足す前ゲート (新規 R/ADR/hook 追加時の 3 自問、ADR-0046)**: ルール・ADR・hook・check を **足す前に**、(a) 構造 (型/lint/CI/hook/DB CHECK) で「違反が書けない形」にできないか (b) 既存と重複しないか (grep 確認、R-9) (c) 代わりに目的を終えた既存ルールを 1 つ廃止できないか を自問し、答えを Issue/PR に 1 行記載する。**廃止＝アーカイブ方式 (番号保持・Status/注記変更、物理削除禁止)**。retire 手順 (影響 grep → user 承認 → Status/注記変更 → 後継リンク) と棚卸し cadence (`/retro` 相乗り) は `docs/adr/ADR-0046-harness-inventory-and-retirement-policy.md` を参照。「足す仕組み」 (§6 昇華) に対する「削る仕組み」 = 肥大化 (足せても削れず変更不能になる) の構造的防止。

## 関連ファイル

- `~/.claude/CLAUDE.md` — 個人横断ルール
- `AGENTS.md` — 全 AI エージェント共通ルール
- `.claude/CLAUDE.md` — Claude Code 固有挙動
- `.claude/recurrence-prevention/specialized.md` — R-13 以降の詳細記述 (最新番号は本ファイルの索引が正)
- `.claude/hooks/` — 構造的防止 Hook 群（R-16/R-18/R-19/R-20 自動化）
- `.claude/settings.json` — Hook 登録
- `docs/reference/tasks/lessons/` — 技術 lesson（領域別フォルダ、`lessons/db.md` 等）
- `docs/reference/personas.md` — ペルソナ定義（議論時に自動 Read）
