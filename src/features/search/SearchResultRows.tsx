/**
 * 検索結果の行 component + ハイライト helper (Phase 4 B2 で LookBackSearchScreen god から抽出)。
 *
 * - BonsaiResultRow: サムネ + 盆栽名 + 樹種/樹形副題 (mockup care-search 整合、 Sess42)
 * - EventResultRow: 作業アイコン + 作業名/日付 + 盆栽名 + メモ snippet (改善② 3 ラベル構造)
 * - SnippetSpans (FTS5 «match» 強調) / HighlightQuery (LIKE 経路の query 強調) / formatMonthDay
 *
 * 振る舞いは元実装と完全同一 (純粋な抽出)。
 */
import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EventIcon } from '@/src/components/icons';
import { useTranslation } from '@/src/core/i18n/i18n';
import type { TranslationKey } from '@/src/core/i18n/locales/en';
// Sess66 PR6c: theme-dependent token を inline c.* に (dark cascade)。
import { useColors } from '@/src/core/theme/useColors';
import type { EventWithSnippet } from '@/src/db/eventRepository';
import { BONSAI_STYLES, type EventType } from '@/src/db/schema';
import { BonsaiPlaceholder } from '@/src/features/bonsai/BonsaiPlaceholder';

import type { BonsaiResult } from './useBonsaiSearch';

/** FTS5 snippet の `«match»` 部分をインライン highlight で強調表示する pure inline component。 */
export function SnippetSpans({ text }: { text: string }) {
  const segments: { value: string; highlight: boolean }[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const start = text.indexOf('«', cursor);
    if (start === -1) {
      segments.push({ value: text.slice(cursor), highlight: false });
      break;
    }
    if (start > cursor) segments.push({ value: text.slice(cursor, start), highlight: false });
    const end = text.indexOf('»', start + 1);
    if (end === -1) {
      segments.push({ value: text.slice(start + 1), highlight: false });
      break;
    }
    segments.push({ value: text.slice(start + 1, end), highlight: true });
    cursor = end + 1;
  }
  return (
    <>
      {segments.map((s, i) =>
        s.highlight ? (
          <ThemedText key={i} style={styles.snippetMatch}>
            {s.value}
          </ThemedText>
        ) : (
          <ThemedText key={i}>{s.value}</ThemedText>
        ),
      )}
    </>
  );
}

/** ISO UTC 文字列を指定ロケール + ローカル TZ で月/日のみ表示 (例: ja → "4月15日")。 */
function formatMonthDay(isoUtc: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(
      new Date(isoUtc),
    );
  } catch {
    return '';
  }
}

/** text 内の query 一致部分 (大小文字無視) を highlight 背景で強調するインライン spans。 */
export function HighlightQuery({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < text.length) {
    const idx = lower.indexOf(q, i);
    if (idx === -1) {
      out.push(<ThemedText key={key++}>{text.slice(i)}</ThemedText>);
      break;
    }
    if (idx > i) out.push(<ThemedText key={key++}>{text.slice(i, idx)}</ThemedText>);
    out.push(
      <ThemedText key={key++} style={styles.snippetMatch}>
        {text.slice(idx, idx + query.length)}
      </ThemedText>,
    );
    i = idx + query.length;
  }
  return <>{out}</>;
}

export function BonsaiResultRow({
  result,
  highlightQuery,
}: {
  result: BonsaiResult;
  highlightQuery: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const { bonsai: b, coverUri, speciesLabel } = result;

  // 樹形ラベル: 標準5種は i18n、カスタムは bonsai.style の生テキストをそのまま表示。
  const stl = b.style
    ? (BONSAI_STYLES as readonly string[]).includes(b.style)
      ? t(`bonsaiStyle_${b.style}` as TranslationKey)
      : b.style
    : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={b.name}
      style={[styles.bonsaiRow, { borderBottomColor: c.border }]}
      onPress={() => router.push(`/(tabs)/bonsai/${b.id}` as Href)}
    >
      <View style={styles.thumbWrap}>
        {coverUri != null ? (
          <Image source={{ uri: coverUri }} style={styles.thumb} contentFit="cover" />
        ) : (
          <BonsaiPlaceholder size={56} radius={10} />
        )}
      </View>
      <View style={styles.bonsaiTextCol}>
        <ThemedText style={[styles.bonsaiName, { color: c.text }]} numberOfLines={1}>
          <HighlightQuery text={b.name} query={highlightQuery} />
        </ThemedText>
        {(speciesLabel || stl) && (
          <ThemedText style={[styles.speciesLine, { color: c.textSecondary }]} numberOfLines={1}>
            {speciesLabel ? <HighlightQuery text={speciesLabel} query={highlightQuery} /> : null}
            {speciesLabel && stl ? ' · ' : ''}
            {stl ? <HighlightQuery text={stl} query={highlightQuery} /> : null}
          </ThemedText>
        )}
      </View>
    </Pressable>
  );
}

