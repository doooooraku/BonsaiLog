/**
 * F-10 list_pdf HTML 純関数テスト (Issue #33 / ADR-0016)。
 * Sess51: washi モックアップ忠実版 (ランニングヘッダー / 明朝 / 4 タイル / 棒 / 月別縦棒 /
 * 連続濃淡ヒートマップ / カタログ2列ミニ棒)。素テーブル + 箇条書き統計は撤去済。
 */
import {
  buildBonsaiListPdfHtml,
  type ListPdfTexts,
  type ListReportBlock,
  type ListReportCatalogBlock,
  type ListReportHeatmapBlock,
} from '@/src/features/export/listPdfExport';

const baseTexts: ListPdfTexts = {
  coverTitle: 'BonsaiLog 全盆栽記録',
  coverSubtitleTemplate: '全 {count} 本',
  generatedAtValue: '2026-05-28 18:00',
  footerNote: 'BonsaiLog で生成',
};

const reportTextsP1 = {
  summaryBonsaiCount: '盆栽総数',
  summarySpeciesCount: '樹種数',
  summaryStyleCount: '樹形数',
  summaryTotalRecords: '通算記録',
  chartPerBonsai: '盆栽別の記録数',
  chartSpecies: '樹種構成',
  chartPerMonth: '月別の記録数',
};

const heatmapBlock: ListReportHeatmapBlock = {
  data: {
    months: ['2026-03', '2026-04', '2026-05'],
    rows: [
      {
        bonsaiId: 'b1',
        name: '黒松「太郎」',
        total: 12,
        cells: [
          { count: 2, level: 1 },
          { count: 4, level: 3 },
          { count: 6, level: 4 },
        ],
      },
    ],
    monthTotals: [2, 4, 6],
    topMonths: [
      { month: '2026-05', count: 6 },
      { month: '2026-04', count: 4 },
    ],
    maxCell: 6,
  },
  texts: {
    title: '月別の作業件数',
    legend: 'セルの色は記録件数を表します（達成度ではなく事実の表示です）',
    legendLess: '少ない',
    legendMore: '多い',
    monthTotal: '月別合計',
    topMonths: '記録の多い月',
    noData: 'この期間の記録はありません',
  },
};

const catalogBlock: ListReportCatalogBlock = {
  entries: [
    {
      bonsaiId: 'b1',
      name: '黒松「太郎」',
      speciesName: '黒松',
      styleLabel: '模様木',
      acquiredAt: '2017-09-01',
      typeBreakdown: [
        { typeLabel: '水やり', count: 340 },
        { typeLabel: '剪定', count: 40 },
      ],
      totalCount: 412,
      coverPhotoUri: 'data:image/jpeg;base64,AAAA',
    },
    {
      bonsaiId: 'b2',
      name: '真柏',
      speciesName: null,
      styleLabel: null,
      acquiredAt: null,
      typeBreakdown: [],
      totalCount: 0,
      coverPhotoUri: null,
    },
  ],
  texts: { title: '盆栽カタログ', totalRecords: '累計 {count} 件', acquired: '入手' },
};

const baseReport: ListReportBlock = {
  summary: { bonsaiCount: 11, speciesCount: 7, styleCount: 5, totalEvents: 2095 },
  bars: {
    perBonsai: [
      { label: '黒松「太郎」', count: 412, pct: 100 },
      { label: '真柏', count: 200, pct: 48.5 },
    ],
    perSpecies: [{ label: '黒松', count: 4, pct: 100 }],
    perMonth: [
      { label: '2026-03', count: 80, pct: 40 },
      { label: '2026-05', count: 200, pct: 100 },
    ],
  },
  texts: reportTextsP1,
  heatmap: heatmapBlock,
  catalog: catalogBlock,
};

const build = (over: Partial<{ texts: ListPdfTexts; report: ListReportBlock }> = {}) =>
  buildBonsaiListPdfHtml({ texts: baseTexts, report: baseReport, ...over });

describe('buildBonsaiListPdfHtml — shell (washi + ランニングヘッダー)', () => {
  test('DOCTYPE + lang=ja + 和紙背景 + 明朝/mono フォント', () => {
    const html = build();
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('<html lang="ja">');
    expect(html).toContain('background: #FBFAF6'); // washi
    expect(html).toContain('Hiragino Mincho'); // 明朝 (serif)
  });

  test('ランニングヘッダー (table.doc thead) + BonsaiLog', () => {
    const html = build();
    expect(html).toContain('class="doc"');
    expect(html).toContain('class="rhead-bar"');
    expect(html).toContain('>BonsaiLog<');
  });

  test('ブランドバンド + 明朝タイトル + サブタイトル (全 N 本)', () => {
    const html = build();
    expect(html).toContain('class="brand"');
    expect(html).toContain('class="cover-title"');
    expect(html).toContain('BonsaiLog 全盆栽記録');
    expect(html).toContain('全 11 本'); // summary.bonsaiCount 置換
  });

  test('フッタ', () => {
    expect(build()).toContain('BonsaiLog で生成');
  });
});

