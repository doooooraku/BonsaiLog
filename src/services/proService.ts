import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesPackage,
  type PurchasesOffering,
  type PurchasesStoreProduct,
} from 'react-native-purchases';

import type { PlanKind, ProState } from '@/src/types/models';
import { IAP_DEBUG } from '@/src/core/debug';

export type PlanType = 'monthly' | 'yearly' | 'lifetime';
export type PriceDetail = {
  title: string;
  priceString: string;
  price: number;
  currencyCode: string;
  pricePerMonth: number | null;
  pricePerMonthString: string | null;
  subscriptionPeriod: string | null;
};
export type PriceDetails = {
  monthly?: PriceDetail | undefined;
  yearly?: PriceDetail | undefined;
  lifetime?: PriceDetail | undefined;
};

// F-13 Phase 1a (Issue #20): ADR-0009 §44 / §289 命名マッピングに従い変更。
// - ENTITLEMENT_ID: 'Pro_Plan' → 'premium' (RevenueCat Dashboard Entitlement 名と一致)
// - PRO_STATE_KEY: 'app_pro_state_v1' → 'bonsailog_pro_state_v1' (SecureStore キーをアプリ識別子付きに)
// 既存の Sandbox tester データは Restore Purchases で復元可能 (本番未ローンチのため影響なし)。
const PRO_STATE_KEY = 'bonsailog_pro_state_v1';
const ENTITLEMENT_ID = 'premium';
let configured = false;

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

function getExtraValue(key: string) {
  const expoConfig = Constants.expoConfig ?? Constants.manifest;
  const extra = (expoConfig as any)?.extra ?? {};
  return extra?.[key];
}

function getApiKey(): string | null {
  if (Platform.OS === 'ios') {
    return getExtraValue('REVENUECAT_IOS_API_KEY') ?? null;
  }
  if (Platform.OS === 'android') {
    return getExtraValue('REVENUECAT_ANDROID_API_KEY') ?? null;
  }
  return null;
}

async function saveState(state: ProState) {
  await SecureStore.setItemAsync(PRO_STATE_KEY, JSON.stringify(state));
}

function derivePlanType(productId: string | undefined, hasExpiration: boolean): PlanKind | null {
  if (!productId) return null;
  if (!hasExpiration) return 'lifetime';
  const id = productId.toLowerCase();
  if (id.includes('lifetime') || id.includes('lt')) return 'lifetime';
  if (id.includes('annual') || id.includes('yearly') || id.includes('year')) return 'yearly';
  if (id.includes('monthly') || id.includes('month')) return 'monthly';
  return null;
}

function toProState(info: CustomerInfo): ProState {
  const entitlement = info.entitlements.active[ENTITLEMENT_ID];
  const isPro = Boolean(entitlement);
  return {
    isPro,
    anonUserId: info.originalAppUserId ?? null,
    // eslint-disable-next-line no-restricted-syntax -- v1.x で nowUtc() に移行予定 (Issue #17 PR-A 後)
    lastCheckAt: new Date().toISOString(),
    planType: isPro
      ? derivePlanType(entitlement?.productIdentifier, entitlement?.expirationDate != null)
      : null,
    expirationDate: entitlement?.expirationDate ?? null,
    managementURL: info.managementURL ?? null,
  };
}

async function ensureConfigured() {
  if (!isNative) return;
  if (configured) return;

  const apiKey = getApiKey();
  if (IAP_DEBUG) {
    console.log(
      '[RC] platform=',
      Platform.OS,
      'apiKey exists=',
      Boolean(apiKey),
      'len=',
      apiKey?.length ?? 0,
    );
  }
  if (!apiKey) {
    throw new Error('RevenueCat API key is missing.');
  }

  void Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  await Purchases.configure({ apiKey });
  if (IAP_DEBUG) {
    console.log('[RC] configured');
  }
  configured = true;
}

async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  await ensureConfigured();
  if (!isNative) return null;
  const offerings = await Purchases.getOfferings();
  if (IAP_DEBUG) {
    const currentId = offerings.current?.identifier ?? 'null';
    const packages = offerings.current?.availablePackages?.map((p) => ({
      id: p.identifier,
      type: p.packageType,
      productId: p.product.identifier,
    }));
    console.log('[RC] offerings.current=', currentId);
    console.log('[RC] availablePackages=', packages ?? []);
  }
  return offerings.current ?? null;
}

function findPackage(offering: PurchasesOffering | null, plan: PlanType): PurchasesPackage | null {
  if (!offering) return null;
  if (plan === 'monthly') return offering.monthly;
  if (plan === 'yearly') return offering.annual;
  if (offering.lifetime) return offering.lifetime;
  return offering.availablePackages?.find((p) => p.packageType === 'LIFETIME') ?? null;
}

function toPriceDetail(product?: PurchasesStoreProduct | null): PriceDetail | null {
  if (!product) return null;
  return {
    title: product.title,
    priceString: product.priceString,
    price: product.price,
    currencyCode: product.currencyCode,
    pricePerMonth: product.pricePerMonth ?? null,
    pricePerMonthString: product.pricePerMonthString ?? null,
    subscriptionPeriod: product.subscriptionPeriod ?? null,
  };
}

