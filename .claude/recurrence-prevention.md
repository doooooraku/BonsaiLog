# 再発防止プロトコル（行動パターン）

> **セッション開始時に必ず読むこと**。
> このファイルは「**行動 lesson**」を集約。技術 lesson は `docs/reference/lessons.md` を参照。
> 役割分担: lessons.md = DB / Backup / ビルド等の技術領域、本ファイル = 全タスク横断の行動ルール。
> **R-13 以降 (専門ルール) の詳細記述は `.claude/recurrence-prevention/specialized.md` を参照** (R-24 ファイル分割対応、2026-05-16)。

---

## 汎用ルール R-1 〜 R-12（過去セッションで再発した指示の構造化）

### R-1. 一括処理後の目視確認 (+ レポート系生成後の Claude self-verification、 Sess5 拡張)

- **ルール**:
  1. Python / sed / awk で複数行を一括置換した後は、必ず Read で目視確認 + grep で残存確認 + git diff 確認
  2. **(Sess5 拡張)** pairing-report.html 等のレポート系を生成した後は、 Claude 自身が Read or base64 chunk grep で新コンテンツが埋め込まれているか目視確認すること。 「✅ 生成完了」 ログだけで user 報告 NG (R-1 verification 漏れ)
- **根拠**: 過去 2 回、想定外の場所まで置換された事例あり。 Sess5 で pairing-report 生成後に Read せずに user 報告 → 古い SS が表示されたまま、 user に二度手間を強いた。
- **自動化**: `~/.claude/settings.json` Hooks で検知時に警告。 generate-pairing-report.mjs に「SS 反映確認 log」 を追加 (Sess5 PR-1 で実装、 整合済 row 全件 OK ログ確認)。
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

## 専門ルール R-13 〜 R-63（詳細は `recurrence-prevention/specialized.md`）

