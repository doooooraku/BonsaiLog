/**
 * F-10 list_pdf — 全盆栽リスト PDF HTML 純関数 (Issue #33 / ADR-0016)。
 *
 * ClaudeDesign モックアップ「PDF List Report」(washi 和紙デザイン) に忠実化 (Sess51):
 * - 個別盆栽 PDF (pdfExport.buildBonsaiPdfHtml) と同じ shell を流用
 *   = `@page` / 和紙地 (#FBFAF6) / `table.doc>thead` ランニングヘッダー (各ページ先頭で自動繰返)。
 * - 見出し/数値 = 明朝 (serif)、ラベル/件数/ブランド = mono、本文 = sans (tokens.css SoT)。
 * - 配色は tokens.css: 深緑 accent #1F3A2E / 和紙 #FBFAF6 / bar track #F0EBDB / 罫線 #C9C2AE。
 * - フォント埋込なし (system 委譲、ADR-0016 / Issue #292)。グラフ/ヒートマップは純CSS
 *   (WebView JS 無効 + expo-print)。棒=div幅%、月別=縦棒、ヒートマップ=td 背景 rgba 連続濃淡。
 *
 * 構成 (モック 4 ページ相当、データ量で自然改ページ):
 * - 表紙: ブランドバンド + 明朝タイトル + 4 タイル(1枚目=深緑) + 棒(盆栽別/樹種) + 月別縦棒
 * - お世話ヒートマップ: 木×月 連続濃淡 + 件数併記 + 月計 + 凡例(事実表示明記、ADR-0039 例外)
 * - 盆栽カタログ: カバー写真(無は和紙placeholder) + 明朝名 + 累計 + 樹種/樹形/入手 + 作業内訳2列ミニ棒
 *
 * データ I/F (listPdfReport.ts の純関数出力) は不変。HTML 層のみ刷新。
 */

import { escapeHtml } from './pdfExport';
import type {
  BarDatum,
  CatalogEntry,
  ListReportBars,
  ListReportHeatmap,
  ListReportSummary,
} from './listPdfReport';

/** i18n テキスト (表紙のラベル群、UI 層から渡す)。 */
export type ListPdfTexts = {
  /** 表紙タイトル (明朝、例「BonsaiLog 全盆栽記録」)。 */
  coverTitle: string;
  /** 表紙サブタイトル (例「全 N 本」、placeholder {count})。 */
  coverSubtitleTemplate: string;
  /** 生成日時の値 (例 '2026-05-03 12:34')。 */
  generatedAtValue: string;
  /** フッタ (例「BonsaiLog で生成」)。 */
  footerNote: string;
};

/** リッチレポート (表紙サマリー + 棒グラフ) 用の i18n テキスト。 */
export type ListReportTextsP1 = {
  summaryBonsaiCount: string;
  summarySpeciesCount: string;
  summaryStyleCount: string;
  summaryTotalRecords: string;
  chartPerBonsai: string;
  chartSpecies: string;
  chartPerMonth: string;
};

/** ヒートマップ用の i18n テキスト。 */
export type ListReportTextsHeatmap = {
  title: string;
  legend: string;
  legendLess: string;
  legendMore: string;
  monthTotal: string;
  topMonths: string;
  noData: string;
};

/** ヒートマップ ブロック (省略可)。 */
export type ListReportHeatmapBlock = {
  data: ListReportHeatmap;
  texts: ListReportTextsHeatmap;
};

/** カタログ用の i18n テキスト。 */
export type ListReportTextsCatalog = {
  title: string;
  /** 「累計 {count} 件」テンプレ。 */
  totalRecords: string;
  /** 「入手」ラベル。 */
  acquired: string;
};

/** カタログ 1 件 = 集計データ + attempt 別に注入されたカバー写真 (base64 data URI or null)。 */
export type CatalogPhotoEntry = CatalogEntry & { coverPhotoUri: string | null };

/** カタログ ブロック (省略可)。写真は呼出側で base64 化済み。 */
export type ListReportCatalogBlock = {
  entries: CatalogPhotoEntry[];
  texts: ListReportTextsCatalog;
};

/** 表紙サマリー + 棒グラフ + ヒートマップ + カタログ をまとめたリッチレポート。 */
export type ListReportBlock = {
  summary: ListReportSummary;
  bars: ListReportBars;
  texts: ListReportTextsP1;
  heatmap?: ListReportHeatmapBlock;
  catalog?: ListReportCatalogBlock;
};

