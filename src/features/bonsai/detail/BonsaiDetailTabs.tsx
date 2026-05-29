import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { TranslationKey } from '@/src/core/i18n/locales/en';
import { BORDER_DEFAULT, BRAND_GREEN } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import type { DetailTab } from '@/src/features/bonsai/detail/useBonsaiDetailTabs';

/**
 * 盆栽詳細画面 上部の sticky タブバー (R3 presentational)。
 * 作業履歴 / 作業予定 / 基本情報 の 3 タブ (ADR-0020 順序、Claude Design detail-screens.jsx)。
 *
 * Phase 4 A1-11 で `bonsai/[id]/index.tsx` から抽出 (挙動不変)。タブ状態は useBonsaiDetailTabs。
 * FAB(作業履歴/予定タブ)は ADR-0042「FAB SoT = root」のため本コンポーネントに内包せず index 残置。
 */
export function BonsaiDetailTabs({
  activeTab,
  onChange,
  t,
}: {
  activeTab: DetailTab;
  onChange: (tab: DetailTab) => void;
  t: (key: TranslationKey) => string;
}) {
  const c = useColors();
  return (
    <View style={styles.detailTabs}>
      {(['history', 'timeline', 'basic'] as const).map((tab) => {
        const on = activeTab === tab;
        const labelKey =
          tab === 'history'
            ? 'detailTabHistory'
            : tab === 'timeline'
              ? 'detailTabPlanTimeline'
              : 'detailTabBasic';
        return (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={t(labelKey)}
            style={[styles.detailTab, on && styles.detailTabOn]}
            onPress={() => onChange(tab)}
            testID={`e2e_detail_tab_${tab}`}
          >
            <ThemedText
              style={[
                styles.detailTabText,
                on ? styles.detailTabTextOn : { color: c.textSecondary },
              ]}
            >
              {t(labelKey)}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // ADR-0020 v1.x-2: DetailTabs (Claude Design detail-screens.jsx)
  detailTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER_DEFAULT,
  },
  detailTab: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  detailTabOn: { borderBottomColor: BRAND_GREEN },
  detailTabText: { fontSize: 14, fontWeight: '400' },
  detailTabTextOn: { color: BRAND_GREEN, fontWeight: '500' },
});
