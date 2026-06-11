/**
 * F-11 backupImportPlanner 純関数テスト (Issue #12 / ADR-0007)。
 *
 * 移植元: /home/doooo/04_app-factory/apps/Repolog/__tests__/backupImportPlanner.test.ts
 *
 * BonsaiLog 用の差分:
 * - reports → bonsai (3 階層: bonsai / events / photos)
 * - events を新規追加 (Repolog には存在しない、F-02 由来)
 * - reportId → bonsaiId
 */
import { buildAppendImportPlan, bonsaiTagKey } from '@/src/features/backup/backupImportPlanner';

describe('backupImportPlanner', () => {
  test('buildAppendImportPlan appends only missing records and skips duplicates', () => {
    const plan = buildAppendImportPlan({
      bonsai: [{ id: 'b1' }, { id: 'b2' }, { id: 'b2' }],
      events: [
        { id: 'e1', bonsaiId: 'b1' },
        { id: 'e2', bonsaiId: 'b2' },
        { id: 'e2', bonsaiId: 'b2' },
      ],
      photos: [
        { id: 'p1', bonsaiId: 'b1' },
        { id: 'p2', bonsaiId: 'b2' },
        { id: 'p2', bonsaiId: 'b2' },
      ],
      existingBonsaiIds: new Set(['b1']),
      existingEventIds: new Set(['e1']),
      existingPhotoIds: new Set(['p1']),
    });

    expect(plan.bonsaiToInsert.map((tree) => tree.id)).toEqual(['b2']);
    expect(plan.eventsToInsert.map((event) => event.id)).toEqual(['e2']);
    expect(plan.photosToInsert.map((photo) => photo.id)).toEqual(['p2']);
    expect(plan.skippedBonsai).toBe(2);
    expect(plan.skippedEvents).toBe(2);
    expect(plan.skippedPhotos).toBe(2);
    expect(plan.invalidEventRefs).toEqual([]);
    expect(plan.invalidPhotoRefs).toEqual([]);
  });

  test('buildAppendImportPlan detects invalid bonsai references for events and photos', () => {
    const plan = buildAppendImportPlan({
      bonsai: [{ id: 'b1' }],
      events: [{ id: 'e1', bonsaiId: 'b-missing' }],
      photos: [{ id: 'p1', bonsaiId: 'b-missing' }],
      existingBonsaiIds: new Set<string>(),
      existingEventIds: new Set<string>(),
      existingPhotoIds: new Set<string>(),
    });

    expect(plan.bonsaiToInsert.map((tree) => tree.id)).toEqual(['b1']);
    expect(plan.eventsToInsert).toEqual([]);
    expect(plan.photosToInsert).toEqual([]);
    expect(plan.invalidEventRefs.map((event) => event.id)).toEqual(['e1']);
    expect(plan.invalidPhotoRefs.map((photo) => photo.id)).toEqual(['p1']);
  });

  test('buildAppendImportPlan is idempotent for repeated imports', () => {
    const first = buildAppendImportPlan({
      bonsai: [{ id: 'b1' }],
      events: [{ id: 'e1', bonsaiId: 'b1' }],
      photos: [{ id: 'p1', bonsaiId: 'b1' }],
      existingBonsaiIds: new Set<string>(),
      existingEventIds: new Set<string>(),
      existingPhotoIds: new Set<string>(),
    });
    const second = buildAppendImportPlan({
      bonsai: [{ id: 'b1' }],
      events: [{ id: 'e1', bonsaiId: 'b1' }],
      photos: [{ id: 'p1', bonsaiId: 'b1' }],
      existingBonsaiIds: new Set(['b1']),
      existingEventIds: new Set(['e1']),
      existingPhotoIds: new Set(['p1']),
    });

    expect(first.bonsaiToInsert).toHaveLength(1);
    expect(first.eventsToInsert).toHaveLength(1);
    expect(first.photosToInsert).toHaveLength(1);
    expect(second.bonsaiToInsert).toHaveLength(0);
    expect(second.eventsToInsert).toHaveLength(0);
    expect(second.photosToInsert).toHaveLength(0);
    expect(second.skippedBonsai).toBe(1);
    expect(second.skippedEvents).toBe(1);
    expect(second.skippedPhotos).toBe(1);
  });

  test('buildAppendImportPlan accepts events whose bonsai is added in the same import', () => {
    const plan = buildAppendImportPlan({
      bonsai: [{ id: 'b1' }],
      events: [{ id: 'e1', bonsaiId: 'b1' }],
      photos: [{ id: 'p1', bonsaiId: 'b1' }],
      existingBonsaiIds: new Set<string>(),
      existingEventIds: new Set<string>(),
      existingPhotoIds: new Set<string>(),
    });

    expect(plan.bonsaiToInsert).toHaveLength(1);
    expect(plan.eventsToInsert).toHaveLength(1);
    expect(plan.photosToInsert).toHaveLength(1);
    expect(plan.invalidEventRefs).toEqual([]);
    expect(plan.invalidPhotoRefs).toEqual([]);
  });

  test('tags: skip by existing id and by existing name_normalized, insert new', () => {
    const plan = buildAppendImportPlan({
      bonsai: [],
      events: [],
      photos: [],
      tags: [
        { id: 't1', nameNormalized: 'matsu' }, // id 既存 → skip
        { id: 't-new', nameNormalized: 'momiji' }, // normalized 既存 → skip
        { id: 't3', nameNormalized: 'shimpaku' }, // 新規 → insert
      ],
      existingBonsaiIds: new Set<string>(),
      existingEventIds: new Set<string>(),
      existingPhotoIds: new Set<string>(),
      existingTagIds: new Set(['t1']),
      existingTagNormalized: new Set(['matsu', 'momiji']),
    });

    expect(plan.tagsToInsert.map((t) => t.id)).toEqual(['t3']);
    expect(plan.skippedTags).toBe(2);
  });

  test('bonsai_tags: insert when bonsai+tag known and pair new, skip otherwise', () => {
    const plan = buildAppendImportPlan({
      bonsai: [{ id: 'b1' }],
      events: [],
      photos: [],
      tags: [{ id: 't1', nameNormalized: 'matsu' }],
      bonsaiTags: [
        { bonsaiId: 'b1', tagId: 't1' }, // 共に新規・ペア未存在 → insert
        { bonsaiId: 'b1', tagId: 't-missing' }, // tag 未知 → skip
        { bonsaiId: 'b-missing', tagId: 't1' }, // bonsai 未知 → skip
        { bonsaiId: 'b-existing', tagId: 't-existing' }, // ペア既存 → skip
      ],
      existingBonsaiIds: new Set(['b-existing']),
      existingEventIds: new Set<string>(),
      existingPhotoIds: new Set<string>(),
      existingTagIds: new Set(['t-existing']),
      existingTagNormalized: new Set(['existing']),
      existingBonsaiTagKeys: new Set([bonsaiTagKey('b-existing', 't-existing')]),
    });

    expect(plan.bonsaiTagsToInsert).toEqual([{ bonsaiId: 'b1', tagId: 't1' }]);
    expect(plan.skippedBonsaiTags).toBe(3);
  });

  test('tags/bonsaiTags default to empty when omitted (旧 ZIP 後方互換)', () => {
    const plan = buildAppendImportPlan({
      bonsai: [{ id: 'b1' }],
      events: [],
      photos: [],
      existingBonsaiIds: new Set<string>(),
      existingEventIds: new Set<string>(),
      existingPhotoIds: new Set<string>(),
    });

    expect(plan.tagsToInsert).toEqual([]);
    expect(plan.bonsaiTagsToInsert).toEqual([]);
    expect(plan.skippedTags).toBe(0);
    expect(plan.skippedBonsaiTags).toBe(0);
  });

  test('customSpecies/customStyles: skip by existing id or name, insert new', () => {
    const plan = buildAppendImportPlan({
      bonsai: [],
      events: [],
      photos: [],
      customSpecies: [
        { id: 'cs1', name: '実生のクロマツ' }, // id 既存 → skip
        { id: 'cs-new', name: '挿し木のモミジ' }, // name 既存 → skip
        { id: 'cs3', name: '山採りのシンパク' }, // 新規 → insert
      ],
      customStyles: [
        { id: 'st1', name: '吹き流し' }, // id 既存 → skip
        { id: 'st2', name: '文人木' }, // 新規 → insert
      ],
      existingBonsaiIds: new Set<string>(),
      existingEventIds: new Set<string>(),
      existingPhotoIds: new Set<string>(),
      existingCustomSpeciesIds: new Set(['cs1']),
      existingCustomSpeciesNames: new Set(['実生のクロマツ', '挿し木のモミジ']),
      existingCustomStyleIds: new Set(['st1']),
      existingCustomStyleNames: new Set(['吹き流し']),
    });

    expect(plan.customSpeciesToInsert.map((s) => s.id)).toEqual(['cs3']);
    expect(plan.skippedCustomSpecies).toBe(2);
    expect(plan.customStylesToInsert.map((s) => s.id)).toEqual(['st2']);
    expect(plan.skippedCustomStyles).toBe(1);
  });

  test('customSpecies/customStyles default to empty when omitted (旧 ZIP 後方互換)', () => {
    const plan = buildAppendImportPlan({
      bonsai: [{ id: 'b1' }],
      events: [],
      photos: [],
      existingBonsaiIds: new Set<string>(),
      existingEventIds: new Set<string>(),
      existingPhotoIds: new Set<string>(),
    });

    expect(plan.customSpeciesToInsert).toEqual([]);
    expect(plan.customStylesToInsert).toEqual([]);
    expect(plan.skippedCustomSpecies).toBe(0);
    expect(plan.skippedCustomStyles).toBe(0);
    // Sess99 #1121: recurrenceRules 省略 (旧 ZIP) でも安全に空で復元
    expect(plan.recurrenceRulesToInsert).toEqual([]);
    expect(plan.skippedRecurrenceRules).toBe(0);
    expect(plan.invalidRecurrenceRuleRefs).toEqual([]);
  });

  test('recurrenceRules: 新規 insert / 重複 skip / bonsai 参照切れ invalid (Sess99 #1121)', () => {
    const plan = buildAppendImportPlan({
      bonsai: [{ id: 'b1' }],
      events: [],
      photos: [],
      recurrenceRules: [
        { id: 'r1', bonsaiId: 'b1' }, // 新規 (manifest 内 bonsai 参照)
        { id: 'r2', bonsaiId: 'b-existing' }, // 新規 (DB 既存 bonsai 参照)
        { id: 'r-dup', bonsaiId: 'b1' }, // DB に既存 → skip
        { id: 'r3', bonsaiId: 'b-missing' }, // 参照切れ → invalid
      ],
      existingBonsaiIds: new Set(['b-existing']),
      existingEventIds: new Set<string>(),
      existingPhotoIds: new Set<string>(),
      existingRecurrenceRuleIds: new Set(['r-dup']),
    });

    expect(plan.recurrenceRulesToInsert.map((r) => r.id)).toEqual(['r1', 'r2']);
    expect(plan.skippedRecurrenceRules).toBe(1);
    expect(plan.invalidRecurrenceRuleRefs.map((r) => r.id)).toEqual(['r3']);
  });
});
