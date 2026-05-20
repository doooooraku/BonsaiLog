/**
 * PhotoField — 作業記録 form 用 写真添付 atom (Sess16 PR-A3)。
 *
 * controlled pattern (親が photos state を持つ)。 PhotoCard (Sess14、 DB photo 表示用) と
 * 違い、 PhotoField は **新規写真 (DB 未保存)** を仮 state で管理し、 form 保存時に
 * caller が addPhotoFromUri loop で永続化する。
 *
 * mockup 整合 (user 提供 SS 10 枚):
 * - 各 photo: ↑↓ 並び替え + 番号 (1/N) + × 削除 + サムネ (4:3) + キャプション (任意 100 文字)
 * - 下部「+ 追加」 button (最大 10 枚到達で disable)
 *
 * F-08 仕様 (functional_spec.md §13 line 564-567): 作業記録の写真は Free でも無制限
 * (盆栽単位 3 枚制限とは別集計)、 ただし 1 作業あたり最大 10 枚。
 */
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import React from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';
import {
  BG_PRIMARY,
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  ON_BRAND,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';

export const MAX_PHOTOS_PER_EVENT = 10;
const MAX_CAPTION_CHARS = 100;

export type PhotoFieldItem = {
  uri: string;
  width: number | null;
  height: number | null;
  caption: string;
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

  const handleAdd = React.useCallback(async () => {
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
      caption: '',
    }));
    onChange([...photos, ...accepted]);
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

  const handleCaptionChange = React.useCallback(
    (index: number, caption: string) => {
      const next = photos.map((p, i) =>
        i === index ? { ...p, caption: caption.slice(0, MAX_CAPTION_CHARS) } : p,
      );
      onChange(next);
    },
    [photos, onChange],
  );

  return (
    <View style={styles.field} testID={testID}>
      <View style={styles.labelRow}>
        <ThemedText type="defaultSemiBold">{label}</ThemedText>
        {optional && optionalText && (
          <ThemedText style={styles.optionalText}>{optionalText}</ThemedText>
        )}
      </View>
      {photos.map((photo, index) => (
        <View key={`${photo.uri}-${index}`} style={styles.card} testID={`e2e_photo_field_${index}`}>
          <View style={styles.toolbar}>
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
            <ThemedText style={styles.indexLabel}>
              {index + 1} / {photos.length}
            </ThemedText>
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
          <View style={styles.captionArea}>
            <TextInput
              value={photo.caption}
              onChangeText={(v) => handleCaptionChange(index, v)}
              placeholder={t('workLogPhotoCaptionPlaceholder' as TranslationKey)}
              placeholderTextColor={TEXT_MUTED}
              multiline
              style={styles.captionInput}
              testID={`e2e_photo_field_caption_${index}`}
            />
            <ThemedText style={styles.captionCounter}>
              {photo.caption.length} / {MAX_CAPTION_CHARS}
            </ThemedText>
          </View>
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('workLogPhotoAdd' as TranslationKey)}
        accessibilityState={{ disabled: !canAdd }}
        style={[styles.addButton, !canAdd && styles.addButtonDisabled]}
        onPress={handleAdd}
        disabled={!canAdd}
        testID="e2e_photo_field_add"
      >
        <ThemedText style={[styles.addText, !canAdd && styles.addTextDisabled]}>
          + {t('workLogPhotoAdd' as TranslationKey)}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionalText: { fontSize: 10, color: TEXT_MUTED, letterSpacing: 0.8 },
  card: {
    flexDirection: 'column',
    borderRadius: 10,
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
  moveButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  moveButtonDisabled: { opacity: 0.3 },
  moveText: { fontSize: 18, color: TEXT_PRIMARY },
  indexLabel: { fontSize: 13, fontWeight: '500', color: TEXT_SECONDARY, marginLeft: 4 },
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
  captionArea: { padding: 10, gap: 4 },
  captionInput: {
    minHeight: 40,
    fontSize: 14,
    color: TEXT_PRIMARY,
    textAlignVertical: 'top',
  },
  captionCounter: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: TEXT_MUTED,
    textAlign: 'right',
  },
  addButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: BORDER_DEFAULT,
    backgroundColor: BG_SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: { opacity: 0.4 },
  addText: { fontSize: 14, color: BRAND_GREEN, fontWeight: '500' },
  addTextDisabled: { color: TEXT_MUTED },
});
