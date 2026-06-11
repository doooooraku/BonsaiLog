# PR テンプレート付録 — 条件付きチェックリスト集

> **用途**: `.github/pull_request_template.md` (core) の §7「条件付きチェック」で該当した PR は、本付録の該当節を **PR 本文へコピーして記入** する。
> **§番号は旧テンプレ (2026-06-11 コア再構成前) と同一** — ADR / lessons / R ルールからの「テンプレ §7.5」等の歴史参照を壊さないため番号を維持している。
> 出自: Doc-Truth Audit P4 (純増禁止 — コア 472→約 160 行への差し引き再構成で本付録へ分離)。

---

## 6.4. CSV / PDF エクスポート出力チェック（REQUIRED if export 出力内容を変更）

> **背景 (Sess47)**: 「出力できる」を達成基準にし「実利用者が読めるか」を未検証だったため、
> CSV が ULID / UTC / 英語コードの生 DB ダンプになっていた。出力は **実ファイルをペルソナ
> 視点で目視** して初めて合格とする (機械が生成成功 = 合格ではない)。

- [ ] 実機で実ファイルを生成し中身を確認した (run-as cat / 共有先で開く / 添付):
- [ ] **高橋 62 歳 (シニア)**: 列・値が**意味の分かる日本語**で読めるか (ULID / 英語コード / UTC 生値が露出していない)
- [ ] **Marcus (Excel 派)**: Excel で開いて**集計・ピボットが破綻しない**か (BOM / 列ズレ / 文字化けなし)

---

## 7. UI差分（REQUIRED if UI 変更）

- Before: （スクショ/動画/リンク）
- After : （スクショ/動画/リンク）
- mockup: （`docs/mockups/v1.0/` の該当 wireframe / screenshot。UI の正は design_system.md + mockups — ADR-0020/R-16）

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
  - 撮影手順: `docs/how-to/development/screenshot-capture.md`
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

### 7.5.5. TabBar icon 変更時チェックリスト (R-53 / ADR-0042 D1 / REQUIRED if `_layout.tsx tabBarIcon` 変更)

> **背景**: Sess36 ADR-0042 で「記録タブ icon = DropletIcon」 が EventIcons watering icon を size override で兼用していた事故が発覚。 タブ icon 選定 4 基準を SoT 化、 PR 時 review チェック。

- [ ] **基準 1 (機能整合)**: 新 icon がタブの **全機能** を象徴している (例: 「記録」 = 全種別 → 「水滴」 1 種別は不可)
  - 採用理由: \_\_\_\_\_
- [ ] **基準 2 (重複排除)**: `node scripts/check-icon-duplication.mjs` で 0 errors (NavIcons / EventIcons 同名禁止)
- [ ] **基準 3 (4 ペルソナ評価)**: 高橋 62 / Marcus 35 / 盆栽園プロ / ライト で ✕ なし (R-10)
  - 評価結果: \_\_\_\_\_
- [ ] **基準 4 (mockup 整合 or 上書き明示)**: `docs/mockups/v1.0/wireframes/*.jsx` HI.\* との整合 or ADR で上書き理由明記
  - mockup 状況: \_\_\_\_\_ (整合 / 上書き → ADR 番号: \_\_\_\_\_)
- [ ] **ADR-0020 Notes Amended に履歴追記** (icon 変更履歴 / rename 履歴の SoT)

### 7.5.6. BottomCtaBar 配置画面チェックリスト (R-62 / ADR-0054 D2 / REQUIRED if 新画面に BottomCtaBar 配置 or ScrollView paddingBottom 変更)

> **背景**: ScrollView paddingBottom 計算 (Layout Contract) の散在 = SoT 漏れで Sess72 にテスター報告「FAB がリストと重なる」 発覚。 ADR-0054 で BottomCtaBar 全面化 + R-62「Component SoT + Layout Contract SoT」 起票。

