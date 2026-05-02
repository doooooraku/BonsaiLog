/**
 * F-10 Phase B — PDF エクスポート (Issue #33 / ADR-0016)。
 *
 * Phase B (本 PR): 個別盆栽 PDF の HTML 純関数 + 生成サービス
 *  - HTML テンプレートは純関数 (Jest テスト容易)
 *  - PDF 生成は expo-print printToFileAsync、共有は expo-sharing shareAsync
 *  - Pro 限定 (呼出側 UI で useProStore.isPro guard)
 *
 * Phase C 以降スコープ (Repolog 流用):
 *  - 全盆栽リスト PDF (表紙 + リスト + 統計)
 *  - 写真 base64 inline (iOS WKWebView 制約)
 *  - 3 段階フォールバック (full → reduced → tiny)
 *  - 動的タイムアウト + 進捗バー
 *  - フォント解決 (CJK 明示、絵文字 system 任せ)
 *  - PDF 7 画面構成
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { Bonsai, Event } from '@/src/db/schema';

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
};

/**
 * 個別盆栽 PDF の HTML 純関数。
 *
 * - DOCTYPE 必須 (iOS WKWebView 制約、ADR-0016)
 * - CJK フォント明示 (フォント埋込なし、Repolog Issue #292 教訓)
 * - 写真は Phase C で base64 inline 追加
 * - page-break: WebKit プレフィクス併記
 */
export function buildBonsaiPdfHtml(input: BonsaiPdfData & BonsaiPdfTexts): string {
  const {
    bonsai,
    speciesCommonName,
    events,
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
 * - 失敗は throw (UI 層で catch して i18n エラー表示)
 * - 一時ファイルパスは expo-print が cacheDirectory に作成、共有後の削除は OS 任せ
 */
export async function generateAndShareBonsaiPdf(
  html: string,
  shareDialogTitle: string,
): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: shareDialogTitle });
  }
}
