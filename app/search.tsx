/**
 * F-09 Phase A 検索画面 (Issue #31 / ADR-0008 改訂)。
 *
 * Phase A: 盆栽名 LIKE 検索 + 既存 events_fts (foundation で実装済) を併用。
 *   - bonsaiRepository.searchBonsaiByName (LIKE)
 *   - eventRepository.searchEvents (FTS5 MATCH)
 *
 * Phase B (別 PR): tags M:N、name_normalized、最近 3 タグチップ、3 段組み洗練 UI。
 *
 * 設計方針:
 * - シニア UX: 結果件数を文字で明示 (ADR-0008 §改訂)
 * - 押し付けがましい文言禁止 (constraints §5-2)
 * - 検索結果 0 件は空メッセージで穏やかに
 */
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  BG_PRIMARY,
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  BRAND_GREEN_BG,
  DISABLED_BG,
  ON_BRAND,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import { searchBonsaiByName } from '@/src/db/bonsaiRepository';
import { searchEvents } from '@/src/db/eventRepository';
import { searchSpecies, type SpeciesWithName } from '@/src/db/speciesRepository';
import { getRecentTags, type TagRecord } from '@/src/db/tagRepository';
import type { Bonsai, Event } from '@/src/db/schema';
import { useSearchHistoryStore } from '@/src/features/search/searchHistoryStore';
import { OutdoorToggleButton } from '@/src/features/theme/OutdoorToggleButton';

