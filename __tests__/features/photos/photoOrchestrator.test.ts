/**
 * photoOrchestrator characterization (Phase 6 F2)。
 *
 * 写真ファイル I/O (persistPhotoFile / deletePhotoFile) を mock し、orchestrator が
 * - addPhotoFromUri: persistPhotoFile → insertPhoto の順で永続化 + DB 登録
 * - purgeBonsaiCompletely: deletePhotoFile (ファイル) → purgeBonsaiDbRows (DB 行) の順で削除
 * を行う挙動を凍結する (db→services 境界違反を orchestrator へ分離した後の回帰防止)。
 */
/* eslint-disable @typescript-eslint/no-require-imports -- fresh modules required after jest.resetModules() */
import { setupFreshDb } from '../../helpers/testDb';

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

type Orchestrator = typeof import('@/src/features/photos/photoOrchestrator');
type PhotoRepo = typeof import('@/src/db/photoRepository');
type BonsaiRepo = typeof import('@/src/db/bonsaiRepository');
type FileService = typeof import('@/src/services/photoFileService');

function mods() {
  return {
    orch: require('@/src/features/photos/photoOrchestrator') as Orchestrator,
    photo: require('@/src/db/photoRepository') as PhotoRepo,
    bonsai: require('@/src/db/bonsaiRepository') as BonsaiRepo,
    fileService: require('@/src/services/photoFileService') as FileService,
  };
}

async function makeBonsai(name = 'B'): Promise<string> {
  const { bonsai } = mods();
  return (await bonsai.createBonsai({ name })).id;
}

beforeEach(async () => {
  await setupFreshDb();
});

describe('addPhotoFromUri (persistPhotoFile mock 経由)', () => {
  test('一時 URI から永続化 + DB 登録 (photoId == DB id、初回 cover)', async () => {
    const { orch, photo } = mods();
    const bonsaiId = await makeBonsai();
    const p = await orch.addPhotoFromUri({ bonsaiId, sourceUri: 'file:///tmp/pick.jpg' });
    expect(p.id).toMatch(/^mockphoto\d+$/); // mock の photoId
    expect(p.isCover).toBe(1); // 初回
    expect(await photo.getPhotoCountByBonsai(bonsaiId)).toBe(1);
  });
});

describe('purgeBonsaiCompletely (ファイル削除 → DB 行削除)', () => {
  test('写真の実ファイルを deletePhotoFile で削除し、bonsai/photos の DB 行も消える', async () => {
    const { orch, photo, bonsai, fileService } = mods();
    const bonsaiId = await makeBonsai('完全削除');
    await orch.addPhotoFromUri({ bonsaiId, sourceUri: 'file:///tmp/x.jpg' });
    // getPhotosByBonsai は PhotoRead (relativePath → absoluteUri 復元) を返す。
    const expectedUri = (await photo.getPhotosByBonsai(bonsaiId))[0]?.absoluteUri;
    (fileService.deletePhotoFile as jest.Mock).mockClear();

    await orch.purgeBonsaiCompletely(bonsaiId);

    // 1. 写真の実ファイルが削除された (収集した absoluteUri で呼ばれる)。
    expect(fileService.deletePhotoFile).toHaveBeenCalledWith(expectedUri);
    // 2. DB 行 (bonsai / photos) も消える。
    expect(await bonsai.getBonsaiById(bonsaiId)).toBeNull();
    expect(await photo.getPhotoCountByBonsai(bonsaiId)).toBe(0);
  });
});
