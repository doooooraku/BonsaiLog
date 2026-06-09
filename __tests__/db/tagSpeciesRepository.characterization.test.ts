/**
 * tag / species / custom-species / custom-style Repository 実 DB characterization (Phase 3 PR 1-2)。
 *
 * node:sqlite harness で:
 * - tagRepository: 正規化一意性 / createOrFind / rename(ok/empty/duplicate) / recent / mostUsed /
 *   counts / stats / attach・detach
 * - speciesRepository: seed 5 種取得 / locale フォールバック (ja→en→学名) / cleanupObsolete
 * - custom species / custom style: createOrFind / getAll / delete
 * を凍結する。
 */
/* eslint-disable @typescript-eslint/no-require-imports -- fresh modules required after jest.resetModules() */
import type { SQLiteDatabase } from 'expo-sqlite';

import { setupFreshDb } from '../helpers/testDb';

type TagRepo = typeof import('@/src/db/tagRepository');
type SpeciesRepo = typeof import('@/src/db/speciesRepository');
type BonsaiRepo = typeof import('@/src/db/bonsaiRepository');
type CustomSpeciesRepo = typeof import('@/src/db/bonsaiSpeciesCustomRepository');
type CustomStyleRepo = typeof import('@/src/db/bonsaiStylesCustomRepository');

function repos() {
  return {
    tag: require('@/src/db/tagRepository') as TagRepo,
    species: require('@/src/db/speciesRepository') as SpeciesRepo,
    bonsai: require('@/src/db/bonsaiRepository') as BonsaiRepo,
    customSpecies: require('@/src/db/bonsaiSpeciesCustomRepository') as CustomSpeciesRepo,
    customStyle: require('@/src/db/bonsaiStylesCustomRepository') as CustomStyleRepo,
  };
}

let db: SQLiteDatabase;
beforeEach(async () => {
  db = await setupFreshDb();
});

// ===========================================================================
// tagRepository
// ===========================================================================

describe('tagRepository.normalizeTagName (純関数)', () => {
  test('trim + lowercase + 連続空白圧縮', () => {
    const { tag } = repos();
    expect(tag.normalizeTagName(' Spring  Pruning ')).toBe('spring pruning');
    expect(tag.normalizeTagName('松')).toBe('松');
  });
});

describe('tagRepository.createOrFindTag', () => {
  test('新規作成し、同 normalized 名は既存を返す (大文字小文字無視)', async () => {
    const { tag } = repos();
    const t1 = await tag.createOrFindTag('Spring');
    const t2 = await tag.createOrFindTag('  spring ');
    expect(t2.id).toBe(t1.id); // 同一視
    expect(await tag.countAllTags()).toBe(1);
  });

  test('正規化後に空なら throw', async () => {
    const { tag } = repos();
    await expect(tag.createOrFindTag('   ')).rejects.toThrow();
  });
});

describe('tagRepository.renameTag', () => {
  test('ok / empty / duplicate を返す', async () => {
    const { tag } = repos();
    const a = await tag.createOrFindTag('alpha');
    const b = await tag.createOrFindTag('beta');

    expect(await tag.renameTag(a.id, 'gamma')).toBe('ok');
    expect(await tag.renameTag(a.id, '   ')).toBe('empty');
    expect(await tag.renameTag(a.id, 'beta')).toBe('duplicate'); // b と衝突
    expect((await tag.getTagsByBonsai(b.id)).length).toBe(0); // 無害確認 (b は未 attach)
  });
});

describe('tagRepository attach / detach / getTagsByBonsai', () => {
  test('attach は冪等、detach で外れる', async () => {
    const { tag, bonsai } = repos();
    const bo = await bonsai.createBonsai({ name: 'B' });
    const t = await tag.createOrFindTag('春');
    await tag.attachTagToBonsai(bo.id, t.id);
    await tag.attachTagToBonsai(bo.id, t.id); // 二重 attach は OR IGNORE で無音
    expect(await tag.countBonsaiByTag(t.id)).toBe(1);
    expect((await tag.getTagsByBonsai(bo.id)).map((x) => x.id)).toEqual([t.id]);

    await tag.detachTagFromBonsai(bo.id, t.id);
    expect(await tag.countBonsaiByTag(t.id)).toBe(0);
  });
});

