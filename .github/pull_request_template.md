<!--
PR Template
目的：レビュー漏れ（テスト漏れ／docs更新漏れ／リスク記載漏れ／ロールバック不明）を減らす。
原則：本文は短く、理由はADR、合否はテストへ。
-->

# 概要（1〜3行 / REQUIRED）

<!-- 例：設定画面で言語 nl（オランダ語）時に表示が崩れる不具合を修正 -->

---

## 0. 種別（REQUIRED）

- [ ] fix（バグ修正）
- [ ] feat（機能追加）
- [ ] refactor（仕様非変更の整理）
- [ ] perf（性能改善）
- [ ] test（テスト追加/修正）
- [ ] docs（ドキュメント）
- [ ] chore（雑務：依存更新など）
- [ ] release（リリース準備）
- [ ] hotfix（緊急修正）

---

## 1. 関連リンク（REQUIRED）

- Issue: #
- ADR: docs/adr/ADR-XXXX.md（該当があれば）
- 参照（1つ以上推奨）:
  - constraints: docs/reference/constraints.md
  - basic_spec: docs/reference/basic_spec.md
  - functional_spec: docs/reference/functional_spec.md
  - workflow: docs/how-to/workflow/whole_workflow.md
  - figma: （URL）
  - spec/notes: （該当docsやIssueコメントURL）

---

## 2. 目的（Why / REQUIRED）

<!-- 「何を解決する？」「なぜ今？」を1〜5行で。長い議論はADRへ -->

- ユーザー価値:
- バグの再現条件（バグなら）:

---

## 3. 変更点（What / REQUIRED）

<!-- レビュアーが差分を追いやすい単位で箇条書き -->

-
- ***

## 4. 受け入れ条件（Acceptance Criteria / RECOMMENDED）

<!-- “合格/不合格が判定できる条件” を短く。理想はテスト（Jest/Maestro）で表現する -->

- [ ] 条件1：
- [ ] 条件2：

---

## 5. 影響範囲（Impact / REQUIRED）

### 5-1. 影響する箇所

- 画面（UI）: S-xx / （画面名）
- 機能: F-xx / UC-xx
- 影響する層:
  - [ ] Free
  - [ ] Pro
  - [ ] 両方

### 5-2. データ/互換性

- 既存データへの影響:
  - [ ] なし
  - [ ] あり（内容：　　　　　　　　　）
- 移行（migration）が必要:
  - [ ] なし
  - [ ] あり（手順/ロールバック：　　　　　　　　　）

### 5-3. i18n / 端末差分

- 言語/i18n 影響:
  - [ ] なし
  - [ ] あり（対象言語：　　　　　　）
- 端末/OS差分の懸念:
  - [ ] なし
  - [ ] あり（内容：　　　　　　　　　）

---

## 6. 動作確認（How to test / REQUIRED）

> “合否はテストへ” の中心。ここが薄いPRは基本レビューで止める。

### 6-1. 自動テスト（該当を残す / RECOMMENDED）

- [ ] pnpm test（結果：✅ / ❌）
- [ ] pnpm lint（結果：✅ / ❌）
- [ ] pnpm test:e2e（結果：✅ / ❌）※導入済みなら
- [ ] pnpm type-check（結果：✅ / ❌）※scriptsにある場合
- CI（GitHub Actions）:
  - [ ] 全部 ✅
  - [ ] 一部 ❌（理由：　　　　　　　　　）

> 実行できない場合は「なぜできないか」を書く（例：一時的にCI修理中／再現が端末依存 等）

### 6-2. 手動確認（手順を箇条書き / REQUIRED）

<!-- “誰でも同じ手順で再現できる” 書き方 -->

1.
2.
3.

- 期待結果:
- 実際結果:

### 6-3. 再現手順（バグ修正なら / RECOMMENDED）

- Before（修正前の再現）:
- After（修正後に再現しない）:

### 6-4. CSV / PDF エクスポート出力チェック（REQUIRED if export 出力内容を変更）

> **背景 (Sess47)**: 「出力できる」を達成基準にし「実利用者が読めるか」を未検証だったため、
> CSV が ULID / UTC / 英語コードの生 DB ダンプになっていた。出力は **実ファイルをペルソナ
> 視点で目視** して初めて合格とする (機械が生成成功 = 合格ではない)。

