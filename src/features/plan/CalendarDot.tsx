/**
 * カレンダー grid の単一 dot component (Sess22 ADR-0034 D3)。
 *
 * 色 + アイコン併用で WCAG 1.4.1 (Use of Color、 Level A) 達成。
 * - logged: 塗りつぶし円 (●、 c.tint = light #1F3A2E 深緑 / dark #7FA98A 苔緑)
 * - planned: outline 円 (○、 c.accentBark = light #5A4637 樹皮 / dark #A1886F warm 樹皮)
 *
 * グレースケール mode / 色覚多様性でも形状で識別可能。
 *
 * R-42 整合: 状態を色のみで識別する設計を回避。
 *
 * Sess69 PR-B: brand-static (BRAND_GREEN / ACCENT_BARK) → inline c.tint / c.accentBark。
 * dark mode で深緑/樹皮色が宵墨 bg に沈む罠を解消 (ADR-0015/ADR-0052 Amendment)。
 */
import { StyleSheet, View } from 'react-native';

import { useColors } from '@/src/core/theme/useColors';

type CalendarDotProps = {
  status: 'planned' | 'logged';
  size?: number;
};

export function CalendarDot({ status, size = 6 }: CalendarDotProps) {
  const c = useColors();
  const radius = size / 2;
  if (status === 'logged') {
    return (
      <View
        style={[
          styles.base,
          { width: size, height: size, borderRadius: radius, backgroundColor: c.tint },
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
          borderColor: c.accentBark,
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
