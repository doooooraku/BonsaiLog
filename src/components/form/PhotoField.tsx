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
 * ADR-0049 Sess59 PR3: 作業記録写真 ③ Free 上限 3 ガード追加 (User 真意 Sess59 R3:
 * 写真ピッカー段階で 4 枚目以降を選べないようにする + 残枠 0 で押下時 Paywall)。
 * - Free: 各記録 3 枚まで、 4 枚目押下時 Paywall (source=photo_worklog)
 * - Pro:  MAX_PHOTOS_PER_EVENT = 10 まで (UI 表記も「10枚まで」 = Sess101 ADR-0049 Amendment、 拡張時は i18n 同時更新)
 * - 表示は全 Free (GDPR Art.20 整合、 functional_spec §13 line 564-567)
 */
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import React from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CameraIcon } from '@/src/components/icons';
import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';
import { formOptional } from '@/src/core/theme/typography';
// Sess66 PR3: gallery card + toolbar の static 色 (BG_PRIMARY / BG_SURFACE / BORDER_DEFAULT /
// TEXT_PRIMARY / TEXT_SECONDARY) を StyleSheet から撤去し inline c.* に。 sourceButton は
// Sess65 PR2-c で既に対応済。
import { useColors } from '@/src/core/theme/useColors';
import { FREE_PHOTO_LIMIT_PER_EVENT } from '@/src/db/photoRepository';

export const MAX_PHOTOS_PER_EVENT = 10;
export { FREE_PHOTO_LIMIT_PER_EVENT };

export type PhotoFieldItem = {
  /**
   * ADR-0055 Sess77 PR-2: 編集モードで既存写真と新規追加の区別に使用 (DB photos.id 保持)。
   * - 既存写真 (DB から hydration): id 設定済 (`photoRepository.id`)
   * - 新規追加 (ImagePicker / Camera): id undefined
   * - 保存時 diff: `initialIds − currentIds` = 削除集合、 `currentItems.filter(p => !p.id)` = 新規追加集合
   */
  id?: string;
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
  /**
   * ADR-0049 Sess59 PR3: 親 (features 層) から渡す Pro 状態 (FSD 境界: components→features 禁止)。
   * - isPro = true: Pro user (MAX_PHOTOS_PER_EVENT = 10 まで)
   * - isPro = false + onLimitReached 未指定: Free user で silent no-op (旧挙動)
   * - isPro = false + onLimitReached 指定: Free user で上限到達時 onLimitReached() を呼ぶ
   *   (callsite で Paywall 誘導 Alert 表示推奨)
   */
  isPro?: boolean;
  onLimitReached?: () => void;
};

