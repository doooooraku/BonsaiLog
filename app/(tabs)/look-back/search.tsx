/**
 * ふりかえり sub-route: 盆栽検索画面 (旧 look-back/index.tsx の検索ロジックを移植)。
 *
 * ADR-0020 §Decision §7 (2026-05-10 改訂、T1-8c) で CareHubScreen 化に伴い分離。
 * 動線:
 * - Home Header 検索アイコン (1 タップ): /(tabs)/look-back/search に直接遷移
 * - CareHub 「盆栽を検索」カード (3 タップ): /(tabs)/look-back/search に遷移
 *
 * F-09 既存ロジック (searchBonsaiByName / searchEventsWithSnippet / searchSpecies /
 * searchEventsByTags + useSearchHistoryStore) をそのまま再利用。
 */
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  BRAND_GREEN_BG,
  DISABLED_BG,
  ON_BRAND,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { searchBonsaiByName } from '@/src/db/bonsaiRepository';
import {
  searchEventsByTags,
  searchEventsWithSnippet,
  type EventWithSnippet,
} from '@/src/db/eventRepository';
import type { Bonsai } from '@/src/db/schema';
import { searchSpecies, type SpeciesWithName } from '@/src/db/speciesRepository';
import { getRecentTags, type TagRecord } from '@/src/db/tagRepository';
import { SearchHeader } from '@/src/features/bonsai/SearchHeader';
import { useSearchHistoryStore } from '@/src/features/search/searchHistoryStore';

