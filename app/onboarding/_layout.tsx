/**
 * F-26 Phase B オンボーディング Stack (Issue #26 / ADR-0018)。
 * Phase C で言語選択 + 機能チュート 5 画面を追加。
 */
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="language" />
    </Stack>
  );
}
