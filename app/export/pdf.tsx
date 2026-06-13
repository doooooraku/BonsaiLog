/**
 * F-10 個別盆栽 PDF — 盆栽 picker 画面 (Issue #33 / ADR-0016)。
 *
 * 「1 本ずつの 1 ページレポート」は per-bonsai 選択が本質のため、Hub からは
 * Options Sheet ではなくこの picker へ遷移する。
 *
 * フロー (Sess55, ADR-0016 Amended):
 * 1. Pro 判定 (useProStore.isPro) — Free は Paywall 案内
 * 2. 盆栽カードをタップ = 単一選択 (ハイライト) → 下部「出力する」CTA が有効化
 * 3. CTA で prepareBonsaiPdf → generateBonsaiPdfWithFallback (3 段階フォールバック) → OS 共有
 *
 * 旧: カードタップ = 即 pdf-preview 画面へ遷移。中間の確認画面を廃止し、選択 + 下部 CTA に統一
 * (他エクスポート種別が「出力する」で即生成する動線と揃える)。生成中は GeneratingOverlay を表示。
 */
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FormScreenHeader } from '@/src/components/form/FormScreenHeader';
import { useTranslation } from '@/src/core/i18n/i18n';
// Sess108 PR-D (ADR-0062 Notes #5): BRAND_GREEN / ON_BRAND を撤去、 全 color は useColors() の c.tint / c.onTint 経由 (ADR-0052 dark cascade)。
import { useColors } from '@/src/core/theme/useColors';
import { getAllActiveBonsaiWithSpecies } from '@/src/db/bonsaiRepository';
import { getCoverPhoto } from '@/src/db/photoRepository';
import { BonsaiPlaceholder, hashSeed } from '@/src/features/bonsai/BonsaiPlaceholder';
import { prepareBonsaiPdf } from '@/src/features/export/exportFlow';
import { GeneratingOverlay } from '@/src/features/export/GeneratingOverlay';
import { generateBonsaiPdfWithFallback } from '@/src/features/export/pdfExport';
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
  const c = useColors();
  const insets = useSafeAreaInsets();
  const isPro = useProStore((s) => s.isPro);
  const goToPaywall = useGoToPaywall();
  const [items, setItems] = React.useState<CardData[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

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

  const handleExport = async () => {
    if (busy || !selectedId) return;
    if (!isPro) {
      goToPaywall(t('exportProRequiredTitle'), t('exportProRequiredBody'));
      return;
    }
    setBusy(true);
    try {
      const prep = await prepareBonsaiPdf(selectedId, lang, t);
      await generateBonsaiPdfWithFallback({
        buildHtmlForAttempt: prep.buildHtmlForAttempt,
        photoCount: prep.photoCount,
        shareDialogTitle: t('exportPdfShareTitle'),
      });
    } catch {
      Alert.alert(t('error'), t('exportPdfFailedBody'));
    } finally {
      setBusy(false);
    }
  };

  const generatingTitle = t('exportGeneratingNamed').replace(
    '{name}',
    t('exportHubBonsaiPdfTitle'),
  );

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_export_pdf_screen"
    >
      <FormScreenHeader title={t('exportHubBonsaiPdfTitle')} testID="e2e_export_pdf_header" />
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        ListHeaderComponent={<ThemedText style={styles.desc}>{t('exportPdfDesc')}</ThemedText>}
        ListEmptyComponent={
          <ThemedText style={styles.empty}>{t('bonsaiListEmptyTitle')}</ThemedText>
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const selected = item.id === selectedId;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.name}
              accessibilityState={{ selected }}
              testID={`e2e_export_pdf_${item.id}`}
              style={[
                styles.card,
                { backgroundColor: c.surface, borderColor: selected ? c.tint : c.border },
              ]}
              onPress={() => setSelectedId(item.id)}
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
                  styles.radio,
                  { borderColor: c.border },
                  selected && { borderColor: c.tint, backgroundColor: c.tint },
                ]}
              >
                {selected ? (
                  <ThemedText style={[styles.radioCheck, { color: c.onTint }]}>✓</ThemedText>
                ) : null}
              </View>
            </Pressable>
          );
        }}
      />

      <View
        style={[
          styles.footer,
          {
            backgroundColor: c.background,
            borderTopColor: c.border,
            paddingBottom: insets.bottom + 12,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('exportOptExport')}
          accessibilityState={{ disabled: !selectedId || busy }}
          testID="e2e_export_pdf_generate"
          style={[styles.cta, { backgroundColor: c.tint }, (!selectedId || busy) && styles.ctaBusy]}
          onPress={handleExport}
          disabled={!selectedId || busy}
        >
          {busy ? (
            <ActivityIndicator color={c.onTint} />
          ) : (
            <ThemedText style={[styles.ctaText, { color: c.onTint }]}>
              {t('exportOptExport')}
            </ThemedText>
          )}
        </Pressable>
      </View>

      <GeneratingOverlay
        visible={busy}
        format="PDF"
        title={generatingTitle}
        delayMs={0}
        onCancel={() => setBusy(false)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  // Sess66 PR6a: bg/border は inline c.* (dark cascade)。
  container: { flex: 1 },
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
  },
  thumbBox: { width: 56, height: 56, borderRadius: 10, overflow: 'hidden' },
  thumb: { width: 56, height: 56 },
  cardBody: { flex: 1, minWidth: 0, gap: 2 },
  cardTitle: { fontSize: 15, fontWeight: '500' },
  cardDesc: { fontSize: 12 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Sess108 PR-D: radioOn / cta / radioCheck / ctaText の color 系は inline c.tint / c.onTint に移動
  radioCheck: { fontSize: 14, fontWeight: '700' },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  cta: {
    minHeight: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBusy: { opacity: 0.6 },
  ctaText: { fontSize: 17, fontWeight: '600' },
});
