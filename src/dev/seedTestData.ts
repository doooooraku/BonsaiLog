/**
 * 開発用テストデータ投入 (Sess10 PR-1 拡充 + PR-2 EN 版追加、 元 T1-4 案 1)。
 *
 * `__DEV__` 限定。 設定タブの開発者セクションから 1 タップで起動。
 *
 * 2 言語サポート (Sess10 PR-2):
 * - **seedTestData()** = 日本語版 (既存 3 件 父の黒松/母の五葉松/お師匠の真柏 維持、 Maestro 互換)
 * - **seedTestDataEn()** = 英語版 (Western 名前 Steve / Mary / Mr. Wilson 等、 Marcus persona 向け)
 *
 * 内容は両言語で同じ規模:
 * - **盆栽 11 件** (active 10 + archived 1)
 * - **写真 9 枚** (提供 5 + 既存 2 を共有、 銘品の真柏 / Heirloom Juniper が 3 枚で Free 上限テスト)
 * - **タグ 8 件** (3 つの prefix + place、 言語別)
 * - **events 全 13 種カバー** (watering / pruning / wiring / unwiring / repotting / fertilizing /
 *   pest_control / leaf_trimming / defoliation / deshoot / candle_cut / moss_care / position_change)
 * - **edge cases**: archived 1 / ゴミ箱 events 2 / 期日超過 planned 2
 *
 * 設計 (Sess10 PR-2 DRY refactor):
 * - `SeedLangPack` 型で言語別データ (名前 / メモ / タグ / note) を 構造化
 * - `SEED_PACK_JA` / `SEED_PACK_EN` でデータパック定義
 * - 共通 logic は `seedTestDataInternal(pack)` で 1 箇所、 言語別 wrapper 関数で公開
 * - 既存 Maestro flow 5 個 (g2-worklog-confirm / g2-work-picker / g3b-bulk-schedule-date /
 *   ui-diff/wiring-list / ui-diff/record-tab-direct) は JA 名前 (父の黒松/母の五葉松/お師匠の真柏)
 *   依存のため、 JA seed 時のみ flow 動作対象 (EN seed は demo / SS 用)
 *
 * Related: docs/how-to/development/test-data-seed.md、 Issue #355
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
 * 言語別 seed データパック (名前 / メモ / タグ名 / event note を構造化)。
 * 樹種 / 樹形 / 樹齢 / 写真配分 / event type / 日付 は言語非依存 (内部で hardcoded)。
 */
type SeedLangPack = {
  /** タグ名 8 件 (順序固定: show, balcony, watch, old, flower, autumn, indoor, master) */
  tagNames: {
    show: string;
    balcony: string;
    watch: string;
    old: string;
    flower: string;
    autumn: string;
    indoor: string;
    master: string;
  };
  /** 盆栽 11 件分の名前 (index 0-10、 idx 10 = archived) */
  bonsaiNames: readonly string[];
  /** 盆栽 11 件分のメモ */
  bonsaiMemos: readonly string[];
  /** 最初の watering 10 件の note (idx 0-9 = active 盆栽 10 件) */
  wateringNotes: readonly string[];
  /** OTHER_EVENTS 21 件の note (順序は OTHER_EVENT_DEFS に対応) */
  otherEventNotes: readonly string[];
  /** ゴミ箱 events 2 件の note */
  trashNotes: readonly string[];
};

// ---------------------------------------------------------------------------
// 言語別データパック
// ---------------------------------------------------------------------------

