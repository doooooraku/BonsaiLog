/**
 * 盆栽新規登録 BottomSheet (Tier 2 完遂、mockup `create-screens.jsx CreateBonsaiScreen` 整合)。
 *
 * フィールド構成 (R-29 写経駆動):
 * - 写真 (任意、cover 1 枚、ImagePicker → addPhotoFromUri 永続化)
 * - 名前 (必須、64 字、赤バッジ)
 * - 樹種 (任意、SpeciesPickerSheet 起動)
 * - 樹形 (任意、StylePickerSheet 起動)
 * - 取得日 / 樹齢 / 購入日 / タグ chip / メモ (全て任意、灰色ラベル)
 *
 * Footer (mockup L779-818 sticky bottom save 整合):
 * - BottomSheetFooter で画面下部固定、ScrollView と独立配置
 *
 * Props:
 * - bottomSheetRef: 親が snapToIndex / close を制御する ref
 * - onCreated: 新規登録成功後のコールバック
 * - onClose?: Sheet が閉じた時のコールバック
 */
import BottomSheet, {
  BottomSheetFooter,
  type BottomSheetFooterProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
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
  DISABLED_BG,
  ON_BRAND,
  TEXT_MUTED,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { createBonsai } from '@/src/db/bonsaiRepository';
import { addPhotoFromUri } from '@/src/db/photoRepository';
import { type BonsaiStyle } from '@/src/db/schema';
import { getAllSpecies, type SpeciesWithName } from '@/src/db/speciesRepository';
import { attachTagToBonsai, getRecentTags, type TagRecord } from '@/src/db/tagRepository';

import { SpeciesPickerSheet } from './SpeciesPickerSheet';
import { StylePickerSheet } from './StylePickerSheet';

type Props = {
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  /** 新規登録成功後のコールバック (親が router.push などを実行)。 */
  onCreated: (bonsaiId: string) => void;
  /** Sheet が閉じた時のコールバック (親が state リセット等)。 */
  onClose?: () => void;
};

/** YYYY-MM-DD → ISO 8601 UTC TEXT (00:00:00Z)。new.tsx から移植、ADR-0008 §TZ 整合で nowUtc 使用。 */
function toIsoUtc(yyyymmdd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyymmdd);
  if (!m) return nowUtc();
  const [, y, mo, d] = m;
  return `${y}-${mo}-${d}T00:00:00.000Z`;
}

