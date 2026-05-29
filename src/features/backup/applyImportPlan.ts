/**
 * F-11 お引っ越し機能 — インポートプランの DB 適用 (functional core、写真 I/O 注入)。
 *
 * Related: Issue #12 F-11 / ADR-0007 (Repolog 方式、最高リスク=ユーザーデータ経路)
 *
 * 役割:
 * - buildAppendImportPlan の出力 (insert 対象リスト) を 1 トランザクションで DB へ書き込む純粋核。
 * - 写真ファイルの物理コピーだけを `copyPhotoFile` コールバックで注入し、核から native I/O を排除。
 *   → node:sqlite harness で実 DB に対して characterize 可能 (Phase 3 で export 側 buildManifestFromDb
 *     を core 化したのと対の、import 側 core 化。master-plan Phase 4 F5/C3)。
 * - zip/unzip/picker/share/写真コピーの実装・ロールバック後始末・設定再適用は backupService の
 *   imperative shell に残す。
 *
 * 不変条件 (凍結):
 * - INSERT 順序は FK 安全順: customSpecies → customStyles → bonsai → tags → bonsaiTags → events(+FTS) → photos。
 * - FTS5 同期は active な event のみ (`deletedAt === null`)。
 * - schema v15 の列リストを厳守 (backupCoverage.test.ts が export 側を fail-closed ガード)。
 * - 途中で throw されたら withTransactionAsync が全 INSERT をロールバックする (写真ファイルの後始末は
 *   shell 側が copyPhotoFile のクロージャで追跡し実施)。
 */
import type { SQLiteDatabase } from 'expo-sqlite';

import type { AppendImportPlan } from './backupImportPlanner';
import type {
  BackupBonsai,
  BackupBonsaiTag,
  BackupEvent,
  BackupNamed,
  BackupPhoto,
  BackupTag,
} from './backupTypes';

/** applyImportPlan が必要とする DB の最小インターフェース (テストの node:sqlite mock も満たす)。 */
type ImportApplyDb = Pick<SQLiteDatabase, 'runAsync' | 'withTransactionAsync'>;

/** insert 対象だけを取り出した import プラン (backupService が buildAppendImportPlan で生成する形)。 */
type BackupImportPlan = AppendImportPlan<
  BackupBonsai,
  BackupEvent,
  BackupPhoto,
  BackupTag,
  BackupBonsaiTag,
  BackupNamed,
  BackupNamed
>;

/**
 * 写真を物理コピーして DB 保存用の relative_path を返す I/O コールバック。
 * native ファイル操作を核から切り離す注入点。コピー済みパスの追跡 (ロールバック後始末用) は
 * 呼出側がクロージャで行う。
 */
type CopyPhotoFile = (photo: BackupPhoto) => string;

/**
 * import プランを 1 トランザクションで DB へ適用する (純粋核)。
 *
 * @param db runAsync / withTransactionAsync を持つ DB ハンドル
 * @param plan buildAppendImportPlan の出力 (insert 対象リスト)
 * @param copyPhotoFile 写真をコピーして relative_path を返すコールバック (I/O 注入)
 */
export async function applyImportPlan(
  db: ImportApplyDb,
  plan: BackupImportPlan,
  copyPhotoFile: CopyPhotoFile,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    // カスタム樹種/樹形を bonsai より先に (bonsai.custom_species_id が参照)。
    for (const sp of plan.customSpeciesToInsert) {
      await db.runAsync(
        'INSERT INTO bonsai_species_custom (id, name, created_at) VALUES (?, ?, ?);',
        [sp.id, sp.name, sp.createdAt],
      );
    }
    for (const st of plan.customStylesToInsert) {
      await db.runAsync(
        'INSERT INTO bonsai_styles_custom (id, name, created_at) VALUES (?, ?, ?);',
        [st.id, st.name, st.createdAt],
      );
    }

    for (const tree of plan.bonsaiToInsert) {
      await db.runAsync(
        `INSERT INTO bonsai
           (id, name, species_id, acquired_at, style, pot_info, estimated_age, memo,
            purchase_date, acquired_from, estimated_age_unknown, custom_species_id,
            archived_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          tree.id,
          tree.name,
          tree.speciesId ?? null,
          tree.acquiredAt ?? null,
          tree.style ?? null,
          tree.potInfo ?? null,
          tree.estimatedAge ?? null,
          tree.memo ?? null,
          tree.purchaseDate ?? null,
          tree.acquiredFrom ?? null,
          tree.estimatedAgeUnknown ?? 0,
          tree.customSpeciesId ?? null,
          tree.archivedAt ?? null,
          tree.createdAt,
          tree.updatedAt,
        ],
      );
    }

    // tags → bonsai_tags の順 (bonsai_tags は bonsai/tags を参照)。
    for (const tag of plan.tagsToInsert) {
      await db.runAsync(
        'INSERT INTO tags (id, name, name_normalized, created_at) VALUES (?, ?, ?, ?);',
        [tag.id, tag.name, tag.nameNormalized, tag.createdAt],
      );
    }

    for (const link of plan.bonsaiTagsToInsert) {
      await db.runAsync(
        'INSERT INTO bonsai_tags (bonsai_id, tag_id, created_at) VALUES (?, ?, ?);',
        [link.bonsaiId, link.tagId, link.createdAt],
      );
    }

    for (const event of plan.eventsToInsert) {
      await db.runAsync(
        `INSERT INTO events
           (id, bonsai_id, type, status, occurred_at_utc, tz_offset_min, tz_iana,
            duration_min, payload_json, note, deleted_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          event.id,
          event.bonsaiId,
          event.type,
          event.status,
          event.occurredAtUtc,
          event.tzOffsetMin,
          event.tzIana,
          event.durationMin ?? null,
          event.payloadJson ?? null,
          event.note ?? null,
          event.deletedAt ?? null,
          event.createdAt,
          event.updatedAt,
        ],
      );
      // FTS5 同期 (active な event のみ note + payload を可検索化)
      if (event.deletedAt === null) {
        await db.runAsync(
          'INSERT INTO events_fts (event_id, bonsai_id, note, payload_text) VALUES (?, ?, ?, ?);',
          [event.id, event.bonsaiId, event.note ?? '', event.payloadJson ?? ''],
        );
      }
    }

    for (const photo of plan.photosToInsert) {
      // 写真ファイルの物理コピーは shell に注入 (I/O-free 核を保つ)。relative_path を受け取る。
      const relativePath = copyPhotoFile(photo);
      await db.runAsync(
        `INSERT INTO photos
           (id, bonsai_id, event_id, relative_path, taken_at, is_cover, width, height,
            order_index, caption, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          photo.id,
          photo.bonsaiId,
          photo.eventId ?? null,
          relativePath,
          photo.takenAt ?? null,
          photo.isCover,
          photo.width ?? null,
          photo.height ?? null,
          photo.orderIndex,
          photo.caption ?? null,
          photo.createdAt,
        ],
      );
    }
  });
}
