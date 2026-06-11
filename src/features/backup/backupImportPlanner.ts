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

type TagRecord = {
  id: string;
  /** name_normalized: tags テーブルで UNIQUE。id とは別に重複判定する。 */
  nameNormalized: string;
};

type BonsaiTagRecord = {
  bonsaiId: string;
  tagId: string;
};

/** bonsai_species_custom / bonsai_styles_custom 共通: id + name (name は UNIQUE)。 */
type NamedRecord = {
  id: string;
  name: string;
};

/** recurrence_rules: id + bonsai_id (FK 整合判定に必要な最小形、Sess99 #1121)。 */
type RecurrenceRuleRecord = {
  id: string;
  bonsaiId: string;
};

/** bonsai_tags の複合主キーを Set 用キーに変換 (区切りに tag/bonsai id に出現しない `\t` を使用)。 */
export function bonsaiTagKey(bonsaiId: string, tagId: string): string {
  return `${bonsaiId}\t${tagId}`;
}

export type AppendImportPlan<
  TBonsai extends BonsaiRecord,
  TEvent extends EventRecord,
  TPhoto extends PhotoRecord,
  TTag extends TagRecord,
  TBonsaiTag extends BonsaiTagRecord,
  TCustomSpecies extends NamedRecord,
  TCustomStyle extends NamedRecord,
  TRecurrenceRule extends RecurrenceRuleRecord = RecurrenceRuleRecord,
