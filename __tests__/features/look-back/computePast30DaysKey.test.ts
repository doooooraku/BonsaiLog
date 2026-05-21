/**
 * Sess22 ADR-0034 D6: computePast30DaysKey 純関数 unit test。
 *
 * 3 case 検証:
 * 1. 通常 case (UTC+0)
 * 2. JST (UTC+9) TZ 補正
 * 3. UTC-5 (西半球) TZ 補正
 */
import { computePast30DaysKey } from '@/src/features/look-back/computePast30DaysKey';

describe('computePast30DaysKey (Sess22 ADR-0034 D6)', () => {
  test('case 1: UTC+0 で 2026-05-21 → 30 日前 = 2026-04-21', () => {
    const now = new Date('2026-05-21T12:00:00.000Z');
    const key = computePast30DaysKey(now, 0);
    expect(key).toBe('2026-04-21');
  });

  test('case 2: JST (UTC+9) で 2026-05-21T12:00 UTC → 30 日前 = 2026-04-21 (JST)', () => {
    const now = new Date('2026-05-21T12:00:00.000Z');
    const key = computePast30DaysKey(now, 540);
    // 2026-05-21T12:00 UTC - 30d = 2026-04-21T12:00 UTC
    // JST = +9h → 2026-04-21T21:00 JST → dateKey = '2026-04-21'
    expect(key).toBe('2026-04-21');
  });

  test('case 3: UTC-5 で 2026-05-21T02:00 UTC → JST 換算で過去 30 日 = 2026-04-20', () => {
    const now = new Date('2026-05-21T02:00:00.000Z');
    const key = computePast30DaysKey(now, -300);
    // 2026-05-21T02:00 UTC - 30d = 2026-04-21T02:00 UTC
    // UTC-5 = -5h → 2026-04-20T21:00 UTC-5 → dateKey = '2026-04-20'
    expect(key).toBe('2026-04-20');
  });
});
