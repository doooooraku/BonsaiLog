/**
 * 開発用テストデータ投入 (T1-4 案 1: アプリ内 dev シードボタン)。
 *
 * `__DEV__` 限定。設定タブの開発者セクションから 1 タップで起動。
 * 標準テストデータ:
 *   - 盆栽 3 件 (父の黒松 / 母の五葉松 / お師匠の真柏)
 *   - 写真 2 枚 (assets/dev-seed/sample-{1,2}.jpg、3 件目の盆栽は写真なし)
 *   - tags 3 件 (#展示会候補 / @ベランダ / #要注意) + 各盆栽に attach
 *   - watering events 各盆栽 5 件 (過去 30 日内、1 週間ごと、status='logged')
 *   - plan events 4 件 (status='planned'、未来 3-14 日に分散、plan-tab Calendar 表示用)
 *   - wiring events 2 件 (status='logged'、装着中 = unwiring 未実施、wiring-list 表示用)
 *
 * 設計方針:
 * - idempotent: 既に bonsai が 1 件以上ある場合は skip (no-op)、Alert で「既にデータあり」報告
 * - asset → expo-asset で localUri を解決 → persistPhotoFile / insertPhoto
 * - 写真追加が失敗しても盆栽登録は継続 (UX 配慮、ADR-0011 哲学)
 *
 * Related: docs/how-to/development/test-data-seed.md (T1-4 ADR-equiv 方針)、Issue #355
 */
import { Asset } from 'expo-asset';

import { nowUtc } from '@/src/core/datetime';
import { createBonsai, getAllActiveBonsai } from '@/src/db/bonsaiRepository';
import { getDb } from '@/src/db/db';
import { createEvent } from '@/src/db/eventRepository';
import type { EventType } from '@/src/db/schema';
import { addPhotoFromUri } from '@/src/db/photoRepository';
import { getSpeciesByScientificName } from '@/src/db/speciesRepository';
import { attachTagToBonsai, createOrFindTag } from '@/src/db/tagRepository';

export type SeedResult = {
  bonsaiCount: number;
  photoCount: number;
  eventCount: number;
  skipped?: 'already_seeded';
};

/**
 * 過去 N 日 m 時 0 分の ISO 8601 UTC を生成 (events.occurred_at_utc 用)。
 * tz 補正は呼出側責務。本 seed は UTC 直接で十分 (実機デモ用、解析には使わない)。
 */
function pastUtc(daysAgo: number, hour: number = 7): string {
  const now = new Date(nowUtc() as string);
  const past = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  past.setUTCHours(hour, 0, 0, 0);
  return past.toISOString();
}

/**
 * 未来 N 日 m 時 0 分の ISO 8601 UTC を生成 (planned events 用)。
 */
function futureUtc(daysAhead: number, hour: number = 7): string {
  const now = new Date(nowUtc() as string);
  const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  future.setUTCHours(hour, 0, 0, 0);
  return future.toISOString();
}

/** YYYY-MM-DD → ISO 8601 UTC (00:00:00Z)。bonsai.acquired_at / purchase_date 用。 */
function toIsoUtc(yyyymmdd: string): string {
  return `${yyyymmdd}T00:00:00.000Z`;
}

/**
 * テストデータを投入。idempotent。
 */
