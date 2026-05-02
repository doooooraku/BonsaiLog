/**
 * 写真ファイル保存サービス (P2-02 PR-C)。
 *
 * Related:
 * - Issue #15 F-08 foundation
 * - photoRepository.ts (DB 層)
 * - filePathUtils.ts (相対 ⇄ 絶対 変換)
 *
 * 役割:
 * - expo-image-picker で取得した一時 URI を Paths.document/photos/<bonsaiId>/<photoId>.jpg にコピー
 * - 削除時に物理ファイルも削除
 * - photoRepository は DB 操作のみ、本サービスはファイル I/O のみ
 *
 * 仕様 (constraints §1-2):
 * - 写真は Paths.document/photos/<bonsaiId>/<photoId>.jpg に保存
 * - DB には bonsailog/photos/<bonsaiId>/<photoId>.jpg の相対パスを格納 (PHOTO_PATH_ANCHOR)
 */
import * as FileSystem from 'expo-file-system/legacy';
import { ulid } from 'ulid';

const ROOT_DIR = 'bonsailog/photos';

/**
 * 写真の保存先絶対 URI を生成 (`<documentDirectory>/bonsailog/photos/<bonsaiId>/<photoId>.jpg`)。
 */
function buildPhotoAbsoluteUri(bonsaiId: string, photoId: string): string {
  const docDir = FileSystem.documentDirectory ?? '';
  return `${docDir}${ROOT_DIR}/${bonsaiId}/${photoId}.jpg`;
}

/**
 * bonsai ディレクトリを必要なら作成。
 */
async function ensureBonsaiPhotoDir(bonsaiId: string): Promise<void> {
  const docDir = FileSystem.documentDirectory ?? '';
  const dir = `${docDir}${ROOT_DIR}/${bonsaiId}`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

/**
 * 一時 URI から正式保存場所にコピー。
 * @param sourceUri expo-image-picker が返す一時 URI (絶対)
 * @param bonsaiId 紐付ける盆栽 ID
 * @returns { photoId, absoluteUri } - photoRepository.insertPhoto に渡す
 */
export async function persistPhotoFile(
  sourceUri: string,
  bonsaiId: string,
): Promise<{ photoId: string; absoluteUri: string }> {
  const photoId = ulid();
  const absoluteUri = buildPhotoAbsoluteUri(bonsaiId, photoId);
  await ensureBonsaiPhotoDir(bonsaiId);
  await FileSystem.copyAsync({ from: sourceUri, to: absoluteUri });
  return { photoId, absoluteUri };
}

/**
 * 写真ファイルを物理削除。失敗しても例外を吐かない (DB 行は別途削除されるため fault-tolerant)。
 */
export async function deletePhotoFile(absoluteUri: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(absoluteUri);
    if (info.exists) {
      await FileSystem.deleteAsync(absoluteUri, { idempotent: true });
    }
  } catch {
    // ignore — DB 行削除を優先、ファイル残存は次回起動時のクリーンアップ対象
  }
}
