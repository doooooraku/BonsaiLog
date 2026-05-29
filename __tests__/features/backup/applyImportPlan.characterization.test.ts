/**
 * backupService の import 側 functional core `applyImportPlan` 実 DB characterization
 * (master-plan Phase 4 F5/C3、ADR-0007 最高リスク=ユーザーデータ経路)。
 *
 * 根本原因対策: import の DB-apply を写真コピー (native I/O) から分離した純粋核を
 * node:sqlite harness で実 DB に対し凍結。FK 安全順・FTS active-only・ロールバックを担保。
 * 写真の物理コピーは copyPhotoFile コールバックを fake にして I/O なしで検証する。
 */
/* eslint-disable @typescript-eslint/no-require-imports -- fresh modules required after jest.resetModules() */
import type { SQLiteDatabase } from 'expo-sqlite';

import { setupFreshDb } from '../../helpers/testDb';
import type {
  BackupBonsai,
  BackupEvent,
  BackupNamed,
  BackupPhoto,
  BackupTag,
} from '@/src/features/backup/backupTypes';

type ApplyModule = typeof import('@/src/features/backup/applyImportPlan');
type PlannerModule = typeof import('@/src/features/backup/backupImportPlanner');

let db: SQLiteDatabase;

beforeEach(async () => {
  db = await setupFreshDb();
});

function mods() {
  return {
    apply: require('@/src/features/backup/applyImportPlan') as ApplyModule,
    planner: require('@/src/features/backup/backupImportPlanner') as PlannerModule,
  };
}

// ---- ファクトリ (manifest 由来 DTO の最小形) ----
const TS = '2026-05-29T00:00:00.000Z';

function makeBonsai(id: string, over: Partial<BackupBonsai> = {}): BackupBonsai {
  return {
    id,
    name: `盆栽-${id}`,
    speciesId: null,
    acquiredAt: null,
    style: null,
    potInfo: null,
    estimatedAge: null,
    memo: null,
    purchaseDate: null,
    acquiredFrom: null,
    estimatedAgeUnknown: 0,
    customSpeciesId: null,
    archivedAt: null,
    createdAt: TS,
    updatedAt: TS,
    ...over,
  };
}

function makeEvent(id: string, bonsaiId: string, over: Partial<BackupEvent> = {}): BackupEvent {
  return {
    id,
    bonsaiId,
    type: 'watering',
    status: 'logged',
    occurredAtUtc: TS,
    tzOffsetMin: 540,
    tzIana: 'Asia/Tokyo',
    durationMin: null,
    payloadJson: null,
    note: null,
    deletedAt: null,
    createdAt: TS,
    updatedAt: TS,
    ...over,
  };
}

function makePhoto(id: string, bonsaiId: string, over: Partial<BackupPhoto> = {}): BackupPhoto {
  return {
    id,
    bonsaiId,
    eventId: null,
    fileName: `${id}.jpg`,
    takenAt: null,
    isCover: 0,
    width: null,
    height: null,
    orderIndex: 0,
    caption: null,
    createdAt: TS,
    ...over,
  };
}

function makeNamed(id: string, name: string): BackupNamed {
  return { id, name, createdAt: TS };
}

function makeTag(id: string, name: string): BackupTag {
  return { id, name, nameNormalized: name.toLowerCase(), createdAt: TS };
}

/** manifest 由来の入力から insert プランを作る (既存 ID 集合を渡すと skip 判定される)。 */
function buildPlan(
  planner: PlannerModule,
  input: {
    bonsai?: BackupBonsai[];
    events?: BackupEvent[];
    photos?: BackupPhoto[];
    tags?: BackupTag[];
    bonsaiTags?: { bonsaiId: string; tagId: string; createdAt: string }[];
    customSpecies?: BackupNamed[];
    customStyles?: BackupNamed[];
  },
  existing: { bonsai?: Set<string>; events?: Set<string>; photos?: Set<string> } = {},
) {
  return planner.buildAppendImportPlan({
    bonsai: input.bonsai ?? [],
    events: input.events ?? [],
    photos: input.photos ?? [],
    tags: input.tags ?? [],
    bonsaiTags: input.bonsaiTags ?? [],
    customSpecies: input.customSpecies ?? [],
    customStyles: input.customStyles ?? [],
    existingBonsaiIds: existing.bonsai ?? new Set<string>(),
    existingEventIds: existing.events ?? new Set<string>(),
    existingPhotoIds: existing.photos ?? new Set<string>(),
  });
}

/** 呼ばれた写真を記録しつつ relative_path を返す fake コピー。 */
function makeFakeCopy() {
  const copied: string[] = [];
  const fn = (photo: BackupPhoto) => {
    const rel = `bonsailog/photos/${photo.bonsaiId}/${photo.fileName}`;
    copied.push(rel);
    return rel;
  };
  return { fn, copied };
}

