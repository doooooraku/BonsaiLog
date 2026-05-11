/**
 * 盆栽 基本情報フォーム — 新規登録 BottomSheet と詳細画面 基本情報タブで共用。
 *
 * mockup v1.0 `create-screens.jsx CreateBonsaiScreen` の prefill prop で create / edit
 * 両対応な単一コンポーネントを React Native 上で再現する目的。
 *
 * 構成:
 * - `useBonsaiBasicForm` — state + handler + submit ロジックを集約するフック
 * - `BonsaiBasicFormFields` — フィールド JSX (ScrollView は呼び出し側)
 * - `BonsaiBasicFormPickerSheets` — 樹種 / 樹形 Picker BottomSheet。@gorhom/bottom-sheet は
 *   ScrollView 内に nest すると closed (index=-1) でも inline で leak するため、呼び出し側で
 *   親 ScrollView の外 (root) に置く前提で別コンポーネントに分離。
 *
 * 呼び出し側:
 * - `BonsaiCreateSheet` (新規登録 / 編集 BottomSheet) — `BottomSheetScrollView` + `BottomSheetFooter`
 *   に組み込み、Picker Sheet は親 BottomSheet の sibling として配置
 * - `app/(tabs)/bonsai/[id]/index.tsx` の基本情報タブ — 親 ScrollView 内に inline 配置、
 *   Picker Sheet は ScrollView の外 (画面 root) に配置
 *
 * Issue #439 で BonsaiCreateSheet から抽出。
 */
import type BottomSheet from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CameraIcon, ChevronRightIcon } from '@/src/components/icons';
import { nowUtc } from '@/src/core/datetime/clock';
import { useTranslation } from '@/src/core/i18n/i18n';
import type { TranslationKey } from '@/src/core/i18n/locales/en';
import {
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  ON_BRAND,
  TEXT_MUTED,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import { createBonsai, updateBonsai } from '@/src/db/bonsaiRepository';
import { addPhotoFromUri, FREE_PHOTO_LIMIT_PER_BONSAI } from '@/src/db/photoRepository';
import { type Bonsai, type BonsaiStyle } from '@/src/db/schema';
import { getAllSpecies, type SpeciesWithName } from '@/src/db/speciesRepository';
import {
  attachTagToBonsai,
  detachTagFromBonsai,
  getRecentTags,
  getTagsByBonsai,
  type TagRecord,
} from '@/src/db/tagRepository';
import { useProStore } from '@/src/stores/proStore';

import { SpeciesPickerSheet } from './SpeciesPickerSheet';
import { StylePickerSheet } from './StylePickerSheet';

/** YYYY-MM-DD → ISO 8601 UTC TEXT (00:00:00Z)。ADR-0008 §TZ 整合で nowUtc 使用。 */
function toIsoUtc(yyyymmdd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyymmdd);
  if (!m) return nowUtc();
  const [, y, mo, d] = m;
  return `${y}-${mo}-${d}T00:00:00.000Z`;
}

/** ISO 8601 → YYYY-MM-DD (UI 入力欄 prefill 用、null/不正値は空文字)。 */
function isoToYmd(iso: string | null | undefined): string {
  if (!iso || iso.length < 10) return '';
  return iso.slice(0, 10);
}

export type PendingPhoto = { uri: string; width: number | null; height: number | null };

export type UseBonsaiBasicFormProps = {
  editingBonsai?: Bonsai | null;
  onCreated?: (bonsaiId: string) => void;
  onUpdated?: (bonsaiId: string) => void;
  /** create/update 成功後に呼ばれる (BottomSheet を閉じる等、共通の後処理用)。 */
  onAfterSubmit?: () => void;
};

export type BonsaiBasicFormState = ReturnType<typeof useBonsaiBasicForm>;

