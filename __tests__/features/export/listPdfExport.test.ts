/**
 * F-10 Phase I — list_pdf HTML 純関数テスト (Issue #33 / ADR-0016 AC2)。
 */

import {
  buildBonsaiListPdfHtml,
  type BonsaiListRow,
  type ListPdfStats,
  type ListPdfTexts,
  type ListReportHeatmapBlock,
} from '@/src/features/export/listPdfExport';

function makeRow(overrides: Partial<BonsaiListRow> = {}): BonsaiListRow {
  return {
    id: 'b1',
    name: '黒松「太郎」',
    speciesName: '黒松',
    acquiredAt: '2026-01-01T00:00:00.000Z',
    eventCount: 42,
    ...overrides,
  };
}

const baseStats: ListPdfStats = {
  totalEvents: 100,
  typeBreakdown: { watering: 80, fertilizing: 15, wiring: 5 },
  speciesBreakdown: { 黒松: 3, 赤松: 2, 梅: 1 },
};

const baseTexts: ListPdfTexts = {
  coverTitle: 'BonsaiLog 全盆栽記録',
  coverSubtitleTemplate: '全 {count} 本',
  generatedAtLabel: '生成日時:',
  generatedAtValue: '2026-05-03 12:34',
  listSectionTitle: '盆栽リスト',
  listColumnName: '名前',
  listColumnSpecies: '樹種',
  listColumnAcquiredAt: '取得日',
  listColumnEventCount: '件数',
  statsSectionTitle: '統計',
  statsTotalLabel: '総 events 件数: {count}',
  statsTypeBreakdownTitle: '種別内訳',
  statsSpeciesBreakdownTitle: '樹種内訳',
  footerNote: 'BonsaiLog で生成',
};

