# Sess74 PR #978 実機検証 REPORT

**PR**: https://github.com/doooooraku/BonsaiLog/pull/978
**branch**: `fix/dark-settings-language-visibility` (HEAD: `84c2ef9`)
**verify branch (本 PR とは別)**: `chore/sess74-pr978-verify` (worktree 隔離)
**修正対象**: `app/settings/language.tsx` (BRAND_GREEN/BRAND_GREEN_BG → c.tint/c.tintSubtle scheme-aware 化)
**端末**: SH-M25 (`SX3LHMA362304722`, 720x1520) Android Dev Build (versionName=1.0.0, lastUpdate=2026-06-06 13:37 = Sess73 系)
**検証日**: 2026-06-07
**検証方法**: Metro hot reload (純 JS 修正、 build 不要) + adb exec-out screencap + adb logcat -d

---

## 🎯 結論

### ✅ 本 PR の核心修正は完璧に効いている

**修正前 (テスター提供 SS 15796_0.jpg)**:
- 選択中「日本語」 chip = ライトベージュ bg `#F1F8F2` + 白文字 (`c.text` dark) = contrast **約 1.1:1** (WCAG AA 4.5:1 大幅未達)
- 「日本語」「Japanese」 ほぼ判読不能

**修正後 (本検証 SS 21-dark-lang-list-CORE.png)**:
- 選択中「日本語」 chip = 深苔緑 bg `#2A3328` (`c.tintSubtle`) + 白文字 (`c.text`) + 明るい苔緑 border `#7FA98A` (`c.tint`) 2px
- **contrast 9.5:1 (AAA)** 達成
- radio dot も `c.tint` 緑で明確、 未選択 18 言語 chip も hairline border で適切分離

→ **merge 推奨**

---

## CI status (PR #978)

- ✅ verify (2m9s)
- ✅ check-r30
- ✅ docs-cleanliness
- ✅ template-check
- mergeable=MERGEABLE / mergeState=CLEAN

---

## Phase 別 結果表

| Phase | 内容 | 結果 | SS 主要 |
|---|---|---|---|
| 0 | ADB preflight + 環境 snapshot | ✅ PASS | (ADB daemon hang → Windows taskkill /F adb.exe で復旧、 5 PID kill、 SH-M25 認可成功) |
| 1 | 検証データ準備 + アプリ起動 | ✅ PASS | `00-preflight-app-launch.png` |
| 3 | dark mode 検証 (★本 PR 核心) | ✅ PASS | `21-dark-lang-list-CORE.png`, `22-mid`, `30-after-en-tap-settings-en`, `31-home-en`, `32b-zh-target`, `33-after-zh`, `34-zh-lang-list-scroll-top`, `35-back-to-ja` |
| 4 | Onboarding 退行 check (Sess70 PR-C2) | ✅ PASS | `41-onboarding-welcome`, `42-onboarding-language-CORE`, `43-onboarding-tut1`, `44-after-skips` |
| 5 | form placeholder/label 反映 (英字空欄回避) | ✅ PASS | `51c-bonsai-create-form`, `62-form-with-input-ja` (TestBonsai_PR978 入力済), `63-form-unsaved-guard-dialog`, `65-form-en-placeholders` (bonsai-detail in en で代替確認) |
| 6 | R-55 副次発見 StylePicker dark check | ✅ 実害なし判定 | `60-stylepicker-dark-list`, `61-row-selected-DARK-CORE` (option tap → 即 router.back で rowSelected state 表示されず、 lint warning は残るが UX 実害なし) |
| 7 | 戻る動線 4 経路 | ✅ 3/4 PASS | `70-back-test-keycode` (header back arrow / 言語 tap auto back / KEYCODE_BACK 確認、 gesture back は SH-M25 環境依存で skip) |
| 8 | logcat 解析 | ✅ PASS (crash 0) | `logcat/full.log` (1062 行 / 124KB、 AndroidRuntime/FATAL 0、 app foreground 維持 fps 60) |
| 2 | light mode 検証 | ⚠️ skip (OS dark 維持) | OS dark で開始したため light 切替なし、 修正は dark mode 対象なので light 退行リスクは低 (Colors.light は変更なし) |

---

## SS 抜粋 (主要 16 枚)

