/**
 * 記録タブ index (ADR-0025 Phase 2 案 B、 Sess8 PR-2 本実装)。
 *
 * 動作:
 * - SearchHeader (タイトル「記録」、 歯車 ⚙ 表示)
 * - 中央に empty hub (DropletIcon + title + desc) で「FAB から一括記録」 を案内
 * - 右下 FAB (+) tap → useBulkActionFlow('log') で盆栽件数による分岐:
 *   - 0 件: 盆栽タブへ誘導
 *   - 1 件: 自動選択 + 直接 bulk-work-picker (mode='log') 起動
 *   - 2+ 件: bonsai-multi-select modal 起動
 *
 * ADR-0011 記録のみ哲学整合: 推奨 / 判定 / べき NG、 動線最短化のみ。
 * Phase 3 で record-tab.yml の Maestro flow 整備予定。
 */
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DropletIcon, PlusIcon } from '@/src/components/icons';
import { useTranslation } from '@/src/core/i18n/i18n';
import { ON_BRAND } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { getAllActiveBonsai } from '@/src/db/bonsaiRepository';
import type { Bonsai } from '@/src/db/schema';
import { SearchHeader } from '@/src/features/bonsai/SearchHeader';
import { useBulkActionFlow } from '@/src/features/event/useBulkActionFlow';

export default function RecordTabScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const tabBarHeight = useBottomTabBarHeight();
  const { startBulkAction } = useBulkActionFlow('log');
  const [bonsai, setBonsai] = useState<Bonsai[]>([]);

  const reload = useCallback(async () => {
    const bs = await getAllActiveBonsai();
    setBonsai(bs);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_record_screen"
    >
      <SearchHeader title={t('tabRecord')} showSearch={false} testIdSuffix="record" />

      <View style={styles.body}>
        <View style={[styles.iconBox, { borderColor: c.border }]}>
          <DropletIcon size={56} color={c.tint} />
        </View>
        <ThemedText style={[styles.title, { color: c.text }]}>
          {t('recordTabEmptyTitle')}
        </ThemedText>
        <ThemedText style={[styles.desc, { color: c.textSecondary }]}>
          {t('recordTabEmptyDesc')}
        </ThemedText>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('recordFabLabel')}
        style={[styles.fab, { backgroundColor: c.tint, bottom: tabBarHeight + 16 }]}
        onPress={() => startBulkAction(bonsai.map((b) => ({ id: b.id, name: b.name })))}
        testID="e2e_record_fab_action"
      >
        <PlusIcon size={28} color={ON_BRAND} />
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 22,
    lineHeight: 32,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  desc: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 280,
  },
  fab: {
    position: 'absolute',
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
