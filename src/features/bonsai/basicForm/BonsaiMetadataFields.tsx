import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { LabeledDateRow } from '@/src/components/form/LabeledDateRow';
import { LabeledNumberInput } from '@/src/components/form/LabeledNumberInput';
import { LabeledTextInput } from '@/src/components/form/LabeledTextInput';
import { useTranslation } from '@/src/core/i18n/i18n';
// Sess68 PR #C: BG_SURFACE / BORDER_DEFAULT / TEXT_MUTED は inline c.* 化、 BRAND_GREEN / ON_BRAND は brand-static で保持。
import { BRAND_GREEN, ON_BRAND } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import type { BonsaiBasicFormState } from '@/src/features/bonsai/BonsaiBasicForm';

/**
 * 盆栽基本情報フォーム「取得日 / 樹齢(不明 checkbox) / 入手元」フィールド (presentational)。
 * Phase 4 A2-2 で BonsaiBasicFormFields から抽出 (挙動不変)。
 * 樹齢は数値入力と「不明」 checkbox の相互 clear (2-state 連携) を保持する。
 * 注: field/fieldLabelRow/optionalLabel は他セクションと共有のため WET 複製。
 */
export function BonsaiMetadataFields({ form }: { form: BonsaiBasicFormState }) {
  const { t } = useTranslation();
  const c = useColors();
  const {
    acquiredAt,
    setAcquiredAt,
    estimatedAgeText,
    setEstimatedAgeText,
    ageUnknown,
    setAgeUnknown,
    acquiredFrom,
    setAcquiredFrom,
  } = form;

  return (
    <>
      {/* Sess14 PR-O: 取得日 を LabeledDateRow へ移行 (PR-E DatePicker 実装を component 化) */}
      <LabeledDateRow
        label={t('bonsaiFieldAcquiredAt')}
        optional
        optionalText={t('fieldOptionalLabel')}
        value={acquiredAt}
        onChangeText={setAcquiredAt}
        placeholder={t('datePickerPlaceholder')}
        testID="e2e_bonsai_create_acquired_at"
        testIDClear="e2e_bonsai_create_acquired_at_clear"
      />

      <View style={styles.field}>
        <View style={styles.fieldLabelRow}>
          <ThemedText type="defaultSemiBold">{t('bonsaiFieldEstimatedAge')}</ThemedText>
          <ThemedText style={[styles.optionalLabel, { color: c.textMuted }]}>
            {t('fieldOptionalLabel')}
          </ThemedText>
        </View>
        {/* Sess14 PR-O: 樹齢 を LabeledNumberInput へ移行 + 「不明」 checkbox 横並び維持 */}
        <View style={styles.ageRow}>
          <View style={{ flex: 1 }}>
            <LabeledNumberInput
              label=""
              value={estimatedAgeText}
              onChangeText={(text) => {
                setEstimatedAgeText(text);
                if (text.length > 0 && ageUnknown) setAgeUnknown(false);
              }}
              placeholder={t('bonsaiFieldEstimatedAgePlaceholder')}
              suffix="年"
              maxLength={4}
              editable={!ageUnknown}
              accessibilityLabel={t('bonsaiFieldEstimatedAge')}
              testID="e2e_bonsai_create_age_input"
            />
          </View>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: ageUnknown }}
            accessibilityLabel={t('bonsaiFieldEstimatedAgeUnknown')}
            style={styles.ageUnknownToggle}
            onPress={() => {
              const next = !ageUnknown;
              setAgeUnknown(next);
              if (next) setEstimatedAgeText('');
            }}
            testID="e2e_bonsai_create_age_unknown"
          >
            <View
              style={[
                styles.checkbox,
                { borderColor: c.border, backgroundColor: c.surface },
                ageUnknown && styles.checkboxChecked,
              ]}
            >
              {ageUnknown && <ThemedText style={styles.checkboxMark}>✓</ThemedText>}
            </View>
            <ThemedText style={styles.ageUnknownLabel}>
              {t('bonsaiFieldEstimatedAgeUnknown')}
            </ThemedText>
          </Pressable>
        </View>
      </View>

      {/* Sess13 PR-B + PR-K: 入手元 (任意、 schema v10 acquired_from + LabeledTextInput 共通化)。 */}
      <LabeledTextInput
        label={t('bonsaiFieldAcquiredFrom')}
        optional
        optionalText={t('fieldOptionalLabel')}
        overlimitText={t('inputOverLimit')}
        value={acquiredFrom}
        onChangeText={setAcquiredFrom}
        placeholder={t('bonsaiFieldAcquiredFromPlaceholder')}
        maxLength={100}
        showCounter
        testID="e2e_bonsai_create_acquired_from"
      />
    </>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionalLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  // Sess13 PR-D: 樹齢「不明」 checkbox 横並び。
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ageUnknownToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: BRAND_GREEN, borderColor: BRAND_GREEN },
  checkboxMark: { color: ON_BRAND, fontSize: 14, fontWeight: '700', lineHeight: 16 },
  ageUnknownLabel: { fontSize: 14 },
});
