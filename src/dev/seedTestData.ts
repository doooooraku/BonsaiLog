/**
 * 開発用テストデータ投入 (Sess10 PR-1 拡充、 元 T1-4 案 1)。
 *
 * `__DEV__` 限定。設定タブの開発者セクションから 1 タップで起動。
 *
 * Sess10 拡充内容 (user 議論 Q1-Q4 で確定):
 * - **盆栽 11 件** (active 10 + archived 1): 既存 3 件 + 新規 7 active + 1 archived
 *   - 既存 3 件 (父の黒松 / 母の五葉松 / お師匠の真柏) は Maestro flow 5 個依存のため名前維持
 *   - 樹種拡張: 黒松 / 五葉松 / 真柏 / モミジ / ハナカイドウ / 杜松 / ツバキ / 梅
 *   - 樹形 6 種: 直幹 / 模様木 / 斜幹 / 懸崖 / 文人木 / 双幹
 *   - 樹齢: 5-150 年の幅
 * - **写真 7 枚配分** (提供 5 + 既存 2): 一部盆栽は複数枚 (Free 3 上限テスト)
 * - **タグ 8 件**: 既存 3 + 新規 5 (#古木 / #花あり / #紅葉 / @室内 / @師匠の家)
 * - **events 全 13 種カバー**: watering / pruning / wiring / unwiring / repotting /
 *   fertilizing / pest_control / leaf_trimming / defoliation / deshoot /
 *   candle_cut / moss_care / position_change
 * - **edge cases**: アーカイブ済 1 件 / ゴミ箱 events 2 件 / 期日超過 planned 2 件
 *
 * 設計方針:
 * - idempotent: 既に bonsai が 1 件以上ある場合は skip (no-op)
 * - 既存 3 件名前維持 = Maestro flow 5 個 (g2-worklog-confirm / g2-work-picker /
 *   g3b-bulk-schedule-date / ui-diff/wiring-list / ui-diff/record-tab-direct) 生存保証
 * - asset → expo-asset で localUri 解決、 失敗時は warn only (UX 配慮)
 * - 全 event_type を最低 1 件以上 → ストア SS で「豊富なキャリア」 表現
 *
 * Related: docs/how-to/development/test-data-seed.md (T1-4 ADR-equiv 方針)、 Issue #355
 */
import { Asset } from 'expo-asset';

import { nowUtc } from '@/src/core/datetime';
import { archiveBonsai, createBonsai, getAllActiveBonsai } from '@/src/db/bonsaiRepository';
import { getDb } from '@/src/db/db';
import { createEvent, softDeleteEvent } from '@/src/db/eventRepository';
import type { EventType } from '@/src/db/schema';
import { addPhotoFromUri } from '@/src/db/photoRepository';
import { getSpeciesByScientificName } from '@/src/db/speciesRepository';
import { attachTagToBonsai, createOrFindTag } from '@/src/db/tagRepository';

