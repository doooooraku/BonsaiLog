/**
 * F-04 「最後から X 日」テキスト (Phase A、Issue #29 / ADR-0013 §15-18)。
 *
 * - 純関数 wateringHeatmap.classifyLastWatered の結果を i18n キーに変換して描画。
 * - severalDays (1-30) は太字大表示、manyDays (31-365) は通常表示 (色は薄く)。
 * - constraints §5-2 禁止語 (診断 / 判定 / 推奨 / べき / reminder / tracker / alert) を含めない。
 * - ADR-0011 「記録のみ」哲学を厳守 (推奨・指示は出さない、事実のみ表示)。
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import { classifyLastWatered, type LastWateredKind } from '@/src/features/watering/dateUtils';

type Props = {
  daysSinceLast: number | null;
  /** Maestro / a11y で使う任意の testID */
  testID?: string;
};

const KIND_TO_KEY: Record<LastWateredKind, string> = {
  noRecord: 'wateringLastNoRecord',
  today: 'wateringLastToday',
  oneDay: 'wateringLastOneDay',
  severalDays: 'wateringLastSeveralDays',
  manyDays: 'wateringLastManyDays',
  overYear: 'wateringLastOverYear',
};

export function LastWateredText({ daysSinceLast, testID }: Props) {
  const { t } = useTranslation();
  const kind = classifyLastWatered(daysSinceLast);
  const key = KIND_TO_KEY[kind];
  // 'severalDays' / 'manyDays' は {days} プレースホルダ置換が必要
  const raw = t(key as Parameters<typeof t>[0]);
  const text =
    daysSinceLast != null && (kind === 'severalDays' || kind === 'manyDays')
      ? raw.replace('{days}', String(daysSinceLast))
      : raw;

  const isStrong = kind === 'severalDays' || kind === 'today' || kind === 'oneDay';

  return (
    <View style={styles.container} testID={testID ?? 'e2e_last_watered_text'}>
      <ThemedText
        type={isStrong ? 'defaultSemiBold' : 'default'}
        style={[styles.text, !isStrong && styles.faded]}
      >
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 8, paddingHorizontal: 16 },
  text: { fontSize: 18, lineHeight: 24 },
  faded: { opacity: 0.7 },
});
