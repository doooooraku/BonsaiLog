/**
 * EventRow detailed mode (Sess34 ADR-0041 Phase θ D1): vertical stack card。
 *
 * 上部 (header) → 区切り線 → labeled chips block → wiring period (wiring 時)
 *   → 区切り線 → memo + 「もっと見る」 → 写真 block (写真有時のみ)
 * 写真ゼロ event は写真 block 完全非表示 + row 高さ動的縮小 (D12)。
 *
 * EventRow.tsx (dispatcher) から displayMode==='detailed' 時に委譲される。
 * ADR-0041 D2/D4/D5: 写真 strip + chips max 4 + memo 3 行 + 「もっと見る」 リンク。
 */
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MoreVerticalIcon, RepeatIcon } from '@/src/components/icons';
import type { TranslationKey } from '@/src/core/i18n/locales/en';
// Sess66 PR6c.1: theme-dependent token を inline c.* に (dark cascade)。
// Sess70 PR-C1: BUTTON_SECONDARY_BG/TEXT + hex '#F5EEDD' を scheme-aware
// (c.buttonSecondaryBg / c.tint / c.background) に移行 (ADR-0015/0052 Sess69 PR-A Amendment 整合)。
import { useColors } from '@/src/core/theme/useColors';
import {
  eventRowMemo,
  eventRowMemoSectionLabel,
  eventRowReadMoreLink,
} from '@/src/core/theme/typography';
import {
  getAllPhotosByEventId,
  getRepresentativePhotoByEventId,
  type PhotoRead,
} from '@/src/db/photoRepository';
import { buildHistoryChips } from '@/src/features/event/buildHistoryChips';
import { EventRowPhotoBlock } from '@/src/features/event/EventRowPhotoBlock';
import { HistoryChipRow } from '@/src/features/event/HistoryChip';
import { WiringPeriodDisplay } from '@/src/features/wiring/WiringPeriodDisplay';

import { getEventRowDisplay } from './eventRowDisplay';
import type { EventRowProps } from './eventRowTypes';

// ADR-0041 D5: detailed 時 memo は 3 行。 D4: chips max 4 + 末尾「+N」 sentinel。
const DETAILED_MEMO_LINES = 3;
const DETAILED_CHIPS_MAX_VISIBLE = 4;

/**
 * ADR-0041 D5: detailed mode で memo 3 行 + 末尾 ellipsis 時に「もっと見る」 リンク表示。
 *
 * Sess35 PR-1 改訂: 旧 router.push (bonsai-detail history へ遷移) は bonsai-detail 内で同一 URL
 * への遷移で no-op になる bug があったため、 **inline expand** (同 row 内で memo 全文展開) に変更。
 * 業界標準 (Material 3 List / Twitter / Notion 等) と整合、 ADR-0030 navigation pattern 影響なし。
 *
 * memo は `numberOfLines={isExpanded ? undefined : numberOfLines}` で切替表示。 onTextLayout で
 * truncated 検知して link 表示判定 (React Native onTextLayout は `nativeEvent.lines` を返す。
 * 数 ≥ numberOfLines かつ最後 line に省略があれば truncated とみなす実装が pragmatic、 完全な
 * ellipsis 検知 API は無い)。
 *
 * tap で `isExpanded` を toggle、 link text も「もっと見る ▶」 ⇄ 「折りたたむ ▲」 で切替。
 * a11y は `accessibilityState={{ expanded }}` で展開状態を screen reader に伝達。
 */
function MemoWithReadMore({
  memo,
  numberOfLines,
  testID,
  t,
  readMoreTestID,
}: {
  memo: string;
  numberOfLines: number;
  testID?: string;
  t: (key: TranslationKey) => string;
  readMoreTestID?: string;
}) {
  const [isTruncated, setIsTruncated] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <ThemedText
        style={styles.eventRowNote}
        numberOfLines={isExpanded ? undefined : numberOfLines}
        ellipsizeMode="tail"
        onTextLayout={(e) => {
          // lines.length が numberOfLines を超えた場合は truncated
          // isExpanded=true (展開中) は lines.length が全行数になるので skip
          if (isExpanded) return;
          const lines = e.nativeEvent.lines ?? [];
          setIsTruncated(
            lines.length >= numberOfLines && (lines[lines.length - 1]?.text ?? '').length > 0,
          );
        }}
        testID={testID}
      >
        {memo}
      </ThemedText>
      {isTruncated && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            isExpanded ? t('eventRowCollapseAccessibility') : t('eventRowReadMoreAccessibility')
          }
          accessibilityState={{ expanded: isExpanded }}
          onPress={() => setIsExpanded((prev) => !prev)}
          hitSlop={6}
          testID={readMoreTestID}
        >
          <ThemedText style={styles.readMoreLink}>
            {isExpanded ? t('eventRowCollapse') : t('eventRowReadMore')}
          </ThemedText>
        </Pressable>
      )}
    </>
  );
}

