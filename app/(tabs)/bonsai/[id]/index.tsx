import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CameraIcon, EventIcon } from '@/src/components/icons';
import {
  BonsaiBasicFormFields,
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
  TEXT_MUTED,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';

import {
  archiveBonsai,
  getBonsaiWithSpecies,
  type BonsaiWithSpecies,
} from '@/src/db/bonsaiRepository';
import {
  addPhotoFromUri,
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
import type { WorkLogPayload } from '@/src/stores/pickerStore';
import { usePickerStore } from '@/src/stores/pickerStore';
import { WiringPeriodDisplay } from '@/src/features/wiring/WiringPeriodDisplay';
import {
  classifyWiringDuration,
  getDaysSinceWired,
  getScheduledUnwireAtWithFallback,
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
  const params = useLocalSearchParams<{ id: string; tab?: string }>();
  const { id } = params;
  const { t, lang } = useTranslation();
  const router = useRouter();
  const c = useColors();
  // Sess15 PR-RR: Tab bar の高さ取得 (sticky footer を Tab bar の上に固定するため)。
  const tabBarHeight = useBottomTabBarHeight();
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
  // Sess12 PR-F 改善 F: URL param ?tab=timeline で初期タブ指定可能 (planned event tap 時)
  const initialTabParam = (params.tab as string | undefined) ?? 'history';
  const initialTab: 'history' | 'timeline' | 'basic' =
    initialTabParam === 'timeline' || initialTabParam === 'basic' ? initialTabParam : 'history';
  const [activeTab, setActiveTab] = useState<'history' | 'timeline' | 'basic'>(initialTab);

  // Phase G2 part 1-2 (ADR-0024 Accepted): 作業記録 BottomSheet を `(modals)/work-picker` +
  // `(modals)/work-log-confirm` (formSheet) に置換、ref 経由の Sheet 制御は全廃 (router.push +
  // usePickerStore で代替)。
  // Sess16 PR-C: FORM_TYPES を全 14 種別に拡張、 全種別 form 経由化 (即書込 path 廃止)。
  // 旧即書込 path (logEvent + showEventOverloadPopup) は deadcode、 削除は別 PR で。
  const [pendingScheduleType, setPendingScheduleType] = useState<EventType | null>(null);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  // Sess18 PR-1 (ADR-0030 D2): handleWorkPickerSelect 廃止。
  // WorkPickerScreen で log mode は直接 router.push('/work-log-confirm') するため、
  // caller (本画面) で consume + push する logic は不要 (Case C 解消)。
  // schedule mode は handleSchedulePickerSelect (下) で Case A 維持。

  // Issue #298 Phase 2: 予定追加フロー (3 step を 2 step に簡略化、確認ステップ省略)
  // Step 1: WorkPickerSheet (再利用、titleOverrideKey='addScheduleTitle') で作業選択
  // Step 2: DateTimePicker (mode='date') で日付選択 → createEvent({ status: 'planned' })
  const handleSchedulePickerSelect = React.useCallback((type: EventType) => {
    // Phase G2 part 1: schedulePickerRef.close() は不要 (router.back で picker 画面が閉じている)。
    setPendingScheduleType(type);
    setTimeout(() => setShowSchedulePicker(true), 200);
  }, []);

  // Phase G2 part 1 (ADR-0024): `/work-picker` から戻った時に workPickerResult を消費、
  // mode に応じて分岐。
  // Sess18 PR-1 (ADR-0030 D2): log mode は WorkPicker で直接 router.push されるため
  // ここでは consume 不要 (Case C 解消)。 schedule mode のみ Case A (DatePicker dialog) を維持。
  // Phase G2 part 2 (ADR-0024 Accepted): `/work-log-confirm` から戻った時は workLogConfirmResult
  // を消費して createEvent で DB に書込 (Case B、 caller state 更新のみ、 ADR-0030 §17-2 維持)。
  useFocusEffect(
    React.useCallback(() => {
      const workResult = usePickerStore.getState().consumeWorkPickerResult();
      if (workResult && workResult.mode === 'schedule') {
        // Sess18 PR-1: schedule mode のみ caller で DatePicker dialog を開く (Case A)。
        handleSchedulePickerSelect(workResult.type);
      }
      const logResult = usePickerStore.getState().consumeWorkLogConfirmResult();
      if (logResult) {
        // Sess16 PR-L (T-3): F-05「気遣い型」 popup 復活 (PR-C 動線統一で deadcode 化していた logic)。
        // user が WorkLogConfirm で「記録する」 tap 後、 同日 6 件目以降の event なら popup 表示。
        const enabled = useSettingsStore.getState().eventOverloadEnabled;
        if (enabled) {
          const occurredAtUtc = logResult.occurredAtDate
            ? `${logResult.occurredAtDate}T00:00:00.000Z`
            : (nowUtc() as string);
          void countSameDayPlannedOrLoggedEvents(occurredAtUtc)
            .then((count) => {
              if (count >= EVENT_OVERLOAD_THRESHOLD) {
                showEventOverloadPopupForPayload(logResult);
              } else {
                void persistEventWithPayload(logResult);
              }
            })
            .catch(() => {
              // 件数取得失敗時は popup 出さず即書込 (記録のみ哲学、 ADR-0011)
              void persistEventWithPayload(logResult);
            });
        } else {
          void persistEventWithPayload(logResult);
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [handleSchedulePickerSelect]),
  );

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
      {/* Sess15 PR-TT (Q19 D1): ⋮ menu 完全削除。
          残機能 (基本情報編集 = タブ重複、 PDF 出力 = 未実装) は user 真意により全廃。 */}
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

      {/* Sess15 PR-TT: KeyboardAvoidingView で TextInput focus 時にキーボードが入力欄を隠さないよう調整。
          iOS は 'padding'、 Android は 'height' (windowSoftInputMode=adjustResize と協調)。 */}
      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            // Sess15 PR-SS: sticky footer 廃止 (PR-RR revert)、 Tab bar + 余裕のみ。
            { paddingBottom: tabBarHeight + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
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

          {/* Sess15 PR-SS: 基本情報タブ = BonsaiBasicFormFields (edit モード)。
            photoSection は customPhotoBlock prop 経由で BonsaiBasicFormFields の「タグ後・メモ前」 slot に挿入。
            新規 modal (PR-CC 案 P) と field 順序を完全 1:1 一致。 */}
          {activeTab === 'basic' && (
            <BonsaiBasicSection
              form={basicForm}
              onArchive={handleArchive}
              customPhotoBlock={
                <View style={styles.section}>
                  <View style={styles.photoSectionLabelRow}>
                    <ThemedText type="defaultSemiBold">
                      {t('bonsaiFieldPhotos')} ({photoCount})
                    </ThemedText>
                    <ThemedText style={styles.photoSectionOptionalLabel}>
                      {t('fieldOptionalLabel')}
                    </ThemedText>
                  </View>
                  <View style={styles.photoSourceRow}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('photoSourceCamera')}
                      style={styles.photoSourceButton}
                      onPress={() => void pickAndSavePhoto('camera')}
                      testID="e2e_detail_photo_camera"
                    >
                      <CameraIcon size={20} />
                      <ThemedText style={styles.photoSourceText}>
                        {t('photoSourceCamera')}
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('photoSourceLibrary')}
                      style={styles.photoSourceButton}
                      onPress={() => void pickAndSavePhoto('library')}
                      testID="e2e_detail_photo_library"
                    >
                      <ThemedText style={styles.photoSourceText}>
                        {t('photoSourceLibrary')}
                      </ThemedText>
                    </Pressable>
                  </View>

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
              }
            />
          )}

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

          {/* Sess15 PR-NN: 旧 basic Tab 末尾アーカイブボタンを BonsaiBasicSection 内に移動 (保存 / アーカイブ同 height 56 統一)。 */}

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
                // Sess12 PR-J: 「今日」 緑大円 row を先頭に追加 (mockup bonsai-detail-timeline-01/02 整合)
                // events 0 件でも「今日」 ヘッダー表示で「これからの予定の起点」 を明示
                const todayLabel = t('detailTimelineToday');
                const todayDate = formatDate(nowUtc() as string, lang);
                const todayRow = (
                  <View key="__today__" style={styles.timelineRow} testID="e2e_timeline_today">
                    <View style={styles.timelineLeft}>
                      <View style={[styles.timelineLine, styles.timelineLineHidden]} />
                      <View style={[styles.timelineDot, styles.timelineDotToday]} />
                      <View
                        style={[
                          styles.timelineLine,
                          plannedEvents.length === 0 && styles.timelineLineHidden,
                        ]}
                      />
                    </View>
                    <View style={styles.timelineContent}>
                      <ThemedText style={styles.timelineTodayLabel}>{todayLabel}</ThemedText>
                      <ThemedText style={styles.timelineTodayDate}>{todayDate}</ThemedText>
                    </View>
                  </View>
                );
                if (plannedEvents.length === 0) {
                  return (
                    <>
                      {todayRow}
                      <ThemedText style={styles.emptyPhotos} testID="e2e_timeline_empty">
                        {t('detailTimelineEmpty')}
                      </ThemedText>
                    </>
                  );
                }
                const groups = groupContinuousEventsAsc(plannedEvents, getTzOffsetMin());
                return (
                  <>
                    {todayRow}
                    {groups.map((entry, idx) => (
                      <TimelineRow
                        key={entry.kind === 'group' ? entry.events[0].id : entry.event.id}
                        entry={entry}
                        isFirst={false}
                        isLast={idx === groups.length - 1}
                        lang={lang}
                        t={t}
                      />
                    ))}
                  </>
                );
              })()}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

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

      {/* Issue #441 Phase 1 + Phase G2 part 1 (ADR-0024): 予定タブ FAB。tap で
          `/work-picker?mode=schedule` (formSheet) を開く (旧 schedulePickerRef は廃止)。
          mockup `bonsai-detail-timeline-01/02.png` の緑「+」FAB 整合。 */}
      {activeTab === 'timeline' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('addScheduleCta')}
          style={styles.historyFab}
          onPress={() => {
            if (!item) return;
            // Sess16 PR-Q: isPine URL param 撤廃 (松類限定 candle_cut 表示廃止、 全種別常時表示)
            router.push(
              `/work-picker?bonsaiName=${encodeURIComponent(item.name)}&mode=schedule` as Href,
            );
          }}
          testID="e2e_timeline_fab"
        >
          <ThemedText style={styles.historyFabPlus}>+</ThemedText>
        </Pressable>
      )}

      {/* Phase G2 part 1 (ADR-0024): 旧 <WorkPickerSheet> 2 件 (記録モード + 予定モード) は
          `(modals)/work-picker` (formSheet) に置換、本コンポーネント直下から削除済。
          Sess18 PR-1 (ADR-0030 D2): log mode は WorkPickerScreen で直接 router.push、
          schedule mode のみ handleSchedulePickerSelect で Case A (DatePicker dialog) を呼び出す。 */}

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

      {/* Phase G2-G5 (ADR-0024 Accepted): 作業記録 / 樹種 / 樹形 picker は全 formSheet 化、
          BonsaiBasicFormPickerSheets (旧 @gorhom 空関数) は Phase G5 で削除済。 */}

      {/* Sess15 PR-SS: sticky footer 廃止 (PR-PP revert)、
          アーカイブ + 保存 button は BonsaiBasicSection 内 inline に復活 (PR-NN 構造)。 */}
    </ThemedView>
  );

  /** v1.x-3: 詳細 form から payload + note を受け取り createEvent で保存。 */
  async function persistEventWithPayload(payload: WorkLogPayload) {
    if (!item) return;
    try {
      // Sess16 PR-A2: occurredAtDate (YYYY-MM-DD) → ISO UTC、 未指定なら createEvent default (now)。
      const occurredAtUtc = payload.occurredAtDate
        ? `${payload.occurredAtDate}T00:00:00.000Z`
        : undefined;
      const created = await createEvent({
        bonsaiId: item.id,
        type: payload.type,
        status: 'logged',
        note: payload.note.length > 0 ? payload.note : undefined,
        payload: payload.payload,
        ...(occurredAtUtc ? { occurredAtUtc } : {}),
      });
      // Sess16 PR-A3 → PR-H: pending photos を作成された event に紐付けて永続化 (caption 削除済)。
      if (payload.photos && payload.photos.length > 0) {
        for (const p of payload.photos) {
          await addPhotoFromUri({
            bonsaiId: item.id,
            sourceUri: p.uri,
            eventId: created.id,
          });
        }
      }
      await reload();
    } catch (err) {
      Alert.alert(t('error'), String(err));
    }
  }

  function showEventTypePicker() {
    if (!item) return;
    // Sess16 PR-Q: isPine URL param 撤廃 (松類限定 candle_cut 表示廃止、 全種別常時表示)
    router.push(`/work-picker?bonsaiName=${encodeURIComponent(item.name)}&mode=log` as Href);
  }

  /**
   * F-05 気遣い型ポップアップ (Issue #25、ADR-0011、 Sess16 PR-L で WorkLogConfirm 動線に移植):
   * - 同じローカル日に planned + logged が既に 5 件以上ある場合 (= 6 件目)、 WorkLogConfirm
   *   で「記録する」 tap 後の useFocusEffect 内で本関数を呼び出して Alert 表示。 3 ボタン:
   *   1. そのまま登録 (default): persistEventWithPayload 実行
   *   2. 一覧を見る: 登録せずに dismiss (詳細画面で既に履歴が見える)
   *   3. 今後表示しない: ポップアップを永続 OFF にしてから登録
   * - 設定 OFF (eventOverloadEnabled=false) なら useFocusEffect 内で本関数を呼ばず即書込。
   */
  function showEventOverloadPopupForPayload(payload: WorkLogPayload) {
    Alert.alert(
      t('eventOverloadTitle'),
      t('eventOverloadBody').replace('{count}', String(EVENT_OVERLOAD_THRESHOLD)),
      [
        {
          text: t('eventOverloadActionConfirm'),
          onPress: () => void persistEventWithPayload(payload),
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
            void persistEventWithPayload(payload);
          },
        },
      ],
      { cancelable: true },
    );
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
    const scheduled = getScheduledUnwireAtWithFallback(ev);
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
  // Sess15 PR-TT: KeyboardAvoidingView 内部 ScrollView の親 wrapper。
  flexOne: { flex: 1 },
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
  // Sess12 PR-J: 「今日」 大円マーカー (mockup bonsai-detail-timeline-01/02 整合)
  // 通常の dot より大きく、 内側塗りつぶしで「現在地」 明示
  timelineDotToday: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: BRAND_GREEN,
  },
  // 「今日」 ラベル + 日付 (mockup line 1 「今日 / 4月25日」 整合)
  timelineTodayLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: BRAND_GREEN,
  },
  timelineTodayDate: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 2,
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
  // Sess15 PR-QQ: 新規 modal BonsaiBasicForm.photoSourceButton と完全同 pattern。
  photoSectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  photoSectionOptionalLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: TEXT_MUTED,
    letterSpacing: 0.8,
  },
  photoSourceRow: { flexDirection: 'row', gap: 10 },
  photoSourceButton: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BG_SURFACE,
  },
  photoSourceText: { fontSize: 14, fontWeight: '500' },
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
  // Sess15 PR-SS: 基本情報タブ inline 保存 button (sticky footer 廃止 + PR-NN design 復活)。
  basicSaveButton: {
    height: 56,
    borderRadius: 12,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
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
  // Sess15 PR-SS: アーカイブ inline button 復活 (PR-NN design、 保存と同 height 56 + 同 borderRadius)。
  basicArchiveButton: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DANGER,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  basicArchiveButtonText: {
    color: DANGER,
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  // Sess15 PR-TT: gap 16 → 24 (メモ欄と アーカイブ button の overlap 解消)。
  basicFormSection: {
    padding: 16,
    gap: 24,
  },
});

