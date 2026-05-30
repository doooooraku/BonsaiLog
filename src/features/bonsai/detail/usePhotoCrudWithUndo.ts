import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';
import type { BonsaiWithSpecies } from '@/src/db/bonsaiRepository';
import {
  deletePhoto,
  FREE_PHOTO_LIMIT_PER_BONSAI,
  getPhotoCountByBonsai,
  insertPhoto,
  reorderPhotos,
  setCoverPhoto,
  updatePhotoCaption,
  type PhotoRead,
} from '@/src/db/photoRepository';
import {
  removePhotoAndNormalize,
  restorePhotoAtIndexAndNormalize,
  swapPhotos,
} from '@/src/features/bonsai/photoOrderUtils';
import { useProGuard } from '@/src/features/pro/useProGuard';
import { deletePhotoFile, persistPhotoFile } from '@/src/services/photoFileService';

/** 削除 Undo の保留中 1 件。`pendingDeletionRef` は index.tsx で作成し本フックへ注入する。 */
export type PendingPhotoDeletion = {
  photo: PhotoRead;
  previousIndex: number;
};

/**
 * 盆栽詳細 基本情報タブの写真 CRUD + 5 秒 Undo (R4)。
 * Phase 4 A1-6 で `bonsai/[id]/index.tsx` から抽出 (挙動不変)。
 *
 * 削除 undo (Repolog 流用): 5 秒以内に「元に戻す」で復元、超過 / 別操作 / 画面離脱で
 * finalize → DB 物理削除 + 写真ファイル削除。
 *
 * - `pendingDeletionRef`: reload(useBonsaiDetailData) が pending 写真を非表示にするため読む
 *   共有 ref。本フックが読み書きするが**所有は index.tsx**(循環依存回避、A1-4/A1-6 設計)。
 * - `pendingDeletion` state(banner 表示) / timer ref / unmount finalize は本フック内部。
 */
export function usePhotoCrudWithUndo({
  item,
  photos,
  setPhotos,
  captions,
  setCaptions,
  reload,
  pendingDeletionRef,
  t,
}: {
  item: BonsaiWithSpecies | null;
  photos: PhotoRead[];
  setPhotos: Dispatch<SetStateAction<PhotoRead[]>>;
  captions: Record<string, string>;
  setCaptions: Dispatch<SetStateAction<Record<string, string>>>;
  reload: () => Promise<void>;
  pendingDeletionRef: RefObject<PendingPhotoDeletion | null>;
  t: (key: TranslationKey) => string;
}) {
  const { t: tRoot } = useTranslation();
  // ADR-0049 Sess59 PR3: 基本情報写真 ① Free 上限 3 ガード共通 hook
  // currentCount は photos.length 概算 (DB 実カウントは fetch 時に再評価で安全側)
  const { canAdd, remainingSlots, openPaywall, isPro } = useProGuard({
    feature: 'photo_basic',
    currentCount: photos.length,
  });
  const [pendingDeletion, setPendingDeletion] = useState<PendingPhotoDeletion | null>(null);
  const pendingDeletionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Free 上限到達時の Paywall 誘導 Alert (cancel + Pro へ進む 2 ボタン)
  const showLimitPaywall = useCallback(() => {
    Alert.alert(
      t('photoLimitTitle'),
      t('photoLimitDesc').replace('{count}', String(FREE_PHOTO_LIMIT_PER_BONSAI)),
      [
        { text: tRoot('cancel'), style: 'cancel' },
        { text: tRoot('proCtaUpgrade'), onPress: openPaywall },
      ],
    );
  }, [t, tRoot, openPaywall]);

  const pickAndSavePhoto = useCallback(
    async (source: 'camera' | 'library') => {
      if (!item) return;
      // useProGuard で render 時の canAdd は photos.length に対する評価。
      // 実 DB count は race condition 回避のため fetch 時に再確認 (例: 別画面で削除後等)。
      const currentCount = await getPhotoCountByBonsai(item.id);
      const remaining = isPro
        ? Number.POSITIVE_INFINITY
        : Math.max(0, FREE_PHOTO_LIMIT_PER_BONSAI - currentCount);
      if (!canAdd || remaining === 0) {
        showLimitPaywall();
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

      // ピッカー段階で残枠超過を防止 (User 真意 Sess59 R3: 写真ピッカー段階で 4 枚目以降
      // を選べないようにする)。 Pro は OS 上限まで (selectionLimit: 0)、 Free は残枠。
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.85,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsMultipleSelection: true,
              selectionLimit: isPro ? 0 : Math.min(remaining, remainingSlots),
              quality: 0.85,
            });
      if (result.canceled || !result.assets || result.assets.length === 0) return;

      // 念のため remaining 超過分は受け入れない (selectionLimit が想定通り効かない端末への保険)
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
          showLimitPaywall();
        }
        await reload();
      } catch (err) {
        Alert.alert(t('error'), String(err));
      }
    },
    [item, isPro, canAdd, remainingSlots, showLimitPaywall, t, reload],
  );

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
    [photos, item, setPhotos],
  );

  // PhotoCard caption: controlled 入力 (state) + blur で DB 反映。
  const handleCaptionChange = useCallback(
    (photoId: string, text: string) => {
      setCaptions((prev) => ({ ...prev, [photoId]: text }));
    },
    [setCaptions],
  );
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
  }, [clearPendingDeletionTimer, pendingDeletionRef]);

  // PhotoCard 削除ボタン: Alert 確認 → 即時 state 除去 + undo banner 表示 (5 秒で確定)。
  const handleDeletePhoto = useCallback(
    (photo: PhotoRead) => {
      Alert.alert(t('photoDeleteConfirmTitle'), t('photoDeleteConfirmDesc'), [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              // 既存の pending があれば先に finalize (連続削除対応)。
              await finalizePendingDeletion();
              // photos 内の現在 index を保存 (undo で同じ位置に戻すため)。
              const previousIndex = photos.findIndex((p) => p.id === photo.id);
              if (previousIndex < 0) return;
              // 楽観的 state 更新 (UI 反映を即時化)。
              setPhotos((prev) => removePhotoAndNormalize(prev, photo.id));
              const pending: PendingPhotoDeletion = { photo, previousIndex };
              pendingDeletionRef.current = pending;
              setPendingDeletion(pending);
              // 5 秒後に自動 finalize。
              clearPendingDeletionTimer();
              pendingDeletionTimerRef.current = setTimeout(() => {
                void finalizePendingDeletion();
              }, 5000);
            })();
          },
        },
      ]);
    },
    [t, photos, finalizePendingDeletion, clearPendingDeletionTimer, setPhotos, pendingDeletionRef],
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
  }, [clearPendingDeletionTimer, setPhotos, pendingDeletionRef]);

  // unmount / 画面離脱時: pending を確定して clean state で離脱。
  useEffect(() => {
    return () => {
      clearPendingDeletionTimer();
      // 画面離脱時に DB 削除を確定 (banner が見えなくなる前に finalize)。
      void finalizePendingDeletion();
    };
  }, [clearPendingDeletionTimer, finalizePendingDeletion]);

  return {
    pendingDeletion,
    pickAndSavePhoto,
    handleMovePhoto,
    handleCaptionChange,
    handleCaptionBlur,
    handleSetCover,
    handleDeletePhoto,
    handleUndoDeletion,
  };
}
