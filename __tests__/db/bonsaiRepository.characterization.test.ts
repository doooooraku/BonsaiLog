/**
 * bonsaiRepository 実 DB characterization (Phase 3 PR 1-2)。
 *
 * node:sqlite harness で CRUD / archive・restore / 完全削除 (CASCADE 非依存の明示削除) /
 * 名前・樹種・樹形 横断検索 (LIKE) / tag フィルタ / pot_info パースを凍結する。
 * 樹種は migrate の seed (5 種) を利用。purgeBonsaiCompletely は写真ゼロで FS 非依存。
 */
/* eslint-disable @typescript-eslint/no-require-imports -- fresh modules required after jest.resetModules() */
import { setupFreshDb } from '../helpers/testDb';

type BonsaiRepo = typeof import('@/src/db/bonsaiRepository');
type EventRepo = typeof import('@/src/db/eventRepository');
type TagRepo = typeof import('@/src/db/tagRepository');
type SpeciesRepo = typeof import('@/src/db/speciesRepository');

function repos() {
  return {
    bonsai: require('@/src/db/bonsaiRepository') as BonsaiRepo,
    ev: require('@/src/db/eventRepository') as EventRepo,
    tag: require('@/src/db/tagRepository') as TagRepo,
    species: require('@/src/db/speciesRepository') as SpeciesRepo,
  };
}

beforeEach(async () => {
  await setupFreshDb();
});