/**
 * Issue #439: 基本情報タブの inline 編集フォーム。
 * BonsaiCreateSheet と同じ `useBonsaiBasicForm` フックを親で呼んで state を共有し、
 * mockup `bonsai-detail-basic-01/02/03.png` 整合の編集兼用フォームを実現する。
 * Picker BottomSheet は親側で画面 root に配置 (ScrollView 内 nest 禁止)。
 *
 * Sess15 PR-PP: 保存 button + アーカイブ button を Section 外 (画面 root sticky footer + ⋮ メニュー)
 * に移動。 BonsaiBasicSection はフィールドのみに集中、 新規 modal と完全同 pattern。
 */
function BonsaiBasicSection({
  form,
  onArchive,
  customPhotoBlock,
}: {
  form: BonsaiBasicFormState;
  onArchive: () => void;
  customPhotoBlock?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.basicFormSection}>
      <BonsaiBasicFormFields form={form} showPhotos={false} customPhotoBlock={customPhotoBlock} />
      {/* Sess15 PR-SS: アーカイブ (上) + 保存 (下) inline 復活、 高さ 56 統一 (PR-NN design)。
          user 真意「アーカイブの下に保存ボタンがあるイメージ」 整合。 */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('bonsaiArchive')}
        style={styles.basicArchiveButton}
        onPress={onArchive}
        testID="e2e_detail_basic_archive_button"
      >
        <ThemedText style={styles.basicArchiveButtonText}>{t('bonsaiArchive')}</ThemedText>
      </Pressable>
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
