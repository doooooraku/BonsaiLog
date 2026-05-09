/**
 * Root index (ADR-0020 v1.x-1 + fix/249 + fix/281 Welcome 配線)。
 *
 * Issue #281 修正方針:
 * - 旧実装は無条件で `/(tabs)/bonsai` に redirect していたため、新規インストール時に
 *   Welcome 画面 (ADR-0018 ①) を経由せず Home に直行してしまい、ADR-0018 約束の
 *   オンボーディング体験 (Splash → Welcome → 言語選択 → ...) が崩れていた。
 * - 本修正で `useOnboardingStore` + `isOnboardingFinished` 純関数で
 *   完了判定し、未完了なら `/onboarding/welcome` へ redirect。
 * - zustand persist (AsyncStorage) の hydration が非同期なため、
 *   `onFinishHydration` で hydration 完了を待ってから判定する。
 *   既存ユーザー (completed=true) が初回 render で一瞬 Welcome に飛ぶのを防ぐ。
 *
 * 既存挙動の維持 (fix/249):
 * - ADR-0020 Phase 1 で `app/(tabs)/index.tsx` (Home) を削除した結果、`/` ルートが
 *   未解決となり Expo Router が "Unmatched Route" 画面を表示する問題への対応として、
 *   完了済ユーザーは引き続き `/(tabs)/bonsai` へ redirect する。
 * - app/_layout.tsx の `unstable_settings.anchor = '(tabs)'` は anchor 設定で
 *   タブ root の解決ヒントだが、`/` 直接アクセス時 (deep link / 起動時 fallback) には
 *   index.tsx が必要。
 */
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { isOnboardingFinished } from '@/src/features/onboarding/onboardingFlow';
import { useOnboardingStore } from '@/src/stores/onboardingStore';

export default function RootIndex() {
  const [hydrated, setHydrated] = useState(() => useOnboardingStore.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) return;
    const unsub = useOnboardingStore.persist.onFinishHydration(() => setHydrated(true));
    return () => {
      unsub();
    };
  }, [hydrated]);

  const completed = useOnboardingStore((s) => s.completed);
  const dismissed = useOnboardingStore((s) => s.dismissed);

  // hydration 未完了は Expo SplashScreen 維持 (fontsLoaded ロジックと併走)。
  if (!hydrated) {
    return null;
  }

  if (!isOnboardingFinished(completed, dismissed)) {
    return <Redirect href="/onboarding/welcome" />;
  }
  return <Redirect href="/(tabs)/bonsai" />;
}
