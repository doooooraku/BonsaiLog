/**
 * F-26 Phase B/C/G オンボーディング Stack (Issue #26 / ADR-0018)。
 *
 * - Phase B: welcome
 * - Phase C: language
 * - Phase G (本 PR): tut/[step] 動的ルート (tut1-5 を 1 ファイルで処理)
 */
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="language" />
      <Stack.Screen name="tut/[step]" />
    </Stack>
  );
}
