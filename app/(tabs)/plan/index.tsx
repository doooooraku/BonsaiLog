/**
 * 予定タブ index (ADR-0020 Phase 5、本 PR は stub)。
 *
 * Phase 5 で Claude Design `care-screens.jsx CalendarScreen` 整合に本実装。
 * 本 PR (Phase 1) では「準備中」プレースホルダーのみ。
 */
import React from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from '@/src/core/i18n/i18n';
import { useColors } from '@/src/core/theme/useColors';

export default function PlanScreen() {
  const { t } = useTranslation();
  const c = useColors();

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_plan_screen"
    >
      <ThemedText type="title" style={styles.title}>
        {t('tabPlan')}
      </ThemedText>
      <ThemedText style={styles.body}>{t('tabPlanComingSoon')}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', gap: 16 },
  title: { marginBottom: 8 },
  body: { textAlign: 'center', opacity: 0.7 },
});
