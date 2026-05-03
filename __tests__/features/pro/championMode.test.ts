/**
 * F-13a championMode.ts 純関数テスト (Issue #20、ADR-0009 AC10-3)。
 */
import { shouldHideSubscriptions } from '@/src/features/pro/championMode';

describe('shouldHideSubscriptions (Pocket Casts Champion 方式)', () => {
  test('Lifetime 所持時は true を返す (サブスク非表示)', () => {
    expect(shouldHideSubscriptions('lifetime')).toBe(true);
  });

  test('Yearly 所持時は false を返す (サブスク表示)', () => {
    expect(shouldHideSubscriptions('yearly')).toBe(false);
  });

  test('Monthly 所持時は false を返す (サブスク表示)', () => {
    expect(shouldHideSubscriptions('monthly')).toBe(false);
  });

  test('Free (planType=null) の時は false を返す (サブスク表示)', () => {
    expect(shouldHideSubscriptions(null)).toBe(false);
  });
});
