---


# ADR-0016: F-10 エクスポート（CSV / PDF、Pro 限定、Repolog 流用 + 3 段階フォールバック + 7 画面構成）

- Status: Accepted
- Date: 2026-05-01
- Deciders: @doooooraku
- Related:
  - 上書き対象: `functional_spec.md` §15（F-10 詳細仕様）— Repolog 流用 + 7 画面構成 + 3 段階フォールバック + ファイル名規則 + Android SAF
  - 上書き対象: `basic_spec.md` F-10 セクション — Pro 限定維持、Design 参考事項追加
  - 連動: ADR-0009（F-13 Pro メリット、CSV/PDF Pro 限定維持）/ ADR-0011（記録のみ哲学）/ ADR-0007（F-11 ZIP に AsyncStorage / SQLite / 写真含む、F-10 と機能分離）/ ADR-0008（events 25 万行 + Drizzle ORM）/ ADR-0015（F-15 テーマトークン、PDF レイアウトに参照）/ ADR-0014（F-16、エクスポート完了通知は不採用 = Y3）
  - 既存資産:
    - `expo-print ^55.0.13` / `expo-sharing ^55.0.18` / `expo-file-system ^55.0.17` (package.json に既存、新規追加なし)
    - **Repolog 既存実装**: `/home/doooo/04_app-factory/apps/Repolog/src/features/pdf/` (pdfService.ts 260 行 / pdfTemplate.ts 510 行 / pdfFonts.ts 115 行 / pdfFontSelection.ts 130 行 / pdfUtils.ts 130 行) を流用
    - Repolog ADR: `docs/adr/ADR-0013-pdf-export-resilience-and-progress.md`、`docs/adr/ADR-0015-pdf-font-strategy-shift.md`
  - Design 参考: `/mnt/c/Users/doooo/Downloads/BonsaiLog_template-handoff/bonsailog-template/project/Export Wireframes.html` + `export-screens.jsx` (UI 設計のヒント、ビジネス仕様は本 ADR + ADR-0009 / ADR-0011 が正)
  - Issue: #<TBD>

---

## Context（背景：いま何に困っている？）

- 現状：
  - functional_spec §15 で「CSV / PDF エクスポート、Pro 限定」が確定済 (ADR-0009 / ADR-0011)。
  - basic_spec L727 (Free/Pro 表): 「CSV / PDF エクスポート Free=不可、Pro=可」(Pro 4 メリットの 1 つ)
  - 既存 §15 はサンプルコードレベルで簡易、Repolog 実装の堅牢性 (3 段階フォールバック / タイムアウト / ストレージチェック) が未反映。
  - iOS WKWebView の写真 base64 必須制約、page-break iOS 互換 `-webkit-page-break-*` 必須、CJK フォント明示指定必須、HTML `<!DOCTYPE html>` 必須が既存仕様で未明記。
  - Claude Design (モックアップ) が「全機能 Free」方針を提案したが、ユーザー判断で**ADR-0009 / ADR-0011 既存維持 (Pro 限定)** を確定。Design はあくまで下書き、ビジネス仕様は議論済 ADR が正。
- 困りごと：
  1. **iOS WKWebView 写真表示問題**: `<img src="file://Paths.document/photos/..." />` のローカルパス読み込み不可、写真が空白になる。
  2. **iOS page-break 効かない問題**: `page-break-after: always` のみだと iOS で全部 1 ページに詰込、Android なら正常。
  3. **日本語フォント崩れ問題**: WKWebView デフォルトが Times New Roman → CJK 自動フォールバック動作するが不安定、Apple 公式「default は将来変わる可能性あり」明記。
  4. **余分な空ページ問題**: HTML が `<!DOCTYPE html>` で始まらないと Android が末尾に空ページ追加。
  5. **Android base64 フォント埋込で blank PDF**: Repolog Issue #292 で発見、Android Chromium 印刷エンジンが 15-40MB の `@font-face data:font/ttf;base64` を処理できず 681 byte の blank PDF を silent failure で返す。
  6. **iOS printToFileAsync hang**: Repolog Issue #298、写真 10 枚で attempt 1 が 40 秒 hang する既知バグ、3 段階フォールバックで対応必要。
  7. **OOM / blank PDF / hang の自動回復**: 単一 attempt のみだと 100 本 PDF で 1 件失敗するとユーザー困惑。
  8. **ストレージ不足**: 100MB 未満で PDF 生成失敗、事前チェックなしだと失敗時にユーザー混乱。
  9. **ファイル名規則**: 既存 §15 で未明記、Repolog の Forbidden chars 置換 + タイムスタンプ規則を流用すべき。
  10. **Android SAF**: 既存 §15 は Share Sheet のみ、Android で「ファイルに保存」する場合 SAF (StorageAccessFramework) で保存場所選択が UX◎。
  11. **Pro ガート実装方法**: 既存 §15 で未明記、Repolog の `isPro: boolean` 引数渡し方式を流用すべき。
  12. **画面構成不足**: 既存 §15 は単一画面のみ、Design 参考で 7 画面構成 (Hub / Options / Progress / Share / Preview ×3) が UX◎。
- 制約/前提：
  - `docs/reference/constraints.md` §1-1（Local-first、外部 API 不可）
  - `docs/reference/constraints.md` §1-2（写真パス相対管理、絶対パス DB 禁止）
  - `docs/reference/constraints.md` §1-3（PII 取得しない、CSV/PDF にも含めない）
  - `docs/reference/constraints.md` §1-4（記録のみ哲学）
  - `docs/reference/constraints.md` §2-2（Free / Pro 不変差分、CSV/PDF は Pro 限定）
  - `docs/reference/constraints.md` §3-1（19 言語 LTR、CJK 対応）
  - `docs/reference/constraints.md` §5-2（UI 禁止語）
  - `docs/reference/personas.md`（4 ペルソナ：高橋 62 歳 / Marcus 35 歳 Excel 派 / 盆栽園プロ顧客報告 / ライト）
  - `.claude/recurrence-prevention.md` R-1〜R-12
  - ADR-0008 (events STI + Drizzle + ULID + status + datetime ラッパー)
  - ADR-0009 (F-13 課金、Pro メリット 4: 写真∞ / **CSV/PDF** / QR / 広告無)
  - ADR-0011 (記録のみ哲学)
  - ADR-0015 (F-15 テーマトークン、PDF レイアウトに参照可)
  - 既存依存: `expo-print ^55.0.13` / `expo-sharing ^55.0.18` / `expo-file-system ^55.0.17`
  - Repolog 既存実装 (pdfService.ts / pdfTemplate.ts / pdfFonts.ts / pdfUtils.ts) 流用可

---

## Decision（決めたこと：結論）

F-10 を以下の構成で実装する。

### Pro 方針 (Q16: PR2 既存維持)

1. **Pro 限定維持**: Free でタップ → Paywall 遷移 (ADR-0009 / ADR-0011 / basic_spec L727 確定済)。
2. **Design「全機能 Free」記述は採用しない** (Design はあくまで下書き、ビジネス仕様は ADR-0009 / ADR-0011 が正)。
3. **Pro ガート実装方式 (Q5)**: Repolog 流用 = `isPro: boolean` 引数渡し + UI 側で事前チェック → 未加入なら `RevenueCatUI.presentPaywallIfNeeded({ requiredEntitlementIdentifier: 'pro' })`。