export function BonsaiCreateSheet({ bottomSheetRef, onCreated, onClose }: Props) {
  const { t, lang } = useTranslation();
  const c = useColors();
  const snapPoints = useMemo(() => ['90%'], []);

  const [name, setName] = useState('');
  const [speciesId, setSpeciesId] = useState<string | null>(null);
  const [speciesList, setSpeciesList] = useState<SpeciesWithName[]>([]);
  const [style, setStyle] = useState<BonsaiStyle | null>(null);
  const [acquiredAt, setAcquiredAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // T2-2-ui: 写真選択 (一時 URI)。
  const [coverUri, setCoverUri] = useState<string | null>(null);
  // T2-3: 樹齢入力 (数字 string で保持、submit 時に parseInt、空文字なら null)。
  const [estimatedAgeText, setEstimatedAgeText] = useState('');
  // T2-7: メモ入力 (multiline、空文字なら null で保存)。
  const [memo, setMemo] = useState('');
  // T2-4: 購入日入力 (YYYY-MM-DD inline、空文字なら null)。
  const [purchaseDate, setPurchaseDate] = useState('');
  // T2-6: タグ選択 (最近 8 件から chip 選択、保存時に bonsai_tags M:N 登録)。
  const [recentTags, setRecentTags] = useState<TagRecord[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  // T2-5: 樹種 / 樹形 Picker Sheet refs (BonsaiCreateSheet 内に入れ子配置)。
  const speciesSheetRef = useRef<BottomSheet>(null);
  const styleSheetRef = useRef<BottomSheet>(null);

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

  // T2-5: 選択中の樹種名 (Picker から戻ってきた id を name に解決して表示)。
  const selectedSpecies = useMemo(
    () => (speciesId != null ? (speciesList.find((s) => s.id === speciesId) ?? null) : null),
    [speciesId, speciesList],
  );

  const canSubmit = name.trim().length > 0 && !submitting;

  const handleClose = useCallback(() => {
    setName('');
    setSpeciesId(null);
    setStyle(null);
    setAcquiredAt('');
    setCoverUri(null);
    setEstimatedAgeText('');
    setMemo('');
    setPurchaseDate('');
    setSelectedTagIds(new Set());
    onClose?.();
  }, [onClose]);

  // T2-6: タグ chip toggle。
  const toggleTag = useCallback((tagId: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  }, []);

  // T2-2-ui: 写真ライブラリから 1 枚選択 (cover photo 候補、保存は T2-2-impl)。
  const handlePickPhoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('photoPermissionDeniedTitle'), t('photoPermissionDeniedBody'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setCoverUri(result.assets[0].uri);
    }
  }, [t]);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) handleClose();
    },
    [handleClose],
  );

  // Footer 下部固定 (mockup create-screens.jsx L779-818 sticky bottom save 整合)。
  // BottomSheetFooter は ScrollView と独立配置され、キーボード表示時も追従する。
  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={0}>
        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('save')}
            accessibilityState={{ disabled: !canSubmit }}
            style={[styles.footerButton, !canSubmit && styles.footerButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            testID="e2e_bonsai_create_submit"
          >
            <ThemedText style={styles.footerButtonText}>{t('save')}</ThemedText>
          </Pressable>
        </View>
      </BottomSheetFooter>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canSubmit, t],
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      // T2-3: estimatedAge は数字 string を parseInt、不正値や空文字は null。
      const parsedAge = estimatedAgeText.trim() ? parseInt(estimatedAgeText.trim(), 10) : NaN;
      const estimatedAge =
        Number.isFinite(parsedAge) && parsedAge > 0 && parsedAge < 10000 ? parsedAge : null;
      const bonsai = await createBonsai({
        name: name.trim(),
        speciesId,
        style,
        acquiredAt: acquiredAt.trim() ? toIsoUtc(acquiredAt.trim()) : null,
        estimatedAge,
        memo: memo.trim() ? memo.trim() : null,
        purchaseDate: purchaseDate.trim() ? toIsoUtc(purchaseDate.trim()) : null,
      });
      // T2-2-impl (Issue #369): coverUri を photoRepository.addPhotoFromUri で永続化。
      // persistPhotoFile + insertPhoto を内部で呼び、photoId 整合性 (ファイル名 == DB id) を確保。
      if (coverUri != null) {
        try {
          await addPhotoFromUri({ bonsaiId: bonsai.id, sourceUri: coverUri });
        } catch (err) {
          console.warn('[BonsaiCreateSheet] photo persist failed (continuing):', err);
        }
      }
      // T2-6: 選択中のタグを bonsai_tags M:N に登録。失敗しても盆栽登録は継続 (UX 配慮)。
      if (selectedTagIds.size > 0) {
        try {
          await Promise.all(
            Array.from(selectedTagIds).map((tagId) => attachTagToBonsai(bonsai.id, tagId)),
          );
        } catch (err) {
          console.warn('[BonsaiCreateSheet] tag attach failed (continuing):', err);
        }
      }
      bottomSheetRef.current?.close();
      onCreated(bonsai.id);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onChange={handleSheetChange}
      backgroundStyle={{ backgroundColor: c.background }}
      handleIndicatorStyle={{ backgroundColor: c.border }}
      footerComponent={renderFooter}
    >
      <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
        {/* T2-2-ui (Issue #366 後続): 写真選択 UI (mockup create-screens.jsx CreateBonsaiScreen 整合)。
            保存処理は T2-2-impl で実装予定、本 PR は UI のみ。 */}
        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">{t('bonsaiFieldPhotos')}</ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('photoAddCta')}
            style={[styles.photoBox, coverUri != null && styles.photoBoxFilled]}
            onPress={handlePickPhoto}
            testID="e2e_bonsai_create_photo_pick"
          >
            {coverUri != null ? (
              <Image source={{ uri: coverUri }} style={styles.photoPreview} contentFit="cover" />
            ) : (
              <View style={styles.photoEmpty}>
                <CameraIcon size={28} />
                <ThemedText style={styles.photoCta}>+ {t('photoAddCta')}</ThemedText>
              </View>
            )}
          </Pressable>
        </View>

        {/* T2-7: 必須/任意ラベル整備、name は必須 (赤バッジ)。 */}
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

        {/* T2-5: 樹種フィールドを SpeciesPickerSheet に分離。タップで Picker 開く。 */}
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

        {/* T2-5: 樹形フィールドを StylePickerSheet に分離。 */}
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

        {/* T2-4: 購入日入力欄 (任意、acquiredAt とは別、mockup 整合)。 */}
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

        {/* T2-6: タグ chip (最近 8 件、複数選択可、bonsai_tags M:N で保存)。 */}
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

        {/* T2-7: メモ入力欄 (multiline、任意ラベル、4 行まで)。 */}
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
      </BottomSheetScrollView>

      {/* T2-5: Picker Sheets — 親 BottomSheet 内に入れ子配置 (sibling として動作)。 */}
      <SpeciesPickerSheet
        bottomSheetRef={speciesSheetRef}
        speciesList={speciesList}
        current={speciesId}
        onSelect={setSpeciesId}
      />
      <StylePickerSheet bottomSheetRef={styleSheetRef} current={style} onSelect={setStyle} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  // Footer 高 (ボタン 56 + 上下 padding 12*2) + 余白 = 約 96。
  scrollContent: { padding: 16, gap: 16, paddingBottom: 96 },
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
  photoBoxFilled: { borderStyle: 'solid', borderWidth: 1 },
  photoPreview: { width: '100%', height: '100%' },
  photoEmpty: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoCta: { fontSize: 12, color: TEXT_SECONDARY },
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
  // T2-7: 必須/任意ラベル (mockup create-screens.jsx field() helper L255-314 整合)。
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  requiredBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: '#8B2E2E', // DANGER
  },
  requiredBadgeText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: '#F7F3E8', // BG_PRIMARY
    letterSpacing: 0.8,
  },
  optionalLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: TEXT_MUTED,
    letterSpacing: 0.8,
  },
  inputMultiline: { minHeight: 96, paddingVertical: 12 },
  // T2-6: タグ chip
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
  // Footer 下部固定 (mockup create-screens.jsx L779-818 sticky bottom save 整合)。
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER_DEFAULT,
    backgroundColor: BG_SURFACE,
  },
  footerButton: {
    height: 56,
    borderRadius: 12,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonDisabled: { backgroundColor: DISABLED_BG },
  footerButtonText: { color: ON_BRAND, fontSize: 17, fontWeight: '500', letterSpacing: 0.5 },
});
