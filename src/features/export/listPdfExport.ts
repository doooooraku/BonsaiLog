/**
 * F-10 list_pdf — 全盆栽リスト PDF HTML 純関数 (Phase I、Issue #33 / ADR-0016 AC2)。
 *
 * A4 縦 1 PDF で:
 * - 表紙 (タイトル + 出力日時 + 全 N 本サマリー)
 * - リスト (盆栽名 / 樹種 / 取得日 / events 件数)
 * - 統計 (総 events 件数 + 種別内訳 + 樹種内訳)
 *
 * 写真なし (テキストのみ) のため reducePhotoCountForAttempt の影響を受けず、
 * 1 attempt で確実に生成可能 (PDF 信頼性が最高)。
 *
 * 既存 pdfExport.ts (個別盆栽 PDF) と同じテンプレート規約を踏襲:
 * - DOCTYPE 必須
 * - CJK フォント明示
 * - page-break: WebKit プレフィクス併記
 */

import { escapeHtml } from './pdfExport';

/** リスト 1 行分の盆栽データ。 */
export type BonsaiListRow = {
  id: string;
  name: string;
  speciesName?: string | null;
  acquiredAt?: string | null;
  /** その盆栽の events 件数 (status='logged' のみ、呼出側で集計)。 */
  eventCount: number;
};

/** 統計セクションの集計データ。 */
export type ListPdfStats = {
  /** 全盆栽 events 総件数 (status='logged')。 */
  totalEvents: number;
  /** 種別 (event.type) 別の件数 (例: { watering: 100, fertilizing: 20, wiring: 5 })。 */
  typeBreakdown: Readonly<Record<string, number>>;
  /** 樹種 (species_name) 別の盆栽件数 (例: { '黒松': 5, '赤松': 3 })。 */
  speciesBreakdown: Readonly<Record<string, number>>;
};

/** i18n テキスト (UI 層から渡す)。 */
export type ListPdfTexts = {
  /** 表紙タイトル (例: 「BonsaiLog 全盆栽記録」)。 */
  coverTitle: string;
  /** 表紙サブタイトル (例: 「全 N 本」、placeholder {count} を含む)。 */
  coverSubtitleTemplate: string;
  /** 生成日時ラベル (例: 「生成日時:」)。 */
  generatedAtLabel: string;
  /** 生成日時の値 (例: '2026-05-03 12:34')、呼出側で formatLocalTimestamp 等を利用。 */
  generatedAtValue: string;
  /** リストセクション見出し。 */
  listSectionTitle: string;
  /** リスト table header (4 列): 名前 / 樹種 / 取得日 / 件数。 */
  listColumnName: string;
  listColumnSpecies: string;
  listColumnAcquiredAt: string;
  listColumnEventCount: string;
  /** 統計セクション見出し。 */
  statsSectionTitle: string;
  /** 「総件数」ラベル (例: 「総 events 件数: {count}」)。 */
  statsTotalLabel: string;
  /** 「種別内訳」ラベル。 */
  statsTypeBreakdownTitle: string;
  /** 「樹種内訳」ラベル。 */
  statsSpeciesBreakdownTitle: string;
  /** フッタ (例: 「BonsaiLog で生成」)。 */
  footerNote: string;
};

/** 統計セクション用に { key: count } を ['key (count)', ...] 配列に変換する純関数。 */
function formatBreakdown(breakdown: Readonly<Record<string, number>>): string[] {
  return Object.entries(breakdown)
    .sort((a, b) => b[1] - a[1]) // 件数降順
    .map(([key, count]) => `${escapeHtml(key)} (${count})`);
}

/**
 * list_pdf の HTML を生成する純関数。
 *
 * AC2 (5 種類エクスポートの 5 つ目): list_pdf A4 縦 表紙 + リスト + 統計。
 *
 * @param data 盆栽リスト + 統計
 * @param texts i18n テキスト
 */
