/**
 * EventRow compact mode (default、 既存 callsite 後方互換、 ADR-0041 D7 planned 維持)。
 *
 * 旧 horizontal row layout (iconBox left + content right + kebab)。
 * memo 2 行、 chips 制限なし、 写真なし。
 *
 * EventRow.tsx (dispatcher) から displayMode!=='detailed' (default) 時に委譲される。
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EventIcon, MoreVerticalIcon } from '@/src/components/icons';
import {
  BG_SURFACE,
  BORDER_DEFAULT,
  BUTTON_SECONDARY_BG,
  BUTTON_SECONDARY_TEXT,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
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
  const { eventLabel, dateLabel, wiringDuration, scheduledUnwireLabel } = getEventRowDisplay(
    ev,
    eventsForBonsai,
    lang,
    t,
  );

  // ADR-0036 D9 (Sess25 PR-ζ-2-⑨): showBonsaiName=true (PlanScreen 展開時) は
  // 1 行目 = bonsaiName 単独。 同情報 (作業名 + 日付) は group header / selectedDateKey で既に既知、
  // 重複行 を物理削除 (Nielsen Norman Group "Information Scent" ノイズ過多解消)。
  // showBonsaiName=false (bonsai-detail history タブ) は 異なる日の events が並ぶため
  // 1 行目 = 作業名 + 日付 を維持 (regression なし)。
  return (
    <Pressable
      style={[
        styles.eventRow,
        indent && styles.eventRowIndent,
        highlighted && styles.rowHighlighted,
      ]}
      accessibilityRole="button"
      accessibilityLabel={
        showBonsaiName && bonsaiName ? `${bonsaiName}, ${eventLabel}` : eventLabel
      }
      onPress={onPress ? () => onPress(ev) : undefined}
      onLongPress={onLongPress ? () => onLongPress(ev) : undefined}
    >
      <View style={styles.eventIconBox}>
        <EventIcon type={ev.type as EventType} size={20} />
      </View>
      <View style={styles.eventContent}>
        <View style={styles.eventRowMain}>
          {showBonsaiName && bonsaiName ? (
            <ThemedText style={styles.eventBonsaiName} numberOfLines={1}>
              {bonsaiName}
            </ThemedText>
          ) : (
            <>
              <ThemedText style={styles.eventLabel}>{eventLabel}</ThemedText>
              <ThemedText style={styles.eventRowDate}>{dateLabel}</ThemedText>
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
            style={styles.actionButton}
            testID={actionButtonTestID}
          >
            <ThemedText style={styles.actionButtonText}>{actionButtonLabel}</ThemedText>
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
          <MoreVerticalIcon size={20} color={TEXT_SECONDARY} />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // 改善① 検索ジャンプ時の一時ハイライト (washi 系・薄め。 数秒後に解除)。
  rowHighlighted: {
    backgroundColor: '#F5EEDD',
    borderColor: BUTTON_SECONDARY_TEXT,
  },
  // compact mode (default、 既存 callsite 後方互換)
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: BG_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
    marginBottom: 6,
  },
  eventRowIndent: { paddingLeft: 32 },
  eventIconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: BG_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventContent: { flex: 1, minWidth: 0, gap: 2 },
  eventRowMain: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  eventLabel: { fontSize: 14, color: TEXT_PRIMARY, fontWeight: '500' },
  eventBonsaiName: { fontSize: 15, color: TEXT_PRIMARY, fontWeight: '500' },
  eventRowDate: { fontSize: 12, color: TEXT_SECONDARY },
  // memo 本文 (Sess37 PR-1 C5: token 経由、 lineHeight 22 で可読性 ↑)
  eventRowNote: { ...eventRowMemo, marginTop: 2 },
  // Sess29 ADR-0038 D4 / R-48: BUTTON_SECONDARY token 参照 (薄緑 + 濃緑文字、 design_system §22 Secondary CTA)。
  actionButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: BUTTON_SECONDARY_BG,
  },
  actionButtonText: { fontSize: 12, fontWeight: '600', color: BUTTON_SECONDARY_TEXT },
  // ADR-0036 D7 拡張 (Sess27 PR-5): 個別 row 右端 kebab ⋮ button
  kebabButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
