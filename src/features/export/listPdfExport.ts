/**
 * F-10 list_pdf — 全盆栽リスト PDF HTML 純関数 (Phase I、Issue #33 / ADR-0016 AC2)。
 *
 * A4 縦 1 PDF で:
 * - 表紙 (タイトル + 出力日時 + 全 N 本サマリー)
 * - リスト (盆栽名 / 樹種 / 取得日 / events 件数)
 * - 統計 (総 events 件数 + 種別内訳 + 樹種内訳)
 *
 * 写真なし (テキストのみ) のため写真縮小フォールバックの影響を受けず、
 * 1 attempt で確実に生成可能 (PDF 信頼性が最高)。
 *
 * 既存 pdfExport.ts (個別盆栽 PDF) と同じテンプレート規約を踏襲:
 * - DOCTYPE 必須
 * - CJK フォント明示
 * - page-break: WebKit プレフィクス併記
 */

import { escapeHtml } from './pdfExport';
import type {
  BarDatum,
  CatalogEntry,
  ListReportBars,
  ListReportHeatmap,
  ListReportSummary,
} from './listPdfReport';

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

/** リッチレポート (表紙サマリー + 棒グラフ) 用の i18n テキスト (Phase 1)。 */
export type ListReportTextsP1 = {
  summaryBonsaiCount: string;
  summarySpeciesCount: string;
  summaryStyleCount: string;
  summaryTotalRecords: string;
  chartPerBonsai: string;
  chartSpecies: string;
  chartPerMonth: string;
};

/** ヒートマップ用の i18n テキスト (Phase 2)。 */
export type ListReportTextsHeatmap = {
  title: string;
  legend: string;
  legendLess: string;
  legendMore: string;
  monthTotal: string;
  topMonths: string;
  noData: string;
};

/** ヒートマップ ブロック (Phase 2、省略可)。 */
export type ListReportHeatmapBlock = {
  data: ListReportHeatmap;
  texts: ListReportTextsHeatmap;
};

/** カタログ用の i18n テキスト (Phase 3)。 */
export type ListReportTextsCatalog = {
  title: string;
  /** 「累計 {count} 件」テンプレ。 */
  totalRecords: string;
  /** 「入手日」ラベル。 */
  acquired: string;
};

/** カタログ 1 件 = 集計データ + attempt 別に注入されたカバー写真 (base64 data URI or null)。 */
export type CatalogPhotoEntry = CatalogEntry & { coverPhotoUri: string | null };

/** カタログ ブロック (Phase 3、省略可)。写真は呼出側で base64 化済み。 */
export type ListReportCatalogBlock = {
  entries: CatalogPhotoEntry[];
  texts: ListReportTextsCatalog;
};

/**
 * 表紙のリッチ化ブロック (Phase 1)。
 * 省略時は従来どおり「タイトル + リスト表 + 統計」のみ (後方互換)。
 */
export type ListReportBlock = {
  summary: ListReportSummary;
  bars: ListReportBars;
  texts: ListReportTextsP1;
  /** お世話ヒートマップ (Phase 2)。省略時は非表示。 */
  heatmap?: ListReportHeatmapBlock;
  /** 盆栽カタログ (Phase 3)。省略時は非表示。 */
  catalog?: ListReportCatalogBlock;
};

/** ヒートマップ色 5 段階 (緑単色の明度、色相 1 系統で色覚多様性配慮 + 達成バッジ感回避)。 */
const HEATMAP_LEVEL_COLOR: readonly string[] = [
  '#F5F5F0', // 0: 記録なし (ほぼ無色)
  '#DCE6DA', // 1: 少
  '#B4CDB0', // 2: やや少
  '#7FA877', // 3: やや多
  '#4F6B2A', // 4: 多 (ブランド緑)
];

/** YYYY-MM → 月ラベル (MM のみ、列幅節約)。 */
function monthLabelShort(month: string): string {
  return month.slice(5, 7);
}

/**
 * お世話ヒートマップ (木 × 月、色は件数の事実表示・凡例で明記、各マスに件数併記)。
 * 月軸が空 (期間に記録なし) は NoData メッセージのみ。
 */
