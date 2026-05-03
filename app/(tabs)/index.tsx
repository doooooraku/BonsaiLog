import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from '@/src/core/i18n/i18n';
import { AdBanner } from '@/src/features/ads/AdBanner';
import { OutdoorToggleButton } from '@/src/features/theme/OutdoorToggleButton';
import { useProStore } from '@/src/stores/proStore';

export default function HomeScreen() {
  const { t } = useTranslation();
  const isPro = useProStore((s) => s.isPro);

  return (
    <ThemedView style={styles.container}>
      {/* F-15 Phase G (Issue #32, ADR-0015 AC4 OA1): 屋外モードトグル共通コンポーネント */}
      <OutdoorToggleButton style={styles.outdoorPosition} testIdSuffix="home_outdoor_toggle" />

      {/* F-13 Phase 2e (Issue #20, ADR-0009 AC3-5): ホーム画面右上に小さな Pro バッジを常時表示 */}
      {isPro && (
        <View
          style={styles.proBadge}
          accessibilityLabel={t('settingsAccountProActive')}
          testID="e2e_home_pro_badge"
        >
          <ThemedText style={styles.proBadgeText}>{t('proBadgeShort')}</ThemedText>
        </View>
      )}
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
  // ADR-0009 AC3-5: 小さな「Pro」バッジ。SafeArea ヘッダー外に絶対配置、Settings と同色 (#2E7D32)
  proBadge: {
    position: 'absolute',
    top: 12,
    right: 16,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#2E7D32',
    zIndex: 10,
  },
  proBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  // ADR-0015 AC4 OA1: 屋外モードトグルの位置上書き (Pro バッジと衝突回避)
  outdoorPosition: {
    right: 56, // Pro バッジ (right: 16) と被らない位置
  },
});
