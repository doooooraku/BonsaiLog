import { Stack, useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EventIcon, MoreVerticalIcon } from '@/src/components/icons';
import { BonsaiCreateSheet } from '@/src/features/bonsai/BonsaiCreateSheet';
import { BonsaiHero } from '@/src/features/bonsai/BonsaiHero';
import { PhotoCard } from '@/src/features/bonsai/PhotoCard';
import { PhotoUndoBanner } from '@/src/features/bonsai/PhotoUndoBanner';
import {
  removePhotoAndNormalize,
  restorePhotoAtIndexAndNormalize,
  swapPhotos,
} from '@/src/features/bonsai/photoOrderUtils';
import { useTranslation } from '@/src/core/i18n/i18n';
import type { TranslationKey } from '@/src/core/i18n/locales/en';
import { BORDER_DEFAULT, BRAND_GREEN, DANGER, TEXT_SECONDARY } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';

import {
  archiveBonsai,
  getBonsaiWithSpecies,
  type BonsaiWithSpecies,
} from '@/src/db/bonsaiRepository';
import {
  deletePhoto,
  FREE_PHOTO_LIMIT_PER_BONSAI,
  getPhotoCountByBonsai,
  getPhotosByBonsai,
  insertPhoto,
  reorderPhotos,
  setCoverPhoto,
  updatePhotoCaption,
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
import { type Event, type EventType } from '@/src/db/schema';
import { WorkLogConfirmSheet, type WorkLogPayload } from '@/src/features/event/WorkLogConfirmSheet';
import { WorkPickerSheet } from '@/src/features/event/WorkPickerSheet';
import { LastWateredText } from '@/src/features/watering/LastWateredText';
import { getDaysSinceLastWatering, toLocalDateKey } from '@/src/features/watering/wateringHeatmap';
import type BottomSheet from '@gorhom/bottom-sheet';
import { WiringPeriodDisplay } from '@/src/features/wiring/WiringPeriodDisplay';
import {
  classifyWiringDuration,
  getDaysSinceWired,
  getScheduledUnwireAt,
  getWeeksSinceWired,
} from '@/src/features/wiring/wiringDuration';
import { deletePhotoFile, persistPhotoFile } from '@/src/services/photoFileService';
import { useGoToPaywall } from '@/src/features/pro/useGoToPaywall';
import { useProStore } from '@/src/stores/proStore';
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
  const c = useColors();
  const [item, setItem] = useState<BonsaiWithSpecies | null>(null);
  const [loading, setLoading] = useState(true);
  // Repolog 風 photoCard 縦リスト (orderIndex 順、年次グループ化は廃止)
  const [photos, setPhotos] = useState<PhotoRead[]>([]);
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [events, setEvents] = useState<Event[]>([]);
  const photoCount = photos.length;
  // 削除 undo (Repolog 流用): 5 秒以内に「元に戻す」で復元、超過 / 別操作で finalize → DB 物理削除。
  type PendingDeletion = {
    photo: PhotoRead;
    previousIndex: number;
  };
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);
  const pendingDeletionTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDeletionRef = React.useRef<PendingDeletion | null>(null);
  // ADR-0020 §Notes Amended (2026-05-09): Hero + 3 Tabs (作業履歴 / 予定タイムライン / 基本情報)
  // mockup v1.0 detail-screens.jsx BonsaiDetailScreen の initialTab='history' 整合
  // 旧 photos タブは廃止、写真機能は history タブに統合 (A6 で _HistoryPhotos 正式化予定)
  // 旧 timeline タブは廃止、予定機能は新 timeline タブで A7 で実装予定 (本 PR は placeholder)
  // 旧 timeline タブの「水やり概要 / 取得日 / 更新日 / アーカイブ」は basic タブに移動 (A5 で
  // CreateBonsaiScreen embed に正式化予定)
  const [activeTab, setActiveTab] = useState<'history' | 'timeline' | 'basic'>('history');

  // ADR-0020 Phase 4: 作業記録 BottomSheet (Claude Design WorkPickerSheet 整合)
  const workPickerRef = React.useRef<BottomSheet>(null);
  // ADR-0020 v1.x-3: 作業記録 詳細 form BottomSheet (Claude Design WorkLogConfirmSheet 整合)
  const workConfirmRef = React.useRef<BottomSheet>(null);
  // 基本情報 編集 BottomSheet (BonsaiCreateSheet edit モード、mockup CreateBonsaiScreen 整合)
  const bonsaiEditRef = React.useRef<BottomSheet>(null);
  const [pendingWorkType, setPendingWorkType] = useState<EventType | null>(null);
  const FORM_TYPES: readonly EventType[] = ['watering', 'pruning', 'wiring'];
  const handleWorkPickerSelect = React.useCallback(
    (type: EventType) => {
      workPickerRef.current?.close();
      // 詳細 form 対応 type は WorkLogConfirmSheet に進む、それ以外は即時記録
      if (FORM_TYPES.includes(type)) {
        setPendingWorkType(type);
        setTimeout(() => workConfirmRef.current?.snapToIndex(0), 50);
      } else {
        void logEvent(type);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item],
  );
  const handleWorkLogSubmit = React.useCallback(
    (payload: WorkLogPayload) => {
      workConfirmRef.current?.close();
      void persistEventWithPayload(payload);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item],
  );

  // F-04 Phase A: 「最後の水やりから X 日」(ADR-0013、純関数の説明は wateringHeatmap.ts)
  const daysSinceLastWatering = React.useMemo(() => {
    const tzOffsetMin = getTzOffsetMin();
    const todayLocalKey = toLocalDateKey(nowUtc() as string, tzOffsetMin);
    return getDaysSinceLastWatering(events, todayLocalKey, tzOffsetMin);
  }, [events]);

  // Claude Design `detail-screens.jsx` DetailHero 整合 (Phase B-2): cover photo を抽出
  // (early return より前で呼ぶ — react-hooks/rules-of-hooks)
  const coverUri = React.useMemo(() => {
    const cover = photos.find((p) => p.isCover === 1);
    return cover?.absoluteUri ?? null;
  }, [photos]);

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getBonsaiWithSpecies(id, lang);
      setItem(data);
      const list = await getPhotosByBonsai(id);
      // pending 削除中の photo は state に復活させない (DB にはまだ存在するが UI 上は削除済の見た目)。
      // タイマー満了 or unmount で finalize → DB 削除されるまでの一時的な不可視化。
      const pending = pendingDeletionRef.current;
      const filtered = pending != null ? list.filter((p) => p.id !== pending.photo.id) : list;
      setPhotos(filtered);
      // captions の controlled 値を DB の最新値で初期化 (pending 含めて更新、復元時に caption も戻る)。
      const captionMap: Record<string, string> = {};
      list.forEach((p) => {
        captionMap[p.id] = p.caption ?? '';
      });
      setCaptions(captionMap);
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

  const isPro = useProStore((s) => s.isPro);
  // A9 PR: ProLockModal 整合 (Free ユーザーが PDF 等の Pro 限定機能をタップした際の Paywall 遷移)
  const goToPaywall = useGoToPaywall();

  const pickAndSavePhoto = useCallback(
    async (source: 'camera' | 'library') => {
      if (!item) return;
      // Free 制限: 残枠計算 (Pro は無制限、Free は 3 - currentCount)。
      const currentCount = await getPhotoCountByBonsai(item.id);
      const remaining = isPro
        ? Number.POSITIVE_INFINITY
        : Math.max(0, FREE_PHOTO_LIMIT_PER_BONSAI - currentCount);
      if (remaining === 0) {
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

      // ライブラリは複数選択対応 (Repolog 流用、selectionLimit: 0 = OS 上限まで)。
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.85,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsMultipleSelection: true,
              selectionLimit: 0,
              quality: 0.85,
            });
      if (result.canceled || !result.assets || result.assets.length === 0) return;

      // 残枠超過時は先頭から remaining 枚のみ受け入れ、超過分を Alert で告知 (Repolog resolvePhotoAddLimit 流用)。
      const assets = result.assets;
      const acceptedCount = isPro ? assets.length : Math.min(assets.length, remaining);
      const accepted = assets.slice(0, acceptedCount);
      const skipped = assets.length - accepted.length;

      try {
        for (const asset of accepted) {
          const { absoluteUri } = await persistPhotoFile(asset.uri, item.id);
          await insertPhoto({
            bonsaiId: item.id,
            absoluteUri,
            width: asset.width ?? null,
            height: asset.height ?? null,
          });
        }
        if (skipped > 0) {
          Alert.alert(
            t('photoLimitTitle'),
            t('photoLimitPartialAdded')
              .replace('{added}', String(accepted.length))
              .replace('{skipped}', String(skipped)),
            [{ text: t('ok') }],
          );
        }
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

  // PhotoCard 並び替え (↑↓ ボタン): 即時 state 更新 + DB 反映 (reorderPhotos)。
  const handleMovePhoto = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (!item) return;
      const next = swapPhotos(photos, fromIndex, toIndex);
      if (next === photos) return;
      setPhotos(next);
      try {
        await reorderPhotos(
          item.id,
          next.map((p) => p.id),
        );
      } catch (err) {
        console.warn('[BonsaiDetail] reorder failed:', err);
      }
    },
    [photos, item],
  );

  // PhotoCard caption: controlled 入力 (state) + blur で DB 反映。
  const handleCaptionChange = useCallback((photoId: string, text: string) => {
    setCaptions((prev) => ({ ...prev, [photoId]: text }));
  }, []);
  const handleCaptionBlur = useCallback(
    async (photoId: string) => {
      const text = captions[photoId] ?? '';
      try {
        await updatePhotoCaption(photoId, text.length > 0 ? text : null);
      } catch (err) {
        console.warn('[BonsaiDetail] caption save failed:', err);
      }
    },
    [captions],
  );

  // PhotoCard ★ ボタン: カバー写真に設定。
  const handleSetCover = useCallback(
    async (photoId: string) => {
      if (!item) return;
      await setCoverPhoto(photoId, item.id);
      await reload();
    },
    [item, reload],
  );

  // タイマー / pending state クリア共通ヘルパー (Repolog 流用)。
  const clearPendingDeletionTimer = useCallback(() => {
    if (pendingDeletionTimerRef.current != null) {
      clearTimeout(pendingDeletionTimerRef.current);
      pendingDeletionTimerRef.current = null;
    }
  }, []);

  // 削除確定: DB 物理削除 + ファイル削除 (タイマー満了 or 別操作 or unmount で呼ばれる)。
  const finalizePendingDeletion = useCallback(async () => {
    clearPendingDeletionTimer();
    const pending = pendingDeletionRef.current;
    if (pending == null) return;
    pendingDeletionRef.current = null;
    setPendingDeletion(null);
    try {
      await deletePhoto(pending.photo.id);
      await deletePhotoFile(pending.photo.absoluteUri);
    } catch (err) {
      console.warn('[BonsaiDetail] delete finalize failed:', err);
    }
  }, [clearPendingDeletionTimer]);

  // PhotoCard 削除ボタン: Alert 確認 → 即時 state 除去 + undo banner 表示 (5 秒で確定)。
  const handleDeletePhoto = useCallback(
    (photo: PhotoRead) => {
      Alert.alert(t('photoDeleteConfirmTitle'), t('photoDeleteConfirmDesc'), [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            // 既存の pending があれば先に finalize (連続削除対応)。
            await finalizePendingDeletion();
            // photos 内の現在 index を保存 (undo で同じ位置に戻すため)。
            const previousIndex = photos.findIndex((p) => p.id === photo.id);
            if (previousIndex < 0) return;
            // 楽観的 state 更新 (UI 反映を即時化)。
            setPhotos((prev) => removePhotoAndNormalize(prev, photo.id));
            const pending: PendingDeletion = { photo, previousIndex };
            pendingDeletionRef.current = pending;
            setPendingDeletion(pending);
            // 5 秒後に自動 finalize。
            clearPendingDeletionTimer();
            pendingDeletionTimerRef.current = setTimeout(() => {
              void finalizePendingDeletion();
            }, 5000);
          },
        },
      ]);
    },
    [t, photos, finalizePendingDeletion, clearPendingDeletionTimer],
  );

  // 「元に戻す」: タイマーキャンセル + state を pending 前の位置に復元。
  const handleUndoDeletion = useCallback(() => {
    clearPendingDeletionTimer();
    const pending = pendingDeletionRef.current;
    if (pending == null) return;
    pendingDeletionRef.current = null;
    setPendingDeletion(null);
    setPhotos((prev) =>
      restorePhotoAtIndexAndNormalize(prev, pending.photo, pending.previousIndex),
    );
  }, [clearPendingDeletionTimer]);

  // unmount / 画面離脱時: pending を確定して clean state で離脱。
  React.useEffect(() => {
    return () => {
      clearPendingDeletionTimer();
      // 画面離脱時に DB 削除を確定 (banner が見えなくなる前に finalize)。
      void finalizePendingDeletion();
    };
  }, [clearPendingDeletionTimer, finalizePendingDeletion]);

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
    <ThemedView style={[styles.container, { backgroundColor: c.background }]}>
      {/* mockup v1.0 detail-screens.jsx DetailHeader 整合: Header 右 ⋮ メニュー (A8 で簡易 Alert ベース実装、A9 で ProLockModal、本格 overlay panel は別 Issue 予定) */}
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('detailMoreMenu')}
              testID="e2e_detail_more_menu_button"
              onPress={() => {
                Alert.alert(t('detailMoreMenu'), undefined, [
                  {
                    text: t('detailBasicEdit'),
                    onPress: () => setActiveTab('basic'),
                  },
                  {
                    text: t('detailMenuExportPdf'),
                    onPress: () => {
                      // A9 PR: ProLockModal 整合 = Free なら useGoToPaywall で Paywall 画面に遷移、Pro は PDF 出力 (実装は Issue 起票予定)
                      if (isPro) {
                        Alert.alert(t('detailMenuExportPdf'), undefined, [{ text: t('ok') }]);
                      } else {
                        goToPaywall(t('detailExportProTitle'), t('detailExportProDesc'));
                      }
                    },
                  },
                  {
                    text: t('bonsaiArchive'),
                    onPress: handleArchive,
                    style: 'destructive',
                  },
                  { text: t('cancel'), style: 'cancel' },
                ]);
              }}
              style={styles.headerMenuButton}
              hitSlop={8}
            >
              <MoreVerticalIcon size={22} color={c.text} />
            </Pressable>
          ),
        }}
      />
      <BonsaiHero
        coverUri={coverUri}
        bonsaiName={item.name}
        speciesCommonName={item.species?.commonName ?? null}
        speciesScientificName={item.species?.scientificName ?? null}
        styleLabel={item.style ? t(`bonsaiStyle_${item.style}` as TranslationKey) : null}
      />

      {/* ADR-0020 §Notes Amended (2026-05-09): DetailTabs 順序 = 作業履歴 / 予定 / 基本情報 (mockup v1.0 整合) */}
      <View style={styles.detailTabs}>
        {(['history', 'timeline', 'basic'] as const).map((tab) => {
          const on = activeTab === tab;
          const labelKey =
            tab === 'history'
              ? 'detailTabHistory'
              : tab === 'timeline'
                ? 'detailTabPlanTimeline'
                : 'detailTabBasic';
          return (
            <Pressable
              key={tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={t(labelKey)}
              style={[styles.detailTab, on && styles.detailTabOn]}
              onPress={() => setActiveTab(tab)}
              testID={`e2e_detail_tab_${tab}`}
            >
              <ThemedText
                style={[
                  styles.detailTabText,
                  on ? styles.detailTabTextOn : { color: c.textSecondary },
                ]}
              >
                {t(labelKey)}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* basic Tab 第 1 部分: 基本情報 read-only 表示 (A5 PR、BonsaiBasicForm 抽出 +
            CreateBonsaiScreen embed 化は別 Issue で v1.x 実装予定) */}
        {activeTab === 'basic' && (
          <>
            <View style={styles.section}>
              <ThemedText type="subtitle">{t('bonsaiFieldName')}</ThemedText>
              <ThemedText>{item.name}</ThemedText>
            </View>
            {item.species && (
              <View style={styles.section}>
                <ThemedText type="subtitle">{t('bonsaiFieldSpecies')}</ThemedText>
                <ThemedText>{item.species.commonName}</ThemedText>
                {item.species.scientificName ? (
                  <ThemedText style={styles.basicScientific}>
                    {item.species.scientificName}
                  </ThemedText>
                ) : null}
              </View>
            )}
            {item.style && (
              <View style={styles.section}>
                <ThemedText type="subtitle">{t('bonsaiFieldStyle')}</ThemedText>
                <ThemedText>{t(`bonsaiStyle_${item.style}` as TranslationKey)}</ThemedText>
              </View>
            )}
            {item.acquiredAt && (
              <View style={styles.section}>
                <ThemedText type="subtitle">{t('bonsaiFieldAcquiredAt')}</ThemedText>
                <ThemedText>{formatDate(item.acquiredAt, lang)}</ThemedText>
              </View>
            )}
          </>
        )}

        {/*
         * A6 (Detail mockup 完全整合 全 10 PR の 6/10) — _buildChipsFor 14 作業 + _HistoryChip /
         * _ChipRow / _HistoryPhotos の本格実装は Issue #296 で track 化 (推定 4 サブ PR)。
         * 本 PR は Issue 起票 + コメント反映のみで A6 placeholder。
         */}
        {/* history Tab 第 0 部分: 水やり概要 (旧 timeline から history 最上部に移動、A5 PR) */}
        {activeTab === 'history' && (
          <View style={styles.section}>
            <ThemedText type="subtitle">{t('wateringSectionTitle')}</ThemedText>
            <LastWateredText daysSinceLast={daysSinceLastWatering} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('wateringHistoryLinkTitle')}
              style={styles.wateringHistoryLink}
              onPress={() => router.push(`/(tabs)/bonsai/${item.id}/watering` as Href)}
              testID="e2e_open_watering_history"
            >
              <ThemedText style={styles.wateringHistoryLinkText}>
                {t('wateringHistoryLinkTitle')}
              </ThemedText>
              <ThemedText style={styles.wateringHistoryLinkArrow}>{'›'}</ThemedText>
            </Pressable>
          </View>
        )}

        {/* history Tab 第 1 部分: 写真追加 + photoCard 縦リスト (Repolog UI 流用、年次グループ廃止)。
            複数選択 (allowsMultipleSelection) + ↑↓ 並び替え + caption 編集 + ★ カバー設定 + 削除。 */}
        {activeTab === 'history' && (
          <View style={styles.section}>
            <ThemedText type="subtitle">
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

            {photos.length === 0 && (
              <ThemedText style={styles.emptyPhotos}>{t('photoEmpty')}</ThemedText>
            )}

            {photos.map((photo, idx) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                index={idx}
                total={photos.length}
                caption={captions[photo.id] ?? ''}
                onCaptionChange={(text) => handleCaptionChange(photo.id, text)}
                onCaptionBlur={() => void handleCaptionBlur(photo.id)}
                onMoveUp={() => void handleMovePhoto(idx, idx - 1)}
                onMoveDown={() => void handleMovePhoto(idx, idx + 1)}
                onDelete={() => handleDeletePhoto(photo)}
                onSetCover={() => void handleSetCover(photo.id)}
              />
            ))}

            {/* 削除 undo Banner (Repolog 流用、5 秒以内に「元に戻す」で復元)。 */}
            {pendingDeletion != null && (
              <PhotoUndoBanner
                text={t('photoDeletedBanner')}
                actionLabel={t('photoUndoLabel')}
                onUndo={handleUndoDeletion}
              />
            )}
          </View>
        )}

        {/* 作業履歴 Tab: 作業記録 CTA + events 一覧 */}
        {activeTab === 'history' && (
          <View style={styles.section}>
            <ThemedText type="subtitle">{t('eventsTitle')}</ThemedText>
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
              // F-07 Phase B (Issue #24, ADR-0014 §48-49): wiring の場合のみ
              // 「装着期間: X 週 (経過済 / あと N 週 / 完了)」をアプリ内表示。
              // 通知は ADR-0014 で削除済 (鬱陶しいフィードバックを受けて事実表示に変更)。
              // 完了状態 (AC10-1 「完了」): この wiring event 以後の同盆栽 unwiring event 有無で判定。
              let wiringDuration: {
                weeks: number;
                kind: 'within' | 'overdue';
                isUnwired: boolean;
              } | null = null;
              // F-07 Phase C (Issue #24): payload_json の scheduled_unwire_at が設定済の場合に
              // 「外す予定: YYYY-MM-DD」を表示。F-02 status='planned' 統合は Phase D。
              let scheduledUnwireLabel: string | null = null;
              if (ev.type === 'wiring' && ev.status === 'logged') {
                const days = getDaysSinceWired(ev, new Date(nowUtc() as string));
                const weeks = getWeeksSinceWired(days);
                const kind = classifyWiringDuration(days);
                const isUnwired = events.some(
                  (other) =>
                    other.type === 'unwiring' &&
                    other.status === 'logged' &&
                    other.occurredAtUtc >= ev.occurredAtUtc,
                );
                wiringDuration = { weeks, kind, isUnwired };
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
                  {/* Claude Design `detail-screens.jsx` HistoryTab 整合: icon 40×40 box + content */}
                  <View style={styles.eventIconBox}>
                    <EventIcon type={ev.type as EventType} size={20} />
                  </View>
                  <View style={styles.eventContent}>
                    <View style={styles.eventRowMain}>
                      <ThemedText style={styles.eventLabel}>
                        {t(`eventType_${ev.type}` as TranslationKey)}
                      </ThemedText>
                      <ThemedText style={styles.eventRowDate}>
                        {formatDate(ev.occurredAtUtc, lang)}
                      </ThemedText>
                    </View>
                    {wiringDuration && (
                      <WiringPeriodDisplay
                        weeks={wiringDuration.weeks}
                        kind={wiringDuration.kind}
                        isUnwired={wiringDuration.isUnwired}
                        style={styles.eventRowNote}
                        testID={`e2e_wiring_duration_${ev.id}`}
                      />
                    )}
                    {scheduledUnwireLabel && (
                      <ThemedText
                        style={styles.eventRowNote}
                        testID={`e2e_wiring_scheduled_${ev.id}`}
                      >
                        {scheduledUnwireLabel}
                      </ThemedText>
                    )}
                    {ev.note && (
                      <ThemedText style={styles.eventRowNote} numberOfLines={2}>
                        {ev.note}
                      </ThemedText>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* basic Tab 第 2 部分: 更新日 + 編集ボタン + アーカイブ。
            編集ボタンは BonsaiCreateSheet を edit モード (editingBonsai prop) で起動 — mockup
            CreateBonsaiScreen の prefill prop 整合 (create / edit 単一コンポーネント方針)。 */}
        {activeTab === 'basic' && (
          <>
            <View style={styles.section}>
              <ThemedText type="subtitle">{t('bonsaiFieldUpdatedAt')}</ThemedText>
              <ThemedText>{formatDate(item.updatedAt, lang)}</ThemedText>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('detailBasicEdit')}
              style={styles.basicEditButton}
              onPress={() => bonsaiEditRef.current?.snapToIndex(0)}
              testID="e2e_detail_basic_edit_button"
            >
              <ThemedText style={styles.basicEditButtonText}>{t('detailBasicEdit')}</ThemedText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('bonsaiArchive')}
              style={styles.archiveBtn}
              onPress={handleArchive}
            >
              <ThemedText style={styles.archiveText}>{t('bonsaiArchive')}</ThemedText>
            </Pressable>
          </>
        )}

        {/*
         * A7 (Detail mockup 完全整合 全 10 PR の 7/10) — TimelineTab + AddScheduleFlow +
         * _PickDateTimeSheet + _DateTimePicker の本格実装は Issue #298 で track 化
         * (推定 4 サブ PR)。本 PR は placeholder text の文言維持のみ。
         */}
        {activeTab === 'timeline' && (
          <View style={styles.section}>
            <ThemedText style={styles.placeholderText}>
              {t('detailPlanTimelinePlaceholder')}
            </ThemedText>
          </View>
        )}
      </ScrollView>

      {/* ADR-0020 Phase 4: 作業記録 BottomSheet (Claude Design WorkPickerSheet 整合) */}
      <WorkPickerSheet
        ref={workPickerRef}
        index={-1}
        bonsaiName={item.name}
        isPine={
          // 樹種から松類か判定 (commonName に「松」/ "Pine" / "Pinus")。簡易判定、Phase 12 で species.category に格納検討。
          (item.species?.commonName ?? '').toLowerCase().includes('pine') ||
          (item.species?.scientificName ?? '').toLowerCase().includes('pinus') ||
          (item.species?.commonName ?? '').includes('松')
        }
        onSelect={handleWorkPickerSelect}
        onClose={() => {
          /* close 時に追加処理が必要なら ここで */
        }}
      />

      {/* ADR-0020 v1.x-3: 作業記録 詳細 form BottomSheet (water / pruning / wiring) */}
      <WorkLogConfirmSheet
        ref={workConfirmRef}
        index={-1}
        bonsaiName={item.name}
        selectedType={pendingWorkType}
        onSubmit={handleWorkLogSubmit}
        onClose={() => setPendingWorkType(null)}
      />

      {/* 基本情報 編集 BottomSheet (BonsaiCreateSheet edit モード、mockup CreateBonsaiScreen prefill 整合) */}
      <BonsaiCreateSheet
        bottomSheetRef={bonsaiEditRef}
        editingBonsai={item}
        onCreated={() => {
          /* edit モードでは呼ばれない */
        }}
        onUpdated={() => {
          void reload();
        }}
      />
    </ThemedView>
  );

  /** v1.x-3: 詳細 form から payload + note を受け取り createEvent で保存。 */
  async function persistEventWithPayload(payload: WorkLogPayload) {
    if (!item) return;
    try {
      await createEvent({
        bonsaiId: item.id,
        type: payload.type,
        status: 'logged',
        note: payload.note.length > 0 ? payload.note : undefined,
        payload: payload.payload,
      });
      await reload();
    } catch (err) {
      Alert.alert(t('error'), String(err));
    }
  }

  function showEventTypePicker() {
    if (!item) return;
    workPickerRef.current?.snapToIndex(0);
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
  // backgroundColor は useColors の c.background で動的指定 (light/dark 両対応)
  container: { flex: 1 },
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
  // ADR-0020 v1.x-2: DetailTabs (Claude Design detail-screens.jsx)
  detailTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER_DEFAULT,
  },
  detailTab: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  detailTabOn: { borderBottomColor: BRAND_GREEN },
  detailTabText: { fontSize: 14, fontWeight: '400' },
  detailTabTextOn: { color: BRAND_GREEN, fontWeight: '500' },
  // ADR-0020 Phase 3: 「水やり履歴」リンク (詳細画面 → watering 画面遷移)
  wateringHistoryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
    minHeight: 48,
  },
  wateringHistoryLinkText: { fontSize: 15, fontWeight: '500', color: BRAND_GREEN },
  wateringHistoryLinkArrow: { fontSize: 20, color: TEXT_SECONDARY },
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
  // Claude Design HistoryTab 整合: 16 padding + 14 gap + minHeight 80、icon 40 box
  eventRow: {
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    minHeight: 80,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_DEFAULT,
  },
  eventIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  eventContent: { flex: 1, minWidth: 0 },
  eventRowMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  // bodyL 16/24 + Medium (Claude Design fontSize 16, weight 500)
  eventLabel: {
    fontFamily: 'NotoSansJP_600SemiBold',
    fontSize: 16,
    lineHeight: 24,
  },
  // mono 風 12pt + letterSpacing (Inter で代替)
  eventRowDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    letterSpacing: 0.7,
    color: TEXT_SECONDARY,
  },
  eventRowNote: { fontSize: 13, lineHeight: 20, color: TEXT_SECONDARY, marginTop: 4 },
  headerMenuButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 14,
    lineHeight: 22,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    paddingVertical: 24,
  },
  basicScientific: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    fontStyle: 'italic',
    marginTop: 2,
  },
  basicEditButton: {
    marginHorizontal: 16,
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  basicEditButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: BRAND_GREEN,
  },
});