function renderHeatmap(block: ListReportHeatmapBlock): string {
  const { data, texts } = block;
  if (data.months.length === 0 || data.rows.length === 0) {
    return `<h2>${escapeHtml(texts.title)}</h2>
  <p>${escapeHtml(texts.noData)}</p>`;
  }
  const headCells = data.months
    .map((m) => `<th class="hm-mon">${escapeHtml(monthLabelShort(m))}</th>`)
    .join('');
  const bodyRows = data.rows
    .map((r) => {
      const cells = r.cells
        .map((c) => {
          const color = HEATMAP_LEVEL_COLOR[c.level] ?? HEATMAP_LEVEL_COLOR[0];
          const text = c.count > 0 ? String(c.count) : '';
          return `<td class="hm-cell lv${c.level}" style="background:${color}">${text}</td>`;
        })
        .join('');
      return `<tr><td class="hm-name">${escapeHtml(r.name)}</td>${cells}</tr>`;
    })
    .join('\n');
  const totalCells = data.monthTotals.map((n) => `<td>${n}</td>`).join('');
  const swatches = HEATMAP_LEVEL_COLOR.map(
    (c) => `<span class="sw" style="background:${c}"></span>`,
  ).join('');
  const topMonthsText = data.topMonths
    .map((x) => `${escapeHtml(x.month)} (${x.count})`)
    .join(' · ');

  return `<h2>${escapeHtml(texts.title)}</h2>
  <table class="heatmap">
    <thead><tr><th class="hm-name"></th>${headCells}</tr></thead>
    <tbody>
${bodyRows}
      <tr class="hm-total"><td class="hm-name">${escapeHtml(texts.monthTotal)}</td>${totalCells}</tr>
    </tbody>
  </table>
  <div class="hm-legend">${escapeHtml(texts.legendLess)} ${swatches} ${escapeHtml(texts.legendMore)}<span class="hm-legend-note">${escapeHtml(texts.legend)}</span></div>
  ${topMonthsText ? `<p class="hm-top">${escapeHtml(texts.topMonths)}: ${topMonthsText}</p>` : ''}`;
}

/**
 * 盆栽カタログ (木ごとのカード)。カバー写真は base64 data URI (呼出側で注入済、信頼済)、
 * 無写真は CSS 単色プレースホルダー。各カードは page-break-inside: avoid で分断防止。
 */
function renderCatalog(block: ListReportCatalogBlock): string {
  if (block.entries.length === 0) return '';
  const cards = block.entries
    .map((e) => {
      const thumb = e.coverPhotoUri
        ? `<img src="${e.coverPhotoUri}" alt="" />`
        : '<div class="cat-ph"></div>';
      const metaParts = [e.speciesName, e.styleLabel]
        .filter((x): x is string => !!x)
        .map((x) => escapeHtml(x));
      const meta =
        metaParts.length > 0 ? `<div class="cat-meta">${metaParts.join(' · ')}</div>` : '';
      const subParts: string[] = [];
      if (e.acquiredAt) {
        subParts.push(`${escapeHtml(block.texts.acquired)}: ${escapeHtml(e.acquiredAt)}`);
      }
      subParts.push(escapeHtml(block.texts.totalRecords.replace('{count}', String(e.totalCount))));
      const chips = e.typeBreakdown
        .map((c) => `<span class="cat-chip">${escapeHtml(c.typeLabel)} ${c.count}</span>`)
        .join('');
      return `<div class="cat-card">
      <div class="cat-thumb">${thumb}</div>
      <div class="cat-body">
        <div class="cat-name">${escapeHtml(e.name)}</div>
        ${meta}
        <div class="cat-sub">${subParts.join(' · ')}</div>
        ${chips ? `<div class="cat-chips">${chips}</div>` : ''}
      </div>
    </div>`;
    })
    .join('\n');
  return `<h2>${escapeHtml(block.texts.title)}</h2>
  <div class="catalog">
${cards}
  </div>`;
}

/** サマリーカード 4 枚 (盆栽総数 / 樹種数 / 樹形数 / 通算記録)。 */
function renderSummaryCards(summary: ListReportSummary, texts: ListReportTextsP1): string {
  const card = (value: number, label: string): string =>
    `<div class="sumcard"><div class="sumval">${value}</div><div class="sumlabel">${escapeHtml(label)}</div></div>`;
  return `<div class="sumcards">
    ${card(summary.bonsaiCount, texts.summaryBonsaiCount)}
    ${card(summary.speciesCount, texts.summarySpeciesCount)}
    ${card(summary.styleCount, texts.summaryStyleCount)}
    ${card(summary.totalEvents, texts.summaryTotalRecords)}
  </div>`;
}

