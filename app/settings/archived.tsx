/**
 * アーカイブ済み盆栽の一覧 + 復元 / 完全削除画面 (Sess44 PR-2/PR-3、ADR-0025 Sess44 Notes Amended)。
 *
 * 設定 →「アーカイブ済み盆栽」行 tap で開く Stack route。
 * - 各行: 写真サムネ + 名前 + 樹種 + 「いつアーカイブしたか」 + 「元に戻す」「完全に削除」
 * - 元に戻す: restoreBonsai (非破壊、緑) → 確認窓 → 一覧から除去
 * - 完全に削除: purgeBonsaiCompletely (破壊的、赤) → 確認窓 → 写真ファイル + 全 DB 行 + 検索索引を削除
 * - 確認窓は Home / 詳細画面と同一の ConfirmDialog (ADR-0036 D1 統一)
 */
import { Image } from 'expo-image';
import { Stack, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { PotIcon } from '@/src/components/icons';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  DANGER,
  ON_BRAND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import {
  getAllArchivedBonsai,
  getBonsaiWithSpecies,
  purgeBonsaiCompletely,
  restoreBonsai,
} from '@/src/db/bonsaiRepository';
import { getCoverPhoto } from '@/src/db/photoRepository';
import { BonsaiPlaceholder, hashSeed } from '@/src/features/bonsai/BonsaiPlaceholder';

type ArchivedRow = {
  id: string;
  name: string;
  speciesName: string | null;
  coverUri: string | null;
  archivedAt: string | null;
};

type PendingAction = { id: string; action: 'restore' | 'delete' } | null;

const THUMB = 64;

export default function ArchivedBonsaiScreen() {
  const { t, lang } = useTranslation();
  const c = useColors();
  const [rows, setRows] = useState<ArchivedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingAction>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const archived = await getAllArchivedBonsai();
      const built = await Promise.all(
        archived.map(async (b): Promise<ArchivedRow> => {
          const [withSpecies, cover] = await Promise.all([
            getBonsaiWithSpecies(b.id, lang),
            getCoverPhoto(b.id),
          ]);
          return {
            id: b.id,
            name: b.name,
            speciesName: withSpecies?.species?.commonName ?? null,
            coverUri: cover?.absoluteUri ?? null,
            archivedAt: b.archivedAt,
          };
        }),
      );
      setRows(built);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const handleConfirm = useCallback(async () => {
    if (pending == null) return;
    const { id, action } = pending;
    setPending(null);
    if (action === 'restore') {
      await restoreBonsai(id);
    } else {
      await purgeBonsaiCompletely(id);
    }
    await reload();
  }, [pending, reload]);

  const formatArchivedAt = useCallback(
    (iso: string | null): string => {
      if (iso == null) return '';
      try {
        const dateStr = new Date(iso).toLocaleDateString(lang === 'ja' ? 'ja-JP' : lang);
        return t('bonsaiArchivedAtLabel').replace('{date}', dateStr);
      } catch {
        return '';
      }
    },
    [lang, t],
  );

  const renderItem = useCallback(
    ({ item }: { item: ArchivedRow }) => (
      <View style={[styles.row, { borderColor: c.border }]} testID={`e2e_archived_row_${item.id}`}>
        <View style={styles.rowTop}>
          {item.coverUri != null && item.coverUri.length > 0 ? (
            <Image source={{ uri: item.coverUri }} style={styles.thumb} contentFit="cover" />
          ) : (
            <BonsaiPlaceholder w={THUMB} h={THUMB} radius={10} seed={hashSeed(item.id)} />
          )}
          <View style={styles.info}>
            <ThemedText type="defaultSemiBold" style={styles.name} numberOfLines={1}>
              {item.name}
            </ThemedText>
            {item.speciesName != null && item.speciesName.length > 0 ? (
              <ThemedText style={styles.species} numberOfLines={1}>
                {item.speciesName}
              </ThemedText>
            ) : null}
            <ThemedText style={styles.archivedAt} numberOfLines={1}>
              {formatArchivedAt(item.archivedAt)}
            </ThemedText>
          </View>
        </View>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('bonsaiRestore')}
            style={[styles.actionBtn, styles.restoreBtn]}
            onPress={() => setPending({ id: item.id, action: 'restore' })}
            testID={`e2e_archived_restore_${item.id}`}
          >
            <ThemedText style={styles.restoreText}>{t('bonsaiRestore')}</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('bonsaiDeleteForever')}
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => setPending({ id: item.id, action: 'delete' })}
            testID={`e2e_archived_delete_${item.id}`}
          >
            <ThemedText style={styles.deleteText}>{t('bonsaiDeleteForever')}</ThemedText>
          </Pressable>
        </View>
      </View>
    ),
    [c.border, formatArchivedAt, t],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']} testID="e2e_archived_screen">
      <Stack.Screen options={{ title: t('settingsArchiveTitle') }} />
      {!loading && rows.length === 0 ? (
        <View style={styles.emptyContent}>
          <PotIcon size={120} color={c.tint} />
          <ThemedText style={[styles.emptyTitle, { color: c.textSecondary }]}>
            {t('archivedEmptyTitle')}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
        />
      )}

      <ConfirmDialog
        visible={pending != null}
        title={
          pending?.action === 'delete'
            ? t('bonsaiDeleteForeverConfirmTitle')
            : t('bonsaiRestoreConfirmTitle')
        }
        description={pending?.action === 'delete' ? t('bonsaiDeleteForeverConfirmDesc') : undefined}
        confirmLabel={pending?.action === 'delete' ? t('bonsaiDeleteForever') : t('bonsaiRestore')}
        cancelLabel={t('cancel')}
        destructive={pending?.action === 'delete'}
        onConfirm={handleConfirm}
        onCancel={() => setPending(null)}
        testID="e2e_archived_confirm"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  listContent: { padding: 16, gap: 12 },
  row: {
    backgroundColor: BG_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  rowTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  thumb: { width: THUMB, height: THUMB, borderRadius: 10 },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 16, color: TEXT_PRIMARY },
  species: { fontSize: 13, color: TEXT_SECONDARY },
  archivedAt: { fontSize: 12, color: TEXT_SECONDARY },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 96,
    alignItems: 'center',
  },
  restoreBtn: { backgroundColor: BRAND_GREEN },
  restoreText: { color: ON_BRAND, fontWeight: '600' },
  deleteBtn: { borderWidth: 1, borderColor: DANGER, backgroundColor: 'transparent' },
  deleteText: { color: DANGER, fontWeight: '600' },
  emptyContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  emptyTitle: { fontSize: 16, textAlign: 'center' },
});
