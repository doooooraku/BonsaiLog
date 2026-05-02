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
import { useRouter, type Href } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from '@/src/core/i18n/i18n';
import { searchBonsaiByName } from '@/src/db/bonsaiRepository';
import { searchEvents } from '@/src/db/eventRepository';
import type { Bonsai, Event } from '@/src/db/schema';

export default function SearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [bonsaiResults, setBonsaiResults] = useState<Bonsai[]>([]);
  const [eventResults, setEventResults] = useState<Event[]>([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);

  const runSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setBonsaiResults([]);
      setEventResults([]);
      setSearched(false);
      return;
    }
    setBusy(true);
    try {
      const [bonsai, events] = await Promise.all([
        searchBonsaiByName(trimmed, 50),
        searchEvents(trimmed),
      ]);
      setBonsaiResults(bonsai);
      setEventResults(events.slice(0, 50));
      setSearched(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.container} testID="e2e_search_screen">
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
        {searched && bonsaiResults.length === 0 && eventResults.length === 0 && (
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
  container: { flex: 1 },
  searchBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    fontSize: 16,
  },
  searchButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  disabledButton: { opacity: 0.6 },
  scroll: { padding: 16, gap: 16 },
  empty: { textAlign: 'center', opacity: 0.7, paddingVertical: 32 },
  section: { gap: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 14, opacity: 0.7, textTransform: 'uppercase', marginBottom: 4 },
  entry: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 4,
  },
  entryDesc: { fontSize: 13, opacity: 0.7, lineHeight: 18 },
});
