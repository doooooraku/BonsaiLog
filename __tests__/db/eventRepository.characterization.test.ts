/**
 * eventRepository 実 DB characterization (Phase 3 PR 1-1)。
 *
 * 既存 __tests__/db/eventRepository.test.ts は静的解析 (SQL injection guard / FTS 同期の存在) を
 * 担保する。本 file は node:sqlite harness (helpers/testDb) で **実際の挙動を凍結** する:
 * CRUD / status lifecycle / soft-delete + 30 日 purge / FTS5 検索 / tag フィルタ / bulk /
 * atomic 変換。Phase 4 で god component を分割しても挙動が変わらないことの安全網。
 *
 * 注意: 各テストは beforeEach の setupFreshDb (resetModules) 後に repo を require すること。
 */
/* eslint-disable @typescript-eslint/no-require-imports -- fresh modules required after jest.resetModules() */
import { setupFreshDb } from '../helpers/testDb';

type EventRepo = typeof import('@/src/db/eventRepository');
type BonsaiRepo = typeof import('@/src/db/bonsaiRepository');
type TagRepo = typeof import('@/src/db/tagRepository');

function loadRepos() {
  return {
    ev: require('@/src/db/eventRepository') as EventRepo,
    bonsai: require('@/src/db/bonsaiRepository') as BonsaiRepo,
    tag: require('@/src/db/tagRepository') as TagRepo,
  };
}

async function makeBonsai(name = 'テスト盆栽'): Promise<string> {
  const { bonsai } = loadRepos();
  const b = await bonsai.createBonsai({ name });
  return b.id;
}

beforeEach(async () => {
  await setupFreshDb();
});

describe('createEvent', () => {
  test('default で status=logged / ULID id / tz 3層 / occurredAt=now を埋める', async () => {
    const { ev } = loadRepos();
    const bonsaiId = await makeBonsai();
    const created = await ev.createEvent({ bonsaiId, type: 'watering' });

    expect(created.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/); // ULID
    expect(created.status).toBe('logged');
    expect(created.bonsaiId).toBe(bonsaiId);
    expect(typeof created.tzOffsetMin).toBe('number');
    expect(typeof created.tzIana).toBe('string');
    expect(created.deletedAt).toBeNull();
    expect(created.occurredAtUtc).toBeTruthy();
  });

  test('DB に永続化され getEventById で取り戻せる', async () => {
    const { ev } = loadRepos();
    const bonsaiId = await makeBonsai();
    const created = await ev.createEvent({ bonsaiId, type: 'pruning', note: 'メモ' });
    const got = await ev.getEventById(created.id);
    expect(got).not.toBeNull();
    expect(got?.id).toBe(created.id);
    expect(got?.note).toBe('メモ');
    expect(got?.type).toBe('pruning');
  });

  test('status=planned + occurredAtUtc 明示で予定 event を作れる', async () => {
    const { ev } = loadRepos();
    const bonsaiId = await makeBonsai();
    const created = await ev.createEvent({
      bonsaiId,
      type: 'repotting',
      status: 'planned',
      occurredAtUtc: '2099-01-01T00:00:00.000Z',
    });
    expect(created.status).toBe('planned');
    expect(created.occurredAtUtc).toBe('2099-01-01T00:00:00.000Z');
  });

  test('createEvent は FTS5 に同期し searchEvents でヒットする', async () => {
    const { ev } = loadRepos();
    const bonsaiId = await makeBonsai();
    // node:sqlite (SQLite 3.51) は trigram + detail=column で 4 文字以上の phrase query を
    // 拒否する (expo-sqlite のビルドは許容)。単一トリグラム = 3 文字検索で MATCH 経路を検証する。
    await ev.createEvent({ bonsaiId, type: 'pruning', note: 'cut the top' });
    const hits = await ev.searchEvents('top');
    expect(hits.length).toBe(1);
    expect(hits[0]?.note).toBe('cut the top');
  });
});

