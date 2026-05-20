/**
 * PhotoField — 作業記録 form 用 写真添付 atom (Sess16 PR-A3 → PR-H refactor)。
 *
 * controlled pattern (親が photos state を持つ)。 BonsaiBasicForm の写真セクション
 * (Sess13 PR-J + Sess14 PR-T) を **UI + 機能ともそのまま踏襲**:
 * - Camera + Library の 2 buttons 横並び
 * - 各 photo: ↑↓ 並び替え + 番号 (1/N、 PR #625 良点維持) + × 削除 + サムネ (4:3)
 * - **caption UI なし** (Sess14 PR-T「冗長」 判断整合)
 *
 * PR #625 から維持した「良点」:
 * - index 表示「1 / N」 format (BonsaiBasicForm「1」 のみより分かりやすい)
 * - ImagePicker `selectionLimit: remaining` 動的設定 (picker レベル enforce)
 *
 * F-08 仕様 (functional_spec.md §13 line 564-567): 作業記録の写真は Free でも無制限
 * (盆栽単位 3 枚制限とは別集計)、 ただし 1 作業あたり最大 10 枚。
 */
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import React from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CameraIcon } from '@/src/components/icons';
import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';
import { formOptional } from '@/src/core/theme/typography';
import {
  BG_PRIMARY,
  BG_SURFACE,
  BORDER_DEFAULT,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';

export const MAX_PHOTOS_PER_EVENT = 10;

export type PhotoFieldItem = {
  uri: string;
  width: number | null;
  height: number | null;
};

export type PhotoFieldProps = {
  label: string;
  optional?: boolean;
  optionalText?: string;
  photos: readonly PhotoFieldItem[];
  onChange: (photos: readonly PhotoFieldItem[]) => void;
  testID?: string;
};

export function PhotoField({
  label,
  optional,
  optionalText,
  photos,
  onChange,
  testID,
}: PhotoFieldProps) {
  const { t } = useTranslation();
  const canAdd = photos.length < MAX_PHOTOS_PER_EVENT;

  const handlePickFromLibrary = React.useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('photoPermissionDeniedTitle'), t('photoPermissionDeniedBody'));
      return;
    }
    const remaining = MAX_PHOTOS_PER_EVENT - photos.length;
    if (remaining <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.85,
    });
    if (result.canceled || !result.assets || result.assets.length === 0) return;
    const acceptedCount = Math.min(result.assets.length, remaining);
    const accepted = result.assets.slice(0, acceptedCount).map<PhotoFieldItem>((a) => ({
      uri: a.uri,
      width: a.width ?? null,
      height: a.height ?? null,
    }));
    onChange([...photos, ...accepted]);
  }, [photos, onChange, t]);

  const handleTakePhotoCamera = React.useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('photoPermissionDeniedTitle'), t('photoPermissionDeniedBody'));
      return;
    }
    if (photos.length >= MAX_PHOTOS_PER_EVENT) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled || !result.assets || result.assets.length === 0) return;
    const a = result.assets[0];
    onChange([
      ...photos,
      {
        uri: a.uri,
        width: a.width ?? null,
        height: a.height ?? null,
      },
    ]);
  }, [photos, onChange, t]);

  const handleRemove = React.useCallback(
    (index: number) => {
      onChange(photos.filter((_, i) => i !== index));
    },
    [photos, onChange],
  );

  const handleMove = React.useCallback(
    (from: number, to: number) => {
      if (to < 0 || to >= photos.length) return;
      const next = [...photos];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onChange(next);
    },
    [photos, onChange],
  );

  return (
    <View style={styles.field} testID={testID}>
      <View style={styles.labelRow}>
        <ThemedText type="defaultSemiBold">
          {label} ({photos.length})
        </ThemedText>
        {optional && optionalText && (
          <ThemedText style={styles.optionalText}>{optionalText}</ThemedText>
        )}
      </View>
      {/* Sess16 PR-H: BonsaiBasicForm 整合 — Camera + Library 2 buttons 横並び */}
      <View style={styles.sourceRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('photoSourceCamera' as TranslationKey)}
          accessibilityState={{ disabled: !canAdd }}
          disabled={!canAdd}
          style={[styles.sourceButton, !canAdd && styles.sourceButtonDisabled]}
          onPress={handleTakePhotoCamera}
          testID="e2e_photo_field_camera"
        >
          <CameraIcon size={20} />
          <ThemedText style={styles.sourceText}>
            {t('photoSourceCamera' as TranslationKey)}
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('photoSourceLibrary' as TranslationKey)}
          accessibilityState={{ disabled: !canAdd }}
          disabled={!canAdd}
          style={[styles.sourceButton, !canAdd && styles.sourceButtonDisabled]}
          onPress={handlePickFromLibrary}
          testID="e2e_photo_field_library"
        >
          <ThemedText style={styles.sourceText}>
            {t('photoSourceLibrary' as TranslationKey)}
          </ThemedText>
        </Pressable>
      </View>
      {photos.length > 0 && (
        <ThemedText style={styles.helpText}>{t('photoReorderHelp' as TranslationKey)}</ThemedText>
      )}
      {photos.map((photo, index) => (
        <View key={`${photo.uri}-${index}`} style={styles.card} testID={`e2e_photo_field_${index}`}>
          <View style={styles.toolbar}>
            <ThemedText style={styles.indexLabel}>
              {index + 1} / {photos.length}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('photoMoveUpLabel' as TranslationKey)}
              accessibilityState={{ disabled: index === 0 }}
              style={[styles.moveButton, index === 0 && styles.moveButtonDisabled]}
              onPress={() => handleMove(index, index - 1)}
              disabled={index === 0}
              testID={`e2e_photo_field_move_up_${index}`}
            >
              <ThemedText style={styles.moveText}>↑</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('photoMoveDownLabel' as TranslationKey)}
              accessibilityState={{ disabled: index === photos.length - 1 }}
              style={[styles.moveButton, index === photos.length - 1 && styles.moveButtonDisabled]}
              onPress={() => handleMove(index, index + 1)}
              disabled={index === photos.length - 1}
              testID={`e2e_photo_field_move_down_${index}`}
            >
              <ThemedText style={styles.moveText}>↓</ThemedText>
            </Pressable>
            <View style={styles.spacer} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('delete' as TranslationKey)}
              style={styles.deleteButton}
              onPress={() => handleRemove(index)}
              testID={`e2e_photo_field_delete_${index}`}
            >
              <ThemedText style={styles.deleteButtonText}>×</ThemedText>
            </Pressable>
          </View>
          <Image source={{ uri: photo.uri }} style={styles.thumb} contentFit="cover" />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionalText: formOptional,
  // Sess16 PR-H: BonsaiBasicForm photoSourceRow pattern (Sess13 PR-J 確立、 Camera + Library)
  sourceRow: { flexDirection: 'row', gap: 10 },
  sourceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    backgroundColor: BG_SURFACE,
  },
  sourceButtonDisabled: { opacity: 0.4 },
  sourceText: { fontSize: 14, color: TEXT_PRIMARY, fontWeight: '500' },
  helpText: { fontSize: 12, color: TEXT_SECONDARY },
  card: {
    flexDirection: 'column',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: BG_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: 8,
    gap: 6,
    backgroundColor: BG_PRIMARY,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER_DEFAULT,
  },
  indexLabel: { fontSize: 13, fontWeight: '500', color: TEXT_SECONDARY, marginRight: 4 },
  moveButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  moveButtonDisabled: { opacity: 0.3 },
  moveText: { fontSize: 18, color: TEXT_PRIMARY },
  spacer: { flex: 1 },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: { fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY, lineHeight: 20 },
  thumb: { width: '100%', aspectRatio: 4 / 3 },
});
