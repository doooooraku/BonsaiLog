/**
 * F-10 Phase O / F-13 Follow-up - Pro 限定機能の Free タップ時の Paywall 遷移フック
 *
 * lessons/billing.md の「Free → Paywall 遷移は Alert 2 ボタン + Href cast」
 * パターンを再利用可能なフックに抽出。csv / pdf / list-pdf の 3 export 画面で
 * 同じ Alert ロジックを重複していたため、共通化する。
 *
 * 利用例:
 *   const goToPaywall = useGoToPaywall();
 *   if (!isPro) {
 *     goToPaywall(t('exportProRequiredTitle'), t('exportProRequiredBody'));
 *     return;
 *   }
 */
import { useCallback } from 'react';
import { Alert, type AlertButton } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { useTranslation } from '@/src/core/i18n/i18n';

/**
 * Paywall 遷移用 Alert ボタン配列を組み立てる純関数。
 * テスト容易性のため `useGoToPaywall` フックから抽出 (Issue #33)。
 */
export function buildPaywallAlertButtons(
  cancelLabel: string,
  upgradeLabel: string,
  onUpgrade: () => void,
): AlertButton[] {
  return [
    { text: cancelLabel, style: 'cancel' },
    { text: upgradeLabel, onPress: onUpgrade },
  ];
}

export function useGoToPaywall() {
  const router = useRouter();
  const { t } = useTranslation();

  return useCallback(
    (title: string, body: string) => {
      const buttons = buildPaywallAlertButtons(t('cancel'), t('proCtaUpgrade'), () =>
        router.push('/pro' as Href),
      );
      Alert.alert(title, body, buttons);
    },
    [router, t],
  );
}
