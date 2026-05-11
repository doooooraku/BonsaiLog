import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EventIcon, MoreVerticalIcon } from '@/src/components/icons';
import {
  BonsaiBasicFormFields,
  BonsaiBasicFormPickerSheets,
  type BonsaiBasicFormState,
  useBonsaiBasicForm,
} from '@/src/features/bonsai/BonsaiBasicForm';
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
import {
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  DANGER,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
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
import { buildHistoryChips } from '@/src/features/event/buildHistoryChips';
import {
  groupContinuousEvents,
  groupContinuousEventsAsc,
  type EventGroupEntry,
} from '@/src/features/event/groupContinuousEvents';
import { HistoryChipRow } from '@/src/features/event/HistoryChip';
import { WorkLogConfirmSheet, type WorkLogPayload } from '@/src/features/event/WorkLogConfirmSheet';
import { WorkPickerSheet } from '@/src/features/event/WorkPickerSheet';
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
  // Issue #298 Phase 2: 予定追加 BottomSheet (WorkPickerSheet を mode 切替で再利用)
  const schedulePickerRef = React.useRef<BottomSheet>(null);
  const [pendingScheduleType, setPendingScheduleType] = useState<EventType | null>(null);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
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

  // Issue #298 Phase 2: 予定追加フロー (3 step を 2 step に簡略化、確認ステップ省略)
  // Step 1: WorkPickerSheet (再利用、titleOverrideKey='addScheduleTitle') で作業選択
  // Step 2: DateTimePicker (mode='date') で日付選択 → createEvent({ status: 'planned' })
  const handleSchedulePickerSelect = React.useCallback((type: EventType) => {
    schedulePickerRef.current?.close();
    setPendingScheduleType(type);
    setTimeout(() => setShowSchedulePicker(true), 200);
  }, []);

  const handleScheduleDateSelect = React.useCallback(
    async (date: Date | null) => {
      setShowSchedulePicker(false);
      if (!date || !pendingScheduleType || !id) {
        setPendingScheduleType(null);
        return;
      }
      try {
        await createEvent({
          bonsaiId: id,
          type: pendingScheduleType,
          status: 'planned',
          occurredAtUtc: date.toISOString(),
        });
        setPendingScheduleType(null);
        await reload();
      } catch (err) {
        Alert.alert(t('error'), String(err));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pendingScheduleType, id, t],
  );

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

  // Issue #439: 基本情報タブの inline 編集フォーム state (BonsaiCreateSheet と同じフック)。
  // 親で hook を呼ぶことで、picker BottomSheet を画面 root に配置できる (ScrollView 内 nest 禁止)。
  const basicForm = useBonsaiBasicForm({
    editingBonsai: item,
    onUpdated: () => {
      void reload();
    },
  });

  // Issue #440 Phase 1: 作業履歴タブのフィルタ chip (すべて / 水やり / 剪定 / 針金 / 植替え)。
  // mockup `bonsai-detail-history-01.png` 整合、横並び single row。
  type HistoryFilter = 'all' | 'watering' | 'pruning' | 'wiring' | 'repotting';
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  // 連続日まとめの展開状態 (group の events[0].id を key にして個別開閉)
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
  const toggleGroupExpand = useCallback((key: string) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // フィルタ chip → event.type 集合への対応 (剪定系 5 種、針金 2 種を集約)。
  const FILTER_TO_TYPES: Record<HistoryFilter, readonly EventType[]> = {
    all: [],
    watering: ['watering'],
    pruning: ['pruning', 'leaf_trimming', 'defoliation', 'deshoot', 'candle_cut'],
    wiring: ['wiring', 'unwiring'],
    repotting: ['repotting'],
  };

  // logged event のみ + フィルタ適用 + occurredAtUtc 降順 + 連続日グルーピング。
  const historyGroups = React.useMemo<EventGroupEntry[]>(() => {
    const types = FILTER_TO_TYPES[historyFilter];
    const filtered = events.filter((ev) => {
      if (ev.status !== 'logged') return false;
      if (types.length === 0) return true;
      return types.includes(ev.type as EventType);
    });
    // 既存 events は updated_at 順なので occurredAtUtc 降順に並び替える。
    const sorted = [...filtered].sort((a, b) => b.occurredAtUtc.localeCompare(a.occurredAtUtc));
    return groupContinuousEvents(sorted, getTzOffsetMin());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, historyFilter]);

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
      {/* ADR-0020 §Notes Amended (2026-05-09): DetailTabs 順序 = 作業履歴 / 予定 / 基本情報 (mockup v1.0 整合) */}
      {/* Issue #439: タブバーは sticky (画面上部固定)、Hero は ScrollView 内に移動して全画面スクロールできるようにする */}
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

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Issue #439: Hero を ScrollView 内に移動 (画像が見える範囲より下のみスクロールできる問題を解消、Hero 含めて全画面スクロール可能に) */}
        <BonsaiHero
          coverUri={coverUri}
          bonsaiName={item.name}
          speciesCommonName={item.species?.commonName ?? null}
          speciesScientificName={item.species?.scientificName ?? null}
          styleLabel={item.style ? t(`bonsaiStyle_${item.style}` as TranslationKey) : null}
        />

        {/* Issue #440 Phase 1: 旧 水やり概要セクション (LastWateredText + 水やり履歴を見るボタン)
            は削除。横断 watering 履歴は CareHub (ふりかえりタブ) 経由で到達可能。 */}

        {/* Issue #440 Phase 2: 写真セクション (写真追加 + photoCard 縦リスト) を作業履歴タブ
            → 基本情報タブ上部に移動 (BonsaiBasicSection form より前に配置、mockup PNG 01
            の写真追加 placeholder 整合)。既存写真は photoCard 縦リスト + 並び替え + カバー設定
            + 削除 + undo を維持。複数選択 (allowsMultipleSelection) + ↑↓ + caption + ★ + ×。 */}
        {activeTab === 'basic' && (
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

        {/* Issue #439: 基本情報タブ = BonsaiBasicFormFields (edit モード、BonsaiCreateSheet と共有)。
            mockup v1.0 bonsai-detail-basic-01/02/03.png 整合の編集兼用フォーム。
            Picker BottomSheet (樹種 / 樹形) は ScrollView 内 nest 不可のため、画面 root に別途
            <BonsaiBasicFormPickerSheets> として配置している。
            Issue #440 Phase 2: 写真セクションを上に移動したため form は写真の下。 */}
        {activeTab === 'basic' && <BonsaiBasicSection form={basicForm} />}

        {/* Issue #440 Phase 1: 作業履歴 Tab — フィルタ chip + 連続日まとめ events 一覧。
            mockup `bonsai-detail-history-01/02/03.png` 整合。FAB は ScrollView の外 (root)
            に absolute 配置 (画面右下、tab bar の上)。 */}
        {activeTab === 'history' && (
          <View style={styles.section}>
            {/* フィルタ chip 行 (横並び、すべて / 水やり / 剪定 / 針金 / 植替え) */}
            <View style={styles.historyFilterRow}>
              {(['all', 'watering', 'pruning', 'wiring', 'repotting'] as const).map((f) => {
                const on = historyFilter === f;
                const labelKey: TranslationKey =
                  f === 'all'
                    ? 'historyFilterAll'
                    : f === 'watering'
                      ? 'eventType_watering'
                      : f === 'pruning'
                        ? 'eventType_pruning'
                        : f === 'wiring'
                          ? 'eventType_wiring'
                          : 'eventType_repotting';
                return (
                  <Pressable
                    key={f}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={t(labelKey)}
                    style={[styles.historyFilterChip, on && styles.historyFilterChipOn]}
                    onPress={() => setHistoryFilter(f)}
                    testID={`e2e_history_filter_${f}`}
                  >
                    <ThemedText
                      style={[styles.historyFilterChipText, on && styles.historyFilterChipTextOn]}
                    >
                      {t(labelKey)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            {historyGroups.length === 0 && (
              <ThemedText style={styles.emptyPhotos}>{t('eventEmpty')}</ThemedText>
            )}

            {historyGroups.map((entry) => {
              // 連続日 group: 「水やり ×3  4月20日 ～ 4月22日  3回まとめて表示 個別に開く ▼」
              if (entry.kind === 'group') {
                const key = entry.events[0].id;
                const expanded = expandedGroupIds.has(key);
                const startLabel = formatDate(`${entry.startDate}T00:00:00.000Z`, lang);
                const endLabel = formatDate(`${entry.endDate}T00:00:00.000Z`, lang);
                return (
                  <View key={key}>
                    <Pressable
                      style={styles.eventRow}
                      accessibilityRole="button"
                      accessibilityLabel={t(`eventType_${entry.type}` as TranslationKey)}
                      onPress={() => toggleGroupExpand(key)}
                      testID={`e2e_history_group_toggle_${key}`}
                    >
                      <View style={styles.eventIconBox}>
                        <EventIcon type={entry.type} size={20} />
                      </View>
                      <View style={styles.eventContent}>
                        <View style={styles.eventRowMain}>
                          <View style={styles.eventLabelWithCount}>
                            <ThemedText style={styles.eventLabel}>
                              {t(`eventType_${entry.type}` as TranslationKey)}
                            </ThemedText>
                            <View style={styles.eventCountBadge}>
                              <ThemedText style={styles.eventCountBadgeText}>
                                ×{entry.events.length}
                              </ThemedText>
                            </View>
                          </View>
                          <ThemedText style={styles.eventRowDate}>
                            {startLabel} ～ {endLabel}
                          </ThemedText>
                        </View>
                        <ThemedText style={styles.eventGroupToggle}>
                          {t('historyGroupToggle')
                            .replace('{count}', String(entry.events.length))
                            .replace('{caret}', expanded ? '▲' : '▼')}
                        </ThemedText>
                      </View>
                    </Pressable>
                    {expanded &&
                      entry.events.map((ev) => (
                        <EventSingleRow
                          key={ev.id}
                          ev={ev}
                          events={events}
                          lang={lang}
                          t={t}
                          confirmDeleteEvent={confirmDeleteEvent}
                          indent
                        />
                      ))}
                  </View>
                );
              }
              return (
                <EventSingleRow
                  key={entry.event.id}
                  ev={entry.event}
                  events={events}
                  lang={lang}
                  t={t}
                  confirmDeleteEvent={confirmDeleteEvent}
                />
              );
            })}
          </View>
        )}

        {/* basic Tab 末尾: アーカイブボタン (mockup `この盆栽をアーカイブ` 整合)。
            Issue #439: 編集ボタン + 別 BottomSheet は廃止 (BonsaiBasicSection に inline 化)。
            「保存」ボタンは BonsaiBasicSection の末尾に inline 配置。 */}
        {activeTab === 'basic' && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('bonsaiArchive')}
            style={styles.archiveBtn}
            onPress={handleArchive}
          >
            <ThemedText style={styles.archiveText}>{t('bonsaiArchive')}</ThemedText>
          </Pressable>
        )}

        {/*
         * Issue #441 Phase 1: 予定タブを timeline 縦線 + 連続日 mark + 詳細メモに改修。
         * mockup `bonsai-detail-timeline-01/02.png` 整合。FAB は ScrollView の外 (root)
         * に absolute 配置。
         */}
        {activeTab === 'timeline' && (
          <View style={styles.section}>
            {/* Issue #441 Phase 2: 「これからの予定」 + 右側 secondary label
                「過去水やりは折りたたみ」 (mockup `bonsai-detail-timeline-01/02.png` 整合)。
                過去水やりは作業履歴タブ + ふりかえりタブ CrossWateringHistory で参照可能。 */}
            <View style={styles.timelineHeader}>
              <ThemedText type="subtitle">{t('detailTimelineSectionTitle')}</ThemedText>
              <ThemedText style={styles.timelineHeaderSecondary}>
                {t('detailTimelinePastCollapsed')}
              </ThemedText>
            </View>
            {(() => {
              const plannedEvents = events
                .filter((e) => e.status === 'planned')
                .sort((a, b) => a.occurredAtUtc.localeCompare(b.occurredAtUtc));
              if (plannedEvents.length === 0) {
                return (
                  <ThemedText style={styles.emptyPhotos} testID="e2e_timeline_empty">
                    {t('detailTimelineEmpty')}
                  </ThemedText>
                );
              }
              const groups = groupContinuousEventsAsc(plannedEvents, getTzOffsetMin());
              return groups.map((entry, idx) => (
                <TimelineRow
                  key={entry.kind === 'group' ? entry.events[0].id : entry.event.id}
                  entry={entry}
                  isFirst={idx === 0}
                  isLast={idx === groups.length - 1}
                  lang={lang}
                  t={t}
                />
              ));
            })()}
          </View>
        )}
      </ScrollView>

      {/* Issue #440 Phase 1: 緑 FAB (画面右下、tab bar の上)。作業履歴タブ表示中のみ可視、
          tap で WorkPickerSheet を開く (mockup `bonsai-detail-history-01.png` の緑「+」FAB 整合)。 */}
      {activeTab === 'history' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('eventLogCta')}
          style={styles.historyFab}
          onPress={() => showEventTypePicker()}
          testID="e2e_history_fab"
        >
          <ThemedText style={styles.historyFabPlus}>+</ThemedText>
        </Pressable>
      )}

      {/* Issue #441 Phase 1: 予定タブ FAB (画面右下、tab bar の上)。tap で
          schedulePickerRef (WorkPickerSheet を mode 切替で再利用) を開く。
          mockup `bonsai-detail-timeline-01/02.png` の緑「+」FAB 整合。 */}
      {activeTab === 'timeline' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('addScheduleCta')}
          style={styles.historyFab}
          onPress={() => schedulePickerRef.current?.snapToIndex(0)}
          testID="e2e_timeline_fab"
        >
          <ThemedText style={styles.historyFabPlus}>+</ThemedText>
        </Pressable>
      )}

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

      {/* Issue #298 Phase 2: 予定追加 BottomSheet (WorkPickerSheet を titleOverride で再利用) */}
      <WorkPickerSheet
        ref={schedulePickerRef}
        index={-1}
        bonsaiName={item.name}
        isPine={
          (item.species?.commonName ?? '').toLowerCase().includes('pine') ||
          (item.species?.scientificName ?? '').toLowerCase().includes('pinus') ||
          (item.species?.commonName ?? '').includes('松')
        }
        onSelect={handleSchedulePickerSelect}
        onClose={() => {
          /* close 時の処理なし */
        }}
        titleOverrideKey="addScheduleTitle"
      />

      {/* Issue #298 Phase 2: 予定追加 日付 picker (action 選択後に表示) */}
      {showSchedulePicker && (
        <DateTimePicker
          testID="e2e_schedule_date_picker"
          value={new Date(Date.now() + 86_400_000)} // デフォルト 明日
          mode="date"
          minimumDate={new Date()}
          onChange={(event, date) => {
            if (event.type === 'set' && date) {
              void handleScheduleDateSelect(date);
            } else {
              void handleScheduleDateSelect(null);
            }
          }}
        />
      )}

      {/* ADR-0020 v1.x-3: 作業記録 詳細 form BottomSheet (water / pruning / wiring) */}
      <WorkLogConfirmSheet
        ref={workConfirmRef}
        index={-1}
        bonsaiName={item.name}
        selectedType={pendingWorkType}
        onSubmit={handleWorkLogSubmit}
        onClose={() => setPendingWorkType(null)}
      />

      {/* Issue #439: 基本情報タブ 編集フォームの 樹種 / 樹形 Picker BottomSheet。
          @gorhom/bottom-sheet は ScrollView 内に nest すると closed (index=-1) でも
          inline で leak するため、画面 root 直下に配置する。 */}
      <BonsaiBasicFormPickerSheets form={basicForm} />
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

/**
 * Issue #441 Phase 1: 予定タブの timeline 行 (縦線 + 緑円マーカー + 連続日 mark + 詳細メモ)。
 * mockup `bonsai-detail-timeline-01/02.png` 整合。
 * - 左側: 上半線 / 緑円マーカー / 下半線 (firstRow は上線、lastRow は下線を非表示)
 * - 右側: 日付 (range or 単発) + N 日連続 (group のみ) + 作業名 + ×N badge (group のみ) + note
 */
function TimelineRow({
  entry,
  isFirst,
  isLast,
  lang,
  t,
}: {
  entry: EventGroupEntry;
  isFirst: boolean;
  isLast: boolean;
  lang: string;
  t: (key: TranslationKey) => string;
}) {
  if (entry.kind === 'group') {
    const startLabel = formatDate(`${entry.startDate}T00:00:00.000Z`, lang);
    const endLabel = formatDate(`${entry.endDate}T00:00:00.000Z`, lang);
    const note = entry.events.find((ev) => ev.note)?.note ?? null;
    return (
      <View style={styles.timelineRow} testID={`e2e_timeline_event_${entry.events[0].id}`}>
        <View style={styles.timelineLeft}>
          <View style={[styles.timelineLine, isFirst && styles.timelineLineHidden]} />
          <View style={styles.timelineDot} />
          <View style={[styles.timelineLine, isLast && styles.timelineLineHidden]} />
        </View>
        <View style={styles.timelineContent}>
          <View style={styles.timelineRowMain}>
            <ThemedText style={styles.timelineDateRange}>
              {startLabel} ～ {endLabel}
            </ThemedText>
            <ThemedText style={styles.timelineConsecutive}>
              {t('timelineConsecutive').replace('{count}', String(entry.events.length))}
            </ThemedText>
          </View>
          <View style={styles.eventLabelWithCount}>
            <ThemedText style={styles.eventLabel}>
              {t(`eventType_${entry.type}` as TranslationKey)}
            </ThemedText>
            <View style={styles.eventCountBadge}>
              <ThemedText style={styles.eventCountBadgeText}>×{entry.events.length}</ThemedText>
            </View>
          </View>
          {note && (
            <ThemedText style={styles.eventRowNote} numberOfLines={2}>
              {note}
            </ThemedText>
          )}
        </View>
      </View>
    );
  }
  const ev = entry.event;
  return (
    <View style={styles.timelineRow} testID={`e2e_timeline_event_${ev.id}`}>
      <View style={styles.timelineLeft}>
        <View style={[styles.timelineLine, isFirst && styles.timelineLineHidden]} />
        <View style={styles.timelineDot} />
        <View style={[styles.timelineLine, isLast && styles.timelineLineHidden]} />
      </View>
      <View style={styles.timelineContent}>
        <ThemedText style={styles.timelineDateRange}>
          {formatDate(ev.occurredAtUtc, lang)}
        </ThemedText>
        <ThemedText style={styles.eventLabel}>
          {t(`eventType_${ev.type}` as TranslationKey)}
        </ThemedText>
        {ev.note && (
          <ThemedText style={styles.eventRowNote} numberOfLines={2}>
            {ev.note}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

/**
 * Issue #440 Phase 1: 作業履歴の単一 event 行 (連続日 group 展開時 + フィルタ後の単独 event)。
 * 元 BonsaiDetailScreen body 内の events.map(...) ロジックを関数化、wiring 装着期間 +
 * scheduled unwire + note + chip 描画を踏襲。
 */
function EventSingleRow({
  ev,
  events,
  lang,
  t,
  confirmDeleteEvent,
  indent = false,
}: {
  ev: Event;
  events: Event[];
  lang: string;
  t: (key: TranslationKey) => string;
  confirmDeleteEvent: (ev: Event) => void;
  indent?: boolean;
}) {
  let wiringDuration: {
    weeks: number;
    kind: 'within' | 'overdue';
    isUnwired: boolean;
  } | null = null;
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
      style={[styles.eventRow, indent && styles.eventRowIndent]}
      accessibilityRole="button"
      accessibilityLabel={t(`eventType_${ev.type}` as TranslationKey)}
      onLongPress={() => confirmDeleteEvent(ev)}
    >
      <View style={styles.eventIconBox}>
        <EventIcon type={ev.type as EventType} size={20} />
      </View>
      <View style={styles.eventContent}>
        <View style={styles.eventRowMain}>
          <ThemedText style={styles.eventLabel}>
            {t(`eventType_${ev.type}` as TranslationKey)}
          </ThemedText>
          <ThemedText style={styles.eventRowDate}>{formatDate(ev.occurredAtUtc, lang)}</ThemedText>
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
          <ThemedText style={styles.eventRowNote} testID={`e2e_wiring_scheduled_${ev.id}`}>
            {scheduledUnwireLabel}
          </ThemedText>
        )}
        {ev.note && (
          <ThemedText style={styles.eventRowNote} numberOfLines={2}>
            {ev.note}
          </ThemedText>
        )}
        <HistoryChipRow chips={buildHistoryChips(ev)} />
      </View>
    </Pressable>
  );
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
  // Issue #440 Phase 1: 作業履歴フィルタ chip (mockup `bonsai-detail-history-01.png` 整合)
  historyFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  historyFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    backgroundColor: BG_SURFACE,
    minHeight: 36,
    justifyContent: 'center',
  },
  historyFilterChipOn: { backgroundColor: BRAND_GREEN, borderColor: BRAND_GREEN },
  historyFilterChipText: { fontSize: 13 },
  historyFilterChipTextOn: { color: '#FFFFFF', fontWeight: '600' },
  // Issue #440 Phase 1: 連続日 group の `×N` バッジ + 「N 回まとめて表示 個別に開く ▼」
  eventLabelWithCount: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: BRAND_GREEN,
  },
  eventCountBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  eventGroupToggle: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 4 },
  eventRowIndent: { paddingLeft: 32 },
  // Issue #440 Phase 1: 緑円形 FAB (mockup right-bottom)
  historyFab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  historyFabPlus: { color: '#FFFFFF', fontSize: 28, fontWeight: '300', lineHeight: 32 },
  // Issue #441 Phase 1: 予定タブ timeline UI (mockup `bonsai-detail-timeline-01/02.png` 整合)
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timelineHeaderSecondary: { fontSize: 11, color: TEXT_SECONDARY },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 80,
  },
  timelineLeft: {
    width: 32,
    alignItems: 'center',
    paddingTop: 0,
  },
  // 縦線 (上半 + 下半)。flex:1 で row の縦方向に伸ばす。
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: BRAND_GREEN,
  },
  timelineLineHidden: { backgroundColor: 'transparent' },
  // 緑円マーカー (mockup 整合)
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: BRAND_GREEN,
    backgroundColor: '#FFFFFF',
    marginVertical: 2,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 12,
    paddingVertical: 8,
    gap: 4,
  },
  timelineRowMain: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timelineDateRange: { fontSize: 13, color: TEXT_SECONDARY, fontVariant: ['tabular-nums'] },
  timelineConsecutive: {
    fontSize: 11,
    color: BRAND_GREEN,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#E8F0EA',
  },
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
  // Issue #298 Phase 1: timeline タブ planned events 表示用 (Card 風)
  eventEntry: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    gap: 4,
    marginBottom: 8,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventDate: { fontSize: 13, color: TEXT_SECONDARY, fontVariant: ['tabular-nums'] },
  entryDesc: { fontSize: 13, opacity: 0.7, lineHeight: 18 },
  // Issue #439: 基本情報タブ inline form の保存ボタン (mockup `保存` 整合)。
  basicSaveButton: {
    height: 56,
    borderRadius: 12,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  basicSaveButtonDisabled: {
    backgroundColor: BORDER_DEFAULT,
  },
  basicSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  basicFormSection: {
    padding: 16,
    gap: 16,
  },
});

/**
 * Issue #439: 基本情報タブの inline 編集フォーム。
 * BonsaiCreateSheet と同じ `useBonsaiBasicForm` フックを親で呼んで state を共有し、
 * mockup `bonsai-detail-basic-01/02/03.png` 整合の編集兼用フォームを実現する。
 * Picker BottomSheet は親側で画面 root に配置 (ScrollView 内 nest 禁止)。
 */
function BonsaiBasicSection({ form }: { form: BonsaiBasicFormState }) {
  const { t } = useTranslation();
  return (
    <View style={styles.basicFormSection}>
      <BonsaiBasicFormFields form={form} showPhotos={false} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('save')}
        accessibilityState={{ disabled: !form.canSubmit }}
        style={[styles.basicSaveButton, !form.canSubmit && styles.basicSaveButtonDisabled]}
        onPress={() => void form.handleSubmit()}
        disabled={!form.canSubmit}
        testID="e2e_detail_basic_save_button"
      >
        <ThemedText style={styles.basicSaveButtonText}>{t('save')}</ThemedText>
      </Pressable>
    </View>
  );
}
