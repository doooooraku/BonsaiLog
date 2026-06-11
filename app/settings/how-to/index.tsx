/**
 * 設定 >「使い方」一覧 (#1179 / ADR-0058 pull 型ガイド)。
 *
 * 旧「チュートリアルを再表示」(ADR-0018 Phase H、実体 = tut5 1 枚で説明文と乖離) の構造置換。
 * - 6 トピック (定義 = src/features/howto/topics.ts) → 詳細ページへ
 * - 末尾「画面のガイドをもう一度見る」= guidesStore.resetAll (ADR-0058 原則 2 の唯一の再表示経路)
 *
 * Stack header は ADR-0053 SoT (settings/_layout の screenOptions + 本画面 Stack.Screen title)。
 */
import { Stack, useRouter, type Href } from 'expo-router';
import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToastStore } from '@/src/components/Toast';
import { useTranslation } from '@/src/core/i18n/i18n';
import { useColors } from '@/src/core/theme/useColors';
import { HOWTO_TOPICS } from '@/src/features/howto/topics';
import { useGuidesStore } from '@/src/stores/guidesStore';

export default function HowtoIndexScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const resetGuides = useGuidesStore((s) => s.resetAll);

  const handleResetGuides = useCallback(() => {
    resetGuides();
    useToastStore.getState().show(t('howtoGuideResetToast'));
  }, [resetGuides, t]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: c.background }]}>
      <Stack.Screen options={{ title: t('howtoTitle') }} />
      <ScrollView contentContainerStyle={styles.scroll} testID="e2e_howto_screen">
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          {HOWTO_TOPICS.map((topic, i) => (
            <Pressable
              key={topic.id}
              accessibilityRole="button"
              accessibilityLabel={t(topic.titleKey)}
              style={[
                styles.row,
                i < HOWTO_TOPICS.length - 1 && [styles.rowDivider, { borderBottomColor: c.border }],
              ]}
              onPress={() => router.push(`/settings/how-to/${topic.id}` as Href)}
              testID={topic.testID}
            >
              <ThemedText type="defaultSemiBold">{t(topic.titleKey)}</ThemedText>
              <ThemedText style={[styles.chevron, { color: c.textSecondary }]}>›</ThemedText>
            </Pressable>
          ))}
        </View>

        {/* ガイド再表示 (guidesStore.resetAll) — ADR-0058 原則 2 の唯一の再表示経路 */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('howtoGuideResetLabel')}
          style={[styles.resetRow, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={handleResetGuides}
          testID="e2e_howto_guide_reset"
        >
          <ThemedText style={{ color: c.tint }}>{t('howtoGuideResetLabel')}</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 16 },
  card: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowDivider: { borderBottomWidth: 1 },
  chevron: { fontSize: 18 },
  resetRow: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