describe('getEventById', () => {
  test('存在しない id は null', async () => {
    const { ev } = loadRepos();
    expect(await ev.getEventById('nonexistent')).toBeNull();
  });
});

describe('getActiveEventsByBonsai', () => {
  test('deleted を除外し occurred_at_utc 降順で返す', async () => {
    const { ev } = loadRepos();
    const bonsaiId = await makeBonsai();
    await ev.createEvent({ bonsaiId, type: 'watering', occurredAtUtc: '2026-01-01T00:00:00.000Z' });
    const mid = await ev.createEvent({
      bonsaiId,
      type: 'watering',
      occurredAtUtc: '2026-03-01T00:00:00.000Z',
    });
    await ev.createEvent({ bonsaiId, type: 'watering', occurredAtUtc: '2026-02-01T00:00:00.000Z' });
    await ev.softDeleteEvent(mid.id);

    const rows = await ev.getActiveEventsByBonsai(bonsaiId);
    expect(rows.map((r) => r.occurredAtUtc)).toEqual([
      '2026-02-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z',
    ]);
  });

  test('別 bonsai の event は混ざらない', async () => {
    const { ev } = loadRepos();
    const a = await makeBonsai('A');
    const b = await makeBonsai('B');
    await ev.createEvent({ bonsaiId: a, type: 'watering' });
    await ev.createEvent({ bonsaiId: b, type: 'watering' });
    expect((await ev.getActiveEventsByBonsai(a)).length).toBe(1);
  });
});

describe('getEventsInRange', () => {
  test('bonsaiIds / from / to でフィルタする', async () => {
    const { ev } = loadRepos();
    const a = await makeBonsai('A');
    const b = await makeBonsai('B');
    await ev.createEvent({
      bonsaiId: a,
      type: 'watering',
      occurredAtUtc: '2026-01-10T00:00:00.000Z',
    });
    await ev.createEvent({
      bonsaiId: a,
      type: 'watering',
      occurredAtUtc: '2026-06-10T00:00:00.000Z',
    });
    await ev.createEvent({
      bonsaiId: b,
      type: 'watering',
      occurredAtUtc: '2026-01-10T00:00:00.000Z',
    });

    const onlyA = await ev.getEventsInRange({ bonsaiIds: [a] });
    expect(onlyA.length).toBe(2);

    const ranged = await ev.getEventsInRange({
      bonsaiIds: [a],
      fromIso: '2026-01-01T00:00:00.000Z',
      toIso: '2026-03-01T00:00:00.000Z',
    });
    expect(ranged.length).toBe(1);
    expect(ranged[0]?.occurredAtUtc).toBe('2026-01-10T00:00:00.000Z');
  });

  test('引数なしは全 active を返す', async () => {
    const { ev } = loadRepos();
    const a = await makeBonsai('A');
    await ev.createEvent({ bonsaiId: a, type: 'watering' });
    await ev.createEvent({ bonsaiId: a, type: 'pruning' });
    expect((await ev.getEventsInRange({})).length).toBe(2);
  });
});

describe('getAllActiveWateringEventsLogged', () => {
  test('watering + logged のみ返す (planned / 他 type は除外)', async () => {
    const { ev } = loadRepos();
    const bonsaiId = await makeBonsai();
    await ev.createEvent({ bonsaiId, type: 'watering', status: 'logged' });
    await ev.createEvent({
      bonsaiId,
      type: 'watering',
      status: 'planned',
      occurredAtUtc: '2099-01-01T00:00:00.000Z',
    });
    await ev.createEvent({ bonsaiId, type: 'pruning', status: 'logged' });

    const rows = await ev.getAllActiveWateringEventsLogged();
    expect(rows.length).toBe(1);
    expect(rows[0]?.type).toBe('watering');
    expect(rows[0]?.status).toBe('logged');
  });
});

