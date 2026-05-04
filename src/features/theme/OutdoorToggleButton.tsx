/**
 * F-15 Phase G — 屋外モードトグル共通コンポーネント (Issue #32 / ADR-0015 AC4)。
 *
 * 全画面ヘッダー右上に常設する太陽アイコン (OA1)。
 * Phase F (#134) でホーム画面に直接配置していたコードを共通化、他画面で再利用可能に。
 *
 * 配置:
 * - position: absolute (画面右上に絶対配置)
 * - hitSlop=12 で 48dp タッチ領域確保 (a11y)
 * - useSettingsStore.outdoorMode で ON/OFF 切替
 *
 * 将来 (Phase H 以降):
 * - Lucide Sun (OFF 時) / SunDim (ON 時) アイコン置換 (現状は絵文字 fallback)
 * - チュートリアル中の非表示制御 (オンボ画面では描画しない)
 */
import React from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import { ACCENT_GOLD } from '@/src/core/theme/colors';
import { useSettingsStore } from '@/src/stores/settingsStore';

export type OutdoorToggleButtonProps = {
  /** カスタム位置調整 (default: top: 8, right: 16)。 */
  style?: ViewStyle;
  /** testID 末尾 (default: 'outdoor_toggle')。複数画面に配置時の識別用。 */
  testIdSuffix?: string;
};

export function OutdoorToggleButton({
  style,
  testIdSuffix = 'outdoor_toggle',
}: OutdoorToggleButtonProps) {
  const { t } = useTranslation();
  const outdoorMode = useSettingsStore((s) => s.outdoorMode);
  const setOutdoorMode = useSettingsStore((s) => s.setOutdoorMode);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('outdoorModeToggleA11y')}
      accessibilityState={{ selected: outdoorMode }}
      testID={`e2e_${testIdSuffix}`}
      hitSlop={12}
      style={[styles.button, outdoorMode && styles.buttonActive, style]}
      onPress={() => setOutdoorMode(!outdoorMode)}
    >
      <ThemedText style={styles.icon}>{outdoorMode ? '🌞' : '☀️'}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: 8,
    right: 16,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    // 36×36 円形ボタン (radius = size/2 = 18)、design_system.md §5 pill 9999 禁止整合
    borderRadius: 18,
    zIndex: 10,
  },
  buttonActive: {
    backgroundColor: ACCENT_GOLD,
  },
  icon: { fontSize: 22, lineHeight: 28 },
});