/** 数値に 3 桁区切りを付ける (例 2095 → 2,095)。 */
function group(n: number): string {
  return n.toLocaleString('en-US');
}

/** 表紙の 4 タイル (盆栽総数 / 樹種数 / 樹形数 / 通算記録)。1 枚目だけ深緑塗り (mockup 整合)。 */
function renderSummaryTiles(summary: ListReportSummary, texts: ListReportTextsP1): string {
  const tile = (value: number, label: string, lead: boolean): string =>
    `<div class="tile${lead ? ' lead' : ''}">
      <div class="t-label">${escapeHtml(label)}</div>
      <div class="t-val">${group(value)}</div>
    </div>`;
  return `<div class="tiles">
    ${tile(summary.bonsaiCount, texts.summaryBonsaiCount, true)}
    ${tile(summary.speciesCount, texts.summarySpeciesCount, false)}
    ${tile(summary.styleCount, texts.summaryStyleCount, false)}
    ${tile(summary.totalEvents, texts.summaryTotalRecords, false)}
  </div>`;
}

/** 横棒グラフ 1 種 (盆栽別 / 樹種)。track #F0EBDB + fill 深緑 + 件数 mono。データ無しは非表示。 */
function renderBarChart(title: string, data: readonly BarDatum[]): string {
  if (data.length === 0) return '';
  const rows = data
    .map(
      (d) =>
        `<div class="bar-row">
        <span class="bar-label">${escapeHtml(d.label)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${d.pct}%"></span></span>
        <span class="bar-count">${group(d.count)}</span>
      </div>`,
    )
    .join('\n');
  return `<div class="chart">
    <div class="sec-h"><span>${escapeHtml(title)}</span></div>
    ${rows}
  </div>`;
}

/** 月別記録数 = 縦棒スパークライン (mockup 整合)。データ無しは非表示。 */
function renderMonthlyBars(title: string, data: readonly BarDatum[]): string {
  if (data.length === 0) return '';
  const max = data.reduce((m, d) => Math.max(m, d.count), 0);
  const cols = data
    .map((d) => {
      const h = max > 0 ? Math.round((d.count / max) * 100) : 0;
      return `<span class="m-col"><span class="m-bar" style="height:${h}%"></span></span>`;
    })
    .join('');
  const axis = data.map((d) => `<span>${escapeHtml(d.label.slice(5, 7))}</span>`).join('');
  return `<div class="chart">
    <div class="sec-h"><span>${escapeHtml(title)}</span></div>
    <div class="months">${cols}</div>
    <div class="m-axis">${axis}</div>
  </div>`;
}

/** 凡例見本の 5 段階透明度 (連続濃淡の代表値)。 */
const HEATMAP_LEGEND_ALPHAS = [0.18, 0.32, 0.46, 0.6, 0.78];

/** セル件数 → 背景色 (深緑 accent の連続透明度、0 件は淡和紙)。 */
function heatmapCellBg(count: number, maxCell: number): string {
  if (count <= 0) return '#F4F1E8';
  const ratio = maxCell > 0 ? count / maxCell : 0;
  const alpha = (0.15 + ratio * 0.7).toFixed(2);
  return `rgba(31, 58, 46, ${alpha})`;
}

/**
 * お世話ヒートマップ (木 × 月、連続濃淡 + 各マス件数併記)。色は件数の事実表示で、凡例に
 * 「達成度ではなく事実」 を明記 (ADR-0039 例外根拠)。月軸が空は NoData のみ。
 */