describe('getAllActivePlannedAndLoggedEvents', () => {
  test('planned + logged を occurred_at 昇順、cancelled / deleted を除外', async () => {
    const { ev } = loadRepos();
    const bonsaiId = await makeBonsai();
    await ev.createEvent({ bonsaiId, type: 'watering', occurredAtUtc: '2026-05-01T00:00:00.000Z' });
    await ev.createEvent({
      bonsaiId,
      type: 'repotting',
      status: 'planned',
      occurredAtUtc: '2026-01-01T00:00:00.000Z',
    });
    const cancelled = await ev.createEvent({ bonsaiId, type: 'pruning' });
    await ev.markEventCancelled(cancelled.id);

    const rows = await ev.getAllActivePlannedAndLoggedEvents();
    expect(rows.map((r) => r.occurredAtUtc)).toEqual([
      '2026-01-01T00:00:00.000Z',
      '2026-05-01T00:00:00.000Z',
    ]);
  });
});

describe('getTrashedEvents', () => {
  test('deleted_at NOT NULL のみ、bonsaiId 任意フィルタ', async () => {
    const { ev } = loadRepos();
    const a = await makeBonsai('A');
    const e1 = await ev.createEvent({ bonsaiId: a, type: 'watering' });
    await ev.createEvent({ bonsaiId: a, type: 'pruning' });
    await ev.softDeleteEvent(e1.id);

    expect((await ev.getTrashedEvents()).length).toBe(1);
    expect((await ev.getTrashedEvents(a)).length).toBe(1);
    expect((await ev.getTrashedEvents('other')).length).toBe(0);
  });
});

describe('getEventsByStatus / getEventsByType', () => {
  test('status 絞り込み', async () => {
    const { ev } = loadRepos();
    const bonsaiId = await makeBonsai();
    await ev.createEvent({ bonsaiId, type: 'watering', status: 'logged' });
    await ev.createEvent({
      bonsaiId,
      type: 'watering',
      status: 'planned',
      occurredAtUtc: '2099-01-01T00:00:00.000Z',
    });
    expect((await ev.getEventsByStatus(bonsaiId, 'planned')).length).toBe(1);
  });

  test('type 絞り込み (+ optional status)', async () => {
    const { ev } = loadRepos();
    const bonsaiId = await makeBonsai();
    await ev.createEvent({ bonsaiId, type: 'watering', status: 'logged' });
    await ev.createEvent({ bonsaiId, type: 'pruning', status: 'logged' });
    expect((await ev.getEventsByType(bonsaiId, 'watering')).length).toBe(1);
    expect((await ev.getEventsByType(bonsaiId, 'watering', { status: 'planned' })).length).toBe(0);
  });
});

describe('updateEvent / markEventLogged / markEventCancelled', () => {
  test('note 更新で FTS5 も再同期される', async () => {
    const { ev } = loadRepos();
    const bonsaiId = await makeBonsai();
    const e = await ev.createEvent({ bonsaiId, type: 'pruning', note: 'tag old' });
    await ev.updateEvent(e.id, { note: 'tag new' });

    expect((await ev.getEventById(e.id))?.note).toBe('tag new');
    expect((await ev.searchEvents('new')).length).toBe(1);
    expect((await ev.searchEvents('old')).length).toBe(0); // 旧 note は索引から消える
  });

  test('存在しない id の update は throw', async () => {
    const { ev } = loadRepos();
    await expect(ev.updateEvent('missing', { note: 'x' })).rejects.toThrow('Event not found');
  });

  test('markEventLogged は status=logged に、markEventCancelled は cancelled に', async () => {
    const { ev } = loadRepos();
    const bonsaiId = await makeBonsai();
    const planned = await ev.createEvent({
      bonsaiId,
      type: 'repotting',
      status: 'planned',
      occurredAtUtc: '2099-01-01T00:00:00.000Z',
    });
    await ev.markEventLogged(planned.id);
    expect((await ev.getEventById(planned.id))?.status).toBe('logged');

    const planned2 = await ev.createEvent({
      bonsaiId,
      type: 'pruning',
      status: 'planned',
      occurredAtUtc: '2099-01-01T00:00:00.000Z',
    });
    await ev.markEventCancelled(planned2.id);
    expect((await ev.getEventById(planned2.id))?.status).toBe('cancelled');
  });
});

