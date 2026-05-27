/**
 * F-10 個別盆栽 PDF — 盆栽 picker 画面 (Issue #33 / ADR-0016)。
 *
 * 「1 本ずつの 1 ページレポート」は per-bonsai 選択が本質のため、Hub からは
 * Options Sheet ではなくこの picker へ遷移する。
 *
 * フロー:
 * 1. Pro 判定 (useProStore.isPro) — Free は Paywall 案内
 * 2. 盆栽を選ぶ (写真カード) → タップで pdf-preview 画面 (WebView プレビュー + 出力) へ遷移
 *
 * Sess49 追補3: 素テキスト行 → 予定/記録の「盆栽を選ぶ」と同じ写真カード (サムネ+名前+樹種)
 * に統一。単一選択のためカードタップ = 即プレビュー遷移。
 */
import { Image } from 'expo-image';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ChevronRightIcon } from '@/src/components/icons';
import { FormScreenHeader } from '@/src/components/form/FormScreenHeader';
import { useTranslation } from '@/src/core/i18n/i18n';
import { BG_PRIMARY, BG_SURFACE, BORDER_DEFAULT, TEXT_MUTED } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { getAllActiveBonsaiWithSpecies } from '@/src/db/bonsaiRepository';
import { getCoverPhoto } from '@/src/db/photoRepository';
import { BonsaiPlaceholder, hashSeed } from '@/src/features/bonsai/BonsaiPlaceholder';
import { useGoToPaywall } from '@/src/features/pro/useGoToPaywall';
import { useProStore } from '@/src/stores/proStore';

type CardData = {
  id: string;
  name: string;
  coverUri: string | null;
  speciesCommonName: string | null;
};

export default function ExportPdfScreen() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const isPro = useProStore((s) => s.isPro);
  const goToPaywall = useGoToPaywall();
  const [items, setItems] = React.useState<CardData[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      async function load() {
        try {
          const bonsai = await getAllActiveBonsaiWithSpecies(lang);
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
        } catch {
          if (!cancelled) setItems([]);
        }
      }
      void load();
      return () => {
        cancelled = true;
      };
    }, [lang]),
  );

  const handlePick = (id: string) => {
    if (!isPro) {
      goToPaywall(t('exportProRequiredTitle'), t('exportProRequiredBody'));
      return;
    }
    router.push(`/export/pdf-preview?bonsaiId=${id}` as Href);
  };

  return (
    <ThemedView style={styles.container} testID="e2e_export_pdf_screen">
      <FormScreenHeader title={t('exportHubBonsaiPdfTitle')} testID="e2e_export_pdf_header" />
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        ListHeaderComponent={<ThemedText style={styles.desc}>{t('exportPdfDesc')}</ThemedText>}
        ListEmptyComponent={
          <ThemedText style={styles.empty}>{t('bonsaiListEmptyTitle')}</ThemedText>
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.name}
            testID={`e2e_export_pdf_${item.id}`}
            style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => handlePick(item.id)}
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
                <ThemedText style={[styles.cardDesc, { color: c.textSecondary }]} numberOfLines={1}>
                  {item.speciesCommonName}
                </ThemedText>
              ) : null}
            </View>
            <ChevronRightIcon size={20} color={TEXT_MUTED} />
          </Pressable>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_PRIMARY },
  listContent: { padding: 16, gap: 8, paddingBottom: 32 },
  desc: { fontSize: 13, opacity: 0.7, marginBottom: 8, lineHeight: 18 },
  empty: { textAlign: 'center', opacity: 0.7, paddingVertical: 24 },
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
  thumbBox: { width: 56, height: 56, borderRadius: 10, overflow: 'hidden' },
  thumb: { width: 56, height: 56 },
  cardBody: { flex: 1, minWidth: 0, gap: 2 },
  cardTitle: { fontSize: 15, fontWeight: '500' },
  cardDesc: { fontSize: 12 },
});