| ID | テーマ | 1 行サマリ |
|----|--------|-----------|
| **R-13** | 議論モードでの質問数・ラウンド数の予告 | `/discuss` 起動時に「N 件質問 / M ラウンド」を冒頭で予告 |
| **R-14** | 専門用語ゼロモード (シニア向け) | ユーザー「わからない」発言で専門用語に「やさしい言い換え」併記強制 |
| **R-15** | MCP ツールのハング判定 | `mem_save` 等 30 秒以上応答ないらハング扱い、user に 3 択 (継続/キャンセル/代替) 報告 |
| **R-16** | Design / モックアップ参照時の SoT 明示 | UI = OpenDesign、ビジネス仕様 = ADR を冒頭明示 |
| **R-17** | 「全部推薦で OK」 即時実行禁止 (4 段階) | 包括承認後も TaskCreate → 計画 → 承認 → 実行 を厳守 |
| **R-18** | Read 前 Edit の絶対禁止 | Edit/Write 前に同 path を必ず Read (PreToolUse hook で block) |
| **R-19** | Engram 保存は短い要約版 | `mem_save` content ≤ 1KB、長文は ADR / Issue 本文へ |
| **R-20** | 「念のため」 議論前に既存 ADR Read | 「念のため」「再検証」 検知時、議論前に既存 ADR を必ず Read |
| **R-21** | 並列サブエージェントは worktree 隔離 | `Agent` `run_in_background=true` で `isolation: "worktree"` 必須 |
| **R-22** | verify exit code 保全 | background `pnpm verify` で 末尾 tail/pipe 禁止、`grep -E '^EXIT='` で明示確認 |
| **R-23** | スキーマフィールド名 grep 検証 | Drizzle / Valibot 型のフィールド名を初使用時、schema.ts Read |
| **R-24** | 行数上限 (肥大化防止) | lessons/<area>.md ≤ 200 行、recurrence-prevention.md ≤ 250 行 |
| **R-25** | spec-code drift + 機械判定禁止 | ADR と実コード grep 整合 + Claude Read による構造系 **5** 項目評価 (Sess34 ADR-0041 で 4→5 拡張: タブ / セクション / UI 種別 / スクロール範囲 / **EventRow 表示モード + sub-layout**) |
| **R-26** | 外部 Design 採用時の 5 軸評価 | 4 ペルソナ + 「ブランド統一感」 軸 + 画面マップ表必須 |
| **R-27** | Issue 起票前に Explore 確認 | gh issue create 前に既存実装 grep、結果を Issue 本文に記載 |
| **R-28** | UI 表現 vs ビジネス仕様 境界判定 | 7 ステップ判定フローで適切な SoT 選択 + 更新プロセス決定 |
| **R-29** | 写経駆動開発 5 段階 | mockup Read → mockup SS Read → RN Read → RN 撮影 → 並列比較 |
| **R-30** | 外部 lib stability PoC | testing lib 変更時 2/2 = 100% 厳格基準で PoC、plan B 先確定 |
| **R-31** | Maestro flow 作成時の事前確認 | testID grep + `_template.yml` 使用 + text tap 禁止 |
| **R-32** | commit 直前の git diff --cached 目視 | staged 内容と議論修正項目の整合確認、git restore 罠回避 |
| **R-33** | route / Phase 変更時の影響範囲全網羅 grep | 廃止 path 文字列を全 grep + PR 本文に grep 結果記載、 `scripts/obsolete-routes.json` + `.claude/hooks/check-obsolete-routes.mjs` で構造的検出 (Sess8 PR-5+1) |
| **R-34** | 議論承認の整合性確認 (同類カテゴリ複数項目) | AskUserQuestion で同類カテゴリ (例: 「Home 要素」 D2/D3) 複数項目を 1 質問に詰め込まない。 個別質問に分離 OR 推薦案明示後に各項目について逐次確認。 Sess9 PR-2 (D2/D3 混同) で revert ロス。 詳細: `lessons/discuss.md` |
| **R-35** | 議論時 alternative 必須提示 + 業界事例「現状最適解」 明示 | 議論 Round で初期案 1 つだけでなく alternative 2-3 案を必ず併記。 業界事例リサーチで「最新トレンド = 現状最適解」 を明示し、 古いパターン (Apple Notes long-press 等) を「業界 outdated」 と判定。 Sess9 PR-9 → PR-10 long-press → toggle 60 分ロスが根拠。 詳細: `lessons/discuss.md` |
| **R-36** | navigation API 使用時 1 次情報確認 + 実機検証必須 | `router.dismissAll` / `router.canDismiss` 等 expo-router API の挙動を **docs/source で確認 + 実機で挙動検証** してから採用。 `while (canX) { doX() }` パターンは無限 loop リスクで禁止 (max iteration limit or 別 API)。 Sess12 PR-F で canDismiss loop → JS thread freeze 事例。 **Sess18 PR-3 (2026-05-21) で R-36.4/R-36.5 追加**: **R-36.4 UX 評価必須**: 新規 navigation 実装時、 「← で戻ったら user は何画面戻ったと感じるか」 を議論 step として必須化 (ADR-0030 §17 Case A/B/C 分類)。 **R-36.5 実機検証義務**: navigation 変更を伴う PR は実機で ← back button + 画面端 swipe gesture の両方の挙動 SS を PR 添付必須 (PR テンプレ §7.6)。 Sess17 違和感 ④ (戻る 2 画面飛び) が Case C 不明確で発生した教訓。 詳細: `lessons/navigation.md` + `docs/adr/ADR-0030.md` |
| **R-37** | 仕様 TBD (未確定) は ADR §TBD として明示残し | 議論で「あとで決める」 で先送りした仕様は ADR / Issue に `§TBD` として明文化、 実装時に user 承認で確定。 Sess12 PR-G で log mode の note 仕様 (a/b/c) を未確定で進めかけた事例。 |
| **R-42** | 色で意味を伝える UI は アイコン or pattern 必ず併用 (WCAG 1.4.1) | 状態 (planned/logged/error/warning) や severity を **色のみ** で識別する UI 設計禁止。 アイコン形状 (●/○/✓) or pattern (縞模様) で重複表現。 WCAG 2.1 SC 1.4.1 Level A 必達。 Sess22 ADR-0034 D3 由来 (planned/logged dot 緑/茶 色のみ識別が色覚多様性 + シニア老眼 + 屋外モードで不能)。 詳細: `recurrence-prevention/specialized.md` |
| **R-43** | business operation 単位の transaction helper 必須 (atomic) | 1 業務操作で複数 DB 書込 (例: 「予定→記録変換」 = softDelete + createEvent) を扱う場合、 必ず単一 `db.withTransactionAsync` で wrap (SQLite ACID 保証)。 単独 API 組合せで呼出側 transaction 制御は NG、 business operation 専用 helper 必須。 Sess23 ADR-0035 D7 由来 (convertPlannedToRecorded)、 photoRepository 既存 pattern 参考。 詳細: `recurrence-prevention/specialized.md` |
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
- `.claude/recurrence-prevention/specialized.md` — R-13 〜 R-63 詳細記述
- `.claude/hooks/` — 構造的防止 Hook 群（R-16/R-18/R-19/R-20 自動化）
- `.claude/settings.json` — Hook 登録
- `docs/reference/tasks/lessons/` — 技術 lesson（領域別フォルダ、`lessons/db.md` 等）
- `docs/reference/personas.md` — ペルソナ定義（議論時に自動 Read）