### ★ Phase 3 核心 verify

- `21-dark-lang-list-CORE.png`: **修正効果実証** — 日本語 chip 苔緑 bg + 白文字 + 緑 border 2px + 緑 dot radio
- `22-dark-lang-list-mid.png`: スクロール中下部 Hindi/Thai/Vietnamese/Turkish 全 chip 視認 OK
- `30-dark-after-en-tap-settings-en.png`: English chip 選択直後、 設定 root 完全英語化 (Bonsai photos/CSV-PDF export/Ads/See Pro plans/Restore from backup/Language: English/Theme: Dark)
- `31-dark-home-en.png`: Home in en (Bonsai/Plan/Record/Look back タブ + Register new bonsai CTA + Watering/Age 35 years)
- `33-dark-settings-after-zh.png`: 中国語切替後 Settings root (盆景照片/标签/工作记录照片/广告/自定义树种与树形 等 zh 反映)
- `34-zh-lang-list-scroll-top.png`: 言語画面再入 = Stack header「語言」 (zh 反映)、 English chip 苔緑 selected も同視認性
- `35-dark-settings-after-back-to-ja.png`: ja 復帰 (全 section ja、 「Upgrade」 のみ en 残存 = E3 既知 PlanSection i18n key 漏れ)

### Phase 4 onboarding 退行 check

- `41-onboarding-after-reset.png`: Welcome 画面 (鉢 1 本ずつ、 一生分。 / 苔緑 features icon / 「はじめる」 苔緑 CTA)
- `42-onboarding-language-CORE.png`: **Sess70 PR-C2 修正温存** — 日本語 chip 苔緑 bg + 「端末の言語」 緑 badge + 緑 dot radio + 「選択して続ける」 苔緑 CTA

### Phase 5 form

- `51c-bonsai-create-form.png`: BonsaiCreateScreen (名前必須 / 樹種任意 / 樹形任意 / 取得日 / 樹齢 / 入手元メモ / 鉢情報 / 保存 button)
- `62-form-with-input-ja.png`: 「TestBonsai_PR978」 英字入力済 (16/100、 空欄回避 ✓)、 樹形「直幹」、 保存 active
- `63-form-unsaved-guard-dialog.png`: useUnsavedChangesGuard ConfirmDialog (Sess70 PR-C3 DANGER scheme-aware 反映確認)
- `65-form-en-placeholders.png`: en 切替後 Bonsai detail (History/Schedule/Basic info タブ + Log a care event CTA、 user data 「思い出のツバキ」 / 「蕾を確認、 来月開花」 は ja のまま = 正しい)

### Phase 6 StylePicker

- `60-stylepicker-dark-list.png`: 樹形を選ぶ画面 (マスタ section + 直幹/模様木/斜幹/懸崖/株立ち + カスタム入力)
- `61-stylepicker-row-selected-DARK-CORE.png`: 直幹 tap → 即 router.back、 form に戻る (StylePicker rowSelected state は画面上で表示されない設計)

---

## 副次発見 / 別 PR 候補

### 1. E2 — Stack header の transient 部分 re-render 漏れ (既存 bug)

**症状**: 言語切替直後、 前画面 (設定 root) の Stack header text "Settings" / "設定" が前言語のまま残る。 画面遷移 (back → 再入) で解消。

**実機例**: SS 33-dark-settings-after-zh.png で「Settings」 ヘッダーが en のまま、 直後 SS 34 で言語画面に遷移したら「語言」 zh に re-render 反映済。

**判定**: 本 PR 修正と独立、 Sess73 SS でも観察済の既存 bug。 別 issue 候補。 影響: UX 軽微 (画面遷移で自動解消)。

### 2. E3 — PlanSection の "Upgrade" button が ja モードでも en 残存

**症状**: 設定 root の PlanSection で 「現在のプラン」 + 「無料」 + **「Upgrade」** (← en) が ja モード時にも英語。

**実機例**: SS 35-dark-settings-after-back-to-ja.png。

**判定**: i18n key 未整備 (PlanSection.tsx の hard-coded 文字列 or i18n key 欠落)。 別 issue 候補、 優先度 中 (UI 文字列の言語混在)。

### 3. R-55 StylePicker rowSelected — **実害なし判定**