export function EventResultRow({
  event: e,
  highlightQuery,
}: {
  event: EventWithSnippet;
  highlightQuery: string;
}) {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const typeLabel = t(`eventType_${e.type}` as TranslationKey);
  // メモ表示: trigram 経路は snippet(«»)、LIKE 経路 (snippet=null) は note 全文を query ハイライト。
  const memoText = e.snippet ?? e.note ?? '';
  const hasMemo = memoText.length > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={e.note ?? typeLabel}
      style={[styles.eventRow, { borderBottomColor: c.border }]}
      onPress={() =>
        router.push(`/(tabs)/bonsai/${e.bonsaiId}?tab=history&focusEventId=${e.id}` as Href)
      }
    >
      <View style={[styles.eventIconBox, { backgroundColor: c.surface, borderColor: c.border }]}>
        <EventIcon type={e.type as EventType} size={18} />
      </View>
      <View style={styles.eventTextCol}>
        {/* 作業 (作業名) + 日付 */}
        <View style={styles.eventTopRow}>
          <View style={styles.eventLabelGroup}>
            <ThemedText style={[styles.eventFieldLabel, { color: c.textSecondary }]}>
              {t('searchWorkLabel')}
            </ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.eventLabel} numberOfLines={1}>
              {typeLabel}
            </ThemedText>
          </View>
          <ThemedText style={[styles.eventDate, { color: c.textSecondary }]}>
            {formatMonthDay(e.occurredAtUtc, lang)}
          </ThemedText>
        </View>
        {/* 盆栽 (盆栽名) */}
        {e.bonsaiName ? (
          <View style={styles.eventFieldRow}>
            <ThemedText style={[styles.eventFieldLabel, { color: c.textSecondary }]}>
              {t('searchBonsaiSection')}
            </ThemedText>
            <ThemedText style={[styles.eventFieldValue, { color: c.text }]} numberOfLines={1}>
              <HighlightQuery text={e.bonsaiName} query={highlightQuery} />
            </ThemedText>
          </View>
        ) : null}
        {/* メモ */}
        {hasMemo ? (
          <View style={styles.eventFieldRow}>
            <ThemedText style={[styles.eventFieldLabel, { color: c.textSecondary }]}>
              {t('workLogNote')}
            </ThemedText>
            <ThemedText
              style={[styles.eventMemoValue, { color: c.textSecondary }]}
              numberOfLines={2}
            >
              {e.snippet != null ? (
                <SnippetSpans text={e.snippet} />
              ) : (
                <HighlightQuery text={memoText} query={highlightQuery} />
              )}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Sess66 PR6c: theme-dependent 色は inline c.* に。 snippetMatch の色は washi highlight 文脈で
  // brand-specific bg を維持 + 文字色は cascade 化 (dark で見える程度の明色を保持)。
  snippetMatch: {
    backgroundColor: '#EDE7D8',
    fontWeight: '600',
  },
  // 盆栽結果行
  bonsaiRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  thumbWrap: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
    flexShrink: 0,
  },
  thumb: { width: 56, height: 56 },
  bonsaiTextCol: { flex: 1, minWidth: 0, gap: 2 },
  bonsaiName: { fontFamily: 'NotoSerifJP_500Medium', fontSize: 17 },
  speciesLine: { fontSize: 12 },
  // 作業履歴行
  eventRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    alignItems: 'flex-start',
  },
  eventIconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  eventTextCol: { flex: 1, minWidth: 0, gap: 2 },
  eventTopRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  eventLabelGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  eventLabel: { fontSize: 15, flexShrink: 1, minWidth: 0 },
  eventDate: {
    fontSize: 11,
    letterSpacing: 0.6,
    flexShrink: 0,
  },
  // 改善② セクションラベル (作業 / 盆栽 / メモ): 小さめ灰色ラベル + 本文の縦並び
  eventFieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  eventFieldLabel: {
    fontSize: 11,
    letterSpacing: 0.4,
    minWidth: 30,
    lineHeight: 18,
  },
  eventFieldValue: { flex: 1, minWidth: 0, fontSize: 14, lineHeight: 18 },
  eventMemoValue: { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 18 },
});
