/**
 * photoRepository 実 DB characterization (Phase 3 PR 1-2)。
 *
 * node:sqlite harness + FS 系の最小 mock で:
 * - insertPhoto: 初回 is_cover=1 / order_index 連番 / 相対パス変換
 * - canAddPhoto(FromCount): 写真制限撤廃 (Infinity) の現挙動
 * - 取得系: getPhotosByBonsai / getCoverPhoto / event 紐付け / 年グルーピング
 * - 更新系: setCoverPhoto / updateCaption / reorder
 * - 削除系: deletePhoto (cover 自動昇格) / deleteAllPhotosForBonsai
 * を凍結する。
 *
 * 注: addPhotoFromUri は Phase 6 F2 で photoOrchestrator へ移設
 *     (__tests__/features/photos/photoOrchestrator.test.ts)。
 *
 * FS mock: 相対⇄絶対変換の documentDirectory と persistPhotoFile/deletePhotoFile を固定化。
 * top-level jest.mock は resetModules を跨いで sticky に再適用される。
 */
/* eslint-disable @typescript-eslint/no-require-imports -- fresh modules required after jest.resetModules() */
import { setupFreshDb } from '../helpers/testDb';

jest.mock('expo-file-system/legacy', () => ({ documentDirectory: 'file:///doc/' }));
jest.mock('@/src/services/photoFileService', () => {
  let counter = 0;
  return {
    persistPhotoFile: jest.fn(async (_sourceUri: string, bonsaiId: string) => {
      counter += 1;
      const photoId = `mockphoto${counter}`;
      return { photoId, absoluteUri: `file:///doc/bonsailog/photos/${bonsaiId}/${photoId}.jpg` };
    }),
    deletePhotoFile: jest.fn(async () => {}),
  };
});

type PhotoRepo = typeof import('@/src/db/photoRepository');
type BonsaiRepo = typeof import('@/src/db/bonsaiRepository');

function repos() {
  return {
    photo: require('@/src/db/photoRepository') as PhotoRepo,
    bonsai: require('@/src/db/bonsaiRepository') as BonsaiRepo,
  };
}

async function makeBonsai(name = 'B'): Promise<string> {
  const { bonsai } = repos();
  return (await bonsai.createBonsai({ name })).id;
}

function uri(bonsaiId: string, file: string): string {
  return `file:///doc/bonsailog/photos/${bonsaiId}/${file}`;
}

beforeEach(async () => {
  await setupFreshDb();
});

describe('canAddPhotoFromCount / canAddPhoto (ADR-0049 Sess59 PR3 で Free 3 復活)', () => {
  test('Pro は無制限 / Free は 3 まで', async () => {
    const { photo } = repos();
    // Pro は無制限
    expect(photo.canAddPhotoFromCount(0, true)).toBe(true);
    expect(photo.canAddPhotoFromCount(999, true)).toBe(true);
    // Free は 3 まで
    expect(photo.canAddPhotoFromCount(0, false)).toBe(true);
    expect(photo.canAddPhotoFromCount(2, false)).toBe(true);
    expect(photo.canAddPhotoFromCount(3, false)).toBe(false);
    expect(photo.canAddPhotoFromCount(999, false)).toBe(false); // Grandfathered
    // DB 実カウント込みの canAddPhoto
    const bonsaiId = await makeBonsai();
    expect(await photo.canAddPhoto(bonsaiId, false)).toBe(true); // 0 枚 → 追加可
    expect(await photo.canAddPhoto(bonsaiId, true)).toBe(true); // Pro 追加可
  });
});

describe('insertPhoto', () => {
  test('初回は is_cover=1 / order_index=0、2 枚目は is_cover=0 / order_index=1', async () => {
    const { photo } = repos();
    const bonsaiId = await makeBonsai();
    const p1 = await photo.insertPhoto({ bonsaiId, absoluteUri: uri(bonsaiId, 'a.jpg') });
    const p2 = await photo.insertPhoto({ bonsaiId, absoluteUri: uri(bonsaiId, 'b.jpg') });

    expect(p1.isCover).toBe(1);
    expect(p1.orderIndex).toBe(0);
    expect(p2.isCover).toBe(0);
    expect(p2.orderIndex).toBe(1);
    expect(p1.relativePath).toBe(`bonsailog/photos/${bonsaiId}/a.jpg`); // 相対パス変換
    expect(await photo.getPhotoCountByBonsai(bonsaiId)).toBe(2);
  });
});

