/**
 * useProGuard - Pro 機能 6 項目 (写真 / タグ / 作業記録写真 / カスタム樹種樹形) の
 * Free 上限ガード共通 hook (ADR-0049 Sess59 PR2)。
 *
 * Sess58 確定の Pro 機能境界:
 * - Free: 各機能 3 件まで (写真 / タグ / 作業記録写真 / カスタム樹種樹形)
 * - Pro:  無制限
 * - Grandfathered: 既存 4+ 件は表示 OK + 削除 OK + 追加のみ Paywall
 *
 * 利用例:
 *   const { canAdd, remainingSlots, openPaywall } = useProGuard({
 *     feature: 'photo_basic',
 *     currentCount: photos.length,
 *   });
 *   if (!canAdd) {
 *     openPaywall();  // → /pro?source=photo_basic に遷移
 *     return;
 *   }
 *   // expo-image-picker の selectionLimit に remainingSlots を渡す
 *
 * 写真ピッカー (expo-image-picker) の selectionLimit プロパティと組み合わせて、
 * Free user が 4 枚目以降を選べない UX を実現する (User真意 Sess59 R3 反映)。
 */
import { useCallback, useMemo } from 'react';
import { useRouter, type Href } from 'expo-router';

import { useProStore } from '@/src/stores/proStore';

export const FREE_LIMIT_PER_FEATURE = 3 as const;

export type ProGuardFeature =
  | 'photo_basic' // 基本情報 写真 (ADR-0049 ①)
  | 'photo_worklog' // 作業記録 写真 (ADR-0049 ③)
  | 'tag' // タグ作成 (ADR-0049 ②)
  | 'custom_species' // カスタム樹種・樹形 (ADR-0049 ⑥)
  | 'settings'; // Settings 画面からの「すべての Pro 機能を見る」 起動 (source 識別用)

type UseProGuardArgs = {
  feature: ProGuardFeature;
  currentCount: number;
};

type UseProGuardResult = {
  /** isPro || currentCount < 3 */
  canAdd: boolean;
  /** Free 残り枠数 (Pro は Infinity)。 expo-image-picker selectionLimit にそのまま渡せる */
  remainingSlots: number;
  /** Paywall modal に遷移 (source パラメータで起動元を識別) */
  openPaywall: () => void;
  /** Pro 状態 (call site で disabled / カウンター表示分岐に利用) */
  isPro: boolean;
};

/**
 * Pro 機能 6 項目の Free 上限ガード共通 hook。 写真 / タグ / 作業記録写真 /
 * カスタム樹種樹形の各ガード実装で再利用する (PR3-5 で利用)。
 */
export function useProGuard({ feature, currentCount }: UseProGuardArgs): UseProGuardResult {
  const router = useRouter();
  const isPro = useProStore((s) => s.isPro);

  const canAdd = isPro || currentCount < FREE_LIMIT_PER_FEATURE;

  const remainingSlots = useMemo(() => {
    if (isPro) return Number.POSITIVE_INFINITY;
    return Math.max(0, FREE_LIMIT_PER_FEATURE - currentCount);
  }, [isPro, currentCount]);

  const openPaywall = useCallback(() => {
    router.push(`/pro?source=${feature}` as Href);
  }, [router, feature]);

  return { canAdd, remainingSlots, openPaywall, isPro };
}
