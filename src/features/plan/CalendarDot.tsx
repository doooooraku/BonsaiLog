/**
 * カレンダー grid の単一 dot component (Sess22 ADR-0034 D3)。
 *
 * 色 + アイコン併用で WCAG 1.4.1 (Use of Color、 Level A) 達成。
 * - logged: 塗りつぶし円 (●、 BRAND_GREEN)
 * - planned: outline 円 (○、 ACCENT_BARK borderWidth 1px)
 *
 * グレースケール mode / 色覚多様性でも形状で識別可能。
 *
 * R-42 整合: 状態を色のみで識別する設計を回避。
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ACCENT_BARK, BRAND_GREEN } from '@/src/core/theme/colors';

type CalendarDotProps = {
  status: 'planned' | 'logged';
  size?: number;
};

export function CalendarDot({ status, size = 6 }: CalendarDotProps) {
  const radius = size / 2;
  if (status === 'logged') {
    return (
      <View
        style={[
          styles.base,
          { width: size, height: size, borderRadius: radius, backgroundColor: BRAND_GREEN },
        ]}
      />
    );
  }
  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: ACCENT_BARK,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    // dot のサイズ + 色は props 経由で決定
  },
});
