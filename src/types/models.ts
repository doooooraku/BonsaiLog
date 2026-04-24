// ---------------------------------------------------------------------------
// Pro / Subscription
// ---------------------------------------------------------------------------

export type PlanKind = 'monthly' | 'yearly' | 'lifetime';

export type ProState = {
  isPro: boolean;
  anonUserId: string | null;
  lastCheckAt: string;
  planType: PlanKind | null;
  expirationDate: string | null;
  managementURL: string | null;
};