/** CSS 棒グラフ 1 種 (データ無しは何も描かない)。バー幅は pct% をインライン指定 (JS 不要)。 */
function renderBarChart(title: string, data: readonly BarDatum[]): string {
  if (data.length === 0) return '';
  const rows = data
    .map(
      (d) =>
        `<div class="bar-row">
        <span class="bar-label">${escapeHtml(d.label)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${d.pct}%"></span></span>
        <span class="bar-count">${d.count}</span>
      </div>`,
    )
    .join('\n');
  return `<div class="chart">
    <h3 class="chart-title">${escapeHtml(title)}</h3>
    ${rows}
  </div>`;
}

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
  /** 表紙のリッチ化 (サマリーカード + 棒グラフ)。省略時は従来の素レイアウト。 */
  report?: ListReportBlock;
}): string {
  const { bonsaiList, stats, texts, report } = input;
  const coverExtra = report
    ? renderSummaryCards(report.summary, report.texts) +
      renderBarChart(report.texts.chartPerBonsai, report.bars.perBonsai) +
      renderBarChart(report.texts.chartSpecies, report.bars.perSpecies) +
      renderBarChart(report.texts.chartPerMonth, report.bars.perMonth)
    : '';
  const heatmapHtml = report?.heatmap ? renderHeatmap(report.heatmap) : '';
  const catalogHtml = report?.catalog ? renderCatalog(report.catalog) : '';
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
  .cover { text-align: center; padding: 28pt 0 12pt; page-break-after: always; -webkit-column-break-after: always; }
  .cover h1 { font-size: 28pt; margin: 0 0 12pt; }
  .cover .subtitle { font-size: 14pt; color: #666; margin: 0 0 8pt; }
  .cover .meta { font-size: 11pt; color: #888; margin: 0 0 20pt; }
  .sumcards { display: flex; flex-wrap: wrap; gap: 8pt; text-align: left; margin: 0 0 18pt; }
  .sumcard { flex: 1 1 44%; border: 1px solid #E0E0E0; border-radius: 6px; padding: 10pt 12pt; }
  .sumval { font-size: 22pt; font-weight: 700; color: #1F3A2E; font-variant-numeric: tabular-nums; }
  .sumlabel { font-size: 10pt; color: #666; margin-top: 2pt; }
  .chart { text-align: left; margin: 0 0 14pt; page-break-inside: avoid; -webkit-column-break-inside: avoid; }
  .chart-title { font-size: 12pt; margin: 0 0 6pt; }
  .bar-row { display: flex; align-items: center; gap: 6pt; margin: 3pt 0; font-size: 9pt; }
  .bar-label { width: 34%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bar-track { flex: 1; height: 10pt; background: #EFEAE4; border-radius: 2px; overflow: hidden; }
  .bar-fill { display: block; height: 100%; background: #4F6B2A; border-radius: 2px; min-width: 1px; }
  .bar-count { width: 46pt; text-align: right; font-variant-numeric: tabular-nums; color: #444; }
  table.heatmap { border-collapse: collapse; width: 100%; font-size: 7pt; table-layout: fixed; margin: 8pt 0; }
  table.heatmap th, table.heatmap td { border: 1px solid #FFFFFF; padding: 2pt 0; text-align: center; font-variant-numeric: tabular-nums; }
  table.heatmap th.hm-mon { color: #888; font-weight: 500; background: transparent; }
  table.heatmap .hm-name { width: 24%; text-align: left; font-size: 8pt; border: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 4pt; }
  table.heatmap .hm-cell { color: #1A1A1A; }
  table.heatmap .hm-cell.lv3, table.heatmap .hm-cell.lv4 { color: #FFFFFF; }
  table.heatmap .hm-total td { font-weight: 600; background: #F5F5F0; color: #444; }
  .hm-legend { display: flex; align-items: center; gap: 4pt; flex-wrap: wrap; font-size: 8pt; color: #666; margin-top: 6pt; }
  .hm-legend .sw { width: 12pt; height: 12pt; border-radius: 2px; display: inline-block; }
  .hm-legend-note { margin-left: 8pt; }
  .hm-top { font-size: 9pt; color: #444; margin-top: 6pt; }
  .catalog { margin: 8pt 0; }
  .cat-card { display: flex; gap: 10pt; border: 1px solid #E0E0E0; border-radius: 6px; padding: 8pt; margin: 0 0 8pt; page-break-inside: avoid; -webkit-column-break-inside: avoid; }
  .cat-thumb { width: 64pt; height: 64pt; flex-shrink: 0; border-radius: 4px; overflow: hidden; background: #E0E0E0; }
  .cat-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .cat-ph { width: 100%; height: 100%; background: #E0E0E0; }
  .cat-body { flex: 1; min-width: 0; }
  .cat-name { font-size: 12pt; font-weight: 600; }
  .cat-meta { font-size: 9pt; color: #666; margin-top: 1pt; }
  .cat-sub { font-size: 9pt; color: #888; margin-top: 2pt; }
  .cat-chips { margin-top: 4pt; }
  .cat-chip { display: inline-block; font-size: 8pt; background: #EFEAE4; color: #5A4637; border-radius: 3px; padding: 1pt 5pt; margin: 0 3pt 3pt 0; }
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
    ${coverExtra}
  </div>

  ${heatmapHtml}

  ${catalogHtml}

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