async function count(table: string): Promise<number> {
  const row = await db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) AS c FROM ${table};`);
  return row?.c ?? 0;
}

describe('applyImportPlan (import functional core)', () => {
  test('空 plan は何も INSERT せず copyPhotoFile も呼ばない', async () => {
    const { apply, planner } = mods();
    const copy = makeFakeCopy();
    await apply.applyImportPlan(db, buildPlan(planner, {}), copy.fn);

    expect(await count('bonsai')).toBe(0);
    expect(await count('events')).toBe(0);
    expect(await count('photos')).toBe(0);
    expect(copy.copied).toEqual([]);
  });

  test('full plan を FK 安全順で全件 INSERT し relative_path を保存', async () => {
    const { apply, planner } = mods();
    const speciesRec = makeNamed('sp1', '謎の木');
    const styleRec = makeNamed('st1', '変わり樹形');
    const b = makeBonsai('b1', { customSpeciesId: 'sp1', memo: 'メモ' });
    const tag = makeTag('t1', '春');
    const ev = makeEvent('e1', 'b1', { note: '水やり' });
    const ph = makePhoto('p1', 'b1', { eventId: 'e1', isCover: 1 });
    const plan = buildPlan(planner, {
      bonsai: [b],
      events: [ev],
      photos: [ph],
      tags: [tag],
      bonsaiTags: [{ bonsaiId: 'b1', tagId: 't1', createdAt: TS }],
      customSpecies: [speciesRec],
      customStyles: [styleRec],
    });

    const copy = makeFakeCopy();
    await apply.applyImportPlan(db, plan, copy.fn);

    expect(await count('bonsai_species_custom')).toBe(1);
    expect(await count('bonsai_styles_custom')).toBe(1);
    expect(await count('bonsai')).toBe(1);
    expect(await count('tags')).toBe(1);
    expect(await count('bonsai_tags')).toBe(1);
    expect(await count('events')).toBe(1);
    expect(await count('photos')).toBe(1);

    const bonsaiRow = await db.getFirstAsync<{ memo: string; custom_species_id: string }>(
      'SELECT memo, custom_species_id FROM bonsai WHERE id = ?;',
      ['b1'],
    );
    expect(bonsaiRow?.memo).toBe('メモ');
    expect(bonsaiRow?.custom_species_id).toBe('sp1');

    // 写真は copyPhotoFile が返した relative_path で保存される
    expect(copy.copied).toEqual(['bonsailog/photos/b1/p1.jpg']);
    const photoRow = await db.getFirstAsync<{ relative_path: string }>(
      'SELECT relative_path FROM photos WHERE id = ?;',
      ['p1'],
    );
    expect(photoRow?.relative_path).toBe('bonsailog/photos/b1/p1.jpg');
  });

  test('deletedAt 付き event は events_fts に同期しない (active のみ)', async () => {
    const { apply, planner } = mods();
    const b = makeBonsai('b1');
    const active = makeEvent('eActive', 'b1', { note: 'active' });
    const deleted = makeEvent('eDeleted', 'b1', { note: 'deleted', deletedAt: TS });
    const plan = buildPlan(planner, { bonsai: [b], events: [active, deleted] });

    await apply.applyImportPlan(db, plan, makeFakeCopy().fn);

    expect(await count('events')).toBe(2);
    // events_fts は active な 1 件のみ
    expect(await count('events_fts')).toBe(1);
    const ftsRow = await db.getFirstAsync<{ event_id: string }>('SELECT event_id FROM events_fts;');
    expect(ftsRow?.event_id).toBe('eActive');
  });

  test('既存 ID は buildAppendImportPlan が skip → 二重 import は冪等 (0 件追加)', async () => {
    const { apply, planner } = mods();
    const b = makeBonsai('b1');
    // 1 回目: 新規 insert
    await apply.applyImportPlan(db, buildPlan(planner, { bonsai: [b] }), makeFakeCopy().fn);
    expect(await count('bonsai')).toBe(1);

    // 2 回目: 既存 ID を渡して plan を作ると skip される (再 import の冪等性)
    const plan2 = buildPlan(planner, { bonsai: [b] }, { bonsai: new Set(['b1']) });
    expect(plan2.bonsaiToInsert.length).toBe(0);
    await apply.applyImportPlan(db, plan2, makeFakeCopy().fn);
    expect(await count('bonsai')).toBe(1);
  });

  test('写真コピー失敗で全 INSERT がロールバック (致命的データ破損を防ぐ)', async () => {
    const { apply, planner } = mods();
    const b = makeBonsai('b1');
    const ph = makePhoto('p1', 'b1');
    const plan = buildPlan(planner, { bonsai: [b], photos: [ph] });

    const throwingCopy = () => {
      throw new Error('copy failed');
    };

    await expect(apply.applyImportPlan(db, plan, throwingCopy)).rejects.toThrow('copy failed');

    // bonsai は photo より先に INSERT されるが、トランザクションごとロールバックされ 0 件
    expect(await count('bonsai')).toBe(0);
    expect(await count('photos')).toBe(0);
  });
});
