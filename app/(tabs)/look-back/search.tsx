/**
 * ふりかえり sub-route: 盆栽検索画面 coordinator (旧 look-back/index.tsx の検索ロジック移植)。
 *
 * ADR-0020 §7 (T1-8c) で CareHubScreen 化に伴い分離。動線:
 * - Home Header 検索アイコン / CareHub 「盆栽を検索」カード → /(tabs)/look-back/search
 *
 * Sess42: mockup (care-search) 整合。サムネ + 作業アイコン + 日付 + 盆栽名 + 樹種副題。
 *
 * Phase 4 B2 (ADR-0045): 708 行 god を分割。
 * - 検索ロジック/state/debounce → useBonsaiSearch
 * - 結果行 + ハイライト → SearchResultRows (BonsaiResultRow / EventResultRow)
 * coordinator は header (検索入力) + フィルタチップ + section 骨格のみ。ADR-0009 検索仕様不変。
 */
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SearchIcon } from '@/src/components/icons';
import {
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  ON_BRAND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { BonsaiResultRow, EventResultRow } from '@/src/features/search/SearchResultRows';
import { useBonsaiSearch } from '@/src/features/search/useBonsaiSearch';

export default function LookBackSearchScreen() {
  const c = useColors();
  const router = useRouter();
  const {
    query,
    setQuery,
    bonsaiResults,
    eventResults,
    searched,
    recentTags,
    selectedTagId,
    selectTag,
    searchHistory,
    removeHistory,
    minChars,
    t,
    runSearchWith,
  } = useBonsaiSearch();

  const runSearch = () => void runSearchWith(query);
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
                {searchHistory.slice(0, 3).map((q) => (
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
            {bonsaiResults.map((r) => (
              <BonsaiResultRow key={r.bonsai.id} result={r} highlightQuery={highlightQuery} />
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
            {eventResults.map((e) => (
              <EventResultRow key={e.id} event={e} highlightQuery={highlightQuery} />
            ))}
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
});
