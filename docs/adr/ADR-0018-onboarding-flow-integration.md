---


# ADR-0018: オンボーディング統合フロー (システム 3 画面 + 機能チュート 5 ステップ = 8 画面、各画面スキップ可、再閲覧 Step 1-5)

- Status: Amended by [ADR-0020](./ADR-0020-claude-design-full-adoption.md) (2026-05-05、8 画面 → 6 画面に削減)
- Date: 2026-05-02
- Deciders: @doooooraku
- Related:
  - 上書き対象: なし (新規 ADR、既存 ADR-0011/0014 は Notes 追記のみで Decision 維持)
  - 連動: ADR-0011 (記録のみ哲学 + 機能チュート 5 ステップ既定) / ADR-0014 (Step 5 通知設定 + Step 5-B 水やり時刻設定) / ADR-0013 (F-04 Step 4 ヒートマップサンプル) / ADR-0015 (TT2 light 固定 + A1 200ms アニメ) / ADR-0017 (ATT/UMP オンボ非統合) / ADR-0020 (Claude Design 全面採用、本 ADR 改訂元)
  - Design 参考 (下書き、ADR が正): `/mnt/c/Users/doooo/Downloads/BonsaiLog_template-handoff/bonsailog-template/project/screens.jsx` (Splash/Welcome/言語/通知 4 画面採用、ATT/UMP 独自前置き画面は不採用)
  - Issue: #26 (オンボーディング、既存) を本 ADR で改訂
  - 影響先 Issue: #29 (F-04) / #30 (F-16) / #14 (F-01) / #15 (F-08) / #17 (F-02) — Step 1-4 サンプルデータ表示の参考

> **2026-05-05 追記 (ADR-0020 連動、Amended)**:
> ADR-0020 で Claude Design 全面採用に伴い、本 ADR は以下の点で改訂:
> 1. **オンボ 8 画面 → 6 画面に削減** — Claude Design `screens.jsx` 整合 (Splash + Welcome + LanguagePicker + Notification + 機能 2)
> 2. **機能チュート 5 ステップ → 2 ステップに圧縮** — 重要 2 機能 (盆栽追加 + 作業記録) のみ、詳細チュートは GuideModalScreen (新規盆栽 30 日ガイド) に分離
> 3. **既存ユーザー migration**: `onboarding_v` キーで既存 v=1 完了ユーザーは再オンボなし
> 削減画面の経緯と詳細は ADR-0020 Decision §10 + Phase 8 計画参照。
>
> **2026-05-16 追記 (ADR-0020 v1.x-2 連動、Amended)**:
> 2026-05-16 セッション議論で機能チュート (tut1 / tut2) 全撤去確定:
> 1. **オンボ 6 画面 → 4 画面に再削減** — Splash + Welcome + LanguagePicker + Notification (tut5) のみ
> 2. **機能チュート 2 ステップ → 0 ステップに撤去** — ADR-0011 記録のみ哲学整合、user 判断「不要なので削除」
> 3. **撤去理由**: tut1 (盆栽追加) / tut2 (樹種登録) 実機 UI は完成済だが、mockup wireframe との drift + 押し付けがましさゼロ哲学整合のため撤去
> 4. **影響**: i18n 19 言語 × 4 keys = 112 行削除、Issue #531 (mockup HTML 作成依頼) close、skip-list 撤回、41 → 39 分母再定義
> 詳細は ADR-0020 §Notes Amended (2026-05-16、v1.x-2) 参照。

---

## Context（背景：いま何に困っている？）

- 現状:
  - ADR-0011 §86-106 で機能チュート 5 ステップ (Step 1 盆栽登録 / Step 2 水やり / Step 3 タイムライン / Step 4 ヒートマップ / Step 5 通知設定) が確定済。
  - ADR-0014 §41-47 で Step 5 通知設定の詳細 (3 行動パターン + 5-B 水やり時刻設定) が確定済。
  - Claude Design (`screens.jsx`) は 6 画面構成 (Splash/Welcome/言語選択/ATT/UMP/通知)、機能チュート 1-4 は別画面で未統合。
  - 機能チュート前段の **システム部 (Splash/Welcome/言語選択)** が ADR で未定義 → アプリ初回起動時の体験が宙ぶらりん。
  - ATT/UMP は ADR-0017 で「OS 標準ダイアログのみ、独自前置き画面なし」確定 → Design `screens.jsx` の ATT/UMP 画面は不採用。
  - constraints §3-1 の 19 言語 (en/ja/.../sv、ar なし) と Design `screens.jsx` LANGS (ar 含む / sv なし) が矛盾 → constraints が正。
  - スキップ文言が「スキップ」「あとで」混在 → シニア向けに統一が必要。
- 困りごと:
  1. **アプリ初回起動の体験が未定義**: Splash → 何 → 機能チュート → ホーム の流れが ADR にない。
  2. **言語選択画面の必要性議論が未終結**: ADR-0011/0014 は機能チュートのみ、言語選択は constraints §3-1 で「19 言語対応」とのみ。
  3. **ATT/UMP の発火タイミングがオンボ非統合と決まったが、ADR-0011/0014 既定とどう繋がるか未文書化**。
  4. **Welcome 画面の文言**: Design 案あり、product_strategy.md と整合確認が必要。
  5. **言語選択の UX**: native + Latin 併記、OS 言語 pre-select、誤選択防止が未定義。
  6. **スキップ動線**: 「スキップ」「あとで」の文言統一、Step 5 既存「あとで」との整合。
  7. **再閲覧時の挙動**: Settings → ヘルプ から再表示時、システム部 (Splash/Welcome/言語) は再表示不要 vs 機能チュート Step 1-5 のみ再表示の判断未定義。
  8. **完了判定**: AsyncStorage キーの設計、Step 5 「あとで」or OS 拒否時の扱い。