- [ ] **inline 配置の徹底**: BottomCtaBar を `position: 'absolute'` で配置していない (inline = container 内の flex 順序で配置)
  - 配置箇所: \_\_\_\_\_ (ファイル名 / 行番号)
- [ ] **paddingBottom 計算式の不在**: contentContainerStyle.paddingBottom に `tabBarHeight + ...` 等の magic number 計算を**書いていない** (視覚 breathing room の `paddingBottom: 16` 程度は許容)
- [ ] **theme-aware bg**: `<BottomCtaBar />` 経由なので token 直書きなし (R-58 整合)
- [ ] **testID 規約**: `e2e_<screen>_bottom_cta_<action>` 命名
- [ ] **label = i18n key 経由**: `label={t('XxxCta')}` で文字列直書きなし (ADR-0033 / R-41)
- [ ] **disabled 条件の明示**: `disabled` を渡す時、条件を screen 内 comment で説明
- [ ] **ふりかえり tab には配置しない**: ナビゲーション hub のため CTA 不要 (ADR-0054 D5)
- [ ] **実機検証**: 短リスト (0-1 件) + 長リスト (50+ 件) で BottomCtaBar が画面下端固定、last item が bar に隠れない (R-62)

---

## 7.6. Claude Read 評価ガイド遵守（UI 整合 / 達成判定 / navigation / テスター報告 PR で REQUIRED）

