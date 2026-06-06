import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CameraIcon } from '@/src/components/icons';
import type { TranslationKey } from '@/src/core/i18n/locales/en';
// Sess68 PR #C: 全 forbidden token を inline c.* 化。
import { useColors } from '@/src/core/theme/useColors';
import type { PhotoRead } from '@/src/db/photoRepository';
import { PhotoCard } from '@/src/features/bonsai/PhotoCard';
import { PhotoUndoBanner } from '@/src/features/bonsai/PhotoUndoBanner';
import type { PendingPhotoDeletion } from '@/src/features/bonsai/detail/usePhotoCrudWithUndo';

/**
 * 盆栽詳細「基本情報タブ」の写真ブロック (R4 presentational)。
 * 写真数ラベル + カメラ/ライブラリ追加ボタン + PhotoCard 一覧 + 削除 Undo banner。
 * BonsaiBasicSection の customPhotoBlock slot に挿入される。
 *
 * Phase 4 A1-9 で `bonsai/[id]/index.tsx` から抽出 (挙動不変)。CRUD ロジックは
 * usePhotoCrudWithUndo (A1-6)、本コンポーネントは描画と event 配線のみ。
 * 注: section / emptyPhotos は作業履歴タブ(BonsaiHistoryTab)とも共有のため WET 複製。
 */
export function BonsaiPhotoSection({
  photos,
  captions,
  pendingDeletion,
  t,
  pickAndSavePhoto,
  handleMovePhoto,
  handleCaptionChange,
  handleCaptionBlur,
  handleSetCover,
  handleDeletePhoto,
  handleUndoDeletion,
}: {
  photos: PhotoRead[];
  captions: Record<string, string>;
  pendingDeletion: PendingPhotoDeletion | null;
  t: (key: TranslationKey) => string;
  pickAndSavePhoto: (source: 'camera' | 'library') => Promise<void>;
  handleMovePhoto: (fromIndex: number, toIndex: number) => Promise<void>;
  handleCaptionChange: (photoId: string, text: string) => void;
  handleCaptionBlur: (photoId: string) => Promise<void>;
  handleSetCover: (photoId: string) => Promise<void>;
  handleDeletePhoto: (photo: PhotoRead) => void;
  handleUndoDeletion: () => void;
}) {
  const c = useColors();
  const photoCount = photos.length;
  return (
    <View style={styles.section}>
      <View style={styles.photoSectionLabelRow}>
        <ThemedText type="defaultSemiBold">
          {t('bonsaiFieldPhotos')} ({photoCount})
        </ThemedText>
        <ThemedText style={[styles.photoSectionOptionalLabel, { color: c.textMuted }]}>
          {t('fieldOptionalLabel')}
        </ThemedText>
      </View>
      <View style={styles.photoSourceRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('photoSourceCamera')}
          style={[styles.photoSourceButton, { borderColor: c.border, backgroundColor: c.surface }]}
          onPress={() => void pickAndSavePhoto('camera')}
          testID="e2e_detail_photo_camera"
        >
          <CameraIcon size={20} />
          <ThemedText style={styles.photoSourceText}>{t('photoSourceCamera')}</ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('photoSourceLibrary')}
          style={[styles.photoSourceButton, { borderColor: c.border, backgroundColor: c.surface }]}
          onPress={() => void pickAndSavePhoto('library')}
          testID="e2e_detail_photo_library"
        >
          <ThemedText style={styles.photoSourceText}>{t('photoSourceLibrary')}</ThemedText>
        </Pressable>
      </View>

      {photos.length === 0 && <ThemedText style={styles.emptyPhotos}>{t('photoEmpty')}</ThemedText>}

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
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  // Sess15 PR-QQ: 新規 modal BonsaiBasicForm.photoSourceButton と完全同 pattern。
  photoSectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  photoSectionOptionalLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  photoSourceRow: { flexDirection: 'row', gap: 10 },
  photoSourceButton: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoSourceText: { fontSize: 14, fontWeight: '500' },
  emptyPhotos: { opacity: 0.6, textAlign: 'center', paddingVertical: 12 },
});
