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

import type { Bonsai, Event } from '@/src/db/schema';

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

export type BonsaiPdfTexts = {
  /** PDF タイトル (例: 「盆栽記録」)。 */
  title: string;
  /** ラベル: 樹種 / 樹形 / 取得日 / 作業履歴 (table header)。 */
  labelSpecies: string;
  labelStyle: string;
  labelAcquiredAt: string;
  labelEventsTitle: string;
  /** 作業履歴ヘッダ。 */
  labelEventDate: string;
  labelEventType: string;
  labelEventNote: string;
  /** フッタ (ページ番号無、生成元アプリ名等)。 */
  footerNote: string;
};

export type BonsaiPdfData = {
  bonsai: Pick<Bonsai, 'name' | 'style' | 'acquiredAt'>;
  speciesCommonName?: string | null;
  events: readonly Pick<Event, 'occurredAtUtc' | 'type' | 'note'>[];
  /** Phase C: 写真の data: URI 配列 (base64 inline)。空 / 未指定なら写真セクション非表示。 */
  photoDataUris?: readonly string[];
  /** Phase C: 写真セクションのラベル (H2 見出し)。 */
  labelPhotosTitle?: string;
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
 * 個別盆栽 PDF の HTML 純関数。
 *
 * - DOCTYPE 必須 (iOS WKWebView 制約、ADR-0016)
 * - CJK フォント明示 (フォント埋込なし、Repolog Issue #292 教訓)
 * - Phase C: 写真は base64 inline (data: URI) で <img> 描画
 * - page-break: WebKit プレフィクス併記
 */
export function buildBonsaiPdfHtml(input: BonsaiPdfData & BonsaiPdfTexts): string {
  const {
    bonsai,
    speciesCommonName,
    events,
    photoDataUris,
    labelPhotosTitle,
    title,
    labelSpecies,
    labelStyle,
    labelAcquiredAt,
    labelEventsTitle,
    labelEventDate,
    labelEventType,
    labelEventNote,
    footerNote,
  } = input;

  const photosHtml =
    photoDataUris && photoDataUris.length > 0 && labelPhotosTitle
      ? `<h2>${escapeHtml(labelPhotosTitle)}</h2>
  <div class="photos">
${photoDataUris.map((uri) => `    <img src="${uri}" alt="" />`).join('\n')}
  </div>`
      : '';

  const eventRows = events
    .map(
      (e) =>
        `<tr>
          <td>${escapeHtml(e.occurredAtUtc.slice(0, 10))}</td>
          <td>${escapeHtml(e.type)}</td>
          <td>${escapeHtml(e.note ?? '')}</td>
        </tr>`,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans CJK JP", "Yu Gothic", Meiryo, sans-serif;
    color: #1A1A1A;
    margin: 24px;
    -webkit-print-color-adjust: exact;
  }
  h1 { font-size: 20pt; margin: 0 0 12pt; }
  h2 { font-size: 14pt; margin: 16pt 0 8pt; page-break-after: avoid; -webkit-column-break-after: avoid; }
  table { border-collapse: collapse; width: 100%; font-size: 10pt; }
  th, td { border: 1px solid #E0E0E0; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #F5F8F5; font-weight: 600; }
  .meta { font-size: 11pt; line-height: 1.6; }
  .meta dt { font-weight: 600; float: left; width: 5em; }
  .meta dd { margin: 0 0 4pt 5em; }
  .photos { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8pt; page-break-inside: avoid; -webkit-column-break-inside: avoid; }
  .photos img { width: 30%; max-width: 200px; height: auto; border-radius: 4px; border: 1px solid #E0E0E0; }
  .footer { margin-top: 24pt; font-size: 9pt; color: #666; border-top: 1px solid #E0E0E0; padding-top: 6pt; }
</style>
</head>
<body>
  <h1>${escapeHtml(bonsai.name)}</h1>
  <dl class="meta">
    ${speciesCommonName ? `<dt>${escapeHtml(labelSpecies)}</dt><dd>${escapeHtml(speciesCommonName)}</dd>` : ''}
    ${bonsai.style ? `<dt>${escapeHtml(labelStyle)}</dt><dd>${escapeHtml(bonsai.style)}</dd>` : ''}
    ${bonsai.acquiredAt ? `<dt>${escapeHtml(labelAcquiredAt)}</dt><dd>${escapeHtml(bonsai.acquiredAt.slice(0, 10))}</dd>` : ''}
  </dl>

  ${photosHtml}

  <h2>${escapeHtml(labelEventsTitle)}</h2>
  ${
    events.length === 0
      ? '<p>―</p>'
      : `<table>
    <thead>
      <tr>
        <th>${escapeHtml(labelEventDate)}</th>
        <th>${escapeHtml(labelEventType)}</th>
        <th>${escapeHtml(labelEventNote)}</th>
      </tr>
    </thead>
    <tbody>
${eventRows}
    </tbody>
  </table>`
  }

  <p class="footer">${escapeHtml(footerNote)}</p>
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
