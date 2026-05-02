import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from '@/src/core/i18n/i18n';
import type { TranslationKey } from '@/src/core/i18n/locales/en';

import {
  archiveBonsai,
  getBonsaiWithSpecies,
  type BonsaiWithSpecies,
} from '@/src/db/bonsaiRepository';
import {
  canAddPhoto,
  deletePhoto,
  FREE_PHOTO_LIMIT_PER_BONSAI,
  getPhotosByBonsaiGroupedByYear,
  insertPhoto,
  setCoverPhoto,
  type PhotoRead,
} from '@/src/db/photoRepository';
import { createEvent, getActiveEventsByBonsai, softDeleteEvent } from '@/src/db/eventRepository';
import { EVENT_TYPES, type Event, type EventType } from '@/src/db/schema';
import { deletePhotoFile, persistPhotoFile } from '@/src/services/photoFileService';

/**
 * 盆栽詳細画面 (P2-01 PR-D + P2-02 PR-C)。
 * - 基本情報 + 写真年次タイムライン
 * - 写真追加 (カメラ + ライブラリ、Free 3 枚制限)
 * - 写真タップでアクション (カバー写真設定 / 削除)
 * - アーカイブ (Issue #14 AC4)
 */
export default function BonsaiDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useTranslation();
  const router = useRouter();
  const [item, setItem] = useState<BonsaiWithSpecies | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoGroups, setPhotoGroups] = useState<{ year: number; photos: PhotoRead[] }[]>([]);
  const [photoCount, setPhotoCount] = useState(0);
  const [events, setEvents] = useState<Event[]>([]);

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getBonsaiWithSpecies(id, lang);
      setItem(data);
      const groups = await getPhotosByBonsaiGroupedByYear(id);
      setPhotoGroups(groups);
      setPhotoCount(groups.reduce((sum, g) => sum + g.photos.length, 0));
      const evs = await getActiveEventsByBonsai(id);
      setEvents(evs);
    } finally {
      setLoading(false);
    }
  }, [id, lang]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const handleArchive = useCallback(() => {
    if (!item) return;
    Alert.alert(t('bonsaiArchiveConfirmTitle'), t('bonsaiArchiveConfirmDesc'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('bonsaiArchive'),
        style: 'destructive',
        onPress: async () => {
          await archiveBonsai(item.id);
          router.back();
        },
      },
    ]);
  }, [item, router, t]);

  // F-13 課金完成までは isPro=false 固定 (PR-C 暫定)
  const isPro = false;

  const pickAndSavePhoto = useCallback(
    async (source: 'camera' | 'library') => {
      if (!item) return;
      const allowed = await canAddPhoto(item.id, isPro);
      if (!allowed) {
        Alert.alert(
          t('photoLimitTitle'),
          t('photoLimitDesc').replace('{count}', String(FREE_PHOTO_LIMIT_PER_BONSAI)),
          [{ text: t('ok') }],
        );
        return;
      }

      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('photoPermissionTitle'), t('photoPermissionDesc'), [{ text: t('ok') }]);
        return;
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.85,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.85,
            });
      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      try {
        const { absoluteUri } = await persistPhotoFile(asset.uri, item.id);
        await insertPhoto({
          bonsaiId: item.id,
          absoluteUri,
          width: asset.width ?? null,
          height: asset.height ?? null,
        });
        await reload();
      } catch (err) {
        Alert.alert(t('error'), String(err));
      }
    },
    [item, isPro, t, reload],
  );

  const showAddPhotoMenu = useCallback(() => {
    Alert.alert(t('photoAddTitle'), undefined, [
      { text: t('photoAddCamera'), onPress: () => void pickAndSavePhoto('camera') },
      { text: t('photoAddLibrary'), onPress: () => void pickAndSavePhoto('library') },
      { text: t('cancel'), style: 'cancel' },
    ]);
  }, [pickAndSavePhoto, t]);

  const showPhotoActions = useCallback(
    (photo: PhotoRead) => {
      if (!item) return;
      Alert.alert(
        t('photoActionTitle'),
        undefined,
        [
          photo.isCover === 1
            ? null
            : {
                text: t('photoActionSetCover'),
                onPress: async () => {
                  await setCoverPhoto(photo.id, item.id);
                  await reload();
                },
              },
          {
            text: t('photoActionDelete'),
            style: 'destructive' as const,
            onPress: () => {
              Alert.alert(t('photoDeleteConfirmTitle'), t('photoDeleteConfirmDesc'), [
                { text: t('cancel'), style: 'cancel' },
                {
                  text: t('delete'),
                  style: 'destructive',
                  onPress: async () => {
                    await deletePhoto(photo.id);
                    await deletePhotoFile(photo.absoluteUri);
                    await reload();
                  },
                },
              ]);
            },
          },
          { text: t('cancel'), style: 'cancel' as const },
        ].filter((x): x is NonNullable<typeof x> => x !== null),
      );
    },
    [item, t, reload],
  );

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>{t('loading')}</ThemedText>
      </ThemedView>
    );
  }

  if (!item) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>{t('errorLoadFailed')}</ThemedText>
      </ThemedView>
    );
  }

  const remainingFreeSlots = isPro ? null : Math.max(0, FREE_PHOTO_LIMIT_PER_BONSAI - photoCount);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title">{item.name}</ThemedText>

        {item.species && (
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold">{t('bonsaiFieldSpecies')}</ThemedText>
            <ThemedText>{item.species.commonName}</ThemedText>
            <ThemedText style={styles.sci}>{item.species.scientificName}</ThemedText>
          </View>
        )}

        {item.style && (
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold">{t('bonsaiFieldStyle')}</ThemedText>
            <ThemedText>{t(`bonsaiStyle_${item.style}` as TranslationKey)}</ThemedText>
          </View>
        )}

        {item.acquiredAt && (
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold">{t('bonsaiFieldAcquiredAt')}</ThemedText>
            <ThemedText>{formatDate(item.acquiredAt, lang)}</ThemedText>
          </View>
        )}

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold">
            {t('bonsaiFieldPhotos')}
            {remainingFreeSlots !== null && ` (${photoCount} / ${FREE_PHOTO_LIMIT_PER_BONSAI})`}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('photoAddCta')}
            style={styles.photoAddBtn}
            onPress={showAddPhotoMenu}
          >
            <ThemedText style={styles.photoAddText}>+ {t('photoAddCta')}</ThemedText>
          </Pressable>

          {photoGroups.length === 0 && (
            <ThemedText style={styles.emptyPhotos}>{t('photoEmpty')}</ThemedText>
          )}

          {photoGroups.map((group) => (
            <View key={group.year} style={styles.yearBlock}>
              <ThemedText type="defaultSemiBold" style={styles.yearLabel}>
                {group.year}
              </ThemedText>
              <FlatList
                data={group.photos}
                horizontal
                keyExtractor={(p) => p.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photoRow}
                renderItem={({ item: photo }) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={photo.caption ?? `photo-${photo.id}`}
                    onPress={() => showPhotoActions(photo)}
                  >
                    <Image
                      source={{ uri: photo.absoluteUri }}
                      style={[styles.photoThumb, photo.isCover === 1 && styles.photoCover]}
                      contentFit="cover"
                    />
                  </Pressable>
                )}
              />
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold">{t('eventsTitle')}</ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('eventLogCta')}
            style={styles.eventAddBtn}
            onPress={() => showEventTypePicker()}
          >
            <ThemedText style={styles.eventAddText}>+ {t('eventLogCta')}</ThemedText>
          </Pressable>

          {events.length === 0 && (
            <ThemedText style={styles.emptyPhotos}>{t('eventEmpty')}</ThemedText>
          )}

          {events.slice(0, 50).map((ev) => (
            <Pressable
              key={ev.id}
              style={styles.eventRow}
              accessibilityRole="button"
              accessibilityLabel={t(`eventType_${ev.type}` as TranslationKey)}
              onLongPress={() => confirmDeleteEvent(ev)}
            >
              <View style={styles.eventRowMain}>
                <ThemedText type="defaultSemiBold">
                  {t(`eventType_${ev.type}` as TranslationKey)}
                </ThemedText>
                <ThemedText style={styles.eventRowDate}>
                  {formatDate(ev.occurredAtUtc, lang)}
                </ThemedText>
              </View>
              {ev.note && (
                <ThemedText style={styles.eventRowNote} numberOfLines={2}>
                  {ev.note}
                </ThemedText>
              )}
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold">{t('bonsaiFieldUpdatedAt')}</ThemedText>
          <ThemedText>{formatDate(item.updatedAt, lang)}</ThemedText>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('bonsaiArchive')}
          style={styles.archiveBtn}
          onPress={handleArchive}
        >
          <ThemedText style={styles.archiveText}>{t('bonsaiArchive')}</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );

  function showEventTypePicker() {
    if (!item) return;
    Alert.alert(
      t('eventLogCta'),
      t('eventTypePickerDesc'),
      [
        ...EVENT_TYPES.map((type) => ({
          text: t(`eventType_${type}` as TranslationKey),
          onPress: () => void logEvent(type),
        })),
        { text: t('cancel'), style: 'cancel' as const },
      ],
      { cancelable: true },
    );
  }

  async function logEvent(type: EventType) {
    if (!item) return;
    try {
      await createEvent({ bonsaiId: item.id, type, status: 'logged' });
      await reload();
    } catch (err) {
      Alert.alert(t('error'), String(err));
    }
  }

  function confirmDeleteEvent(ev: Event) {
    Alert.alert(t('eventDeleteConfirmTitle'), t('eventDeleteConfirmDesc'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await softDeleteEvent(ev.id);
          await reload();
        },
      },
    ]);
  }
}

function formatDate(iso: string, locale: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(locale === 'ja' ? 'ja-JP' : locale);
  } catch {
    return iso;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scrollContent: { padding: 16, gap: 16 },
  section: { gap: 8 },
  sci: { fontStyle: 'italic', opacity: 0.7, fontSize: 13 },
  archiveBtn: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8B2E2E',
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  archiveText: { color: '#8B2E2E', fontSize: 15, fontWeight: '500' },
  photoAddBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2E7D32',
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  photoAddText: { color: '#2E7D32', fontSize: 15, fontWeight: '500' },
  emptyPhotos: { opacity: 0.6, textAlign: 'center', paddingVertical: 12 },
  yearBlock: { gap: 8 },
  yearLabel: { fontSize: 13, opacity: 0.7 },
  photoRow: { gap: 8 },
  photoThumb: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  photoCover: {
    borderWidth: 2,
    borderColor: '#2E7D32',
  },
  eventAddBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2E7D32',
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  eventAddText: { color: '#2E7D32', fontSize: 15, fontWeight: '500' },
  eventRow: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 4,
  },
  eventRowMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  eventRowDate: { fontSize: 12, opacity: 0.6 },
  eventRowNote: { fontSize: 13, opacity: 0.8 },
});
