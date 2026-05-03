/**
 * F-13 Phase 2a — proService 純関数 + Champion 方式テスト (Issue #20 / ADR-0009)。
 *
 * AC10-1 (proService.test.ts 緑) + AC10-3 (championMode.test.ts 相当) を 1 ファイルでカバー。
 *
 * 検証対象:
 * - `_derivePlanType(productId, hasExpiration)` — productId と expiration の有無から planType を判定
 * - `_findPackage(offering, plan)` — RC offering から plan に対応する Package を取得
 * - `_toProState(customerInfo)` — RC CustomerInfo を ProState 型に変換 (entitlements.active['premium'] 監視)
 * - Champion 方式: planType === 'lifetime' のとき PaywallScreen が subscription Card を非表示 (hideSubscriptions = true)
 *
 * Sandbox E2E (AC9: iOS / Android で月額/年額/Lifetime 購入 → Restore) は Phase 2c の人間タスク。
 */

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: {} },
    manifest: null,
  },
}));

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    setLogLevel: jest.fn(),
    configure: jest.fn(),
    getCustomerInfo: jest.fn(),
    getOfferings: jest.fn(),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(),
    addCustomerInfoUpdateListener: jest.fn(),
    removeCustomerInfoUpdateListener: jest.fn(),
  },
  LOG_LEVEL: { DEBUG: 'DEBUG' },
}));

jest.mock('@/src/core/debug', () => ({
  IAP_DEBUG: false,
}));

// eslint-disable-next-line import/first -- jest.mock を先に書く必要があるため
import { _derivePlanType, _findPackage, _toProState } from '@/src/services/proService';

describe('_derivePlanType (productId + hasExpiration → PlanKind)', () => {
  test('productId が空 → null', () => {
    expect(_derivePlanType(undefined, true)).toBeNull();
    expect(_derivePlanType('', true)).toBeNull();
  });

  test('hasExpiration=false (entitlement の有効期限なし) → 無条件 lifetime', () => {
    expect(_derivePlanType('any_product_id', false)).toBe('lifetime');
    expect(_derivePlanType('foo_bar_baz', false)).toBe('lifetime');
  });

  test('productId に lifetime / lt 含む → lifetime', () => {
    expect(_derivePlanType('bonsailog_pro_lifetime', true)).toBe('lifetime');
    expect(_derivePlanType('bonsailog_pro_lt', true)).toBe('lifetime');
    expect(_derivePlanType('LIFETIME_LT', true)).toBe('lifetime');
  });

  test('productId に annual / yearly / year 含む → yearly', () => {
    expect(_derivePlanType('bonsailog_pro_yearly', true)).toBe('yearly');
    expect(_derivePlanType('bonsailog_pro_annual', true)).toBe('yearly');
    expect(_derivePlanType('rc_bonsai_year_v1', true)).toBe('yearly');
    expect(_derivePlanType('YEARLY_PLAN', true)).toBe('yearly');
  });

  test('productId に monthly / month 含む → monthly', () => {
    expect(_derivePlanType('bonsailog_pro_monthly', true)).toBe('monthly');
    expect(_derivePlanType('rc_bonsai_month_v1', true)).toBe('monthly');
    expect(_derivePlanType('MONTHLY_PLAN', true)).toBe('monthly');
  });

  test('lifetime と yearly が両方含まれる場合は lifetime が優先 (順序依存)', () => {
    expect(_derivePlanType('bonsailog_lifetime_yearly_legacy', true)).toBe('lifetime');
  });

  test('未知パターン → null (subscription だが productId に手がかりなし)', () => {
    expect(_derivePlanType('rc_unknown_product', true)).toBeNull();
    expect(_derivePlanType('bonsailog_pro_v2', true)).toBeNull();
  });
});

describe('_findPackage (offering + plan → PurchasesPackage)', () => {
  const monthlyPkg = { identifier: 'monthly', packageType: 'MONTHLY' };
  const annualPkg = { identifier: 'annual', packageType: 'ANNUAL' };
  const lifetimePkg = { identifier: 'lifetime', packageType: 'LIFETIME' };

  test('offering が null → null', () => {
    expect(_findPackage(null, 'monthly')).toBeNull();
    expect(_findPackage(null, 'yearly')).toBeNull();
    expect(_findPackage(null, 'lifetime')).toBeNull();
  });

  test('plan=monthly → offering.monthly を返す', () => {
    const offering = { monthly: monthlyPkg, annual: annualPkg, lifetime: lifetimePkg } as never;
    expect(_findPackage(offering, 'monthly')).toBe(monthlyPkg);
  });

  test('plan=yearly → offering.annual を返す (RC は annual キー)', () => {
    const offering = { monthly: monthlyPkg, annual: annualPkg, lifetime: lifetimePkg } as never;
    expect(_findPackage(offering, 'yearly')).toBe(annualPkg);
  });

  test('plan=lifetime → offering.lifetime を返す', () => {
    const offering = { lifetime: lifetimePkg } as never;
    expect(_findPackage(offering, 'lifetime')).toBe(lifetimePkg);
  });

  test('plan=lifetime + offering.lifetime なし → availablePackages から packageType=LIFETIME を検索', () => {
    const offering = {
      lifetime: null,
      availablePackages: [monthlyPkg, annualPkg, lifetimePkg],
    } as never;
    expect(_findPackage(offering, 'lifetime')).toBe(lifetimePkg);
  });

  test('plan=lifetime + 全くなし → null', () => {
    const offering = { lifetime: null, availablePackages: [monthlyPkg, annualPkg] } as never;
    expect(_findPackage(offering, 'lifetime')).toBeNull();
  });

  test('plan=lifetime + availablePackages も undefined → null', () => {
    const offering = { lifetime: null } as never;
    expect(_findPackage(offering, 'lifetime')).toBeNull();
  });
});

