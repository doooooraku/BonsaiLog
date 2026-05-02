/**
 * 写真 (photos) Repository (P2-02 PR-B)。
 *
 * Related:
 * - Issue #15 F-08 foundation
 * - schema.ts: photos テーブル (PR-A)
 * - filePathUtils.ts: relative ⇄ absolute 変換 (Repolog PR #281 lesson)
 * - constraints.md §2-2 (Free: 3 枚 / Pro: 無制限)
 *
 * 設計方針:
 * - relative_path のみ DB 保存 (絶対パス禁止)、UI で読む時のみ toAbsolutePath で変換
 * - is_cover は bonsai 1 件あたり 1 枚のみ ON (setCoverPhoto 内で他を OFF にする)
 * - Free 制限 (3 枚) は Repository で enforce、Paywall は F-13 課金完成後に UI で表示
 * - 削除はファイル + DB 行の両方を削除 (Issue #15 AC6)
 */
import { ulid } from 'ulid';

import { nowUtc } from '@/src/core/datetime';

import { getDb } from './db';
import { toAbsolutePath, toRelativePath } from './filePathUtils';
import type { Photo } from './schema';

/** Free プランの 1 樹あたり写真上限 (constraints §2-2)。 */
export const FREE_PHOTO_LIMIT_PER_BONSAI = 3;

/** 相対パスの anchor (絶対パス → 相対パス変換時の起点)。 */
const PHOTO_PATH_ANCHOR = 'bonsailog/photos/';

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

export type CreatePhotoInput = {
  bonsaiId: string;
  /** UI から渡される絶対 URI (expo-image-picker 等)。Repository 内で相対パスに変換。 */
  absoluteUri: string;
  takenAt?: string | null; // ISO 8601 UTC
  width?: number | null;
  height?: number | null;
  caption?: string | null;
  eventId?: string | null;
};

export type PhotoRead = Omit<Photo, 'relativePath'> & {
  /** 読み取り時の絶対 URI (UI 表示用、`<Image source={{ uri: absoluteUri }} />`)。 */
  absoluteUri: string;
};

// ---------------------------------------------------------------------------
// Free 制限チェック (PR-C UI / F-13 Paywall で使用)
// ---------------------------------------------------------------------------

export async function getPhotoCountByBonsai(bonsaiId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM photos WHERE bonsai_id = ?;',
    [bonsaiId],
  );
  return row?.count ?? 0;
}

/**
 * Free プランで写真追加可能か判定。Pro なら true 即返却。
 * UI 側で呼び、false の場合は Paywall へ誘導 (F-13 完成後)。
 */
export async function canAddPhoto(bonsaiId: string, isPro: boolean): Promise<boolean> {
  if (isPro) return true;
  const count = await getPhotoCountByBonsai(bonsaiId);
  return count < FREE_PHOTO_LIMIT_PER_BONSAI;
}

// ---------------------------------------------------------------------------
// 作成
// ---------------------------------------------------------------------------

/**
 * 写真を新規登録。絶対 URI を受け取り、相対パスに変換して保存。
 * 最初の写真は自動的に is_cover=1 (UI 側で初回保存しやすくするため)。
 */
