/**
 * F-10 エクスポート形式バッジ (CSV / PDF)。
 *
 * Hub の各行 (app/export/index.tsx) と生成中オーバーレイ (GeneratingOverlay) で共用する
 * 角丸の四角バッジ。CSV=ブランドグリーン系 / PDF=ゴールド系で色分け。
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ACCENT_GOLD, BRAND_GREEN } from '@/src/core/theme/colors';

export type ExportFmt = 'CSV' | 'PDF';

export function ExportFormatBadge({ fmt, size = 48 }: { fmt: ExportFmt; size?: number }) {
  const isCsv = fmt === 'CSV';
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size },
        {
          backgroundColor: isCsv ? 'rgba(31,58,46,0.08)' : 'rgba(198,158,72,0.14)',
          borderColor: isCsv ? BRAND_GREEN : ACCENT_GOLD,
        },
      ]}
    >
      <ThemedText style={[styles.badgeText, { color: isCsv ? BRAND_GREEN : '#8c6b25' }]}>
        {fmt}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
});