const SEED_PACK_JA: SeedLangPack = {
  tagNames: {
    show: '#展示会候補',
    balcony: '@ベランダ',
    watch: '#要注意',
    old: '#古木',
    flower: '#花あり',
    autumn: '#紅葉',
    indoor: '@室内',
    master: '@師匠の家',
  },
  bonsaiNames: [
    '父の黒松',
    '母の五葉松',
    'お師匠の真柏',
    '春待ちのハナカイドウ',
    '秋色のモミジ',
    '銘品の真柏',
    '鞍掛黒松',
    '修行中の苗木',
    '双幹の杜松',
    '思い出のツバキ',
    '老梅',
  ],
  bonsaiMemos: [
    '父から譲り受けた一本。 樹冠の動きを大切にしたい。',
    '母の手入れが行き届いていた銘品。 葉性の良さを保ちたい。',
    '師匠から見せて頂いた古木。 じっくり付き合っていく。',
    '毎年 4 月初旬に咲く花を楽しみに育てている。 室内棚で日当たりよく。',
    '紅葉時期の色合いが見事。 葉刈りで小葉化を進めている。',
    '師匠から託された 150 年の古木。 文人風の幹立ちが見事。 写真は年次タイムラインで管理。',
    '懸崖樹形の代表作。 鉢からの落差が美しい。',
    '実生からの苗。 これから樹形を作り込んでいく素材。',
    '双幹のバランスを大切に。 通年で針金可能。',
    '祖母から引き継いだ。 冬の花が見事。',
    '長年育てた梅。 樹勢衰え、 archive 済。',
  ],
  wateringNotes: [
    '葉色やや薄め、 潅水量を増やす',
    '土の乾き早し、 朝夕 2 回',
    '受け皿に水が残らない量で',
    '蕾が膨らんできた、 春が近い',
    '葉先がきれい、 秋の準備',
    '銘品の風格、 ゆっくり',
    '鉢の重み、 ずっしり',
    '苗の成長を観察中',
    '双幹のバランス OK',
    '蕾を確認、 来月開花',
  ],
  otherEventNotes: [
    '徒長枝の整理',
    '内ふところの古葉整理',
    '幹 2mm 線、 春外し予定',
    '枝 1mm 線',
    '食い込み防止で早めに外す',
    '用土更新、 赤玉 + 桐生砂',
    '鉢替え、 化粧鉢へ',
    '油粕固形肥料',
    '液肥薄め',
    '春肥、 緩効性',
    'ダコニール散布、 予防的',
    'カイガラムシ確認、 マシン油',
    '小葉化のため全葉刈り',
    '内ふところ古葉を抜く',
    '伸びた新芽を摘む',
    '真柏の若芽整理',
    '黒松芽切り、 2 番芽期待',
    '鞍掛、 芽切り完了',
    '苔の貼り直し、 化粧仕上げ',
    '室内 → 屋外、 春到来',
    '日向 → 半日陰',
  ],
  trashNotes: ['誤って 2 回入力、 1 件削除', '入力ミスで削除'],
};

const SEED_PACK_EN: SeedLangPack = {
  tagNames: {
    show: '#ShowReady',
    balcony: '@Patio',
    watch: '#WatchClose',
    old: '#OldTree',
    flower: '#InBloom',
    autumn: '#FallColor',
    indoor: '@Indoor',
    master: '@MasterStudio',
  },
  bonsaiNames: [
    "Steve's Black Pine",
    "Mary's White Pine",
    "Mr. Wilson's Shimpaku",
    "Sarah's Spring Crabapple",
    "Tom's Autumn Maple",
    'The Heirloom Juniper',
    'Cascade Black Pine',
    "Beginner's Sapling",
    'Twin-Trunk Juniper',
    "Grandma's Camellia",
    'The Old Plum',
  ],
  bonsaiMemos: [
    'Inherited from Dad. Cherish the elegant crown movement.',
    "From Mom's collection. Maintain the fine needle quality.",
    'A gift from my mentor Mr. Wilson. Take time with this one.',
    'Blooms every April. Kept indoors on a sunny windowsill.',
    'Beautiful fall colors. Defoliating to reduce leaf size.',
    'A 150-year heritage tree entrusted by my mentor. Literati-style trunk.',
    'Masterpiece in cascade style. The drop from the pot is striking.',
    'Seedling from seed. Material to develop the form over time.',
    'Twin-trunk balance is key. Can wire year-round.',
    'Inherited from Grandma. Winter blooms are spectacular.',
    'Long-cared plum. Vigor declined, now archived.',
  ],
  wateringNotes: [
    'Leaves slightly pale, increase watering',
    'Soil drying fast, water morning and evening',
    'Just enough so saucer stays empty',
    'Buds swelling, spring approaches',
    'Leaf tips look clean, autumn prep',
    "Heirloom's dignity, take your time",
    'Pot feels heavy, satisfying',
    'Observing seedling growth',
    'Twin-trunk balance OK',
    'Buds confirmed, blooming next month',
  ],
  otherEventNotes: [
    'Pruning long shoots',
    'Removing inner old needles',
    '2mm wire on trunk, plan to remove in spring',
    '1mm wire on branches',
    'Removed wire early to prevent biting',
    'Repotting with akadama + kiryu blend',
    'Pot upgrade, switching to display pot',
    'Solid organic fertilizer (rapeseed oil cake)',
    'Liquid fertilizer, diluted',
    'Spring fertilizer, slow release',
    'Daconil spray, preventive',
    'Confirmed scale insects, machine oil',
    'Full defoliation for leaf-size reduction',
    'Removing inner old needles',
    'Pinching new shoots',
    'Trimming new shoots on shimpaku',
    'Black pine candle cut, expecting second buds',
    'Cascade pine, candle cut complete',
    'Moss re-application, finishing touch',
    'Moved indoors → outdoors, spring arrives',
    'Sun → partial shade',
  ],
  trashNotes: ['Duplicate entry, deleted one', 'Wrong entry, deleted'],
};