describe('createBonsai / getBonsaiById', () => {
  test('default で ULID id / archivedAt=null / 任意項目 null を埋める', async () => {
    const { bonsai } = repos();
    const b = await bonsai.createBonsai({ name: '黒松' });
    expect(b.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(b.name).toBe('黒松');
    expect(b.archivedAt).toBeNull();
    expect(b.speciesId).toBeNull();

    const got = await bonsai.getBonsaiById(b.id);
    expect(got?.name).toBe('黒松');
  });

  test('存在しない id は null', async () => {
    const { bonsai } = repos();
    expect(await bonsai.getBonsaiById('missing')).toBeNull();
  });

  test('全項目を保存して取り戻せる (estimatedAgeUnknown は 0/1)', async () => {
    const { bonsai } = repos();
    const b = await bonsai.createBonsai({
      name: '五葉松',
      estimatedAge: 30,
      memo: 'メモ',
      acquiredFrom: '園芸店',
      estimatedAgeUnknown: true,
      potInfo: { shape: 'round' },
    });
    const got = await bonsai.getBonsaiById(b.id);
    expect(got?.estimatedAge).toBe(30);
    expect(got?.memo).toBe('メモ');
    expect(got?.estimatedAgeUnknown).toBe(1);
    expect(bonsai.parsePotInfo(got?.potInfo ?? null)).toEqual({ shape: 'round' });
  });
});

describe('getBonsaiWithSpecies', () => {
  test('speciesId があれば seed 樹種を結合して返す', async () => {
    const { bonsai, species } = repos();
    const all = await species.getAllSpecies('ja');
    expect(all.length).toBeGreaterThan(0);
    const sp = all[0]!;
    const b = await bonsai.createBonsai({ name: '結合テスト', speciesId: sp.id });

    const withSp = await bonsai.getBonsaiWithSpecies(b.id, 'ja');
    expect(withSp?.species?.id).toBe(sp.id);
  });

  test('speciesId が null なら species=null', async () => {
    const { bonsai } = repos();
    const b = await bonsai.createBonsai({ name: '無樹種' });
    const withSp = await bonsai.getBonsaiWithSpecies(b.id, 'ja');
    expect(withSp?.species).toBeNull();
  });
});

describe('getAllActiveBonsai / archived 系', () => {
  test('archived を除外し、archive/restore/count が連動する', async () => {
    const { bonsai } = repos();
    const a = await bonsai.createBonsai({ name: 'A' });
    await bonsai.createBonsai({ name: 'B' });

    expect((await bonsai.getAllActiveBonsai()).length).toBe(2);

    await bonsai.archiveBonsai(a.id);
    expect((await bonsai.getAllActiveBonsai()).length).toBe(1);
    expect((await bonsai.getAllArchivedBonsai()).length).toBe(1);
    expect(await bonsai.countArchivedBonsai()).toBe(1);

    await bonsai.restoreBonsai(a.id);
    expect((await bonsai.getAllActiveBonsai()).length).toBe(2);
    expect(await bonsai.countArchivedBonsai()).toBe(0);
  });

  test('tagIds フィルタは全タグを持つ盆栽のみ (AND)', async () => {
    const { bonsai, tag } = repos();
    const a = await bonsai.createBonsai({ name: 'タグ2つ' });
    const b = await bonsai.createBonsai({ name: 'タグ1つ' });
    const t1 = await tag.createOrFindTag('春');
    const t2 = await tag.createOrFindTag('松');
    await tag.attachTagToBonsai(a.id, t1.id);
    await tag.attachTagToBonsai(a.id, t2.id);
    await tag.attachTagToBonsai(b.id, t1.id);

    expect((await bonsai.getAllActiveBonsai({ tagIds: [t1.id] })).length).toBe(2);
    const both = await bonsai.getAllActiveBonsai({ tagIds: [t1.id, t2.id] });
    expect(both.map((x) => x.id)).toEqual([a.id]);
  });

  test('getAllActiveBonsaiWithSpecies は樹種を結合', async () => {
    const { bonsai, species } = repos();
    const sp = (await species.getAllSpecies('ja'))[0]!;
    await bonsai.createBonsai({ name: 'S1', speciesId: sp.id });
    await bonsai.createBonsai({ name: 'S2' });
    const rows = await bonsai.getAllActiveBonsaiWithSpecies('ja');
    expect(rows.length).toBe(2);
    expect(rows.some((r) => r.species?.id === sp.id)).toBe(true);
    expect(rows.some((r) => r.species === null)).toBe(true);
  });
});

describe('updateBonsai', () => {
  test('指定フィールドのみ更新する', async () => {
    const { bonsai } = repos();
    const b = await bonsai.createBonsai({ name: '旧名', memo: '旧メモ' });
    await bonsai.updateBonsai(b.id, { name: '新名' });
    const got = await bonsai.getBonsaiById(b.id);
    expect(got?.name).toBe('新名');
    expect(got?.memo).toBe('旧メモ'); // 未指定は不変
  });

  test('全フィールドを一括更新できる', async () => {
    const { bonsai, species } = repos();
    const sp = (await species.getAllSpecies('ja'))[0]!;
    const b = await bonsai.createBonsai({ name: 'A' });
    await bonsai.updateBonsai(b.id, {
      name: 'B',
      speciesId: sp.id,
      acquiredAt: '2026-01-01T00:00:00.000Z',
      style: 'moyogi',
      potInfo: { size: 'L' },
      estimatedAge: 12,
      memo: 'm',
      purchaseDate: '2026-02-02T00:00:00.000Z',
      acquiredFrom: '市場',
      estimatedAgeUnknown: true,
      customSpeciesId: null,
    });
    const got = await bonsai.getBonsaiById(b.id);
    expect(got?.name).toBe('B');
    expect(got?.speciesId).toBe(sp.id);
    expect(got?.style).toBe('moyogi');
    expect(got?.estimatedAge).toBe(12);
    expect(got?.estimatedAgeUnknown).toBe(1);
    expect(bonsai.parsePotInfo(got?.potInfo ?? null)).toEqual({ size: 'L' });
  });
});

describe('deleteBonsaiHard / purgeBonsaiCompletely', () => {
  test('deleteBonsaiHard は bonsai 行を削除', async () => {
    const { bonsai } = repos();
    const b = await bonsai.createBonsai({ name: '削除' });
    await bonsai.deleteBonsaiHard(b.id);
    expect(await bonsai.getBonsaiById(b.id)).toBeNull();
  });

  test('purgeBonsaiCompletely は子テーブル (events / bonsai_tags) も明示削除', async () => {
    const { bonsai, ev, tag } = repos();
    const b = await bonsai.createBonsai({ name: '完全削除' });
    await ev.createEvent({ bonsaiId: b.id, type: 'watering' });
    const t = await tag.createOrFindTag('タグ');
    await tag.attachTagToBonsai(b.id, t.id);

    await bonsai.purgeBonsaiCompletely(b.id);

    expect(await bonsai.getBonsaiById(b.id)).toBeNull();
    expect((await ev.getActiveEventsByBonsai(b.id)).length).toBe(0);
    expect(await tag.countBonsaiByTag(t.id)).toBe(0); // bonsai_tags も消える
  });
});

describe('searchBonsaiByName', () => {
  test('LIKE 部分一致、archived 除外、空文字は []', async () => {
    const { bonsai } = repos();
    await bonsai.createBonsai({ name: '黒松 太郎' });
    const archived = await bonsai.createBonsai({ name: '黒松 次郎' });
    await bonsai.archiveBonsai(archived.id);

    expect((await bonsai.searchBonsaiByName('黒松')).length).toBe(1); // archived 除外
    expect(await bonsai.searchBonsaiByName('  ')).toEqual([]);
  });

  test('LIKE メタ文字をエスケープ (% は文字として扱う)', async () => {
    const { bonsai } = repos();
    await bonsai.createBonsai({ name: '50%引き' });
    await bonsai.createBonsai({ name: '500円' });
    expect((await bonsai.searchBonsaiByName('50%')).length).toBe(1);
  });
});

describe('searchBonsai (名前 / 樹種 / 樹形 横断)', () => {
  test('名前で一致', async () => {
    const { bonsai } = repos();
    await bonsai.createBonsai({ name: 'けやき盆栽' });
    expect((await bonsai.searchBonsai('けやき')).length).toBe(1);
  });

  test('樹種 (common_name) で一致', async () => {
    const { bonsai, species } = repos();
    const sp = (await species.getAllSpecies('ja'))[0]!;
    await bonsai.createBonsai({ name: '樹種検索', speciesId: sp.id });
    const res = await bonsai.searchBonsai(sp.commonName);
    expect(res.some((b) => b.name === '樹種検索')).toBe(true);
  });

  test('styleEnums で樹形一致', async () => {
    const { bonsai } = repos();
    await bonsai.createBonsai({ name: '直幹の松', style: 'chokkan' });
    const res = await bonsai.searchBonsai('該当しない語', ['chokkan']);
    expect(res.some((b) => b.name === '直幹の松')).toBe(true);
  });
});

describe('getBonsaiByTag', () => {
  test('指定タグの active 盆栽を返す', async () => {
    const { bonsai, tag } = repos();
    const a = await bonsai.createBonsai({ name: 'タグ付き' });
    await bonsai.createBonsai({ name: 'タグなし' });
    const t = await tag.createOrFindTag('お気に入り');
    await tag.attachTagToBonsai(a.id, t.id);

    const res = await bonsai.getBonsaiByTag(t.id);
    expect(res.map((b) => b.id)).toEqual([a.id]);
    expect(await bonsai.getBonsaiByTag('')).toEqual([]);
  });
});

describe('parsePotInfo (純関数)', () => {
  test('valid JSON / null / 不正 JSON', () => {
    const { bonsai } = repos();
    expect(bonsai.parsePotInfo('{"a":1}')).toEqual({ a: 1 });
    expect(bonsai.parsePotInfo(null)).toBeNull();
    expect(bonsai.parsePotInfo('not json')).toBeNull();
  });
});