- 制約 / 前提:
  - `docs/reference/constraints.md` §1-4 (記録のみ哲学) / §3-1 (19 言語 = en/ja/.../sv、ar なし) / §5-2 (禁止語)
  - `docs/reference/personas.md` 4 ペルソナ (高橋 62 歳 / Marcus 35 歳 / 盆栽園プロ / ライト)
  - `.claude/recurrence-prevention.md` R-1〜R-20
  - ADR-0011 §86-106 (機能チュート 5 ステップ既定)
  - ADR-0014 §41-47 (Step 5 通知設定 + Step 5-B + 3 行動パターン + スキップ時 OFF 初期化)
  - ADR-0013 §31 (Step 4 ヒートマップサンプル表示)
  - ADR-0015 TT2 (チュートリアル中 light 固定、太陽アイコン非表示) / A1 (200ms アニメ、Reduced Motion で 0ms)
  - ADR-0017 (ATT/UMP オンボ非統合、ホーム到達後 AdBanner マウント時に発火)
  - 既存依存: `expo-localization` / `expo-splash-screen` / `react-native-reanimated` / `@react-native-async-storage/async-storage`

---

## Decision（決めたこと：結論）

オンボーディング統合フローを以下の構成で実装する。

### ① 全体画面構成 (B4 採用、フル 8 画面)

1. **システム部 (3 画面)**:
   - **Screen 1**: Splash (Expo SplashScreen で OS 起動と統合、独自描画コンポーネント不要)
   - **Screen 2**: Welcome (Design 文言採用 + 3 価値訴求)
   - **Screen 3**: 言語選択 (native + Latin 併記 + OS 言語バッジ + 瞬時プレビュー)
2. **機能チュート部 (5 ステップ、ADR-0011/0014 既定踏襲)**:
   - **Step 1**: 盆栽登録 (ADR-0011 §89)
   - **Step 2**: 作業の水やり記録 (ADR-0011 §90)
   - **Step 3**: タイムライン (ADR-0011 §91)
   - **Step 4**: ヒートマップの読み方 (ADR-0011 §92 + ADR-0013 §31 サンプル表示)
   - **Step 5**: 通知設定 (ADR-0011 §97-104 + ADR-0014 §41-47 既定踏襲、Step 5-B 水やり時刻設定含む)
3. **総画面数**: **8 画面** (システム 3 + 機能 5)
4. **各画面スキップ可**: 全画面右上に「あとで」リンク (Q5 採用、シニア向け文言統一)
5. **再閲覧**: Settings → ヘルプ → 「チュートリアルを再表示」で **Step 1-5 のみ表示** (Splash/Welcome/言語選択は再表示不可)

### ② Splash 画面 (Screen 1)

6. **実装**: `expo-splash-screen` (画像のみ自動消去)、独自 React コンポーネント不要。
7. **ロゴ画像**: BonsaiLog ロゴ + 「盆栽手帳」キャッチ (Noto Serif JP 風)、washi 和紙背景 (`#F7F3E8` Design 採用、ADR-0015 light の `#FFFFFF` 純白とは別途 Splash 専用画像で許容)
8. **表示時間**: OS 起動 + JS bundle ロード完了まで (通常 1-3 秒)
9. **ステータスバー**: light モード = 黒文字 (ADR-0015 SB1 既定)
10. **OS dark mode**: `userInterfaceStyle: 'automatic'` (ADR-0015 SP1 既定)、Splash 自体は dark/light 切替対応画像 (assets で 2 枚同梱)

### ③ Welcome 画面 (Screen 2)

11. **メインタイトル**: 「**鉢1本ずつ、<br />一生分。**」 (Noto Serif JP、48px 表示用)
12. **3 価値訴求** (アイコン + テキスト):
    - 葉アイコン + 「**19 言語、完全オフライン**」
    - 鍵アイコン + 「**個人情報は取得しません**」
    - 本アイコン + 「**次世代へ引き継げる台帳**」
13. **メイン CTA**: 「はじめる」(56dp 高、`#1F3A2E` 深緑、ADR-0015 light accent `#2E7D32` を Phase 2 実装時に採用、Design `tokens.css` `--primary` は下書き値)
14. **サブ文言**: 「アカウント登録は不要です」(Note text、`#8A8274`)
15. **スキップ動線**: なし (Welcome 自体がオンボーディング起点、スキップは次画面以降から)
16. **戻るボタン**: なし (アプリ起点画面)
17. **i18n キー**:
    - `onboarding.welcome.title` = 「鉢1本ずつ、一生分。」
    - `onboarding.welcome.value_1` = 「19 言語、完全オフライン」
    - `onboarding.welcome.value_2` = 「個人情報は取得しません」
    - `onboarding.welcome.value_3` = 「次世代へ引き継げる台帳」
    - `onboarding.welcome.cta` = 「はじめる」
    - `onboarding.welcome.note` = 「アカウント登録は不要です」
18. **constraints §5-2 禁止語チェック**: 「次世代へ引き継げる台帳」「19 言語、完全オフライン」「個人情報は取得しません」は禁止語 (診断/判定/推奨/べき/reminder/tracker/alert) 非該当、`pnpm i18n:forbidden` で確認必須 (Phase 2)。

### ④ 言語選択画面 (Screen 3)

19. **デフォルト pre-select**: `expo-localization.getLocales()[0].languageTag` を `Intl.Locale` で正規化、constraints §3-1 19 言語のいずれかにマッチすれば pre-select、外れたら **英語 (`en`)** にフォールバック。
20. **対応言語 (constraints §3-1 整合)**:
    - 19 言語 = en / ja / fr / es / de / it / pt / ru / zh-Hans / zh-Hant / ko / hi / id / th / vi / tr / nl / pl / sv
    - **ar (アラビア語) 不採用** (Design `screens.jsx` LANGS は ar 含むが、constraints が正、R-16)
    - **sv (スウェーデン語) 採用** (Design は欠落、constraints が正)
21. **表示形式 (各行)**:
    - **左**: native 名 (例: 「日本語」、本文サイズ 17pt、`color`)、選択時太字 (500)
    - **左下**: Latin 名 (例: 「Japanese」、キャプションサイズ 12pt、`muted`、italic Latin font)
    - **右**: ラジオボタン (RadioOn / RadioOff)
22. **OS 言語バッジ**:
    - OS 言語 (pre-select 候補) に「**端末の言語**」緑バッジ (`accent` カラー、白文字、11pt mono、letterSpacing 0.08em)
    - i18n キー: `onboarding.language.device_badge` = 「端末の言語」