export default function SearchScreen() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [bonsaiResults, setBonsaiResults] = useState<Bonsai[]>([]);
  const [speciesResults, setSpeciesResults] = useState<SpeciesWithName[]>([]);
  const [eventResults, setEventResults] = useState<Event[]>([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  // F-09 Phase B (Issue #31, ADR-0008 改訂): 最近 3 タグ候補チップ
  const [recentTags, setRecentTags] = useState<TagRecord[]>([]);
  // F-09 Phase H (AC7-2): 最近の検索履歴チップ
  const searchHistory = useSearchHistoryStore((s) => s.history);

  useFocusEffect(
    React.useCallback(() => {
      getRecentTags(3)
        .then(setRecentTags)
        .catch(() => setRecentTags([]));
    }, []),
  );

  // Issue #31 AC5 シニア UX: debounce 300ms (タイプミス耐性)。
  // Enter (onSubmitEditing) は即時実行 (Y6) のため別経路。
  React.useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
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
    // runSearchWith は useCallback 化していないが、setTimeout cleanup で
    // タイマー破棄するため stale closure 問題は最小化される。
  }, [query]);

  const runSearchWith = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      setBonsaiResults([]);
      setSpeciesResults([]);
      setEventResults([]);
      setSearched(false);
      return;
    }
    setBusy(true);
    try {
      // Issue #31 AC2: 3 段組み (盆栽 + 樹種 + イベント) を並列検索
      const [bonsai, species, events] = await Promise.all([
        searchBonsaiByName(trimmed, 50),
        searchSpecies(trimmed, lang),
        searchEvents(trimmed),
      ]);
      setBonsaiResults(bonsai);
      setSpeciesResults(species.slice(0, 50));
      setEventResults(events.slice(0, 50));
      setSearched(true);
      // F-09 Phase G (Issue #31, ADR-0008 改訂): 検索履歴に追加
      // searchHistoryStore (#119) で normalize + 重複排除 + FIFO 20 件
      useSearchHistoryStore.getState().push(trimmed);
    } finally {
      setBusy(false);
    }
  };

  const runSearch = () => runSearchWith(query);

  return (
    <ThemedView style={styles.container} testID="e2e_search_screen">
      <OutdoorToggleButton testIdSuffix="search_outdoor_toggle" />
      <View style={styles.searchBox}>
        <TextInput
          accessibilityLabel={t('searchPlaceholder')}
          testID="e2e_search_input"
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => void runSearch()}
          placeholder={t('searchPlaceholder')}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('searchAction')}
          testID="e2e_search_action"
          style={[styles.searchButton, busy && styles.disabledButton]}
          onPress={() => void runSearch()}
          disabled={busy}
        >
          <ThemedText style={styles.searchButtonText}>{t('searchAction')}</ThemedText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* F-09 Phase H (AC7-2/3): 最近の検索チップ + 履歴削除ボタン */}
        {searchHistory.length > 0 && !searched && (
          <View style={styles.tagsRow} testID="e2e_search_recent_history">
            <View style={styles.historyHeaderRow}>
              <ThemedText style={styles.recentTagsLabel}>{t('searchRecentTitle')}</ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('searchHistoryClear')}
                testID="e2e_search_history_clear"
                onPress={() => useSearchHistoryStore.getState().clear()}
              >
                <ThemedText style={styles.clearButtonText}>{t('searchHistoryClear')}</ThemedText>
              </Pressable>
            </View>
            <View style={styles.tagsChipRow}>
              {searchHistory.map((q) => (
                <Pressable
                  key={q}
                  accessibilityRole="button"
                  accessibilityLabel={q}
                  testID={`e2e_search_history_chip_${q}`}
                  style={styles.tagChip}
                  onPress={() => {
                    setQuery(q);
                    void runSearchWith(q);
                  }}
                >
                  <ThemedText style={styles.tagChipText}>{q}</ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        {recentTags.length > 0 && !searched && (
          <View style={styles.tagsRow} testID="e2e_search_recent_tags">
            <ThemedText style={styles.recentTagsLabel}>{t('searchRecentTagsLabel')}</ThemedText>
            <View style={styles.tagsChipRow}>
              {recentTags.map((tg) => (
                <Pressable
                  key={tg.id}
                  accessibilityRole="button"
                  accessibilityLabel={tg.name}
                  testID={`e2e_search_tag_chip_${tg.id}`}
                  style={styles.tagChip}
                  onPress={() => {
                    setQuery(tg.name);
                    void runSearchWith(tg.name);
                  }}
                >
                  <ThemedText style={styles.tagChipText}>{tg.name}</ThemedText>
                </Pressable>
              ))}
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
          <View style={styles.section} testID="e2e_search_bonsai_section">
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              {t('searchBonsaiSection')}
              {' ('}
              {bonsaiResults.length}
              {')'}
            </ThemedText>
            {bonsaiResults.map((b) => (
              <Pressable
                key={b.id}
                accessibilityRole="button"
                accessibilityLabel={b.name}
                style={styles.entry}
                onPress={() => router.push(`/bonsai/${b.id}` as Href)}
              >
                <ThemedText type="defaultSemiBold">{b.name}</ThemedText>
              </Pressable>
            ))}
          </View>
        )}

        {/* Issue #31 AC2: 樹種セクション (3 段組みの 2 番目) */}
        {speciesResults.length > 0 && (
          <View style={styles.section} testID="e2e_search_species_section">
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              {t('searchSpeciesSection')}
              {' ('}
              {speciesResults.length}
              {')'}
            </ThemedText>
            {speciesResults.map((s) => (
              <View key={s.id} style={styles.entry}>
                <ThemedText type="defaultSemiBold">{s.commonName}</ThemedText>
                <ThemedText style={styles.speciesScientific}>{s.scientificName}</ThemedText>
              </View>
            ))}
          </View>
        )}

        {eventResults.length > 0 && (
          <View style={styles.section} testID="e2e_search_event_section">
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              {t('searchEventSection')}
              {' ('}
              {eventResults.length}
              {')'}
            </ThemedText>
            {eventResults.map((e) => (
              <Pressable
                key={e.id}
                accessibilityRole="button"
                accessibilityLabel={e.note ?? e.type}
                style={styles.entry}
                onPress={() => router.push(`/bonsai/${e.bonsaiId}` as Href)}
              >
                <ThemedText type="defaultSemiBold">{e.type}</ThemedText>
                {e.note != null && e.note.length > 0 && (
                  <ThemedText style={styles.entryDesc} numberOfLines={2}>
                    {e.note}
                  </ThemedText>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_PRIMARY },
  searchBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
  },
  // Issue #31 AC5 シニア UX 数値: 高 48dp+ / fontSize 17pt+ (旧 16pt + paddingV 10)
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
  // Issue #31 AC5: searchButton も minHeight 48 + minWidth 64 (タップ領域 48dp 確保)
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
  scroll: { padding: 16, gap: 16 },
  empty: { textAlign: 'center', opacity: 0.7, paddingVertical: 32 },
  section: { gap: 8, marginBottom: 8 },
  sectionTitle: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.6,
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
  speciesScientific: { fontSize: 13, color: TEXT_SECONDARY, fontStyle: 'italic' },
  tagsRow: { gap: 8 },
  recentTagsLabel: { fontSize: 12, color: TEXT_SECONDARY },
  historyHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clearButtonText: { fontSize: 12, color: BRAND_GREEN, fontWeight: '600' },
  tagsChipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  // pill 9999 禁止 (design_system.md §5) → 12 角丸、minHeight 36 (chip 標準)
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND_GREEN,
    backgroundColor: BRAND_GREEN_BG,
    minHeight: 36,
    justifyContent: 'center',
  },
  tagChipText: { fontSize: 13, color: BRAND_GREEN, fontWeight: '500' },
});
