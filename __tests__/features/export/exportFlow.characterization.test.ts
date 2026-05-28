/**
 * exportFlow 実 DB characterization (Phase 3 PR 1-3)。
 *
 * FS/Sharing 非依存の orchestration を凍結する:
 * - resolvePeriodRange: all / 30d / 1y / custom の ISO 範囲算出 (純関数)
 * - loadCsvForPreview: bonsai_csv / events_csv / species_csv の件数 + CSV 文字列生成
 * - loadListPdfHtml: 対象解決 + 集計 + HTML 生成 + 件数
 *
 * runExport / shareExportFile (expo-file-system File/Paths + expo-sharing) は実機/手動検証。
 * t は key をそのまま返すスタブ (i18n テキストの正しさは別テストの責務)。
 */
/* eslint-disable @typescript-eslint/no-require-imports -- fresh modules required after jest.resetModules() */
import { setupFreshDb } from '../../helpers/testDb';

type ExportFlow = typeof import('@/src/features/export/exportFlow');
type BonsaiRepo = typeof import('@/src/db/bonsaiRepository');
type EventRepo = typeof import('@/src/db/eventRepository');
type SpeciesRepo = typeof import('@/src/db/speciesRepository');

// i18n key をそのまま返すスタブ (Tfn = (key: TranslationKey) => string に代入可能)。
const t = (k: string): string => k;

function mods() {
  return {
    flow: require('@/src/features/export/exportFlow') as ExportFlow,
    bonsai: require('@/src/db/bonsaiRepository') as BonsaiRepo,
    ev: require('@/src/db/eventRepository') as EventRepo,
    species: require('@/src/db/speciesRepository') as SpeciesRepo,
  };
}

beforeEach(async () => {
  await setupFreshDb();
});

describe('resolvePeriodRange (純関数)', () => {
  test('all は範囲なし', () => {
    const { flow } = mods();
    expect(flow.resolvePeriodRange({ period: 'all' })).toEqual({});
  });

  test('30d は now から 30 日前の fromIso', () => {
    const { flow } = mods();
    const now = new Date('2026-06-30T00:00:00.000Z');
    const r = flow.resolvePeriodRange({ period: '30d' }, now);
    expect(r.fromIso).toBe('2026-05-31T00:00:00.000Z');
    expect(r.toIso).toBeUndefined();
  });

  test('1y は 1 年前', () => {
    const { flow } = mods();
    const now = new Date('2026-06-30T00:00:00.000Z');
    expect(flow.resolvePeriodRange({ period: '1y' }, now).fromIso).toBe('2025-06-30T00:00:00.000Z');
  });

  test('custom は dateFrom 00:00 / dateTo 23:59 を UTC で', () => {
    const { flow } = mods();
    const r = flow.resolvePeriodRange({
      period: 'custom',
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
    });
    expect(r.fromIso).toBe('2026-01-01T00:00:00.000Z');
    expect(r.toIso).toBe('2026-01-31T23:59:59.999Z');
  });
});