export type SeedResult = {
  bonsaiCount: number;
  photoCount: number;
  eventCount: number;
  archivedCount: number;
  trashedCount: number;
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
 * Sess10 拡充版テストデータを投入。idempotent。
 */
export async function seedTestData(): Promise<SeedResult> {
  // 1. 既存データチェック (idempotent)
  const existing = await getAllActiveBonsai();
  if (existing.length > 0) {
    return {
      bonsaiCount: existing.length,
      photoCount: 0,
      eventCount: 0,
      archivedCount: 0,
      trashedCount: 0,
      skipped: 'already_seeded',
    };
  }

  // 2. species lookup (8 種、 SPECIES_SEED で必ず存在する想定)
  const blackPine = await getSpeciesByScientificName('Pinus thunbergii', 'ja');
  const whitePine = await getSpeciesByScientificName('Pinus parviflora', 'ja');
  const juniper = await getSpeciesByScientificName('Juniperus chinensis', 'ja');
  const momiji = await getSpeciesByScientificName('Acer palmatum', 'ja');
  const hanakaido = await getSpeciesByScientificName('Malus halliana', 'ja');
  const tomatsu = await getSpeciesByScientificName('Juniperus rigida', 'ja');
  const tsubaki = await getSpeciesByScientificName('Camellia japonica', 'ja');
  const ume = await getSpeciesByScientificName('Prunus mume', 'ja');

  // 3. 写真 asset → localUri (失敗しても seed は継続) — 提供 5 + 既存 2 = 7 枚
  const photoUris: Record<string, string | null> = {
    sample1: await Asset.fromModule(require('@/assets/dev-seed/sample-1.jpg'))
      .downloadAsync()
      .then((a) => a.localUri ?? null)
      .catch(() => null),
    sample2: await Asset.fromModule(require('@/assets/dev-seed/sample-2.jpg'))
      .downloadAsync()
      .then((a) => a.localUri ?? null)
      .catch(() => null),
    balcony: await Asset.fromModule(require('@/assets/dev-seed/balcony-collection.jpg'))
      .downloadAsync()
      .then((a) => a.localUri ?? null)
      .catch(() => null),
    seedlings: await Asset.fromModule(require('@/assets/dev-seed/black-pine-seedlings.jpg'))
      .downloadAsync()
      .then((a) => a.localUri ?? null)
      .catch(() => null),
    pear: await Asset.fromModule(require('@/assets/dev-seed/pear-blossom.jpg'))
      .downloadAsync()
      .then((a) => a.localUri ?? null)
      .catch(() => null),
    shimpaku: await Asset.fromModule(require('@/assets/dev-seed/shimpaku-large.jpg'))
      .downloadAsync()
      .then((a) => a.localUri ?? null)
      .catch(() => null),
    momiji: await Asset.fromModule(require('@/assets/dev-seed/momiji-autumn.jpg'))
      .downloadAsync()
      .then((a) => a.localUri ?? null)
      .catch(() => null),
  };

  // 4. tags 8 件作成 (既存 3 + 新規 5)
  const [tagShow, tagBalcony, tagWatch, tagOld, tagFlower, tagAutumn, tagIndoor, tagMaster] =
    await Promise.all([
      createOrFindTag('#展示会候補'),
      createOrFindTag('@ベランダ'),
      createOrFindTag('#要注意'),
      createOrFindTag('#古木'),
      createOrFindTag('#花あり'),
      createOrFindTag('#紅葉'),
      createOrFindTag('@室内'),
      createOrFindTag('@師匠の家'),
    ]);

  // 5. 盆栽 spec (11 件: active 10 + archived 1)
  //    既存 3 件 (idx 0-2) は Maestro flow 依存のため名前完全維持
  type BonsaiSpec = {
    name: string;
    speciesId: string | null;
    style: 'chokkan' | 'moyogi' | 'shakan' | 'kengai' | 'bunjingi' | 'sokan';
    acquiredAt: string;
    estimatedAge: number;
    memo: string;
    photoUris: (string | null)[]; // 0-3 枚 (Free 上限)
    tagIds: string[];
    archived?: boolean;
  };
  const bonsaiSpec: BonsaiSpec[] = [
    // 既存 3 件 (Maestro flow 依存、 名前維持)
    {
      name: '父の黒松',
      speciesId: blackPine?.id ?? null,
      style: 'chokkan',
      acquiredAt: toIsoUtc('2018-04-12'),
      estimatedAge: 35,
      memo: '父から譲り受けた一本。 樹冠の動きを大切にしたい。',
      photoUris: [photoUris.sample1],
      tagIds: [tagShow.id, tagBalcony.id],
    },
    {
      name: '母の五葉松',
      speciesId: whitePine?.id ?? null,
      style: 'moyogi',
      acquiredAt: toIsoUtc('2020-06-03'),
      estimatedAge: 18,
      memo: '母の手入れが行き届いていた銘品。 葉性の良さを保ちたい。',
      photoUris: [photoUris.sample2],
      tagIds: [tagShow.id],
    },
    {
      name: 'お師匠の真柏',
      speciesId: juniper?.id ?? null,
      style: 'shakan',
      acquiredAt: toIsoUtc('2022-09-21'),
      estimatedAge: 45,
      memo: '師匠から見せて頂いた古木。 じっくり付き合っていく。',
      photoUris: [photoUris.balcony],
      tagIds: [tagWatch.id, tagBalcony.id, tagMaster.id],
    },
    // 新規 7 件 active
    {
      name: '春待ちのハナカイドウ',
      speciesId: hanakaido?.id ?? null,
      style: 'moyogi',
      acquiredAt: toIsoUtc('2023-03-15'),
      estimatedAge: 12,
      memo: '毎年 4 月初旬に咲く花を楽しみに育てている。 室内棚で日当たりよく。',
      photoUris: [photoUris.pear],
      tagIds: [tagFlower.id, tagIndoor.id],
    },
    {
      name: '秋色のモミジ',
      speciesId: momiji?.id ?? null,
      style: 'chokkan',
      acquiredAt: toIsoUtc('2019-05-20'),
      estimatedAge: 25,
      memo: '紅葉時期の色合いが見事。 葉刈りで小葉化を進めている。',
      photoUris: [photoUris.momiji],
      tagIds: [tagAutumn.id, tagBalcony.id],
    },
    {
      name: '銘品の真柏',
      speciesId: juniper?.id ?? null,
      style: 'bunjingi',
      acquiredAt: toIsoUtc('2015-10-05'),
      estimatedAge: 150,
      memo: '師匠から託された 150 年の古木。 文人風の幹立ちが見事。 写真は年次タイムラインで管理。',
      photoUris: [photoUris.shimpaku, photoUris.balcony, photoUris.sample1], // 3 枚 = Free 上限テスト
      tagIds: [tagOld.id, tagShow.id, tagMaster.id],
    },
    {
      name: '鞍掛黒松',
      speciesId: blackPine?.id ?? null,
      style: 'kengai',
      acquiredAt: toIsoUtc('2017-08-10'),
      estimatedAge: 60,
      memo: '懸崖樹形の代表作。 鉢からの落差が美しい。',
      photoUris: [photoUris.seedlings],
      tagIds: [tagOld.id],
    },
    {
      name: '修行中の苗木',
      speciesId: blackPine?.id ?? null,
      style: 'chokkan',
      acquiredAt: toIsoUtc('2024-06-01'),
      estimatedAge: 5,
      memo: '実生からの苗。 これから樹形を作り込んでいく素材。',
      photoUris: [], // 写真なし (placeholder 表示テスト)
      tagIds: [tagWatch.id],
    },
    {
      name: '双幹の杜松',
      speciesId: tomatsu?.id ?? null,
      style: 'sokan',
      acquiredAt: toIsoUtc('2021-11-12'),
      estimatedAge: 30,
      memo: '双幹のバランスを大切に。 通年で針金可能。',
      photoUris: [], // 写真なし
      tagIds: [tagShow.id],
    },
    {
      name: '思い出のツバキ',
      speciesId: tsubaki?.id ?? null,
      style: 'moyogi',
      acquiredAt: toIsoUtc('2010-02-28'),
      estimatedAge: 80,
      memo: '祖母から引き継いだ。 冬の花が見事。',
      photoUris: [], // 写真なし
      tagIds: [tagFlower.id, tagOld.id],
    },
    // アーカイブ済 1 件 (設定 right value 「N 件」 表示テスト)
    {
      name: '老梅',
      speciesId: ume?.id ?? null,
      style: 'chokkan',
      acquiredAt: toIsoUtc('2005-01-10'),
      estimatedAge: 90,
      memo: '長年育てた梅。 樹勢衰え、 archive 済。',
      photoUris: [],
      tagIds: [],
      archived: true,
    },
  ];

  let photoCount = 0;
  let eventCount = 0;
  const createdBonsaiIds: string[] = [];
  const archivedBonsaiIds: string[] = [];

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

    // 写真添付 (複数枚可、 失敗時は warn only)
    for (const uri of spec.photoUris) {
      if (!uri) continue;
      try {
        await addPhotoFromUri({ bonsaiId: bonsai.id, sourceUri: uri });
        photoCount += 1;
      } catch (err) {
        console.warn('[seedTestData] photo attach failed:', err);
      }
    }

    // タグ attach (M:N、 失敗時は warn only)
    for (const tagId of spec.tagIds) {
      try {
        await attachTagToBonsai(bonsai.id, tagId);
      } catch (err) {
        console.warn('[seedTestData] tag attach failed:', err);
      }
    }

    // archived 化 (idx 10 = 老梅)
    if (spec.archived) {
      try {
        await archiveBonsai(bonsai.id);
        archivedBonsaiIds.push(bonsai.id);
      } catch (err) {
        console.warn('[seedTestData] archive failed:', err);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 6. events 拡充: 全 13 event_type を最低 1 件以上カバー
  // ---------------------------------------------------------------------------

  // 6-1. watering: 各 active 盆栽 (idx 0-9) に過去 90 日分、 季節パターン (夏 週 2、 冬 週 1)
  //      直近 watering に mockup 整合の note (Issue #460、 BonsaiCard fallback)
  const FIRST_WATERING_NOTES: readonly string[] = [
    '葉色やや薄め、 潅水量を増やす', // 父の黒松
    '土の乾き早し、 朝夕 2 回', // 母の五葉松
    '受け皿に水が残らない量で', // お師匠の真柏
    '蕾が膨らんできた、 春が近い', // 春待ちのハナカイドウ
    '葉先がきれい、 秋の準備', // 秋色のモミジ
    '銘品の風格、 ゆっくり', // 銘品の真柏
    '鉢の重み、 ずっしり', // 鞍掛黒松
    '苗の成長を観察中', // 修行中の苗木
    '双幹のバランス OK', // 双幹の杜松
    '蕾を確認、 来月開花', // 思い出のツバキ
  ];
  for (const [bonsaiIdx, bonsaiId] of createdBonsaiIds.slice(0, 10).entries()) {
    for (let i = 0; i < 5; i++) {
      try {
        await createEvent({
          bonsaiId,
          type: 'watering',
          status: 'logged',
          occurredAtUtc: pastUtc(2 + i * 6, 7),
          note: i === 0 ? FIRST_WATERING_NOTES[bonsaiIdx] : undefined,
        });
        eventCount += 1;
      } catch (err) {
        console.warn('[seedTestData] watering event create failed:', err);
      }
    }
  }

  // 6-2. その他の event_type (全 12 種、 each 1 件以上)
  //      bonsaiIdx 0-9 から現実的に配分 (季節 + 樹種に合わせる)
  const OTHER_EVENTS: { bonsaiIdx: number; type: EventType; daysAgo: number; note?: string }[] = [
    // pruning (剪定) - 黒松/真柏で 5 月
    { bonsaiIdx: 0, type: 'pruning', daysAgo: 30, note: '徒長枝の整理' },
    { bonsaiIdx: 5, type: 'pruning', daysAgo: 45, note: '内ふところの古葉整理' },
    // wiring (針金がけ) - 装着中 2 件、 unwiring 想定
    { bonsaiIdx: 0, type: 'wiring', daysAgo: 98, note: '幹 2mm 線、 春外し予定' },
    { bonsaiIdx: 1, type: 'wiring', daysAgo: 70, note: '枝 1mm 線' },
    // unwiring (針金外し) - 春先
    { bonsaiIdx: 4, type: 'unwiring', daysAgo: 60, note: '食い込み防止で早めに外す' },
    // repotting (植替え) - 3 月
    { bonsaiIdx: 1, type: 'repotting', daysAgo: 75, note: '用土更新、 赤玉 + 桐生砂' },
    { bonsaiIdx: 3, type: 'repotting', daysAgo: 90, note: '鉢替え、 化粧鉢へ' },
    // fertilizing (施肥) - 月 1-2 回
    { bonsaiIdx: 0, type: 'fertilizing', daysAgo: 15, note: '油粕固形肥料' },
    { bonsaiIdx: 2, type: 'fertilizing', daysAgo: 20, note: '液肥薄め' },
    { bonsaiIdx: 4, type: 'fertilizing', daysAgo: 40, note: '春肥、 緩効性' },
    // pest_control (防除・消毒) - 梅雨
    { bonsaiIdx: 0, type: 'pest_control', daysAgo: 25, note: 'ダコニール散布、 予防的' },
    { bonsaiIdx: 9, type: 'pest_control', daysAgo: 50, note: 'カイガラムシ確認、 マシン油' },
    // leaf_trimming (葉刈り) - モミジ 6 月
    { bonsaiIdx: 4, type: 'leaf_trimming', daysAgo: 50, note: '小葉化のため全葉刈り' },
    // defoliation (葉抜き) - 五葉松 11 月
    { bonsaiIdx: 1, type: 'defoliation', daysAgo: 100, note: '内ふところ古葉を抜く' },
    // deshoot (芽摘み) - 五葉松/真柏 春
    { bonsaiIdx: 1, type: 'deshoot', daysAgo: 80, note: '伸びた新芽を摘む' },
    { bonsaiIdx: 2, type: 'deshoot', daysAgo: 65, note: '真柏の若芽整理' },
    // candle_cut (芽切り、 松類) - 黒松 8 月
    { bonsaiIdx: 0, type: 'candle_cut', daysAgo: 55, note: '黒松芽切り、 2 番芽期待' },
    { bonsaiIdx: 6, type: 'candle_cut', daysAgo: 60, note: '鞍掛、 芽切り完了' },
    // moss_care (苔の手入れ) - 春・秋
    { bonsaiIdx: 5, type: 'moss_care', daysAgo: 35, note: '苔の貼り直し、 化粧仕上げ' },
    // position_change (配置変更) - 季節変更
    { bonsaiIdx: 3, type: 'position_change', daysAgo: 10, note: '室内 → 屋外、 春到来' },
    { bonsaiIdx: 9, type: 'position_change', daysAgo: 12, note: '日向 → 半日陰' },
  ];
  for (const spec of OTHER_EVENTS) {
    try {
      await createEvent({
        bonsaiId: createdBonsaiIds[spec.bonsaiIdx],
        type: spec.type,
        status: 'logged',
        occurredAtUtc: pastUtc(spec.daysAgo, 9),
        note: spec.note,
      });
      eventCount += 1;
    } catch (err) {
      console.warn('[seedTestData] event create failed:', err);
    }
  }

  // 6-3. planned events (未来 3-30 日、 plan-tab Calendar 表示用)
  const planSpecs: { bonsaiIdx: number; type: EventType; daysAhead: number }[] = [
    { bonsaiIdx: 0, type: 'repotting', daysAhead: 3 },
    { bonsaiIdx: 1, type: 'pruning', daysAhead: 7 },
    { bonsaiIdx: 2, type: 'wiring', daysAhead: 10 },
    { bonsaiIdx: 0, type: 'fertilizing', daysAhead: 14 },
    { bonsaiIdx: 4, type: 'leaf_trimming', daysAhead: 21 },
    { bonsaiIdx: 5, type: 'pest_control', daysAhead: 30 },
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

  // 6-4. 期日超過 planned events (過去日付で status='planned'、 「期日超過」 表示テスト)
  const overdueSpecs: { bonsaiIdx: number; type: EventType; daysAgo: number }[] = [
    { bonsaiIdx: 7, type: 'watering', daysAgo: 7 }, // 修行中の苗木、 1 週前の予定忘れ
    { bonsaiIdx: 8, type: 'fertilizing', daysAgo: 14 }, // 双幹の杜松、 2 週前の施肥忘れ
  ];
  for (const spec of overdueSpecs) {
    try {
      await createEvent({
        bonsaiId: createdBonsaiIds[spec.bonsaiIdx],
        type: spec.type,
        status: 'planned',
        occurredAtUtc: pastUtc(spec.daysAgo, 9),
      });
      eventCount += 1;
    } catch (err) {
      console.warn('[seedTestData] overdue planned event create failed:', err);
    }
  }

  // 6-5. wiring events (装着中 = unwiring 未実施、 wiring-list 表示用)
  //      mockup 02-Home.html 「11 ケア 針金がけ一覧」 整合
  const wiringSpecs: {
    bonsaiIdx: number;
    weeksAgo: number;
    scheduledUnwireDaysAhead: number;
    wire_size_mm: number;
    body_part: string;
  }[] = [
    // 父の黒松: 14 週前装着、 外し予定は -14 日 (2 週超過、 mockup「14週経過・外し時期を 2週超過」 整合)
    { bonsaiIdx: 0, weeksAgo: 14, scheduledUnwireDaysAhead: -14, wire_size_mm: 2, body_part: '幹' },
    // 母の五葉松: 10 週前装着、 外し予定 +14 日 (2 週後、 mockup「10週経過・外し予定まで 2 週」)
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

  // ---------------------------------------------------------------------------
  // 7. ゴミ箱 events 2 件 (soft delete、 30 日ゴミ箱 UI テスト)
  //    一度 logged で作成 → softDeleteEvent で deleted_at セット
  // ---------------------------------------------------------------------------
  let trashedCount = 0;
  const trashSpecs: { bonsaiIdx: number; type: EventType; daysAgo: number; note: string }[] = [
    { bonsaiIdx: 0, type: 'watering', daysAgo: 5, note: '誤って 2 回入力、 1 件削除' },
    { bonsaiIdx: 4, type: 'leaf_trimming', daysAgo: 8, note: '入力ミスで削除' },
  ];
  for (const spec of trashSpecs) {
    try {
      const event = await createEvent({
        bonsaiId: createdBonsaiIds[spec.bonsaiIdx],
        type: spec.type,
        status: 'logged',
        occurredAtUtc: pastUtc(spec.daysAgo, 7),
        note: spec.note,
      });
      eventCount += 1;
      await softDeleteEvent(event.id);
      trashedCount += 1;
    } catch (err) {
      console.warn('[seedTestData] trash event create failed:', err);
    }
  }

  return {
    bonsaiCount: bonsaiSpec.length - archivedBonsaiIds.length, // active count
    photoCount,
    eventCount,
    archivedCount: archivedBonsaiIds.length,
    trashedCount,
  };
}

/**
 * 全データを削除 (`__DEV__` 限定、テスト前のリセット用)。
 *
 * order: events → bonsai_tags → photos → tags → bonsai
 * (FK 制約は ON DELETE CASCADE / SET NULL 設定済だが念のため明示順)。
 *
 * Sess9 PR-1 で event_tags を廃止 (ADR-0008 §Notes Amended 2026-05-18)、
 * DELETE 文も除去。species / species_names は seed マスタなので残す。
 */
export async function clearAllData(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM events;
    DELETE FROM bonsai_tags;
    DELETE FROM photos;
    DELETE FROM tags;
    DELETE FROM bonsai;
  `);
}
