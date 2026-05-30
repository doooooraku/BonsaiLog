import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';
import { FREE_PHOTO_LIMIT_PER_BONSAI } from '@/src/db/photoRepository';
import { useProGuard } from '@/src/features/pro/useProGuard';
import type { PendingPhoto } from '@/src/features/bonsai/BonsaiBasicForm';

/**
 * 盆栽基本情報フォーム「新規モード写真」の state + handler (R: 写真)。
 * pendingPhotos + ライブラリ/カメラ取り込み + 並べ替え/削除。Free 枚数制限は isPro で出し分け。
 *
 * Phase 4 A2-6 で useBonsaiBasicForm から抽出 (挙動不変、自己完結)。
 * pendingPhotos / setPendingPhotos は orchestrator が submit(addPhotoFromUri)・isDirty・reset で
 * 参照するため返却する。編集モードの確定写真は別系統(usePhotoCrudWithUndo)で本フックは無関係。
 */
export function useBonsaiFormPhotos(t: (key: TranslationKey) => string) {
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const { t: tRoot } = useTranslation();
  // ADR-0049 Sess59 PR3: 基本情報写真 ① Free 上限 3 ガード共通 hook
  const { canAdd, remainingSlots, openPaywall, isPro } = useProGuard({
    feature: 'photo_basic',
    currentCount: pendingPhotos.length,
  });

  // Free 上限到達時の Paywall 誘導 Alert (cancel + Pro へ進む 2 ボタン、 useGoToPaywall パターン)
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

  const handlePickPhoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('photoPermissionDeniedTitle'), t('photoPermissionDeniedBody'));
      return;
    }
    if (!canAdd) {
      showLimitPaywall();
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      // Pro = OS 上限まで (selectionLimit: 0)、 Free = 残枠 (User 真意 Sess59 R3:
      // 写真ピッカー段階で 4 枚目以降を選べないようにする)
      selectionLimit: isPro ? 0 : remainingSlots,
      quality: 0.85,
    });
    if (result.canceled || !result.assets || result.assets.length === 0) return;

    // 念のため remaining 超過分は受け入れない (selectionLimit が想定通り効かない端末への保険)
    const acceptedCount = isPro
      ? result.assets.length
      : Math.min(result.assets.length, remainingSlots);
    const accepted = result.assets.slice(0, acceptedCount).map((a) => ({
      uri: a.uri,
      width: a.width ?? null,
      height: a.height ?? null,
    }));
    const skipped = result.assets.length - accepted.length;
    setPendingPhotos((prev) => [...prev, ...accepted]);
    if (skipped > 0) {
      showLimitPaywall();
    }
  }, [canAdd, isPro, remainingSlots, showLimitPaywall, t]);

  const handleRemovePendingPhoto = useCallback((index: number) => {
    setPendingPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleMovePendingPhoto = useCallback((from: number, to: number) => {
    setPendingPhotos((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      if (moved === undefined) return prev; // splice on a valid index always returns 1 element, but guard for type safety
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const handleTakePhotoCamera = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('photoPermissionDeniedTitle'), t('photoPermissionDeniedBody'));
      return;
    }
    if (!canAdd) {
      showLimitPaywall();
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (result.canceled || !result.assets || result.assets.length === 0) return;
    const a = result.assets[0]!; // guarded by assets.length === 0 check above
    setPendingPhotos((prev) => [
      ...prev,
      { uri: a.uri, width: a.width ?? null, height: a.height ?? null },
    ]);
  }, [canAdd, showLimitPaywall, t]);

  return {
    pendingPhotos,
    setPendingPhotos,
    isPro,
    handlePickPhoto,
    handleRemovePendingPhoto,
    handleMovePendingPhoto,
    handleTakePhotoCamera,
  };
}