// ---------------------------------------------------------------------------
// 日付ヘルパー (言語非依存)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 共通 seed logic (言語非依存部分 + SeedLangPack でテキスト受け取り)
// ---------------------------------------------------------------------------

/** OTHER_EVENTS 仕様 (idx 順序は SeedLangPack.otherEventNotes と対応)。 */
const OTHER_EVENT_DEFS: readonly { bonsaiIdx: number; type: EventType; daysAgo: number }[] = [
  { bonsaiIdx: 0, type: 'pruning', daysAgo: 30 },
  { bonsaiIdx: 5, type: 'pruning', daysAgo: 45 },
  { bonsaiIdx: 0, type: 'wiring', daysAgo: 98 },
  { bonsaiIdx: 1, type: 'wiring', daysAgo: 70 },
  { bonsaiIdx: 4, type: 'unwiring', daysAgo: 60 },
  { bonsaiIdx: 1, type: 'repotting', daysAgo: 75 },
  { bonsaiIdx: 3, type: 'repotting', daysAgo: 90 },
  { bonsaiIdx: 0, type: 'fertilizing', daysAgo: 15 },
  { bonsaiIdx: 2, type: 'fertilizing', daysAgo: 20 },
  { bonsaiIdx: 4, type: 'fertilizing', daysAgo: 40 },
  { bonsaiIdx: 0, type: 'pest_control', daysAgo: 25 },
  { bonsaiIdx: 9, type: 'pest_control', daysAgo: 50 },
  { bonsaiIdx: 4, type: 'leaf_trimming', daysAgo: 50 },
  { bonsaiIdx: 1, type: 'defoliation', daysAgo: 100 },
  { bonsaiIdx: 1, type: 'deshoot', daysAgo: 80 },
  { bonsaiIdx: 2, type: 'deshoot', daysAgo: 65 },
  { bonsaiIdx: 0, type: 'candle_cut', daysAgo: 55 },
  { bonsaiIdx: 6, type: 'candle_cut', daysAgo: 60 },
  { bonsaiIdx: 5, type: 'moss_care', daysAgo: 35 },
  { bonsaiIdx: 3, type: 'position_change', daysAgo: 10 },
  { bonsaiIdx: 9, type: 'position_change', daysAgo: 12 },
];

