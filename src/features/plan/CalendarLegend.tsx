/**
 * カレンダー凡例 collapsible bar (Sess22 ADR-0034 D1)。
 *
 * 用途:
 * - PlanScreen 月選択 row と DOW header の間に配置
 * - dot の色 + アイコン (logged=● filled / planned=○ outline) + 「+」 (4+ 件) の意味を説明
 * - WCAG 1.4.1 (Use of Color、 Level A) 達成のため、 色のみ識別を回避
 *
 * 永続化: `useSettingsStore.calendarLegendCollapsed` (Zustand persist で AsyncStorage 自動保存)
 * - 初回起動 = 展開 (default false)、 user toggle で折りたたみ状態永続化
 *
 * PR-1-3 で `CalendarDot` component に置換予定 (現状 inline View で円描画)。
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';

import { CalendarDot } from './CalendarDot';

type CalendarLegendProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function CalendarLegend({ collapsed, onToggle }: CalendarLegendProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container} testID="e2e_plan_legend">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={collapsed ? t('planLegendToggleShow') : t('planLegendToggleHide')}
        accessibilityState={{ expanded: !collapsed }}
        onPress={onToggle}
        style={styles.header}
        testID="e2e_plan_legend_toggle"
      >
        <ThemedText style={styles.headerTitle}>{t('planLegendTitle')}</ThemedText>
        <ThemedText style={styles.headerToggle}>
          {collapsed ? t('planLegendToggleShow') : t('planLegendToggleHide')}{' '}
          {collapsed ? '▼' : '▲'}
        </ThemedText>
      </Pressable>
      {!collapsed && (
        <View style={styles.items}>
          <View style={styles.item} testID="e2e_plan_legend_item_logged">
            <CalendarDot status="logged" size={10} />
            <ThemedText style={styles.itemLabel}>{t('planLegendDotLoggedLabel')}</ThemedText>
          </View>
          <View style={styles.item} testID="e2e_plan_legend_item_planned">
            <CalendarDot status="planned" size={10} />
            <ThemedText style={styles.itemLabel}>{t('planLegendDotPlannedLabel')}</ThemedText>
          </View>
          <View style={styles.item} testID="e2e_plan_legend_item_multiple">
            <ThemedText style={styles.plusSymbol}>+</ThemedText>
            <ThemedText style={styles.itemLabel}>{t('planLegendDotMultipleLabel')}</ThemedText>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: BG_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerTitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    letterSpacing: 0.4,
  },
  headerToggle: {
    fontSize: 11,
    color: TEXT_SECONDARY,
  },
  items: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  plusSymbol: {
    width: 10,
    fontSize: 12,
    fontWeight: '700',
    color: BRAND_GREEN,
    textAlign: 'center',
  },
  itemLabel: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
});
