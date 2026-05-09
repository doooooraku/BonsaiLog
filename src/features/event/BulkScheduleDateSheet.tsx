/**
 * 一括予定追加・日付選択 BottomSheet (ADR-0020、mockup v1.0 02-Home.html `01d` 整合)。
 *
 * 構造 (mockup care-screens-v2.jsx BulkScheduleDateSheet 整合):
 * - BottomSheet (snap '88%')
 * - drag handle
 * - タイトル「{label} の予定日」+ サブ「N件の盆栽に同じ日付で追加」
 * - selected chips (横スクロール)
 * - 月切替ボタン (‹ ›) + 「YYYY年MM月」表示
 * - DOW header (日月火水木金土、日=danger 色 / 土=primary 色)
 * - Day grid (週単位 row + flex:1 cell、firstDow padding)
 *   ※ MEMORY 索引 calendar-grid-saturday-overflow.md (PR #318): flexWrap + width 14% × 7 + gap > 100% で
 *     7 列目折り返し空欄化バグの再発防止。週行 + flex:1 リファクタ採用。
 * - 通知トグル (デフォルト OFF、R-28 + ADR-0011 整合、mockup `useState(true)` 撤回)
 * - Footer CTA「N件にまとめて予定追加」
 *
 * onSave 経由で親 (HomeScreen) に { occurredAtUtc, notify } を渡す。
 */
import BottomSheet, { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CheckIcon } from '@/src/components/icons';
import { nowUtc } from '@/src/core/datetime';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  BG_PRIMARY,
  BG_SURFACE,
  BORDER_DEFAULT,
  BORDER_STRONG,
  BRAND_GREEN,
  DANGER,
  ON_BRAND,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import type { EventType } from '@/src/db/schema';
import { BonsaiPlaceholder, hashSeed } from '@/src/features/bonsai/BonsaiPlaceholder';

type Props = {
  visible: boolean;
  type: EventType;
  selectedBonsais: readonly { id: string; name: string }[];
  /** 完全閉じる (selectMode 解除込み)。 */
  onClose: () => void;
  onSave: (input: { occurredAtUtc: string; notify: boolean }) => void;
};