describe('表紙: サマリータイル + 棒グラフ', () => {
  test('4 タイル (1 枚目 lead=深緑) + 値 + ラベル + 3桁区切り', () => {
    const html = build();
    expect(html).toContain('class="tiles"');
    expect(html).toContain('class="tile lead"'); // 1 枚目だけ lead
    expect(html).toContain('盆栽総数');
    expect(html).toContain('樹種数');
    expect(html).toContain('樹形数');
    expect(html).toContain('通算記録');
    expect(html).toContain('>2,095<'); // group 整形
    expect(html).toContain('>11<');
  });

  test('横棒: width% + 件数 + タイトル', () => {
    const html = build();
    expect(html).toContain('盆栽別の記録数');
    expect(html).toContain('樹種構成');
    expect(html).toContain('class="bar-fill"');
    expect(html).toContain('width:100%');
    expect(html).toContain('width:48.5%');
    expect(html).toContain('黒松「太郎」');
    expect(html).toContain('>412<');
  });

  test('月別: 縦棒 (height%) + 月ラベル MM', () => {
    const html = build();
    expect(html).toContain('月別の記録数');
    expect(html).toContain('class="months"');
    expect(html).toContain('class="m-bar"');
    expect(html).toContain('height:100%');
    expect(html).toContain('>03<');
    expect(html).toContain('>05<');
  });

  test('空の系列は描かない', () => {
    const html = build({
      report: { ...baseReport, bars: { perBonsai: [], perSpecies: [], perMonth: [] } },
    });
    expect(html).not.toContain('class="bar-fill"');
    expect(html).not.toContain('class="months"');
  });
});

describe('ヒートマップ (連続濃淡 + 凡例)', () => {
  test('table + rgba 連続濃淡 + 件数 + 月計 + 凡例(事実明記) + 上位月', () => {
    const html = build();
    expect(html).toContain('月別の作業件数');
    expect(html).toContain('class="hm"');
    expect(html).toContain('rgba(31, 58, 46,'); // 連続透明度
    expect(html).toContain('class="hm-legend"');
    expect(html).toContain('達成度ではなく事実の表示です');
    expect(html).toContain('月別合計');
    expect(html).toContain('記録の多い月');
    expect(html).toContain('2026-05 (6)');
  });

  test('月軸が空 → NoData のみ (table なし)', () => {
    const html = build({
      report: {
        ...baseReport,
        heatmap: {
          data: { months: [], rows: [], monthTotals: [], topMonths: [], maxCell: 0 },
          texts: heatmapBlock.texts,
        },
      },
    });
    expect(html).toContain('この期間の記録はありません');
    expect(html).not.toContain('class="hm"');
  });
});

describe('カタログ (写真 + 明朝名 + 2列ミニ棒)', () => {
  test('カバー写真 img / 無写真 placeholder + 明朝名 + 累計 + 樹種樹形 + 入手 + 内訳棒', () => {
    const html = build();
    expect(html).toContain('盆栽カタログ');
    expect(html).toContain('class="cat-card"');
    expect(html).toContain('src="data:image/jpeg;base64,AAAA"'); // 写真あり
    expect(html).toContain('cat-ph'); // 無写真プレースホルダー
    expect(html).toContain('class="cat-name"');
    expect(html).toContain('累計 412 件');
    expect(html).toContain('黒松 · 模様木');
    expect(html).toContain('入手 2017-09-01');
    expect(html).toContain('class="cat-bd-row"');
    expect(html).toContain('水やり');
  });
});

describe('後方互換 / XSS', () => {
  test('heatmap / catalog 省略時は描かない', () => {
    const html = build({
      report: { summary: baseReport.summary, bars: baseReport.bars, texts: reportTextsP1 },
    });
    expect(html).not.toContain('class="hm"');
    expect(html).not.toContain('盆栽カタログ');
  });

  test('XSS: カタログ名はエスケープ', () => {
    const html = build({
      report: {
        ...baseReport,
        catalog: {
          ...catalogBlock,
          entries: [
            {
              bonsaiId: 'x',
              name: '<b>x</b>',
              speciesName: null,
              styleLabel: null,
              acquiredAt: null,
              typeBreakdown: [],
              totalCount: 0,
              coverPhotoUri: null,
            },
          ],
        },
      },
    });
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(html).not.toContain('<b>x</b>');
  });

  test('旧構造 (素リスト表 / 箇条書き統計) は撤去済み', () => {
    const html = build();
    expect(html).not.toContain('種別内訳');
    expect(html).not.toContain('樹種内訳');
  });
});
