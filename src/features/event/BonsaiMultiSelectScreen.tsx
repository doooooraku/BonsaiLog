/**
 * 盆栽複数選択 modal screen (ADR-0025 Phase 2 案 B、 Sess8 PR-2)。
 *
 * 起動経路: 予定/記録タブ FAB tap (useBulkActionFlow) → router.push('/bonsai-multi-select?mode=...')
 *
 * 動作:
 * - 盆栽カード一覧 (compact card: 写真 + 名前 + 樹種 + チェック)
 * - selectMode true 固定、 user が tap で選択 toggle
 * - 下部 sticky CTA: mode='log' なら 「一括記録」、 mode='schedule' なら 「予定追加」
 * - 確定 → setBulkContext + router.push('/bulk-work-picker?mode=...') で次画面 push
 * - キャンセル: Stack header 左 close (modal dismiss) → 元タブに復帰
 *
 * Sess12 PR-D 改善 D: router.replace → router.push に変更 (BulkWorkPicker から ← で
 * 1 画面戻り = 本画面に戻れるように)。 戻り時の選択状態は bulkContext から自動 restore。
 */
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BonsaiSelectableCard } from '@/src/features/bonsai/BonsaiSelectableCard';
import { useTranslation } from '@/src/core/i18n/i18n';
import { ON_BRAND, TEXT_SECONDARY } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { getAllActiveBonsaiWithSpecies, type BonsaiWithSpecies } from '@/src/db/bonsaiRepository';
import { getCoverPhoto } from '@/src/db/photoRepository';
import { usePickerStore } from '@/src/stores/pickerStore';

type CardData = {
  id: string;
  name: string;
  coverUri: string | null;
  speciesCommonName: string | null;
};

export default function BonsaiMultiSelectScreen() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const params = useLocalSearchParams<{ mode?: 'schedule' | 'log'; date?: string }>();
  const mode: 'schedule' | 'log' = params.mode === 'log' ? 'log' : 'schedule';
  const scheduleDate = params.date ?? '';

  const [items, setItems] = useState<CardData[]>([]);
  // Sess12 PR-D 改善 D: 戻り時の選択状態 restore (bulkContext.selectedBonsais から)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const ctx = usePickerStore.getState().bulkContext;
    return new Set(ctx?.selectedBonsais.map((b) => b.id) ?? []);
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const bonsai: BonsaiWithSpecies[] = await getAllActiveBonsaiWithSpecies(lang);
        const cards = await Promise.all(
          bonsai.map(async (b) => {
            const cover = await getCoverPhoto(b.id);
            return {
              id: b.id,
              name: b.name,
              coverUri: cover?.absoluteUri ?? null,
              speciesCommonName: b.species?.commonName ?? null,
            } satisfies CardData;
          }),
        );
        if (!cancelled) setItems(cards);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const handleCardPress = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (selectedIds.size === 0) return;
    const selectedBonsais = items
      .filter((it) => selectedIds.has(it.id))
      .map((it) => ({ id: it.id, name: it.name }));
    usePickerStore.getState().setBulkContext({ selectedBonsais });
    const dateParam = scheduleDate ? `&date=${encodeURIComponent(scheduleDate)}` : '';
    // Sess12 PR-D 改善 D: replace → push (BulkWorkPicker ← で本画面に戻れる)
    router.push(`/bulk-work-picker?mode=${mode}${dateParam}` as Href);
  }, [items, selectedIds, mode, scheduleDate, router]);

  const ctaLabel = useMemo(
    () => (mode === 'schedule' ? t('bulkSchedule') : t('bulkLog')),
    [mode, t],
  );

  const ctaDisabled = selectedIds.size === 0;

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_bonsai_multi_select_screen"
    >
      <View style={styles.header}>
        <ThemedText style={[styles.sub, { color: c.textSecondary }]}>
          {t('bulkSelectModalNotice').replace('{count}', String(selectedIds.size))}
        </ThemedText>
      </View>
      {loading ? (
        <View style={styles.loadingBox}>
          <ThemedText>{t('loading')}</ThemedText>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyBox}>
          <ThemedText style={[styles.emptyText, { color: c.textSecondary }]}>
            {t('homeEmptyTitle')}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <BonsaiSelectableCard
              id={item.id}
              name={item.name}
              coverUri={item.coverUri}
              speciesCommonName={item.speciesCommonName}
              selected={selectedIds.has(item.id)}
              onPress={handleCardPress}
              testID={`e2e_bonsai_multi_select_card_${item.id}`}
            />
          )}
        />
      )}
      <View style={[styles.footer, { backgroundColor: c.background, borderTopColor: c.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          accessibilityState={{ disabled: ctaDisabled }}
          style={[styles.cta, { backgroundColor: c.tint }, ctaDisabled && styles.ctaDisabled]}
          disabled={ctaDisabled}
          onPress={handleConfirm}
          testID="e2e_bonsai_multi_select_confirm"
        >
          <ThemedText style={[styles.ctaText, { color: ON_BRAND }]}>{ctaLabel}</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 4,
  },
  sub: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 15, textAlign: 'center' },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 96, gap: 8 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  cta: {
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { fontSize: 17, fontWeight: '500', letterSpacing: 0.5 },
});
