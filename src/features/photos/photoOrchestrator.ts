/**
 * 写真ファイル I/O と DB 操作を束ねる orchestrator (Phase 6 F2、ADR-0048 / architecture.md §3)。
 *
 * db 層 (repository) は純データアクセスに保ち、ファイルコピー/削除 (imperative shell) は
 * 本 feature 層 orchestrator に集約する。これにより `db→services` 境界違反を解消する。
 *
 * - addPhotoFromUri: 一時 URI を永続化 (persistPhotoFile) → DB 登録 (insertPhoto)
 * - purgeBonsaiCompletely: 写真ファイル削除 (deletePhotoFile) → 全 DB 行削除 (purgeBonsaiDbRows)
 *
 * 孤児データ防止の順序保証 (Sess44): 写真ファイル削除を DB 行削除より先に行う。
 * 静的検証は `__tests__/db/purgeBonsaiCompletely.test.ts`。
 */
import { purgeBonsaiDbRows } from '@/src/db/bonsaiRepository';
import { getPhotosByBonsai, insertPhoto } from '@/src/db/photoRepository';
import type { Photo } from '@/src/db/schema';
import { deletePhotoFile, persistPhotoFile } from '@/src/services/photoFileService';

export type AddPhotoFromUriInput = {
  bonsaiId: string;
  /** expo-image-picker などが返す一時 URI (移動前)。 */
  sourceUri: string;
  takenAt?: string | null;
  caption?: string | null;
  eventId?: string | null;
};

/**
 * 一時 URI から写真を永続化 + DB 登録 (T2-2-impl、Issue #369)。
 *
 * - persistPhotoFile に渡す photoId と insertPhoto の DB id を一致させる (整合性確保)
 * - 既存件数 0 なら自動的に is_cover=1 (insertPhoto の既存挙動を踏襲)
 */
export async function addPhotoFromUri(input: AddPhotoFromUriInput): Promise<Photo> {
  // persistPhotoFile は内部で ulid() で photoId を生成し、{ photoId, absoluteUri } を返す。
  // その photoId を insertPhoto の id として渡すことでファイル名と DB id が一致する整合性を確保。
  const { photoId, absoluteUri } = await persistPhotoFile(input.sourceUri, input.bonsaiId);
  return insertPhoto({
    id: photoId,
    bonsaiId: input.bonsaiId,
    absoluteUri,
    takenAt: input.takenAt ?? null,
    caption: input.caption ?? null,
    eventId: input.eventId ?? null,
  });
}

/**
 * 盆栽を完全削除 (写真ファイル + 全 DB 行 + 検索索引)。アーカイブ画面の「完全に削除」用。
 *
 * 順序 (孤児データ防止、Sess44):
 * 1. 削除前に写真の絶対 URI を収集し、実ファイルを削除 (DB 行削除では消えない)
 * 2. purgeBonsaiDbRows で events_fts / events / photos / bonsai_tags / bonsai を atomic 削除
 */
export async function purgeBonsaiCompletely(id: string): Promise<void> {
  // 1. 写真の実ファイルを削除 (DB 行削除より先に URI を収集)。
  const photos = await getPhotosByBonsai(id);
  for (const p of photos) {
    await deletePhotoFile(p.absoluteUri);
  }

  // 2. 全 DB 行を atomic 削除 (CASCADE 非依存)。
  await purgeBonsaiDbRows(id);
}
