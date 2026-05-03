import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from '@/src/core/i18n/i18n';
import { AdBanner } from '@/src/features/ads/AdBanner';
import { useProStore } from '@/src/stores/proStore';
import { useSettingsStore } from '@/src/stores/settingsStore';

export default function HomeScreen() {
  const { t } = useTranslation();
  const isPro = useProStore((s) => s.isPro);
  const outdoorMode = useSettingsStore((s) => s.outdoorMode);
  const setOutdoorMode = useSettingsStore((s) => s.setOutdoorMode);

  return (
    <ThemedView style={styles.container}>
      {/* F-15 Phase F (Issue #32, ADR-0015 AC4 OA1): ヘッダー右上に屋外モードトグル
          太陽アイコンは絵文字 fallback (Lucide Sun/SunDim 置換予定)。
          48dp タッチ領域 (hitSlop 拡張)、accessibilityLabel 必須 */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('outdoorModeToggleA11y')}
        accessibilityState={{ selected: outdoorMode }}
        testID="e2e_home_outdoor_toggle"
        hitSlop={12}
        style={[styles.outdoorToggle, outdoorMode && styles.outdoorToggleActive]}
        onPress={() => setOutdoorMode(!outdoorMode)}
      >
        <ThemedText style={styles.outdoorIcon}>{outdoorMode ? '🌞' : '☀️'}</ThemedText>
      </Pressable>

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
  // ADR-0015 AC4 OA1: 屋外モードトグル。Pro バッジの左に配置、48dp タッチ領域 (hitSlop で拡張)
  outdoorToggle: {
    position: 'absolute',
    top: 8,
    right: 56, // Pro バッジ (right: 16) と被らない位置
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    zIndex: 10,
  },
  outdoorToggleActive: {
    backgroundColor: '#FFE082',
  },
  outdoorIcon: { fontSize: 22, lineHeight: 28 },
});