async function seedTestDataInternal(pack: SeedLangPack): Promise<SeedResult> {
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

  // 2. species lookup (8 種、 言語非依存 = scientificName)
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

  // 4. tags 8 件作成 (言語別名前)
  const [tagShow, tagBalcony, tagWatch, tagOld, tagFlower, tagAutumn, tagIndoor, tagMaster] =
    await Promise.all([
      createOrFindTag(pack.tagNames.show),
      createOrFindTag(pack.tagNames.balcony),
      createOrFindTag(pack.tagNames.watch),
      createOrFindTag(pack.tagNames.old),
      createOrFindTag(pack.tagNames.flower),
      createOrFindTag(pack.tagNames.autumn),
      createOrFindTag(pack.tagNames.indoor),
      createOrFindTag(pack.tagNames.master),
    ]);

  // 5. 盆栽 spec (11 件: active 10 + archived 1)
  //    樹種 / 樹形 / 樹齢 / 写真 / タグ配分は言語非依存、 name + memo のみ pack から取得
  type BonsaiSpec = {
    speciesId: string | null;
    style: 'chokkan' | 'moyogi' | 'shakan' | 'kengai' | 'bunjingi' | 'sokan';
    acquiredAt: string;
    estimatedAge: number;
    photoUris: (string | null)[];
    tagIds: string[];
    archived?: boolean;
  };
  const bonsaiSpec: BonsaiSpec[] = [
    // 既存 3 件 (JA Maestro flow 依存、 EN は demo / SS 用)
    {
      speciesId: blackPine?.id ?? null,
      style: 'chokkan',
      acquiredAt: toIsoUtc('2018-04-12'),
      estimatedAge: 35,
      photoUris: [photoUris.sample1],
      tagIds: [tagShow.id, tagBalcony.id],
    },
    {
      speciesId: whitePine?.id ?? null,
      style: 'moyogi',
      acquiredAt: toIsoUtc('2020-06-03'),
      estimatedAge: 18,
      photoUris: [photoUris.sample2],
      tagIds: [tagShow.id],
    },
    {
      speciesId: juniper?.id ?? null,
      style: 'shakan',
      acquiredAt: toIsoUtc('2022-09-21'),
      estimatedAge: 45,
      photoUris: [photoUris.balcony],
      tagIds: [tagWatch.id, tagBalcony.id, tagMaster.id],
    },
    // 新規 7 件 active
    {
      speciesId: hanakaido?.id ?? null,
      style: 'moyogi',
      acquiredAt: toIsoUtc('2023-03-15'),
      estimatedAge: 12,
      photoUris: [photoUris.pear],
      tagIds: [tagFlower.id, tagIndoor.id],
    },
    {
      speciesId: momiji?.id ?? null,
      style: 'chokkan',
      acquiredAt: toIsoUtc('2019-05-20'),
      estimatedAge: 25,
      photoUris: [photoUris.momiji],
      tagIds: [tagAutumn.id, tagBalcony.id],
    },
    {
      speciesId: juniper?.id ?? null,
      style: 'bunjingi',
      acquiredAt: toIsoUtc('2015-10-05'),
      estimatedAge: 150,
      photoUris: [photoUris.shimpaku, photoUris.balcony, photoUris.sample1], // 3 枚 = Free 上限
      tagIds: [tagOld.id, tagShow.id, tagMaster.id],
    },
    {
      speciesId: blackPine?.id ?? null,
      style: 'kengai',
      acquiredAt: toIsoUtc('2017-08-10'),
      estimatedAge: 60,
      photoUris: [photoUris.seedlings],
      tagIds: [tagOld.id],
    },
    {
      speciesId: blackPine?.id ?? null,
      style: 'chokkan',
      acquiredAt: toIsoUtc('2024-06-01'),
      estimatedAge: 5,
      photoUris: [],
      tagIds: [tagWatch.id],
    },
    {
      speciesId: tomatsu?.id ?? null,
      style: 'sokan',
      acquiredAt: toIsoUtc('2021-11-12'),
      estimatedAge: 30,
      photoUris: [],
      tagIds: [tagShow.id],
    },
    {
      speciesId: tsubaki?.id ?? null,
      style: 'moyogi',
      acquiredAt: toIsoUtc('2010-02-28'),
      estimatedAge: 80,
      photoUris: [],
      tagIds: [tagFlower.id, tagOld.id],
    },
    // アーカイブ済 1 件
    {
      speciesId: ume?.id ?? null,
      style: 'chokkan',
      acquiredAt: toIsoUtc('2005-01-10'),
      estimatedAge: 90,
      photoUris: [],
      tagIds: [],
      archived: true,
    },
  ];

  let photoCount = 0;
  let eventCount = 0;
  const createdBonsaiIds: string[] = [];
  const archivedBonsaiIds: string[] = [];

  for (const [idx, spec] of bonsaiSpec.entries()) {
    const bonsai = await createBonsai({
      name: pack.bonsaiNames[idx],
      speciesId: spec.speciesId,
      style: spec.style,
      acquiredAt: spec.acquiredAt,
      estimatedAge: spec.estimatedAge,
      memo: pack.bonsaiMemos[idx],
    });
    createdBonsaiIds.push(bonsai.id);

    for (const uri of spec.photoUris) {
      if (!uri) continue;
      try {
        await addPhotoFromUri({ bonsaiId: bonsai.id, sourceUri: uri });
        photoCount += 1;
      } catch (err) {
        console.warn('[seedTestData] photo attach failed:', err);
      }
    }

    for (const tagId of spec.tagIds) {
      try {
        await attachTagToBonsai(bonsai.id, tagId);
      } catch (err) {
        console.warn('[seedTestData] tag attach failed:', err);
      }
    }

    if (spec.archived) {
      try {
        await archiveBonsai(bonsai.id);
        archivedBonsaiIds.push(bonsai.id);
      } catch (err) {
        console.warn('[seedTestData] archive failed:', err);
      }
    }
  }

  // 6-1. watering: 各 active 盆栽 (idx 0-9) に過去 90 日分、 1 週間ごと
  //      直近 watering に pack の note
  for (const [bonsaiIdx, bonsaiId] of createdBonsaiIds.slice(0, 10).entries()) {
    for (let i = 0; i < 5; i++) {
      try {
        await createEvent({
          bonsaiId,
          type: 'watering',
          status: 'logged',
          occurredAtUtc: pastUtc(2 + i * 6, 7),
          note: i === 0 ? pack.wateringNotes[bonsaiIdx] : undefined,
        });
        eventCount += 1;
      } catch (err) {
        console.warn('[seedTestData] watering event create failed:', err);
      }
    }
  }

  // 6-2. その他の event_type (全 12 種、 each 1+ 件)、 OTHER_EVENT_DEFS + pack.otherEventNotes
  for (const [defIdx, def] of OTHER_EVENT_DEFS.entries()) {
    try {
      await createEvent({
        bonsaiId: createdBonsaiIds[def.bonsaiIdx],
        type: def.type,
        status: 'logged',
        occurredAtUtc: pastUtc(def.daysAgo, 9),
        note: pack.otherEventNotes[defIdx],
      });
      eventCount += 1;
    } catch (err) {
      console.warn('[seedTestData] event create failed:', err);
    }
  }

  // 6-3. planned events (未来 3-30 日、 plan-tab Calendar 表示用、 note なし)
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
    { bonsaiIdx: 7, type: 'watering', daysAgo: 7 },
    { bonsaiIdx: 8, type: 'fertilizing', daysAgo: 14 },
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

  // 6-5. wiring events (装着中 = unwiring 未実施、 wiring-list 表示用、 note なし)
  const wiringSpecs: {
    bonsaiIdx: number;
    weeksAgo: number;
    scheduledUnwireDaysAhead: number;
    wire_size_mm: number;
    body_part: string;
  }[] = [
    { bonsaiIdx: 0, weeksAgo: 14, scheduledUnwireDaysAhead: -14, wire_size_mm: 2, body_part: '幹' },
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

  // 7. ゴミ箱 events 2 件 (soft delete、 30 日ゴミ箱 UI テスト)
  let trashedCount = 0;
  const trashSpecs: { bonsaiIdx: number; type: EventType; daysAgo: number; noteIdx: number }[] = [
    { bonsaiIdx: 0, type: 'watering', daysAgo: 5, noteIdx: 0 },
    { bonsaiIdx: 4, type: 'leaf_trimming', daysAgo: 8, noteIdx: 1 },
  ];
  for (const spec of trashSpecs) {
    try {
      const event = await createEvent({
        bonsaiId: createdBonsaiIds[spec.bonsaiIdx],
        type: spec.type,
        status: 'logged',
        occurredAtUtc: pastUtc(spec.daysAgo, 7),
        note: pack.trashNotes[spec.noteIdx],
      });
      eventCount += 1;
      await softDeleteEvent(event.id);
      trashedCount += 1;
    } catch (err) {
      console.warn('[seedTestData] trash event create failed:', err);
    }
  }

  return {
    bonsaiCount: bonsaiSpec.length - archivedBonsaiIds.length,
    photoCount,
    eventCount,
    archivedCount: archivedBonsaiIds.length,
    trashedCount,
  };
}

// ---------------------------------------------------------------------------
// 公開関数 (言語別 wrapper)
// ---------------------------------------------------------------------------

/**
 * 日本語版テストデータを投入。 idempotent。
 *
 * 既存 Maestro flow 5 個 (g2-worklog-confirm / g2-work-picker / g3b-bulk-schedule-date /
 * ui-diff/wiring-list / ui-diff/record-tab-direct) が「父の黒松」 等 JA 名前依存のため、
 * Maestro 動作対象は本関数の投入結果のみ。
 */
export async function seedTestData(): Promise<SeedResult> {
  return seedTestDataInternal(SEED_PACK_JA);
}

/**
 * 英語版テストデータを投入 (Sess10 PR-2 追加、 Marcus persona 向け)。 idempotent。
 *
 * Western 名前 (Steve / Mary / Mr. Wilson 等) + 英語メモ。 demo / SS 撮影 / Marcus persona
 * 体感確認用。 既存 Maestro flow は JA 名前依存のため本投入結果は flow 対象外。
 */
export async function seedTestDataEn(): Promise<SeedResult> {
  return seedTestDataInternal(SEED_PACK_EN);
}

/**
 * 全データを削除 (`__DEV__` 限定、テスト前のリセット用)。
 *
 * order: events → bonsai_tags → photos → tags → bonsai
 * (FK 制約は ON DELETE CASCADE / SET NULL 設定済だが念のため明示順)。
 *
 * Sess9 PR-1 で event_tags を廃止 (ADR-0008 §Notes Amended 2026-05-18)、
 * DELETE 文も除去。 species / species_names は seed マスタなので残す。
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