23. **瞬時プレビュー**:
    - ラジオタップで `i18n.changeLanguage(code)` 実行、画面文言が選択言語に切替表示
    - シニア (高橋 62 歳) が誤選択 → 即時に文字が変わるので戻る判断容易
24. **継続 CTA**:
    - 「**選択して続ける**」(56dp 高、accent カラー)、選択言語で表示 (例: 日本語選択中なら「選択して続ける」、English 選択中なら "Continue with this language")
    - i18n キー: `onboarding.language.continue` = 「選択して続ける」
25. **戻るボタン**: 左上 (Welcome に戻る)
26. **スキップ動線**: なし (言語確定が必須、ただし pre-select で「選択して続ける」一発で OK のため負担最小)
27. **AsyncStorage 保存**: `language.override = <code>` (例: `language.override = "ja"`)、Settings から後で変更可能
28. **OS 言語との不整合**: ユーザー選択優先 (`language.override` あり時は OS 言語を無視)、ない時は OS 自動

### ⑤ スキップ動線 (Q5 採用、全画面「あとで」統一)

29. **位置**: 全画面右上、48dp タッチ領域、textDecorationLine: 'underline'
30. **文言**: 「**あとで**」(全画面統一、Step 5 既存「あとで」と整合、ADR-0014 §43 サブリンク文言と一致)
31. **i18n キー**: `onboarding.common.skip` = 「あとで」
32. **タップ時挙動**: 機能チュート Step 1-5 内のスキップは次の Step へ遷移、Step 5 の「あとで」のみ通知許可スキップ + オンボ完了 (ADR-0014 §43 既定)
33. **言語選択画面**: スキップなし (言語確定必須)、Welcome: スキップなし (起点画面)
34. **シニア向け配慮**: 「あとで」が画面右上、メイン CTA が画面下部 56dp で物理的距離を確保 (誤タップ防止)

### ⑥ 戻るボタン

35. **位置**: 画面左上 48dp、Splash/Welcome のみ非表示、言語選択以降は全画面表示
36. **挙動**: React Navigation Stack で画面 push、戻るで前画面へ pop
37. **Step 1-5 内**: 戻るで前 Step へ、Step 1 から戻ると言語選択画面へ
38. **再閲覧時 (Settings から起動)**: Step 1 で戻ると Settings へ pop

### ⑦ 完了判定 + AsyncStorage

39. **AsyncStorage キー**:
    - `onboarding.completed: boolean` (初期 `false`、完了で `true`)
    - `language.override: string | null` (例: `"ja"`、Settings から変更可)
40. **完了タイミング**:
    - Step 5 「通知を有効にする」 → OS 許可ダイアログ → 許可後 Step 5-B 水やり時刻設定 → 「始める」 → `onboarding.completed = true`
    - Step 5 「あとで」 → `onboarding.completed = true` + `notification.master = false` 初期化 (ADR-0014 §46)
    - Step 5 OS 拒否 → 「通知を有効にしませんでした」トースト 1 秒 → `onboarding.completed = true` + `notification.master = false`
    - 各画面「あとで」 → 次画面へ遷移、最終的に Step 5 まで到達 (or オンボ全スキップ = Step 1 「あとで」連打) → 上記いずれか
41. **未完了で再起動**: `onboarding.completed = false` なら Splash 後に Welcome から再開
42. **完了判定後**: ホームタブ表示、F-15 太陽アイコン表示、ATT/UMP は最初の AdBanner マウント時に発火 (ADR-0017)

### ⑧ ATT/UMP との統合 (ADR-0017 整合)

43. **オンボ内発火させない** (Q2 採用、ADR-0017 整合)
44. **発火タイミング**: ホーム到達後の最初の AdBanner マウント時 (Free のみ、`initializeAds()` 経由で `AdsConsent.gatherConsent()` → ATT 標準ダイアログ → UMP 同意フォーム連鎖)
45. **Pro 加入者**: AdBanner マウントしないため ATT/UMP 不発火 (ADR-0017 既定)
46. **ホームタブ初期表示前提**: Home が初期 active タブのため、Free ユーザーは初回ホーム到達で ATT/UMP に出会う (ADR-0010 整合)

### ⑨ Step 1-4 の機能チュート (ADR-0011 §89-92 既定踏襲)

47. **Step 1 盆栽登録**: サンプル盆栽の画面 (実 DB 触らない、メモリ内モック)
48. **Step 2 水やり記録**: サンプル盆栽でワンタップ記録のデモ (メモリ内モック)
49. **Step 3 タイムライン**: ADR-0008 status 列を反映したタイムライン UI のデモ (メモリ内モック)
50. **Step 4 ヒートマップ**: ADR-0013 §31 既定踏襲、サンプルヒートマップ + 凡例説明 + 「緑が濃いほど多く水やりした日です」
51. **画面構造 (各 Step 共通)**:
    - 上部: タイトル + サブタイトル
    - 中央: 機能サンプル UI (メモリ内モック、実 DB 非接続)
    - 下部: 「次へ」CTA (56dp 高、accent カラー)
    - 右上: 「あとで」リンク
    - 左上: 戻るボタン
52. **`<MockDataProvider>`**: Context で機能チュート中は実 DB 非接続、メモリ内モックデータを返す (テックリード設計)

### ⑩ Step 5 通知設定 (ADR-0014 §41-47 既定踏襲)

53. **画面構造**: ADR-0014 §42 通り (🔔 ベル + 「通知で水やりを忘れない」+ 説明 + 「通知を有効にする」緑 + 「あとで」)
54. **3 行動パターン**: ADR-0014 §43 通り
55. **Step 5-B 水やり時刻設定**: ADR-0014 §44 通り (💧 + 「水やり通知の設定」+ 1-5 回ドロップダウン + OS 標準タイムピッカー + 「始める」)
56. **再閲覧時**: ADR-0014 §45 通り (許可済 = 5-A、未許可 = 通常 Step 5)
57. **OS 拒否時**: ADR-0014 §43 通り (「通知を有効にしませんでした」トースト 1 秒)

### ⑪ 再閲覧の動線 (Q1 採用)

