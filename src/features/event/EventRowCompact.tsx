/**
 * EventRow compact mode (default、 既存 callsite 後方互換、 ADR-0041 D7 planned 維持)。
 *
 * 旧 horizontal row layout (iconBox left + content right + kebab)。
 * memo 2 行、 chips 制限なし、 写真なし。
 *
 * EventRow.tsx (dispatcher) から displayMode!=='detailed' (default) 時に委譲される。
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EventIcon, MoreVerticalIcon, RepeatIcon } from '@/src/components/icons';
// Sess66 PR6c.1: theme-dependent token を inline c.* に (dark cascade)。
// Sess70 PR-C1: BUTTON_SECONDARY_BG/TEXT + hex '#F5EEDD' を scheme-aware
// (c.buttonSecondaryBg / c.tint / c.background) に移行 (dark mode で薄緑沈み + 薄washi 浮き解消、
// ADR-0015/0052 Sess69 PR-A Amendment 整合)。
import { useColors } from '@/src/core/theme/useColors';
import { eventRowMemo } from '@/src/core/theme/typography';
import { type EventType } from '@/src/db/schema';
import { buildHistoryChips } from '@/src/features/event/buildHistoryChips';
import { HistoryChipRow } from '@/src/features/event/HistoryChip';
import { WiringPeriodDisplay } from '@/src/features/wiring/WiringPeriodDisplay';

import { getEventRowDisplay } from './eventRowDisplay';
import type { EventRowProps } from './eventRowTypes';

// ADR-0041 D5: compact 時 memo は 2 行。 chips は制限なし (maxVisible 未指定)。
const COMPACT_MEMO_LINES = 2;

export function EventRowCompact({
  ev,
  eventsForBonsai,
  bonsaiName,
  lang,
  t,
  onLongPress,
  onPress,
  indent = false,
  showBonsaiName = false,
  actionButtonLabel,
  onActionPress,
  actionButtonTestID,
  onKebabPress,
  kebabTestID,
  highlighted = false,
}: EventRowProps) {
  const c = useColors();
  const { eventLabel, dateLabel, wiringDuration, scheduledUnwireLabel, isRecurring } =
    getEventRowDisplay(ev, eventsForBonsai, lang, t);
  // Sess81 PR-7 (ADR-0056 D5): recurring 由来 event の accessibilityLabel に「定期予定」 prefix。
  // VoiceOver 1 連結発話で 「定期予定, {bonsaiName/eventLabel}」 を 1 発話 (R-42 WCAG 1.4.1 整合)。
  const recurringPrefix = isRecurring ? `${t('recurringEventBadgeLabel')}, ` : '';

  // ADR-0036 D9 (Sess25 PR-ζ-2-⑨): showBonsaiName=true (PlanScreen 展開時) は
  // 1 行目 = bonsaiName 単独。 同情報 (作業名 + 日付) は group header / selectedDateKey で既に既知、
  // 重複行 を物理削除 (Nielsen Norman Group "Information Scent" ノイズ過多解消)。
  // showBonsaiName=false (bonsai-detail history タブ) は 異なる日の events が並ぶため
  // 1 行目 = 作業名 + 日付 を維持 (regression なし)。
  return (
    <Pressable
      style={[
        styles.eventRow,
        // Sess73 PR-2: borderStrong で dark mode card 境界視認性確保
        // (c.border vs c.surface = 1.4:1 → c.borderStrong = 3.18:1 AA pass)。
        { backgroundColor: c.surface, borderColor: c.borderStrong },
        indent && styles.eventRowIndent,
        highlighted && [
          styles.rowHighlighted,
          { backgroundColor: c.buttonSecondaryBg, borderColor: c.tint },
        ],
      ]}
      accessibilityRole="button"
      accessibilityLabel={
        showBonsaiName && bonsaiName
          ? `${recurringPrefix}${bonsaiName}, ${eventLabel}`
          : `${recurringPrefix}${eventLabel}`
      }
      onPress={onPress ? () => onPress(ev) : undefined}
      onLongPress={onLongPress ? () => onLongPress(ev) : undefined}
    >
      <View style={[styles.eventIconBox, { backgroundColor: c.surface, borderColor: c.border }]}>
        <EventIcon type={ev.type as EventType} size={20} />
      </View>
      <View style={styles.eventContent}>
        <View style={styles.eventRowMain}>
          {showBonsaiName && bonsaiName ? (
            <View style={styles.titleWithRecurring}>
              <ThemedText style={[styles.eventBonsaiName, { color: c.text }]} numberOfLines={1}>
                {bonsaiName}
              </ThemedText>
              {isRecurring && (
                <RepeatIcon
                  size={14}
                  color={c.textSecondary}
                  testID={`e2e_event_row_recurring_icon_${ev.id}`}
                />
              )}
            </View>
          ) : (
            <>
              <View style={styles.titleWithRecurring}>
                <ThemedText style={[styles.eventLabel, { color: c.text }]}>{eventLabel}</ThemedText>
                {isRecurring && (
                  <RepeatIcon
                    size={14}
                    color={c.textSecondary}
                    testID={`e2e_event_row_recurring_icon_${ev.id}`}
                  />
                )}
              </View>
              <ThemedText style={[styles.eventRowDate, { color: c.textSecondary }]}>
                {dateLabel}
              </ThemedText>
            </>
          )}
        </View>
        {wiringDuration && (
          <WiringPeriodDisplay
            weeks={wiringDuration.weeks}
            kind={wiringDuration.kind}
            isUnwired={wiringDuration.isUnwired}
            style={styles.eventRowNote}
            testID={`e2e_wiring_duration_${ev.id}`}
          />
        )}
        {scheduledUnwireLabel && (
          <ThemedText style={styles.eventRowNote} testID={`e2e_wiring_scheduled_${ev.id}`}>
            {scheduledUnwireLabel}
          </ThemedText>
        )}
        {ev.note && (
          <ThemedText style={styles.eventRowNote} numberOfLines={COMPACT_MEMO_LINES}>
            {ev.note}
          </ThemedText>
        )}
        <HistoryChipRow chips={buildHistoryChips(ev)} />
        {actionButtonLabel && onActionPress && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionButtonLabel}
            onPress={() => onActionPress(ev)}
            style={[styles.actionButton, { backgroundColor: c.buttonSecondaryBg }]}
            testID={actionButtonTestID}
          >
            <ThemedText style={[styles.actionButtonText, { color: c.tint }]}>
              {actionButtonLabel}
            </ThemedText>
          </Pressable>
        )}
      </View>
      {onKebabPress && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('rowActionMenuDelete')}
          style={styles.kebabButton}
          hitSlop={8}
          onPress={() => onKebabPress(ev)}
          testID={kebabTestID}
        >
          <MoreVerticalIcon size={20} color={c.textSecondary} />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // 改善① 検索ジャンプ時の一時ハイライト。 Sess70 PR-C1: bg/border は inline c.* (scheme-aware)。
  rowHighlighted: {},
  // compact mode (default、 既存 callsite 後方互換)。 Sess66 PR6c.1: bg/border/color は inline c.*。
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 6,
  },
  eventRowIndent: { paddingLeft: 32 },
  eventIconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventContent: { flex: 1, minWidth: 0, gap: 2 },
  eventRowMain: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  // Sess81 PR-7: 作業名/盆栽名 + 🔁 RepeatIcon を inline で並べる (Apple Reminders 整合)。
  titleWithRecurring: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  eventLabel: { fontSize: 14, fontWeight: '500' },
  eventBonsaiName: { fontSize: 15, fontWeight: '500' },
  eventRowDate: { fontSize: 12 },
  // memo 本文 (Sess37 PR-1 C5: token 経由、 lineHeight 22 で可読性 ↑)
  eventRowNote: { ...eventRowMemo, marginTop: 2 },
  // Sess29 ADR-0038 D4 / R-48: BUTTON_SECONDARY token 参照 (薄緑 + 濃緑文字、 design_system §22 Secondary CTA)。
  // Sess70 PR-C1: bg / color は inline c.buttonSecondaryBg / c.tint (scheme-aware)。
  actionButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionButtonText: { fontSize: 12, fontWeight: '600' },
  // ADR-0036 D7 拡張 (Sess27 PR-5): 個別 row 右端 kebab ⋮ button
  kebabButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
