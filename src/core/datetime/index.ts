/**
 * datetime バレルエクスポート (P2-03 PR-A)。
 *
 * 使い方:
 *   import { nowUtc, getTzOffsetMin, getTzIana, formatLocal, type IsoUtc } from '@/src/core/datetime';
 */
export { isoUtcFrom, nowUtc } from './clock';
export { formatLocal } from './format';
export { toLocalDateKey } from './localDateKey';
export { elapsedDaysFromIsoUtc, formatElapsedDays } from './relativeElapsed';
export { getTzIana, getTzOffsetMin } from './tz';
export type { IsoUtc, TzIana, TzOffsetMin } from './types';