58. **エントリポイント**: Settings → ヘルプ → 「チュートリアルを再表示」(ADR-0011 §20 既定)
59. **再表示範囲**: **Step 1-5 のみ** (システム部 Splash/Welcome/言語選択は再表示不可)
60. **理由**:
    - Splash = OS 起動と統合、再表示の意味薄い
    - Welcome = 「はじめる」CTA はオンボ起点専用、再閲覧で押す動線が不自然
    - 言語選択 = Settings → 言語 で別途変更可能
61. **Step 5 状態保持**: ADR-0014 §45 通り (許可済 = 5-A 表示、未許可 = 通常)
62. **戻るボタン**: Step 1 で戻ると Settings へ pop

### ⑫ F-15 テーマ整合 (ADR-0015 TT2 + A1)

63. **チュートリアル中 light 固定** (ADR-0015 TT2): OS dark mode でも light テーマで表示
64. **太陽アイコン非表示** (ADR-0015 Y5): ヘッダー右上太陽アイコンはチュートリアル中非表示、Settings 遷移不可
65. **アニメ 200ms** (ADR-0015 A1): 画面遷移に Tamagui `quick` アニメ
66. **Reduced Motion**: `useReducedMotion()` で 0ms (ADR-0015 A1 既定)

### ⑬ 19 言語ローカライズ

67. **i18n キー追加**: `src/core/i18n/locales/<lang>.ts` に以下追加 (Phase 2 実装時)
    - `onboarding.welcome.*` (タイトル / 価値訴求 3 件 / CTA / Note)
    - `onboarding.language.device_badge` / `continue`
    - `onboarding.common.skip` (= 「あとで」)
    - `onboarding.tutorial.step1.*` 〜 `step5.*` (タイトル / 説明 / CTA / Step 5-B 詳細)
68. **翻訳ワークフロー**: Repolog `src/core/i18n/locales/` 翻訳ワークフロー流用
69. **CI 必須**: `pnpm i18n:check` で 0 missing、`pnpm i18n:forbidden` で 0 errors (Phase 2)

### ⑭ アクセシビリティ

70. **WCAG 2.2 AAA 準拠**: コントラスト 7:1 (light モード固定、`#1A1A1A` on `#FFFFFF` = 16:1 楽勝)
71. **accessibilityLabel**: 全 UI 要素に明示
72. **Dynamic Type / fontScale**: iOS / Android のシステム文字拡大に追従、レイアウト維持 (FlatList scroll で対応)
73. **VoiceOver / TalkBack**: 各画面の読み上げ順序を確認 (タイトル → 説明 → CTA → スキップ → 戻る)
74. **タッチ領域**: 全 CTA 56dp、スキップ / 戻る 48dp (constraints タップ最小)

### ⑮ 適用範囲

75. v1.0 から全プラン (Free / Pro 共通、初回起動時必ず Splash → Welcome → 言語選択 → Step 1-5 → ホーム)

---

## Decision Drivers（判断の軸）

- Driver 1: **シニア UX 最優先** (高橋 62 歳) — 8 画面でも各画面単機能、「あとで」文言統一、OS 言語 pre-select、瞬時プレビューで誤選択戻し容易
- Driver 2: **既存 ADR との整合** (ADR-0011 §86-106 + ADR-0014 §41-47) — Decision 部分の改訂なし、本 ADR で統合構成のみ確定
- Driver 3: **Design 流用 + ADR 整合** — Welcome 文言採用、Splash 風画像採用、ATT/UMP 独自前置き画面は不採用 (ADR-0017 整合)
- Driver 4: **完了率最大化** — 各画面スキップ可で Marcus / 盆栽園プロが 30 秒完走可、シニアは順番通り 3 分完走
- Driver 5: **再閲覧容易性** — Settings → ヘルプから Step 1-5 を再表示、ADR-0011 §20 整合
- Driver 6: **コスト 0** — Expo SplashScreen + 既存 i18n + 既存 expo-localization 流用、新規ライブラリなし
- Driver 7: **constraints §3-1 整合** — 19 言語 (ar 不採用 / sv 採用)、Design `screens.jsx` の言語不整合を ADR で正

---

## Alternatives considered（他の案と却下理由）

### Option B1: フル 8 画面 + スキップ可 (= B4 と同等、表記違い)

- 概要: B4 と同等、議論用途。
- 採用理由: B4 と統合採用。

### Option B2: 言語省略 7 画面 (Splash/Welcome/Step1-5、言語は OS 自動 + Settings)

- 概要: 言語選択画面なし、OS 自動検出のみ + Settings から変更
- 良い点: 画面 -1、シンプル
- 悪い点: Phase 1 質問 3 で「言語選択画面あり」承認済、却下、シニア (高橋 62 歳) の安心感低下
- 却下理由: Phase 1 承認との不整合

### Option B3: 機能チュート 3 ステップ削減 (Step1/Step2/Step5 のみ)

- 概要: Step 3 タイムライン + Step 4 ヒートマップを省略、合計 6 画面
- 良い点: Marcus 35 歳 ◎、画面削減
- 悪い点: ライト評価 △ (機能発見性低下)、ADR-0011 §89-92 と矛盾、ADR-0013 §31 (ヒートマップサンプル) 不採用
- 却下理由: ライト評価 △、既存 ADR 整合性

### Option I: ATT/UMP オンボ統合 (Step 5 後 / ホーム到達前に発火)

- 概要: 機能チュート完了後に ATT/UMP ダイアログを発火、機能体験前に同意完了
- 良い点: 機能体験前に法令同意完了、念入り
- 悪い点: シニア画面増、ADR-0017 と整合せず
- 却下理由: ADR-0017 で「オンボ非統合、ホーム到達後 AdBanner マウント時発火」確定済

### Option II: ADR-0011/0014 Decision 部分書換

- 概要: Step 1-4 の前にシステム 3 画面を ADR-0011 §86-106 に追記
- 良い点: 既存 ADR で完結
- 悪い点: 既存 Decision 改訂で履歴混乱、本 ADR-0018 で統合した方が整理
- 却下理由: Q6 で「Notes 追記のみ」承認

### Option III: Splash を独自 React コンポーネントで描画

