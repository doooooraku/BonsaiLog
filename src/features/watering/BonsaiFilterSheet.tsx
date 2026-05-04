/**
 * F-04 Phase H-2 BonsaiFilterSheet (Issue #29 / ADR-0013 §AC6, F1+F3 ハイブリッド)。
 *
 * - ドロップダウン (「すべての盆栽 (N本) ▼」 or 「{選択盆栽名} ▼」)
 * - タップで BottomSheet 展開:
 *   - 検索ボックス (TextInput)
 *   - 「すべての盆栽」項目 (集約モード復帰)
 *   - 「最近見た 3 本」セクション (recentIds 連動)
 *   - 「すべての盆栽 (アイウエオ順)」セクション
 * - 盆栽選択 → onSelect(bonsaiId | null) → 個別/集約モード切替 (呼出側)
 * - 既存純関数: applyBonsaiFilter (Phase D-2) を使用
 *
 * a11y / シニア配慮:
 * - タップ領域 44pt 以上 (FlatList row padding)
 * - hitSlop=8 でタップ精度向上
 * - VoiceOver 用 accessibilityLabel
 */
import BottomSheet, { BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import { applyBonsaiFilter, type BonsaiLike } from '@/src/features/watering/bonsaiFilter';

type Props<T extends BonsaiLike> = {
  bonsai: readonly T[];
  recentIds: readonly string[];
  selectedId: string | null;
  onSelect: (bonsaiId: string | null) => void;
  testID?: string;
};

export function BonsaiFilterSheet<T extends BonsaiLike>({
  bonsai,
  recentIds,
  selectedId,
  onSelect,
  testID,
}: Props<T>) {
  const { t } = useTranslation();
  const sheetRef = React.useRef<BottomSheet>(null);
  const [query, setQuery] = React.useState('');

  const snapPoints = React.useMemo(() => ['60%', '90%'], []);

  const handleOpen = React.useCallback(() => {
    sheetRef.current?.snapToIndex(0);
  }, []);

  const handleSelectAll = React.useCallback(() => {
    onSelect(null);
    setQuery('');
    sheetRef.current?.close();
  }, [onSelect]);

  const handleSelectBonsai = React.useCallback(
    (bonsaiId: string) => {
      onSelect(bonsaiId);
      setQuery('');
      sheetRef.current?.close();
    },
    [onSelect],
  );

  const filtered = React.useMemo(
    () => applyBonsaiFilter({ bonsai, query, recentIds }),
    [bonsai, query, recentIds],
  );
  const recentSet = React.useMemo(() => new Set(recentIds.slice(0, 3)), [recentIds]);
  const recentItems = React.useMemo(
    () => filtered.filter((b) => recentSet.has(b.id)),
    [filtered, recentSet],
  );
  const otherItems = React.useMemo(
    () => filtered.filter((b) => !recentSet.has(b.id)),
    [filtered, recentSet],
  );

  const selectedItem = React.useMemo(
    () => bonsai.find((b) => b.id === selectedId) ?? null,
    [bonsai, selectedId],
  );

  // ヘッダー (FlatList の ListHeaderComponent)
  const renderListHeader = React.useCallback(
    () => (
      <View>
        <BottomSheetTextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('bonsaiFilterSearchPlaceholder')}
          style={styles.searchInput}
          testID="e2e_filter_search_input"
        />
        <Pressable
          onPress={handleSelectAll}
          accessibilityRole="button"
          accessibilityLabel={t('bonsaiFilterSelectAll')}
          style={[styles.row, selectedId === null && styles.rowSelected]}
          hitSlop={8}
          testID="e2e_filter_select_all"
        >
          <ThemedText style={styles.rowText}>
            {t('bonsaiFilterSelectAll')} ({bonsai.length})
          </ThemedText>
        </Pressable>
        {recentItems.length > 0 && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>{t('bonsaiFilterRecentSection')}</ThemedText>
            {recentItems.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => handleSelectBonsai(b.id)}
                accessibilityRole="button"
                accessibilityLabel={b.name}
                style={[styles.row, selectedId === b.id && styles.rowSelected]}
                hitSlop={8}
                testID={`e2e_filter_recent_${b.id}`}
              >
                <ThemedText style={styles.rowText}>{b.name}</ThemedText>
              </Pressable>
            ))}
          </View>
        )}
        {otherItems.length > 0 && (
          <ThemedText style={[styles.sectionTitle, styles.section]}>
            {t('bonsaiFilterAllSection')}
          </ThemedText>
        )}
      </View>
    ),
    [
      bonsai.length,
      handleSelectAll,
      handleSelectBonsai,
      otherItems.length,
      query,
      recentItems,
      selectedId,
      t,
    ],
  );

  return (
    <View testID={testID ?? 'e2e_bonsai_filter_sheet'}>
      <Pressable
        onPress={handleOpen}
        accessibilityRole="button"
        accessibilityLabel={selectedItem ? selectedItem.name : t('bonsaiFilterSelectAll')}
        style={styles.dropdown}
        hitSlop={8}
        testID="e2e_filter_dropdown"
      >
        <ThemedText style={styles.dropdownText}>
          {selectedItem ? selectedItem.name : `${t('bonsaiFilterSelectAll')} (${bonsai.length})`}
          {' ▼'}
        </ThemedText>
      </Pressable>

      <BottomSheet ref={sheetRef} index={-1} snapPoints={snapPoints} enablePanDownToClose>
        <BottomSheetView style={styles.sheetContent}>
          <FlatList
            data={otherItems}
            keyExtractor={(b) => b.id}
            ListHeaderComponent={renderListHeader}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelectBonsai(item.id)}
                accessibilityRole="button"
                accessibilityLabel={item.name}
                style={[styles.row, selectedId === item.id && styles.rowSelected]}
                hitSlop={8}
                testID={`e2e_filter_item_${item.id}`}
              >
                <ThemedText style={styles.rowText}>{item.name}</ThemedText>
              </Pressable>
            )}
          />
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 6,
  },
  dropdownText: { fontSize: 14 },
  sheetContent: { flex: 1, padding: 16 },
  searchInput: {
    height: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 6,
    marginBottom: 12,
    fontSize: 14,
  },
  section: { marginTop: 12 },
  sectionTitle: { fontSize: 12, opacity: 0.7, marginBottom: 6 },
  row: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 6 },
  rowSelected: { backgroundColor: '#E6F4EA' },
  rowText: { fontSize: 16 },
});