export function PhotoField({
  label,
  optional,
  optionalText,
  photos,
  onChange,
  testID,
  isPro = true, // 後方互換: 未指定なら Pro 扱い = 旧挙動 (MAX 10 まで)
  onLimitReached,
}: PhotoFieldProps) {
  const { t } = useTranslation();
  // Sess65 PR2-c: sourceButton bg / border / text の static 色を useColors 動的化。
  const c = useColors();
  // ADR-0049 Sess59 PR3: 作業記録写真 ③ Free 上限 3 ガード
  // Pro = MAX-現在数 / Free = min(MAX-現在数, FREE_LIMIT-現在数)
  const remainingForPicker = isPro
    ? MAX_PHOTOS_PER_EVENT - photos.length
    : Math.min(MAX_PHOTOS_PER_EVENT - photos.length, FREE_PHOTO_LIMIT_PER_EVENT - photos.length);
  const isFreeAtLimit = !isPro && photos.length >= FREE_PHOTO_LIMIT_PER_EVENT;
  const canAdd = !isFreeAtLimit && photos.length < MAX_PHOTOS_PER_EVENT;

  const handlePickFromLibrary = React.useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('photoPermissionDeniedTitle'), t('photoPermissionDeniedBody'));
      return;
    }
    // Free user 上限到達: Paywall 誘導 (onLimitReached 経由) / Pro user 上限到達: silent no-op
    if (isFreeAtLimit) {
      onLimitReached?.();
      return;
    }
    if (remainingForPicker <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remainingForPicker,
      quality: 0.85,
    });
    if (result.canceled || !result.assets || result.assets.length === 0) return;
    const acceptedCount = Math.min(result.assets.length, remainingForPicker);
    const accepted = result.assets.slice(0, acceptedCount).map<PhotoFieldItem>((a) => ({
      uri: a.uri,
      width: a.width ?? null,
      height: a.height ?? null,
    }));
    onChange([...photos, ...accepted]);
  }, [photos, onChange, t, isFreeAtLimit, remainingForPicker, onLimitReached]);

  const handleTakePhotoCamera = React.useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('photoPermissionDeniedTitle'), t('photoPermissionDeniedBody'));
      return;
    }
    if (isFreeAtLimit) {
      onLimitReached?.();
      return;
    }
    if (photos.length >= MAX_PHOTOS_PER_EVENT) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled || !result.assets || result.assets.length === 0) return;
    const a = result.assets[0]!; // guarded by assets.length === 0 check above
    onChange([
      ...photos,
      {
        uri: a.uri,
        width: a.width ?? null,
        height: a.height ?? null,
      },
    ]);
  }, [photos, onChange, t, isFreeAtLimit, onLimitReached]);

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
      if (moved === undefined) return; // splice on a valid index always returns 1 element, but guard for type safety
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
          style={[
            styles.sourceButton,
            { backgroundColor: c.surface, borderColor: c.border },
            !canAdd && styles.sourceButtonDisabled,
          ]}
          onPress={handleTakePhotoCamera}
          testID="e2e_photo_field_camera"
        >
          <CameraIcon size={20} color={c.text} />
          <ThemedText style={[styles.sourceText, { color: c.text }]}>
            {t('photoSourceCamera' as TranslationKey)}
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('photoSourceLibrary' as TranslationKey)}
          accessibilityState={{ disabled: !canAdd }}
          disabled={!canAdd}
          style={[
            styles.sourceButton,
            { backgroundColor: c.surface, borderColor: c.border },
            !canAdd && styles.sourceButtonDisabled,
          ]}
          onPress={handlePickFromLibrary}
          testID="e2e_photo_field_library"
        >
          <ThemedText style={[styles.sourceText, { color: c.text }]}>
            {t('photoSourceLibrary' as TranslationKey)}
          </ThemedText>
        </Pressable>
      </View>
      {photos.length > 0 && (
        <ThemedText style={[styles.helpText, { color: c.textSecondary }]}>
          {t('photoReorderHelp' as TranslationKey)}
        </ThemedText>
      )}
      {photos.map((photo, index) => (
        <View
          key={`${photo.uri}-${index}`}
          style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}
          testID={`e2e_photo_field_${index}`}
        >
          <View
            style={[styles.toolbar, { backgroundColor: c.background, borderBottomColor: c.border }]}
          >
            <ThemedText style={[styles.indexLabel, { color: c.textSecondary }]}>
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
              <ThemedText style={[styles.moveText, { color: c.text }]}>↑</ThemedText>
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
              <ThemedText style={[styles.moveText, { color: c.text }]}>↓</ThemedText>
            </Pressable>
            <View style={styles.spacer} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('delete' as TranslationKey)}
              style={styles.deleteButton}
              onPress={() => handleRemove(index)}
              testID={`e2e_photo_field_delete_${index}`}
            >
              <ThemedText style={[styles.deleteButtonText, { color: c.text }]}>×</ThemedText>
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
  },
  sourceButtonDisabled: { opacity: 0.4 },
  sourceText: { fontSize: 14, fontWeight: '500' },
  // Sess66 PR3: 全 static color を撤去し inline c.* で指定 (dark mode 追従)。
  helpText: { fontSize: 12 },
  card: {
    flexDirection: 'column',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: 8,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  indexLabel: { fontSize: 13, fontWeight: '500', marginRight: 4 },
  moveButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  moveButtonDisabled: { opacity: 0.3 },
  moveText: { fontSize: 18 },
  spacer: { flex: 1 },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: { fontSize: 18, fontWeight: '700', lineHeight: 20 },
  thumb: { width: '100%', aspectRatio: 4 / 3 },
});