- 概要: Design `SplashScreen` を React Native コンポーネントで実装、独自フェードアウト
- 良い点: アニメ自由度
- 悪い点: Expo SplashScreen と二重描画、ロード時間長期化、コスト増
- 却下理由: Expo SplashScreen で十分、ADR-0015 SP1 整合

### Option IV: スキップ文言「スキップ」(Step 5 のみ「あとで」)

- 概要: Step 1-4 「スキップ」、Step 5 「あとで」(ADR-0014 §43 既定)
- 良い点: 動詞統一感 (Marcus 向け)
- 悪い点: シニア (高橋 62 歳) に「スキップ」が伝わりにくい、文言混在
- 却下理由: Q5 で「全画面『あとで』統一」承認

---

## Consequences（結果）

### Positive（嬉しい）

- アプリ初回起動の体験が ADR で完全定義、開発者迷子なし
- ADR-0011/0014 既定踏襲で既存議論を最大活用
- ATT/UMP オンボ非統合で画面増回避、シニア負担最小
- Welcome 文言で product_strategy.md 整合 + 4 ペルソナ全員 ◎
- 言語選択で誤タップ戻し容易 (瞬時プレビュー)、シニア + ライト ◎
- 「あとで」文言統一でシニア理解容易
- Settings → ヘルプ から Step 1-5 再閲覧可、機能発見性維持
- F-15 テーマ整合 (light 固定 + 太陽アイコン非表示)、テーマ動作の一貫性
- AsyncStorage `onboarding.completed` 永続化で再起動耐性
- バンドル増ゼロ (既存 SDK 流用)
- 全要素 4 ペルソナ ○ 以上、✕ ゼロ (R-10)

### Negative（辛い/副作用）

- **8 画面の完走率**: シニア完走率 70-80% 想定 (業界平均)、ストアレビューモニタリング必須
- **Step 1-4 のサンプルデータ管理**: メモリ内モック設計が必要、実装コスト増 (Phase 2 で 1-2 日追加見込)
- **言語選択の瞬時プレビュー**: i18next の `changeLanguage()` が画面全体に伝播、再描画コスト発生 (実機 PoC で 60 FPS 維持確認)
- **再閲覧時の Splash/Welcome/言語省略**: ユーザーが「最初から見たい」場合に対応できない (要望が多ければ v1.x で再閲覧フル化検討)
- **ホーム到達前の ATT/UMP 不発火**: Free ユーザーがホーム以外の画面でアプリを終了した場合、ATT/UMP 未発火のまま再起動 → ホーム到達で発火、ストア審査リスクなし

### Follow-ups（後でやる宿題）

- [ ] **Issue #26 改訂** (オンボーディング 4 ステップ → 8 画面構成) — ADR-0018 整合更新
- [ ] **ADR-0011 Notes 追記**: 「ADR-0018 でオンボ統合構成 = システム 3 + 機能 5 = 8 画面 確定」
- [ ] **ADR-0014 Notes 追記**: 「ADR-0018 で Step 5 を機能チュート 5 ステップ最後に位置付け確定」
- [ ] **ADR-0017 ↔ ADR-0018 相互参照**: ATT/UMP オンボ非統合の整合確認
- [ ] `docs/reference/functional_spec.md` にオンボーディング新規セクション追加 (8 画面構成 + 各画面詳細、Phase 2 着手前)
- [ ] `docs/reference/glossary.md` 用語追加: Onboarding / Splash Screen / Welcome / 言語選択 / pre-select / native 名 / Latin 名 / 端末の言語バッジ / 瞬時プレビュー / `<MockDataProvider>` / `onboarding.completed` / `language.override`
- [ ] `src/core/i18n/locales/<lang>.ts` (19 言語) に `onboarding.*` キー追加 (Phase 2 着手時)
- [ ] `src/screens/onboarding/SplashScreen.tsx` 新規実装 (Expo SplashScreen 連携、Phase 2)
- [ ] `src/screens/onboarding/WelcomeScreen.tsx` 新規実装 (Phase 2)
- [ ] `src/screens/onboarding/LanguagePickerScreen.tsx` 新規実装 (FlatList + 瞬時プレビュー、Phase 2)
- [ ] `src/screens/onboarding/TutorialStep1Screen.tsx` 〜 `Step5Screen.tsx` 新規実装 (Phase 2)
- [ ] `src/screens/onboarding/MockDataProvider.tsx` 新規実装 (Context で機能チュート中の実 DB 非接続、Phase 2)
- [ ] `src/core/onboarding/persistOnboarding.ts` 新規実装 (`onboarding.completed` AsyncStorage 永続化、Phase 2)
- [ ] テスト: `__tests__/onboarding/persistOnboarding.test.ts` (AsyncStorage 永続化 + 復元)
- [ ] テスト: `__tests__/onboarding/languagePreSelect.test.ts` (OS 言語 → 19 言語マッチング + 英語フォールバック)
- [ ] テスト: `__tests__/i18n/onboardingForbiddenWords.test.ts` (Welcome 3 価値訴求 + Step 1-5 文言の禁止語チェック)
- [ ] Maestro: `maestro/flows/onboarding_full.yaml` (Splash → Welcome → 言語選択 → Step 1-5 → ホーム到達)
- [ ] Maestro: `maestro/flows/onboarding_skip_all.yaml` (各画面「あとで」連打で最速完走)
- [ ] Maestro: `maestro/flows/onboarding_re_view.yaml` (Settings → ヘルプ → 「チュートリアルを再表示」 → Step 1-5)
- [ ] Maestro: `maestro/flows/language_picker_preview.yaml` (言語選択で瞬時プレビュー動作確認)
- [ ] Phase 0 PoC: 実機 Pixel 7 + iPhone 13 で 8 画面遷移 60 FPS 維持、Hermes Intl 19 言語月名動作 (`Intl.DateTimeFormat`)、Color Filters Grayscale モード視覚確認
- [ ] Phase 0 PoC: 高橋 62 歳ペルソナ模擬テスト (60 代女性または男性に実機操作してもらい、完走率 + フィードバック)
- [ ] `docs/reference/tasks/lessons/runtime.md` 追記候補:
  - 「オンボーディング多画面構成は『各画面スキップ可 + シニア向け文言統一』でシニア + Marcus 両立、画面数より動線設計が重要」
  - 「言語選択の瞬時プレビューは i18next `changeLanguage()` で画面全体再描画、誤選択戻し容易、シニア UX ◎」
  - 「ATT/UMP はオンボ非統合 + ホーム到達後 AdBanner マウント時発火で画面増回避、ストア審査リスクなし」

