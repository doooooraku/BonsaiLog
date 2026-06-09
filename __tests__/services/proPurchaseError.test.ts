/**
 * F-13 Phase 2c-1 — RC エラーコード → PurchaseErrorKind マッピングテスト (Issue #20 / ADR-0009)。
 *
 * AC8 (エラーハンドリング) 純関数化:
 * - AC8-1: NETWORK_ERROR / OFFLINE_CONNECTION_ERROR → 'network' (「接続を確認してください」UI)
 * - AC8-2: PRODUCT_ALREADY_PURCHASED_ERROR → 'alreadyPurchased' (「既に購入済み」+ Restore 誘導)
 * - AC8-3: STORE_PROBLEM_ERROR → 'storeProblem' (「ストアに問題があります」)
 * - AC8-4: PURCHASE_NOT_ALLOWED_ERROR → 'notAllowed' (「購入が許可されていません」)
 *
 * AC2-4 (cancelled = 無音) と AC2-5 (pending = 「承認待ち」UI) も識別。
 *
 * RC エラーコード参照: @revenuecat/purchases-typescript-internal/dist/errors.d.ts
 * Phase 2c-2 で i18n キー追加 + PaywallScreen 連携を実施。
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
  default: { expoConfig: { extra: {} }, manifest: null },
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

jest.mock('@/src/core/debug', () => ({ IAP_DEBUG: false }));

// eslint-disable-next-line import/first -- jest.mock を先に書く必要があるため
import { mapPurchaseErrorCode } from '@/src/services/proService';

describe('mapPurchaseErrorCode (AC8 RC エラー分類)', () => {
  describe('AC2-4: 購入キャンセル → cancelled (無音)', () => {
    test("'1' (PURCHASE_CANCELLED_ERROR) → cancelled", () => {
      expect(mapPurchaseErrorCode('1')).toBe('cancelled');
    });

    test('数値 1 でも同等判定', () => {
      expect(mapPurchaseErrorCode(1)).toBe('cancelled');
    });
  });

  describe('AC2-5: PAYMENT_PENDING → pending (承認待ち UI)', () => {
    test("'20' (PAYMENT_PENDING_ERROR) → pending", () => {
      expect(mapPurchaseErrorCode('20')).toBe('pending');
    });
  });

  describe('AC8-1: ネットワーク系 → network', () => {
    test("'10' (NETWORK_ERROR) → network", () => {
      expect(mapPurchaseErrorCode('10')).toBe('network');
    });

    test("'35' (OFFLINE_CONNECTION_ERROR) → network", () => {
      expect(mapPurchaseErrorCode('35')).toBe('network');
    });
  });

  describe('AC8-2: 既に購入済み → alreadyPurchased', () => {
    test("'6' (PRODUCT_ALREADY_PURCHASED_ERROR) → alreadyPurchased", () => {
      expect(mapPurchaseErrorCode('6')).toBe('alreadyPurchased');
    });
  });

  describe('AC8-3: ストア問題 → storeProblem', () => {
    test("'2' (STORE_PROBLEM_ERROR) → storeProblem", () => {
      expect(mapPurchaseErrorCode('2')).toBe('storeProblem');
    });
  });

  describe('AC8-4: 購入が許可されていない → notAllowed', () => {
    test("'3' (PURCHASE_NOT_ALLOWED_ERROR) → notAllowed", () => {
      expect(mapPurchaseErrorCode('3')).toBe('notAllowed');
    });
  });

  // Sess81: BillingError (= アプリ起因の文字列 code) を offeringsEmpty に分類。
  // RC Dashboard / Play Console 設定漏れ or 24h プロパゲーション中の判定。
  describe('Sess81 PR: BillingError (offerings 空) → offeringsEmpty', () => {
    test("'BILLING_OFFERINGS_EMPTY' → offeringsEmpty", () => {
      expect(mapPurchaseErrorCode('BILLING_OFFERINGS_EMPTY')).toBe('offeringsEmpty');
    });

    test("'BILLING_PACKAGE_NOT_FOUND' → offeringsEmpty", () => {
      expect(mapPurchaseErrorCode('BILLING_PACKAGE_NOT_FOUND')).toBe('offeringsEmpty');
    });

    test('未知の BILLING_* code → unknown (= 明示判定外は fallback)', () => {
      expect(mapPurchaseErrorCode('BILLING_UNKNOWN')).toBe('unknown');
    });
  });

  describe('未分類エラー → unknown', () => {
    test("'0' (UNKNOWN_ERROR) → unknown", () => {
      expect(mapPurchaseErrorCode('0')).toBe('unknown');
    });

    test("'4' (PURCHASE_INVALID_ERROR) → unknown", () => {
      expect(mapPurchaseErrorCode('4')).toBe('unknown');
    });

    test("'16' (UNKNOWN_BACKEND_ERROR) → unknown", () => {
      expect(mapPurchaseErrorCode('16')).toBe('unknown');
    });

    test("'42' (TEST_STORE_SIMULATED_PURCHASE_ERROR) → unknown", () => {
      expect(mapPurchaseErrorCode('42')).toBe('unknown');
    });
  });

  describe('入力型ガード', () => {
    test('undefined → unknown', () => {
      expect(mapPurchaseErrorCode(undefined)).toBe('unknown');
    });

    test('null → unknown', () => {
      expect(mapPurchaseErrorCode(null)).toBe('unknown');
    });

    test('object → unknown (壊れた error.code)', () => {
      expect(mapPurchaseErrorCode({ code: 1 })).toBe('unknown');
    });

    test('空文字列 → unknown', () => {
      expect(mapPurchaseErrorCode('')).toBe('unknown');
    });

    test('文字列の不正コード → unknown', () => {
      expect(mapPurchaseErrorCode('NETWORK_ERROR')).toBe('unknown');
      expect(mapPurchaseErrorCode('FOO')).toBe('unknown');
    });
  });

  describe('全 8 種類が網羅されている (型 narrowing 確認、 Sess81 で offeringsEmpty 追加)', () => {
    test('返り値の集合は { cancelled, pending, network, alreadyPurchased, storeProblem, notAllowed, offeringsEmpty, unknown } のみ', () => {
      const samples = [
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '10',
        '20',
        '35',
        '99',
        'BILLING_OFFERINGS_EMPTY',
        'BILLING_PACKAGE_NOT_FOUND',
        undefined,
        null,
      ];
      const results = new Set(samples.map((s) => mapPurchaseErrorCode(s)));
      const allowed = new Set([
        'cancelled',
        'pending',
        'network',
        'alreadyPurchased',
        'storeProblem',
        'notAllowed',
        'offeringsEmpty',
        'unknown',
      ]);
      for (const r of results) {
        expect(allowed.has(r)).toBe(true);
      }
    });
  });
});
