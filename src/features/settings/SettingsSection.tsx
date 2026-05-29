/**
 * 設定画面の section wrapper (Phase 1.6-T6 Issue #330 A4-2、 Phase 4 A3 で共有部品化)。
 *
 * section header (mono uppercase) → white surface card (radius 12 + overflow hidden) +
 * 内部 entries の構造を統一。`titleType` で section title type を切替 (DEV は subtitle)。
 *
 * SettingsScreen 本体と DevSettingsSection の両方が使うため専用モジュールに切り出し。
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BG_SURFACE } from '@/src/core/theme/colors';

export function SettingsSection({
  title,
  titleType = 'defaultSemiBold',
  children,
}: {
  title: string;
  titleType?: 'defaultSemiBold' | 'subtitle';
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <ThemedText type={titleType} style={styles.sectionTitle}>
        {title}
      </ThemedText>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  sectionCard: {
    backgroundColor: BG_SURFACE,
    borderRadius: 12,
    overflow: 'hidden',
  },
  // mockup v1.0 monetization-screens.jsx SettingsScreen SectionHeader 整合 (mono 風 small caps)
  sectionTitle: { fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1.5 },
});