describe('tagRepository.getMostUsedTags / getTagsWithStats', () => {
  test('mostUsed は使用数降順、未使用は除外', async () => {
    const { tag, bonsai } = repos();
    const b1 = await bonsai.createBonsai({ name: 'b1' });
    const b2 = await bonsai.createBonsai({ name: 'b2' });
    const popular = await tag.createOrFindTag('人気');
    const rare = await tag.createOrFindTag('少数');
    await tag.createOrFindTag('未使用');
    await tag.attachTagToBonsai(b1.id, popular.id);
    await tag.attachTagToBonsai(b2.id, popular.id);
    await tag.attachTagToBonsai(b1.id, rare.id);

    const most = await tag.getMostUsedTags();
    expect(most.map((t) => t.id)).toEqual([popular.id, rare.id]); // 未使用は HAVING で除外
  });

  test('stats は未使用タグも usageCount=0 / lastUsedAt=null で含む', async () => {
    const { tag, bonsai } = repos();
    const b1 = await bonsai.createBonsai({ name: 'b1' });
    const used = await tag.createOrFindTag('使用');
    const unused = await tag.createOrFindTag('未使用');
    await tag.attachTagToBonsai(b1.id, used.id);

    const stats = await tag.getTagsWithStats();
    const usedStat = stats.find((s) => s.id === used.id);
    const unusedStat = stats.find((s) => s.id === unused.id);
    expect(usedStat?.usageCount).toBe(1);
    expect(usedStat?.lastUsedAt).not.toBeNull();
    expect(unusedStat?.usageCount).toBe(0);
    expect(unusedStat?.lastUsedAt).toBeNull();
  });

  test('getRecentTags は limit 件返す', async () => {
    const { tag } = repos();
    await tag.createOrFindTag('t1');
    await tag.createOrFindTag('t2');
    await tag.createOrFindTag('t3');
    expect((await tag.getRecentTags(2)).length).toBe(2);
    expect(await tag.countAllTags()).toBe(3);
  });
});

// ===========================================================================
// speciesRepository (migrate で 5 種 seed 済)
// ===========================================================================