export function EventRowDetailed({
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
  // detailed mode は event 紐付け写真を fetch
  const [repPhoto, setRepPhoto] = useState<PhotoRead | null>(null);
  const [totalPhotos, setTotalPhotos] = useState<number>(0);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [rep, all] = await Promise.all([
        getRepresentativePhotoByEventId(ev.id),
        getAllPhotosByEventId(ev.id),
      ]);
      if (!cancelled) {
        setRepPhoto(rep);
        setTotalPhotos(all.length);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ev.id]);

  const { eventLabel, dateLabel, wiringDuration, scheduledUnwireLabel, isRecurring } =
    getEventRowDisplay(ev, eventsForBonsai, lang, t);
  // Sess81 PR-7 (ADR-0056 D5): recurring 由来 event の accessibilityLabel に「定期予定」 prefix。
  const recurringPrefix = isRecurring ? `${t('recurringEventBadgeLabel')}, ` : '';

  const chips = buildHistoryChips(ev);
  const hasChips = chips.length > 0;
  const hasWiringInfo = wiringDuration != null || scheduledUnwireLabel != null;
  const hasMemo = !!ev.note;
  const hasPhoto = repPhoto != null;
  return (
    <Pressable
      style={[
        styles.detailedCard,
        // Sess73 PR-2: borderStrong で dark mode card 境界視認性確保
        // (c.border vs c.surface = 1.4:1 → c.borderStrong = 3.18:1 AA pass)。
        { backgroundColor: c.surface, borderColor: c.borderStrong },
        indent && styles.detailedCardIndent,
        highlighted && [
          styles.rowHighlighted,
          { backgroundColor: c.buttonSecondaryBg, borderColor: c.tint },
        ],
      ]}
      accessibilityRole="button"
      accessibilityLabel={
        showBonsaiName && bonsaiName
          ? `${recurringPrefix}${bonsaiName}, ${t(`eventType_${ev.type}` as TranslationKey)}`
          : `${recurringPrefix}${t(`eventType_${ev.type}` as TranslationKey)}`
      }
      onPress={onPress ? () => onPress(ev) : undefined}
      onLongPress={onLongPress ? () => onLongPress(ev) : undefined}
    >
      {/* Header row: 盆栽名 (PlanScreen) or 作業名+日付 (bonsai-detail history) + kebab */}
      <View style={styles.detailedHeader}>
        <View style={styles.detailedHeaderTitleArea}>
          {showBonsaiName && bonsaiName ? (
            <View style={styles.titleWithRecurring}>
              <ThemedText style={[styles.detailedTitle, { color: c.text }]} numberOfLines={1}>
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
                <ThemedText style={[styles.detailedTitle, { color: c.text }]}>
                  {eventLabel}
                </ThemedText>
                {isRecurring && (
                  <RepeatIcon
                    size={14}
                    color={c.textSecondary}
                    testID={`e2e_event_row_recurring_icon_${ev.id}`}
                  />
                )}
              </View>
              <ThemedText style={[styles.detailedSubtitle, { color: c.textSecondary }]}>
                {dateLabel}
              </ThemedText>
            </>
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
      </View>

      {/* labeled chips block + wiring duration / scheduled unwire (wiring 時) */}
      {(hasChips || hasWiringInfo) && (
        <>
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <View style={styles.detailedChipsBlock}>
            {hasChips && <HistoryChipRow chips={chips} maxVisible={DETAILED_CHIPS_MAX_VISIBLE} />}
            {/* ADR-0041 Phase θ D11: wiring の WiringPeriodDisplay も labeled chip 同列 */}
            {wiringDuration && (
              <View style={styles.labeledRowInline}>
                <ThemedText
                  style={[styles.fieldLabelInline, { color: c.textSecondary }]}
                  numberOfLines={1}
                >
                  {`${t('workLogWireDuration')}:`}
                </ThemedText>
                <WiringPeriodDisplay
                  weeks={wiringDuration.weeks}
                  kind={wiringDuration.kind}
                  isUnwired={wiringDuration.isUnwired}
                  style={[styles.wiringInlineText, { color: c.textSecondary }]}
                  testID={`e2e_wiring_duration_${ev.id}`}
                />
              </View>
            )}
            {scheduledUnwireLabel && (
              <View style={styles.labeledRowInline}>
                <ThemedText
                  style={[styles.fieldLabelInline, { color: c.textSecondary }]}
                  numberOfLines={1}
                >
                  {`${t('workLogWireUnwireDate')}:`}
                </ThemedText>
                <ThemedText
                  style={[styles.wiringInlineText, { color: c.textSecondary }]}
                  testID={`e2e_wiring_scheduled_${ev.id}`}
                >
                  {scheduledUnwireLabel.replace(
                    `${t('wiringScheduledUnwireSet').split('{')[0]}`,
                    '',
                  )}
                </ThemedText>
              </View>
            )}
          </View>
        </>
      )}

      {/* memo セクション (Sess37 PR-1 C6): 「メモ」 ヘッダー + memo 本文 + 「もっと見る」 リンク。
          ヘッダー i18n key は form の memo field label `workLogNote` を流用 (整合性 ◎、 追加翻訳 0)。
          左 border は付けない (user 指摘で確定、 視覚ノイズ防止)。 */}
      {hasMemo && (
        <>
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <View style={styles.detailedMemoBlock}>
            <ThemedText style={styles.memoSectionLabel}>{t('workLogNote')}</ThemedText>
            <MemoWithReadMore
              memo={ev.note!}
              numberOfLines={DETAILED_MEMO_LINES}
              t={t}
              testID={`e2e_event_row_memo_${ev.id}`}
              readMoreTestID={`e2e_event_row_read_more_${ev.id}`}
            />
          </View>
        </>
      )}

      {/* 写真 block (有時のみ条件 render、 D12 写真ゼロは完全非表示) */}
      {hasPhoto && (
        <View style={styles.detailedPhotoBlock}>
          <EventRowPhotoBlock
            eventId={ev.id}
            photo={repPhoto!}
            totalCount={totalPhotos}
            testID={`e2e_event_row_photo_block_${ev.id}`}
          />
        </View>
      )}

      {/* planned 時の「作業を記録」 button (ADR-0035 D7、 D7 planned compact 維持と矛盾しないため
          detailed mode でも logged で actionButtonLabel が来ないため、 実質 logged では出ない) */}
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // 改善① 検索ジャンプ時の一時ハイライト。 Sess70 PR-C1: bg/border は inline c.* (scheme-aware)。
  rowHighlighted: {},
  // detailed mode (Phase θ D1): vertical stack card。 Sess66 PR6c.1: bg/border は inline c.*。
  detailedCard: {
    flexDirection: 'column',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
  },
  detailedCardIndent: { marginLeft: 16 },
  detailedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailedHeaderTitleArea: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  // Sess81 PR-7: detailedTitle/盆栽名 + 🔁 RepeatIcon を inline で並べる (Apple Reminders 整合)。
  titleWithRecurring: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  // Sess37 PR-1 C5: detailedTitle 16 維持 (盆栽名等)、 detailedSubtitle 12→13 (副情報強調)
  // Sess66 PR6c.1: color は inline c.* (dark cascade)。
  detailedTitle: { fontSize: 16, fontWeight: '600' },
  detailedSubtitle: { fontSize: 13 },
  divider: { height: 1, marginVertical: 4 },
  detailedChipsBlock: { flexDirection: 'column', gap: 4 },
  detailedMemoBlock: { flexDirection: 'column', gap: 2 },
  // Sess37 PR-1 C6: memo セクションラベル「メモ」 (token 経由)
  memoSectionLabel: { ...eventRowMemoSectionLabel, marginBottom: 2 },
  detailedPhotoBlock: { marginTop: 4 },
  // wiring の labeled chip 同列表示 (Phase θ D11)
  labeledRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  fieldLabelInline: {
    fontSize: 11,
    minWidth: 64,
  },
  wiringInlineText: {
    fontSize: 11,
  },
  // memo 本文 (Sess37 PR-1 C5: token 経由、 lineHeight 22 で可読性 ↑)
  eventRowNote: { ...eventRowMemo, marginTop: 2 },
  // 「もっと見る ▶」 リンク (Sess37 PR-1 C5: token 経由、 chip と統一)
  readMoreLink: {
    ...eventRowReadMoreLink,
    marginTop: 2,
    fontWeight: '500',
  },
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