- [ ] 実機で実ファイルを生成し中身を確認した (run-as cat / 共有先で開く / 添付):
- [ ] **高橋 62 歳 (シニア)**: 列・値が**意味の分かる日本語**で読めるか (ULID / 英語コード / UTC 生値が露出していない)
- [ ] **Marcus (Excel 派)**: Excel で開いて**集計・ピボットが破綻しない**か (BOM / 列ズレ / 文字化けなし)
- [ ] 適用対象外の場合の理由: （export 出力内容の変更なし）

---

## 7. UI差分（UI変更がある場合 / REQUIRED if UI）

- Before: （スクショ/動画/リンク）
- After : （スクショ/動画/リンク）
- Figma: （URL、該当フレーム）

---

## 7.5. mockup 整合チェック（R-29 写経駆動開発 / REQUIRED if mockup 整合 PR）

> mockup v1.0 (`docs/mockups/v1.0/wireframes/`) を実機 UI に反映する PR で **必須**。
> 詳細: `docs/reference/integration-criteria.md` (整合性レベル定義) / `.claude/recurrence-prevention.md` R-29

### 7.5.1. 5 段階チェック (REQUIRED)

- [ ] **Step 1**: mockup の該当 jsx component を完全 Read 済
  - file: `docs/mockups/v1.0/wireframes/<file>.jsx` 行範囲: `L<start>-L<end>`
- [ ] **Step 2**: mockup の該当画面スクショを Read 済
  - file: `docs/mockups/v1.0/screenshots/<id>.png`
- [ ] **Step 3**: 既存 RN 実装ファイルを Read 済 (R-18)
  - file: `<RN ファイルパス>`
- [ ] **Step 4**: 実装後、RN スクショを撮影 (実機 / Web / アタッチメント)
  - 撮影手順: `docs/how-to/development/screenshot-capture.md` (T1-9 以降参照)
- [ ] **Step 5**: mockup スクショと RN スクショを並べて Read で目視比較

### 7.5.2. 達成した整合性レベル (REQUIRED)

本 PR で達成した整合性レベル: **[ ]** レベル 0 / **[ ]** レベル 1 / **[ ]** レベル 2 ⭐ / **[ ]** レベル 3

> 「整合済」マークの最低水準は **レベル 2 (見た目 80% 一致)**。
> レベル 0/1 のみの場合は「**部分整合**」として ADR-0020 §画面マップに明記、本格整合は別 Issue で対応。

### 7.5.3. 必須一致項目チェック (レベル 2 達成のため、UI 整合 PR で REQUIRED)

- [ ] 写真/画像のサイズ (mockup と同じ縦横サイズ)
- [ ] フォント (NotoSerifJP_500 / NotoSansJP / IBMPlexMono 等の正しい使用)
- [ ] 色トークン (BRAND_GREEN / BG_PRIMARY / BG_SURFACE / TEXT_PRIMARY 等、ハードコードなし)
- [ ] 主要レイアウト (3 階層 / 2 階層 / Hero + Tabs 等の構造)
- [ ] 主要ボタン/CTA の配置 (画面上下)

### 7.5.4. 適用対象外の場合 (UI 整合と無関係な PR)

- [ ] 本 PR は mockup 整合と無関係 (内部リファクタ / docs / config / build / test 等のみ)
  - 理由: \_\_\_\_\_

### 7.5.5. TabBar icon 変更時チェックリスト (R-53 / ADR-0042 D1 / REQUIRED if `_layout.tsx tabBarIcon` 変更)

> **背景**: Sess36 ADR-0042 で「記録タブ icon = DropletIcon」 が EventIcons watering icon を size override で兼用していた事故が発覚。 タブ icon 選定 4 基準を SoT 化、 PR 時 review チェック。

- [ ] **基準 1 (機能整合)**: 新 icon がタブの **全機能** を象徴している (例: 「記録」 = 14 種別 → 「水滴」 1 種別は不可)
  - 採用理由: \_\_\_\_\_
- [ ] **基準 2 (重複排除)**: `node scripts/check-icon-duplication.mjs` で 0 errors (NavIcons / EventIcons 同名禁止)
  - 検証コマンド: `node scripts/check-icon-duplication.mjs`
- [ ] **基準 3 (4 ペルソナ評価)**: 高橋 62 / Marcus 35 / 盆栽園プロ / ライト で ✕ なし (R-10)
  - 評価結果: \_\_\_\_\_ (例: 4 名 ◎/○、 ✕ なし)