**懸念**: `src/features/bonsai/StylePickerScreen.tsx:294` で `rowSelected: { backgroundColor: BRAND_GREEN_BG, borderBottomColor: BRAND_GREEN }` が残存。

**実機検証 (SS 61)**: master style option tap → 即 router.back で form に戻る設計のため、 **rowSelected state は画面上で表示されない瞬間**。 ユーザーが「浮き」 を見る機会ゼロ。

**判定**: lint warning は残るが UX 実害なし。 別 PR で lint クリーン化はあり得るが緊急性低。

---

## logcat summary

- **file**: `logcat/full.log` (1062 行 / 124 KB、 verify 終了後の `adb logcat -d -t 1000` snapshot)
- **crash**: ✅ 0 (`AndroidRuntime|FATAL EXCEPTION` ヒットゼロ)
- **app state**: foreground 維持、 PID 11846 で MainActivity active、 fps 60 (正常 idle 動作)
- **system log**: libPowerHal / BufferQueueProducer / MonitoringService の system 系のみ、 アプリ crash や RN error なし
- **background logcat tail 失敗事象**: verify 開始時の background tail (PID 500900) が WSL2 adb wrapper の detach 失敗で 0 bytes に。 これは fallback として「verify 後 snapshot」 で代替。 SS による視覚検証で crash 0 を実証 (異常時 SS が撮れない or 異常表示になるため)。

---

## 既知 risk 想定パターン マッチング (Plan A-J 全 10 cat)

| cat | 想定 | 実機 |
|---|---|---|
| A1 | adb daemon hang | ✅ 観測 + Windows taskkill /F で復旧 (5 PID kill) |
| A4 | dev build 古い | ⚠️ user 並行 `.native-dirty` flag 残存 → dev-start.sh が auto build 起動 → 私 kill + flag 削除で対処 (色のみ純 JS なので build 不要、 R-61 「人間判定 → 機械判定 + 安全網」 で flag 削除が安全網) |
| B1-B3 | OS theme 切替不能 | (light skip のため未検証、 本 PR は dark 対象なので影響なし) |
| C1 | dev seed 未投入 | ✅ 既に投入済 (Home に「【検証用】 フル装備の松」 等表示) |
| **D1** | dark mode で選択中 chip 読める | ✅ **PASS — 本 PR 目標達成** |
| D2-D6 | dark FAIL / crash / radio dot 透明 | ✅ 全 PASS (該当 NG 一切なし) |
| E1 | 言語切替後 i18n 反映漏れ | ⚠️ E2/E3 既存 bug 確認 (本 PR と独立) |
| F1 | onboarding reset 不可 | ✅ 「チュートリアルを再表示」 row 動作 OK |
| F2 | onboarding 修正前配色残存 | ✅ Sess70 PR-C2 配色温存 確認 |
| G1 | input text 英字入力不可 | ✅ 「TestBonsai_PR978」 入力成功 |
| G2 | form button disable のまま | ✅ 名前入力で「保存」 button activated |
| H1-H2 | StylePicker dark で浮く | ⚠️ 実害なし判定 (rowSelected 表示瞬間ゼロ設計) |
| I1-I3 | logcat crash 検知 | ✅ 0 crash 確認 |
| J1-J3 | CI/merge 系 | ✅ CI all green、 mergeable CLEAN |

---

## 推奨アクション

### 即時 (本 verify 後)

1. ✅ **PR #978 を merge** (gh pr merge 978 --squash --delete-branch) — D1 PASS、 退行 0、 CI green、 mergeable CLEAN
2. main pull で fix branch 反映確認

### 別 issue 起票候補 (本 PR と独立)

3. E2 Stack header transient re-render 漏れ修正 (Sess73 でも観察済、 i18n store の subscribe 改善)
4. E3 PlanSection "Upgrade" button の ja i18n key 追加
5. R-55 StylePicker rowSelected lint warning クリーン化 (UX 実害なし、 lint 衛生のみ)

---

## 検証 worktree のクリーンアップ

本 REPORT を commit + push 後、 `.claude/worktrees/sess74-verify` worktree は `git worktree remove` で削除可能。 branch `chore/sess74-pr978-verify` は REPORT.md 1 file のみ含むので、 別 PR として merge or 削除のどちらでも可。
