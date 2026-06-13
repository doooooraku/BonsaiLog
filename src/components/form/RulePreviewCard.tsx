/**
 * RulePreviewCard — 定期予定 ルール プレビュー card (Sess93 PR-4)。
 *
 * 「このルールで作られる予定」 を 保存前に user に見せる確認 card。
 * モック整合: 「{頻度}・{作業} を {N} 本に / 次回: {date} {time}」
 *
 * 用途:
 *   - RecurrenceFormScreen 末尾 (= 保存ボタン直前) で 表示、 user 確認
 *
 * 設計:
 *   - presentational (受け取った文字列を 表示するだけ)
 *   - 派生計算は caller 側 (= 既存 rruleToHumanLabel + getNextOccurrence helper 流用)
 *   - 空 (= 未確定) の場合 何も表示しない
 */
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import { useColors } from '@/src/core/theme/useColors';

export type RulePreviewCardProps = {
  /** メイン要約行 (= 例: 「毎週金曜・施肥 を 3 本に」)。 空文字なら card 非表示。 */
  summary: string;
  /** 次回予定日 + 時刻 (= 例: 「5月2日(金) 9:00」)、 null/空文字なら 行非表示。 */
  nextOccurrence?: string | null;
};

export function RulePreviewCard({ summary, nextOccurrence }: RulePreviewCardProps) {
  const { t } = useTranslation();
  const c = useColors();

  if (!summary) return null;

  return (
    <View
      style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}
      testID="e2e_rule_preview_card"
      accessibilityRole="text"
    >
      <ThemedText style={[styles.title, { color: c.textSecondary }]}>
        {t('rulePreviewCardTitle')}
      </ThemedText>
      <ThemedText style={[styles.summary, { color: c.text }]}>{summary}</ThemedText>
      {nextOccurrence ? (
        <ThemedText style={[styles.nextOccurrence, { color: c.textSecondary }]}>
          {t('rulePreviewCardNextLabel')}: {nextOccurrence}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
  },
  summary: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  nextOccurrence: {
    fontSize: 13,
  },
});