export async function seedTestData(): Promise<SeedResult> {
  // 1. 既存データチェック (idempotent)
  const existing = await getAllActiveBonsai();
  if (existing.length > 0) {
    return {
      bonsaiCount: existing.length,
      photoCount: 0,
      eventCount: 0,
      skipped: 'already_seeded',
    };
  }

  // 2. species lookup (3 種、seedSpecies.ts で必ず存在する想定)
  const blackPine = await getSpeciesByScientificName('Pinus thunbergii', 'ja');
  const whitePine = await getSpeciesByScientificName('Pinus parviflora', 'ja');
  const juniper = await getSpeciesByScientificName('Juniperus chinensis', 'ja');

  // 3. 写真 asset → localUri (失敗しても seed は継続)
  const photoUris: (string | null)[] = await Promise.all([
    Asset.fromModule(require('@/assets/dev-seed/sample-1.jpg'))
      .downloadAsync()
      .then((a) => a.localUri ?? null)
      .catch(() => null),
    Asset.fromModule(require('@/assets/dev-seed/sample-2.jpg'))
      .downloadAsync()
      .then((a) => a.localUri ?? null)
      .catch(() => null),
  ]);

  // 4. tags 3 件作成
  const [tagShow, tagBalcony, tagWatch] = await Promise.all([
    createOrFindTag('#展示会候補'),
    createOrFindTag('@ベランダ'),
    createOrFindTag('#要注意'),
  ]);

  // 5. 盆栽 3 件作成 + 写真 + タグ attach
  const bonsaiSpec: {
    name: string;
    speciesId: string | null;
    style: 'chokkan' | 'moyogi' | 'shakan';
    acquiredAt: string;
    estimatedAge: number;
    memo: string;
    photoUri: string | null;
    tagIds: string[];
  }[] = [
    {
      name: '父の黒松',
      speciesId: blackPine?.id ?? null,
      style: 'chokkan',
      acquiredAt: toIsoUtc('2018-04-12'),
      estimatedAge: 35,
      memo: '父から譲り受けた一本。樹冠の動きを大切にしたい。',
      photoUri: photoUris[0],
      tagIds: [tagShow.id, tagBalcony.id],
    },
    {
      name: '母の五葉松',
      speciesId: whitePine?.id ?? null,
      style: 'moyogi',
      acquiredAt: toIsoUtc('2020-06-03'),
      estimatedAge: 18,
      memo: '母の手入れが行き届いていた銘品。葉性の良さを保ちたい。',
      photoUri: photoUris[1],
      tagIds: [tagShow.id],
    },
    {
      name: 'お師匠の真柏',
      speciesId: juniper?.id ?? null,
      style: 'shakan',
      acquiredAt: toIsoUtc('2022-09-21'),
      estimatedAge: 45,
      memo: '師匠から見せて頂いた古木。じっくり付き合っていく。',
      photoUri: null, // 写真 2 枚しかないので 3 件目は無し
      tagIds: [tagWatch.id, tagBalcony.id],
    },
  ];

  let photoCount = 0;
  let eventCount = 0;
  const createdBonsaiIds: string[] = [];

  for (const spec of bonsaiSpec) {
    const bonsai = await createBonsai({
      name: spec.name,
      speciesId: spec.speciesId,
      style: spec.style,
      acquiredAt: spec.acquiredAt,
      estimatedAge: spec.estimatedAge,
      memo: spec.memo,
    });
    createdBonsaiIds.push(bonsai.id);

    // 写真添付 (失敗時は warn only)
    if (spec.photoUri) {
      try {
        await addPhotoFromUri({ bonsaiId: bonsai.id, sourceUri: spec.photoUri });
        photoCount += 1;
      } catch (err) {
        console.warn('[seedTestData] photo attach failed:', err);
      }
    }

    // タグ attach (M:N、失敗時は warn only)
    for (const tagId of spec.tagIds) {
      try {
        await attachTagToBonsai(bonsai.id, tagId);
      } catch (err) {
        console.warn('[seedTestData] tag attach failed:', err);
      }
    }
  }

  // 6. events: 各盆栽に watering を 5 件、過去 30 日で 1 週間ごと (status='logged')
  for (const bonsaiId of createdBonsaiIds) {
    for (let i = 0; i < 5; i++) {
      try {
        await createEvent({
          bonsaiId,
          type: 'watering',
          status: 'logged',
          occurredAtUtc: pastUtc(2 + i * 6, 7),
        });
        eventCount += 1;
      } catch (err) {
        console.warn('[seedTestData] event create failed:', err);
      }
    }
  }

  // 7. plan events: status='planned'、未来 3-14 日に分散 (plan-tab Calendar 表示用)
  //    mockup 02-Home.html 「10 ケア 作業予定カレンダー」 整合 (今日含む数件 + 来週分散)
  const planSpecs: { bonsaiIdx: number; type: EventType; daysAhead: number }[] = [
    { bonsaiIdx: 0, type: 'repotting', daysAhead: 3 }, // 父の黒松、植替え
    { bonsaiIdx: 1, type: 'pruning', daysAhead: 7 }, // 母の五葉松、剪定
    { bonsaiIdx: 2, type: 'wiring', daysAhead: 10 }, // お師匠の真柏、針金
    { bonsaiIdx: 0, type: 'fertilizing', daysAhead: 14 }, // 父の黒松、施肥
  ];
  for (const spec of planSpecs) {
    try {
      await createEvent({
        bonsaiId: createdBonsaiIds[spec.bonsaiIdx],
        type: spec.type,
        status: 'planned',
        occurredAtUtc: futureUtc(spec.daysAhead, 9),
      });
      eventCount += 1;
    } catch (err) {
      console.warn('[seedTestData] plan event create failed:', err);
    }
  }

  // 8. wiring events: status='logged'、装着中 (unwiring 未実施)、wiring-list 表示用
  //    mockup 02-Home.html 「11 ケア 針金がけ一覧」整合 (装着期間 + 外し予定週数)
  const wiringSpecs: {
    bonsaiIdx: number;
    weeksAgo: number;
    scheduledUnwireDaysAhead: number; // 外し予定 (今から N 日後、負値なら超過)
    wire_size_mm: number;
    body_part: string;
  }[] = [
    // 父の黒松: 14 週前装着、外し予定は -14 日 (2 週超過、mockup「14週経過・外し時期を 2週超過」整合)
    { bonsaiIdx: 0, weeksAgo: 14, scheduledUnwireDaysAhead: -14, wire_size_mm: 2, body_part: '幹' },
    // 母の五葉松: 10 週前装着、外し予定 +14 日 (2 週後、mockup「10週経過・外し予定まで 2 週」)
    { bonsaiIdx: 1, weeksAgo: 10, scheduledUnwireDaysAhead: 14, wire_size_mm: 1, body_part: '枝' },
  ];
  for (const w of wiringSpecs) {
    try {
      const scheduledUnwireAt =
        w.scheduledUnwireDaysAhead >= 0
          ? futureUtc(w.scheduledUnwireDaysAhead, 9)
          : pastUtc(-w.scheduledUnwireDaysAhead, 9);
      await createEvent({
        bonsaiId: createdBonsaiIds[w.bonsaiIdx],
        type: 'wiring',
        status: 'logged',
        occurredAtUtc: pastUtc(w.weeksAgo * 7, 9),
        payload: {
          wire_size_mm: w.wire_size_mm,
          body_part: w.body_part,
          scheduled_unwire_at: scheduledUnwireAt,
        },
      });
      eventCount += 1;
    } catch (err) {
      console.warn('[seedTestData] wiring event create failed:', err);
    }
  }

  return {
    bonsaiCount: bonsaiSpec.length,
    photoCount,
    eventCount,
  };
}

/**
 * 全データを削除 (`__DEV__` 限定、テスト前のリセット用)。
 *
 * order: events → bonsai_tags → event_tags → photos → tags → bonsai
 * (FK 制約は ON DELETE CASCADE / SET NULL 設定済だが念のため明示順)。
 *
 * species / species_names は seed マスタなので残す (アプリ起動時の seed 側で再生成)。
 */
export async function clearAllData(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM events;
    DELETE FROM bonsai_tags;
    DELETE FROM event_tags;
    DELETE FROM photos;
    DELETE FROM tags;
    DELETE FROM bonsai;
  `);
}
