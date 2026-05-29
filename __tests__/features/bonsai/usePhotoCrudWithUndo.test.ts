/**
 * usePhotoCrudWithUndo の振る舞い characterization test (Phase 4 A1-6c)。
 *
 * 写真削除 5 秒 Undo の状態機械を凍結する:
 *  - 削除 → 楽観的除去(setPhotos) + pendingDeletion セット + ref セット
 *  - 5 秒経過 → finalize (deletePhoto + deletePhotoFile)
 *  - Undo → 復元(setPhotos) + pending クリア、deletePhoto は呼ばれない
 *  - 連続削除 → 前 pending を先に finalize
 *
 * renderHook 前例: __tests__/core/hooks/useUnsavedChangesGuard.test.ts。
 * fake timers はローカル導入 (global 設定は変えない)。DB/FS/Pro store/Alert は mock で隔離。
 *
 * @see src/features/bonsai/detail/usePhotoCrudWithUndo.ts
 */
import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import type { RefObject } from 'react';

import {
  usePhotoCrudWithUndo,
  type PendingPhotoDeletion,
} from '@/src/features/bonsai/detail/usePhotoCrudWithUndo';
import { deletePhoto, type PhotoRead } from '@/src/db/photoRepository';
import { deletePhotoFile } from '@/src/services/photoFileService';
import type { TranslationKey } from '@/src/core/i18n/locales/en';

// jest.mock は babel-plugin-jest-hoist が import より上に巻き上げる (import 順序は維持)。
jest.mock('@/src/db/photoRepository', () => ({
  deletePhoto: jest.fn(() => Promise.resolve()),
  getPhotoCountByBonsai: jest.fn(() => Promise.resolve(0)),
  insertPhoto: jest.fn(() => Promise.resolve()),
  reorderPhotos: jest.fn(() => Promise.resolve()),
  setCoverPhoto: jest.fn(() => Promise.resolve()),
  updatePhotoCaption: jest.fn(() => Promise.resolve()),
  FREE_PHOTO_LIMIT_PER_BONSAI: 3,
}));
jest.mock('@/src/services/photoFileService', () => ({
  deletePhotoFile: jest.fn(() => Promise.resolve()),
  persistPhotoFile: jest.fn(() => Promise.resolve({ absoluteUri: 'file:///x.jpg' })),
}));
jest.mock('@/src/stores/proStore', () => ({
  useProStore: jest.fn(() => false),
}));

const mockDeletePhoto = deletePhoto as jest.Mock;
const mockDeletePhotoFile = deletePhotoFile as jest.Mock;

function makePhoto(id: string, orderIndex: number): PhotoRead {
  return {
    id,
    bonsaiId: 'b1',
    eventId: null,
    takenAt: null,
    isCover: 0,
    width: null,
    height: null,
    orderIndex,
    caption: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    absoluteUri: `file:///photos/${id}.jpg`,
  };
}

const t = (key: TranslationKey): string => key;
/** fake timers 下で microtask(Promise) を流す (setImmediate は faked なので使わない)。 */
const flush = async () => {
  for (let i = 0; i < 6; i += 1) await Promise.resolve();
};

type HookArgs = Parameters<typeof usePhotoCrudWithUndo>[0];
function setup(overrides: Partial<HookArgs> = {}) {
  const setPhotos = jest.fn();
  const pendingDeletionRef: RefObject<PendingPhotoDeletion | null> = { current: null };
  const args: HookArgs = {
    item: null,
    photos: [makePhoto('p0', 0), makePhoto('p1', 1), makePhoto('p2', 2)],
    setPhotos,
    captions: {},
    setCaptions: jest.fn(),
    reload: jest.fn(() => Promise.resolve()),
    pendingDeletionRef,
    t,
    ...overrides,
  };
  const utils = renderHook(() => usePhotoCrudWithUndo(args));
  return { ...utils, setPhotos, pendingDeletionRef, args };
}

/** Alert.alert を捕捉し、destructive(削除) ボタンの onPress を発火する。 */
async function tapDelete(photo: PhotoRead, hook: ReturnType<typeof setup>) {
  const spy = jest.spyOn(Alert, 'alert').mockImplementation((() => {}) as typeof Alert.alert);
  act(() => {
    hook.result.current.handleDeletePhoto(photo);
  });
  const buttons = spy.mock.calls[0]?.[2];
  const destructive = buttons?.find((b) => b.style === 'destructive');
  await act(async () => {
    destructive?.onPress?.();
    await flush();
  });
  spy.mockRestore();
}

describe('usePhotoCrudWithUndo — Phase 4 A1-6 characterization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  afterEach(() => {
    // 未発火の 5 秒タイマーは破棄 (発火させると finalize→setState が act 外で走り警告になる)。
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('hook が関数として export されている', () => {
    expect(typeof usePhotoCrudWithUndo).toBe('function');
  });

  test('削除 → 楽観的除去 + pendingDeletion セット + ref セット', async () => {
    const hook = setup();
    await tapDelete(hook.args.photos[1]!, hook); // p1

    expect(hook.pendingDeletionRef.current?.photo.id).toBe('p1');
    expect(hook.pendingDeletionRef.current?.previousIndex).toBe(1);
    expect(hook.result.current.pendingDeletion?.photo.id).toBe('p1');
    expect(hook.setPhotos).toHaveBeenCalled();
    const updater = hook.setPhotos.mock.calls.at(-1)![0] as (p: PhotoRead[]) => PhotoRead[];
    expect(updater(hook.args.photos).map((p) => p.id)).toEqual(['p0', 'p2']);
    expect(mockDeletePhoto).not.toHaveBeenCalled();
  });

  test('5 秒経過 → finalize (deletePhoto + deletePhotoFile)', async () => {
    const hook = setup();
    await tapDelete(hook.args.photos[1]!, hook);
    expect(mockDeletePhoto).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(5000);
      await flush();
    });

    expect(mockDeletePhoto).toHaveBeenCalledWith('p1');
    expect(mockDeletePhotoFile).toHaveBeenCalledWith('file:///photos/p1.jpg');
    expect(hook.pendingDeletionRef.current).toBeNull();
    expect(hook.result.current.pendingDeletion).toBeNull();
  });

  test('Undo → 復元 + pending クリア、DB 削除は呼ばれない', async () => {
    const hook = setup();
    await tapDelete(hook.args.photos[1]!, hook);
    hook.setPhotos.mockClear();

    act(() => {
      hook.result.current.handleUndoDeletion();
    });

    expect(hook.pendingDeletionRef.current).toBeNull();
    expect(hook.result.current.pendingDeletion).toBeNull();
    const updater = hook.setPhotos.mock.calls.at(-1)![0] as (p: PhotoRead[]) => PhotoRead[];
    expect(updater([makePhoto('p0', 0), makePhoto('p2', 1)]).map((p) => p.id)).toEqual([
      'p0',
      'p1',
      'p2',
    ]);

    await act(async () => {
      jest.advanceTimersByTime(5000);
      await flush();
    });
    expect(mockDeletePhoto).not.toHaveBeenCalled();
  });

  test('連続削除 → 前の pending を先に finalize してから新 pending', async () => {
    const hook = setup();
    await tapDelete(hook.args.photos[1]!, hook); // p1 pending
    expect(hook.pendingDeletionRef.current?.photo.id).toBe('p1');

    await tapDelete(hook.args.photos[2]!, hook); // p2 削除 → p1 を先に finalize
    expect(mockDeletePhoto).toHaveBeenCalledWith('p1');
    expect(hook.pendingDeletionRef.current?.photo.id).toBe('p2');
  });
});