---

## Acceptance / Tests（合否：テストに寄せる）

### 自動テスト (Phase 2 着手時に実装)

- **Jest 単体テスト**:
  - `__tests__/onboarding/persistOnboarding.test.ts`: `onboarding.completed` AsyncStorage 永続化 + 復元 + 各完了パターン (Step 5 通知 ON / 「あとで」/ OS 拒否)
  - `__tests__/onboarding/languagePreSelect.test.ts`: OS 言語タグ → 19 言語マッチング (例: `ja-JP` → `ja`、`zh-Hans-CN` → `zh-Hans`)、外れたら `en` フォールバック
  - `__tests__/i18n/onboardingForbiddenWords.test.ts`: Welcome 3 価値訴求 + Step 1-5 文言の禁止語チェック (CI `pnpm i18n:forbidden`)
  - `__tests__/onboarding/skipFlow.test.ts`: 各画面「あとで」タップで次画面へ遷移、Step 5 「あとで」で完了 + `notification.master = false`
- **Maestro E2E**:
  - `maestro/flows/onboarding_full.yaml`: 初回起動 → Splash → Welcome 「はじめる」 → 言語選択 (日本語 pre-select) 「選択して続ける」 → Step 1-5 順次「次へ」 → Step 5 「通知を有効にする」 → OS 許可 → Step 5-B 「始める」 → ホーム到達
  - `maestro/flows/onboarding_skip_all.yaml`: Welcome 「はじめる」 → 言語選択 「選択して続ける」 → Step 1-5 「あとで」連打 → Step 5 「あとで」 → ホーム到達 + `notification.master = false` 確認
  - `maestro/flows/onboarding_re_view.yaml`: ホーム → Settings → ヘルプ → 「チュートリアルを再表示」 → Step 1 から開始 → Step 5 で再閲覧モード (許可済なら 5-A) → 完了 → Settings へ戻る
  - `maestro/flows/language_picker_preview.yaml`: 言語選択 → 「English」タップ → 画面文言が英語に切替 → 「日本語」タップ → 文言が日本語に戻る → 「選択して続ける」

### 手動チェック (Phase 0 PoC 必須)

- 実機 Pixel 7 + iPhone 13:
  - 初回起動 → Splash → Welcome → 言語選択 → Step 1-5 → ホーム の 8 画面遷移が 60 FPS 維持
  - Hermes Intl 19 言語月名 / 曜日名動作確認 (`expo-localization.getCalendars()`)
  - 言語選択で瞬時プレビュー動作 (英語 → 日本語切替で画面文言全変化)
  - 各画面「あとで」タップで次画面遷移
  - Step 5 OS 通知ダイアログで「許可」/「拒否」両パターン
  - Pro 加入者の挙動 (オンボ完了後の Home に AdBanner なし)
  - 高橋 62 歳ペルソナ模擬テスト (60 代に実機操作、完走時間 + フィードバック収集)
- iOS:
  - VoiceOver で各画面読み上げ順序確認 (タイトル → 説明 → CTA → スキップ → 戻る)
  - Dynamic Type 最大設定で各画面レイアウト維持 (FlatList scroll で対応)
  - Color Filters Grayscale モードで視覚確認
- Android:
  - TalkBack で各画面読み上げ
  - fontScale 最大設定でレイアウト維持
  - 戻るキー (物理 / ジェスチャ) で React Navigation 戻る動作

### ADR-0018 受け入れ条件

- [ ] 全 8 画面が React Navigation Stack で実装、画面遷移 60 FPS
- [ ] Splash = Expo SplashScreen 連携 (独自描画なし)
- [ ] Welcome = Design 文言採用 (「鉢1本ずつ、一生分」+ 3 価値訴求)、CI 禁止語 0
- [ ] 言語選択 = constraints §3-1 19 言語 (ar 不採用 / sv 採用)、native + Latin 併記、OS 言語バッジ表示
- [ ] 言語選択 = 瞬時プレビュー動作 (タップで `i18n.changeLanguage()` 実行)
- [ ] OS 言語が 19 言語外なら `en` フォールバック
- [ ] Step 1-5 = ADR-0011 §89-92 + ADR-0014 §41-47 既定踏襲
- [ ] Step 4 = ADR-0013 §31 ヒートマップサンプル表示
- [ ] Step 5 = ADR-0014 §41-47 既定踏襲 (3 行動パターン + Step 5-B + スキップ時 OFF 初期化)
- [ ] スキップ文言全画面「あとで」統一
- [ ] 戻るボタン Splash/Welcome 非表示、言語選択以降表示
- [ ] AsyncStorage `onboarding.completed: boolean` + `language.override: string | null` 永続化
- [ ] 完了タイミング 4 パターン (Step 5 通知 ON / 「あとで」/ OS 拒否 / 全スキップ) 動作
- [ ] Settings → ヘルプ → 「チュートリアルを再表示」で Step 1-5 のみ表示
- [ ] Step 5 再閲覧時 = ADR-0014 §45 既定 (許可済 5-A / 未許可 通常)
- [ ] F-15 light 固定 + 太陽アイコン非表示 (ADR-0015 TT2 + Y5)
- [ ] アニメ 200ms (ADR-0015 A1)、Reduced Motion で 0ms
- [ ] ATT/UMP オンボ非統合、ホーム到達後 AdBanner マウント時発火 (ADR-0017 整合)
- [ ] 19 言語ローカライズ完了 (`pnpm i18n:check` 0 missing)
- [ ] 禁止語ゼロ (`pnpm i18n:forbidden` 0 errors)
- [ ] WCAG 2.2 AAA 準拠 (light 16:1 楽勝、accessibilityLabel 全要素)
- [ ] Dynamic Type / fontScale 最大対応
- [ ] Maestro 4 flow (full / skip_all / re_view / language_preview) 全 pass

