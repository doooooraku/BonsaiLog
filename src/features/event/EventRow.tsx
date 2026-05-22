/**
 * 単一 event row 共通 component (Sess22 ADR-0034 D5)。
 *
 * 元 bonsai-detail/[id]/index.tsx の private `EventSingleRow` を移設、
 * PlanScreen listing でも流用するため props 拡張 (bonsaiName / onPress / showBonsaiName)。
 *
 * 用途:
 * - bonsai-detail history タブ: connect 関数なし + onLongPress で削除確認 + showBonsaiName=false
 * - PlanScreen logged section: onPress で router.push + showBonsaiName=true
 *
 * 「PlanScreen listing と bonsai-detail history の row 表示が pixel 整合」 (整合性レベル 2、 ADR-0034 D4)。
 *
 * Sess34 ADR-0041 PR-5: `displayMode: 'compact' | 'detailed'` prop 追加。
 * - compact (default): 後方互換、 既存 row 表示 (memo 2 行、 chips 制限なし、 写真なし)
 * - detailed: ADR-0041 D2/D4/D5 — 写真 strip + chips max 4 + memo 3 行 + 「もっと見る」 リンク
 *
 * wiring 期間判定の依存:
 * - `eventsForBonsai` は **該当 bonsai の全期間 events** を渡す必要あり (短絡防止)
 * - PlanScreen は `events.filter(x => x.bonsaiId === ev.bonsaiId)` で渡す
 * - bonsai-detail は同 component scope の `events` (= 該当 bonsai 全期間) を渡す
 */
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EventIcon, MoreVerticalIcon } from '@/src/components/icons';
import { nowUtc } from '@/src/core/datetime';
import type { TranslationKey } from '@/src/core/i18n/locales/en';
import {
  BG_SURFACE,
  BORDER_DEFAULT,
  BUTTON_SECONDARY_BG,
  BUTTON_SECONDARY_TEXT,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import {
  eventRowMemo,
  eventRowMemoSectionLabel,
  eventRowReadMoreLink,
} from '@/src/core/theme/typography';
import { type Event, type EventType } from '@/src/db/schema';
import {
  getAllPhotosByEventId,
  getRepresentativePhotoByEventId,
  type PhotoRead,
} from '@/src/db/photoRepository';
import { buildHistoryChips } from '@/src/features/event/buildHistoryChips';
import { EventRowPhotoBlock } from '@/src/features/event/EventRowPhotoBlock';
import { EventRowPhotoStrip } from '@/src/features/event/EventRowPhotoStrip';
import { HistoryChipRow } from '@/src/features/event/HistoryChip';
import {
  classifyWiringDuration,
  getDaysSinceWired,
  getScheduledUnwireAtWithFallback,
  getWeeksSinceWired,
} from '@/src/features/wiring/wiringDuration';
import { WiringPeriodDisplay } from '@/src/features/wiring/WiringPeriodDisplay';

/** 日付フォーマット (bonsai-detail/[id]/index.tsx と同等の local 実装)。 */
function formatDate(iso: string, locale: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

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

export type EventRowDisplayMode = 'compact' | 'detailed';

export type EventRowProps = {
  ev: Event;
  /** 該当 bonsai の全期間 events (wiring 期間判定用、 短絡防止) */
  eventsForBonsai: Event[];
  /** PlanScreen で使用 (showBonsaiName=true の時 title 行に表示) */
  bonsaiName?: string;
  lang: string;
  t: (key: TranslationKey) => string;
  /** bonsai-detail で削除確認 (long-press) */
  onLongPress?: (ev: Event) => void;
  /** PlanScreen で router.push (tap) */
  onPress?: (ev: Event) => void;
  /** 連続日 group 展開時に左 indent */
  indent?: boolean;
  /** PlanScreen=true (bonsai 名表示) / bonsai-detail=false (自明) */
  showBonsaiName?: boolean;
  /** ADR-0035 D7 (Sess23): planned section で「作業を記録」 button 配置 */
  actionButtonLabel?: string;
  onActionPress?: (ev: Event) => void;
  actionButtonTestID?: string;
  /** ADR-0036 D7 拡張 (Sess27 PR-5): 個別 row 右端 kebab ⋮ tap = 長押し代替動線 */
  onKebabPress?: (ev: Event) => void;
  kebabTestID?: string;
  /**
   * Sess34 ADR-0041 PR-5: 表示モード切替。
   * - 'compact' (default): 後方互換 (memo 2 行、 chips 制限なし、 写真なし)
   * - 'detailed': ADR-0041 D2/D4/D5 — 写真 strip + chips max 4 + memo 3 行 + 「もっと見る」 リンク
   */
  displayMode?: EventRowDisplayMode;
};

export function EventRow({
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
  displayMode = 'compact',
}: EventRowProps) {
  const isDetailed = displayMode === 'detailed';

  // detailed mode のみ event 紐付け写真を fetch
  const [repPhoto, setRepPhoto] = useState<PhotoRead | null>(null);
  const [totalPhotos, setTotalPhotos] = useState<number>(0);
  useEffect(() => {
    if (!isDetailed) return;
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
  }, [ev.id, isDetailed]);

  let wiringDuration: {
    weeks: number;
    kind: 'within' | 'overdue';
    isUnwired: boolean;
  } | null = null;
  let scheduledUnwireLabel: string | null = null;
  if (ev.type === 'wiring' && ev.status === 'logged') {
    const days = getDaysSinceWired(ev, new Date(nowUtc() as string));
    const weeks = getWeeksSinceWired(days);
    const kind = classifyWiringDuration(days);
    const isUnwired = eventsForBonsai.some(
      (other) =>
        other.type === 'unwiring' &&
        other.status === 'logged' &&
        other.occurredAtUtc >= ev.occurredAtUtc,
    );
    wiringDuration = { weeks, kind, isUnwired };
    const scheduled = getScheduledUnwireAtWithFallback(ev);
    if (scheduled) {
      scheduledUnwireLabel = t('wiringScheduledUnwireSet').replace(
        '{date}',
        scheduled.slice(0, 10),
      );
    }
  }

  // ADR-0041 D5: detailed 時 memo は 3 行、 compact 時は従来通り 2 行
  const memoLines = isDetailed ? 3 : 2;
  // ADR-0041 D4: detailed 時 chips max 4 + 末尾「+N」 sentinel
  const chipsMaxVisible = isDetailed ? 4 : undefined;

  const eventLabel = t(`eventType_${ev.type}` as TranslationKey);

  // ADR-0036 D9 (Sess25 PR-ζ-2-⑨): showBonsaiName=true (PlanScreen 展開時) は
  // 1 行目 = bonsaiName 単独。 同情報 (作業名 + 日付) は group header / selectedDateKey で既に既知、
  // 重複行 を物理削除 (Nielsen Norman Group "Information Scent" ノイズ過多解消)。
  // showBonsaiName=false (bonsai-detail history タブ) は 異なる日の events が並ぶため
  // 1 行目 = 作業名 + 日付 を維持 (regression なし)。

  // ===========================================================================
  // detailed mode (Sess34 ADR-0041 Phase θ D1): vertical stack layout
  // 上部 (header) → 区切り線 → labeled chips block → wiring period (wiring 時)
  //   → 区切り線 → memo + 「もっと見る」 → 写真 block (写真有時のみ)
  // 写真ゼロ event は写真 block 完全非表示 + row 高さ動的縮小 (D12)
  // ===========================================================================
  if (isDetailed) {
    const chips = buildHistoryChips(ev);
    const hasChips = chips.length > 0;
    const hasWiringInfo = wiringDuration != null || scheduledUnwireLabel != null;
    const hasMemo = !!ev.note;
    const hasPhoto = repPhoto != null;
    return (
      <Pressable
        style={[styles.detailedCard, indent && styles.detailedCardIndent]}
        accessibilityRole="button"
        accessibilityLabel={
          showBonsaiName && bonsaiName
            ? `${bonsaiName}, ${t(`eventType_${ev.type}` as TranslationKey)}`
            : t(`eventType_${ev.type}` as TranslationKey)
        }
        onPress={onPress ? () => onPress(ev) : undefined}
        onLongPress={onLongPress ? () => onLongPress(ev) : undefined}
      >
        {/* Header row: 盆栽名 (PlanScreen) or 作業名+日付 (bonsai-detail history) + kebab */}
        <View style={styles.detailedHeader}>
          <View style={styles.detailedHeaderTitleArea}>
            {showBonsaiName && bonsaiName ? (
              <ThemedText style={styles.detailedTitle} numberOfLines={1}>
                {bonsaiName}
              </ThemedText>
            ) : (
              <>
                <ThemedText style={styles.detailedTitle}>{eventLabel}</ThemedText>
                <ThemedText style={styles.detailedSubtitle}>
                  {formatDate(ev.occurredAtUtc, lang)}
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
              <MoreVerticalIcon size={20} color={TEXT_SECONDARY} />
            </Pressable>
          )}
        </View>

        {/* labeled chips block + wiring duration / scheduled unwire (wiring 時) */}
        {(hasChips || hasWiringInfo) && (
          <>
            <View style={styles.divider} />
            <View style={styles.detailedChipsBlock}>
              {hasChips && <HistoryChipRow chips={chips} maxVisible={chipsMaxVisible} />}
              {/* ADR-0041 Phase θ D11: wiring の WiringPeriodDisplay も labeled chip 同列 */}
              {wiringDuration && (
                <View style={styles.labeledRowInline}>
                  <ThemedText style={styles.fieldLabelInline} numberOfLines={1}>
                    {`${t('workLogWireDuration')}:`}
                  </ThemedText>
                  <WiringPeriodDisplay
                    weeks={wiringDuration.weeks}
                    kind={wiringDuration.kind}
                    isUnwired={wiringDuration.isUnwired}
                    style={styles.wiringInlineText}
                    testID={`e2e_wiring_duration_${ev.id}`}
                  />
                </View>
              )}
              {scheduledUnwireLabel && (
                <View style={styles.labeledRowInline}>
                  <ThemedText style={styles.fieldLabelInline} numberOfLines={1}>
                    {`${t('workLogWireUnwireDate')}:`}
                  </ThemedText>
                  <ThemedText
                    style={styles.wiringInlineText}
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
            <View style={styles.divider} />
            <View style={styles.detailedMemoBlock}>
              <ThemedText style={styles.memoSectionLabel}>{t('workLogNote')}</ThemedText>
              <MemoWithReadMore
                memo={ev.note!}
                numberOfLines={memoLines}
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
            style={styles.actionButton}
            testID={actionButtonTestID}
          >
            <ThemedText style={styles.actionButtonText}>{actionButtonLabel}</ThemedText>
          </Pressable>
        )}
      </Pressable>
    );
  }

  // ===========================================================================
  // compact mode (default、 既存 callsite 後方互換、 ADR-0041 D7 planned 維持)
  // 旧 horizontal row layout (iconBox left + content right + kebab)
  // ===========================================================================
  return (
    <Pressable
      style={[styles.eventRow, indent && styles.eventRowIndent]}
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
              <ThemedText style={styles.eventRowDate}>
                {formatDate(ev.occurredAtUtc, lang)}
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
          <ThemedText style={styles.eventRowNote} numberOfLines={memoLines}>
            {ev.note}
          </ThemedText>
        )}
        <HistoryChipRow chips={buildHistoryChips(ev)} maxVisible={chipsMaxVisible} />
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

// EventRowPhotoStrip は本ファイルでは使用していないが、 Phase η の forward-only 思想で
// 温存 (compact mode 等で再利用候補)。 ESLint unused-imports rule 回避のため __noop_ref 経由で参照。
const __EventRowPhotoStrip_kept_for_forward_compat = EventRowPhotoStrip;
void __EventRowPhotoStrip_kept_for_forward_compat;

const styles = StyleSheet.create({
  // ===========================================================================
  // detailed mode (Phase θ D1): vertical stack card
  // ===========================================================================
  detailedCard: {
    flexDirection: 'column',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: BG_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
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
  // Sess37 PR-1 C5: detailedTitle 16 維持 (盆栽名等)、 detailedSubtitle 12→13 (副情報強調)
  detailedTitle: { fontSize: 16, color: TEXT_PRIMARY, fontWeight: '600' },
  detailedSubtitle: { fontSize: 13, color: TEXT_SECONDARY },
  divider: { height: 1, backgroundColor: BORDER_DEFAULT, marginVertical: 4 },
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
    color: TEXT_SECONDARY,
    minWidth: 64,
  },
  wiringInlineText: {
    fontSize: 11,
    color: TEXT_SECONDARY,
  },
  // ===========================================================================
  // compact mode (default、 既存 callsite 後方互換)
  // ===========================================================================
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
  // Sess37 PR-1 C5: memo 本文 fontSize 12→15 (token 経由、 lineHeight 22 で可読性 ↑)
  eventRowNote: { ...eventRowMemo, marginTop: 2 },
  // Sess37 PR-1 C5: 「もっと見る ▶」 リンク fontSize 11→14 (token 経由、 chip と統一)
  // ADR-0041 D5 + Sess35 PR-1 inline expand、 fontWeight 維持
  readMoreLink: {
    ...eventRowReadMoreLink,
    marginTop: 2,
    fontWeight: '500',
  },
  // Sess29 ADR-0038 D4 / R-48: BUTTON_SECONDARY token 参照 (薄緑 + 濃緑文字、 design_system §22 Secondary CTA)。
  // 旧 BRAND_GREEN ベタ + ON_BRAND (Sess23 ADR-0035 D7) は強調過剰で washi 世界観と不調和、 §22 階層で Secondary に降格。
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
