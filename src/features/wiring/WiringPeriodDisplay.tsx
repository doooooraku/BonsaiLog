/**
 * 装着期間アプリ内表示 (Issue #30 / ADR-0014 §48-49 / Free 全公開)。
 *
 * F-16 で装着期間経過通知を削除した代替として、盆栽詳細画面の wiring event
 * 行に「装着期間: X 週 (経過済 / あと N 週 / 完了)」を**事実表示**する。
 * 通知発火は ADR-0014 で削除済 (押し付けがましさ排除)。
 *
 * 状態判定:
 * - completed (isUnwired=true): 「装着期間: X 週 (完了)」
 * - overdue: 「装着期間: X 週 (経過済)」 (classifyWiringDuration が 'overdue')
 * - within: 「装着期間: X 週」 (classifyWiringDuration が 'within')
 *
 * 判定の責任分離:
 * - isUnwired は呼び出し側で同盆栽 events から判定 (この component は受け取るだけ)
 * - days/weeks/kind は wiringDuration の純関数で算出済の値を受け取る
 */
import React from 'react';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';
import type { WiringDurationKind } from '@/src/features/wiring/wiringDuration';

type Props = {
  weeks: number;
  kind: WiringDurationKind;
  isUnwired: boolean;
  testID?: string;
  style?: StyleProp<TextStyle>;
};

export function WiringPeriodDisplay({ weeks, kind, isUnwired, testID, style }: Props) {
  const { t } = useTranslation();

  const labelKey: TranslationKey = isUnwired
    ? 'wiringDurationCompletedLabel'
    : kind === 'overdue'
      ? 'wiringDurationOverdueLabel'
      : 'wiringDurationWithinWeeks';

  const label = t(labelKey).replace('{weeks}', String(weeks));

  return (
    <ThemedText style={[styles.label, style]} testID={testID}>
      {label}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, opacity: 0.8 },
});