export function BulkScheduleDateSheet({ visible, type, selectedBonsais, onClose, onSave }: Props) {
  const { t } = useTranslation();
  const c = useColors();
  const ref = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['88%'], []);

  // R-28: 通知デフォルト OFF (principles.md v1.1 + ADR-0011 整合、mockup `useState(true)` は哲学逆走の残存と判断)。
  const [notify, setNotify] = useState(false);

  // ADR-0008 §TZ 3 層防御: new Date() 引数なし禁止、nowUtc() 経由の ISO string を使う。
  const today = useMemo(() => new Date(nowUtc() as string), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [day, setDay] = useState(today.getDate());

  useEffect(() => {
    ref.current?.snapToIndex(visible ? 0 : -1);
  }, [visible]);

  // visible になるたび state 初期化 (前回の選択をリセット)
  useEffect(() => {
    if (visible) {
      setNotify(false);
      // ADR-0008 §TZ 3 層防御: nowUtc() 経由で current Date 取得。
      const t0 = new Date(nowUtc() as string);
      setYear(t0.getFullYear());
      setMonth(t0.getMonth() + 1);
      setDay(t0.getDate());
    }
  }, [visible]);

  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);
  const firstDow = useMemo(() => new Date(year, month - 1, 1).getDay(), [year, month]);

  // 週行に分割 (MEMORY: calendar-grid-saturday-overflow.md PR #318 の罠回避)
  const weeks = useMemo<(number | null)[][]>(() => {
    const total = firstDow + daysInMonth;
    const weekCount = Math.ceil(total / 7);
    const result: (number | null)[][] = [];
    for (let w = 0; w < weekCount; w++) {
      const week: (number | null)[] = [];
      for (let dow = 0; dow < 7; dow++) {
        const idx = w * 7 + dow;
        if (idx < firstDow) week.push(null);
        else if (idx - firstDow < daysInMonth) week.push(idx - firstDow + 1);
        else week.push(null);
      }
      result.push(week);
    }
    return result;
  }, [firstDow, daysInMonth]);

  const goPrev = () => {
    let m = month - 1;
    let y = year;
    if (m < 1) {
      m = 12;
      y--;
    }
    setMonth(m);
    setYear(y);
    setDay((d) => Math.min(d, new Date(y, m, 0).getDate()));
  };
  const goNext = () => {
    let m = month + 1;
    let y = year;
    if (m > 12) {
      m = 1;
      y++;
    }
    setMonth(m);
    setYear(y);
    setDay((d) => Math.min(d, new Date(y, m, 0).getDate()));
  };

  const dowLabels = useMemo(() => t('bulkScheduleDowLabels').split(','), [t]);

  const monthLabel = t('bulkScheduleMonthLabel')
    .replace('{year}', String(year))
    .replace('{month}', String(month));

  const dateLong = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const workLabelKey = `eventType_${type}` as Parameters<typeof t>[0];
  const workLabel = t(workLabelKey);

  const handleSave = () => {
    // ローカル日付 (year-month-day) を UTC ISO 8601 に変換 (時刻 00:00 ローカル)
    const local = new Date(year, month - 1, day, 0, 0, 0, 0);
    const occurredAtUtc = local.toISOString();
    onSave({ occurredAtUtc, notify });
  };

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={styles.sheetBg}
    >
      <BottomSheetView style={styles.content} testID="e2e_bulk_schedule_date_sheet">
        <View style={styles.header}>
          <ThemedText style={styles.title}>
            {t('bulkScheduleDateTitle').replace('{label}', workLabel)}
          </ThemedText>
          <ThemedText style={styles.sub}>
            {t('bulkScheduleDateSub').replace('{count}', String(selectedBonsais.length))}
          </ThemedText>
        </View>

        <BottomSheetScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {selectedBonsais.map((b) => (
            <View key={b.id} style={styles.chip}>
              <BonsaiPlaceholder size={24} seed={hashSeed(b.id)} radius={12} />
              <ThemedText style={styles.chipText} numberOfLines={1}>
                {b.name}
              </ThemedText>
            </View>
          ))}
        </BottomSheetScrollView>

        <BottomSheetScrollView contentContainerStyle={styles.body}>
          <View style={styles.monthNav}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="prev month"
              style={[styles.monthBtn, { backgroundColor: c.background, borderColor: c.border }]}
              onPress={goPrev}
              testID="e2e_bulk_schedule_prev_month"
            >
              <ThemedText style={styles.monthBtnText}>‹</ThemedText>
            </Pressable>
            <ThemedText style={styles.monthLabel}>{monthLabel}</ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="next month"
              style={[styles.monthBtn, { backgroundColor: c.background, borderColor: c.border }]}
              onPress={goNext}
              testID="e2e_bulk_schedule_next_month"
            >
              <ThemedText style={styles.monthBtnText}>›</ThemedText>
            </Pressable>
          </View>

          <View style={styles.dowRow}>
            {dowLabels.map((dow, i) => (
              <View key={`${dow}-${i}`} style={styles.dowCell}>
                <ThemedText
                  style={[
                    styles.dowText,
                    { color: i === 0 ? DANGER : i === 6 ? BRAND_GREEN : TEXT_MUTED },
                  ]}
                >
                  {dow}
                </ThemedText>
              </View>
            ))}
          </View>

          <View style={styles.dayGrid}>
            {weeks.map((week, wi) => (
              <View key={`week-${wi}`} style={styles.dayWeek}>
                {week.map((d, dow) =>
                  d === null ? (
                    <View key={`pad-${wi}-${dow}`} style={styles.dayCellEmpty} />
                  ) : (
                    <Pressable
                      key={`day-${d}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: d === day }}
                      style={[
                        styles.dayCell,
                        d === day
                          ? styles.dayCellSelected
                          : { backgroundColor: 'transparent', borderColor: c.border },
                      ]}
                      onPress={() => setDay(d)}
                      testID={`e2e_bulk_schedule_day_${d}`}
                    >
                      <ThemedText
                        style={[
                          styles.dayText,
                          d === day
                            ? { color: ON_BRAND }
                            : { color: dow === 0 ? DANGER : TEXT_PRIMARY },
                        ]}
                      >
                        {d}
                      </ThemedText>
                    </Pressable>
                  ),
                )}
              </View>
            ))}
          </View>

          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: notify }}
            style={[
              styles.notifyBox,
              {
                backgroundColor: notify ? 'rgba(31, 58, 46, 0.06)' : c.background,
                borderColor: notify ? BRAND_GREEN : c.border,
              },
            ]}
            onPress={() => setNotify((n) => !n)}
            testID="e2e_bulk_schedule_notify_toggle"
          >
            <View
              style={[
                styles.notifyCheckbox,
                {
                  backgroundColor: notify ? BRAND_GREEN : 'transparent',
                  borderColor: notify ? BRAND_GREEN : BORDER_STRONG,
                },
              ]}
            >
              {notify && <CheckIcon size={14} color={ON_BRAND} />}
            </View>
            <View style={styles.notifyTextWrap}>
              <ThemedText style={styles.notifyTitle}>
                {notify ? t('bulkScheduleNotifyOn') : t('bulkScheduleNotifyOff')}
              </ThemedText>
              <ThemedText style={styles.notifySub}>
                {notify
                  ? t('bulkScheduleNotifyOnDesc').replace('{date}', dateLong)
                  : t('bulkScheduleNotifyOffDesc')}
              </ThemedText>
            </View>
          </Pressable>
        </BottomSheetScrollView>

        <View style={[styles.footer, { borderTopColor: c.border, backgroundColor: c.background }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('bulkScheduleSaveCta').replace(
              '{count}',
              String(selectedBonsais.length),
            )}
            style={[styles.cta, { backgroundColor: c.tint }]}
            onPress={handleSave}
            testID="e2e_bulk_schedule_save_cta"
          >
            <ThemedText style={styles.ctaText}>
              {t('bulkScheduleSaveCta').replace('{count}', String(selectedBonsais.length))}
            </ThemedText>
          </Pressable>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: BG_PRIMARY },
  content: { flex: 1 },
  header: { paddingTop: 8, paddingBottom: 8, alignItems: 'center', gap: 4 },
  title: {
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 20,
    color: TEXT_PRIMARY,
    letterSpacing: 0.4,
  },
  sub: { fontSize: 12, color: TEXT_SECONDARY },
  chipsRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_DEFAULT,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 10,
    borderRadius: 18,
    backgroundColor: BG_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    maxWidth: 140,
  },
  chipText: { fontSize: 12, fontWeight: '500', color: TEXT_PRIMARY, flexShrink: 1 },
  body: { padding: 16, gap: 12 },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  monthBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthBtnText: { fontSize: 18, color: TEXT_PRIMARY },
  monthLabel: {
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 18,
    color: TEXT_PRIMARY,
  },
  dowRow: { flexDirection: 'row', marginBottom: 4 },
  dowCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  dowText: { fontSize: 11, letterSpacing: 0.6 },
  dayGrid: { gap: 6 },
  dayWeek: { flexDirection: 'row', gap: 6 },
  dayCellEmpty: { flex: 1, aspectRatio: 1 },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: { backgroundColor: BRAND_GREEN, borderColor: BRAND_GREEN },
  dayText: { fontSize: 14 },
  notifyBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  notifyCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  notifyTextWrap: { flex: 1 },
  notifyTitle: { fontSize: 14, fontWeight: '500', color: TEXT_PRIMARY },
  notifySub: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 2, lineHeight: 18 },
  footer: { padding: 16, paddingBottom: 22, borderTopWidth: 1 },
  cta: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontSize: 17, fontWeight: '500', color: ON_BRAND, letterSpacing: 0.6 },
});