function renderHeatmap(block: ListReportHeatmapBlock): string {
  const { data, texts } = block;
  if (data.months.length === 0 || data.rows.length === 0) {
    return `<div class="section"><div class="sec-h"><span>${escapeHtml(texts.title)}</span></div>
    <p class="empty">${escapeHtml(texts.noData)}</p></div>`;
  }
  const headCells = data.months.map((m) => `<th>${escapeHtml(m.slice(5, 7))}</th>`).join('');
  const bodyRows = data.rows
    .map((r) => {
      const cells = r.cells
        .map((c) => {
          const ratio = data.maxCell > 0 ? c.count / data.maxCell : 0;
          const fg = c.count > 0 && ratio > 0.5 ? '#FFFFFF' : '#1A1A1A';
          const text = c.count > 0 ? String(c.count) : '';
          return `<td class="hm-cell" style="background:${heatmapCellBg(c.count, data.maxCell)};color:${fg}">${text}</td>`;
        })
        .join('');
      return `<tr><td class="hm-name">${escapeHtml(r.name)}</td>${cells}<td class="hm-rowtot">${group(r.total)}</td></tr>`;
    })
    .join('\n');
  const totalCells = data.monthTotals.map((n) => `<td>${group(n)}</td>`).join('');
  const swatches = HEATMAP_LEGEND_ALPHAS.map(
    (a) => `<span class="sw" style="background:rgba(31, 58, 46, ${a})"></span>`,
  ).join('');
  const topMonthsText = data.topMonths
    .map((x) => `${escapeHtml(x.month)} (${group(x.count)})`)
    .join(' · ');

  return `<div class="section">
    <div class="sec-h"><span>${escapeHtml(texts.title)}</span></div>
    <table class="hm">
      <thead><tr><th class="hm-name"></th>${headCells}<th class="hm-rowtot">${escapeHtml(texts.monthTotal)}</th></tr></thead>
      <tbody>
${bodyRows}
        <tr class="hm-total"><td class="hm-name">${escapeHtml(texts.monthTotal)}</td>${totalCells}<td class="hm-rowtot"></td></tr>
      </tbody>
    </table>
    <div class="hm-legend">${escapeHtml(texts.legendLess)} ${swatches} ${escapeHtml(texts.legendMore)}<span class="hm-note">${escapeHtml(texts.legend)}</span></div>
    ${topMonthsText ? `<div class="hm-top">${escapeHtml(texts.topMonths)}: ${topMonthsText}</div>` : ''}
  </div>`;
}

/** 盆栽カタログ (カバー写真 + 明朝名 + 累計 + 樹種/樹形/入手 + 作業内訳2列ミニ棒)。 */
function renderCatalog(block: ListReportCatalogBlock): string {
  if (block.entries.length === 0) return '';
  const cards = block.entries
    .map((e) => {
      const thumb = e.coverPhotoUri
        ? `<div class="cat-thumb"><img src="${e.coverPhotoUri}" alt="" /></div>`
        : '<div class="cat-thumb cat-ph"></div>';
      const metaLeft = [e.speciesName, e.styleLabel]
        .filter((x): x is string => !!x)
        .map(escapeHtml);
      const sub = `<div class="cat-sub"><span>${metaLeft.join(' · ')}</span>${
        e.acquiredAt
          ? `<span class="cs-acq">${escapeHtml(block.texts.acquired)} ${escapeHtml(e.acquiredAt)}</span>`
          : ''
      }</div>`;
      const topCount = e.typeBreakdown.reduce((m, t) => Math.max(m, t.count), 1);
      const bd = e.typeBreakdown
        .map(
          (t) =>
            `<div class="cat-bd-row"><span class="bl">${escapeHtml(t.typeLabel)}</span><span class="bt"><span style="width:${Math.round(
              (t.count / topCount) * 100,
            )}%"></span></span><span class="bc">${group(t.count)}</span></div>`,
        )
        .join('');
      const total = block.texts.totalRecords.replace('{count}', group(e.totalCount));
      return `<div class="cat-card">
      ${thumb}
      <div class="cat-body">
        <div class="cat-head"><span class="cat-name">${escapeHtml(e.name)}</span><span class="cat-total">${escapeHtml(total)}</span></div>
        ${sub}
        ${bd ? `<div class="cat-bd">${bd}</div>` : ''}
      </div>
    </div>`;
    })
    .join('\n');
  return `<div class="section">
    <div class="sec-h"><span>${escapeHtml(block.texts.title)}</span></div>
    <div class="cat">${cards}</div>
  </div>`;
}

/**
 * list_pdf の HTML を生成する純関数 (washi モックアップ忠実版)。
 * 個別 PDF と同じランニングヘッダー shell を使い、表紙 + ヒートマップ + カタログを和紙意匠で描く。
 */
