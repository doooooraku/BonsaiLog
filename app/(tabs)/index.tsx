import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AdBanner } from '@/src/features/ads/AdBanner';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText type="title">BonsaiLog</ThemedText>
        <ThemedText>ここからアプリを作り始めましょう。</ThemedText>
      </View>
      {/* F-14 Phase A (Issue #22, ADR-0010): Home 下部バナー、Pro で完全非表示 */}
      <AdBanner />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
});
