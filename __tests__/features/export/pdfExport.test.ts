/**
 * F-10 pdfExport 純関数テスト (Issue #33 / ADR-0016 Sess49 適応型エンリッチ)。
 *
 * - escapeHtml: XSS / 特殊文字エスケープ
 * - buildBonsaiPdfHtml: 構造化データ (BonsaiPdfReportData) + ラベル → HTML
 *   (DOCTYPE / CJK font / 適応型セクション / page-break-inside:avoid / 写真振り分け)
 *
 * Print / Sharing 副作用は実機検証。
 */
import { buildBonsaiPdfHtml, escapeHtml } from '@/src/features/export/pdfExport';
import type { BonsaiPdfReportData } from '@/src/features/export/bonsaiPdfReport';

describe('escapeHtml', () => {
  test('null / undefined → 空文字', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  test('& < > " \' をエスケープ', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  test('複合', () => {
    expect(escapeHtml('<img src="x">&y')).toBe('&lt;img src=&quot;x&quot;&gt;&amp;y');
  });
});

const texts = {
  title: '盆栽記録',
  labelSpecies: '樹種',
  labelStyle: '樹形',
  labelAge: '樹齢',
  labelAcquiredAt: '取得日',
  labelAcquiredFrom: '入手元',
  labelPot: '鉢',
  labelTags: 'タグ',
  memoTitle: 'メモ',
  pestSectionTitle: '病害虫・対処',
  pestColDate: '日付',
  pestColSymptom: '症状・部位',
  pestColNote: 'メモ',
  worklogTitle: '作業ログ',
  worklogEmpty: '―',
  photosTitle: '写真',
};

function makeReport(overrides: Partial<BonsaiPdfReportData> = {}): BonsaiPdfReportData {
  return {
    meta: { name: '父の黒松', tags: [], ...overrides.meta },
    coverPhotoUri: overrides.coverPhotoUri,
    coverPhotoCaption: overrides.coverPhotoCaption,
    pestEvents: overrides.pestEvents ?? [],
    timeline: overrides.timeline ?? [],
    gallery: overrides.gallery ?? [],
  };
}

function makeEntry(
  overrides: Partial<BonsaiPdfReportData['timeline'][number]> = {},
): BonsaiPdfReportData['timeline'][number] {
  return {
    date: '2026-05-03',
    typeLabel: '水やり',
    badgeBg: '#E9F0EC',
    badgeFg: '#1F3A2E',
    chips: [],
    photoUris: [],
    ...overrides,
  };
}

describe('buildBonsaiPdfHtml — 骨格 (ADR-0016 互換)', () => {
  test('DOCTYPE が html で始まる (iOS WKWebView 制約)', () => {
    expect(buildBonsaiPdfHtml(makeReport(), texts).startsWith('<!DOCTYPE html>')).toBe(true);
  });

  test('CJK フォント明示が含まれる (Repolog Issue #292 教訓)', () => {
    const html = buildBonsaiPdfHtml(makeReport(), texts);
    expect(html).toContain('Hiragino');
    expect(html).toContain('Noto Sans CJK');
  });

  test('page-break-inside:avoid と -webkit- 併記 (iOS 分断回避)', () => {
    const html = buildBonsaiPdfHtml(makeReport(), texts);
    expect(html).toContain('page-break-inside: avoid');
    expect(html).toContain('-webkit-column-break-inside: avoid');
  });

  test('盆栽名を出力 / フッタ「BonsaiLog で生成」は削除済', () => {
    const html = buildBonsaiPdfHtml(makeReport(), texts);
    expect(html).toContain('<h1>父の黒松</h1>');
    expect(html).not.toContain('BonsaiLog で生成');
    expect(html).not.toContain('class="footer"');
  });

  test('ランニングヘッダー: thead に「BonsaiLog · 盆栽名」(各ページ先頭で繰り返す)', () => {
    const html = buildBonsaiPdfHtml(makeReport(), texts);
    expect(html).toContain('<thead>');
    expect(html).toContain('class="rhead">BonsaiLog · 父の黒松');
  });
});

describe('buildBonsaiPdfHtml — 個票メタ (適応型)', () => {
  test('値があるフィールドのみ行を出力', () => {
    const html = buildBonsaiPdfHtml(
      makeReport({
        meta: {
          name: '父の黒松',
          speciesName: '黒松',
          styleLabel: '模様木',
          ageText: '35年',
          acquiredText: '2020-03-15（6.1年保有）',
          acquiredFrom: '父から継承',
          potText: '18×6cm / 常滑',
          tags: ['師匠の家', '紅葉'],
          memo: undefined,
        },
      }),
      texts,
    );
    expect(html).toContain('樹種');
    expect(html).toContain('黒松');
    expect(html).toContain('模様木');
    expect(html).toContain('35年');
    expect(html).toContain('6.1年保有');
    expect(html).toContain('父から継承');
    expect(html).toContain('18×6cm');
    expect(html).toContain('師匠の家');
  });

  test('空 meta は行を出さない (―だらけ回避)', () => {
    const html = buildBonsaiPdfHtml(makeReport({ meta: { name: 'Test', tags: [] } }), texts);
    expect(html).not.toContain('<span class="m-key">'); // 描画された meta 行が無い (CSS 定義は別)
    expect(html).not.toContain('<div class="subline">');
  });

  test('subline は存在する meta のみ · で連結', () => {
    const html = buildBonsaiPdfHtml(
      makeReport({ meta: { name: 'Test', speciesName: '黒松', ageText: '35年', tags: [] } }),
      texts,
    );
    expect(html).toContain('黒松 · 35年');
  });
});

describe('buildBonsaiPdfHtml — メモ / 病害虫 / 作業ログ (適応型)', () => {
  test('メモあり → セクション出力 + 改行は <br/>', () => {
    const html = buildBonsaiPdfHtml(
      makeReport({ meta: { name: 'T', tags: [], memo: '1行目\n2行目' } }),
      texts,
    );
    expect(html).toContain('<h2>メモ</h2>');
    expect(html).toContain('1行目<br/>2行目');
  });

  test('メモ無し → セクション非表示', () => {
    const html = buildBonsaiPdfHtml(makeReport(), texts);
    expect(html).not.toContain('<h2>メモ</h2>');
  });

  test('病害虫あり → 表出力、無し → 非表示', () => {
    const withPest = buildBonsaiPdfHtml(
      makeReport({
        pestEvents: [{ date: '2023-07-12', symptomBodyPart: 'ハダニ・葉裏', note: '3回散布' }],
      }),
      texts,
    );
    expect(withPest).toContain('<h2>病害虫・対処</h2>');
    expect(withPest).toContain('症状・部位');
    expect(withPest).toContain('ハダニ・葉裏');

    const noPest = buildBonsaiPdfHtml(makeReport(), texts);
    expect(noPest).not.toContain('<h2>病害虫・対処</h2>');
  });

  test('作業ログ: 0 件は ― / 1 件以上はタイムライン', () => {
    const empty = buildBonsaiPdfHtml(makeReport(), texts);
    expect(empty).toContain('<h2>作業ログ</h2>');
    expect(empty).toContain('class="empty"');
    expect(empty).not.toContain('class="timeline"');

    const filled = buildBonsaiPdfHtml(
      makeReport({
        timeline: [
          makeEntry({ typeLabel: '針金がけ', chips: ['番手: 2mm', '部位: 幹'], note: '主幹矯正' }),
        ],
      }),
      texts,
    );
    expect(filled).toContain('class="timeline"');
    expect(filled).toContain('針金がけ');
    expect(filled).toContain('番手: 2mm');
    expect(filled).toContain('主幹矯正');
    // バッジに薄地色が style で入る
    expect(filled).toContain('background:#E9F0EC');
    // チップは縦 1 列 (flex column)
    expect(filled).toContain('.chips { display: flex; flex-direction: column');
  });

  test('タイムラインのインライン写真を <img> 出力', () => {
    const html = buildBonsaiPdfHtml(
      makeReport({ timeline: [makeEntry({ photoUris: ['data:image/jpeg;base64,EV'] })] }),
      texts,
    );
    expect(html).toContain('class="entry-photos"');
    expect(html).toContain('<img src="data:image/jpeg;base64,EV"');
  });
});

describe('buildBonsaiPdfHtml — 写真 (cover / gallery)', () => {
  test('cover 写真 + キャプション', () => {
    const html = buildBonsaiPdfHtml(
      makeReport({
        coverPhotoUri: 'data:image/jpeg;base64,COVER',
        coverPhotoCaption: '2026-04-22 撮影',
      }),
      texts,
    );
    expect(html).toContain('class="cover"');
    expect(html).toContain('<img src="data:image/jpeg;base64,COVER"');
    expect(html).toContain('2026-04-22 撮影');
  });

  test('cover 無し → no-cover クラス + cover img 非表示', () => {
    const html = buildBonsaiPdfHtml(makeReport(), texts);
    expect(html).toContain('hero no-cover');
    expect(html).not.toContain('class="cover"');
  });

  test('gallery あり → 写真セクション、無し → 非表示', () => {
    const withG = buildBonsaiPdfHtml(makeReport({ gallery: ['data:image/jpeg;base64,G1'] }), texts);
    expect(withG).toContain('<h2>写真</h2>');
    expect(withG).toContain('<img src="data:image/jpeg;base64,G1"');
    // ギャラリーは縦 1 列・幅いっぱい (縮小しない)
    expect(withG).toContain('.photos { display: flex; flex-direction: column');
    expect(withG).toContain('max-width: 480px');

    const noG = buildBonsaiPdfHtml(makeReport(), texts);
    expect(noG).not.toContain('<h2>写真</h2>');
  });
});

describe('buildBonsaiPdfHtml — XSS', () => {
  test('name / memo / tag / note / chip をエスケープ', () => {
    const html = buildBonsaiPdfHtml(
      makeReport({
        meta: { name: '<script>x</script>', tags: ['<b>tag</b>'], memo: '<img src=x>' },
        timeline: [makeEntry({ note: '<i>note</i>', chips: ['<u>chip</u>'] })],
      }),
      texts,
    );
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;b&gt;tag&lt;/b&gt;');
    expect(html).toContain('&lt;img src=x&gt;');
    expect(html).toContain('&lt;i&gt;note&lt;/i&gt;');
    expect(html).toContain('&lt;u&gt;chip&lt;/u&gt;');
  });
});