describe('softDelete / restore / deleteHard / purgeOldTrash', () => {
  test('softDeleteEvent は active から消え trash に入り FTS5 からも消える', async () => {
    const { ev } = loadRepos();
    const bonsaiId = await makeBonsai();
    const e = await ev.createEvent({ bonsaiId, type: 'pruning', note: 'dry soil' });
    await ev.softDeleteEvent(e.id);

    expect((await ev.getActiveEventsByBonsai(bonsaiId)).length).toBe(0);
    expect((await ev.getTrashedEvents(bonsaiId)).length).toBe(1);
    expect((await ev.searchEvents('dry')).length).toBe(0);
  });

  test('restoreEvent は active に戻し FTS5 に再 INSERT', async () => {
    const { ev } = loadRepos();
    const bonsaiId = await makeBonsai();
    const e = await ev.createEvent({ bonsaiId, type: 'pruning', note: 'wet soil' });
    await ev.softDeleteEvent(e.id);
    await ev.restoreEvent(e.id);

    expect((await ev.getActiveEventsByBonsai(bonsaiId)).length).toBe(1);
    expect((await ev.searchEvents('wet')).length).toBe(1);
  });

  test('deleteEventHard は完全削除', async () => {
    const { ev } = loadRepos();
    const bonsaiId = await makeBonsai();
    const e = await ev.createEvent({ bonsaiId, type: 'watering' });
    await ev.deleteEventHard(e.id);
    expect(await ev.getEventById(e.id)).toBeNull();
  });

  test('purgeOldTrash は 30 日超のゴミ箱のみ物理削除', async () => {
    const { ev } = loadRepos();
    const bonsaiId = await makeBonsai();
    const e = await ev.createEvent({ bonsaiId, type: 'watering' });
    await ev.softDeleteEvent(e.id); // deleted_at = now

    // now=現在 では cutoff = now-30d < deleted_at(now) → 削除されない
    expect(await ev.purgeOldTrash(new Date())).toBe(0);
    // now=+31日 では cutoff = (+31d)-30d = +1d > deleted_at(now) → 削除される
    const purged = await ev.purgeOldTrash(new Date(Date.now() + 31 * 24 * 60 * 60 * 1000));
    expect(purged).toBe(1);
    expect(await ev.getEventById(e.id)).toBeNull();
  });
});

describe('FTS5 検索 (searchEvents / searchEventsWithSnippet / searchEventsByNoteLike)', () => {
  test('searchEvents は bonsaiId で絞り込める', async () => {
    const { ev } = loadRepos();
    const a = await makeBonsai('A');
    const b = await makeBonsai('B');
    await ev.createEvent({ bonsaiId: a, type: 'pruning', note: 'mid alpha' });
    await ev.createEvent({ bonsaiId: b, type: 'pruning', note: 'mid beta' });
    expect((await ev.searchEvents('mid')).length).toBe(2);
    expect((await ev.searchEvents('mid', a)).length).toBe(1);
  });

  test('空文字 query は [] を返す', async () => {
    const { ev } = loadRepos();
    expect(await ev.searchEvents('   ')).toEqual([]);
  });

  test('searchEventsWithSnippet は «» ハイライト snippet と bonsaiName を返す', async () => {
    const { ev } = loadRepos();
    const bonsaiId = await makeBonsai('松');
    await ev.createEvent({ bonsaiId, type: 'pruning', note: 'trimmed low part' });
    const res = await ev.searchEventsWithSnippet('low');
    expect(res.length).toBe(1);
    expect(res[0]?.bonsaiName).toBe('松');
    expect(res[0]?.snippet).toContain('«');
  });

  test('searchEventsWithSnippet は 3 文字未満で LIKE フォールバック (snippet=null)', async () => {
    const { ev } = loadRepos();
    const bonsaiId = await makeBonsai('A');
    await ev.createEvent({ bonsaiId, type: 'pruning', note: 'ab cd' });
    const res = await ev.searchEventsWithSnippet('ab');
    expect(res.length).toBe(1);
    expect(res[0]?.snippet).toBeNull();
  });

  test('searchEventsByNoteLike はメタ文字をエスケープして部分一致', async () => {
    const { ev } = loadRepos();
    const bonsaiId = await makeBonsai('A');
    await ev.createEvent({ bonsaiId, type: 'fertilizing', note: '50% diluted' });
    await ev.createEvent({ bonsaiId, type: 'fertilizing', note: '50 grams' });
    const res = await ev.searchEventsByNoteLike('50%');
    expect(res.length).toBe(1);
    expect(res[0]?.note).toBe('50% diluted');
  });
});