export default function LookBackSearchScreen() {
  const { t, lang } = useTranslation();
  const c = useColors();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [bonsaiResults, setBonsaiResults] = useState<Bonsai[]>([]);
  const [speciesResults, setSpeciesResults] = useState<SpeciesWithName[]>([]);
  const [eventResults, setEventResults] = useState<EventWithSnippet[]>([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recentTags, setRecentTags] = useState<TagRecord[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<readonly string[]>([]);
  const searchHistory = useSearchHistoryStore((s) => s.history);

  useFocusEffect(
    useCallback(() => {
      getRecentTags(3)
        .then(setRecentTags)
        .catch(() => setRecentTags([]));
    }, []),
  );

  const runSearchWith = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      const hasText = trimmed.length > 0;
      const hasTags = selectedTagIds.length > 0;
      if (!hasText && !hasTags) {
        setBonsaiResults([]);
        setSpeciesResults([]);
        setEventResults([]);
        setSearched(false);
        return;
      }
      setBusy(true);
      try {
        const [bonsai, species, textEvents, tagEvents] = await Promise.all([
          hasText ? searchBonsaiByName(trimmed, 50) : Promise.resolve<Bonsai[]>([]),
          hasText ? searchSpecies(trimmed, lang) : Promise.resolve<SpeciesWithName[]>([]),
          hasText ? searchEventsWithSnippet(trimmed) : Promise.resolve<EventWithSnippet[]>([]),
          hasTags ? searchEventsByTags(selectedTagIds) : Promise.resolve<EventWithSnippet[]>([]),
        ]);
        setBonsaiResults(bonsai);
        setSpeciesResults(species.slice(0, 50));
        let mergedEvents: EventWithSnippet[];
        if (hasText && hasTags) {
          const tagIdSet = new Set(tagEvents.map((e) => e.id));
          mergedEvents = textEvents.filter((e) => tagIdSet.has(e.id));
        } else if (hasText) {
          mergedEvents = textEvents;
        } else {
          mergedEvents = tagEvents.map((e) => ({ ...e, snippet: null }) as EventWithSnippet);
        }
        setEventResults(mergedEvents.slice(0, 50));
        setSearched(true);
        if (hasText) {
          useSearchHistoryStore.getState().push(trimmed);
        }
      } finally {
        setBusy(false);
      }
    },
    [lang, selectedTagIds],
  );

  React.useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed && selectedTagIds.length === 0) {
      setBonsaiResults([]);
      setSpeciesResults([]);
      setEventResults([]);
      setSearched(false);
      return;
    }
    const timer = setTimeout(() => {
      void runSearchWith(trimmed);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, selectedTagIds, runSearchWith]);

  const runSearch = () => runSearchWith(query);

  const toggleTagFilter = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_find_screen"
    >
      <SearchHeader
        title={t('searchAction')}
        testIdSuffix="find"
        showSearch={false}
        showSettings={false}
      />

      <View style={styles.searchBox}>
        <TextInput
          accessibilityLabel={t('searchPlaceholder')}
          testID="e2e_find_input"
          style={[
            styles.input,
            { color: c.text, borderColor: c.border, backgroundColor: BG_SURFACE },
          ]}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => void runSearch()}
          placeholder={t('searchPlaceholder')}
          placeholderTextColor={c.textSecondary}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('searchAction')}
          testID="e2e_find_action"
          style={[styles.searchButton, busy && styles.disabledButton]}
          onPress={() => void runSearch()}
          disabled={busy}
        >
          <ThemedText style={styles.searchButtonText}>{t('searchAction')}</ThemedText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {searchHistory.length > 0 && !searched && (
          <View style={styles.tagsRow} testID="e2e_find_recent_history">
            <View style={styles.historyHeaderRow}>
              <ThemedText style={styles.sectionLabel}>{t('searchRecentTitle')}</ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('searchHistoryClear')}
                testID="e2e_find_history_clear"
                onPress={() => useSearchHistoryStore.getState().clear()}
              >
                <ThemedText style={styles.clearButtonText}>{t('searchHistoryClear')}</ThemedText>
              </Pressable>
            </View>
            <View style={styles.chipRow}>
              {searchHistory.map((q) => (
                <Pressable
                  key={q}
                  accessibilityRole="button"
                  accessibilityLabel={q}
                  testID={`e2e_find_history_chip_${q}`}
                  style={styles.chip}
                  onPress={() => {
                    setQuery(q);
                    void runSearchWith(q);
                  }}
                >
                  <ThemedText style={styles.chipText}>{q}</ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {recentTags.length > 0 && (
          <View style={styles.tagsRow} testID="e2e_find_recent_tags">
            <View style={styles.historyHeaderRow}>
              <ThemedText style={styles.sectionLabel}>{t('searchRecentTagsLabel')}</ThemedText>
              {selectedTagIds.length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('searchTagFilterClear')}
                  testID="e2e_find_tag_filter_clear"
                  onPress={() => setSelectedTagIds([])}
                >
                  <ThemedText style={styles.clearButtonText}>
                    {t('searchTagFilterClear')}
                  </ThemedText>
                </Pressable>
              )}
            </View>
            <View style={styles.chipRow}>
              {recentTags.map((tg) => {
                const selected = selectedTagIds.includes(tg.id);
                return (
                  <Pressable
                    key={tg.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={tg.name}
                    testID={`e2e_find_tag_chip_${tg.id}`}
                    style={[styles.chip, selected && styles.chipSel]}
                    onPress={() => toggleTagFilter(tg.id)}
                  >
                    <ThemedText style={[styles.chipText, selected && styles.chipTextSel]}>
                      {tg.name}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {searched &&
          bonsaiResults.length === 0 &&
          speciesResults.length === 0 &&
          eventResults.length === 0 && (
            <ThemedText style={styles.empty}>{t('searchEmpty')}</ThemedText>
          )}

        {bonsaiResults.length > 0 && (
          <View style={styles.section} testID="e2e_find_bonsai_section">
            <ThemedText style={styles.sectionLabel}>
              {t('searchBonsaiSection')}
              {' · '}
              {bonsaiResults.length}
            </ThemedText>
            {bonsaiResults.map((b) => (
              <Pressable
                key={b.id}
                accessibilityRole="button"
                accessibilityLabel={b.name}
                style={styles.entry}
                onPress={() => router.push(`/(tabs)/bonsai/${b.id}` as Href)}
              >
                <ThemedText type="defaultSemiBold">{b.name}</ThemedText>
              </Pressable>
            ))}
          </View>
        )}

        {speciesResults.length > 0 && (
          <View style={styles.section} testID="e2e_find_species_section">
            <ThemedText style={styles.sectionLabel}>
              {t('searchSpeciesSection')}
              {' · '}
              {speciesResults.length}
            </ThemedText>
            {speciesResults.map((s) => (
              <View key={s.id} style={styles.entry}>
                <ThemedText type="defaultSemiBold">{s.commonName}</ThemedText>
                <ThemedText style={styles.scientific}>{s.scientificName}</ThemedText>
              </View>
            ))}
          </View>
        )}

        {eventResults.length > 0 && (
          <View style={styles.section} testID="e2e_find_event_section">
            <ThemedText style={styles.sectionLabel}>
              {t('searchEventSection')}
              {' · '}
              {eventResults.length}
            </ThemedText>
            {eventResults.map((e) => {
              const desc = e.snippet ?? e.note;
              return (
                <Pressable
                  key={e.id}
                  accessibilityRole="button"
                  accessibilityLabel={e.note ?? e.type}
                  style={styles.entry}
                  onPress={() => router.push(`/(tabs)/bonsai/${e.bonsaiId}` as Href)}
                >
                  <ThemedText type="defaultSemiBold">{e.type}</ThemedText>
                  {desc != null && desc.length > 0 && (
                    <ThemedText style={styles.entryDesc} numberOfLines={2}>
                      {desc}
                    </ThemedText>
                  )}
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
  searchBox: { flexDirection: 'row', gap: 8, padding: 16 },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
    backgroundColor: BG_SURFACE,
    fontSize: 17,
  },
  searchButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    minHeight: 48,
    minWidth: 64,
    borderRadius: 12,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: { color: ON_BRAND, fontSize: 17, fontWeight: '600' },
  disabledButton: { opacity: 0.6, backgroundColor: DISABLED_BG },
  scroll: { padding: 16, gap: 16, paddingBottom: 96 },
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
  entry: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    backgroundColor: BG_SURFACE,
    gap: 4,
    minHeight: 48,
  },
  entryDesc: { fontSize: 13, color: TEXT_SECONDARY, lineHeight: 18 },
  scientific: { fontSize: 13, color: TEXT_SECONDARY, fontStyle: 'italic' },
  tagsRow: { gap: 8 },
  historyHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clearButtonText: { fontSize: 12, color: BRAND_GREEN, fontWeight: '600' },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND_GREEN,
    backgroundColor: BRAND_GREEN_BG,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipText: { fontSize: 13, color: BRAND_GREEN, fontWeight: '500' },
  chipSel: { backgroundColor: BRAND_GREEN, borderColor: BRAND_GREEN },
  chipTextSel: { color: ON_BRAND, fontWeight: '600' },
});