### エクスポート種類 (5 種類、functional_spec §15.3.1 + Design 詳細追加)

4. **CSV × 3 種**:
   - `bonsai_csv` 盆栽一覧: 9 列 (id / name / species_scientific / species_common / acquired_on / style / archived_at / created_at / updated_at)、~3KB
   - `events_csv` 作業履歴: 11 列 (盆栽ID / 名前 / 作業 / 日時 / 部位 / 量 / メモ / created_at / updated_at / status / occurred_at_utc)、**写真件数列なし** (Q17: PC2 採用)、~12KB
   - `species_csv` 樹種別サマリ: 8 列 (樹種学名 / 通称 / 保有数 / 最終水やり / 最終剪定 / 最終植替え / 最終施肥 / 最古取得日)、~1KB
5. **PDF × 2 種**:
   - `bonsai_pdf` 個別盆栽レポート: A4 縦、1 ページ/盆栽、カバー写真 / 基本情報 / 作業履歴サマリ / メモ
   - `list_pdf` 全盆栽リスト: A4 縦、表紙 + サムネイル付きリスト + 統計、複数ページ
6. **CSV に写真関連列を一切含めない (Q8 修正: PH4)**: 写真は F-11 ZIP バックアップで完全分離。CSV は純粋なデータ表のみ。

### CSV 仕様 (RFC 4180 準拠)

7. **UTF-8 BOM 付き** (`﻿` プレフィクス、Excel 日本語版文字化け対策)
8. **改行コード CRLF (`\r\n`)** (Q18 LB1: RFC 4180 準拠)
9. **Quote escape**: `,` / `"` / `\r` / `\n` を含むフィールドは `"..."` で囲む、内部 `"` は `""` 2 連
10. **ヘッダ行**: エクスポート時の言語で出力 (Q19 H1: ロケール対応、19 言語 i18n キー経由)
11. **数値フォーマット (Q20 NF1)**: 機械可読 (小数点 `.`、桁区切りなし)、例 `1234.56`。Excel 側で書式設定可。
12. **日時フォーマット**: ISO 8601 UTC (例 `2026-04-30T07:00:00Z`)、エクスポート時の言語に依存しない
13. **列順 / 列名は ADR-0008 events スキーマ準拠**

### PDF 仕様 (Repolog 流用 + iOS WKWebView 互換)

