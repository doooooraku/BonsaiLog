/**
 * backupService の functional core `buildManifestFromDb` 実 DB characterization (Phase 3 PR 1-3)。
 *
 * 根本原因対策 (functional-core / imperative-shell 分離): DB→manifest シリアライズを
 * I/O-free な核として切り出し、node:sqlite harness で実 DB から正しく serialize されるかを凍結。
 * native I/O (zip/unzip/Sharing/picker/photo-copy) は imperative shell に残し Maestro (PR 1-5) +
 * 既存 backupCoverage(fail-closed 網羅ガード)で検証する。
 *
 * import 側 DB-apply は写真ファイルコピーと同一トランザクション内に融合しているため、その
 * functional-core 抽出は Phase 4 (master-plan) に配置。Phase 3 では Maestro + 既存ガードが網。
 */
/* eslint-disable @typescript-eslint/no-require-imports -- fresh modules required after jest.resetModules() */
import { setupFreshDb } from '../../helpers/testDb';

// imperative shell の native 依存を最小 mock (本テストは core のみを検証、shell は呼ばない)。
jest.mock('expo-file-system/legacy', () => ({ documentDirectory: 'file:///doc/' }));
jest.mock('react-native-zip-archive', () => ({ zip: jest.fn(), unzip: jest.fn() }));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => {}),
}));

type BackupService = typeof import('@/src/features/backup/backupService');
type BonsaiRepo = typeof import('@/src/db/bonsaiRepository');
type EventRepo = typeof import('@/src/db/eventRepository');
type TagRepo = typeof import('@/src/db/tagRepository');
type PhotoRepo = typeof import('@/src/db/photoRepository');

function mods() {
  return {
    backup: require('@/src/features/backup/backupService') as BackupService,
    bonsai: require('@/src/db/bonsaiRepository') as BonsaiRepo,
    ev: require('@/src/db/eventRepository') as EventRepo,
    tag: require('@/src/db/tagRepository') as TagRepo,
    photo: require('@/src/db/photoRepository') as PhotoRepo,
  };
}

beforeEach(async () => {
  await setupFreshDb();
});

describe('buildManifestFromDb (functional core)', () => {
  test('空 DB でも有効な manifest を返す (schemaVersion + 空配列)', async () => {
    const { backup } = mods();
    const { manifest, photoSourceUris } = await backup.buildManifestFromDb();
    expect(typeof manifest.schemaVersion).toBe('number');
    expect(manifest.bonsai).toEqual([]);
    expect(manifest.events).toEqual([]);
    expect(manifest.photos).toEqual([]);
    expect(photoSourceUris).toEqual([]);
  });

  test('bonsai / events / tags / bonsaiTags を全件 serialize', async () => {
    const { backup, bonsai, ev, tag } = mods();
    const b = await bonsai.createBonsai({ name: '黒松', memo: 'メモ' });
    await ev.createEvent({ bonsaiId: b.id, type: 'watering', note: '水やり' });
    const t = await tag.createOrFindTag('春');
    await tag.attachTagToBonsai(b.id, t.id);

    const { manifest } = await backup.buildManifestFromDb();
    expect(manifest.bonsai.length).toBe(1);
    expect(manifest.bonsai[0]?.id).toBe(b.id);
    expect(manifest.bonsai[0]?.memo).toBe('メモ');
    expect(manifest.events.length).toBe(1);
    expect(manifest.events[0]?.bonsaiId).toBe(b.id);
    expect(manifest.tags?.length).toBe(1);
    expect(manifest.bonsaiTags?.length).toBe(1);
  });

  test('photos を serialize し photoSourceUris に絶対 URI を含む', async () => {
    const { backup, bonsai, photo } = mods();
    const b = await bonsai.createBonsai({ name: 'B' });
    await photo.insertPhoto({
      bonsaiId: b.id,
      absoluteUri: `file:///doc/bonsailog/photos/${b.id}/p1.jpg`,
    });

    const { manifest, photoSourceUris } = await backup.buildManifestFromDb();
    expect(manifest.photos.length).toBe(1);
    expect(manifest.photos[0]?.bonsaiId).toBe(b.id);
    expect(photoSourceUris.length).toBe(1);
    expect(photoSourceUris[0]?.absoluteUri).toContain('file:///doc/');
  });

  test('カスタム樹種 / 樹形も manifest に含む', async () => {
    const { backup } = mods();
    const customSpecies =
      require('@/src/db/bonsaiSpeciesCustomRepository') as typeof import('@/src/db/bonsaiSpeciesCustomRepository');
    const customStyle =
      require('@/src/db/bonsaiStylesCustomRepository') as typeof import('@/src/db/bonsaiStylesCustomRepository');
    await customSpecies.createOrFindCustomSpecies('謎の木');
    await customStyle.createOrFindCustomStyle('変わり樹形');

    const { manifest } = await backup.buildManifestFromDb();
    expect(manifest.customSpecies?.length).toBe(1);
    expect(manifest.customStyles?.length).toBe(1);
  });

  test('deleted_at 付き (ゴミ箱) event も manifest に含む (完全バックアップ)', async () => {
    const { backup, bonsai, ev } = mods();
    const b = await bonsai.createBonsai({ name: 'B' });
    const e = await ev.createEvent({ bonsaiId: b.id, type: 'pruning' });
    await ev.softDeleteEvent(e.id);

    const { manifest } = await backup.buildManifestFromDb();
    // SELECT * FROM events は deleted も含む (バックアップは全件)
    expect(manifest.events.length).toBe(1);
    expect(manifest.events[0]?.deletedAt).not.toBeNull();
  });

  test('recurrence_rules と events の rule 連結を manifest に含む (Sess99 #1121)', async () => {
    const { backup, bonsai } = mods();
    const recurrence =
      require('@/src/db/recurrenceRuleRepository') as typeof import('@/src/db/recurrenceRuleRepository');
    const b = await bonsai.createBonsai({ name: 'B' });
    const rule = await recurrence.createRecurrenceRule({
      bonsaiId: b.id,
      eventType: 'watering',
      rrule: 'FREQ=DAILY',
      startAtUtc: '2026-06-01T00:00:00.000Z',
      endAtUtc: '2026-06-03T23:59:59.000Z',
      memo: '毎日の水やり',
    });

    const { manifest } = await backup.buildManifestFromDb();
    // rule 本体が serialize される (memo / rrule / exdates 含む全列)
    expect(manifest.recurrenceRules?.length).toBe(1);
    expect(manifest.recurrenceRules?.[0]?.id).toBe(rule.id);
    expect(manifest.recurrenceRules?.[0]?.rrule).toBe('FREQ=DAILY');
    expect(manifest.recurrenceRules?.[0]?.memo).toBe('毎日の水やり');
    // rule 作成時に事前展開された planned events が rule 連結付きで serialize される
    // (連結が欠落すると復元後の起動時バッチが予定を二重生成する)
    expect(manifest.events.length).toBeGreaterThan(0);
    expect(manifest.events.every((e) => e.recurrenceRuleId === rule.id)).toBe(true);
  });
});