- [ ] **基準 4 (mockup 整合 or 上書き明示)**: `docs/mockups/v1.0/wireframes/*.jsx` HI.\* との整合 or ADR で上書き理由明記
  - mockup 状況: \_\_\_\_\_ (整合 / 上書き → ADR 番号: \_\_\_\_\_)
- [ ] **ADR-0020 Notes Amended に履歴追記** (icon 変更履歴 / rename 履歴の SoT)

> 適用対象外の場合: [ ] 本 PR は TabBar icon 変更を含まない

---

## 7.6. Claude Read 評価ガイド遵守（ui-diff / 達成判定 PR で REQUIRED）

> **背景**: 2026-05-11 セッションで ImageMagick RMSE のみで「達成」 と判定し、bonsai-detail 3 タブで構造的大差を見逃した (Issue #439-#441 で再起票)。PR #442 で「ImageMagick は第一フィルタ、最終判定は Claude Read 主導」 に運用切替。

### 7.6.1. ui-diff / skip-list 編集 PR の構造系 5 項目チェック (REQUIRED、 Sess34 ADR-0041 で 4→5 拡張)

- [ ] mockup 該当 PNG を **Read で目視確認**した (artifact パス: \_\_\_\_\_)
- [ ] 実機 SS を **Read で目視確認**した (artifact パス: \_\_\_\_\_)
- [ ] **構造系 5 項目** のチェック結果を PR description に記載:
  - [ ] **タブ構成**: タブ名 / 順序 / 数が mockup と一致
  - [ ] **セクション構成**: 各タブの上から下までのセクションが一致
  - [ ] **UI 種別**: list / timeline / form / grid のどれか、mockup と一致
  - [ ] **スクロール範囲**: 全画面スクロール可能か (Hero 固定 + 下のみスクロール NG)
  - [ ] **EventRow 表示モード + sub-layout** (Sess34 ADR-0041 Phase η/θ): EventRow の `displayMode` ('compact' / 'detailed') が callsite mapping (design_system §24-2) と一致、 detailed mode の sub-layout (vertical stack + labeled chips + photo full-width + 写真ゼロ動的高さ) が ADR-0041 § Phase θ Decision と一致
- [ ] RMSE 数値 **+ 構造系 5 項目** の両方を満たす

### 7.6.2. 「完遂」/「達成」 表記時の Phase 分割明示 (REQUIRED if 「完遂」 表記)

> Phase 分割 PR で「Issue 完遂」 と書くと Issue 全体達成と誤解される事例あり (Issue #298 が最小実装で完遂報告された)。

- [ ] PR description で「完遂」「達成」 と書く場合、**Phase X 完遂 ≠ Issue 全体完遂** を明示
- [ ] 「Phase X 完了」 表記時は **残り Phase Y/Z を Related に明記**

### 7.6.3. 適用対象外の場合

- [ ] 本 PR は ui-diff / 達成判定と無関係 (機能追加 / 内部 refactor / docs only 等)

### 7.6.4. Navigation 変更 PR の実機検証 (REQUIRED if navigation 変更を含む、 Sess18 R-36.5)

> **背景**: Sess17 違和感 ④ (戻る 2 画面飛び) は Case C (store-callback + 次画面遷移) の use case が不明確で発生。 ADR-0030 §17 で Case A/B/C 分類を明文化、 navigation 変更時の実機検証義務化。

- [ ] navigation 変更内容を ADR-0030 §17 + ADR-0031 Case 4 で分類して PR description に記載:
  - **Case A**: picker → 即時 dialog (DatePicker / Alert.alert 等)、 store-callback 許容
  - **Case B**: picker → caller state 更新のみ、 次画面遷移なし、 store-callback 許容
  - **Case C**: 次画面遷移を伴う store-callback → 禁止、 直接 `router.push` 必須
  - **Case 4 (Sess19 ADR-0031 D1)**: form 保存後 → tab 遷移、 **直接 await + router.replace('/(tabs)/<tab>?...')** 必須
- [ ] **← back button** + **画面端 swipe gesture (Android predictive back)** の両方で 1 画面 = 1 step 動作確認
- [ ] 実機 SS を PR に添付 (戻る挙動を撮影) — Sess18 R-36.5 整合
- [ ] `pnpm navigation:check` で AP-1/AP-2/AP-3 を確認、 検出時は ADR-0030 §17 + ADR-0031 R-39 で再分類
  - 理由: \_\_\_\_\_
- [ ] **(Sess19 ADR-0031 D5 / R-39 整合)** form 保存後の navigation 変更時、 **DB 反映 manual 検証 SS** を添付:
  - 「記録する」 tap 後 → 期待 tab/screen に遷移確認 SS
  - 該当画面で **新規記録が表示されているか** 確認 SS (履歴 list / Plan tab ドット数 等)
  - これは Sess19 で発覚した stale closure bug (8 試行 100% 再現) の再発防止

---

## 7.7. Maestro flow 変更チェック (Maestro flow 変更 PR で REQUIRED、R-31 関連)

> **背景**: 2026-05-12 セッションで text tap (`tapOn: text: '設定'`) が Expo Dev Client Developer Menu を誤起動し、6 段階の試行錯誤で 1 時間ロス (R-9 violation)。 testID 経由のみ + template 利用で再発防止。

### 7.7.1. Maestro flow 新規作成 / 修正時の必須チェック

- [ ] `_template.yml` から派生 or 既存類似 flow をコピー (`cp maestro/flows/_template.yml maestro/flows/<new>.yml`)
- [ ] **`tapOn: text: '...'` 不使用** (testID 経由 `id: 'e2e_xxx'` のみ、Developer Menu 誤起動防止)
- [ ] `appId: 'com.dooooraku.bonsailog'` (誤 appId `app.bonsailog` 等は NG)
- [ ] `launchApp` 直後に `pressKey: 'Back'` (Continue dialog dismiss、毎回必須)
- [ ] 全 `tapOn` 直後に `waitForAnimationToEnd` (ghost tap 防止)
- [ ] 関連画面の testID 事前 grep 実施 (`grep -rn 'e2e_' app/<screen>/ src/features/<feature>/`)
- [ ] 反復実行: **3 回反復** (業界標準、2026-05-12 retro で 5 → 3 に短縮)

### 7.7.2. 適用対象外の場合

- [ ] 本 PR は Maestro flow 変更を含まない
  - 理由: \_\_\_\_\_

---

## 7.8. route / Phase 変更時の影響範囲 全網羅 grep (R-33、 Sess8 PR-5+1 で導入)

> **背景**: 2026-05-17 Sess7 PR-1 で settings タブ → `app/settings/` 移動時、 (1) `SearchHeader.tsx:138` の `router.push('/(tabs)/settings')` 古い path 残存、 (2) `look-back/index.tsx:81` の `showSettings={false}` 残存、 (3) Maestro flow 14 個と計画したが実 grep で 19 個と判明 = 計 3 件の漏れ。 Sess8 PR-1 で hotfix。 同種の path 漏れを構造的に防ぐ。

### 7.8.1. route / path / testID / Phase 変更時の必須チェック (REQUIRED if 構造変更)

- [ ] **事前 grep 全網羅実行**: 廃止予定の path / testID / component 名で `grep -rn '<pattern>' --include="*.tsx" --include="*.ts" --include="*.yml" --include="*.json"` を全網羅
  - 廃止 pattern: \_\_\_\_\_
  - hit 数: \_\_\_\_\_ 件
- [ ] **計画段階で「N 件」 と楽観計上禁止**: 実 grep を先に走らせて確定数を出す
- [ ] **`scripts/obsolete-routes.json` に新 entry 追加** (廃止 route 一元管理、 `.claude/hooks/check-obsolete-routes.mjs` で Edit/Write 時 block)
- [ ] **影響範囲の hit 一覧を以下に列挙** (修正済 / 修正不要 の判断を明記):
  ```
  例:
  - SearchHeader.tsx:138 → router.push('/(tabs)/settings') → /settings に修正済 ✅
  - look-back/index.tsx:81 → showSettings={false} → 削除済 (全タブで歯車表示) ✅
  - maestro/flows/*.yml × 19 個 → e2e_tab_settings → e2e_bonsai_home_settings に sed 一括置換済 ✅
  ```

### 7.8.2. 適用対象外の場合

- [ ] 本 PR は route / path / testID / Phase 変更を含まない
  - 理由: \_\_\_\_\_

---

## 8. Docs影響（docs-as-code / REQUIRED）

> 仕様書を死なせないための “分岐チェック”。

- [ ] 仕様/前提/制約が変わる → docs/reference/constraints.md を更新（リンク：）
- [ ] 用語が増える/意味が変わる → docs/reference/glossary.md を更新（リンク：）
- [ ] 運用手順が変わる → docs/how-to/whole_workflow.md を更新（リンク：）
- [ ] リリース手順に影響 → docs/how-to/android*ビルド手順.md / docs/how-to/ios*ビルド手順.md を更新（リンク：）
- [ ] 意思決定が増えた/変わった → docs/adr/ADR-XXXX.md を追加 or 更新（リンク：）
- [ ] テスト観点が変わる → テスト（Jest/Maestro）を追加/更新（リンク or 該当ファイル：）
- [ ] どれも不要（理由：外部仕様/運用/テスト観点に影響なし、内部リファクタのみ）

---

## 9. リスク評価 & ロールバック（REQUIRED）

### 9-1. リスク（短く）

- 想定リスク:
- 検知方法（どうやって気づく？）:
- 影響の大きさ:
  - [ ] 低（困るが致命傷ではない）
  - [ ] 中（ユーザーの一部が詰まる）
  - [ ] 高（課金/データ消失/起動不可など）

### 9-2. ロールバック（戻し方 / REQUIRED）

- 戻し方（最短手順）:
  - 例：このPRを revert / 前のタグへ戻す / 機能フラグOFF など
- 影響範囲の切り分け（できれば）:
  - 例：Freeのみ / 特定OSのみ / 特定画面のみ

---

## 10. セキュリティ / 課金 / 広告（該当時のみ / REQUIRED if 該当）

- [ ] Secrets/キーを直書きしていない（APIキー/広告ユニットID/RevenueCat等）
- [ ] 個人情報をログ出力していない
- [ ] 通信はHTTPS前提で問題ない
- [ ] 課金（RevenueCat）の影響がある → 購入/復元/解約導線の確認手順を「6」に追記した
- [ ] 広告（AdMob）の影響がある → Freeのみ表示 / Proはゼロ を確認する手順を「6」に追記した
- [ ] 外部GitHub Actionsの追加/更新がある → 第三者Actionは commit SHA pin した

---

## 11. リリース影響（release/hotfix だけ / RECOMMENDED）

- ストア提出が必要:
  - [ ] なし
  - [ ] あり（iOS / Android）
- 段階配信を推奨:
  - [ ] なし
  - [ ] あり（理由：　　　　　　　　　）
- 監視ポイント（24〜48h）:
  - クラッシュ:
  - レビュー:
  - 課金:
  - 広告:

---

## 12. PRサイズ（RECOMMENDED）

- 変更行数の感覚:
  - [ ] 小（〜200行）
  - [ ] 中（〜500行）
  - [ ] 大（500行超）→ 分割を検討（理由：　　　　　　　　　）

---

## 13. チェックリスト（DoD / REQUIRED）

- [ ] 変更目的が1文で説明できる
- [ ] 影響範囲（UI/機能/データ/Free/Pro）を書いた
- [ ] “合否が判定できる” 動作確認を記載した（自動/手動）
- [ ] CIが通った（または通せない理由を明記）
- [ ] docs影響を判定し、必要なら更新した（links記載）
- [ ] リスクとロールバックを書いた

---

## 14. W-10.5 レビュー（Claude Code が記入）

<!-- Codex が PR を作成後、Claude Code が /review-pr Skill で記入する -->

- [ ] **AC 充足確認**: Issue の Acceptance Criteria が全て ✅ になっている
- [ ] **constraints / ADR 準拠**: docs/reference/constraints.md と関連 ADR に違反していない
- [ ] **影響範囲の乖離チェック**: W-05 で予想した影響範囲と実際の変更が一致している
- [ ] **デグレリスク**: 既存テストが壊れていない、カバレッジが下がっていない
- [ ] **コード品質**: 既存の vertical slice パターンに従っている、不要な抽象化がない
- [ ] **ドキュメント更新**: lessons.md / ADR / functional_spec が必要に応じて更新されている

**レビュー判定**: [ ] Approve / [ ] Request Changes / [ ] Discuss

**理由（2〜3 文）**:

**マージ方法**: [ ] `auto-merge` ラベル付きで自動 / [ ] 人間承認待ち

<!--
補足：
- 詳しい議論メモは本文に溜めない。必要なら ADR を作り、ここにはリンクだけ残す。
- Claude Code は /review-pr Skill でこのセクションを記入する。
-->