export async function insertPhoto(input: CreatePhotoInput): Promise<Photo> {
  const db = await getDb();
  const now = nowUtc() as string;
  const id = ulid();
  const relativePath = toRelativePath(input.absoluteUri, PHOTO_PATH_ANCHOR);

  // 既存件数を取得 → 初回ならカバー写真に設定 + order_index を末尾に追加
  const existingCount = await getPhotoCountByBonsai(input.bonsaiId);
  const isCover = existingCount === 0 ? 1 : 0;
  const orderIndex = existingCount;

  await db.runAsync(
    `INSERT INTO photos
       (id, bonsai_id, event_id, relative_path, taken_at, is_cover, width, height, order_index, caption, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      input.bonsaiId,
      input.eventId ?? null,
      relativePath,
      input.takenAt ?? null,
      isCover,
      input.width ?? null,
      input.height ?? null,
      orderIndex,
      input.caption ?? null,
      now,
    ],
  );

  return {
    id,
    bonsaiId: input.bonsaiId,
    eventId: input.eventId ?? null,
    relativePath,
    takenAt: input.takenAt ?? null,
    isCover,
    width: input.width ?? null,
    height: input.height ?? null,
    orderIndex,
    caption: input.caption ?? null,
    createdAt: now,
  };
}

// ---------------------------------------------------------------------------
// 取得
// ---------------------------------------------------------------------------

function toPhotoRead(row: Photo): PhotoRead {
  const { relativePath, ...rest } = row;
  return { ...rest, absoluteUri: toAbsolutePath(relativePath) };
}

/**
 * 盆栽 ID で写真一覧を取得。order_index 昇順、UI 用に絶対 URI 化。
 */
export async function getPhotosByBonsai(bonsaiId: string): Promise<PhotoRead[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Photo>(
    'SELECT * FROM photos WHERE bonsai_id = ? ORDER BY order_index ASC;',
    [bonsaiId],
  );
  return rows.map(toPhotoRead);
}

/**
 * 盆栽のカバー写真を取得 (is_cover=1)。なければ最初の写真、それもなければ null。
 */
export async function getCoverPhoto(bonsaiId: string): Promise<PhotoRead | null> {
  const db = await getDb();
  const cover = await db.getFirstAsync<Photo>(
    'SELECT * FROM photos WHERE bonsai_id = ? AND is_cover = 1 LIMIT 1;',
    [bonsaiId],
  );
  if (cover) return toPhotoRead(cover);

  const first = await db.getFirstAsync<Photo>(
    'SELECT * FROM photos WHERE bonsai_id = ? ORDER BY order_index ASC LIMIT 1;',
    [bonsaiId],
  );
  return first ? toPhotoRead(first) : null;
}

/**
 * 年次タイムライン用: 写真を taken_at の年でグルーピングして返却。
 * taken_at が NULL の写真は created_at 年でグルーピング。
 */
export async function getPhotosByBonsaiGroupedByYear(
  bonsaiId: string,
): Promise<{ year: number; photos: PhotoRead[] }[]> {
  const photos = await getPhotosByBonsai(bonsaiId);
  const groups = new Map<number, PhotoRead[]>();
  for (const p of photos) {
    const dateStr = p.takenAt ?? p.createdAt;
    const year = new Date(dateStr).getFullYear();
    const arr = groups.get(year) ?? [];
    arr.push(p);
    groups.set(year, arr);
  }
  return Array.from(groups.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, list]) => ({ year, photos: list }));
}

// ---------------------------------------------------------------------------
// 更新 (カバー写真設定 / キャプション / 並び替え)
// ---------------------------------------------------------------------------

/**
 * カバー写真を変更。bonsai 内の他写真を is_cover=0 にし、対象を is_cover=1 にする。
 */
export async function setCoverPhoto(photoId: string, bonsaiId: string): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE photos SET is_cover = 0 WHERE bonsai_id = ?;', [bonsaiId]);
    await db.runAsync('UPDATE photos SET is_cover = 1 WHERE id = ? AND bonsai_id = ?;', [
      photoId,
      bonsaiId,
    ]);
  });
}

export async function updatePhotoCaption(id: string, caption: string | null): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE photos SET caption = ? WHERE id = ?;', [caption, id]);
}

/**
 * 並び替え。photoIds の順序で order_index を 0..N-1 に再設定。
 * 部分失敗を避けるためトランザクション。
 */
export async function reorderPhotos(bonsaiId: string, orderedIds: string[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.runAsync('UPDATE photos SET order_index = ? WHERE id = ? AND bonsai_id = ?;', [
        i,
        orderedIds[i],
        bonsaiId,
      ]);
    }
  });
}

// ---------------------------------------------------------------------------
// 削除
// ---------------------------------------------------------------------------

/**
 * 写真の DB 行を削除。物理ファイル削除は呼出側で実施 (UI 層、expo-file-system)。
 * カバー写真を削除した場合、残った写真の最初の 1 枚を自動でカバーに設定。
 */
export async function deletePhoto(id: string): Promise<void> {
  const db = await getDb();
  const photo = await db.getFirstAsync<Photo>('SELECT * FROM photos WHERE id = ?;', [id]);
  if (!photo) return;

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM photos WHERE id = ?;', [id]);
    if (photo.isCover === 1) {
      // 残った写真の最初の 1 枚をカバーに昇格
      const next = await db.getFirstAsync<Photo>(
        'SELECT * FROM photos WHERE bonsai_id = ? ORDER BY order_index ASC LIMIT 1;',
        [photo.bonsaiId],
      );
      if (next) {
        await db.runAsync('UPDATE photos SET is_cover = 1 WHERE id = ?;', [next.id]);
      }
    }
  });
}

/**
 * 盆栽の全写真を削除 (DB のみ、ファイル削除は UI 層)。
 * 通常は bonsai 削除時に ON DELETE CASCADE で自動削除されるため呼ばない。
 */
export async function deleteAllPhotosForBonsai(bonsaiId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM photos WHERE bonsai_id = ?;', [bonsaiId]);
}