describe('searchEventsByBonsaiTags', () => {
  test('指定タグを持つ盆栽の active events を返す', async () => {
    const { ev, tag } = loadRepos();
    const a = await makeBonsai('タグ付き');
    const b = await makeBonsai('タグなし');
    const t = await tag.createOrFindTag('お気に入り');
    await tag.attachTagToBonsai(a, t.id);
    await ev.createEvent({ bonsaiId: a, type: 'watering' });
    await ev.createEvent({ bonsaiId: b, type: 'watering' });

    const res = await ev.searchEventsByBonsaiTags([t.id]);
    expect(res.length).toBe(1);
    expect(res[0]?.bonsaiName).toBe('タグ付き');
  });

  test('空配列は [] を返す', async () => {
    const { ev } = loadRepos();
    expect(await ev.searchEventsByBonsaiTags([])).toEqual([]);
  });
});

describe('bulkScheduleEvents / bulkLogEvents', () => {
  test('bulkScheduleEvents は全 bonsai に planned event を作る', async () => {
    const { ev } = loadRepos();
    const a = await makeBonsai('A');
    const b = await makeBonsai('B');
    const res = await ev.bulkScheduleEvents({
      bonsaiIds: [a, b],
      type: 'fertilizing',
      occurredAtUtc: '2099-05-05T00:00:00.000Z',
    });
    expect(res.created.length).toBe(2);
    expect(res.failed.length).toBe(0);
    expect(res.created.every((e) => e.status === 'planned')).toBe(true);
  });

  test('bulkLogEvents は共通 note + payload で logged event を作る', async () => {
    const { ev } = loadRepos();
    const a = await makeBonsai('A');
    const b = await makeBonsai('B');
    const res = await ev.bulkLogEvents({
      bonsaiIds: [a, b],
      type: 'watering',
      note: '一括水やり',
    });
    expect(res.created.length).toBe(2);
    expect(res.created.every((e) => e.status === 'logged' && e.note === '一括水やり')).toBe(true);
  });
});