14. **expo-print `printToFileAsync({ html, width, height })` 使用** (新規ライブラリ追加なし)
15. **A4 縦固定 (Q9 PG1)**: width 595px (210mm × 72/25.4)、height 842px (297mm × 72/25.4)
16. **HTML `<!DOCTYPE html>` 必須 (Q4)**: Issue #7435 の余分な空ページ問題回避
17. **写真 base64 data URI inline (Q1 W1)**: iOS WKWebView の `file://` パス読み込み不可制約 (Issue #1308)
    - `expo-image-manipulator` で 800×800 px / JPEG quality 75 にリサイズ
    - 100 枚 PDF で 5-8MB に収まる (容量制約)
    - F-11 と同じ思想 (ADR-0007 §7)
18. **page-break: WebKit プレフィクス併記 (Q2)**:
    ```css
    .bonsai-page {
      page-break-after: always;
      -webkit-page-break-after: always;
    }
    .bonsai-page:last-child {
      page-break-after: auto;
    }
    ```
19. **CJK フォント明示指定 (Q3 修正)**:
    - フォント埋め込みなし (Repolog Issue #292 教訓: Android で 15-40MB base64 フォントが blank PDF を引き起こす)
    - `font-family: -apple-system, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans CJK JP", "Noto Sans JP", "PingFang SC", "Apple SD Gothic Neo", system-ui, sans-serif;` を CSS で指定 → OS 標準フォントに委譲
20. **絵文字対応 (Q21 EM1)**: system フォント任せ (iOS Apple Color Emoji / Android Noto Color Emoji 自動利用)
21. **CSS `@page`** (Repolog 流用): `@page { size: A4 portrait; margin: 15mm 12mm 18mm 12mm; }`
22. **ページ番号 (Q10 PN1)**: flow フッター方式 (各 `.bonsai-page` 末尾に `<div class="page-footer">{{i}} / {{total}}</div>`、`position: fixed` 不使用、iOS WebKit 制約回避)

### 3 段階フォールバック (Q11 FB1: Repolog 流用)

23. **attempts 配列**:
    - attempt 1: full quality (system fonts、画像 1200/1600px @ 0.80)
    - attempt 2: reduced images (system fonts、画像縮小)
    - attempt 3: tiny images (system fonts、最小画像)
24. **OOM / BlankPdfError / PdfHangError 検出時に自動次 attempt へ** (recoverable error)
25. **3 attempt 全て失敗で最終エラー throw** (lastError)
26. **fallback cooldown 300ms** (native heap 解放待ち)

### タイムアウト戦略 (Q12 TO1: Repolog 流用)

27. **動的計算**: `30 秒 + 写真数 × 1 秒`
28. **attempt 1 のみ 10 秒キャップ** (Issue #298 hang バグ対策、正常時は 1 秒以内に完了)
29. **`Promise.race` でタイムアウト強制** (printToFileAsync は hang したら resolve も reject も来ない)

### ストレージ事前チェック (Q13 ST1: Repolog 流用)

30. **`getFreeDiskStorageAsync()` で 100MB 必須**: 不足なら `PdfStorageLowError` で即時エラー (フォールバック不可)
31. **`getFreeDiskStorageAsync` 自体が失敗時はチェックスキップ** (古い端末や権限問題対応)

### blank PDF 検証 (Repolog 流用)

32. **`assertPdfLooksValid()` で 1024 byte 未満を blank と判定**: `BlankPdfError` で再試行

### カスタムエラー (Repolog 流用)

33. **`BlankPdfError`** (1024 byte 未満)
34. **`PdfHangError`** (Promise.race timeout)
35. **`PdfStorageLowError`** (100MB 不足)

### ファイル名規則 (Q14 NM3)

36. **形式**: `bonsailog-{kind}-{YYYYMMDD-HHMM}.{csv|pdf}`
    - 例: `bonsailog-bonsai-list-20260430-1730.csv`
    - 例: `bonsailog-bonsai-pdf-20260430-1730.pdf`
37. **ASCII 文字のみ** (Windows 予約文字回避)
38. **タイムスタンプは端末ローカル時刻** (`expo-localization.getCalendars()[0]?.timeZone`)
39. **Repolog の Forbidden chars 置換ロジック流用** (Repolog `pdfUtils.ts buildPdfExportFileName` 参考):
    - 禁止文字 `[\/\\:*?"<>|]` を `_` に置換
    - 連続 `_` を 1 つに圧縮
    - 端の `_` を除去

### 共有 / 保存 (Q15 SAF1: Repolog 流用)

40. **iOS**: `Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf' or 'public.comma-separated-values-text', mimeType: 'application/pdf' or 'text/csv' })` で Share Sheet 起動
41. **Android**: `LegacyFileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync()` で保存場所選択 → `createFileAsync()` + `writeAsStringAsync({ encoding: Base64 })` で書込
42. **共有後の後始末 (Q7)**: `file.delete()` で必ず cacheDirectory から削除 (ADR-0007 と同思想)

### 画面構成 (Design 参考、7 画面)

43. **Settings → エクスポート (Hub)**: 5 種類を CSV / PDF セクション分け表示
    - キャッチ「あなたの記録を、あなたの手元へ。」(Design 参考)
    - 「F-10 · DATA PORTABILITY」サブタイトル
    - 各行に Format Badge (CSV = 緑、PDF = 金) + タイトル + サブタイトル + 行数 + サイズ目安
    - Free ユーザーには各行に「PRO」バッジ表示 (Design 参考、Pro 誘導)
    - Footer note「CSVはUTF-8 BOM付きでExcel日本語版でも文字化けしません」
44. **Options Sheet** (BottomSheet): エクスポート種類タップで下から出るシート
    - **盆栽選択 (Y4 採用)**: v1.0 で「全件」「個別選択」のラジオ
    - 個別選択時: 盆栽一覧 (FlashList) + 複数選択チェックボックス
    - 「エクスポート」ボタンタップで Pro チェック → Paywall or 進捗画面へ
45. **Generating Overlay**: 進捗バー + 「キャンセル」ボタン (Y2 採用)
    - 3 段階フォールバック中は内部で attempt 表示なし (ユーザーには「生成中...」のみ)
    - キャンセルボタンで進行中処理を中断
46. **Share Sheet**: iOS / Android 標準共有 UI (OS 委譲)
47. **CSV Preview**: Excel 風スプレッドシート + 生テキスト両表示 (生成前確認)
48. **PDF Bonsai Preview** (個別): A4 比縮小表示で 1 本ずつのレポート構成確認
49. **PDF List Preview** (全盆栽): A4 比縮小表示で表紙 + リスト + 統計確認

### エラー文言 (Q22 EN1+ES1)

50. **PDF 生成失敗**: 「PDF を作成できませんでした。盆栽の数を減らしてお試しください」
51. **ストレージ不足**: 「ストレージ容量が不足しています。100MB 以上空けてください」
52. **シニア向け配慮**: 技術的詳細を出さない、対策を示す

### Yes/No 仕様 (Y1-Y4)

53. **Y1 NO**: エクスポート履歴を保持しない (cacheDirectory 都度生成・即削除、シンプル原則)
54. **Y2 YES**: 進捗画面に「キャンセル」ボタン (100 本 PDF 中断対応)
55. **Y3 NO**: エクスポート完了通知 (F-16) を送らない (アプリ内 Share Sheet で完結、通知不要)
56. **Y4 YES (修正)**: **盆栽選択機能 (全件 vs 個別選択) を v1.0 で提供** (盆栽園プロが「特定顧客の盆栽だけ報告」需要)

### F-15 連動

57. **PDF レイアウトのテーマトークン参照**: 通常モード (light) で固定 (PDF は印刷物、ダーク/屋外モード非対応)
58. **エクスポート画面 UI** は F-15 全テーマ追従 (Hub / Options / Progress / Share / Preview)

### F-11 連動

59. **エクスポート ≠ バックアップ**: F-10 はデータポータビリティ (顧客報告 / Excel 移行)、F-11 は端末買い替え時の完全バックアップ。機能分離。
60. **CSV に写真関連列を含めない (Q8 PH4)**: 写真は F-11 ZIP で完全管理、F-10 は純粋なデータ表のみ。

### F-13 連動

61. **Paywall 文言**: ADR-0009 の Pro メリット 4 つを表示 (写真無制限 / **CSV/PDF エクスポート** / QR 印刷 / 広告非表示)
62. **`presentPaywallIfNeeded` 採用**: ユーザーが課金しない場合は無音終了 (押し付けがましさ排除)

### 適用範囲

63. v1.0 から **Pro プランのみ利用可** (Free でタップ → Paywall)。

---

## Decision Drivers（判断の軸）

- Driver 1: **Repolog 既存実装の流用** (800 行の堅牢性 = 3 段階フォールバック + タイムアウト + ストレージチェック + カスタムエラー + Forbidden chars 置換)
- Driver 2: **Pro メリット 4 つの 1 つを維持** (ADR-0009 / ADR-0011) — Design の「全機能 Free」記述は採用しない、ビジネス仕様は議論済 ADR が正
- Driver 3: **iOS / Android 互換性** (写真 base64、page-break -webkit プレフィクス、CJK フォント、DOCTYPE)
- Driver 4: **Android base64 フォント blank PDF 問題回避** (Repolog Issue #292 教訓、フォント埋め込みなし、system フォント委譲)
- Driver 5: **シニア UX** (エラー文言親切、進捗+キャンセル、シンプル原則)
- Driver 6: **コスト 0** — 既存パッケージ流用、新規ライブラリなし、Repolog 実装ほぼコピー可
- Driver 7: **業界標準準拠** (RFC 4180、A4 縦、ISO 8601 UTC、UTF-8 BOM、ULID 主キー)
- Driver 8: **盆栽園プロ顧客報告対応** (個別選択機能 Y4 v1.0 採用、Pro Lifetime 訴求)

---

## Alternatives considered（他の案と却下理由）

### Option A: Pro 方針を Design に揃える (全機能 Free、PR1)

- 概要: F-04 / F-09 / F-15 と同じ「全機能 Free」哲学に統一、ADR-0009 Pro メリット 4 → 3 個に削減
- 良い点: 一貫性、Marcus / 盆栽園プロのデータポータビリティ価値
- 悪い点: Pro 訴求の柱が崩れる、ADR-0009 大規模改訂、ユーザー判断「Pro 限定維持」と矛盾
- 却下理由: ユーザー方針 PR2 (Pro 限定維持) 採用、Design はあくまで下書き

### Option B: 単一 attempt のみ (FB2、3 段階フォールバックなし)

- 概要: 1 回の printToFileAsync で完結、失敗したらユーザーに再試行ボタン
- 良い点: 実装コード少 (200 行 vs 800 行)
- 悪い点: 100 本 PDF で 1 件失敗するとユーザー困惑、シニア UX 悪
- 却下理由: ユーザー方針 FB1 (Repolog 流用) 採用

### Option C: フォント埋め込み採用 (CJK 完全対応)

- 概要: Noto Sans CJK Variable .ttf を assets に同梱、PDF に base64 埋込
- 良い点: 受信側端末にフォントなくても表示可
- 悪い点: Repolog Issue #292 で Android 15-40MB base64 が blank PDF (681 byte) 引き起こす
- 却下理由: フォント埋め込みなし、system フォント委譲 (Repolog Issue #292 教訓、Q3 修正)

### Option D: ファイル名に盆栽名含む (NM2)

- 概要: 例 `黒松-太郎-2026-04-30.pdf`
- 良い点: ユーザーが何のファイルか即わかる
- 悪い点: PII リスク (誰の盆栽か特定可能)、日本語ファイル名で文字化け、19 言語対応複雑
- 却下理由: ユーザー方針 NM3 (ASCII + ISO 8601 + 種類) 採用

### Option E: Letter サイズ切替可 (PG2)

- 概要: Settings で A4 / Letter 選択
- 良い点: 米国ユーザー (Marcus) 対応
- 悪い点: 19 言語のうち 18 言語が A4 標準、Marcus 1 名のために実装コスト
- 却下理由: ユーザー方針 PG1 (A4 固定 v1.0、Letter は v1.x) 採用

### Option F: Excel .xlsx 直接出力

- 概要: react-native-xlsx 等で .xlsx 生成
- 良い点: Excel ネイティブ対応
- 悪い点: ライブラリサイズ +200KB、CSV で代替可、シンプル原則違反
- 却下理由: 既存 §15 確定済 (CSV のみ)

### Option G: パスワード付き PDF (v1.0)

- 概要: PDF にパスワード設定機能
- 良い点: セキュリティ向上
- 悪い点: 既存 §15 で v1.1+ と確定、v1.0 範囲外
- 却下理由: v1.x 候補

### Option H: 環境光センサー連動の自動屋外モード (F-15 関連)

- 概要: F-10 PDF Preview 画面で屋外モード自動切替
- 良い点: 直射日光下で UI 視認可
- 悪い点: F-15 で「環境光センサー連動なし」確定 (ADR-0015)、F-10 だけ例外にするのは整合性悪
- 却下理由: F-15 方針継続

### Option I: エクスポート完了通知 (F-16) を送る (Y3)

- 概要: PDF 生成完了時に F-16 ローカル通知
- 良い点: 大量 PDF 生成中に他アプリ使ってもわかる
- 悪い点: アプリ内 Share Sheet 起動で完結、通知冗長、シニア混乱
- 却下理由: ユーザー方針 Y3 NO 採用

### Option J: 写真件数列を events_csv に含める (PC1)

- 概要: events_csv に `photo_count` 列追加
- 良い点: Excel で「写真添付の有無」絞り込み可
- 悪い点: ユーザー方針 PC2 (PH4 と一貫、写真関連列削除) と矛盾
- 却下理由: ユーザー方針 PC2 採用、CSV はデータ表のみに徹底

---

## Consequences（結果）

### Positive（嬉しい）

- 「Pro メリット 4 つの 1 つ」を維持、ADR-0009 整合
- 全ペルソナで全要素 ○ 以上、✕ ゼロ
- Repolog 既存実装 800 行流用で堅牢性確保 (3 段階フォールバック / タイムアウト / ストレージチェック / blank PDF 検証)
- iOS / Android 互換性確保 (写真 base64 / page-break / CJK フォント / DOCTYPE)
- Repolog Issue #292 (Android base64 フォント blank PDF) を事前回避
- Repolog Issue #298 (iOS hang) を事前回避
- 7 画面構成で UX 厚い (Hub / Options / Progress / Share / Preview ×3)
- Y4 個別選択機能 v1.0 採用で盆栽園プロ「顧客別報告」需要対応
- Pro Lifetime 訴求強化 (盆栽園プロが Pro Lifetime ¥9,800 購入動機)
- バンドル増ゼロ (既存 expo-print/expo-sharing/expo-file-system 流用)
- Hermes Intl 月名/曜日名は使わない (ISO 8601 UTC のみ) → ADR-0008 §Notes リスク回避

### Negative（辛い/副作用）

- **Repolog 流用 800 行のメンテコスト**: BonsaiLog 用にスキーマ調整必要 (Drizzle ORM + ULID + status + tags 対応)
- **CJK フォント未埋込で受信側端末依存**: 古い Android 端末でフォント不足リスク (Noto Sans CJK 未インストール) → 実機 PoC で確認
- **Android base64 フォント問題は完全には消えない**: 念のため `skipFontEmbedding: true` をデフォルト設定、attempt 1 から system フォント委譲
- **Y4 個別選択機能で UI 複雑化**: シニア (高橋 62 歳) には全件デフォルト選択でシンプル運用
- **Design「全機能 Free」記述との差異**: Design 参考時に「ビジネス仕様は ADR が正」を明示
- **Pro 加入率モニタリング**: F-04 / F-09 / F-15 が全機能 Free の中で F-10 / F-13 / F-08 写真∞ / F-14 広告無の 4 つが Pro 訴求 → 半年後にレビュー
- **PDF レイアウトはダークモード非対応**: 印刷物として light モード固定、F-15 で確定 → 受信側で印刷 / メール添付するため問題なし

### Amended（2026-05-26 Sess47、UI 7 画面完遂 PR #853-857）

v1.0 UI を実装完了。**実装は本 ADR の計画パスと一部異なる**ため、実態を以下に記録（Follow-ups の旧パスは参考）:

- **画面実装パス**: `src/screens/*` ではなく **expo-router の `app/export/`** に配置:
  - Hub = `app/export/index.tsx`（5 種類集約、CSV/PDF セクション + PRO バッジ + FormScreenHeader。設定からは単一エントリ `e2e_open_export_hub` → Hub に集約。従来 default header が route path を表示する不具合も解消）
  - Options Sheet = `src/features/export/ExportOptionsSheet.tsx`（RN `<Modal>`、期間/対象(全部/選択/タグ)/アーカイブ、ファイル名 live preview、AC12 バリデーション）
  - PDF 個別/一覧プレビュー = `app/export/pdf-preview.tsx` / `list-preview.tsx`（**react-native-webview** で印刷同一 HTML を表示）
  - CSV プレビュー = `app/export/csv-preview.tsx`（Excel 風表 / 生テキスト切替、RFC4180 行パーサ）
  - 生成中オーバーレイ = `src/features/export/GeneratingOverlay.tsx`（PDF 共有時に表示。CSV は即時のためインライン）
  - bonsai_pdf picker = `app/export/pdf.tsx`（1 本 1 ページの個別選択が本質のため Sheet 統合せず専用 picker 維持）
  - Share = OS 委譲（`expo-sharing`、独自画面なし）
- **ロジック統合**: 計画の `csvWriter/csvBonsai/csvEvents/csvSpecies` 分割ではなく既存 `src/features/export/csvExport.ts`（events/bonsai/species CSV 関数）に集約済。`exportFlow.ts` は `runExport` + `loadCsvForPreview` / `loadListPdfHtml` / `loadBonsaiPdfHtml` / `shareExportFile` を提供し、**全種プレビュー先行**フロー（生成前に preview → 共有）に統一。`eventRepository.getEventsInRange()` を新設（期間/対象フィルタ）。
- **フォント埋込なし**（system 委譲）/ 写真 base64 inline / A4 縦 / 3 段階フォールバック / 動的タイムアウト / 100MB チェックは `pdfExport.ts` / `pdfReliability.ts` に実装済（流用元 Repolog 教訓を反映）。
- **Pro 限定維持**（`useGoToPaywall` → `/pro`）。検証用に開発トグル `e2e_dev_set_pro`（PR #843）。
- **検証**: 全 7 画面を実機 (Pixel, Dev Build) で目視確認。ui-diff 自動キャプチャは export-hub / export-options を SCREEN_PAIRS 登録。WebView / 非同期描画のプレビュー系は Maestro が描画完了を検知できないため手動検証で確定。
- テスト: `__tests__/features/export/` に csvExport / pdfExport / listPdfExport / pdfReliability / exportFileName + exportHub / exportPreview / exportGeneratingOverlay の静的解析 test。

### Amended（2026-05-26 Sess47、CSV 出力の人間可読再設計 + 動線 PR-A〜D）

実機検証で CSV が生 DB ダンプ (ULID / UTC ミリ秒 / 英語 style コード / created_updated) で
4 ペルソナ全員が読めない (AC3「ロケール対応」も未達) と判明。**AC2 列定義 / AC3 を以下へ Amend**:

- **動線**: CSV は中間プレビュー画面を廃止し「出力する」で即生成 → 共有 (csv-preview.tsx 削除)。
  PDF (個別/一覧) は WebView プレビューを維持。
- **events_csv (作業履歴)**: 旧 11 列生ダンプ → **盆栽名 / 作業 / 状態 / 日時(ローカル) /
  部位 / 詳細 / メモ / 盆栽ID / 作業ID**。作業・状態は i18n、日時は端末 tz でローカル化、
  部位・量(詳細)は payload から `buildHistoryChips` で人間可読化 (履歴 UI と同表現)。
- **bonsai_csv (盆栽一覧)**: 旧 9 列生ダンプ → **名前 / 樹種 / 樹形(日本語) / 入手日(日付) /
  鉢(整形) / 状態(現役・アーカイブ) / 盆栽ID**。created_at / updated_at / 先頭 ULID を撤去。
- **species_csv (樹種別サマリ)**: 旧「樹種マスタ辞書(学名/科/耐寒ゾーン)」ダンプ → **保有樹種の
  集計**に作り替え (樹種 / 保有数 / 最終水やり / 最終剪定 / 最終植替え / 最終施肥)。最終日は
  実施済(logged)のみ、ローカル日付。
- **AC3 改定**: 「日時 ISO8601 UTC」→ **端末ローカル日付**、ヘッダ + 値を i18n ローカライズ
  (CSV の言語 = アプリ表示言語)。ID 列は末尾にトレース用として残置。BOM/CRLF/RFC4180 quote は維持。
- **アーキテクチャ**: csvExport.ts は `cellsToCsvString` (整形済セル→CSV) に純化、ローカライズ/
  日付/payload 抽出/名前解決は eventCsvRow.ts / bonsaiCsvRow.ts / speciesSummary.ts +
  exportFlow.ts (t・repo 利用層) に集約。旧 \*ToCsvRows/String は撤去。
- **恒久策**: 「出力できる」でなく「実利用者が読めるか」を検証基準化。PR テンプレ §6-4 に
  「CSV/PDF はペルソナ別サンプル目視 (高橋=意味が分かる / Marcus=Excel集計可)」を必須追加。
- テスト: eventCsvRow / bonsaiCsvRow / speciesSummary の純関数 test + csvExport(cellsToCsvString)。
  実機裏取り (run-as cat) で 3 種 CSV の人間可読性を確認。

### Amended（2026-05-27 Sess49、bonsai_pdf 複数ページ体裁 + 印刷CSSエンジン対応表）

実機で複数ページの bonsai_pdf を出力したところ、2 ページ目以降にヘッダーが無く「ぶつ切り」/
チップ横並び / 写真縮小 / 不要フッタ が判明。`/discuss` で以下へ Amend (PR #<TBD>):

- **ランニングヘッダー**: レポート全体を `<table class="doc">` で包み `<thead>` に
  「BonsaiLog · 盆栽名」 を入れる → 印刷時に各ページ先頭で自動繰り返し (実機 Android で 3 ページ確証)。
- **作業ログのチップ**: 横並び → **縦 1 列** (`.chips { flex-direction: column }`)。
- **ギャラリー写真**: 横 2 列・幅 30% 縮小 → **縦 1 列・幅いっぱい** (縦横比保持・切り抜きなし、
  A4 幅はみ出し防止に `max-width`)。タイムライン内サムネ (56×56) は据置。
- **フッタ「BonsaiLog で生成」削除** (`exportPdfFooterNote` キーも 19 言語から除去)。

**印刷CSSエンジン対応表 (PDF系新機能の設計時に必読、Sess49 一次情報調査で確定)**:

| 機能                                                 | iOS WKWebView               | Android Chromium | 採否                       |
| ---------------------------------------------------- | --------------------------- | ---------------- | -------------------------- |
| `<thead>` の各ページ繰り返し                         | ✅                          | ✅               | **採用** (running header)  |
| `position: fixed` の各ページ繰り返し                 | ✕ 不安定 (最終ページのみ等) | ✅               | 不採用                     |
| `@page { @bottom-right { content: counter(page) } }` | ✕                           | ✕                | 不採用 (正確な n/n は不可) |
| `page-break-inside: avoid` (+ `-webkit-`)            | ✅                          | ✅               | 採用済                     |

→ **ページ番号 n/n は CSS 自動では実現不可** (手動ページ分割しか無く写真高さで崩れる) のため
v1.0 では非採用。running header で「ぶつ切り」感を解消する方針。

- **恒久策**: 本対応表を ADR に常設。PR テンプレ §6-4 に「PDF は**複数ページになる盆栽**でも
  実機検証 (1 ページに収まるデータだけで判定しない)」を追加。
- テスト: `pdfExport.test.ts` に thead ランニングヘッダー / 縦チップ / 縦ギャラリー / フッタ非出力。
  実機 (run-as cat + gs でページ画像化) で 3 ページの running header を確証。

### Amended（2026-05-27 Sess49 追補2、プレビュー動線統一 + running header 被り修正）

- **プレビュー画面の動線統一** (`app/export/pdf-preview.tsx` / `list-preview.tsx`): 独自ダーク
  バー (`#3A3833`) + 右上「共有」を廃止し、他画面と同じ `FormScreenHeader` (戻る + タイトル) +
  **下部「出力する」CTA** (`exportOptExport`、CSV Options Sheet の `cta` スタイル流用) に統一。
  生成・共有ロジック (`generateAndShareBonsaiPdf` / `generateAndShareListPdf`) は不変。
  未使用化した `exportPreviewShare` キーは 19 言語から削除。
- **running header 被り修正**: 改ページ直後は本文側の `margin-top`/`padding-top` が印刷時に
  破棄される (W3C) ため、#866 の thead running header 直下に本文が密着する不具合が発生。
  **余白を thead セル自体 (`.rhead { padding: 0 0 14px }` + 内側 `.rhead-bar` に border) に
  内蔵**し、繰り返される各ページで間隔を確保 (実機 3 ページで確証)。
- **恒久策 (design ルール)**: 「**running header は下余白まで 1 セットで thead に含めて繰り返す**」
  (改ページ直後の margin 破棄対策)。PR テンプレ §6-4 の「複数ページ PDF を実機検証」を徹底。

### Follow-ups（後でやる宿題）

- [ ] `docs/reference/functional_spec.md` §15 全面補強 (Repolog 流用 + 7 画面構成 + 5 種類詳細 + フォールバック仕様 + ファイル名規則 + Android SAF + Y4 個別選択機能)
- [ ] `docs/reference/basic_spec.md` F-10 minor 更新 (Pro 限定維持 + 7 画面 + 個別選択 + Repolog 流用言及)
- [ ] `docs/reference/glossary.md` 用語追加: BOM (Byte Order Mark) / RFC 4180 / CRLF / WKWebView 制約 / SAF (StorageAccessFramework) / 3 段階フォールバック / PdfHangError / PdfStorageLowError / BlankPdfError / DOCTYPE / Forbidden chars / page-break-after / data URI / cacheDirectory
- [ ] `docs/adr/ADR-0007-f11-data-migration-design.md` 補強 (F-10 と機能分離、F-11 = 完全バックアップ、F-10 = データポータビリティ)
- [ ] `docs/adr/ADR-0009-f13-revenuecat-billing.md` 補強 (Pro メリット 4 つの 1 つ「CSV/PDF エクスポート」明記)
- [ ] `docs/adr/ADR-0011-remove-recommendations-keep-record-only.md` 補強 (記録のみ哲学と F-10 整合)
- [ ] **Repolog ファイル流用** (実装 PR で実施):
  - `src/features/pdf/pdfService.ts` (260 行) → BonsaiLog 用にスキーマ調整 (Drizzle + ULID + status + tags)
  - `src/features/pdf/pdfTemplate.ts` (510 行) → BonsaiLog 用にデザイン調整 (Tamagui themes + bonsai\_\* トークン参照)
  - `src/features/pdf/pdfFonts.ts` (115 行) → **採用しない** (Q3 修正、フォント埋込なし、system 委譲)
  - `src/features/pdf/pdfFontSelection.ts` (130 行) → **採用しない** (フォント埋込関連)
  - `src/features/pdf/pdfUtils.ts` (130 行) → ファイル名 NM3 形式 + Forbidden chars 置換 + ページ計算 (BonsaiLog 用に調整)
- [ ] `src/features/export/csvWriter.ts` 新規実装 (BOM + CRLF + RFC 4180 quote escape、自前 30 行)
- [ ] `src/features/export/csvBonsai.ts` 新規実装 (盆栽一覧 9 列)
- [ ] `src/features/export/csvEvents.ts` 新規実装 (作業履歴 11 列、写真件数列なし)
- [ ] `src/features/export/csvSpecies.ts` 新規実装 (樹種別サマリ 8 列)
- [ ] `src/features/export/exportFlow.ts` 新規実装 (Pro チェック → CSV/PDF 生成 → Share/Save)
- [ ] `src/screens/SettingsExport.tsx` 新規実装 (Hub 画面、5 種類セクション分け、Free Pro バッジ)
- [ ] `src/screens/ExportOptionsSheet.tsx` 新規実装 (盆栽選択 + エクスポート種類別オプション)
- [ ] `src/screens/ExportProgressOverlay.tsx` 新規実装 (進捗バー + キャンセル)
- [ ] `src/screens/ExportPreview.tsx` 新規実装 (CSV / PDF Bonsai / PDF List のプレビュー)
- [ ] テスト: `__tests__/features/export/csvWriter.test.ts` (BOM / CRLF / quote escape)
- [ ] テスト: `__tests__/features/export/csvBonsai.test.ts` (列数 / 列順 / ロケール対応ヘッダ)
- [ ] テスト: `__tests__/features/export/csvEvents.test.ts` (写真件数列なし確認)
- [ ] テスト: `__tests__/features/export/pdfBonsai.test.ts` (Repolog 流用、HTML 生成 + base64 写真)
- [ ] テスト: `__tests__/features/export/pdfFallback.test.ts` (3 段階フォールバック + OOM / blank / hang シミュレート)
- [ ] テスト: `__tests__/features/export/proGate.test.ts` (Free でタップ → Paywall、Pro 加入後即実行)
- [ ] テスト: `__tests__/features/export/fileNameRule.test.ts` (NM3 形式 + Forbidden chars 置換)
- [ ] Maestro: `maestro/flows/export_csv_flow.yml` (Hub → CSV 選択 → Pro 加入 → 生成 → Share)
- [ ] Maestro: `maestro/flows/export_pdf_flow.yml` (Hub → PDF 選択 → 個別選択 → 生成 → Share)
- [ ] Maestro: `maestro/flows/export_paywall_flow.yml` (Free でタップ → Paywall → キャンセル → 無音終了)
- [ ] Phase 0 PoC: 実機 Pixel 7 / iPhone 13 で 100 本 PDF 生成 60 FPS、3 段階フォールバック動作、Excel 日本語版で文字化けなし、iOS Color Filters Grayscale で UI 確認
- [ ] Phase 0 PoC: Hermes Intl `expo-localization.getCalendars()[0].timeZone` 動作確認
- [ ] Phase 0 PoC: Android SAF (StorageAccessFramework) 保存場所選択動作
- [ ] Phase 0 PoC: 古い Android 端末 (Android 7-8) で Noto Sans CJK 未インストール時の挙動確認
- [ ] `docs/reference/tasks/lessons.md` 追記候補:
  - 「PDF エクスポートは Repolog 既存実装流用で堅牢性確保、自前実装より 800 行のロジック節約」
  - 「Android Chromium 印刷エンジンは 15-40MB base64 フォント埋込で blank PDF を silent failure 返す → フォント埋込しない、system 委譲」
  - 「iOS WKWebView 写真は file:// パス読込不可、必ず base64 data URI inline」
  - 「page-break は -webkit-page-break-\* プレフィクス併記必須、iOS / Android 互換」
  - 「CSV は写真関連列を含めない、F-11 ZIP で完全分離 (機能分離原則)」

---

## Acceptance / Tests（合否：テストに寄せる）

### 自動テスト

- **Jest 単体テスト**:
  - `__tests__/features/export/csvWriter.test.ts` (BOM `﻿` + CRLF `\r\n` + quote escape RFC 4180)
  - `__tests__/features/export/csvBonsai.test.ts` (9 列、列順、ロケール対応ヘッダ、写真関連列なし PH4)
  - `__tests__/features/export/csvEvents.test.ts` (11 列、写真件数列なし PC2)
  - `__tests__/features/export/csvSpecies.test.ts` (8 列、最終作業日 / 保有数集計)
  - `__tests__/features/export/pdfBonsai.test.ts` (HTML 生成 + DOCTYPE + base64 写真 + page-break)
  - `__tests__/features/export/pdfFallback.test.ts` (3 段階フォールバック + OOM / blank / hang シミュレート + cooldown 300ms)
  - `__tests__/features/export/pdfTimeout.test.ts` (TO1 動的タイムアウト + attempt1 10s キャップ)
  - `__tests__/features/export/pdfStorage.test.ts` (ST1 100MB チェック + PdfStorageLowError)
  - `__tests__/features/export/proGate.test.ts` (Free でタップ → Paywall、Pro 加入後即実行、`isPro: false` 引数渡し)
  - `__tests__/features/export/fileNameRule.test.ts` (NM3 形式 + Forbidden chars 置換 + タイムスタンプ)
  - `__tests__/features/export/i18nForbiddenWords.test.ts` (禁止語検出)
- **Maestro E2E**:
  - `maestro/flows/export_csv_flow.yml` (Hub → CSV 選択 → Pro 加入 → 生成 → Share)
  - `maestro/flows/export_pdf_flow.yml` (Hub → PDF 選択 → 個別選択 → 生成 → Share)
  - `maestro/flows/export_paywall_flow.yml` (Free でタップ → Paywall → キャンセル → 無音終了)
  - `maestro/flows/export_progress_cancel.yml` (生成中キャンセル → 中断確認)

### 手動チェック (Phase 0 PoC 必須)

- 実機 Pixel 7 / iPhone 13:
  - 100 本盆栽の `bonsai_pdf` 生成で 3 段階フォールバック動作確認
  - 100 本 PDF 60 FPS (UI 操作レスポンス維持)
  - iOS 16 で SIGTRAP / hang 確認 (Repolog Issue #298)
  - Android 14 で SCHEDULE_EXACT_ALARM 拒否時の動作 (F-16 連動なしのため影響なし、確認のみ)
  - Excel 日本語版で文字化けなし (UTF-8 BOM 効果確認)
  - Excel 英語版 / Numbers / Google Sheets / LibreOffice Calc で開いて表示確認
  - 古い Android 端末 (Android 7-8) で Noto Sans CJK 未インストール時のフォント挙動
- iOS:
  - VoiceOver 読み上げ (Hub / Options / Progress / Share / Preview 全画面)
  - Dynamic Type 最大設定でレイアウト維持
  - iOS Color Filters Grayscale モードで UI 確認 (Apple App Store Connect 評価基準)
- Android:
  - TalkBack 読み上げ
  - fontScale 最大設定
  - SAF 保存場所選択動作 (Drive / Local / Dropbox)

### F-10 受け入れ条件

- [ ] Pro 限定維持 (Free でタップ → Paywall、ADR-0009 整合)
- [ ] 5 種類エクスポート (bonsai_csv / events_csv / species_csv / bonsai_pdf / list_pdf)
- [ ] CSV: UTF-8 BOM + CRLF + RFC 4180 quote escape + ロケール対応ヘッダ
- [ ] CSV に写真関連列を含めない (Q8 PH4 + Q17 PC2)
- [ ] PDF: A4 縦 + DOCTYPE + base64 写真 + WebKit page-break + CJK フォント明示 (フォント埋込なし)
- [ ] 3 段階フォールバック (full → reduced → tiny) 動作 (Q11 FB1)
- [ ] タイムアウト動的計算 (30s + 1s/枚、attempt1=10s、Q12 TO1)
- [ ] ストレージ事前チェック 100MB (Q13 ST1)
- [ ] BlankPdfError / PdfHangError / PdfStorageLowError 動作
- [ ] ファイル名 `bonsailog-{kind}-{YYYYMMDD-HHMM}.{csv|pdf}` (Q14 NM3)
- [ ] iOS Share Sheet (UTI / mimeType 両指定) + Android SAF (Q15 SAF1)
- [ ] cacheDirectory 後始末 (file.delete() Q7)
- [ ] 7 画面構成 (Hub / Options / Progress / Share / CSV Preview / PDF Bonsai / PDF List)
- [ ] 個別選択機能 (Y4、全件 vs 個別ラジオ + 複数選択チェックボックス)
- [ ] エクスポート履歴保持しない (Y1)
- [ ] 進捗画面キャンセルボタン (Y2)
- [ ] エクスポート完了通知なし (Y3)
- [ ] エラー文言「PDF を作成できませんでした。盆栽の数を減らしてお試しください」「ストレージ容量が不足しています。100MB 以上空けてください」(Q22 EN1+ES1)
- [ ] 数値フォーマット機械可読 1234.56 (Q20 NF1)
- [ ] 絵文字 system フォント任せ (Q21 EM1)
- [ ] 19 言語ローカライズ (CSV ヘッダ + UI 文言、`pnpm i18n:check` 0 missing)
- [ ] 禁止語検出 (`pnpm i18n:forbidden` 緑)
- [ ] F-15 連動 (UI 画面のみテーマ追従、PDF レイアウトは light 固定)
- [ ] F-11 連動 (機能分離、CSV に写真関連列なし)

---

## Rollout / Rollback（出し方/戻し方）

- リリース手順への影響：
  - F-01 / F-08 / F-02 マージ後、F-13 (Pro 課金、#20) マージ後に F-10 マージ
  - リリースノート: 「データを CSV / PDF で書き出せます (Pro 機能)」「個別の盆栽を選んでレポート作成できます」(19 言語)
- ロールバック方針：
  - F-10 を v1.0.x ホットフィックスで無効化する場合: Settings → エクスポート画面を非表示化 (DB 影響なし、Pro メリット 4 → 3 に一時降格)
  - 個別選択機能のみロールバック: Options Sheet から「個別選択」ラジオ削除、全件のみに (UI 簡略化)
- 検知方法：
  - Sentry: `BlankPdfError` / `PdfHangError` / `PdfStorageLowError` / `ExportError` 監視
  - ストアレビュー: 「エクスポートできない」「PDF が空白」「文字化け」「Excel で開けない」キーワード監視
  - DAU: エクスポート画面 DAU、Pro 加入率 (F-10 経由率)、種類別エクスポート利用数

---

## Links（関連リンク）

- constraints: `docs/reference/constraints.md` (§1-1 Local-first / §1-2 写真パス相対 / §1-3 PII / §1-4 記録のみ / §2-2 Free/Pro 差分 / §3-1 19 言語 / §5-2 禁止語 / §8 F-10 ID)
- reference: `docs/reference/basic_spec.md` (F-10 セクション、Pro 限定維持)
- reference: `docs/reference/functional_spec.md` (§15 F-10、本 ADR で全面補強)
- reference: `docs/reference/personas.md` (4 ペルソナ評価)
- glossary: `docs/reference/glossary.md` (BOM / RFC 4180 / CRLF / WKWebView 制約 / SAF / 3 段階フォールバック / カスタムエラー等 — 追加予定)
- 行動 lesson: `.claude/recurrence-prevention.md` (R-1〜R-12)
- Repolog 既存実装:
  - `/home/doooo/04_app-factory/apps/Repolog/src/features/pdf/pdfService.ts` (260 行、3 段階フォールバック)
  - `/home/doooo/04_app-factory/apps/Repolog/src/features/pdf/pdfTemplate.ts` (510 行、HTML 生成)
  - `/home/doooo/04_app-factory/apps/Repolog/src/features/pdf/pdfUtils.ts` (130 行、ファイル名 + ページ計算)
  - Repolog ADR: `ADR-0013-pdf-export-resilience-and-progress.md` (3 段階フォールバック + 動的タイムアウト)
  - Repolog ADR: `ADR-0015-pdf-font-strategy-shift.md` (Issue #292 教訓、フォント埋込なし)
- Design 参考 (UI 設計のヒント、ビジネス仕様は ADR が正):
  - `/mnt/c/Users/doooo/Downloads/BonsaiLog_template-handoff/bonsailog-template/project/Export Wireframes.html`
  - `/mnt/c/Users/doooo/Downloads/BonsaiLog_template-handoff/bonsailog-template/project/export-screens.jsx` (54KB、7 画面構成 + EXPORT_TYPES 5 種類)
  - キャッチ「あなたの記録を、あなたの手元へ。」(F-10 · DATA PORTABILITY)
- 連動 ADR:
  - `docs/adr/ADR-0007-f11-data-migration-design.md` (F-11 = 完全バックアップ、F-10 と機能分離)
  - `docs/adr/ADR-0008-f02-event-data-model.md` (events スキーマ、CSV 列順準拠)
  - `docs/adr/ADR-0009-f13-revenuecat-billing.md` (Pro メリット 4 つ、CSV/PDF Pro 限定継続)
  - `docs/adr/ADR-0011-remove-recommendations-keep-record-only.md` (記録のみ哲学)
  - `docs/adr/ADR-0014-f16-local-notification.md` (エクスポート完了通知は不採用 = Y3)
  - `docs/adr/ADR-0015-f15-theme-system.md` (UI 画面のみテーマ追従、PDF は light 固定)
- 影響 Issue: 後日 #<TBD>（F-10 メイン Issue）、#20 (F-13 課金、Pro メリット 4 つ確認)
- PR: #<TBD>
- Issue: #<TBD>
- External docs:
  - [Expo Print SDK](https://docs.expo.dev/versions/latest/sdk/print/)
  - [Expo Print CHANGELOG](https://github.com/expo/expo/blob/main/packages/expo-print/CHANGELOG.md)
  - [Expo Sharing SDK](https://docs.expo.dev/versions/latest/sdk/sharing/)
  - [Expo FileSystem SDK](https://docs.expo.dev/versions/latest/sdk/filesystem/)
  - [GitHub Issue #1308 (iOS WKWebView 写真制約)](https://github.com/expo/expo/issues/1308)
  - [GitHub Issue #7435 (DOCTYPE 余分空ページ)](https://github.com/expo/expo/issues/7435)
  - [GitHub Issue #8843 (iOS page-break)](https://github.com/expo/expo/issues/8843)
  - [GitHub Issue #45095 (iOS 16 SIGTRAP)](https://github.com/expo/expo/issues/45095)
  - [Repolog Issue #292 (Android base64 font blank PDF)](内部リンク)
  - [Repolog Issue #298 (iOS hang)](内部リンク)
  - [RFC 4180 CSV](https://datatracker.ietf.org/doc/html/rfc4180)
  - [Microsoft Excel UTF-8 CSV](https://support.microsoft.com/en-us/office/opening-csv-utf-8-files-correctly-in-excel-8a935af5-3416-4edd-ba7e-3dfd2bc4a032)
  - [RevenueCat presentPaywallIfNeeded](https://www.revenuecat.com/docs/tools/paywalls/displaying-paywalls)
  - [Microsoft Naming Files (Forbidden chars)](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file)
  - [Apple HIG Sharing](https://developer.apple.com/design/human-interface-guidelines/sharing)
  - [Material Design 3 Sharing](https://m3.material.io/components/cards/overview)

---

## Notes（メモ）

### 議論経緯（4 ラウンド）

1. ラウンド 1: 「念のため再検証」議論で、リサーチで 5 件の補強必要事項発見 (iOS WKWebView 写真 base64 / page-break iOS 互換 / CJK フォント明示 / DOCTYPE / Pro ガート presentPaywallIfNeeded)
2. ラウンド 2: 5 件補強 + 5 件追加検討 (ファイル名 / Share 後始末 / 写真パス CSV / 用紙サイズ / ページ番号配置)、ユーザー判断「説明わからない」
3. ラウンド 3: 専門用語ゼロでイメージ説明 + Repolog 流用 + Claude Design 取得 (curl バイナリ → ローカル WSL パス指示)、Q16 緊急 (Pro 方針)
4. ラウンド 4: ユーザー Q16 PR2 (Pro 限定維持) + Design は下書き / ADR が正 + Q14/Q15 採用 + Q8 PH4 修正 (CSV 写真関連列削除) + Y4 v1.0 個別選択機能

### 4 ペルソナ評価マトリクス（最終構成）

| 要素                                                      | 高橋 62 歳       | Marcus 35 歳       | 盆栽園プロ           | ライト         | 総合 |
| --------------------------------------------------------- | ---------------- | ------------------ | -------------------- | -------------- | ---- |
| Pro 限定 (PR2)                                            | ○ Pro 加入で利用 | ◎ 即時エクスポート | ◎ 業務必須           | △ 加入動機なし | ○    |
| CSV BOM 付き UTF-8                                        | ○ Excel 開ける   | ◎ Marcus Excel 派  | ◎                    | ○              | ◎    |
| PDF A4 (PG1)                                              | ◎ 印刷文化       | ○ Letter 派        | ◎ 顧客報告           | ◎              | ◎    |
| 写真 base64 (W1)                                          | ◎ 写真付き PDF   | ◎                  | ◎ 顧客報告           | ◎              | ◎    |
| CJK フォント明示 (Q3 修正)                                | ◎ 日本語崩れない | ○                  | ◎                    | ◎              | ◎    |
| ファイル名 NM3 ASCII                                      | ◎ 互換性         | ◎                  | ◎                    | ◎              | ◎    |
| CSV 写真関連列なし (PH4)                                  | ◎ シンプル       | ○ Excel 簡潔       | ◎ 顧客報告データ簡潔 | ◎              | ◎    |
| events_csv 写真件数列なし (PC2)                           | ◎ シンプル       | ○                  | ◎                    | ◎              | ◎    |
| 3 段階フォールバック (FB1)                                | ◎ 失敗少         | ○                  | ◎ 100 本対応         | ○              | ◎    |
| ストレージチェック (ST1)                                  | ◎ 事前警告       | ◎                  | ◎                    | ○              | ◎    |
| Android SAF (SAF1)                                        | ○ Drive 保存可   | ◎ Drive 連携       | ◎ 顧客送信           | ○              | ◎    |
| 7 画面構成 (Hub / Options / Progress / Share / Preview×3) | ◎ 段階明確       | ◎ プレビュー安心   | ◎ 確認可             | ○              | ◎    |
| Y4 個別選択機能 v1.0                                      | ○ 全件選択でも   | ◎ Excel 分析向け   | ◎ 顧客別報告         | ○              | ◎    |
| Y2 進捗キャンセル                                         | ◎ 中断可         | ◎                  | ◎                    | ◎              | ◎    |
| エラー文言 EN1+ES1                                        | ◎ 親切           | ○                  | ○                    | ◎              | ◎    |

→ **全要素で全ペルソナ ○ 以上、✕ ゼロ**（R-10 クリア）。

### v1.x 拡張候補（本 ADR 対象外）

- Excel .xlsx 直接出力 (ライブラリ +200KB、要否評価)
- パスワード付き PDF (セキュリティ向上、要否評価)
- Letter サイズ切替 (米国 Marcus 対応、Settings UI 追加)
- エクスポート履歴保持 (過去 N 件、Settings UI)
- スケジュール エクスポート (毎月自動、F-16 連動)
- クラウド直接保存 (iCloud Drive / Google Drive 自動アップロード、constraints §1-1 違反だが UX◎)
- フォント埋め込みオプション (Pro 限定、ストレージ制約解消後)
- 全機能 Free 化 (Pro メリット再構築時に再評価、Design 参考)

### Repolog との差分

- BonsaiLog: events スキーマ STI + ULID + status (ADR-0008)、Repolog: 単一 reports + photos
- BonsaiLog: F-04 ヒートマップ + F-09 タグ M:N + F-15 themes (新規) → CSV/PDF も対応必要
- BonsaiLog: 19 言語 (Repolog 同じ)、CJK + Latin 拡張 + キリル + タイ
- BonsaiLog: tags 表 + bonsai_tags M:N (ADR-0008 改訂版) → CSV にタグ列追加検討余地 (v1.x)

### lessons.md 追記候補

- 「PDF エクスポートは Repolog 既存実装流用で堅牢性確保、自前実装より 800 行のロジック節約」
- 「Android Chromium 印刷エンジンは 15-40MB base64 フォント埋込で blank PDF を silent failure 返す → フォント埋込しない、system 委譲」
- 「iOS WKWebView 写真は file:// パス読込不可、必ず base64 data URI inline」
- 「page-break は -webkit-page-break-\* プレフィクス併記必須、iOS / Android 互換」
- 「CSV は写真関連列を含めない、F-11 ZIP で完全分離 (機能分離原則)」
- 「3 段階フォールバック (full → reduced → tiny) で OOM / blank / hang 自動回復、シニア UX 向上」
- 「ストレージ事前チェック 100MB で失敗前にユーザー警告、フォールバック不可エラー」
- 「Design はあくまで下書き、ビジネス仕様は議論済 ADR が正、認識をはき違えない」