export function buildBonsaiListPdfHtml(input: {
  bonsaiList: readonly BonsaiListRow[];
  stats: ListPdfStats;
  texts: ListPdfTexts;
}): string {
  const { bonsaiList, stats, texts } = input;
  const subtitle = texts.coverSubtitleTemplate.replace('{count}', String(bonsaiList.length));
  const totalText = texts.statsTotalLabel.replace('{count}', String(stats.totalEvents));
  const typeBreakdownItems = formatBreakdown(stats.typeBreakdown);
  const speciesBreakdownItems = formatBreakdown(stats.speciesBreakdown);

  const listRows = bonsaiList
    .map(
      (b) =>
        `<tr>
          <td>${escapeHtml(b.name)}</td>
          <td>${escapeHtml(b.speciesName ?? '')}</td>
          <td>${escapeHtml((b.acquiredAt ?? '').slice(0, 10))}</td>
          <td class="num">${b.eventCount}</td>
        </tr>`,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(texts.coverTitle)}</title>
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans CJK JP", "Yu Gothic", Meiryo, sans-serif;
    color: #1A1A1A;
    margin: 24px;
    -webkit-print-color-adjust: exact;
  }
  h1 { font-size: 24pt; margin: 0 0 12pt; }
  h2 { font-size: 16pt; margin: 24pt 0 8pt; page-break-after: avoid; -webkit-column-break-after: avoid; }
  h3 { font-size: 12pt; margin: 12pt 0 4pt; page-break-after: avoid; }
  .cover { text-align: center; padding: 60pt 0; page-break-after: always; -webkit-column-break-after: always; }
  .cover h1 { font-size: 28pt; margin: 0 0 16pt; }
  .cover .subtitle { font-size: 14pt; color: #666; margin: 0 0 24pt; }
  .cover .meta { font-size: 11pt; color: #888; }
  table { border-collapse: collapse; width: 100%; font-size: 10pt; margin: 8pt 0; }
  th, td { border: 1px solid #E0E0E0; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #F5F8F5; font-weight: 600; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .stats { font-size: 11pt; line-height: 1.7; }
  .stats .total { font-weight: 600; margin-bottom: 8pt; }
  .stats ul { padding-left: 20pt; margin: 4pt 0 12pt; }
  .footer { margin-top: 32pt; font-size: 9pt; color: #666; border-top: 1px solid #E0E0E0; padding-top: 6pt; }
</style>
</head>
<body>
  <div class="cover">
    <h1>${escapeHtml(texts.coverTitle)}</h1>
    <p class="subtitle">${escapeHtml(subtitle)}</p>
    <p class="meta">${escapeHtml(texts.generatedAtLabel)} ${escapeHtml(texts.generatedAtValue)}</p>
  </div>

  <h2>${escapeHtml(texts.listSectionTitle)}</h2>
  ${
    bonsaiList.length === 0
      ? '<p>―</p>'
      : `<table>
    <thead>
      <tr>
        <th>${escapeHtml(texts.listColumnName)}</th>
        <th>${escapeHtml(texts.listColumnSpecies)}</th>
        <th>${escapeHtml(texts.listColumnAcquiredAt)}</th>
        <th class="num">${escapeHtml(texts.listColumnEventCount)}</th>
      </tr>
    </thead>
    <tbody>
${listRows}
    </tbody>
  </table>`
  }

  <h2>${escapeHtml(texts.statsSectionTitle)}</h2>
  <div class="stats">
    <p class="total">${escapeHtml(totalText)}</p>

    <h3>${escapeHtml(texts.statsTypeBreakdownTitle)}</h3>
    ${
      typeBreakdownItems.length === 0
        ? '<p>―</p>'
        : `<ul>
${typeBreakdownItems.map((item) => `      <li>${item}</li>`).join('\n')}
    </ul>`
    }

    <h3>${escapeHtml(texts.statsSpeciesBreakdownTitle)}</h3>
    ${
      speciesBreakdownItems.length === 0
        ? '<p>―</p>'
        : `<ul>
${speciesBreakdownItems.map((item) => `      <li>${item}</li>`).join('\n')}
    </ul>`
    }
  </div>

  <p class="footer">${escapeHtml(texts.footerNote)}</p>
</body>
</html>`;
}