describe('loadCsvForPreview', () => {
  test('bonsai_csv: 件数 = 対象盆栽数、CSV にヘッダ + 行', async () => {
    const { flow, bonsai } = mods();
    await bonsai.createBonsai({ name: '黒松' });
    await bonsai.createBonsai({ name: '五葉松' });
    const res = await flow.loadCsvForPreview(
      {
        type: 'bonsai_csv',
        period: 'all',
        scope: 'all',
        includeArchived: false,
        lang: 'ja',
      },
      t,
    );
    expect(res.count).toBe(2);
    expect(res.fileName).toMatch(/\.csv$/);
    expect(res.csv.split('\n').length).toBeGreaterThanOrEqual(3); // header + 2 行
  });

  test('bonsai_csv: includeArchived=false は archived を除外', async () => {
    const { flow, bonsai } = mods();
    await bonsai.createBonsai({ name: 'active' });
    const arch = await bonsai.createBonsai({ name: 'archived' });
    await bonsai.archiveBonsai(arch.id);
    const res = await flow.loadCsvForPreview(
      { type: 'bonsai_csv', period: 'all', scope: 'all', includeArchived: false, lang: 'ja' },
      t,
    );
    expect(res.count).toBe(1);
  });

  test('events_csv: period custom で期間フィルタ', async () => {
    const { flow, bonsai, ev } = mods();
    const b = await bonsai.createBonsai({ name: 'B' });
    await ev.createEvent({
      bonsaiId: b.id,
      type: 'watering',
      occurredAtUtc: '2026-01-15T00:00:00.000Z',
    });
    await ev.createEvent({
      bonsaiId: b.id,
      type: 'watering',
      occurredAtUtc: '2026-06-15T00:00:00.000Z',
    });

    const res = await flow.loadCsvForPreview(
      {
        type: 'events_csv',
        period: 'custom',
        dateFrom: '2026-01-01',
        dateTo: '2026-03-01',
        scope: 'all',
        includeArchived: false,
        lang: 'ja',
      },
      t,
    );
    expect(res.count).toBe(1); // 1 月分のみ
  });

  test('species_csv: 保有樹種の集計行', async () => {
    const { flow, bonsai, species } = mods();
    const sp = (await species.getAllSpecies('ja'))[0]!;
    await bonsai.createBonsai({ name: 'S1', speciesId: sp.id });
    await bonsai.createBonsai({ name: 'S2', speciesId: sp.id });
    const res = await flow.loadCsvForPreview(
      { type: 'species_csv', period: 'all', scope: 'all', includeArchived: false, lang: 'ja' },
      t,
    );
    expect(res.count).toBeGreaterThanOrEqual(1); // 樹種ごと 1 行
  });

  test('scope=selected は選択 ID のみ', async () => {
    const { flow, bonsai } = mods();
    const a = await bonsai.createBonsai({ name: 'A' });
    await bonsai.createBonsai({ name: 'B' });
    const res = await flow.loadCsvForPreview(
      {
        type: 'bonsai_csv',
        period: 'all',
        scope: 'selected',
        selectedBonsaiIds: [a.id],
        includeArchived: false,
        lang: 'ja',
      },
      t,
    );
    expect(res.count).toBe(1);
  });
});

describe('loadListPdfHtml', () => {
  test('対象盆栽数 = count、HTML に盆栽名を含む', async () => {
    const { flow, bonsai, ev } = mods();
    const b = await bonsai.createBonsai({ name: 'リスト盆栽' });
    await ev.createEvent({ bonsaiId: b.id, type: 'watering' });
    const res = await flow.loadListPdfHtml(
      { type: 'list_pdf', period: 'all', scope: 'all', includeArchived: false, lang: 'ja' },
      t,
    );
    expect(res.count).toBe(1);
    expect(res.html).toContain('リスト盆栽');
  });
});

describe('prepareListPdf (Phase 3: 写真フォールバック用ファクトリ)', () => {
  test('count / photoCount / attempt 別 HTML 生成', async () => {
    const { flow, bonsai, ev } = mods();
    const b = await bonsai.createBonsai({ name: 'カタログ盆栽' });
    await ev.createEvent({ bonsaiId: b.id, type: 'watering' });
    const prep = await flow.prepareListPdf(
      { type: 'list_pdf', period: 'all', scope: 'all', includeArchived: false, lang: 'ja' },
      t,
    );
    expect(prep.count).toBe(1);
    expect(prep.photoCount).toBe(0); // 写真なし (test DB)
    const html1 = await prep.buildHtmlForAttempt(1);
    const html3 = await prep.buildHtmlForAttempt(3);
    // 写真なしでも attempt に依らず生成でき、カタログに盆栽名 + プレースホルダーが出る
    expect(html1).toContain('カタログ盆栽');
    expect(html1).toContain('class="catalog"');
    expect(html1).toContain('class="cat-ph"');
    expect(html3).toContain('カタログ盆栽');
  });
});