describe('取得系', () => {
  test('getPhotosByBonsai は order_index 昇順 + 絶対 URI 復元', async () => {
    const { photo } = repos();
    const bonsaiId = await makeBonsai();
    await photo.insertPhoto({ bonsaiId, absoluteUri: uri(bonsaiId, 'a.jpg') });
    await photo.insertPhoto({ bonsaiId, absoluteUri: uri(bonsaiId, 'b.jpg') });

    const list = await photo.getPhotosByBonsai(bonsaiId);
    expect(list.map((p) => p.orderIndex)).toEqual([0, 1]);
    expect(list[0]?.absoluteUri).toBe(`file:///doc/bonsailog/photos/${bonsaiId}/a.jpg`);
  });

  test('getCoverPhoto は cover → 先頭 → null', async () => {
    const { photo } = repos();
    const bonsaiId = await makeBonsai();
    expect(await photo.getCoverPhoto(bonsaiId)).toBeNull();
    const p1 = await photo.insertPhoto({ bonsaiId, absoluteUri: uri(bonsaiId, 'a.jpg') });
    expect((await photo.getCoverPhoto(bonsaiId))?.id).toBe(p1.id);
  });

  test('event 紐付け: getAllPhotosByEventId / getRepresentativePhotoByEventId', async () => {
    const { photo } = repos();
    const bonsaiId = await makeBonsai();
    await photo.insertPhoto({ bonsaiId, absoluteUri: uri(bonsaiId, 'a.jpg'), eventId: 'E1' });
    await photo.insertPhoto({ bonsaiId, absoluteUri: uri(bonsaiId, 'b.jpg'), eventId: 'E1' });
    await photo.insertPhoto({ bonsaiId, absoluteUri: uri(bonsaiId, 'c.jpg'), eventId: 'E2' });

    expect((await photo.getAllPhotosByEventId('E1')).length).toBe(2);
    expect((await photo.getRepresentativePhotoByEventId('E1'))?.eventId).toBe('E1');
    expect(await photo.getRepresentativePhotoByEventId('E_NONE')).toBeNull();
  });

  test('getPhotosByBonsaiGroupedByYear は taken_at 年で降順グループ', async () => {
    const { photo } = repos();
    const bonsaiId = await makeBonsai();
    await photo.insertPhoto({
      bonsaiId,
      absoluteUri: uri(bonsaiId, 'old.jpg'),
      takenAt: '2024-05-01T00:00:00.000Z',
    });
    await photo.insertPhoto({
      bonsaiId,
      absoluteUri: uri(bonsaiId, 'new.jpg'),
      takenAt: '2026-05-01T00:00:00.000Z',
    });
    const groups = await photo.getPhotosByBonsaiGroupedByYear(bonsaiId);
    expect(groups.map((g) => g.year)).toEqual([2026, 2024]);
  });
});

describe('更新系', () => {
  test('setCoverPhoto は cover を排他的に切替', async () => {
    const { photo } = repos();
    const bonsaiId = await makeBonsai();
    const p1 = await photo.insertPhoto({ bonsaiId, absoluteUri: uri(bonsaiId, 'a.jpg') });
    const p2 = await photo.insertPhoto({ bonsaiId, absoluteUri: uri(bonsaiId, 'b.jpg') });

    await photo.setCoverPhoto(p2.id, bonsaiId);
    const list = await photo.getPhotosByBonsai(bonsaiId);
    expect(list.find((p) => p.id === p1.id)?.isCover).toBe(0);
    expect(list.find((p) => p.id === p2.id)?.isCover).toBe(1);
  });

  test('updatePhotoCaption', async () => {
    const { photo } = repos();
    const bonsaiId = await makeBonsai();
    const p = await photo.insertPhoto({ bonsaiId, absoluteUri: uri(bonsaiId, 'a.jpg') });
    await photo.updatePhotoCaption(p.id, '新緑');
    const list = await photo.getPhotosByBonsai(bonsaiId);
    expect(list[0]?.caption).toBe('新緑');
  });

  test('reorderPhotos は order_index を再採番', async () => {
    const { photo } = repos();
    const bonsaiId = await makeBonsai();
    const p1 = await photo.insertPhoto({ bonsaiId, absoluteUri: uri(bonsaiId, 'a.jpg') });
    const p2 = await photo.insertPhoto({ bonsaiId, absoluteUri: uri(bonsaiId, 'b.jpg') });
    await photo.reorderPhotos(bonsaiId, [p2.id, p1.id]);
    const list = await photo.getPhotosByBonsai(bonsaiId);
    expect(list.map((p) => p.id)).toEqual([p2.id, p1.id]); // order_index 昇順 = 新順序
  });
});

describe('削除系', () => {
  test('deletePhoto は削除し、cover 削除時は次の写真を cover に昇格', async () => {
    const { photo } = repos();
    const bonsaiId = await makeBonsai();
    const cover = await photo.insertPhoto({ bonsaiId, absoluteUri: uri(bonsaiId, 'a.jpg') });
    const second = await photo.insertPhoto({ bonsaiId, absoluteUri: uri(bonsaiId, 'b.jpg') });

    await photo.deletePhoto(cover.id);
    expect(await photo.getPhotoCountByBonsai(bonsaiId)).toBe(1);
    expect((await photo.getCoverPhoto(bonsaiId))?.id).toBe(second.id); // 昇格
  });

  test('存在しない id の deletePhoto は no-op', async () => {
    const { photo } = repos();
    const bonsaiId = await makeBonsai();
    await photo.insertPhoto({ bonsaiId, absoluteUri: uri(bonsaiId, 'a.jpg') });
    await photo.deletePhoto('missing');
    expect(await photo.getPhotoCountByBonsai(bonsaiId)).toBe(1);
  });

  test('deleteAllPhotosForBonsai は全削除', async () => {
    const { photo } = repos();
    const bonsaiId = await makeBonsai();
    await photo.insertPhoto({ bonsaiId, absoluteUri: uri(bonsaiId, 'a.jpg') });
    await photo.insertPhoto({ bonsaiId, absoluteUri: uri(bonsaiId, 'b.jpg') });
    await photo.deleteAllPhotosForBonsai(bonsaiId);
    expect(await photo.getPhotoCountByBonsai(bonsaiId)).toBe(0);
  });
});
