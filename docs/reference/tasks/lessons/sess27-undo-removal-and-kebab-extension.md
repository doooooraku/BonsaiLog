# Sess27 Retro — Undo 動線撤回 + 個別 row kebab 拡張 + Maestro 構造修正 (7 PR)

- 日付: 2026-05-22
- 関連 ADR: ADR-0036 (Phase ζ-2 + Sess27 Notes Amended)
- 関連 PR: #748 (ADR Notes) / #749 (Toast 簡素化) / #750 (Plan Undo 削除) / #751 (bonsai-detail Undo 削除) / #752 (個別 row kebab) / #753 (count=1 単数 form) / PR-7 (本セッション)

---

## 学び ① — 実機検証は PC では発見できない構造的 bug を露呈する

**事実**: Sess25-26 で ADR-0036 D5 UndoSnackbar を 14 PR で実装、 unit test + Maestro flow も整備して main merge。 **しかし Sess27 で初の実機検証** (Claude Code 主導の adb input tap + screencap) で **Critical bug 2 件** を即時発見:

1. Undo button hit area 約 86×22px → WCAG 2.2 SC 2.5.8 (Target Size Minimum 24×24) 縦違反
2. `pointerEvents="box-none"` で Snackbar text 領域が背後貫通 → button 微妙外 tap で背後 row が反応 → 別画面遷移 → Undo 機会喪失 → データ永続削除

**Why 実機でないと発見できなかったか**:

- unit test (静的解析) は pointerEvents 設定の **正しさ** を保証するが、 ユーザーの指の精度 + screen 上の絶対座標 を test できない
- Maestro flow も assertVisible + tapOn:id で確実に button hit → 「button 外の tap」 シナリオを再現できない
- PC + Metro でブラウザシミュレータでは hover/click は離散イベントで、 「微妙に外す」 物理失敗を再現不能

**Future Work 候補**:

- A11y test として devtools で「target size measurement」 を定期実行する script (pixel 単位で 全 Pressable hit area を計測)
- 実機検証を「PR 単位ではなく機能単位」 で半月に 1 回義務化 (R-25 動線系 + Claude Code 主導)
- Maestro tap 座標を **意図的に hit area 境界外** にする negative test case を flow に追加

---

## 学び ② — Maestro flow を「実機 run なしで構造化」 すると 後で fail を発見する

**事実**: Sess26 PR-η-4 (#747) で Maestro 4 flow を「構造のみ詳細化」 とコミット → Sess27 で初実行 → 全 4 flow が **同じ assertion で FAILED** (`e2e_bonsai_home_list` not visible)。 原因: Dev Client 環境では `launchApp` 後 URL list を経由するが、 `pressKey: 'Back'` で home からアプリ exit してしまう構造欠陥。

**Why 検出されなかったか**:

- PR-η-4 は「構造詳細化」 と称して step 構造のみ追加、 CI でも Maestro flow は run されない (実機接続必要なため)
- Maestro Cloud で run する選択肢もあるが、 BonsaiLog では未採用
- 結果として「flow が存在する」 ≠「flow が動く」 のギャップ

**対策 (本 PR で実装)**:

- 3 flow の `pressKey: 'Back'` を撤去 (Dev Client home → 黒画面 → bundle 読込 → home list の自然フロー)
- timeout を 30s に延長 (Metro bundle 読込時間を考慮)
- plan-tab-undo.yml を削除 (Undo 動線撤回のため flow 自体不要)

**Future Work 候補**:

- Maestro flow merge 前に **必ず実機 run pass** を verify する PR template チェック追加
- Maestro Cloud 採用検討 (有料、 1 回 $5-10 程度、 PR ごと自動 run)
- Dev Client setup を flow header の YAML anchor 化 して 共通化 (重複削減)

---

## 学び ③ — user 真意 (シンプルさ) は Material 3 / Industry Standard を上書きできる

**事実**: ADR-0036 D5 は Material 3 Snackbar + Gmail Undo Send + Nielsen Norman Group "Recovery from Error" の 業界標準を根拠に「UndoSnackbar 必須」 を decided。 4 ペルソナ評価でも 全員 ◎。 しかし Sess27 user 真意「Undo は不要、 ただの通知 Toast で OK」 で **R-44 を緩和**。

**Why user 判断が正しかったか**:

- 業界標準は「誤削除リスクの救済」 が目的だが、 BonsaiLog は **DB 上の 30 日 soft delete** が既に誤削除保険として機能
- UI に Undo button を出すことで 「button 押せず背後 row 誤遷移」 という **新たなリスク** を導入してしまった
- user は「DB の保険 + ConfirmDialog の事前確認」 で十分と判断 → simpler UX で WCAG/UX risk も同時解消

**反省 (議論プロセス)**:

- Sess25 議論で「Undo の発見性 vs hit area の trade-off」 が議題に上がらなかった
- 6 専門家のうち WCAG/A11y 専門家視点が薄かった
- 4 ペルソナ評価で「Undo button 誤 tap」 のシナリオを simulate しなかった

**Future Work 候補**:

- 議論ペルソナに「WCAG 専門家 (Lighthouse audit + accessibility-tree 解析)」 を常時 1 名加える
- 4 ペルソナ評価で「物理操作精度 (= 指の太さ × hit area)」 を必須項目化
- 業界標準 vs シンプル化の trade-off matrix を ADR template に含める

---

## 関連

- ADR-0036 §Sess27 Notes Amended
- R-44 緩和 (`.claude/recurrence-prevention/specialized.md`)
- design_system.md §18 改訂
- scripts/check-destructive-undo.mjs (Sess27 PR-7 で検証対象 `showUndoToast` → `Toast.show` に変更)
