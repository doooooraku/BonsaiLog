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
  BG_PRIMARY,
  BORDER_DEFAULT,
  BRAND_GREEN,
  DANGER,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';

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
import {
  countSameDayPlannedOrLoggedEvents,
  createEvent,
  EVENT_OVERLOAD_THRESHOLD,
  getActiveEventsByBonsai,
  softDeleteEvent,
} from '@/src/db/eventRepository';
import { getTzOffsetMin, nowUtc } from '@/src/core/datetime';
import { EVENT_TYPES, type Event, type EventType } from '@/src/db/schema';
import { LastWateredText } from '@/src/features/watering/LastWateredText';
import { WateringHeatmap } from '@/src/features/watering/WateringHeatmap';
import { getDaysSinceLastWatering, toLocalDateKey } from '@/src/features/watering/wateringHeatmap';
import {
  classifyWiringDuration,
  getDaysSinceWired,
  getScheduledUnwireAt,
  getWeeksSinceWired,
} from '@/src/features/wiring/wiringDuration';
import { deletePhotoFile, persistPhotoFile } from '@/src/services/photoFileService';
import { useProStore } from '@/src/stores/proStore';
import { useRecentBonsaiStore } from '@/src/stores/recentBonsaiStore';
import { useSettingsStore } from '@/src/stores/settingsStore';

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

  // F-04 Phase A: 「最後の水やりから X 日」(ADR-0013、純関数の説明は wateringHeatmap.ts)
  const daysSinceLastWatering = React.useMemo(() => {
    const tzOffsetMin = getTzOffsetMin();
    const todayLocalKey = toLocalDateKey(nowUtc() as string, tzOffsetMin);
    return getDaysSinceLastWatering(events, todayLocalKey, tzOffsetMin);
  }, [events]);

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

  // F-04 Phase H-1 (Issue #29 ADR-0013 §AC6-3): 「最近見た 3 本」用に focus 時 ID 記録
  const pushRecent = useRecentBonsaiStore((s) => s.pushRecent);

  useFocusEffect(
    useCallback(() => {
      void reload();
      if (id) pushRecent(id);
    }, [reload, id, pushRecent]),
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

  const isPro = useProStore((s) => s.isPro);

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
        {/* Claude Design `detail-screens.jsx` 整合: displayL 32pt NotoSerifJP_500Medium */}
        <ThemedText style={styles.bonsaiName}>{item.name}</ThemedText>

        {/* F-04 Phase A/B: 「最後の水やりから X 日」+ 過去 12 週ヒートマップ (ADR-0013) */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold">{t('wateringSectionTitle')}</ThemedText>
          <LastWateredText daysSinceLast={daysSinceLastWatering} />
          <WateringHeatmap
            events={events}
            todayLocalKey={toLocalDateKey(nowUtc() as string, getTzOffsetMin())}
            tzOffsetMin={getTzOffsetMin()}
            showSummary
          />
        </View>

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

          {events.slice(0, 50).map((ev) => {
            // F-07 Phase B (Issue #24, ADR-0014): wiring の場合のみ「装着期間 X 週 (経過済)」をアプリ内表示。
            // 通知は ADR-0014 で削除済 (鬱陶しいフィードバックを受けて事実表示に変更)。
            let wiringDurationLabel: string | null = null;
            // F-07 Phase C (Issue #24): payload_json の scheduled_unwire_at が設定済の場合に
            // 「外す予定: YYYY-MM-DD」を表示。F-02 status='planned' 統合は Phase D。
            let scheduledUnwireLabel: string | null = null;
            if (ev.type === 'wiring' && ev.status === 'logged') {
              const days = getDaysSinceWired(ev, new Date(nowUtc() as string));
              const weeks = getWeeksSinceWired(days);
              const kind = classifyWiringDuration(days);
              const key =
                kind === 'overdue' ? 'wiringDurationOverdueLabel' : 'wiringDurationWithinWeeks';
              wiringDurationLabel = t(key).replace('{weeks}', String(weeks));
              const scheduled = getScheduledUnwireAt(ev);
              if (scheduled) {
                scheduledUnwireLabel = t('wiringScheduledUnwireSet').replace(
                  '{date}',
                  scheduled.slice(0, 10),
                );
              }
            }
            return (
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
                {wiringDurationLabel && (
                  <ThemedText style={styles.eventRowNote} testID={`e2e_wiring_duration_${ev.id}`}>
                    {wiringDurationLabel}
                  </ThemedText>
                )}
                {scheduledUnwireLabel && (
                  <ThemedText style={styles.eventRowNote} testID={`e2e_wiring_scheduled_${ev.id}`}>
                    {scheduledUnwireLabel}
                  </ThemedText>
                )}
                {ev.note && (
                  <ThemedText style={styles.eventRowNote} numberOfLines={2}>
                    {ev.note}
                  </ThemedText>
                )}
              </Pressable>
            );
          })}
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

  /**
   * 作業を記録する。
   *
   * F-05 気遣い型ポップアップ (Issue #25、ADR-0011):
   * - 同じローカル日に planned + logged が既に 5 件以上ある場合 (= 6 件目)、
   *   登録前にソフトな声かけ Alert を表示。3 ボタンで:
   *   1. そのまま登録 (default): 普通に作成
   *   2. 一覧を見る: 登録せずに dismiss (詳細画面で既に履歴が見える)
   *   3. 今後表示しない: ポップアップを永続 OFF にしてから作成
   * - 設定 OFF (eventOverloadEnabled=false) なら閾値判定をスキップして即作成
   */
  async function logEvent(type: EventType) {
    if (!item) return;
    const overloadEnabled = useSettingsStore.getState().eventOverloadEnabled;
    if (overloadEnabled) {
      try {
        const occurredAtUtc = nowUtc() as string;
        const sameDayCount = await countSameDayPlannedOrLoggedEvents(occurredAtUtc);
        if (sameDayCount >= EVENT_OVERLOAD_THRESHOLD) {
          showEventOverloadPopup(type);
          return;
        }
      } catch {
        // 件数取得が失敗しても登録は止めない (記録のみ哲学、ADR-0011)
      }
    }
    await persistEvent(type);
  }

  function showEventOverloadPopup(type: EventType) {
    Alert.alert(
      t('eventOverloadTitle'),
      t('eventOverloadBody').replace('{count}', String(EVENT_OVERLOAD_THRESHOLD)),
      [
        {
          text: t('eventOverloadActionConfirm'),
          onPress: () => void persistEvent(type),
        },
        {
          text: t('eventOverloadActionViewList'),
          // 一覧を見る: 詳細画面下部に既に作業履歴一覧が表示されているため dismiss のみ。
          // ユーザーは確認後に再度「+ 作業を記録」をタップできる。
          style: 'cancel',
        },
        {
          text: t('eventOverloadActionNeverShow'),
          onPress: () => {
            useSettingsStore.getState().setEventOverloadEnabled(false);
            void persistEvent(type);
          },
        },
      ],
      { cancelable: true },
    );
  }

  async function persistEvent(type: EventType) {
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
  container: { flex: 1, backgroundColor: BG_PRIMARY },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scrollContent: { padding: 16, gap: 16 },
  section: { gap: 8 },
  // displayL 32/38 (design_system.md §3-3、Claude Design detail-screens.jsx)
  bonsaiName: {
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: 0.4,
  },
  sci: { fontStyle: 'italic', opacity: 0.7, fontSize: 13, color: TEXT_SECONDARY },
  archiveBtn: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DANGER,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  archiveText: { color: DANGER, fontSize: 15, fontWeight: '500' },
  photoAddBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND_GREEN,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  photoAddText: { color: BRAND_GREEN, fontSize: 15, fontWeight: '500' },
  emptyPhotos: { opacity: 0.6, textAlign: 'center', paddingVertical: 12 },
  yearBlock: { gap: 8 },
  yearLabel: { fontSize: 13, opacity: 0.7 },
  photoRow: { gap: 8 },
  photoThumb: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: BORDER_DEFAULT,
  },
  photoCover: {
    borderWidth: 2,
    borderColor: BRAND_GREEN,
  },
  eventAddBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND_GREEN,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  eventAddText: { color: BRAND_GREEN, fontSize: 15, fontWeight: '500' },
  eventRow: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_DEFAULT,
    gap: 4,
  },
  eventRowMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  eventRowDate: { fontSize: 12, opacity: 0.6 },
  eventRowNote: { fontSize: 13, opacity: 0.8 },
});