export function useBonsaiBasicForm({
  editingBonsai,
  onCreated,
  onUpdated,
  onAfterSubmit,
}: UseBonsaiBasicFormProps) {
  const isEdit = editingBonsai != null;
  const { t, lang } = useTranslation();

  const [name, setName] = useState('');
  const [speciesId, setSpeciesId] = useState<string | null>(null);
  const [speciesList, setSpeciesList] = useState<SpeciesWithName[]>([]);
  const [style, setStyle] = useState<BonsaiStyle | null>(null);
  const [acquiredAt, setAcquiredAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const isPro = useProStore((s) => s.isPro);
  const [estimatedAgeText, setEstimatedAgeText] = useState('');
  const [memo, setMemo] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [recentTags, setRecentTags] = useState<TagRecord[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const speciesSheetRef = useRef<BottomSheet>(null);
  const styleSheetRef = useRef<BottomSheet>(null);
  const originalTagIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void getAllSpecies(lang).then((list) => {
      if (!cancelled) setSpeciesList(list);
    });
    void getRecentTags(8).then((tags) => {
      if (!cancelled) setRecentTags(tags);
    });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  // editingBonsai prefill (新規モードと編集モードを id で区別、id 変化時に再 prefill)。
  const editingId = editingBonsai?.id ?? null;
  useEffect(() => {
    if (editingBonsai == null) {
      originalTagIdsRef.current = new Set();
      return;
    }
    setName(editingBonsai.name);
    setSpeciesId(editingBonsai.speciesId);
    setStyle(editingBonsai.style as BonsaiStyle | null);
    setAcquiredAt(isoToYmd(editingBonsai.acquiredAt));
    setEstimatedAgeText(
      editingBonsai.estimatedAge != null ? String(editingBonsai.estimatedAge) : '',
    );
    setMemo(editingBonsai.memo ?? '');
    setPurchaseDate(isoToYmd(editingBonsai.purchaseDate));
    let cancelled = false;
    void getTagsByBonsai(editingBonsai.id).then((tags) => {
      if (cancelled) return;
      const ids = new Set(tags.map((tg) => tg.id));
      setSelectedTagIds(ids);
      originalTagIdsRef.current = new Set(ids);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  const selectedSpecies = useMemo(
    () => (speciesId != null ? (speciesList.find((s) => s.id === speciesId) ?? null) : null),
    [speciesId, speciesList],
  );

  const canSubmit = name.trim().length > 0 && !submitting;

  const resetToInitial = useCallback(() => {
    if (editingBonsai != null) {
      setName(editingBonsai.name);
      setSpeciesId(editingBonsai.speciesId);
      setStyle(editingBonsai.style as BonsaiStyle | null);
      setAcquiredAt(isoToYmd(editingBonsai.acquiredAt));
      setEstimatedAgeText(
        editingBonsai.estimatedAge != null ? String(editingBonsai.estimatedAge) : '',
      );
      setMemo(editingBonsai.memo ?? '');
      setPurchaseDate(isoToYmd(editingBonsai.purchaseDate));
      setSelectedTagIds(new Set(originalTagIdsRef.current));
      setPendingPhotos([]);
    } else {
      setName('');
      setSpeciesId(null);
      setStyle(null);
      setAcquiredAt('');
      setPendingPhotos([]);
      setEstimatedAgeText('');
      setMemo('');
      setPurchaseDate('');
      setSelectedTagIds(new Set());
    }
  }, [editingBonsai]);

  const toggleTag = useCallback((tagId: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  }, []);

  const handlePickPhoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('photoPermissionDeniedTitle'), t('photoPermissionDeniedBody'));
      return;
    }
    const remaining = isPro
      ? Number.POSITIVE_INFINITY
      : Math.max(0, FREE_PHOTO_LIMIT_PER_BONSAI - pendingPhotos.length);
    if (remaining === 0) {
      Alert.alert(
        t('photoLimitTitle'),
        t('photoLimitDesc').replace('{count}', String(FREE_PHOTO_LIMIT_PER_BONSAI)),
        [{ text: t('ok') }],
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 0,
      quality: 0.85,
    });
    if (result.canceled || !result.assets || result.assets.length === 0) return;

    const acceptedCount = isPro ? result.assets.length : Math.min(result.assets.length, remaining);
    const accepted = result.assets.slice(0, acceptedCount).map((a) => ({
      uri: a.uri,
      width: a.width ?? null,
      height: a.height ?? null,
    }));
    const skipped = result.assets.length - accepted.length;
    setPendingPhotos((prev) => [...prev, ...accepted]);
    if (skipped > 0) {
      Alert.alert(
        t('photoLimitTitle'),
        t('photoLimitPartialAdded')
          .replace('{added}', String(accepted.length))
          .replace('{skipped}', String(skipped)),
        [{ text: t('ok') }],
      );
    }
  }, [isPro, pendingPhotos.length, t]);

  const handleRemovePendingPhoto = useCallback((index: number) => {
    setPendingPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const parsedAge = estimatedAgeText.trim() ? parseInt(estimatedAgeText.trim(), 10) : NaN;
      const estimatedAge =
        Number.isFinite(parsedAge) && parsedAge > 0 && parsedAge < 10000 ? parsedAge : null;
      const fields = {
        name: name.trim(),
        speciesId,
        style,
        acquiredAt: acquiredAt.trim() ? toIsoUtc(acquiredAt.trim()) : null,
        estimatedAge,
        memo: memo.trim() ? memo.trim() : null,
        purchaseDate: purchaseDate.trim() ? toIsoUtc(purchaseDate.trim()) : null,
      };

      if (editingBonsai != null) {
        await updateBonsai(editingBonsai.id, fields);
        const original = originalTagIdsRef.current;
        const toAttach = Array.from(selectedTagIds).filter((id) => !original.has(id));
        const toDetach = Array.from(original).filter((id) => !selectedTagIds.has(id));
        try {
          await Promise.all([
            ...toAttach.map((tagId) => attachTagToBonsai(editingBonsai.id, tagId)),
            ...toDetach.map((tagId) => detachTagFromBonsai(editingBonsai.id, tagId)),
          ]);
          // 編集成功後は original を最新化して、再オープン時の差分計算を正しくする。
          originalTagIdsRef.current = new Set(selectedTagIds);
        } catch (err) {
          console.warn('[BonsaiBasicForm] tag diff update failed (continuing):', err);
        }
        onAfterSubmit?.();
        onUpdated?.(editingBonsai.id);
      } else {
        const bonsai = await createBonsai(fields);
        for (const p of pendingPhotos) {
          try {
            await addPhotoFromUri({ bonsaiId: bonsai.id, sourceUri: p.uri });
          } catch (err) {
            console.warn('[BonsaiBasicForm] photo persist failed (continuing):', err);
          }
        }
        if (selectedTagIds.size > 0) {
          try {
            await Promise.all(
              Array.from(selectedTagIds).map((tagId) => attachTagToBonsai(bonsai.id, tagId)),
            );
          } catch (err) {
            console.warn('[BonsaiBasicForm] tag attach failed (continuing):', err);
          }
        }
        onAfterSubmit?.();
        onCreated?.(bonsai.id);
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    canSubmit,
    estimatedAgeText,
    name,
    speciesId,
    style,
    acquiredAt,
    memo,
    purchaseDate,
    editingBonsai,
    selectedTagIds,
    pendingPhotos,
    onAfterSubmit,
    onCreated,
    onUpdated,
  ]);

  return {
    // state
    isEdit,
    name,
    setName,
    speciesId,
    setSpeciesId,
    speciesList,
    selectedSpecies,
    style,
    setStyle,
    acquiredAt,
    setAcquiredAt,
    estimatedAgeText,
    setEstimatedAgeText,
    memo,
    setMemo,
    purchaseDate,
    setPurchaseDate,
    recentTags,
    selectedTagIds,
    toggleTag,
    pendingPhotos,
    handlePickPhoto,
    handleRemovePendingPhoto,
    isPro,
    canSubmit,
    submitting,
    // refs
    speciesSheetRef,
    styleSheetRef,
    // actions
    handleSubmit,
    resetToInitial,
  };
}

export type BonsaiBasicFormFieldsProps = {
  form: BonsaiBasicFormState;
  /** 写真フィールドを表示するか (新規モードのみ true、編集モードは詳細画面の photoCard で別管理)。 */
  showPhotos?: boolean;
};

/**
 * フィールド一覧 + Picker BottomSheet を render する。
 * ScrollView ラッパは呼び出し側が決める (BottomSheetScrollView or 親の通常 ScrollView 内 inline)。
 */
export function BonsaiBasicFormFields({ form, showPhotos = true }: BonsaiBasicFormFieldsProps) {
  const { t } = useTranslation();
  const {
    isEdit,
    name,
    setName,
    selectedSpecies,
    style,
    acquiredAt,
    setAcquiredAt,
    estimatedAgeText,
    setEstimatedAgeText,
    memo,
    setMemo,
    purchaseDate,
    setPurchaseDate,
    recentTags,
    selectedTagIds,
    toggleTag,
    pendingPhotos,
    handlePickPhoto,
    handleRemovePendingPhoto,
    isPro,
    speciesSheetRef,
    styleSheetRef,
  } = form;

  const showPhotoField = showPhotos && !isEdit;

  return (
    <>
      {showPhotoField && (
        <View style={styles.field}>
          <View style={styles.fieldLabelRow}>
            <ThemedText type="defaultSemiBold">{t('bonsaiFieldPhotos')}</ThemedText>
            <ThemedText style={styles.optionalLabel}>{t('fieldOptionalLabel')}</ThemedText>
            {!isPro && (
              <ThemedText style={styles.photoCount}>
                {pendingPhotos.length} / {FREE_PHOTO_LIMIT_PER_BONSAI}
              </ThemedText>
            )}
          </View>
          <View style={styles.photoStrip}>
            {pendingPhotos.map((p, idx) => (
              <View key={`${p.uri}-${idx}`} style={styles.photoStripCell}>
                <Image source={{ uri: p.uri }} style={styles.photoStripImage} contentFit="cover" />
                {idx === 0 && (
                  <View style={styles.photoStripCoverBadge}>
                    <ThemedText style={styles.photoStripCoverBadgeText}>
                      {t('photoCoverBadge')}
                    </ThemedText>
                  </View>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('delete')}
                  style={styles.photoStripDeleteButton}
                  onPress={() => handleRemovePendingPhoto(idx)}
                  testID={`e2e_bonsai_create_photo_remove_${idx}`}
                >
                  <ThemedText style={styles.photoStripDeleteText}>×</ThemedText>
                </Pressable>
              </View>
            ))}
            {(isPro || pendingPhotos.length < FREE_PHOTO_LIMIT_PER_BONSAI) && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('photoAddCta')}
                style={styles.photoBox}
                onPress={handlePickPhoto}
                testID="e2e_bonsai_create_photo_pick"
              >
                <View style={styles.photoEmpty}>
                  <CameraIcon size={28} />
                  <ThemedText style={styles.photoCta}>+ {t('photoAddCta')}</ThemedText>
                </View>
              </Pressable>
            )}
          </View>
        </View>
      )}

      <View style={styles.field}>
        <View style={styles.fieldLabelRow}>
          <ThemedText type="defaultSemiBold">{t('bonsaiFieldName')}</ThemedText>
          <View style={styles.requiredBadge}>
            <ThemedText style={styles.requiredBadgeText}>{t('fieldRequiredLabel')}</ThemedText>
          </View>
        </View>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={t('bonsaiFieldNamePlaceholder')}
          accessibilityLabel={t('bonsaiFieldName')}
          maxLength={64}
        />
      </View>

      <View style={styles.field}>
        <ThemedText type="defaultSemiBold">{t('bonsaiFieldSpecies')}</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('bonsaiFieldSpecies')}
          style={styles.pickerRow}
          onPress={() => speciesSheetRef.current?.snapToIndex(0)}
          testID="e2e_bonsai_create_species_pick"
        >
          <ThemedText style={selectedSpecies != null ? undefined : styles.pickerPlaceholder}>
            {selectedSpecies?.commonName ?? '―'}
          </ThemedText>
          <ChevronRightIcon size={20} color={TEXT_MUTED} />
        </Pressable>
      </View>

      <View style={styles.field}>
        <ThemedText type="defaultSemiBold">{t('bonsaiFieldStyle')}</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('bonsaiFieldStyle')}
          style={styles.pickerRow}
          onPress={() => styleSheetRef.current?.snapToIndex(0)}
          testID="e2e_bonsai_create_style_pick"
        >
          <ThemedText style={style != null ? undefined : styles.pickerPlaceholder}>
            {style != null ? t(`bonsaiStyle_${style}` as TranslationKey) : '―'}
          </ThemedText>
          <ChevronRightIcon size={20} color={TEXT_MUTED} />
        </Pressable>
      </View>

      <View style={styles.field}>
        <ThemedText type="defaultSemiBold">{t('bonsaiFieldAcquiredAt')}</ThemedText>
        <TextInput
          style={styles.input}
          value={acquiredAt}
          onChangeText={setAcquiredAt}
          placeholder="YYYY-MM-DD"
          accessibilityLabel={t('bonsaiFieldAcquiredAt')}
          maxLength={10}
          keyboardType="numbers-and-punctuation"
        />
      </View>

      <View style={styles.field}>
        <View style={styles.fieldLabelRow}>
          <ThemedText type="defaultSemiBold">{t('bonsaiFieldEstimatedAge')}</ThemedText>
          <ThemedText style={styles.optionalLabel}>{t('fieldOptionalLabel')}</ThemedText>
        </View>
        <TextInput
          style={styles.input}
          value={estimatedAgeText}
          onChangeText={setEstimatedAgeText}
          placeholder={t('bonsaiFieldEstimatedAgePlaceholder')}
          accessibilityLabel={t('bonsaiFieldEstimatedAge')}
          maxLength={4}
          keyboardType="number-pad"
        />
      </View>

      <View style={styles.field}>
        <View style={styles.fieldLabelRow}>
          <ThemedText type="defaultSemiBold">{t('bonsaiFieldPurchaseDate')}</ThemedText>
          <ThemedText style={styles.optionalLabel}>{t('fieldOptionalLabel')}</ThemedText>
        </View>
        <TextInput
          style={styles.input}
          value={purchaseDate}
          onChangeText={setPurchaseDate}
          placeholder="YYYY-MM-DD"
          accessibilityLabel={t('bonsaiFieldPurchaseDate')}
          maxLength={10}
          keyboardType="numbers-and-punctuation"
        />
      </View>

      <View style={styles.field}>
        <View style={styles.fieldLabelRow}>
          <ThemedText type="defaultSemiBold">{t('bonsaiFieldTags')}</ThemedText>
          <ThemedText style={styles.optionalLabel}>{t('fieldOptionalLabel')}</ThemedText>
        </View>
        {recentTags.length > 0 ? (
          <View style={styles.tagChipRow}>
            {recentTags.map((tg) => {
              const selected = selectedTagIds.has(tg.id);
              return (
                <Pressable
                  key={tg.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={tg.name}
                  style={[styles.tagChip, selected && styles.tagChipSelected]}
                  onPress={() => toggleTag(tg.id)}
                  testID={`e2e_bonsai_create_tag_chip_${tg.id}`}
                >
                  <ThemedText style={selected ? styles.tagChipTextSelected : styles.tagChipText}>
                    {tg.name}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <ThemedText style={styles.tagsEmpty}>{t('bonsaiTagsEmpty')}</ThemedText>
        )}
      </View>

      <View style={styles.field}>
        <View style={styles.fieldLabelRow}>
          <ThemedText type="defaultSemiBold">{t('bonsaiFieldMemo')}</ThemedText>
          <ThemedText style={styles.optionalLabel}>{t('fieldOptionalLabel')}</ThemedText>
        </View>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={memo}
          onChangeText={setMemo}
          placeholder={t('bonsaiFieldMemoPlaceholder')}
          accessibilityLabel={t('bonsaiFieldMemo')}
          multiline
          numberOfLines={4}
          maxLength={500}
          textAlignVertical="top"
        />
      </View>
    </>
  );
}

export type BonsaiBasicFormPickerSheetsProps = {
  form: BonsaiBasicFormState;
};

/**
 * 樹種 / 樹形 Picker BottomSheet (2 個まとめ)。
 *
 * 呼び出し側は ScrollView の外 (画面 root もしくは親 BottomSheet の sibling) に配置する。
 * ScrollView 内に nest すると @gorhom/bottom-sheet が index=-1 でも inline で leak し、
 * フォーム末尾に picker が固まりとして表示される。
 */
export function BonsaiBasicFormPickerSheets({ form }: BonsaiBasicFormPickerSheetsProps) {
  const { speciesId, setSpeciesId, speciesList, style, setStyle, speciesSheetRef, styleSheetRef } =
    form;
  return (
    <>
      <SpeciesPickerSheet
        bottomSheetRef={speciesSheetRef}
        speciesList={speciesList}
        current={speciesId}
        onSelect={setSpeciesId}
      />
      <StylePickerSheet bottomSheetRef={styleSheetRef} current={style} onSelect={setStyle} />
    </>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  photoBox: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER_DEFAULT,
    borderStyle: 'dashed',
    backgroundColor: BG_SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoEmpty: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoCta: { fontSize: 12, color: TEXT_SECONDARY },
  photoStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoStripCell: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
  },
  photoStripImage: { width: '100%', height: '100%' },
  photoStripCoverBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: BRAND_GREEN,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  photoStripCoverBadgeText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: ON_BRAND,
    letterSpacing: 0.6,
  },
  photoStripDeleteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoStripDeleteText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', lineHeight: 18 },
  photoCount: { fontSize: 11, color: TEXT_MUTED, marginLeft: 'auto' },
  input: {
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 48,
    backgroundColor: BG_SURFACE,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
    backgroundColor: BG_SURFACE,
  },
  pickerPlaceholder: { color: TEXT_MUTED },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  requiredBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: '#8B2E2E',
  },
  requiredBadgeText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: '#F7F3E8',
    letterSpacing: 0.8,
  },
  optionalLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: TEXT_MUTED,
    letterSpacing: 0.8,
  },
  inputMultiline: { minHeight: 96, paddingVertical: 12 },
  tagChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    backgroundColor: BG_SURFACE,
    minHeight: 36,
    justifyContent: 'center',
  },
  tagChipSelected: { backgroundColor: BRAND_GREEN, borderColor: BRAND_GREEN },
  tagChipText: { fontSize: 13 },
  tagChipTextSelected: { fontSize: 13, color: ON_BRAND, fontWeight: '600' },
  tagsEmpty: { fontSize: 13, color: TEXT_MUTED },
});