export function buildBonsaiListPdfHtml(input: {
  texts: ListPdfTexts;
  report: ListReportBlock;
}): string {
  const { texts, report } = input;
  const subtitle = texts.coverSubtitleTemplate.replace(
    '{count}',
    group(report.summary.bonsaiCount),
  );
  const tiles = renderSummaryTiles(report.summary, report.texts);
  const charts =
    renderBarChart(report.texts.chartPerBonsai, report.bars.perBonsai) +
    renderBarChart(report.texts.chartSpecies, report.bars.perSpecies) +
    renderMonthlyBars(report.texts.chartPerMonth, report.bars.perMonth);
  const heatmapHtml = report.heatmap ? renderHeatmap(report.heatmap) : '';
  const catalogHtml = report.catalog ? renderCatalog(report.catalog) : '';

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(texts.coverTitle)}</title>
<style>
  @page { size: A4 portrait; margin: 12mm 11mm 14mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Noto Sans CJK JP", "Noto Sans JP", "Yu Gothic", Meiryo, sans-serif;
    color: #1A1A1A; background: #FBFAF6; margin: 0; padding: 18px 20px;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  table.doc { width: 100%; border-collapse: collapse; }
  .rhead { padding: 0 0 12px; text-align: left; }
  .rhead-bar { font-family: "SF Mono", "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace; font-size: 7.5pt; letter-spacing: 0.16em; color: #7A7460; text-transform: uppercase; }
  .doc-body { padding: 0; }
  /* ブランドバンド */
  .brand { display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 6px; border-bottom: 0.5px solid #C9C2AE; margin-bottom: 9px; font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 7pt; color: #7A7460; letter-spacing: 0.12em; }
  .brand .b-name { color: #1A1A1A; font-weight: 600; text-transform: uppercase; }
  /* タイトル */
  .cover-title { display: flex; justify-content: space-between; align-items: flex-end; gap: 10px; margin-bottom: 11px; }
  .cover-title h1 { font-family: "Hiragino Mincho ProN", "YuMincho", "Yu Mincho", "Noto Serif CJK JP", "Noto Serif JP", serif; font-size: 22pt; font-weight: 500; letter-spacing: 0.02em; margin: 0; color: #1A1A1A; }
  .cover-title .ct-sub { font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 7.5pt; color: #7A7460; text-align: right; line-height: 1.5; white-space: nowrap; }
  /* タイル */
  .tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 15px; }
  .tile { border: 0.5px solid #1A1A1A; border-radius: 3px; padding: 7px 9px; background: #FBFAF6; }
  .tile.lead { background: #1F3A2E; border-color: #1F3A2E; color: #F7F3E8; }
  .tile .t-label { font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 6.5pt; letter-spacing: 0.1em; text-transform: uppercase; color: #7A7460; }
  .tile.lead .t-label { color: rgba(247, 243, 232, 0.7); }
  .tile .t-val { font-family: "Hiragino Mincho ProN", "YuMincho", "Yu Mincho", "Noto Serif CJK JP", "Noto Serif JP", serif; font-size: 18pt; font-weight: 500; line-height: 1.1; margin-top: 3px; }
  /* セクション見出し (mono 大文字 + 下罫線) */
  .sec-h { display: flex; justify-content: space-between; align-items: baseline; font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 8pt; letter-spacing: 0.1em; text-transform: uppercase; color: #7A7460; border-bottom: 0.5px solid #1A1A1A; padding-bottom: 3px; margin: 0 0 7px; }
  .chart { margin: 0 0 13px; page-break-inside: avoid; -webkit-column-break-inside: avoid; }
  .section { margin-top: 16px; }
  /* 横棒 */
  .bar-row { display: grid; grid-template-columns: 78px 1fr 42px; gap: 6px; align-items: center; margin: 2.5px 0; }
  .bar-label { font-size: 8.5pt; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bar-track { height: 7px; background: #F0EBDB; border-radius: 1px; overflow: hidden; }
  .bar-fill { display: block; height: 100%; background: #1F3A2E; border-radius: 1px; min-width: 1px; }
  .bar-count { font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 7.5pt; text-align: right; color: #1A1A1A; }
  /* 月別 縦棒 */
  .months { display: flex; align-items: flex-end; gap: 4px; height: 44px; border-bottom: 0.5px solid #1A1A1A; }
  .m-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; }
  .m-bar { width: 100%; background: #1F3A2E; border-radius: 1px 1px 0 0; min-height: 1px; }
  .m-axis { display: flex; gap: 4px; margin-top: 2px; font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 6.5pt; color: #7A7460; }
  .m-axis span { flex: 1; text-align: center; }
  /* ヒートマップ */
  table.hm { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.hm th { font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 6.5pt; color: #7A7460; font-weight: 400; padding: 1px 0; text-align: center; }
  table.hm td { font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 6pt; text-align: center; padding: 0.5px; }
  .hm-name { font-family: -apple-system, "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif !important; font-size: 8pt !important; text-align: left !important; width: 22%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 4px !important; color: #1A1A1A; }
  .hm-rowtot { width: 8%; text-align: right !important; font-weight: 700; color: #1A1A1A; padding-left: 3px !important; }
  .hm-cell { height: 13px; border-radius: 1px; }
  .hm-total td { font-weight: 700; color: #1A1A1A; padding-top: 3px; }
  .hm-total .hm-name { font-family: "SF Mono", Menlo, Consolas, monospace !important; font-size: 6.5pt !important; color: #7A7460; }
  .hm-legend { display: flex; align-items: center; gap: 4px; margin-top: 7px; font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 6.5pt; color: #7A7460; flex-wrap: wrap; }
  .hm-legend .sw { width: 13px; height: 9px; border-radius: 1px; display: inline-block; }
  .hm-note { margin-left: 8px; }
  .hm-top { font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 7pt; color: #5A5A5A; margin-top: 5px; }
  /* カタログ */
  .cat-card { display: grid; grid-template-columns: 84px 1fr; gap: 9px; padding: 6px 0; border-bottom: 0.5px solid #C9C2AE; page-break-inside: avoid; -webkit-column-break-inside: avoid; }
  .cat-thumb { width: 84px; height: 64px; border-radius: 2px; overflow: hidden; background: #EDE8D9; border: 0.5px solid #C9C2AE; }
  .cat-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .cat-head { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; }
  .cat-name { font-family: "Hiragino Mincho ProN", "YuMincho", "Yu Mincho", "Noto Serif CJK JP", "Noto Serif JP", serif; font-size: 12pt; font-weight: 500; letter-spacing: 0.02em; color: #1A1A1A; }
  .cat-total { font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 7.5pt; color: #1A1A1A; white-space: nowrap; }
  .cat-sub { display: flex; justify-content: space-between; gap: 6px; font-size: 8pt; color: #5A5A5A; margin: 2px 0 3px; }
  .cat-sub .cs-acq { font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 7.5pt; color: #7A7460; white-space: nowrap; }
  .cat-bd { border-top: 0.5px dotted #C9C2AE; padding-top: 3px; display: grid; grid-template-columns: repeat(2, 1fr); column-gap: 14px; row-gap: 1px; }
  .cat-bd-row { display: grid; grid-template-columns: 46px 1fr 26px; gap: 5px; align-items: center; }
  .cat-bd-row .bl { font-size: 7pt; color: #3A3A3A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cat-bd-row .bt { height: 3px; background: #F0EBDB; border-radius: 0.5px; overflow: hidden; }
  .cat-bd-row .bt > span { display: block; height: 100%; background: #1F3A2E; }
  .cat-bd-row .bc { font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 7pt; text-align: right; color: #1A1A1A; }
  /* フッタ */
  .footer { margin-top: 16px; padding-top: 6px; border-top: 0.5px solid #C9C2AE; display: flex; justify-content: space-between; font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 7pt; color: #7A7460; letter-spacing: 0.08em; }
  .empty { color: #7A7460; font-size: 9pt; }
</style>
</head>
<body>
  <table class="doc">
  <thead>
    <tr><td class="rhead"><div class="rhead-bar">BonsaiLog</div></td></tr>
  </thead>
  <tbody>
    <tr><td class="doc-body">
  <div class="brand"><span><span class="b-name">BonsaiLog</span> · ${escapeHtml(texts.coverTitle)}</span><span>${escapeHtml(texts.generatedAtValue)}</span></div>
  <div class="cover-title">
    <h1>${escapeHtml(texts.coverTitle)}</h1>
    <div class="ct-sub">${escapeHtml(subtitle)}</div>
  </div>
  ${tiles}
  ${charts}
  ${heatmapHtml}
  ${catalogHtml}
  <div class="footer"><span>${escapeHtml(texts.footerNote)}</span><span>BonsaiLog</span></div>
    </td></tr>
  </tbody>
  </table>
</body>
</html>`;
}
