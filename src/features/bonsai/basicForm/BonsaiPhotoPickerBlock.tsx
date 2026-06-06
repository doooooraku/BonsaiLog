import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CameraIcon } from '@/src/components/icons';
import { useTranslation } from '@/src/core/i18n/i18n';
// Sess66 PR6c.2: theme-dependent token を inline c.* に (dark cascade)。
import { useColors } from '@/src/core/theme/useColors';
import type { BonsaiBasicFormState } from '@/src/features/bonsai/BonsaiBasicForm';

/**
 * 盆栽基本情報フォーム「写真」ブロック (新規モード専用、presentational)。
 * Repolog 流 2 button (カメラ/ライブラリ) + pendingPhotos の並べ替え(↑↓)/削除カード。
 *
 * Phase 4 A2-4b で BonsaiBasicFormFields から抽出 (挙動不変)。showPhotos && !isEdit の判定は
 * 呼び出し側 shell に残置 (編集モードは customPhotoBlock slot と排他)。写真 state/handler は
 * useBonsaiBasicForm 由来 (form 経由)。
 * 注: field/fieldLabelRow/optionalLabel は他セクションと共有のため WET 複製。
 */
export function BonsaiPhotoPickerBlock({ form }: { form: BonsaiBasicFormState }) {
  const { t } = useTranslation();
  const c = useColors();
  const {
    pendingPhotos,
    handlePickPhoto,
    handleRemovePendingPhoto,
    handleMovePendingPhoto,
    handleTakePhotoCamera,
  } = form;

  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <ThemedText type="defaultSemiBold">
          {t('bonsaiFieldPhotos')} ({pendingPhotos.length})
        </ThemedText>
        <ThemedText style={[styles.optionalLabel, { color: c.textMuted }]}>
          {t('fieldOptionalLabel')}
        </ThemedText>
      </View>
      {/* Sess13 PR-J: Repolog 流 2 button (カメラ / ライブラリ) 並列。 */}
      <View style={styles.photoSourceRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('photoSourceCamera')}
          style={[styles.photoSourceButton, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={handleTakePhotoCamera}
          testID="e2e_bonsai_create_photo_camera"
        >
          <CameraIcon size={20} />
          <ThemedText style={styles.photoSourceText}>{t('photoSourceCamera')}</ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('photoSourceLibrary')}
          style={[styles.photoSourceButton, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={handlePickPhoto}
          testID="e2e_bonsai_create_photo_library"
        >
          <ThemedText style={styles.photoSourceText}>{t('photoSourceLibrary')}</ThemedText>
        </Pressable>
      </View>
      {pendingPhotos.length > 0 && (
        <ThemedText style={[styles.photoHelpText, { color: c.textMuted }]}>
          {t('photoReorderHelp')}
        </ThemedText>
      )}
      {pendingPhotos.map((p, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === pendingPhotos.length - 1;
        return (
          <View
            key={`${p.uri}-${idx}`}
            style={[styles.photoCard, { backgroundColor: c.surface, borderColor: c.border }]}
          >
            <View style={styles.photoCardToolbar}>
              <ThemedText style={[styles.photoCardIndex, { color: c.textSecondary }]}>
                {idx + 1}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('photoMoveUp')}
                accessibilityState={{ disabled: isFirst }}
                disabled={isFirst}
                style={[
                  styles.photoMoveButton,
                  { backgroundColor: c.surface },
                  isFirst && styles.photoMoveButtonDisabled,
                ]}
                onPress={() => handleMovePendingPhoto(idx, idx - 1)}
                testID={`e2e_bonsai_create_photo_move_up_${idx}`}
              >
                <ThemedText style={styles.photoMoveText}>↑</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('photoMoveDown')}
                accessibilityState={{ disabled: isLast }}
                disabled={isLast}
                style={[
                  styles.photoMoveButton,
                  { backgroundColor: c.surface },
                  isLast && styles.photoMoveButtonDisabled,
                ]}
                onPress={() => handleMovePendingPhoto(idx, idx + 1)}
                testID={`e2e_bonsai_create_photo_move_down_${idx}`}
              >
                <ThemedText style={styles.photoMoveText}>↓</ThemedText>
              </Pressable>
              <View style={{ flex: 1 }} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('delete')}
                style={[styles.photoCardDeleteButton, { backgroundColor: c.surface }]}
                onPress={() => handleRemovePendingPhoto(idx)}
                testID={`e2e_bonsai_create_photo_remove_${idx}`}
              >
                <ThemedText style={[styles.photoCardDeleteText, { color: c.textSecondary }]}>
                  ×
                </ThemedText>
              </Pressable>
            </View>
            <Image source={{ uri: p.uri }} style={styles.photoCardImage} contentFit="cover" />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Sess66 PR6c.2: bg/border/text color は inline c.* (dark cascade)。
  field: { gap: 8 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionalLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  // Sess13 PR-J: Repolog 流写真カード
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
  photoHelpText: { fontSize: 12, marginTop: 4 },
  photoCard: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  photoCardToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  photoCardIndex: { fontSize: 14, minWidth: 16 },
  photoMoveButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoMoveButtonDisabled: { opacity: 0.3 },
  photoMoveText: { fontSize: 18 },
  photoCardDeleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCardDeleteText: { fontSize: 20, lineHeight: 22 },
  // 4:3 横長 (Q-10 b 採用)
  photoCardImage: { width: '100%', aspectRatio: 4 / 3 },
});
