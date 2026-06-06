/**
 * カレンダー凡例 collapsible bar (Sess22 ADR-0034 D1、 Sess23 ADR-0035 D1/D4/D5 で改訂)。
 *
 * 用途:
 * - PlanScreen 月選択 row と DOW header の間に配置
 * - dot の色 + アイコン (planned=○ outline / logged=● filled) + 「+」 (4+ 件) の意味を説明
 * - WCAG 1.4.1 (Use of Color、 Level A) 達成のため、 色のみ識別を回避
 *
 * 永続化: `useSettingsStore.calendarLegendCollapsed` (Zustand persist で AsyncStorage 自動保存)
 * - 初回起動 = 展開 (default false)、 user toggle で折りたたみ状態永続化
 *
 * Sess23 ADR-0035 D4/D5 改訂: planLegendDotLoggedLabel → planLegendDotRecordedLabel + items 順序 flip
 * (planned ○ を上に、 logged ● を下に、 時間軸「予定 → 記録」 を上→下/左→右で表現)
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import { useColors } from '@/src/core/theme/useColors';

import { CalendarDot } from './CalendarDot';

type CalendarLegendProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function CalendarLegend({ collapsed, onToggle }: CalendarLegendProps) {
  const { t } = useTranslation();
  // Sess65 PR2-b: container/header/items の static 色を useColors 動的化。 dark mode で
  // 記録 tab 凡例 card が白固定で内部 text dark token と「白の上に白」 化していた問題を解消。
  const c = useColors();

  return (
    <View
      style={[styles.container, { backgroundColor: c.surface, borderColor: c.border }]}
      testID="e2e_plan_legend"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={collapsed ? t('planLegendToggleShow') : t('planLegendToggleHide')}
        accessibilityState={{ expanded: !collapsed }}
        onPress={onToggle}
        style={styles.header}
        testID="e2e_plan_legend_toggle"
      >
        <ThemedText style={[styles.headerTitle, { color: c.text }]}>
          {t('planLegendTitle')}
        </ThemedText>
        <ThemedText style={[styles.headerToggle, { color: c.textSecondary }]}>
          {collapsed ? t('planLegendToggleShow') : t('planLegendToggleHide')}{' '}
          {collapsed ? '▼' : '▲'}
        </ThemedText>
      </Pressable>
      {!collapsed && (
        <View style={styles.items}>
          {/* ADR-0035 D5 (Sess23): planned (○) を上 / logged (●) を下 に flip (時間軸 予定 → 記録) */}
          <View style={styles.item} testID="e2e_plan_legend_item_planned">
            <CalendarDot status="planned" size={10} />
            <ThemedText style={[styles.itemLabel, { color: c.textSecondary }]}>
              {t('planLegendDotPlannedLabel')}
            </ThemedText>
          </View>
          <View style={styles.item} testID="e2e_plan_legend_item_logged">
            <CalendarDot status="logged" size={10} />
            <ThemedText style={[styles.itemLabel, { color: c.textSecondary }]}>
              {t('planLegendDotRecordedLabel')}
            </ThemedText>
          </View>
          <View style={styles.item} testID="e2e_plan_legend_item_multiple">
            <ThemedText style={[styles.plusSymbol, { color: c.tint }]}>+</ThemedText>
            <ThemedText style={[styles.itemLabel, { color: c.textSecondary }]}>
              {t('planLegendDotMultipleLabel')}
            </ThemedText>
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
    borderWidth: 1,
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
    letterSpacing: 0.4,
  },
  headerToggle: {
    fontSize: 11,
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
    textAlign: 'center',
  },
  itemLabel: {
    fontSize: 12,
  },
});
