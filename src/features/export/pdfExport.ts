/**
 * F-10 Phase B/C — PDF エクスポート (Issue #33 / ADR-0016)。
 *
 * Phase B: 個別盆栽 PDF の HTML 純関数 + 生成サービス (テキストのみ)
 * Phase C (本 PR): 写真 base64 inline (iOS WKWebView 制約)
 *  - readPhotoAsBase64 で file URI → base64 → data: URI
 *  - HTML テンプレートに <img> セクションを追加
 *
 * Phase D 以降:
 *  - 全盆栽リスト PDF (表紙 + リスト + 統計)
 *  - 3 段階フォールバック (full → reduced → tiny、Repolog Issue #298 教訓)
 *  - 動的タイムアウト + 進捗バー
 *  - フォント解決 (CJK 明示、絵文字 system 任せ) の完全実装
 *  - PDF 7 画面構成 UI
 */

import * as LegacyFileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { BonsaiPdfReportData } from './bonsaiPdfReport';
import {
  PdfHangError,
  assertPdfLooksValid,
  calculatePdfTimeout,
  reducePhotoCountForAttempt,
  runWithFallback,
  type AttemptNumber,
} from './pdfReliability';

/** HTML エスケープ純関数 (XSS 対策、PDF テンプレート用)。 */
export function escapeHtml(value: string | null | undefined): string {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 個別盆栽 PDF レポートの表示ラベル群 (すべてローカライズ済み文字列)。
 * 値そのもの (樹種名 / チップ等) は BonsaiPdfReportData 側に入る (bonsaiPdfReport.ts)。
 */
export type BonsaiPdfTexts = {
  /** PDF ドキュメントの <title>。 */
  title: string;
  /** 個票メタの field 名ラベル。 */
  labelSpecies: string;
  labelStyle: string;
  labelAge: string;
  labelAcquiredAt: string;
  labelAcquiredFrom: string;
  labelPot: string;
  labelTags: string;
  /** メモ (来歴) セクション見出し。 */
  memoTitle: string;
  /** 病害虫・対処セクション見出し + 表ヘッダ。 */
  pestSectionTitle: string;
  pestColDate: string;
  pestColSymptom: string;
  pestColNote: string;
  /** 作業ログ セクション見出し + 0 件表示。 */
  worklogTitle: string;
  worklogEmpty: string;
  /** その他写真ギャラリー見出し。 */
  photosTitle: string;
};

/**
 * Phase C: 写真ファイルを読み込んで data:image/jpeg;base64,... 形式の URI を返す。
 *
 * iOS WKWebView は file:// 直接参照で写真が表示されないため、base64 inline 必須 (ADR-0016)。
 * BonsaiLog の写真はすべて jpg (F-08 仕様、photoFileService) のため image/jpeg 固定。
 *
 * @param absoluteUri 写真の絶対 URI (PhotoRead.absoluteUri)
 * @returns 失敗時は null (UI 層で「写真が見つからない場合は無視」)
 */
export async function readPhotoAsBase64(absoluteUri: string): Promise<string | null> {
  try {
    const base64 = await LegacyFileSystem.readAsStringAsync(absoluteUri, {
      encoding: LegacyFileSystem.EncodingType.Base64,
    });
    return `data:image/jpeg;base64,${base64}`;
  } catch {
    return null;
  }
}

/**
 * 個別盆栽 PDF の HTML 純関数 (Sess49 適応型エンリッチ、ADR-0016)。
 *
 * - 入力は事前ローカライズ済の構造化データ (bonsaiPdfReport.buildBonsaiPdfReport) + ラベル
 * - DOCTYPE 必須 (iOS WKWebView 制約) / CJK フォント明示 (フォント埋込なし、Issue #292)
 * - 写真は base64 inline (data: URI) / light 固定 (印刷物)
 * - multi-page 固定でなく 1 ドキュメントフロー + section の page-break-inside:avoid で iOS 分断回避
 * - 適応型: 値の無い meta 行・セクションは出力しない (空欄/「―」だらけ回避)
 */
export function buildBonsaiPdfHtml(report: BonsaiPdfReportData, texts: BonsaiPdfTexts): string {
  const { meta, coverPhotoUri, coverPhotoCaption, pestEvents, timeline, gallery } = report;
  const esc = escapeHtml;
  const multiline = (s: string) => esc(s).replace(/\n/g, '<br/>');

  const sublineParts = [meta.speciesName, meta.styleLabel, meta.ageText].filter(
    (s): s is string => !!s,
  );
  const sublineHtml = sublineParts.length
    ? `<div class="subline">${sublineParts.map(esc).join(' · ')}</div>`
    : '';

  const metaRow = (label: string, value?: string) =>
    value
      ? `<div class="m-row"><span class="m-key">${esc(label)}</span><span class="m-val">${esc(value)}</span></div>`
      : '';

  const tagsHtml = meta.tags.length
    ? `<div class="m-row"><span class="m-key">${esc(texts.labelTags)}</span><span class="m-val">${meta.tags
        .map((tg) => `<span class="tag">${esc(tg)}</span>`)
        .join(' ')}</span></div>`
    : '';

  const metaHtml = `<div class="meta">
    ${metaRow(texts.labelSpecies, meta.speciesName)}
    ${metaRow(texts.labelStyle, meta.styleLabel)}
    ${metaRow(texts.labelAge, meta.ageText)}
    ${metaRow(texts.labelAcquiredAt, meta.acquiredText)}
    ${metaRow(texts.labelAcquiredFrom, meta.acquiredFrom)}
    ${metaRow(texts.labelPot, meta.potText)}
    ${tagsHtml}
  </div>`;

  const coverHtml = coverPhotoUri
    ? `<div class="cover"><img src="${coverPhotoUri}" alt="" />${
        coverPhotoCaption ? `<div class="cover-cap">${esc(coverPhotoCaption)}</div>` : ''
      }</div>`
    : '';

  const heroHtml = `<section class="hero${coverPhotoUri ? '' : ' no-cover'}">${coverHtml}${metaHtml}</section>`;

  const memoHtml = meta.memo
    ? `<section class="block"><h2>${esc(texts.memoTitle)}</h2><div class="memo">${multiline(meta.memo)}</div></section>`
    : '';

  const pestHtml = pestEvents.length
    ? `<section class="block"><h2>${esc(texts.pestSectionTitle)}</h2>
  <table class="pest"><thead><tr><th>${esc(texts.pestColDate)}</th><th>${esc(texts.pestColSymptom)}</th><th>${esc(texts.pestColNote)}</th></tr></thead><tbody>
${pestEvents
  .map(
    (p) =>
      `    <tr><td class="nowrap">${esc(p.date)}</td><td>${esc(p.symptomBodyPart)}</td><td>${esc(p.note ?? '')}</td></tr>`,
  )
  .join('\n')}
  </tbody></table></section>`
    : '';

  const entryHtml = (e: BonsaiPdfReportData['timeline'][number]) => {
    const chips = e.chips.length
      ? `<div class="chips">${e.chips.map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</div>`
      : '';
    const note = e.note ? `<div class="entry-note">${multiline(e.note)}</div>` : '';
    const photos = e.photoUris.length
      ? `<div class="entry-photos">${e.photoUris.map((u) => `<img src="${u}" alt="" />`).join('')}</div>`
      : '';
    return `<div class="entry">
      <div class="entry-date">${esc(e.date)}</div>
      <div class="entry-main"><span class="badge" style="background:${e.badgeBg};color:${e.badgeFg}">${esc(e.typeLabel)}</span>${chips}${note}</div>
      ${photos}
    </div>`;
  };

  const worklogHtml = `<section class="block"><h2>${esc(texts.worklogTitle)}</h2>${
    timeline.length
      ? `<div class="timeline">
${timeline.map(entryHtml).join('\n')}
  </div>`
      : `<p class="empty">―</p>`
  }</section>`;

  const galleryHtml = gallery.length
    ? `<section class="block"><h2>${esc(texts.photosTitle)}</h2><div class="photos">${gallery
        .map((u) => `<img src="${u}" alt="" />`)
        .join('')}</div></section>`
    : '';

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<title>${esc(texts.title)}</title>
<style>
  @page { size: A4 portrait; margin: 14mm 12mm 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans CJK JP", "Noto Sans JP", "Yu Gothic", Meiryo, sans-serif;
    color: #1A1A1A;
    background: #FBFAF6;
    margin: 0; padding: 20px 22px;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  /* ランニングヘッダー: table の thead を使い印刷時に各ページ先頭で自動繰り返し (iOS/Android 両対応) */
  table.doc { width: 100%; border-collapse: collapse; }
  /* 余白を thead セル自体 (繰り返される側) に内蔵し、改ページ直後でもヘッダーと本文が被らない */
  .rhead { padding: 0 0 14px; text-align: left; }
  .rhead-bar { font-size: 8pt; letter-spacing: 0.12em; color: #7A7460; text-transform: uppercase; }
  .doc-body { padding-top: 2px; }
  h1 { font-size: 22pt; margin: 0 0 2pt; font-weight: 600; }
  .subline { font-size: 9.5pt; color: #5A5A5A; margin-bottom: 14px; }
  h2 { font-size: 12pt; margin: 16pt 0 7pt; padding-bottom: 2pt; border-bottom: 0.5px solid #1A1A1A; color: #5A4637; page-break-after: avoid; -webkit-column-break-after: avoid; }
  .block { page-break-inside: avoid; -webkit-column-break-inside: avoid; }
  .hero { display: flex; gap: 16px; align-items: flex-start; page-break-inside: avoid; -webkit-column-break-inside: avoid; }
  .cover { flex: 0 0 40%; }
  .cover img { width: 100%; height: auto; border-radius: 4px; border: 1px solid #C9C2AE; }
  .cover-cap { font-size: 8pt; color: #7A7460; margin-top: 4px; }
  .meta { flex: 1; font-size: 10pt; line-height: 1.5; }
  .m-row { display: flex; gap: 8px; padding: 2px 0; border-bottom: 1px dotted #D9D1BF; }
  .m-key { color: #7A7460; flex: 0 0 5.5em; }
  .m-val { color: #1A1A1A; font-weight: 500; flex: 1; }
  .tag { display: inline-block; background: #EDEADF; border-radius: 3px; padding: 0 5px; margin: 0 2px 2px 0; font-size: 9pt; }
  .memo { font-size: 9.5pt; line-height: 1.7; }
  table.pest { border-collapse: collapse; width: 100%; font-size: 9pt; }
  table.pest th, table.pest td { border: 1px solid #E0E0E0; padding: 5px 7px; text-align: left; vertical-align: top; }
  table.pest th { background: #F2EBD6; font-weight: 600; }
  td.nowrap { white-space: nowrap; }
  .timeline { display: flex; flex-direction: column; }
  .entry { display: flex; gap: 10px; padding: 7px 0; border-bottom: 0.5px solid #E8E2D2; align-items: flex-start; page-break-inside: avoid; -webkit-column-break-inside: avoid; }
  .entry-date { flex: 0 0 5.5em; font-size: 9pt; font-weight: 600; padding-top: 2px; }
  .entry-main { flex: 1; min-width: 0; }
  .badge { display: inline-block; padding: 1px 7px; border-radius: 3px; font-size: 9pt; font-weight: 500; }
  /* チップは縦 1 列 (1 行 1 チップ、各チップは内容幅) */
  .chips { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; margin-top: 4px; }
  .chip { display: inline-block; background: rgba(31,58,46,0.06); border-radius: 3px; padding: 1px 6px; font-size: 8.5pt; }
  .entry-note { font-size: 9pt; color: #1A1A1A; margin-top: 4px; line-height: 1.5; }
  .entry-photos { flex: 0 0 auto; display: flex; gap: 4px; }
  .entry-photos img { width: 56px; height: 56px; object-fit: cover; border-radius: 3px; border: 1px solid #C9C2AE; }
  /* ギャラリー写真は縦 1 列・幅いっぱい (縦横比保持・切り抜きなし、A4 幅はみ出し防止に上限) */
  .photos { display: flex; flex-direction: column; gap: 10px; }
  .photos img { width: 100%; max-width: 480px; height: auto; border-radius: 4px; border: 1px solid #C9C2AE; }
  .empty { color: #7A7460; }
</style>
</head>
<body>
  <table class="doc">
  <thead>
    <tr><td class="rhead"><div class="rhead-bar">BonsaiLog</div></td></tr>
  </thead>
  <tbody>
    <tr><td class="doc-body">
  <h1>${esc(meta.name)}</h1>
  ${sublineHtml}
  ${heroHtml}
  ${memoHtml}
  ${pestHtml}
  ${worklogHtml}
  ${galleryHtml}
    </td></tr>
  </tbody>
  </table>
</body>
</html>`;
}

/**
 * HTML から PDF ファイルを生成し、Share Sheet を起動する。
 *
 * Phase E (Issue #33): pdfReliability 純関数を配線
 * - calculatePdfTimeout で動的タイムアウト (Promise.race で強制中断、AC6)
 * - assertPdfLooksValid で 1024 byte 未満の空 PDF を BlankPdfError 検出 (AC8-1)
 * - PdfHangError でタイムアウト時の明確なエラー型 (AC8-2)
 * - 失敗は throw (UI 層で catch、attempt loop は呼出側で実装、AC5)
 *
 * @param html PDF にレンダリングする HTML 文字列
 * @param shareDialogTitle Share Sheet のタイトル
 * @param options.photoCount 写真件数 (動的タイムアウトの加算用、default 0)
 * @param options.attempt 1/2/3 (default 1、attempt 1 のみ 10s キャップ)
 */
export async function generateAndShareBonsaiPdf(
  html: string,
  shareDialogTitle: string,
  options: { photoCount?: number; attempt?: AttemptNumber } = {},
): Promise<void> {
  const photoCount = options.photoCount ?? 0;
  const attempt: AttemptNumber = options.attempt ?? 1;
  const timeoutMs = calculatePdfTimeout(photoCount, attempt);

  const printPromise = Print.printToFileAsync({ html });
  const timeoutPromise = new Promise<{ uri: string }>((_, reject) => {
    setTimeout(() => reject(new PdfHangError(timeoutMs, attempt)), timeoutMs);
  });

  const { uri } = await Promise.race([printPromise, timeoutPromise]);

  // AC8-4: 1024 byte 未満は BlankPdfError → 上位層で次 attempt にフォールバック可能
  const info = await LegacyFileSystem.getInfoAsync(uri);
  if (info.exists && typeof (info as { size?: number }).size === 'number') {
    assertPdfLooksValid((info as { size: number }).size);
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: shareDialogTitle });
  }
}

/**
 * Phase H (Issue #33): 3 段階フォールバック付き PDF 生成 + 共有 (AC5 完全対応)。
 *
 * Phase E + F + G の純関数を統合した薄いラッパー:
 * 1. attempt 毎に reducePhotoCountForAttempt で写真件数を縮小
 * 2. buildHtml(photos) で attempt 専用 HTML を生成
 * 3. generateAndShareBonsaiPdf で印刷 + サイズ検証 + 共有
 * 4. BlankPdfError / PdfHangError なら次 attempt へ (runWithFallback)
 * 5. PdfStorageLowError 等 fallback 不可エラーは即時 throw
 *
 * UI 層は本関数を 1 回呼ぶだけで AC5 全機能 (3 段階自動再試行 + エラー分岐) が動く。
 *
 * @param params.buildHtml attempt 別の写真配列を受け取り、HTML を返す関数
 * @param params.photoDataUris 全写真の data URI 配列 (attempt 1 で使用)
 * @param params.shareDialogTitle Share Sheet タイトル
 * @param params.attempts 試行 attempt 配列 (default [1, 2, 3])
 *
 * @returns 採用された attempt 番号 (UI 層で「写真を縮小して PDF を生成しました」等の表示に利用可)
 */
export async function generateBonsaiPdfWithFallback(params: {
  buildHtml: (photoUris: readonly string[]) => string;
  photoDataUris: readonly string[];
  shareDialogTitle: string;
  attempts?: readonly AttemptNumber[];
}): Promise<{ attemptUsed: AttemptNumber }> {
  const attempts = params.attempts ?? ([1, 2, 3] as const);

  const result = await runWithFallback(attempts, async (attempt) => {
    const photos = reducePhotoCountForAttempt(params.photoDataUris, attempt);
    const html = params.buildHtml(photos);
    await generateAndShareBonsaiPdf(html, params.shareDialogTitle, {
      photoCount: photos.length,
      attempt,
    });
    return undefined;
  });

  return { attemptUsed: result.attemptUsed };
}

/**
 * Phase J (Issue #33): list_pdf 用統合 API (Issue #33 AC2 list_pdf)。
 *
 * 写真なし (テキストのみ) のため 3 段階フォールバック不要、attempt 2 (30s ベース) で
 * 1 回だけ実行 (リスト件数多くてもテキストのみなので 30s で十分)。
 *
 * UI 層は呼出側で `buildBonsaiListPdfHtml` で HTML を組み立て、本関数に渡す。
 *
 * @param html buildBonsaiListPdfHtml で生成した HTML
 * @param shareDialogTitle Share Sheet タイトル
 */
export async function generateAndShareListPdf(
  html: string,
  shareDialogTitle: string,
): Promise<void> {
  await generateAndShareBonsaiPdf(html, shareDialogTitle, {
    photoCount: 0,
    attempt: 2, // attempt 1 は 10s キャップだが list は 100 本以上で時間かかる、安全のため 2
  });
}
