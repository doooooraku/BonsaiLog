/**
 * BonsaiCard 表示用 data builder (Sess9 PR-9 で共有 util 化)。
 *
 * 元実装は `app/(tabs)/bonsai/index.tsx:67 buildCardData()` の inline 関数。
 * タグ別盆栽一覧画面 (PR-9 tag-bonsai-list.tsx) でも同 UX 提供のため共有化。
 *
 * 仕様:
 * - cover 写真取得 (getCoverPhoto)
 * - active events 走査 (getActiveEventsByBonsai) で last watering / pruning 抽出
 * - 経過日数を formatElapsedDays で「3 日前」 等の文字列化
 * - 推定樹齢 ageText 構築
 */
import type { TranslationKey } from '@/src/core/i18n/locales/en';

import { formatElapsedDays } from '@/src/core/datetime';
import type { BonsaiWithSpecies } from '@/src/db/bonsaiRepository';
import { getActiveEventsByBonsai } from '@/src/db/eventRepository';
import { getCoverPhoto } from '@/src/db/photoRepository';
import { toLocalDateKey } from '@/src/features/watering/wateringHeatmap';

import type { BonsaiCardData } from './BonsaiCard';

type TranslateFn = (key: TranslationKey) => string;

export async function buildBonsaiCardData(
  b: BonsaiWithSpecies,
  todayLocalKey: string,
  tzOffsetMin: number,
  t: TranslateFn,
): Promise<BonsaiCardData> {
  const [cover, events] = await Promise.all([getCoverPhoto(b.id), getActiveEventsByBonsai(b.id)]);

  let lastWateringEv: { utc: string; note: string | null } | null = null;
  let lastPruningEv: { utc: string; note: string | null } | null = null;
  for (const e of events) {
    if (e.status !== 'logged' || e.deletedAt != null) continue;
    if (e.type === 'watering') {
      if (lastWateringEv == null || e.occurredAtUtc > lastWateringEv.utc) {
        lastWateringEv = { utc: e.occurredAtUtc, note: e.note ?? null };
      }
    } else if (e.type === 'pruning') {
      if (lastPruningEv == null || e.occurredAtUtc > lastPruningEv.utc) {
        lastPruningEv = { utc: e.occurredAtUtc, note: e.note ?? null };
      }
    }
  }

  let lastAction: BonsaiCardData['lastAction'] = null;
  const winner =
    lastWateringEv == null && lastPruningEv == null
      ? null
      : lastWateringEv == null
        ? { kind: 'pruning' as const, ev: lastPruningEv! }
        : lastPruningEv == null
          ? { kind: 'watering' as const, ev: lastWateringEv }
          : lastWateringEv.utc >= lastPruningEv.utc
            ? { kind: 'watering' as const, ev: lastWateringEv }
            : { kind: 'pruning' as const, ev: lastPruningEv };
  if (winner != null) {
    const lastKey = toLocalDateKey(winner.ev.utc, tzOffsetMin);
    const todayMs = Date.parse(`${todayLocalKey}T00:00:00Z`);
    const lastMs = Date.parse(`${lastKey}T00:00:00Z`);
    const days = Math.max(0, Math.floor((todayMs - lastMs) / (24 * 60 * 60 * 1000)));
    const elapsed = formatElapsedDays(days, t) ?? '';
    lastAction = { kind: winner.kind, elapsed, note: winner.ev.note };
  }

  const ageText =
    b.estimatedAge != null && b.estimatedAge > 0
      ? t('ageEstimatedFormat').replace('{years}', String(b.estimatedAge))
      : null;

  return {
    id: b.id,
    name: b.name,
    coverUri: cover?.absoluteUri ?? null,
    speciesCommonName: b.species?.commonName ?? null,
    lastAction,
    ageText,
  };
}