describe('convertPlannedToRecorded / bulkConvertPlannedToRecorded', () => {
  test('planned を logged に atomic 変換 (旧 planned は soft-delete)', async () => {
    const { ev } = loadRepos();
    const bonsaiId = await makeBonsai();
    const planned = await ev.createEvent({
      bonsaiId,
      type: 'repotting',
      status: 'planned',
      occurredAtUtc: '2026-01-01T00:00:00.000Z',
    });
    const recorded = await ev.convertPlannedToRecorded({
      plannedEventId: planned.id,
      recordPayload: { bonsaiId, type: 'repotting', note: '植替え完了' },
    });

    expect(recorded.status).toBe('logged');
    expect((await ev.getEventById(planned.id))?.deletedAt).not.toBeNull(); // 旧 planned は削除
    expect((await ev.getActiveEventsByBonsai(bonsaiId)).map((e) => e.id)).toEqual([recorded.id]);
  });

  test('該当 planned 不在なら throw (中途状態を作らない)', async () => {
    const { ev } = loadRepos();
    const bonsaiId = await makeBonsai();
    await expect(
      ev.convertPlannedToRecorded({
        plannedEventId: 'missing',
        recordPayload: { bonsaiId, type: 'watering' },
      }),
    ).rejects.toThrow();
    // rollback により記録 event も作られていない
    expect((await ev.getActiveEventsByBonsai(bonsaiId)).length).toBe(0);
  });

  test('bulkConvert は converted / failed を分離する', async () => {
    const { ev } = loadRepos();
    const bonsaiId = await makeBonsai();
    const planned = await ev.createEvent({
      bonsaiId,
      type: 'watering',
      status: 'planned',
      occurredAtUtc: '2026-01-01T00:00:00.000Z',
    });
    const res = await ev.bulkConvertPlannedToRecorded([
      { plannedEventId: planned.id, recordPayload: { bonsaiId, type: 'watering' } },
      { plannedEventId: 'missing', recordPayload: { bonsaiId, type: 'watering' } },
    ]);
    expect(res.converted.length).toBe(1);
    expect(res.failed.length).toBe(1);
    expect(res.failed[0]?.plannedEventId).toBe('missing');
  });
});

describe('findPlannedEventByCondition', () => {
  test('同日 + 同 bonsai + 同 type の planned を見つける', async () => {
    const { ev } = loadRepos();
    const bonsaiId = await makeBonsai();
    const planned = await ev.createEvent({
      bonsaiId,
      type: 'fertilizing',
      status: 'planned',
      occurredAtUtc: '2026-04-15T09:00:00.000Z',
    });
    const found = await ev.findPlannedEventByCondition('2026-04-15', bonsaiId, 'fertilizing');
    expect(found?.id).toBe(planned.id);

    expect(await ev.findPlannedEventByCondition('2026-04-16', bonsaiId, 'fertilizing')).toBeNull();
    expect(await ev.findPlannedEventByCondition('2026-04-15', bonsaiId, 'watering')).toBeNull();
  });
});

describe('bulkSoftDeleteEvents / restoreEvents (atomic)', () => {
  test('全件 soft-delete し件数を返す', async () => {
    const { ev } = loadRepos();
    const bonsaiId = await makeBonsai();
    const e1 = await ev.createEvent({ bonsaiId, type: 'watering' });
    const e2 = await ev.createEvent({ bonsaiId, type: 'pruning' });
    expect(await ev.bulkSoftDeleteEvents([e1.id, e2.id])).toBe(2);
    expect((await ev.getActiveEventsByBonsai(bonsaiId)).length).toBe(0);
  });

  test('1 件でも不在なら throw + rollback (有効分も削除されない)', async () => {
    const { ev } = loadRepos();
    const bonsaiId = await makeBonsai();
    const e1 = await ev.createEvent({ bonsaiId, type: 'watering' });
    await expect(ev.bulkSoftDeleteEvents([e1.id, 'missing'])).rejects.toThrow();
    expect((await ev.getActiveEventsByBonsai(bonsaiId)).length).toBe(1); // rollback
  });

  test('restoreEvents は trash から atomic 復元', async () => {
    const { ev } = loadRepos();
    const bonsaiId = await makeBonsai();
    const e1 = await ev.createEvent({ bonsaiId, type: 'watering', note: 'fix top' });
    await ev.bulkSoftDeleteEvents([e1.id]);
    expect(await ev.restoreEvents([e1.id])).toBe(1);
    expect((await ev.getActiveEventsByBonsai(bonsaiId)).length).toBe(1);
    expect((await ev.searchEvents('top')).length).toBe(1);
  });

  test('空配列は 0 を返す (no-op)', async () => {
    const { ev } = loadRepos();
    expect(await ev.bulkSoftDeleteEvents([])).toBe(0);
    expect(await ev.restoreEvents([])).toBe(0);
  });
});
