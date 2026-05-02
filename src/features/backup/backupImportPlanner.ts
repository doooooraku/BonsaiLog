/**
 * F-11 お引っ越し機能 — Append インポートプランナ (純粋関数)。
 *
 * Related:
 * - Issue #12 F-11 (ADR-0007 Repolog 方式)
 * - 移植元: /home/doooo/04_app-factory/apps/Repolog/src/features/backup/backupImportPlanner.ts
 *
 * 役割:
 * - manifest.json 由来の bonsai / events / photos に対し「既存 ID と重複するもの = skip、
 *   新規 ID = insert、参照先が無い photo / event = invalid」を判定するだけの純粋関数。
 * - DB / FileSystem には触れない。Jest で副作用なくテストできるよう設計。
 *
 * 設計方針:
 * - bonsai は「親」: ID が無ければ新規追加、既にあればスキップ。
 * - photos / events は「子」: bonsai_id が manifest 内にも DB 内にも無ければ invalid 扱い (整合性違反)。
 * - 重複 ID は invalid ではなく skip (再インポート時に冪等になるよう)。
 * - 写真の物理ファイル欠損チェックは backupService 側で実施 (純粋関数では IO しない)。
 *
 * Repolog 設計との差分:
 * - Repolog は reports / photos の 2 階層。BonsaiLog は bonsai / events / photos の 3 階層。
 * - 名称を BonsaiLog ドメインに合わせ (`reports → bonsai`、`reportId → bonsaiId`)。
 * - events を新規追加 (Repolog には存在しない、F-02 由来)。
 */

type BonsaiRecord = {
  id: string;
};

type EventRecord = {
  id: string;
  bonsaiId: string;
};

type PhotoRecord = {
  id: string;
  bonsaiId: string;
};

export type AppendImportPlan<
  TBonsai extends BonsaiRecord,
  TEvent extends EventRecord,
  TPhoto extends PhotoRecord,
> = {
  bonsaiToInsert: TBonsai[];
  eventsToInsert: TEvent[];
  photosToInsert: TPhoto[];
  skippedBonsai: number;
  skippedEvents: number;
  skippedPhotos: number;
  /** bonsai_id が manifest にも DB にも無い photo / event。BackupError('invalid') で拒否対象。 */
  invalidPhotoRefs: TPhoto[];
  invalidEventRefs: TEvent[];
};

/**
 * Append (追記のみ) のインポートプランを構築する。
 *
 * @param input.bonsai manifest.json 内の bonsai 一覧
 * @param input.events manifest.json 内の events 一覧
 * @param input.photos manifest.json 内の photos 一覧
 * @param input.existingBonsaiIds DB に既にある bonsai.id 集合
 * @param input.existingEventIds DB に既にある events.id 集合
 * @param input.existingPhotoIds DB に既にある photos.id 集合
 *
 * @returns 追加対象 / スキップ件数 / 整合性違反のリスト
 */
export function buildAppendImportPlan<
  TBonsai extends BonsaiRecord,
  TEvent extends EventRecord,
  TPhoto extends PhotoRecord,
>({
  bonsai,
  events,
  photos,
  existingBonsaiIds,
  existingEventIds,
  existingPhotoIds,
}: {
  bonsai: TBonsai[];
  events: TEvent[];
  photos: TPhoto[];
  existingBonsaiIds: ReadonlySet<string>;
  existingEventIds: ReadonlySet<string>;
  existingPhotoIds: ReadonlySet<string>;
}): AppendImportPlan<TBonsai, TEvent, TPhoto> {
  const knownBonsaiIds = new Set(existingBonsaiIds);
  const knownEventIds = new Set(existingEventIds);
  const knownPhotoIds = new Set(existingPhotoIds);

  const bonsaiToInsert: TBonsai[] = [];
  const eventsToInsert: TEvent[] = [];
  const photosToInsert: TPhoto[] = [];
  const invalidEventRefs: TEvent[] = [];
  const invalidPhotoRefs: TPhoto[] = [];

  let skippedBonsai = 0;
  let skippedEvents = 0;
  let skippedPhotos = 0;

  for (const tree of bonsai) {
    if (knownBonsaiIds.has(tree.id)) {
      skippedBonsai += 1;
      continue;
    }
    knownBonsaiIds.add(tree.id);
    bonsaiToInsert.push(tree);
  }

  for (const event of events) {
    if (!knownBonsaiIds.has(event.bonsaiId)) {
      invalidEventRefs.push(event);
      continue;
    }
    if (knownEventIds.has(event.id)) {
      skippedEvents += 1;
      continue;
    }
    knownEventIds.add(event.id);
    eventsToInsert.push(event);
  }

  for (const photo of photos) {
    if (!knownBonsaiIds.has(photo.bonsaiId)) {
      invalidPhotoRefs.push(photo);
      continue;
    }
    if (knownPhotoIds.has(photo.id)) {
      skippedPhotos += 1;
      continue;
    }
    knownPhotoIds.add(photo.id);
    photosToInsert.push(photo);
  }

  return {
    bonsaiToInsert,
    eventsToInsert,
    photosToInsert,
    skippedBonsai,
    skippedEvents,
    skippedPhotos,
    invalidEventRefs,
    invalidPhotoRefs,
  };
}