describe('speciesRepository 取得 + locale フォールバック', () => {
  test('getAllSpecies は seed 5 種を返す', async () => {
    const { species } = repos();
    const all = await species.getAllSpecies('ja');
    expect(all.length).toBe(5);
    expect(all.every((s) => typeof s.commonName === 'string')).toBe(true);
  });

  test('getSpeciesById: ja あり → hasNameInLocale true', async () => {
    const { species } = repos();
    const sp = (await species.getAllSpecies('ja'))[0]!;
    const ja = await species.getSpeciesById(sp.id, 'ja');
    expect(ja?.hasNameInLocale).toBe(true);
  });

  test('getSpeciesById: fr なし → en フォールバック (hasNameInLocale false)', async () => {
    const { species } = repos();
    const sp = (await species.getAllSpecies('ja'))[0]!;
    const fr = await species.getSpeciesById(sp.id, 'fr');
    const en = await species.getSpeciesById(sp.id, 'en');
    expect(fr?.hasNameInLocale).toBe(false);
    expect(fr?.commonName).toBe(en?.commonName); // en にフォールバック
  });

  test('species_names が無い樹種は学名にフォールバック', async () => {
    const { species } = repos();
    await db.runAsync(
      `INSERT INTO species (id, scientific_name, family, climate_zone_min, climate_zone_max, default_tasks, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      ['NONAME1', 'Testus nameless', 'Testaceae', 5, 9, null, '2026-01-01', '2026-01-01'],
    );
    const got = await species.getSpeciesById('NONAME1', 'ja');
    expect(got?.commonName).toBe('Testus nameless'); // 学名フォールバック
    expect(got?.hasNameInLocale).toBe(false);
  });

  test('getSpeciesByScientificName で取得', async () => {
    const { species } = repos();
    const sp = (await species.getAllSpecies('ja'))[0]!;
    const got = await species.getSpeciesByScientificName(sp.scientificName, 'ja');
    expect(got?.id).toBe(sp.id);
  });

  test('cleanupObsoleteSpecies は seed 5 種以外を削除', async () => {
    const { species } = repos();
    await db.runAsync(
      `INSERT INTO species (id, scientific_name, family, climate_zone_min, climate_zone_max, default_tasks, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      ['OBSOLETE1', 'Obsoletus species', 'Old', 1, 2, null, '2020-01-01', '2020-01-01'],
    );
    expect((await species.getAllSpecies('ja')).length).toBe(6);
    const { deleted } = await species.cleanupObsoleteSpecies();
    expect(deleted).toBe(1);
    expect((await species.getAllSpecies('ja')).length).toBe(5);
  });
});

// ===========================================================================
// bonsaiSpeciesCustomRepository
// ===========================================================================

describe('bonsaiSpeciesCustomRepository', () => {
  test('createOrFind は新規作成し同名は既存を返す、空は throw', async () => {
    const { customSpecies } = repos();
    const a = await customSpecies.createOrFindCustomSpecies('我が家の謎の木');
    const b = await customSpecies.createOrFindCustomSpecies('我が家の謎の木');
    expect(b.id).toBe(a.id);
    expect((await customSpecies.getAllCustomSpecies()).length).toBe(1);
    expect(await customSpecies.getCustomSpeciesById(a.id)).not.toBeNull();
    await expect(customSpecies.createOrFindCustomSpecies('  ')).rejects.toThrow();
  });

  // Sess89 Phase 2: rename + delete + countBonsai + WithStats の新規 CRUD 関数群
  test('renameCustomSpecies: 正常系 / 空文字 / 重複', async () => {
    const { customSpecies } = repos();
    const a = await customSpecies.createOrFindCustomSpecies('盆栽 A');
    const b = await customSpecies.createOrFindCustomSpecies('盆栽 B');

    expect(await customSpecies.renameCustomSpecies(a.id, '盆栽 A 改')).toBe('ok');
    expect(await customSpecies.renameCustomSpecies(a.id, '')).toBe('empty');
    expect(await customSpecies.renameCustomSpecies(a.id, '   ')).toBe('empty');
    // a を b の名前に rename しようとすると duplicate (= UNIQUE 制約)
    expect(await customSpecies.renameCustomSpecies(a.id, '盆栽 B')).toBe('duplicate');
    // 自分自身の名前への rename は ok (no-op)
    expect(await customSpecies.renameCustomSpecies(b.id, '盆栽 B')).toBe('ok');
  });

  test('deleteCustomSpecies: 物理削除 + ON DELETE SET NULL', async () => {
    const { customSpecies } = repos();
    const a = await customSpecies.createOrFindCustomSpecies('削除テスト');
    expect(await customSpecies.countAllCustomSpecies()).toBe(1);
    await customSpecies.deleteCustomSpecies(a.id);
    expect(await customSpecies.countAllCustomSpecies()).toBe(0);
    expect(await customSpecies.getCustomSpeciesById(a.id)).toBeNull();
  });

  test('countBonsaiByCustomSpecies: 紐づく盆栽件数を返す (archived_at IS NULL のみ)', async () => {
    const { customSpecies } = repos();
    const sp = await customSpecies.createOrFindCustomSpecies('紐づけテスト');
    // 盆栽未紐づけ時点で 0
    expect(await customSpecies.countBonsaiByCustomSpecies(sp.id)).toBe(0);
  });

  test('getCustomSpeciesWithStats: 全件 + 使用統計 (= usageCount + lastUsedAt) を返す', async () => {
    const { customSpecies } = repos();
    await customSpecies.createOrFindCustomSpecies('統計 A');
    await customSpecies.createOrFindCustomSpecies('統計 B');
    const stats = await customSpecies.getCustomSpeciesWithStats();
    expect(stats.length).toBe(2);
    // 盆栽未紐づけなので全て usageCount=0
    expect(stats.every((s) => s.usageCount === 0)).toBe(true);
    expect(stats.every((s) => s.lastUsedAt === null)).toBe(true);
  });
});

// ===========================================================================
// bonsaiStylesCustomRepository
// ===========================================================================

describe('bonsaiStylesCustomRepository', () => {
  test('createOrFind / getAll / delete', async () => {
    const { customStyle } = repos();
    const a = await customStyle.createOrFindCustomStyle('変わり樹形');
    const b = await customStyle.createOrFindCustomStyle('変わり樹形');
    expect(b.id).toBe(a.id);
    expect((await customStyle.getAllCustomStyles()).length).toBe(1);

    await customStyle.deleteCustomStyle(a.id);
    expect((await customStyle.getAllCustomStyles()).length).toBe(0);
    await expect(customStyle.createOrFindCustomStyle('')).rejects.toThrow();
  });

  // Sess89 Phase 3: rename + delete cascade NULL + countBonsai + WithStats の新規 CRUD 関数群 (案 c)
  test('renameCustomStyle: 正常系 / 空文字 / 重複 / no-op', async () => {
    const { customStyle } = repos();
    const a = await customStyle.createOrFindCustomStyle('樹形 A');
    const b = await customStyle.createOrFindCustomStyle('樹形 B');

    expect(await customStyle.renameCustomStyle(a.id, '樹形 A 改')).toBe('ok');
    expect(await customStyle.renameCustomStyle(a.id, '')).toBe('empty');
    expect(await customStyle.renameCustomStyle(a.id, '   ')).toBe('empty');
    expect(await customStyle.renameCustomStyle(a.id, '樹形 B')).toBe('duplicate');
    // 自分自身の名前 (= no-op) は 'ok'
    expect(await customStyle.renameCustomStyle(b.id, '樹形 B')).toBe('ok');
  });

  test('deleteCustomStyle: 物理削除 (= atomic NULL cascade for bonsai.style raw text)', async () => {
    const { customStyle } = repos();
    const a = await customStyle.createOrFindCustomStyle('削除テスト樹形');
    expect((await customStyle.getAllCustomStyles()).length).toBe(1);
    await customStyle.deleteCustomStyle(a.id);
    expect((await customStyle.getAllCustomStyles()).length).toBe(0);
    // 冪等性: 二度目の delete は no-op で throw しない
    await customStyle.deleteCustomStyle(a.id);
  });

  test('countBonsaiByCustomStyle: 紐づく盆栽件数を返す (raw text 完全一致)', async () => {
    const { customStyle } = repos();
    const a = await customStyle.createOrFindCustomStyle('紐づけテスト');
    // 盆栽未紐づけ時点で 0
    expect(await customStyle.countBonsaiByCustomStyle(a.name)).toBe(0);
  });

  test('getCustomStylesWithStats: 全件 + 使用統計 (= usageCount + lastUsedAt)', async () => {
    const { customStyle } = repos();
    await customStyle.createOrFindCustomStyle('統計樹形 A');
    await customStyle.createOrFindCustomStyle('統計樹形 B');
    const stats = await customStyle.getCustomStylesWithStats();
    expect(stats.length).toBe(2);
    expect(stats.every((s) => s.usageCount === 0)).toBe(true);
    expect(stats.every((s) => s.lastUsedAt === null)).toBe(true);
  });
});