---

## Rollout / Rollback（出し方/戻し方）

- リリース手順への影響:
  - foundation (#14 / #15 / #17) 完了 → F-13 / F-14 / F-15 着手 → F-04 → ADR-0018 オンボーディング実装 (#26) → リリース
  - リリースノートに「初回起動時に使い方をご案内します」「言語をお選びいただけます」を 19 言語で追記
- ロールバック方針:
  - オンボーディング全体を v1.0.x ホットフィックスで無効化する場合: 初回起動で `onboarding.completed = true` 強制設定 (DB 影響なし、Settings → ヘルプ → 「再表示」で個別確認可)
  - Step 1-5 個別ロールバック: UI 側で該当 Step ハードコード非表示
- 検知方法:
  - Sentry: `OnboardingError` (将来配線後) 監視
  - ストアレビュー: 「最初の画面が分かりにくい」「言語選択がない」「機能チュートが長い」キーワード監視
  - DAU: オンボーディング完走率 (Splash → Step 5 完了)、各 Step 離脱率
  - 高橋 62 歳ペルソナ模擬テスト結果のレビュー

---

## Links（関連リンク）

- constraints: `docs/reference/constraints.md` (§1-4 記録のみ / §3-1 19 言語 / §5-2 禁止語 / §6 UI Figma)
- reference: `docs/reference/personas.md` (4 ペルソナ評価)
- glossary: `docs/reference/glossary.md` (Onboarding 関連用語多数 — 追加予定) ※廃止 — Sess101 #1169 で glossary.md 削除 (用語の正 = basic_spec §2 + constraints + コード、翻訳禁止リストは ADR-0033 D3)
- 行動 lesson: `.claude/recurrence-prevention.md` (R-1〜R-20)
- 連動 ADR:
  - `docs/adr/ADR-0011-remove-recommendations-keep-record-only.md` (§86-106 機能チュート 5 ステップ既定、本 ADR で統合)
  - `docs/adr/ADR-0013-f04-watering-visualization.md` (§31 Step 4 ヒートマップサンプル)
  - `docs/adr/ADR-0014-f16-local-notification.md` (§41-47 Step 5 通知設定 + Step 5-B、本 ADR で統合)
  - `docs/adr/ADR-0015-f15-theme-system.md` (TT2 light 固定 + Y5 太陽アイコン非表示 + A1 200ms アニメ)
  - `docs/adr/ADR-0017-store-compliance-att-ump-privacy.md` (§⑨ ATT/UMP オンボ非統合)
- Design 参考 (下書き、ADR が正、R-16):
  - `/mnt/c/Users/doooo/Downloads/BonsaiLog_template-handoff/bonsailog-template/project/screens.jsx` (Splash/Welcome/言語選択/通知 4 画面 = 採用、ATT/UMP 独自前置き画面 = 不採用)
  - `/mnt/c/Users/doooo/Downloads/BonsaiLog_template-handoff/bonsailog-template/project/Onboarding Wireframes.html` (参考)
  - `/mnt/c/Users/doooo/Downloads/BonsaiLog_template-handoff/bonsailog-template/project/tokens.css` (Welcome カラーパレット参考、ただし屋外モード `#000080` / dark `#0A0E1A` は ADR-0015 で撤回済)
- 影響先 Issue: [#26](https://github.com/doooooraku/BonsaiLog/issues/26) (オンボーディング、本 ADR で改訂)
- PR: #<TBD>
- External docs:
  - [Expo SplashScreen 公式](https://docs.expo.dev/versions/latest/sdk/splash-screen/)
  - [Expo Localization 公式](https://docs.expo.dev/versions/latest/sdk/localization/)
  - [React Navigation Stack 公式](https://reactnavigation.org/docs/native-stack-navigator/)
  - [Apple HIG Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding)
  - [Material Design 3 Onboarding](https://m3.material.io/foundations/content-design/style-guide/onboarding)
  - [NN/g Onboarding for Older Adults](https://www.nngroup.com/articles/onboarding-older-adults/)
  - [WCAG 2.2 1.4.6 Contrast Enhanced AAA](https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced.html)
  - [WCAG 2.2 2.5.5 Target Size Enhanced](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html)
  - [BCP 47 / IANA Language Subtag Registry](https://www.iana.org/assignments/language-subtag-registry)

---

## Notes（メモ）

### 議論経緯 (1 ラウンド + 6 質問承認)

- ラウンド 1 (Session 3): 17 論点 (O1-O17) を 6 人チーム + 4 ペルソナで議論、画面構成 B4 採用、6 質問全て推薦案で承認受領

### 4 ペルソナ評価マトリクス (B4 採用構成)

| 要素                                        | 高橋 62 歳                | Marcus 35 歳   | 盆栽園プロ     | ライト       | 総合 |
| ------------------------------------------- | ------------------------- | -------------- | -------------- | ------------ | ---- |
| 8 画面構成 (システム 3 + 機能 5)            | ○ 順序通り完走            | ○ スキップ多用 | ○ スキップ必須 | ◎ 全画面体験 | ○    |
| Splash = Expo SplashScreen                  | ◎ 安心                    | ◎              | ◎              | ◎            | ◎    |
| Welcome (Design 文言)                       | ◎ 「鉢1本ずつ一生分」響く | ○ 価値伝達     | ○              | ◎            | ◎    |
| 言語選択 (Welcome 後、OS 自動 pre-select)   | ◎ 安心                    | ◎ シンプル     | ○              | ◎ ガイド     | ◎    |
| native + Latin 併記 + OS 言語バッジ         | ◎ 安心                    | ◎ シンプル     | ◎              | ◎            | ◎    |
| 瞬時プレビュー (誤選択戻し)                 | ◎ 安心                    | ◎              | ◎              | ◎            | ◎    |
| ATT/UMP オンボ非統合 (ホーム到達後発火)     | ◎ 画面少                  | ◎ シンプル     | ◎              | ◎            | ◎    |
| 各画面スキップ可 (「あとで」統一)           | ○ 順序通り想定            | ◎ 必須         | ◎ 必須         | ○            | ◎    |
| Step 5 通知 (ADR-0014 既定)                 | ◎ シンプル                | ◎              | ○              | ◎            | ◎    |
| AsyncStorage `onboarding.completed`         | (内部実装)                | (内部実装)     | (内部実装)     | (内部実装)   | ◎    |
| Settings → ヘルプから再閲覧 (Step 1-5 のみ) | ◎ 安心                    | ○ 不要         | ○ 不要         | ◎ ガイド     | ◎    |
| F-15 light 固定 (ADR-0015 TT2)              | ◎ 一貫性                  | ○              | ○              | ◎            | ◎    |
| 200ms アニメ (ADR-0015 A1)                  | ◎ 自然                    | ◎              | ◎              | ◎            | ◎    |
| 19 言語ローカライズ                         | ◎                         | ○              | ○              | ◎            | ◎    |

→ **全要素で全ペルソナ ○ 以上、✕ ゼロ** (R-10 クリア)

### v1.x 拡張候補 (本 ADR 対象外)

- 再閲覧時に Splash/Welcome/言語選択も含むフルオンボーディング (ユーザー要望次第で v1.x 検討)
- Step 5-B 個別盆栽の水やり時刻設定 (現状は全盆栽共通、ADR-0014 v1.x 候補)
- オンボーディング A/B テスト (Welcome 文言、画面数、スキップ可否)
- 機能チュートのアニメ強化 (Lottie 採用、現状は静止 UI のみ)
- 高橋 62 歳ペルソナ向け「ゆっくりモード」(各画面のテキスト読み上げ自動)
- 言語選択の検索ボックス (19 言語 → 50+ 言語拡張時に必要)
- Pro 訴求オンボーディング画面 (現状は機能チュートのみ、ホーム到達後 Settings で Pro 紹介)

### Repolog との差分

- Repolog (前作) はオンボーディング機能なし (アプリ起動 → すぐホーム)
- BonsaiLog 新規設計、Repolog 由来の i18n テンプレ (`src/core/i18n/locales/`) は流用
- Repolog ADR-0008 UMP 流用 (ADR-0017 経由) のみ、オンボーディング画面実装は完全新規

### Design (`screens.jsx` / `tokens.css`) との差分整理 (R-16)

| 要素                     | Design (下書き)                                                          | ADR (正)                                         | 採用                                             |
| ------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------ |
| Splash 画面              | 独自描画 (BonsaiLog ロゴ + 盆栽手帳 + loading...)                        | Expo SplashScreen                                | **ADR** (画像のみ Design 風)                     |
| Welcome 画面             | 「鉢1本ずつ、一生分」+ 3 価値訴求 + 「はじめる」+ 「アカウント登録不要」 | 同等採用                                         | **Design 文言採用**                              |
| 言語選択画面             | LANGS 19 言語 (ar 含む / sv なし)                                        | constraints §3-1 19 言語 (en/ja/.../sv、ar なし) | **ADR (constraints)**                            |
| ATT 画面                 | 独自前置き画面 (Shield + 4 段説明)                                       | OS 標準ダイアログのみ (ADR-0017)                 | **ADR (Design 不採用)**                          |
| UMP 画面                 | 独自フォーム (6 パートナー一覧)                                          | AdMob `gatherConsent()` 自動 (ADR-0017)          | **ADR (Design 不採用)**                          |
| 通知許可画面             | ベル + 「通知で水やりを忘れない」+ 「通知を有効にする」+ 「あとで」      | ADR-0014 §42 同等                                | **両者整合、Design 採用**                        |
| カラーパレット (light)   | washi 和紙 `#F7F3E8` + 深緑 `#1F3A2E`                                    | `#FFFFFF` + Material green `#2E7D32` (ADR-0015)  | **ADR-0015** (Phase 2 で tamagui.config.ts 反映) |
| カラーパレット (dark)    | `#0A0E1A` (撤回済)                                                       | Material 3 baseline `#121212` (ADR-0015)         | **ADR-0015**                                     |
| カラーパレット (outdoor) | `#000080` 青 (撤回済)                                                    | 緑単色 `#1B5E20` (ADR-0015)                      | **ADR-0015**                                     |
| フォント                 | Noto Serif JP (display) + Noto Sans JP (body) + IBM Plex Mono            | 未確定                                           | **Design 採用候補** (Phase 2 で確定)             |

### lessons.md 追記候補

- 「オンボーディング多画面構成は『各画面スキップ可 + シニア向け文言統一』でシニア + Marcus 両立、画面数より動線設計が重要」
- 「言語選択の瞬時プレビューは i18next `changeLanguage()` で画面全体再描画、誤選択戻し容易、シニア UX ◎」
- 「ATT/UMP はオンボ非統合 + ホーム到達後 AdBanner マウント時発火で画面増回避、ストア審査リスクなし」
- 「Design (モックアップ) の言語構成と constraints §3-1 が矛盾する場合は ADR (constraints) が正、R-16 適用」
- 「Welcome 画面の文言は product_strategy.md と一字一句整合確認、constraints §5-2 禁止語チェック必須」
- 「機能チュート中の実 DB 接続を `<MockDataProvider>` Context で分離、テスト容易性 ◎」

---

### Notes Amended (2026-06-12): 文脈内ガイド (ADR-0058) との関係 + Phase H 再表示動線の置換予定

ADR-0020 v1.x-2 で機能チュート (tut1/tut2) を撤去した際、「機能発見性は Settings ヘルプで代替」とした受け皿が実体未補填だった (再表示の中身が tut5 = 通知画面 1 枚のみ)。この穴を **文脈内ガイド (ADR-0058、Issue #1178)** が埋める — 本 ADR のオンボ 4 画面構成 (Splash + Welcome + Language + tut5) は不変。

- Phase H「チュートリアルを再表示」(settingsTutorialReplay 系) は **#1179 で「使い方」ページに置換済 (PR #1189、2026-06-11)** — 説明文「5 つの機能チュートリアル」が実体と乖離 (×19 言語) のため、文言修正でなく行ごと置換が決定 (Sess102 /discuss)
- ガイドの設計原則 / 発火条件は ADR-0058 が正

**関連**: ADR-0058 / Issue #1177 (空状態道しるべ化、merged) / #1178 / #1179
