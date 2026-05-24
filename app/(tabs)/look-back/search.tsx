/**
 * ふりかえり sub-route: 盆栽検索画面 (旧 look-back/index.tsx の検索ロジックを移植)。
 *
 * ADR-0020 §Decision §7 (2026-05-10 改訂、T1-8c) で CareHubScreen 化に伴い分離。
 * 動線:
 * - Home Header 検索アイコン (1 タップ): /(tabs)/look-back/search に直接遷移
 * - CareHub 「盆栽を検索」カード (3 タップ): /(tabs)/look-back/search に遷移
 *
 * Sess42: mockup (care-search) 整合。サムネ + 作業アイコン + 日付 + 盆栽名 + 樹種副題 追加。
 * species 独立セクション廃止 (mockup 準拠、ユーザー判断済)。
 * フィルタ横スクロール + 「すべて」 + 2文字ゲート。
 */
import { Image } from 'expo-image';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EventIcon, SearchIcon } from '@/src/components/icons';
import { useTranslation } from '@/src/core/i18n/i18n';
import type { TranslationKey } from '@/src/core/i18n/locales/en';
import {
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  ON_BRAND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { getBonsaiByTag, searchBonsaiByName } from '@/src/db/bonsaiRepository';
import { searchEventsWithSnippet, type EventWithSnippet } from '@/src/db/eventRepository';
import { getCoverPhoto } from '@/src/db/photoRepository';
import type { Bonsai, EventType } from '@/src/db/schema';
import { getSpeciesById, type SpeciesWithName } from '@/src/db/speciesRepository';
import { getMostUsedTags, type TagRecord } from '@/src/db/tagRepository';
import { BonsaiPlaceholder } from '@/src/features/bonsai/BonsaiPlaceholder';
import { useSearchHistoryStore } from '@/src/features/search/searchHistoryStore';

type BonsaiResult = {
  bonsai: Bonsai;
  coverUri: string | null;
  species: SpeciesWithName | null;
};

/** FTS5 snippet の `«match»` 部分をインライン highlight で強調表示する pure inline component。 */
function SnippetSpans({ text }: { text: string }) {
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
function HighlightQuery({ text, query }: { text: string; query: string }) {
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

/** UI 言語が CJK (漢字/かな/ハングル) 系なら 1 文字、他はラテン系で全件ヒット回避のため 2 文字。 */
const CJK_LANGS: readonly string[] = ['ja', 'zhHans', 'zhHant', 'ko'];

export default function LookBackSearchScreen() {
  const { t, lang } = useTranslation();
  const c = useColors();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [bonsaiResults, setBonsaiResults] = useState<BonsaiResult[]>([]);
  const [eventResults, setEventResults] = useState<EventWithSnippet[]>([]);
  const [searched, setSearched] = useState(false);
  const [recentTags, setRecentTags] = useState<TagRecord[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const searchHistory = useSearchHistoryStore((s) => s.history);
  const removeHistory = useSearchHistoryStore((s) => s.remove);
  const minChars = CJK_LANGS.includes(lang) ? 1 : 2;

  useFocusEffect(
    useCallback(() => {
      getMostUsedTags(6)
        .then(setRecentTags)
        .catch(() => setRecentTags([]));
    }, []),
  );

  const runSearchWith = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      const hasText = trimmed.length >= minChars;
      const hasTag = selectedTagId != null;
      if (!hasText && !hasTag) {
        setBonsaiResults([]);
        setEventResults([]);
        setSearched(false);
        return;
      }
      try {
        // ADR-0008: タグは盆栽単位。タグ選択時は getBonsaiByTag で「盆栽」を返す
        // (searchEventsByBonsaiTags は作業を返すため検索画面では使わない)。
        // 作業履歴セクションはテキスト検索 (メモ全文) のみで表示する。
        const [textBonsai, tagBonsai, textEvents] = await Promise.all([
          hasText ? searchBonsaiByName(trimmed, 50) : Promise.resolve<Bonsai[]>([]),
          hasTag ? getBonsaiByTag(selectedTagId) : Promise.resolve<Bonsai[]>([]),
          hasText ? searchEventsWithSnippet(trimmed) : Promise.resolve<EventWithSnippet[]>([]),
        ]);

        // 盆栽リスト確定: text+tag は積集合 (AND)、text のみ / tag のみはそのまま
        let bonsaiList: Bonsai[];
        if (hasText && hasTag) {
          const tagIdSet = new Set(tagBonsai.map((b) => b.id));
          bonsaiList = textBonsai.filter((b) => tagIdSet.has(b.id));
        } else if (hasText) {
          bonsaiList = textBonsai;
        } else {
          bonsaiList = tagBonsai;
        }

        // カバー写真 + 樹種を並列 prefetch
        const uniqueSpeciesIds = [
          ...new Set(bonsaiList.filter((b) => b.speciesId).map((b) => b.speciesId!)),
        ];
        const [coverEntries, speciesEntries] = await Promise.all([
          Promise.all(
            bonsaiList.map((b) =>
              getCoverPhoto(b.id).then((p) => [b.id, p?.absoluteUri ?? null] as const),
            ),
          ),
          Promise.all(
            uniqueSpeciesIds.map((id) => getSpeciesById(id, lang).then((s) => [id, s] as const)),
          ),
        ]);
        const coverMap = new Map(coverEntries);
        const speciesMap = new Map(speciesEntries);

        setBonsaiResults(
          bonsaiList.map((b) => ({
            bonsai: b,
            coverUri: coverMap.get(b.id) ?? null,
            species: b.speciesId ? (speciesMap.get(b.speciesId) ?? null) : null,
          })),
        );

        // 作業履歴はテキスト検索のみ (タグからは作業を出さない)
        setEventResults(hasText ? textEvents.slice(0, 50) : []);
        setSearched(true);
        if (hasText) {
          useSearchHistoryStore.getState().push(trimmed);
        }
      } catch {
        // 検索失敗は無視
      }
    },
    [lang, selectedTagId, minChars],
  );

  React.useEffect(() => {
    const trimmed = query.trim();
    const hasText = trimmed.length >= minChars;
    const hasTag = selectedTagId != null;
    if (!hasText && !hasTag) {
      setBonsaiResults([]);
      setEventResults([]);
      setSearched(false);
      return;
    }
    const timer = setTimeout(() => {
      void runSearchWith(trimmed);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, selectedTagId, runSearchWith, minChars]);

  const runSearch = () => void runSearchWith(query);

  const selectTag = (tagId: string) => setSelectedTagId((prev) => (prev === tagId ? null : tagId));

  const hasTag = selectedTagId != null;
  const showMinCharsHint = !hasTag && !searched;
  const highlightQuery = query.trim();

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_find_screen"
    >
      {/* Search-as-Header: back + 🔍 + input + clear */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('cancel')}
            testID="e2e_find_back"
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <ThemedText style={styles.backButtonText}>{'‹'}</ThemedText>
          </Pressable>
          <View style={[styles.inputRow, { borderColor: c.border, backgroundColor: BG_SURFACE }]}>
            <SearchIcon size={18} color={TEXT_SECONDARY} />
            <TextInput
              accessibilityLabel={t('searchPlaceholder')}
              testID="e2e_find_input"
              style={[styles.input, { color: c.text }]}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={runSearch}
              placeholder={t('searchPlaceholder')}
              placeholderTextColor={c.textSecondary}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              autoFocus
            />
            {query.length > 0 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('cancel')}
                testID="e2e_find_clear"
                style={styles.clearButtonWrap}
                onPress={() => setQuery('')}
                hitSlop={8}
              >
                <ThemedText style={styles.clearButtonX}>×</ThemedText>
              </Pressable>
            )}
          </View>
        </View>

        {/* フィルタチップ行: 常時表示 + 横スクロール */}
        {recentTags.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
            testID="e2e_find_filter_row"
            style={{ borderBottomWidth: 1, borderBottomColor: BORDER_DEFAULT }}
          >
            {recentTags.map((tg) => {
              const selected = selectedTagId === tg.id;
              return (
                <Pressable
                  key={tg.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={tg.name}
                  testID={`e2e_find_tag_chip_${tg.id}`}
                  style={[styles.filterChip, selected && styles.filterChipSel]}
                  onPress={() => selectTag(tg.id)}
                >
                  <ThemedText style={[styles.filterChipText, selected && styles.filterChipTextSel]}>
                    {tg.name}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* 空 / 短クエリ状態: 「N 文字以上」ヒント + 検索履歴リスト */}
        {showMinCharsHint && (
          <>
            <ThemedText style={styles.minCharsHint}>
              {t('searchMinChars').replace('{count}', String(minChars))}
            </ThemedText>
            {searchHistory.length > 0 && (
              <View testID="e2e_find_recent_history">
                <ThemedText style={styles.sectionLabel}>{t('searchRecentTitle')}</ThemedText>
                {searchHistory.map((q) => (
                  <View key={q} style={styles.historyRow}>
                    <SearchIcon size={16} color={TEXT_SECONDARY} />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={q}
                      testID={`e2e_find_history_tap_${q}`}
                      style={styles.historyTextWrap}
                      onPress={() => {
                        setQuery(q);
                        void runSearchWith(q);
                      }}
                    >
                      <ThemedText style={styles.historyText}>{q}</ThemedText>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={q}
                      testID={`e2e_find_history_delete_${q}`}
                      style={styles.historyDeleteWrap}
                      onPress={() => removeHistory(q)}
                      hitSlop={8}
                    >
                      <ThemedText style={styles.clearButtonX}>×</ThemedText>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* 結果ゼロ */}
        {searched && bonsaiResults.length === 0 && eventResults.length === 0 && (
          <ThemedText style={styles.empty}>{t('searchEmpty')}</ThemedText>
        )}

        {/* 盆栽セクション */}
        {bonsaiResults.length > 0 && (
          <View style={styles.section} testID="e2e_find_bonsai_section">
            <ThemedText style={styles.sectionLabel}>
              {t('searchBonsaiSection')}
              {' · '}
              {bonsaiResults.length}
            </ThemedText>
            {bonsaiResults.map(({ bonsai: b, coverUri, species }) => (
              <Pressable
                key={b.id}
                accessibilityRole="button"
                accessibilityLabel={b.name}
                style={styles.bonsaiRow}
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
                  <ThemedText style={styles.bonsaiName} numberOfLines={1}>
                    <HighlightQuery text={b.name} query={highlightQuery} />
                  </ThemedText>
                  {species != null && (
                    <ThemedText style={styles.speciesLine} numberOfLines={1}>
                      <HighlightQuery text={species.commonName} query={highlightQuery} />
                      {species.scientificName ? (
                        <ThemedText style={styles.scientificName}>
                          {' '}
                          {species.scientificName}
                        </ThemedText>
                      ) : null}
                    </ThemedText>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* 作業履歴セクション */}
        {eventResults.length > 0 && (
          <View style={styles.section} testID="e2e_find_event_section">
            <ThemedText style={styles.sectionLabel}>
              {t('searchEventSection')}
              {' · '}
              {eventResults.length}
            </ThemedText>
            {eventResults.map((e) => {
              const desc = e.snippet ?? e.note;
              const typeLabel = t(`eventType_${e.type}` as TranslationKey);
              return (
                <Pressable
                  key={e.id}
                  accessibilityRole="button"
                  accessibilityLabel={e.note ?? typeLabel}
                  style={styles.eventRow}
                  onPress={() => router.push(`/(tabs)/bonsai/${e.bonsaiId}` as Href)}
                >
                  <View style={styles.eventIconBox}>
                    <EventIcon type={e.type as EventType} size={18} />
                  </View>
                  <View style={styles.eventTextCol}>
                    <View style={styles.eventTopRow}>
                      <ThemedText
                        type="defaultSemiBold"
                        style={styles.eventLabel}
                        numberOfLines={1}
                      >
                        {typeLabel}
                      </ThemedText>
                      <ThemedText style={styles.eventDate}>
                        {formatMonthDay(e.occurredAtUtc, lang)}
                      </ThemedText>
                    </View>
                    {(e.bonsaiName || (desc != null && desc.length > 0)) && (
                      <ThemedText style={styles.eventDesc} numberOfLines={1}>
                        {e.bonsaiName ? (
                          <ThemedText style={styles.bonsaiNameInline}>{e.bonsaiName} </ThemedText>
                        ) : null}
                        {desc != null && desc.length > 0 ? <SnippetSpans text={desc} /> : null}
                      </ThemedText>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerSafe: { backgroundColor: BG_SURFACE },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_DEFAULT,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: { fontSize: 28, color: TEXT_PRIMARY, lineHeight: 28 },
  inputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  clearButtonWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonX: { fontSize: 20, color: TEXT_SECONDARY, lineHeight: 20 },
  // フィルタ行
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  filterChipSel: { backgroundColor: BRAND_GREEN, borderColor: BRAND_GREEN },
  filterChipText: { fontSize: 12, color: TEXT_SECONDARY, fontWeight: '500' },
  filterChipTextSel: { color: ON_BRAND, fontWeight: '600' },
  // スクロールエリア
  scroll: { padding: 16, gap: 16, paddingBottom: 96 },
  // 空 / 短クエリ状態
  minCharsHint: {
    textAlign: 'center',
    fontSize: 14,
    color: TEXT_SECONDARY,
    paddingVertical: 24,
    opacity: 0.7,
  },
  // 検索履歴リスト行
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_DEFAULT,
    minHeight: 48,
  },
  historyTextWrap: { flex: 1 },
  historyText: { fontSize: 15, color: TEXT_PRIMARY },
  historyDeleteWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 共通
  empty: { textAlign: 'center', opacity: 0.7, paddingVertical: 32 },
  section: { gap: 8, marginBottom: 8 },
  sectionLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  // 盆栽結果行
  bonsaiRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_DEFAULT,
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
  bonsaiName: { fontFamily: 'NotoSerifJP_500Medium', fontSize: 17, color: TEXT_PRIMARY },
  speciesLine: { fontSize: 12, color: TEXT_SECONDARY },
  scientificName: { fontStyle: 'italic' },
  // 作業履歴行
  eventRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_DEFAULT,
    alignItems: 'flex-start',
  },
  eventIconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    backgroundColor: BG_SURFACE,
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
  eventLabel: { fontSize: 15, flex: 1 },
  eventDate: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    letterSpacing: 0.6,
    flexShrink: 0,
  },
  bonsaiNameInline: { fontSize: 13, color: TEXT_SECONDARY, fontWeight: '500' },
  eventDesc: { fontSize: 13, color: TEXT_SECONDARY, lineHeight: 18 },
  // Issue #339 Phase 3: FTS5 snippet match highlight (#EDE7D8 系 washi 背景)
  snippetMatch: {
    backgroundColor: '#EDE7D8',
    color: TEXT_SECONDARY,
    fontWeight: '600',
  },
});
