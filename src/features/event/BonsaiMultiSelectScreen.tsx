/**
 * 盆栽複数選択 modal screen (ADR-0025 Phase 2 案 B、 Sess8 PR-2)。
 *
 * 起動経路: 予定/記録タブ FAB tap (useBulkActionFlow) → router.push('/bonsai-multi-select?mode=...')
 *
 * 動作:
 * - 盆栽カード一覧 (compact card: 写真 + 名前 + 樹種 + チェック)
 * - selectMode true 固定、 user が tap で選択 toggle
 * - 下部 sticky CTA: mode='log' なら 「一括記録」、 mode='schedule' なら 「予定追加」
 * - 確定 → setBulkContext + router.replace('/bulk-work-picker?mode=...') で次 modal stack 遷移
 * - キャンセル: Stack header 左 close (modal dismiss) → 元タブに復帰
 */
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CheckIcon } from '@/src/components/icons';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  ON_BRAND,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { getAllActiveBonsaiWithSpecies, type BonsaiWithSpecies } from '@/src/db/bonsaiRepository';
import { getCoverPhoto } from '@/src/db/photoRepository';
import { BonsaiPlaceholder, hashSeed } from '@/src/features/bonsai/BonsaiPlaceholder';
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
  const params = useLocalSearchParams<{ mode?: 'schedule' | 'log' }>();
  const mode: 'schedule' | 'log' = params.mode === 'log' ? 'log' : 'schedule';

  const [items, setItems] = useState<CardData[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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
    router.replace(`/bulk-work-picker?mode=${mode}` as Href);
  }, [items, selectedIds, mode, router]);

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
          renderItem={({ item }) => {
            const selected = selectedIds.has(item.id);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={item.name}
                style={[
                  styles.card,
                  { backgroundColor: c.surface, borderColor: selected ? BRAND_GREEN : c.border },
                  selected && styles.cardSelected,
                ]}
                onPress={() => handleCardPress(item.id)}
                testID={`e2e_bonsai_multi_select_card_${item.id}`}
              >
                <View style={styles.thumbBox}>
                  {item.coverUri ? (
                    <Image source={{ uri: item.coverUri }} style={styles.thumb} />
                  ) : (
                    <BonsaiPlaceholder size={56} seed={hashSeed(item.id)} radius={10} />
                  )}
                </View>
                <View style={styles.cardBody}>
                  <ThemedText style={[styles.cardTitle, { color: c.text }]} numberOfLines={1}>
                    {item.name}
                  </ThemedText>
                  {item.speciesCommonName ? (
                    <ThemedText
                      style={[styles.cardDesc, { color: c.textSecondary }]}
                      numberOfLines={1}
                    >
                      {item.speciesCommonName}
                    </ThemedText>
                  ) : null}
                </View>
                <View
                  style={[
                    styles.checkBox,
                    {
                      backgroundColor: selected ? BRAND_GREEN : 'transparent',
                      borderColor: selected ? BRAND_GREEN : BORDER_DEFAULT,
                    },
                  ]}
                >
                  {selected ? <CheckIcon size={18} color={ON_BRAND} /> : null}
                </View>
              </Pressable>
            );
          }}
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: BG_SURFACE,
    borderColor: BORDER_DEFAULT,
  },
  cardSelected: {
    backgroundColor: 'rgba(31,58,46,0.06)',
  },
  thumbBox: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
  },
  thumb: { width: 56, height: 56 },
  cardBody: { flex: 1, minWidth: 0, gap: 2 },
  cardTitle: { fontSize: 15, fontWeight: '500' },
  cardDesc: { fontSize: 12 },
  checkBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
