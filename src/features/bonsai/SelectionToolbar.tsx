/**
 * 複数選択モード中の下部コンテキストツールバー (mockup v1.0 home-screens.jsx SelectionToolbar 整合)。
 *
 * - 下部 (TabBar の上、AdBanner があれば更にその上) に絶対配置 (placement は親の責務)
 * - 「一括記録」「予定追加」の 2 ボタン (各 flex 1、minHeight 56dp)
 * - count===0 で両ボタン disabled (opacity 0.4)
 * - enableBulkLog=false で「一括記録」のみ disabled (PR 1 では false、Issue で BulkLogConfirmSheet 実装後に true)
 *
 * 哲学整合 (mockup v1.0 SelectionToolbar コメント): 「削除」は出さない、
 * 「アーカイブ」は個別運用、ツールバーは「事実の追加」3 種に絞る (現状は 2 種)。
 *
 * Props:
 *  - count: 選択中の盆栽数
 *  - onBulkLog: 一括記録ボタン押下 callback (本 PR では disabled で呼ばれない)
 *  - onBulkSchedule: 予定追加ボタン押下 callback
 *  - enableBulkLog: 一括記録を enable するか (default false、Issue で BulkLogConfirmSheet 実装後に true)
 *  - testID: e2e ID prefix
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import { BORDER_DEFAULT, TEXT_PRIMARY } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';

type Props = {
  count: number;
  onBulkLog?: () => void;
  onBulkSchedule?: () => void;
  enableBulkLog?: boolean;
  testID?: string;
};

export function SelectionToolbar({
  count,
  onBulkLog,
  onBulkSchedule,
  enableBulkLog = false,
  testID = 'e2e_home_selection_toolbar',
}: Props) {
  const { t } = useTranslation();
  const c = useColors();
  const empty = count === 0;
  const bulkLogDisabled = empty || !enableBulkLog;
  const bulkSchedDisabled = empty;

  return (
    <View
      style={[styles.toolbar, { backgroundColor: c.background, borderTopColor: c.border }]}
      testID={testID}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('bulkLog')}
        accessibilityState={{ disabled: bulkLogDisabled }}
        style={[styles.btn, bulkLogDisabled && styles.btnDisabled]}
        disabled={bulkLogDisabled}
        onPress={onBulkLog}
        testID={`${testID}_log`}
      >
        <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
          <Path
            d="M11 4l3 3M11 4L8 7M11 4v9M5 13v3a2 2 0 002 2h8a2 2 0 002-2v-3"
            stroke={c.tint}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <ThemedText style={[styles.label, { color: c.text }]}>{t('bulkLog')}</ThemedText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('bulkSchedule')}
        accessibilityState={{ disabled: bulkSchedDisabled }}
        style={[styles.btn, bulkSchedDisabled && styles.btnDisabled]}
        disabled={bulkSchedDisabled}
        onPress={onBulkSchedule}
        testID={`${testID}_schedule`}
      >
        <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
          <Rect x={3} y={5} width={16} height={14} rx={2} stroke={c.tint} strokeWidth={1.5} />
          <Path d="M3 9h16M8 3v4M14 3v4" stroke={c.tint} strokeWidth={1.5} strokeLinecap="round" />
          <Path d="M11 13v4M9 15h4" stroke={c.tint} strokeWidth={1.5} strokeLinecap="round" />
        </Svg>
        <ThemedText style={[styles.label, { color: c.text }]}>{t('bulkSchedule')}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    minHeight: 56,
    borderTopWidth: 1,
    borderTopColor: BORDER_DEFAULT,
  },
  btn: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  btnDisabled: { opacity: 0.4 },
  label: { fontSize: 11, fontWeight: '500', letterSpacing: 0.4, color: TEXT_PRIMARY },
});