> = {
  bonsaiToInsert: TBonsai[];
  eventsToInsert: TEvent[];
  photosToInsert: TPhoto[];
  tagsToInsert: TTag[];
  bonsaiTagsToInsert: TBonsaiTag[];
  customSpeciesToInsert: TCustomSpecies[];
  customStylesToInsert: TCustomStyle[];
  recurrenceRulesToInsert: TRecurrenceRule[];
  skippedBonsai: number;
  skippedEvents: number;
  skippedPhotos: number;
  skippedTags: number;
  skippedBonsaiTags: number;
  skippedCustomSpecies: number;
  skippedCustomStyles: number;
  skippedRecurrenceRules: number;
  /** bonsai_id が manifest にも DB にも無い photo / event / rule。BackupError('invalid') で拒否対象。 */
  invalidPhotoRefs: TPhoto[];
  invalidEventRefs: TEvent[];
  invalidRecurrenceRuleRefs: TRecurrenceRule[];
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
  TTag extends TagRecord,
  TBonsaiTag extends BonsaiTagRecord,
  TCustomSpecies extends NamedRecord,
  TCustomStyle extends NamedRecord,
  TRecurrenceRule extends RecurrenceRuleRecord = RecurrenceRuleRecord,
>({
  bonsai,
  events,
  photos,
  tags = [],
  bonsaiTags = [],
  customSpecies = [],
  customStyles = [],
  recurrenceRules = [],
  existingBonsaiIds,
  existingEventIds,
  existingPhotoIds,
  existingTagIds = new Set<string>(),
  existingTagNormalized = new Set<string>(),
  existingBonsaiTagKeys = new Set<string>(),
  existingCustomSpeciesIds = new Set<string>(),
  existingCustomSpeciesNames = new Set<string>(),
  existingCustomStyleIds = new Set<string>(),
  existingCustomStyleNames = new Set<string>(),
  existingRecurrenceRuleIds = new Set<string>(),
}: {
  bonsai: TBonsai[];
  events: TEvent[];
  photos: TPhoto[];
  tags?: TTag[];
  bonsaiTags?: TBonsaiTag[];
  customSpecies?: TCustomSpecies[];
  customStyles?: TCustomStyle[];
  recurrenceRules?: TRecurrenceRule[];
  existingBonsaiIds: ReadonlySet<string>;
  existingEventIds: ReadonlySet<string>;
  existingPhotoIds: ReadonlySet<string>;
  existingTagIds?: ReadonlySet<string>;
  existingTagNormalized?: ReadonlySet<string>;
  existingBonsaiTagKeys?: ReadonlySet<string>;
  existingCustomSpeciesIds?: ReadonlySet<string>;
  existingCustomSpeciesNames?: ReadonlySet<string>;
  existingCustomStyleIds?: ReadonlySet<string>;
  existingCustomStyleNames?: ReadonlySet<string>;
  existingRecurrenceRuleIds?: ReadonlySet<string>;
}): AppendImportPlan<
  TBonsai,
  TEvent,
  TPhoto,
  TTag,
  TBonsaiTag,
  TCustomSpecies,
  TCustomStyle,
  TRecurrenceRule
> {
  const knownBonsaiIds = new Set(existingBonsaiIds);
  const knownEventIds = new Set(existingEventIds);
  const knownPhotoIds = new Set(existingPhotoIds);
  const knownTagIds = new Set(existingTagIds);
  const knownTagNormalized = new Set(existingTagNormalized);
  const knownBonsaiTagKeys = new Set(existingBonsaiTagKeys);
  const knownCustomSpeciesIds = new Set(existingCustomSpeciesIds);
  const knownCustomSpeciesNames = new Set(existingCustomSpeciesNames);
  const knownCustomStyleIds = new Set(existingCustomStyleIds);
  const knownCustomStyleNames = new Set(existingCustomStyleNames);
  const knownRecurrenceRuleIds = new Set(existingRecurrenceRuleIds);

  const bonsaiToInsert: TBonsai[] = [];
  const eventsToInsert: TEvent[] = [];
  const photosToInsert: TPhoto[] = [];
  const tagsToInsert: TTag[] = [];
  const bonsaiTagsToInsert: TBonsaiTag[] = [];
  const customSpeciesToInsert: TCustomSpecies[] = [];
  const customStylesToInsert: TCustomStyle[] = [];
  const recurrenceRulesToInsert: TRecurrenceRule[] = [];
  const invalidEventRefs: TEvent[] = [];
  const invalidPhotoRefs: TPhoto[] = [];
  const invalidRecurrenceRuleRefs: TRecurrenceRule[] = [];

  let skippedBonsai = 0;
  let skippedEvents = 0;
  let skippedPhotos = 0;
  let skippedTags = 0;
  let skippedBonsaiTags = 0;
  let skippedCustomSpecies = 0;
  let skippedCustomStyles = 0;
  let skippedRecurrenceRules = 0;

  // カスタム樹種/樹形は id 既存 OR name 既存(UNIQUE)なら skip。
  for (const sp of customSpecies) {
    if (knownCustomSpeciesIds.has(sp.id) || knownCustomSpeciesNames.has(sp.name)) {
      skippedCustomSpecies += 1;
      continue;
    }
    knownCustomSpeciesIds.add(sp.id);
    knownCustomSpeciesNames.add(sp.name);
    customSpeciesToInsert.push(sp);
  }

  for (const st of customStyles) {
    if (knownCustomStyleIds.has(st.id) || knownCustomStyleNames.has(st.name)) {
      skippedCustomStyles += 1;
      continue;
    }
    knownCustomStyleIds.add(st.id);
    knownCustomStyleNames.add(st.name);
    customStylesToInsert.push(st);
  }

  for (const tree of bonsai) {
    if (knownBonsaiIds.has(tree.id)) {
      skippedBonsai += 1;
      continue;
    }
    knownBonsaiIds.add(tree.id);
    bonsaiToInsert.push(tree);
  }

  // tags は id 既存 OR name_normalized 既存なら skip (name_normalized は UNIQUE のため衝突回避)。
  for (const tag of tags) {
    if (knownTagIds.has(tag.id) || knownTagNormalized.has(tag.nameNormalized)) {
      skippedTags += 1;
      continue;
    }
    knownTagIds.add(tag.id);
    knownTagNormalized.add(tag.nameNormalized);
    tagsToInsert.push(tag);
  }

  // bonsai_tags は bonsai と tag が共に既知、かつ複合キー未存在なら insert。
  for (const link of bonsaiTags) {
    const key = bonsaiTagKey(link.bonsaiId, link.tagId);
    if (
      !knownBonsaiIds.has(link.bonsaiId) ||
      !knownTagIds.has(link.tagId) ||
      knownBonsaiTagKeys.has(key)
    ) {
      skippedBonsaiTags += 1;
      continue;
    }
    knownBonsaiTagKeys.add(key);
    bonsaiTagsToInsert.push(link);
  }

  // recurrence_rules は bonsai の「子」(FK ON DELETE CASCADE): events / photos と同じ整合判定。
  // events より先に処理 (events.recurrence_rule_id の連結先がこの集合に揃う、Sess99 #1121)。
  for (const rule of recurrenceRules) {
    if (!knownBonsaiIds.has(rule.bonsaiId)) {
      invalidRecurrenceRuleRefs.push(rule);
      continue;
    }
    if (knownRecurrenceRuleIds.has(rule.id)) {
      skippedRecurrenceRules += 1;
      continue;
    }
    knownRecurrenceRuleIds.add(rule.id);
    recurrenceRulesToInsert.push(rule);
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
    tagsToInsert,
    bonsaiTagsToInsert,
    customSpeciesToInsert,
    customStylesToInsert,
    recurrenceRulesToInsert,
    skippedBonsai,
    skippedEvents,
    skippedPhotos,
    skippedTags,
    skippedBonsaiTags,
    skippedCustomSpecies,
    skippedCustomStyles,
    skippedRecurrenceRules,
    invalidEventRefs,
    invalidPhotoRefs,
    invalidRecurrenceRuleRefs,
  };
}