async function getPriceDetails(): Promise<PriceDetails | null> {
  const offering = await getCurrentOffering();
  if (!offering) return null;

  const lifetimePkg =
    offering.lifetime ??
    offering.availablePackages?.find((p) => p.packageType === 'LIFETIME') ??
    null;

  return {
    monthly: toPriceDetail(offering.monthly?.product ?? null) ?? undefined,
    yearly: toPriceDetail(offering.annual?.product ?? null) ?? undefined,
    lifetime: toPriceDetail(lifetimePkg?.product ?? null) ?? undefined,
  };
}

async function getPriceStrings(): Promise<{
  monthly?: string | undefined;
  yearly?: string | undefined;
  lifetime?: string | undefined;
} | null> {
  const details = await getPriceDetails();
  if (!details) return null;
  return {
    monthly: details.monthly?.priceString,
    yearly: details.yearly?.priceString,
    lifetime: details.lifetime?.priceString,
  };
}

/**
 * F-13 Phase 2c (AC8 エラーハンドリング細分化)。
 *
 * RC `PurchasesError.code` を UI 表示用の分類に変換する純関数。
 * AC2-4 (cancelled = 無音) と AC2-5 (pending = 「承認待ち」UI) も識別できるよう、
 * 4 種類のユーザー向け文言 (AC8-1〜AC8-4) + cancelled / pending / unknown を返す。
 *
 * @see https://www.revenuecat.com/docs/test-and-launch/errors
 */
export type PurchaseErrorKind =
  | 'cancelled' // PURCHASE_CANCELLED_ERROR (AC2-4 無音)
  | 'pending' // PAYMENT_PENDING_ERROR (AC2-5 承認待ち UI)
  | 'network' // NETWORK_ERROR / OFFLINE_CONNECTION_ERROR (AC8-1)
  | 'alreadyPurchased' // PRODUCT_ALREADY_PURCHASED_ERROR (AC8-2)
  | 'storeProblem' // STORE_PROBLEM_ERROR (AC8-3)
  | 'notAllowed' // PURCHASE_NOT_ALLOWED_ERROR (AC8-4)
  | 'unknown';

export function mapPurchaseErrorCode(code: unknown): PurchaseErrorKind {
  if (typeof code !== 'string' && typeof code !== 'number') return 'unknown';
  const c = String(code);
  switch (c) {
    case '1':
      return 'cancelled';
    case '2':
      return 'storeProblem';
    case '3':
      return 'notAllowed';
    case '6':
      return 'alreadyPurchased';
    case '10':
    case '35':
      return 'network';
    case '20':
      return 'pending';
    default:
      return 'unknown';
  }
}

/** Exported for unit testing only. */
export {
  toProState as _toProState,
  findPackage as _findPackage,
  derivePlanType as _derivePlanType,
};

export const proService = {
  addCustomerInfoListener(onUpdate: (state: ProState) => void): (() => void) | null {
    if (!isNative) return null;
    const handler = async (info: CustomerInfo) => {
      const state = toProState(info);
      await saveState(state);
      onUpdate(state);
    };
    // listener は void 返却を期待するため、async handler を void 包みで登録/解除する
    // (add/remove で同一参照を渡す必要があるので wrapper を共有)。
    const voidHandler = (info: CustomerInfo) => {
      void handler(info);
    };
    Purchases.addCustomerInfoUpdateListener(voidHandler);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(voidHandler);
    };
  },

  async getPriceDetails() {
    return getPriceDetails();
  },
  async getPriceStrings() {
    return getPriceStrings();
  },
  async loadLocalState(): Promise<ProState | null> {
    try {
      const raw = await SecureStore.getItemAsync(PRO_STATE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as ProState;
    } catch {
      return null;
    }
  },

  /** 開発専用 (__DEV__ 限定): 課金状態を手動注入してローカル金庫に保存する。 */
  async devSaveState(state: ProState): Promise<void> {
    await saveState(state);
  },

  async refreshCustomerInfo(): Promise<ProState | null> {
    if (!isNative) return null;
    await ensureConfigured();
    const info = await Purchases.getCustomerInfo();
    const state = toProState(info);
    await saveState(state);
    return state;
  },

  async purchase(plan: PlanType): Promise<ProState> {
    await ensureConfigured();
    const offering = await getCurrentOffering();
    const pkg = findPackage(offering, plan);
    if (!pkg) {
      const currentId = offering?.identifier ?? 'null';
      throw new Error(
        IAP_DEBUG ? `Package not found. plan=${plan} current=${currentId}` : 'Package not found.',
      );
    }

    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const state = toProState(customerInfo);
    await saveState(state);
    return state;
  },

  async restore(): Promise<{ state: ProState; hasActive: boolean }> {
    await ensureConfigured();
    const customerInfo = await Purchases.restorePurchases();
    const state = toProState(customerInfo);
    await saveState(state);
    return { state, hasActive: state.isPro };
  },
};