> **背景**: 2026-05-11 セッションで ImageMagick RMSE のみで「達成」 と判定し、bonsai-detail 3 タブで構造的大差を見逃した (Issue #439-#441 で再起票)。PR #442 で「ImageMagick は第一フィルタ、最終判定は Claude Read 主導」 に運用切替。

### 7.6.1. UI 整合 (mockup 寄せ) PR の構造系 5 項目チェック (REQUIRED、Sess34 ADR-0041 で 4→5 拡張、ADR-0059 標準)

- [ ] mockup 該当 PNG を **Read で目視確認**した (artifact パス: \_\_\_\_\_)
- [ ] 実機 SS を **Read で目視確認**した (artifact パス: \_\_\_\_\_)
- [ ] **構造系 5 項目** のチェック結果を PR description に記載:
  - [ ] **タブ構成**: タブ名 / 順序 / 数が mockup と一致
  - [ ] **セクション構成**: 各タブの上から下までのセクションが一致
  - [ ] **UI 種別**: list / timeline / form / grid のどれか、mockup と一致
  - [ ] **スクロール範囲**: 全画面スクロール可能か (Hero 固定 + 下のみスクロール NG)
  - [ ] **EventRow 表示モード + sub-layout** (Sess34 ADR-0041 Phase η/θ): `displayMode` が callsite mapping (design_system §24-2) と一致、detailed mode の sub-layout が ADR-0041 §Phase θ Decision と一致
- [ ] 構造系 5 項目 + `integration-criteria.md` レベル 2 (見た目 80% 一致) を満たす

### 7.6.2. 「完遂」/「達成」 表記時の Phase 分割明示 (REQUIRED if 「完遂」 表記)

- [ ] 「完遂」「達成」 と書く場合、**Phase X 完遂 ≠ Issue 全体完遂** を明示
- [ ] 「Phase X 完了」 表記時は **残り Phase Y/Z を Related に明記**

### 7.6.4. Navigation 変更 PR の実機検証 (REQUIRED if navigation 変更を含む、Sess18 R-36.5)

- [ ] navigation 変更内容を ADR-0030 §17 + ADR-0031 Case 4 で分類して PR description に記載:
  - **Case A**: picker → 即時 dialog、store-callback 許容
  - **Case B**: picker → caller state 更新のみ、store-callback 許容
  - **Case C**: 次画面遷移を伴う store-callback → 禁止、直接 `router.push` 必須
  - **Case 4 (Sess19 ADR-0031 D1)**: form 保存後 → tab 遷移、**直接 await + router.replace** 必須
- [ ] **← back button** + **画面端 swipe gesture** の両方で 1 画面 = 1 step 動作確認
- [ ] 実機 SS を PR に添付 (戻る挙動を撮影)
- [ ] `pnpm navigation:check` で AP-1/AP-2/AP-3 を確認
- [ ] **(ADR-0031 D5 / R-39)** form 保存後の navigation 変更時、**DB 反映 manual 検証 SS** を添付 (遷移確認 + 新規記録の表示確認 — stale closure bug 再発防止)

### 7.6.5. テスター報告起点の修正 PR の実機なぞり検証 (REQUIRED if テスター報告起点、Sess95 R-80)

> **背景**: Sess72 scroll 復元で「直した」 と告知後、テスターから再報告 (Sess95)。完了判定が Jest + lint のみで、報告された再現手順そのものの実機再現確認が gate に含まれていなかった。

- [ ] テスター報告の **再現手順をそのまま実機でなぞった** SS / 動画を PR 本文 or コメントに添付
- [ ] リリースノートに「修正済」 と書くのは上記証拠がある項目のみ

---

## 7.7. Maestro flow 変更チェック (REQUIRED if Maestro flow 変更、R-31 関連)

> **背景**: text tap が Expo Dev Client Developer Menu を誤起動し 1 時間ロス (2026-05-12)。testID 経由のみ + template 利用で再発防止。

- [ ] `_template.yml` から派生 or 既存類似 flow をコピー
- [ ] **`tapOn: text: '...'` 不使用** (testID 経由 `id: 'e2e_xxx'` のみ)
- [ ] `appId: 'com.dooooraku.bonsailog'` (誤 appId は NG)
- [ ] `launchApp` 直後に `pressKey: 'Back'` (Continue dialog dismiss)
- [ ] 全 `tapOn` 直後に `waitForAnimationToEnd` (ghost tap 防止)
- [ ] 関連画面の testID 事前 grep 実施 + uiautomator dump で実在確認 (R-31 項目 5)
- [ ] 反復実行: **3 回反復**

---

## 7.8. route / Phase 変更時の影響範囲 全網羅 grep (R-33 / REQUIRED if route / path / testID / Phase 変更)

> **背景**: Sess7 PR-1 の settings 移動で古い path 残存 3 件 (Sess8 PR-1 hotfix)。同種の path 漏れを構造的に防ぐ。

- [ ] **事前 grep 全網羅実行**: 廃止予定の path / testID / component 名で全拡張子 grep
  - 廃止 pattern: \_\_\_\_\_ / hit 数: \_\_\_\_\_ 件
- [ ] **計画段階で「N 件」と楽観計上禁止**: 実 grep を先に走らせて確定数を出す
- [ ] **`scripts/obsolete-routes.json` に新 entry 追加** (廃止 route 一元管理、hook で Edit/Write 時 block)
- [ ] **影響範囲の hit 一覧を列挙** (修正済 / 修正不要 の判断を明記)

---

## 10. セキュリティ / 課金 / 広告（REQUIRED if 該当）

- [ ] Secrets/キーを直書きしていない（APIキー/広告ユニットID/RevenueCat等）
- [ ] 個人情報をログ出力していない
- [ ] 通信はHTTPS前提で問題ない
- [ ] 課金（RevenueCat）の影響がある → 購入/復元/解約導線の確認手順を §6 に追記した
- [ ] 広告（AdMob）の影響がある → Freeのみ表示 / Proはゼロ を確認する手順を §6 に追記した
- [ ] 外部GitHub Actionsの追加/更新がある → 第三者Actionは commit SHA pin した

---

## 11. リリース影響（REQUIRED if release / hotfix）

- ストア提出: [ ] なし / [ ] あり（iOS / Android）
- 段階配信: [ ] なし / [ ] あり（理由：）
- 監視ポイント（24〜48h）: クラッシュ / レビュー / 課金 / 広告
- 本番昇格手順: `docs/how-to/release/production-promotion-checklist.md`