describe('_toProState (CustomerInfo → ProState)', () => {
  test('entitlements.active["premium"] なし → Free 状態', () => {
    const info = {
      entitlements: { active: {} },
      originalAppUserId: 'user_anon_xyz',
      managementURL: null,
    } as never;
    const state = _toProState(info);
    expect(state.isPro).toBe(false);
    expect(state.planType).toBeNull();
    expect(state.expirationDate).toBeNull();
    expect(state.managementURL).toBeNull();
    expect(state.anonUserId).toBe('user_anon_xyz');
    expect(typeof state.lastCheckAt).toBe('string');
  });

  test('Lifetime 購入 (expirationDate=null) → planType=lifetime', () => {
    const info = {
      entitlements: {
        active: {
          premium: {
            productIdentifier: 'bonsailog_pro_lifetime',
            expirationDate: null,
          },
        },
      },
      originalAppUserId: 'user_lifetime',
      managementURL: 'https://apps.apple.com/account/subscriptions',
    } as never;
    const state = _toProState(info);
    expect(state.isPro).toBe(true);
    expect(state.planType).toBe('lifetime');
    expect(state.expirationDate).toBeNull();
    expect(state.managementURL).toBe('https://apps.apple.com/account/subscriptions');
  });

  test('Yearly 購入 (expirationDate あり) → planType=yearly + expirationDate 保持', () => {
    const expDate = '2027-01-01T00:00:00Z';
    const info = {
      entitlements: {
        active: {
          premium: {
            productIdentifier: 'bonsailog_pro_yearly',
            expirationDate: expDate,
          },
        },
      },
      originalAppUserId: 'user_yearly',
      managementURL: null,
    } as never;
    const state = _toProState(info);
    expect(state.isPro).toBe(true);
    expect(state.planType).toBe('yearly');
    expect(state.expirationDate).toBe(expDate);
  });

  test('Monthly 購入 → planType=monthly', () => {
    const info = {
      entitlements: {
        active: {
          premium: {
            productIdentifier: 'bonsailog_pro_monthly',
            expirationDate: '2026-06-01T00:00:00Z',
          },
        },
      },
      originalAppUserId: 'user_monthly',
      managementURL: null,
    } as never;
    const state = _toProState(info);
    expect(state.isPro).toBe(true);
    expect(state.planType).toBe('monthly');
  });

  test('originalAppUserId が undefined → anonUserId=null', () => {
    const info = {
      entitlements: { active: {} },
      managementURL: null,
    } as never;
    const state = _toProState(info);
    expect(state.anonUserId).toBeNull();
  });

  test('Pro でも productId が未知パターン (subscription) → planType=null', () => {
    const info = {
      entitlements: {
        active: {
          premium: {
            productIdentifier: 'unknown_v2_product',
            expirationDate: '2027-01-01T00:00:00Z',
          },
        },
      },
      originalAppUserId: 'user',
      managementURL: null,
    } as never;
    const state = _toProState(info);
    expect(state.isPro).toBe(true);
    expect(state.planType).toBeNull();
  });
});

describe('Champion mode (AC3: Lifetime 購入後はサブスク Package が非表示)', () => {
  const monthlyPkg = { identifier: 'monthly', packageType: 'MONTHLY' };
  const annualPkg = { identifier: 'annual', packageType: 'ANNUAL' };
  const lifetimePkg = { identifier: 'lifetime', packageType: 'LIFETIME' };

  test('Lifetime ProState で hideSubscriptions = true (PaywallScreen の振る舞い再現)', () => {
    const info = {
      entitlements: {
        active: {
          premium: {
            productIdentifier: 'bonsailog_pro_lifetime',
            expirationDate: null,
          },
        },
      },
      originalAppUserId: 'champion_user',
      managementURL: null,
    } as never;
    const state = _toProState(info);
    const hideSubscriptions = state.planType === 'lifetime';
    expect(hideSubscriptions).toBe(true);
  });

  test('Yearly ProState では hideSubscriptions = false', () => {
    const info = {
      entitlements: {
        active: {
          premium: {
            productIdentifier: 'bonsailog_pro_yearly',
            expirationDate: '2027-01-01T00:00:00Z',
          },
        },
      },
      originalAppUserId: 'yearly_user',
      managementURL: null,
    } as never;
    const state = _toProState(info);
    const hideSubscriptions = state.planType === 'lifetime';
    expect(hideSubscriptions).toBe(false);
  });

  test('Free ProState では hideSubscriptions = false (購入導線を表示)', () => {
    const info = {
      entitlements: { active: {} },
      originalAppUserId: 'free_user',
      managementURL: null,
    } as never;
    const state = _toProState(info);
    const hideSubscriptions = state.planType === 'lifetime';
    expect(hideSubscriptions).toBe(false);
  });

  test('Lifetime 所持時に findPackage で lifetime Package のみ取得可能 (sub は無視できる)', () => {
    const offering = {
      monthly: monthlyPkg,
      annual: annualPkg,
      lifetime: lifetimePkg,
    } as never;
    expect(_findPackage(offering, 'lifetime')).toBe(lifetimePkg);
  });
});
