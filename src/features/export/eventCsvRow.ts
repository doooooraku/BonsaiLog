/**
 * F-10 作業履歴 CSV の 1 行を人間可読セル配列へ変換 (Issue #33 / ADR-0016 Amended)。
 *
 * 既存・テスト済みの buildHistoryChips (履歴 UI と同じ payload→人間可読チップ) を再利用し、
 * 「部位」列 (枝/幹 等) と「詳細」列 (量/鉢/薬剤/症状 等) を組み立てる。
 * 作業名・状態は i18n、日時は端末 tz でローカル整形。値の翻訳/整形は呼出側の t に依存。
 */
import { formatLocal } from '@/src/core/datetime/format';
import type { IsoUtc, TzIana } from '@/src/core/datetime/types';
import type { TranslationKey } from '@/src/core/i18n/i18n';
import { buildHistoryChips, type HistoryChip } from '@/src/features/event/buildHistoryChips';
import type { Event } from '@/src/db/schema';

type Tfn = (key: TranslationKey) => string;

/** 「部位」列に振り分ける chip の field key (枝/幹など樹体の部位)。残りは「詳細」列。 */
const BODY_PART_FIELD_KEYS = new Set<TranslationKey>([
  'workLogPruneParts',
  'workLogWireParts',
  'workLogUnwireParts',
]);

/** 作業履歴 CSV のヘッダ用 i18n キー (列順 = buildEventCsvRow と一致)。 */
export const EVENT_CSV_HEADER_KEYS: readonly TranslationKey[] = [
  'csvColEventBonsaiName',
  'csvColEventWork',
  'csvColEventStatus',
  'csvColEventDateTime',
  'csvColEventBodyPart',
  'csvColEventDetail',
  'csvColEventNote',
  'csvColEventBonsaiId',
  'csvColEventId',
];

function chipValue(chip: HistoryChip, t: Tfn): string {
  const value = chip.labelKey ? t(chip.labelKey) : (chip.text ?? '');
  const unit = chip.valueUnitKey ? t(chip.valueUnitKey) : '';
  return `${value}${unit}`;
}

/** UTC ISO + tzIana を端末ローカルの 'yyyy-MM-dd HH:mm' へ。tz 異常時は日付部分のみ fallback。 */
function formatEventDate(occurredAtUtc: string, tzIana: string): string {
  try {
    return formatLocal(occurredAtUtc as IsoUtc, tzIana as TzIana, 'yyyy-MM-dd HH:mm');
  } catch {
    return occurredAtUtc.slice(0, 16).replace('T', ' ');
  }
}

/**
 * 1 件の event を人間可読 CSV セル配列へ。
 * 列: 盆栽名 / 作業 / 状態 / 日時 / 部位 / 詳細 / メモ / 盆栽ID / 作業ID
 */
export function buildEventCsvRow(event: Event, bonsaiName: string, t: Tfn): string[] {
  const chips = buildHistoryChips({ type: event.type, payloadJson: event.payloadJson });
  const bodyPart = chips
    .filter((c) => c.fieldLabelKey != null && BODY_PART_FIELD_KEYS.has(c.fieldLabelKey))
    .map((c) => chipValue(c, t))
    .join(' / ');
  const detail = chips
    .filter((c) => !(c.fieldLabelKey != null && BODY_PART_FIELD_KEYS.has(c.fieldLabelKey)))
    .map((c) => (c.fieldLabelKey ? `${t(c.fieldLabelKey)}: ${chipValue(c, t)}` : chipValue(c, t)))
    .join(' / ');

  return [
    bonsaiName,
    t(`eventType_${event.type}` as TranslationKey),
    t(`eventStatus_${event.status}` as TranslationKey),
    formatEventDate(event.occurredAtUtc, event.tzIana),
    bodyPart,
    detail,
    event.note ?? '',
    event.bonsaiId,
    event.id,
  ];
}