describe('buildBonsaiListPdfHtml (AC2 list_pdf)', () => {
  test('DOCTYPE 必須 + lang=ja', () => {
    const html = buildBonsaiListPdfHtml({ bonsaiList: [], stats: baseStats, texts: baseTexts });
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('<html lang="ja">');
  });

  test('表紙: タイトル + サブタイトル + 生成日時', () => {
    const html = buildBonsaiListPdfHtml({
      bonsaiList: [makeRow(), makeRow({ id: 'b2' })],
      stats: baseStats,
      texts: baseTexts,
    });
    expect(html).toContain('BonsaiLog 全盆栽記録');
    expect(html).toContain('全 2 本'); // {count} 置換
    expect(html).toContain('生成日時:');
    expect(html).toContain('2026-05-03 12:34');
  });

  test('リスト 0 件 → ― (em dash) 表示', () => {
    const html = buildBonsaiListPdfHtml({ bonsaiList: [], stats: baseStats, texts: baseTexts });
    expect(html).toContain('盆栽リスト');
    expect(html).toMatch(/盆栽リスト[\s\S]*?>―</);
  });

  test('リスト複数件 → 各行 4 列 (name / species / acquiredAt / eventCount)', () => {
    const html = buildBonsaiListPdfHtml({
      bonsaiList: [
        makeRow({ id: 'b1', name: '黒松「太郎」', eventCount: 42 }),
        makeRow({ id: 'b2', name: '赤松「次郎」', eventCount: 13 }),
      ],
      stats: baseStats,
      texts: baseTexts,
    });
    expect(html).toContain('黒松「太郎」');
    expect(html).toContain('赤松「次郎」');
    expect(html).toContain('>42<'); // td.num 内
    expect(html).toContain('>13<');
  });

  test('acquiredAt は YYYY-MM-DD のみ (時刻部除外)', () => {
    const html = buildBonsaiListPdfHtml({
      bonsaiList: [makeRow({ acquiredAt: '2026-04-15T12:34:56.000Z' })],
      stats: baseStats,
      texts: baseTexts,
    });
    expect(html).toContain('2026-04-15');
    expect(html).not.toContain('12:34:56');
  });

  test('speciesName / acquiredAt が null → 空文字', () => {
    const html = buildBonsaiListPdfHtml({
      bonsaiList: [makeRow({ speciesName: null, acquiredAt: null })],
      stats: baseStats,
      texts: baseTexts,
    });
    // 空セルが描画される (table の構造は維持)
    expect(html).toContain('<td></td>');
  });

  test('統計セクション: 総件数 + 種別内訳 + 樹種内訳', () => {
    const html = buildBonsaiListPdfHtml({
      bonsaiList: [makeRow()],
      stats: baseStats,
      texts: baseTexts,
    });
    expect(html).toContain('総 events 件数: 100'); // {count} 置換
    expect(html).toContain('種別内訳');
    expect(html).toContain('watering (80)');
    expect(html).toContain('fertilizing (15)');
    expect(html).toContain('wiring (5)');
    expect(html).toContain('樹種内訳');
    expect(html).toContain('黒松 (3)');
    expect(html).toContain('赤松 (2)');
    expect(html).toContain('梅 (1)');
  });

  test('統計セクション内訳: 件数降順でソート', () => {
    const html = buildBonsaiListPdfHtml({
      bonsaiList: [makeRow()],
      stats: {
        totalEvents: 50,
        typeBreakdown: { wiring: 5, watering: 80, fertilizing: 15 },
        speciesBreakdown: {},
      },
      texts: baseTexts,
    });
    // watering が最初、次に fertilizing、最後に wiring
    const wateringIdx = html.indexOf('watering (80)');
    const fertilizingIdx = html.indexOf('fertilizing (15)');
    const wiringIdx = html.indexOf('wiring (5)');
    expect(wateringIdx).toBeLessThan(fertilizingIdx);
    expect(fertilizingIdx).toBeLessThan(wiringIdx);
  });

  test('typeBreakdown 空 → ― 表示', () => {
    const html = buildBonsaiListPdfHtml({
      bonsaiList: [makeRow()],
      stats: { totalEvents: 0, typeBreakdown: {}, speciesBreakdown: { 黒松: 1 } },
      texts: baseTexts,
    });
    // 種別内訳セクションに ― が出る
    expect(html).toMatch(/種別内訳[\s\S]*?>―</);
  });

  test('speciesBreakdown 空 → ― 表示', () => {
    const html = buildBonsaiListPdfHtml({
      bonsaiList: [makeRow()],
      stats: { totalEvents: 0, typeBreakdown: { watering: 1 }, speciesBreakdown: {} },
      texts: baseTexts,
    });
    expect(html).toMatch(/樹種内訳[\s\S]*?>―</);
  });

  test('XSS 対策: < > " などはエスケープ', () => {
    const html = buildBonsaiListPdfHtml({
      bonsaiList: [makeRow({ name: '<script>alert(1)</script>' })],
      stats: baseStats,
      texts: baseTexts,
    });
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  test('CJK フォント明示 (Hiragino / Noto / Yu Gothic / Meiryo)', () => {
    const html = buildBonsaiListPdfHtml({ bonsaiList: [], stats: baseStats, texts: baseTexts });
    expect(html).toContain('Hiragino');
    expect(html).toContain('Noto Sans CJK JP');
    expect(html).toContain('Yu Gothic');
    expect(html).toContain('Meiryo');
  });

  test('page-break: WebKit プレフィクス併記', () => {
    const html = buildBonsaiListPdfHtml({ bonsaiList: [], stats: baseStats, texts: baseTexts });
    expect(html).toContain('page-break-after: always');
    expect(html).toContain('-webkit-column-break-after: always');
  });

  test('フッタ表示', () => {
    const html = buildBonsaiListPdfHtml({ bonsaiList: [], stats: baseStats, texts: baseTexts });
    expect(html).toContain('BonsaiLog で生成');
  });
});

describe('AC2 シナリオ統合', () => {
  test('シナリオ A: 5 本盆栽 + 100 events の年次レポート', () => {
    const html = buildBonsaiListPdfHtml({
      bonsaiList: [
        makeRow({ id: '1', name: '黒松「太郎」', speciesName: '黒松', eventCount: 30 }),
        makeRow({ id: '2', name: '赤松「次郎」', speciesName: '赤松', eventCount: 25 }),
        makeRow({ id: '3', name: '白松「三郎」', speciesName: '白松', eventCount: 20 }),
        makeRow({ id: '4', name: '梅', speciesName: '梅', eventCount: 15 }),
        makeRow({ id: '5', name: '紅葉', speciesName: '紅葉', eventCount: 10 }),
      ],
      stats: {
        totalEvents: 100,
        typeBreakdown: { watering: 80, fertilizing: 15, wiring: 5 },
        speciesBreakdown: { 黒松: 1, 赤松: 1, 白松: 1, 梅: 1, 紅葉: 1 },
      },
      texts: baseTexts,
    });
    expect(html).toContain('全 5 本');
    expect(html).toContain('総 events 件数: 100');
    expect(html).toContain('黒松「太郎」');
    expect(html).toContain('紅葉');
  });

  test('シナリオ B: 0 本 (新規アプリ) → 全セクション ― 表示', () => {
    const html = buildBonsaiListPdfHtml({
      bonsaiList: [],
      stats: { totalEvents: 0, typeBreakdown: {}, speciesBreakdown: {} },
      texts: baseTexts,
    });
    expect(html).toContain('全 0 本');
    expect(html).toContain('総 events 件数: 0');
    expect(html.match(/>―</g)?.length).toBeGreaterThanOrEqual(3); // list + 2 breakdown sections
  });
});

describe('report ブロック (Phase 1: サマリーカード + 棒グラフ)', () => {
  const baseReport = {
    summary: { bonsaiCount: 3, speciesCount: 2, styleCount: 2, totalEvents: 100 },
    bars: {
      perBonsai: [
        { label: '黒松「太郎」', count: 60, pct: 100 },
        { label: '赤松', count: 30, pct: 50 },
      ],
      perSpecies: [{ label: '黒松', count: 2, pct: 100 }],
      perMonth: [
        { label: '2026-04', count: 40, pct: 100 },
        { label: '2026-05', count: 20, pct: 50 },
      ],
    },
    texts: {
      summaryBonsaiCount: '盆栽総数',
      summarySpeciesCount: '樹種数',
      summaryStyleCount: '樹形数',
      summaryTotalRecords: '通算記録',
      chartPerBonsai: '盆栽別の記録数',
      chartSpecies: '樹種構成',
      chartPerMonth: '月別の記録数',
    },
  };

  test('report 省略時はカード / 棒グラフを描かない (後方互換)', () => {
    const html = buildBonsaiListPdfHtml({ bonsaiList: [], stats: baseStats, texts: baseTexts });
    expect(html).not.toContain('class="sumcards"');
    expect(html).not.toContain('class="bar-fill"');
  });

  test('サマリーカード 4 枚: 値 + ラベル', () => {
    const html = buildBonsaiListPdfHtml({
      bonsaiList: [makeRow()],
      stats: baseStats,
      texts: baseTexts,
      report: baseReport,
    });
    expect(html).toContain('class="sumcards"');
    expect(html).toContain('<div class="sumval">3</div>');
    expect(html).toContain('<div class="sumval">100</div>');
    expect(html).toContain('盆栽総数');
    expect(html).toContain('樹種数');
    expect(html).toContain('樹形数');
    expect(html).toContain('通算記録');
  });

  test('棒グラフ: 幅 % をインライン指定 + 件数 + タイトル', () => {
    const html = buildBonsaiListPdfHtml({
      bonsaiList: [makeRow()],
      stats: baseStats,
      texts: baseTexts,
      report: baseReport,
    });
    expect(html).toContain('盆栽別の記録数');
    expect(html).toContain('樹種構成');
    expect(html).toContain('月別の記録数');
    expect(html).toContain('width:100%');
    expect(html).toContain('width:50%');
    expect(html).toContain('黒松「太郎」');
    expect(html).toContain('>60<'); // bar-count
    expect(html).toContain('2026-04');
  });

  test('空の棒グラフ系列は描かない', () => {
    const html = buildBonsaiListPdfHtml({
      bonsaiList: [makeRow()],
      stats: baseStats,
      texts: baseTexts,
      report: { ...baseReport, bars: { perBonsai: [], perSpecies: [], perMonth: [] } },
    });
    // サマリーカードは出るが、バーは 1 本も出ない
    expect(html).toContain('class="sumcards"');
    expect(html).not.toContain('class="bar-fill"');
  });

  test('XSS 対策: バーラベルもエスケープ', () => {
    const html = buildBonsaiListPdfHtml({
      bonsaiList: [makeRow()],
      stats: baseStats,
      texts: baseTexts,
      report: {
        ...baseReport,
        bars: { ...baseReport.bars, perBonsai: [{ label: '<b>x</b>', count: 1, pct: 100 }] },
      },
    });
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(html).not.toContain('<b>x</b>');
  });
});

describe('report.heatmap (Phase 2: 色ありヒートマップ)', () => {
  const baseTextsP1 = {
    summaryBonsaiCount: '盆栽総数',
    summarySpeciesCount: '樹種数',
    summaryStyleCount: '樹形数',
    summaryTotalRecords: '通算記録',
    chartPerBonsai: '盆栽別の記録数',
    chartSpecies: '樹種構成',
    chartPerMonth: '月別の記録数',
  };
  const heatmapTexts = {
    title: '月別の作業件数',
    legend: 'セルの色は記録件数を表します（達成度ではなく事実の表示です）',
    legendLess: '少ない',
    legendMore: '多い',
    monthTotal: '月別合計',
    topMonths: '記録の多い月',
    noData: 'この期間の記録はありません',
  };
  const makeReport = (heatmap?: ListReportHeatmapBlock) => ({
    summary: { bonsaiCount: 1, speciesCount: 1, styleCount: 1, totalEvents: 3 },
    bars: { perBonsai: [], perSpecies: [], perMonth: [] },
    texts: baseTextsP1,
    // exactOptionalPropertyTypes: undefined を明示代入せず、ある時だけキーを含める
    ...(heatmap ? { heatmap } : {}),
  });

  const filledHeatmap = {
    data: {
      months: ['2026-01', '2026-02', '2026-03'],
      rows: [
        {
          bonsaiId: 'b1',
          name: '黒松',
          total: 3,
          cells: [
            { count: 1, level: 1 as const },
            { count: 0, level: 0 as const },
            { count: 2, level: 4 as const },
          ],
        },
      ],
      monthTotals: [1, 0, 2],
      topMonths: [
        { month: '2026-03', count: 2 },
        { month: '2026-01', count: 1 },
      ],
      maxCell: 2,
    },
    texts: heatmapTexts,
  };

  test('ヒートマップ table + 背景色 + 件数併記 + 月ラベル(MM)', () => {
    const html = buildBonsaiListPdfHtml({
      bonsaiList: [makeRow()],
      stats: baseStats,
      texts: baseTexts,
      report: makeReport(filledHeatmap),
    });
    expect(html).toContain('月別の作業件数');
    expect(html).toContain('class="heatmap"');
    expect(html).toContain('background:#4F6B2A'); // level 4 の色
    expect(html).toContain('>黒松<');
    expect(html).toContain('>01<'); // 月ラベル MM
    expect(html).toContain('>03<');
    // 件数併記 (一次情報): level4 セルに 2 が入る
    expect(html).toContain('lv4');
  });

  test('凡例: 少ない/多い + 「達成度ではなく事実」明記 (ADR-0039 配慮)', () => {
    const html = buildBonsaiListPdfHtml({
      bonsaiList: [makeRow()],
      stats: baseStats,
      texts: baseTexts,
      report: makeReport(filledHeatmap),
    });
    expect(html).toContain('class="hm-legend"');
    expect(html).toContain('少ない');
    expect(html).toContain('多い');
    expect(html).toContain('達成度ではなく事実の表示です');
  });

  test('月別合計 + 上位月', () => {
    const html = buildBonsaiListPdfHtml({
      bonsaiList: [makeRow()],
      stats: baseStats,
      texts: baseTexts,
      report: makeReport(filledHeatmap),
    });
    expect(html).toContain('月別合計');
    expect(html).toContain('記録の多い月');
    expect(html).toContain('2026-03 (2)');
  });

  test('月軸が空 → NoData メッセージのみ (table なし)', () => {
    const html = buildBonsaiListPdfHtml({
      bonsaiList: [makeRow()],
      stats: baseStats,
      texts: baseTexts,
      report: makeReport({
        data: { months: [], rows: [], monthTotals: [], topMonths: [], maxCell: 0 },
        texts: heatmapTexts,
      }),
    });
    expect(html).toContain('この期間の記録はありません');
    expect(html).not.toContain('class="heatmap"');
  });

  test('heatmap 省略時はヒートマップを描かない (後方互換)', () => {
    const html = buildBonsaiListPdfHtml({
      bonsaiList: [makeRow()],
      stats: baseStats,
      texts: baseTexts,
      report: {
        summary: makeReport(undefined).summary,
        bars: makeReport(undefined).bars,
        texts: baseTextsP1,
      },
    });
    expect(html).not.toContain('class="heatmap"');
    expect(html).not.toContain('月別の作業件数');
  });
});
